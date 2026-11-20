# Teacher v2 Google OAuth and identity binding contract (REVIEW ONLY)

Scope: teacher-owned registration, login, profile and admin review. This document does **not** activate authentication, change Supabase settings or authorize a deployment. Feature flags stay OFF.

## Trust boundaries

1. GitHub Pages is a static frontend; its JavaScript, route parameters, localStorage and hidden fields are **untrusted**. Cloudflare is DNS ONLY. Supabase Auth is the identity issuer; server-side RLS/RPC authorization remains authoritative.
2. Google OAuth identifies the authenticated user, **not** an approved teacher. A valid Google account must not create an admin/teacher role, assign an employee ID, approve an application or grant access to private media.
3. Start OAuth with the Supabase SDK PKCE flow, using only allowlisted redirect origins and exact callback paths. Validate the callback state/PKCE verifier and exchange the code with the SDK. Do not put session tokens in URL query strings, application logs, analytics or GitHub artifacts. Treat the returned Supabase user ID (`auth.uid()`) as the only identity key.
4. On first login, read the teacher application by the authenticated user ID via a narrowly scoped server-side RPC or RLS-protected query. If none exists, show a **pending application** registration experience, not an approved dashboard. Repeated login must be idempotent: one application identity per auth user.
5. Email address, display name, Google profile photo, `user_metadata` and provider identifiers are **not** approval authority. Email changes, provider relinking and duplicate email addresses must not silently transfer teacher records or roles.
6. Teacher photo collected in registration is an applicant-provided image. Persist only after authenticated upload to a private bucket using an owner-scoped object key and RLS checks; a Google avatar is not a substitute for the submitted photo. On dashboard, fetch a fresh short-lived signed URL after authorization and handle expiry.
7. Qualifications, resume metadata and class/subject/work assignments must be independently validated. An applicant cannot write approval status, employee ID, reviewer identity, role membership or assignments. Reviewer approval and employee ID allocation must be separate, audited, atomic server-side operations.
8. Never authorize by frontend role claims alone. Teacher dashboard must distinguish pending/rejected/approved/suspended states; only an approved active teacher receives assigned work. A reviewer must not approve their own application; super-admin override requires an explicit audited contract.
9. Log out by clearing the SDK session and in-memory private previews. Previously issued signed URLs may remain valid until expiry: do not claim immediate revocation. Keep signed URL TTL minimal, avoid caching in public pages and test expiry/revocation windows.

## Required synthetic Preview acceptance (BLOCKED until release gates pass)

| ID | Scenario | Server-side expected result |
| --- | --- | --- |
| O01 | Google login without teacher application | Auth succeeds; no teacher role, employee ID or private objects |
| O02 | Same Google user registers twice | One owner-bound application; no duplicate employee ID |
| O03 | Applicant forges approved status or assignments in request | Denied; no privilege escalation |
| O04 | Applicant reads another teacher's profile/photo/resume | Denied at RPC/RLS/storage layer |
| O05 | Pending or rejected teacher opens dashboard directly | No approved teacher operations |
| O06 | Google email or display name changes | Stable auth UID binding; no ownership transfer |
| O07 | Reviewer attempts to approve own application | Denied and auditable |
| O08 | Two independent reviewers race to approve one application | Exactly one deterministic approved transition and employee ID |
| O09 | Approved teacher has multiple class, subject and work assignments | Only explicitly authorized assignments returned |
| O10 | Signed photo URL expires after logout/revocation | Previously issued URL tested until TTL; no new unauthorized URL issued |

## Evidence and release gates

Record exact main/candidate SHAs, SQL bundle hashes, approved redirect URLs (not secrets), synthetic actor aliases, sanitized request/response outcomes, row-level before/after snapshots and reviewer signoff. No real credentials or signed URLs in evidence. Cross-check the T01–T18 matrix and evidence ledger; these O-cases are supplementary and **not** substitutes.

**NO-GO** until independently verified full restore, remediation and read-only recheck of Preview `public.user_roles` TRUNCATE grants, installed and reviewed teacher v2 RPC/RLS contracts on an authorized isolated Preview, real positive/negative JWT-backed tests, passing CI and distinct explicit owner authorization. Never run migrations, grants/revokes, deployments, merges or DNS changes from this document.
