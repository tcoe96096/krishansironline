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


## 2026-11-23 read-only reconciliation and scoped test hardening

- Latest observed main SHA: `9958a2ba52515000ce82bae6cdefbc7a62990067`. This scoped branch is **6 commits ahead / 2 behind** main; rebase/merge is **not authorized**. The branch diff still contains exactly six files: five `docs/results/` files and `tests/resultCardBackendContractReview.test.mjs`. No runtime SQL, Edge Function, shared config or UI files are changed.
- Existing Results PRs #129 (broad draft backend/UI), #122 and #135 (CSV export formula safety) remain separate. The scoped branch does not duplicate their runtime implementation.
- Synthetic model hardening: reject missing/malformed idempotency actor UUID, operation, request UUID and SHA-256 payload digest **before** treating a request as new or replayed; preserve actor/action/key scoping and changed-payload conflict denial. Additional stale-session/version cases added. These are model checks only, **not** executable Production RPC fixes.
- **Newly explicit design gap:** the current comment-only atomic SQL candidate lists `result_release_requests` without a `payload_digest` column, while the contract demands same-key/different-payload rejection. The runnable design must include a canonical payload digest (and stable replay outcome) and define uniqueness/locking before implementation. Never infer that the commented pseudocode enforces this.
- **Authorization design gap:** current pseudocode checks `public.is_super_admin()`; the intended separately delegated publisher role must be defined against server-owned permissions. Super-admin status alone is not proof of every result's private download permission.
- **Recovery gap:** local `--no-privileges` restores do not prove SQL grants; Supabase Free tier must not be treated as providing managed/PITR backups. PDF object bytes require separate private Storage recovery proof.
- CI evidence: GitHub's commit-associated workflow query for the prior scoped branch head returned **no runs**; no green CI can be claimed for this scoped branch. A code-only commit also does not imply a test has executed. Validate with verified free quota and attach exact commit SHA/run IDs.
- Release remains **NO-GO** until fresh Preview/Production source-specific backup, successful isolated compatible restore, real JWT/RLS/concurrency tests, scoped green CI, security review and separate explicit owner authorization. Incremental spending remains **₹0**.


## 2026-11-23 scoped review correction and evidence

- Rechecked current main at `f93f34471b606a96789b633ce74f2aaccbbc9d40`. Before this run's changes, the scoped branch was **9 commits ahead / 3 behind** main and the diff remained exactly six files: five `docs/results/` files and one synthetic Node test. No rebase or merge performed.
- Confirmed existing Results PR #129 is draft/unmerged and includes broader work. PRs #122/#135 remain draft/unmerged CSV-injection work; none were edited.
- **Defect fixed in this scoped package:** `result-card-release-revoke-atomic-SQL-CANDIDATE-REVIEW_ONLY.sql` had a truncated `payload_digest` CHECK fragment and a duplicated partial table/audit/pseudocode block. Replaced it with one coherent **comment-only** logical contract, including canonical payload, attempt/version conflict detection, ledger outcome and audit atomicity. This does **not** create a runnable migration.
- **Synthetic hardening:** added explicit fail-closed tests rejecting changed target or expected version under the same actor/action/key even when the supplied digest is identical. This supplements the older digest-only model and does not prove actual DB transaction concurrency.
- **CI boundary:** No verified GitHub Actions workflow is attached to this scoped branch, and available free GitHub Actions quota was not independently confirmed. No paid workflow or unverified runner activation was initiated. These commits are source-level changes, **not** evidence that Node tests ran or passed.
- **Outstanding gates:** actual Preview/Production schema/grants diff; fresh independently recoverable backup and full compatible restore with Storage object bytes; real authenticated JWT/RLS and release/revoke race tests; free-quota-confirmed exact-SHA CI; independent code/security review; separate owner approval. Production remains **NO-GO**.


## 2026-11-23 02:26 IST — incremental scoped review

- Read-only GitHub comparison: current `main=f93f34471b606a96789b633ce74f2aaccbbc9d40`; scoped branch was 12 commits ahead / 3 behind before this increment. No merge/rebase attempted. Exactly six changed paths remain inside `docs/results/` and `tests/resultCardBackendContractReview.test.mjs`.
- Rechecked draft Results PR #129 (broad), and separate #122/#135 (CSV injection). No duplicate implementation or modifications to those PRs.
- Fixed a **pure synthetic contract inconsistency**: the existing replay validator accepted uppercase/mixed-case SHA-256 while the SQL proposal requires exact lowercase hexadecimal. The model and negative test now reject noncanonical digest strings. This is not a live security patch.
- Clarified the role matrix: super-admin is not implicitly Result Publisher, private PDF reader, or audit reader. Each is a separately server-owned, scope-checked permission.
- New commits this increment: `daf4747040a72434130133e85ead8d922ac60723` (synthetic digest model/test) and `b7f761c27d344c91b0aab56f391d09383e3218c6` (role matrix).
- GitHub commit-associated workflow query returned no runs for this scoped head. **No exact-SHA CI pass is claimed**; tests were authored, not executed by this run. Existing broad PR CI cannot substitute.
- Unchanged NO-GO gates: source-specific current backup and independently successful compatible restore (including private PDF bytes); verified Preview-vs-Production catalog/grants/roles diff; real JWT/RLS/concurrent release/revoke and revocation tests; exact-SHA free-quota-confirmed CI; security review; explicit owner approval.
- ₹0 incremental spend. No paid resources, SQL execution, DB writes, migrations, merge, Preview/Production deployment, publishing, delivery, DNS or other modules touched.


## 2026-11-23 04:21 IST — exact-head verification (read-only)

- Compared `main` against this scoped branch via GitHub: main `f93f34471b606a96789b633ce74f2aaccbbc9d40`, branch head `73419c8c7f3b5b31ba83fb38a050db60aabbc2e8`, **16 ahead / 3 behind**, six changed paths only (five review docs/SQL comments and one pure Node synthetic test). No merge/rebase.
- Inspected latest head commit: `73419c8c` changes only the synthetic access predicate to require exact Boolean flags, and adds negative truthiness cases. It is **not** a Production RLS policy change.
- GitHub's commit-associated PR workflow-run lookup returned **zero runs**, and combined commit status returned **zero statuses** for `73419c8c`. Neither means a test passed; exact-head CI evidence is still absent. Do not pay for or start runners without confirmed free quota.
- Read the entire scoped synthetic test source and confirmed it uses `node:test` without database connections. No test execution or live JWT/RLS/Storage/concurrency verification is claimed by this review.
- Remaining gates: reconcile Preview/Production read-only catalogs and migration dependencies; verify real JWT role/RLS, atomic concurrency and audit with independent approval; fresh source-specific backup plus successful isolated compatible restore including private PDF bytes; exact-head green CI with verified free quota; independent security review and separate owner approval. **NO-GO**, ₹0 incremental budget, no SQL execution/database writes/deployments.


## 2026-11-23 05:20 IST — cross-proposal identity and transaction review

- Read-only compare: main `f93f34471b606a96789b633ce74f2aaccbbc9d40`; scoped branch 17 commits ahead / 3 behind; six paths only, all review docs or pure synthetic test. No merge/rebase.
- Inspected both comment-only SQL proposals and the entire synthetic test. **Unresolved identity-contract mismatch:** generic RPC/RLS proposal models `result_record(id)` / `result_version(result_id, version)`, while atomic proposal keys transitions to `private.result_release_state(attempt_id)` referencing `public.test_attempts(id)`. Neither proves a verified one-to-one mapping from test attempt to result record, recipient, immutable version and PDF object. **Fail closed** until catalog inspection establishes canonical primary key, FK cardinality, ownership and object binding. Never infer a result ID is an attempt ID.
- **Transaction/Storage boundary:** PostgreSQL commit cannot atomically commit private Storage bytes. Require immutable pre-staged object manifest with verified SHA-256, recoverable bytes and binding; release must refuse missing/mismatched object. Revoke must prevent new authorization but cannot retract bytes already delivered. This is a documented architecture gate, not a solved race.
- **Test coverage limitation:** synthetic `node:test` models do not validate SQL RLS policy evaluation, real JWT claims, locking/unique constraint races, storage ACLs or audit append-only enforcement. No exact-head green CI or successful current isolated restore evidence supplied in this run.
- Proposed review sequence: (1) source-specific read-only schema/ACL/FK inventory; (2) canonical result-vs-attempt identity map; (3) publisher/audit/storage least-privilege review; (4) migration and lock ordering; (5) synthetic + exact-SHA CI with verified free quota; (6) independent backup/restore and authorized real-JWT tests. Production NO-GO and ₹0 incremental budget unchanged.


## 2026-11-23 06:24 IST — canonical identity decision gate (read-only review)

- Re-read current main (GitHub latest main commit `f93f34471b606a96789b633ce74f2aaccbbc9d40`), the isolated branch diff, the Preview-derived FK dependency note, and both comment-only SQL proposals. The scoped branch was **18 ahead / 3 behind**, with exactly six added paths (five review documents/comment-only SQL files, one pure synthetic test). No merge or rebase.
- **Do not combine the two candidate models as though they were the same schema.** Proposal A uses `result_record.id` + `result_version(result_id,version)`; proposal B uses `private.result_release_state.attempt_id` referencing `public.test_attempts(id)`. Preview FK evidence verifies `result_delivery_notices.attempt_id -> test_attempts.id`, NOT a one-to-one result-record identity or release/version/PDF binding. The canonical key is **UNDECIDED** pending actual source catalogs.
- **Required read-only identity proof before executable design:** for each Preview and Production environment, inventory PK/FK/UNIQUE constraints and nullability on attempt, result, release, recipient and version tables; verify whether one attempt can have multiple result records/versions; map `auth.users.id` to active student identity; verify private object manifest references the exact immutable version. Capture catalog query, environment, timestamp and sanitized hash, without credentials or student data.
- **Fail-closed decision table:** absent/ambiguous attempt-to-result mapping -> deny release and read; mismatched recipient -> deny; absent immutable version or private object digest -> deny; attempt submitted but release not independently verified -> deny; cascade-deleted delivery notice must never erase immutable audit. No delivery notice is evidence of release authorization.
- **Migration gate:** choose exactly one canonical identity contract only after catalog proof and reviewer approval; then derive additive FK/unique constraints and lock order. Do not invent or execute SQL from these commented models. Storage bytes remain outside the DB transaction; independently prove object integrity and restore.
- **CI evidence:** no exact-SHA green workflow evidence supplied by this inspection. Do not infer pass from source or unrelated PR workflows; run only on independently confirmed free quota. **Recovery:** no successful fresh isolated restore proof; live JWT/RLS and concurrency remain untested. Separate explicit owner approval is required for any execution or deployment. **NO-GO**, incremental budget ₹0.
