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
docker run -d --name "$name" --network none --tmpfs /var/lib/postgresql/data:rw,size=2g \
  -e POSTGRES_PASSWORD="$password" -e POSTGRES_DB=ksol_recovery \
  postgres:17-alpine >/dev/null
ready=0
for i in $(seq 1 60); do
  if docker exec "$name" psql -X -U postgres -d ksol_recovery -Atqc "SELECT 1" >/dev/null 2>&1; then ready=1; break; fi
  sleep 1
done
if [[ "$ready" != 1 ]]; then echo 'RESTORE_FAILED: isolated database not ready' >&2; exit 2; fi

# Supabase-managed grants/default privileges reference platform roles absent from
# vanilla PostgreSQL. Create inert NOLOGIN placeholders ONLY inside this
# offline, network-disabled disposable container. No real users or credentials.
# This does not recreate Supabase services or authorize a production restore.
docker exec "$name" psql -X -v ON_ERROR_STOP=1 -U postgres -d ksol_recovery \
  -c "DO \$\$ DECLARE role_name text; BEGIN
    FOREACH role_name IN ARRAY ARRAY[
      'anon','authenticated','service_role','authenticator',
      'supabase_admin','supabase_auth_admin','supabase_storage_admin',
      'supabase_realtime_admin','supabase_functions_admin',
      'supabase_read_only_user','dashboard_user','pgbouncer',
      'pgsodium_keyholder','pgsodium_keyiduser','pgsodium_keymaker'
    ] LOOP
      IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname=role_name) THEN
        EXECUTE format('CREATE ROLE %I NOLOGIN',role_name);
      END IF;
    END LOOP;
  END \$\$;" >/dev/null 2>/dev/null || {
    echo 'RESTORE_FAILED: disposable Supabase role compatibility setup failed' >&2
    exit 2
  }

# Stream directly to pg_restore in the isolated container, no dump file or
# decrypted backup in logs. Suppress raw stderr (may contain private SQL/data).
# Capture diagnostics in a private temporary file, emit only safe categories.
# Raw SQL, object names and sensitive stderr must never enter Actions logs.
restore_errors="$(mktemp)"
chmod 600 "$restore_errors"
if ! docker exec -i "$name" pg_restore --no-owner --no-acl \
  --username postgres --dbname ksol_recovery >/dev/null 2>"$restore_errors"; then
  category='OTHER_RESTORE_ERROR'
  if grep -Eiq 'role .* does not exist|role .* already exists' "$restore_errors"; then
    category='SUPABASE_ROLE_MISMATCH'
  elif grep -Eiq 'extension .* is not available|could not open extension control file' "$restore_errors"; then
    category='MISSING_EXTENSION'
  elif grep -Eiq 'permission denied|must be owner|insufficient privilege' "$restore_errors"; then
    category='PERMISSIONS'
  elif grep -Eiq 'already exists|duplicate key|multiple primary keys' "$restore_errors"; then
    category='OBJECT_CONFLICT'
  elif grep -Eiq 'unrecognized configuration parameter|syntax error|unsupported version' "$restore_errors"; then
    category='POSTGRES_COMPATIBILITY'
  elif grep -Eiq 'No space left on device|could not extend file|disk full' "$restore_errors"; then
    category='DISPOSABLE_STORAGE_LIMIT'
  elif grep -Eiq 'unexpected end of file|could not read from input file|input file is too short|not a valid archive' "$restore_errors"; then
    category='ARCHIVE_STREAM_INVALID'
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
count="$(docker exec "$name" psql -X -U postgres -d ksol_recovery -Atqc \
  "SELECT count(*) FROM pg_catalog.pg_class WHERE relkind IN ('r','p') AND relnamespace NOT IN (SELECT oid FROM pg_namespace WHERE nspname LIKE 'pg_%' OR nspname='information_schema');" 2>/dev/null)" || {
  echo 'RESTORE_FAILED: catalog check failed' >&2; exit 2;
}
if ! [[ "$count" =~ ^[0-9]+$ ]] || (( count == 0 )); then
  echo 'RESTORE_FAILED: no restored user tables' >&2; exit 2
fi
# Real Supabase backup mode: confirm required application and platform tables
# exist in the restored catalog. Only boolean results leave the container.
if [[ "${KSOL_EXPECT_SUPABASE_SCHEMA:-0}" == '1' ]]; then
  present="$(docker exec "$name" psql -X -U postgres -d ksol_recovery -Atqc \
    "SELECT (to_regclass('auth.users') IS NOT NULL AND to_regclass('storage.objects') IS NOT NULL AND to_regclass('public.student_profiles') IS NOT NULL AND to_regclass('public.test_attempts') IS NOT NULL)::int;" 2>/dev/null)" || {
    echo 'RESTORE_FAILED: expected schema check failed' >&2; exit 2;
  }
  if [[ "$present" != '1' ]]; then
    echo 'RESTORE_FAILED: required Supabase tables missing' >&2
    exit 2
  fi
  echo 'KSOL_REQUIRED_SUPABASE_TABLES_PRESENT=YES'
fi
echo 'KSOL_DISPOSABLE_POSTGRES_RESTORE_OK: nonempty table catalog verified'
echo 'FULL_SUPABASE_RESTORE=NOT_VERIFIED'
echo 'RELEASE_GATE=NO_GO'
