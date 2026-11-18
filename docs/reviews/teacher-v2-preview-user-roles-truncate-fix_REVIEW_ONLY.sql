-- KSOL Preview role-table privilege hardening — REVIEW ONLY, DO NOT AUTO-APPLY.
-- Project: zgpkmfqioqvincmgyfpi.
-- Prerequisites: verified managed backup, disposable restore rehearsal, exact role inheritance
-- inspection, owner approval and a scheduled Preview maintenance/test window.
-- This script does not create teacher tables or touch legacy teacher grants.
-- Run only as an authorized database owner after separate approval.
BEGIN;
REVOKE TRUNCATE ON TABLE public.user_roles FROM anon, authenticated;
-- REFERENCES and TRIGGER privileges are not revoked here because their dependencies
-- have not been established; audit separately and remove only if confirmed unnecessary.
DO $$
BEGIN
  IF has_table_privilege('anon','public.user_roles','TRUNCATE')
     OR has_table_privilege('authenticated','public.user_roles','TRUNCATE') THEN
    RAISE EXCEPTION 'Effective TRUNCATE privilege remains; rollback and review inherited grants';
  END IF;
END $$;
COMMIT;
-- Follow-up read-only verification in a separate session:
-- SELECT role_name, has_table_privilege(role_name,'public.user_roles','TRUNCATE')
-- FROM (VALUES ('anon'),('authenticated')) AS roles(role_name);
-- Run authenticated regression tests for Super Admin role lookup and review RPCs.
