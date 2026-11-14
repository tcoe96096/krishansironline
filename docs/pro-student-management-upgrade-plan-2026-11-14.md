# Pro Student Management Upgrade — Implementation Plan
_Date: 2026-11-14_

## Approved decisions
- Approval policy: Hybrid.
- Deletion policy: Soft delete with a 30-day recovery period. If not restored, permanently remove the student's Supabase Auth login identity only; retain the student's personal profile.
- Personal profile retention: The profile row and its existing profile details are retained after the login identity is removed. Do not delete or anonymize the profile as part of Auto-Purge unless the owner separately changes this decision.
- Academic results (including the student's name, test attempts, marks and result history) must remain identifiable by the student's name after the 30-day purge.
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

## 30-day deletion and retention policy (latest owner decision)
- On soft delete, set a server-generated deletion timestamp and calculate the purge deadline as exactly 30 days later. Do not accept deletion timestamps/deadlines from the browser.
- During the 30-day recovery period, authorized admins can restore the account; restoration cancels the pending purge and is audit-logged.
- At/after the 30-day deadline, a scheduled server-side process permanently removes only the student's Supabase Auth login identity if the account remains deleted and has not been restored.
- **Retain the personal profile:** Do not delete the `student_profiles` row or remove/anonymize its profile fields under this owner decision. This supersedes earlier plan language that called for deleting the personal profile/contact details.
- **Retain named academic results:** The student's name must remain visible with retained test attempts, scores, marks and result history for academic reporting. Do not anonymize or erase the student's name from academic result records.
- Retained profile and academic records must remain accessible only under existing authorized admin/staff role and class-scope permissions. Removing the Auth login must not grant public access or accidentally expose retained profile data.
- The implementation must safely handle the retained profile after its Auth identity is removed. Inspect and explicitly resolve Auth/profile foreign keys, delete cascades, RLS, joins, admin directory queries, exports and any code that assumes every profile has a live Auth user. Do not create an invalid/orphaned row or weaken security to make it work.
- Keep purge idempotent, batch-safe, retryable, observable, and protected against deleting a record restored concurrently. Use a trusted scheduled server-side process and privileged Auth Admin API; never expose service-role credentials in browser code.
- Enforce explicit Super Admin/system permission for purge configuration and operational visibility. No manual immediate permanent-delete action for ordinary admins.
- Preview validation must use synthetic test accounts only. Never test permanent deletion against real student accounts.

## Data and security design
- Add explicit approval/account lifecycle fields to `student_profiles`, with safe defaults and backfill of existing rows to approved/active.
- Add a dedicated append-only admin audit table with RLS that permits only authorized admin writes/reads.
- Keep existing test attempts, results, learning progress and bookmarks intact when a student is soft-deleted or the Auth login identity is removed.
- Never expose service-role keys or perform Auth admin operations directly from browser code.
- Any Auth ban/unban, session revocation or permanent deletion must go through a server-side privileged operation that verifies the caller using the existing `is_admin()` authorization model and an explicit Super Admin permission.
- Do not trust user-editable `user_metadata` for authorization.
- Preserve student-owned RLS on attempts, progress, mistakes, bookmarks and activity. After Auth deletion, retained records must not become readable to unauthenticated users.
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
- Permanently remove the Auth login identity only; retain the personal profile, named academic results, test attempts, marks and result history.
- Make purge idempotent, concurrency-safe, retryable and auditable; include dry-run diagnostics and a restricted synthetic-account Preview test.

### Phase E — Diagnostics and repair
- Add read-only health checks and safe profile repair for fields that are demonstrably invalid/missing.
- Do not repair credentials or manipulate Auth users from client code.
- Provide a server-side workflow for any privileged Auth action only after Preview security review.

### Phase F — Activity and reports
- Add student activity timeline, admin audit view, filtered CSV export and diagnostic report.
- Reuse existing records; do not create duplicate result or question-bank systems.

### Phase G — Preview acceptance
- Run `npm run lint` and `npm run build`.
- Verify desktop/mobile layout and Hindi/English.
- Test existing student accounts remain approved and can log in.
- Test pending/approved/rejected/suspended/soft-deleted/restored state transitions.
- Use synthetic accounts to verify day-30 automatic Auth login deletion, profile retention, restore-before-deadline cancellation, retry/idempotency and concurrent restore protection.
- Verify retained profiles and academic results remain restricted to authorized admins/staff; named results retain the student's name, marks and history and remain usable in authorized class reports/exports.
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
- Owner approved a 30-day recovery period.
- Latest correction: after 30 days in soft-deleted state without restoration, permanently remove the student's Supabase Auth login identity only.
- Retain the `student_profiles` row and its existing profile details; do not delete or anonymize the personal profile as part of this Auto-Purge policy.
- Preserve academic results with the student's name (test attempts, marks and result history); do not anonymize the name in academic result records.
- The latest decision supersedes earlier wording that called for deleting the personal profile/contact details. The profile-retention implications for foreign keys, RLS, admin queries and exports must be audited before implementation.
- This is a plan update only. Automatic purge implementation and Preview testing remain pending; no Production changes are authorized.

## Purge feasibility audit — Preview only (2026-11-14)
- Rechecked the isolated Preview database project `zgpkmfqioqvincmgyfpi`; Production was not queried or changed.
- `pg_cron` and `pg_net` are available in the extension catalog but are **not installed/enabled** in this project. `supabase_vault` is installed (0.3.1). No scheduler has been configured and no purge job is active.
- The only currently deployed Preview Edge Function is `admin-test-import` (JWT verification enabled). It authenticates the caller using the user's JWT and checks the admin role; it is not a purge worker and must not be repurposed for deletion.
- Schema audit found student identifiers in several student-owned tables without declared foreign keys to `student_profiles`. A profile delete is no longer part of the approved policy; nevertheless, Auth-user deletion effects on Auth foreign keys, joins, RLS and application queries must be explicitly verified.
- `student_admin_audit` currently contains 2 Preview rows; both have before/after snapshots and both match possible PII-key patterns. The snapshots require review for safe access and retention, but do not remove the retained student profile or the student's name contrary to the latest decision.
- Existing RLS has separate admin-read policies on academic/student-activity tables. Retained profile and named academic records must remain available only to authorized admin/staff reporting and exports; Auth deletion must not expose them through unauthenticated or student-facing policies.
- The extension catalog includes `pg_cron`, `pg_net`, and installed `supabase_vault`; this is a possible same-Supabase scheduling route, subject to current Supabase documentation and Preview validation. No external platform is proposed.
- A secure design candidate is: a dedicated JWT-disabled Edge Function with mandatory high-entropy secret validation backed by Vault/RPC, using the platform-provided server-side service-role environment only inside the function; a Vault-backed `pg_cron` + `pg_net` call; and a database-side atomic claim/lock that rechecks `account_status='deleted'` and `purge_after <= now()` before Auth Admin deletion. The function must fail closed if secret validation, profile retention checks or Auth deletion fails.
- This candidate is **not implemented or activated**. Before implementation, verify current Supabase guidance for Edge Function environment variables, Vault access, pg_net scheduling, Auth Admin deletion, and transaction/concurrency boundaries. Never place a service-role key in SQL text, migration files, GitHub source, or browser code.
- Audit finding: `student_admin_audit.student_id` and `actor_id` are UUIDs and snapshots may retain identifiers. Retention policy for admin actors must be explicit; do not erase staff accountability accidentally. Preserve the student's profile and name as approved; protect snapshots and retained identifiers with appropriate admin-only RLS. Preserve action/time/reason only where the reason itself is appropriate and non-sensitive.
- No Preview student profile, Auth identity, test attempt, result, learning record, or audit row was deleted or modified during this audit.

## Corrected implementation status
- The 30-day recovery deadline and soft-delete/restore lifecycle are implemented in Preview.
- Automatic Auth login deletion, profile-retention validation, scheduler activation, and synthetic-account purge tests remain **not implemented / not verified**.
- Do not describe the countdown as evidence that automatic deletion is operational.

## Owner correction — named academic result retention (2026-11-14)
- Owner explicitly corrected the retention rule: academic results must remain saved with the student's name; they must not be anonymized.
- The 30-day purge removes the student's Auth login identity only; the personal profile and its details remain retained under the latest owner decision.
- Named academic records remain protected by existing admin/staff role and class-scope permissions. This correction supersedes all earlier anonymization wording in this plan.
