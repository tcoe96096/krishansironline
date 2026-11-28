-- Teacher v2 media storage effective privilege audit. READ ONLY.
-- Catalog privileges are NOT proof of object authorization; authenticated runtime tests still required.
-- Checks role inheritance (not merely direct information_schema grants).
SELECT r.rolname AS principal,
       n.nspname AS schema_name,
       c.relname AS table_name,
       has_schema_privilege(r.oid,n.oid,'USAGE') AS schema_usage,
       has_table_privilege(r.oid,c.oid,'SELECT') AS effective_select,
       has_table_privilege(r.oid,c.oid,'INSERT') AS effective_insert,
       has_table_privilege(r.oid,c.oid,'UPDATE') AS effective_update,
       has_table_privilege(r.oid,c.oid,'DELETE') AS effective_delete,
       has_table_privilege(r.oid,c.oid,'TRUNCATE') AS effective_truncate,
       c.relrowsecurity AS rls_enabled,
       c.relforcerowsecurity AS rls_forced
FROM pg_catalog.pg_roles AS r
CROSS JOIN pg_catalog.pg_class AS c
JOIN pg_catalog.pg_namespace AS n ON n.oid=c.relnamespace
WHERE r.rolname IN ('anon','authenticated')
  AND n.nspname='storage'
  AND c.relname IN ('objects','buckets')
  AND c.relkind IN ('r','p')
ORDER BY principal,table_name;

-- Explicit and inherited role memberships that can expand storage access.
SELECT member_role.rolname AS member_name,
       parent_role.rolname AS granted_role,
       m.admin_option,
       m.inherit_option,
       m.set_option
FROM pg_catalog.pg_auth_members AS m
JOIN pg_catalog.pg_roles AS member_role ON member_role.oid=m.member
JOIN pg_catalog.pg_roles AS parent_role ON parent_role.oid=m.roleid
WHERE member_role.rolname IN ('anon','authenticated')
ORDER BY member_name,granted_role;

-- Inspect object ownership and RLS; owner bypass and SECURITY DEFINER must be reviewed.
SELECT n.nspname AS schema_name,c.relname AS table_name,
       pg_catalog.pg_get_userbyid(c.relowner) AS table_owner,
       c.relrowsecurity AS rls_enabled,c.relforcerowsecurity AS rls_forced
FROM pg_catalog.pg_class AS c
JOIN pg_catalog.pg_namespace AS n ON n.oid=c.relnamespace
WHERE n.nspname='storage' AND c.relname IN ('objects','buckets')
  AND c.relkind IN ('r','p')
ORDER BY table_name;

-- This query intentionally performs no storage writes or signed-URL generation.
