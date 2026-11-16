-- LOCAL REHEARSAL ONLY. Remote use requires separate review/approval.
BEGIN;
DROP POLICY IF EXISTS "V2 read own material" ON public.study_material_items;
DROP POLICY IF EXISTS "V2 create own draft" ON public.study_material_items;
DROP POLICY IF EXISTS "V2 update own draft" ON public.study_material_items;
DROP POLICY IF EXISTS "V2 submit own draft" ON public.study_material_items;
DROP POLICY IF EXISTS "V2 delete own draft" ON public.study_material_items;
CREATE POLICY "Owner may delete only own drafts" ON public."study_material_items" AS PERMISSIVE FOR DELETE TO "authenticated" USING ((( SELECT is_super_admin() AS is_super_admin) OR ((status = 'draft'::text) AND (created_by = ( SELECT auth.uid() AS uid)) AND (EXISTS ( SELECT 1
   FROM result_staff_grants g
  WHERE ((g.user_id = ( SELECT auth.uid() AS uid)) AND g.is_active AND ('materials.draft.write'::text = ANY (g.permissions)) AND ((g.scope_class IS NULL) OR (g.scope_class = study_material_items.class_level))))))));
CREATE POLICY "Owner or super admin reads review drafts" ON public."study_material_items" AS PERMISSIVE FOR SELECT TO "authenticated" USING ((( SELECT is_super_admin() AS is_super_admin) OR ((created_by = ( SELECT auth.uid() AS uid)) AND (EXISTS ( SELECT 1
   FROM result_staff_grants g
  WHERE ((g.user_id = ( SELECT auth.uid() AS uid)) AND g.is_active AND ('materials.read'::text = ANY (g.permissions)) AND ((g.scope_class IS NULL) OR (g.scope_class = study_material_items.class_level))))))));
CREATE POLICY "Scoped editors create drafts" ON public."study_material_items" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK ((( SELECT is_super_admin() AS is_super_admin) OR ((created_by = ( SELECT auth.uid() AS uid)) AND (status = 'draft'::text) AND (EXISTS ( SELECT 1
   FROM result_staff_grants g
  WHERE ((g.user_id = ( SELECT auth.uid() AS uid)) AND g.is_active AND ('materials.draft.write'::text = ANY (g.permissions)) AND ((g.scope_class IS NULL) OR (g.scope_class = study_material_items.class_level))))))));
CREATE POLICY "Scoped editors update only own drafts" ON public."study_material_items" AS PERMISSIVE FOR UPDATE TO "authenticated" USING ((( SELECT is_super_admin() AS is_super_admin) OR ((status = 'draft'::text) AND (created_by = ( SELECT auth.uid() AS uid)) AND (EXISTS ( SELECT 1
   FROM result_staff_grants g
  WHERE ((g.user_id = ( SELECT auth.uid() AS uid)) AND g.is_active AND ('materials.draft.write'::text = ANY (g.permissions)) AND ((g.scope_class IS NULL) OR (g.scope_class = study_material_items.class_level)))))))) WITH CHECK ((( SELECT is_super_admin() AS is_super_admin) OR ((status = 'draft'::text) AND (created_by = ( SELECT auth.uid() AS uid)) AND (EXISTS ( SELECT 1
   FROM result_staff_grants g
  WHERE ((g.user_id = ( SELECT auth.uid() AS uid)) AND g.is_active AND ('materials.draft.write'::text = ANY (g.permissions)) AND ((g.scope_class IS NULL) OR (g.scope_class = study_material_items.class_level))))))));
CREATE POLICY "Scoped staff submit own drafts for review" ON public."study_material_items" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (((status = 'draft'::text) AND (created_by = ( SELECT auth.uid() AS uid)) AND (EXISTS ( SELECT 1
   FROM result_staff_grants g
  WHERE ((g.user_id = ( SELECT auth.uid() AS uid)) AND g.is_active AND ('materials.review.propose'::text = ANY (g.permissions)) AND ((g.scope_class IS NULL) OR (g.scope_class = study_material_items.class_level))))))) WITH CHECK (((status = 'pending_review'::text) AND (created_by = ( SELECT auth.uid() AS uid)) AND (EXISTS ( SELECT 1
   FROM result_staff_grants g
  WHERE ((g.user_id = ( SELECT auth.uid() AS uid)) AND g.is_active AND ('materials.review.propose'::text = ANY (g.permissions)) AND ((g.scope_class IS NULL) OR (g.scope_class = study_material_items.class_level)))))));
COMMIT;
