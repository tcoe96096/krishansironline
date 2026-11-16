-- REVIEW ONLY. NOT EXECUTED. No bucket is created or activated by this proposal.
-- Deploy service only after private bucket and scanner acceptance is separately approved.
BEGIN;
ALTER TABLE public.teacher_profiles ADD COLUMN resume_upload_after timestamptz;
ALTER TABLE public.teacher_resume_documents ADD COLUMN sha256 text CHECK (sha256 ~ '^[a-f0-9]{64}$');
CREATE OR REPLACE FUNCTION public.teacher_v2_reserve_resume(p_user_id uuid,p_revision integer)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
 UPDATE public.teacher_profiles SET resume_upload_after=now()+interval '1 minute' WHERE user_id=p_user_id AND revision=p_revision AND status='pending' AND submitted_at IS NULL AND (resume_upload_after IS NULL OR resume_upload_after<=now());
 IF NOT FOUND THEN RAISE EXCEPTION 'Upload not permitted'; END IF;
 RETURN true;
END $$;
CREATE OR REPLACE FUNCTION public.teacher_v2_finalize_resume(p_user_id uuid,p_revision integer,p_path text,p_filename text,p_content_type text,p_size integer,p_sha256 text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE p public.teacher_profiles; v_id uuid;
BEGIN
 SELECT * INTO p FROM public.teacher_profiles WHERE user_id=p_user_id FOR UPDATE;
 IF NOT FOUND OR p.status<>'pending' OR p.submitted_at IS NOT NULL OR p_revision IS DISTINCT FROM p.revision THEN RAISE EXCEPTION 'Profile changed during upload'; END IF;
 IF p_path NOT LIKE p_user_id::text||'/%' OR p_path ~ '(^/|\.\.|//)' OR p_sha256 !~ '^[a-f0-9]{64}$' THEN RAISE EXCEPTION 'Invalid verified object'; END IF;
 -- One current resume; old objects are private and need owner-approved retention cleanup.
 IF (SELECT count(*) FROM public.teacher_resume_documents WHERE teacher_user_id=p_user_id)>=5 THEN RAISE EXCEPTION 'Resume limit reached'; END IF;
 INSERT INTO public.teacher_resume_documents(teacher_user_id,storage_path,original_filename,content_type,size_bytes,verification_status,sha256)
 VALUES(p_user_id,p_path,p_filename,p_content_type,p_size,'verified',p_sha256) RETURNING id INTO v_id;
 UPDATE public.teacher_profiles SET revision=revision+1,updated_at=now() WHERE user_id=p_user_id;
 INSERT INTO public.teacher_audit_events(actor_user_id,teacher_user_id,action,reason,details) VALUES(p_user_id,p_user_id,'resume.verified','Private resume verified and attached',jsonb_build_object('document_id',v_id,'sha256',p_sha256));
 RETURN v_id;
END $$;
CREATE OR REPLACE FUNCTION public.teacher_v2_resume_path(p_document_id uuid)
RETURNS text LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
DECLARE v_path text;
BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Authentication required' USING ERRCODE='42501'; END IF;
 SELECT storage_path INTO v_path FROM public.teacher_resume_documents WHERE id=p_document_id AND verification_status='verified' AND (teacher_user_id=auth.uid() OR public.is_super_admin());
 IF v_path IS NULL THEN RAISE EXCEPTION 'Access denied' USING ERRCODE='42501'; END IF;
 RETURN v_path;
END $$;
REVOKE ALL ON FUNCTION public.teacher_v2_reserve_resume(uuid,integer),public.teacher_v2_finalize_resume(uuid,integer,text,text,text,integer,text),public.teacher_v2_resume_path(uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.teacher_v2_reserve_resume(uuid,integer),public.teacher_v2_finalize_resume(uuid,integer,text,text,text,integer,text) TO service_role;
GRANT EXECUTE ON FUNCTION public.teacher_v2_resume_path(uuid) TO authenticated;
-- Private bucket must have NO client storage policies. Only the verified service
-- uploads/downloads bytes. Server keys never enter frontend environment variables.
COMMIT;
