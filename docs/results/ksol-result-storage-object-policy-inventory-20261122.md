# Verified Storage object policy inventory — 2026-11-22

Read-only catalog query in both Preview and Production:
`SELECT policyname,cmd,roles,qual,with_check FROM pg_policies WHERE schemaname='storage' AND tablename='objects' ORDER BY policyname;`

## Findings
Both environments returned 10 `storage.objects` policies. Every policy predicate is explicitly scoped to one of:
- `visual-studio-media` (4 policies)
- `teacher-profile-photos-private` (4 policies)
- `teacher-resumes-private` (2 policies)

No policy in either returned inventory mentions `result-cards-private`; no unscoped `storage.objects` client policy was present. Production and Preview have different Studio policy expressions; do not alter either. This is a **catalog finding**, not an authenticated JWT or service-role access test.

## Go/no-go
- Private result PDF bucket candidate remains review-only; no DB writes.
- Do not add a broad `storage.objects` policy or reuse other buckets.
- Before deployment, verify exact JWT roles, service-role behavior, bucket creation conflict, signed URL TTL, revoke behavior, and real negative tests.
- Require independent backup+restore evidence and separate owner approval for migrations and live merge.
