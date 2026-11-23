# Teacher v2 authenticated acceptance matrix — REVIEW ONLY

Scope: teacher-owned RPC/RLS and private media; no deployment, SQL execution, feature-flag activation, or database writes by this document. Existing PR #109 remains strictly read-only.

## Prerequisites (all mandatory before running stateful tests)
- Independently verified full recoverable backup, disposable restore, recorded manifest/checksums and independent owner review.
- Disposable Preview only, explicit owner approval for any Preview migration or role/privilege mutation; Production is never a test target.
- Inventory effective privileges (including inherited grants) and existing storage policies. Preview currently reports unsafe effective TRUNCATE on public.user_roles for anon/authenticated; remediation SQL is REVIEW ONLY.
- Confirm actual Preview functions exist by catalog inspection; missing teacher_v2_save_application, teacher_v2_review and teacher_v2_snapshot means functional tests are BLOCKED, not PASS.
- Use synthetic accounts with distinct auth.uid: applicant A, applicant B, approved teacher C, reviewer admin D, unprivileged E, plus anon. Capture JWT role and subject identity without logging tokens.

## Required positive / negative cases (record evidence for each)
| Contract | Positive | Negative / isolation | Evidence |
| --- | --- | --- | --- |
| save_application | A creates/updates only own draft; server ignores client-provided identity | anon, B updating A, spoofed owner ID, forged approval/employee ID | RPC response, DB row ownership, denied error |
| snapshot | A reads only A; approved C sees server-approved grants | B reads A; anon reads any; stale/revoked grants appear | projected field set and cross-account denial |
| review | D explicitly selects approved scopes and records audit trail | A/B/E review, self-approval, requested scopes auto-granted, empty scope approval | reviewer identity, audit row, denied error |
| employee ID | issued only on approved transition, stable and unique | applicant assigns own ID; duplicate/racing approvals; rejected application receives ID | transaction outcome and uniqueness check |
| multi-class/subject/work | active reviewed grants only; many-to-many scopes supported | unapproved scope access, revoked scope cached as active | server-side authorization and refresh |
| Google OAuth | correct callback binds authenticated identity | wrong account session, unverified identity, forged provider payload | auth.uid and session isolation |
| private photo | owner uploads/reads only own image via private path | B/anon read A, public bucket URL, path traversal, wrong MIME/content, oversized image | storage policy effective decision, signed URL lifetime |
| private resume | owner uploads quarantined document; reviewer reads only when independently authorized | B/anon read, public listing, unscanned file promoted, forged scan result, unsafe file signature | storage authorization and quarantine state |
| user_roles privileges | only intended admin can perform privileged operations | anon/authenticated TRUNCATE, inherited grant, SECURITY DEFINER bypass | has_table_privilege, role membership, RPC denial |

## Release gates
1. Static/mock tests and CI are useful but **not** authenticated Preview evidence.
2. Every positive and negative case must be recorded with timestamp, sanitized request, actual role, result, and reviewer.
3. Any unexpected allow, missing function, unavailable backup, failed restore, unverified quota, or missing owner approval => NO-GO.
4. Keep teacher flags OFF and all SQL proposals REVIEW ONLY until a separate explicit owner authorization after full recovery and authenticated acceptance.
5. No Production database mutation, merge, GitHub Pages publish, Cloudflare DNS change, or paid resource activation. Additional budget ₹0.
