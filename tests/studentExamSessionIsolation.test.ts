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

test('legacy v1 drafts never restore without authenticated account and attempt binding', () => {
  const old: SavedExamIdentity = { version: 1, testId: 'test-1', savedAt: saved.savedAt, student };
  assert.equal(canRestoreExamAnswers(old, 'test-1', 'student-user-1', student, attempt, 500), false);
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
  for (const answers of [null, [], '2', { 0: '2' }, { 0: -1 }, { 0: 21 }, { 0: Number.NaN }, { '-1': 0 }, { '01': 0 }, JSON.parse('{"__proto__":0,"1":2}')]) {
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

test('offline recovery rejects answers and cursor outside the current published question count', () => {
  assert.equal(isSafeExamAnswerDraft({ 0: 2, 2: 1 }, { 1: true }, 2, 3), true);
  assert.equal(isSafeExamAnswerDraft({ 3: 1 }, {}, 0, 3), false);
  assert.equal(isSafeExamAnswerDraft({}, { 3: true }, 0, 3), false);
  assert.equal(isSafeExamAnswerDraft({}, {}, 3, 3), false);
  assert.equal(isSafeExamAnswerDraft({}, {}, 0, 0), false);
  assert.equal(isSafeExamAnswerDraft({}, {}, 0, Number.NaN), false);
  const engine = readFileSync('src/components/OnlineTestEngine.tsx', 'utf8');
  assert.match(engine, /isSafeExamAnswerDraft\(saved\.selectedAnswers, saved\.markedForReview, saved\.currentQuestionIndex, selectedTest\.questions\.length,/);
});


test('offline recovery refuses an answer index outside the published bilingual option range', () => {
  assert.equal(isSafeExamAnswerDraft({ 0: 2, 1: 1 }, { 1: true }, 0, 2, [3, 2]), true);
  assert.equal(isSafeExamAnswerDraft({ 0: 3 }, {}, 0, 2, [3, 2]), false);
  assert.equal(isSafeExamAnswerDraft({ 1: 2 }, {}, 0, 2, [3, 2]), false);
  assert.equal(isSafeExamAnswerDraft({}, {}, 0, 2, [3]), false);
  assert.equal(isSafeExamAnswerDraft({}, {}, 0, 2, [3, 0]), false);
  assert.equal(isSafeExamAnswerDraft({}, {}, 0, 2, [3, Number.NaN]), false);
  assert.equal(isSafeExamAnswerDraft({ 0: 0 }, {}, 0, 2, [3, 2]), true);
  const engine = readFileSync('src/components/OnlineTestEngine.tsx', 'utf8');
  assert.match(engine, /selectedTest\.questions\.map\(\(question\) => Math\.min\(question\.options\.en\.length, question\.options\.hi\.length\)\)/);
});


test('legacy v1 rejects two distinct accounts sharing the same student details and attempt window', () => {
  const legacy: SavedExamIdentity = { version: 1, testId: 'test-1', savedAt: saved.savedAt, student };
  for (const account of ['student-user-1', 'student-user-2']) {
    assert.equal(canRestoreExamAnswers(legacy, 'test-1', account, student, attempt, 500), false);
  }
  // v2 continues to recover for the original owner only.
  assert.equal(canRestoreExamAnswers(saved, 'test-1', 'student-user-1', student, attempt, 500), true);
  assert.equal(canRestoreExamAnswers(saved, 'test-1', 'student-user-2', student, attempt, 500), false);
});

test('browser reader immediately discards legacy PII drafts and rejects v2 drafts carrying student details', () => {
  const engine = readFileSync('src/components/OnlineTestEngine.tsx', 'utf8');
  assert.match(engine, /const validBoundSession = value\.version === 2 &&/);
  assert.match(engine, /!Object\.prototype\.hasOwnProperty\.call\(value, 'student'\)/);
  assert.match(engine, /!validBoundSession \|\|/);
  assert.match(engine, /localStorage\.removeItem\(ACTIVE_TEST_SESSION_KEY\)/);
  assert.doesNotMatch(engine, /const validLegacy = value\.version === 1/);
});


test('offline recovery rejects non-plain answer containers and unsafe numeric keys', () => {
  const inheritedAnswers = Object.create({ 0: 1 });
  const nullPrototypeAnswers = Object.create(null);
  nullPrototypeAnswers[0] = 1;
  for (const answers of [
    inheritedAnswers,
    nullPrototypeAnswers,
    new Map([[0, 1]]),
    { '9007199254740992': 1 },
    { '1e2': 1 },
    { '1.0': 1 },
  ]) {
    assert.equal(isSafeExamAnswerDraft(answers, {}, 0, 2, [3, 3]), false);
  }
  assert.equal(isSafeExamAnswerDraft({}, Object.create(null), 0, 2, [3, 3]), false);
  assert.equal(isSafeExamAnswerDraft({}, { constructor: true }, 0, 2, [3, 3]), false);
  assert.equal(isSafeExamAnswerDraft({ 0: 1 }, { 0: true }, 0, 2, [3, 3]), true);
});

test('v2 recovery rejects stale or future draft boundaries without changing server attempts', () => {
  const started = Date.parse(attempt.started_at);
  const expires = Date.parse(attempt.expires_at);
  assert.equal(canRestoreExamAnswers({ ...saved, savedAt: started }, 'test-1', 'student-user-1', student, attempt, 500), true);
  assert.equal(canRestoreExamAnswers({ ...saved, savedAt: expires }, 'test-1', 'student-user-1', student, attempt, 500), true);
  assert.equal(canRestoreExamAnswers({ ...saved, savedAt: started - 1 }, 'test-1', 'student-user-1', student, attempt, 500), false);
  assert.equal(canRestoreExamAnswers({ ...saved, savedAt: expires + 1 }, 'test-1', 'student-user-1', student, attempt, 500), false);
});


test('offline recovery rejects sparse or non-array bilingual option snapshots', () => {
  const sparse = new Array<number>(2);
  sparse[0] = 3;
  const inherited = Object.create(Array.prototype) as number[];
  inherited.length = 2;
  inherited[0] = 3;
  inherited[1] = 2;
  assert.equal(isSafeExamAnswerDraft({}, {}, 0, 2, sparse), false);
  assert.equal(isSafeExamAnswerDraft({}, {}, 0, 2, inherited), false);
  assert.equal(isSafeExamAnswerDraft({ 0: 1 }, {}, 0, 2, [3, 2]), true);
});
