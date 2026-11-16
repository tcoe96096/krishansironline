import {test} from 'node:test';
import assert from 'node:assert/strict';
import {usesTeacherV2Assignments} from '../src/lib/teacherManagementValidation';
test('a first v2 draft or rejection does not silently revoke an independently approved legacy grant',()=>{
 assert.equal(usesTeacherV2Assignments(null),false);
 assert.equal(usesTeacherV2Assignments({status:'pending',employee_id:null}),false);
 assert.equal(usesTeacherV2Assignments({status:'rejected',employee_id:null}),false);
});
test('approved or suspended v2 identities never fall back to legacy grants',()=>{
 for(const status of ['approved','suspended'])assert.equal(usesTeacherV2Assignments({status,employee_id:null}),true);
 for(const status of ['pending','rejected','approved','suspended'])assert.equal(usesTeacherV2Assignments({status,employee_id:'KSOL-T-123456ABCDEF'}),true);
 assert.equal(usesTeacherV2Assignments({status:'unknown',employee_id:null}),true);
});
