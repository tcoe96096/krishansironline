import assert from 'node:assert/strict';
import test from 'node:test';
import { escapeResultsCsvCell } from '../src/lib/resultsCsvSafety';

test('CSV formula markers are neutralized', () => {
  for (const value of ['=HYPERLINK("https://example.invalid")', '+SUM(1,2)', '-1+2', '@SUM(1,2)', '  =1+1', '\t=1+1', '\r+1', '\n@SUM(1)']) {
    assert.ok(escapeResultsCsvCell(value).startsWith('"\''), value);
  }
});
test('normal text, embedded quotes, commas, unicode and empty values remain valid CSV', () => {
  assert.equal(escapeResultsCsvCell('Student, Name'), '"Student, Name"');
  assert.equal(escapeResultsCsvCell('He said "hello"'), '"He said ""hello"""');
  assert.equal(escapeResultsCsvCell('विद्यार्थी'), '"विद्यार्थी"');
  assert.equal(escapeResultsCsvCell(null), '""');
  assert.equal(escapeResultsCsvCell(42), '"42"');
});
