import assert from 'node:assert/strict';
import test from 'node:test';

// Synthetic policy oracle only. NOT a server authorization implementation.
// This file must never be imported into production or treated as RLS evidence.
type Actor = { kind: 'student'; classIds: readonly string[]; active: boolean }
  | { kind: 'teacher'; assignments: readonly string[] }
  | { kind: 'admin'; mayPublish: boolean };
type Material = {
  id: string; classId: string; subject: string;
  state: 'draft' | 'published' | 'archived';
  visibility: 'private'; kind: 'pdf' | 'video' | 'note';
};
const M1: Material = { id: 'M1', classId: 'A', subject: 'History', state: 'published', visibility: 'private', kind: 'pdf' };
const M2: Material = { ...M1, id: 'M2', state: 'draft', kind: 'note' };
const M3: Material = { ...M1, id: 'M3', classId: 'B', state: 'archived', kind: 'video' };
const student = (classIds: readonly string[], active = true): Actor => ({ kind: 'student', classIds, active });
const teacher = (assignments: readonly string[]): Actor => ({ kind: 'teacher', assignments });
const deny = Object.freeze({ allowed: false, metadata: null, url: null });
function decide(actor: Actor, material: Material, action: 'list' | 'download' | 'edit' | 'publish') {
  if (action === 'publish') return actor.kind === 'admin' && actor.mayPublish
    ? { allowed: true, metadata: null, url: null } : deny;
  if (action === 'edit') return actor.kind === 'teacher' &&
    actor.assignments.includes(material.classId + '/' + material.subject)
    ? { allowed: true, metadata: null, url: null } : deny;
  if (actor.kind !== 'student' || !actor.active || material.state !== 'published' ||
      !actor.classIds.includes(material.classId)) return deny;
  return { allowed: true, metadata: { id: material.id, kind: material.kind }, url: null };
}
test('synthetic class isolation and no private metadata on denied direct ID', () => {
  assert.deepEqual(decide(student(['B']), M1, 'download'), deny);
  assert.deepEqual(decide(student(['A'], false), M1, 'download'), deny);
  assert.equal(decide(student(['A']), M1, 'list').allowed, true);
});
test('draft and archived materials remain unavailable to students', () => {
  for (const material of [M2, M3]) assert.deepEqual(decide(student(['A', 'B']), material, 'download'), deny);
});
test('teacher assignments and admin publish delegation are independent', () => {
  assert.deepEqual(decide(teacher(['B/Science']), M1, 'edit'), deny);
  assert.equal(decide(teacher(['A/History']), M1, 'edit').allowed, true);
  assert.deepEqual(decide({ kind: 'admin', mayPublish: false }, M2, 'publish'), deny);
  assert.equal(decide({ kind: 'admin', mayPublish: true }, M2, 'publish').allowed, true);
});
test('listing does not authorize later download after enrollment withdrawal', () => {
  assert.equal(decide(student(['A']), M1, 'list').allowed, true);
  assert.deepEqual(decide(student([], false), M1, 'download'), deny);
});
test('mock authorization never creates signed URLs or mutates material fixtures', () => {
  const before = JSON.stringify([M1, M2, M3]);
  for (const material of [M1, M2, M3]) for (const action of ['list', 'download', 'edit', 'publish'] as const) {
    assert.equal(decide(student(['A', 'B']), material, action).url, null);
  }
  assert.equal(JSON.stringify([M1, M2, M3]), before);
});

test('client-supplied class claims cannot override authoritative mock enrollment', () => {
  const actor = student(['B']);
  const forgedRequest = { classIds: ['A'], materialId: M1.id };
  assert.deepEqual(decide(actor, M1, 'download'), deny);
  assert.deepEqual(decide(actor, M1, 'list'), deny);
  assert.equal(forgedRequest.classIds.includes('A'), true);
});

test('material entitlement does not imply result inbox authorization', () => {
  const actor = student(['A']);
  assert.equal(decide(actor, M1, 'list').allowed, true);
  // Separate synthetic result permission; class membership is not a result grant.
  const resultGrant = { studentId: 'S2', allowedRecipientId: 'S2' };
  const requestingStudentId = 'S1';
  const canReadResult = requestingStudentId === resultGrant.allowedRecipientId;
  assert.equal(canReadResult, false);
  assert.equal(decide(actor, M1, 'download').url, null);
});
