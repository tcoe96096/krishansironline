/** Server-only Teacher queue counters for the existing KSOL Admin workspace.
 * Totals must cover the entire directory, including pages not loaded by the UI.
 * Reject malformed or untrusted RPC values instead of guessing.
 */
export type TeacherQueueSummary={
 total:number;pending:number;drafts:number;approved:number;rejected:number;suspended:number;
};
export function isTeacherQueueSummary(x:unknown):x is TeacherQueueSummary{
 if(!x||typeof x!=='object'||Array.isArray(x))return false;
 const v=x as Partial<Record<keyof TeacherQueueSummary,unknown>>;
 const keys=(['total','pending','drafts','approved','rejected','suspended'] as const);
 if(!keys.every(k=>Number.isSafeInteger(v[k])&&typeof v[k]==='number'&&(v[k] as number)>=0))return false;
 const s=v as TeacherQueueSummary;
 return s.total===s.pending+s.drafts+s.approved+s.rejected+s.suspended;
}
