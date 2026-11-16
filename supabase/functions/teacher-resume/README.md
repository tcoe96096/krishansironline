# Private resume service — DRAFT / NOT DEPLOYED

Separate owner approval is required for the SQL bundle, service deployment,
private `teacher-resumes-private` bucket and scanner configuration. No storage
policy should allow client object writes or reads; only this service handles bytes.

Required secrets: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_ANON_KEY,
TEACHER_APP_ORIGIN (exact origin), TEACHER_RESUME_SCANNER_URL (HTTPS),
TEACHER_RESUME_SCANNER_KEY. The scanner must be owner-approved for personal data.
It accepts raw PDF/DOCX bytes and returns `{clean:true, validDocument:true,
sha256:"<lowercase SHA256>", contentType:"<verified MIME>"}` only after validating
PDF structure / DOCX XML package, decompression limits, no encryption/macros,
and malware. Missing, timeout, malformed or failed verification denies attachment.

POST multipart `file`, `revision` uploads after verified authentication, cooldown,
size and local PDF/DOCX structural preflight checks. Local ZIP checks bound declared
expansion and reject malformed offsets, overlap, encryption, macros, duplicates and
traversal. They do not replace scanner inspection of decompressed document content.
Scanner receipts are capped at 16 KiB and must match the actual file digest. Metadata attachment rechecks the profile revision under a lock.
POST JSON `{documentId}` downloads via fresh owner/Super Admin authorization.
No public or signed download URLs. Retention cleanup after five uploads and
scanner integration acceptance remain rollout blockers. Function tests must run
in a local/mock environment; do not deploy to test without owner approval.
