import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,readdirSync} from 'node:fs';
const read=(name:string)=>readFileSync(`docs/proposed-migrations/teacher_management_v2_${name}_REVIEW_ONLY.sql`,'utf8');
test('v2 schema has one transaction and denies direct client writes to all private tables',()=>{
 const schema=read('schema');assert.equal((schema.match(/COMMIT;/g)||[]).length,1);
 for(const table of ['teacher_profiles','teacher_qualifications','teacher_resume_documents','teacher_assignments','teacher_audit_events'])assert.ok(schema.includes(`ALTER TABLE public.${table} ENABLE ROW LEVEL SECURITY`));
 assert.match(schema,/REVOKE ALL ON[\s\S]*FROM anon, authenticated/);
 assert.ok(!readdirSync('supabase/migrations').some(name=>name.includes('teacher_management_v2')));
});
test('reviews lock exact revisions, reject self approval and do not grant publisher rights',()=>{
 const lifecycle=read('lifecycle');
 for(const invariant of ['auth.uid()=p_user_id','FOR UPDATE','p_revision IS DISTINCT FROM p.revision',"p_verified IS DISTINCT FROM true",'teacher_v2_issue_employee_id','teacher_v2_set_assignment'])assert.ok(lifecycle.includes(invariant));
 assert.equal(/^\s*GRANT\s+(?:INSERT|UPDATE|DELETE|ALL)\b/im.test(lifecycle),false);

});
test('v2 material policies remove legacy authoring bypass and leave results/website policies untouched',()=>{
 const integration=read('integration');assert.equal((integration.match(/DROP POLICY/g)||[]).length,5);
 assert.ok(integration.includes("FROM public.teacher_profiles WHERE user_id=auth.uid()"));
 assert.ok(!/ON public\.(tests|test_attempts|site_config_versions)/.test(integration));
 assert.ok(!integration.includes('CREATE POLICY "Published material'));
});
test('resume metadata finalization is service-only; downloads are owner or Super Admin',()=>{
 const resume=read('resume');assert.ok(resume.includes('TO service_role;'));assert.ok(resume.includes("teacher_user_id=auth.uid() OR public.is_super_admin()"));
 assert.ok(resume.includes('p_revision IS DISTINCT FROM p.revision'));assert.ok(!resume.includes('INSERT INTO storage.buckets'));
});
test('restoration preserves employee identity and never reactivates assignments or legacy grants',()=>{
 const lifecycle=read('lifecycle');const restore=lifecycle.slice(lifecycle.indexOf('CREATE OR REPLACE FUNCTION public.teacher_v2_restore'),lifecycle.indexOf('-- Allowlisted nested payload:'));
 assert.ok(restore.includes('auth.uid()=p_user_id'));
 assert.ok(restore.includes("WHERE user_id=p_user_id AND status='suspended'"));
 assert.ok(restore.includes("'teacher.restored'"));
 assert.ok(!restore.includes('teacher_v2_issue_employee_id'));
 assert.ok(!restore.includes('UPDATE public.teacher_assignments'));
 assert.ok(!restore.includes('UPDATE public.result_staff_grants'));
});
test('teacher review notes are persisted with their timestamp and are server controlled',()=>{
 const schema=read('schema'),lifecycle=read('lifecycle');
 assert.ok(schema.includes('teacher_last_review_consistency'));
 assert.ok(lifecycle.includes('decision_reason=btrim(p_reason),reviewed_at=now()'));
 assert.ok(!/GRANT\s+(INSERT|UPDATE)\s+ON\s+public\.teacher_profiles/i.test(lifecycle));
});

test('privacy proposal suppresses cohorts below five distinct students and requires scoped access',()=>{
 const summary=read('result_privacy');
 assert.ok(summary.includes("teacher_v2_has_active_assignment(p_class,p_subject,'result.review')"));
 assert.ok(summary.includes('DISTINCT ON (a.student_id)'));
 assert.ok(summary.includes("IF v_count<5 THEN v_state:='suppressed';v_band:=NULL;"));
 assert.ok(summary.includes("a.status='submitted'"));
 assert.ok(!summary.includes('submitted_count bigint'));
});

test('Core Beta closes direct result-summary RPC access independently of UI flags',()=>{
 const integration=read('integration'),flags=read('beta_flags');
 assert.ok(!integration.includes('CREATE OR REPLACE FUNCTION public.teacher_v2_result_summary'));
 assert.ok(flags.includes("'teacher_v2_result_summary(text,text)'"));
 assert.ok(flags.includes('REVOKE ALL ON FUNCTION public.%s FROM PUBLIC,anon,authenticated,service_role'));
 assert.ok(!/GRANT EXECUTE ON FUNCTION public\.teacher_v2_result_summary/.test(integration));
});

test('v2 material access fails closed for pending, rejected and suspended profiles even with legacy grants',()=>{
 const integration=read('integration');
 const permission=integration.slice(integration.indexOf('CREATE OR REPLACE FUNCTION public.teacher_v2_material_permission'),integration.indexOf('REVOKE ALL ON FUNCTION public.teacher_v2_material_permission'));
 assert.ok(permission.includes('IF EXISTS(SELECT 1 FROM public.teacher_profiles WHERE user_id=auth.uid()) THEN'));
 assert.ok(permission.includes("IF NOT EXISTS(SELECT 1 FROM public.teacher_profiles WHERE user_id=auth.uid() AND status='approved') THEN RETURN false; END IF;"));
 assert.ok(permission.includes('teacher_v2_has_active_assignment(p_class,p_subject'));
 const legacy=permission.indexOf('RETURN EXISTS(SELECT 1 FROM public.result_staff_grants');
 assert.ok(legacy>permission.indexOf('END IF;'), 'legacy fallback must be outside v2 profile branch');
 assert.ok(permission.slice(0,legacy).includes("status='approved'"));
});

test('approval requires a verified nonempty assignment before employee ID issuance',()=>{
 const lifecycle=read('lifecycle');
 const review=lifecycle.slice(lifecycle.indexOf('CREATE OR REPLACE FUNCTION public.teacher_v2_review'),lifecycle.indexOf('CREATE OR REPLACE FUNCTION public.teacher_v2_suspend'));
 assert.ok(review.includes("p_decision='approve' AND jsonb_array_length(p_assignments)=0"));
 assert.ok(review.includes('Approval requires at least one verified class, subject and work assignment'));
 assert.ok(review.indexOf("p_decision='approve' AND jsonb_array_length(p_assignments)=0")<review.indexOf('teacher_v2_issue_employee_id(p_user_id)'));
 assert.ok(review.includes('p_verified IS DISTINCT FROM true'));
});

test('frontend displays the same fail-closed v2 legacy boundary as proposed SQL',()=>{
 const client=readFileSync('src/lib/teacherManagementValidation.ts','utf8');
 const integration=read('integration');
 assert.ok(client.includes('return profile!==null;'));
 assert.ok(integration.includes('IF EXISTS(SELECT 1 FROM public.teacher_profiles WHERE user_id=auth.uid()) THEN'));
 assert.ok(integration.includes("status='approved') THEN RETURN false; END IF;"));
 const ui=readFileSync('src/components/AdminTeacherDirectoryV2.tsx','utf8');
 assert.ok(ui.includes("disabled={busy||!verified||scopes.length===0||reason.trim().length<12}"));
});

test('isolated Preview acceptance suite tests legacy-only continuity and pending v2 fail-closed',()=>{
 const acceptance=read('acceptance');
 const legacyOnly=acceptance.indexOf('pre-v2 legacy-only class-10 grant unexpectedly denied');
 const profile=acceptance.indexOf('SELECT public.teacher_v2_save_application(');
 const pendingDenied=acceptance.indexOf('pending applicant bypassed v2 review with residual legacy grant');
 assert.ok(legacyOnly>=0&&legacyOnly<profile, 'legacy-only grant test must precede first profile');
 assert.ok(pendingDenied>profile, 'pending deny must follow creation of a v2 profile');
 assert.ok(!acceptance.includes('existing legacy grant lost during v2 application'));
});

test('Core Beta hides teacher result-summary action while the RPC EXECUTE grant is revoked',()=>{
 const service=readFileSync('src/services/teacherManagement.ts','utf8');
 const view=readFileSync('src/components/TeacherManagementV2.tsx','utf8');
 assert.ok(service.includes('export const teacherResultSummaryEnabled = false;'));
 assert.ok(view.includes("a.work_type==='result.review'&&teacherResultSummaryEnabled&&<button"));
});
