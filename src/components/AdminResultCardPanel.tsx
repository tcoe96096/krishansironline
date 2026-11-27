import React,{useEffect,useRef,useState} from 'react';
import {useAuth} from '../context/AuthContext';
import {getAdminResultCardStatus,transitionResultCard,uploadAndApproveResultCardPdf,isResultCardBackendEnabled,type AdminResultCardStatus} from '../services/resultCardBackend';

type Target={attemptId:string;studentName:string;rollNo:string;classLevel:string;testTitle:string;submitted:boolean};
function ApprovalWorkspace({target,ownerId,onClose}:{target:Target;ownerId:string;onClose:()=>void}){
  const {user}=useAuth();
  const identity=useRef(user?.id);identity.current=user?.id;
  const active=useRef(false);
  const lock=useRef(false);
  const [current,setCurrent]=useState<AdminResultCardStatus|null>(null);
  const [loaded,setLoaded]=useState(false);
  const [busy,setBusy]=useState(false);
  const [file,setFile]=useState<File|null>(null);
  const [checked,setChecked]=useState(false);
  const [message,setMessage]=useState('');
  const uploadRetry=useRef<{version:number;file:File;key:string}|null>(null);
  const transitionRetry=useRef<{version:number;operation:'release'|'revoke';key:string}|null>(null);
  const valid=()=>active.current&&identity.current===ownerId;
  async function reconcile(){
    const next=await getAdminResultCardStatus(target.attemptId);
    if(!valid())return;
    setCurrent(next);setLoaded(true);
  }
  async function refresh(){
    if(lock.current||!valid())return;
    lock.current=true;setBusy(true);setLoaded(false);setMessage('');
    try{await reconcile();}
    catch{if(valid()){setCurrent(null);setMessage('Permission or server status unavailable. No action allowed.');}}
    finally{lock.current=false;if(valid())setBusy(false);}
  }
  useEffect(()=>{active.current=true;void refresh();return()=>{active.current=false;};},[]);
  const nextVersion=current?.state==='revoked'?current.version+1:1;
  const canUpload=loaded&&(!current||current.state==='revoked');
  async function approve(){
    if(!valid()||lock.current||!canUpload||!file||!checked)return;
    if(!window.confirm('Confirm this PDF belongs to the displayed student and test. Approval will not release the PDF.'))return;
    const selected=file,version=nextVersion;
    if(!uploadRetry.current||uploadRetry.current.file!==selected||uploadRetry.current.version!==version)uploadRetry.current={file:selected,version,key:crypto.randomUUID()};
    lock.current=true;setBusy(true);setLoaded(false);setMessage('');
    try{
      await uploadAndApproveResultCardPdf(target.attemptId,version,selected,uploadRetry.current.key);
      if(!valid())return;
      await reconcile();
      if(valid()){setFile(null);setChecked(false);uploadRetry.current=null;setMessage('Server status refreshed after approval. Release is a separate action.');}
    }catch{if(valid())setMessage('Approval not confirmed. Refresh before retrying; do not upload a different PDF.');}
    finally{lock.current=false;if(valid())setBusy(false);}
  }
  async function transition(operation:'release'|'revoke'){
    if(!valid()||lock.current||!loaded||!current||current.state!==(operation==='release'?'approved':'released'))return;
    if(!window.confirm(operation==='release'?'Release this approved version to the displayed student?':'Revoke access to this version? Previously downloaded copies cannot be recalled.'))return;
    const version=current.version;
    if(!transitionRetry.current||transitionRetry.current.version!==version||transitionRetry.current.operation!==operation)transitionRetry.current={version,operation,key:crypto.randomUUID()};
    lock.current=true;setBusy(true);setLoaded(false);setMessage('');
    try{
      await transitionResultCard(target.attemptId,version,operation,transitionRetry.current.key);
      if(!valid())return;
      await reconcile();
      if(valid()){transitionRetry.current=null;setMessage('Server status refreshed after requested transition.');}
    }catch{if(valid())setMessage('Action not confirmed. Refresh current status before retrying.');}
    finally{lock.current=false;if(valid())setBusy(false);}
  }
  return <section className="space-y-3 rounded-2xl border border-sky-200 bg-white p-4">
    <div className="flex flex-wrap justify-between gap-2"><h3 className="font-bold">Private Report Card — Approval and Publication</h3><button type="button" onClick={onClose} disabled={busy} className="text-xs underline">Close</button></div>
    <dl className="grid gap-2 rounded-xl bg-slate-50 p-3 text-sm sm:grid-cols-2"><div><dt>Student</dt><dd className="font-semibold">{target.studentName}</dd></div><div><dt>Roll / Class</dt><dd>{target.rollNo} / {target.classLevel}</dd></div><div><dt>Test</dt><dd>{target.testTitle}</dd></div><div className="break-all"><dt>Attempt</dt><dd>{target.attemptId}</dd></div></dl>
    <p className="text-sm">Status: {loaded?(current?current.state+' · v'+current.version:'No approved PDF'):'Not verified'}</p>
    {canUpload&&<div className="space-y-3"><label className="block text-xs font-semibold">Version {nextVersion} · PDF (max 10 MB)<input type="file" accept="application/pdf" disabled={busy} className="mt-2 block max-w-full text-xs" onChange={e=>{setFile(e.target.files?.[0]??null);setChecked(false);uploadRetry.current=null;}}/></label><label className="flex items-start gap-2 text-xs"><input type="checkbox" disabled={busy||!file} checked={checked} onChange={e=>setChecked(e.target.checked)}/>I have checked the complete PDF against this student's identity, test and marks.</label><button type="button" disabled={busy||!file||!checked} onClick={()=>void approve()} className="rounded-lg bg-sky-900 px-3 py-2 text-xs font-bold text-white disabled:opacity-40">Upload and Approve</button></div>}
    {loaded&&current?.state==='approved'&&<button type="button" disabled={busy} onClick={()=>void transition('release')} className="rounded-lg bg-emerald-700 px-3 py-2 text-xs font-bold text-white disabled:opacity-40">Release to student</button>}
    {loaded&&current?.state==='released'&&<button type="button" disabled={busy} onClick={()=>void transition('revoke')} className="rounded-lg border border-rose-300 px-3 py-2 text-xs font-bold text-rose-800 disabled:opacity-40">Revoke</button>}
    {message&&<p role="status" className="text-xs text-slate-700">{message}</p>}
    <button type="button" disabled={busy} onClick={()=>void refresh()} className="block text-xs font-semibold underline disabled:opacity-40">{busy?'Checking…':'Refresh server status'}</button>
  </section>;
}
export function AdminResultCardPanel({target,onClose}:{target:Target;onClose:()=>void}){
  const {user}=useAuth();
  if(!isResultCardBackendEnabled()||!user?.id||!target.submitted||!target.studentName.trim()||!target.rollNo.trim())return null;
  return <ApprovalWorkspace key={user.id+':'+target.attemptId} target={target} ownerId={user.id} onClose={onClose}/>;
}
