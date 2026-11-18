-- REVIEW ONLY. NOT EXECUTED. No Production/Preview activation authorized.
-- Required BEFORE v2 functions/lifecycle/integration/resume/privacy proposals.
BEGIN;
CREATE SCHEMA IF NOT EXISTS private;
CREATE TABLE private.teacher_beta_features (
 feature text PRIMARY KEY CHECK (feature IN ('registration','material_authoring','result_analytics','resume_uploads','advanced_assignments')),
 enabled boolean NOT NULL DEFAULT false
);
INSERT INTO private.teacher_beta_features(feature) VALUES
 ('registration'),('material_authoring'),('result_analytics'),('resume_uploads'),('advanced_assignments');
ALTER TABLE private.teacher_beta_features ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON private.teacher_beta_features FROM PUBLIC,anon,authenticated,service_role;
CREATE TABLE private.teacher_beta_feature_audit (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 action text NOT NULL CHECK (action IN ('open_registration','close_beta')),
 release_commit text CHECK (release_commit IS NULL OR release_commit ~ '^[0-9a-f]{40}$'),
 operator_name text NOT NULL DEFAULT current_user,
 reason text NOT NULL CHECK (char_length(btrim(reason)) BETWEEN 12 AND 1000),
 created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE private.teacher_beta_feature_audit ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON private.teacher_beta_feature_audit FROM PUBLIC,anon,authenticated,service_role;
-- Owner SQL only can change feature state; no self-service configuration endpoint.
CREATE FUNCTION private.teacher_v2_feature_enabled(p_feature text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT auth.uid() IS NOT NULL AND coalesce((SELECT enabled FROM private.teacher_beta_features WHERE feature=p_feature),false);
$$;
REVOKE ALL ON FUNCTION private.teacher_v2_feature_enabled(text) FROM PUBLIC,anon,authenticated,service_role;
CREATE FUNCTION public.teacher_v2_beta_capabilities()
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Authentication required' USING ERRCODE='42501'; END IF;
 RETURN jsonb_build_object('registration',private.teacher_v2_feature_enabled('registration'),
 'materials',private.teacher_v2_feature_enabled('material_authoring'),
 'analytics',private.teacher_v2_feature_enabled('result_analytics'),
 'resumes',private.teacher_v2_feature_enabled('resume_uploads'),
 'advanced',private.teacher_v2_feature_enabled('advanced_assignments'));
END $$;
REVOKE ALL ON FUNCTION public.teacher_v2_beta_capabilities() FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.teacher_v2_beta_capabilities() TO authenticated;
-- A minimal release must also close any older optional v2 endpoint if present.
-- No implementation/deployment of these optional modules is needed or enabled.
DO $beta$
DECLARE v_signature text;
BEGIN
 FOREACH v_signature IN ARRAY ARRAY[
  'teacher_v2_result_summary(text,text)',
  'teacher_v2_freeze_result_summary(text,text,boolean)',
  'teacher_v2_resume_path(uuid)',
  'teacher_v2_reserve_resume(uuid,integer)',
  'teacher_v2_finalize_resume(uuid,integer,text,text,text,integer,text)'
 ] LOOP
  IF to_regprocedure('public.'||v_signature) IS NOT NULL THEN
   EXECUTE format('REVOKE ALL ON FUNCTION public.%s FROM PUBLIC,anon,authenticated,service_role',v_signature);
  END IF;
 END LOOP;
END $beta$;
COMMIT;
-- Proposed minimal launch: registration only, all four advanced features false.
-- Enabling even registration requires a separately approved, target-specific action.
