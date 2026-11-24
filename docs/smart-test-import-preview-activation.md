# KSOL Smart Test Import — Preview activation guide

Scope: Draft PR #173 only. **No main merge, live deploy, or production secret changes.**

## Current implementation
1. Admin opens **Online Test Builder → PDF / Word Smart Import** and selects a text-based PDF or DOCX (max 8 MB; PDF max 100 pages).
2. The browser extracts the text locally and parses numbered MCQs with A–D options, including inline options and optional explicit answer keys.
3. The question form is populated for review; metadata with explicit headings (Class, Subject, Chapter, Duration, Title) can be copied from the original document.
4. The Admin may press **AI Assist: हिंदी + English + Answer Suggestions**. Batches of up to ten questions are sent to the authenticated, admin-only `admin-test-ai-assist` Supabase Edge Function.
5. The Edge Function calls the configured AI provider to suggest Hindi + English question/option translations, explanations and candidate answer indexes; the browser fills bilingual drafts after **all** batches pass structural validation.
6. **AI-suggested answers are not selected automatically.** Admin must press Accept answer for a candidate or select the correct option manually. An ambiguous answer is returned as null. The existing Save Draft still requires complete bilingual questions and valid answers.
7. Saving calls the existing `admin-test-import` RPC and publishing remains a separate Admin action. This PR does **not** weaken existing test-answer-key security.

## Preview-only server configuration (never commit secrets)
- Deploy `supabase/functions/admin-test-ai-assist/index.ts` to the **Preview** Supabase project. Maintain JWT verification at the gateway.
- Supply environment variables via the Supabase **Preview** functions secrets interface:
  - `SUPABASE_URL` (Preview project)
  - `SUPABASE_ANON_KEY` (Preview project's publishable/anon credential, backend only)
  - `OPENAI_API_KEY` (server-side secret; **never** set any `VITE_*` key)
  - `OPENAI_MODEL` (an API model supporting chat-completions JSON mode)
  - `AI_TEST_ASSIST_ENABLED=true` **only after** validating Preview auth, costs and feature behavior. Default is disabled.
- The provider endpoint is fixed to `https://api.openai.com/v1/chat/completions`; no arbitrary provider URL can be supplied by a client.
- The function authenticates the bearer session with Supabase Auth, verifies `user_roles.role = admin`, rejects invalid input and duplicates, limits each request to ten questions and 65 kB, uses a 35-second provider timeout, and does not store provider output or log question text.
- **Privacy:** The selected PDF/DOCX bytes remain in the browser, but when AI Assist is pressed the question and option text is transmitted to the Preview Edge Function and then to the configured third-party AI API. Do not send sensitive student records or copyrighted content without authorization.
- If the function, model or key is not configured, AI Assist intentionally fails closed and the manual import path continues to work.

## Required acceptance before any production consideration
- [ ] Preview Admin role can use AI Assist; non-admin, anonymous, disabled and missing-provider-key calls fail closed.
- [ ] Test real PDF and DOCX files in the browser; verify extraction, Hindi/English layout and questions/answers with inline option text.
- [ ] Test wrong options, ambiguous/multiple correct answers, and mistranslations. Correct suggestions in Admin before saving.
- [ ] Test >10 questions (client batching) and entire-run atomicity when a later batch fails.
- [ ] Test malformed/oversized files, missing-answer warnings, edit mode and refreshed draft.
- [ ] Confirm existing answer keys are not exposed to students and no publish occurs on file selection.
- [ ] Configure explicit API usage limits, server-side rate limits, abuse monitoring, and secrets rotation for production.
- [ ] Confirm Preview database schema/RLS and Admin draft RPC are functional.
- [ ] Confirm no backup, teacher, student or unrelated website workflow is modified.
- [ ] Finish OCR design separately for scanned PDFs. This phase does not claim to support scans.
- [ ] Owner explicitly approves the reviewed PR and production deployment.

CI gates in this branch: `npm install --legacy-peer-deps`, `npm run lint`, `npx --no-install tsx tests/parseExtractedMcqs.test.ts`, `npm run build`.

**Known limit:** Automatic setting detection currently recognizes labelled Class/Subject/Chapter/Duration/Title fields. Test-title translation and OCR are not yet automated; setup is not fully zero-click. Correct-answer suggestions are AI-generated and must be verified by the Admin.
