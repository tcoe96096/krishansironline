// Static regression guard only: browser, JWT/RLS and real timer behaviour remain unverified.
// Run: node --test tests/student/*.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = readFileSync(new URL('../../src/components/StudentMockTestSeries.tsx', import.meta.url), 'utf8');

test('loading and failures announce state without exposing old-class series', () => {
  assert.match(source, /aria-busy=\{loading\|\|classPending\}/);
  assert.match(source, /role="status" aria-live="polite"/);
  assert.match(source, /role="alert"/);
  assert.match(source, /visibleRows=!classPending\?rows\.filter\(series=>series\.class_level===classLevel\):\[\]/);
});

test('progress exposes accessible numeric range and bilingual completion text', () => {
  assert.match(source, /role="progressbar"/);
  assert.match(source, /aria-valuemin=\{0\}/);
  assert.match(source, /aria-valuemax=\{100\}/);
  assert.match(source, /aria-valuenow=\{percent\}/);
  assert.match(source, /aria-valuetext=\{\x60\$\{doneIds\.size\}/);
});

test('test navigation encodes only validated published IDs, never raw series payloads', () => {
  assert.match(source, /availableIds=uniqueSeriesIds\.filter\(id=>testById\.has\(id\)\)/);
  assert.match(source, /const launchId=activeId\|\|nextId/);
  assert.match(source, /encodeURIComponent\(launchId\|\|''\)/);
  assert.doesNotMatch(source, /dangerouslySetInnerHTML|window\.location\.assign|document\.cookie/);
});
