# Student Login & Online Test System — Implementation Plan

## Approved product settings

- Authentication: **mobile number + password only; no SMS OTP**.
- Session persistence: **remember this device** using Supabase Auth's persisted, refreshable session. Logout must revoke the session; never store passwords locally.
- Attempts: **admin-controlled per test**. Each test has an explicit attempt limit configured by an administrator.

## Current repository findings (main branch reviewed 5 Nov 2026)

- The site is a React 19 + Vite static frontend currently deployed as a GitHub Pages-style site.
- `OnlineTestEngine.tsx` collects student details inside the test engine, starts immediately after validating the form, and stores active answers and submissions in browser `localStorage`.
- Test definitions are imported from `src/data/portalData.ts` and `src/data/class9Test60Data.ts`. The frontend currently receives `correctAnswer` values, so a determined student can inspect the answer key.
- The admin PIN `1234` and localStorage admin flag are client-side only and must not be used in production.
- `googleSheetsSync.ts` posts with `mode: 'no-cors'`; the browser cannot verify whether Google accepted a result. This is not a secure central database.
- `ResultsPortal.tsx` correctly withholds results until a verified result source is connected.
- `Header.tsx` currently links to the Apps Script URL as an Admin Dashboard. Replace this with authenticated Student Login / My Dashboard and an authenticated Admin route once backend credentials are configured.

## Target student journey

1. Any visitor can browse the home page, classes, study materials and test catalogue.
2. A floating **Student Login / विद्यार्थी लॉगिन** control is visible in the header on desktop and mobile.
3. Selecting a test while logged out saves the selected test ID as a pending action and opens the login/register dialog.
4. Student can choose:
   - **Password login**: sign in with the registered mobile number and password.
   - First-time registration collects name, class, roll number, school, mobile number and password. Phone confirmation must remain disabled in Supabase Auth so registration does not trigger SMS; explain that the mobile number is not verified at signup.
5. On successful login, return to the pending test and show its eligibility/attempt count before starting.
6. Supabase Auth persists a refreshable session on that device. The UI restores the session on reload; explicit logout clears it. Students can still sign in on another device.
7. Student dashboard: profile, available tests, attempts remaining, in-progress attempt (if any), and personal result history.
8. Submit test: server grades answers, enforces time and attempt limit, stores result centrally, and returns the student's result.
9. Admin dashboard: manage test publication, per-test attempt limit, question bank and answer key, view/search/export submissions, and publish/unpublish tests. Admin access is based on a database role, never a client-side PIN.

## Recommended architecture

- Frontend: existing React/Vite application.
- Identity + database: Supabase Auth + PostgreSQL.
- Login: Supabase Phone + Password sign-in only. Phone confirmation is disabled so the selected flow does not send OTP SMS; signup numbers are therefore unverified.
- Session: Supabase JS client with `persistSession: true`, `autoRefreshToken: true`, and local device persistence. Do not use an indefinite custom auth flag.
- Data security: Row Level Security (RLS) on every student-facing table; student rows are scoped to `auth.uid()`; admin role is checked server-side.
- Scoring: private answer keys and a database RPC; never send correct answers to the browser.
- Google Sheets: optional export/backup only after central database write succeeds. Do not treat no-cors POST as proof of success.

## Planned repository changes

### Frontend files to add
- `src/lib/supabase.ts`: create the Supabase client from public Vite environment variables.
- `src/context/AuthContext.tsx`: auth session, profile, password sign-in/sign-up actions, logout and auth state listener.
- `src/components/StudentAuthModal.tsx`: password login / registration form with student profile fields, validation and accessible errors.
- `src/components/StudentDashboard.tsx`: profile, test history, results and attempts remaining.
- `src/components/AdminDashboard.tsx`: protected test/attempt administration and result management.
- `src/services/testService.ts`: fetch published tests, start attempts and submit answers through secure RPCs.

### Frontend files to modify
- `src/App.tsx`: wrap app in AuthProvider, show auth modal globally, protect dashboard/admin routes.
- `src/components/Header.tsx`: floating/sticky Student Login or My Dashboard control; replace the public Apps Script Admin link.
- `src/components/OnlineTestEngine.tsx`: remove the inline student-details-as-auth flow; require authenticated profile before start; preserve pending test; fetch public questions from backend; submit answers to server RPC; show server-calculated result. Keep localStorage only for non-sensitive draft recovery, never as the source of truth.
- `src/components/ResultsPortal.tsx`: show the signed-in student's own results; do not publish all students' results publicly.
- `src/types.ts`: add auth profile, test policy, attempt and result types.
- `src/config.ts`: remove hard-coded Apps Script endpoint as the primary results backend.

### Backend files added in this preparation
- `supabase/migrations/0001_student_test_system.sql`: core schema, RLS, attempt-start and server-side grading RPCs.
- `.env.example`: frontend public Supabase URL and anon key placeholders only.

## Environment setup required before frontend wiring

Create a Supabase project and configure:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

Configure Supabase Phone Auth for password sign-in with phone confirmation disabled. No SMS provider is required for this selected login method. Enable appropriate password recovery and abuse protections. The anon key is intended for browser use only with RLS correctly enabled. **Never put the Supabase service-role key, database password, SMS provider secret, or admin credentials in Vite environment variables or Git.**

After creating the first admin account, promote its UUID from the Supabase SQL editor:
```sql
insert into public.user_roles (user_id, role)
values ('YOUR_AUTH_USER_UUID', 'admin')
on conflict (user_id, role) do nothing;
```

## Migration and test data migration

- Existing `ONLINE_TESTS` and `CLASS9_60_QUESTIONS` must be migrated to the database.
- Public question JSON must omit `correctAnswer`, model answers that reveal the key, and any scoring hints.
- Store answer indices in `test_answer_keys` only.
- Preserve existing test IDs where possible so existing links and references remain stable.
- For each test, set `attempt_limit` explicitly in Admin. Until set, a test should remain unpublished.
- Existing localStorage submissions are device-local and cannot be centrally imported automatically. Offer an admin-only CSV import after reviewing and deduplicating records; do not silently merge unverified records.

## Acceptance / QA checklist

- Password registration, password login, duplicate mobile number, wrong password, logout and password recovery. Verify no SMS is sent during signup or login.
- Same-device refresh restores the session; private/incognito/another device requires a new login.
- Logged-out student clicking a test is returned to that exact test after authentication.
- Student cannot access another student's profile, attempts or results by changing IDs.
- Student cannot read answer keys from network responses, JavaScript bundles or public tables.
- Two simultaneous start requests cannot exceed the configured attempt limit.
- Attempt expiry and duplicate submissions are rejected server-side.
- Admin-only test publishing, answer-key management and attempt-limit changes.
- Verify database result persistence before displaying “saved successfully”.
- Mobile layout and accessible keyboard/screen-reader behavior.
- Run `npm run lint` and `npm run build`; test production deployment on the real domain.

## Implementation boundary

This branch prepares the backend schema and implementation contract. The live authentication UI and data migration must be wired only after a Supabase project URL/key are configured. This prevents a half-working login screen or a misleading “result saved” message. No existing production test/question data is changed by this preparation.


## Updated integration decisions (user confirmed 5 Nov 2026)

- Google Sheets access: **both read and write**.
- Admin sign-in: **Google Account OAuth**.
- Student sign-in is mobile number + password only; SMS OTP is not used.
- Device persistence remains Supabase Auth refreshable session.
- Attempt limits remain admin-configured per test.

## Google Account Admin authentication

Use Supabase Auth Google OAuth as the admin identity provider:
1. Enable Google provider in Supabase Auth and configure Google Cloud OAuth client ID/secret in Supabase dashboard (never in the Vite frontend).
2. Admin signs in with Google from the site.
3. Backend checks the authenticated user's UUID against `public.user_roles`; only a pre-approved Google identity is granted the `admin` role.
4. Initial admin bootstrap must be performed out-of-band by the project owner in Supabase SQL Editor. Store the exact Google account email in the controlled deployment record, resolve its Supabase Auth UUID after first OAuth sign-in, and insert that UUID into `user_roles`. Never auto-promote users based only on a client-supplied email or email domain.
5. Admin dashboard and every admin operation must verify role on the server / through RLS. Hiding a button is not authorization.
6. Admin logout calls Supabase signOut and clears the local persisted session.

## Google Sheets + Apps Script — bidirectional integration

The user has selected both read and write. Google Sheets is an authorized reporting / administration integration, while PostgreSQL remains the canonical secure database.

### Write path (student submissions)
Browser -> Supabase Auth -> server-side submit RPC -> PostgreSQL result -> trusted server integration -> Apps Script Web App -> private Google Sheet.

- Never call the Apps Script endpoint directly from student browser code.
- Never expose an Apps Script shared secret, service-role key, Google OAuth client secret, or service-account private key in the frontend or repository.
- Backend sends a shared integration secret to Apps Script; keep it in Supabase Edge Function secrets and Apps Script Script Properties.
- Apps Script validates the secret, validates the action and required fields, deduplicates by submission/attempt ID, then appends or updates the matching row.
- Treat the database commit as authoritative. If Sheets sync fails, mark it pending and retry; do not tell the student the result was lost or unverified.
- Do not send answer keys or unnecessary student personal data to the sheet. Store only fields required for teacher assessment and reporting.

### Read path (admin dashboard)
Admin dashboard -> Supabase Auth session -> server-side admin role check -> trusted backend -> Apps Script -> Google Sheet -> validated response -> Admin UI.

- Admin can view/search/filter records, fetch sheet-backed rows, and initiate authorized updates.
- Only the backend may call the Apps Script endpoint.
- The Apps Script integration endpoint must not be a public unauthenticated read API.
- Admin updates to test configuration / attempt limits should update PostgreSQL first, then sync a sheet audit/report row. Do not make Google Sheets the authority for attempt enforcement.
- Add an audit log for admin actions and sheet sync outcomes.
- Sheet sharing stays restricted to the teacher/admin Google accounts; never publish a sheet containing student mobile numbers.

### Apps Script contract

The repository now includes a starter `google-apps-script/Code.gs` that supports authenticated POST actions:
- `health`
- `listResults` (bounded, paginated read)
- `upsertResult` (deduplicated write)
- `updateResultStatus` (admin-side status / note update)

Deployment must be configured to execute as the script owner. Set `PORTAL_SHARED_SECRET` and `RESULTS_SHEET_ID` in Apps Script Script Properties. The script URL and secret must be configured only in the trusted backend, not in public Vite variables.

## Required external configuration / owner actions

1. Create or select the Supabase project; enable Phone Auth with password sign-in and disable phone confirmation to avoid OTP SMS.
2. Configure Google OAuth consent screen and OAuth client; enable Google provider in Supabase.
3. Set the allowed administrator identity through the out-of-band role bootstrap after first successful Google OAuth sign-in.
4. Create/choose a private Google Sheet; copy its spreadsheet ID into Apps Script Script Properties.
5. Paste `google-apps-script/Code.gs` into the Apps Script project; set Script Properties; deploy as Web App (execute as owner). Copy the /exec URL to backend secret configuration.
6. Configure Supabase Edge Function secrets for Apps Script URL and shared secret.
7. Run read/write integration tests with a non-production sheet before connecting production student data.

## New planned/required implementation files

- `google-apps-script/Code.gs`: trusted bidirectional Sheet adapter.
- `supabase/functions/sheets-bridge/index.ts`: server-side bridge; validates Supabase JWT and admin role for reads/updates, and invokes Apps Script with secret. Student result writes are triggered only after trusted grading.
- `supabase/functions/sheets-sync/index.ts`: retryable outbox worker for committed test results.
- `src/components/AdminGoogleLogin.tsx`: Google OAuth sign-in UI.
- `src/components/AdminDashboard.tsx`: admin-only test settings and Sheet-backed results view.
- `src/services/sheetsService.ts`: browser calls only authenticated backend endpoints; never calls Apps Script directly.

## Important deployment gates

The repository does not contain a verified Sheet ID, Apps Script deployment URL/configuration, Supabase project credentials, Google OAuth client configuration, or an allowlisted admin account UUID. Therefore code preparation can be committed, but a live end-to-end connection cannot be activated or verified until the owner supplies/configures those resources. Do not claim that the live Sheet is connected until a test read and write are verified.


---

## Workstream status — 10 Nov 2026 (test-module-finalization branch)

### Implemented in the isolated branch
- Test UI now reads the configured per-test attempt limit instead of assuming every test allows exactly one attempt.
- In-progress test drafts can be restored on the same browser only when the signed-in user, test ID and server-issued attempt ID all match. The server remains authoritative for attempt ownership, expiry and grading.
- Results Portal now displays only the signed-in student's own attempt history and server-calculated scores. It does not expose a public all-student results list.

### Validation completed
- Preview database RPC validation passed for attempt creation, resuming an existing in-progress attempt, rejecting out-of-range answers, server-side scoring, attempt-limit enforcement and expiry handling.
- Validation records were created inside a transaction and rolled back; no test, answer-key or attempt rows were retained.
- Preview database currently has no published test catalogue rows. This is intentionally left empty until the owner supplies the next approved test dataset.
- Existing main database catalogue was checked: all four existing test records have matching answer-key lengths (4/4), 10/10, 40/40 and 60/60. No test content was changed.

### Still gated before final live acceptance
- Admin test-management panel is now implemented for publication status, per-test attempt limits and recent student attempts. Bulk question-bank/answer-key entry remains pending the approved test dataset.
- Complete the secure Google Sheets bridge and retryable sync path. The current Apps Script code is present, but the preview project has no deployed Edge Functions and the required Sheet ID, Apps Script URL/secret and admin OAuth allowlist are not configured.
- Run the browser-level student journey on the actual preview deployment, including registration/login, start, refresh/resume, submit, result history and logout.
- Run the repository TypeScript/build checks and then review the preview deployment. No live deployment or production database changes were made as part of this branch work.
