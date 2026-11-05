# Student Login & Online Test System — Implementation Plan

## Approved product settings

- Authentication: **both mobile OTP and password**.
- Session persistence: **remember this device** using Supabase Auth's persisted, refreshable session. Logout must revoke the session; never store passwords or OTPs locally.
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
   - **Mobile OTP**: verify the phone number with an SMS OTP.
   - **Password**: sign in with the registered phone number and password.
   - First-time registration verifies the phone by OTP, then collects name, class, roll number, school and a password.
5. On successful login, return to the pending test and show its eligibility/attempt count before starting.
6. Supabase Auth persists a refreshable session on that device. The UI restores the session on reload; explicit logout clears it. Students can still sign in on another device.
7. Student dashboard: profile, available tests, attempts remaining, in-progress attempt (if any), and personal result history.
8. Submit test: server grades answers, enforces time and attempt limit, stores result centrally, and returns the student's result.
9. Admin dashboard: manage test publication, per-test attempt limit, question bank and answer key, view/search/export submissions, and publish/unpublish tests. Admin access is based on a database role, never a client-side PIN.

## Recommended architecture

- Frontend: existing React/Vite application.
- Identity + database: Supabase Auth + PostgreSQL.
- OTP: Supabase Phone Auth with an SMS provider configured in the Supabase project.
- Password login: Supabase Phone + Password sign-in. Registration verifies phone OTP before setting password.
- Session: Supabase JS client with `persistSession: true`, `autoRefreshToken: true`, and local device persistence. Do not use an indefinite custom auth flag.
- Data security: Row Level Security (RLS) on every student-facing table; student rows are scoped to `auth.uid()`; admin role is checked server-side.
- Scoring: private answer keys and a database RPC; never send correct answers to the browser.
- Google Sheets: optional export/backup only after central database write succeeds. Do not treat no-cors POST as proof of success.

## Planned repository changes

### Frontend files to add
- `src/lib/supabase.ts`: create the Supabase client from public Vite environment variables.
- `src/context/AuthContext.tsx`: auth session, profile, OTP/password actions, logout and auth state listener.
- `src/components/StudentAuthModal.tsx`: OTP/password tabs, registration profile form, validation and accessible errors.
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

Configure Phone Auth + an SMS provider in Supabase. Use a verified sender/template and test OTP delivery. The anon key is intended for browser use only with RLS correctly enabled. **Never put the Supabase service-role key, database password, SMS provider secret, or admin credentials in Vite environment variables or Git.**

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

- OTP signup, OTP login, password login, invalid OTP, wrong password, resend cooldown and logout.
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

This branch prepares the backend schema and implementation contract. The live authentication UI and data migration must be wired only after a Supabase project URL/key and SMS provider are configured. This prevents a half-working login screen or a misleading “result saved” message. No existing production test/question data is changed by this preparation.
