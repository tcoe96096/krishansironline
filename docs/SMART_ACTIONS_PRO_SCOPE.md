# Pro Learning Platform — Smart Actions Scope

This release upgrades the existing portal features in place and adds contextual Smart Actions to each feature. Smart Actions are real, permission-checked actions or grounded recommendations; they must never be decorative buttons or fabricate data.

## Shared Smart Actions rules
- Show actions only when the underlying data supports them.
- Every action must have a clear label, a safe destination or confirmed operation, loading/success/error feedback, and an accessible disabled state.
- Respect the signed-in student's identity and existing Supabase Row Level Security (RLS). Admin actions require the existing admin authorization.
- Never expose another student's personal data to students. Leaderboards must use approved, minimal display fields and only after the ranking data source and policies are verified.
- Do not silently submit tests, change student records, publish content, send notifications, or delete data. Require confirmation for consequential actions.
- Preserve current test attempt resume, timer, answer persistence, grading, and auto-submit behavior.
- Bilingual Hindi/English labels and messages should follow the existing LanguageContext.
- If a data source, schema, permission, or integration is unavailable, explain that the action is unavailable; do not show fake metrics or pretend the action succeeded.
- No new paid AI provider, external service, or production database migration is authorized by this scope.

## Feature-by-feature Smart Actions

1. **Pro Student Dashboard** — Continue an in-progress test; open the next available class test; jump to the weakest chapter; refresh progress; open recent result details.
2. **Smart Mistake Notebook** — Retry incorrect questions; create a focused practice set from mistakes; mark a question reviewed; open its explanation and related chapter. Persist mistake data only through a verified, student-owned data model.
3. **Rank & Leaderboard** — View rank context and score trend; filter by class/test/period where supported; open own result. Do not invent rank or expose student identity without approved policy and RLS.
4. **Bookmarks & Saved Questions** — Save/unsave a question; open saved list; start a practice session from saved questions; filter by subject/chapter. Use a durable student-owned store, not local-only state presented as synced.
5. **Daily Study Streak** — Log a completed study activity; view streak calendar; resume today's suggested task; set a realistic goal. Define what counts as activity and prevent duplicate/day-manipulation.
6. **Advanced Student Analytics (Admin)** — Filter students needing attention; open an authorized student profile; export the current filtered report; inspect score/progress trend. Keep all student data admin-only.
7. **Question Bank Management** — Add/edit/duplicate/archive questions; bulk import/export; validate bilingual text, options, answer key and difficulty; preview before publishing. Publishing requires explicit confirmation and existing admin permission.
8. **Advanced Announcements** — Draft, preview bilingual announcement; schedule/publish/unpublish; target a verified audience; inspect delivery/read status; send test preview. Confirm audience and publish actions.
9. **Automatic PDF/Excel Reports** — Generate report for selected scope/date range; preview; download; regenerate after filters change. Clearly show generation errors and never imply a file exists before it is created.
10. **AI Learning Assistant** — Ask a question about the current chapter; explain a concept in Hindi/English; generate practice prompts from approved visible content; suggest revision. Use only an already-authorized AI integration if one exists; otherwise provide non-AI guided actions and label AI unavailable.
11. **Flashcard Revision** — Start due cards; reveal answer; mark Again/Hard/Good/Easy; review weak cards; filter by subject/chapter. Persist review state safely and avoid claiming spaced repetition until scheduling logic is implemented.
12. **Advanced Mock Test Series** — Start/resume an eligible mock; view instructions; review completed result; retry when attempt policy allows; open a topic-wise improvement plan. Respect server-side attempt limits and timer rules.

## Delivery and verification
- Upgrade existing components rather than creating parallel duplicate dashboards or announcement/question-bank systems.
- Implement shared action presentation/confirmation patterns only where they fit the existing design system.
- Add migrations only after schema and RLS design review; keep them unapplied to production until separately approved.
- Test student/admin permissions, empty/error states, Hindi/English, mobile layout, and core test lifecycle in Preview before any production release.
