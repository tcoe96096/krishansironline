import {test} from 'node:test';
import assert from 'node:assert/strict';
import {isOwnTeacherSnapshot} from '../src/lib/teacherSnapshotValidation';

const snapshot={
 user_id:'teacher-a',employee_id:null,display_name:'Example Teacher',contact_email:null,phone:null,
 experience_years:null,status:'pending',revision:1,submitted_at:null,application_reason:null,
 decision_reason:null,reviewed_at:null,requested_scopes:[],qualifications:[],assignments:[],resumes:[]
};
test('teacher snapshot is accepted only for authenticated owner',()=>{
 assert.equal(isOwnTeacherSnapshot(snapshot,'teacher-a'),true);
 assert.equal(isOwnTeacherSnapshot(snapshot,'teacher-b'),false);
 assert.equal(isOwnTeacherSnapshot(snapshot,''),false);
});
test('malformed or missing teacher snapshots fail closed',()=>{
 assert.equal(isOwnTeacherSnapshot(null,'teacher-a'),false);
 assert.equal(isOwnTeacherSnapshot({...snapshot,revision:0},'teacher-a'),false);
 assert.equal(isOwnTeacherSnapshot({...snapshot,assignments:null},'teacher-a'),false);
});

test('nested untrusted snapshot fields fail closed',()=>{
 assert.equal(isOwnTeacherSnapshot({...snapshot,requested_scopes:[{classLevel:6,subject:'History',workType:'materials.draft'}]},'teacher-a'),false);
 assert.equal(isOwnTeacherSnapshot({...snapshot,qualifications:[{title:'B.Ed',institution:'College',year:'2020'}]},'teacher-a'),false);
 assert.equal(isOwnTeacherSnapshot({...snapshot,resumes:[{id:1,original_filename:'cv.pdf',verification_status:'pending'}]},'teacher-a'),false);
 assert.equal(isOwnTeacherSnapshot({...snapshot,status:'admin'},'teacher-a'),false);
 assert.equal(isOwnTeacherSnapshot({...snapshot,user_id:'teacher-b'},'teacher-a'),false);
});

test('well-typed but unauthorized scope and status values are rejected',()=>{
 assert.equal(isOwnTeacherSnapshot({...snapshot,requested_scopes:[{classLevel:'13',subject:'History',workType:'materials.draft'}]},'teacher-a'),false);
 assert.equal(isOwnTeacherSnapshot({...snapshot,requested_scopes:[{classLevel:'10',subject:'History',workType:'publish.production'}]},'teacher-a'),false);
 assert.equal(isOwnTeacherSnapshot({...snapshot,assignments:[{id:'a',class_level:'10',subject:'History',work_type:'materials.draft',status:'admin'}]},'teacher-a'),false);
 assert.equal(isOwnTeacherSnapshot({...snapshot,resumes:[{id:'r',original_filename:'resume.pdf',verification_status:'approved'}]},'teacher-a'),false);
 assert.equal(isOwnTeacherSnapshot({...snapshot,employee_id:'KSOL-T-INVALID!'},'teacher-a'),false);
 assert.equal(isOwnTeacherSnapshot({...snapshot,employee_id:'KSOL-T-ABCDEF123456'},'teacher-a'),false);
 assert.equal(isOwnTeacherSnapshot({...snapshot,qualifications:[{title:'B.Ed',institution:'College',year:2100}]},'teacher-a'),false);
});
test('valid scope and assignment metadata can render for the owner',()=>{
 const assigned={...snapshot,status:'approved',employee_id:'KSOL-T-ABCDEF123456',
  requested_scopes:[{classLevel:'10',subject:'History',workType:'materials.draft'}],
  qualifications:[{title:'B.Ed',institution:'College',year:2020}],
  assignments:[{id:'assignment-a',class_level:'10',subject:'History',work_type:'materials.draft',status:'active'}],
  resumes:[{id:'resume-a',original_filename:'resume.pdf',verification_status:'pending'}]};
 assert.equal(isOwnTeacherSnapshot(assigned,'teacher-a'),true);
 assert.equal(isOwnTeacherSnapshot(assigned,'teacher-b'),false);
});
