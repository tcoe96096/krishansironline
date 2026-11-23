/** Client-only recovery guard. The server attempt remains authoritative. */
export interface ExamStudentIdentity {
  studentName: string;
  rollNo: string;
  studentClass: string;
  school: string;
}

export interface SavedExamIdentity {
  version: 1 | 2;
  testId: string;
  savedAt: number;
  userId?: string;
  attemptId?: string;
  /** Legacy v1 only: v2 intentionally does not store student identity details. */
  student?: ExamStudentIdentity;
}

export interface ExamAttemptIdentity {
  id: string;
  started_at: string;
  expires_at: string;
  status: 'in_progress' | 'submitted' | 'expired';
}

export function canRestoreExamAnswers(
  saved: SavedExamIdentity | null,
  testId: string,
  userId: string,
  student: ExamStudentIdentity,
  attempt: ExamAttemptIdentity,
  remainingSeconds: number,
): boolean {
  if (!saved || saved.testId !== testId || attempt.status !== 'in_progress' || !Number.isFinite(remainingSeconds) || remainingSeconds <= 0 || !userId || !attempt.id) {
    return false;
  }

  // All drafts must have a finite save time inside the authoritative attempt
  // window. Matching opaque IDs alone cannot validate a corrupted draft.
  const started = Date.parse(attempt.started_at);
  const expires = Date.parse(attempt.expires_at);
  if (!Number.isFinite(started) || !Number.isFinite(expires) || started >= expires ||
      !Number.isFinite(saved.savedAt) || saved.savedAt < started || saved.savedAt > expires) return false;

  // A v2 draft must never carry legacy student profile/PII fields, even when
  // opaque account and attempt IDs match. Fail closed at the guard boundary.
  if (saved.version === 2 && Object.prototype.hasOwnProperty.call(saved, 'student')) return false;

  if (saved.version === 2) {
    return !!saved.userId && !!saved.attemptId && saved.userId === userId && saved.attemptId === attempt.id;
  }

  // Legacy v1 drafts contain only mutable student profile fields. Even if
  // their timestamps match, two accounts can share those fields and a browser.
  // Without an authenticated user ID and server attempt ID, ownership cannot
  // be established. Fail closed; the server attempt and result stay intact.
  return false;
}

/** Reject malformed browser drafts before they can enter exam React state. */
export function isSafeExamAnswerDraft(
  selectedAnswers: unknown,
  markedForReview: unknown,
  questionIndex: unknown,
  questionCount?: number,
  optionCounts?: readonly number[],
): boolean {
  const isRecord = (value: unknown): value is Record<string, unknown> =>
    value !== null && typeof value === 'object' && !Array.isArray(value) &&
    Object.getPrototypeOf(value) === Object.prototype;
  if (!isRecord(selectedAnswers) || !isRecord(markedForReview) ||
      !Number.isSafeInteger(questionIndex) || (questionIndex as number) < 0) return false;
  if (questionCount !== undefined && (!Number.isSafeInteger(questionCount) || questionCount <= 0 ||
      (questionIndex as number) >= questionCount)) return false;
  if (optionCounts !== undefined && (questionCount === undefined || !Array.isArray(optionCounts) ||
      optionCounts.length !== questionCount ||
      !Array.from({ length: questionCount }, (_, index) => index in optionCounts &&
        Number.isSafeInteger(optionCounts[index]) && optionCounts[index] > 0 && optionCounts[index] <= 21).every(Boolean))) return false;
  const validIndex = (key: string) => /^(0|[1-9][0-9]*)$/.test(key) &&
    Number.isSafeInteger(Number(key)) && (questionCount === undefined || Number(key) < questionCount);
  return Object.entries(selectedAnswers).every(([key, answer]) =>
    validIndex(key) && typeof answer === 'number' && Number.isSafeInteger(answer) && answer >= 0 && answer <= 20 &&
    (optionCounts === undefined || answer < optionCounts[Number(key)])) &&
    Object.entries(markedForReview).every(([key, marked]) => validIndex(key) && typeof marked === 'boolean');
}
