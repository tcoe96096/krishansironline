# Supabase setup — Krishan Sir Online Learning Portal

## Public browser configuration
The project URL and Supabase Publishable Key are configured as safe defaults in
`src/lib/supabase.ts`. Deployment environment variables may override them:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`

Never put a Supabase secret/service-role key in Vite environment variables.

## Apply database migrations
In Supabase Dashboard → SQL Editor, run these files in numeric order:

1. `supabase/migrations/0001_student_test_system.sql`
2. `supabase/migrations/0002_student_profile_provisioning.sql`
3. `supabase/migrations/0003_lock_student_identity_and_attempts.sql`
4. `supabase/migrations/0004_validate_test_submission_answers.sql`

Run migration 0004 after the first three migrations. It validates question and option indexes before grading, preventing malformed browser submissions from inflating attempted counts. Then run migration 0005 once to seed the selected Class 8 and Class 9 tests. Migration 0006 restricts direct API execution of trigger-only functions; apply it only after confirming the matching custom triggers/functions exist in the target project and after reconciling that project's existing schema and migration baseline. Do not blindly replay migrations 0001–0005 on an existing project. Do not mark the system production-ready until the schema baseline, migration history, and end-to-end tests are verified.

## Student password login (no SMS OTP)
The portal presents a mobile-number + password interface. It normalizes Indian mobile numbers to +91 format and maps each number to a stable internal identifier (`student.<country-code-and-number>@login.krishansir.online`) for Supabase Email/Password Auth. This avoids the Phone provider and Twilio/SMS billing. The generated identifier is not a real mailbox. During transition, existing accounts created with the old email form can still sign in by entering their email in the same identifier field; new registrations must use a mobile number.

In Authentication → Sign In / Providers:
- Keep Email provider enabled.
- Disable Confirm email because the generated identifier is not a real mailbox.
- Keep Phone provider disabled; no Twilio credentials are required.
- Use a minimum password length of at least 8 characters and appropriate auth rate limits.
- Mobile numbers are not verified and must not be treated as proof of identity. The generated identifier cannot receive email password-reset links; establish an administrator-assisted identity verification and recovery process before production. Since mobile numbers are not verified, prevent account takeover by checking school records before any assisted reset.

## Dashboard status checked from the owner's screenshots (8 Nov 2026)
- Email provider: enabled.
- Confirm email: disabled (matches the no-SMS synthetic-identifier student flow).
- Phone provider: disabled (expected; do not enable for the no-SMS design).
- Google provider: disabled in the screenshot; OAuth admin login will not work until valid Google OAuth credentials are configured.
- The `user_roles` table was empty in the screenshot; no admin role had been granted yet.
- The `student_profiles` table showed two records, but this does not by itself prove end-to-end login, RLS, or profile-provisioning tests have passed.

Do not enable Google provider with placeholder credentials. Configure a Google Cloud OAuth Web Client first, then add its Client ID and Client Secret in Supabase Auth → Sign In / Providers → Google. Keep the secret in the Supabase dashboard only.

## Google OAuth administrator login
In Authentication → Providers → Google:
1. Enable Google provider.
2. Configure the Google OAuth Client ID and Client Secret in the Supabase dashboard only.
3. Add the Supabase callback URL shown in the provider settings to the Google Cloud OAuth client's Authorized redirect URIs.
4. Add the portal's production URL to Supabase Authentication → URL Configuration → Site URL and Redirect URLs.
5. Open the portal and use Student Login → Continue with Google · Admin Login.
6. Sign in with the approved account `tcoe96096@gmail.com`.
7. After the first successful OAuth login, run `supabase/bootstrap-admin.sql` in SQL Editor.
8. Sign out and sign in again. The portal checks the `user_roles` table; Google email alone does not grant admin access.

The Google OAuth Client Secret must never be committed to GitHub or shared in chat.

## Google Sheets bridge
Deploy `google-apps-script/Code.gs` as a Web App executing as the owner.
Set Script Properties:
- `PORTAL_SHARED_SECRET`: a long random secret.
- `RESULTS_SHEET_ID`: the spreadsheet ID.

The script is intended to be called only by a trusted server-side Edge Function. Do not call it directly from browser code or expose the shared secret.

## Current implementation boundaries
- Student Supabase Auth UI and database profile provisioning are present.
- Google OAuth sign-in and database role lookup are present; actual provider setup and admin bootstrap are manual. Production currently has no administrator role row; complete this in the separate Admin release phase.
- Authenticated students load published test content from Supabase and submit attempts through protected PostgreSQL RPCs. The browser sends answer indexes only; authoritative grading is performed by PostgreSQL. Production test question JSON has been checked for answer-key and explanation fields, and none were found.
- The legacy `ONLINE_TESTS` array remains bundled in browser code and includes client-side answers/explanations, which are publicly inspectable. Treat it as public practice content only; never use that local array for confidential or scored assessments. Use the Supabase-published test catalogue for authenticated student attempts.
- The Student Dashboard learning-progress feature requires migration `0008_student_learning_progress_and_profile_location.sql`. Migration `0009_expire_stale_test_attempts.sql` updates timed-out in-progress attempts to expired when the student next starts that test. Neither migration is applied to Production as part of this preparation.
- The Apps Script results bridge is present but has not been deployed or connected to a trusted Edge Function. The public Notice Board uses a separate Apps Script announcements feed.
- Do not merge/deploy until the Production schema baseline is reconciled, the reviewed pending migrations are applied with approval, authentication/recovery limitations are accepted, the secure test flow is manually verified, and the release checklist is complete.

## Later student release migrations
- `0007_restrict_public_test_rpc_execute.sql` is recorded in the current Production migration history.
- `0008_student_learning_progress_and_profile_location.sql` is pending in Production and is required for persistent chapter progress.
- `0009_expire_stale_test_attempts.sql` is a new pending migration that improves expired-attempt status handling without increasing the attempt limit.

For the existing Production project, do not replay migrations `0001`–`0007`. The earlier student-system schema exists, but its migration history is not a complete numeric record. Reconcile the live schema and backup first; apply only reviewed pending migrations after explicit release approval. Do not copy Preview-only migrations into Production without a separate review.


## Seed the Class 8 and Class 9 test catalogue
After migrations `0001` through `0004` have been applied, run `supabase/migrations/0005_seed_secure_test_catalogue.sql` once in Supabase SQL Editor. This seed contains only three tests: Class 9 History (60 questions), Class 9 Constitution Quiz (4 questions), and Class 8 NMMS History (40 questions). Public question JSON excludes correct answers and explanations; answer indexes are stored separately in `test_answer_keys`. Re-running the migration updates these three test IDs only; it does not delete other tests or student attempt history.


## Trigger-function privilege hardening (migration 0006)
`supabase/migrations/0006_restrict_trigger_function_execute.sql` removes direct EXECUTE grants from the API roles for the custom trigger-only functions `handle_new_user()`, `prevent_role_escalation()`, `set_student_profile_updated_at()`, and the DDL event-trigger function `rls_auto_enable()`, when present. It intentionally leaves `is_admin()` unchanged because RLS policies call it directly, and it restricts direct API invocation of the project's custom DDL event-trigger function `rls_auto_enable()` while leaving PostgreSQL's registered event-trigger execution intact. PostgreSQL fires registered triggers as part of the table operation; the API caller does not need direct EXECUTE permission on the trigger function.

For an existing Supabase project, first verify the function definitions, registered triggers, backup status, and migration baseline. This migration is a proposed hardening step; do not run it until that review is complete.
