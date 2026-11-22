// Bilingual UI-state contract; static only, not a browser or authenticated test.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = readFileSync(new URL('../../src/components/StudentMockTestSeries.tsx', import.meta.url), 'utf8');

test('loading, errors, retry and empty states include Hindi and English', () => {
  const messages = [
    ['Series लोड हो रही हैं', 'Loading series'],
    ['कृपया दोबारा प्रयास करें', 'Please retry'],
    ['सूची उपलब्ध नहीं है', 'List unavailable'],
    ['पहले अपनी कक्षा चुनें', 'Select your class'],
    ['कोई Mock Test Series प्रकाशित नहीं हुई', 'No series published'],
    ['कोई उपलब्ध टेस्ट नहीं है', 'No available tests'],
  ];
  for (const [hindi, english] of messages) {
    assert.ok(source.includes(hindi), `Missing Hindi UI state: ${hindi}`);
    assert.ok(source.includes(english), `Missing English UI state: ${english}`);
  }
});

test('loading and error remain announced to assistive technology', () => {
  assert.match(source, /role="status" aria-live="polite"/);
  assert.match(source, /role="alert"/);
  assert.match(source, /aria-busy=\{loading\|\|classPending\}/);
});
