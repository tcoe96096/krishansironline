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

  if (saved.version === 2) {
    return !!saved.userId && !!saved.attemptId && saved.userId === userId && saved.attemptId === attempt.id;
  }

  if (saved.version !== 1 || !saved.student) return false;

  // A v1 browser draft had no attempt ID. Its student fields are used only
  // for backward compatibility and must not be copied into v2 drafts.
  return saved.student.studentName === student.studentName &&
    saved.student.rollNo === student.rollNo &&
    saved.student.studentClass === student.studentClass &&
    saved.student.school === student.school;
}
