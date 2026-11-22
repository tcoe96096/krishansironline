// Source-contract smoke tests only. These are NOT browser, authenticated, or runtime acceptance tests.
// Run: node --test tests/student/mock-series-source-contract.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const source = readFileSync(new URL('../../src/components/StudentMockTestSeries.tsx', import.meta.url), 'utf8');

test('catalogue query requests only published series for selected class', () => {
  assert.match(source, /\.eq\('class_level',classLevel\)\.eq\('is_published',true\)/);
  assert.match(source, /getPublishedTests\(classLevel\)/);
});
test('class changes invalidate stale async results and mask old class rows', () => {
  assert.match(source, /current!==requestId\.current/);
  assert.match(source, /requestId\.current\+\+/);
  assert.match(source, /loadedClass!==classLevel/);
  assert.match(source, /series\.class_level===classLevel/);
});
test('API failures expose retry rather than an indefinite loading state', () => {
  assert.match(source, /setError\('Mock Test Series/);
  assert.match(source, /finally\{if\(current===requestId\.current\)setLoading\(false\)/);
  assert.match(source, /onClick=\{\(\)=>void load\(\)\}/);
});
test('only matching-class catalogue entries can be launched', () => {
  assert.match(source, /test\.class_level===classLevel/);
  assert.match(source, /availableIds=uniqueSeriesIds\.filter\(id=>testById\.has\(id\)\)/);
  assert.match(source, /availableIds\.length===0\?/);
});
test('expired attempts are not presented as resumable', () => {
  assert.match(source, /a\.status==='in_progress'/);
  assert.match(source, /Number\.isFinite\(Date\.parse\(a\.expires_at\)\)/);
  assert.match(source, /Date\.parse\(a\.expires_at\)>now/);
});
test('student-visible progress remains bilingual and accessible', () => {
  assert.match(source, /role="progressbar"/);
  assert.match(source, /aria-valuenow=\{percent\}/);
  assert.match(source, /पूर्ण \/ Completed/);
  assert.match(source, /जारी \/ In progress/);
});

test('malformed and duplicate series rows are rejected before display', () => {
  assert.match(source, /Array\.isArray\(seriesResult\.data\)\?seriesResult\.data:\[\]/);
  assert.match(source, /series\.class_level!==classLevel/);
  assert.match(source, /seenSeriesIds\.has\(id\)/);
});
test('malformed series test IDs cannot inflate progress or create a launch link', () => {
  assert.match(source, /Array\.isArray\(s\.test_ids\)\?s\.test_ids:\[\]/);
  assert.match(source, /new Set\(\(Array\.isArray\(s\.test_ids\)/);
  assert.match(source, /availableIds\.length\?Math\.round\(doneIds\.size\/availableIds\.length\*100\):0/);
  assert.match(source, /availableIds\.length===0\?<p/);
});
test('API errors clear attempts and published tests before showing retry', () => {
  assert.match(source, /catch\(e\)\{if\(current===requestId\.current\)\{setRows\(\[\]\);setAttempts\(\[\]\);setTests\(\[\]\)/);
  assert.match(source, /role="alert"/);
});
