# Visual Website Studio Recovery Audit — 14 November 2026

## Executive status

The Visual Website Studio implementation is present in the current `main` branch. The historic editor work is recoverable and the mainline contains both the Canvas Builder and the real-page editing path. Do not merge the old divergent PR #90 or the stale `feature/full-website-builder-live-editor` branch wholesale.

**Important distinction:** the recovered editor provides interactive editing in an iframe preview and saves a cloud draft. It does not currently prove that edits are pushed to the public website in real time. Publishing remains a separate, explicit workflow.

## Recovery map (current main)

| Area | Current implementation | Finding |
|---|---|---|
| Studio entry / Admin navigation | `src/components/AdminDashboard.tsx` → `AdminVisualStudio` | Present in main |
| Canvas / Drag-and-drop builder | `src/components/AdminVisualStudio.tsx` | Present; local canvas with undo/redo, templates, responsive preview and media |
| Canvas cloud draft | `public.visual_studio_drafts` + private `visual-studio-media` | Migration 0020 applied and verified in production; browser QA still required |
| Real-page editor mode | `AdminVisualStudio` → `AdminVisualEditorV2` | Present; edits a real-page iframe preview and saves V2 data in `site_config_versions` |
| Full page inspector / components | `AdminSiteWideBuilder.tsx` → `AdminSiteWideLiveEditor.tsx` | Present; click-to-select, style inspector, resize handle, component insertion, private media |
| Cloud draft persistence for real-page editor | `src/services/siteConfigService.ts` | Present; uses `admin_save_site_config` and `site_config_versions` |
| Public Live Publish | Separate website management / publish workflow | Not proven by editor Save Draft; must be separately reviewed and tested |

## Historical PR and branch disposition

- PR #89: visual editor architecture and V2 foundation — integrated.
- PR #93: Visual Studio module and Admin navigation — integrated.
- PR #94: removed Quick Element Editor entry while retaining the separate Studio — integrated.
- PR #95: real-page editing mode and schema — integrated.
- PR #96: V2 build fixes and GitHub Pages preview workflow — integrated.
- PR #97: draggable floating panels — integrated.
- PR #105: secure Canvas cloud drafts and private media backend migration — merged.
- PR #90: remains an old, divergent draft containing unrelated student authentication, test engine, Google Apps Script, workflow and documentation changes. Do not merge or cherry-pick wholesale.
- `feature/full-website-builder-live-editor`: stale/diverged from current main. Its editor implementation is already represented in mainline; the branch must not be merged as a replacement for current main.

## Capability audit

| Capability | Code evidence | Verified status |
|---|---|---|
| Select existing website elements in iframe | `AdminSiteWideLiveEditor.tsx` | Implemented in code; browser interaction not yet verified |
| Edit text and visual styles | Real-page inspector | Implemented in code; browser interaction not yet verified |
| Drag resize handle | Real-page inspector overlay | Implemented in code; browser interaction not yet verified |
| Insert heading/text/button/card/columns/image/video/divider/spacer | Components toolbar | Implemented in code; browser interaction not yet verified |
| Upload and use image/video media | Private Supabase Storage bucket | Backend configured; authenticated browser upload/reload not yet verified |
| Save real-page editor cloud draft | `saveWebsiteConfigDraft` | Implemented in code; authenticated save/restore not yet verified |
| Canvas autosave / restore | `visual_studio_drafts` + browser local storage | Implemented in code; authenticated save/restore not yet verified |
| Real-page V2 draft | `site_config_versions` | Implemented in code; browser save/reload not yet verified |
| Immediate public website update | No proof from Save Draft path | Not verified / do not claim |
| Explicit publish | Separate publish RPC / website management workflow | Must be tested independently after owner review |

## Production backend evidence

The 14 November recovery audit recorded that migration `0020_visual_studio_cloud_drafts_and_media.sql` was applied to the Production Supabase project `vsqwlkqqsxcehvdsdbna`. The migration ledger entry was recorded as version `20261114140551`.

The audit verified:
- `public.visual_studio_drafts` exists with RLS enabled and per-user ownership.
- The Admin-only policy requires `public.is_admin()` and restricts each Admin to their own drafts.
- `visual-studio-media` exists as a private bucket with a 50 MB limit and the expected image/video MIME allowlist.
- Four Storage policies restrict read, upload, update and delete to the authenticated Admin's own user-ID folder.

This confirms backend configuration only. It does not substitute for a real authenticated browser test.

## Required QA before calling recovery complete

1. Sign in using the authorized Admin account and open Admin → Visual Website Studio.
2. Confirm the Canvas Builder loads without a blank/black screen; add, edit, reorder, duplicate and remove a component; verify Undo/Redo.
3. Confirm Canvas draft autosaves to cloud and browser storage; refresh and verify restoration.
4. Open “वास्तविक वेबसाइट पेज Edit करें”; test desktop and mobile preview.
5. Select a safe public-page heading, paragraph, image and section; change text/style; resize; verify the selection overlay remains aligned while scrolling/resizing.
6. Add a component and an image/video from Media Library; refresh and verify signed media URLs and draft restoration.
7. Save a cloud draft, refresh, and confirm the exact draft returns.
8. Confirm protected routes and interactive features remain excluded: Admin, student login/dashboard, online tests, test attempts, results and other forms/controls.
9. Confirm Save Draft does not publish. Test explicit Publish separately only after reviewing the exact diff and receiving approval.
10. Check browser console, network requests, desktop/mobile layout and GitHub Pages production/preview deployment.

## Safe next implementation steps

- Keep follow-up changes on a fresh branch from current `main`.
- Fix only reproducible Visual Studio defects discovered during the authenticated QA above.
- Do not change student authentication, test engine, results, Google Apps Script, unrelated Supabase policies, or platform architecture as part of this recovery.
- Do not publish website content as part of recovery QA.
- Once the Admin browser checks pass, prepare a separate, scoped PR for any remaining editor-only code fixes. Live Publish remains a separate approval.

## Scope and conclusion

The editor source and backend migration are recovered/integrated in main. The outstanding gap is end-to-end authenticated browser verification and proof of the separate publish workflow. This PR records the recovery map and the exact evidence still needed; it does not alter production website content or publish anything.
