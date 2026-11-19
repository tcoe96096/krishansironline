# KSOL Study Materials — role and linking contract (REVIEW ONLY)

Date: 2026-11-20. Scope: proposal only; no backend, SQL execution, publishing, delivery, or changes to Student/Exam/Teacher/Studio-owned sources.

## Proposed content model
- Material identity: immutable opaque material_id; title; description; type (pdf, video, note); class_ids[]; subject_ids[]; optional course_id; author_user_id; revision; status (draft, in_review, approved, published, archived); created_at/updated_at.
- Content source: private storage object key for uploaded PDF/notes; allowlisted video provider identifier or validated HTTPS URL for video. Never store signed URLs or credentials in public content records.
- Learning links: material_id + enrollment/course reference, with a separate authorized visibility decision; avoid duplicating student identity or modifying Student/Exam schemas.
- Audit: actor, action, material_id, revision, decision, timestamp, correlation_id; exclude raw document contents and personal data from public logs.

## Proposed permission matrix (not implemented)
| Action | Super Admin | Authorized Admin | Assigned Teacher | Enrolled Student | Public |
|---|---|---|---|---|---|
| Create/edit own draft | allowed | allowed | proposed by assignment | no | no |
| Approve/publish | allowed | explicitly delegated | no | no | no |
| View published material | allowed | allowed | assigned scope | enrollment/class scope | only explicitly public items |
| Download private PDF | allowed by policy | allowed by policy | assigned scope | enrolled scope, short-lived signed URL | no |
| Delete/archive | audited | delegated | request only | no | no |

## Trust boundaries and acceptance checks
1. Authoring UI cannot grant itself publish permission; backend must re-check role and assignment on each operation.
2. Class/subject linkage must be validated against authoritative catalogs; a client-provided student ID is never sufficient for access.
3. Student view lists only published, currently entitled materials. Draft, archived, or unassigned content must not leak via listing, object URLs, search, or previews.
4. Storage objects default private. Download links are generated server-side after authorization and expire; revoke access when enrollment/assignment changes.
5. Uploaded PDFs are size/type checked, scanned where available, and rendered in a sandboxed viewer. External video embeds use a strict provider/URL allowlist.
6. Publishing requires separate approval, version snapshot, rollback metadata, and audit entry; website Studio draft state must not silently publish learning content.
7. Test matrix: authorized class; other class; withdrawn enrollment; teacher reassignment; expired URL; unpublished draft; archived version; malformed video URL; responsive mobile layout; keyboard navigation.

## Integration boundary
Main Visual Website Studio may propose navigation and public presentation components only. Student/Exam enrollment, Teacher assignments, and admin role grants remain owned by their respective modules. Result Card/Inbox delivery permissions remain separate from study-material access. ADVANCE Studio is not part of this contract.

## Blockers before implementation
Obtain owner-reviewed shared API/RLS/storage contracts, authoritative enrollment and teacher-assignment interfaces, Preview-vs-Production inventory, verified recovery evidence, and explicit approval for any backend change or deployment. Production Result Card RPC is not assumed present.
