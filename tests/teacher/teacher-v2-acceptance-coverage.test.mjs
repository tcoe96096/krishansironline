#!/usr/bin/env node
// Offline acceptance-matrix integrity checks; not a replacement for JWT-backed Preview tests.
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import assert from 'node:assert/strict';

const matrix = readFileSync(new URL('../../docs/teacher/teacher-v2-authenticated-acceptance-matrix-2026-11-20.md', import.meta.url), 'utf8');
const rows = matrix.split('\n').filter(line => /^\| T\d{2} \|/.test(line)).map(line => line.split('|').slice(1, -1).map(cell => cell.trim()));

test('all eighteen role scenarios have nonempty actor, action and expected server result', () => {
  assert.equal(rows.length, 18);
  assert.deepEqual(rows.map(row => row[0]), Array.from({ length: 18 }, (_, i) => 'T' + String(i + 1).padStart(2, '0')));
  for (const [id, actor, action, expected] of rows) {
    assert.ok(actor && action && expected, id + ' has an incomplete case');
    assert.ok(/allowed|denied|rejected|idempotent|no duplicate/i.test(expected), id + ' lacks an observable expected outcome');
  }
});

test('negative authorization scenarios cover cross-user, privilege, storage and legacy paths', () => {
  for (const id of ['T01', 'T03', 'T04', 'T06', 'T07', 'T09', 'T11', 'T12', 'T13', 'T14', 'T16', 'T17', 'T18']) {
    const row = rows.find(entry => entry[0] === id);
    assert.ok(row, 'missing ' + id);
    assert.match(row[3], /denied|rejected|no .*escalation/i, id + ' must fail closed');
  }
});

test('real Preview execution remains gated and requires per-case sanitized evidence', () => {
  for (const term of ['NO-GO', 'restored copy', 'distinct explicit owner authorization', 'real JWT-backed Preview', 'PASS/FAIL/BLOCKED', 'Redact tokens', 'Feature flags remain OFF']) {
    assert.ok(matrix.toLowerCase().includes(term.toLowerCase()), 'missing gate: ' + term);
  }
});
