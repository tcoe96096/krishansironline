# Student Website — Live Release Readiness

Audit date: 11 November 2026

This checklist records the current Student Website release candidate review. It is not authorization to merge, apply Production migrations, or deploy.

## Changes prepared

- Student learning progress is implemented in the Student Dashboard and uses the signed-in student's own Supabase records.
- Reader progress restoration now waits for the saved record before enabling autosave; a chapter that fits in the viewport is not falsely marked 100% complete.
- The Dashboard uses the newest attempt status per test.
- The login screen explains that SMS/email self-service password recovery is not available and that school-verified assistance is required.
- Migration `0008_student_learning_progress_and_profile_location.sql` is already present in the repository but is not applied to Production.
- Migration `0009_expire_stale_test_attempts.sql` has been added to the Student release candidate. It marks timed-out in-progress attempts as expired when the student next starts that test. Expired attempts continue to count toward the configured attempt limit.

## Build status

- Student release candidate PR #44: Website Build and Preview Build both passed for the latest code commit reviewed on 11 November 2026.
- The isolated Preview deployment is a separate site and does not deploy to Production.
- Production branch `main` has not been changed by this release candidate. No PR was merged.

## Production database checks

Read-only audit of the existing Production project found:

- 4 student profiles.
- 4 published tests.
- 2 test attempts, including one timed-out attempt still stored as `in_progress`.
- 0 administrator role rows.
- `student_learning_progress` does not yet exist.
- The Production migration history records migration 0007. The earlier student-system schema exists, but the history is not a complete numeric record.

**Do not replay migrations 0001–0007.** Before applying 0008/0009, take/verify a backup and reconcile the existing Production schema and migration history. Apply only the reviewed pending migrations after explicit release approval. The timed-out attempt was not modified during this audit.

## Test security and scoring

- Production test questions contain no `correctAnswer`, `answer_key`, or explanation fields.
- Correct answers are stored separately in `test_answer_keys`; that table has RLS enabled and no browser-facing policies by design.
- The Production start/submit RPCs enforce authenticated ownership, class eligibility, attempt limits, deadlines, and server-side grading.
- Production scoring currently distributes each test's `total_marks` equally across its questions, matching the current test UI. Do not copy the Preview-only weighted-scoring function into Production until question marks, total marks, and UI scoring rules are reconciled. One existing 4-question test has 16 total marks while its question-level `marks` metadata is 1 each; the current equal-weight Production calculation is the behavior the UI currently displays.
- The Preview database currently has no tests, so a real start/submit/result round trip cannot be completed there until the owner supplies test content. Do not seed invented or placeholder exam content.

## Authentication and identity limitations

- Student login uses mobile number + password without SMS OTP. Mobile numbers are not verified.
- Public self-registration is disabled by default in this Release Candidate. The UI can expose it only when `VITE_STUDENT_REGISTRATION_ENABLED=true` is explicitly set at build time.
- Keep self-registration disabled until there is a real school identity-verification/approval process. The current signup trigger trusts the submitted name, class, roll number, and school name; without verification, a person could register using another student's details.
- Before enabling registration, re-check Supabase Auth settings: Email provider enabled, Confirm email disabled (the generated identifiers are not real mailboxes), and Phone provider disabled for the no-SMS design.
- Generated internal login identifiers are not real mailboxes, so email confirmation and password-reset links cannot reach students.
- Self-service password recovery is not available. School-record verification and an administrator-assisted recovery process must be in place before public student registration is promoted.
- Supabase's leaked-password protection was reported disabled by the Production security advisor. Enable it in Supabase Auth settings before broad public registration.
- Production currently has no administrator role row. Admin Website/OAuth setup remains a separate later phase; do not grant a role or enable Google OAuth as part of the Student release.

## Live-site content cleanup

The current Production homepage still displays an announcement titled **“Dashboard Testing”** with detail **“TESTING”**. The Notice Board reads from a separate Google Apps Script announcements feed, not from the Supabase database. The Student Release Candidate now hides only this exact known placeholder pair from the public Notice Board, without filtering other announcements. Remove or replace the stale row in its source spreadsheet as a permanent data cleanup before public launch. No announcement data was changed during this audit.

## Final manual acceptance tests

Before Live release, complete these with an owner-approved student test account and real supplied test content:

1. Register and sign in on desktop and Android/mobile.
2. Confirm the correct student profile, class, roll number, and school are displayed.
3. Open a chapter, scroll, leave, reopen, and verify the saved position and progress.
4. Open a short chapter that does not scroll and confirm it is not marked complete automatically.
5. Start a published test, answer and submit it, and verify the server result and attempt history. Confirm the scorecard denominator displays the configured total marks, not the question count.
6. Refresh during an active test and confirm the same attempt resumes with the server deadline.
7. Let a test attempt expire and confirm the dashboard shows it as expired, the server marks it expired on the next start request, and the attempt limit remains enforced.
8. Verify a student cannot see another student's profile, progress, or attempts.
9. Verify answer keys and explanations are not present in public test responses.
10. Check mobile layout, navigation, printing, and all required SEO entry pages.

## Release boundary

No Production database migration, role grant, test-data edit, announcement edit, PR merge, DNS change, or Production deployment was performed during this audit. Each remains a separate approval step.
