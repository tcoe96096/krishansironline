#!/usr/bin/env node
// Teacher v2 review-only packet guard. No database connection or side effects.
// Run: node --test tests/teacher/teacher-v2-review-packet.test.mjs
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import assert from 'node:assert/strict';

const matrix = readFileSync(new URL('../../docs/teacher/teacher-v2-authenticated-acceptance-matrix-2026-11-20.md', import.meta.url), 'utf8');
const sql = readFileSync(new URL('../../docs/teacher/teacher-v2-preview-catalog-readonly.sql', import.meta.url), 'utf8');
const executableSql = sql
  .split('\n').filter(line => !/^\s*--/.test(line)).join('\n')
  .replace(/\/\*[\s\S]*?\*\//g, ' ');

test('all 18 actor-specific acceptance cases are defined exactly once', () => {
  const ids = [...matrix.matchAll(/^\|\s*(T\d{2})\s*\|/gm)].map(m => m[1]);
  assert.deepEqual(ids, Array.from({ length: 18 }, (_, i) => 'T' + String(i + 1).padStart(2, '0')));
  for (const actor of ['Anonymous', 'Pending teacher A', 'Teacher B', 'Teacher C', 'Independent reviewer', 'Super admin']) {
    assert.ok(matrix.includes(actor), 'missing actor: ' + actor);
  }
});
test('read-only catalog script has an explicit read-only transaction and no mutation statements', () => {
  assert.match(executableSql, /BEGIN\s+TRANSACTION\s+READ\s+ONLY\s*;/i);
  assert.match(executableSql, /ROLLBACK\s*;/i);
  assert.doesNotMatch(executableSql, /(?:^|;)\s*(?:INSERT|UPDATE|DELETE|TRUNCATE|ALTER|DROP|CREATE|GRANT|REVOKE|MERGE|CALL|DO|COPY|EXECUTE|SET\s+ROLE)\b/im);
});
test('catalog script inventories all three RPCs and the known privilege hazard', () => {
  for (const rpc of ['teacher_v2_save_application', 'teacher_v2_review', 'teacher_v2_snapshot']) {
    assert.ok(sql.includes(rpc), 'missing RPC: ' + rpc);
  }
  for (const term of ['has_function_privilege', 'has_table_privilege', 'relrowsecurity', 'polwithcheck', 'storage.buckets', "'anon'", "'authenticated'", "'TRUNCATE'"]) {
    assert.ok(sql.includes(term), 'missing audit term: ' + term);
  }
});
test('activation gates and private media boundaries remain explicit', () => {
  for (const term of ['NO-GO', 'Full', 'owner authorization', 'getPublicUrl', 'signed URLs', 'Feature flags remain OFF', 'PR #109']) {
    assert.ok(matrix.toLowerCase().includes(term.toLowerCase()), 'missing safety gate: ' + term);
  }
});
