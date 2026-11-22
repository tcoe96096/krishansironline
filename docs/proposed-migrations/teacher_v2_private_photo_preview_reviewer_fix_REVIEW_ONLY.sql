-- PREVIEW migration correction only. Earlier first-pass reviewer policy
-- invoked a private flag helper directly, which authenticated cannot execute.
-- Keep the original flag helper privileged; expose only the narrow reviewer gate.
BEGIN;
CREATE OR REPLACE FUNCTION private.teacher_v2_superadmin_photo_read_allowed()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT auth.uid() IS NOT NULL
   AND private.teacher_v2_feature_enabled('profile_photos')
   AND public.is_super_admin();
$$;
REVOKE ALL ON FUNCTION private.teacher_v2_superadmin_photo_read_allowed()
 FROM PUBLIC,anon,authenticated,service_role;
GRANT USAGE ON SCHEMA private TO authenticated;
GRANT EXECUTE ON FUNCTION private.teacher_v2_superadmin_photo_read_allowed()
 TO authenticated;

DROP POLICY IF EXISTS teacher_v2_photo_super_admin_review ON storage.objects;
CREATE POLICY teacher_v2_photo_super_admin_review ON storage.objects
 FOR SELECT TO authenticated
 USING (
  bucket_id='teacher-profile-photos-private'
  AND private.teacher_v2_superadmin_photo_read_allowed()
 );
COMMIT;
