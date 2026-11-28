# Production recovery evidence and next isolated steps — 27 Nov 2026

## Observed evidence

- [Production Storage export run 46035189511](https://github.com/tcoe96096/krishansironline/actions/runs/46035189511): success; 63 objects; readback verified.
- [Independent Storage archive verification run 46036752643](https://github.com/tcoe96096/krishansironline/actions/runs/46036752643): success; 63 objects; service restore not verified.
- Administrator confirmed manual DB archive and disposable DB restore success. Storage metadata reconciliation run ID is still needed to verify its specific log marker.
- Weekly database and storage workflows are merged (#190 and #191); administrator reports opt-in variables enabled. Actual scheduled runs have not yet been observed.

## Local Storage payload restore (review-only until local target is verified)

New tool: scripts/recovery/restore-storage-to-local-supabase.mjs. It is not dispatched by GitHub Actions. It reads the encrypted archive manifest and payloads, checks object identity, inventory, size and SHA-256; creates only private buckets in an empty local Storage service; uploads without overwrite; reads every restored object and compares checksum. It only sends requests to the fixed loopback endpoint 127.0.0.1:54321 and refuses redirects. No live project credentials are needed. It uses the existing private encrypted rclone configuration and a local-only service key. Maximum individual object size 64 MiB, total archive cap 512 MiB.

Before running, an authorized administrator must confirm that the local Supabase stack is freshly created and disposable (not existing work), its Docker data and swap reside on encrypted storage, the API is local only (not forwarded to any remote service), and no external SMTP, webhooks, functions or telemetry containing restored data are configured. Do not use a public GitHub runner for decrypted production payloads. Keep the local service key out of chat, Git, command history and logs; set it privately in the local process environment. Set KSOL_LOCAL_STORAGE_RESTORE_ACK=RESTORE_TO_FRESH_ENCRYPTED_LOCAL_STACK_ONLY and KSOL_LOCAL_STORAGE_SERVICE_KEY to the fresh local stack's service-role credential. Set KSOL_LOCAL_STORAGE_ARCHIVE_RUN to the exact independently verified Storage archive directory name (including its trailing slash), matched with the selected database backup. Do not use the latest archive automatically. With Node 22 and rclone available, run node scripts/recovery/restore-storage-to-local-supabase.mjs from the reviewed repository. If a run fails, do not resume in the partially populated target: dispose of the local test stack securely with administrator approval. No automated deletion.

This only restores byte payloads using a real local Storage API. All buckets deliberately private, MIME defaults to application/octet-stream, and original ownership, per-bucket settings and access policies are NOT restored. Archive format currently lacks these attributes. The test also does not restore PostgreSQL into the same stack. A green result is not full service recovery.

## Auth and full recovery gates

Separate local Supabase stack rehearsal: restore compatible DB schema, data, roles and grants into a fresh isolated stack, reconcile schema versions and Auth provider settings with production, and use synthetic test accounts rather than real students' credentials. Prove authorized sign-in, token refresh and sign-out, expired/invalid token rejection, student-own vs other-student rows, teacher assigned vs unassigned class, admin-only operations and private Storage allow/deny. Keep external email/SMS disabled in the isolated target. Verify original Storage object metadata, MIME types, owner IDs and bucket/policy configuration without logging private data. No production or Preview writes. Full release gate remains NO_GO until real recovery and feature-specific authorization evidence exist. Record only sanitized run IDs, counts and pass/fail markers.
