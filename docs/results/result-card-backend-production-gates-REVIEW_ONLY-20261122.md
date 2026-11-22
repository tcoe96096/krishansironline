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


## 2026-11-22: independently checked Recovery evidence (NO-GO)

This section records **observed evidence**, not an executed backup/restore test.
No database query, SQL, cloud database write, merge, deployment, or new backup was performed.

- Live project inventory identifies separate Production (`vsqwlkqqsxcehvdsdbna`) and Preview (`zgpkmfqioqvincmgyfpi`) projects; project health alone is not a recovery point.
- The 2026-11-17 Preview dump `ksol-preview-backup.dump` was reported locally as 690,893 bytes; its custom-format TOC was readable (860 entries). This file is historical, not a current Production/Preview backup.
- The uploaded local restore summary reports `Restore exit code: 1` plus localhost password-authentication errors; independent full restore was **not** successful.
- A later 2026-11-18 local `ksol_restore_clean` check showed 33 public functions and 0 RLS policies. A separate isolated schema/RLS test reported `PASS_WITH_SKIPPED` and cannot prove a complete Source → Restore preservation of auth, grants, storage or application flows.
- Latest Result Card contract/workflow CI and website build artifacts are build/static evidence only. No successful independent fresh Result Card database restore artifact was identified in the checked GitHub workflow runs or accessible uploaded recovery records.
- The local recovery verifier under `scripts/results/KSOL-Verify-Fresh-Restore-LOCAL.ps1` now fails closed for remote host targets, unreadable/stale backups, and parses PostgreSQL `-At` boolean values correctly. **The verifier has not been run in this audit.** Its `--no-privileges` restore cannot prove original SQL grants/ACL.
- Supabase migrations and Edge Function inventories alone do not verify a recoverable snapshot or Storage object backup.

**Gate status: RECOVERY NOT VERIFIED.** Do not run SQL, activate the backend, deploy Edge Functions, enable the frontend flag, merge, or deliver results based on this evidence.

### Evidence required to unblock

1. Fresh, source-specific **Production** and **Preview** backup identifiers/artifacts, creation timestamp, integrity SHA-256 and documented private retention location. Do not share secrets or full personal data in PRs.
2. Complete successful restore (`exit code 0`) into a genuinely isolated, Supabase-compatible disposable environment. Capture clean restore logs and reconcile row counts, schemas, FK constraints, triggers, indexes, functions, RLS and effective grants.
3. Verify that `auth` identity mapping and private Storage object inventory/retrieval survive recovery, and show an application-level read-only Result Card flow in the disposable environment. Preserve audit and revocation semantics.
4. Confirm restore source state against the current source snapshot, record any excluded objects explicitly, and obtain a separate Production-specific recoverability/rollback sign-off before owner activation approval.

A readable archive, schema-only copy, static CI success, or historical backup **must not** be recorded as `RECOVERY VERIFIED`.


### Supabase subscription and Storage recovery caveat (read-only verified)

- Connected Supabase organization `zzvopzivnbufgtdpoaqw` currently reports `plan=free`, `tier=tier_free`. Do **not** assume a managed daily backup or PITR exists.
- Official docs: [Database Backups](https://supabase.com/docs/guides/platform/backups) and [Free-plan backups FAQ](https://supabase.com/kb/faqs/platform/free-plan-backups). Free-tier projects should export their own logical dumps and retain independent offsite copies.
- Supabase Database backups include Storage **metadata**, not the PDF/object bytes themselves. A Result Card recovery test must separately prove the private PDF objects are recoverable and match their immutable SHA-256 manifest.
- Since neither a source-specific fresh dump nor a complete isolated restore with object recovery evidence is available, live SQL and merge gates remain **NO-GO**.


## 2026-11-22 zero-rupee operating budget — mandatory release gate

**Owner-approved additional spend: INR 0.** No plan upgrades, card activation, paid storage, billable Supabase/API resources, paid GitHub services, or paid external services. This is a hard stop, not a request for future spending authority.

### Verified facts and cost-sensitive assumptions

- GitHub repository `tcoe96096/krishansironline` currently reports `visibility=public`. The existing Result Card CI uses standard `ubuntu-latest` GitHub-hosted jobs and a disposable `postgres:17` service; it does not deploy. Public repository visibility alone is **not** an authorization to activate paid runners or exceed any quota.
- Supabase organization `zzvopzivnbufgtdpoaqw` was independently read as `plan=free` and `tier=tier_free`. This does **not** prove the remaining free database, bandwidth, Storage or Edge Function quota. Do not provision resources, upload private PDFs, call billable services, or activate any plan to test this proposal.
- A PostgreSQL service in an existing GitHub workflow is **synthetic CI**, not an independently recovered Supabase Preview or Production database. Do not relabel CI fixture data as live data or recovery evidence.
- Do not run the local restore script against a cloud host; it creates a disposable database. A historical 2026-11-17 dump is not fresh recoverability evidence. Current source-specific backups and private Storage object bytes are not established.
- No CI, SQL execution, database write, Preview/Production deploy, merge, PDF publish, delivery or DNS change may bypass the existing security/recovery/owner gates merely because the code is review-ready.

### Free-only review execution policy

1. Continue source review, static SQL checks, pure Node tests and already-configured standard GitHub-hosted CI **only when verified free eligibility and remaining quota are sufficient**. Do not configure paid larger runners, self-hosted billable machines, marketplace actions with fees, or paid cache/artifact storage.
2. If available free minutes/storage/bandwidth cannot be confirmed, defer optional cloud jobs and perform local read-only/static review; mark CI evidence **NOT VERIFIED FOR THIS HEAD**, not PASS.
3. Treat proposed private PDF Storage bucket, Edge Function and production-equivalent restored database as **NOT PROVISIONED**. Their resource quotas and recovery are independent gates. A free plan is not evidence of sufficient free capacity.
4. Do not send private user records, auth tokens, passwords, Supabase keys, Storage object bytes or production dumps into public GitHub commits, CI logs or artifacts.
5. A future paid requirement is a **blocked scope item**; report the exact missing capability without spending. No alternate billable provider or paid trial is permitted.

### Current PR scope/reuse checkpoint

Existing Draft PR #129 already contains the Result Card SQL atomic bundle, read-only catalog checks, RLS role matrix, PDF upload/download candidates, Node synthetic tests and disposable PostgreSQL contract workflow. Existing Results PR #122 is separate. Do not create another overlapping release implementation.

**Before review-ready sign-off**, reconcile PR #129's changed shared paths (`.env.example`, `.github/workflows/pages.yml`, `src/components/AdminTestResults.tsx`, `src/components/ResultsPortal.tsx`, `src/components/AdminResultCardPanel.tsx`, `src/services/resultCardBackend.ts`, `src/vite-env.d.ts`) against current `main`, PR #122 and owner boundaries. A draft PR containing shared UI/config is not automatically a scoped Production RPC/RLS package; exclude unrelated edits from the eventual release.

**Current decision:** review-only; cost ceiling respected; recovery and live JWT/RLS/storage tests unresolved. No Production claim.
