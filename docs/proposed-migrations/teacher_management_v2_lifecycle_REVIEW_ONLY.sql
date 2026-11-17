-- REVIEW ONLY. NOT EXECUTED. Owner approval required before any activation.
-- Order: schema, profile_rpc, functions, lifecycle, integration. No automatic migration.
BEGIN;
-- Optional legacy boundary: only installed when that old module already exists.
-- Same per-account lock as enrollment prevents a grant/review transition race
-- under the API's READ COMMITTED transactions. Runtime concurrency tests required.
CREATE OR REPLACE FUNCTION private.teacher_v2_guard_legacy_grant()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
 PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(NEW.user_id::text,0));
 IF NEW.is_active AND EXISTS(SELECT 1 FROM public.teacher_profiles WHERE user_id=NEW.user_id) THEN
  RAISE EXCEPTION 'Legacy grant cannot bypass a v2 profile' USING ERRCODE='42501'; END IF;
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION private.teacher_v2_guard_legacy_grant() FROM PUBLIC,anon,authenticated,service_role;
-- Idempotent for repeated review-bundle application; never drop/replace an
-- existing trigger silently. A same-name trigger with different semantics must
-- be caught by the separate migration-diff/security acceptance gate.
DO $ BEGIN
 IF to_regclass('public.result_staff_grants') IS NOT NULL
    AND NOT EXISTS (
      SELECT 1 FROM pg_catalog.pg_trigger t
      WHERE t.tgrelid = 'public.result_staff_grants'::pg_catalog.regclass
        AND t.tgname = 'teacher_v2_no_legacy_grant'
        AND NOT t.tgisinternal
    ) THEN
  EXECUTE 'CREATE TRIGGER teacher_v2_no_legacy_grant BEFORE INSERT OR UPDATE ON public.result_staff_grants FOR EACH ROW EXECUTE FUNCTION private.teacher_v2_guard_legacy_grant()';
 END IF;
END $;

CREATE OR REPLACE FUNCTION public.teacher_v2_save_application(p_profile jsonb,p_qualifications jsonb,p_scopes jsonb,p_reason text,p_submit boolean DEFAULT false,p_expected_revision integer DEFAULT NULL)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE v_actor uuid:=auth.uid(); v_profile public.teacher_profiles; v_revision integer; q jsonb; s jsonb;
BEGIN
 IF v_actor IS NULL THEN RAISE EXCEPTION 'Authentication required' USING ERRCODE='42501'; END IF;
 IF NOT private.teacher_v2_feature_enabled('registration') THEN RAISE EXCEPTION 'Teacher registration disabled' USING ERRCODE='42501'; END IF;
 -- Serialize even first submissions; profile updates and approval lock the same account.
 PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(v_actor::text,0));
 SELECT * INTO v_profile FROM public.teacher_profiles WHERE user_id=v_actor FOR UPDATE;
 IF (v_profile.user_id IS NOT NULL AND p_expected_revision IS DISTINCT FROM v_profile.revision)
 OR (v_profile.user_id IS NULL AND p_expected_revision IS NOT NULL) THEN
  RAISE EXCEPTION 'Profile changed; reload before saving' USING ERRCODE='40001';
 END IF;
 IF FOUND AND (v_profile.status IN ('approved','suspended') OR v_profile.submitted_at IS NOT NULL) THEN
  RAISE EXCEPTION 'Withdraw pending application before editing; approved profiles are locked' USING ERRCODE='42501';
 END IF;
 IF jsonb_typeof(p_profile) IS DISTINCT FROM 'object' OR jsonb_typeof(p_qualifications) IS DISTINCT FROM 'array'
 OR jsonb_array_length(p_qualifications)>20 OR jsonb_typeof(p_scopes) IS DISTINCT FROM 'array'
 OR jsonb_array_length(p_scopes)>60 OR p_submit IS NULL
 OR (p_submit AND (p_reason IS NULL OR char_length(btrim(p_reason)) NOT BETWEEN 12 AND 1000 OR jsonb_array_length(p_scopes)=0)) THEN
 RAISE EXCEPTION 'Invalid application' USING ERRCODE='22023'; END IF;
 -- Never let an applicant change a Super Admin-owned legacy grant.
 IF to_regclass('public.result_staff_grants') IS NOT NULL THEN
  PERFORM 1 FROM public.result_staff_grants WHERE user_id=v_actor AND is_active FOR UPDATE;
  IF FOUND THEN RAISE EXCEPTION 'Super Admin must close legacy staff access before v2 enrollment' USING ERRCODE='42501'; END IF;
 END IF;
 -- Rejected applicants may revise. No privileged fields are taken from client JSON.
 IF v_profile.status='rejected' THEN UPDATE public.teacher_profiles SET status='pending' WHERE user_id=v_actor; END IF;
 PERFORM public.teacher_v2_save_profile(p_profile->>'displayName',p_profile->>'contactEmail',p_profile->>'phone',(p_profile->>'experienceYears')::integer);
 FOR q IN SELECT value FROM jsonb_array_elements(p_qualifications) LOOP
  IF jsonb_typeof(q) IS DISTINCT FROM 'object' OR q->>'title' IS NULL OR q->>'institution' IS NULL
   OR char_length(btrim(q->>'title')) NOT BETWEEN 2 AND 120 OR char_length(btrim(q->>'institution')) NOT BETWEEN 2 AND 160
   OR (q->>'title') ~ '[[:cntrl:]]' OR (q->>'institution') ~ '[[:cntrl:]]'
   OR q->>'year' IS NULL OR (q->>'year')::integer NOT BETWEEN 1950 AND extract(year FROM now())::integer THEN
   RAISE EXCEPTION 'Invalid qualification' USING ERRCODE='22023'; END IF;
 END LOOP;
 FOR s IN SELECT value FROM jsonb_array_elements(p_scopes) LOOP
  IF (s->>'classLevel') IS NULL OR (s->>'classLevel') NOT IN ('6','7','8','9','10','11','12')
   OR (s->>'subject') IS NULL OR (s->>'subject') NOT IN ('Political Science','History','Geography','Economics','Other')
   OR (s->>'workType') IS NULL OR (s->>'workType') NOT IN ('materials.draft','materials.review','assessment.draft','result.review') THEN
   RAISE EXCEPTION 'Invalid scope' USING ERRCODE='22023'; END IF;
 END LOOP;
 DELETE FROM public.teacher_qualifications WHERE teacher_user_id=v_actor;
 INSERT INTO public.teacher_qualifications(teacher_user_id,title,institution,passing_year)
 SELECT v_actor,btrim(value->>'title'),btrim(value->>'institution'),(value->>'year')::integer FROM jsonb_array_elements(p_qualifications);
 UPDATE public.teacher_profiles SET revision=revision+1,requested_scopes=p_scopes,application_reason=btrim(p_reason),
 submitted_at=CASE WHEN p_submit THEN now() ELSE NULL END,updated_at=now() WHERE user_id=v_actor RETURNING revision INTO v_revision;
 INSERT INTO public.teacher_audit_events(actor_user_id,teacher_user_id,action,reason,details)
 VALUES(v_actor,v_actor,CASE WHEN p_submit THEN 'application.submitted' ELSE 'profile.saved' END,'Applicant saved own teacher application',jsonb_build_object('revision',v_revision));
 RETURN v_revision;
END $$;

CREATE OR REPLACE FUNCTION public.teacher_v2_withdraw()
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Authentication required' USING ERRCODE='42501'; END IF;
 PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(auth.uid()::text,0));
 UPDATE public.teacher_profiles SET submitted_at=NULL,revision=revision+1,updated_at=now() WHERE user_id=auth.uid() AND status='pending' AND submitted_at IS NOT NULL;
 IF NOT FOUND THEN RAISE EXCEPTION 'No pending application'; END IF;
 INSERT INTO public.teacher_audit_events(actor_user_id,teacher_user_id,action,reason) VALUES(auth.uid(),auth.uid(),'application.withdrawn','Applicant withdrew pending teacher application');
 RETURN true;
END $$;

CREATE OR REPLACE FUNCTION public.teacher_v2_review(p_user_id uuid,p_revision integer,p_decision text,p_reason text,p_verified boolean,p_assignments jsonb)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE p public.teacher_profiles; s jsonb; v_id text;
BEGIN
 IF auth.uid() IS NULL OR NOT coalesce(public.is_super_admin(),false) OR auth.uid()=p_user_id THEN RAISE EXCEPTION 'Independent Super Admin required' USING ERRCODE='42501'; END IF;
 IF p_decision IS NULL OR p_decision NOT IN ('approve','reject') OR p_reason IS NULL OR char_length(btrim(p_reason)) NOT BETWEEN 12 AND 1000
 OR jsonb_typeof(p_assignments) IS DISTINCT FROM 'array' OR jsonb_array_length(p_assignments)>60 THEN RAISE EXCEPTION 'Invalid review'; END IF;
 PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_user_id::text,0));
 SELECT * INTO p FROM public.teacher_profiles WHERE user_id=p_user_id FOR UPDATE;
 IF NOT FOUND OR p.status<>'pending' OR p.submitted_at IS NULL OR p_revision IS DISTINCT FROM p.revision THEN RAISE EXCEPTION 'Application changed; reload before review'; END IF;
 IF p_decision='approve' AND p_verified IS DISTINCT FROM true THEN RAISE EXCEPTION 'Identity verification required'; END IF;
 IF p_decision='approve' AND NOT private.teacher_v2_feature_enabled('registration') THEN RAISE EXCEPTION 'Teacher approval disabled' USING ERRCODE='42501'; END IF;
 -- Never issue an approved employee identity with zero authorized work scopes.
 -- Legacy class-10 teachers require explicit verified subject mapping before approval.
 IF p_decision='approve' AND jsonb_array_length(p_assignments)=0 THEN
  RAISE EXCEPTION 'Approval requires at least one verified class, subject and work assignment' USING ERRCODE='22023';
 END IF;
 UPDATE public.teacher_profiles SET decision_reason=btrim(p_reason),reviewed_at=now(),status=CASE WHEN p_decision='approve' THEN 'approved' ELSE 'rejected' END,
 approved_by=CASE WHEN p_decision='approve' THEN auth.uid() END,approved_at=CASE WHEN p_decision='approve' THEN now() END,
 submitted_at=NULL,revision=revision+1,updated_at=now() WHERE user_id=p_user_id;
 IF p_decision='approve' THEN
  -- Core Beta has no dependency on the optional legacy material schema.
  -- Transitioned accounts must not retain a legacy route around v2 revocation.
  IF to_regclass('public.result_staff_grants') IS NOT NULL THEN
   UPDATE public.result_staff_grants SET is_active=false WHERE user_id=p_user_id AND is_active;
  END IF;
  v_id:=public.teacher_v2_issue_employee_id(p_user_id);
  FOR s IN SELECT value FROM jsonb_array_elements(p_assignments) LOOP
   PERFORM public.teacher_v2_set_assignment(p_user_id,s->>'classLevel',s->>'subject',s->>'workType','grant',p_reason);
  END LOOP;
 END IF;
 INSERT INTO public.teacher_audit_events(actor_user_id,teacher_user_id,action,reason,details)
 VALUES(auth.uid(),p_user_id,'application.'||p_decision,p_reason,jsonb_build_object('revision',p_revision,'assignments',p_assignments));
 RETURN v_id;
END $$;

CREATE OR REPLACE FUNCTION public.teacher_v2_suspend(p_user_id uuid,p_reason text)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
 IF auth.uid() IS NULL OR NOT coalesce(public.is_super_admin(),false) OR auth.uid()=p_user_id THEN RAISE EXCEPTION 'Independent Super Admin required' USING ERRCODE='42501'; END IF;
 IF p_reason IS NULL OR char_length(btrim(p_reason)) NOT BETWEEN 12 AND 1000 THEN RAISE EXCEPTION 'Reason required'; END IF;
 UPDATE public.teacher_profiles SET status='suspended',decision_reason=btrim(p_reason),reviewed_at=now(),revision=revision+1,updated_at=now() WHERE user_id=p_user_id AND status='approved';
 IF NOT FOUND THEN RAISE EXCEPTION 'Approved teacher required'; END IF;
 UPDATE public.teacher_assignments SET status='revoked',revoked_by=auth.uid(),revoked_at=now() WHERE teacher_user_id=p_user_id AND status='active';
 -- Close the legacy path too. This does not grant any new legacy rights.
 IF to_regclass('public.result_staff_grants') IS NOT NULL THEN
  UPDATE public.result_staff_grants SET is_active=false WHERE user_id=p_user_id AND is_active;
 END IF;
 INSERT INTO public.teacher_audit_events(actor_user_id,teacher_user_id,action,reason) VALUES(auth.uid(),p_user_id,'teacher.suspended',p_reason);
 RETURN true;
END $$;

-- Restoration preserves identity but never revives revoked assignments or legacy grants.
CREATE OR REPLACE FUNCTION public.teacher_v2_restore(p_user_id uuid,p_reason text)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
 IF auth.uid() IS NULL OR NOT coalesce(public.is_super_admin(),false) OR auth.uid()=p_user_id THEN RAISE EXCEPTION 'Independent Super Admin required' USING ERRCODE='42501'; END IF;
 IF p_reason IS NULL OR char_length(btrim(p_reason)) NOT BETWEEN 12 AND 1000 THEN RAISE EXCEPTION 'Reason required'; END IF;
 UPDATE public.teacher_profiles SET status='approved',decision_reason=btrim(p_reason),reviewed_at=now(),revision=revision+1,updated_at=now()
 WHERE user_id=p_user_id AND status='suspended';
 IF NOT FOUND THEN RAISE EXCEPTION 'Suspended teacher required'; END IF;
 INSERT INTO public.teacher_audit_events(actor_user_id,teacher_user_id,action,reason)
 VALUES(auth.uid(),p_user_id,'teacher.restored',p_reason);
 RETURN true;
END $$;

-- Allowlisted nested payload: private object keys are never returned.
CREATE OR REPLACE FUNCTION public.teacher_v2_snapshot(p_user_id uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
DECLARE v jsonb;
BEGIN
 IF auth.uid() IS NULL OR (auth.uid()<>p_user_id AND NOT coalesce(public.is_super_admin(),false)) THEN RAISE EXCEPTION 'Access denied' USING ERRCODE='42501'; END IF;
 SELECT to_jsonb(p)||jsonb_build_object('qualifications',coalesce((SELECT jsonb_agg(jsonb_build_object('title',q.title,'institution',q.institution,'year',q.passing_year)) FROM public.teacher_qualifications q WHERE q.teacher_user_id=p.user_id),'[]'::jsonb),
 'assignments',coalesce((SELECT jsonb_agg(to_jsonb(a)) FROM public.teacher_assignments a WHERE a.teacher_user_id=p.user_id),'[]'::jsonb),
 'resumes',coalesce((SELECT jsonb_agg(jsonb_build_object('id',d.id,'original_filename',d.original_filename,'verification_status',d.verification_status)) FROM public.teacher_resume_documents d WHERE d.teacher_user_id=p.user_id),'[]'::jsonb)) INTO v FROM public.teacher_profiles p WHERE p.user_id=p_user_id;
 RETURN v;
END $$;
CREATE OR REPLACE FUNCTION public.teacher_v2_directory(p_offset integer DEFAULT 0,p_search text DEFAULT '')
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
BEGIN
 IF auth.uid() IS NULL OR NOT coalesce(public.is_super_admin(),false) THEN RAISE EXCEPTION 'Super Admin required' USING ERRCODE='42501'; END IF;
 IF p_offset IS NULL OR p_offset<0 OR p_offset>100000 OR p_search IS NULL OR char_length(p_search)>160 THEN RAISE EXCEPTION 'Invalid directory query'; END IF;
 RETURN coalesce((SELECT jsonb_agg(public.teacher_v2_snapshot(p.user_id)) FROM
 (SELECT user_id FROM public.teacher_profiles WHERE display_name ILIKE '%'||p_search||'%' OR employee_id ILIKE '%'||p_search||'%' ORDER BY created_at,user_id LIMIT 25 OFFSET p_offset) p),'[]'::jsonb);
END $$;
CREATE OR REPLACE FUNCTION public.teacher_v2_audit(p_user_id uuid)
RETURNS SETOF public.teacher_audit_events LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
BEGIN
 IF auth.uid() IS NULL OR NOT coalesce(public.is_super_admin(),false) THEN RAISE EXCEPTION 'Super Admin required' USING ERRCODE='42501'; END IF;
 RETURN QUERY SELECT * FROM public.teacher_audit_events WHERE teacher_user_id=p_user_id ORDER BY created_at DESC,id LIMIT 100;
END $$;
-- Explicit grants form part of the review bundle, NOT an activated capability.
REVOKE ALL ON FUNCTION public.teacher_v2_save_application(jsonb,jsonb,jsonb,text,boolean,integer),public.teacher_v2_withdraw(),public.teacher_v2_review(uuid,integer,text,text,boolean,jsonb),public.teacher_v2_suspend(uuid,text),public.teacher_v2_restore(uuid,text),public.teacher_v2_snapshot(uuid),public.teacher_v2_directory(integer,text),public.teacher_v2_audit(uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.teacher_v2_save_application(jsonb,jsonb,jsonb,text,boolean,integer),public.teacher_v2_withdraw(),public.teacher_v2_review(uuid,integer,text,text,boolean,jsonb),public.teacher_v2_suspend(uuid,text),public.teacher_v2_restore(uuid,text),public.teacher_v2_snapshot(uuid),public.teacher_v2_directory(integer,text),public.teacher_v2_audit(uuid),public.teacher_v2_set_assignment(uuid,text,text,text,text,text) TO authenticated;
COMMIT;
