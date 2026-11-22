import React,{useEffect,useState} from 'react';
import {teacherCall} from '../services/teacherManagement';
import {isTeacherResumeScanSummary,type TeacherResumeScanSummaryData} from '../lib/teacherResumeScanSummary';

/** Read-only status. No Storage download, signed URL or scanner claim. */
export function TeacherResumeScanSummary({teacherUserId}:{teacherUserId:string}){
 const [summary,setSummary]=useState<TeacherResumeScanSummaryData|null>(null);
 const [error,setError]=useState(false);
 const [loading,setLoading]=useState(true);
 useEffect(()=>{
  let current=true;
  setSummary(null);setError(false);setLoading(true);
  void teacherCall<unknown>('teacher_v2_resume_scan_summary',{p_teacher_user_id:teacherUserId})
   .then(data=>{if(!current)return;if(isTeacherResumeScanSummary(data))setSummary(data);else setError(true);})
   .catch(()=>{if(current)setError(true);})
   .finally(()=>{if(current)setLoading(false);});
  return ()=>{current=false;};
 },[teacherUserId]);
 return <section aria-label="Private resume security status" className="rounded-xl border border-amber-200 bg-amber-50 p-4">
  <h4 className="text-sm font-bold text-amber-950">Resume Security &amp; Verification</h4>
  {loading&&<p role="status" className="mt-2 text-xs text-amber-900">Checking server scan records…</p>}
  {!loading&&error&&<p role="alert" className="mt-2 text-sm text-amber-900">Scan evidence is unavailable. Do not treat this resume as verified.</p>}
  {!loading&&summary&&<div className="mt-2 space-y-2 text-sm text-amber-950">
   <p>Uploaded: <strong>{summary.uploaded}</strong> · Waiting for scan: <strong>{summary.pending_scan}</strong></p>
   <p>Clean scan evidence: <strong>{summary.clean}</strong> · Flagged: <strong>{summary.infected}</strong> · Scan error: <strong>{summary.error}</strong></p>
   <p>Verified by review: <strong>{summary.verified}</strong> · Unfinished reservations: <strong>{summary.reserved}</strong></p>
   <p className="text-xs leading-5">Private files are quarantined. A clean scanner result is required before independent document verification. These counters do not prove a Teacher is approved.</p>
  </div>}
 </section>;
}
