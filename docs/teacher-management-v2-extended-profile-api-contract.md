> Update, 16 November 2026: draft implementation and precise activation/test status are documented in [the v2 handoff](teacher-management-v2-draft-handoff-2026-11-16.md). This earlier design document is historical; no v2 SQL or storage is active.

# Teacher Management v2 — Extended Profile API Contract (REVIEW ONLY)

**Status:** design contract only. No API, storage bucket, migration, or RPC described here is active. This document must not be interpreted as proof of live submission.

## Teacher flow
1. Authenticate with the existing Google account; bind every write to `auth.uid()`, never a client-supplied user ID.
2. Save profile fields and qualifications only through a reviewed server endpoint; validate name, institution, title, passing year and limits server-side.
3. Request a short-lived private upload authorization for one resume (PDF/DOCX, <= 5 MiB). The server chooses a random object key under the authenticated user's private prefix. Never trust a client-provided storage path.
4. Verify actual file signature and size after upload; malware scan where available. Save document metadata only after successful verification. Keep the bucket private and use short-lived signed URLs for Super Admin review.
5. Submit enrollment for Super Admin verification; the request must reference the exact version of profile and qualifications submitted. Do not silently overwrite an approved profile.
6. Super Admin reviews identity, qualifications and resume, then approves/rejects with a reason. Employee ID and scoped assignments are issued server-side, transactionally, only after approval.

## Proposed endpoint contracts (not implemented)

| Operation | Caller | Input | Output | Safety |
|---|---|---|---|---|
| `teacher_v2_save_profile` | Authenticated applicant | Display name, contact info, experience | Profile revision | Owner only; no status/ID changes |
| `teacher_v2_replace_qualifications` | Authenticated applicant | Up to 20 title/institution/year records | Revision | Transactional replacement; approved profiles locked |
| `teacher_v2_create_resume_upload` | Authenticated applicant | Filename, claimed MIME, size | One-time private upload authorization | Random path, short TTL, rate limit |
| `teacher_v2_finalize_resume` | Authenticated applicant | Upload token | Verified document ID | Server checks stored bytes, no public URL |
| `teacher_v2_submit_application` | Authenticated applicant | Primary class/subject, reason, requested scopes | Application ID | Server validates all scopes and binds profile revision |
| `teacher_v2_review_application` | Verified Super Admin | Request ID, decision, reason, approved scopes | Decision and audit IDs | Transactional; reject stale profile revisions |
| `teacher_v2_get_my_profile` | Authenticated applicant | None | Own verified profile | Read only own row; redact private storage path |
| `teacher_v2_list_review_queue` | Verified Super Admin | Page cursor and filters | Paged applicants | Server authorization, bounded page size |

## Compatibility and rollout
- Existing `submit_teacher_enrollment` and `review_teacher_enrollment` remain unchanged until a separately reviewed transition is approved.
- Current primary class/subject form may submit through the legacy RPC. Extra class/subject selections, qualifications and resume must stay clearly labeled **preview only** until every required v2 endpoint is tested.
- Do not expose the new UI submission button until private storage, review queue and rollback plan are verified.
- The v2 schema and functions in `docs/proposed-migrations` are design drafts; their RLS grants and migrations are not active.

## Minimum acceptance tests
1. User A cannot read, edit or download User B's profile or resume.
2. An anonymous user and ordinary Admin cannot call Super Admin endpoints.
3. Filename tricks, MIME spoofing, oversized files and reused upload tokens are rejected.
4. Failed metadata verification never marks an unverified file as reviewed.
5. Concurrent approvals cannot create duplicate Employee IDs or active assignments.
6. Suspended staff cannot use previously granted rights.
7. All approval and assignment changes have immutable audit events.
8. Legacy teacher application and result/study-material access still work in Preview.
9. Real UI never displays a saved/sent confirmation unless the server confirms persistence.
10. Production deploy, SQL execution and merge require distinct owner approval.
