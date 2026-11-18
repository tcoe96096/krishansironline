-- Teacher v2: audit effective function EXECUTE and default privileges. READ ONLY.
-- PUBLIC EXECUTE is PostgreSQL's default for newly created functions unless revoked.
-- Catalog evidence alone is NOT runtime authorization evidence.
WITH candidates AS (
 SELECT p.oid, n.nspname, p.proname, p.prosecdef, p.proacl,
        pg_catalog.pg_get_function_identity_arguments(p.oid) AS args,
        pg_catalog.pg_get_userbyid(p.proowner) AS owner_name
 FROM pg_catalog.pg_proc p
 JOIN pg_catalog.pg_namespace n ON n.oid=p.pronamespace
 WHERE n.nspname='public' AND p.proname LIKE 'teacher_v2_%'
)
SELECT c.proname,c.args,c.owner_name,c.prosecdef,
       c.proacl IS NULL AS implicit_default_acl,
       has_function_privilege('PUBLIC',c.oid,'EXECUTE') AS public_execute,
       has_function_privilege('anon',c.oid,'EXECUTE') AS anon_execute,
       has_function_privilege('authenticated',c.oid,'EXECUTE') AS authenticated_execute
FROM candidates c
ORDER BY c.proname,c.args;

-- Inspect default EXECUTE grants for future functions in public schema.
-- NULL defaclacl means built-in defaults apply; review both owner and schema scope.
SELECT pg_catalog.pg_get_userbyid(d.defaclrole) AS default_acl_owner,
       COALESCE(n.nspname,'(global)') AS schema_scope,
       d.defaclobjtype, d.defaclacl::text AS default_acl
FROM pg_catalog.pg_default_acl d
LEFT JOIN pg_catalog.pg_namespace n ON n.oid=d.defaclnamespace
WHERE d.defaclobjtype='f'
  AND (d.defaclnamespace=0 OR n.nspname='public')
ORDER BY default_acl_owner,schema_scope;

-- STOP: any unexpected PUBLIC/anon EXECUTE on privileged SECURITY DEFINER
-- functions; missing functions; unsafe role/owner/search_path; no real auth tests.
-- Never run REVOKE/GRANT or any DDL from this inventory.
