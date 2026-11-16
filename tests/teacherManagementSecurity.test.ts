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
