# Result Card backend: least-privilege RLS and role contract (REVIEW ONLY)

Source: read-only `pg_policies` query on Preview, 2026-11-22. This is a proposal, not a migration or permission change.

## Verified existing Preview policies
| Table | Access |
| --- | --- |
| result_card_templates | anon/authenticated SELECT only published default template |
| result_card_template_audit | authenticated SELECT with is_super_admin() |
| result_delivery_audit | authenticated SELECT with is_super_admin() |
| result_delivery_notices | authenticated SELECT if own eligible student or super admin; own eligible student UPDATE |
| result_staff_grant_audit | authenticated SELECT with is_super_admin() |
| result_staff_grants | authenticated SELECT own grant or super admin; INSERT/UPDATE/DELETE super admin |

## Required policy tightening before deployment
1. **Student notice UPDATE is too broad at column level.** Its row policy checks student_id and eligibility, but a direct UPDATE grant without column restrictions may allow changing `attempt_id`, `sent_by`, or `sent_at`. Restrict direct student UPDATE to `read_at` only, and add a server-verified mark-read RPC that checks the recipient and preserves immutable delivery fields. Review table grants and triggers first.
2. **Student identity mapping:** existing policy assumes `result_delivery_notices.student_id = auth.uid()`. Confirm canonical mapping in Production. Do not substitute client-supplied student_id.
3. **Public template:** only published styling is public; verify options contain no PII or private tokens, as the template policy allows anonymous reads.
4. **Staff grants:** super-admin role and grant mutation audit trigger must be independently verified. Staff grants alone must not authorize delivery, download or audit access.
5. **Definer RPC:** `send_result_to_student` and `publish_result_card_template` are SECURITY DEFINER with empty search_path and explicit super-admin checks; inspect owner and EXECUTE ACL before promotion.
6. **Result lifecycle:** separate published version and revoked/withdrawn state required for fail-closed student downloads. Existing notice read permission does not establish result content release safety.
7. **Storage:** no public bucket or long-lived signed URL for result files. Authorize each download/print through a revocation-aware gateway.

## Proposed role matrix
| Action | Anonymous | Eligible student (own) | Teacher | Super admin |
| --- | --- | --- | --- | --- |
| Read public design template | Published only | Published only | Published only | Published only |
| Read own delivered notice | Deny | Allow | Deny | Allow with audit |
| Mark notice read | Deny | Only own read_at | Deny | Explicit admin workflow |
| Edit result draft | Deny | Deny | Only assigned scope | Authorized |
| Release / revoke result | Deny | Deny | Deny unless explicitly delegated and verified | Authorized with immutable audit |
| Download result | Deny | Own current released nonrevoked only | No inherited access | Explicit privileged access, audited |
| Read private audit | Deny | Deny | Deny | Authorized only |

## Deployment order (review gate)
1. Independently verify recoverable backup and disposable restore.
2. Review dependency catalog and role mappings, including grant and trigger definitions.
3. Create private audit + version/release state and revocation-aware access contract.
4. Apply least-privilege grants and RLS with migration transaction on disposable restored environment.
5. Add idempotent release/revoke RPC with fixed search_path, strict actor checks, row lock and audit.
6. Add authenticated gateway for current-version file access; disallow public object access.
7. Run negative authorization and concurrency tests using distinct real JWTs.
8. Check CI and obtain separate owner sign-off before Production migration, merge or publication.

## Acceptance: fail closed
Reject anonymous, wrong student, inactive student, forged role, stale version, draft, revoked, withdrawn, expired session, replay with different payload, unassigned teacher, private audit reader, and public storage URL. Assert immediate denial after revocation, including view/download/print. All rejections must avoid disclosing another student's metadata.

**Status:** No database write, migration execution, delivery, merge, or deployment. Real authenticated and restore tests NOT run.
