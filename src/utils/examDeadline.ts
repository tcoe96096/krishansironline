/** The database expiry timestamp, not the browser's interval count, owns the exam deadline. */
export function secondsUntilExamExpiry(expiresAt: string, nowMs: number = Date.now()): number {
  const expiresMs = Date.parse(expiresAt);
  if (!Number.isFinite(expiresMs) || !Number.isFinite(nowMs)) return 0;
  return Math.max(0, Math.ceil((expiresMs - nowMs) / 1000));
}
