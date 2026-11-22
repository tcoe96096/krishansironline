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
  if (!saved || saved.testId !== testId || attempt.status !== 'in_progress' || remainingSeconds <= 0) {
    return false;
  }

  if (saved.version === 2) {
    return saved.userId === userId && saved.attemptId === attempt.id;
  }

  if (saved.version !== 1 || !saved.student) return false;

  // A v1 browser draft had no attempt ID. Allow backward-compatible recovery
  // only if it was saved during this exact server attempt's validity window.
  // A later attempt must never inherit old answers.
  const started = Date.parse(attempt.started_at);
  const expires = Date.parse(attempt.expires_at);
  if (!Number.isFinite(started) || !Number.isFinite(expires) ||
      saved.savedAt < started || saved.savedAt > expires) return false;

  return saved.student.studentName === student.studentName &&
    saved.student.rollNo === student.rollNo &&
    saved.student.studentClass === student.studentClass &&
    saved.student.school === student.school;
}
