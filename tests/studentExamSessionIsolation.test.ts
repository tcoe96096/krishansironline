import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { canRestoreExamAnswers, isSafeExamAnswerDraft, type SavedExamIdentity } from '../src/utils/examSessionGuard';

const student = { studentName: 'Synthetic Student', rollNo: 'SYN-001', studentClass: '9th', school: 'Synthetic School' };
const attempt = {
  id: 'attempt-1',
  started_at: '2026-11-22T09:00:00Z',
  expires_at: '2026-11-22T09:30:00Z',
  status: 'in_progress' as const,
};
const saved: SavedExamIdentity = {
  version: 2,
  testId: 'test-1',
  userId: 'student-user-1',
  attemptId: attempt.id,
  savedAt: Date.parse('2026-11-22T09:05:00Z'),
};

test('v2 recovery requires the same authenticated student, exact test and server attempt', () => {
  assert.equal(canRestoreExamAnswers(saved, 'test-1', 'student-user-1', student, attempt, 500), true);
  assert.equal(canRestoreExamAnswers(saved, 'test-1', 'student-user-2', student, attempt, 500), false);
  assert.equal(canRestoreExamAnswers(saved, 'test-2', 'student-user-1', student, attempt, 500), false);
  assert.equal(canRestoreExamAnswers(saved, 'test-1', 'student-user-1', student, { ...attempt, id: 'attempt-2' }, 500), false);
  assert.equal(canRestoreExamAnswers(saved, 'test-1', 'student-user-1', student, { ...attempt, status: 'expired' }, 500), false);
  assert.equal(canRestoreExamAnswers(saved, 'test-1', 'student-user-1', student, attempt, 0), false);
});

test('legacy v1 draft can resume only its original server attempt window', () => {
  const old: SavedExamIdentity = { version: 1, testId: 'test-1', savedAt: saved.savedAt, student };
  assert.equal(canRestoreExamAnswers(old, 'test-1', 'student-user-1', student, attempt, 500), true);
  assert.equal(canRestoreExamAnswers(old, 'test-1', 'student-user-1', student, { ...attempt, started_at: '2026-11-22T09:10:00Z' }, 500), false);
  assert.equal(canRestoreExamAnswers(old, 'test-1', 'student-user-1', { ...student, rollNo: 'SYN-002' }, attempt, 500), false);
  assert.equal(canRestoreExamAnswers({ ...old, savedAt: Number.NaN }, 'test-1', 'student-user-1', student, attempt, 500), false);
});

test('new browser draft saves only opaque account/attempt IDs and never student PII', () => {
  const engine = readFileSync('src/components/OnlineTestEngine.tsx', 'utf8');
  assert.match(engine, /version: 2,\s*testId: selectedTest.id,\s*userId: user.id,\s*attemptId: activeAttempt.id,/);
  assert.match(engine, /canRestoreExamAnswers\(/);
});

test('malformed countdown and missing authenticated identity fail closed', () => {
  for (const remaining of [Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY, -1]) {
    assert.equal(canRestoreExamAnswers(saved, 'test-1', 'student-user-1', student, attempt, remaining), false);
  }
  assert.equal(canRestoreExamAnswers(saved, 'test-1', '', student, attempt, 500), false);
  assert.equal(canRestoreExamAnswers(saved, 'test-1', 'student-user-1', student, { ...attempt, id: '' }, 500), false);
  assert.equal(canRestoreExamAnswers({ ...saved, userId: '' }, 'test-1', 'student-user-1', student, attempt, 500), false);
  assert.equal(canRestoreExamAnswers({ ...saved, attemptId: '' }, 'test-1', 'student-user-1', student, attempt, 500), false);
});

test('legacy recovery rejects malformed attempt windows and non-finite save times', () => {
  const legacy: SavedExamIdentity = { version: 1, testId: 'test-1', savedAt: saved.savedAt, student };
  for (const [started_at, expires_at] of [
    ['invalid', attempt.expires_at],
    [attempt.started_at, 'invalid'],
    ['2026-11-22T10:00:00Z', '2026-11-22T09:00:00Z'],
  ]) {
    assert.equal(canRestoreExamAnswers(legacy, 'test-1', 'student-user-1', student, { ...attempt, started_at, expires_at }, 500), false);
  }
  for (const savedAt of [Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY]) {
    assert.equal(canRestoreExamAnswers({ ...legacy, savedAt }, 'test-1', 'student-user-1', student, attempt, 500), false);
  }
  assert.equal(canRestoreExamAnswers({ ...legacy, savedAt: Date.parse(attempt.started_at) - 1 }, 'test-1', 'student-user-1', student, attempt, 500), false);
  assert.equal(canRestoreExamAnswers({ ...legacy, savedAt: Date.parse(attempt.expires_at) + 1 }, 'test-1', 'student-user-1', student, attempt, 500), false);
});

test('submitted attempts never restore browser answers even with matching IDs', () => {
  assert.equal(canRestoreExamAnswers(saved, 'test-1', 'student-user-1', student, { ...attempt, status: 'submitted' }, 500), false);
});

test('v2 recovery rejects corrupted timestamps and server attempt windows', () => {
  for (const savedAt of [Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY, Date.parse(attempt.started_at) - 1, Date.parse(attempt.expires_at) + 1]) {
    assert.equal(canRestoreExamAnswers({ ...saved, savedAt }, 'test-1', 'student-user-1', student, attempt, 500), false);
  }
  for (const [started_at, expires_at] of [
    ['invalid', attempt.expires_at],
    [attempt.started_at, 'invalid'],
    ['2026-11-22T10:00:00Z', '2026-11-22T09:00:00Z'],
    [attempt.started_at, attempt.started_at],
  ]) {
    assert.equal(canRestoreExamAnswers(saved, 'test-1', 'student-user-1', student, { ...attempt, started_at, expires_at }, 500), false);
  }
  assert.equal(canRestoreExamAnswers(saved, 'test-1', 'student-user-1', student, attempt, 500), true);
});

test('browser recovery rejects poisoned answer maps without reading student PII', () => {
  assert.equal(isSafeExamAnswerDraft({ 0: 2, 12: 0 }, { 12: true, 0: false }, 12), true);
  for (const answers of [null, [], '2', { 0: '2' }, { 0: -1 }, { 0: 21 }, { 0: Number.NaN }, { '-1': 0 }, { '01': 0 }, { '__proto__': 0, 1: 2 }]) {
    assert.equal(isSafeExamAnswerDraft(answers, {}, 0), false);
  }
  for (const reviews of [null, [], { 0: 'true' }, { 0: 1 }, { '-1': false }, { '01': true }]) {
    assert.equal(isSafeExamAnswerDraft({}, reviews, 0), false);
  }
  for (const index of [-1, 1.5, Number.NaN, Number.POSITIVE_INFINITY, '1']) {
    assert.equal(isSafeExamAnswerDraft({}, {}, index), false);
  }
  const engine = readFileSync('src/components/OnlineTestEngine.tsx', 'utf8');
  assert.match(engine, /isSafeExamAnswerDraft\(value\.selectedAnswers, value\.markedForReview, value\.currentQuestionIndex\)/);
});
