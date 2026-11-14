# Pro Student Management Upgrade — Implementation Plan
_Date: 2026-11-14_

## Approved decisions
- Approval policy: Hybrid.
- Deletion policy: Soft delete with a 30-day recovery period, followed by automatic permanent deletion of the student's login identity and personal profile if not restored.
- Academic history (test attempts, results, marks and learning records) must be retained after the 30-day purge in anonymized, non-identifiable form.
- Scope: All planned capabilities.
- Delivery: GitHub feature branch -> isolated GitHub Pages Preview -> owner acceptance -> separate Production PR/release.
- Production website and Production Supabase project remain untouched during Preview development.

## Verified current baseline
The current `src/components/AdminStudentManagement.tsx` already includes:
- Student directory with paginated loading (50 rows), search, class/district filters and CSV export.
- Student profile detail drawer and profile editing.
- Test history and learning-progress tabs.
- Class intelligence, location summary and `AdminProAnalytics`.

The Admin Dashboard already routes the existing Pro Student Management menu item to this component. Do not create a parallel module or replace the existing route.

The inspected Preview Supabase schema has `student_profiles`, `test_attempts`, and `student_learning_progress`; RLS is enabled. Current student profile schema has no approval state, account state, soft-delete marker, or student-admin audit log. The existing profile policy permits admin management through `public.is_admin()`; student profile reads are scoped to the student's own row.

## Target module structure
1. **Overview** — existing counts, class intelligence, analytics and health summary.
2. **Directory** — preserve current search, filters, pagination, profile editor and CSV export; add active/pending/suspended/archived filters.
3. **Approval Centre** — pending registrations, review details, approve/reject with reason, approval history.
4. **Account Control** — activate/suspend, restore archived record, soft-delete with confirmation and reason; show deletion deadline/countdown and purge eligibility. No ordinary-admin immediate permanent-delete control.
5. **Diagnostics** — read-only checks for Auth identity linkage, profile row, required fields, approval/account state, test-attempt linkage and relevant RLS/query failures. Show evidence and a safe next action; never claim an unperformed repair.
6. **Activity & Audit** — immutable admin-action events with actor, target student, action, timestamp and structured before/after metadata; student-facing personal activity remains private.
7. **Student Detail Drawer** — Profile, Account, Diagnostics, Test History, Learning Progress and Activity tabs.

## Hybrid approval definition for this implementation
- Existing students are grandfathered as approved to avoid disrupting current accounts.
- New self-registrations are pending review because the current mobile/password flow does not verify mobile ownership with OTP.
- Admin-created/verified registrations can be approved during creation/review.
- Only approved and active students may enter student learning/test routes. Pending/rejected/suspended/deleted states must be clearly explained.
- This policy must be enforced by trusted database/auth checks, not only by hiding UI controls.

## 30-day deletion and academic-retention policy (owner-approved)
- On soft delete, set a server-generated deletion timestamp and calculate the purge deadline as exactly 30 days later. Do not accept deletion timestamps/deadlines from the browser.
- During the 30-day recovery period, authorized admins can restore the personal profile and login account; restoration cancels the pending purge and is audit-logged.
- At/after the 30-day deadline, a scheduled server-side purge automatically removes the student's Supabase Auth login identity and personal profile/PII if the account has not been restored.
- Preserve test attempts, scores, marks, result records and learning records for academic reporting. Before deleting identity/profile, detach or replace student foreign-key references using a stable non-identifying archival reference or nullable/anonymized subject key; do not cascade-delete academic records.
- Remove direct identifiers from retained academic rows and related personal activity/notification data as appropriate. Do not retain phone, email, name, address, credentials, or a reversible mapping to the deleted identity in the academic archive.
- Keep aggregate/class reporting functional and ensure retained records cannot be re-identified through joins, exports, logs or admin UI.
- Keep purge idempotent, batch-safe, retryable, observable, and protected against deleting a record restored concurrently. Use a trusted scheduled server-side process and privileged Auth Admin API; never expose service-role credentials in browser code.
- Enforce explicit Super Admin/system permission for purge configuration and operational visibility. No manual immediate permanent-delete action for ordinary admins.
- Preview validation must use synthetic test accounts only. Never test permanent deletion against real student accounts.

## Data and security design
- Add explicit approval/account lifecycle fields to `student_profiles`, with safe defaults and backfill of existing rows to approved/active.
- Add a dedicated append-only admin audit table with RLS that permits only authorized admin writes/reads.
- Keep existing test attempts, results, learning progress and bookmarks intact when a student is soft-deleted.
- Never expose service-role keys or perform Auth admin operations directly from browser code.
- Any Auth ban/unban, session revocation or permanent deletion must go through a server-side privileged operation that verifies the caller using the existing `is_admin()` authorization model and an explicit Super Admin permission.
- Do not trust user-editable `user_metadata` for authorization.
- Preserve student-owned RLS on attempts, progress, mistakes, bookmarks and activity.
- Do not modify the existing test engine, timer, answer persistence, grading, auto-submit or student session marker as part of this module.

## Planned delivery phases
### Phase A — UX and existing module integration
- Add top-level module tabs and status filters without removing current analytics/directory.
- Expand the existing student detail drawer.
- Add bilingual labels/messages, accessible confirmations, loading and error states.

### Phase B — Preview-only schema
- Prepare a migration proposal for approval/account lifecycle fields and audit events.
- Inspect current constraints, RLS, grants, functions and migration history before applying it to the Preview Supabase project.
- Backfill existing Preview students to approved/active.
- Validate policies with admin and student identities.
- Do not apply any schema change to Production.

### Phase C — Approval and account lifecycle
- Implement pending queue, approve/reject, suspend/activate and soft-delete/restore.
- Require reason and confirmation for consequential actions.
- Show the 30-day recovery deadline and remaining time.
- Record each action in audit history.

### Phase D — Automatic purge (Preview only)
- Confirm an approved scheduling capability exists in the current Supabase project; do not add a platform or incur cost without permission.
- Implement trusted scheduled purge for deleted records whose server-side deadline has passed and which remain deleted at execution time.
- Delete Auth identity and personal profile while retaining anonymized academic history.
- Make purge idempotent, concurrency-safe, retryable and auditable; include dry-run diagnostics and a restricted synthetic-account Preview test.

### Phase E — Diagnostics and repair

### Phase F — Diagnostics and repair
- Add read-only health checks and safe profile repair for fields that are demonstrably invalid/missing.
- Do not repair credentials or manipulate Auth users from client code.
- Provide a server-side workflow for any privileged Auth action only after Preview security review.

### Phase G — Activity and reports
- Add student activity timeline, admin audit view, filtered CSV export and diagnostic report.
- Reuse existing records; do not create duplicate result or question-bank systems.

### Phase H — Preview acceptance
- Run `npm run lint` and `npm run build`.
- Verify desktop/mobile layout and Hindi/English.
- Test existing student accounts remain approved and can log in.
- Test pending/approved/rejected/suspended/soft-deleted/restored state transitions.
- Use synthetic accounts to verify day-30 automatic purge, restore-before-deadline cancellation, retry/idempotency and concurrent restore protection.
- Verify Auth identity and personal profile are removed while academic results/marks/history remain anonymized and usable for class reports.
- Verify a student cannot read another student's profile, test attempts, progress or audit data.
- Verify unauthorized staff cannot approve, suspend, restore or delete.
- Verify test resume, timer, offline retry and auto-submit behavior is unchanged.

## Release gates
- This branch is Preview-only.
- No Production merge, deployment, schema migration, Auth configuration or data change is authorized by this plan.
- After Preview acceptance, prepare a separate Production implementation/release plan and request explicit approval.


## Progress update — 2026-11-14
- Created Preview feature branch `feature/pro-student-management-upgrade-2026-11-14` and draft PR #102.
- Added the Student Governance & Diagnostics workspace to the existing Pro Student Management component.
- Configured and deployed the isolated `krishansironline-preview-v2` Pages preview. TypeScript validation and Vite build passed.
- Applied Preview-only migrations `20261114053043_student_lifecycle_governance` and `20261114053108_fix_student_attempt_lifecycle_policy` to Preview Supabase project `zgpkmfqioqvincmgyfpi`.
- Added lifecycle fields, grandfathered existing Preview profiles as approved/active, added append-only admin audit records, gated student-owned data policies, and gated `start_test_attempt` on approved/active state.
- Production Supabase project `vsqwlkqqsxcehvdsdbna` was not modified.
- Security advisor review still reports pre-existing warnings for `public.is_admin()` and other existing SECURITY DEFINER RPCs, plus the intentionally policy-less `test_answer_keys` table. These findings are not introduced by the lifecycle migration.


## Owner decision update — 2026-11-14
- Owner approved the 30-day automatic permanent deletion policy.
- After 30 days in soft-deleted state without restoration, automatically delete the student's Auth login identity and personal profile/PII.
- Preserve academic history (test attempts, marks, results and learning records) in anonymized, non-identifiable form.
- This is a plan update only. Automatic purge implementation and Preview testing remain pending; no Production changes are authorized.
