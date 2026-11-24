# KSOL Smart Test Import — Preview activation guide

Scope: Draft PR #173 only. **No main merge, live deploy, or production secret changes.**

## Current implementation
1. Admin opens **Online Test Builder → PDF / Word Smart Import** and selects a PDF (text or scanned) or DOCX (max 8 MB; PDF max 100 pages, up to 12 textless/OCR pages).
2. Browser-local text extraction uses PDF.js and Mammoth. Image-only PDF pages are rendered on the browser canvas and OCR'd using Tesseract.js Hindi + English (max 12 OCR pages, 5 million pixels per page). OCR engine and language assets can be fetched from external CDNs on first use; **document page images/text are not uploaded by the OCR reader**. OCR may be slow and inaccurate; verify all results.
3. A deterministic parser finds numbered MCQs, line-wrapped/inline A–D choices and separate numbered Answer Key sections, and flags conflicting or ambiguous answer keys. It also populates labelled Class, Subject, Chapter, Duration, Attempt Limit and Marks per Question fields. Invalid/ambiguous settings are flagged for Admin review.
4. The Admin may press **AI Assist: हिंदी + English + Answer Suggestions**. Batches of up to ten questions are sent to the authenticated, admin-only `admin-test-ai-assist` Supabase Edge Function.
5. The Edge Function calls the configured AI provider to suggest Hindi + English question/option translations, explanations and candidate answer indexes; the browser fills bilingual drafts after **all** batches pass structural validation.
6. **AI-suggested answers are not selected automatically.** Admin must press Accept answer for a candidate or select the correct option manually. An ambiguous answer is returned as null. The existing Save Draft still requires complete bilingual questions and valid answers.
7. Saving calls the existing `admin-test-import` RPC and publishing remains a separate Admin action. This PR does **not** weaken existing test-answer-key security.

## Preview-only server configuration (never commit secrets)
- **Deployed (Preview only, 24 Nov 2026):** `admin-test-ai-assist` Edge Function version 1 to `krishan-sir-lms-preview` (`zgpkmfqioqvincmgyfpi`), JWT verification enabled. Production project `krishan-sir-lms` does **not** have this function. This deployment does not activate AI billing, which remains behind `AI_TEST_ASSIST_ENABLED=true` and provider secret configuration.
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
- [ ] Manually test Tesseract.js OCR on real scanned Hindi and English PDFs, including first-load language-model downloads, browser performance, mixed text/image pages, missing OCR text and 12-page limit.
- [ ] Owner explicitly approves the reviewed PR and production deployment.

CI gates in this branch: `npm install --legacy-peer-deps`, `npm run lint`, parser tests for MCQs and metadata via `npx --no-install tsx`, and `npm run build`. OCR must also pass browser smoke testing.

**Known limits:** Automatic setting detection recognises only labelled Class/Subject/Chapter/Duration/Attempt Limit/Marks per Question/Title fields, rather than every conceivable free-form layout. Title falls back to the uploaded filename; AI can suggest the other language. OCR implementation is browser-only and **not yet manually validated**; scan quality, formatting, resource limits and model download connectivity affect accuracy. Setup is not fully zero-click. Correct-answer suggestions are AI-generated and must be verified by Admin.
