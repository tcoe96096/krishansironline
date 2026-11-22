import React,{useCallback,useEffect,useState} from 'react';
import {teacherCall} from '../src/services/teacherManagement';
import {teacherDashboardSummary,type TeacherDashboardSummary} from '../src/lib/teacherDashboardModel';

/** Own-profile dashboard projection. Browser read-only: no role claims,
 * storage writes, grants, publication or implicit permissions.
 * The server RPC must enforce auth.uid() matching the requested user ID.
 */
export function TeacherDashboardData({userId}:{userId:string}) {
  const [summary,setSummary]=useState<TeacherDashboardSummary|null>(null);
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState('');
  const [reload,setReload]=useState(0);
  const retry=useCallback(()=>setReload(i=>i+1),[]);
  useEffect(()=>{
    let current=true;
    setSummary(null);setError('');setLoading(true);
    void teacherCall<unknown>('teacher_v2_snapshot',{p_user_id:userId})
      .then(response=>{
        if(current)setSummary(teacherDashboardSummary(response,userId));
      })
      .catch(()=>{
        if(current)setError('Unable to verify your teacher profile. Please retry.');
      })
      .finally(()=>{if(current)setLoading(false);});
    return ()=>{current=false;};
  },[userId,reload]);
  return <section aria-label="Teacher verified profile details" className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <h3 className="text-lg font-extrabold text-slate-900">My Verified Profile &amp; Teaching Assignments</h3>
      <button type="button" onClick={retry} disabled={loading}
        className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold text-sky-900 disabled:cursor-not-allowed disabled:opacity-60">Refresh Profile</button>
    </div>
    {loading&&<p role="status" className="mt-4 text-sm text-slate-600">Checking your teacher record…</p>}
    {!loading&&error&&<p role="alert" className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">{error} No teacher assignments are being displayed.</p>}
    {!loading&&summary&&!error&&<div className="mt-4 space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
          <p className="text-xs font-bold text-slate-500">Registration / Verification Status</p>
          <p role="status" className="mt-1 text-sm font-bold text-slate-900">{summary.statusLabel}</p>
        </div>
        <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
          <p className="text-xs font-bold text-slate-500">Employee ID</p>
          <p className="mt-1 break-all text-sm font-bold text-slate-900">{summary.employeeId||'Not issued'}</p>
        </div>
      </div>
      <section aria-label="My verified account details" className="rounded-2xl border border-sky-100 bg-sky-50 p-4">
        <h4 className="text-sm font-bold text-slate-900">My Registration Details</h4>
        <dl className="mt-3 grid gap-3 sm:grid-cols-2">
          <div><dt className="text-xs font-semibold text-slate-500">Full name</dt><dd className="break-words text-sm text-slate-900">{summary.displayName||'Not provided'}</dd></div>
          <div><dt className="text-xs font-semibold text-slate-500">Contact email</dt><dd className="break-all text-sm text-slate-900">{summary.contactEmail||'Not provided'}</dd></div>
          <div><dt className="text-xs font-semibold text-slate-500">Phone</dt><dd className="text-sm text-slate-900">{summary.phone||'Not provided'}</dd></div>
          <div><dt className="text-xs font-semibold text-slate-500">Experience</dt><dd className="text-sm text-slate-900">{summary.experienceYears===null?'Not provided':summary.experienceYears+' years'}</dd></div>
        </dl>
      </section>
      <section aria-label="My qualifications" className="space-y-2">
        <h4 className="text-sm font-bold text-slate-900">Qualifications</h4>
        {summary.qualifications.length===0?<p className="text-sm text-slate-600">No qualifications saved.</p>:
          <ul className="space-y-2">{summary.qualifications.map((q,i)=><li key={i} className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-800">{q.title} · {q.institution} · {q.year}</li>)}</ul>}
      </section>
      <section aria-label="My resume records" className="space-y-2">
        <h4 className="text-sm font-bold text-slate-900">Resume Records</h4>
        {summary.resumeRecords.length===0?<p className="text-sm text-slate-600">No resume on record.</p>:
          <ul className="space-y-2">{summary.resumeRecords.map(r=><li key={r.id} className="rounded-xl border border-slate-200 p-3 text-sm text-slate-800"><span className="break-all">{r.filename}</span><span className="ml-2 text-xs text-slate-600">Verification: {r.status}</span></li>)}</ul>}
        <p className="text-xs text-slate-500">Document details are read-only. Private files cannot be opened or uploaded from this dashboard.</p>
      </section>
      <div>
        <h4 className="text-sm font-bold text-slate-900">Approved Class / Subject Assignments</h4>
        {summary.approvedScopes.length===0?
          <p role="status" className="mt-2 text-sm text-slate-600">No active approved assignments.</p>:
          <ul className="mt-3 flex flex-wrap gap-2">{summary.approvedScopes.map(scope=>
            <li key={scope.id} className="rounded-full border border-teal-200 bg-teal-50 px-3 py-2 text-xs font-bold text-teal-900">{scope.label}</li>)}
          </ul>
        }
        <p className="mt-2 text-xs text-slate-500">Requested classes are not permissions. Only server-confirmed, active assignments for an approved teacher appear here. Study and Result editing remain gated by separate permissions.</p>
      </div>
    </div>}
  </section>;
}
