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
