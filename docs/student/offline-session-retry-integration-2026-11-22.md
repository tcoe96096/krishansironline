# Student offline retry × session security — integration review (2026-11-22)

Status: **draft proposal only**. No authentication, database, deployment, permission or production changes are authorized by this document.

## Existing work and collision

- PR #120 (merged) added the student mock-series catalogue UI and static source-contract tests. Its six suites are **not** authenticated browser/RLS acceptance.
- PR #91 (open) proposes a tab-scoped student session marker, and signs students out locally on the browser `offline` event. This may conflict with the Student-owned exam requirement to **retain an in-progress attempt and retry pending answers after temporary disconnection**. Do not merge #91 as an offline-retry solution without resolving that conflict.
- PR #5 (open) changes the published-test catalogue and describes server-side grading. Treat its database/RPC assertions as **unverified until authenticated read-only tests**. PR #4 and #27 also touch student authentication; reconcile them before making overlapping auth edits.
- Other automation ownership: do not edit Teacher, Result Card, StudyMaterialsView, either Studio or PR #109.

## Proposed safe boundary (not implemented)

1. Separate **session authentication** from **temporary network connectivity**. Do not equate an `offline` browser event with revoked credentials; do not claim an offline answer has been graded.
2. The exam may retain **only the minimum pending answer state** for the currently authenticated attempt. Bind it to user ID, attempt ID and test ID, and prevent cross-user restoration. Never cache answer keys, access tokens or other students' results.
3. On reconnect, validate the current authenticated identity and server attempt state **before** replay. Reject mismatched user/attempt, expired or submitted attempts, and any server-side denial; keep server grading, deadline and attempt limits authoritative.
4. Make replay idempotent with deterministic request IDs and server enforcement. Reconcile confirmed responses; do not overwrite a newer server answer or resurrect a submitted attempt.
5. On explicit sign-out, account switch, suspension or session revocation, immediately discard the local pending queue. For browser-close reauthentication, pending state must not bypass login.
6. No service-worker/background replay with credentials until separately reviewed. Avoid storing student identifiers in analytics or logs. All controls and errors should be Hindi/English and keyboard/mobile accessible.

## Required acceptance evidence (synthetic accounts only)

| Scenario | Expected result |
| --- | --- |
| Disconnect during an active timed test | UI shows offline/pending; timer and server deadline are not extended |
| Reconnect as same authorized student | Authenticated server reconciliation; exactly-once effective answer write |
| Reconnect as different student | No previous student's pending answers or attempt data shown or submitted |
| Submit/expiry while offline | No client-side grade or resurrection; server decision wins |
| Sign out, suspend or revoke session | Pending state cleared or inaccessible; authenticated retry denied |
| Browser close/new session | Reauthentication required; no automatic credential/session bypass |
| 320px mobile and keyboard navigation | Bilingual pending/retry/error state readable and operable |

## Release gates

Before any shared auth/DB contract change: coordinate with the owners of PRs #4, #5, #27 and #91. Require reviewed recovery evidence, isolated authenticated RLS/security tests, server grading/expiry tests, browser network-throttle tests and independent owner approval. **No Preview/Production DB mutation, migration, merge, deployment, DNS or permission activation** as part of this proposal.
