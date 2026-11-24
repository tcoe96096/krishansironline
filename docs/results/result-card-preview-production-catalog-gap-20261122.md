# Verified read-only Result Card catalog gap — 2026-11-22

**Sources:** Supabase project `krishan-sir-lms` (Production) and `krishan-sir-lms-preview` (Preview), queried read-only via information_schema.tables and pg_proc. No row contents, credentials, writes or migrations were accessed.

## Production (observed)
- Result/report/attempt name-filtered public/private tables: `public.test_attempts` only.
- Result/report name-filtered functions in public/private: none.

## Preview (observed)
- Tables: `public.result_card_template_audit`, `public.result_card_templates`, `public.result_delivery_audit`, `public.result_delivery_notices`, `public.result_staff_grant_audit`, `public.result_staff_grants`, `public.test_attempts`.
- Functions: `private.audit_result_card_template()`, `private.audit_result_staff_grant_change()`, `public.can_publish_result_card_template()`, `public.publish_result_card_template(text,jsonb,text)`, `public.send_result_to_student(uuid)`.

## Next non-negotiable review steps
1. Compare actual column types, constraints, FK targets, triggers, indexes and function bodies for the six Preview-only tables and five functions.
2. Compare RLS enabled/forced flags, policies, grants, function EXECUTE grants, SECURITY DEFINER owners/search_path, and storage bucket policies.
3. Determine dependencies on existing `test_attempts` and auth/student mappings without modifying Student/Exam source.
4. Verify independent Production backup and disposable restore before any SQL execution.
5. Construct dependency-ordered migration based on catalog definitions; keep review-only until approved. Validate on disposable restored environment with distinct authenticated identities.
6. Confirm CI and browser QA, then request **separate explicit approval** for merge and deployment.

**Not a migration.** Observations are name-filtered catalog checks, not a complete database security audit. Do not assume Preview code is production-safe or deploy automatically.
