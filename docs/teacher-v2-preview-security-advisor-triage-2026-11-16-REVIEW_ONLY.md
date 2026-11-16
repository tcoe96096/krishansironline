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

## Read-only privilege verification — 2026-11-16 14:45 UTC
Queried `pg_proc`, `pg_get_functiondef` (only Boolean text-match indicators, not function bodies), `has_function_privilege`, `pg_class`, and `pg_policy` in the isolated Preview database. No SQL writes.

- **All 18** advisor-listed SECURITY DEFINER functions: `authenticated EXECUTE=true`, `anon EXECUTE=false`.
- All 18 contain an authentication/authorization-related token (`auth.uid`, `auth.jwt`, `is_admin`, or `is_super_admin`), but token presence does **not** prove effective enforcement; 16/18 have a denial-like text token, while `is_admin` and `is_super_admin` are Boolean helpers. This is a static heuristic only; negative-role runtime tests remain mandatory.
- `student_purge_settings`, `student_purge_settings_audit`, and `test_answer_keys`: RLS enabled, zero policies; **no SELECT/INSERT/UPDATE/DELETE privileges for authenticated**, and **no SELECT for anon**. This supports intentional private-table design. Do not add broad policies without evidence.
- This verification does **not** confirm PITR/backup or recovery readiness and does not authorize migrations.

## Targeted function-body review — 2026-11-16 14:46 UTC
Read-only inspection of actual `pg_get_functiondef` excerpts, not just regular-expression guard detection:

- `review_teacher_enrollment`: checks authenticated actor and `public.is_super_admin()` before selecting/locking request; validates decision/reason, pending status and existing-role conflicts. This is a **static** positive finding, not an account-level test.
- `send_result_to_student`: checks `public.is_super_admin()`, submitted attempt status and recipient account eligibility before writing delivery notice/audit. This is a **static** positive finding.
- `admin_schedule_studio_publish`: checks authenticated `public.is_admin()`, publication date bounds and draft existence before scheduling.
- `admin_cancel_studio_publish`: checks authenticated `public.is_admin()` before cancelling pending schedule.

**Review question before Production:** `is_admin()` is intentionally broader than `is_super_admin()`; verify whether Admin is supposed to schedule/cancel global site publishing under the owner's permission model. Do not silently change this authorization rule. Remaining 14 functions and role-based negative tests are pending.

## Further function-body review — 2026-11-16 14:47 UTC
Read-only inspection of six additional functions:

- `is_admin()`: Boolean role lookup against `user_roles`, accepts `admin` or `super_admin`, requires `auth.uid()`.
- `is_super_admin()`: Boolean role lookup against `user_roles`, requires `super_admin` and `auth.uid()`.
- `submit_teacher_enrollment()`: checks login, field bounds, existing platform roles, existing active delegated grants and duplicate/pending applications; applicant ID derived from `auth.uid()`.
- `withdraw_teacher_enrollment()`: updates only pending requests whose `applicant_id=auth.uid()` and records audit.
- `start_test_attempt()`: requires approved, active student profile, matching class, published test and attempt limit; attempts keyed to `auth.uid()`.
- `submit_test_attempt()`: rechecks student eligibility, fetches attempt by `id` **and** `student_id=auth.uid()`, and checks attempt status.

These are static code observations, not execution as an ordinary student/teacher. Ten of 18 advisor-listed functions now have targeted body inspection. Remaining eight and live negative-role tests pending. Note: existing Preview enrollment is the legacy single-class/single-subject flow; Teacher Management v2 multi-assignment is still Draft only.

## Final eight flagged RPCs — static body review 2026-11-16 14:48 UTC
- `admin_get_test_for_edit`: requires `auth.uid()` and `is_admin()` before returning test plus **private answer key**. High-value negative test: teacher/student denied.
- `admin_publish_site_config`: requires `auth.uid()` and `is_admin()`, then publishes site draft. **Owner decision:** should ordinary Admin be able to publish global site changes?
- `admin_save_site_config`: requires `auth.uid()` and `is_admin()`, validates JSON object, writes draft.
- `admin_save_test`: requires `auth.uid()` and `is_admin()`, validates test payload and answer key before writing.
- `admin_set_test_published`: requires `auth.uid()` and `is_admin()`, checks answer key before publication.
- `get_student_purge_settings`: requires `is_admin()` before returning retention settings.
- `publish_result_card_template`: requires `auth.uid()` and `is_super_admin()`, validates theme/options and reason.
- `save_student_purge_settings`: requires `is_super_admin()`, validates retention window/time and checks scheduler Vault credential presence before enabling schedule. No Vault values were read.

**Status:** All 18 advisor-listed SECURITY DEFINER functions now have initial source-body guard review; this does not establish safe behavior for all inputs or user roles. Negative tests, deeper function call graph review, backup/restore evidence and final owner permission approval remain pending. No SQL writes or Auth changes made.
