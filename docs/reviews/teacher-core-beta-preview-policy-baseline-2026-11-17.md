# Teacher Core Beta — Preview security baseline (READ ONLY)

Checked 2026-11-17 against isolated Preview Supabase project `zgpkmfqioqvincmgyfpi`; no SQL was executed that changes data/schema. Production `vsqwlkqqsxcehvdsdbna` was not touched.

## Confirmed Preview state

- `public.is_super_admin()` exists, is `STABLE SECURITY DEFINER`, and requires a non-null `auth.uid()` plus a matching `public.user_roles` row with `lower(role)='super_admin'`. The function has EXECUTE for `authenticated` but not `anon`. Its `search_path` is `public`; independent security review should assess whether to harden this existing function to `search_path=''` with fully qualified references.
- `public.study_material_items` currently has exactly six RLS policies: `Owner may delete only own drafts`, `Owner or super admin reads review drafts`, `Published material is readable`, `Scoped editors create drafts`, `Scoped editors update only own drafts`, `Scoped staff submit own drafts for review`.
- The proposed `teacher_management_v2_integration_REVIEW_ONLY.sql` drops the five staff authoring policies and preserves `Published material is readable`. This **matches the current Preview policy names**; it is not evidence that production policies match.
- `public.result_staff_grants` currently has four RLS policies for own-grant read and Super Admin insert/update/delete. The proposed lifecycle guard must be tested against these existing routes and the existing legacy teacher accounts.
- Preview has no `teacher_v2_*` RPCs and no Teacher v2 tables. SQL proposals are uninstalled.

## Outstanding release gates

1. Recovery is **not verified**. A readable logical backup is not equivalent to a successful isolated restore. Keep Preview/Production SQL mutation on HOLD.
2. Inspect the **production** policy baseline separately before any production rollout. Never assume parity with Preview.
3. Test `is_super_admin()` under anonymous, applicant, ordinary Admin, and Super Admin sessions. Static function inspection alone does not prove end-to-end authorization.
4. Confirm legacy teacher grant transitions, approval concurrency, employee-ID uniqueness, suspended teacher denial, and Study Materials permissions using authenticated Preview acceptance tests after recovery/security gates.
5. Run RLS and Security Advisor checks, review `SECURITY DEFINER` owners/EXECUTE privileges, and document rollback steps. Do not enable resume upload/AI, advanced assignment authoring, or result analytics in registration-only beta.
6. The lifecycle SQL creates `teacher_v2_no_legacy_grant` via unconditional `CREATE TRIGGER` if the legacy table exists; rerunning the bundle will fail with a duplicate trigger. Require a one-time migration contract or an explicitly reviewed idempotent trigger creation strategy before activation.

This document is evidence for review only, not authorization to deploy, merge, activate flags, or apply SQL.
