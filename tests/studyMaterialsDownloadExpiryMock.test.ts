import assert from 'node:assert/strict';
import test from 'node:test';

// REVIEW ONLY: synthetic download authorization oracle, not production auth,
// signed URL generation, token verification, or a storage integration.
type Fixture = {
  studentId: string;
  ownerId: string;
  enrolled: boolean;
  published: boolean;
  nowMs: number;
  expiresAtMs: number;
  tokenStudentId: string;
};
type Decision = { allowed: boolean; objectKey: null; downloadUrl: null };
const DENY: Decision = { allowed: false, objectKey: null, downloadUrl: null };
function mockDownloadDecision(f: Fixture): Decision {
  // Fail closed; never return a mock storage key or a bearer URL.
  const allowed = f.studentId === f.ownerId &&
    f.studentId === f.tokenStudentId &&
    f.enrolled && f.published &&
    Number.isSafeInteger(f.nowMs) && Number.isSafeInteger(f.expiresAtMs) &&
    f.nowMs >= 0 && f.expiresAtMs > f.nowMs;
  return { allowed, objectKey: null, downloadUrl: null };
}
const base: Fixture = {
  studentId: 'synthetic-S1', ownerId: 'synthetic-S1',
  tokenStudentId: 'synthetic-S1', enrolled: true, published: true,
  nowMs: 1000, expiresAtMs: 2000,
};
test('synthetic unexpired, enrolled owner passes eligibility only', () => {
  assert.deepEqual(mockDownloadDecision(base), { allowed: true, objectKey: null, downloadUrl: null });
});
test('expired and boundary-expired tokens fail closed', () => {
  for (const expiresAtMs of [999, 1000, -1, Number.NaN, Number.POSITIVE_INFINITY]) {
    assert.deepEqual(mockDownloadDecision({ ...base, expiresAtMs }), DENY);
  }
});
test('withdrawal, draft and cross-student token reuse fail closed', () => {
  for (const change of [
    { enrolled: false }, { published: false },
    { ownerId: 'synthetic-S2' }, { tokenStudentId: 'synthetic-S2' },
    { nowMs: Number.NaN }, { nowMs: Number.POSITIVE_INFINITY },
  ]) assert.deepEqual(mockDownloadDecision({ ...base, ...change }), DENY);
});
test('invalid clock values and unsafe integer timestamps fail closed', () => {
  for (const change of [
    { nowMs: -1 }, { nowMs: Number.NEGATIVE_INFINITY },
    { nowMs: Number.MAX_SAFE_INTEGER + 1 },
    { expiresAtMs: Number.MAX_SAFE_INTEGER + 1 },
    { expiresAtMs: 0 }, { expiresAtMs: -100 },
    { nowMs: 2000, expiresAtMs: 2000 },
    { nowMs: 2001, expiresAtMs: 2000 },
  ]) assert.deepEqual(mockDownloadDecision({ ...base, ...change }), DENY);
});
test('eligibility is not a signed download or storage permission', () => {
  const decision = mockDownloadDecision(base);
  assert.equal(decision.allowed, true);
  assert.equal(decision.objectKey, null);
  assert.equal(decision.downloadUrl, null);
});

test('no fixture returns object keys or bearer URLs', () => {
  for (const fixture of [base, { ...base, enrolled: false }, { ...base, expiresAtMs: 0 }]) {
    const decision = mockDownloadDecision(fixture);
    assert.equal(decision.objectKey, null);
    assert.equal(decision.downloadUrl, null);
  }
});

// Real enforcement requires backend authorization, token signature/revocation,
// server clock, storage policies, and authenticated browser integration tests.
