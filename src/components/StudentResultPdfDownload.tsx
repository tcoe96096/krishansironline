import React,{useEffect,useRef,useState} from 'react';
import {useAuth} from '../context/AuthContext';
import {getMyReleasedResultCardVersion,getMyResultCardPdfDownload,isResultCardBackendEnabled} from '../services/resultCardBackend';

function AuthorizedDownload({attemptId,ownerId}:{attemptId:string;ownerId:string}){
  const {user}=useAuth();
  const active=useRef(false);
  const current=useRef(user?.id);current.current=user?.id;
  const lock=useRef(false);
  const [busy,setBusy]=useState(false);
  const [message,setMessage]=useState('');
  useEffect(()=>{active.current=true;return()=>{active.current=false;};},[]);
  async function download(){
    if(lock.current||current.current!==ownerId)return;
    lock.current=true;setBusy(true);setMessage('');
    try{
      const version=await getMyReleasedResultCardVersion(attemptId);
      if(!active.current||current.current!==ownerId)return;
      if(version===null){setMessage('Official PDF अभी जारी नहीं हुई है।');return;}
      const pdf=await getMyResultCardPdfDownload(attemptId,version);
      if(!active.current||current.current!==ownerId)return;
      const url=URL.createObjectURL(pdf);
      try{
        const anchor=document.createElement('a');anchor.href=url;anchor.download='KSOL-Report-Card-v'+version+'.pdf';anchor.click();
      }finally{setTimeout(()=>URL.revokeObjectURL(url),1000);}
      setMessage('PDF download requested.');
    }catch{if(active.current&&current.current===ownerId)setMessage('PDF उपलब्ध नहीं है या अनुमति समाप्त हो गई है। फिर से प्रयास करें।');}
    finally{lock.current=false;if(active.current&&current.current===ownerId)setBusy(false);}
  }
  return <div className="mt-3"><button type="button" disabled={busy} onClick={()=>void download()} className="rounded-lg border border-sky-200 bg-white px-3 py-2 text-xs font-semibold text-sky-900 disabled:opacity-50">{busy?'Checking…':'Download official Report Card (PDF)'}</button>{message&&<p role="status" className="mt-2 text-xs text-slate-600">{message}</p>}</div>;
}
export function StudentResultPdfDownload({attemptId,studentId,submitted}:{attemptId:string;studentId:string;submitted:boolean}){
  const {user}=useAuth();
  if(!isResultCardBackendEnabled()||!submitted||!user?.id||user.id!==studentId)return null;
  return <AuthorizedDownload key={user.id+':'+attemptId} ownerId={user.id} attemptId={attemptId}/>;
}
