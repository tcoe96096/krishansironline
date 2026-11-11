# KRISHAN Project — Live Release and Operations Status

_Last reviewed: 11 November 2026_

## Production release

- The 11 November website release was merged to `main` through PR #49.
- Merge commit: `47b439a0fd4dbeca8c36f524e382b8f2a0085fc4`.
- GitHub Pages production workflow run `43055419450` completed successfully.
- A separate Preview build for the release branch also completed successfully.
- A successful workflow confirms build/deployment completion; it does not replace real-device functional, accessibility, or security testing.

## Deployment separation

- `.github/workflows/pages.yml` is the production workflow. It deploys only from `main` (or manual workflow dispatch) and must remain separate from Preview validation.
- `.github/workflows/preview-build.yml` validates a branch or pull request, runs lint/type checking and Vite build, then uploads a short-lived artifact. It must never publish to the production Pages environment.
- Pull requests targeting `main` should receive Preview validation before merge.
- Production release remains gated by review and successful checks.

## Student login and test system

- Student mobile-number/password authentication, student dashboard, test engine, and Supabase service integration are present in the current main branch.
- The floating Student Login control was previously identified for post-login visibility verification. Confirm on a real mobile browser that it changes to the authenticated dashboard/account state and does not remain as a redundant login prompt.
- Test/question data additions are intentionally pending. Do not seed new question content until the owner supplies the approved dataset.
- Validate registration/login, session restoration, logout, attempt resume/expiry, server grading, result history, and student-to-student data isolation before declaring the flow fully accepted.
- Do not treat local legacy practice-test answer data as secure scored assessment content.

## Supabase Production safeguards

- Production project: `vsqwlkqqsxcehvdsdbna`.
- The Production `public.is_admin()` function checks the authenticated UUID against `public.user_roles`; it does not trust client-supplied metadata.
- Production currently has the core student attempt RPCs. Admin test-management RPCs observed in Preview are not yet confirmed in Production.
- Preview-only draft-validation and weighted-scoring migrations have not been applied to Production.
- The Production attempt-start function already handles stale in-progress attempts; do not reapply a duplicate expiry migration.
- Before any database migration: inspect function definitions, table constraints, RLS policies, grants, migration history, and backup/rollback options; validate in the existing Preview project first. Never expose service-role keys.

## Explicitly preserved legacy feeds

- The existing public Notice Board Apps Script feed remains enabled.
- The existing Live Admin Content Apps Script feed remains enabled.
- Do not disable either feed until a replacement has been implemented, security-reviewed, tested with representative content, and confirmed working by the owner.
- During migration, preserve current read behavior and avoid exposing private student data through public feeds.

## Pending acceptance checks

1. Real-device mobile and desktop smoke tests of student login, registration, dashboard and floating login control.
2. Validate Preview workflow on a pull request targeting `main`.
3. Complete a reviewed Admin RPC migration plan and Preview validation before considering Production database changes.
4. Build and verify the replacement publishing path before retiring either legacy Apps Script feed.
5. Add approved test datasets only when supplied by the owner.
