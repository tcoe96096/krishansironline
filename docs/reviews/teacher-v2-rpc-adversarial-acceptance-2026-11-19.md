# Teacher v2: authenticated RPC adversarial acceptance — REVIEW ONLY

Status: **NO-GO**. This is a proposed test protocol, not a record of execution. No migrations, RPC calls, grants, flags, or Storage writes are authorized by this document.

## Identity and authorization boundary

Use separately provisioned **synthetic** identities: anonymous, applicant A, applicant B, teacher A (approved), teacher B (approved), unrelated admin, authorized reviewer, and revoked reviewer. Test through the same Supabase HTTP/RPC entry point the browser will use; never use a service-role token to stand in for a teacher. The server must derive actor identity from verified auth claims, not from request-supplied user IDs, employee IDs, roles, or application statuses. Verify effective function EXECUTE grants (including PUBLIC and inherited privileges) and the RLS behavior of underlying tables.

## Candidate cases (record expected AND actual outcome)

| Operation | Positive case | Negative cases |
| --- | --- | --- |
| `teacher_v2_save_application` | Applicant A creates/updates own draft with allowed qualifications and photo metadata reference | Anonymous call; A overwrites B's application; forged employee ID; injected reviewer/status fields; invalid qualification payload; repeated submission |
| `teacher_v2_snapshot` | A reads only A's own profile/application/assignments | A requests B's snapshot; anonymous read; rejected actor attempts unauthorized privileged fields; direct table SELECT bypass |
| `teacher_v2_review` | Authorized reviewer makes one auditable decision on a pending application | Applicant self-approves; unrelated admin approves; revoked reviewer acts; forged reviewer ID; stale version; duplicate decision; B's records altered as side effect |
| Employee ID assignment | Server issues unique immutable ID once at approved lifecycle transition | Caller chooses ID; concurrent approvals allocate same ID; retries allocate a second ID; unauthorized role edits |
| Class/subject/work mapping | Authorized reviewer assigns multiple independently validated classes, subjects and tasks to one teacher | Teacher self-assigns; cross-teacher mutation; nonexistent class/subject; duplicate edges; unauthorized bulk replace |
| Private media metadata | Owner retrieves own bound photo/resume metadata after re-authentication | Cross-owner metadata/path enumeration; caller substitutes object key; unapproved reviewer obtains signed URL |

## Required test discipline

1. Capture exact repository commit, candidate SQL hashes, Preview project ref, migration version and effective grant/RLS catalog snapshots. **Do not run these cases on the existing Preview until recoverability and explicit operation-specific approval are documented.**
2. Use independent Auth JWTs for each role and record endpoint, actor pseudonym, expected/actual HTTP status, sanitized response, database state delta and audit event. A successful HTTP 200 with an error object is not a pass.
3. Verify every denied operation leaves application, assignment, role, employee-ID and private-media state unchanged. Exercise concurrency, retry, stale revision, and rollback behavior using synthetic data.
4. Run direct PostgREST and Storage access checks in addition to UI tests; hidden buttons do not enforce access control. Include a revoked-role token/session case.
5. Require independent sign-off on both positive and negative cases. If any test cannot run, mark **NOT TESTED**, never PASS. Static SQL inspection, CI, or mock responses cannot replace authenticated runtime evidence.

## Non-negotiable release gates

A successful isolated full restore with reconciled data/schema/storage recovery; absence of unintended effective `TRUNCATE` on `public.user_roles`; approved RPC installation and least-privilege grants; authenticated role-isolation tests; and **distinct explicit owner authorization for each high-impact Preview or Production operation**. Until all are met: feature flags OFF, proposals REVIEW ONLY, no merge/deploy/publish, and no Preview/Production mutation. PR #109 remains strictly read-only; Results, Study Materials and Website Studio ownership is unchanged.
