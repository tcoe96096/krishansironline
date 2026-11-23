# Real encrypted backup restore — isolated preflight (23 Nov 2026)

## Evidence
- Two manual synthetic PostgreSQL 18 smoke runs (#1 and #2) showed green success on the owner's Actions screen. This validates only the synthetic harness.
- Preview encrypted backup previously reached READBACK_INTEGRITY_OK and READABLE_ARCHIVE_ONLY. It is not a full restore.
- No real database restore has been executed or verified by this change.

## Non-negotiable isolation
1. Never use the production project `vsqwlkqqsxcehvdsdbna` or existing preview project `zgpkmfqioqvincmgyfpi` as a restore target.
2. Provision a fresh disposable target with a unique ID and separate credentials, isolated from production and preview. Validate the target identity *before* any write.
3. Do not put decrypted dumps, credentials, SQL rows or rclone configuration into GitHub logs, PRs or artifacts. Prefer memory-only streams; limit retention and clean up after execution.
4. Source encrypted backup object must be explicitly selected and immutable for the verification attempt. Record only non-sensitive integrity metadata.
5. No restore job should run on push, PR, or schedule. Manual approval is required for the real-data step.

## Implementation checkpoints
- [ ] Confirm target type: PostgreSQL-only smoke target or isolated Supabase project. PostgreSQL-only cannot prove full Supabase recovery.
- [ ] Define one-time credential scope and secure encrypted object retrieval. Avoid passing source database credentials into the restore job; reading the existing encrypted backup does not require them.
- [ ] Check exact destination host, database and project identity against the two protected project IDs. Fail closed if uncertain.
- [ ] Inspect archive list and extension requirements without logging user data.
- [ ] Run restore with strict error handling, no unsafe ownership changes, and destination-only credentials.
- [ ] Verify schema, table counts, constraints, RLS policies and application-specific functions without exposing row data.
- [ ] In a separately isolated Supabase environment, verify Auth, Storage object bytes and authenticated workflows.
- [ ] Capture sanitized evidence, cleanup temporary files and terminate the disposable target after verification.

## Release decision
Until a complete authorized restore and application-level recovery are proven:
`REAL_RESTORE=NOT_RUN`
`FULL_SUPABASE_RESTORE=NOT_VERIFIED`
`RELEASE_GATE=NO_GO`

This document is a preparation checklist, not evidence that a restore ran.