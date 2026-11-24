# KSOL Result Card — redacted RPC / RLS inventory protocol (REVIEW ONLY)

Date: 2026-11-19. Scope: Preview vs Production evidence, **not** activation. No credentials, student rows, signed URLs, SQL execution, database changes or release in this commit.

## Evidence boundary
- The 2026-11-17 Preview preflight mentions a 2026-11-15 result-card publisher migration, but does not identify its SQL body or current installed functions. Treat actual Preview signatures, permissions and Production parity as **UNKNOWN**.
- The same preflight reports direct `TRUNCATE`, `TRIGGER`, `REFERENCES` grants on `public.user_roles` to `anon` and `authenticated`. This is a separate existing risk; do not alter Teacher/Student permissions from the Results branch.
- Recovery remains unverified: the limited local restore failed on a missing genuine `auth.users` dependency. Do not infer a complete recoverable backup.

## Authorized reviewer capture — metadata only
For each environment separately, record UTC capture time, project alias (not secret), read-only account role, migration version/name, function schema/name/argument types/return type, `SECURITY DEFINER` status, function `search_path`, effective EXECUTE grants for `PUBLIC`, `anon`, `authenticated`, `service_role`; relevant table RLS enabled/forced flags, policy name/command/roles, storage bucket public flag and storage policy names. Record object identifiers only, not row contents or tokens. If a catalog query cannot be safely limited to metadata, do not run it.

## Contract acceptance matrix (all UNKNOWN until live read-only evidence)
| Operation | Required deny-first check | Preview | Production |
| --- | --- | --- | --- |
| Template draft/edit | Staff role and template ownership enforced server-side | UNKNOWN | UNKNOWN |
| Approve/issue | Explicit authorized issuer, immutable revision and idempotent issue key | UNKNOWN | UNKNOWN |
| Student inbox | Authenticated user can only list own issued, non-revoked results | UNKNOWN | UNKNOWN |
| Download/print | Private object, short-lived scoped URL after server ownership check | UNKNOWN | UNKNOWN |
| Revoke | Authorized staff, audit event, invalidated future downloads | UNKNOWN | UNKNOWN |
| Audit | Staff-only least-privilege access; student cannot enumerate others | UNKNOWN | UNKNOWN |

## Verification protocol
1. Capture the two environment inventories independently; attach only redacted metadata and reviewer sign-off to the draft PR.
2. Compare exact function signatures and migration history rather than searching source names alone. Verify whether anonymous or ordinary authenticated users can execute privileged functions through grants or indirect RPCs.
3. Perform negative authorization tests in an isolated recovery-verified test environment: unauthenticated, student A vs student B, unassigned teacher, assigned teacher, admin, revoked result, expired URL, repeated issue. Synthetic identities only.
4. Preserve the mock UI separation. No frontend-to-RPC wiring, SQL migration, cross-user delivery, publish, merge or deployment before recovery verification, security acceptance and separate owner approval for each target.

Next bounded task: read-only migration/RPC metadata reconciliation and redacted evidence collection. This document is a proposed checklist, **not** a completed database inspection.


## Reviewer-only catalog SQL examples (NOT EXECUTED)

These are **read-only templates** for a separately authorized operator. Run independently against Preview and Production only after confirming the connection points to the intended project. Do not include any application rows, secrets, function source bodies, or signed URLs in evidence.

```sql
-- Function metadata only; no pg_get_functiondef and no function invocation.
SELECT n.nspname AS schema_name,
       p.proname AS function_name,
       pg_get_function_identity_arguments(p.oid) AS argument_types,
       pg_get_function_result(p.oid) AS return_type,
       p.prosecdef AS security_definer,
       p.proconfig AS function_settings,
       p.proacl AS explicit_acl
FROM pg_catalog.pg_proc p
JOIN pg_catalog.pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND (p.proname ILIKE '%result%' OR p.proname ILIKE '%report%')
ORDER BY 1, 2, 3;

-- RLS configuration and policy metadata; never query student/result rows.
SELECT schemaname, tablename, rowsecurity
FROM pg_catalog.pg_tables
WHERE schemaname = 'public'
  AND (tablename ILIKE '%result%' OR tablename ILIKE '%report%')
ORDER BY 1, 2;

SELECT schemaname, tablename, policyname, permissive, roles, cmd
FROM pg_catalog.pg_policies
WHERE schemaname = 'public'
  AND (tablename ILIKE '%result%' OR tablename ILIKE '%report%')
ORDER BY 1, 2, 3;
```

**Limits:** Pattern matching can miss differently named dependencies; `proacl` null means default privileges, not necessarily no EXECUTE. The reviewer must separately inspect effective privileges, policy predicates, table `relforcerowsecurity`, storage policy metadata and installed migration versions before any parity claim. Catalog output alone does not prove authorization works. Keep all matrix cells UNKNOWN until timestamped, redacted, environment-specific evidence and security review exist.

## Verified repository checkpoint — 2026-11-20

Draft PR #122 head `e87ec828e488a709fab8056105df8562d727be18` had four successful PR-triggered GitHub Actions: Preview build (no production deploy), Teacher Core Beta isolated checks, Hosting compliance, and Validate website build. This verifies repository CI only; **no database catalog connection or browser authorization test was performed**. PR #117 was merged. Recovery and Production Result Card backend remain unverified.

## Effective privilege and forced-RLS checks — SQL TEMPLATES ONLY (2026-11-20)

These queries close gaps in the earlier *metadata-only* examples. They are **NOT EXECUTED**. A separately authorized reviewer must confirm the intended environment before running them independently in Preview and Production, and capture redacted UTC-stamped results. Never attach credentials, application rows, function bodies, policy expressions, tokens, or signed URLs.

```sql
-- Effective EXECUTE, including implicit PUBLIC privileges (proacl NULL is not a denial).
-- These are metadata predicates, not function calls.
SELECT n.nspname AS schema_name,
       p.proname AS function_name,
       pg_get_function_identity_arguments(p.oid) AS argument_types,
       p.prosecdef AS security_definer,
       p.proconfig AS function_settings,
       has_function_privilege('PUBLIC', p.oid, 'EXECUTE') AS public_execute,
       CASE WHEN EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon')
            THEN has_function_privilege('anon', p.oid, 'EXECUTE') END AS anon_execute,
       CASE WHEN EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated')
            THEN has_function_privilege('authenticated', p.oid, 'EXECUTE') END AS authenticated_execute,
       CASE WHEN EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role')
            THEN has_function_privilege('service_role', p.oid, 'EXECUTE') END AS service_role_execute
FROM pg_catalog.pg_proc p
JOIN pg_catalog.pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND (p.proname ILIKE '%result%' OR p.proname ILIKE '%report%')
ORDER BY 1, 2, 3;

-- Both RLS enabled and FORCE RLS flags; catalog metadata only.
SELECT n.nspname AS schema_name, c.relname AS table_name,
       c.relrowsecurity AS rls_enabled, c.relforcerowsecurity AS rls_forced
FROM pg_catalog.pg_class c
JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public' AND c.relkind IN ('r', 'p')
  AND (c.relname ILIKE '%result%' OR c.relname ILIKE '%report%')
ORDER BY 1, 2;

-- Supabase migration history metadata only; skip if relation absent or access denied.
-- Avoid claiming migration applied based solely on a repository SQL filename.
SELECT version, name
FROM supabase_migrations.schema_migrations
ORDER BY version;
```

**Interpretation:** A function with `SECURITY DEFINER` and broad EXECUTE needs separate review of ownership, explicit `search_path`, and internal authorization logic; metadata alone cannot establish safe access. `PUBLIC` EXECUTE can apply even when `proacl` is null. Function-name patterns are incomplete discovery: reviewers must reconcile migration-defined function names and indirect dependencies, including non-public schemas. RLS enabled/forced flags do not establish correct policy behavior. The migration-history table/schema and `name` column may differ by environment; verify its structure first and record UNKNOWN when inaccessible. Storage bucket/policy metadata and negative role tests remain separate gates. No production activation or parity assertion is authorized by these queries.
