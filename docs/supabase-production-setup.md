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

Do not mark the system production-ready until all migrations execute successfully.

## Student password login (no SMS OTP)
In Authentication → Sign In / Providers → Phone:
- Enable Phone provider.
- Disable phone confirmation if the owner intentionally wants password-only access.
- This means the phone number is not independently verified. Do not use it as identity proof.
- Set appropriate password and rate limits. Never expose account enumeration details.

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
- Google OAuth sign-in and database role lookup are present; actual provider setup and admin bootstrap are manual.
- Database migrations/RPCs define protected attempts and server-side grading, but the existing OnlineTestEngine has not yet been fully switched to those RPCs. Do not use current client-side results as secure/high-stakes results.
- The Apps Script bridge is present but has not been deployed or connected to a trusted Edge Function.
- Do not merge/deploy until migrations, provider configuration, Edge Function, secure test engine, and end-to-end tests are complete.
