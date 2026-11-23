# Result Card RPC/RLS — independent review decision record (REVIEW ONLY)

Status: BLOCKED / NO-GO. Documentation only; no executable SQL, runtime changes, DB access or authorization.

## Source reconciliation — 2026-11-23
- GitHub compare main...review/results-backend-scoped-20261122: main `c26f3ce15755617b0cd07b4c05e087cf46a2d1a1`, 24 commits ahead / 21 behind, seven added review/test paths. Merge-base `96738be393000bd80ead046a7dae56d8d14ec173`. Re-evaluate if either head moves.
- Existing draft Results PR #129 owns broad backend/UI candidate; #122 and #135 own CSV formula injection. Do not transplant, overwrite, or duplicate their runtime files.
- Scoped head `67b831a4ba8466e7c9a4e1315c11a3292ab872d2`: PR-triggered workflow lookup returned zero runs; combined status lookup returned zero statuses. This does NOT establish all workflow types absent or any test success.

## Blocking architecture decisions
1. **Identity:** proposal A's `result_record.id` and proposal B's `test_attempts.id` are not proven equivalent. Require read-only source-specific FK/cardinality/recipient/version/manifest evidence. Never join by matching UUID values without a verified FK.
2. **Idempotency and lock ordering:** verify UNIQUE(actor,operation,key), canonical payload digest and full-field replay comparison. Define serialization for same key on different targets, and distinct keys on same target, before choosing a transaction lock order. Unique violation alone is not successful replay.
3. **State and audit:** state transition, request outcome and append-only audit must commit or roll back together; deny direct browser mutations and audit reads. Verify owner/definer, role membership, EXECUTE grants, RLS FORCE behavior and explicit fixed search_path against actual catalogs.
4. **PDF boundary:** DB transaction cannot atomically commit Storage bytes. Require pre-staged immutable private object, manifest and byte SHA-256 validation, isolated recovery of bytes and metadata, revocation-aware short-lived authorization, and a documented unavoidable in-flight delivery race. No public/long-lived URL.
5. **Release gate:** read-only Preview and Production catalog inventories separately, reviewed migration ordering, exact-head local synthetic log and green CI on independently verified free quota, current source-specific DB+private-PDF backup and disposable successful compatible restore, distinct authenticated actor JWT/RLS/concurrency tests only after separate authorization, independent security sign-off and separate explicit owner approval for each mutation/merge/deployment.

## Evidence labels
- **Documented:** comment-only SQL and pure Node authorization model.
- **Not verified:** runnable SQL behavior, PostgreSQL RLS, JWT roles, Storage ACL, real concurrency, CI green, source-specific recovery/restore.
- **Forbidden without gates:** SQL execution, database writes, merge, Preview/Production deployment, publication, result delivery, DNS changes.

Strict incremental spend ₹0. Do not enable paid GitHub runners, Supabase usage, cloud storage or billing. Student/Exam, Teacher v2, PR #109, ADVANCE Studio, credentials and active Studio data remain out of scope.
