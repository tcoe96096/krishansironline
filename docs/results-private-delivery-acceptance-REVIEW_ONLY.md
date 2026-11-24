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

## Bounded implementation handoff: editable card + private inbox (2026-11-19)

### Minimum versioned data contract (proposal; not deployed)
- `report_template_draft`: opaque draft ID, owner/authorized editor, editable schema, brand asset references, revision and updated_at. Draft-only edits must not alter issued copies.
- `report_template_version`: immutable version ID, canonical validated JSON, content hash, creator, approval and created_at. The approved version is referenced by every issuance.
- `report_issue`: server-issued opaque ID, verified student and attempt references, immutable template-version ID, issued payload hash, issuer, issue timestamp, supersedes ID and explicit state. Never accept scores, ownership or issued status from browser inputs.
- `report_delivery`: server-issued ID, issue ID, recipient user ID, idempotency token, status, timestamps and failure category. A unique constraint on (issue ID, recipient user ID, idempotency token) prevents duplicate sends.
- `report_access_audit`: actor, issue ID, operation, outcome, timestamp and non-sensitive request correlation ID. Do not log full report, signature, contact details or signed URLs.

These names describe a contract, **not** existing database objects. Actual migration naming must be reconciled with Preview's current schema and RPC signatures before SQL review.

### Authorization and visibility matrix

| Actor/state | Edit template draft | Approve/issue | Read issued report | Deliver/revoke |
| --- | --- | --- | --- | --- |
| Anonymous | Deny | Deny | Deny | Deny |
| Student, own account | Deny | Deny | Own delivered non-revoked only | Deny |
| Student, another account | Deny | Deny | Deny | Deny |
| Pending/rejected/suspended teacher | Deny | Deny | Deny | Deny |
| Approved teacher with scoped assignment | Explicit draft permission only | Deny unless separately server-authorized | Only explicitly scoped records | Deny unless separately server-authorized |
| Admin without issuer permission | Explicit editor permission only | Deny | Explicitly scoped records only | Deny |
| Verified issuer/admin | Explicit editor permission | Scoped, audited server transaction | Explicitly scoped records | Scoped, audited server transaction |

All entries are **intended future policy**, not evidence of current access. Supabase RLS alone does not authorize private Storage signed URLs; validate both independently.

### UI integration acceptance (no backend calls before activation)
1. The report-card designer is an **isolated draft editor**: header, approved KSOL logo, class, session, assessment, subject rows, remarks and signature placeholders can be changed without modifying general Website Studio's published pages.
2. Render report content from an allowlisted typed JSON schema (text, numeric marks, approved image references and layout tokens). Do not accept arbitrary HTML, script, SVG uploads, CSS URLs or untrusted iframe/embed strings.
3. Show a prominent `DRAFT / NOT ISSUED` watermark on local-only previews. No mock recipient or template should be labeled as a sent or published result.
4. Print/PDF must escape all student-provided text and preserve Hindi/English Unicode. Use the same immutable issued snapshot for download and printing after authorization.
5. Student Result Inbox should expose a neutral empty state when the server contract is unavailable; **never** fall back to querying all test attempts or a public bucket.
6. General Website Studio can link to the Result Inbox route but cannot publish, duplicate, or mutate report delivery state. Its draft scheduling and publish buttons are not result-issuer authorization.
7. Study Materials can display a recommended resource reference only after an authorized server lookup; do not embed result IDs or recipient identifiers in public URLs or content links.
8. Admin authoring for PDF/video/notes must use approved content metadata and private/public classification, avoiding raw arbitrary external embeds and direct client-side permission grants.

### Disposable-fixture acceptance cases
- Issue a report using approved template version A, edit the draft to B, then verify the issued snapshot and hash remain A.
- Retry delivery with the same idempotency token; verify exactly one recipient delivery and one effective notification.
- Switch between Student A and B; verify B cannot enumerate A's issue, Storage path or signed URL.
- Suspend a teacher after granting a scoped assignment; verify review and all result access fail closed.
- Remove issuer permission from an admin; verify issue/delivery RPCs deny despite visible UI controls.
- Set a report to revoked/undelivered; verify Inbox, export, print and signed access all deny.
- Test malicious CSV formula prefixes and bidi/control characters in display names; verify export remains inert and Unicode remains readable.
- Verify offline/failed delivery never shows a false success badge and can retry safely.
- Verify Studio page publish or schedule cannot trigger any report issuance or delivery.

**Handoff gate:** These are test specifications, not completed tests. Implement isolated mock-only UI first; before any authenticated Preview tests, reconcile existing Preview RPC/schema, verify recoverability, and obtain separate authorization for any Preview mutation. Production activation requires its own subsequent approval.
