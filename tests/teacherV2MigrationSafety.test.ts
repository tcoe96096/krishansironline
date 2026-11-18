import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const read=(name:string)=>readFileSync(`docs/proposed-migrations/teacher_management_v2_${name}_REVIEW_ONLY.sql`,'utf8');

test('v2 schema remains additive and legacy grants are not dropped',()=>{
 const schema=read('schema');
 for(const table of ['teacher_profiles','teacher_qualifications','teacher_assignments','teacher_audit_events']){
  assert.match(schema,new RegExp(`CREATE TABLE IF NOT EXISTS public\\.${table}\\b`));
  assert.match(schema,new RegExp(`ALTER TABLE public\\.${table} ENABLE ROW LEVEL SECURITY`));
 }
 assert.doesNotMatch(schema,/\b(?:DROP|TRUNCATE)\s+TABLE\s+public\.(?:result_staff_grants|teacher_enrollment_requests)/i);
 assert.match(schema,/teacher_assignments_one_active_scope/);
});

test('employee ID is allocated server-side for approved profiles only',()=>{
 const schema=read('schema'),functions=read('functions');
 assert.match(schema,/employee_id text UNIQUE/);
 assert.match(schema,/teacher_employee_id_requires_approval/);
 assert.match(functions,/public\.is_super_admin\(\)/);
 assert.match(functions,/v_status<>'approved'/);
 assert.match(functions,/FOR v_attempt IN 1\.\.10 LOOP/);
 assert.match(functions,/teacher_profiles_employee_id_key/);
});

test('legacy teacher grants must not be silently disabled on application save',()=>{
 const lifecycle=read('lifecycle');
 const review=lifecycle.slice(lifecycle.indexOf('CREATE OR REPLACE FUNCTION public.teacher_v2_review'),lifecycle.indexOf('CREATE OR REPLACE FUNCTION public.teacher_v2_suspend'));
 assert.match(review,/IF p_decision='approve' THEN/);
 assert.match(review,/UPDATE public\.result_staff_grants SET is_active=false/);
 assert.match(lifecycle,/Legacy grant cannot bypass a v2 profile/);
 assert.doesNotMatch(read('schema'),/UPDATE\s+public\.result_staff_grants/i);
});

test('initial registration rollout does not require material policy replacement',()=>{
 const schema=read('schema'),flags=read('beta_flags');
 assert.doesNotMatch(schema,/DROP POLICY/i);
 assert.match(flags,/enabled boolean NOT NULL DEFAULT false/);
 assert.doesNotMatch(schema,/GRANT\s+ALL\s+ON/i);
});

test('assignment grant requires approved teacher, exact scope and Super Admin',()=>{
 const functions=read('functions');
 assert.match(functions,/p_action='grant' AND v_status<>'approved'/);
 assert.match(functions,/p_action='grant' AND NOT private\.teacher_v2_feature_enabled\('registration'\)/);
 assert.match(functions,/teacher_assignments_one_active_scope|Active assignment already exists/);
 assert.match(functions,/public\.is_super_admin\(\)/);
});
