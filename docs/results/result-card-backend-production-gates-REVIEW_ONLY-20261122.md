# KSOL Result Card Backend — Production readiness review (REVIEW ONLY)

**Status: NOT EXECUTED.** This is a review gate, not a migration or assertion of existing Production schema. Main baseline: a464cd4ae7b0c892220687feba4a49f9a19c6652. Preview-only result-card migrations/RPC must be inspected against the live catalog before any executable SQL is proposed.

## 1. Read-only inventory, no assumptions
Capture separately for Preview and Production: schema-qualified table/view/function names, exact function definitions and SECURITY DEFINER search_path, ownership, RLS enabled/forced flags, permissive/restrictive policies, table and sequence grants, EXECUTE grants to PUBLIC/anon/authenticated/service_role, storage buckets/policies, triggers, indexes, FK relationships, result version/release/audit model and canonical auth.uid() -> student account mapping. Compare as a reviewed diff. Do not infer Production presence from Preview source files.

## 2. Proposed authoritative model (names provisional)
- Result identity, recipient identity, immutable version, lifecycle (draft/approved/released/withdrawn), revocation state, publisher and timestamps are server-owned.
- A result-version row binds exactly one canonical recipient; published/current version is unique per result. Never trust a request-supplied student ID as proof of ownership.
- Teacher author/edit is limited to active server-owned assignments. Separate publisher permission is required for release. Admin role by itself must not imply unrestricted private download or bulk-send.
- Recipient access is authenticated, active, exact-owner, released, current-version, non-revoked, and checked afresh on inbox, view, print and download.
- Audit append is transactionally coupled to release/revoke and is not writable by browser roles; audit reads are independently scoped.
- Private document objects never use public bucket URLs. Prefer authenticated proxy streaming if immediate revocation is required; expiring signed URLs cannot be immediately revoked once issued.

## 3. Transaction and replay contract
Release/revoke requires verified actor, explicit permission, result ID, expected version, opaque idempotency key and payload digest. Within one transaction lock the result, re-evaluate actor scope and recipient binding, reject stale version, commit transition and immutable audit. Unique(actor, action, key) stores digest and outcome; same key/different digest or actor fails, same request replays without new audit or delivery. Race of release/revoke must resolve to a single valid state. Sending/delivery is separate, opt-in, and not triggered by this review.

## 4. Least-privilege review gates
- Deny anonymous access to private results, storage and audit. Revoke unnecessary PUBLIC grants and check role inheritance and SECURITY DEFINER ownership/search_path.
- Use RLS as defense-in-depth, not the sole authorization for SECURITY DEFINER RPC. Revalidate auth.uid(), active identity mapping, exact recipient and current state in the RPC.
- No broad authenticated UPDATE/DELETE on release, audit or document metadata; service-role operations require independently audited trusted server path.
- Verify old versions, withdrawal, revocation, stale sessions, cross-student requests, teacher/admin impersonation, forged assignment and cache behavior all fail closed.

## 5. Mandatory verification sequence
1. Obtain independently verified encrypted backup and disposable restore evidence, including schema/row counts and access-control checks.
2. Produce reviewed Preview-vs-Production schema/RPC/grant/RLS/storage diff; resolve discrepancies and migration ordering.
3. Prepare isolated REVIEW_ONLY SQL candidate with reversible, reviewed rollout/rollback notes; do not execute.
4. Run static SQL parse, synthetic tests, and GitHub CI; capture exact SHA and TAP pass/fail evidence.
5. Only after separate approval, test against disposable restored environment with distinct real authenticated JWT actors: owner, other student, teacher with/without assignment, admin, anonymous; include concurrency, duplicate replay and revocation.
6. Browser QA at 320px and desktop for inbox, PDF print/download, logout, expired session, Hindi/English UI and accessibility.
7. Separate owner sign-off is mandatory for Preview activation, Production migration, release, publishing and any cross-user delivery.

## Blockers at time of writing
No verified recovery/restore evidence, authenticated production-equivalent RLS/RPC test, or validated Production Result Card RPC is established by this document. The Result Inbox mock branch `test/results-inbox-isolation-mock-20261122` is separate; its 480-case synthetic matrix is NOT backend proof. Existing Results PR #122 is separate. Do not touch Teacher v2, PR #109, Student/Exam, ADVANCE Studio, DNS or active Studio data.
