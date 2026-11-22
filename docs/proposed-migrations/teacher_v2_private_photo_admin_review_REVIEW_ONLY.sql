-- KSOL Teacher v2: reviewer photograph is private, NEVER public.
-- REVIEW FIRST. Apply only after the owner-only Storage policy, RLS and role tests.
-- Existing teacher-photo bucket MUST already exist and be private.
BEGIN;
DO $preflight$
BEGIN
 IF NOT EXISTS(
  SELECT 1 FROM storage.buckets
   WHERE id='teacher-profile-photos-private'
     AND public=false AND file_size_limit=3145728
     AND allowed_mime_types=ARRAY['image/webp']::text[]
 ) THEN
  RAISE EXCEPTION 'Private Teacher photo bucket constraints missing';
 END IF;
 IF to_regprocedure('public.is_super_admin()') IS NULL THEN
  RAISE EXCEPTION 'Trusted Super Admin predicate missing';
 END IF;
 IF EXISTS(
  SELECT 1 FROM pg_policies
  WHERE schemaname='storage' AND tablename='objects'
    AND policyname='teacher_v2_photo_super_admin_review'
 ) THEN
  RAISE EXCEPTION 'Existing Super Admin photo policy must be reviewed before replacement';
 END IF;
END $preflight$;

-- A privileged reviewer may download the exact photo that accompanies an
-- application being independently verified. The UI never signs or publishes it.
CREATE POLICY teacher_v2_photo_super_admin_review ON storage.objects
 FOR SELECT TO authenticated
 USING (
  bucket_id='teacher-profile-photos-private'
  AND public.is_super_admin()
 );
COMMIT;

-- RLS controls the object bytes: ordinary admins and other teachers are denied.
-- DO NOT allow generalized Storage WRITE/DELETE via this policy.
-- Audit any future storage.objects policy: permissive rules OR together.
