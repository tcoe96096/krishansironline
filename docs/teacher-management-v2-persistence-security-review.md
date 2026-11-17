> Update, 16 November 2026: draft implementation and precise activation/test status are documented in [the v2 handoff](teacher-management-v2-draft-handoff-2026-11-16.md). This earlier design document is historical; no v2 SQL or storage is active.

# Teacher Management v2 — proposed secure persistence (REVIEW ONLY)

**Status:** Draft design; no database migration has been run. Existing teacher approval remains limited to the current primary class/material grant.

## Identity and profiles
- `teacher_profiles`: `user_id uuid PRIMARY KEY REFERENCES auth.users(id)`, `employee_id text UNIQUE NULL`, `display_name`, `contact_email`, `phone`, `experience_years`, `status`, `approved_at`, `approved_by`, `created_at`, `updated_at`.
- Employee IDs use the display pattern `KSOL-T-XXXXXXXX`, issued **only by a server-side transaction after approval** using a cryptographically unpredictable identifier plus a database unique constraint and retry on collision. Never use an employee ID as a login credential, and never derive it from email, phone, or row count.
- `teacher_qualifications`: `id uuid PK`, `teacher_user_id FK`, `title`, `institution`, `passing_year`, timestamps. Validate length, year, and ownership on the server.
- `teacher_resume_documents`: `id uuid PK`, `teacher_user_id FK`, `storage_path UNIQUE`, `original_filename`, `content_type`, `size_bytes`, `uploaded_at`, `verification_status`. Store private objects only, with random object paths and time-limited authorized signed URLs. Never expose storage paths as public links.

## Multi-class, multi-subject, multi-work assignments
- `teacher_assignments`: `id uuid PK`, `teacher_user_id FK`, `class_level`, `subject`, `work_type`, `status`, `assigned_by`, `assigned_at`, `revoked_by`, `revoked_at`. Enforce uniqueness on active `(teacher_user_id,class_level,subject,work_type)` combinations. Prefer explicit `revoked` records for audit instead of hard deletion.
- Only Super Admin may grant/revoke assignments, via SECURITY DEFINER RPC with explicit `auth.uid()` check and fixed search_path, plus strict enum/allowlist checks. No direct client insert/update on assignments. Server must reject empty and unapproved work types.
- Every authorization decision in Study Material/Results must be checked on the server against *active* assignments; hiding UI buttons is not security.

## Enrollment and approval transaction
1. Authenticated applicant submits personal profile, qualifications and optional resume metadata; server verifies `auth.uid()` ownership. Private file upload uses separately reviewed storage policies.
2. Super Admin independently verifies identity and reviews the application with a mandatory audit reason.
3. Server transaction marks approved, upserts profile, allocates employee ID if missing, creates only explicitly approved scoped assignments, and appends immutable audit event. On error, transaction rolls back in full.
4. Super Admin can later suspend, revoke or change assignments with recorded reason and audit. Suspended profiles cannot exercise grants.
5. Teacher dashboard displays verified employee ID, qualifications, assigned classes/subjects/work, and application state from authenticated server queries.

## Security and migration gates
- RLS: teacher reads/edits only permitted profile fields on own record; never self-approves, changes status, issues employee IDs or grants work. Super Admin sees necessary teacher directory data after verified authority. Resume content accessible only to owner and verified authorized reviewers.
- Audit: `teacher_audit_events` append-only with actor, target, action, reason, before/after snapshot, timestamp; protect against client edits and deletes.
- Rate limits and size checks on uploads; verify file signatures server-side, not only extension/MIME; malware scanning where available. Keep resume bucket private.
- Review existing enrollment/grant schema and data compatibility before writing migration. Add migration + negative RLS tests + transaction tests + browser smoke to draft branch. **Do not run migration or deploy without separate owner approval.**

## Current UI limitation
Registration's multi-selects, qualification fields and resume picker, and Admin's assignment planner are **local preview only**. They do not persist or grant rights. Employee ID display remains unissued/unverified until a real server-side issuance exists.
