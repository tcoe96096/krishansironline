/** Untrusted RPC data: require consistent nonnegative, exact scan-state counters. */
export type TeacherResumeScanSummaryData={
 total:number;reserved:number;uploaded:number;pending_scan:number;
 clean:number;infected:number;error:number;verified:number;
};
export function isTeacherResumeScanSummary(v:unknown):v is TeacherResumeScanSummaryData{
 if(v===null||typeof v!=='object'||Array.isArray(v))return false;
 const rec=v as Record<string,unknown>;
 const keys=['total','reserved','uploaded','pending_scan','clean','infected','error','verified'] as const;
 if(!keys.every(k=>typeof rec[k]==='number'&&Number.isSafeInteger(rec[k])&&(rec[k] as number)>=0))return false;
 const s=v as TeacherResumeScanSummaryData;
 return s.total===s.reserved+s.uploaded
   &&s.uploaded===s.pending_scan+s.clean+s.infected+s.error
   &&s.verified<=s.clean;
}
