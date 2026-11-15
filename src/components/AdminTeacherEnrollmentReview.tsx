import React, { useEffect, useState } from 'react';
import { CheckCircle2, Clock3, Loader2, RefreshCw, ShieldCheck, XCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { requireSupabase } from '../lib/supabase';
import { normalizeTeacherAssignments, TEACHER_CLASSES, TEACHER_SUBJECTS, TEACHER_WORK_TYPES, type TeacherAssignmentInput } from '../lib/teacherManagementValidation';

type TeacherRequest = {
  id:string;applicant_id:string;display_name:string;subject:string;
  requested_class:string;reason:string;status:string;
  review_reason:string|null;created_at:string;
};

/** No privileged action is available without a live is_super_admin verification. */
export const AdminTeacherEnrollmentReview:React.FC<{demoMode?:boolean}> = ({demoMode=false})=>{
  const {user,isAdmin}=useAuth();
  const [superAdmin,setSuperAdmin]=useState(false);
  const [backendReady,setBackendReady]=useState(false);
  const [loading,setLoading]=useState(false);
  const [busy,setBusy]=useState(false);
  const [requests,setRequests]=useState<TeacherRequest[]>([]);
  const [reason,setReason]=useState('');
  const [selected,setSelected]=useState<string|null>(null);
  const [showHistory,setShowHistory]=useState(false);
  const [search,setSearch]=useState('');
  const [assignmentDraft,setAssignmentDraft]=useState<TeacherAssignmentInput[]>([]);
  const [assignmentClass,setAssignmentClass]=useState<string>('10');
  const [assignmentSubject,setAssignmentSubject]=useState<string>('History');
  const [assignmentWork,setAssignmentWork]=useState<string>('materials.draft');
  const [notice,setNotice]=useState('');
  const [error,setError]=useState('');
  const [reload,setReload]=useState(0);

  useEffect(()=>{
    let mounted=true;
    setBackendReady(false);setSuperAdmin(false);setRequests([]);
    setSelected(null);setReason('');setAssignmentDraft([]);setError('');setNotice('');
    if(demoMode||!user||!isAdmin)return;
    setLoading(true);
    void (async()=>{
      try{
        const client=requireSupabase();
        const result=await client.rpc('is_super_admin');
        if(!mounted||result.error||result.data!==true)return;
        setSuperAdmin(true);
        const rows=await client.from('teacher_enrollment_requests')
          .select('id,applicant_id,display_name,subject,requested_class,reason,status,review_reason,created_at')
          .order('created_at',{ascending:false}).limit(150);
        if(!mounted||rows.error)return;
        setBackendReady(true);
        setRequests((rows.data||[]) as TeacherRequest[]);
      }catch{ /* Missing or denied backend => all write buttons remain hidden. */ }
      finally{if(mounted)setLoading(false);}
    })();
    return ()=>{mounted=false;};
  },[demoMode,user?.id,isAdmin,reload]);

  const review=async(request:TeacherRequest,decision:'approve'|'reject')=>{
    if(!user||!isAdmin||!superAdmin||!backendReady||busy||request.status!=='pending')return;
    const justification=reason.trim();
    if(selected!==request.id||justification.length<12||justification.length>1000){
      setError('Write a decision reason of 12–1000 characters for the selected request.');return;
    }
    if(!window.confirm(decision==='approve'
      ?'Approve this verified account for scoped Teacher MATERIAL DRAFT rights only?'
      :'Reject this Teacher enrollment request?'))return;
    setBusy(true);setError('');setNotice('');
    try{
      const client=requireSupabase();
      const verify=await client.rpc('is_super_admin');
      if(verify.error||verify.data!==true)throw new Error('Super Admin verification was not granted.');
      const {data,error:rpcError}=await client.rpc('review_teacher_enrollment',{
        p_request_id:request.id,p_action:decision,p_reason:justification
      });
      if(rpcError)throw rpcError;
      if(data!== (decision==='approve'?'approved':'rejected'))
        throw new Error('Server did not confirm this decision.');
      setNotice(decision==='approve'
        ?'Teacher approved with class-scoped MATERIAL DRAFT permissions only. Audit recorded.'
        :'Teacher request rejected and audited. No permissions granted.');
      setReason('');setSelected(null);setReload(v=>v+1);
    }catch(cause){setError(cause instanceof Error?cause.message:'Teacher review failed.');}
    finally{setBusy(false);}
  };

  const query=search.trim().toLocaleLowerCase();
  const visible=requests.filter(r=>!query||[r.display_name,r.applicant_id,r.subject,r.requested_class,r.status].some(value=>value.toLocaleLowerCase().includes(query)));
  const pending=visible.filter(r=>r.status==='pending');
  const history=visible.filter(r=>r.status!=='pending');
  return <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6" aria-label="Teacher approval requests">
    <div className="flex flex-wrap items-center justify-between gap-2">
      <div>
        <p className="flex items-center gap-2 text-xs font-bold text-teal-800"><ShieldCheck size={15}/> SUPER ADMIN ONLY</p>
        <h3 className="mt-1 text-lg font-extrabold text-slate-900">Teacher Enrollment Requests</h3>
        <p className="mt-1 text-xs leading-5 text-slate-600">
          Check teacher identity independently before approval. Approved requests grant only the
          nominated class's study-material draft/review rights—not website editing, scores or publication.
        </p>
      </div>
      <button type="button" disabled={demoMode||loading||busy} onClick={()=>setReload(v=>v+1)}
        className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-slate-200 px-3 text-xs font-bold text-slate-800 disabled:opacity-40">
        <RefreshCw size={15}/>Refresh Requests
      </button>
    </div>
    {demoMode?<p className="mt-4 rounded-xl bg-amber-50 p-4 text-xs text-amber-900">Demo protects all real Teacher applications and approvals.</p>:
     loading?<p className="mt-4 flex items-center gap-2 text-xs text-slate-600"><Loader2 size={16} className="animate-spin"/>Checking Super Admin authority…</p>:
     !superAdmin?<p className="mt-4 rounded-xl bg-amber-50 p-4 text-xs text-amber-900">Only a database-verified Super Admin can view or approve teacher requests.</p>:
     !backendReady?<p className="mt-4 rounded-xl bg-amber-50 p-4 text-xs text-amber-900">
       Audited Teacher enrollment backend has not been activated in this environment.
       Requests and approvals remain unavailable until the separate Preview migration and security tests are approved.
     </p>:
     <>
       <label className="mt-4 block text-xs font-bold text-slate-700">Search teacher applications
         <input type="search" value={search} onChange={event=>setSearch(event.target.value)}
           placeholder="Name, account ID, subject, class or status"
           className="mt-1 h-11 w-full rounded-xl border border-slate-200 px-3 text-sm"/>
       </label>
       <p className="mt-2 text-xs text-slate-600">Showing {visible.length} of {requests.length} loaded applications (latest 150). Search only filters loaded records.</p>
       <div className="mt-4 flex items-center gap-2 text-xs font-bold text-sky-950"><Clock3 size={16}/>Pending applications: {pending.length}</div>
       {!pending.length&&<p className="mt-3 rounded-xl bg-slate-50 p-4 text-xs text-slate-600">No pending Teacher enrollment requests.</p>}
       <div className="mt-3 space-y-3">
         {pending.map(req=><article key={req.id} className="rounded-xl border border-slate-200 p-4">
           <div className="flex flex-wrap items-start justify-between gap-2">
             <div>
               <h4 className="text-sm font-extrabold text-slate-900">{req.display_name}</h4>
               <p className="mt-1 text-xs font-semibold text-sky-900">Status: Pending · Submitted: {new Date(req.created_at).toLocaleString()}</p>
               <p className="mt-1 text-xs text-slate-600">Class {req.requested_class} · {req.subject}</p>
               <p className="mt-1 break-all font-mono text-[11px] text-slate-500">Account: {req.applicant_id}</p>
               <p className="mt-2 text-xs text-slate-700">{req.reason}</p>
             </div>
             <button type="button" onClick={()=>{setSelected(req.id);setReason('');setAssignmentDraft([]);setError('');}}
               className="rounded-lg border border-sky-200 px-3 py-2 text-xs font-bold text-sky-900">Review Request</button>
           </div>
           {selected===req.id&&<div className="mt-3 space-y-3 rounded-lg bg-slate-50 p-3">
             <div className="rounded-xl border border-sky-200 bg-white p-3 text-xs text-slate-800" aria-label="Teacher assignment planner">
               <p className="font-extrabold text-sky-950">Multiple Assignment Planner — Draft Only</p>
               <p className="mt-1 text-slate-600">Prepare class, subject and work combinations. These selections remain in this browser session and are NOT saved or granted on approval. Existing approval still grants only the primary class's material rights.</p>
               <div className="mt-3 grid gap-2 sm:grid-cols-3">
                 <label>Class<select aria-label="Assignment class" value={assignmentClass} onChange={e=>setAssignmentClass(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-200 p-2">{TEACHER_CLASSES.map(value=><option key={value} value={value}>{value}</option>)}</select></label>
                 <label>Subject<select aria-label="Assignment subject" value={assignmentSubject} onChange={e=>setAssignmentSubject(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-200 p-2">{TEACHER_SUBJECTS.map(value=><option key={value} value={value}>{value}</option>)}</select></label>
                 <label>Work<select aria-label="Assignment work" value={assignmentWork} onChange={e=>setAssignmentWork(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-200 p-2">{TEACHER_WORK_TYPES.map(value=><option key={value} value={value}>{value}</option>)}</select></label>
               </div>
               <button type="button" className="mt-2 rounded-lg border border-sky-200 px-3 py-2 font-bold text-sky-900" onClick={()=>setAssignmentDraft(current=>normalizeTeacherAssignments([...current,{classLevel:assignmentClass,subject:assignmentSubject,workType:assignmentWork}]))}>Add draft assignment</button>
               <div className="mt-2 space-y-1">{assignmentDraft.map((item,index)=><div key={JSON.stringify(item)} className="flex items-center justify-between gap-2 rounded-lg bg-slate-50 p-2"><span>Class {item.classLevel} · {item.subject} · {item.workType}</span><button type="button" className="font-bold text-rose-800" aria-label={`Remove assignment ${index+1}`} onClick={()=>setAssignmentDraft(current=>current.filter((_,i)=>i!==index))}>Remove</button></div>)}</div>
             </div>
             <p className="text-xs font-semibold text-slate-700">Verify account identity outside this form, then enter audit reason.</p>
             <label className="text-xs font-bold text-slate-700">Mandatory Decision Reason
               <textarea required rows={2} minLength={12} maxLength={1000} value={reason}
                 onChange={e=>setReason(e.target.value)}
                 className="mt-1 w-full rounded-lg border border-slate-200 p-3 text-sm"/></label>
             <div className="flex flex-wrap gap-2">
               <button type="button" disabled={busy||reason.trim().length<12}
                 onClick={()=>void review(req,'approve')}
                 className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-emerald-800 px-4 text-xs font-bold text-white disabled:opacity-40">
                 <CheckCircle2 size={15}/>Approve Teacher
               </button>
               <button type="button" disabled={busy||reason.trim().length<12}
                 onClick={()=>void review(req,'reject')}
                 className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-rose-200 px-4 text-xs font-bold text-rose-800 disabled:opacity-40">
                 <XCircle size={15}/>Reject Request
               </button>
             </div>
           </div>}
         </article>)}
       </div>
       <div className="mt-5 border-t border-slate-200 pt-4">
         <button type="button" onClick={()=>setShowHistory(v=>!v)} aria-expanded={showHistory} className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-sky-900">{showHistory?'Hide':'Show'} previous requests ({history.length})</button>
         {showHistory&&<div className="mt-3 space-y-2">{history.map(req=><article key={req.id} className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs">
           <p className="font-bold text-slate-900">{req.display_name} · {req.status.toUpperCase()}</p>
           <p className="mt-1">Class {req.requested_class} · {req.subject} · Submitted {new Date(req.created_at).toLocaleString()}</p>
           <p className="mt-1 break-all font-mono">Account ID: {req.applicant_id}</p>
           {req.review_reason&&<p className="mt-1">Decision note: {req.review_reason}</p>}
         </article>)}{history.length===0&&<p className="text-xs text-slate-500">No previous applications.</p>}</div>}
       </div>
     </>}
    {error&&<p role="alert" className="mt-4 rounded-xl bg-rose-50 p-3 text-xs text-rose-900">{error}</p>}
    {notice&&<p role="status" className="mt-4 rounded-xl bg-emerald-50 p-3 text-xs text-emerald-900">{notice}</p>}
  </section>;
};
