import {test} from 'node:test';
import assert from 'node:assert/strict';
import {usesTeacherV2Assignments} from '../src/lib/teacherManagementValidation';

test('legacy permissions apply only when no v2 profile exists',()=>{
 assert.equal(usesTeacherV2Assignments(null),false);
});

test('a v2 profile always requires v2 authorization, including draft, pending and rejected',()=>{
 for(const status of ['pending','rejected','approved','suspended','unknown']){
  for(const employee_id of [null,'KSOL-T-123456ABCDEF']){
   assert.equal(usesTeacherV2Assignments({status,employee_id}),true,
    `Legacy fallback is forbidden for ${status} with employee ID ${String(employee_id)}`);
  }
 }
});
