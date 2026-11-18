# Teacher v2 — independent workstream acceptance matrix

Scope: code-only preparation, NOT an assertion that live Preview auth or database acceptance passed. Old Class-10 teacher backfill deferred; never revoke legacy grants implicitly.

| Workstream | Positive test | Negative test | Gate |
| --- | --- | --- | --- |
| Registration | Signed-in new teacher submits valid profile, qualifications and requested scopes | Anonymous call, malformed scopes, duplicate concurrent submission | Reviewed RPC installed, real user session |
| Employee ID | Super Admin approval issues one stable unique KSOL-T ID | Teacher supplies/changes ID; duplicate approval; rejected/pending ID issuance | Server transaction and unique index |
| Multi-scope | One approved teacher has multiple class/subject/work rows | Unassigned class, subject, work type; duplicate active scope | RLS and exact scope server checks |
| Super Admin review | Independent Super Admin approves with audit reason and verification evidence | Teacher self-approval, ordinary admin approval, stale revision | Trusted review evidence and RPC grants |
| Suspension | Revocation denies new private work and material edits | Legacy fallback bypass after v2 suspension | Authenticated denial tests |
| Legacy isolation | Two existing Class-10 teacher grants remain unchanged at initial additive schema | New v2 policy unexpectedly removes/widens old access | Legacy regression test; skip backfill |
| Study materials | Published rows remain public, approved drafts obey exact scope | Anonymous draft read, cross-owner, cross-subject, revoked author | Separate policy migration approval |
| OAuth | Real Google sign-in resolves authenticated identity and appropriate role | Forged client role, stale session, wrong account | Preview URL, real login |
| Recovery | Disposable restore reproduces schema/data and verifies role grants | Missing timestamp, inaccessible backup, failed restore | Managed backup evidence |
| Release | Owner verifies target, hashes, rollback and approves specific action | Implicit deploy on merge, unreviewed SQL, Production fallback | Separate Preview/Production approvals |

## Independent parallel preparation
- **Frontend:** validate draft UI states and browser tests with mocked API; cannot certify server authorization.
- **SQL review:** review additive schema, privilege inventory, RPC SECURITY DEFINER checks; do not execute migrations without recovery proof.
- **QA:** define role/session matrix and exact denied actions; real authenticated testing waits for an isolated recoverable environment.
- **Security:** review effective TRUNCATE grants on user_roles; do not invoke TRUNCATE. Propose least-privilege correction with post-change verification.
- **Release:** keep feature flag OFF and PR #109 Draft. No automatic deployment, database changes or Production promotion.

**STOP** on missing backup/restore evidence, mismatched project identity, policy drift, or any unexpected allow in negative tests.
