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
