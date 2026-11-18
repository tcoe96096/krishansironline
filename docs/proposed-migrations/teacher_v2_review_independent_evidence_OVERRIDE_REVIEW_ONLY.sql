-- REVIEW ONLY; NOT EXECUTED. Requires the existing v2 schema, feature flags,
-- functions, lifecycle and teacher_v2_independent_verification_REVIEW_ONLY.sql.
-- Replaces the caller-controlled p_verified boolean with revision-bound
-- independently recorded verification evidence. No public EXECUTE grant.
BEGIN;
CREATE OR REPLACE FUNCTION public.teacher_v2_review(
 p_user_id uuid,p_revision integer,p_decision text,p_reason text,
 p_verified boolean,p_assignments jsonb
) RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE p public.teacher_profiles; s jsonb; v_id text;
BEGIN
 IF auth.uid() IS NULL OR NOT coalesce(public.is_super_admin(),false)
    OR auth.uid()=p_user_id THEN
   RAISE EXCEPTION 'Independent Super Admin required' USING ERRCODE='42501';
 END IF;
 IF p_decision IS NULL OR p_decision NOT IN ('approve','reject')
    OR p_reason IS NULL OR char_length(btrim(p_reason)) NOT BETWEEN 12 AND 1000
    OR jsonb_typeof(p_assignments) IS DISTINCT FROM 'array'
    OR jsonb_array_length(p_assignments)>60 THEN
   RAISE EXCEPTION 'Invalid review' USING ERRCODE='22023';
 END IF;
 PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_user_id::text,0));
 SELECT * INTO p FROM public.teacher_profiles WHERE user_id=p_user_id FOR UPDATE;
 IF NOT FOUND OR p.status<>'pending' OR p.submitted_at IS NULL
    OR p_revision IS DISTINCT FROM p.revision THEN
   RAISE EXCEPTION 'Application changed; reload before review';
 END IF;
 -- Do not trust p_verified: legacy RPC signature retained only for compatibility.
 -- Independent evidence must be recorded by a separately reviewed privileged
 -- verification workflow, tied to this exact application revision.
 IF p_decision='approve' AND NOT EXISTS (
   SELECT 1 FROM public.teacher_identity_verifications v
   WHERE v.teacher_user_id=p_user_id AND v.profile_revision=p.revision
     AND v.revoked_at IS NULL AND v.verified_by<>p_user_id
 ) THEN
   RAISE EXCEPTION 'Independent identity verification record required'
     USING ERRCODE='42501';
 END IF;
 IF p_decision='approve' AND NOT private.teacher_v2_feature_enabled('registration') THEN
   RAISE EXCEPTION 'Teacher approval disabled' USING ERRCODE='42501';
 END IF;
 IF p_decision='approve' AND jsonb_array_length(p_assignments)=0 THEN
   RAISE EXCEPTION 'Approval requires at least one verified assignment' USING ERRCODE='22023';
 END IF;
 UPDATE public.teacher_profiles
 SET decision_reason=btrim(p_reason),reviewed_at=now(),
     status=CASE WHEN p_decision='approve' THEN 'approved' ELSE 'rejected' END,
     approved_by=CASE WHEN p_decision='approve' THEN auth.uid() END,
     approved_at=CASE WHEN p_decision='approve' THEN now() END,
     submitted_at=NULL,revision=revision+1,updated_at=now()
 WHERE user_id=p_user_id;
 IF p_decision='approve' THEN
   -- Existing v2 transition semantics: legacy grant closed only for this
   -- explicitly approved account. Never bulk-migrate old Class-10 teachers.
   IF to_regclass('public.result_staff_grants') IS NOT NULL THEN
     UPDATE public.result_staff_grants SET is_active=false
       WHERE user_id=p_user_id AND is_active;
   END IF;
   v_id:=public.teacher_v2_issue_employee_id(p_user_id);
   FOR s IN SELECT value FROM jsonb_array_elements(p_assignments) LOOP
     PERFORM public.teacher_v2_set_assignment(
       p_user_id,s->>'classLevel',s->>'subject',s->>'workType','grant',p_reason);
   END LOOP;
 END IF;
 INSERT INTO public.teacher_audit_events(actor_user_id,teacher_user_id,action,reason,details)
 VALUES(auth.uid(),p_user_id,'application.'||p_decision,p_reason,
        jsonb_build_object('revision',p_revision,'assignments',p_assignments,
                           'independent_verification_required',p_decision='approve'));
 RETURN v_id;
END $$;
REVOKE ALL ON FUNCTION public.teacher_v2_review(uuid,integer,text,text,boolean,jsonb)
 FROM PUBLIC,anon,authenticated;
COMMIT;
-- RELEASE BLOCKERS: verification-writer SQL is proposed separately but not deployed;
-- no approved authenticated EXECUTE grants; no real role/runtime tests;
-- no demonstrated recoverable Preview backup/restore.
-- p_verified remains in the signature but is intentionally ignored.
