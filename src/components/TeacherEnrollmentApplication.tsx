import React, { useEffect, useState } from 'react';
import { ClipboardCheck, Loader2, Send, ShieldCheck, XCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { requireSupabase } from '../lib/supabase';
import { validateTeacherQualifications, validateTeacherResume, validateTeacherRequestedScopes, validateTeacherRequestedWorkTypes, validateTeacherProfile, TEACHER_WORK_TYPES } from '../lib/teacherManagementValidation';

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
  const accountName = String(user?.user_metadata?.full_name || user?.user_metadata?.name || '').trim();
  const accountEmail = user?.email || '';
  const [loadedFor,setLoadedFor] = useState<string|null>(null);
  const [subject,setSubject] = useState<string>('History');
  const [classLevel,setClassLevel] = useState<string>('10');
  const [reason,setReason] = useState('');
  const [requestedClasses,setRequestedClasses] = useState<string[]>(['10']);
  const [requestedSubjects,setRequestedSubjects] = useState<string[]>(['History']);
  const [requestedWorkTypes,setRequestedWorkTypes] = useState<string[]>([]);
  const [contactEmail,setContactEmail] = useState('');
  const [phone,setPhone] = useState('');
  const [experienceYears,setExperienceYears] = useState('');
  const [qualification,setQualification] = useState('');
  const [extraQualifications,setExtraQualifications] = useState<{title:string;institution:string;year:string}[]>([]);
  const [institution,setInstitution] = useState('');
  const [graduationYear,setGraduationYear] = useState('');
  const [resumeFile,setResumeFile] = useState<File|null>(null);
  const [notice,setNotice] = useState('');
  const [error,setError] = useState('');
  const [reload,setReload] = useState(0);

  useEffect(()=>{
    let mounted=true;
    setApplication(null);
    setBackendReady(false);
    setNotice('');
    setError('');
    if (!user) {setLoadedFor(null);setResumeFile(null);setPhone('');setQualification('');setInstitution('');setGraduationYear('');setExtraQualifications([]);setExperienceYears('');setReason('');setRequestedWorkTypes([]);return;}
    if(loadedFor!==user.id){
      // Never carry one account's unsaved private profile or resume into another account.
      setName(String(user.user_metadata?.full_name || user.user_metadata?.name || '').trim());
      setContactEmail(user.email||'');setPhone('');setExperienceYears('');
      setQualification('');setInstitution('');setGraduationYear('');setExtraQualifications([]);setResumeFile(null);
      setReason('');setSubject('History');setClassLevel('10');
      setRequestedClasses(['10']);setRequestedSubjects(['History']);setRequestedWorkTypes([]);
      setLoadedFor(user.id);
    }
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
          setRequestedClasses([own.requested_class]);
          setRequestedSubjects([own.subject]);
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
    if(!validateTeacherRequestedScopes(classLevel,subject,requestedClasses,requestedSubjects)){
      setError('Select at least one class and subject, including the primary class and subject.');return;
    }
    if(!validateTeacherRequestedWorkTypes(requestedWorkTypes)){
      setError('Select only the listed work types; duplicate or unsupported requests are not allowed.');return;
    }
    if(!validateTeacherProfile({displayName:name,contactEmail,phone,
      experienceYears:experienceYears.trim()===''?null:Number(experienceYears)})){
      setError('Check your profile name, email, phone and teaching experience (0–70 years).');return;
    }
    if(resumeFile&&!validateTeacherResume(resumeFile)){
      setError('Resume must be a PDF or DOCX file no larger than 5 MB.');return;
    }
    const qualifications = [
      ...(qualification.trim()||institution.trim()||graduationYear.trim() ? [{title:qualification,institution,year:Number(graduationYear)}] : []),
      ...extraQualifications.map(item=>({title:item.title,institution:item.institution,year:Number(item.year)}))
    ];
    if(!validateTeacherQualifications(qualifications)){
      setError('Complete the qualification, institution and valid passing year, or leave all three blank.');return;
    }
    setBusy(true);setError('');setNotice('');
    try {
      const {error:submitError} = await requireSupabase().rpc('submit_teacher_enrollment',{
        p_display_name:name.trim(),p_subject:subject,p_class_level:classLevel,p_reason:reason.trim()
      });
      if(submitError)throw submitError;
      setNotice('Primary class and subject request submitted. Preview-only profile, resume and additional class/subject/work preferences were NOT saved. Super Admin approval is required before any Teacher access.');
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
    <p className="mt-2 text-xs leading-5 text-slate-600">Step 1: Confirm your identity and requested class. Step 2: Submit. Step 3: Super Admin verifies and decides. Login alone never grants permissions.</p>
    <div className="mt-3 rounded-xl border border-sky-100 bg-sky-50 p-3 text-xs text-slate-800" aria-label="Signed-in teacher identity">
      <p className="font-bold text-sky-950">Signed-in Google account</p>
      <p className="mt-1">Name: {accountName || 'Not provided by Google — enter your name below'}</p>
      <p className="mt-1 break-all">Email: {accountEmail || 'Not provided'}</p>
      <p className="mt-1 break-all">Account ID: <span className="font-mono">{user.id}</span></p>
      <p className="mt-2 text-slate-600">Your application is linked to this account ID. The Super Admin verifies your identity independently.</p>
    </div>
    <div className="mt-3 grid gap-2 rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-800 sm:grid-cols-2" aria-label="Teacher identity and employee ID status">
      <div><p className="font-bold text-slate-900">Login Identity</p><p className="mt-1 break-all">{accountEmail||'Authenticated account'}</p></div>
      <div><p className="font-bold text-slate-900">Employee ID</p><p className="mt-1 text-amber-800">Not issued / not verified</p></div>
      <p className="sm:col-span-2 text-slate-600">A unique Employee ID will be shown only after the approved server-side issuance workflow is implemented and verified. Application approval alone does not create a verified Employee ID in this preview.</p>
    </div>
    {loading?<p className="mt-3 flex items-center gap-2 text-xs text-slate-600"><Loader2 size={15} className="animate-spin"/>Checking enrollment availability…</p>:
     !backendReady?<p className="mt-3 rounded-xl bg-amber-50 p-3 text-xs font-semibold text-amber-900">
       Teacher application backend is awaiting separate approval and activation. Copy your Account ID above
       and contact Super Admin for now. No application has been sent.
     </p>:<>
       {application && <div className="mt-3 rounded-xl border border-sky-200 bg-sky-50 p-3 text-xs text-sky-900">
         <p className="flex items-center gap-2 font-bold"><ClipboardCheck size={15}/>Application status: {application.status.toUpperCase()}</p>
         <p className="mt-1">Applicant: {application.display_name}</p>
         <p className="mt-1">Class {application.requested_class} · {application.subject}</p>
         <p className="mt-1">Last updated: {new Date(application.updated_at).toLocaleString()}</p>
         {application.status==='pending'&&<p className="mt-2 font-semibold">Submitted successfully. Waiting for Super Admin review.</p>}
         {application.status==='rejected'&&<p className="mt-2">You may submit a revised application using the form below.</p>}
         {application.review_reason&&<p className="mt-2">Review note: {application.review_reason}</p>}
         {application.status==='approved'&&<p className="mt-2">Approval recorded. Refresh your workspace to verify active permissions.</p>}
       </div>}
       {(!application||['rejected','withdrawn'].includes(application.status)) &&
         <form onSubmit={event=>void submit(event)} className="mt-4 grid gap-3 sm:grid-cols-2">
           <label className="text-xs font-bold text-slate-700">Full name (as you want Admin to identify you)
             <input required minLength={2} maxLength={100} value={name} onChange={e=>setName(e.target.value)}
               className="mt-1 h-11 w-full rounded-xl border border-slate-200 px-3 text-sm"/></label>
           <label className="text-xs font-bold text-slate-700">Subject
             <select value={subject} onChange={e=>{setSubject(e.target.value);setRequestedSubjects(current=>current.includes(e.target.value)?current:[...current,e.target.value]);}}
               className="mt-1 h-11 w-full rounded-xl border border-slate-200 px-3 text-sm">
               {subjects.map(s=><option key={s} value={s}>{s}</option>)}
             </select></label>
           <label className="text-xs font-bold text-slate-700">Requested Class
             <select value={classLevel} onChange={e=>{setClassLevel(e.target.value);setRequestedClasses(current=>current.includes(e.target.value)?current:[...current,e.target.value]);}}
               className="mt-1 h-11 w-full rounded-xl border border-slate-200 px-3 text-sm">
               {classes.map(level=><option value={level} key={level}>Class {level}</option>)}
             </select></label>
           <div className="rounded-xl border border-sky-200 bg-sky-50 p-3 text-xs text-sky-950 sm:col-span-2">
             <p className="font-bold">Advanced Teacher Profile — Preview only</p>
             <p className="mt-1">You can prepare multiple classes, subjects and qualifications here. The current approved backend accepts only one primary class and subject. Additional class, subject and work selections are NOT submitted or saved yet; Super Admin assignments require a separately reviewed backend.</p>
           </div>
           <fieldset className="sm:col-span-2"><legend className="text-xs font-bold text-slate-700">Requested classes (preview selection)</legend>
             <div className="mt-2 flex flex-wrap gap-3">{classes.map(level=><label key={level} className="flex items-center gap-1 text-xs"><input type="checkbox" checked={requestedClasses.includes(level)} onChange={event=>setRequestedClasses(current=>event.target.checked?[...current,level]:current.filter(item=>item!==level))}/>Class {level}</label>)}</div>
           </fieldset>
           <fieldset className="sm:col-span-2"><legend className="text-xs font-bold text-slate-700">Requested subjects (preview selection)</legend>
             <div className="mt-2 flex flex-wrap gap-3">{subjects.map(item=><label key={item} className="flex items-center gap-1 text-xs"><input type="checkbox" checked={requestedSubjects.includes(item)} onChange={event=>setRequestedSubjects(current=>event.target.checked?[...current,item]:current.filter(value=>value!==item))}/>{item}</label>)}</div>
           </fieldset>
           <fieldset className="sm:col-span-2"><legend className="text-xs font-bold text-slate-700">Requested work permissions (preview selection — not saved)</legend>
             <p className="mt-1 text-xs text-slate-600">These preferences do not grant access. Only Super Admin can assign approved work permissions after server activation.</p>
             <div className="mt-2 flex flex-wrap gap-3">{TEACHER_WORK_TYPES.map(work=><label key={work} className="flex items-center gap-1 text-xs"><input type="checkbox" checked={requestedWorkTypes.includes(work)} onChange={event=>setRequestedWorkTypes(current=>event.target.checked?[...current,work]:current.filter(item=>item!==work))}/>{work.replace('.', ' · ')}</label>)}</div>
           </fieldset>
           <label className="text-xs font-bold text-slate-700">Contact Email (preview only)
             <input type="email" maxLength={254} value={contactEmail} onChange={event=>setContactEmail(event.target.value)} className="mt-1 h-11 w-full rounded-xl border border-slate-200 px-3 text-sm"/></label>
           <label className="text-xs font-bold text-slate-700">Phone (preview only)
             <input type="tel" maxLength={20} value={phone} onChange={event=>setPhone(event.target.value)} placeholder="+91 9876543210" className="mt-1 h-11 w-full rounded-xl border border-slate-200 px-3 text-sm"/></label>
           <label className="text-xs font-bold text-slate-700 sm:col-span-2">Teaching Experience in Years (preview only)
             <input type="number" min={0} max={70} step={1} value={experienceYears} onChange={event=>setExperienceYears(event.target.value)} className="mt-1 h-11 w-full rounded-xl border border-slate-200 px-3 text-sm"/></label>
           <label className="text-xs font-bold text-slate-700">Qualification (preview only)
             <input maxLength={120} value={qualification} onChange={event=>setQualification(event.target.value)} placeholder="e.g. M.A. Political Science" className="mt-1 h-11 w-full rounded-xl border border-slate-200 px-3 text-sm"/></label>
           <label className="text-xs font-bold text-slate-700">Institution (preview only)
             <input maxLength={160} value={institution} onChange={event=>setInstitution(event.target.value)} placeholder="University / Institution" className="mt-1 h-11 w-full rounded-xl border border-slate-200 px-3 text-sm"/></label>
           <div className="sm:col-span-2 rounded-xl border border-slate-200 p-3">
             <label className="block text-xs font-bold text-slate-700" htmlFor="teacher-resume-preview">Resume PDF / DOCX (local preview only)</label>
             <input id="teacher-resume-preview" type="file" accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
               onChange={event=>{const file=event.target.files?.[0]||null;setResumeFile(file);if(file&&!validateTeacherResume(file)){setError('Resume must be PDF/DOCX and 5 MB or smaller.');}else{setError('');}}}
               className="mt-2 block w-full text-xs text-slate-700"/>
             <p className="mt-2 text-xs text-amber-800">Your selected file remains on this device. It is NOT uploaded, attached to your application or stored by KSOL until secure private document storage is separately approved.</p>
             {resumeFile&&<p className="mt-1 text-xs font-semibold text-slate-700">Selected: {resumeFile.name} ({Math.ceil(resumeFile.size/1024)} KB) — {validateTeacherResume(resumeFile)?'Valid format':'Invalid format'}</p>}
           </div>
           <label className="text-xs font-bold text-slate-700 sm:col-span-2">Passing year (preview only)
             <input type="number" min={1950} max={new Date().getFullYear()} value={graduationYear} onChange={event=>setGraduationYear(event.target.value)} className="mt-1 h-11 w-full rounded-xl border border-slate-200 px-3 text-sm"/></label>
           <fieldset className="sm:col-span-2 rounded-xl border border-slate-200 p-3"><legend className="text-xs font-bold text-slate-700">Additional qualifications (preview only — not saved)</legend>
             {extraQualifications.map((item,index)=><div key={index} className="mt-2 grid gap-2 rounded-lg border border-slate-200 p-2 sm:grid-cols-3">
               <input aria-label={`Qualification ${index+2}`} placeholder="Qualification" maxLength={120} value={item.title} onChange={e=>setExtraQualifications(current=>current.map((value,i)=>i===index?{...value,title:e.target.value}:value))} className="rounded border p-2 text-sm"/>
               <input aria-label={`Institution ${index+2}`} placeholder="Institution" maxLength={160} value={item.institution} onChange={e=>setExtraQualifications(current=>current.map((value,i)=>i===index?{...value,institution:e.target.value}:value))} className="rounded border p-2 text-sm"/>
               <input aria-label={`Passing year ${index+2}`} type="number" min={1950} max={new Date().getFullYear()} placeholder="Year" value={item.year} onChange={e=>setExtraQualifications(current=>current.map((value,i)=>i===index?{...value,year:e.target.value}:value))} className="rounded border p-2 text-sm"/>
               <button type="button" onClick={()=>setExtraQualifications(current=>current.filter((_,i)=>i!==index))} className="rounded border px-3 py-2 text-xs text-rose-800">Remove qualification</button>
             </div>)}
             <button type="button" disabled={extraQualifications.length>=19} onClick={()=>setExtraQualifications(current=>[...current,{title:'',institution:'',year:''}])} className="mt-2 rounded border border-sky-300 px-3 py-2 text-xs font-bold text-sky-900 disabled:opacity-50">+ Add qualification</button>
             <p className="mt-1 text-xs text-amber-800">Qualifications are local preview data only and are not submitted to the backend.</p>
           </fieldset>
           <label className="text-xs font-bold text-slate-700 sm:col-span-2">Why are you requesting access?
             <textarea required minLength={12} maxLength={1000} rows={3} value={reason}
               onChange={e=>setReason(e.target.value)} placeholder="Describe your teaching role and why access is needed."
               className="mt-1 w-full rounded-xl border border-slate-200 p-3 text-sm"/></label>
           <div className="sm:col-span-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-950" aria-label="Application submission summary">
             <h3 className="font-extrabold">Before submitting — what KSOL will receive</h3>
             <p className="mt-2">Submitted to the current backend: <strong>{name.trim()||'Your name'} · Class {classLevel} · {subject}</strong> and your application reason.</p>
             <p className="mt-1">Preview only, NOT submitted: <strong>{requestedClasses.length} selected classes, {requestedSubjects.length} selected subjects{qualification.trim()||extraQualifications.length?', qualifications':''}{contactEmail.trim()||phone.trim()||experienceYears.trim()?', contact details / experience':''}{resumeFile?', resume file':''}</strong>.</p>
             <p className="mt-2 font-semibold">Your extra selections and resume will not be attached to this application. Super Admin will only see the primary class and subject until the secure extended backend is approved.</p>
           </div>
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
