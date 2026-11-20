#!/usr/bin/env node
// Offline evidence ledger integrity only; NEVER asserts real Preview tests passed.
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import assert from 'node:assert/strict';

const base = new URL('../../docs/teacher/', import.meta.url);
const matrix = readFileSync(new URL('teacher-v2-authenticated-acceptance-matrix-2026-11-20.md', base), 'utf8');
const ledger = readFileSync(new URL('teacher-v2-preview-authenticated-evidence-template-2026-11-20.md', base), 'utf8');
const ids = text => [...text.matchAll(/^\|\s*(T\d{2})\s*\|/gm)].map(match => match[1]);
const evidenceRows = ledger.split('\n').filter(line => /^\|\s*T\d{2}\s*\|/.test(line));

test('ledger contains exactly the same eighteen case IDs as the acceptance matrix', () => {
  assert.deepEqual(ids(ledger), ids(matrix));
  assert.equal(new Set(ids(ledger)).size, 18);
});

test('all evidence starts BLOCKED, never PASS, and has nine complete columns', () => {
  for (const line of evidenceRows) {
    const cells = line.split('|').slice(1, -1).map(value => value.trim());
    assert.equal(cells.length, 9, 'invalid evidence column count');
    assert.match(cells[0], /^T\d{2}$/);
    assert.equal(cells[1], 'BLOCKED', cells[0] + ' must not claim runtime success');
    assert.ok(cells.slice(2).every(value => value === '—'), cells[0] + ' has fabricated evidence');
  }
});

test('evidence ledger explicitly rejects mock success and preserves signed URL caveat', () => {
  for (const term of ['real JWT-backed Preview', 'not', 'logout', 'expiry', 'NO-GO', 'PR #109', 'Full']) {
    assert.ok(ledger.toLowerCase().includes(term.toLowerCase()), 'missing safety condition: ' + term);
  }
  assert.match(ledger, /does \*\*not\*\* automatically invalidate/i);
});
