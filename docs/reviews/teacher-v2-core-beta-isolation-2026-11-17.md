# KSOL Teacher Core Beta — isolated code review (2026-11-17)
Status: CODE-ONLY REVIEW. NOT DEPLOYED. NOT DATABASE-ACTIVATED. DO NOT MERGE UNTIL REQUIRED CI AND RELEASE GATES PASS.

Source: draft PR #109 at a789634da8e734a5a87ff4590e9f4c1420025fc9. Base main: 0e78ec8dd9d23ac179519ed6f9f0de33f9a6feb4.
This dedicated Teacher Beta portal defaults to OFF (VITE_TEACHER_BETA_ENABLED unset).
The release excludes Resume Upload, Resume AI, private Storage activation, analytics UI, unrelated website changes and auto-applied migrations.

Verified READ-ONLY Preview findings (zgpkmfqioqvincmgyfpi):
- Project ACTIVE_HEALTHY; legacy teacher_enrollment_requests and teacher_enrollment_audit tables exist with RLS.
- Teacher v2 profiles, assignments and RPCs not installed; no teacher v2 core migration in history.
- The security advisor reported SECURITY DEFINER access warnings requiring targeted authorization review.
- Managed backups/PITR or a successful isolated restore have NOT been verified.
- Both legacy class-10 teachers' exact subject mappings, real OAuth and authenticated role/RLS tests are unverified.

Before release: test recovery, review all proposed SQL/grants, run real Preview role/OAuth acceptance, check CI and main website regression, verify there is no implicit deployment trigger, and obtain deliberate owner release decision. All SQL is REVIEW_ONLY; do not execute automatically.

## Preview schema compatibility verification — 2026-11-17 (read-only)
- Confirmed `public.teacher_enrollment_requests.subject` and `.requested_class` are scalar `text` fields; `public.result_staff_grants.scope_class` is also scalar `text`.
- No `public.teacher_v2_profiles`, `public.teacher_profiles`, or `public.teacher_assignments` tables appeared in the checked Preview schema. This does not prove the absence of differently named tables; migration inventory remains the source of truth.
- Existing `review_teacher_enrollment` approves a single requested class into `result_staff_grants.scope_class`. This cannot by itself implement multi-class/multi-subject assignment.
- Keep legacy enrollment and grants unchanged. Introduce separately reviewed teacher v2 profile and normalized assignment records with ownership/admin RLS, server-side checks, and an explicit mapping plan; do not widen existing permissions by interpreting a scalar as a list.
- No SQL executed for writes, no schema changes, and no activation. Release remains blocked on backup/restore proof and authenticated role tests.

## Proposed v2 schema/function compatibility review — 2026-11-17
- Reviewed `teacher_management_v2_schema_REVIEW_ONLY.sql` and `teacher_management_v2_functions_REVIEW_ONLY.sql` against the live read-only Preview column inventory.
- Proposed `teacher_profiles` stores approval state and unique `KSOL-T-` employee ID; `teacher_qualifications` supports multiple qualifications; `teacher_assignments` uses separate rows keyed by teacher/class/subject/work type and a partial unique active-scope index. This is the correct additive shape for multiple classes/subjects without changing legacy scalar `requested_class` or `scope_class`.
- Proposed `teacher_v2_set_assignment` requires verified Super Admin, approved teacher status for grants, a reason and feature gates; it supports revocation even after suspension. Proposed functions revoke PUBLIC/anon/authenticated EXECUTE pending a separately reviewed grant plan.
- Proposed schema also defines `teacher_resume_documents`, but resume upload, private storage and AI remain out of scope for Core Beta; no activation or grants permitted.
- Outstanding: compare integration/lifecycle/profile RPCs, review `private.teacher_v2_feature_enabled`, verify `is_super_admin`, test SQL on a recoverable isolated environment, and document legacy teacher mapping before any rollout.

## Lifecycle / profile RPC / integration review — 2026-11-17
- `teacher_v2_save_application` uses `auth.uid()`, a per-account advisory lock, optimistic revision checks, bounded qualification/scope arrays and no client-controlled approval or employee ID fields. It requires the server-side registration flag.
- `teacher_v2_review` requires an independent Super Admin, matching revision, `p_verified=true` for approval, at least one assignment, closes legacy staff grants, issues employee ID, and grants each reviewed scope. The boolean verification input is a claim supplied by the caller; a release review MUST establish trusted verification evidence and reviewer accountability rather than treating `p_verified=true` as proof by itself.
- `teacher_v2_suspend` revokes active assignments and legacy grants; `teacher_v2_restore` does not restore revoked rights. `teacher_v2_snapshot` and `teacher_v2_directory` enforce owner/admin access in function code, but still require authenticated negative tests and exact EXECUTE grants review.
- `teacher_v2_profile_rpc` revokes public execution by default; `teacher_v2_save_profile` only permits pending profiles, while the lifecycle routine first transitions rejected profiles to pending before editing. Test this transition end-to-end.
- `teacher_v2_integration` changes policies on `public.study_material_items` using `DROP POLICY` and `CREATE POLICY`: this is NOT a safe stand-alone Core Beta deployment, requires existence/schema and all legacy policy inventories, and must be separately authorized and regression-tested before any application. Its material permission function preserves legacy fallback only for accounts with no v2 profile.
- Remain code-only: do not run integration SQL, change legacy policies, enable material authoring, activate resume/analytics, or deploy while recovery and real-role acceptance are unverified.

## Verified live Preview Study Materials RLS inventory — 2026-11-17 (read-only)
- Read `pg_policies` for `public.study_material_items` in Preview `zgpkmfqioqvincmgyfpi`; six policies are installed.
- Five staff/draft policies exactly match the integration proposal's `DROP POLICY IF EXISTS` targets: `Owner may delete only own drafts` (DELETE), `Owner or super admin reads review drafts` (SELECT), `Scoped editors create drafts` (INSERT), `Scoped editors update only own drafts` (UPDATE), `Scoped staff submit own drafts for review` (UPDATE). All target `authenticated`.
- Sixth policy `Published material is readable` (SELECT, roles `anon,authenticated`, condition `status='published'`) is intentionally not dropped by the proposal.
- Existing staff permissions reference `result_staff_grants` with `is_active`, permission array and scalar class scope. The proposed replacement uses `teacher_v2_material_permission` and introduces subject-aware v2 assignments, so regression tests must cover legacy teacher scope, super admin, draft-to-review transition, published anonymous reads, suspended v2 denial and cross-subject denial.
- This is schema/policy inventory evidence, NOT proof that a migration or RLS behavior tests succeeded. No SQL writes, policy changes, deployments or feature activations occurred.

## Preview Super Admin authorization dependency — 2026-11-17 (read-only)
- Verified `public.is_super_admin()` exists as a STABLE SQL `SECURITY DEFINER` function with `search_path=public` in Preview `zgpkmfqioqvincmgyfpi`.
- Definition checks `auth.uid() IS NOT NULL` and existence of `public.user_roles` row with matching `user_id=auth.uid()` and `lower(role)='super_admin'`; the caller does not supply a user ID or role argument.
- `has_function_privilege`: `anon` EXECUTE=false, `authenticated` EXECUTE=true, `public` EXECUTE=false.
- This verifies function identity and grants only, not RLS/role-table mutation security or real-account acceptance. Before any activation, separately inspect `public.user_roles` INSERT/UPDATE/DELETE privileges, RLS and role-management RPCs to exclude self-escalation.
- No database writes, migration, deployment, or feature activation occurred.
