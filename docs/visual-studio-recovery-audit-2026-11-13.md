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


## Verified isolated GitHub Actions build (2026-11-13)
- Added the `recovery/**` branch pattern to the **recovery branch copy only** of `.github/workflows/preview-build.yml`. The `main` workflow was not modified.
- GitHub Actions run: https://github.com/tcoe96096/krishansironline/actions/runs/43428146168
- Run result: `success` on `recovery/visual-studio-audit-2026-11-13`, commit `58c421e0e713d5d6f3a91c49cf5702b8848650d5`.
- Confirmed successful steps: checkout, Node 22 setup, dependency install, TypeScript/lint (`npm run lint`), Vite build (`npm run build`), and artifact upload.
- Artifact `krishansir-preview-58c421e0e713d5d6f3a91c49cf5702b8848650d5` was created (6,292,942 bytes, not expired at time of audit).
- This workflow uploads a build artifact only. It does not deploy GitHub Pages or Production.
- Recovery branch comparison against `main`: 4 commits ahead, 0 behind. The only changed paths are the recovery audit document and the recovery-branch-only preview workflow.

## Production-safe V2 draft backend verification (read-only)
- Both Preview and Production Supabase projects have `public.site_config_versions`, the `admin_save_site_config(p_config jsonb)` RPC, and the `admin_publish_site_config(p_version_id uuid)` RPC.
- Both RPCs are SECURITY DEFINER and explicitly check `auth.uid()` plus `public.is_admin()`.
- The `site_config_versions` table has an authenticated Admin-only management policy and a public read policy restricted to published rows (admins may also read rows).
- Therefore, the V2 Real Page Editor's cloud-draft save path has its required table/RPC/security-policy objects in both environments. Saving creates/updates a **draft**; publishing is a separate RPC and is not invoked by this editor's Save Cloud Draft button.
- The legacy Canvas Builder's separate `visual_studio_drafts` table and `visual-studio-media` bucket remain configured in Preview but absent from the Production Supabase project. Its cloud draft/media persistence is therefore not ready in Production; browser-local draft behavior remains separate.
- All Supabase inspections in this section were SELECT-only. No schema, policies, functions, buckets or data were changed.


## Production deployment preservation check (2026-11-13)
- The latest `main` GitHub Pages workflow run inspected was successful: https://github.com/tcoe96096/krishansironline/actions/runs/43417003920
- It deployed from `main` commit `49bfbd9f7c55238266486078279ba99051ebab21`; both the build and Pages deploy jobs completed successfully.
- The recovery branch changes were not merged to `main`; this production deployment run predates and is independent of the recovery branch.
- Main branch workflow inventory contains `pages.yml`, `preview-build.yml`, `student-dashboard-validation.yml`, `student-mobile-auth-validation.yml`, and `validate-pages.yml`. The old `trigger-preview-deployment.yml` is not present on `main`.
- The old `krishansironline-preview` repository still has an active six-hour scheduled workflow that checks out `preview/student-system-live-design-integration` from the main repository. Do not remove/disable it until the replacement preview repository is built and verified, but do not direct new Visual Studio work to it.


## Saved draft inventory (read-only snapshot, 2026-11-13)
- Preview `public.visual_studio_drafts`: 0 rows.
- Preview `storage.objects` for bucket `visual-studio-media`: 0 objects.
- Preview `public.site_config_versions`: 0 rows.
- Production `public.site_config_versions`: 0 rows.
- Production does not have `public.visual_studio_drafts`; its query returned PostgreSQL relation-not-found. Production `storage.objects` for `visual-studio-media`: 0 objects.
- No cloud-saved Studio draft/content was found in either Supabase project at the time of this snapshot. The Canvas Builder code also stores drafts in browser localStorage under key `krishan.visual-studio.draft.v1`; browser-local data must be retrieved from the original browser profile/origin. Do not clear browser site data or close/replace the old Vercel preview context until that extraction is complete.
