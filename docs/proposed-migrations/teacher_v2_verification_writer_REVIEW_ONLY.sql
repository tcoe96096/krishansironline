-- REVIEW ONLY. NOT EXECUTED. Requires teacher_profiles,
-- teacher_identity_verifications and public.is_super_admin().
-- Privileged verification recording; no client EXECUTE grants in this file.
BEGIN;
CREATE OR REPLACE FUNCTION public.teacher_v2_record_identity_verification(
 p_teacher_user_id uuid,p_profile_revision integer,
 p_evidence_reference text,p_reason text
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE v_profile public.teacher_profiles; v_id uuid;
BEGIN
 IF auth.uid() IS NULL OR COALESCE(public.is_super_admin(),false) IS NOT TRUE
    OR auth.uid()=p_teacher_user_id THEN
  RAISE EXCEPTION 'Independent Super Admin required' USING ERRCODE='42501';
 END IF;
 IF p_profile_revision IS NULL OR p_profile_revision<1
    OR p_evidence_reference IS NULL
    OR char_length(btrim(p_evidence_reference)) NOT BETWEEN 12 AND 240
    OR p_reason IS NULL OR char_length(btrim(p_reason)) NOT BETWEEN 12 AND 1000 THEN
  RAISE EXCEPTION 'Invalid verification metadata' USING ERRCODE='22023';
 END IF;
 -- Same lock order as teacher_v2_review: advisory lock then profile row lock.
 PERFORM pg_catalog.pg_advisory_xact_lock(
   pg_catalog.hashtextextended(p_teacher_user_id::text,0));
 SELECT * INTO v_profile FROM public.teacher_profiles
   WHERE user_id=p_teacher_user_id FOR UPDATE;
 IF NOT FOUND OR v_profile.status<>'pending' OR v_profile.submitted_at IS NULL
    OR v_profile.revision<>p_profile_revision THEN
  RAISE EXCEPTION 'Application is not pending at this revision'
    USING ERRCODE='42501';
 END IF;
 -- Avoid creating multiple active attestations for the same revision.
 IF EXISTS (
   SELECT 1 FROM public.teacher_identity_verifications
   WHERE teacher_user_id=p_teacher_user_id
     AND profile_revision=p_profile_revision AND revoked_at IS NULL
 ) THEN
  RAISE EXCEPTION 'Active verification already exists' USING ERRCODE='23505';
 END IF;
 INSERT INTO public.teacher_identity_verifications(
   teacher_user_id,profile_revision,verified_by,evidence_reference,
   verification_reason
 ) VALUES (
   p_teacher_user_id,p_profile_revision,auth.uid(),
   btrim(p_evidence_reference),btrim(p_reason)
 ) RETURNING id INTO v_id;
 INSERT INTO public.teacher_audit_events(
   actor_user_id,teacher_user_id,action,reason,details
 ) VALUES (
   auth.uid(),p_teacher_user_id,'identity.verified',btrim(p_reason),
   jsonb_build_object('verification_id',v_id,'profile_revision',p_profile_revision)
 );
 RETURN v_id;
END $$;
REVOKE ALL ON FUNCTION public.teacher_v2_record_identity_verification(uuid,integer,text,text)
 FROM PUBLIC,anon,authenticated;
COMMIT;
-- RELEASE GATES:
-- The actor must actually inspect independent identity evidence; this
-- function cannot prove real-world verification merely from supplied text.
-- Evidence reference must be opaque and non-sensitive; no raw ID numbers.
-- Separate authenticated grant plan, RLS negative tests, concurrency tests,
-- audit review and disposable restore proof required before deployment.
