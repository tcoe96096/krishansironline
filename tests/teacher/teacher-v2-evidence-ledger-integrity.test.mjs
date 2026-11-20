#!/usr/bin/env node
// Offline integrity check only. It never contacts Preview or treats a template as execution evidence.
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import assert from 'node:assert/strict';

const evidence = readFileSync(new URL('../../docs/teacher/teacher-v2-preview-authenticated-evidence-template-2026-11-20.md', import.meta.url), 'utf8');
const matrix = readFileSync(new URL('../../docs/teacher/teacher-v2-authenticated-acceptance-matrix-2026-11-20.md', import.meta.url), 'utf8');
const parse = (text) => text.split('\n').filter(line => /^\| T\d{2} \|/.test(line))
  .map(line => line.split('|').slice(1, -1).map(cell => cell.trim()));
const rows = parse(evidence);
const cases = parse(matrix);

test('evidence ledger exactly matches all eighteen expected acceptance case IDs', () => {
  assert.deepEqual(rows.map(row => row[0]), cases.map(row => row[0]));
  assert.equal(rows.length, 18);
  assert.ok(rows.every(row => row.length === 9), 'all evidence columns must be retained');
});

test('blank evidence template cannot imply a passed or executed Preview test', () => {
  assert.ok(rows.every(row => row[1] === 'BLOCKED'), 'no case may be pre-marked PASS');
  assert.ok(rows.every(row => row.slice(2).every(cell => cell === '—')), 'no fabricated execution evidence');
  assert.match(evidence, /full independent restore not verified/i);
  assert.match(evidence, /NOT PROVIDED/);
  assert.match(evidence, /Feature flags: OFF/);
  assert.match(evidence, /NO-GO/);
});

test('evidence policy accounts for private media and non-instant signed URL revocation', () => {
  assert.match(evidence, /JWT-backed Preview evidence/i);
  assert.match(evidence, /no unauthorized side effect/i);
  assert.match(evidence, /does \*\*not\*\* automatically invalidate/i);
  assert.match(evidence, /Do not run destructive TRUNCATE/i);
});
