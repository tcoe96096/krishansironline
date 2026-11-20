#!/usr/bin/env node
// Offline-only evidence ledger guard. Does not contact Supabase or assert runtime acceptance.
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import assert from 'node:assert/strict';

const ledger = readFileSync(new URL('../../docs/teacher/teacher-v2-preview-authenticated-evidence-template-2026-11-20.md', import.meta.url), 'utf8');
const matrix = readFileSync(new URL('../../docs/teacher/teacher-v2-authenticated-acceptance-matrix-2026-11-20.md', import.meta.url), 'utf8');
const rows = (source) => source.split('\n').filter(line => /^\| T\d{2} \|/.test(line))
  .map(line => line.split('|').slice(1, -1).map(cell => cell.trim()));

test('evidence ledger matches the entire current acceptance matrix exactly', () => {
  const expected = rows(matrix).map(row => row[0]);
  const actual = rows(ledger).map(row => row[0]);
  assert.equal(expected.length, 18);
  assert.deepEqual(actual, expected);
  assert.equal(new Set(actual).size, actual.length);
});

test('no case in the unexecuted evidence template can be presented as passed', () => {
  for (const row of rows(ledger)) {
    assert.equal(row.length, 9, row[0] + ': incorrect evidence column count');
    assert.equal(row[1], 'BLOCKED', row[0] + ': requires actual authenticated evidence');
    assert.ok(row.slice(2).every(cell => cell === '—'), row[0] + ': fabricated execution details');
  }
  for (const marker of ['Feature flags: OFF', 'NOT VERIFIED', 'NOT PROVIDED', 'NO-GO', 'real JWT-backed Preview', 'logout or role revocation']) {
    assert.ok(ledger.includes(marker), 'missing safety warning: ' + marker);
  }
});

// Inspect only actual evidence cells, not documentation explaining forbidden secrets.
const sensitiveEvidence = (value) => [
  /eyJ[A-Za-z0-9_-]{20,}\\.eyJ[A-Za-z0-9_-]{10,}/i, // JWT
  /(?:service_role|SUPABASE_SERVICE_ROLE_KEY)\\s*[:=]\\s*['"]?[A-Za-z0-9._-]{16,}/i,
  /postgres(?:ql)?:\\/\\/[^\\s|]+@/i,
  /https?:\\/\\/[^\\s|]*\\/storage\\/v1\\/object\\/sign\\/[^\\s|?]+\\?[^\\s|]*token=/i,
  /(?:access_token|refresh_token)\\s*[:=]\\s*['"]?[A-Za-z0-9._-]{16,}/i,
].some(pattern => pattern.test(value));

test('evidence rows cannot contain JWTs, DB credentials or private signed-media URLs', () => {
  for (const row of rows(ledger)) {
    assert.equal(sensitiveEvidence(row.slice(2).join(' | ')), false, row[0] + ': secret-bearing evidence');
  }
});

test('secret detector rejects representative synthetic credential formats', () => {
  const samples = [
    'eyJ' + 'a'.repeat(24) + '.eyJ' + 'b'.repeat(24),
    'SUPABASE_SERVICE_ROLE_KEY=' + 's'.repeat(40),
    'postgresql://user:password@example.invalid:5432/db',
    'https://example.invalid/storage/v1/object/sign/teacher/a/photo.jpg?token=' + 't'.repeat(32),
    'refresh_token=' + 'r'.repeat(40),
  ];
  for (const sample of samples) assert.equal(sensitiveEvidence(sample), true);
  assert.equal(sensitiveEvidence('HTTP 403, owner check denied, no data changed'), false);
});
