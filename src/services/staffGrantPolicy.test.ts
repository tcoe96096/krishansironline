import assert from 'node:assert/strict';
import test from 'node:test';
import { grantIsWithinRole } from './staffGrantPolicy';

test('a teacher cannot approve or publish examination results',()=>{
  assert.equal(grantIsWithinRole('teacher',['results.release.propose'],true),false);
  assert.equal(grantIsWithinRole('teacher',['results.read','materials.draft.write'],true),true);
});
test('material grants are disabled before backend readiness',()=>{
  assert.equal(grantIsWithinRole('content_manager',['materials.read'],false),false);
  assert.equal(grantIsWithinRole('academic_admin',['materials.draft.write'],false),false);
  assert.equal(grantIsWithinRole('academic_admin',['results.read'],false),true);
});
test('only approved content manager capabilities are allowed',()=>{
  assert.equal(grantIsWithinRole('content_manager',['materials.read','materials.review.propose'],true),true);
  assert.equal(grantIsWithinRole('content_manager',['results.export'],true),false);
  assert.equal(grantIsWithinRole('viewer',['materials.draft.write'],true),false);
});
test('empty and duplicated grant selections are rejected',()=>{
  assert.equal(grantIsWithinRole('teacher',[],true),false);
  assert.equal(grantIsWithinRole('teacher',['results.read','results.read'],true),false);
});
