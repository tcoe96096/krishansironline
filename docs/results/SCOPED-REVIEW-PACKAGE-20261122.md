# KSOL Result Card Backend — scoped review extraction (2026-11-22)

**Status: DRAFT REVIEW ONLY / NO-GO.** This branch is based on current main `96738be393000bd80ead046a7dae56d8d14ec173`. It extracts, without rewriting, five backend-only proposal/test files from existing draft PR #129 (`docs/result-card-backend-review-20261122`). It is **not** a replacement for PR #129 and is not production code.

## Strict boundaries

No migrations under `supabase/migrations/`, no Edge Functions, no UI/shared configuration, no Student/Exam, Teacher v2, PR #109, ADVANCE Studio, credentials, DNS, Studio content or hosting changes. No SQL execution, database writes, merge, preview/prod deployment, publish or delivery. Incremental budget = ₹0. Never assume unverified free quota or enable paid features.

## Existing results work — avoid duplication

- Draft PR #129 already includes many Result Card candidate SQL, Edge Function and UI files; the scope of this extraction is limited to **comment-only SQL proposals**, verified dependency/role documentation and one **pure synthetic** Node test.
- Results PR #122/#135 cover separate CSV/formula export security; no copy of that work is included here.
- This branch intentionally omits PR #129's shared `.env.example`, `.github/workflows/pages.yml`, UI components, service wiring, Edge Function source and executable SQL candidates.

## Proposed review order

1. Reconcile current main and **read-only** Preview vs Production schema/RPC/ACL/storage inventory; recheck baseline SHA before further changes.
2. Map verified identity/role contracts and RLS: authenticated exact-owner released/current/not-revoked student read; assignment-limited teacher draft; separately approved publisher; deny anon/private audit and deny broad PUBLIC grants.
3. Review additive table/FK migration ordering and `SECURITY DEFINER` function owners, fixed `search_path`, grants, idempotency and concurrent atomic release/revoke + immutable private audit.
4. Review private PDF object manifest, SHA-256 bytes integrity, pre-send reauthorization, revocation race, storage metadata/bytes restore and audit transaction boundary. No object delivery in this package.
5. Run local pure synthetic fail-closed test and review SQL **without applying**. Independently collect green CI on this exact scoped commit when free-runner quota is verified.
6. Require fresh source-specific backups, successful isolated Supabase-compatible restore (including auth, RLS/grants, FK and Storage bytes), distinct JWT actor negative/concurrency tests, security sign-off and **separate explicit owner approval** before any Preview/Production operation.

## Evidence boundaries

- Source SQL in this branch is intentionally **SQL comments only**. It cannot install RPC/RLS.
- The Node test is a synthetic contract model, **not** a live Supabase test.
- Historical local backup dated 2026-11-17 had incomplete restore; no current successful Production/Preview recovery proof has been provided.
- Supabase organization is on Free tier; automatic managed/PITR recovery and paid storage must **not** be assumed.
- Existing PR #129 CI results do **not** automatically transfer to this new branch. A green result must match this branch's SHA.

## Release gate

**NO-GO until** source catalog reconciliation + scoped tests + successful current recovery + real authenticated RLS/RPC/Storage tests + final code review + separate owner approval. Paid/blocked portions remain deferred, not silently bypassed.
