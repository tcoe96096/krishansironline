# Teacher Management v2 — Preview Role Acceptance Matrix (REVIEW ONLY)

Created 2026-11-16. **No live account testing or database changes performed.** Execute only after isolated Preview recovery is proven and owner authorizes the Preview test window. Use dedicated test identities and disposable test records; never use production student information.

## Evidence and preflight
- Preview project: `zgpkmfqioqvincmgyfpi`; Teacher v2 migrations not applied.
- All 18 currently flagged `SECURITY DEFINER` RPCs have an initial guard-code review, but role behavior has **not** been verified by real sessions.
- All 18 functions are owned by `postgres`; 8 have an empty `search_path`, 9 have `public`, 1 has `public, vault, cron`. Explicitly review identifier qualification and trusted schema ownership for the nonempty paths.
- No backup/PITR or disposable logical restore evidence available. **BLOCKER** for migrations.

## Role and negative-test matrix
| Actor | Action | Expected | Evidence required |
|---|---|---|---|
| Anonymous | Invoke any of 18 flagged RPCs | Denied by EXECUTE grant | REST 401/403, no side effects |
| Pending teacher applicant | Submit own enrollment | Own pending request only; no teacher grants | Request + audit row, no role escalation |
| Pending teacher applicant | Approve/reject own application | Denied | No state changes |
| Pending teacher applicant | Withdraw another applicant's request | Denied/no change | Ownership proof |
| Approved teacher | View own profile, employee ID, assigned multiple classes and subjects | Allowed within assigned scopes | UI + SQL checks after v2 activation |
| Approved teacher | Assign own scopes or approve self | Denied | No grant/audit escalation |
| Suspended teacher | Read/write protected study materials | Denied | REST and UI checks |
| Student | Edit/publish tests or read private answer keys | Denied | `admin_get_test_for_edit` denied |
| Student | Start test for wrong class or unapproved account | Denied | No attempt created |
| Student A | Submit Student B's test attempt | Denied | No score or attempt change |
| Student | Deliver other student's result | Denied | No delivery notice |
| Ordinary Admin | Review teacher enrollment | Denied unless expressly delegated by owner | Current legacy RPC super-admin check |
| Ordinary Admin | Change purge settings | Denied | `save_student_purge_settings` denied |
| Ordinary Admin | Publish result-card template | Denied | `publish_result_card_template` denied |
| Ordinary Admin | Publish global site configuration | **Decision pending**: existing RPC allows Admin | Owner permission decision before release |
| Super Admin | Approve qualified teacher and assign employee ID | Allowed with audit | Approved profile, unique ID, audit trail |
| Super Admin | Publish result-card template | Allowed after validation | Version/audit |

## Gate for execution
1. Capture Preview backup snapshot and prove restore to a disposable environment, or verify managed PITR plus a documented restore drill; record owner, date, restore outcome and retention.
2. Review migration ordering, RLS impact and storage flags. Do not apply Teacher v2 SQL until explicit Preview execution authorization.
3. Use distinct OAuth test accounts (student, pending teacher, approved teacher, suspended teacher, admin, super admin); confirm role assignment by an independent reviewer.
4. Record before/after rows and audit events; ensure no unauthorized side effects. Revert disposable fixtures after tests.
5. Keep result analytics and resume upload OFF in Core Beta; verify grants, not just UI flags.
6. Obtain a separate Production deployment approval after presenting complete test evidence and rollback plan.

## Open decision
Current `is_admin()` includes `admin` and `super_admin`. Existing `admin_publish_site_config` and scheduled publishing RPCs allow both. Decide whether global site publishing must instead be Super Admin-only. **Do not change live permissions until owner confirms.**

## Live policy reconciliation — 2026-11-16 14:53 UTC
Read-only `pg_policies` inspection of Preview `public.study_material_items` confirms six policies: five scoped draft/review authoring policies named in the proposed integration's DROP statements, plus `Published material is readable` (`SELECT` for `anon,authenticated`, `status='published'`). The proposed v2 SQL leaves that public published-read policy intact.

**Compatibility tests to add before migration:**
1. Existing legacy teacher with active `result_staff_grants`: preserve permitted own draft create/read/update/review flow after v2 integration, until an explicit v2 transition occurs.
2. Approved v2 teacher: class + subject + work-type assignment must control own draft operations; verify assignment revocation immediately denies access even if legacy grants remain.
3. Suspended v2 teacher: deny draft and review access despite old grants.
4. Rejected/pending v2 applicant who has any residual active legacy grant: investigate fallback behavior in `teacher_v2_material_permission`; the current proposal selects legacy fallback when no employee ID and status not approved/suspended. **Review before activation**; do not assume rejected applications cannot have residual grants.
5. Public/anonymous users can still read only published materials via the unchanged published-read policy; they must not see drafts or pending review.
6. Ensure UPDATE transition from draft to pending_review succeeds only with the review permission, and fails without it; verify row SELECT visibility required for PostgREST UPDATE behavior.

No policies were modified. This is review evidence, not live post-migration acceptance.

## Identified pre-migration authorization edge — 2026-11-16 14:54 UTC
**BLOCKER FOR PREVIEW MIGRATION PENDING RESOLUTION:** Proposed `teacher_v2_material_permission` switches to v2-only assignment checks only when `teacher_profiles.employee_id IS NOT NULL` **or** profile status is `approved`/`suspended`. For `pending`/`rejected` profiles, it falls back to an active legacy `result_staff_grants` row. The v2 lifecycle review function does not deactivate legacy grants when rejecting an application. Consequently, an account that is both a pending/rejected v2 applicant and a holder of a residual active legacy grant **could retain study-material permissions**. This is a conditional code-path finding, not evidence that such an account exists in Preview.

**Proposed remediation (review-only, not applied):** Define an explicit, audited transition for pre-existing legacy staff before v2 application, then fail closed for *all* identities present in `teacher_profiles` unless `status='approved'` and a matching active v2 assignment exists. Keep legacy fallback only for identities with **no** v2 profile. Add tests for pending/rejected + legacy grant, suspended + legacy grant, legacy-only teacher, and newly approved teacher. Do not alter Production or Preview policies without owner-approved migration and tested rollback.

**Separate review question:** `teacher_v2_review` permits approval with an empty assignment array, which creates an approved teacher and employee ID but no teaching scopes. Confirm whether zero-scope approval is intentional (safe by default, but may surprise administrators).

## CI and legacy-grant inventory — 2026-11-16 14:58 UTC
- PR #109 head `91786a326e02eed123fbb2b86619844e6591c04c`: **six of six GitHub Actions workflows succeeded** (unit tests, website build, Preview build, Smart Result Hub browser smoke, Teacher v2 draft checks, Visual Studio functional browser smoke). These do not prove actual deployed role authorization.
- Preview read-only aggregate inventory: `public.result_staff_grants` has **2 active rows across 2 distinct accounts**. `public.teacher_enrollment_requests` has **0 pending rows**. No identity details were retrieved or changed.
- Before any Preview migration, stage the two legacy-grant accounts in an owner-reviewed migration mapping: (a) remain legacy-only temporarily; or (b) transition to v2 with explicit verified class/subject/work scopes. The v2 profile presence gate intentionally blocks legacy fallback, so do not create v2 profiles for these accounts without a tested assignment transition.
- This is inventory evidence, **not** backup evidence. The backup/restore and explicit migration authorization blockers remain.
