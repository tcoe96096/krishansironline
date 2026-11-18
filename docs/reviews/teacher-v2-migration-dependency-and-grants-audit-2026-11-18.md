# Teacher v2 migration dependency and EXECUTE grant audit — 18 November 2026

Status: **CODE-ONLY REVIEW; NO SQL EXECUTED.** Branch: `feature/teacher-v2-preview-readiness-20261118`.

## Existing review-only SQL inventory
1. `teacher_management_v2_schema_REVIEW_ONLY.sql`: additive teacher profiles, qualifications, assignments, resumes and audit; RLS enabled; table privileges revoked from `anon, authenticated`.
2. `teacher_management_v2_beta_flags_REVIEW_ONLY.sql`: server flags and `private.teacher_v2_feature_enabled`; `public.teacher_v2_beta_capabilities()` granted to authenticated.
3. `teacher_management_v2_profile_rpc_REVIEW_ONLY.sql`: profile RPCs, no general EXECUTE.
4. `teacher_management_v2_functions_REVIEW_ONLY.sql`: employee ID and assignments, general EXECUTE revoked.
5. `teacher_management_v2_lifecycle_REVIEW_ONLY.sql`: application, withdrawal, review, suspension, restore, snapshot, directory and audit. At end it grants EXECUTE on multiple RPCs including privileged review and set_assignment to authenticated, subject to function-level authorization checks.
6. `teacher_v2_independent_verification_REVIEW_ONLY.sql`: verification table, RLS enabled, no direct client privileges.
7. `teacher_v2_verification_writer_REVIEW_ONLY.sql`: privileged evidence writer, general EXECUTE revoked, **no authenticated grant**.
8. `teacher_v2_review_independent_evidence_OVERRIDE_REVIEW_ONLY.sql`: overrides review to require revision-bound evidence; **revokes authenticated EXECUTE** on review.
9. `teacher_management_v2_integration_REVIEW_ONLY.sql`: changes Study Materials RLS; must be separately approved, excluded from registration-only activation.

## Verified conflict and required resolution

**EXECUTE grant ordering:** lifecycle grants `teacher_v2_review(...)` to authenticated, but independent-evidence override later revokes it. Result: ordinary PostgREST authenticated callers, **including Super Admin sessions**, cannot invoke the review RPC until an explicitly approved, narrowly reviewed grant is restored. This is a **functional release blocker**, not a reason to grant table DML to clients.

**Verification writer:** `teacher_v2_record_identity_verification(...)` is also revoked from authenticated without a replacement grant. Therefore the proposed independent verification workflow is currently not callable from a normal authenticated Super Admin browser session. Both functions perform server-side `auth.uid()` / Super Admin checks, but the release plan still needs a deliberate EXECUTE grant model, function-owner review and real positive/negative role tests.

**SECURITY DEFINER:** confirm effective function owners, `search_path`, inherited privileges, all overloaded signatures and `PUBLIC` grants after each proposed migration; do not assume REVOKE of one signature covers overloads.

**Migration order:** additive schema → feature flags → profile RPC → employee/assignment functions → lifecycle → independent verification table → writer → review override. This is a **dependency review order**, not an approved executable migration plan. After any review of grants, retest the final combined state rather than intermediate states.

**Legacy compatibility:** do not widen legacy enrollment INSERT permissions. Two existing Class-10 teacher grants should remain unchanged absent explicit approved transition. Lifecycle approval intentionally deactivates legacy grants for the approved account, requiring a documented and audited transition.

**Critical unrelated security gate:** Preview `public.user_roles` has effective TRUNCATE privileges for `anon` and `authenticated` in previous read-only evidence. PostgreSQL RLS does not govern TRUNCATE; requires controlled privilege remediation after verified recovery, never destructive testing.

## Required next actions
- Design and review least-privilege RPC EXECUTE grants that allow only authenticated calls, with enforced independent Super Admin authorization inside SECURITY DEFINER functions. Granting EXECUTE to authenticated is not equivalent to granting approval permission if server checks are correct, but negative tests are mandatory.
- Ensure review cannot approve from `p_verified=true` alone; evidence writer requires actual off-system evidence inspection and accountable audit.
- Test anonymous, applicant, teacher, ordinary admin, super admin, revoked and stale revision cases; verify real Google OAuth and employee ID uniqueness.
- Verify recoverable Preview backup/restore and exact project identity before any SQL mutation.
- Keep feature flag OFF, PR #109 read-only, PR #113 Draft, and Production untouched.

**Release: HOLD.** This audit records concrete code-level blockers; it does not establish live role testing or successful migration.
