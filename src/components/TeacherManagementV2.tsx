import {teacherBetaEnabled,teacherAdvancedEnabled} from '../lib/teacherBetaFlags';
import React,{useEffect,useState,useRef} from 'react';
import {useAuth} from '../context/AuthContext';
import {teacherCall,saveTeacherApplication,type TeacherSnapshot} from '../services/teacherManagement';
import {TEACHER_CLASSES,TEACHER_SUBJECTS,TEACHER_WORK_TYPES,type TeacherAssignmentInput,type TeacherQualificationInput} from '../lib/teacherManagementValidation';

const field='w-full rounded-xl border border-slate-300 bg-white px-3 py-3 text-sm shadow-sm outline-none focus:border-sky-600 focus:ring-2 focus:ring-sky-100';
export function TeacherScopeEditor({value,onChange,allowAnalytics=false}:{value:TeacherAssignmentInput[];onChange:(v:TeacherAssignmentInput[])=>void;allowAnalytics?:boolean}){
 const [level,setLevel]=useState('10'),[subject,setSubject]=useState('History'),[work,setWork]=useState('materials.draft');
 // The analytics selection is independently controlled by both the frontend and
 // the server-owned capability; enabling analytics never grants assessment editing.
 const permittedWorkTypes=TEACHER_WORK_TYPES.filter(type=>type==='materials.draft'||(type==='result.review'?allowAnalytics:teacherAdvancedEnabled));
 return <fieldset className="space-y-2"><legend>{permittedWorkTypes.length>1?'Classes, subjects and work':'Classes and subjects'}</legend><div className="grid gap-2 sm:grid-cols-3">
 <select aria-label="Assignment class" className={field} value={level} onChange={e=>setLevel(e.target.value)}>{TEACHER_CLASSES.map(x=><option key={x}>{x}</option>)}</select>
 <select aria-label="Assignment subject" className={field} value={subject} onChange={e=>setSubject(e.target.value)}>{TEACHER_SUBJECTS.map(x=><option key={x}>{x}</option>)}</select>
 {permittedWorkTypes.length>1&&<select aria-label="Assignment work" className={field} value={permittedWorkTypes.includes(work as typeof permittedWorkTypes[number])?work:'materials.draft'} onChange={e=>setWork(e.target.value)}>{permittedWorkTypes.map(x=><option key={x}>{x}</option>)}</select>}</div>
 <button type="button" disabled={value.length>=60} onClick={()=>{const selectedWork=permittedWorkTypes.includes(work as typeof permittedWorkTypes[number])?work:'materials.draft';if(!value.some(x=>x.classLevel===level&&x.subject===subject&&x.workType===selectedWork))onChange([...value,{classLevel:level,subject,workType:selectedWork}]);}}>Add scope</button>
 {value.map((x,i)=><p key={i}>Class {x.classLevel} · {x.subject}{permittedWorkTypes.length>1?' · '+x.workType:''} <button type="button" aria-label={`Remove scope ${i+1}`} onClick={()=>onChange(value.filter((_,n)=>n!==i))}>Remove</button></p>)}
 <p className="text-xs text-slate-600">Requests require Super Admin approval. Basic Beta assignments do not enable advanced tools or marks editing.</p></fieldset>;
}

export function TeacherManagementV2({onProfileChanged}:{onProfileChanged?:()=>void}={}){
 const inFlight=useRef(false);
 const {user}=useAuth();const [snapshot,setSnapshot]=useState<TeacherSnapshot|null>(null),[ready,setReady]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState(''),[busy,setBusy]=useState(false),[reload,setReload]=useState(0);
 const [registrationOpen,setRegistrationOpen]=useState(false);
 const [name,setName]=useState(''),[email,setEmail]=useState(''),[phone,setPhone]=useState(''),[years,setYears]=useState(''),[reason,setReason]=useState('');
 const [qualifications,setQualifications]=useState<TeacherQualificationInput[]>([]),[scopes,setScopes]=useState<TeacherAssignmentInput[]>([]);
 useEffect(()=>{let current=true;setSnapshot(null);setRegistrationOpen(false);setReady(false);setError('');setName('');setEmail('');setPhone('');setYears('');setReason('');setQualifications([]);setScopes([]);
 if(user&&teacherBetaEnabled)void teacherCall<{registration:boolean;resumes?:boolean;analytics?:boolean}>('teacher_v2_beta_capabilities').then(caps=>{if(current){setRegistrationOpen(caps?.registration===true);}return teacherCall<TeacherSnapshot|null>('teacher_v2_snapshot',{p_user_id:user.id});}).then(p=>{if(!current)return;if(p!==null&&(!p||typeof p!=='object'||!Array.isArray(p.qualifications)||!Array.isArray(p.requested_scopes)||!Array.isArray(p.assignments))){setError('Teacher profile returned an invalid response.');setReady(false);return;}setSnapshot(p);setReady(true);if(p){setName(p.display_name);setEmail(p.contact_email||'');setPhone(p.phone||'');setYears(p.experience_years===null?'':String(p.experience_years));setReason(p.application_reason||'');setQualifications(p.qualifications);setScopes(p.requested_scopes);}}).catch(()=>{if(current)setReady(false);});return()=>{current=false;};},[user?.id,reload]);
 if(!user)return null;
 if(!teacherBetaEnabled)return <section aria-label="Teacher Management v2" className="rounded-2xl border bg-white p-5"><h2 className="font-bold">Teacher Management v2</h2><p>Basic Teacher Beta awaits owner-approved activation.</p></section>;
 const act=async(action:()=>Promise<unknown>,message:string,refresh=true)=>{if(inFlight.current)return;inFlight.current=true;setBusy(true);setError('');setNotice('');try{await action();if(refresh){setReload(n=>n+1);onProfileChanged?.();}setNotice(message);}catch(e){setError(e instanceof Error?e.message:'Operation failed.');}finally{inFlight.current=false;setBusy(false);}};
 const dirty=!!snapshot&&(name!==snapshot.display_name||email!==(snapshot.contact_email||'')||phone!==(snapshot.phone||'')||years!==(snapshot.experience_years===null?'':String(snapshot.experience_years))||reason!==(snapshot.application_reason||'')||JSON.stringify(qualifications)!==JSON.stringify(snapshot.qualifications)||JSON.stringify(scopes)!==JSON.stringify(snapshot.requested_scopes));
 const locked=!!snapshot&&(snapshot.status==='approved'||snapshot.status==='suspended'||!!snapshot.submitted_at);
 return <section aria-label="Teacher Management v2" className="space-y-5 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7"><div className="border-b border-slate-100 pb-4"><p className="text-xs font-semibold uppercase tracking-widest text-teal-700">Teacher enrollment</p><h2 className="mt-1 text-2xl font-bold text-slate-900">My Teacher Registration</h2><p className="mt-1 text-sm text-slate-600">Complete your profile, add qualifications and request teaching scopes. Approval is managed by Super Admin.</p></div>{ready&&<button disabled={busy} onClick={()=>{if(!dirty||window.confirm('Discard unsaved profile edits and reload the saved profile?')){setNotice('');setReload(n=>n+1);}}}>Refresh teacher profile</button>}
 {!ready?<p role="status">Basic Teacher Beta registration is awaiting owner-approved backend activation. No v2 application has been sent.</p>:<>
 {snapshot&&<div className="space-y-2"><p>Status: <strong>{snapshot.status}{snapshot.submitted_at?' · Awaiting review':''}</strong></p><p>Employee ID: <strong>{snapshot.employee_id||'Not issued'}</strong></p><p>{snapshot.status==='approved'?'Verified personal details':snapshot.status==='suspended'?'Previously verified details — access suspended':'Personal details awaiting verification'}: {snapshot.display_name} · {snapshot.contact_email} · {snapshot.phone}</p><p>Experience: {snapshot.experience_years??'Not provided'}</p>
 {snapshot.decision_reason&&<p>Last review note: {snapshot.decision_reason}</p>}
 {snapshot.qualifications.map((q,i)=><p key={i}>{q.title} · {q.institution} · {q.year}</p>)}
 {snapshot.requested_scopes.map((scope,i)=><p key={`requested-${i}`}>Requested: Class {scope.classLevel} · {scope.subject}</p>)}
 {snapshot.assignments.map(a=><p key={a.id}>Class {a.class_level} · {a.subject}{teacherAdvancedEnabled?' · '+a.work_type:''} · {a.status}</p>)}
 {snapshot.status==='pending'&&snapshot.submitted_at&&registrationOpen&&<button disabled={busy} onClick={()=>void act(()=>teacherCall('teacher_v2_withdraw'),'Application withdrawn.')}>Withdraw to edit</button>}</div>}
 {!registrationOpen&&<p role="status">New teacher registration is currently closed. Saved profile details remain read-only.</p>}
 {!locked&&registrationOpen&&<form className="space-y-3" onSubmit={e=>{e.preventDefault();void act(()=>saveTeacherApplication({displayName:name,contactEmail:email,phone,experienceYears:years===''?null:Number(years)},qualifications,scopes,reason,true,snapshot?.revision??null),'Application submitted for independent verification.');}}><fieldset disabled={busy} className="space-y-5">
 {!snapshot&&<p className="text-xs text-amber-800">Existing staff: have Super Admin verify your assignments and close legacy staff access before entering v2. Applicants cannot change their own permissions.</p>}
 <label className="block">Full name<input className={field} required maxLength={160} value={name} onChange={e=>setName(e.target.value)}/></label>
 <label className="block">Contact email<input className={field} type="email" value={email} onChange={e=>setEmail(e.target.value)}/></label>
 <label className="block">Phone<input className={field} maxLength={20} value={phone} onChange={e=>setPhone(e.target.value)}/></label>
 <label className="block">Experience (years)<input className={field} type="number" min={0} max={70} value={years} onChange={e=>setYears(e.target.value)}/></label>
 <fieldset className="rounded-2xl border border-slate-200 bg-slate-50 p-4"><legend className="px-2 font-semibold text-slate-900">Qualifications</legend>{qualifications.map((q,i)=><div className="my-2 grid gap-2 sm:grid-cols-4" key={i}>
 {(['title','institution','year'] as const).map(key=><input key={key} className={field} aria-label={`${key} ${i+1}`} type={key==='year'?'number':'text'} value={q[key]} onChange={e=>setQualifications(current=>current.map((item,n)=>n===i?{...item,[key]:key==='year'?Number(e.target.value):e.target.value}:item))}/>)}
 <button type="button" onClick={()=>setQualifications(qualifications.filter((_,n)=>n!==i))}>Remove qualification</button></div>)}<button type="button" disabled={qualifications.length>=20} onClick={()=>setQualifications([...qualifications,{title:'',institution:'',year:new Date().getFullYear()}])}>Add qualification</button></fieldset>
 <TeacherScopeEditor value={scopes} onChange={setScopes} allowAnalytics={false}/>
 <label className="block">Application reason<textarea className={field} maxLength={1000} value={reason} onChange={e=>setReason(e.target.value)}/></label>
 <div className="flex flex-wrap gap-3 border-t border-slate-100 pt-4"><button className="rounded-xl border border-sky-800 px-4 py-3 font-semibold text-sky-900 disabled:opacity-50" type="button" disabled={busy} onClick={()=>void act(()=>saveTeacherApplication({displayName:name,contactEmail:email,phone,experienceYears:years===''?null:Number(years)},qualifications,scopes,reason,false,snapshot?.revision??null),'Profile draft saved.')}>Save profile draft</button><button className="rounded-xl bg-sky-900 px-4 py-3 font-semibold text-white disabled:opacity-50" disabled={busy} type="submit">Submit for Admin Review</button></div></fieldset></form>}
 </>}{error&&<p role="alert">{error}</p>}{notice&&<p role="status">{notice}</p>}</section>;
}
