-- Teacher v2 resume storage security preflight; READ ONLY, no mutations.
-- Run against explicitly identified Preview only after review. No resume upload is performed.
-- Absence of a bucket is expected before installation and must not be called a pass.
SELECT b.id AS bucket_id, b.public, b.file_size_limit,
       b.allowed_mime_types
FROM storage.buckets AS b
WHERE b.id ILIKE '%teacher%' OR b.id ILIKE '%resume%'
ORDER BY b.id;

-- Inspect all storage.objects RLS policies, including permissive OR combinations.
-- A policy for another bucket may still affect resumes if it has no bucket predicate.
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies
WHERE schemaname = 'storage' AND tablename = 'objects'
ORDER BY policyname;

-- Storage object RLS cannot compensate for public bucket access.
-- Verify object privileges independently of policy text.
SELECT grantee, privilege_type, is_grantable
FROM information_schema.role_table_grants
WHERE table_schema = 'storage' AND table_name = 'objects'
  AND grantee IN ('anon','authenticated','PUBLIC')
ORDER BY grantee, privilege_type;

-- Manual acceptance: private bucket, PDF-only validated server-side,
-- bounded size, own-path write/read, authorized admin review, no cross-user
-- reads/overwrites, no public signed URLs, and no service-role browser secret.
-- These catalog reads are NOT authenticated positive/negative runtime tests.
