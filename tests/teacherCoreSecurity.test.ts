import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync, readdirSync} from 'node:fs';

const read = (name:string) => readFileSync(`docs/proposed-migrations/teacher_management_v2_${name}_REVIEW_ONLY.sql`,'utf8');

test('Core Beta database proposals stay review-only and uninstalled',()=>{
  for(const name of ['schema','beta_flags','profile_rpc','functions','lifecycle','integration']){
    const sql=read(name);
    assert.match(sql,/REVIEW ONLY/i,`${name}: review notice missing`);
    assert.match(sql,/NOT EXECUTED|DO NOT EXECUTE|NEVER EXECUTE/i,`${name}: execution hold missing`);
  }
  assert.equal(readdirSync('supabase/migrations').some(path=>/teacher_management_v2/i.test(path)),false);
});

test('Sensitive teacher tables have default-deny RLS and client grants revoked',()=>{
  const sql=read('schema');
  for(const table of ['teacher_profiles','teacher_qualifications','teacher_resume_documents','teacher_assignments','teacher_audit_events']){
    assert.ok(sql.includes(`ALTER TABLE public.${table} ENABLE ROW LEVEL SECURITY`),`RLS missing: ${table}`);
  }
  assert.match(sql,/REVOKE ALL ON public\.teacher_profiles,[\s\S]*?FROM anon, authenticated/);
});

test('Independent Super Admin review controls IDs and assignments',()=>{
  const funcs=read('functions'),lifecycle=read('lifecycle');
  assert.match(funcs,/CREATE OR REPLACE FUNCTION public\.teacher_v2_issue_employee_id/);
  assert.match(funcs,/REVOKE ALL ON FUNCTION public\.teacher_v2_issue_employee_id\(uuid\) FROM PUBLIC, anon, authenticated/);
  assert.ok(lifecycle.includes('p_verified IS DISTINCT FROM true'));
  assert.ok(lifecycle.includes('auth.uid()=p_user_id'));
  assert.ok(lifecycle.includes("p_decision='approve' AND jsonb_array_length(p_assignments)=0"));
  assert.ok(lifecycle.includes('teacher_v2_issue_employee_id(p_user_id)'));
});

test('Legacy material permissions cannot override a v2 review or suspension',()=>{
  const sql=read('integration');
  assert.equal((sql.match(/DROP POLICY IF EXISTS/g)||[]).length,5);
  const v2Start=sql.indexOf('IF EXISTS(SELECT 1 FROM public.teacher_profiles WHERE user_id=auth.uid()) THEN');
  const legacy=sql.indexOf('RETURN EXISTS(SELECT 1 FROM public.result_staff_grants');
  assert.ok(v2Start>=0&&legacy>v2Start);
  const v2=sql.slice(v2Start,legacy);
  assert.ok(v2.includes("status='approved'"));
  assert.ok(v2.includes("THEN RETURN false; END IF;"));
  assert.ok(v2.includes("teacher_v2_has_active_assignment"));
  assert.ok(sql.includes('CREATE POLICY "V2 read own material"'));
  assert.ok(!sql.includes('DROP POLICY IF EXISTS "Published material is readable"'));
});

test('Resume and analytics stay outside isolated UI and are not enabled by SQL',()=>{
  const component=readFileSync('src/components/TeacherManagementV2.tsx','utf8');
  const service=readFileSync('src/services/teacherManagement.ts','utf8');
  const directory=readFileSync('src/components/AdminTeacherDirectoryV2.tsx','utf8');
  for(const source of [component,service,directory]){
    assert.doesNotMatch(source,/uploadTeacherResume|downloadTeacherResume|teacherResumeEnabled|resultAnalyticsOpen|teacher_v2_result_summary/);
  }
  assert.ok(!read('integration').includes('CREATE OR REPLACE FUNCTION public.teacher_v2_result_summary'));
  assert.ok(read('beta_flags').includes("'teacher_v2_result_summary(text,text)'"));
});

test('Teacher Directory navigation follows the exact verified account',()=>{
  const portal=readFileSync('teacher-beta/main.tsx','utf8');
  assert.ok(portal.includes('setSuperAdminAccount(user.id)'));
  assert.ok(portal.includes('superAdminAccount===user.id'));
  assert.ok(portal.includes('{directory&&canReview?<AdminTeacherDirectoryV2'));
  assert.ok(!portal.includes("signInWithGoogle('staff-workspace')"));
});
