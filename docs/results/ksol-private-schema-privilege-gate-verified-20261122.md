# Verified shared private schema privilege gate — 2026-11-22

Read-only query executed in Preview and Production:
`SELECT n.nspname,has_schema_privilege('anon',n.oid,'USAGE') anon_usage,has_schema_privilege('authenticated',n.oid,'USAGE') authenticated_usage FROM pg_namespace n WHERE n.nspname='private';`

Both returned `anon_usage=false`, `authenticated_usage=true`.

**Security consequence:** `private` is a shared schema with existing authenticated USAGE. Blanket `REVOKE ALL ON SCHEMA private FROM PUBLIC,anon,authenticated` could break unrelated teacher or other RPCs. That instruction was removed from the isolated Result SQL candidate. Restrict privileges on each newly created result table; keep RLS enabled with no permissive policies and no direct client table grants.

**Remaining verification:** Check exact default table privileges, function owner/BYPASSRLS, RPC exposure and authenticated JWT negative tests. Schema USAGE by itself does not imply table access. No SQL was executed beyond read-only catalog checks.
