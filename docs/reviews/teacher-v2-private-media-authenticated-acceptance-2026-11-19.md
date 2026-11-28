# Teacher v2 private media: runtime authorization acceptance (REVIEW ONLY)

**19 November 2026 — NO-GO for activation.** This is an executable-test *specification*, not evidence that any tests ran. PR #114 only. Never upload personal files or enable a bucket in this review. PR #109 remains read-only.

## Trust boundary

- Supabase Auth session identifies the caller. Client-provided `user_id`, `employee_id`, `bucket_id`, `storage_path`, file name, and MIME are **untrusted**. The server must derive ownership from `auth.uid()`, generate opaque object keys, and bind the media record to the authenticated teacher.
- Keep photo and resume buckets **private**. No public URLs, broad `storage.objects` SELECT policies, client-side service-role keys, or indefinite signed URLs. An approved reviewer must pass an independently verified server-side role check and purpose/audit requirement.
- For PDF/DOCX resumes: enforce extension, actual bytes/magic/content structure, strict size, quarantine/scanning and download authorization server-side. MIME and extension supplied by browser are not proof. Photos need image signature/decode, dimensions, size and content-type checks. Reject SVG and active content.
- Treat `storage.objects` policies as a whole: permissive OR policies can override the intended restriction. Verify both bucket and object RLS, direct and inherited privileges, and `SECURITY DEFINER` helpers. Do not assume a private bucket alone denies authenticated users.
- Do not infer photo persistence from the merged #116 local object URL demo. Permanent media storage and retrieval are not implemented/activated.

## Mandatory authenticated Preview matrix

All checks must use actual separate authenticated identities and real HTTP/Storage responses on a **separately approved, recoverable Preview test instance**. Keep feature flags OFF until security acceptance and separate approval. Use synthetic images/resumes only.

| Scenario | Required observation |
| --- | --- |
| Anonymous upload/read/list | Denied, no object existence or private path disclosed |
| Teacher A uploads own valid photo | Accepted only through authorized path; opaque server-generated key, private object, owner-bound metadata |
| Teacher A refreshes/re-authenticates | Own photo still visible; no browser-local object URL dependency |
| Teacher B guesses A's key | Download, list, overwrite, delete and metadata access all denied |
| Teacher A spoofs B's user ID or object key | Request denied or server ignores spoofed fields; no cross-user media write |
| Teacher A replaces own photo | Atomic ownership-preserving replacement, previous object retention/deletion per documented policy, no stale cache leak |
| Rejected or suspended teacher | Access follows explicitly approved retention policy; no accidental broad staff privilege |
| Reviewer with independently verified role | Scoped read only with audit evidence; non-reviewer admin denied |
| PDF valid / DOCX valid resume | Content verification and scanning outcome recorded; pending files not exposed as verified |
| Wrong magic, double extension, oversized, SVG, malformed archive, path traversal | All rejected without accessible orphan object |
| Concurrent upload / interrupted upload | Idempotent cleanup or explicit recoverable pending state; no duplicate metadata granting access |
| Revoked reviewer role / expired signed URL | Access denied after revocation/expiry, without reusable unrestricted URL |
| Direct `storage.objects` API access | Same denies as application UI; UI hiding buttons is not authorization |

## Evidence packet required before a GO decision

Record project ref, exact commit/SQL hashes, bucket configuration, effective grants and RLS/policy catalog snapshots, actor role IDs (redacted), test timestamp, endpoint, expected/actual HTTP status, resulting object/metadata state, audit event, and independent reviewer sign-off. Never attach real photos, resumes, tokens or signed URLs. Record denied tests as evidence too. Confirm a **successful disposable-target restore** before *any* Preview migration, privilege remediation or storage activation. A matching local dump hash is not restore evidence.

**STOP conditions:** missing restore evidence; effective anon/authenticated `public.user_roles` TRUNCATE; absent v2 RPCs; unauthorized storage list/read/write; missing negative tests; or absent explicit owner approval. No Preview/Production SQL, grants, Storage mutations, merge, deploy or publication is authorized by this document.
