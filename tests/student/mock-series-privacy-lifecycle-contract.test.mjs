// Static privacy and lifecycle guards for Student Mock Test Series.
// Run with: node --test tests/student/*.test.mjs
// These assertions do not validate authenticated RLS or browser behaviour.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = readFileSync(new URL('../../src/components/StudentMockTestSeries.tsx', import.meta.url), 'utf8');

test('unmount and reload invalidate outstanding catalogue responses', () => {
  assert.match(source, /const current=\+\+requestId\.current/);
  assert.match(source, /if\(current!==requestId\.current\)return/);
  assert.match(source, /return\(\)=>\{requestId\.current\+\+;\}/);
});

test('only current-class published tests contribute to series progress and links', () => {
  assert.match(source, /test&&test\.class_level===classLevel/);
  assert.match(source, /const availableSet=new Set\(availableIds\)/);
  assert.match(source, /a\.status==='submitted'&&availableSet\.has\(a\.test_id\)/);
  assert.match(source, /const launchId=activeId\|\|nextId/);
});

test('series view does not expose answers, identity details or privileged writes', () => {
  assert.doesNotMatch(source, /correct_answer|answer_key|service_role|SUPABASE_SERVICE_ROLE/i);
  assert.doesNotMatch(source, /\.insert\(|\.update\(|\.delete\(|\.upsert\(|auth\.admin/);
  assert.doesNotMatch(source, /localStorage|sessionStorage|document\.cookie/);
});
