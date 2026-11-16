-- REVIEW ONLY. NOT EXECUTED. Requires explicit owner approval and lifecycle bundle.
-- Preserve legacy grants only for accounts without any v2 profile. As soon as
-- an identity enters v2 (including pending/rejected), deny legacy fallback.
-- Approved v2 identities must use active scoped assignments; suspended deny.
BEGIN;
CREATE OR REPLACE FUNCTION public.teacher_v2_material_permission(p_class text,p_subject text,p_permission text)
RETURNS boolean LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
BEGIN
 IF auth.uid() IS NULL THEN RETURN false; END IF;
 IF EXISTS(SELECT 1 FROM public.teacher_profiles WHERE user_id=auth.uid()) THEN
  -- Pending, rejected and suspended profiles fail closed. Legacy grants must
  -- never bypass a v2 application's current review or suspension status.
  IF NOT EXISTS(SELECT 1 FROM public.teacher_profiles WHERE user_id=auth.uid() AND status='approved') THEN RETURN false; END IF;
  RETURN public.teacher_v2_has_active_assignment(p_class,p_subject,CASE p_permission WHEN 'materials.draft.write' THEN 'materials.draft' WHEN 'materials.review.propose' THEN 'materials.review' ELSE NULL END)
   OR (p_permission='materials.read' AND (public.teacher_v2_has_active_assignment(p_class,p_subject,'materials.draft') OR public.teacher_v2_has_active_assignment(p_class,p_subject,'materials.review')));
 END IF;
 RETURN EXISTS(SELECT 1 FROM public.result_staff_grants g WHERE g.user_id=auth.uid() AND g.is_active AND p_permission=ANY(g.permissions) AND (g.scope_class IS NULL OR g.scope_class=p_class));
END $$;
REVOKE ALL ON FUNCTION public.teacher_v2_material_permission(text,text,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.teacher_v2_material_permission(text,text,text),public.teacher_v2_has_active_assignment(text,text,text) TO authenticated;
-- Replace all legacy permissive authoring policies, otherwise they bypass v2 revocation.
DROP POLICY IF EXISTS "Owner may delete only own drafts" ON public.study_material_items;
DROP POLICY IF EXISTS "Owner or super admin reads review drafts" ON public.study_material_items;
DROP POLICY IF EXISTS "Scoped editors create drafts" ON public.study_material_items;
DROP POLICY IF EXISTS "Scoped editors update only own drafts" ON public.study_material_items;
DROP POLICY IF EXISTS "Scoped staff submit own drafts for review" ON public.study_material_items;
CREATE POLICY "V2 read own material" ON public.study_material_items FOR SELECT TO authenticated
 USING (public.is_super_admin() OR (created_by=auth.uid() AND public.teacher_v2_material_permission(class_level,subject,'materials.read')));
CREATE POLICY "V2 create own draft" ON public.study_material_items FOR INSERT TO authenticated
 WITH CHECK (public.is_super_admin() OR (created_by=auth.uid() AND status='draft' AND public.teacher_v2_material_permission(class_level,subject,'materials.draft.write')));
CREATE POLICY "V2 update own draft" ON public.study_material_items FOR UPDATE TO authenticated
 USING (public.is_super_admin() OR (created_by=auth.uid() AND status='draft' AND public.teacher_v2_material_permission(class_level,subject,'materials.draft.write')))
 WITH CHECK (public.is_super_admin() OR (created_by=auth.uid() AND status='draft' AND public.teacher_v2_material_permission(class_level,subject,'materials.draft.write')));
CREATE POLICY "V2 submit own draft" ON public.study_material_items FOR UPDATE TO authenticated
 USING (created_by=auth.uid() AND status='draft' AND public.teacher_v2_material_permission(class_level,subject,'materials.review.propose'))
 WITH CHECK (created_by=auth.uid() AND status='pending_review' AND public.teacher_v2_material_permission(class_level,subject,'materials.review.propose'));
CREATE POLICY "V2 delete own draft" ON public.study_material_items FOR DELETE TO authenticated
 USING (public.is_super_admin() OR (created_by=auth.uid() AND status='draft' AND public.teacher_v2_material_permission(class_level,subject,'materials.draft.write')));
-- Existing private audit trigger remains: only Super Admin publishes and links must
-- match the material's class. No test, result, delivery or website policy is widened.
-- Read-only aggregate review; no student identity, answers, marks writes or delivery.
-- Privacy rule: suppress counts and averages for fewer than five DISTINCT students
-- per test, not five attempts. Do not expose small cohorts via zero/NULL counts.
-- This per-test threshold does not alone prove resistance to overlapping cohort
-- inference across other endpoints; review all aggregate endpoints before activation.
CREATE OR REPLACE FUNCTION public.teacher_v2_result_summary(p_class text,p_subject text)
RETURNS TABLE(test_id text,submitted_count bigint,average_percentage numeric)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
BEGIN
 IF auth.uid() IS NULL OR NOT public.teacher_v2_has_active_assignment(p_class,p_subject,'result.review') THEN
  RAISE EXCEPTION 'Scoped result review required' USING ERRCODE='42501'; END IF;
 RETURN QUERY SELECT t.id,
   CASE WHEN count(DISTINCT a.student_id) >= 5 THEN count(a.id) ELSE NULL::bigint END,
   CASE WHEN count(DISTINCT a.student_id) >= 5 THEN round(avg(a.percentage),2) ELSE NULL::numeric END
 FROM public.tests t LEFT JOIN public.test_attempts a ON a.test_id=t.id AND a.status='submitted'
 WHERE t.class_level=p_class AND t.subject=p_subject GROUP BY t.id ORDER BY t.id LIMIT 100;
END $$;
REVOKE ALL ON FUNCTION public.teacher_v2_result_summary(text,text) FROM PUBLIC,anon,authenticated;
-- Core Beta privacy gate: keep this RPC inaccessible to authenticated users.
-- A UI feature flag alone does not prevent direct RPC calls. Grant EXECUTE only in a
-- separately reviewed migration after fixed-cohort privacy and inference tests pass.
-- No authenticated EXECUTE grant in this Core Beta migration.
COMMIT;
