# Teacher v2 Preview installation: verified dependency and grant blockers (2026-11-18)

Scope: read-only inspection of Preview project `zgpkmfqioqvincmgyfpi` and existing main-branch SQL. This is **not** installation evidence.

## Observed in Preview

- `teacher_enrollment_requests` has a teacher-own-or-superadmin SELECT policy but **zero INSERT/ALL policies**. The legacy enrollment path cannot assume client-side INSERT works.
- `public.teacher_v2_save_application(jsonb,jsonb,jsonb,text,boolean,integer)` is absent.
- `public.teacher_v2_review(uuid,integer,text,text,boolean,jsonb)` is absent.
- Both `anon` and `authenticated` currently have effective `TRUNCATE` on `public.user_roles`; TRUNCATE bypasses RLS.

## Existing SQL conflict requiring a single approved privilege plan

- `docs/proposed-migrations/teacher_management_v2_lifecycle_REVIEW_ONLY.sql` revokes then grants `authenticated` EXECUTE on the v2 lifecycle RPCs, including `teacher_v2_review`.
- `docs/proposed-migrations/teacher_v2_review_independent_evidence_OVERRIDE_REVIEW_ONLY.sql` replaces `teacher_v2_review` and revokes EXECUTE, without restoring an authenticated grant. Therefore applying both in sequence would leave the browser Super Admin review action unable to call the RPC, even if its internal authorization is correct.
- `docs/proposed-migrations/teacher_v2_verification_writer_REVIEW_ONLY.sql` also revokes EXECUTE for its verification writer, with no client grant plan.

## Installation gate

1. Verify an independently recoverable Preview backup and actual restore evidence. Local isolated RLS testing does not prove managed Preview recovery.
2. Confirm migration ordering, existing objects and data preservation; keep production untouched.
3. Resolve v2 review/verification RPC grant design with strict Super Admin checks and positive/negative authenticated tests; never grant unrestricted PUBLIC execution to SECURITY DEFINER functions.
4. Remove inappropriate `user_roles` TRUNCATE privileges only after checking inherited roles and expected access; rerun effective privilege preflight.
5. Test application creation (server-side path or scoped policy), approval, denial, withdrawal, concurrency and multi-role negative cases using real Preview identities.
6. Enable website feature flags only after successful end-to-end Preview validation and separately verified production recovery.

No DDL/DML, grants, migrations, feature activation or deployment performed by this review.
