// Additional source-level regression checks. Not a substitute for browser/JWT testing.
// Run: node --test tests/student/*.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = readFileSync(new URL('../../src/components/StudentMockTestSeries.tsx', import.meta.url), 'utf8');

test('missing class fails closed and clears all prior student-derived data', () => {
  assert.match(source, /if\(!classLevel\)\{setRows\(\[\]\);setAttempts\(\[\]\);setTests\(\[\]\)/);
  assert.match(source, /classPending=Boolean\(classLevel\)&&loadedClass!==classLevel/);
  assert.match(source, /visibleRows=!classPending\?rows\.filter\(series=>series\.class_level===classLevel\):\[\]/);
});

test('only validated available published IDs enter the launch URL', () => {
  assert.match(source, /const availableIds=uniqueSeriesIds\.filter\(id=>testById\.has\(id\)\)/);
  assert.match(source, /const launchId=activeId\|\|nextId/);
  assert.match(source, /availableIds\.length===0\?<p/);
  assert.match(source, /encodeURIComponent\(launchId\|\|''\)/);
});

test('resume eligibility requires a valid future expiry and matching available test', () => {
  assert.match(source, /a\.status==='in_progress'&&availableSet\.has\(a\.test_id\)/);
  assert.match(source, /Number\.isFinite\(Date\.parse\(a\.expires_at\)\)/);
  assert.match(source, /Date\.parse\(a\.expires_at\)>now/);
  assert.match(source, /activeIds\.has\(id\)&&!doneIds\.has\(id\)/);
});

test('progress is derived from attempts, not client-persisted or hardcoded results', () => {
  assert.match(source, /getMyTestAttempts\(\)/);
  assert.match(source, /a\.status==='submitted'&&availableSet\.has\(a\.test_id\)/);
  assert.match(source, /doneIds\.size\/availableIds\.length\*100/);
  assert.doesNotMatch(source, /localStorage|sessionStorage|correct_answer|answer_key/);
});
