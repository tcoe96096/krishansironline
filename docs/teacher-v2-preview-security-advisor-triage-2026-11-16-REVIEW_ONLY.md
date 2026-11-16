# Preview Security Advisor Triage — 2026-11-16 (REVIEW ONLY)

Project: krishan-sir-lms-preview (`zgpkmfqioqvincmgyfpi`). Read-only advisor inspection at approximately 14:41 UTC. This is **not** a vulnerability exploit confirmation, migration, or permission change.

## Evidence
- Project status: ACTIVE_HEALTHY.
- Security Advisor: 18 authenticated-executable SECURITY DEFINER functions (WARN); 3 RLS-enabled tables without policies (INFO); 1 leaked-password-protection warning (WARN).
- Preview migration history: 49 applied migrations, **none named teacher_management_v2**.
- All six CI workflows succeeded at PR #109 commit `76167d79e44b7612de589761e86b52dfee769569`.
- Managed backup/PITR or independently tested logical backup/restore **not yet verified**; no schema mutation permitted before the recovery gate.

## 18 privileged RPCs requiring individual authorization review
**Admin/publishing/test authoring (high priority):** `admin_cancel_studio_publish`, `admin_get_test_for_edit`, `admin_publish_site_config`, `admin_save_site_config`, `admin_save_test`, `admin_schedule_studio_publish`, `admin_set_test_published`, `publish_result_card_template`.

**Teacher enrollment (high priority for v2 integration):** `review_teacher_enrollment`, `submit_teacher_enrollment`, `withdraw_teacher_enrollment`.

**Student results/attempts (high priority for privacy):** `send_result_to_student`, `start_test_attempt`, `submit_test_attempt`.

**Identity and retention:** `is_admin`, `is_super_admin`, `get_student_purge_settings`, `save_student_purge_settings`.

These are *advisor warnings*, not evidence of unauthorized access. Some RPCs must be callable by authenticated users but must enforce owner/admin/role checks **inside** the function. Do not blanket revoke EXECUTE without assessing application dependencies.

## Three tables with RLS enabled and no policy
- `public.student_purge_settings`
- `public.student_purge_settings_audit`
- `public.test_answer_keys`

This can be intentional for service-only/private tables. Verify effective table privileges and all SECURITY DEFINER access paths before adding policies. Do **not** create broad read policies just to silence INFO findings.

## Auth warning
Leaked password protection is reported as not enabled. Confirm whether password sign-in is supported and enable protection via reviewed Auth settings if applicable; Google OAuth-only flows should still be assessed separately. No Auth settings changed.

## Mandatory next evidence gates
1. Establish verified Preview backup/PITR or tested disposable logical restore; record recovery owner, timestamp, retention, and rollback procedure.
2. Read-only inspect `pg_proc.proacl`, `pg_get_functiondef`, relevant `pg_policies`, table privileges and auth guard paths for each listed function; avoid logging secrets or student data.
3. Add targeted negative authorization tests: ordinary student cannot approve teacher, publish website, edit test, read another student's result, or alter purge settings; teacher cannot grant own scopes; revoked/suspended teacher cannot access materials.
4. Verify new Teacher v2 result-summary RPC remains non-executable by `authenticated`; overlapping-cohort analytics remain OFF for Core Beta.
5. Review any changes to five legacy study-material RLS policies against existing working permissions, including update SELECT visibility and revocation.
6. Only then consider Preview migration in the separately approved plan; Production remains untouched until distinct final authorization.

Advisor references:
- https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable
- https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy
- https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection
