# Krishan Sir Visual Website Editor

## Status
Approved for development. Scope: all public website pages and eligible visual components.
Budget constraint: INR 0 additional spend. Do not add paid APIs, subscriptions, libraries, hosting, storage, or services without explicit user approval.

## Existing foundation audited
- React 19 + TypeScript + Vite 8 application.
- Admin entry: `src/components/AdminDashboard.tsx`.
- Website administration: `src/components/AdminWebsiteManagement.tsx`.
- Existing full-site builder prototype: `src/components/AdminSiteWideBuilder.tsx`.
- Existing versioned configuration storage: `public.site_config_versions`, protected by RLS and admin-only RPCs.
- Existing config service: `src/services/siteConfigService.ts`.
- Existing public pages are assembled in `src/App.tsx` from reusable React components.
- The current full-site builder is a localStorage-backed sample/mock preview. It does not edit the real rendered page DOM, does not persist to Supabase, and does not move real site components.
- The current Website Management editor has a separate Supabase draft/publish flow for hero/header/sections/palette. Avoid creating a competing persistence system.

## Product goal
Provide an Admin-only visual editing workspace launched from Website Management. Admin selects a real page in a preview, clicks an eligible element, and edits its content and appearance. Support drag/reorder where the page's component structure explicitly allows it.

## Scope
1. Page picker for all public routes; exclude Admin, Admin Preview, authentication, student test-taking and other sensitive operational routes from arbitrary visual editing.
2. Click-to-select overlay on real rendered preview.
3. Text editing: bilingual text where supported, typography, size, weight, line height, alignment and color.
4. Element/frame editing: width, max-width, height where safe, padding, margin, gap, border, radius, shadow, background and visibility.
5. Image replacement/crop/fit/alt text using existing free storage or existing project assets; no new paid storage.
6. Buttons/links: label and safe destination editing while preserving approved navigation behavior.
7. Component tree/layers, safe drag-and-drop reorder, duplicate and hide/show for registered movable sections.
8. Responsive preview: desktop/tablet/mobile with per-breakpoint visual settings.
9. Draft autosave/manual save, undo/redo, version history, restore, preview and explicit publish confirmation.
10. Accessibility, keyboard support, responsive behavior and audit trail.

## Safety boundaries
- Never allow visual editor operations to alter authentication, authorization, student identity, test timer, test attempt state, answer validation, submission, results, payments or database/business logic.
- Do not expose hidden/admin-only content in public preview.
- Do not execute arbitrary HTML, JavaScript, CSS, or uploaded scripts from editor content.
- Use an allowlisted component registry and validated style/content schema. Unsupported components remain selectable/read-only or clearly marked as protected.
- Preserve the existing site_config_versions workflow and RLS/RPC protections. Extend the existing config shape rather than introducing a second source of truth.
- Save changes as draft first. Publishing remains a separate explicit action and is never automatic.
- Keep changes on this feature branch and use PR + Vercel preview verification. Do not merge to main or publish production without explicit approval.

## Proposed implementation phases
### Phase 0 — audit and design
Map public routes, component ownership, existing website config, storage availability, RLS, GitHub Pages preview routing and GitHub Actions deployment pipeline. Confirm editable/protected component registry.

### Phase 1 — editor shell and safe real-page preview
Admin-only visual editor shell, route selector, real preview frame, selection/highlight overlay, selected-element inspector and protected-element handling. No live writes.

### Phase 2 — click-to-edit and design controls
Implement validated content/style overrides for registered components; preview changes immediately; retain original layout by default.

### Phase 3 — component tree and drag/drop
Add reorder/move only for containers registered as movable. Support undo/redo and prevent invalid parent/child combinations.

### Phase 4 — responsive settings and media
Add desktop/tablet/mobile settings and media replacement using existing free infrastructure.

### Phase 5 — persistence, history and publish
Integrate with existing versioned Supabase config and admin-only RPCs; add autosave drafts, restore and explicit publish workflow.

### Phase 6 — coverage and regression testing
Test every eligible public page, mobile/desktop layouts, permissions, existing student/admin workflows, test timer/submission, accessibility, GitHub Actions build/lint and GitHub Pages Preview deployment.

## Acceptance criteria
- Editing is performed against the real page preview, not a static mockup.
- All public pages are listed; protected areas are not editable.
- A selected element has a visible outline and inspector controls.
- Style/content changes update preview without changing the live site.
- Drag/drop only works for explicitly movable registered components.
- Drafts persist across sessions and can be restored.
- Publish requires a separate confirmation and admin authorization.
- Existing site behavior and data remain intact.
- No new paid dependency or service is introduced.
- Build, type-check and preview regression checks pass before merge.

## Estimate
Initial planning estimate: 35–55 working days for full website coverage, subject to the Phase 0 component audit. The existing prototype and Supabase versioning reduce some foundation work, but true DOM selection, component registration, safe drag/drop and regression testing are substantial. Build in usable milestones; do not promise a single fixed delivery date before Phase 0 is complete.
