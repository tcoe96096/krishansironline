> Superseded for launch scope by the [minimal Core Beta approval packet](teacher-management-v2-minimal-beta-launch-approval.md). The broad plan below is historical preparation; it is not an execution instruction.

# KSOL Teacher Management v2 — controlled Production Beta plan

**Status: BLOCKED / PLAN ONLY. Audience: ALL teachers.**

Review source: PR #109, implementation commit `77c6e71`. No Production SQL,
frontend/service deployment, publication, storage activation or merge is authorized.
The PR remains Draft. No date is scheduled and no operational change is queued.

The owner has explicitly held Preview execution pending preflight. See the
[security/recovery report](reviews/teacher-management-v2-preflight-review-2026-11-16.md)
and [verification results](reviews/teacher-v2-material-policy-results-2026-11-16.json).
A previous tool confirmation was cancelled and nothing ran. This plan is not
approval to execute any step.

## Audience and access model

Once all gates pass and the owner approves release, the Teacher entry point is
available to **every teacher**, not just an invite list. Google sign-in identifies
an account; it never proves employment or grants Teacher/Admin access. Any teacher
may submit a profile. Only independently verified Super Admin approval may issue
an Employee ID and explicit work assignments. No bulk approval, inferred role from
email/name, or automatic assignment is allowed.

Existing approved legacy teachers retain their current authorized material scope
while completing a first v2 application. Approval transitions each teacher to
explicit v2 assignments. Inventory all current class/subject/work needs before
approval to avoid unintended loss of access. Employee IDs are not backfilled
silently. Rejection, withdrawal and suspension remain visible with review notes.

Current supported classes are 6–12; subject values are Political Science, History,
Geography, Economics and Other. “ALL teachers” describes eligibility to enroll,
not unlimited curriculum support or unrestricted access. Additional subjects need
reviewed server/UI allowlist changes before they can be represented accurately.

## Required release flags

Only `VITE_TEACHER_RESUME_ENABLED` exists in source `77c6e71`; its default is off.
The remaining controls below are **required additions/design**, not implemented
or active features. Their absence is a Production release blocker. Frontend flags
must never be used as authorization controls.

| Control | Initial Production value | Required behavior |
| --- | --- | --- |
| Teacher v2 entry/UI flag | OFF until release approval, then ON for all teacher accounts | Controls navigation/availability; server permissions remain authoritative. |
| Server v2 enrollment-write gate | OFF until approved migration and verification | Opens registration/save/submit to all authenticated teacher applicants; does not create roles. |
| Server teacher-work kill switch | DENY until verified activation | When closed, denies new v2 material writes/review and result-summary access. It must not route v2-approved users back to broad legacy permissions. Preserve public published materials and student services. |
| Super Admin emergency controls | Verified Super Admin only | Revocation/suspension remains usable when teacher writes are closed; grants/review opening needs explicit release readiness. |
| `VITE_TEACHER_RESUME_ENABLED` | **FALSE throughout this Beta** | No real resume uploads/downloads, bucket activation, scanner or service deployment in this release. |
| Assessment draft authoring | DISABLED | Existing `assessment.draft` selection is a recorded preference only, not executable test-authoring access. Clearly label/hide unsupported controls. |
| Teacher result editing/publication/export | DISABLED | No marks writes, student-result delivery, publication or bulk result exports. |
| Teacher website/material publication | DISABLED | Teachers author drafts and request review only. Existing independently authorized Super Admin publishing remains separate. |
| Result aggregate review | DISABLED until confidentiality acceptance | Exact class/subject `result.review` assignment only; agree and test small-cohort suppression before enabling. |

Flags must be stored and changed through an audited server-controlled mechanism,
with defined owners, access checks, test coverage and a last-known-safe state.
A browser flag flip must never widen database access.

## Enabled/disabled feature list for the proposed Beta

| Feature | Intended Beta state after all approvals |
| --- | --- |
| Google teacher sign-in and existing student sign-in | Enabled; existing student behavior preserved |
| Persistent profile and multiple qualifications | Enabled; owner-bound writes; pending submitted/verified records locked appropriately |
| Save, submit, withdraw and reapply | Enabled with revision checks and server confirmation |
| Unique Employee ID | Enabled only within verified Super Admin approval transaction; stable through suspension/restoration |
| Teacher dashboard and review notes | Enabled for own identity/data only |
| Super Admin directory, review, audit, scoped assignments | Enabled for verified Super Admin only |
| Ordinary Admin teacher approval/grant/restore | Disabled unless the account independently holds Super Admin; Admin status alone is insufficient |
| Multiple material class/subject/work assignments | Enabled after explicit approval; revocation enforced on fresh operations |
| Teacher material draft creation/edit/delete/review request | Enabled only for own drafts and exact assignments |
| Student public material catalogue | Existing published content remains readable |
| Private Student Results/inbox | Existing student isolation retained; no new teacher identities/grade access |
| Teacher result summaries | Held OFF until privacy rule and tests are accepted |
| Resume storage/service and assessment authoring | Disabled in this Beta |
| Automatic legacy backfill or bulk teacher approval | Disabled |
| Production merge/publication/deployment | Disabled until distinct owner approvals |

## Verification evidence and open gates

| Requirement | Evidence available | Still required before Production |
| --- | --- | --- |
| Teacher/Admin/Super Admin isolation | 8,056 real local PostgreSQL material-policy/recovery checks; captured server-backed role helper; earlier mocked browser and contract tests | Isolated Preview directory/review/RPC direct-call denials; real multi-account OAuth UAT; server kill-switch tests |
| Employee ID uniqueness/approval authorization | Unique schema constraint, approval transaction code, static/contract review | Preview approval/identity denial, repeated/concurrent approval, collision handling, no self-approval and immutable audit tests |
| Multiple assignments/revocation | Local class/subject/work matrix, suspended/revoked fixtures, browser grant/revoke/restore flow | Preview concurrent writes vs revoke/suspend; legacy transition/backfill acceptance with actual authorized accounts |
| Student Result confidentiality | No proposed result-table policy widening; private legacy Results tests; summary scope check in source | Two-student cross-account link/inbox/REST tests, ordinary Admin/teacher denials, summary small-cohort rule, real OAuth sessions |
| Material draft/publish restrictions | Actual captured policies/trigger and independent local DML tests | Exact Preview integration, drift check and privileged write audit; real browser acceptance |
| Data integrity/recovery | Local content hashes/counts, atomic failure rollback, policy rollback and synthetic dump restore | Current managed Preview backup/restore evidence, Preview acceptance and fresh snapshots; separate Production backup/restore readiness |

Earlier implementation CI on `77c6e71`: all six workflows passed, with 57
unit/contract/static tests, 14 resume-service mock tests, browser suites,
TypeScript/build and seven SQL parser checks. These are not evidence of an
activated Preview backend or a tested Production restore.

### Specific confidentiality finding

The proposed `teacher_v2_result_summary` returns an average without a minimum
cohort threshold. A local call to the actual function with one synthetic submitted
attempt returned count 1 and average 87, exposing that single result to an
otherwise authorized scoped reviewer. No student identity was returned, but a
small cohort can permit inference. Agree a minimum-cohort/redaction policy and
implement/test it before enabling aggregate review; do not classify the current
summary as fully privacy-accepted.

## Ordered release gates

1. **Close the current preflight block.** Confirm the exact Preview project and a
   recent successful managed backup/restore point, retention/PITR coverage,
   entitlements, destination, expected data loss/downtime and disposable-target
   restore drill. Local synthetic recovery is insufficient. Review all 87 policy
   decision differences and the rollback authorization risk. Obtain fresh,
   explicit Preview approval only after these pass.
2. **Isolated Preview only, after that approval.** Verify project metadata and six
   source hashes; inventory current policies/data and fixture collisions; execute
   a single atomic approved bundle with bounded lock/statement timeouts. Stop on
   any failure. Run rollback-only acceptance, role/ownership/result security,
   employee uniqueness/concurrency, assignment revocation and legacy compatibility
   tests. Confirm fixture cleanup and unchanged unrelated data. Storage stays off.
3. **Prepare a release candidate.** Implement/test required server release gates
   and UI flag, privacy suppression and unsupported-feature labels. Independently
   review security-definer privileges/RLS and advisor findings. Keep PR Draft.
   Pin the exact code/schema/config hashes; all checks must pass on that revision.
4. **Preview frontend/UAT needs separate approval.** Deploy only if explicitly
   authorized; use real new/legacy Teacher, ordinary Admin, Super Admin and two
   Student accounts. Test desktop/mobile, save/reload, multiple qualifications,
   approval/reject/reapply, stable employee identity, scope assignment/revocation,
   suspension/restoration, publication denials and student confidentiality. Resume
   storage remains off. Approval of DB migration does not approve this deployment.
5. **Production readiness review, no changes yet.** Owner confirms the exact
   Production project and hosting target; inspect only with separate authorization.
   Establish independently tested Production backup/restore readiness and data
   integrity inventory. Review release flags, teacher support capacity, runbook,
   monitoring and incident owners. Choose RPO/RTO and stop thresholds; do not invent
   them from the local drill. Obtain separate approval for Production SQL,
   deployment/publication and merge, as applicable.
6. **Controlled all-teacher launch only after the preceding approvals.** First
   apply the approved Production DB bundle with teacher entry/work flags closed;
   verify schema/permissions/data integrity. Deploy the exact approved artifact
   with resume and unsupported features off; verify all role boundaries. Enable
   teacher entry/enrollment for **ALL teachers** together only after owner launch
   authorization. Approval still occurs individually; no teacher gains work merely
   because Beta is open. If a gate fails, stop rather than opening access.
7. **Acceptance and monitoring.** Verify real registration persistence and response
   messages, approval queues and audit counts, ID uniqueness, authorized draft
   writes, denied publication/result edits, student confidentiality and unrelated
   student services. Track permission errors, failed transactions/locks, duplicate
   IDs, unauthorized successes, privacy complaints and audit gaps without logging
   raw resumes, tokens or student marks. Any unauthorized success, lost integrity
   or privacy exposure is an immediate stop. Owner sets other numeric thresholds
   and observation duration before launch.

## Rollback and incident procedures

- **Before migration commit:** the bundle must be one transaction. A failure aborts
  it, followed by policy/data fingerprint verification. Never continue with broad
  grants to bypass an error. This behavior was tested only locally so far.
- **After commit, before any v2 use:** prefer a reviewed forward fix. Policy-only
  recovery can restore captured original authoring policies without deleting
  additive tables/data, but requires separately approved execution and a fresh
  integrity/privilege review. Keep flags closed while deciding.
- **After v2 approvals/revocations or user writes:** close the server teacher-work
  gate, pause risky operations, retain audits/data, and investigate. Restoring old
  policies can revive broad legacy rights previously revoked by v2. Do not execute
  the policy-only script blindly. Reconcile affected identities/grants under an
  independently reviewed incident plan, then validate before re-opening.
- **Frontend rollback:** use the owner-approved prior artifact only with server
  gates held closed and schema/API compatibility verified. Older clients must not
  provide a path around current server permissions. It does not roll back data.
- **Database restore:** a managed restore requires its own explicit approval,
  identified recovery point/destination and accepted downtime/data loss. Validate
  Auth, roles, private/public policies, student data and audit consistency before
  routing traffic. Do not overwrite Production or Preview as a test.
- **Resume service/storage:** stays off throughout; no bucket cleanup, activation
  or deployment is part of this plan.

## Owner approval checklist

- [ ] Preview managed backup/restore readiness evidenced; preflight HOLD cleared.
- [ ] Policy differences and rollback reauthorization risk accepted.
- [ ] Fresh isolated Preview migration/acceptance approval and successful evidence.
- [ ] Privacy suppression, release flags, role isolation and concurrency checks pass.
- [ ] Separately approved Preview frontend UAT completed with real accounts.
- [ ] All teachers' intended scope transition and unsupported features understood.
- [ ] Production target, backup/restore, incident owners and RPO/RTO verified.
- [ ] Separate Production SQL approval.
- [ ] Separate deployment/publication/launch approval for all teachers.
- [ ] Separate PR readiness/merge approval; until then PR #109 remains Draft.

**No approval is assumed from this plan. The current stop is the unverified
managed Preview backup/restore prerequisite.**
