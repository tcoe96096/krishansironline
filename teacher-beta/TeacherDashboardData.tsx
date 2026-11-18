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
