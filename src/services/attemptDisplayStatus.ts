/**
 * A status shown in a UI must not claim an old, past-deadline attempt is
 * currently active. This is display-only; it does not mutate an attempt.
 * Server-side state transitions and scoring remain authoritative.
 */
export type StoredAttemptStatus = 'submitted' | 'in_progress' | 'expired';
export type DisplayAttemptStatus = StoredAttemptStatus | 'overdue';
export type AttemptExpirySnapshot = { status: StoredAttemptStatus; expires_at?: string | null };

export function displayAttemptStatus(
  attempt: AttemptExpirySnapshot,
  nowEpochMs: number = Date.now()
): DisplayAttemptStatus {
  if (attempt.status !== 'in_progress') return attempt.status;
  if (!attempt.expires_at) return 'in_progress';
  const expiry = Date.parse(attempt.expires_at);
  if (!Number.isFinite(expiry) || !Number.isFinite(nowEpochMs)) return 'in_progress';
  return expiry <= nowEpochMs ? 'overdue' : 'in_progress';
}
