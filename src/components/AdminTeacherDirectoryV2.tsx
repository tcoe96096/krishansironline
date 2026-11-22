import {teacherBetaEnabled,teacherAdvancedEnabled,teacherPhotoUiEnabled} from '../lib/teacherBetaFlags';
import {TeacherReviewPrivatePhoto} from './TeacherReviewPrivatePhoto';
import React,{useEffect,useRef,useState} from 'react';
import {useAuth} from '../context/AuthContext';
import {teacherCall,type TeacherSnapshot} from '../services/teacherManagement';
import {TeacherScopeEditor} from './TeacherManagementV2';
import {type TeacherAssignmentInput} from '../lib/teacherManagementValidation';
import {isTeacherSnapshot} from '../lib/teacherSnapshotValidation';

export function AdminTeacherDirectoryV2({demoMode=false}:{demoMode?:boolean}){
 const {user}=useAuth();
 const selectedRef=useRef<string|null>(null);
 const decisionInFlight=useRef(false);
 const [rows,setRows]=useState<TeacherSnapshot[]>([]),[ready,setReady]=useState(false),[error,setError]=useState(''),[busy,setBusy]=useState(false),[page,setPage]=useState(0),[search,setSearch]=useState(''),[query,setQuery]=useState(''),[reload,setReload]=useState(0);
 const [selected,setSelected]=useState<string|null>(null),[reason,setReason]=useState(''),[verificationRef,setVerificationRef]=useState(''),[verifiedRevision,setVerifiedRevision]=useState<number|null>(null),[scopes,setScopes]=useState<TeacherAssignmentInput[]>([]),[audit,setAudit]=useState<{id:string;action:string;reason:string;created_at:string}[]>([]);
 useEffect(()=>{let current=true;setReady(false);setRows([]);setSelected(null);selectedRef.current=null;setReason('');setVerificationRef('');setVerifiedRevision(null);setScopes([]);setAudit([]);setError('');
 if(teacherBetaEnabled&&!demoMode&&user)void(async()=>{try{if(await teacherCall<boolean>('is_super_admin')!==true){if(current)setError('Super Admin authorization required.');return;}const data=await teacherCall<TeacherSnapshot[]>('teacher_v2_directory',{p_offset:page*25,p_search:query});if(current){if(!Array.isArray(data)||!data.every(isTeacherSnapshot)){setError('Teacher directory returned an invalid response.');return;}setRows(data);setReady(true);}}catch{if(current)setError('Teacher v2 directory awaits approved activation or access was denied.');}})();return()=>{current=false;};},[user?.id,demoMode,page,query,reload]);
 const act=async(fn:()=>Promise<unknown>)=>{if(decisionInFlight.current||reason.trim().length<12||reason.trim().length>1000)return;if(!window.confirm('Apply this audited teacher access decision?'))return;decisionInFlight.current=true;setBusy(true);setError('');try{await fn();setReload(n=>n+1);}catch(e){setError(e instanceof Error?e.message:'Decision failed.');}finally{decisionInFlight.current=false;setBusy(false);}};
 const recordVerification=async(teacherId:string,profileRevision:number)=>{
  const reference=verificationRef.trim(),note=reason.trim();
  if(decisionInFlight.current||selectedRef.current!==teacherId||verifiedRevision!==null
    ||reference.length<12||reference.length>240||note.length<12||note.length>1000)return;
  if(!window.confirm('Confirm you inspected independent evidence for this exact teacher application revision. Do not enter identity numbers.'))return;
  decisionInFlight.current=true;setBusy(true);setError('');
  try{
    const recordId=await teacherCall<unknown>('teacher_v2_record_identity_verification',{
      p_teacher_user_id:teacherId,p_profile_revision:profileRevision,
      p_evidence_reference:reference,p_reason:note
    });
    if(typeof recordId!=='string'||!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(recordId))
      throw new Error('Server verification record was not confirmed.');
    if(selectedRef.current===teacherId)setVerifiedRevision(profileRevision);
  }catch(e){if(selectedRef.current===teacherId)setError(e instanceof Error?e.message:'Verification denied.');}
  finally{decisionInFlight.current=false;setBusy(false);}
 };
 if(!teacherBetaEnabled||!user||demoMode)return null;
 return <section className="my-4 space-y-5 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7" aria-label="Teacher Directory v2"><header className="border-b border-slate-100 pb-4"><p className="text-xs font-semibold uppercase tracking-widest text-teal-700">Super Admin workspace</p><h2 className="mt-1 text-2xl font-bold text-slate-900">Teacher Applications & Directory</h2><p className="mt-1 text-sm text-slate-600">Review applications, verify identities, and assign approved teaching scopes.</p></header>
 {!ready?<p>{error||'Checking server authorization…'}</p>:<><form className="flex flex-wrap items-end gap-3" onSubmit={e=>{e.preventDefault();setQuery(search.trim());setPage(0);setReload(count=>count+1);}}><label className="min-w-48 flex-1 text-sm font-medium">Search name or Employee ID<input maxLength={160} value={search} onChange={e=>setSearch(e.target.value)} className="mt-1 block w-full rounded-xl border border-slate-300 p-3"/></label><button className="rounded-xl bg-sky-900 px-4 py-3 font-semibold text-white">Search</button><button type="button" className="rounded-xl border px-4 py-3" disabled={busy} onClick={()=>setReload(n=>n+1)}>Refresh</button></form><p className="text-sm text-slate-600" role="status">Showing {rows.length} teacher records on page {page+1}.</p>
 {rows.map(p=><article key={p.user_id} className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50 p-4"><h3 className="text-lg font-bold text-slate-900">{p.display_name} <span className="ml-2 inline-block rounded-full bg-sky-100 px-3 py-1 text-xs font-semibold uppercase text-sky-900">{p.status}</span></h3><p>{p.employee_id||'Employee ID not issued'} · {p.contact_email} · {p.phone}</p><p className="break-all text-xs">Account ID: {p.user_id} · Revision {p.revision}</p><p>{p.application_reason}</p>{p.decision_reason&&<p>Last review note: {p.decision_reason}</p>}
 {p.requested_scopes.map((scope,i)=><p key={`requested-${i}`}>Requested: Class {scope.classLevel} · {scope.subject} · {scope.workType}</p>)}
 {p.qualifications.map((q,i)=><p key={i}>{q.title} · {q.institution} · {q.year}</p>)}
 <section aria-label={`Resume records for ${p.display_name}`} className="rounded-xl border border-slate-200 bg-white p-3">
  <h4 className="text-sm font-semibold text-slate-800">Submitted Resume Records</h4>
  {p.resumes.length===0?<p className="mt-1 text-sm text-slate-500">No resume on record.</p>:
   <ul className="mt-2 space-y-1">{p.resumes.map(doc=><li key={doc.id} className="break-all text-sm text-slate-700">{doc.original_filename} · <span className="text-xs text-slate-500">Verification: {doc.verification_status}</span></li>)}</ul>}
  <p className="mt-2 text-xs text-slate-500">Metadata only. Private files are not opened or downloaded by the directory.</p>
 </section>
 <button className="rounded-xl bg-sky-900 px-4 py-2 font-semibold text-white" onClick={()=>{setSelected(p.user_id);selectedRef.current=p.user_id;setReason('');setVerificationRef('');setVerifiedRevision(null);setScopes([]); /* Never pre-authorize applicant-requested scopes; reviewer selects each grant. */setAudit([]);
 if(p.status==='pending'&&p.submitted_at)void teacherCall<unknown>('teacher_v2_verification_status',{
   p_teacher_user_id:p.user_id,p_profile_revision:p.revision
 }).then(recorded=>{if(selectedRef.current===p.user_id&&recorded===true)setVerifiedRevision(p.revision);})
 .catch(()=>{if(selectedRef.current===p.user_id)setError('Verification status unavailable. Confirm backend activation before reviewing.');});}}>Review profile and access</button>
 {selected===p.user_id&&<div className="space-y-3">{teacherPhotoUiEnabled&&<TeacherReviewPrivatePhoto teacherUserId={p.user_id}/>}<label className="block">Decision reason (shown to teacher)<textarea maxLength={1000} className="block w-full rounded border p-2" value={reason} onChange={e=>setReason(e.target.value)}/></label>
 {p.status==='pending'&&p.submitted_at&&<>
 <div className="space-y-2 rounded-xl border border-slate-200 bg-white p-3">
  <label className="block text-sm font-medium">Opaque verification case reference (no ID numbers)
   <input className="mt-1 block w-full rounded border p-2" autoComplete="off" maxLength={240} disabled={busy||verifiedRevision===p.revision} value={verificationRef} onChange={e=>setVerificationRef(e.target.value)} placeholder="Internal case reference, not identity data"/>
  </label>
  <button type="button" disabled={busy||verifiedRevision===p.revision||verificationRef.trim().length<12||reason.trim().length<12} onClick={()=>void recordVerification(p.user_id,p.revision)}>Record independent verification</button>
  {verifiedRevision===p.revision?<p role="status" className="text-sm text-emerald-800">Server verification recorded for revision {p.revision}. Approval is a separate decision.</p>:
  <p className="text-xs text-slate-600">Inspect evidence independently first. A checked box is not proof; the server must record a revision-bound verification before approval.</p>}
 </div>
 <TeacherScopeEditor value={scopes} onChange={setScopes} allowAnalytics={false}/>
 <p role="status" className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">No class or subject is approved by default. Compare the requested scopes shown above, then explicitly add each verified class, subject and work permission. Identity verification and at least one confirmed assignment are required before approval.</p>
 <button disabled={busy||verifiedRevision!==p.revision||scopes.length===0||reason.trim().length<12} onClick={()=>void act(()=>teacherCall('teacher_v2_review',{p_user_id:p.user_id,p_revision:p.revision,p_decision:'approve',p_reason:reason,p_verified:false,p_assignments:scopes}))}>Approve verified teacher</button>
 <button disabled={busy||reason.trim().length<12} onClick={()=>void act(()=>teacherCall('teacher_v2_review',{p_user_id:p.user_id,p_revision:p.revision,p_decision:'reject',p_reason:reason,p_verified:false,p_assignments:[]}))}>Reject application</button></>}
 {p.status==='approved'&&<><TeacherScopeEditor value={scopes} onChange={setScopes} allowAnalytics={false}/>{scopes.map((s,i)=><button key={i} disabled={busy||reason.trim().length<12} onClick={()=>void act(()=>teacherCall('teacher_v2_set_assignment',{p_teacher_user_id:p.user_id,p_class_level:s.classLevel,p_subject:s.subject,p_work_type:s.workType,p_action:'grant',p_reason:reason}))}>Assign class {s.classLevel} · {s.subject}{teacherAdvancedEnabled?' · '+s.workType:''}</button>)}<button disabled={busy||reason.trim().length<12} onClick={()=>void act(()=>teacherCall('teacher_v2_suspend',{p_user_id:p.user_id,p_reason:reason}))}>Suspend teacher and revoke access</button></>}
 {p.status==='suspended'&&<button disabled={busy||reason.trim().length<12} onClick={()=>void act(()=>teacherCall('teacher_v2_restore',{p_user_id:p.user_id,p_reason:reason}))}>Restore teacher status without assignments</button>}
 {p.assignments.map(a=><p key={a.id}>{a.class_level} · {a.subject}{teacherAdvancedEnabled?' · '+a.work_type:''} · {a.status} {a.status==='active'&&<button disabled={busy||reason.trim().length<12} onClick={()=>void act(()=>teacherCall('teacher_v2_set_assignment',{p_teacher_user_id:p.user_id,p_class_level:a.class_level,p_subject:a.subject,p_work_type:a.work_type,p_action:'revoke',p_reason:reason}))}>Revoke assignment</button>}</p>)}
 <button onClick={()=>void teacherCall<typeof audit>('teacher_v2_audit',{p_user_id:p.user_id}).then(data=>{if(selectedRef.current===p.user_id&&Array.isArray(data)&&data.every(a=>a&&typeof a.id==='string'&&typeof a.action==='string'&&typeof a.reason==='string'&&typeof a.created_at==='string'))setAudit(data);else if(selectedRef.current===p.user_id)setError('Audit history returned an invalid response.');}).catch(()=>{if(selectedRef.current===p.user_id)setError('Audit access denied.');})}>Load audit history</button>{audit.map(a=><p key={a.id}>{a.created_at} · {a.action} · {a.reason}</p>)}</div>}</article>)}
 {!rows.length&&<p>No matching teachers.</p>}<button disabled={busy||page===0} onClick={()=>setPage(page-1)}>Previous page</button><button disabled={busy||rows.length<25} onClick={()=>setPage(page+1)}>Next page</button></>}
 {ready&&error&&<p role="alert">{error}</p>}</section>;
}
