# Teacher Beta — Unified Preview handoff (REVIEW ONLY)

## Goal
Display the redesigned teacher registration and Super Admin directory at `/krishansironline-preview-unified/teacher-beta/` while keeping the existing public KSOL site unchanged.

## Verified repository constraints
- `tcoe96096/krishansironline-preview-unified` currently has a **manual owner-approved** GitHub Pages deployment workflow.
- That workflow checks out the selected source revision and builds the **full website** with `npm run build -- --base=/krishansironline-preview-unified/`.
- The isolated teacher portal is a **separate Vite build** (`npm run build:teacher-beta`), with its own `teacher-beta-dist` output. The existing preview workflow does **not** include that output. A successful full-site preview build is **not** evidence that the new Teacher v2 portal is hosted.
- Preview Supabase `zgpkmfqioqvincmgyfpi` does not yet have approved teacher-v2 tables/RPCs. The form must remain non-operational until those gates pass.

## Proposed non-deploy implementation
1. Add a reviewed, preview-repository-only build step that runs the isolated teacher Vite build with `--base=/krishansironline-preview-unified/teacher-beta/`.
2. Copy `teacher-beta-dist` into `website/dist/teacher-beta/` **without overwriting** any existing site assets or pages. Verify the expected `teacher-beta/index.html`, `teacher-beta/staff-workspace/index.html` and `teacher-beta/admin/index.html`.
3. Preserve the existing Preview-only Supabase URL assertion and avoid Production secrets.
4. Check Google OAuth redirect allowlisting for `https://tcoe96096.github.io/krishansironline-preview-unified/teacher-beta/staff-workspace/` before login acceptance.
5. Verify the source commit, Pages artifact manifest, mobile navigation, and non-operational registration notice before asking the owner to approve a separate Preview-only publish.
6. Do **not** enable teacher-v2 flags, run migrations, publish, merge, or modify either database as part of this handoff.

## Release gates
A browser-visible mock preview is not a live registration backend. Activation requires separately verified recovery, RPC/RLS/grant tests, server-side Super Admin authorization, OAuth acceptance, and explicit owner release approval. Keep resumes/AI, result analytics, and advanced assignments disabled.
