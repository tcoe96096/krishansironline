# Teacher v2 lifecycle compatibility blocker — 18 Nov 2026

Source: `docs/proposed-migrations/teacher_management_v2_lifecycle_REVIEW_ONLY.sql` on `main`, reviewed against user instruction to skip migration of two existing Class-10 teachers while preserving their grants.

## Concrete finding
- `teacher_v2_review` contains `UPDATE public.result_staff_grants SET is_active=false WHERE user_id=p_user_id AND is_active` when approving a v2 teacher.
- `private.teacher_v2_guard_legacy_grant` rejects new active legacy grants for accounts that have a v2 profile.
- `teacher_v2_suspend` also revokes existing assignments and legacy grants by design.

**Impact:** The existing two legacy teachers are not changed by *installing* the reviewed lifecycle functions alone, provided they have no v2 profile and no explicit review/suspend operation targets them. However, later enrolling/reviewing one of these accounts through v2 will deactivate its legacy grants. Therefore 'skip migration' must NOT be interpreted as unconditional preservation of grants through a future v2 transition.

## Required regression gates
1. Capture legacy grant IDs, user IDs, active status, class and permissions before Preview test.
2. Verify no v2 profile is automatically created for those accounts; no backfill or bulk review.
3. Install lifecycle only after backup/restore and security approval; test with disposable synthetic accounts.
4. Confirm existing two accounts retain original grants until an independently approved explicit transition.
5. Confirm a deliberate v2 transition is atomic and audit logged; prevent legacy fallback after suspension.
6. Avoid blanket removal of the legacy guard to 'fix' the problem: that would allow authorization bypass.

## Separate open issues
- `teacher_v2_review(...,p_verified boolean,...)` trusts reviewer-supplied verification boolean; require independently recorded verification evidence and accountability.
- `user_roles` TRUNCATE grants remain an active Preview security issue.
- No Preview managed backup/disposable restore evidence or authenticated RLS tests yet.

No SQL executed, no legacy grants changed, no production change. PR #113 remains Draft.
