# Smart Result System — Automation & Super Admin Governance Blueprint

Status: Stage A interfaces implemented in Draft PR #109; backend enhancements below are **proposals only** and must not be represented as deployed features.

## 1. Non-negotiable workflow

- Preserve existing `test_attempts`, `tests`, identities, historical scores, private answer keys, and production data.
- Server generates the result from answers, securely stored answer keys, immutable assessment snapshot and configured marking scheme. No browser may invent or override scores.
- On valid submission: save answers, score and metrics atomically; register outcome event idempotently; generate/read report from server-backed attempt. Existing `submit_test_attempt` already computes simple equal-weight scores.
- Practice tests: show result automatically after valid submission unless school/exam-specific rules say otherwise.
- Formal exams: compute automatically but hold student visibility until exam-level release condition (admin approval/time, when this backend is approved and implemented).
- Avoid external email/SMS providers without a separate, approved integration.
- All changes to production publishing or database require owner review and explicit authorization.

## 2. Result card generation

Current Stage A:
- One reusable `SmartResultReportCard` for students and admins, with Modern, Classic and Minimal printable layouts.
- Cards automatically derive from each already-submitted server-recorded attempt. No duplicate score entry or new result table.
- Printed/PDF report is an **internal learning-platform assessment**, not an official government/board certificate.
- Data required: student profile, assessment metadata, attempt ID, submitted date, score, total marks, correct, incorrect, attempted.
- No rank/percentile/passing grade unless verified exam policy and cohort scope are available.

Next backend phase:
- Versioned template settings: logo, footer, labels, approved signature graphic (if authorized), color, and show/hide nonessential fields; editor writes controlled *presentation* metadata only.
- Optional verification endpoint with non-enumerable token / signed document reference, subject to privacy review; avoid publicly leaking identities.
- Rate-limited, permission-scoped PDF export. If server PDF is unavailable, current browser print-to-PDF is the truthful fallback.

## 3. Admin roles: target least privilege

Existing production DB currently supports `admin` and `super_admin` in `public.user_roles`. Stage A fixes frontend recognition of both roles and verifies Super Admin in DB. Existing server `is_admin()` permits both.
Additional roles below are **not active** and must never be enabled by frontend-only controls.

| Role | Target rights |
| --- | --- |
| Super Admin | Grant/revoke staff, configure policies, approve exceptional score correction and releases, audit |
| Result Manager | Read assigned exam results, propose corrections, prepare release requests |
| Academic Admin | Assigned tests, question bank and assessment settings |
| Teacher/Evaluator | Review only allocated cohorts/exams, request regrading |
| Viewer | Read-only authorized reports |

Scope grants must be server enforced by exam/class/module, and never inferred from user-editable metadata, UI, local storage or nonauthoritative JWT claims.
Only a verified Super Admin may grant/revoke staff rights, with durable reason, scope, timestamps and audit.
No one may self-promote, revoke the last active Super Admin, or grant rights higher than the grantor.

## 4. Exceptional edits — *never overwrite historical facts silently*

Default: result remains automatic and not editable. "Request Correction" records affected attempt ID, reason and supporting evidence.
Review path: request -> independent assessment -> authorized approval -> atomic versioned correction -> recalculated analytics/report -> notice.
- Keep old and new score, reason, marking-scheme revision, actor, approver and event timestamp in an append-only audit.
- Reject duplicate approvals, invalid scores, cross-class access and unauthorized roles at database level.
- Distinguish correction to a wrong answer key (may require whole-cohort regrade) from a one-student exceptional adjustment.
- Do not alter original submitted answers; keep original plus official corrected result version.
- Regrade and publishing are idempotent, transactional and covered by replay/rollback tests.

## 5. Technical phases

A. **Implemented as code on Draft PR #109**: Student & Admin dashboards, result history, analytics, CSV, report card UI/print themes, read-only staff role board. Existing backend auto-grade remains unchanged.

B. **Requires separately approved Preview migration**: new versioned scoring policy, immutable snapshots, release schedule state, role-scoped permissions, audited correction requests, security-invoker views or scoped RPC, idempotent queue.

C. **Requires independent preview security/release gate**: authorized role assignment UI writes, report approval, scheduler, notifications, verified PDF document service where applicable.

## 6. Security review gates

- Preview DB only; no production DDL until explicit signoff.
- Supabase RLS and GRANT/EXECUTE review; `auth.uid()` verified in privileged routines; no service-role key in browser.
- Existing `student_profiles` and `test_attempts` ownership policies retained; test answer key never readable publicly.
- Denial tests: Student A vs Student B, viewer vs administrator, admin vs Super Admin, unauthorized RPC, forged role metadata, stale sessions, withdrawn role.
- Scoring tests: unequal marks, missing/incorrect keys, double-submit, time expiry/offline recovery, 0 total marks, retries, large cohort.
- Do not leak real student data into public repository, public preview, telemetry or demo mode.
- Review records and retention policy before enabling bulk exports or public verification.
- Revert PR #109 to roll back the Stage A UI with zero database rollback requirement.

## 7. Current known limitations

- Existing `submit_test_attempt` uses equal distribution of total marks by correct count; weighted-per-question grading is not yet guaranteed and needs a separate verified change.
- Admin Results currently load at most 1,000 most recent attempts; summaries refer to that sample, not the entire population.
- Current Role Board shows real read-only roles, not write-enabled delegation.
- Auto report cards are generated *on viewing/printing* submitted records, not a background PDF batch service.
- Scheduled result release and exceptional score edits are **not active** until backend work is approved, verified and deployed.
