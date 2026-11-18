# Teacher v2 Preview installation — execution gates and test matrix (18 Nov 2026)

**Status: REVIEW ONLY / DO NOT EXECUTE.** PR #114. Production must remain untouched. GitHub Pages only; Cloudflare DNS only. PR #109 remains read-only.

## Ordered candidate migration set
1. `teacher_management_v2_schema_REVIEW_ONLY.sql`
2. `teacher_management_v2_beta_flags_REVIEW_ONLY.sql`
3. `teacher_management_v2_profile_rpc_REVIEW_ONLY.sql`
4. `teacher_management_v2_functions_REVIEW_ONLY.sql`
5. `teacher_management_v2_lifecycle_REVIEW_ONLY.sql`
6. `teacher_v2_independent_verification_REVIEW_ONLY.sql`
7. `teacher_v2_verification_writer_REVIEW_ONLY.sql`
8. `teacher_v2_review_independent_evidence_OVERRIDE_REVIEW_ONLY.sql`
9. `teacher_v2_final_rpc_grants_REVIEW_ONLY.sql` (candidate reconciliation; security review required)

Do **not** include `teacher_management_v2_integration_REVIEW_ONLY.sql` in the registration-only release: it alters Study Materials permissions.

## Mandatory stop/go evidence before any Preview mutation
- Identify Preview project `zgpkmfqioqvincmgyfpi` and verify a recoverable backup plus a successful disposable restore, with owner-visible evidence. A local RLS rollback is not backup evidence.
- Inspect every script for idempotence, owner privileges, schema/function dependencies, table grants, security-definer authorization, overloaded signatures and expected data changes. Never assume SQL file labels are executable approvals.
- Resolve effective `TRUNCATE` privileges on `public.user_roles` for `anon` and `authenticated` with a separately reviewed, reversible privilege remediation. RLS does not protect TRUNCATE.
- Execute only against Preview in an explicitly approved controlled change window; record SQL hashes, project ID, before/after catalog snapshots, audit and rollback plan. Keep feature flags OFF initially.

## Runtime matrix — all required, no skipped tests
| Actor / case | Expected |
| --- | --- |
| Anonymous applicant | Cannot call privileged review or verification |
| Authenticated applicant | Can save only own application; cannot review/verify |
| Ordinary teacher | Cannot approve or verify self/others |
| Ordinary admin | Cannot approve or verify without independent Super Admin role |
| Super Admin reviewer | Can reject pending application with valid reason; cannot approve without valid independent evidence |
| Independent Super Admin verifier | Can record accountable evidence for exact pending revision; cannot verify own application |
| Independent Super Admin reviewer | Can approve with valid, unrevoked evidence, verified assignments and active registration flag |
| Stale revision | Both verification and review reject |
| Duplicate evidence / concurrent review | Cannot produce duplicate active attestations or duplicate approvals |
| Revoked or cross-user evidence | Cannot approve |
| Caller sets `p_verified=true` without evidence | Cannot approve |
| Unauthorized assignment / student records | Cannot access or modify |
| Employee ID | Unique, stable and auditable |
| Resume upload | Only intended authorized user/admin can access, with file constraints validated |

Record actual authenticated request/response evidence for every case. Never treat static source assertions as runtime evidence. Only after all gates pass should the owner review a separate release decision and enable flags; do not silently deploy or merge this draft PR.
