import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { canRestoreExamAnswers, type SavedExamIdentity } from '../src/utils/examSessionGuard';

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
