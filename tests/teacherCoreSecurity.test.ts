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
  assert.match(portal,/directory\s*&&\s*canReview\s*\?\s*<AdminTeacherDirectoryV2/);
  assert.ok(!portal.includes("signInWithGoogle('staff-workspace')"));
});

test('SECURITY DEFINER snapshots explicitly allowlist profile and assignment fields',()=>{
  const sql=read('lifecycle');
  const snapshot=sql.split('CREATE OR REPLACE FUNCTION public.teacher_v2_snapshot')[1]?.split('CREATE OR REPLACE FUNCTION public.teacher_v2_directory')[0];
  assert.ok(snapshot,'snapshot RPC missing');
  assert.doesNotMatch(snapshot,/to_jsonb\s*\(\s*[pa]\s*\)/i,'raw table-to-JSON exposes future private columns');
  for(const field of ['user_id','display_name','status','revision','requested_scopes','qualifications','assignments']){
    assert.ok(snapshot.includes("'"+field+"'"),'missing snapshot contract field '+field);
  }
  assert.doesNotMatch(snapshot,/'storage_path'|'content_type'|'size_bytes'/,'resume storage internals must never leak');
});


test('Server-side beta flags default closed and cannot be toggled by clients',()=>{
  const sql=read('beta_flags');
  assert.ok(sql.includes('enabled boolean NOT NULL DEFAULT false'));
  assert.ok(!sql.includes('UPDATE private.teacher_beta_features SET enabled=true'));
  assert.ok(sql.includes('REVOKE ALL ON private.teacher_beta_features FROM PUBLIC,anon,authenticated,service_role'));
  assert.ok(sql.includes('REVOKE ALL ON FUNCTION private.teacher_v2_feature_enabled(text) FROM PUBLIC,anon,authenticated,service_role'));
  assert.ok(sql.includes("IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Authentication required'"));
  for(const feature of ['registration','material_authoring','result_analytics','resume_uploads','advanced_assignments']){
    assert.ok(sql.includes("'"+feature+"'"),'missing server-side feature '+feature);
  }
});

test('Teacher review and lifecycle enforce scope, identity and revocation boundaries',()=>{
  const lifecycle=read('lifecycle');
  const functions=read('functions');
  assert.ok(lifecycle.includes('p_verified IS DISTINCT FROM true'));
  assert.ok(lifecycle.includes('p_revision IS DISTINCT FROM p.revision'));
  assert.ok(lifecycle.includes('teacher_v2_issue_employee_id(p_user_id)'));
  assert.ok(lifecycle.includes('teacher_v2_set_assignment(p_user_id'));
  assert.ok(lifecycle.includes("status='revoked',revoked_by=auth.uid(),revoked_at=now()"));
  assert.ok(lifecycle.includes('teacher_v2_guard_legacy_grant'));
  assert.ok(functions.includes("v_status<>'approved'"));
  assert.ok(functions.includes('private.teacher_v2_feature_enabled'));
});

test('V2 material permissions deny suspended profiles and cross-subject grants',()=>{
  const sql=read('integration');
  const assignment=read('functions');
  const start=sql.indexOf('CREATE OR REPLACE FUNCTION public.teacher_v2_material_permission');
  const end=sql.indexOf('REVOKE ALL ON FUNCTION public.teacher_v2_material_permission',start);
  assert.ok(start>=0&&end>start);
  const body=sql.slice(start,end);
  assert.ok(body.includes('IF EXISTS(SELECT 1 FROM public.teacher_profiles WHERE user_id=auth.uid()) THEN'));
  assert.ok(body.includes("status='approved'"));
  assert.ok(body.includes('THEN RETURN false; END IF;'));
  assert.ok(body.includes('teacher_v2_has_active_assignment(p_class,p_subject'));
  assert.ok(body.includes('private.teacher_v2_feature_enabled(\'material_authoring\')'));
  assert.ok(body.includes('result_staff_grants g'));
  const check=assignment.split('CREATE OR REPLACE FUNCTION public.teacher_v2_has_active_assignment')[1];
  assert.ok(check);
  for(const condition of ["p.user_id=v_actor","p.status='approved'","a.status='active'","a.class_level=p_class_level","a.subject=p_subject","a.work_type=p_work_type"]){
    assert.ok(check.includes(condition),'missing scoped assignment check '+condition);
  }
});

test('V2 policy replacement preserves public published reads and limits draft writes',()=>{
  const sql=read('integration');
  const dropped=[...sql.matchAll(/DROP POLICY IF EXISTS "([^"]+)" ON public\.study_material_items/g)].map(m=>m[1]);
  assert.deepEqual(dropped,[
    'Owner may delete only own drafts',
    'Owner or super admin reads review drafts',
    'Scoped editors create drafts',
    'Scoped editors update only own drafts',
    'Scoped staff submit own drafts for review'
  ]);
  assert.ok(!dropped.includes('Published material is readable'));
  assert.ok(sql.includes("created_by=auth.uid() AND status='draft' AND public.teacher_v2_material_permission(class_level,subject,'materials.draft.write')"));
  assert.ok(sql.includes("status='pending_review' AND public.teacher_v2_material_permission(class_level,subject,'materials.review.propose')"));
});

test('Role grants hardening remains review-only and does not grant role mutation',()=>{
  const sql=readFileSync('docs/proposed-migrations/teacher_management_v2_role_grants_hardening_REVIEW_ONLY.sql','utf8');
  assert.match(sql,/REVIEW ONLY.*NOT EXECUTED/i);
  assert.ok(sql.includes('REVOKE TRUNCATE, TRIGGER, REFERENCES ON TABLE public.user_roles FROM anon, authenticated'));
  assert.doesNotMatch(sql,/^\s*GRANT\s+(?:ALL|INSERT|UPDATE|DELETE|TRUNCATE|TRIGGER|REFERENCES)\b/im);
  assert.doesNotMatch(sql,/^\s*(?:DELETE|UPDATE|INSERT|TRUNCATE|DROP)\s+(?:FROM\s+|TABLE\s+)?public\.user_roles\b/im);
  assert.ok(sql.includes('has_table_privilege'));
});


test('Review-only profile RPC rejects email backslashes, controls and bidi spoofing',()=>{
  const sql=read('profile_rpc');
  assert.ok(sql.includes("p_contact_email ~ '[[:cntrl:]]'"));
  assert.ok(sql.includes('pg_catalog.strpos(p_contact_email,pg_catalog.chr(92)) > 0'));
  assert.ok(sql.includes("p_contact_email ~ U&'[\\00AD\\061C\\200B-\\200F\\202A-\\202E\\2060-\\206F\\FEFF]'"));
});


test('Advanced teacher grants require an independent server feature flag',()=>{
  const sql=read('functions');
  assert.ok(sql.includes("p_action='grant' AND p_work_type IN ('materials.review','assessment.draft')"));
  assert.ok(sql.includes("NOT private.teacher_v2_feature_enabled('advanced_assignments')"));
  assert.ok(sql.includes("p_action='grant' AND p_work_type='result.review'"));
  assert.ok(sql.includes("NOT private.teacher_v2_feature_enabled('result_analytics')"));
  assert.ok(sql.includes("p_action='grant' AND NOT private.teacher_v2_feature_enabled('registration')"));
});
