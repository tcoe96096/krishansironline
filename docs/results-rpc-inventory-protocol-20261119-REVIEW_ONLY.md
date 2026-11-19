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
