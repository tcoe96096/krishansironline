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
