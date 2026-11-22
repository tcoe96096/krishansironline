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
  materialId: string;
  tokenMaterialId: string;
  revoked: boolean;
};
type Decision = { allowed: boolean; objectKey: null; downloadUrl: null };
const DENY: Decision = { allowed: false, objectKey: null, downloadUrl: null };
function mockDownloadDecision(f: Fixture): Decision {
  // Fail closed; never return a mock storage key or a bearer URL.
  const validId = (id: unknown): id is string => typeof id === 'string' && id.length > 0 && id === id.trim();
  const allowed = [f.studentId, f.ownerId, f.tokenStudentId, f.materialId, f.tokenMaterialId].every(validId) &&
    f.studentId === f.ownerId &&
    f.studentId === f.tokenStudentId &&
    f.enrolled && f.published && !f.revoked &&
    f.materialId === f.tokenMaterialId &&
    Number.isSafeInteger(f.nowMs) && Number.isSafeInteger(f.expiresAtMs) &&
    f.nowMs >= 0 && f.expiresAtMs > f.nowMs;
  return { allowed, objectKey: null, downloadUrl: null };
}
const base: Fixture = {
  studentId: 'synthetic-S1', ownerId: 'synthetic-S1',
  tokenStudentId: 'synthetic-S1', enrolled: true, published: true,
  materialId: 'synthetic-M1', tokenMaterialId: 'synthetic-M1', revoked: false,
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
test('revoked token and cross-material replay fail closed', () => {
  for (const change of [
    { revoked: true },
    { materialId: 'synthetic-M2' },
    { tokenMaterialId: 'synthetic-M2' },
  ]) assert.deepEqual(mockDownloadDecision({ ...base, ...change }), DENY);
});
test('empty and whitespace-only identity or material bindings fail closed', () => {
  for (const change of [
    { studentId: '', ownerId: '', tokenStudentId: '' },
    { studentId: ' ', ownerId: ' ', tokenStudentId: ' ' },
    { ownerId: '' }, { tokenStudentId: '' },
    { materialId: '', tokenMaterialId: '' },
    { materialId: ' ', tokenMaterialId: ' ' },
    { tokenMaterialId: '' },
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

// Real enforcement requires backend authorization, token signature/revocation and resource binding,
// server clock, storage policies, and authenticated browser integration tests.
