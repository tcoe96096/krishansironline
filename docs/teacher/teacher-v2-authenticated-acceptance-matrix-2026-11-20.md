# Teacher v2 authenticated acceptance matrix — REVIEW ONLY (2026-11-20)

**Status: BLOCKED / NO-GO.** This is an execution checklist, not evidence that any test passed. Feature flags remain OFF. Do not execute proposed SQL, modify grants, install RPCs, enable storage, merge or deploy through this packet.

## Preconditions (all mandatory)
1. Record exact main SHA, candidate SHA, SQL hash, Preview project ID `zgpkmfqioqvincmgyfpi`, and deployment artifact hash. Confirm the deployed Preview frontend actually contains the teacher routes; the isolated Vite `/teacher-beta/` build is not proof of GitHub Pages deployment.
2. Independently verify full, recoverable backup using a restored copy, including roles, policies, triggers, storage metadata and representative teacher/legacy data. A TOC listing or partial Windows restore is **not** sufficient.
3. Record a distinct explicit owner authorization for **Preview-only** migration, including exact SQL hashes and rollback. Do not use this document as authorization.
4. Prepare synthetic accounts: unauthenticated visitor; teacher A (pending); teacher B (approved); teacher C (rejected); independent reviewer/admin; super admin. Keep role identities distinct, verify JWT subject/claims, and ensure no service-role key reaches browser.
5. Record catalog checks for `teacher_v2_save_application`, `teacher_v2_review`, `teacher_v2_snapshot` existence/signatures, RLS policies, `EXECUTE` grants, storage bucket privacy and `public.user_roles` privileges. Known Preview finding: `anon` and `authenticated` currently have direct `TRUNCATE` privilege on `public.user_roles`; **STOP** until separately approved and verified remediation. Never test destructive TRUNCATE on Preview.

## Test cases — require real JWT-backed Preview execution AFTER gates
| ID | Actor | Action | Expected server result |
| --- | --- | --- | --- |
| T01 | Anonymous | Read another teacher's profile/application, photo or resume | Denied; no private URL or metadata leakage |
| T02 | Pending teacher A | Save own application, qualifications and registration photo | Allowed only within schema/size/type limits; authenticated UID is server-derived |
| T03 | Pending teacher A | Supply teacher B UID or employee ID in write payload | Denied; no cross-user mutation |
| T04 | Pending teacher A | Invoke review/approval or assign self a class, subject or work scope | Denied |
| T05 | Teacher B | Read own approved profile, qualifications, assigned classes/subjects/work | Allowed with exact approved scopes only |
| T06 | Teacher B | Read or replace teacher A's private photo/resume, including guessed object path or signed URL | Denied |
| T07 | Teacher C | Attempt login to protected approved-teacher operations | Denied; rejection state cannot fall back to legacy grants |
| T08 | Independent reviewer | Review applicant within explicitly delegated review scope | Allowed; audit actor, decision and timestamp recorded |
| T09 | Independent reviewer | Assign super-admin privileges or bypass required identity verification | Denied |
| T10 | Super admin | Approve a verified applicant with nonempty multi-class/subject/work scopes | Allowed; server-generated unique employee ID; audit trail |
| T11 | Super admin | Approve without verified identity or with empty required scope | Denied |
| T12 | Teacher B | Request snapshot with forged JWT claims or another user's UID | Denied; server derives identity |
| T13 | Teacher B | Replace a private media object using another teacher's path | Denied; object ownership checked server-side |
| T14 | Teacher B | Revoke/logout then reuse expired signed media URL | Denied after URL expiry; document unavoidable validity window |
| T15 | Teacher A | Retry identical application submission | Idempotent/no duplicate teacher or employee ID |
| T16 | Any non-admin | Invoke legacy enrollment or legacy grants to bypass v2 review | Denied; fail closed on missing RPC/lookup failure |
| T17 | All roles | Google OAuth callback with wrong state/redirect or unverified identity | Rejected; no account privilege escalation |
| T18 | Teacher B | Access results/study-material/studio administration without delegated contract | Denied; teacher role alone grants nothing |

## Private media design requirements
- Private Supabase Storage buckets; never use `getPublicUrl` for teacher photo/resume.
- Object key must be bound to authenticated owner by server-side policy; reject arbitrary path, cross-tenant references, and client-controlled owner IDs.
- Validate MIME by content, enforce byte limits, restrict allowed formats, and apply malware screening for resumes before privileged processing. No public document indexing.
- Return short-lived authorized signed URLs only after server-side ownership/delegation checks; do not store persistent signed URLs in profile tables or logs.
- Replacing a registration photo must not silently overwrite another teacher's asset. Preserve an audit trail for admin review.

## Evidence format
For each T01–T18: record timestamp, exact commit/SQL hash, Preview environment, test identity (non-sensitive pseudonym), operation, expected/actual HTTP/RPC response, sanitized audit evidence, PASS/FAIL/BLOCKED, reviewer. Verify no data changed after denied operations. Redact tokens, signed URLs and personal data.

## Stop conditions
Any unexpected grant, cross-account access, missing RPC, unverified backup/restore, incomplete negative-role coverage, or failed CI => **NO-GO**. Require independent owner authorization separately for Production SQL, flags, merge and GitHub Pages publication. Cloudflare remains DNS-only. PR #109 is strictly read-only; #110 and #114 remain separate. Results, Study Materials and Website Studio ownership remains unchanged.
