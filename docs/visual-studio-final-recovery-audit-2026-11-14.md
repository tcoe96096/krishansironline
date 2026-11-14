# Visual Studio Final Recovery Audit — 14 November 2026

## Purpose

Reconcile the Vercel-era Visual Studio work with the current GitHub-only `main` branch. This is an audit and safe hand-off; it does not publish website content or change production configuration.

## Findings

### Old Vercel-era branches / pull requests

- PR #90, `Build isolated Krishan Sir Visual Studio module`, remains open and draft. It contains 59 changed files, 192 commits, and is divergent from current `main` (192 ahead / 210 behind). Its diff includes student authentication, test engine, Google Apps Script, workflows, documentation, and other unrelated changes. It must not be merged or cherry-picked wholesale.
- PR #91, student tab-session security, is based on the obsolete PR #90 branch. Its one-file AuthContext change is not part of the Visual Studio recovery scope. It must be reviewed independently against current student session requirements before any reuse.
- PR #95 was merged to `main` as commit `49bfbd9f7c55238266486078279ba99051ebab21`. It adds the real-page editing mode to the existing Visual Studio without merging PR #90.
- Vercel's historical Hobby deployment rate-limit failure was a deployment/check failure, not proof that GitHub Auto-merge was waiting. GitHub PR #90 and #91 have no active Auto-merge configured.

### Visual Studio work already integrated into main

| PR | Integrated work |
|---|---|
| #89 | Visual editor architecture and V2 foundation |
| #93 | Visual Studio module and Admin navigation |
| #94 | Removed Quick Element Editor entry; retained separate Studio |
| #95 | Unified Canvas Builder with real-page editing mode |
| #96 | V2 TypeScript/build fixes and GitHub Pages preview workflow |
| #97 | Draggable floating panels in the real-page editor |

PR #97's merge commit is an ancestor of current `main`; its panel-dragging changes are already present. Do not reapply them.

### Current CI / deployment evidence

- Current `main` GitHub Pages deployment run #43599907946 completed successfully.
- The most recent Validate website build run #43599855498 completed successfully.
- PR #96's historical combined commit status reports a Vercel failure URL for the old Hobby rate limit. That status must not be treated as a current GitHub Pages build failure.
- Current workflow files include GitHub Pages deployment and validation workflows; no Vercel dependency is required for the approved hosting architecture.

## Remaining verification before calling Visual Studio complete

1. Verify in the connected Supabase project that the Admin-only `site_config_versions` table and `admin_save_site_config` / `admin_publish_site_config` RPCs are installed and enforce Admin-only writes.
2. Verify the legacy Canvas Builder's `visual_studio_drafts` table and `visual-studio-media` storage bucket/policies. The current repository migration directory contains `0011_versioned_website_configuration.sql`, but no migration explicitly named for the legacy drafts table or media bucket. Do not assume those resources exist merely because the UI references them.
3. Run authenticated Admin browser checks on Preview: open Studio, switch Canvas / Real Page Editor, select text and image/section elements, edit styles, resize, drag panels, save a cloud draft, reload and restore the draft.
4. Verify the public-page allowlist and protected routes remain excluded (online tests, results, student dashboard, Admin routes).
5. Verify that Save Draft never publishes. Test explicit publish separately only after owner review.
6. Check desktop and mobile layouts and browser console/network errors.
7. Keep all changes in a fresh feature branch from current `main`; do not reuse the divergent PR #90 branch.

## Scope boundary

This audit does not create or run database migrations, change storage policies, publish website content, merge to `main`, or deploy Production. Any missing Supabase schema/policy work must be based on a read-only inspection of the actual connected project before writing a migration.

## Recommended next implementation PR

Create a clean Visual Studio completion PR from current `main` only after the Supabase resource audit. Include only verified missing schema/policy fixes and concrete UI/QA fixes. Do not include student authentication, tests, Google Apps Script, purge/scheduler work, or Vercel configuration.
