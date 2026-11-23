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
  if docker exec "$name" pg_isready -U postgres -d ksol_recovery >/dev/null 2>&1; then ready=1; break; fi
  sleep 1
done
if [[ "$ready" != 1 ]]; then echo 'RESTORE_FAILED: isolated database not ready' >&2; exit 2; fi

# Stream directly to pg_restore in the isolated container, no dump file or
# decrypted backup in logs. Suppress raw stderr (may contain private SQL/data).
if ! docker exec -i "$name" pg_restore --no-owner --no-acl \
  --username postgres --dbname ksol_recovery >/dev/null 2>/dev/null; then
  echo 'RESTORE_FAILED: pg_restore returned nonzero (details suppressed)' >&2
  exit 2
fi
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
