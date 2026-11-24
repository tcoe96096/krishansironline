import type { TestAttempt } from './testService';

export const isResumableAttempt = (attempt: TestAttempt, now = Date.now()) =>
  attempt.status === 'in_progress' && Date.parse(attempt.expires_at) > now;

export function summarizeTestAttempts(rows: TestAttempt[], limit: number, now = Date.now()) {
  const attempts = [...rows].sort((a,b)=>b.attempt_number-a.attempt_number);
  const submitted = attempts.filter(a=>a.status==='submitted');
  const latestResult = submitted[0];
  const bestResult = submitted.filter(a=>a.percentage!==null && a.score!==null)
    .sort((a,b)=>Number(b.percentage)-Number(a.percentage))[0];
  const active = attempts.find(a=>isResumableAttempt(a,now));
  const expired = attempts.some(a=>a.status==='expired'||(a.status==='in_progress'&&!isResumableAttempt(a,now)));
  const remaining = Math.max(0,limit-attempts.length);
  return {attempts,latestResult,bestResult,active,expired,remaining,used:attempts.length, exhausted:!active&&remaining===0};
}

// PostgREST errors are often plain objects, not Error instances. Never render raw
// database messages, details, JSON, or object coercions in the student interface.
export function classifyAttemptError(error:unknown) {
  const record = error && typeof error==='object' ? error as Record<string,unknown> : null;
  const message = [typeof error==='string'?error:null,record?.message,record?.details,record?.hint,record?.code]
    .filter((v):v is string=>typeof v==='string').join(' ');
  if (/attempt[\s_-]*limit|limit.*attempt|allowed attempts|maximum.*attempt/i.test(message)) return 'limit';
  if (/expired|deadline|time.*ended/i.test(message)) return 'expired';
  if (/network|fetch|connection|offline/i.test(message)) return 'network';
  return 'unknown';
}
