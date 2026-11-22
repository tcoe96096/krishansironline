import assert from 'node:assert/strict';
import test from 'node:test';

// REVIEW-ONLY policy oracle. Never import this into production.
// No database, real student records, storage keys, signed URLs or delivery.
type Result = {
  id: string; studentId: string; state: 'draft' | 'approved' | 'released' | 'withdrawn';
  version: number; revoked: boolean;
};
type Actor = { kind: 'student'; id: string; active: boolean }
  | { kind: 'teacher'; id: string }
  | { kind: 'admin'; id: string };
type Action = 'inbox' | 'view' | 'download' | 'print';
const DENY = Object.freeze({ allowed: false, resultId: null, downloadUrl: null, document: null });
function decide(actor: Actor, result: Result, action: Action, requestedVersion: number) {
  const permitted = (['inbox', 'view', 'download', 'print'] as string[]).includes(action) &&
    actor.kind === 'student' && actor.active &&
    actor.id.length > 0 && actor.id === actor.id.trim() &&
    result.studentId === actor.id && result.id.length > 0 && result.id === result.id.trim() &&
    result.studentId.length > 0 && result.studentId === result.studentId.trim() && result.state === 'released' &&
    !result.revoked && Number.isSafeInteger(result.version) && result.version > 0 &&
    requestedVersion === result.version;
  if (!permitted) return DENY;
  // Eligibility is not a document, signed URL, or a real delivery authorization.
  return { allowed: true, resultId: result.id, downloadUrl: null, document: null };
}
const released: Result = { id: 'synthetic-R1', studentId: 'synthetic-S1', state: 'released', version: 2, revoked: false };
const owner: Actor = { kind: 'student', id: 'synthetic-S1', active: true };
test('released result is eligible for its active owner only, without document disclosure', () => {
  for (const action of ['inbox', 'view', 'download', 'print'] as const) {
    assert.deepEqual(decide(owner, released, action, 2), {
      allowed: true, resultId: 'synthetic-R1', downloadUrl: null, document: null,
    });
  }
});
test('cross-student and inactive requests fail closed for all actions', () => {
  for (const actor of [{ kind: 'student', id: 'synthetic-S2', active: true }, { kind: 'student', id: 'synthetic-S1', active: false }] as Actor[]) {
    for (const action of ['inbox', 'view', 'download', 'print'] as const)
      assert.deepEqual(decide(actor, released, action, 2), DENY);
  }
});
test('draft, approved, withdrawn and revoked results never appear in inbox', () => {
  for (const state of ['draft', 'approved', 'withdrawn'] as const)
    assert.deepEqual(decide(owner, { ...released, state }, 'inbox', 2), DENY);
  assert.deepEqual(decide(owner, { ...released, revoked: true }, 'view', 2), DENY);
});
test('stale result versions and invalid versions fail closed', () => {
  for (const version of [0, -1, Number.NaN, Number.MAX_SAFE_INTEGER + 1])
    assert.deepEqual(decide(owner, { ...released, version }, 'download', version), DENY);
  assert.deepEqual(decide(owner, released, 'print', 1), DENY);
});
test('teacher and admin identity does not automatically grant student inbox access', () => {
  for (const kind of ['teacher', 'admin'] as const)
    assert.deepEqual(decide({ kind, id: 'synthetic-S1' }, released, 'view', 2), DENY);
});
test('student cannot override ownership using a forged request parameter', () => {
  const requester: Actor = { kind: 'student', id: 'synthetic-S2', active: true };
  const forged = { studentId: 'synthetic-S1', resultId: released.id };
  assert.equal(forged.studentId, released.studentId);
  assert.deepEqual(decide(requester, released, 'download', 2), DENY);
});
test('unknown runtime actions fail closed even for an eligible owner', () => {
  for (const action of ['', 'share', 'send', 'export', 'delete', ' download ', '__proto__'])
    assert.deepEqual(decide(owner, released, action as Action, 2), DENY);
});
test('malformed or blank actor identity fails closed across all actions', () => {
  for (const id of ['', ' ', ' synthetic-S1', 'synthetic-S1 ', 'synthetic-S1\n']) {
    for (const action of ['inbox', 'view', 'download', 'print'] as const)
      assert.deepEqual(decide({ kind: 'student', id, active: true }, released, action, 2), DENY);
  }
});
test('malformed or blank result identity fails closed before any action', () => {
  for (const id of ['', ' ', ' synthetic-R1', 'synthetic-R1 ']) {
    for (const action of ['inbox', 'view', 'download', 'print'] as const)
      assert.deepEqual(decide(owner, { ...released, id }, action, 2), DENY);
  }
  for (const studentId of ['', ' ', 'synthetic-S1 '])
    assert.deepEqual(decide(owner, { ...released, studentId }, 'inbox', 2), DENY);
});
// Production requires authenticated backend recipient checks, release/audit
// transactions, version revocation, private storage RLS, and browser QA.
