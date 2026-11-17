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

## Private bucket provisioner (review only)

`docs/proposed-migrations/teacher_management_v2_resume_bucket_REVIEW_ONLY.sql` now
documents a fail-closed, **not executed** bucket provisioner. It requires the
approved v2 resume metadata function, rejects unreviewed client Storage object
policies, configures `teacher-resumes-private` as private with a 5 MiB limit
and exactly PDF/DOCX MIME allowlist, then verifies the resulting configuration.
No `storage.objects` rows/policies are created or changed. Use Storage API
for bytes, never direct SQL against object metadata.

Before enabling uploads on an independently approved Preview deployment:
1. Install and validate the v2 core + resume schema without opening feature gates.
2. Provision and verify the bucket; recheck direct `anon` / `authenticated`
   Storage LIST/GET/POST/DELETE denial for arbitrary object paths.
3. Configure and test the independent HTTPS document scanner with *test files*
   only, including failure/timeout, malicious/malformed file rejection and
   matching cryptographic digest receipts. Do not expose scanner credentials
   or server keys to the browser.
4. Deploy the `teacher-resume` function only after positive/negative owner,
   Super Admin and unrelated-user tests; confirm orphan cleanup and retention.
5. Then, and only then, open the server-side `resume_uploads` flag and
   publish the reviewed frontend flag. Missing any dependency must fail closed.

This file is a proposal, **not** evidence that storage/scanning is live.
