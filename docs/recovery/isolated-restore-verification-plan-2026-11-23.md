# Isolated restore verification — 23 November 2026

## Verified starting point
Preview encrypted cloud backup Run #8 reached READBACK_INTEGRITY_OK. This verifies archive readback/integrity, **not** a restored database. Full restore remains NOT_VERIFIED and release NO_GO.

## Safety boundary
- Do not restore into Production or the existing Preview database.
- Never place decrypted backup bytes, credentials, student data or database dumps in GitHub artifacts/logs.
- Require a fresh, disposable and isolated target before any restore. Explicitly verify target identifiers differ from Production `vsqwlkqqsxcehvdsdbna` and Preview `zgpkmfqioqvincmgyfpi`.
- Do not enable scheduled destructive restore jobs.
- A plain PostgreSQL runner may not have Supabase extensions, `auth.uid()`, storage or auth services; failures there cannot prove Supabase incompatibility and successes cannot prove full Supabase recovery.

## Proposed staged verification
1. Create an isolated disposable PostgreSQL service in a dedicated manually triggered GitHub Actions job, with no Production or Preview connection strings or secrets.
2. Exercise a **synthetic** PostgreSQL archive end-to-end first: dump, list, restore, check table/row counts and cleanup. This validates the test harness only, not the encrypted cloud backup.
3. For the real encrypted backup, design an authorized, one-time encrypted retrieval with strict no-plaintext-artifact and no-log controls, preflight destination isolation, and explicit permission before reading actual user data into the disposable runner. Do not implement this step until security and access are reviewed.
4. Verify restored schemas, relations, constraints and representative non-sensitive checks. Record evidence without user data.
5. For FULL recovery, separately verify Supabase-compatible extensions, Auth, Storage file objects (not just metadata), RLS and authenticated application flows in a truly isolated Supabase environment.

## Exit criteria
Keep `full restore: NOT_VERIFIED` and `release: NO_GO` until an actual authorized restore and complete verification succeed. No production release is authorized by this plan.
