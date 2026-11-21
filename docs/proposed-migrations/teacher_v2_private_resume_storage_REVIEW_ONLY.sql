-- REVIEW ONLY / NOT EXECUTED. Proposed after teacher schema and server feature flags.
-- NEVER install without Preview backup + isolated restore, effective-privilege
-- inspection, policy-composition audit, authenticated role tests, owner approval.
-- The browser cannot generate, overwrite, read another user's, or finalize an
-- arbitrary object. The server issues an opaque per-document UUID and key.
BEGIN;
ALTER TABLE public.teacher_resume_documents ADD COLUMN upload_state text
 NOT NULL DEFAULT 'reserved' CHECK(upload_state IN ('reserved','uploaded'));
DO $resume_bucket$
BEGIN
 IF EXISTS(SELECT 1 FROM storage.buckets WHERE id='teacher-resumes-private') THEN
  IF EXISTS(SELECT 1 FROM storage.buckets
     WHERE id='teacher-resumes-private'
       AND (public IS DISTINCT FROM false OR file_size_limit IS DISTINCT FROM 5242880
         OR allowed_mime_types IS DISTINCT FROM
            ARRAY['application/pdf','application/vnd.openxmlformats-officedocument.wordprocessingml.document']::text[]))
  THEN RAISE EXCEPTION 'Existing resume bucket does not match private restrictions'; END IF;
 ELSE
  INSERT INTO storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
   VALUES('teacher-resumes-private','teacher-resumes-private',false,5242880,
     ARRAY['application/pdf','application/vnd.openxmlformats-officedocument.wordprocessingml.document']::text[]);
 END IF;
END $resume_bucket$;

CREATE OR REPLACE FUNCTION public.teacher_v2_resume_reserve(
 p_filename text,p_content_type text,p_size_bytes integer)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE v_id uuid := gen_random_uuid(); v_path text; v_ext text;
BEGIN
 IF auth.uid() IS NULL OR NOT private.teacher_v2_feature_enabled('resume_uploads')
    OR NOT private.teacher_v2_feature_enabled('registration') THEN
  RAISE EXCEPTION 'Private teacher resumes disabled' USING ERRCODE='42501';
 END IF;
 -- Serialize concurrent reservations so a teacher cannot bypass the quota.
 PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(auth.uid()::text,0));
 IF NOT EXISTS(SELECT 1 FROM public.teacher_profiles p
     WHERE p.user_id=auth.uid() AND p.status='pending' AND p.submitted_at IS NULL) THEN
  RAISE EXCEPTION 'An editable teacher registration draft is required' USING ERRCODE='42501';
 END IF;
 IF (SELECT count(*) FROM public.teacher_resume_documents
     WHERE teacher_user_id=auth.uid())>=5 THEN
  RAISE EXCEPTION 'Maximum five private resume records; request administrator review' USING ERRCODE='22023';
 END IF;
 IF p_filename IS NULL OR char_length(btrim(p_filename)) NOT BETWEEN 5 AND 180
   OR position('/' in p_filename)>0 OR position(chr(92) in p_filename)>0
   OR position('..' in p_filename)>0
   OR p_size_bytes NOT BETWEEN 1 AND 5242880 THEN
  RAISE EXCEPTION 'Invalid resume metadata' USING ERRCODE='22023';
 END IF;
 IF lower(p_filename) LIKE '%.pdf' AND p_content_type='application/pdf'
 THEN v_ext:='.pdf';
 ELSIF lower(p_filename) LIKE '%.docx' AND p_content_type='application/vnd.openxmlformats-officedocument.wordprocessingml.document'
 THEN v_ext:='.docx';
 ELSE RAISE EXCEPTION 'Only PDF and DOCX allowed' USING ERRCODE='22023';
 END IF;
 v_path:=auth.uid()::text||'/'||v_id::text||v_ext;
 INSERT INTO public.teacher_resume_documents
  (id,teacher_user_id,storage_path,original_filename,content_type,size_bytes,upload_state)
 VALUES(v_id,auth.uid(),v_path,btrim(p_filename),p_content_type,p_size_bytes,'reserved');
 RETURN jsonb_build_object('document_id',v_id,'storage_path',v_path);
END $$;
REVOKE ALL ON FUNCTION public.teacher_v2_resume_reserve(text,text,integer)
 FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.teacher_v2_resume_reserve(text,text,integer)
 TO authenticated;

-- SECURITY DEFINER helper is intentionally private (outside REST exposed schemas).
-- Storage policies enforce ownership and both pending-draft / server flag gates.
CREATE OR REPLACE FUNCTION private.teacher_v2_resume_storage_allowed(p_path text,p_write boolean)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT auth.uid() IS NOT NULL
  AND private.teacher_v2_feature_enabled('resume_uploads')
  AND EXISTS(
   SELECT 1 FROM public.teacher_resume_documents d
   JOIN public.teacher_profiles p ON p.user_id=d.teacher_user_id
   WHERE d.teacher_user_id=auth.uid() AND d.storage_path=p_path
     AND (NOT p_write OR
       (d.upload_state='reserved' AND p.status='pending' AND p.submitted_at IS NULL))
     AND (p_write OR d.upload_state='uploaded')
  );
$$;
REVOKE ALL ON FUNCTION private.teacher_v2_resume_storage_allowed(text,boolean)
 FROM PUBLIC,anon,authenticated;
GRANT USAGE ON SCHEMA private TO authenticated;
GRANT EXECUTE ON FUNCTION private.teacher_v2_resume_storage_allowed(text,boolean)
 TO authenticated;

CREATE POLICY teacher_v2_resume_owner_insert ON storage.objects
 FOR INSERT TO authenticated WITH CHECK(
   bucket_id='teacher-resumes-private'
   AND private.teacher_v2_resume_storage_allowed(name,true));
CREATE POLICY teacher_v2_resume_owner_read ON storage.objects
 FOR SELECT TO authenticated USING(
   bucket_id='teacher-resumes-private'
   AND private.teacher_v2_resume_storage_allowed(name,false));
-- No UPDATE, DELETE, public URL or generalized Super Admin downloads.
-- An unfinished 'reserved' record is not readable via this owner SELECT rule.

CREATE OR REPLACE FUNCTION public.teacher_v2_resume_finalize(p_document_id uuid)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE v_record public.teacher_resume_documents; v_object storage.objects;
BEGIN
 IF auth.uid() IS NULL OR NOT private.teacher_v2_feature_enabled('resume_uploads')
    OR NOT private.teacher_v2_feature_enabled('registration') THEN
  RAISE EXCEPTION 'Private teacher resumes disabled' USING ERRCODE='42501';
 END IF;
 SELECT d.* INTO v_record FROM public.teacher_resume_documents d
  JOIN public.teacher_profiles p ON p.user_id=d.teacher_user_id
  WHERE d.id=p_document_id AND d.teacher_user_id=auth.uid()
    AND d.upload_state='reserved'
    AND p.status='pending' AND p.submitted_at IS NULL
  FOR UPDATE OF d;
 IF NOT FOUND THEN RAISE EXCEPTION 'Unreserved or stale resume' USING ERRCODE='42501'; END IF;
 SELECT * INTO v_object FROM storage.objects o
  WHERE o.bucket_id='teacher-resumes-private' AND o.name=v_record.storage_path
    AND o.owner_id=auth.uid()::text;
 IF NOT FOUND OR v_object.metadata IS NULL
    OR v_object.metadata->>'mimetype' IS DISTINCT FROM v_record.content_type
    OR coalesce(v_object.metadata->>'size','') !~ '^[0-9]{1,10}$'
    OR (v_object.metadata->>'size')::bigint IS DISTINCT FROM v_record.size_bytes THEN
  RAISE EXCEPTION 'Resume object not confirmed' USING ERRCODE='42501';
 END IF;
 UPDATE public.teacher_resume_documents SET upload_state='uploaded',uploaded_at=now()
  WHERE id=p_document_id AND teacher_user_id=auth.uid();
 INSERT INTO public.teacher_audit_events(actor_user_id,teacher_user_id,action,reason,details)
 VALUES(auth.uid(),auth.uid(),'resume.uploaded',
  'Teacher submitted private resume for verification',jsonb_build_object('document_id',p_document_id));
 RETURN true;
END $$;
REVOKE ALL ON FUNCTION public.teacher_v2_resume_finalize(uuid)
 FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.teacher_v2_resume_finalize(uuid) TO authenticated;
COMMIT;

-- SECURITY NOTE: Storage metadata is not proof of safe document contents.
-- PDF/DOCX signatures, Office ZIP structure, malware scan, and quarantine must
-- be checked by an independently controlled ingestion/verification process
-- BEFORE any reviewer opens a file or marks it 'verified'.
-- Background maintenance must expire orphan 'reserved' rows and private objects
-- under explicit service-owner control, not by granting client DELETE.
-- Inspect ALL overlapping permissive storage.objects policies: OR combinations
-- could defeat the owner policy. Test anon, ordinary admin, non-owner, forged keys,
-- type/size mismatch, stale draft, duplicate finalize and byte-level retrieval.
-- No Storage bucket, migration, document, feature flag or grant applied.
