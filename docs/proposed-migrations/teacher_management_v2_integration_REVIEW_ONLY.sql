-- REVIEW ONLY. NOT EXECUTED. Requires explicit owner approval and lifecycle bundle.
-- Preserve existing legacy grants until first v2 approval; approved/suspended v2
-- identities must ALWAYS use fresh subject/work assignments.
BEGIN;
CREATE OR REPLACE FUNCTION public.teacher_v2_material_permission(p_class text,p_subject text,p_permission text)
RETURNS boolean LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
BEGIN
 IF auth.uid() IS NULL THEN RETURN false; END IF;
 IF EXISTS(SELECT 1 FROM public.teacher_profiles WHERE user_id=auth.uid() AND (employee_id IS NOT NULL OR status IN ('approved','suspended'))) THEN
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
CREATE OR REPLACE FUNCTION public.teacher_v2_result_summary(p_class text,p_subject text)
RETURNS TABLE(test_id text,submitted_count bigint,average_percentage numeric)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
BEGIN
 IF auth.uid() IS NULL OR NOT public.teacher_v2_has_active_assignment(p_class,p_subject,'result.review') THEN
  RAISE EXCEPTION 'Scoped result review required' USING ERRCODE='42501'; END IF;
 RETURN QUERY SELECT t.id,count(a.id),round(avg(a.percentage),2)
 FROM public.tests t LEFT JOIN public.test_attempts a ON a.test_id=t.id AND a.status='submitted'
 WHERE t.class_level=p_class AND t.subject=p_subject GROUP BY t.id ORDER BY t.id LIMIT 100;
END $$;
REVOKE ALL ON FUNCTION public.teacher_v2_result_summary(text,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.teacher_v2_result_summary(text,text) TO authenticated;
COMMIT;
