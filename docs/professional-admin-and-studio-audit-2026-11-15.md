# KSOL Professional Admin & Teacher Workflow Audit — 15 Nov 2026

**Scope:** Public website and Admin source in `tcoe96096/krishansironline` (Live `main` and Draft PR #109), plus the separate private `tcoe96096/advance-studio` repository at `main`. Code and GitHub Actions are checked; this is not a claim that all authenticated Super Admin, Teacher, Student scenarios have passed in a deployed browser.

**Safe boundary:** Recommendations only for removing/consolidating old controls. No live feature deleted, PR merged, Production deployed or database schema altered. Do not merge Draft PR #109 into Production until owner approval and the Preview DB/security acceptance tests below.

## Implementation update: Preview-only activation after approval

**Implemented in Draft PR #109:** a single Admin **Website Studio** navigation entry containing Page Builder and protected Branding & Site Settings tabs; grouped Dashboard/Academics/Assessments/People & Access/Communication, searchable sidebar, hidden Planned modules and real Student/Teacher pending counts. The old Website Settings editor is preserved inside the tab—not deleted or silently disconnected. The standalone private ADVANCE Studio remains independent; no unsafe import, live-publishing or schema conversion is assumed.

**Preview Database:** all five approved migrations—Staff Grants, Study Materials, Teacher Enrollment, Private Student Result Delivery, Global Card Template—were applied to `krishan-sir-lms-preview` only. Permission/ownership/status tests passed in rolled-back authenticated role simulations. Full browser login with real Google staff accounts, OAuth redirect allowlisting and device acceptance **are not yet complete**. Production and `main` remain unchanged. See `docs/preview-activation-acceptance-2026-11-15.md`.

## Executive recommendation

**Choose a single owner for web publishing, not three independent visual editors.**
Today these coexist:
1. `AdminWebsiteManagement.tsx`: older **Website Settings & Publishing** editor (homepage hero, bilingual text, header/footer, section visibility, palette) with its own Draft/Publish buttons using `siteConfigService` and `site_config_versions`.
2. `AdminVisualStudio.tsx` plus `AdminSiteWideLiveEditor.tsx`: site's main **Visual Website Editor**, page-level inspector, added components, cloud drafts, new pages and separate publish/schedule UI, also writing to website config service.
3. Private `advance-studio` repo, `preview/index.html` / `preview/studio.js`: attractive **standalone local editor** with pages, text/image/video/PDF blocks, export website and JSON backup. As of the audited revision it saves to browser `localStorage` (`advance-studio.draft.v1`), **not** to the KSOL live site's versioned configuration. Its own Save Draft is not a KSOL Publish action.

Do not delete these engines or treat the standalone ADVANCE Studio as already connected to KSOL. Instead, converge on **one admin entry** called **Website Studio** using the existing `site_config_versions` and a single approval/publish pipeline. Migrate/export existing saved versions first, verify feature parity, then *hide* old UI behind a temporary Legacy Settings accordion. Remove dead code only after parity and rollback pass.

## Actual current navigation and disposition

Draft Admin Dashboard currently exposes 15 entries including Overview. Five are UI-only placeholders; exposing all as top-level choices creates clutter.

| Existing Admin entry | Recommendation | New location/label |
| --- | --- | --- |
| Dashboard Overview | **Keep**; streamline cards to actual data only | Dashboard |
| Website Settings & Publishing | **Merge**, not delete storage/config service | Website Studio → Site Settings (Branding, Homepage, Header, Footer) |
| Main Visual Website Editor | **Keep as primary KSOL editing engine** | Website Studio → Page Builder |
| Academic Management | **Keep**, group with flashcards | Academics → Courses & Chapters / Flashcards |
| Study Materials | **Keep**; teacher drafts remain gated | Academics → Materials & Approvals |
| Online Test Management | **Keep**, group test series | Assessments → Tests / Question Bank / Mock Series |
| Pro Student Management | **Keep**; consolidate student governance panels | People → Students |
| Results & Reports | **Keep**; separate reports from Result Card design | Assessments → Results / Report Cards / Delivery |
| Staff & Permissions | **Keep**, Super Admin-only writes | People → Teachers & Staff / Requests / Roles |
| Communication | **Keep**, split tabs within same module | Communication → Announcements / Notices / Inbox |
| Help Desk | **Move to Planned**, do not advertise operational tickets | More → Planned / Roadmap until real backend |
| System Settings | **Move to Planned** until implementation | System → Planned Settings, only when real functions exist |
| Backup & Restore | **Hide dangerous Restore until tested**; current entry is placeholder | System → Recovery, Super Admin gated |
| Security & Activity Logs | **Keep access plan, hide as placeholder** | System → Audit & Security when verified |
| Website Health | **Move to System status** when actual telemetry exists | Dashboard → System Status (real signals only) |

Suggested sidebar groups:
- **Dashboard** — Overview, alerts, pending approvals.
- **Website Studio** — Page Builder, Site Branding, Media, Drafts/Versions, Publish Queue.
- **Academics** — Courses, Study Materials, Question Bank, Flashcards, Mock Tests.
- **Assessments** — Tests, Results & Reports, Digital Report Card Studio, Result Delivery.
- **People & Access** — Students, Teachers & Staff, Role Permissions, Pending Requests.
- **Communication** — Announcements, Student Notices, Support (when implemented).
- **System** — Auth/Audit (when implemented), Rollback, Settings, Health, Planned Features.

### Immediately remove from visible *top-level navigation*, not from code
- `Help Desk`, `System Settings`, `Backup & Restore`, `Security & Activity Logs`, `Website Health` as live-looking controls: **put under a collapsed "Planned" area** until actual functionality and audit exist.
- One of the two **Publish** entry points after a unified Publish Manager works end-to-end. Do **not** remove either current button before migrating and verifying existing drafts.
- Duplicate `Homepage Hero`, `Header & Footer`, palette and section toggle editors **after** their fields map to new Studio settings and one persisted version.
- Duplicate header/Floating Student Login surfaces only after responsive role-aware login behavior is tested.
- Keep `AdminSiteWideLiveEditor.tsx` as the inner editor implementation, not as a second sidebar module.
- Keep `visual-editor/PublishedStudioRuntime.tsx`: public published pages depend on it. Never remove based on file name alone.
- Review `src/visual-editor-v2` registry usage before deleting; an unused-looking schema may still be a planned migration or imported by tests.

## Findings and risks

### P0 — security and workflow correctness
1. **Three editing states**: old site settings Draft, site Visual Studio Cloud Draft, and standalone ADVANCE Studio browser-local draft. Different Save/Publish semantics can lead to "saved but website unchanged" confusion. Show source, last saved timestamp, draft ID and publish state in one Manager.
2. **Teacher role approval is not active in Preview**: `result_staff_grants`, `study_material_items`, and `teacher_enrollment_requests` require separate reviewed migrations. The latest Draft UI now supports Google Teacher sign-in to /staff-workspace/, Account ID, application, request status, withdrawal, and Super Admin approve/reject UI **only when the backend is installed and server-verified**. Login never auto-grants permissions.
3. **Publishing and staff scopes**: site editor currently checks general `isAdmin` UI and delegates to backend `admin_publish_site_config` / `admin_schedule_studio_publish`. Confirm those server RPCs enforce the desired Super Admin approval and scope; hiding Publish based on UI is insufficient. No teacher should publish website changes or edit marks through any Studio component.
4. **Study Material RLS** must be tested for ownership, class bounds, status transitions, insert/update/delete, review-note spoofing, test-link constraints, and stale-token revocation. Existing material proposal must be security-hardened before activation.
5. **Result and identity privacy**: verify two students can't see one another's report via deep link or cached state, all roles denied when no grants, result release/embargo and audit policies.
6. **No production merge to test UI**: main push may auto-deploy. Use owner-directed Unified Preview only. Validate latest exact SHA first.

### P1 — usability and admin workflow
- Desktop and mobile header should show role-specific actions; previous mobile account button opened Student Login even when a user was signed in. Latest Draft fixes it to route Admin / Teacher / Student to their proper workspace. Test Google redirect allowlists in the isolated environment.
- Admin top bar: **real global search** scoped by permission, role/account chip, Notifications bell with true unread count, environment indicator ("Preview"/"Production"), Draft status and one Publish manager. Don't show fabricated notification badges or data.
- Admin sidebar: support expandable groups, active-route breadcrumbs, favorite modules, compact/mobile collapse, keyboard navigation and visible "Pending" status for unavailable actions.
- Admin Overview: replace duplicated module-card wall + quick-actions + smart-action list with concise KPIs, Pending Approval queue, Recent Activity and 4 high-value shortcuts: Add Material, Create Test, Review Teacher, Open Website Studio.
- For actions that can delete/revoke/publish: show confirmation plus affected scope, actor, reason, audit ID and feedback; disable during request, never claim success before server confirmation.
- Website Studio editing toolbar: **Save Draft** / **Preview** / **Request Approval** / **Publish** (Super Admin only) / **Scheduled Publish** / **Rollback**. Keep Publishing entirely in one panel.
- New teacher role flow: Google sign-in → Request teacher account → pending queue → Super Admin verifies identity → approve class-scoped draft rights → teacher authors material → review request → Super Admin publishes. Never let teacher register as Super Admin.
- Help Desk, System Health, Backup, Audit: show "Not configured" not a fake live card. Avoid cards with arbitrary 0 instead of unavailable state.

### P2 — visual polish
- One navy + teal + neutral palette across Admin; reserve gold for publication warnings. Readable contrast, no black gradients behind dense tables.
- Desktop: 256 px sidebar, 72 px top bar, 12-column dashboard grid; max width 1440 px.
- Mobile: collapsible navigation drawer, 44 px minimum touch targets, table cards instead of horizontal overflow where sensible.
- Use consistent icon + short label; replace "Pro / Smart / Main" marketing duplication with task-oriented names.
- Status badges: Draft, Pending Approval, Published, Needs Review, Backend Pending. Never badge every heading.
- Unified filters across Students/Tests/Results; search by relevant accessible fields only, no private student data exposed.
- Reuse accessible confirmation dialogs, toasts, empty states, field validation, and clear labels in Hindi/English.

## Account / module access model (target, backend not all active)

| Feature | Super Admin | Admin | Teacher | Student |
| --- | --- | --- | --- | --- |
| Site brand/settings | Write/Publish | Draft if granted | No | No |
| Page Builder | Draft/Publish | Scoped Draft if granted | No by default | No |
| Study Materials | Approve/Publish/Archive | Manage assigned drafts if granted | Own class drafts/review | Published only |
| Tests / Question Bank | All with audit | Assigned tests | Only separately granted test authoring | Take approved tests |
| Results | Audited review, release, delivery | Assigned reports only | Scoped view/request only when enforced | Own submitted reports |
| Teacher enrollment | Review/approve/reject/revoke | View pending only if explicitly allowed | Own application/status | No |
| Role permissions | Assign/revoke all delegated roles | No role elevation | No | No |
| Backup/restore | Approved recovery with safeguards | No | No | No |

*Existing ordinary Admin rights must not be relabeled as least-privilege until backend RLS/RPC enforcement is audited. These rows are the desired future model, not a claim of current activation.*

## Component and button audit summary

| Surface | Observed wiring | Disposition |
| --- | --- | --- |
| Desktop student account menu | Login/account dropdown + sign-out | Latest Draft routes role-specific workspaces; retest with 3 account types |
| Mobile account button | Previously opened login modal for already logged-in user | Fixed in Draft; verify on mobile |
| Admin Google Login | Admin Dashboard, server role verification | Keep separate from Student login |
| Teacher Google Login | /staff-workspace/ with Google OAuth | Keep; ensure Supabase redirect allowlist includes isolated Preview and Production |
| Admin Dashboard Notifications bell | Opens Communication module | Keep; make actual unread count next iteration |
| Website Management Save/Publish | Operates site config drafts/versions | Merge into one publish flow after migration |
| Admin Visual Studio Save/Publish/Schedule | Operates site config drafts and Publish Manager | Primary editor path; review server permissions |
| Standalone ADVANCE Studio Save/Export/Backup | Local browser draft/export, independent repo | Keep as separate prototype until production integration approved |
| Admin Results Digital Card Studio | Working design edit, local JSON backups, browser Print/PDF | Keep; central publication remains backend-gated |
| Staff Role grant Save/Edit/Revoke | Code wired, scoped backend missing | Remain gated until audited Preview RLS |
| Teacher enrollment Submit/Withdraw | UI wired; no automatic self-grant | Remain gated until audited Preview migration |
| Super Admin teacher Approve/Reject | UI wired, identity verification + server RPC | Remain gated until reviewed backend |
| Study Material Draft/Edit/Delete/Review | UI wired | Remain gated until material schema/RLS deployed |
| Student Inbox Send | UI wired and gated | Remain gated until private inbox backend and release rules |

## Workflow milestones

**Stage 1 — Safe Admin IA & UI consolidation.** Rename top-level modules, move placeholders, group duplicate panels, preserve existing data/paths, add breadcrumbs/favorites and unify Publish status. No old features deleted.

**Stage 2 — Teacher + material backend review.** Owner separately authorizes Preview migrations, inspect real schema, create migrations in correct dependency order, execute RLS tests with isolated Super Admin, Admin, Teacher and Student accounts, test audit/revocation. No Production changes.

**Stage 3 — Single Website Studio integration.** Decide whether standalone ADVANCE Studio exports a validated page schema into KSOL Studio or becomes replacement UI for the site's current Visual Studio. Ensure old drafts can import, consistent data store, rollback, and no fake page changes. Then hide legacy website editor.

**Stage 4 — Live readiness.** Multi-role manual browser acceptance on isolated Preview, mobile and desktop screenshot review, approve final roles, full report-card print, teacher material submission and approval, results privacy, OAuth redirects; owner separately approves Production deploy/merge.

## Acceptance checklist (not all completed)
- [x] Source-level inventory of Admin modules, authentication components and two website editing implementations in KSOL.
- [x] Independently audited ADVANCE Studio localStorage-based editor.
- [x] Student role/teacher/admin login button routing fix authored in Draft PR.
- [x] Teacher request and Super Admin review UI authored; backend controls deliberately gated.
- [x] No old live feature deleted and no Production DB changes.
- [x] Teacher/material/result template/inbox backend applied to isolated Preview after owner approval and tested through rollback SQL role simulations.
- [ ] Authenticated end-to-end tests with four roles, OAuth allowlists, RLS and audit.
- [x] Single Admin Website Studio entry with Page Builder / Branding tabs and preserved legacy data; **full ADVANCE Studio schema integration and single Publish Manager still pending**.
- [ ] Full real-browser visual audits on desktop/mobile with actual admin credentials.
- [ ] Separate owner approval and plan for Production merge.

**Current boundary:** Preview database setup is done, and a consolidated Admin entry is wired. A real authenticated browser acceptance run, standalone ADVANCE Studio integration and safe single Publish workflow remain release gates. This PR cannot honestly be described as fully published or merged.
