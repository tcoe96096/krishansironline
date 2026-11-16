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
 assert.equal(/GRANT.*(?:INSERT|UPDATE|DELETE)/i.test(lifecycle),false);

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

test('result summary suppresses cohorts below five distinct students and requires scoped access',()=>{
 const integration=read('integration');
 const summary=integration.slice(integration.indexOf('CREATE OR REPLACE FUNCTION public.teacher_v2_result_summary'));
 assert.ok(summary.includes("teacher_v2_has_active_assignment(p_class,p_subject,'result.review')"));
 assert.ok(summary.includes('count(DISTINCT a.student_id) >= 5'));
 assert.ok(summary.includes('ELSE NULL::bigint'));
 assert.ok(summary.includes('ELSE NULL::numeric'));
 assert.ok(summary.includes("a.status='submitted'"));
 assert.ok(!/GRANT EXECUTE ON FUNCTION public.teacher_v2_result_summary\(text,text\) TO anon/.test(summary));
});

test('Core Beta denies direct authenticated result-summary RPC execution until fixed-cohort privacy approval',()=>{
 const integration=read('integration');
 const summary=integration.slice(integration.indexOf('CREATE OR REPLACE FUNCTION public.teacher_v2_result_summary'));
 assert.ok(summary.includes('REVOKE ALL ON FUNCTION public.teacher_v2_result_summary(text,text) FROM PUBLIC,anon,authenticated;'));
 const executable=summary.split('\n').filter(line=>/^\s*GRANT\s+EXECUTE\s+ON\s+FUNCTION\s+public\.teacher_v2_result_summary\s*\(/i.test(line));
 assert.deepEqual(executable,[], 'result-summary must remain inaccessible even if UI flags are bypassed');
});
