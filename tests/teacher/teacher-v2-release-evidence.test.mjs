import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CASE_IDS, validateEvidence } from '../../scripts/teacher/verify-release-evidence.mjs';

const sha = 'a'.repeat(40), hash = 'b'.repeat(64);
function fixture() {
  return {
    mainCommit: sha, candidateCommit: sha, sqlSha256: hash,
    previewArtifactSha256: hash, restoreProofSha256: hash,
    previewProjectId: 'zgpkmfqioqvincmgyfpi',
    featureFlagsOff: true, fullRestoreVerified: true,
    unsafeRoleGrantsRemediatedAndVerified: true,
    ownerAuthorizedPreviewSql: true, jwtPositiveNegativeTestsVerified: true, ciPassed: true,
    cases: CASE_IDS.map(id => ({ id, status: 'PASS', timestampUtc: '2026-11-20T06:00:00Z',
      actorAlias: 'synthetic-actor', operation: 'verified operation', expected: 'denied or allowed',
      actual: 'sanitized server response', auditEvidenceRef: 'internal-redacted-evidence', reviewer: 'independent-reviewer' }))
  };
}
test('empty and incomplete evidence always blocks release', () => {
  assert.ok(validateEvidence({}).length > 10);
  assert.ok(validateEvidence(null).length);
});
test('complete structural evidence is recognized but not deployment authorization', () => {
  assert.deepEqual(validateEvidence(fixture()), []);
});
test('missing negative test, duplicate case or non-PASS status blocks', () => {
  const a = fixture(); a.cases = a.cases.filter(c => c.id !== 'T18');
  assert.ok(validateEvidence(a).some(x => x.includes('T18')));
  const b = fixture(); b.cases[1] = { ...b.cases[0] };
  assert.ok(validateEvidence(b).some(x => x.includes('duplicate')));
  const c = fixture(); c.cases[0].status = 'BLOCKED';
  assert.ok(validateEvidence(c).some(x => x.includes('T01')));
});
test('unsafe grants, missing restore, flags ON, or missing authorization block', () => {
  for (const field of ['unsafeRoleGrantsRemediatedAndVerified', 'fullRestoreVerified',
    'featureFlagsOff', 'ownerAuthorizedPreviewSql', 'jwtPositiveNegativeTestsVerified', 'ciPassed']) {
    const e = fixture(); e[field] = false;
    assert.ok(validateEvidence(e).length, field);
  }
});
test('incorrect environment, malformed hashes and unreviewed rows block', () => {
  const a = fixture(); a.previewProjectId = 'production';
  assert.ok(validateEvidence(a).length);
  const b = fixture(); b.sqlSha256 = 'unknown';
  assert.ok(validateEvidence(b).length);
  const c = fixture(); c.cases[0].reviewer = '';
  assert.ok(validateEvidence(c).length);
});

test('future-dated evidence cannot be counted as completed Preview acceptance', () => {
  const e = fixture();
  e.cases[0].timestampUtc = '2099-01-01T00:00:00Z';
  assert.ok(validateEvidence(e).some(x => x.includes('future evidence timestamp')));
});

test('actor cannot independently review their own acceptance evidence', () => {
  const e = fixture();
  e.cases[0].reviewer = ' SYNTHETIC-ACTOR ';
  assert.ok(validateEvidence(e).some(x => x.includes('independent reviewer')));
});

test('impossible UTC calendar dates cannot pass acceptance evidence', () => {
  for (const timestamp of ['2026-02-31T06:00:00Z', '2026-11-31T06:00:00Z', '2026-13-01T06:00:00Z']) {
    const e = fixture(); e.cases[0].timestampUtc = timestamp;
    assert.ok(validateEvidence(e).some(x => x.includes('valid UTC timestamp missing')), timestamp);
  }
});
