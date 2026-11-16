# KSOL Teacher Management v2 — minimal public Beta approval packet

**PLAN ONLY. Preview migration remains ON HOLD. No deployment/Production SQL is authorized. PR #109 stays Draft.**

This supersedes the broad Beta launch scope. The fastest safe release is basic
teacher identity/onboarding only, available to ALL teachers once the owner approves
launch. Resume uploads, result analytics and unfinished advanced tools are NOT
launch dependencies and stay disabled. The owner confirms the test environment
has no important real personal data; this does not waive an essential security or
recovery check, or authorize destructive operations.

## Exact launch scope

Enabled after approved activation: existing Google teacher sign-in, persistent
registration/profile, multiple qualifications, independently verified Super Admin
approval, unique Employee ID, multiple class/subject assignment records and a basic
Teacher Dashboard. Google sign-in alone never grants authority. Ordinary Admin
cannot approve or assign teachers. Assignments are explicit server records, not
self-selected privileges. No automatic teacher backfill or bulk approval.

Disabled: resume upload/download service and storage; result-summary analytics;
assessment authoring; advanced material authoring/review from v2; arbitrary marks
editing, publication, exports and website editing. Existing authorized legacy
features outside the v2 Beta are not widened. After v2 approval, assignment records
never fall back to broad legacy grants, even when advanced tools are disabled.
Existing legacy authors must have Super Admin close their active legacy grant before creating a v2 profile. Applicants cannot close it themselves. They therefore need to understand the reduced basic-Beta
workspace before transitioning; approval does not preserve their old authoring UI.

## Flags — implemented in this draft, not active

| Layer | Minimal launch configuration |
| --- | --- |
| Frontend | `VITE_TEACHER_BETA_ENABLED=true` only on the owner-approved release artifact |
| Frontend | `VITE_TEACHER_ADVANCED_ENABLED=false` |
| Frontend | `VITE_TEACHER_RESULT_ANALYTICS_ENABLED=false` |
| Frontend | `VITE_TEACHER_RESUME_ENABLED=false` |
| Server-owned private feature table | `registration=true` only after approved schema and acceptance |
| Server-owned private feature table | `material_authoring=false`, `result_analytics=false`, `resume_uploads=false`, `advanced_assignments=false` |
| Resume service | Not deployed; `TEACHER_RESUME_ENABLED` absent/false; no bucket activation |

Every flag defaults off. Frontend flags control availability, not authorization.
Clients cannot mutate server flags. Server gates enforce profile submissions,
approval/grants and advanced resource access in the optional integration. Core enrollment never changes a Super Admin-owned grant on behalf of an applicant. Existing legacy staff must have Super Admin close that grant before entering v2; a conditional legacy trigger blocks reactivation for every v2 profile state. No legacy table is required for new installations. Revocation, suspension and own-profile
reads remain available for incident handling when registration is closed.
Basic class/subject records use the existing `materials.draft` assignment value
internally; they confer no v2 material-write access while its server feature is off.

## Essential checks only — current evidence and stop gates

| Essential check | Available evidence | Required before launch |
| --- | --- | --- |
| Authentication | Existing Google flow retained; logged-out workspace browser boundary | Real Google OAuth round-trip and authenticated persistence on the release candidate |
| Role isolation | Prior contract/browser checks; local real PostgreSQL material-role tests | Preview direct RPC denial for Student/Teacher/ordinary Admin, Super Admin-only approval; no self-grant |
| Employee ID/assignment permissions | Unique constraint, transaction/row locks, explicit scope validation; browser workflow | Preview approve/reject/repeat-approve, uniqueness, multiple class/subject, revoke/suspend and disabled advanced API checks |
| Migration integrity | SQL syntax parsing; historical local atomic-abort and data-hash checks | New five-file core bundle applied ONLY after Preview hold is cleared; rollback-only minimal acceptance and fixture cleanup |
| Recovery | Historical local policy rollback + synthetic dump restore passed | Confirm usable managed Preview recovery OR separately approve/test a disposable-environment rebuild recovery path; current hold is NOT lifted automatically |

The six previously green CI checks were for `77c6e71`. The current candidate has 83 non-SQL unit/contract tests, 15 mocked resume-service tests and 5 target/artifact guard tests; exact-head CI evidence is tracked in PR #109. New flags/privacy SQL and
this launch candidate require green checks on their exact new head. No runtime DB test is claimed for the revised SQL: recovery-gated Preview execution is conditionally authorized, but the missing recovery evidence/access currently prevents it. Analytics privacy runtime acceptance is not required to launch because
its module is excluded and its feature is denied.

## Exact actions, in order — NOT executed

1. **Review and pin this new candidate**, not the old `77c6e71` bundle. Resolve the
   essential checks above; accept the reduced scope and legacy transition. Keep
   all flags closed. Do not treat “six green checks” on an older head as approval.
2. **Prepare the Preview request without execution:**
   `python3 scripts/prepare-teacher-basic-beta.py`.
   It emits `work/basic-beta-approval/manifest.json` and a review-only request.
   The only target is `zgpkmfqioqvincmgyfpi`; no Production target is accepted.
   Compare source hashes. Confirm project name `krishan-sir-lms-preview`, current
   policies/data and fixture IDs. This command cannot call Supabase or execute SQL.
3. **Clear the Preview recovery hold.** Fastest option is owner/operator evidence
   of a recent usable backup and restore access. If the environment is disposable,
   a documented, tested full rebuild/recovery option may replace managed PITR only
   with separate explicit owner agreement. Current local material-only restore is
   not a full-environment rebuild test. Stop if recovery cannot be demonstrated.
4. **After recovery is verified, perform the approved isolated Preview action.** Apply the
   prepared five-file core bundle as one atomic migration, with bounded lock/statement
   timeouts. Order: schema → beta_flags → profile_rpc → functions → lifecycle. Exclude Study Material integration, resume and result-privacy modules. All server flags start
   false. Never run the files' separate BEGIN/COMMIT sections as partial migrations.
5. **Run the prepared minimal acceptance** within the approved Preview test scope:
   `docs/proposed-migrations/teacher_management_v2_basic_beta_acceptance_REVIEW_ONLY.sql`.
   Its fixtures and registration-only test flag roll back. Check identity/role
   isolation, qualifications, multiple scopes, unique Employee ID, disabled advanced
   writes, revocation and no fixture residue/unrelated-data changes. Stop and report
   any failure; never grant broad access to get a test to pass.
6. **Approve a Preview frontend check separately.** Build the exact candidate with
   the flags above, but do not open registration until approved. Verify actual OAuth
   with new Teacher, existing Teacher, ordinary Admin and Super Admin; save/reload,
   approval and class/subject assignment; ensure no upload/analytics/advanced UI or
   executable advanced endpoint is exposed. No resume service/storage is needed.
7. **Present final Production approval request** with exact commit, build artifact,
   five core SQL hashes, owner-confirmed Production project/hosting target, successful
   essential Preview evidence and recovery route. No Production project is selected
   or inspected by this preparation. Request distinct SQL and deployment/publication
   permissions; merge remains separately controlled. No Production steps run now.
8. **Only after those approvals:** apply the approved Production schema with flags
   closed; verify integrity/permissions; deploy the approved artifact with advanced
   flags false; run essential smoke checks. Open only server `registration` and the
   teacher entry for ALL teachers after final owner launch approval. Super Admin
   still approves each account and assignment independently. Observe the first real
   registration/approval/reload and verify other student services remain unchanged.

## Proposed flag opening and rollback actions — review only

After explicit target-specific SQL approval, the opening action is a single
transaction that verifies the five expected private flag rows, sets only
`registration=true`, and leaves all four other flags false. Record the operator,
target, commit and resulting values; do not log personal profile content.

If any essential check fails, do not open registration. If a defect appears after
opening, close server `registration` immediately under the approved incident
procedure and hold all advanced flags false. This blocks new saves/approvals/grants
while retaining profiles/IDs/audits and allowing revocation/suspension. Hide the
Beta entry via a separately approved frontend rollback. Do not drop teacher tables,
delete accounts, reset student results or blindly restore old RLS policies.
Policy rollback can revive legacy rights; prefer the feature-off forward fix.

A full database restore/rebuild needs its own approved target, data-loss/downtime
agreement and integrity verification. The owner's disposable-data statement makes
that option easier to assess; it is not authorization to perform it.

## Final owner decision required

- [ ] Exact new candidate and minimal scope accepted; all essential checks green.
- [ ] Preview hold cleared through accepted recovery evidence.
- [ ] Separate Preview migration/tests and Preview frontend permissions granted.
- [ ] Production project/artifact/SQL hashes and rollback owner identified.
- [ ] Separate Production SQL approval.
- [ ] Separate deployment/publication and all-teacher launch approval.
- [ ] PR #109 remains Draft and unmerged until separately authorized.

## PR-wide release review and isolated artifact

PR #109 also changes ResultsPortal/report cards, student delivery/template proposals,
Study Materials, Staff Permissions, Website Studio and broader Admin navigation.
Those are **not** prerequisites for the core identity release. Deploying its full
site build would mix these changes into the launch; do not use that build for the
minimal Beta without separately accepting them.

A separate entry/build is now prepared:

- `npm run build:teacher-beta` creates `teacher-beta-dist/`, rooted at `/teacher-beta/`.
- It imports only Auth, the basic profile/dashboard and Super Admin directory, not
  ResultsPortal, Website Studio or the advanced material workspace.
- Callback pages `/teacher-beta/staff-workspace/` and `/teacher-beta/admin/` are
  included. Owner must add the exact approved OAuth redirect origin/path before
  real authentication acceptance; no allowlist was changed here.
- Use the approved existing live site's artifact as the baseline. Inspect its hash
  with `python3 scripts/assemble-teacher-beta-release.py --baseline-dir <approved-artifact> --inspect-baseline`.
- Assemble locally with `--baseline-dir <approved-artifact> --beta-dir teacher-beta-dist --expected-baseline-sha256 <approved-hash> --out-dir work/release-candidate`.
- The assembler refuses an unverified baseline, symlinks, an existing output or an
  existing Beta directory and verifies every preexisting file is byte-for-byte
  unchanged. Only `teacher-beta/` is added. It does not deploy or publish.
- Keep `/teacher-beta/` entry closed until server registration and owner launch
  approval. Adding a global website link/announcement is a separate approved
  publication step, not silently bundled into the existing site's navigation.

Immediately reusable without new v2 SQL: existing Google sign-in/authentication
code and the inactive static Beta shell. The six requested functional core features
are implemented in the candidate but **cannot be honestly called live-ready**
until the five-file core schema and essential authorization tests pass. There is
no safe frontend-only shortcut for persistent profiles, Employee IDs or assignments.

## Recovery evidence/access

The connector exposes no managed-backup/PITR listing/export, and no secure Preview
DB credential exists in the workspace. `scripts/verify-preview-logical-recovery.py`
therefore currently returns BLOCKED without contacting a database. It accepts only
an exact Preview `PREVIEW_DB_URL`, makes source connections read-only, exports a
full logical database/role backup to private local files, restores into a separate
local container and compares schema/ACL and table content hashes/counts. A missing
platform extension, export failure or mismatch fails readiness; none is ignored.
The script has **not** performed a real Preview export/restore. Owner can supply
managed backup/restore evidence or configure the connection securely (never in chat).
A successful database-only restore still does not prove OAuth/storage service
recovery. Resumes/storage remain excluded, and actual OAuth remains an essential
launch check.

**Current decision: ready for review as a concrete plan, NOT ready to execute a
public launch. The unverified Preview recovery/migration acceptance gate remains.**


## Review packet and precise release operations

- Exact core DDL: [core migration](reviews/teacher-v2-core-beta-migration_REVIEW_ONLY.sql).
- Exact file order/hashes and Preview target: [manifest](reviews/teacher-v2-core-beta-manifest.json).
- Essential rollback-only test: [basic acceptance](proposed-migrations/teacher_management_v2_basic_beta_acceptance_REVIEW_ONLY.sql).
- Post-verification registration opening: [open flags](reviews/teacher-v2-core-beta-open_REVIEW_ONLY.sql). It deliberately refuses an unpinned release SHA.
- Data-preserving stop: [close flags](reviews/teacher-v2-core-beta-close_REVIEW_ONLY.sql). No account/profile/ID data is deleted.

The same reviewed five-file core DDL is the **proposed Production migration**, but it has no
Production execution target or authorization. Before any Production operation,
owner must confirm that target and approve the exact new release SHA, SQL hash,
artifact baseline hash and allowed operations. Required existing foundation is
Supabase Auth plus `public.user_roles` and `public.is_super_admin()`; missing
foundation or any existing partial v2 schema aborts rather than silently granting
privileges or applying an unreviewed upgrade. The core migration does not replace
Study Material policies, deploy functions or create storage buckets.

For Production build, use only the owner-approved publishable browser key and
project URL with the four flag values listed above; never use a service-role key.
After approved schema/closed-flag checks, assemble `/teacher-beta/` into the
approved existing live artifact, verify its baseline hashes, and publish only with
separate permission. Perform actual Google OAuth and role smoke checks with flags
closed, then use the separately approved registration-opening action. Merge is
not required to prepare the artifact and is not authorized by this packet.

## GitHub Pages delivery procedure (after final owner approval only)

The existing `pages.yml` builds the full repository site; **do not use that build**
for this core-only release. The delivery job must instead consume the assembled
artifact below, using the repository's protected Pages environment and the exact
approved commit. No such deployment job was dispatched here.

1. Download the currently approved live Pages artifact from its owner-confirmed
   workflow run/artifact into `work/live-baseline/` (for example, `gh run download
   <APPROVED_RUN_ID> --name <APPROVED_ARTIFACT_NAME> --dir work/live-baseline`).
2. Confirm its independently approved baseline inventory hash using the assembler's
   `--inspect-baseline` mode. Do not use PR #109's full-site `dist/` as the baseline.
3. Build `npm run build:teacher-beta` on the exact approved new commit with the
   approved Production URL/publishable key and minimal flags. No new role comes
   from this public browser configuration. Check callback pages and login origin.
4. Run the assembler with that approved hash into `work/release-candidate/`. Confirm
   `release-manifest.json` and every baseline file unchanged. This is local only.
5. After explicit deployment/publication permission, the approved Pages delivery
   job uploads `work/release-candidate/` with `actions/upload-pages-artifact@v3` and
   deploys that artifact with `actions/deploy-pages@v4`, behind required owner
   review in the Pages environment. Do not run it without those environment gates.
6. Check the approved production `/teacher-beta/` URL and real OAuth only within
   the authorized release scope; open registration using the separately approved
   flag transaction only after checks pass. Announcing/linking it needs the owner's
   launch/publication permission.
7. For frontend rollback, redeploy the exact original approved baseline artifact
   under the incident approval, after server close-flags. This removes only the new
   Beta entry and retains original site bytes; database profiles/audits remain.

The latest owner instruction conditionally authorizes isolated Preview migration
and acceptance once recovery is verified. Production SQL, publishing, deployment
and merge still require separate final approval. No missing check is waived by
speed or by the absence of important personal data in the test environment.

## Concurrent-branch security work retained

The branch advanced after `77c6e71`. This candidate retains the incoming fixes:
all v2 profile states fail closed rather than falling back to legacy grants; denied
v2 lookups never restore legacy access; approval requires a nonempty verified
scope; material editor class/subject defaults/options remain scoped in the separate
advanced workspace; and Core analytics has a constant-off guard as well as server
revocation. Historical 77c6e71 policy/recovery figures are not runtime proof of this
stricter merged candidate. Its updated SQL remains unexecuted under the recovery
hold. Existing legacy subjects must be verified before transition; no automatic
mapping from class-wide Social Science access to narrower subject grants is made.
