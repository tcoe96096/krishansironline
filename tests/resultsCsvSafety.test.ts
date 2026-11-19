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

test('Unicode whitespace cannot hide formula markers', () => {
  for (const value of [
    '\u00a0=1+1',
    '\u2003+SUM(1,2)',
    '\ufeff@SUM(1)',
    '\u202f-1+2',
    '\u3000=HYPERLINK("https://example.invalid")',
  ]) {
    assert.ok(escapeResultsCsvCell(value).startsWith('"\''), JSON.stringify(value));
  }
});

test('Hindi text and quoted multiline fields retain their CSV data', () => {
  assert.equal(escapeResultsCsvCell('कक्षा १०, परिणाम'), '"कक्षा १०, परिणाम"');
  assert.equal(escapeResultsCsvCell('नाम "कृष्ण"'), '"नाम ""कृष्ण"""');
  assert.equal(escapeResultsCsvCell('पहली पंक्ति\nदूसरी पंक्ति'), '"पहली पंक्ति\nदूसरी पंक्ति"');
  assert.equal(escapeResultsCsvCell('  सामान्य पाठ'), '"  सामान्य पाठ"');
});
