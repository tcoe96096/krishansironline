> Historical evidence for source `77c6e71`. The later merged Core Beta fails closed for **all** v2 states, including pending/rejected, adds server feature gates, and requires a Super Admin legacy transition before enrollment. The 8,056 checks/87 differences below do not validate those later SQL changes. No revised SQL has run. See the [current Core Beta packet](../teacher-management-v2-minimal-beta-launch-approval.md).

# Teacher Management v2 — preflight security and recovery review

**Decision: HOLD. Do not apply the Preview migration. Production Beta is blocked.**

Source reviewed: Draft PR #109, `77c6e717c1eddba57e7eef931e0257ff2f74b061`.
Only remote project inspected: **`zgpkmfqioqvincmgyfpi`**, verified name
`krishan-sir-lms-preview`, PostgreSQL 17.11. No Production inspection or change.

The attempted migration confirmation was cancelled by the client; the connector
reported **nothing was run**. Subsequent read-only catalog checks confirmed no v2
tables, no v2 migration history entry, the six original material policies, and no
`teacher-resumes-private` bucket. Approval is now explicitly withheld pending
preflight. A generic continuation must not bypass this hold.

## Evidence and limits

- [Captured Preview policies, dependencies and audit trigger](teacher-v2-material-policy-baseline-2026-11-16.json).
- [Independent local PostgreSQL results and all differences](teacher-v2-material-policy-results-2026-11-16.json).
- Reproduction: `python3 scripts/review-teacher-material-policies.py`.
- [Target and source-hash manifest](teacher-v2-preview-activation-manifest.json). This is a preparation artifact, not an execution tool or approval.
- [Mechanically tested policy-only recovery SQL](teacher-v2-policy-recovery_REVIEW_ONLY.sql). **Not approved for remote execution; see rollback risks below.**

The rehearsal uses real PostgreSQL RLS with non-superuser/non-BYPASSRLS `anon`
and `authenticated` roles, exact captured material policies, actual captured
`is_super_admin()` and material audit trigger, and independent expected access
rules. It does not substitute mocked booleans for database RLS.

**8,056 checks passed, zero failed:** 2,014 each for original policies, proposed
policies, recovered original policies, and a logical backup restored into a
second fresh local database container. Nineteen actor configurations cover
anonymous, student, ordinary Admin, Super Admin, active/revoked legacy grants,
scoped/unscoped/read-only/review-only legacy access, pending/rejected v2 legacy
applicants, approved multi-scope/draft-only/review-only/result-only v2 teachers,
revoked assignments, suspended teachers and v2 users without legacy grants.

Checks include own/other-owner reads across draft, pending, published and
archived states; insert/update/delete; class/subject moves; review transitions;
combined content edits during submission; ownership changes; and cross-class test
links. Each probe rolls back its writes. There are 608 synthetic material rows;
row counts and content hashes, profile/assignment hashes and trigger definitions
were unchanged by policy replacement and recovery.

Local engine: PostgreSQL **17.12**, pinned image digest in the results. Preview is
**17.11**. Local containers have `--network none`, no exposed ports, and are
removed after the test. Fixtures contain no real account/student/document data.
The harness reproduces relevant table/role dependencies; it is not a complete
Supabase/Auth/PostgREST deployment. It does not prove real JWT/OAuth, concurrent
transactions, all result-table policies, managed backups, or deployed UI behavior.

## Five-policy comparison

The sixth policy, **Published material is readable**, is retained unchanged.
Anonymous and authenticated users can still read published material. It is never
removed or recreated by the v2 integration proposal.

| Existing policy replaced | Replacement | Preserved behavior / intentional difference |
| --- | --- | --- |
| Owner or super admin reads review drafts | V2 read own material | Super Admin retains all material reads; delegated users read only their own private material. Legacy scope and active grant checks remain. V2 private reads require an active material draft/review assignment for the exact class and subject. |
| Scoped editors create drafts | V2 create own draft | Only own drafts; Super Admin retains existing exception. V2 requires exact `materials.draft` assignment. Pending/published/archived insertion by teachers remains denied. |
| Scoped editors update only own drafts | V2 update own draft | Old and new row must remain an authorized own draft; Super Admin retains existing exception. V2 changes must remain within explicitly assigned class/subject scopes. |
| Scoped staff submit own drafts for review | V2 submit own draft | Only own draft to pending-review transition with review permission; the unchanged audit trigger denies combined content edits and teacher publication. V2 requires exact `materials.review` assignment. |
| Owner may delete only own drafts | V2 delete own draft | Own draft plus write permission; Super Admin retains existing exception. V2 requires exact `materials.draft` assignment. |

All policies remain permissive; PostgreSQL combines applicable policies with OR.
Therefore all five old authoring policies must be replaced atomically. Leaving an
old authoring policy active would bypass new assignment/revocation restrictions.

### Observed differences (not a claim of identical authorization)

The matrix contains **87 intentional decision differences**: **14 new allows**
and **73 new denials**. All changes are for v2-approved/suspended identities;
there are **zero differences** for anonymous, student, ordinary Admin, Super Admin,
all legacy-only configurations, and first pending/rejected v2 applications.

- New allows: explicitly approved new class/subject material assignments, including
  a teacher without a legacy grant. These never grant other-owner private access,
  publication, ownership transfer, or marks editing.
- New denials: old class-wide access outside an approved v2 subject/work assignment;
  revoked/suspended v2 identities with an otherwise active legacy grant; review
  submission without `materials.review`; edits without `materials.draft`;
  `result.review` alone does not grant material authoring/private material reads.
- An existing teacher's valid legacy grant remains authoritative during their
  first pending/rejected v2 application. After v2 approval (or any issued employee
  identity), legacy grants cannot bypass new assignment decisions.
- Existing published content remains publicly readable even after a teacher's
  private work permissions are revoked; this is retained public-catalog behavior.

Actual Preview currently has **two active legacy Teacher grants**, each Class 10
with material read/write/review permissions, and **zero material rows**. They
remain unchanged on initial schema activation because no v2 profile is backfilled.
This snapshot does not justify skipping another inventory/drift check at execution.

## Additional result-summary privacy finding

A supplemental call to the exact proposed aggregate RPC with one synthetic
submitted attempt returned count 1 and average 87 to an authorized scoped result
reviewer. Although no student identity is returned, this can expose an individual
score in a small cohort. Agree and test a minimum-cohort/redaction policy before
enabling result summaries in any Beta. This is not a material-policy difference;
it is a separate confidentiality decision recorded in the results JSON.

## Recovery rehearsal — what is proven

1. A deliberately failing local migration transaction rolled back all policy/schema
   changes; policy fingerprints and data hashes matched the preflight snapshot.
2. After successful local replacement, the policy-only recovery script restored
   the exact original policy definitions and all 2,014 baseline access decisions,
   preserving fixture rows and data hashes. It retains additive v2 tables/data.
3. A custom-format `pg_dump` of the synthetic baseline restored successfully into
   a second fresh local container with the required role bootstrap; all 2,014
   baseline decisions and material/profile/assignment data hashes matched.

The dump is a synthetic local rehearsal artifact, **not a backup of Preview**.
No managed restore, backup export of real data, or remote recovery was performed.

## Recovery readiness — blocking condition NOT satisfied

Available Supabase connector tools expose project health/catalogs, but do not
expose managed backup listings, backup timestamps/retention, PITR windows, restore
entitlements, or restore completion evidence. No authenticated dashboard/browser
capability is available in this session. `ACTIVE_HEALTHY` is not backup evidence.

Before approval, the owner/operator must provide or verify, for this exact Preview
project: a recent successful backup/restore-point ID and timestamp; retention and
PITR window if enabled; a supported and accessible restore procedure; destination,
permissions and expected downtime; acceptable recovery point/data-loss window;
and a successful disposable-target restore/verification drill. Restoring over
Preview itself is **not** authorized as a test. Failure or lack of evidence keeps
activation on HOLD. No RPO or RTO has been measured for the managed service.

## Destructive and operational risks requiring review

- The proposals do not DROP/TRUNCATE existing tables or delete existing rows.
  However, DROP POLICY changes access immediately. Partial application can remove
  access or preserve an unintended permissive bypass. Run one atomic bundle, not
  the six files' individual BEGIN/COMMIT blocks sequentially.
- **Policy-only rollback restores legacy authorization.** After v2 is used, this
  may reauthorize class-wide rights that v2 deliberately revoked. The successful
  rollback test proves historical behavior, not that this is safe after new grants
  or revocations. Prefer a forward fix; otherwise freeze affected access and review
  account/grant reconciliation before any separately approved rollback.
- A full database restore may discard all writes after the restore point, including
  unrelated student/admin data, and may require downtime and Auth consistency
  checks. Do not infer safety from the material-policy rehearsal.
- Initial migration has no teacher backfill. Approval without intended assignments
  can remove previously broad legacy authoring access. Inventory and explicitly
  review assignments for each existing teacher before transition.
- DDL takes table/catalog locks; use bounded lock/statement timeouts, rerun the
  drift/integrity preflight, and stop on any unexpected lock, SQL, policy or test
  result. Do not work around failures by granting broad privileges.
- Resume SQL adds private metadata/RPCs only. It does not create a bucket, upload
  real documents, configure a scanner or deploy a service. These remain disabled.

## Target control and next gate

Any later remote migration is restricted to the literal connector argument
`project_id: zgpkmfqioqvincmgyfpi`. Refresh project metadata and require exact
ref/name match; compare all six source hashes to the manifest and captured policy
fingerprints before a new approval. Do not use `current_database()='postgres'` as
an identity check: multiple Supabase projects use that database name. No tool call
or runner may fall back to a Production project or accept an arbitrary project ID.

**No Preview migration approval should be sought as ready until managed backup
readiness is verified and the policy differences/rollback risk are accepted.**
Production SQL, deploy, publication, storage activation and merge remain forbidden.
