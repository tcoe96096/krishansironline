# Result Inbox release and private-delivery contract — REVIEW ONLY (2026-11-22)

**Status:** proposal only; not installed in Preview or Production. The Preview-only Result Card RPC/migrations are not evidence that Production has a result-card backend. No database, storage, deployment, or cross-user send is authorized by this document.

## Authority and ownership

- The server obtains the caller identity from a verified session/JWT, never from a request-provided student ID, email, class, or teacher role.
- A student's inbox is filtered by the server's canonical student-account mapping and an exact result recipient ID. Anonymous, inactive, unmatched, and ambiguous mappings deny access. Client-supplied recipient filters may only narrow the server-authorized set.
- Result visibility requires **released**, non-withdrawn, non-revoked, current version, and a valid recipient binding; draft and merely approved results remain private to authorized editorial workflows.
- Teacher preview/edit and Admin approval are **separate proposed privileges**, scoped by server-owned assignments and role checks. Neither role inherits student download, impersonation, or unrestricted bulk-send rights.
- Private result documents are not public objects. The server verifies recipient + current version + release state again for each view, download, or print authorization; a successful inbox listing is not an enduring access token.
- Browser printing must not bypass document authorization; printing and download use the same fresh eligibility gate. Never persist private document bytes, signed URLs, or bearer tokens in localStorage or public caches.

## Atomic release/revoke proposal (not executable SQL)

1. An authorized publisher supplies result ID, expected version and an idempotency key; server validates role and explicit release permission.
2. In one database transaction, lock the result/version, revalidate recipient mapping and state, reject stale versions, and record the release or revocation transition together with an immutable private audit event.
3. On duplicate idempotency key, return the prior **same-actor, same-payload** outcome without duplicating an audit/delivery event; mismatched payload must fail.
4. A withdrawal/revocation invalidates future eligibility and any outstanding short-lived access capability. Signed URL expiry alone is insufficient for immediate revocation; use a server-mediated read or a revocation-aware access gateway if immediate withdrawal is required.
5. The audit records actor, action, target result, version, timestamp and decision, excluding full student PII, document bytes and token secrets. Audit read access is independently role-restricted.

## Required negative acceptance evidence

| Case | Expected |
| --- | --- |
| Student A asks for B's inbox, document, print or download | Deny, no metadata/document leak |
| Unauthenticated, inactive or missing canonical account mapping | Deny |
| Draft/approved/withdrawn/revoked result | Deny recipient access |
| Old version after replacement or revocation | Deny |
| Forged teacher/admin/student identity or assignment | Deny |
| Simultaneous release and revoke, or stale expected version | Transactional conflict/consistent final state |
| Duplicate release with same idempotency key | No duplicate audit or delivery |
| Same idempotency key with different payload/actor | Deny |
| Expired token, replayed capability, cross-result reuse | Deny |
| Browser back/cache after logout or withdrawal | No private document disclosure |

## Release gates

- Independently verified backup **and disposable restore** evidence; security review of existing Preview RPC/grants, RLS, storage and role mappings.
- Review-only migration diff with least-privilege grants; no execution until separate owner approval.
- Authenticated positive/negative tests with distinct student, teacher, admin and anonymous JWTs; transactional race/revocation tests; private audit access checks.
- 320px and desktop Chromium checks for inbox, PDF download/print, expired sessions and Hindi/English accessibility.
- Explicit owner approval **separately** for any Preview activation, Production migration, release, publishing or cross-user delivery.

**Boundary:** Synthetic Result Inbox tests are policy-oracle mocks, not evidence of backend authorization. Student/Exam and Teacher v2 source, PR #109, active Main Studio data and standalone ADVANCE Studio are outside this proposal.
