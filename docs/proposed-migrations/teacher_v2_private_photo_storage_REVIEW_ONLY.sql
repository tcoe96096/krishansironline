-- REVIEW ONLY: never execute on Preview/Production before recoverable restore,
-- storage RLS policy-composition audit, actual JWT actor tests and owner approval.
-- Order: teacher schema + beta flags + read RPC, then this storage proposal.
-- The caller cannot choose a path; only <auth.uid()>/profile.webp is permitted.
BEGIN;
DO $photo_bucket$
BEGIN
 IF EXISTS(SELECT 1 FROM storage.buckets WHERE id='teacher-profile-photos-private') THEN
  IF EXISTS(SELECT 1 FROM storage.buckets WHERE id='teacher-profile-photos-private'
       AND (public IS DISTINCT FROM false
            OR file_size_limit IS DISTINCT FROM 3145728
            OR allowed_mime_types IS DISTINCT FROM ARRAY['image/webp']::text[])) THEN
   RAISE EXCEPTION 'Existing teacher photo bucket does not match private constraints';
  END IF;
 ELSE
  INSERT INTO storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
  VALUES('teacher-profile-photos-private','teacher-profile-photos-private',false,
         3145728,ARRAY['image/webp']::text[]);
 END IF;
END $photo_bucket$;

-- No caller-controlled teacher identity: derive the only allowed key from JWT.
-- p_write prevents altering photos after a teacher application is submitted.
CREATE OR REPLACE FUNCTION private.teacher_v2_private_photo_allowed(p_name text,p_write boolean)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT auth.uid() IS NOT NULL
    AND p_name=(auth.uid()::text||'/profile.webp')
    AND private.teacher_v2_feature_enabled('profile_photos')
    AND EXISTS (SELECT 1 FROM public.teacher_profiles p
                WHERE p.user_id=auth.uid()
                  AND (NOT p_write OR (p.status='pending' AND p.submitted_at IS NULL)));
$$;
REVOKE ALL ON FUNCTION private.teacher_v2_private_photo_allowed(text,boolean)
 FROM PUBLIC,anon,authenticated;
-- Private helper is not Data API-exposed. Grant exactly the invocation needed
-- by the authenticated Storage RLS policies; never grant the private flag writer.
GRANT USAGE ON SCHEMA private TO authenticated;
GRANT EXECUTE ON FUNCTION private.teacher_v2_private_photo_allowed(text,boolean)
 TO authenticated;

CREATE POLICY teacher_v2_photo_owner_read ON storage.objects
 FOR SELECT TO authenticated
 USING (bucket_id='teacher-profile-photos-private'
    AND private.teacher_v2_private_photo_allowed(name,false));
CREATE POLICY teacher_v2_photo_owner_insert ON storage.objects
 FOR INSERT TO authenticated
 WITH CHECK(bucket_id='teacher-profile-photos-private'
    AND private.teacher_v2_private_photo_allowed(name,true));
CREATE POLICY teacher_v2_photo_owner_update ON storage.objects
 FOR UPDATE TO authenticated
 USING (bucket_id='teacher-profile-photos-private'
    AND private.teacher_v2_private_photo_allowed(name,true))
 WITH CHECK(bucket_id='teacher-profile-photos-private'
    AND private.teacher_v2_private_photo_allowed(name,true));
-- Deliberately no delete, public link or cross-user reviewer policy.
COMMIT;

-- HARD STOP: inspect ALL preexisting storage.objects policies. Permissive
-- policies are OR-combined; an unrelated policy could accidentally open this
-- bucket. Reject activation if any broad SELECT/INSERT/UPDATE/DELETE path exists.
-- Actual owner / other teacher / anonymous / ordinary admin / Super Admin
-- session tests and returned object-byte tests are mandatory.
-- No real private photos or Storage objects have been uploaded by this file.
