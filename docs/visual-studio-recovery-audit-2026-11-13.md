# Visual Studio Recovery Audit — 2026-11-13

## Verified baseline
- Repository: `tcoe96096/krishansironline`
- Recovery branch: `recovery/visual-studio-audit-2026-11-13`
- Baseline: current `main` branch (commit previously verified as `49bfbd9`)
- This audit commit contains documentation only; it does not change production code or deploy anything.

## PR #90 inventory
- PR #90 has 59 changed files in the accessible file list.
- The inventory includes the Visual Studio component, 19 student/test/auth-related files, 4 build/preview workflow or package/config files, and 35 other files.
- The old preview trigger workflow explicitly dispatches to `tcoe96096/krishansironline-preview`; it must not be copied into the new preview arrangement unchanged.

## Visual Studio recovery finding
- PR #90's `src/components/AdminVisualStudio.tsx` is the original drag-and-drop builder component.
- That component was introduced into the mainline by PR #93, then extended by PR #95 to add the `AdminVisualEditorV2` real-page editing mode and schema.
- The current main branch contains `src/components/AdminVisualStudio.tsx`, `src/components/AdminVisualEditorV2.tsx`, and `src/visual-editor-v2/schema.ts`.
- Therefore, the direct Visual Studio component from PR #90 is already represented in mainline; it should not be merged a second time.

## Preserve / isolate
- Do not merge PR #90 wholesale: it contains unrelated student authentication, test engine, Supabase migrations, general website and deployment changes.
- Review those files separately only if a specific missing Studio dependency is demonstrated.
- Keep the old preview workflow out of any new branch intended for the replacement preview repository.

## Next verification
1. Verify Studio runtime in an isolated preview build.
2. Check whether required Supabase tables/storage policies for Studio are present without applying migrations.
3. Review PR #90's non-Studio files only for dependencies actually imported by the current Studio.
4. Do not merge to `main` or deploy to production without explicit approval.
