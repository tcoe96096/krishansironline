# Teacher v2 — local legacy RLS evidence and remaining gates (18 Nov 2026)

Scope: user-supplied Windows PostgreSQL outputs from an **isolated local** database `ksol_rls_test_20261118`. These are not Supabase Preview or Production acceptance results.

## Verified local evidence

- Installed 61 public RLS policies and enabled RLS on 33 of 33 public tables. Installer returned SQL exit code 0; postcheck 61 policies / 33 enabled.
- Role inspection: `anon` and `authenticated` exist as NOLOGIN, non-superuser, without BYPASSRLS. Local `service_role` absent.
- Effective table-grant inventory for `anon`, `authenticated`, `service_role` returned zero rows in `information_schema.role_table_grants`; temporary grants were used inside test transactions.
- `auth.uid()` reads the session JWT subject setting; simulated two distinct UUIDs successfully.
- Within a transaction, inserted two synthetic student profiles and temporarily granted `authenticated` SELECT and schema USAGE. Under simulated student A, only A was visible; under B, only B was visible. `ROLLBACK` completed.
- Combined suite: 12 PASS, 3 SKIPPED, 1 REVIEW; SQL exit 0; postcheck 61 policies / 33 enabled / 0 synthetic fixtures.
- Final local permission report: 10 PASS, 3 SKIPPED, 1 REVIEW, 1 GAP; SQL exit 0, rollback reached, 0 fixtures postcheck.

## Important interpretation

- Legacy `public.teacher_enrollment_requests` has an owner-or-super-admin SELECT policy but **no INSERT/ALL policy** in the local baseline. This does **not** establish a v2 registration defect: the v2 frontend calls `teacher_v2_save_application` through the Supabase RPC client, which is a separate proposed server-owned workflow.
- The local standalone PostgreSQL grants do not reproduce Supabase's full role/schema/function privilege environment.
- A zero-row result on an empty table is not sufficient to prove denial. Student isolation above used two synthetic rows and session role switching, but did not verify JWT cryptographic validation or live OAuth.
- The combined scripts marked teacher enrollment runtime, admin/super-admin runtime, and DML runtime SKIPPED. Do not present these as PASS.
- Local RLS success does not prove v2 tables/RPCs are installed. Prior Preview read-only inventory reported v2 schema and RPCs absent.
- Local database `ksol_rls_test_20261118` is not evidence of a fully restored Preview environment or managed recovery readiness.

## Required next acceptance gates

1. Review the existing additive v2 migration bundle and explicit RPC EXECUTE grants; do not add blanket legacy enrollment INSERT privileges.
2. Independently resolve the Preview `public.user_roles` TRUNCATE privilege exposure after approved recovery/change controls; never execute TRUNCATE to test.
3. Obtain Preview recovery proof, then install approved v2 schema/RPCs in a recoverable isolated environment only.
4. Run real authenticated applicant, teacher, admin, super-admin and anonymous **positive and negative** RPC tests, including self-approval, stale revisions, cross-account reads, unauthorized DML and suspended access.
5. Verify two legacy class-10 teacher grants remain unchanged absent explicit, audited transition.
6. Keep study-material integration, resume/AI and Production promotion out of scope until separately approved.

**Release decision:** HOLD. No Preview/Production SQL write, feature activation, deployment or merge is authorized by this evidence. PR #109 monitoring remains read-only.
