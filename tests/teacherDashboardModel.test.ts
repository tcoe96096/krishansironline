import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {teacherDashboardSummary} from '../src/lib/teacherDashboardModel';
import type {TeacherSnapshot} from '../src/services/teacherManagement';

const userId='11111111-1111-4111-8111-111111111111';
const approvedProfile:TeacherSnapshot={
  user_id:userId,employee_id:'KSOL-T-ABCDEF123456',display_name:'Example Teacher',
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
 assert.equal(summary.employeeId,'KSOL-T-ABCDEF123456');
 assert.deepEqual(summary.approvedScopes,[{id:'one',label:'Class 10 · History',workType:'materials.draft',workLabel:'Study Materials · Draft'}]);
 assert.equal(summary.approvedScopes.some(s=>s.label.includes('Political Science')),false,
   'Requested scope does not confer access');
});
test('one teacher can hold multiple distinct approved class/subject/work roles',()=>{
 const multi:TeacherSnapshot={...approvedProfile,
  assignments:[
    {id:'a',class_level:'10',subject:'History',work_type:'materials.draft',status:'active'},
    {id:'b',class_level:'10',subject:'History',work_type:'materials.review',status:'active'},
    {id:'c',class_level:'11',subject:'Political Science',work_type:'assessment.draft',status:'active'},
    {id:'d',class_level:'12',subject:'Political Science',work_type:'result.review',status:'active'},
    {id:'x',class_level:'12',subject:'Hindi',work_type:'result.review',status:'revoked'},
  ],
 };
 const assigned=teacherDashboardSummary(multi,userId).approvedScopes;
 assert.equal(assigned.length,4);
 assert.deepEqual(assigned.map(x=>x.workLabel),[
  'Study Materials · Draft',
  'Study Materials · Review',
  'Assessments · Draft',
  'Results · Review',
 ]);
 assert.equal(assigned.some(x=>x.label.includes('Hindi')),false);
 const suspended=teacherDashboardSummary({...multi,status:'suspended'},userId);
 assert.deepEqual(suspended.approvedScopes,[],'Suspended teachers must not see authorized scopes');
 const another=teacherDashboardSummary({...multi,status:'pending',employee_id:null},userId);
 assert.deepEqual(another.approvedScopes,[],'Self-requested preferences are never approved assignments');
 const dashboard=readFileSync('teacher-beta/TeacherDashboardData.tsx','utf8');
 assert.match(dashboard,/aria-label="Approved teacher work assignments"/);
 assert.match(dashboard,/Approved work: \{scope.workLabel\}/);
});

test('missing profile and pending drafts cannot pretend to be approved teachers',()=>{
 const missing=teacherDashboardSummary(null,userId);
 assert.deepEqual({status:missing.status,employeeId:missing.employeeId,approvedScopes:missing.approvedScopes},
  {status:'not_registered',employeeId:null,approvedScopes:[]});
 const draft=teacherDashboardSummary({...approvedProfile,status:'pending',employee_id:null,submitted_at:null},userId);
 assert.equal(draft.status,'draft');
 const pending=teacherDashboardSummary({...approvedProfile,status:'pending',employee_id:null,submitted_at:'2026-11-18T10:00:00Z'},userId);
 assert.equal(pending.status,'pending');
 for(const summary of [draft,pending]){
  assert.equal(summary.employeeId,null);
  assert.deepEqual(summary.approvedScopes,[]);
 }
});
test('rejected and suspended profiles cannot display authorized scopes or issued ID',()=>{
 for(const status of ['rejected','suspended'] as const){
  const summary=teacherDashboardSummary({...approvedProfile,status,employee_id:status==='rejected'?null:approvedProfile.employee_id},userId);
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

test('dashboard projects personal details, qualifications and resume metadata only for its own verified account',()=>{
 const own={...approvedProfile,qualifications:[{title:'M.A.',institution:'University',year:2020}],
   resumes:[{id:'r1',original_filename:'Teaching CV.pdf',verification_status:'pending'}]};
 const summary=teacherDashboardSummary(own,userId);
 assert.equal(summary.displayName,'Example Teacher');
 assert.equal(summary.contactEmail,'teacher@example.test');
 assert.equal(summary.experienceYears,3);
 assert.deepEqual(summary.qualifications,[{title:'M.A.',institution:'University',year:2020}]);
 assert.deepEqual(summary.resumeRecords,[{id:'r1',filename:'Teaching CV.pdf',status:'pending'}]);
 const noRecord=teacherDashboardSummary(null,userId);
 assert.deepEqual({qualifications:noRecord.qualifications,resumeRecords:noRecord.resumeRecords,contactEmail:noRecord.contactEmail},
   {qualifications:[],resumeRecords:[],contactEmail:null});
 assert.throws(()=>teacherDashboardSummary(own,'22222222-2222-4222-8222-222222222222'),/Invalid teacher profile/);
 const view=readFileSync('teacher-beta/TeacherDashboardData.tsx','utf8');
 assert.match(view,/My Registration Details/);
 assert.match(view,/Resume Records/);
 assert.doesNotMatch(view,/createSignedUrl|download\(|\.upload\(|localStorage/);
});

test('admin directory displays only resume metadata after server-side super-admin verification',()=>{
 const directory=readFileSync('src/components/AdminTeacherDirectoryV2.tsx','utf8');
 assert.match(directory,/teacherCall<boolean>\('is_super_admin'\)/);
 assert.match(directory,/Submitted Resume Records/);
 assert.match(directory,/p\.resumes\.map\(doc=>/);
 assert.match(directory,/doc\.verification_status/);
 assert.doesNotMatch(directory,/createSignedUrl|\.download\(|\.upload\(|localStorage/);
});

test('admin review never preselects applicant-requested permissions',()=>{
 const directory=readFileSync('src/components/AdminTeacherDirectoryV2.tsx','utf8');
 assert.match(directory,/setScopes\(\[\]\); \/\* Never pre-authorize applicant-requested scopes/);
 assert.doesNotMatch(directory,/setScopes\(p\.status==='pending'\?p\.requested_scopes/);
 assert.match(directory,/No class or subject is approved by default/);
 assert.match(directory,/scopes\.length===0/);
 assert.match(directory,/p_verified:false,p_assignments:scopes/);
 assert.match(directory,/Requested: Class/);
 assert.match(directory,/scope\.workType/);
});

test('admin verification must be recorded by a revision-bound server RPC, never a checkbox',()=>{
 const directory=readFileSync('src/components/AdminTeacherDirectoryV2.tsx','utf8');
 assert.match(directory,/teacher_v2_record_identity_verification/);
 assert.match(directory,/teacher_v2_verification_status/);
 assert.match(directory,/p_teacher_user_id:p.user_id,p_profile_revision:p.revision/);
 assert.match(directory,/p_teacher_user_id:teacherId,p_profile_revision:profileRevision/);
 assert.match(directory,/verifiedRevision!==p\.revision/);
 assert.match(directory,/Server verification recorded for revision/);
 assert.match(directory,/recordId!=='string'/);
 assert.match(directory,/p_verified:false,p_assignments:scopes/);
 assert.doesNotMatch(directory,/Identity independently verified<\/label>/);
});
