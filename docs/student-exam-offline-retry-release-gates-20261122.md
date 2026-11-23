# Student exam offline retry — implementation gates (22 November 2026)

**Scope:** Student/Exam only. This is a review-only checklist on draft PR #142, not a deployment or authorization to change backend contracts.

## Verified in branch source
- `examSessionGuard.ts` binds v2 drafts to signed-in user, test and server attempt IDs, and rejects expired/submitted attempts.
- `examDeadline.ts` derives remaining seconds from the server attempt expiry.
- Existing tests are **synthetic unit/source assertions**, not authenticated Supabase/RLS or browser network tests.

## Blocking integration decisions
1. **PR #91:** browser `offline` must not silently revoke an otherwise valid session or discard in-progress answers. Explicit logout/account switch/revocation must invalidate pending drafts.
2. **PRs #4, #5, #27:** reconcile auth, published tests, server grading and attempt RPCs before touching shared contracts. Do not duplicate these PRs.
3. **Offline queue:** require a server-supported idempotency key or revision precondition before any automatic replay. Never assume exactly-once writes from client-only retries.
4. **Expiry:** reconnection after the server deadline must not restart, extend or grade the attempt locally. Server result is authoritative.
5. **Privacy:** never persist access tokens, answer keys, student name/roll/school, or another student's results in an offline queue.

## Acceptance matrix (synthetic identities only)
| Test | Required evidence |
| --- | --- |
| Network drops after answer edit | Local pending indicator; deadline continues |
| Same student reconnects | Server rechecks identity/attempt; acknowledged writes reconcile once |
| Different account reconnects | No old answers displayed or transmitted |
| Server attempt submitted/expired | Queue rejected; no resurrection or grade claim |
| Explicit sign-out/revocation | Pending answers cleared/inaccessible |
| Reload/browser close | Reauthentication required; no silent credential reuse |
| 320px/mobile + keyboard | Hindi/English pending/error/retry states usable |

## ₹0 and release controls
Do not enable paid GitHub Actions minutes/storage, paid Supabase resources, paid APIs or new cloud services. Verify remaining **actual** free quotas before starting CI; local focused tests are preferred if limits are unknown. No Preview/Production database changes, migrations, permission activation, deployment or merge without verified recovery, authenticated negative/positive tests and separate owner approval. Teacher, Result Card, StudyMaterialsView and Studios are out of scope.

## Proposed replay contract (NOT implemented; requires backend-owner review)

- **Scope key:** authenticated `auth.uid()` + server-issued `attempt_id` + `test_id`. The server derives ownership from the JWT/RLS, not a client-provided student identifier. A queue entry cannot authorize a different account.
- **Request:** `attempt_id`, monotonic `client_revision`, unique opaque `operation_id`, and bounded answer edits referencing published question IDs/options. Do not include answer keys or PII. This is a proposed interface, **not** an existing RPC signature.
- **Server transaction:** check ownership, enrollment eligibility, active attempt status and server expiry; atomically deduplicate `operation_id` within the attempt and reject stale revisions. Return canonical revision/status without disclosing other users' data. No client clock controls expiry.
- **Response classes:** acknowledged/reconciled; already-applied (same operation, same payload); conflict (refetch authoritative attempt); expired/submitted/revoked (terminal, discard pending replay); unauthenticated (pause and require reauthentication); transient network failure (retain only same-owner pending draft, no repeated submission storm).
- **Replay discipline:** at most one in-flight operation per attempt; bounded exponential backoff while online; revalidate `auth.uid()` and server attempt before replay; clear queue on sign-out, account switch or revocation; never replay a final submission without server-side idempotency evidence.
- **Server-grade acceptance:** duplicate submit, reordered edits, concurrent tabs, lost acknowledgement, expired attempt, changed enrollment, and foreign-user replay must each be exercised with synthetic authenticated accounts in a disposable environment. Verify one authoritative result and immutable prior result history.

**Ownership boundary:** these are proposed cross-module contracts only. Do not change Supabase RPC/RLS or PR #91 from this branch; obtain backend-owner agreement and independently verified recovery before implementation/activation.
