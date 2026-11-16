-- REVIEW ONLY TESTS. NOT EXECUTED. Owner approval required, isolated Preview only.
-- Run only AFTER approved schema/profile/functions/lifecycle/integration/resume bundle.
-- Every fixture and side effect rolls back. Never run against Production.
BEGIN;
INSERT INTO auth.users(id,email) VALUES
 ('11111111-1111-4111-8111-111111111111','teacher-v2-acceptance@example.invalid'),
 ('22222222-2222-4222-8222-222222222222','other-v2-acceptance@example.invalid'),
 ('33333333-3333-4333-8333-333333333333','admin-v2-acceptance@example.invalid');
INSERT INTO public.user_roles(user_id,role) VALUES('33333333-3333-4333-8333-333333333333','super_admin'),('22222222-2222-4222-8222-222222222222','admin');
SELECT set_config('request.jwt.claim.sub','33333333-3333-4333-8333-333333333333',true);
INSERT INTO public.result_staff_grants(user_id,role,permissions,scope_class,change_reason)
VALUES('11111111-1111-4111-8111-111111111111','teacher',ARRAY['materials.read','materials.draft.write'],'10','Existing approved legacy teacher fixture');
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','11111111-1111-4111-8111-111111111111',true);
SELECT public.teacher_v2_save_application(
 '{"displayName":"Acceptance Teacher","contactEmail":"teacher@example.invalid","phone":"","experienceYears":2}',
 '[{"title":"MA History","institution":"Acceptance University","year":2020},{"title":"BEd","institution":"Acceptance College","year":2022}]',
 '[{"classLevel":"10","subject":"History","workType":"materials.draft"}]',
 'Acceptance test teacher application',false);
DO $$ BEGIN
 BEGIN
  PERFORM public.teacher_v2_save_application('{"displayName":"Stale edit"}','[]','[]','',false,NULL);
  RAISE EXCEPTION 'FAIL: stale draft overwrite';
 EXCEPTION WHEN serialization_failure THEN NULL; END;
END $$;
SELECT public.teacher_v2_save_application(
 '{"displayName":"Acceptance Teacher","contactEmail":"teacher@example.invalid","phone":"","experienceYears":2}',
 '[{"title":"MA History","institution":"Acceptance University","year":2020},{"title":"BEd","institution":"Acceptance College","year":2022}]',
 '[{"classLevel":"10","subject":"History","workType":"materials.draft"}]',
 'Acceptance test teacher application',true,2);
DO $$ BEGIN
 BEGIN
  PERFORM public.teacher_v2_snapshot('22222222-2222-4222-8222-222222222222');
  RAISE EXCEPTION 'FAIL: cross-account profile read';
 EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 BEGIN
  PERFORM public.teacher_v2_directory();RAISE EXCEPTION 'FAIL: teacher directory access';
 EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 BEGIN
  UPDATE public.teacher_profiles SET employee_id='KSOL-T-AAAAAAAAAAAA' WHERE user_id=auth.uid();
  RAISE EXCEPTION 'FAIL: self-issued employee ID';
 EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 BEGIN
  DELETE FROM public.teacher_audit_events;RAISE EXCEPTION 'FAIL: audit tampering';
 EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 IF public.teacher_v2_has_active_assignment('10','History','materials.draft') THEN RAISE EXCEPTION 'FAIL: pending v2 assignment'; END IF;
 IF NOT public.teacher_v2_material_permission('10','History','materials.draft.write') THEN RAISE EXCEPTION 'FAIL: existing legacy grant lost during v2 application'; END IF;
END $$;
SELECT set_config('request.jwt.claim.sub','22222222-2222-4222-8222-222222222222',true);
DO $$ BEGIN
 BEGIN PERFORM public.teacher_v2_directory();RAISE EXCEPTION 'FAIL: ordinary Admin directory access';
 EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END $$;
SELECT set_config('request.jwt.claim.sub','33333333-3333-4333-8333-333333333333',true);
SELECT public.teacher_v2_review('11111111-1111-4111-8111-111111111111',3,'approve','Independently verified acceptance identity',true,'[{"classLevel":"10","subject":"History","workType":"materials.draft"},{"classLevel":"12","subject":"Political Science","workType":"result.review"}]');
DO $$ DECLARE p jsonb; BEGIN
 p:=public.teacher_v2_snapshot('11111111-1111-4111-8111-111111111111');
 IF p->>'employee_id' !~ '^KSOL-T-[A-Z0-9]{8,16}$' OR p->>'status'<>'approved' OR jsonb_array_length(p->'qualifications')<>2 OR jsonb_array_length(p->'assignments')<>2 THEN RAISE EXCEPTION 'FAIL: atomic approval/profile payload'; END IF;
END $$;
SELECT set_config('request.jwt.claim.sub','11111111-1111-4111-8111-111111111111',true);
DO $$ BEGIN
 INSERT INTO public.study_material_items(class_level,subject,title,kind,status) VALUES('10','History','Acceptance material draft','notes','draft');
 BEGIN
  INSERT INTO public.study_material_items(class_level,subject,title,kind,status) VALUES('10','Geography','Forbidden subject material','notes','draft');
  RAISE EXCEPTION 'FAIL: wrong subject material write';
 EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 BEGIN
  INSERT INTO public.study_material_items(class_level,subject,title,kind,status) VALUES('10','History','Forbidden publication','notes','published');
  RAISE EXCEPTION 'FAIL: teacher publication';
 EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 IF NOT public.teacher_v2_material_permission('10','History','materials.draft.write') THEN RAISE EXCEPTION 'FAIL: approved scope denied'; END IF;
 IF public.teacher_v2_material_permission('10','Geography','materials.draft.write') OR public.teacher_v2_material_permission('12','History','materials.draft.write') OR public.teacher_v2_material_permission('10','History','results.publish') THEN RAISE EXCEPTION 'FAIL: unauthorized work scope'; END IF;
END $$;
SELECT set_config('request.jwt.claim.sub','33333333-3333-4333-8333-333333333333',true);
SELECT public.teacher_v2_set_assignment('11111111-1111-4111-8111-111111111111','10','History','materials.draft','revoke','Acceptance test immediate assignment revocation');
SELECT set_config('request.jwt.claim.sub','11111111-1111-4111-8111-111111111111',true);
DO $$ BEGIN
 IF public.teacher_v2_material_permission('10','History','materials.draft.write') THEN RAISE EXCEPTION 'FAIL: revoked v2 assignment fell back to active legacy grant'; END IF;
END $$;
SELECT set_config('request.jwt.claim.sub','33333333-3333-4333-8333-333333333333',true);
SELECT public.teacher_v2_suspend('11111111-1111-4111-8111-111111111111','Acceptance test immediate teacher suspension');
SELECT set_config('request.jwt.claim.sub','11111111-1111-4111-8111-111111111111',true);
DO $$ BEGIN
 IF public.teacher_v2_material_permission('10','History','materials.draft.write') OR public.teacher_v2_has_active_assignment('12','Political Science','result.review') THEN RAISE EXCEPTION 'FAIL: revoked access retained'; END IF;
END $$;
SELECT set_config('request.jwt.claim.sub','22222222-2222-4222-8222-222222222222',true);
DO $$ BEGIN
 BEGIN PERFORM public.teacher_v2_restore('11111111-1111-4111-8111-111111111111','Unauthorized ordinary Admin restore');RAISE EXCEPTION 'FAIL: ordinary Admin restoration';
 EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END $$;
SELECT set_config('request.jwt.claim.sub','33333333-3333-4333-8333-333333333333',true);
SELECT public.teacher_v2_restore('11111111-1111-4111-8111-111111111111','Acceptance verified restoration without grants');
DO $$ DECLARE p jsonb; BEGIN
 p:=public.teacher_v2_snapshot('11111111-1111-4111-8111-111111111111');
 IF p->>'status'<>'approved' OR p->>'employee_id' IS NULL OR p->>'decision_reason'<>'Acceptance verified restoration without grants' THEN RAISE EXCEPTION 'FAIL: restoration identity or review note'; END IF;
END $$;
SELECT set_config('request.jwt.claim.sub','11111111-1111-4111-8111-111111111111',true);
DO $$ BEGIN
 IF public.teacher_v2_material_permission('10','History','materials.draft.write') OR public.teacher_v2_has_active_assignment('12','Political Science','result.review') THEN RAISE EXCEPTION 'FAIL: restoration revived revoked assignments'; END IF;
END $$;
RESET ROLE;
SET LOCAL ROLE anon;
SELECT set_config('request.jwt.claim.sub','',true);
DO $$ BEGIN
 BEGIN PERFORM public.teacher_v2_snapshot('11111111-1111-4111-8111-111111111111');RAISE EXCEPTION 'FAIL: anonymous profile access';
 EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END $$;
RESET ROLE;
ROLLBACK;
-- Remaining owner-approved acceptance: concurrent approval vs edit/upload; actual
-- storage + scanner; material writes, publication/result-edit denial under every
-- existing policy; real Google OAuth; ordinary Admin; account deletion/retention.
