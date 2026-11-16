> Update, 16 November 2026: draft implementation and precise activation/test status are documented in [the v2 handoff](teacher-management-v2-draft-handoff-2026-11-16.md). This earlier design document is historical; no v2 SQL or storage is active.

# Teacher Management v2 — Draft implementation contract

Status: DESIGN / REVIEW ONLY. No migration execution, production deployment, or permission activation.

## Scope
- Google authenticated enrollment with verified account identity, display name, contact, qualifications, experience, and optional resume (PDF/DOCX) uploaded to a private storage bucket after validation.
- Stable unique employee ID assigned server-side **only after Super Admin approval**; login remains the existing authentication identity. Never use sequential employee IDs as authentication secrets.
- Teacher profile and application status in teacher workspace; searchable teacher directory and application details in Super Admin workspace.
- Multi-valued assignments: classes, subjects, permission roles, and work items. A teacher can have many assignments; avoid one scope_class field as the sole authorization source.
- Super Admin can approve/reject, grant/revoke assignments, suspend access, and view immutable audit events. No self-approval or privilege escalation.
- Permission checks are server-enforced on every read/write; frontend controls are advisory only. Result publishing, result inbox delivery, and website publishing require separately approved policies.

## Proposed data model (not deployed)
- teacher_profiles: user_id PK, employee_id UNIQUE nullable until approval, display_name, contact, qualifications, experience, resume_object_path, state, timestamps.
- teacher_enrollment_requests: existing requests retained; extend through reviewed migration with profile references and explicit statuses.
- teacher_assignments: id, teacher_user_id, class_level, subject, role, work_type, active, assigned_by, timestamps; uniqueness and scoped validation.
- teacher_audit_events: actor, subject, action, before/after metadata, timestamp; append-only server policy.
- teacher_resume_objects: private storage and server-authorized signed read links; no public URLs.

## Rollout gates
1. Review schema, migration compatibility, RLS, RPC security and file-upload controls; no SQL execution.
2. Build UI and API against mock/preview-safe adapters with clear backend-not-activated states.
3. Unit tests: input validation, duplicate employee IDs, role escalation, assignment scope, resume type/size, audit.
4. Browser smoke: enroll, pending, reject, approve, profile, multi-assignment, revoke; include denied-access paths.
5. Separately approve and test Preview database migration; then owner-authorized preview deploy. Production remains untouched.

## Non-goals without separate approval
- Automatic teacher access from Google login alone.
- Personalized Result Inbox delivery or marks publishing.
- Production schema/storage/policy changes.
