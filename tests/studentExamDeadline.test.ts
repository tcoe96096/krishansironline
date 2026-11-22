import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { secondsUntilExamExpiry } from '../src/utils/examDeadline';

const deadline = '2026-11-22T10:30:00Z';
test('server deadline is authoritative across background tab pauses', () => {
  const start = Date.parse('2026-11-22T10:00:00Z');
  assert.equal(secondsUntilExamExpiry(deadline, start), 1800);
  assert.equal(secondsUntilExamExpiry(deadline, start + 29 * 60_000), 60);
  assert.equal(secondsUntilExamExpiry(deadline, start + 31 * 60_000), 0);
});
test('invalid and expired timestamps never extend an attempt', () => {
  assert.equal(secondsUntilExamExpiry('not-a-date'), 0);
  assert.equal(secondsUntilExamExpiry(deadline, Number.NaN), 0);
  assert.equal(secondsUntilExamExpiry(deadline, Date.parse(deadline)), 0);
  assert.equal(secondsUntilExamExpiry(deadline, Date.parse(deadline) - 1), 1);
});
test('engine updates countdown on focus/visibility and retains server-graded submission', () => {
  const source = readFileSync('src/components/OnlineTestEngine.tsx', 'utf8');
  assert.match(source, /secondsUntilExamExpiry\(activeAttempt\.expires_at\)/);
  assert.match(source, /addEventListener\('visibilitychange', updateRemaining\)/);
  assert.match(source, /addEventListener\('focus', updateRemaining\)/);
  assert.doesNotMatch(source, /setTimeLeftSeconds\(\(prev\) => prev - 1\)/);
  assert.match(source, /submitTestAttempt\(activeAttempt\.id, answers\)/);
});
