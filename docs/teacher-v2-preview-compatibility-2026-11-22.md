# Teacher v2 Preview compatibility check (read-only)

Date: 2026-11-22. Project: `zgpkmfqioqvincmgyfpi`.

## Dependencies verified
- `private` schema exists.
- `public.result_staff_grants` exists.
- `public.study_material_items` exists.
- `public.teacher_enrollment_requests` exists (legacy).
- `public.teacher_profiles` and `public.teacher_assignments` do not exist.
- Existing `study_material_items` policies include the exact six names referenced by the proposed Teacher v2 integration migration: `Owner may delete only own drafts`, `Owner or super admin reads review drafts`, `Scoped editors create drafts`, `Scoped editors update only own drafts`, `Scoped staff submit own drafts for review`, and the separately retained `Published material is readable`.
- Existing `result_staff_grants` has separate select/insert/delete/update policies; review legacy grant guard interaction before applying migration.

## What this proves / does not prove
The key legacy tables and policy names required by the integration proposal are present, so a preliminary dependency check passes. This does **not** prove migration correctness, backups, trigger behavior, RLS security, data compatibility, or deployability. No SQL changes were made.

## Next gate
Obtain restore evidence, validate all migration dependencies, run the full suite in an isolated restored Preview environment, verify identity-based RLS with independent sessions, and confirm a rollback plan before any activation.
