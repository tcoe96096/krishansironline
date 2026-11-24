# Production recovery preparation — 24 November 2026

## Scope and status

- Real Preview isolated recovery run #20 succeeded on main commit 0e91999. This is database restore and scoped exam catalog evidence, not full Auth/Storage recovery.
- Read-only Production inventory on 24 November: 5 storage buckets, 63 object metadata rows, 13 submitted exam attempts, 0 active exams. Preview has 5 buckets and 0 storage object metadata rows. Counts are observations, not a backup manifest.
- Production database and Storage are unchanged. Do not turn on the live exam autosave flag on the basis of Preview recovery.
- No new paid project or service is authorized.

## Separate Production PostgreSQL archive

The manual workflow `.github/workflows/ksol-production-cloud-encrypted-backup.yml` is disabled unless the owner explicitly enables `KSOL_PRODUCTION_BACKUP_ENABLED=true`, uses main, and supplies `BACKUP_PRODUCTION_READ_ONLY`. It reuses the verified encrypted streaming implementation, validates the exact Production project reference, and writes only to the private crypt remote's production namespace. The existing Preview workflow and its secrets are unchanged. No schedules, PR runs, restore, source writes or deletion.

After review and merge, the authorized owner must configure distinct Production database connection values privately in the repository's protected Actions secrets, never in chat, issue text, screenshots, or Git files. Required secret names: KSOL_PRODUCTION_DB_HOST, KSOL_PRODUCTION_DB_PORT, KSOL_PRODUCTION_DB_USER, KSOL_PRODUCTION_DB_NAME, KSOL_PRODUCTION_DB_PASSWORD. Use trusted Supabase connection details and TLS. Reuse the already configured private encrypted cloud remote only if authorization, retention, privacy and quota are adequate. Restrict repository administration and workflow changes; do not enable if security requirements are not satisfied. Archive readback is not restore proof. The Preview-only restore workflow is intentionally not repurposed automatically.

## Production Storage recovery

PostgreSQL archives contain Storage metadata, not file payloads. Before any live release, establish an authorized separate private encrypted export of object bytes using Supabase-supported Storage download or S3 tooling, scoped to the Production project. Inventory all buckets and objects using private metadata; reconcile object keys, byte lengths, and cryptographic digests with a readback of each encrypted object. Keep manifests encrypted too. Never expose filenames, student data, credentials, decrypted bytes, or signed URLs in public workflow logs or Git. Do not make private buckets public for recovery. An object count alone is not proof; no Storage download or backup has been performed. A separately isolated, authorized restore must prove bytes and access boundaries. Auth provider settings, role/grant reconciliation, authenticated login and positive/negative RLS runtime checks remain separate.

## Release gate

Production archive verification, isolated Production restore, Storage bytes reconciliation and runtime Auth/authorization evidence remain outstanding. No database migration, feature flag activation, production account creation, or live deployment is authorized by this preparation. Follow the existing exam release runbook. Record only sanitized evidence in the repository.
