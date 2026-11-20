// Offline policy model tests only. This does NOT prove Supabase Storage RLS or signed URL safety.
import test from 'node:test';
import assert from 'node:assert/strict';

// Contract: private teacher media must never be authorized from client-supplied role,
// employee ID, email, or object path alone. The server must resolve actor identity,
// approved administrative role, ownership and application record.
function authorizeMedia({ actorId, ownerId, serverRole, operation, verifiedAdmin, isPrivateBucket, objectBelongsToApplication }) {
  if (!actorId || !ownerId || !isPrivateBucket || !objectBelongsToApplication) return false;
  if (!['read', 'upload', 'delete'].includes(operation)) return false;
  if (actorId === ownerId) return operation !== 'delete'; // deletion requires a separate reviewed workflow
  return serverRole === 'super_admin' && verifiedAdmin === true && operation === 'read';
}

const base = { actorId: 'teacher-a', ownerId: 'teacher-a', serverRole: 'teacher', operation: 'read', verifiedAdmin: false, isPrivateBucket: true, objectBelongsToApplication: true };
test('teacher may read own private application media', () => assert.equal(authorizeMedia(base), true));
test('teacher may upload own media through reviewed server path', () => assert.equal(authorizeMedia({...base, operation:'upload'}), true));
test('teacher cannot delete media through general media route', () => assert.equal(authorizeMedia({...base, operation:'delete'}), false));
test('cross-teacher read and upload denied', () => {
  for (const operation of ['read','upload','delete']) assert.equal(authorizeMedia({...base, ownerId:'teacher-b', operation}), false);
});
test('unverified admin and client-proclaimed admin denied', () => {
  assert.equal(authorizeMedia({...base, ownerId:'teacher-b', serverRole:'super_admin', verifiedAdmin:false}), false);
  assert.equal(authorizeMedia({...base, ownerId:'teacher-b', serverRole:'teacher', verifiedAdmin:true}), false);
});
test('verified super-admin has read-only review access', () => {
  assert.equal(authorizeMedia({...base, ownerId:'teacher-b', serverRole:'super_admin', verifiedAdmin:true}), true);
  assert.equal(authorizeMedia({...base, ownerId:'teacher-b', serverRole:'super_admin', verifiedAdmin:true, operation:'upload'}), false);
});
test('public bucket, unlinked object, missing identity and unknown action fail closed', () => {
  for (const patch of [{isPrivateBucket:false},{objectBelongsToApplication:false},{actorId:''},{ownerId:''},{operation:'share'}])
    assert.equal(authorizeMedia({...base,...patch}), false);
});
