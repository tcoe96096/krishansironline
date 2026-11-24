# Result Card PDF storage gap — verified read-only 2026-11-22

## Catalog finding
Read-only `storage.buckets` checks in both Preview and Production returned only:
- `teacher-profile-photos-private` (private)
- `teacher-resumes-private` (private)
- `visual-studio-media` (private)

**No dedicated Result Card PDF bucket exists** in either environment as of this check. Do not reuse Teacher or Studio buckets for results.

## Required private storage contract
1. Propose `result-cards-private` bucket, `public=false`, PDF-only MIME, reviewed file-size cap.
2. Server-side upload only after authenticated admin authorization and verified immutable approved result version. Never put Supabase service-role key in browser.
3. Object path must be opaque and bound to `attempt_id`, `result_version` and a stored SHA-256 digest; prevent cross-student enumeration.
4. Generate short-lived download access only after rechecking `ksol_can_view_released_result(attempt_id,version)` against current DB state; do not cache URLs across revoke.
5. Revocation blocks **new** access. Previously downloaded PDFs or already issued URLs cannot be retroactively recalled; define URL TTL and revocation policy.
6. Avoid public bucket policies, broad `storage.objects` SELECT and direct client-signed URL generation.
7. Integration tests: student A vs B, anonymous, inactive, revoked, wrong version, expired URL, concurrent revoke/download.
8. Audit PDF generation and access without logging signed URLs, credentials or private student content.

**NO-GO:** No storage bucket, policy or edge function created. This is an implementation requirement for a later approved migration and deployment.
