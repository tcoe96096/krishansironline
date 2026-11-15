import React, { useEffect, useState } from 'react';
import { ClipboardCheck, Loader2, Send, ShieldCheck, XCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { requireSupabase } from '../lib/supabase';

type TeacherApplication = {
  id: string;
  applicant_id: string;
  display_name: string;
  subject: string;
  requested_class: string;
  status: 'pending' | 'approved' | 'rejected' | 'withdrawn';
  review_reason: string | null;
  updated_at: string;
};

const subjects = ['Political Science','History','Geography','Economics','Other'] as const;
const classes = ['6','7','8','9','10','11','12'] as const;

/**
 * A self-application NEVER creates a teacher role. It submits a limited
 * request only when the separately reviewed backend has been installed.
 * Approval is server-restricted to Super Admin.
 */
export const TeacherEnrollmentApplication: React.FC = () => {
  const {user} = useAuth();
  const [backendReady,setBackendReady] = useState(false);
  const [loading,setLoading] = useState(false);
  const [busy,setBusy] = useState(false);
  const [application,setApplication] = useState<TeacherApplication|null>(null);
  const [name,setName] = useState('');
  const [subject,setSubject] = useState<string>('History');
  const [classLevel,setClassLevel] = useState<string>('10');
  const [reason,setReason] = useState('');
  const [notice,setNotice] = useState('');
  const [error,setError] = useState('');
  const [reload,setReload] = useState(0);

  useEffect(()=>{
    let mounted=true;
    setApplication(null);
    setBackendReady(false);
    setNotice('');
    setError('');
    if (!user) return;
    setLoading(true);
    void (async()=>{
      try {
        const {data,error:readError} = await requireSupabase()
          .from('teacher_enrollment_requests')
          .select('id,applicant_id,display_name,subject,requested_class,status,review_reason,updated_at')
          .eq('applicant_id',user.id).maybeSingle();
        if (!mounted) return;
        if (readError) return; // Missing approved schema -> do not expose false active controls.
        setBackendReady(true);
        const own=data && data.applicant_id===user.id ? data as TeacherApplication : null;
        setApplication(own);
        if (own) {
          setName(own.display_name);
          setSubject(own.subject);
          setClassLevel(own.requested_class);
        }
      } catch { /* No fallback permissions: backend must be reviewed first. */ }
      finally {if(mounted)setLoading(false);}
    })();
    return ()=>{mounted=false;};
  },[user?.id,reload]);

  const submit = async(event:React.FormEvent)=>{
    event.preventDefault();
    if(!user||!backendReady||busy||application?.status==='pending'||application?.status==='approved')return;
    if(name.trim().length<2||name.trim().length>100||
      !subjects.includes(subject as typeof subjects[number])||
      !classes.includes(classLevel as typeof classes[number])||
      reason.trim().length<12||reason.trim().length>1000) {
      setError('Enter a valid name, subject, class and reason (12–1000 characters).');
      return;
    }
    setBusy(true);setError('');setNotice('');
    try {
      const {error:submitError} = await requireSupabase().rpc('submit_teacher_enrollment',{
        p_display_name:name.trim(),p_subject:subject,p_class_level:classLevel,p_reason:reason.trim()
      });
      if(submitError)throw submitError;
      setNotice('Your Teacher enrollment request has been sent for Super Admin review. No permissions have been assigned.');
      setReason('');
      setReload(v=>v+1);
    } catch(cause) {
      // Supabase/PostgREST failures are plain objects, not always Error instances.
      // Preserve the server's actionable permission/validation message without
      // exposing a full response, stack trace, SQL details or account identifiers.
      const serverError = cause as {message?: unknown; code?: unknown} | null;
      const safeMessage = typeof serverError?.message === 'string' ? serverError.message.trim() : '';
      const safeCode = typeof serverError?.code === 'string' ? serverError.code : '';
      const knownCode = ['42501', '22023', '23505', 'PGRST202'].includes(safeCode) ? safeCode : '';
      const publicMessage = safeMessage.length > 0 && safeMessage.length <= 180 &&
        !/sql|select |insert |update |schema|token|jwt|password|secret|key|http/i.test(safeMessage)
        ? safeMessage : 'Request failed. Please check account permissions and contact Super Admin.';
      setError(knownCode ? `${publicMessage} (Code: ${knownCode})` : publicMessage);
    } finally {setBusy(false);}
  };

  const withdraw = async()=>{
    if(!user||!backendReady||busy||application?.status!=='pending')return;
    if(!window.confirm('Withdraw your pending Teacher application?'))return;
    setBusy(true);setError('');setNotice('');
    try {
      const {data,error:withdrawError}=await requireSupabase().rpc('withdraw_teacher_enrollment');
      if(withdrawError)throw withdrawError;
      if(data!==true)throw new Error('Only a pending request can be withdrawn.');
      setNotice('Application withdrawn. You may submit a new request later.');
      setReload(v=>v+1);
    }catch(cause){setError(cause instanceof Error?cause.message:'Withdrawal failed.');}
    finally{setBusy(false);}
  };

  if(!user)return null;
  return <section className="rounded-2xl border border-slate-200 bg-white p-5" aria-label="Teacher enrollment request">
    <div className="flex items-center gap-2"><ShieldCheck size={20} className="text-sky-900"/>
      <h2 className="font-extrabold text-slate-900">Request Teacher Enrollment</h2></div>
    <p className="mt-2 text-xs leading-5 text-slate-600">
      Request a class-scoped Teacher role. A login or application does not grant
      permission; only Super Admin verification and approval can do that.
    </p>
    {loading?<p className="mt-3 flex items-center gap-2 text-xs text-slate-600"><Loader2 size={15} className="animate-spin"/>Checking enrollment availability…</p>:
     !backendReady?<p className="mt-3 rounded-xl bg-amber-50 p-3 text-xs font-semibold text-amber-900">
       Teacher application backend is awaiting separate approval and activation. Copy your Account ID above
       and contact Super Admin for now. No application has been sent.
     </p>:<>
       {application && <div className="mt-3 rounded-xl border border-sky-200 bg-sky-50 p-3 text-xs text-sky-900">
         <p className="flex items-center gap-2 font-bold"><ClipboardCheck size={15}/>Application: {application.status.toUpperCase()}</p>
         <p className="mt-1">Class {application.requested_class} · {application.subject}</p>
         {application.review_reason&&<p className="mt-2">Review note: {application.review_reason}</p>}
         {application.status==='approved'&&<p className="mt-2">Approval recorded. Refresh your workspace to verify active permissions.</p>}
       </div>}
       {(!application||['rejected','withdrawn'].includes(application.status)) &&
         <form onSubmit={event=>void submit(event)} className="mt-4 grid gap-3 sm:grid-cols-2">
           <label className="text-xs font-bold text-slate-700">Your Display Name
             <input required minLength={2} maxLength={100} value={name} onChange={e=>setName(e.target.value)}
               className="mt-1 h-11 w-full rounded-xl border border-slate-200 px-3 text-sm"/></label>
           <label className="text-xs font-bold text-slate-700">Subject
             <select value={subject} onChange={e=>setSubject(e.target.value)}
               className="mt-1 h-11 w-full rounded-xl border border-slate-200 px-3 text-sm">
               {subjects.map(s=><option key={s} value={s}>{s}</option>)}
             </select></label>
           <label className="text-xs font-bold text-slate-700">Requested Class
             <select value={classLevel} onChange={e=>setClassLevel(e.target.value)}
               className="mt-1 h-11 w-full rounded-xl border border-slate-200 px-3 text-sm">
               {classes.map(level=><option value={level} key={level}>Class {level}</option>)}
             </select></label>
           <label className="text-xs font-bold text-slate-700 sm:col-span-2">Why are you requesting access?
             <textarea required minLength={12} maxLength={1000} rows={3} value={reason}
               onChange={e=>setReason(e.target.value)} placeholder="Describe your teaching role and why access is needed."
               className="mt-1 w-full rounded-xl border border-slate-200 p-3 text-sm"/></label>
           <button type="submit" disabled={busy||reason.trim().length<12||name.trim().length<2}
             className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-sky-900 px-4 text-sm font-bold text-white disabled:opacity-50">
             <Send size={16}/>{busy?'Submitting…':'Request Teacher Access'}
           </button>
         </form>}
       {application?.status==='pending'&&<button type="button" disabled={busy} onClick={()=>void withdraw()}
          className="mt-3 inline-flex min-h-10 items-center gap-2 rounded-xl border border-rose-200 px-4 text-xs font-bold text-rose-800 disabled:opacity-50">
          <XCircle size={15}/>Withdraw Request
       </button>}
     </>}
    {error&&<p role="alert" className="mt-3 rounded-lg bg-rose-50 p-3 text-xs text-rose-800">{error}</p>}
    {notice&&<p role="status" className="mt-3 rounded-lg bg-emerald-50 p-3 text-xs text-emerald-800">{notice}</p>}
  </section>;
};
