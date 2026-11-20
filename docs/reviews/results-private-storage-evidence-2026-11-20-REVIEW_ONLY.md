# KSOL private result storage: evidence gate (REVIEW ONLY)

Date: 2026-11-20. Scope: Result Inbox PDF/download/print storage contract, **not** deployment or permission change. This document contains no credentials, real records, URLs, database writes, or executed SQL.

## Why this gate matters

RPC/RLS table checks alone cannot prove that result PDFs are private. A student might be correctly denied an inbox record yet still retrieve an object through a public bucket, leaked permanent URL, overly broad storage policy, or a cached signed URL after revocation. The mock designer and mock inbox are UI proposals only; Production result-card delivery is not established.

## Independent environment evidence (Preview and Production)

An authorized reviewer should capture redacted UTC-stamped metadata for each environment, never object names containing student data or actual signed URLs:

| Check | Required evidence | Preview | Production |
| --- | --- | --- | --- |
| Bucket privacy | Result bucket ID alias and `public=false` metadata | UNKNOWN | UNKNOWN |
| Storage access | `storage.objects` policy names, commands, roles, and security-reviewed predicates (review privately, do not paste sensitive expressions) | UNKNOWN | UNKNOWN |
| Object ownership | Server-side result ID -> recipient ID -> storage key binding; no client-selected arbitrary key | UNKNOWN | UNKNOWN |
| Issue and revision | Immutable issued revision; draft assets cannot be downloaded by students | UNKNOWN | UNKNOWN |
| URL issuance | Server validates authenticated recipient and result status before short-lived scoped URL | UNKNOWN | UNKNOWN |
| Revocation | Denies new URL issuance; document residual validity of already-issued URLs and mitigations | UNKNOWN | UNKNOWN |
| Cross-student isolation | Synthetic A cannot obtain B's object, even with guessed ID/key | UNKNOWN | UNKNOWN |
| Audit | Issuance/download/revocation events with least-privilege visibility and no secrets | UNKNOWN | UNKNOWN |

## Denial-first acceptance scenarios (synthetic accounts only)

1. Anonymous access to object and direct public URL: DENY.
2. Student A requests Student B's result by ID, storage path, or modified request: DENY.
3. Student A requests own issued result: ALLOW only after authenticated server ownership check.
4. Draft, revoked, or superseded revision: DENY new download grants.
5. Unassigned teacher requests result file: DENY; assigned teacher still requires explicit scoped privilege.
6. Student with valid Study Materials access requests a Result Inbox object: DENY unless independently entitled to that result.
7. URL expiry: DENY after expiry; document cache behavior and the non-instant revocation limitation of pre-issued signed URLs.
8. Repeat issue/download: idempotent issue handling, audit without duplicate issuance or unintended broad access.

## Evidence and release rules

Record evidence as `VERIFIED`, `MISSING`, `DIFFERENT`, or `UNKNOWN` with timestamp, environment alias, reviewer, and test artifact ID. Keep **UNKNOWN** until actual metadata and isolated negative tests are reviewed. No source-code naming convention, successful CI, mock browser test, or historical Preview migration listing proves Production authorization.

No live object access tests, SQL execution, migration, storage change, release, preview/production deployment, publishing, merge, or cross-user send are authorized here. Recovery must be independently verified and explicit owner approval obtained for the specific target before any activation. Do not modify Teacher v2, PR #109, Student/Exam, active Main Studio data, or ADVANCE Studio.

Next bounded subtask: review the existing RPC inventory against this storage gate and collect redacted environment-specific evidence when separately authorized.
