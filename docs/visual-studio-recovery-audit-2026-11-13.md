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

## Additional dependency checks
- The main-branch `AdminVisualStudio.tsx` is the PR #90 builder lineage plus the PR #95 `AdminVisualEditorV2` integration; the old PR #90 file does not contain that V2 import.
- The main-branch Studio component references Supabase table `visual_studio_drafts` and Storage bucket `visual-studio-media`.
- Repository code search found those references in the component, but did not find a matching SQL migration or bucket provisioning definition in the repository. Treat cloud draft/media persistence as **not verified** until the Supabase project is inspected read-only for the table, bucket, RLS policies and storage policies.
- The V2 real-page editor uses the existing `site_config_versions` service and draft RPC flow. This is distinct from the legacy builder's `visual_studio_drafts` table.
- `package.json` currently exposes `build` (`vite build`) and `lint` (`tsc --noEmit`). These should be run against a preview build before production release.
- The legacy PR #90 preview trigger workflow calls the old `krishansironline-preview` repository dispatch endpoint using `PREVIEW_DEPLOY_TOKEN`. Do not enable or copy this workflow into the replacement setup.

## Current recovery decision
- No additional PR #90 code has been cherry-picked: the directly relevant Studio component is already present in main and the V2 integration is already present as well.
- Next safe work is a read-only Supabase dependency check and an isolated GitHub Actions build of the current recovery/main baseline. Any missing backend setup should be documented and handled separately; do not apply database migrations or publish website drafts without explicit approval.

## Read-only Supabase environment verification (2026-11-13)
- Supabase project `krishan-sir-lms-preview` (`zgpkmfqioqvincmgyfpi`) is ACTIVE_HEALTHY. It contains `public.visual_studio_drafts` with RLS enabled, one admin-own-draft policy, a private `visual-studio-media` bucket, and four authenticated storage object policies for admin read/upload/update/delete.
- Supabase project `krishan-sir-lms` (`vsqwlkqqsxcehvdsdbna`) is ACTIVE_HEALTHY. It contains `public.site_config_versions`, but does **not** currently contain `public.visual_studio_drafts` or the `visual-studio-media` bucket; the read-only policy and bucket checks returned no matching records.
- This means the older builder's cloud draft/media feature is configured in the preview Supabase project but is not configured in the project named as the main LMS/production project. Local browser draft behavior may still work, but cloud persistence/media cannot be assumed to work against that production project.
- The newer real-page editor's `site_config_versions` backend exists in both projects. No database schema, policy, bucket, or data was changed during this inspection.

## Follow-up required before production release
- Decide and verify which Supabase project the current production deployment actually uses by inspecting deployment environment configuration (without exposing secret values).
- If production uses `krishan-sir-lms`, prepare a reviewed migration and storage-policy plan for the legacy builder only if that feature is intended to persist drafts/media in production. Do not apply it automatically.
- Continue isolated preview build verification; the recovery documentation commit's Vercel check is pending, while the current main commit's Vercel status reports failure with a build-rate-limit upgrade URL. Neither result is a successful build confirmation.
