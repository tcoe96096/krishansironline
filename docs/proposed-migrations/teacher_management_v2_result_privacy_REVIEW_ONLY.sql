-- REVIEW ONLY. NOT EXECUTED. Preview hold remains. Requires fresh owner approval.
-- Apply after core schema/beta_flags/profile/functions/lifecycle. Study Material
-- policy integration is NOT required for isolated fixed-cohort analytics.
-- This optional module has separate Preview and release acceptance gates.
-- Replaces the historical raw-count/raw-average RPC. No test_attempts policy changes.
BEGIN;
CREATE SCHEMA IF NOT EXISTS private;
CREATE TABLE private.teacher_result_summary_releases (
 test_id text PRIMARY KEY,
 class_level text NOT NULL CHECK (class_level IN ('6','7','8','9','10','11','12')),
 subject text NOT NULL CHECK (subject IN ('Political Science','History','Geography','Economics','Other')),
 availability text NOT NULL CHECK (availability IN ('available','suppressed')),
 average_band text CHECK (average_band IN ('0-<20','20-<40','40-<60','60-<80','80-100')),
 frozen_at timestamptz NOT NULL DEFAULT now(),
 frozen_by uuid NOT NULL,
 CHECK ((availability='suppressed' AND average_band IS NULL) OR (availability='available' AND average_band IS NOT NULL))
);
-- Intentionally no contributor IDs, per-student scores, exact counts or exact means.
-- test_id has no cascading FK: deletion/re-use cannot free the one-release budget.
ALTER TABLE private.teacher_result_summary_releases ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON private.teacher_result_summary_releases FROM PUBLIC,anon,authenticated,service_role;

CREATE OR REPLACE FUNCTION private.teacher_v2_preserve_summary_release()
RETURNS trigger LANGUAGE plpgsql SET search_path='' AS $$
BEGIN
 RAISE EXCEPTION 'Frozen summary releases are immutable' USING ERRCODE='42501';
END $$;
REVOKE ALL ON FUNCTION private.teacher_v2_preserve_summary_release() FROM PUBLIC,anon,authenticated,service_role;
CREATE TRIGGER teacher_summary_release_immutable BEFORE UPDATE OR DELETE
 ON private.teacher_result_summary_releases FOR EACH ROW EXECUTE FUNCTION private.teacher_v2_preserve_summary_release();

-- Dedicated append-only release audit, independent of the actor being a Teacher.
CREATE TABLE private.teacher_result_summary_audit (
 test_id text PRIMARY KEY REFERENCES private.teacher_result_summary_releases(test_id),
 actor_id uuid NOT NULL, reason text NOT NULL CHECK (char_length(btrim(reason)) BETWEEN 12 AND 1000),
 created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE private.teacher_result_summary_audit ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON private.teacher_result_summary_audit FROM PUBLIC,anon,authenticated,service_role;
CREATE TRIGGER teacher_summary_audit_immutable BEFORE UPDATE OR DELETE ON private.teacher_result_summary_audit
 FOR EACH ROW EXECUTE FUNCTION private.teacher_v2_preserve_summary_release();

-- Only independently authorized Super Admin can freeze a canonical reporting cohort.
-- No learner list, cutoff, date, attempt selector, group filter or re-release parameter.
CREATE OR REPLACE FUNCTION public.teacher_v2_freeze_result_summary(p_test_id text,p_reason text,p_confirm_closed boolean)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE v_class text;v_subject text;v_published boolean;v_count bigint;v_mean numeric;v_state text;v_band text;
BEGIN
 IF auth.uid() IS NULL OR NOT coalesce(public.is_super_admin(),false) THEN
  RAISE EXCEPTION 'Super Admin required' USING ERRCODE='42501'; END IF;
 IF NOT private.teacher_v2_feature_enabled('result_analytics') THEN RAISE EXCEPTION 'Result analytics disabled' USING ERRCODE='42501'; END IF;
 IF p_test_id IS NULL OR char_length(p_test_id) NOT BETWEEN 1 AND 200 OR p_confirm_closed IS DISTINCT FROM true
 OR p_reason IS NULL OR char_length(btrim(p_reason)) NOT BETWEEN 12 AND 1000 THEN
  RAISE EXCEPTION 'Closed cohort confirmation and reason required' USING ERRCODE='22023'; END IF;
 PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('teacher-summary:'||p_test_id,0));
 -- Repeated calls never recalculate, even after new attempts, corrections or deletions.
 SELECT availability INTO v_state FROM private.teacher_result_summary_releases WHERE test_id=p_test_id;
 IF FOUND THEN RETURN v_state; END IF;
 SELECT class_level,subject,is_published INTO v_class,v_subject,v_published
 FROM public.tests WHERE id=p_test_id FOR UPDATE;
 IF NOT FOUND OR v_published OR EXISTS(SELECT 1 FROM public.test_attempts
   WHERE test_id=p_test_id AND status='in_progress' AND expires_at>now()) THEN
  RAISE EXCEPTION 'Test must be closed before cohort freeze' USING ERRCODE='22023'; END IF;
 -- Each distinct student contributes once: their earliest valid submitted attempt.
 -- The cohort is canonical for this test; teacher queries cannot select a subset.
 WITH first_attempt AS (
  SELECT DISTINCT ON (a.student_id) a.student_id,a.percentage
  FROM public.test_attempts a WHERE a.test_id=p_test_id AND a.status='submitted'
   AND a.student_id IS NOT NULL AND a.submitted_at IS NOT NULL AND a.percentage BETWEEN 0 AND 100
  ORDER BY a.student_id,a.attempt_number,a.submitted_at,a.id
 ) SELECT count(*),avg(percentage) INTO v_count,v_mean FROM first_attempt;
 IF v_count<5 THEN v_state:='suppressed';v_band:=NULL;
 ELSE
  v_state:='available';
  v_band:=CASE WHEN v_mean<20 THEN '0-<20' WHEN v_mean<40 THEN '20-<40'
    WHEN v_mean<60 THEN '40-<60' WHEN v_mean<80 THEN '60-<80' ELSE '80-100' END;
 END IF;
 INSERT INTO private.teacher_result_summary_releases(test_id,class_level,subject,availability,average_band,frozen_by)
 VALUES(p_test_id,v_class,v_subject,v_state,v_band,auth.uid());
 -- Private audit is independent of the actor having a Teacher profile.
 INSERT INTO private.teacher_result_summary_audit(test_id,actor_id,reason)
 VALUES(p_test_id,auth.uid(),btrim(p_reason));
 RETURN v_state;
END $$;

-- Return shape changes deliberately: old exact counts/means are removed, not masked
-- in the UI. Dropping the historical signature is required to change its return type.
DROP FUNCTION IF EXISTS public.teacher_v2_result_summary(text,text);
CREATE FUNCTION public.teacher_v2_result_summary(p_class text,p_subject text)
RETURNS TABLE(test_id text,availability text,average_band text)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
BEGIN
 IF auth.uid() IS NULL OR NOT coalesce(public.teacher_v2_has_active_assignment(p_class,p_subject,'result.review'),false) THEN
  RAISE EXCEPTION 'Scoped result review required' USING ERRCODE='42501'; END IF;
 IF NOT private.teacher_v2_feature_enabled('result_analytics') THEN RAISE EXCEPTION 'Result analytics disabled' USING ERRCODE='42501'; END IF;
 -- Never query raw attempts here. Each test has one immutable server-defined release.
 -- Re-labeling a test cannot move its frozen cohort into a different class/subject.
 RETURN QUERY SELECT t.id,
  CASE WHEN r.test_id IS NULL OR (r.class_level,r.subject) IS DISTINCT FROM (t.class_level,t.subject)
    THEN 'not_released' ELSE r.availability END,
  CASE WHEN r.availability='available' AND (r.class_level,r.subject) IS NOT DISTINCT FROM (t.class_level,t.subject)
    THEN r.average_band ELSE NULL END
 FROM public.tests t LEFT JOIN private.teacher_result_summary_releases r ON r.test_id=t.id
 WHERE t.class_level=p_class AND t.subject=p_subject ORDER BY t.id LIMIT 100;
END $$;
REVOKE ALL ON FUNCTION public.teacher_v2_freeze_result_summary(text,text,boolean),public.teacher_v2_result_summary(text,text)
 FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.teacher_v2_freeze_result_summary(text,text,boolean),public.teacher_v2_result_summary(text,text)
 TO authenticated;
COMMIT;
-- Gate: runtime RLS/SQL/concurrency acceptance remains unexecuted under the hold.
-- Coarse fixed bands reduce inference; they are not a differential-privacy guarantee
-- against arbitrary external knowledge or malicious privileged operators.
