# Preview user_roles permissions — verified read-only findings (18 Nov 2026)

Target: `zgpkmfqioqvincmgyfpi` (`krishan-sir-lms-preview`).
Read-only `information_schema.role_table_grants` and `pg_proc` checks were performed. No database writes.

## Confirmed effective table grants
- `anon`: REFERENCES, TRIGGER, TRUNCATE.
- `authenticated`: SELECT, REFERENCES, TRIGGER, TRUNCATE.
- `service_role`: REFERENCES, TRIGGER, TRUNCATE.
- `postgres`: standard owner privileges including DELETE/INSERT/UPDATE.

The public roles' TRUNCATE privilege is a **high-priority security defect**: PostgreSQL TRUNCATE is not filtered by RLS. Never attempt a destructive proof-of-concept. REFERENCES/TRIGGER are additional least-privilege review items; their presence alone does not prove exploitation.

## Function exposure
- `public.is_super_admin()`: SECURITY DEFINER, anon EXECUTE=false, authenticated EXECUTE=true.
- `public.review_teacher_enrollment(...)`: SECURITY DEFINER, anon EXECUTE=false, authenticated EXECUTE=true.
- No `teacher_v2_%` functions returned from the inspected public schema.

## Proposed controlled correction — NOT EXECUTED
1. Confirm exact project, recent recoverable backup and disposable restore rehearsal.
2. Review privilege inheritance and whether existing integrations require REFERENCES/TRIGGER; preserve intended authenticated SELECT.
3. Obtain separate approval for a minimal privilege-revocation change. Do not grant broader privileges or change legacy teacher rows.
4. After approval, verify effective `has_table_privilege` results and run authenticated role/authorization regression tests.
5. Keep new Teacher v2 RPCs and feature flag OFF until the reviewed migration and acceptance gates pass.

This report is **evidence**, not a completed remediation, backup proof, or authorization to deploy.
