# Teacher v2 Preview activation gate — 2026-11-22

Status: **BLOCKED — do not deploy or publish**.

## Verified in connected Supabase Preview
- Project: `zgpkmfqioqvincmgyfpi` (`krishan-sir-lms-preview`), ACTIVE_HEALTHY.
- Public teacher tables found: `teacher_enrollment_requests`, `teacher_enrollment_audit` (legacy).
- No `public.teacher_profiles`, `public.teacher_qualifications`, `public.teacher_assignments`, `public.teacher_resume_documents`, or `public.teacher_audit_events` found.
- No `public.teacher_v2_%` routines found.
- Supabase migration history ends with 2026-11-15 preview migrations; no Teacher v2 migration.
- Security advisor returned existing warnings for executable SECURITY DEFINER functions and RLS-enabled tables without policies. Investigate individual findings; do not blindly revoke existing app permissions.

## Proposed migration dependency chain (repository, REVIEW ONLY)
1. `teacher_management_v2_schema_REVIEW_ONLY.sql`
2. `teacher_management_v2_profile_rpc_REVIEW_ONLY.sql`
3. `teacher_management_v2_functions_REVIEW_ONLY.sql`
4. `teacher_management_v2_lifecycle_REVIEW_ONLY.sql`
5. `teacher_management_v2_integration_REVIEW_ONLY.sql`
6. Other feature-specific proposals (resume, acceptance) require separate review.

## Activation checklist
- [ ] Verify managed Preview backup and independent restore test; record timestamps and evidence.
- [ ] Review SQL diffs against live Preview schema; verify dependent tables, policies, and function signatures.
- [ ] Review SECURITY DEFINER auth.uid(), fixed search_path, execute grants, privilege escalation, legacy grant compatibility.
- [ ] Apply reviewed migration bundle **only to Preview** after the above gates are satisfied.
- [ ] Verify SQL functions and RLS with distinct teacher, applicant, admin, super-admin, and anonymous sessions.
- [ ] Test cross-account read/write denial, concurrent approval/revision, multi-scope assignments, employee ID uniqueness, suspension and legacy-grant denial.
- [ ] Verify UI build and automated tests; inspect Preview deployment and end-to-end registration/login/review.
- [ ] Request separate production release authorization after Preview acceptance and rollback readiness.

No SQL was executed to change Preview or Production as part of this audit. PR #109 remains read-only.
