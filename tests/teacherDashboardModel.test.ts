import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {teacherDashboardSummary} from '../src/lib/teacherDashboardModel';
import type {TeacherSnapshot} from '../src/services/teacherManagement';

const userId='11111111-1111-4111-8111-111111111111';
const approvedProfile:TeacherSnapshot={
  user_id:userId,employee_id:'KSOL-T-EXAMPLE',display_name:'Example Teacher',
  contact_email:'teacher@example.test',phone:null,experience_years:3,
  status:'approved',revision:4,submitted_at:null,application_reason:null,
  decision_reason:null,reviewed_at:null,requested_scopes:[
    {classLevel:'12',subject:'Political Science',workType:'result.review'},
    {classLevel:'11',subject:'Political Science',workType:'materials.draft'},
  ],
  qualifications:[],
  assignments:[
    {id:'one',class_level:'10',subject:'History',work_type:'materials.draft',status:'active'},
    {id:'two',class_level:'11',subject:'Political Science',work_type:'materials.draft',status:'revoked'},
  ],
  resumes:[],
};

test('dashboard shows employee ID and only active server-approved assignments',()=>{
 const summary=teacherDashboardSummary(approvedProfile,userId);
 assert.equal(summary.status,'approved');
 assert.equal(summary.employeeId,'KSOL-T-EXAMPLE');
 assert.deepEqual(summary.approvedScopes,[{id:'one',label:'Class 10 · History'}]);
 assert.equal(summary.approvedScopes.some(s=>s.label.includes('Political Science')),false,
   'Requested scope does not confer access');
});
test('missing profile and pending drafts cannot pretend to be approved teachers',()=>{
 const missing=teacherDashboardSummary(null,userId);
 assert.deepEqual({status:missing.status,employeeId:missing.employeeId,approvedScopes:missing.approvedScopes},
  {status:'not_registered',employeeId:null,approvedScopes:[]});
 const draft=teacherDashboardSummary({...approvedProfile,status:'pending',submitted_at:null},userId);
 assert.equal(draft.status,'draft');
 const pending=teacherDashboardSummary({...approvedProfile,status:'pending',submitted_at:'2026-11-18T10:00:00Z'},userId);
 assert.equal(pending.status,'pending');
 for(const summary of [draft,pending]){
  assert.equal(summary.employeeId,null);
  assert.deepEqual(summary.approvedScopes,[]);
 }
});
test('rejected and suspended profiles cannot display authorized scopes or issued ID',()=>{
 for(const status of ['rejected','suspended'] as const){
  const summary=teacherDashboardSummary({...approvedProfile,status},userId);
  assert.equal(summary.status,status);
  assert.equal(summary.employeeId,null);
  assert.deepEqual(summary.approvedScopes,[]);
 }
});
test('foreign, invalid or unverified account records fail closed',()=>{
 assert.throws(()=>teacherDashboardSummary(approvedProfile,'22222222-2222-4222-8222-222222222222'),/Invalid teacher profile/);
 assert.throws(()=>teacherDashboardSummary({...approvedProfile,assignments:[{id:'hack'}]},userId),/Invalid teacher profile/);
 assert.throws(()=>teacherDashboardSummary(approvedProfile,''),/Authenticated teacher identity required/);
});
test('dashboard reads its own authenticated record, and preview cannot call backend',()=>{
 const portal=readFileSync('teacher-beta/main.tsx','utf8');
 const view=readFileSync('teacher-beta/TeacherDashboardData.tsx','utf8');
 assert.match(portal,/!demo&&user&&<TeacherDashboardData key=\{user.id\} userId=\{user.id\}\/>/);
 assert.match(view,/teacherCall<unknown>\('teacher_v2_snapshot',\{p_user_id:userId\}\)/);
 assert.match(view,/teacherDashboardSummary\(response,userId\)/);
 assert.match(view,/current=false/);
 assert.doesNotMatch(view,/\.(?:insert|update|delete|upsert|upload)\(/);
 assert.doesNotMatch(view,/teacher_v2_save_application|teacher_v2_set_assignment|teacher_v2_review/);
});
