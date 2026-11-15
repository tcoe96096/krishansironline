# KSOL Admin Controls — Honest Readiness Audit

Audit date: 2026-11-15
Repository: tcoe96096/krishansironline
Target: Draft PR #109, branch feature/smart-result-hub-stage-a-20261115
Production merge: BLOCKED pending owner acceptance of the described incomplete features.
Scope: Admin site controls for Result Cards, Student Report Delivery, Study Materials and Roles; connected Admin navigation.

## Verification evidence

1. Inspected actual React component handlers, navigation props and responsive screen flow.
2. Read isolated **Preview** Supabase information_schema **without changing any data**. Existing test_attempts table was present; result_staff_grants, study_material_items, result_delivery_notices, result_card_templates and associated audit tables were **not present**.
3. Existing CI covers Vite build, TypeScript, role-policy/score calculations, static wiring tests and unauthenticated/demo browser smoke. It does **not** establish a real Super Admin authenticated permission/security test.
4. Unified Preview workflow run #43690948106 successfully built/deployed the previously tested source aaaec88f62e45a24af35b8f73158fff68caf0672. This is **not** a claim that later fixes in PR #109 are already deployed.

## Admin controls matrix

| Admin control | UI | Persistence / execution | Actual readiness |
| --- | --- | --- | --- |
| Results & Reports navigation | Linked in Admin Dashboard | Existing authorized Supabase reads | Functional with existing admin authorization |
| Results search, test/class/status filters, sort, pagination | Implemented | Client filtering of recent 1,000 fetched attempts | Functional when data exists |
| Performance score cards and charts | Implemented | Derived from server-stored completed attempts | Functional, sample-limited |
| Submitted student report View | Implemented | Submitted server results only | Functional, subject to account rights |
| Premium card theme | 3 themes | Current page and print | Functional |
| Logo / header / watermark / footer controls | Admin Card Design editor | Live card preview and print; optional browser-local storage | **Local Draft only**, not global |
| A4 Student Card PDF download | Print button | Browser print dialog / Save as PDF | Functional in supported browser; not a direct PDF file service |
| Bulk CSV | Export button | Browser-generated with formula escaping | Functional, current filtered set only |
| Bulk print | Button | Browser print dialog | Functional, current filtered set |
| Digital Share / Copy link | Both buttons | OS share sheet or clipboard, student login + RLS required | Functional link generation; delivery depends on chosen app |
| Direct "Send to Student Inbox" | Conditionally shown | Requires approved result_delivery_notices + RPC | **Not activated** |
| Central shared published Result Card template | Not available | Requires secure versioned template settings | **Not implemented** |
| Automatic background PDF generation, notifications | Not available | Requires backend processor and delivery records | **Not implemented** |
| Result correction, approval, history, retake override | Not available in Stage A | Requires audited scoring/correction backend and permission tests | **Not implemented** |
| Scheduled publication and hold/release | Not available in Stage A | Requires server/RLS-enforced release embargo | **Not implemented** |
| Super Admin role view / verification | Staff & Permissions board | Existing is_super_admin RPC and user_roles reads | Functional read-only |
| New Teacher / Content Manager / Viewer grants | Conditional editor | result_staff_grants + audited RLS missing in Preview DB | **Not activated** |
| Study Materials browser and links to tests/results | Admin Study Material Control | Existing public chapter catalogue and published tests | Functional browsing |
| Teacher draft save/edit/delete/review request | Staff Workspace UI | Requires reviewed study_material_items schema and RLS | **Not activated** |
| Super Admin study publication / archive | Conditional review UI | Requires audited study_material backend | **Not activated** |
| Help Desk / System Settings / Backup / Security Logs / Website Health | Navigation entries | Placeholder screen only | **Planned; UI only** |

## Bugs found during audit and amended in PR

- Notifications bell previously had no action. Now opens existing Communication module.
- Generic Admin header incorrectly displayed "Super Admin" for all admin sessions. Now uses neutral "Admin Account"; Staff & Permissions performs separate server role verification.
- Digital Card Studio was accessible only from the row View modal. Admin Results now has a direct shortcut and links to Study Materials / Staff Permissions; shortcut disables truthfully if no submitted result exists.
- Missing/null submitted percentages were counted as 0 in admin aggregate results. Now missing percentages are excluded from statistics and displayed as unavailable. Explicit zero scores remain valid.
- Sidebar/overview previously presented placeholder modules beside real modules without a status badge. Five unimplemented modules now visibly show "Planned".

## Remaining release blockers

1. Global template persistence, multi-device synchronization, approval/publishing controls and student rendering of approved template.
2. Scoped role-grant RLS, successful server-side audit tests for assign/revoke, and permission enforcement on every results/materials operation.
3. Private in-app delivery and receipt tracking backed by audited RPC and recipient-only RLS.
4. Formal score correction, version history, student privacy review, scheduled result visibility.
5. Real authenticated role acceptance tests for one Super Admin, one ordinary Admin, one Teacher, and two different Student accounts.
6. Review production auto-deploy workflow: pushing PR #109 to main **will deploy Production automatically**. An owner decision is required whether to merge the completed frontend with disabled features, or wait until remaining backend is ready.

## Safe next steps

- CI validation for the exact latest PR head; then manual isolated Unified Preview deployment and actual card, print, navigation and responsive review.
- Separate explicit owner approval before applying proposed backend migrations to **Preview** for testing. No production schema migration without new approval.
- Do not describe all features as editable or active until backend permissions and persistence are verified.
- Keep Draft PR #109 open and unmerged until owner explicitly accepts the specific production impact and incomplete feature scope.

Rollback: Stage A is frontend-only. Code rollback by reverting the PR; no executed backend schema migration.
