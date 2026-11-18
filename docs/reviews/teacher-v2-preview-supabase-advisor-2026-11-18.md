# Preview Supabase security advisor snapshot — 2026-11-18

Project: `zgpkmfqioqvincmgyfpi` (Preview). **Read-only advisor check; no SQL mutations.**

## Confirmed findings
- Supabase security advisor reports `authenticated_security_definer_function_executable`: **18** findings (WARN), including `public.is_super_admin()` and `public.review_teacher_enrollment(uuid,text,text)`. Exposure alone does not prove privilege escalation: each function's identity and authorization checks require individual review before changing EXECUTE grants.
- `rls_enabled_no_policy`: **3** INFO findings: `public.student_purge_settings`, `public.student_purge_settings_audit`, `public.test_answer_keys`. Default deny can be intentional; do not add broad policies just to clear the advisor.
- Prior independent privilege audit showed `anon` and `authenticated` both have `TRUNCATE` on `public.user_roles`; separately staged review-only fix remains unexecuted.

References:
- https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable
- https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy
- https://supabase.com/docs/guides/database/functions

## Release gating
1. Independently inspect `is_super_admin` and `review_teacher_enrollment` function definitions, owners, effective EXECUTE permissions and role-claim sources.
2. Review each other flagged function by business purpose before any revoke; don't break existing Studio/Student/Result functionality.
3. Address `user_roles` TRUNCATE separately after backup/restore evidence and approval.
4. Run authenticated negative RLS and authorization tests against an isolated, recoverable environment.
5. Keep Teacher v2 registration OFF, PR #113 Draft, and Production unchanged.

Advisor result is a point-in-time snapshot, not proof of exploitability or migration readiness.
