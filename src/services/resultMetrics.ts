/**
 * Pure helpers for displaying server-recorded results.
 * They NEVER grade or mutate a test attempt: Postgres remains authoritative.
 */
export type RecordedAttempt = {
  status: 'in_progress' | 'submitted' | 'expired';
  percentage: number | null;
  correct_count: number | null;
  attempted_count: number | null;
  score: number | null;
  total_marks: number | null;
};

export const finiteNumber = (value: number | null | undefined): number | null => {
  if (value == null) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

export function percentageLabel(value: number | null | undefined): string {
  const parsed = finiteNumber(value);
  return parsed === null ? '—' : parsed.toFixed(1) + '%';
}

/** Visual bars must stay within CSS bounds; reporting itself is not clamped. */
export function percentBarWidth(value: number | null | undefined): string {
  const parsed = finiteNumber(value);
  return (parsed === null ? 0 : Math.max(0, Math.min(100, parsed))) + '%';
}

export function submittedMetrics(attempt: RecordedAttempt):
  { correct: number; incorrect: number; attempted: number; score: number | null; totalMarks: number | null; percentage: number | null } | null {
  if (attempt.status !== 'submitted') return null;
  const correct = Math.max(0, Math.trunc(finiteNumber(attempt.correct_count) ?? 0));
  const attempted = Math.max(0, Math.trunc(finiteNumber(attempt.attempted_count) ?? 0));
  return {
    correct, attempted, incorrect: Math.max(0, attempted - correct),
    score: finiteNumber(attempt.score),
    totalMarks: finiteNumber(attempt.total_marks),
    percentage: finiteNumber(attempt.percentage),
  };
}

/**
 * Prevent a CSV opening in spreadsheet software from interpreting a student's
 * name, roll number or test title as a formula. Quotes and CRLF are preserved.
 */
export function escapeSpreadsheetCell(value: unknown): string {
  let text = String(value ?? '');
  if (/^[\s\uFEFF]*[=+\-@\t\r]/u.test(text) || /^[\t\r]/.test(text)) {
    text = "'" + text;
  }
  return '"' + text.replace(/"/g, '""') + '"';
}
