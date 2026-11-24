#!/usr/bin/env bash
# Offline restore verification only: pipe an authorized decrypted pg_dump custom
# archive from a trusted source into stdin. No production/preview DB connections.
# Example: trusted_archive_stream | bash scripts/recovery/restore-archive-to-disposable-postgres.sh
set -Eeuo pipefail
umask 077

if [[ "${KSOL_DISPOSABLE_RESTORE_ACK:-}" != 'I_UNDERSTAND_ISOLATED_ONLY' ]]; then
  echo 'RESTORE_NOT_RUN: explicit disposable-only acknowledgment required' >&2
  exit 2
fi
# Application-only verification is a scoped recovery proof, NEVER a substitute
# for full Supabase auth/storage/platform recovery.
verify_scope="${KSOL_RESTORE_VERIFY_SCOPE:-full}"
if [[ "$verify_scope" != full && "$verify_scope" != application ]]; then
  echo 'RESTORE_NOT_RUN: INVALID_VERIFY_SCOPE' >&2
  exit 2
fi
if [[ -t 0 ]]; then
  echo 'RESTORE_NOT_RUN: archive must be provided on stdin' >&2
  exit 2
fi
command -v docker >/dev/null || { echo 'RESTORE_NOT_RUN: Docker unavailable' >&2; exit 2; }
# A distinct container, with no published ports and no host-mounted volumes.
name="ksol-disposable-restore-$$"
password="$(openssl rand -hex 24)"
cleanup() { docker rm -f "$name" >/dev/null 2>&1 || true; }
trap cleanup EXIT
# Preview source uses PostgreSQL 17.11; use a current compatible PG17
# Supabase image rather than older 17.6 binaries/extension packages.
# This does NOT make managed-schema restoration automatically safe.
docker run -d --name "$name" --network none --tmpfs /var/lib/postgresql/data:rw,size=2g \
  -e POSTGRES_PASSWORD="$password" -e POSTGRES_DB=ksol_recovery \
  supabase/postgres:17.12.0.002 >/dev/null
# Newer Supabase images may accept postgres connections before their full
# initialization/role bootstrap is finished. Wait for the exact restore user
# and destination DB instead of accepting an early postgres-only response.
# This only probes the isolated --network none container, never source DBs.
restore_user=supabase_admin
ready=0
for i in $(seq 1 90); do
  # The image uses a temporary socket-only postmaster during initialization,
  # then shuts it down and starts the final server. Require TCP on loopback
  # inside the networkless container, which the temporary server does not use.
  # PGPASSWORD is scoped to this disposable container only.
  if docker exec -e PGPASSWORD="$password" "$name" psql -X -h 127.0.0.1 -U "$restore_user" -d ksol_recovery -Atqc 'SELECT 1' >/dev/null 2>&1; then
    ready=1
    break
  fi
  sleep 1
done
if [[ "$ready" != 1 ]]; then
  echo 'RESTORE_NOT_RUN: SUPABASE_ADMIN_DISPOSABLE_ACCESS_UNAVAILABLE' >&2
  exit 2
fi

# Do not hardcode extension requirements for every archive. Synthetic and
# application-only archives may not require pg_cron, pg_net or vault. Let the
# actual pg_restore attempt report an unavailable extension if the archive
# references one, rather than blocking a compatible backup before restore.


# Supabase role grants are omitted by pg_restore --no-acl --no-owner.
# Do not require platform roles in the disposable container; the image may
# intentionally provision them only during its complete production bootstrap.
# Never create or modify source database roles.

# All subsequent restore operations use the exact built-in privileged
# disposable role checked by the bounded startup readiness loop above.
# No source database connections or permanent privilege changes.

# Full restore: a blank database avoids clashes with Supabase's managed
# objects. Application-only restore: reuse the disposable Supabase-bootstrap
# database, because the public schema may depend on preinstalled auth or
# extensions schemas and functions. Both databases live only in this disposable
# --network none container. Never touch source Production/Preview databases.
if [[ "$verify_scope" == application ]]; then
  restore_db=ksol_recovery
  # The bootstrap target may have a public schema, but it must not already
  # contain any of the two KSOL tables we are trying to restore.
  collision="$(docker exec "$name" psql -X -U "$restore_user" -d "$restore_db" -Atqc \
    "SELECT (to_regclass('public.student_profiles') IS NOT NULL OR to_regclass('public.test_attempts') IS NOT NULL)::int;" 2>/dev/null)" || {
    echo 'RESTORE_NOT_RUN: DISPOSABLE_APPLICATION_TARGET_CHECK_FAILED' >&2
    exit 2
  }
  [[ "$collision" == 0 ]] || {
    echo 'RESTORE_NOT_RUN: DISPOSABLE_APPLICATION_TARGET_NOT_EMPTY' >&2
    exit 2
  }
else
  # pg_cron can be installed only in the database named by cron.database_name.
  # On the official PG17 Supabase image that is normally "postgres".
  # The previous template0 restore DB was named ksol_recovery_clean, which
  # guaranteed a pg_cron restore failure even if all packages were available.
  #
  # This is a brand-new, network-isolated, tmpfs-only disposable Docker
  # instance. NEVER issue these commands against Preview/Production.
  # Keep all restored cron jobs inert, including SQL-only cron jobs.
  if ! docker exec "$name" psql -X -U "$restore_user" -d ksol_recovery -v ON_ERROR_STOP=1 \
    -c "ALTER SYSTEM SET cron.launch_active_jobs = 'off'" >/dev/null 2>/dev/null; then
    echo 'RESTORE_NOT_RUN: DISPOSABLE_CRON_DISABLE_FAILED' >&2
    exit 2
  fi
  # pg_reload_conf() reports signal delivery, not an effective setting. The
  # disposable image can deny that SQL operation or briefly restart during
  # initialization. Use the container's own postgres OS role as a fallback.
  # The safety gate is the *observed* configuration, never a reload exit code.
  reload_state='UNCONFIRMED'
  if [[ "$(docker exec "$name" psql -X -U "$restore_user" -d ksol_recovery -v ON_ERROR_STOP=1 \
      -Atqc 'SELECT pg_reload_conf()' 2>/dev/null || true)" == t ]]; then
    reload_state='SQL_SIGNAL_SENT'
  elif docker exec --user postgres "$name" sh -ec 'pg_ctl -D "${PGDATA:?}" reload' >/dev/null 2>&1; then
    reload_state='LOCAL_OS_SIGNAL_SENT'
  fi
  cron_safe=0
  for i in $(seq 1 30); do
    # Check in a fresh connection because reload is asynchronous. Do not
    # restore any archive until both conditions are positively confirmed.
    safe="$(docker exec "$name" psql -X -U "$restore_user" -d ksol_recovery -Atqc \
      "SELECT (current_setting('cron.database_name', true) = 'postgres' AND current_setting('cron.launch_active_jobs', true) = 'off')::int;" 2>/dev/null)" || safe=''
    if [[ "$safe" == 1 ]]; then cron_safe=1; break; fi
    if [[ "$i" == 10 ]]; then
      # A transient bootstrap restart may invalidate the first signal.
      # Retry only within this disposable container; no source credentials.
      docker exec "$name" psql -X -U "$restore_user" -d ksol_recovery -v ON_ERROR_STOP=1 \
        -c "ALTER SYSTEM SET cron.launch_active_jobs = 'off'" >/dev/null 2>&1 || true
      if docker exec --user postgres "$name" sh -ec 'pg_ctl -D "${PGDATA:?}" reload' >/dev/null 2>&1; then
        reload_state='LOCAL_OS_SIGNAL_SENT'
      fi
    fi
    sleep 1
  done
  if [[ "$cron_safe" != 1 ]]; then
    echo "RESTORE_DISPOSABLE_CRON_RELOAD_STATUS: $reload_state" >&2
    echo 'RESTORE_NOT_RUN: DISPOSABLE_CRON_TARGET_OR_SAFETY_CHECK_FAILED' >&2
    exit 2
  fi
  echo 'RESTORE_DISPOSABLE_CRON_SAFETY_VERIFIED=YES'

  # Only this disposable container's preinstalled postgres database is
  # re-created. No source credentials, host mounts, external network or
  # persistent volumes exist here. No cleanup of any source DB is possible.
  # Database recreation can fail even before pg_restore starts. psql's
  # VERBOSITY=sqlstate strips object names and SQL from the error message.
  # Store its output only in a private temporary file, publish only a strict
  # five-character PostgreSQL SQLSTATE, and still fail closed on any error.
  db_reset_errors="$(mktemp)"
  chmod 600 "$db_reset_errors"
  if ! docker exec "$name" psql -X -U "$restore_user" -d ksol_recovery \
    -v ON_ERROR_STOP=1 -v VERBOSITY=sqlstate \
    -c 'DROP DATABASE postgres WITH (FORCE)' >/dev/null 2>"$db_reset_errors"; then
    db_reset_state="$(sed -nE 's/.*(ERROR|FATAL):[[:space:]]+([A-Z0-9]{5})([^A-Z0-9]|$).*/\2/p' "$db_reset_errors" | head -n 1 || true)"
    if [[ "$db_reset_state" =~ ^[A-Z0-9]{5}$ ]]; then
      echo "RESTORE_DISPOSABLE_DROP_SQLSTATE: $db_reset_state" >&2
    fi
    rm -f "$db_reset_errors"
    echo 'RESTORE_NOT_RUN: DISPOSABLE_POSTGRES_RECREATE_FAILED' >&2
    exit 2
  fi
  : > "$db_reset_errors"
  if ! docker exec "$name" psql -X -U "$restore_user" -d ksol_recovery \
    -v ON_ERROR_STOP=1 -v VERBOSITY=sqlstate \
    -c "CREATE DATABASE postgres WITH TEMPLATE template0 OWNER $restore_user" >/dev/null 2>"$db_reset_errors"; then
    db_reset_state="$(sed -nE 's/.*(ERROR|FATAL):[[:space:]]+([A-Z0-9]{5})([^A-Z0-9]|$).*/\2/p' "$db_reset_errors" | head -n 1 || true)"
    if [[ "$db_reset_state" =~ ^[A-Z0-9]{5}$ ]]; then
      echo "RESTORE_DISPOSABLE_CREATE_SQLSTATE: $db_reset_state" >&2
    fi
    rm -f "$db_reset_errors"
    echo 'RESTORE_NOT_RUN: DISPOSABLE_POSTGRES_RECREATE_FAILED' >&2
    exit 2
  fi
  rm -f "$db_reset_errors"
  restore_db=postgres
fi

# Stream directly to pg_restore in the isolated container, no dump file or
# decrypted backup in logs. Suppress raw stderr (may contain private SQL/data).
# Capture diagnostics in a private temporary file, emit only safe categories.
# Raw SQL, object names and sensitive stderr must never enter Actions logs.
restore_errors="$(mktemp)"
chmod 600 "$restore_errors"
# PostgreSQL normally omits SQLSTATE from client-side pg_restore stderr.
# Enable it only in the disposable server's internal logs. Never publish those
# logs: they can contain private SQL, identifiers, and archive content.
# Disabling statement logging also reduces sensitive data in temporary logs.
sqlstate_logging=0
if docker exec "$name" psql -X -U "$restore_user" -d "$restore_db" -v ON_ERROR_STOP=1 \
    -c "ALTER SYSTEM SET log_min_error_statement = 'panic'" >/dev/null 2>&1 &&
   docker exec "$name" psql -X -U "$restore_user" -d "$restore_db" -v ON_ERROR_STOP=1 \
    -c "ALTER SYSTEM SET log_error_verbosity = 'verbose'" >/dev/null 2>&1 &&
   [[ "$(docker exec "$name" psql -X -U "$restore_user" -d "$restore_db" -Atqc 'SELECT pg_reload_conf()' 2>/dev/null)" == t ]] &&
   [[ "$(docker exec "$name" psql -X -U "$restore_user" -d "$restore_db" -Atqc 'SHOW log_error_verbosity' 2>/dev/null)" == verbose ]]; then
  sqlstate_logging=1
fi
# Isolate restore-time messages from harmless container bootstrap errors.
restore_started_at="$(date -u +%Y-%m-%dT%H:%M:%S.%NZ)"
# Stop at the FIRST SQL error: later errors are often cascading symptoms.
# Never print the captured stderr; it may contain private SQL or object names.
restore_flags=(--verbose --exit-on-error --no-owner --no-acl)
if [[ "$verify_scope" == application ]]; then
  # Recover only KSOL public schema and rows, not platform-owned schemas or
  # post-data indexes, foreign keys, policies or triggers. Those are assessed
  # separately; this is DATA SALVAGE verification, not a deployable DB.
  restore_flags+=(--schema=public --section=pre-data --section=data)
fi
if ! docker exec -i "$name" pg_restore "${restore_flags[@]}" \
  --username "$restore_user" --dbname "$restore_db" >/dev/null 2>"$restore_errors"; then
  category='OTHER_RESTORE_ERROR'
  # Never emit Docker/PostgreSQL logs or raw SQL. Extract ONLY the first
  # five-character SQLSTATE from server ERROR/FATAL/PANIC lines emitted since
  # the restore began. This works even when pg_restore's stderr says only
  # "could not execute query". Client-only failures retain the old classifier.
  if [[ "$sqlstate_logging" == 1 ]]; then
    sqlstate="$(docker logs --since "$restore_started_at" "$name" 2>&1 |
      sed -nE 's/.*(ERROR|FATAL|PANIC):[[:space:]]+([A-Z0-9]{5}):.*/\2/p' |
      head -n 1 || true)"
    if [[ "$sqlstate" =~ ^[A-Z0-9]{5}$ ]]; then
      echo "RESTORE_FAILED_SQLSTATE: $sqlstate" >&2
    else
      echo 'RESTORE_FAILED_SQLSTATE: NOT_AVAILABLE' >&2
    fi
  else
    echo 'RESTORE_FAILED_SQLSTATE: LOGGING_UNAVAILABLE' >&2
  fi
  if grep -Eiq 'role .* does not exist|role .* already exists' "$restore_errors"; then
    category='SUPABASE_ROLE_MISMATCH'
  elif grep -Eiq 'extension .* is not available|could not open extension control file' "$restore_errors"; then
    category='MISSING_EXTENSION'
  elif grep -Eiq 'permission denied|must be owner|insufficient privilege|must be superuser|must be member of role|not permitted to|must be a member of' "$restore_errors"; then
    category='PERMISSIONS'
  elif grep -Eiq 'already exists|duplicate key|multiple primary keys' "$restore_errors"; then
    category='OBJECT_CONFLICT'
  elif grep -Eiq 'unrecognized configuration parameter|syntax error|unsupported version|unsupported version in file header|server version mismatch' "$restore_errors"; then
    category='POSTGRES_COMPATIBILITY'
  elif grep -Eiq 'No space left on device|could not extend file|disk full' "$restore_errors"; then
    category='DISPOSABLE_STORAGE_LIMIT'
  elif grep -Eiq 'unexpected end of file|could not read from input file|input file is too short|not a valid archive|input file appears to be a text format|end of file' "$restore_errors"; then
    category='ARCHIVE_STREAM_INVALID'
  elif grep -Eiq '(schema|relation|table|function|procedure|type|operator|extension|sequence|collation|domain) .* does not exist|could not find .* in the archive' "$restore_errors"; then
    category='DEPENDENCY_NOT_FOUND'
  elif grep -Eiq 'could not execute query|error while processing TOC|errors ignored on restore|command was:|could not connect to database|connection to server .* failed' "$restore_errors"; then
    category='UNCLASSIFIED_SQL_OR_CONNECTION_ERROR'
  fi
  # Distinguish broad root-cause families from cascading errors. The captured
  # SQL and identifier names stay private and are never included in logs.
  if grep -Eiq 'must be superuser|must be member of role|must be a member of' "$restore_errors"; then
    echo 'RESTORE_DIAGNOSTIC: SUPERUSER_OR_ROLE_PRIVILEGE_REQUIRED' >&2
  fi
  if grep -Eiq 'schema .* does not exist' "$restore_errors"; then echo 'RESTORE_DEPENDENCY_SCOPE: SCHEMA' >&2; fi
  # These are fixed, public platform schema identifiers, not private names.
  # Only emit a matching allowlisted category.
  for schema in auth storage extensions public; do
    if grep -Eiq "schema [\"']?${schema}[\"']? does not exist" "$restore_errors"; then
      echo "RESTORE_DEPENDENCY_KNOWN_SCHEMA: ${schema^^}" >&2
    fi
  done
  if grep -Eiq '(relation|table|sequence) .* does not exist' "$restore_errors"; then echo 'RESTORE_DEPENDENCY_SCOPE: RELATION' >&2; fi
  if grep -Eiq '(function|procedure) .* does not exist' "$restore_errors"; then echo 'RESTORE_DEPENDENCY_SCOPE: FUNCTION' >&2; fi
  if grep -Eiq '(type|domain|operator|collation) .* does not exist' "$restore_errors"; then echo 'RESTORE_DEPENDENCY_SCOPE: TYPE_OR_OPERATOR' >&2; fi
  if grep -Eiq 'extension .* does not exist' "$restore_errors"; then echo 'RESTORE_DEPENDENCY_SCOPE: EXTENSION' >&2; fi
  if grep -Eiq 'unsupported version in file header|input file appears to be a text format' "$restore_errors"; then
    echo 'RESTORE_DIAGNOSTIC: ARCHIVE_FORMAT_INCOMPATIBILITY' >&2
  fi
  # pg_restore reports the failed TOC entry type with --verbose. Publish only an
  # allowlisted object kind, never the archived schema/object name or SQL.
  # The regex intentionally anchors immediately after the TOC entry's two OIDs.
  for toc_kind in 'TABLE DATA' 'FK CONSTRAINT' 'DEFAULT ACL' 'EVENT TRIGGER' 'MATERIALIZED VIEW' 'SEQUENCE SET' 'TABLE ATTACH' 'SEQUENCE OWNED BY' 'SCHEMA' 'EXTENSION' 'TYPE' 'DOMAIN' 'FUNCTION' 'PROCEDURE' 'AGGREGATE' 'CAST' 'TABLE' 'VIEW' 'INDEX' 'SEQUENCE' 'CONSTRAINT' 'TRIGGER' 'POLICY' 'RULE' 'ACL' 'COMMENT' 'PUBLICATION' 'COLLATION' 'OPERATOR'; do
    if grep -Eq "from TOC entry [0-9]+; [0-9]+ [0-9]+ ${toc_kind}([[:space:]]|$)" "$restore_errors"; then
      echo "RESTORE_FAILED_TOC_KIND: ${toc_kind// /_}" >&2
      break
    fi
  done
  # Only print names from a fixed allowlist. pg_restore formats vary:
  # `EXTENSION - name` in some versions and `EXTENSION name` in others.
  # The first failing TOC entry is used because --exit-on-error is enabled.
  if grep -Eq 'from TOC entry [0-9]+; [0-9]+ [0-9]+ EXTENSION([[:space:]]|$)' "$restore_errors"; then
    echo 'RESTORE_FAILED_PLATFORM_COMPONENT: EXTENSION' >&2
    failed_extension_entry="$(grep -Em1 'from TOC entry [0-9]+; [0-9]+ [0-9]+ EXTENSION([[:space:]]|$)' "$restore_errors" || true)"
    for ext in pg_cron pg_net supabase_vault vault pg_stat_statements pgcrypto uuid-ossp plpgsql vector pg_graphql pgsodium pgjwt citext pg_trgm unaccent pgmq hstore btree_gist btree_gin http postgis pg_repack pg_audit pg_tle wrappers pg_safeupdate; do
      if [[ "$failed_extension_entry" =~ EXTENSION[[:space:]]+(-[[:space:]]+)?${ext}([[:space:]]|$) ]]; then
        echo "RESTORE_FAILED_KNOWN_EXTENSION: $ext" >&2
        break
      fi
    done
    # Categorize the first failure using fixed literal families, not raw SQL.
    # An encrypted archive may contain Supabase-managed extensions that are
    # not restorable in a generic empty database, even with the right PG major.
    if grep -Eiq 'shared_preload_libraries|must be preloaded|must be loaded via shared_preload_libraries|requires a restart' "$restore_errors"; then
      echo 'RESTORE_EXTENSION_FAILURE_SCOPE: SERVER_PRELOAD_CONFIGURATION' >&2
    elif grep -Eiq 'can only be (created|installed) in|must be (created|installed) in|only supported in|is only supported in' "$restore_errors"; then
      echo 'RESTORE_EXTENSION_FAILURE_SCOPE: FIXED_DATABASE_REQUIREMENT' >&2
    elif grep -Eiq 'schema .* does not exist|schema .* must exist|schema .* has not been created' "$restore_errors"; then
      echo 'RESTORE_EXTENSION_FAILURE_SCOPE: SCHEMA_BOOTSTRAP_REQUIRED' >&2
    elif grep -Eiq 'extension .* already exists|duplicate object|is already installed' "$restore_errors"; then
      echo 'RESTORE_EXTENSION_FAILURE_SCOPE: PLATFORM_BOOTSTRAP_CONFLICT' >&2
    elif grep -Eiq 'permission denied|must be superuser|must be owner|not permitted|superuser is required|is not a superuser' "$restore_errors"; then
      echo 'RESTORE_EXTENSION_FAILURE_SCOPE: ROLE_OR_PRIVILEGE' >&2
    elif grep -Eiq 'version .* is not available|has no installation script|could not open extension control file|could not access file|could not load library|undefined symbol|is not available' "$restore_errors"; then
      echo 'RESTORE_EXTENSION_FAILURE_SCOPE: VERSION_OR_PACKAGE' >&2
    elif grep -Eiq 'unrecognized configuration parameter|syntax error|incompatible library' "$restore_errors"; then
      echo 'RESTORE_EXTENSION_FAILURE_SCOPE: SERVER_CONFIGURATION_OR_BINARY' >&2
    else
      echo 'RESTORE_EXTENSION_FAILURE_SCOPE: UNCLASSIFIED' >&2
    fi
  fi
  # Report only recognized public extension identifiers, never raw stderr,
  # SQL, private object names or untrusted text from the archive.
  if [[ "$category" == 'MISSING_EXTENSION' ]]; then
    for ext in vector pg_graphql pg_net pgcrypto uuid-ossp pg_trgm btree_gist btree_gin citext hstore unaccent pg_stat_statements pgjwt pgsodium vault http pg_cron pgmq postgis pg_repack; do
      if grep -Eiq "extension .*${ext}.* is not available|extension control file.*${ext}[.]control" "$restore_errors"; then
        echo "MISSING_EXTENSION_KNOWN_NAME: $ext" >&2
      fi
    done
  fi
  if [[ "$category" == 'PERMISSIONS' ]]; then
    if grep -Eiq 'permission denied for schema' "$restore_errors"; then echo 'PERMISSION_SCOPE: SCHEMA' >&2; fi
    if grep -Eiq 'permission denied to create extension|must be superuser to create this extension' "$restore_errors"; then echo 'PERMISSION_SCOPE: EXTENSION_CREATION' >&2; fi
    if grep -Eiq 'must be owner of extension|must be owner of schema|must be owner of table' "$restore_errors"; then echo 'PERMISSION_SCOPE: OWNERSHIP' >&2; fi
    if grep -Eiq 'permission denied to create role|permission denied to alter role' "$restore_errors"; then echo 'PERMISSION_SCOPE: ROLE_MANAGEMENT' >&2; fi
    if grep -Eiq 'permission denied for database' "$restore_errors"; then echo 'PERMISSION_SCOPE: DATABASE' >&2; fi
    if grep -Eiq 'permission denied to set parameter|permission denied to set role' "$restore_errors"; then echo 'PERMISSION_SCOPE: SESSION' >&2; fi
  fi
  # Report only generic conflict classes; never echo archive object names,
  # SQL statements, schema identifiers or raw pg_restore diagnostics.
  if [[ "$category" == 'OBJECT_CONFLICT' ]]; then
    if grep -Eiq 'schema .* already exists' "$restore_errors"; then echo 'CONFLICT_SCOPE: SCHEMA' >&2; fi
    if grep -Eiq 'extension .* already exists' "$restore_errors"; then echo 'CONFLICT_SCOPE: EXTENSION' >&2; fi
    if grep -Eiq 'relation .* already exists|table .* already exists' "$restore_errors"; then echo 'CONFLICT_SCOPE: TABLE_OR_RELATION' >&2; fi
    if grep -Eiq 'type .* already exists' "$restore_errors"; then echo 'CONFLICT_SCOPE: TYPE' >&2; fi
    if grep -Eiq 'function .* already exists|procedure .* already exists' "$restore_errors"; then echo 'CONFLICT_SCOPE: FUNCTION' >&2; fi
    if grep -Eiq 'constraint .* already exists|multiple primary keys' "$restore_errors"; then echo 'CONFLICT_SCOPE: CONSTRAINT' >&2; fi
    if grep -Eiq 'duplicate key value violates unique constraint' "$restore_errors"; then echo 'CONFLICT_SCOPE: DUPLICATE_DATA' >&2; fi
  fi
  # Surface presence of additional error categories without leaking raw details.
  if grep -Eiq 'role .* does not exist|role .* already exists' "$restore_errors"; then
    echo 'RESTORE_DIAGNOSTIC: ROLE_MISMATCH_PRESENT' >&2
  fi
  if grep -Eiq 'permission denied|must be owner|insufficient privilege' "$restore_errors"; then
    echo 'RESTORE_DIAGNOSTIC: PERMISSIONS_PRESENT' >&2
  fi
  if grep -Eiq 'already exists|duplicate key|multiple primary keys' "$restore_errors"; then
    echo 'RESTORE_DIAGNOSTIC: OBJECT_CONFLICT_PRESENT' >&2
  fi
  rm -f "$restore_errors"
  echo "RESTORE_FAILED_CATEGORY: $category (raw diagnostics suppressed)" >&2
  exit 2
fi
rm -f "$restore_errors"
# Avoid exposing table names, values or metadata to logs.
count="$(docker exec "$name" psql -X -U postgres -d "$restore_db" -Atqc \
  "SELECT count(*) FROM pg_catalog.pg_class WHERE relkind IN ('r','p') AND relnamespace NOT IN (SELECT oid FROM pg_namespace WHERE nspname LIKE 'pg_%' OR nspname='information_schema');" 2>/dev/null)" || {
  echo 'RESTORE_FAILED: catalog check failed' >&2; exit 2;
}
if ! [[ "$count" =~ ^[0-9]+$ ]] || (( count == 0 )); then
  echo 'RESTORE_FAILED: no restored user tables' >&2; exit 2
fi
# Real Supabase backup mode: confirm required application and platform tables
# exist in the restored catalog. Only boolean results leave the container.
if [[ "${KSOL_EXPECT_SUPABASE_SCHEMA:-0}" == '1' ]]; then
  present="$(docker exec "$name" psql -X -U postgres -d "$restore_db" -Atqc \
    "SELECT (to_regclass('auth.users') IS NOT NULL AND to_regclass('storage.objects') IS NOT NULL AND to_regclass('public.student_profiles') IS NOT NULL AND to_regclass('public.test_attempts') IS NOT NULL)::int;" 2>/dev/null)" || {
    echo 'RESTORE_FAILED: expected schema check failed' >&2; exit 2;
  }
  if [[ "$present" != '1' ]]; then
    echo 'RESTORE_FAILED: required Supabase tables missing' >&2
    exit 2
  fi
  echo 'KSOL_REQUIRED_SUPABASE_TABLES_PRESENT=YES'
fi
if [[ "$verify_scope" == application ]]; then
  # Check both KSOL application tables in the isolated database, including
  # basic SQL readability. No counts, rows, private identifiers or data printed.
  verified="$(docker exec "$name" psql -X -U "$restore_user" -d "$restore_db" -Atqc \
    "SELECT (to_regclass('public.student_profiles') IS NOT NULL AND to_regclass('public.test_attempts') IS NOT NULL)::int;" 2>/dev/null)" || {
    echo 'RESTORE_FAILED: application schema check failed' >&2; exit 2;
  }
  [[ "$verified" == 1 ]] || {
    echo 'RESTORE_FAILED: required application tables missing' >&2; exit 2;
  }
  # Require nonempty actual rows rather than only successfully created tables.
  # The backup may contain personal data, so return only a single boolean.
  readable="$(docker exec "$name" psql -X -U "$restore_user" -d "$restore_db" -Atqc \
    "SELECT (EXISTS(SELECT 1 FROM public.student_profiles) AND EXISTS(SELECT 1 FROM public.test_attempts))::int;" 2>/dev/null)" || {
    echo 'RESTORE_FAILED: application tables unreadable' >&2; exit 2;
  }
  [[ "$readable" == 1 ]] || {
    echo 'RESTORE_FAILED: required application tables have no rows' >&2
    exit 2
  }
  echo 'KSOL_APPLICATION_DATA_READABLE=YES'
  echo 'KSOL_APPLICATION_CONSTRAINTS_RLS_INDEXES=NOT_VERIFIED'
  echo 'FULL_SUPABASE_RESTORE=NOT_VERIFIED'
  echo 'RELEASE_GATE=NO_GO'
  exit 0
fi
echo 'KSOL_DISPOSABLE_POSTGRES_RESTORE_OK: nonempty table catalog verified'
echo 'FULL_SUPABASE_RESTORE=NOT_VERIFIED'
echo 'RELEASE_GATE=NO_GO'
