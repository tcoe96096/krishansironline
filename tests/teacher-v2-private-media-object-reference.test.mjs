// REVIEW-ONLY offline contract tests: no Supabase requests or production assertions.
import test from 'node:test';
import assert from 'node:assert/strict';

// A private-media request must use an opaque, server-owned object reference.
// Caller-controlled paths, employee IDs, emails, and public URLs are never proof of access.
function authorizePrivateMediaRequest({actor, owner, authenticated, serverResolvedOwner, privateBucket, objectKey, mediaType, operation, reviewerScope, serverRole}) {
  if (!authenticated || !actor || !owner || !serverResolvedOwner || !privateBucket) return false;
  if (!['photo', 'resume'].includes(mediaType) || !['read', 'upload'].includes(operation)) return false;
  if (typeof objectKey !== 'string' || !/^[a-f0-9]{32}$/.test(objectKey)) return false;
  if (owner !== serverResolvedOwner) return false;
  if (actor === owner) return true;
  return operation === 'read' && serverRole === 'super_admin' && reviewerScope === owner;
}
const base={actor:'teacher-a',owner:'teacher-a',authenticated:true,serverResolvedOwner:'teacher-a',privateBucket:true,objectKey:'0123456789abcdef0123456789abcdef',mediaType:'photo',operation:'read',reviewerScope:null,serverRole:'teacher'};
test('authenticated teacher own opaque media reference accepted in offline model',()=>assert.equal(authorizePrivateMediaRequest(base),true));
test('reject anonymous, unbound owner and public bucket',()=>{
  for(const patch of [{authenticated:false},{serverResolvedOwner:'teacher-b'},{privateBucket:false}]) assert.equal(authorizePrivateMediaRequest({...base,...patch}),false);
});
test('reject caller supplied path, traversal, URL, email, employee id and malformed keys',()=>{
  for(const objectKey of ['teacher-a/photo.png','../other','https://example.com/media','teacher@example.com','EMP-001','', '0123456789abcdef0123456789abcdeg']) assert.equal(authorizePrivateMediaRequest({...base,objectKey}),false);
});
test('reject cross-teacher access without exact server review scope',()=>{
  for(const patch of [{actor:'teacher-b'},{actor:'admin',serverRole:'super_admin'},{actor:'admin',serverRole:'teacher',reviewerScope:'teacher-a'}]) assert.equal(authorizePrivateMediaRequest({...base,...patch}),false);
});
test('super admin scoped review permits read, not upload',()=>{
  const admin={...base,actor:'admin',serverRole:'super_admin',reviewerScope:'teacher-a'};
  assert.equal(authorizePrivateMediaRequest(admin),true);
  assert.equal(authorizePrivateMediaRequest({...admin,operation:'upload'}),false);
});
test('unknown media types and destructive operations are denied',()=>{
  for(const patch of [{mediaType:'other'},{operation:'delete'},{operation:'move'},{operation:'share'}]) assert.equal(authorizePrivateMediaRequest({...base,...patch}),false);
});
