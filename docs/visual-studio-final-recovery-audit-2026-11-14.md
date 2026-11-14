# Visual Studio Final Recovery Audit — 14 November 2026

## Purpose

Reconcile the Vercel-era Visual Studio work with the current GitHub-only `main` branch. This is an audit and safe hand-off; it does not publish website content or change unrelated production configuration.

## Findings

### Old Vercel-era branches / pull requests

- PR #90, `Build isolated Krishan Sir Visual Studio module`, remains open and draft. It contains 59 changed files, 192 commits, and is divergent from current `main` (192 ahead / 210 behind). Its diff includes student authentication, test engine, Google Apps Script, workflows, documentation, and other unrelated changes. It must not be merged or cherry-picked wholesale.
- PR #91, student tab-session security, is based on the obsolete PR #90 branch. Its one-file AuthContext change is not part of the Visual Studio recovery scope. It must be reviewed independently against current student session requirements before any reuse.
- PR #95 was merged to `main` as commit `49bfbd9f7c55238266486078279ba99051ebab21`. It adds the real-page editing mode to the existing Visual Studio without merging PR #90.
- Vercel's historical Hobby deployment rate-limit failure was a deployment/check failure, not proof that GitHub Auto-merge was waiting. GitHub PR #90 and #91 had no active Auto-merge configured at the time of the audit.

### Visual Studio work already integrated into main

| PR | Integrated work |
|---|---|
| #89 | Visual editor architecture and V2 foundation |
| #93 | Visual Studio module and Admin navigation |
| #94 | Removed Quick Element Editor entry; retained separate Studio |
| #95 | Unified Canvas Builder with real-page editing mode |
| #96 | V2 TypeScript/build fixes and GitHub Pages preview workflow |
| #97 | Draggable floating panels in the real-page editor |
| #105 | Secure Canvas cloud drafts and private media backend migration |

PR #97's merge commit is an ancestor of current `main`; its panel-dragging changes are already present. PR #105 was merged on 14 November 2026 as `573e35571f0d898de6dd84c4035b0a293cadb4f5`.

### Current CI / deployment evidence

- PR #105's Validate website build and Preview build (no production deploy) checks passed on its final head SHA `0ee4d47437af094f106a34eb7b0ea6027ff26bde`.
- The GitHub Pages deployment run #43603029399 completed successfully on `main`, commit `573e35571f0d898de6dd84c4035b0a293cadb4f5`.
- PR #96's historical combined commit status reports a Vercel failure URL for the old Hobby rate limit. That status must not be treated as a current GitHub Pages build failure.
- Current workflow files include GitHub Pages deployment and validation workflows; no Vercel dependency is required for the approved hosting architecture.

## Supabase migration 0020 — applied and verified in Production

Migration `0020_visual_studio_cloud_drafts_and_media.sql` was applied to the Production Supabase project `vsqwlkqqsxcehvdsdbna` on 14 November 2026. The Supabase migration ledger lists `0020_visual_studio_cloud_drafts_and_media` with version `20261114140551`.

Post-application inspection confirmed:

- `public.visual_studio_drafts` exists with per-user draft ownership, a unique `(user_id, draft_key)` key, and RLS enabled.
- The authenticated Admin-only policy restricts each user to their own drafts and requires `public.is_admin()`.
- The `visual-studio-media` bucket exists and is private, with a 50 MB file limit and the expected image/video MIME allowlist.
- Four Storage policies restrict read, upload, update and delete operations to the authenticated Admin's own user-ID folder.
- No finding was reported specifically for the new drafts table or media bucket in the reviewed security-advisor output.

This confirms the database/storage backend is installed; it does **not** prove the authenticated browser workflows have passed.

## Remaining verification before calling Visual Studio complete

1. Run authenticated Admin browser checks: open Studio, switch Canvas / Real Page Editor, select text and image/section elements, edit styles, resize, drag panels, save a cloud draft, reload and restore the draft.
2. Verify the public-page allowlist and protected routes remain excluded (online tests, results, student dashboard, Admin routes).
3. Verify that Save Draft never publishes. Test explicit publish separately only after owner review.
4. Check desktop and mobile layouts and browser console/network errors.
5. Keep all further changes in a fresh feature branch from current `main`; do not reuse the divergent PR #90 branch.

## Scope boundary

The Visual Studio migration above is complete. This audit does not authorize changes to student authentication, tests, student lifecycle/purge controls, Google Apps Script, or unrelated production configuration. Do not publish website content as part of this recovery audit.

## Recommended next step

Complete authenticated Admin browser QA for Canvas Draft Save/Restore, Media Library access, Real Page Editor preview and cloud-draft persistence. Fix any reproducible Visual Studio-only defects through a scoped feature branch and PR. Keep Live Publish as a separate, explicitly reviewed action.
