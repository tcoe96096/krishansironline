import {teacherBetaEnabled,teacherAdvancedEnabled,teacherAnalyticsEnabled} from '../lib/teacherBetaFlags';
import React,{useEffect,useState,useRef} from 'react';
import {formatPrivateResultSummary,type PrivateResultSummary} from '../services/teacherResultPrivacy';
import {useAuth} from '../context/AuthContext';
import {teacherCall,saveTeacherApplication,teacherResumeEnabled,teacherResultSummaryEnabled,uploadTeacherResume,downloadTeacherResume,type TeacherSnapshot} from '../services/teacherManagement';
import {TEACHER_CLASSES,TEACHER_SUBJECTS,TEACHER_WORK_TYPES,type TeacherAssignmentInput,type TeacherQualificationInput} from '../lib/teacherManagementValidation';

const field='rounded border border-slate-300 p-2 text-sm w-full';
export function TeacherScopeEditor({value,onChange}:{value:TeacherAssignmentInput[];onChange:(v:TeacherAssignmentInput[])=>void}){
 const [level,setLevel]=useState('10'),[subject,setSubject]=useState('History'),[work,setWork]=useState('materials.draft');
 return <fieldset className="space-y-2"><legend>{teacherAdvancedEnabled?'Classes, subjects and work':'Classes and subjects'}</legend><div className="grid gap-2 sm:grid-cols-3">
 <select aria-label="Assignment class" className={field} value={level} onChange={e=>setLevel(e.target.value)}>{TEACHER_CLASSES.map(x=><option key={x}>{x}</option>)}</select>
 <select aria-label="Assignment subject" className={field} value={subject} onChange={e=>setSubject(e.target.value)}>{TEACHER_SUBJECTS.map(x=><option key={x}>{x}</option>)}</select>
 {teacherAdvancedEnabled&&<select aria-label="Assignment work" className={field} value={work} onChange={e=>setWork(e.target.value)}>{TEACHER_WORK_TYPES.map(x=><option key={x}>{x}</option>)}</select>}</div>
 <button type="button" disabled={value.length>=60} onClick={()=>{if(!value.some(x=>x.classLevel===level&&x.subject===subject&&x.workType===work))onChange([...value,{classLevel:level,subject,workType:work}]);}}>Add scope</button>
 {value.map((x,i)=><p key={i}>Class {x.classLevel} · {x.subject}{teacherAdvancedEnabled?' · '+x.workType:''} <button type="button" aria-label={`Remove scope ${i+1}`} onClick={()=>onChange(value.filter((_,n)=>n!==i))}>Remove</button></p>)}
 <p className="text-xs text-slate-600">Requests require Super Admin approval. Basic Beta assignments do not enable advanced tools or marks editing.</p></fieldset>;
}

export function TeacherManagementV2(){
 const inFlight=useRef(false);
 const {user}=useAuth();const [snapshot,setSnapshot]=useState<TeacherSnapshot|null>(null),[ready,setReady]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState(''),[busy,setBusy]=useState(false),[reload,setReload]=useState(0);
 const [registrationOpen,setRegistrationOpen]=useState(false);
 const [summaries,setSummaries]=useState<PrivateResultSummary[]>([]);
 const [name,setName]=useState(''),[email,setEmail]=useState(''),[phone,setPhone]=useState(''),[years,setYears]=useState(''),[reason,setReason]=useState('');
 const [qualifications,setQualifications]=useState<TeacherQualificationInput[]>([]),[scopes,setScopes]=useState<TeacherAssignmentInput[]>([]);
 useEffect(()=>{let current=true;setSnapshot(null);setRegistrationOpen(false);setSummaries([]);setReady(false);setError('');setName('');setEmail('');setPhone('');setYears('');setReason('');setQualifications([]);setScopes([]);
 if(user&&teacherBetaEnabled)void teacherCall<{registration:boolean}>('teacher_v2_beta_capabilities').then(caps=>{if(current)setRegistrationOpen(caps.registration===true);return teacherCall<TeacherSnapshot|null>('teacher_v2_snapshot',{p_user_id:user.id});}).then(p=>{if(!current)return;setSnapshot(p);setReady(true);if(p){setName(p.display_name);setEmail(p.contact_email||'');setPhone(p.phone||'');setYears(p.experience_years===null?'':String(p.experience_years));setReason(p.application_reason||'');setQualifications(p.qualifications);setScopes(p.requested_scopes);}}).catch(()=>{if(current)setReady(false);});return()=>{current=false;};},[user?.id,reload]);
 if(!user)return null;
 if(!teacherBetaEnabled)return <section aria-label="Teacher Management v2" className="rounded-2xl border bg-white p-5"><h2 className="font-bold">Teacher Management v2</h2><p>Basic Teacher Beta awaits owner-approved activation.</p></section>;
 const act=async(action:()=>Promise<unknown>,message:string,refresh=true)=>{if(inFlight.current)return;inFlight.current=true;setBusy(true);setError('');setNotice('');try{await action();if(refresh)setReload(n=>n+1);setNotice(message);}catch(e){setError(e instanceof Error?e.message:'Operation failed.');}finally{inFlight.current=false;setBusy(false);}};
 const dirty=!!snapshot&&(name!==snapshot.display_name||email!==(snapshot.contact_email||'')||phone!==(snapshot.phone||'')||years!==(snapshot.experience_years===null?'':String(snapshot.experience_years))||reason!==(snapshot.application_reason||'')||JSON.stringify(qualifications)!==JSON.stringify(snapshot.qualifications)||JSON.stringify(scopes)!==JSON.stringify(snapshot.requested_scopes));
 const locked=!!snapshot&&(snapshot.status==='approved'||snapshot.status==='suspended'||!!snapshot.submitted_at);
 return <section aria-label="Teacher Management v2" className="space-y-4 rounded-2xl border bg-white p-5"><h2 className="text-lg font-bold">Teacher Management v2</h2>{ready&&<button disabled={busy} onClick={()=>{if(!dirty||window.confirm('Discard unsaved profile edits and reload the saved profile?')){setNotice('');setReload(n=>n+1);}}}>Refresh teacher profile</button>}
 {!ready?<p role="status">Basic Teacher Beta registration is awaiting owner-approved backend activation. No v2 application has been sent.</p>:<>
 {snapshot&&<div className="space-y-2"><p>Status: <strong>{snapshot.status}{snapshot.submitted_at?' · Awaiting review':''}</strong></p><p>Employee ID: <strong>{snapshot.employee_id||'Not issued'}</strong></p><p>{snapshot.status==='approved'?'Verified personal details':snapshot.status==='suspended'?'Previously verified details — access suspended':'Personal details awaiting verification'}: {snapshot.display_name} · {snapshot.contact_email} · {snapshot.phone}</p><p>Experience: {snapshot.experience_years??'Not provided'}</p>
 {snapshot.decision_reason&&<p>Last review note: {snapshot.decision_reason}</p>}
 {snapshot.qualifications.map((q,i)=><p key={i}>{q.title} · {q.institution} · {q.year}</p>)}
 {snapshot.requested_scopes.map((scope,i)=><p key={`requested-${i}`}>Requested: Class {scope.classLevel} · {scope.subject}</p>)}
 {snapshot.assignments.map(a=><p key={a.id}>Class {a.class_level} · {a.subject}{teacherAdvancedEnabled?' · '+a.work_type:''} · {a.status} {teacherAnalyticsEnabled&&a.status==='active'&&a.work_type==='result.review'&&teacherResultSummaryEnabled&&<button disabled={busy} onClick={()=>{setError('');void teacherCall<typeof summaries>('teacher_v2_result_summary',{p_class:a.class_level,p_subject:a.subject}).then(setSummaries).catch(()=>{setSummaries([]);setError('Scoped result review denied.');});}}>Review result summary</button>}</p>)}
 {summaries.map(s=><p key={s.test_id}>Test {s.test_id}: {formatPrivateResultSummary(s)}</p>)}
 {snapshot.resumes.map(d=><p key={d.id}>{d.original_filename} · {d.verification_status} {teacherResumeEnabled&&<button disabled={busy} onClick={()=>void act(()=>downloadTeacherResume(d.id,d.original_filename),'Resume downloaded.',false)}>Download private resume</button>}</p>)}
 {snapshot.submitted_at&&<button disabled={busy} onClick={()=>void act(()=>teacherCall('teacher_v2_withdraw'),'Application withdrawn.')}>Withdraw to edit</button>}</div>}
 {!registrationOpen&&<p role="status">New teacher registration is currently closed. Saved profile details remain read-only.</p>}
 {!locked&&registrationOpen&&<form className="space-y-3" onSubmit={e=>{e.preventDefault();void act(()=>saveTeacherApplication({displayName:name,contactEmail:email,phone,experienceYears:years===''?null:Number(years)},qualifications,scopes,reason,true,snapshot?.revision??null),'Application submitted for independent verification.');}}><fieldset disabled={busy} className="space-y-3">
 {!snapshot&&<p className="text-xs text-amber-800">Existing staff: have Super Admin verify your assignments and close legacy staff access before entering v2. Applicants cannot change their own permissions.</p>}
 <label className="block">Full name<input className={field} required maxLength={160} value={name} onChange={e=>setName(e.target.value)}/></label>
 <label className="block">Contact email<input className={field} type="email" value={email} onChange={e=>setEmail(e.target.value)}/></label>
 <label className="block">Phone<input className={field} maxLength={20} value={phone} onChange={e=>setPhone(e.target.value)}/></label>
 <label className="block">Experience (years)<input className={field} type="number" min={0} max={70} value={years} onChange={e=>setYears(e.target.value)}/></label>
 <fieldset><legend>Qualifications</legend>{qualifications.map((q,i)=><div className="my-2 grid gap-2 sm:grid-cols-4" key={i}>
 {(['title','institution','year'] as const).map(key=><input key={key} className={field} aria-label={`${key} ${i+1}`} type={key==='year'?'number':'text'} value={q[key]} onChange={e=>setQualifications(current=>current.map((item,n)=>n===i?{...item,[key]:key==='year'?Number(e.target.value):e.target.value}:item))}/>)}
 <button type="button" onClick={()=>setQualifications(qualifications.filter((_,n)=>n!==i))}>Remove qualification</button></div>)}<button type="button" disabled={qualifications.length>=20} onClick={()=>setQualifications([...qualifications,{title:'',institution:'',year:new Date().getFullYear()}])}>Add qualification</button></fieldset>
 <TeacherScopeEditor value={scopes} onChange={setScopes}/>
 <label className="block">Application reason<textarea className={field} maxLength={1000} value={reason} onChange={e=>setReason(e.target.value)}/></label>
 {teacherResumeEnabled&&snapshot&&!locked&&<label className="block">Upload private PDF/DOCX resume (5 MiB maximum)<input disabled={busy||dirty} type="file" accept=".pdf,.docx" onChange={e=>{const file=e.target.files?.[0];if(file)void act(()=>uploadTeacherResume(file,snapshot.revision),'Verified resume attached.');e.target.value='';}}/></label>}
 {dirty&&<p className="text-xs text-amber-800">Save your profile edits before uploading a resume.</p>}
 <p className="text-xs text-amber-800">Private PDF/DOCX resume upload requires separately approved storage and server verification. {teacherResumeEnabled?'Uploads are verified by the private service before attachment.':'Files cannot be uploaded yet.'}</p>
 <div className="flex gap-4"><button type="button" disabled={busy} onClick={()=>void act(()=>saveTeacherApplication({displayName:name,contactEmail:email,phone,experienceYears:years===''?null:Number(years)},qualifications,scopes,reason,false,snapshot?.revision??null),'Profile draft saved.')}>Save profile draft</button><button disabled={busy} type="submit">Submit v2 application</button></div></fieldset></form>}
 </>}{error&&<p role="alert">{error}</p>}{notice&&<p role="status">{notice}</p>}</section>;
}
