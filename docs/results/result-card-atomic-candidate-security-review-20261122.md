# Atomic transition candidate security review — 2026-11-22 (REVIEW ONLY)

## Read-only Production check
No existing `private.ksol_result_%` relations found in Production. This establishes no name conflict for those table names at inspection time; it does **not** establish migration safety or a valid backup.

## Candidate limitations that must be resolved before deployment
1. **No initialization path.** The transition function requires a pre-existing `approved` row. No automatic initialization is intentionally provided. Approval must bind a verified immutable result version and artifact digest to an attempt; do not insert placeholder approvals.
2. **No student read endpoint.** An atomic state transition alone does not secure existing result views, PDF downloads, signed storage URLs or cached artifacts. Those paths must check released + not revoked for the same version.
3. **Private schema owner and RLS.** The SECURITY DEFINER owner must be reviewed for exact privilege requirements. Schema grants and definer behavior require authenticated integration tests, not just SQL text inspection.
4. **Migration is not reversible without data policy.** Private immutable audit retention and rollback/compensation must be defined.
5. **Repeated delivery RPC gap.** Existing Preview send RPC can reset `read_at` and append audit on resend. It must not be treated as atomic versioned release.
6. **Concurrency.** Test two simultaneous release/revoke operations and duplicate request-key replay against disposable restored Preview, with different authenticated identities.
7. **Permissions.** Check public function EXECUTE grants, table/column grants, and the full set of policies before rollout.

## Decision
**NO-GO for SQL execution, merge or website publish.** The candidate is useful for review, not yet a complete result delivery implementation. Owner's speed request does not substitute for previously required verified recovery and separate explicit production approval.


## 2026-11-22 follow-up: bundle review — non-deployment findings

Inspected `docs/results/ksol-result-backend-atomic-bundle-CANDIDATE-DO-NOT-APPLY.sql` against the existing review-only role matrix and dependency-order notes. This is a **static text review**, not a SQL execution or runtime security test.

1. **Storage metadata is not byte-level proof.** `ksol_result_approve_pdf` tests `storage.objects` MIME/size/name metadata. It does not hash or inspect the actual PDF bytes. Before approval, a trusted private upload handler must bind a server-calculated SHA-256 to the exact immutable object version, reject overwrites, and prove the object can be retrieved; otherwise a claimed digest in the object key may not describe the bytes.
2. **Privileged file access remains a separate boundary.** Private bucket creation with no client policies is good default denial, but a service-role download handler can bypass RLS. Require a fresh user JWT, independently validated actor/recipient and released version, and a last-moment state check. Never expose service-role credentials, public URLs or reusable signed URLs. Revocation cannot retroactively invalidate an already-issued signed URL.
3. **Database-to-Storage transaction is not atomic.** The SQL transaction can atomically update database state, request key and audit, but cannot atomically commit Storage object bytes or external delivery. Implement an explicit orphan/retry/reconciliation strategy before any release.
4. **Audit append-only is not yet independently proved.** RLS and direct client grant revocation are present in the candidate, but audit owner, inherited grants, schema USAGE, `SECURITY DEFINER` effective privileges, trigger paths and retention/backup need real catalog inspection and authenticated negative tests.
5. **Historical notice delivery is not a release contract.** Preview `send_result_to_student` is not equivalent to a version-bound release/revoke, and no migration should silently repoint existing notice readers to private result versions.
6. **Rollback is not simply DROP TABLE.** A deployed version can contain legally/operationally important immutable audit and private PDF pointers. A reviewed compensating rollback plan must preserve the release/revoke history and block stale clients.

**Scope isolation:** The current PR #129 diff includes existing shared UI/config paths as well as Result Card files. Before merge, review each non-`docs/results/`, `scripts/results/`, `tests/resultCard*` and dedicated Result Card workflow path for ownership; do not accidentally overwrite Student/Exam, Teacher v2, PR #109 or Studio changes. No unrelated path was changed by this follow-up.

**Decision:** Continue review-only. Require source-specific fresh backup, Supabase-compatible disposable restore, byte-level private object verification, real-role RLS/RPC tests and owner approval. Static CI cannot satisfy these gates.
