# KSOL Results: private delivery and editable report-card acceptance contract

**Status:** REVIEW ONLY — architecture and acceptance criteria, not a deployment, migration, permission grant or live feature. This note accompanies the results export safety PR; no Supabase mutation is authorized.

## Current verified separation (2026-11-19)
- Existing `AdminTestResults` exports existing test attempts; its CSV output must remain admin-authorized and formula-neutralized. This is **not** the private digital Result Inbox.
- Existing `ResultsPortal` and student test history are not evidence of report-card template issuance or cross-user delivery.
- Preview has result-card-related schema/RPC proposals; Production must be treated as lacking that backend until independently inventoried and approved. Never call unverified Preview-only RPCs from Production.
- Teacher v2 role/assignment grants are separately owned; no Results UI flag may imply a teacher can review, issue or deliver results.

## Data and trust boundaries
1. **Template**: versioned immutable issued snapshot, with separate editable draft; allow only approved branding, field schema and sanitized rich text. Never interpolate arbitrary HTML/JS into a printable result.
2. **Result record**: server derives student_id and attempt ownership from authenticated context and validated test data. Client-provided student_id, class, score, status or teacher role is never authority.
3. **Issue/approval**: only a verified authorized Admin/issuer can issue a specific result. Teacher permissions require server-checked active approved profile, explicit scoped assignment and target class/subject match; no inherited Student permissions.
4. **Inbox**: student may SELECT only their own delivered/issued results. Admin may see only explicitly authorized scope. Draft, rejected, revoked and undelivered records are not student-visible.
5. **Delivery**: idempotency key + immutable recipient/result/template version; server-side transaction, audit record, delivery state and retry handling. No client-controlled recipient fan-out.
6. **Private assets**: templates/logos may be public only if intentionally approved; student reports, signatures and supporting files use private storage and short-lived server-authorized signed access, not permanent public URLs.
7. **Download/print**: server validates owner/role before providing report payload or signed URL; no cross-origin untrusted content, spreadsheet formulas or script-capable markup in exports.
8. **Audit**: record actor, recipient, result version, operation, timestamp and reason where applicable; avoid embedding sensitive report content in logs. Revocation and re-issue must be explicit auditable events.
9. **Lifecycle**: retention and deletion follow student governance policy; a student account suspension must not silently delete academic records.

## Required fail-closed tests before any backend activation
- Anonymous cannot list, download, approve or deliver any result.
- Student A cannot access Student B's report by changing IDs, URL paths, storage keys, or RPC parameters.
- Pending/rejected/suspended teacher and teacher without exact class+subject+work assignment cannot review, approve or deliver.
- Authorized teacher is still denied issue/delivery unless that action is separately and explicitly granted by the reviewed server policy.
- Admin without result-issuer authorization cannot bypass the scoped issue policy.
- Duplicate delivery retries cannot create multiple issued records or duplicate notifications.
- Template edits after issue do not change an issued student's immutable report.
- Revoked/undelivered results are not exposed through inbox, export, download or signed URL.
- PDF/print/CSV output neutralizes active content and handles Hindi/English Unicode correctly.
- No service-role secret in frontend bundles; no direct client UPDATE on approval, score, recipient or delivery status.
- Run authenticated positive **and negative** RLS/RPC tests against an isolated disposable fixture; test storage policies independently.
- Validate full recoverability, review SQL migration order, and obtain distinct owner approval before Preview activation, then separately before Production release.

## Integration handoff
- Student/Exam owner supplies a read-only, server-verified result/attempt reference; this module does not modify grading or test attempts.
- Teacher owner supplies a server-side approved-assignment predicate contract; this module does not modify Teacher v2 SQL or UI.
- Study Materials owner may link a result to an authorized learning resource through an opaque reference only; never infer student identity or grant permissions from the link.
- Main Website Studio owns page layout/draft/publish. Result template versioning and delivery remain separate from general website publishing.
- ADVANCE Studio is an entirely separate repository and is not a deployment dependency.

**Release state:** specification only. No SQL executed, no database or storage changed, no real messages delivered, no Preview/Production deploy or merge.
