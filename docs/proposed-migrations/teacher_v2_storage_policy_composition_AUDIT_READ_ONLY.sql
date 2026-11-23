-- REVIEW ONLY / READ ONLY. Do not treat results as a permission to activate.
-- Operator must independently verify Preview project ID zgpkmfqioqvincmgyfpi.
-- Catalog inspection alone cannot prove real JWT authorization.
-- Inventory every Storage policy, not merely policies named "teacher".
-- PostgreSQL permissive policies are OR-combined: a broad existing policy can
-- bypass an otherwise restrictive teacher-owned policy.
WITH policy_inventory AS (
 SELECT p.schemaname, p.tablename, p.policyname, p.permissive,
        p.roles, p.cmd, p.qual, p.with_check,
        (p.permissive = 'PERMISSIVE'
         AND (p.cmd IN ('ALL','SELECT','INSERT','UPDATE','DELETE'))
         AND (p.roles && ARRAY['public','anon','authenticated']::name[])
        ) AS requires_manual_overlap_review
 FROM pg_catalog.pg_policies AS p
 WHERE p.schemaname='storage' AND p.tablename='objects'
), bucket_inventory AS (
 SELECT b.id, b.public, b.file_size_limit, b.allowed_mime_types
 FROM storage.buckets AS b
 WHERE b.id IN ('teacher-profile-photos-private','teacher-resumes-private')
)
SELECT 'POLICY'::text AS record_type, policyname AS identifier,
       jsonb_build_object('command',cmd,'permissive',permissive,
         'roles',roles,'using',qual,'with_check',with_check,
         'requires_manual_overlap_review',requires_manual_overlap_review) AS details
FROM policy_inventory
UNION ALL
SELECT 'BUCKET', id,
       jsonb_build_object('public',public,'file_size_limit',file_size_limit,
         'allowed_mime_types',allowed_mime_types)
FROM bucket_inventory
ORDER BY record_type, identifier;
-- HARD STOP if any permissive policy can reach either private bucket without
-- the authenticated owner's exact object key and intended workflow state.
-- Also inspect grants, roles, RLS enabled state and any service-role bypass.
-- Required acceptance: real anon, owner, other teacher, admin and reviewer
-- sessions; SELECT/INSERT/UPDATE/DELETE plus object-byte retrieval, not only
-- policy names. Empty inventory is NOT a PASS: absent buckets/RPCs block.
-- No DDL, DML, REVOKE, GRANT or feature activation is performed by this SELECT.
