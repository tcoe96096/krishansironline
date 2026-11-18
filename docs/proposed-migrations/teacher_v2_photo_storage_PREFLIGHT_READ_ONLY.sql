-- Teacher v2 persistent profile photo preflight. READ ONLY; do not upload or modify.
-- This is a catalog inventory, not a successful authenticated access test.
-- Photo must be private, stored under server-controlled per-user object keys,
-- and readable by its owner and explicitly authorized reviewers only.
SELECT b.id AS bucket_id, b.public, b.file_size_limit, b.allowed_mime_types
FROM storage.buckets AS b
WHERE b.id ILIKE '%teacher%' OR b.id ILIKE '%photo%' OR b.id ILIKE '%avatar%'
ORDER BY b.id;

-- Inspect ALL object policies: permissive policies can combine to broaden access.
-- Check both USING and WITH CHECK, and ensure every policy is bucket-scoped.
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies
WHERE schemaname='storage' AND tablename='objects'
ORDER BY policyname;

-- Storage object table privileges, including potentially broad PUBLIC grants.
SELECT grantee, privilege_type, is_grantable
FROM information_schema.role_table_grants
WHERE table_schema='storage' AND table_name='objects'
  AND grantee IN ('anon','authenticated','PUBLIC')
ORDER BY grantee, privilege_type;

-- Inspect existing teacher photo metadata columns without exposing photo contents.
SELECT table_schema, table_name, column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema='public'
  AND table_name IN ('teacher_profiles','teacher_enrollment_requests')
  AND (column_name ILIKE '%photo%' OR column_name ILIKE '%avatar%'
       OR column_name ILIKE '%image%' OR column_name ILIKE '%storage%')
ORDER BY table_name,column_name;

-- Acceptance (not established by catalog reads):
-- 1. Private bucket with strict image MIME, size and magic-byte verification.
-- 2. No public URL or unrestricted signed URL; no browser service-role secret.
-- 3. Teacher may upload/read only own photo; other teachers/students/anon denied.
-- 4. Admin access requires independently verified role and audited purpose.
-- 5. Rejected/suspended access and replacement/deletion semantics reviewed.
-- 6. Photo captured during registration persists and renders after login.
-- 7. Positive/negative authenticated tests and recovery evidence required.
