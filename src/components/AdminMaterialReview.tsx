import React, { useEffect, useState } from 'react';
import { CheckCircle2, ClipboardCheck, LockKeyhole, RefreshCw, ShieldCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { requireSupabase } from '../lib/supabase';

type ReviewItem = {
  id:string; title:string; class_level:string; subject:string; kind:string;
  status:'draft'|'pending_review'|'published'|'archived'; created_by:string;
  review_note:string; linked_test_id:string|null; updated_at:string;
};
type AuditRow = { id:number; item_id:string; actor_id:string; operation:string; logged_at:string };

export const AdminMaterialReview: React.FC<{demoMode?:boolean}> = ({demoMode=false}) => {
  const {user,isAdmin}=useAuth();
  const [superAdmin,setSuperAdmin]=useState(false);
  const [ready,setReady]=useState(false);
  const [loading,setLoading]=useState(true);
  const [busy,setBusy]=useState(false);
  const [records,setRecords]=useState<ReviewItem[]>([]);
  const [audit,setAudit]=useState<AuditRow[]>([]);
  const [reason,setReason]=useState('');
  const [error,setError]=useState('');
  const [notice,setNotice]=useState('');
  const [reload,setReload]=useState(0);

  useEffect(()=>{
    let active=true;
    if(demoMode||!user||!isAdmin){setLoading(false);setReady(false);setSuperAdmin(false);return;}
    setLoading(true);setError('');setReady(false);setSuperAdmin(false);
    void (async()=>{
      try{
        const client=requireSupabase();
        const verified=await client.rpc('is_super_admin');
        if(verified.error||verified.data!==true)throw new Error('Super Admin verification required.');
        if(!active)return;
        setSuperAdmin(true);
        const [materialsResult,auditResult]=await Promise.all([
          client.from('study_material_items').select('id,title,class_level,subject,kind,status,created_by,review_note,linked_test_id,updated_at').order('updated_at',{ascending:false}).limit(200),
          client.from('study_material_change_audit').select('id,item_id,actor_id,operation,logged_at').order('logged_at',{ascending:false}).limit(20)
        ]);
        if(!active)return;
        if(materialsResult.error)throw materialsResult.error;
        if(auditResult.error)throw auditResult.error;
        setRecords((materialsResult.data||[]) as ReviewItem[]);
        setAudit((auditResult.data||[]) as AuditRow[]);
        setReady(true);
      }catch(cause){if(active)setError(cause instanceof Error?cause.message:'Material backend not available.');}
      finally{if(active)setLoading(false);}
    })();
    return()=>{active=false;};
  },[demoMode,isAdmin,user?.id,reload]);

  const changeStatus=async(item:ReviewItem,next:'draft'|'published'|'archived')=>{
    if(!superAdmin||!ready||!user||busy)return;
    const note=reason.trim();
    if(note.length<12){setError('Please enter an approval or return reason (12+ characters).');return;}
    setBusy(true);setError('');setNotice('');
    try{
      const client=requireSupabase();
      const verified=await client.rpc('is_super_admin');
      if(verified.error||verified.data!==true)throw new Error('Server denied Super Admin authority.');
      const change=await client.from('study_material_items')
        .update({status:next,review_note:note}).eq('id',item.id).eq('status',item.status).select('id');
      if(change.error)throw change.error;
      if(!change.data?.length)throw new Error('Item was changed by another admin or update was not authorized.');
      setReason('');
      setNotice('Updated with server audit: '+next+'.');
      setReload(n=>n+1);
    }catch(cause){setError(cause instanceof Error?cause.message:'Action failed.');}
    finally{setBusy(false);}
  };

  return <section className="space-y-4 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div><h3 className="flex items-center gap-2 text-lg font-extrabold text-slate-900"><ShieldCheck size={21} className="text-sky-800"/>Super Admin Content Approval</h3>
        <p className="mt-1 text-xs text-slate-600">Publish/return/archive actions require a server-verified Super Admin and are audit logged. No action is available in Demo.</p></div>
      <button disabled={loading||demoMode} onClick={()=>setReload(n=>n+1)} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold disabled:opacity-40"><RefreshCw size={15}/>Reload approvals</button>
    </div>
    {loading?<p className="text-sm text-slate-500">Verifying publishing permissions…</p>
    :!ready?<div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs text-amber-900"><LockKeyhole className="mb-2 h-5 w-5"/>Content approval is not active: {demoMode?'Preview demo protects real staff and content records.':superAdmin?'Approved material schema is not installed or cannot be verified.':'Only Super Admin can approve study materials.'}</div>
    :<>
      <label className="block text-xs font-bold text-slate-700">Mandatory approval / return reason
        <textarea value={reason} onChange={event=>setReason(event.target.value)} minLength={12} maxLength={1000} rows={2} placeholder="Describe the decision (minimum 12 characters)" className="mt-2 block w-full rounded-xl border border-slate-200 p-3 text-sm"/></label>
      {error&&<p role="alert" className="rounded-lg bg-rose-50 p-3 text-xs text-rose-900">{error}</p>}
      {notice&&<p role="status" className="rounded-lg bg-emerald-50 p-3 text-xs text-emerald-900">{notice}</p>}
      <div className="grid gap-3 md:grid-cols-2">
        {records.map((item)=><article key={item.id} className="rounded-xl border border-slate-200 p-4">
          <p className="text-xs font-bold text-teal-800">Class {item.class_level} · {item.subject} · {item.kind}</p>
          <h4 className="mt-1 text-sm font-extrabold text-slate-900">{item.title}</h4>
          <p className="mt-1 text-xs text-slate-500">Status: {item.status} · Author ••••{item.created_by.slice(-6)}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {item.status!=='published'&&<button disabled={busy||reason.trim().length<12} onClick={()=>void changeStatus(item,'published')} className="inline-flex items-center gap-1 rounded-lg bg-sky-900 px-3 py-2 text-xs font-bold text-white disabled:opacity-40"><CheckCircle2 size={14}/>Publish</button>}
            {item.status==='pending_review'&&<button disabled={busy||reason.trim().length<12} onClick={()=>void changeStatus(item,'draft')} className="rounded-lg border border-amber-200 px-3 py-2 text-xs font-bold text-amber-900 disabled:opacity-40">Return to draft</button>}
            {item.status==='published'&&<button disabled={busy||reason.trim().length<12} onClick={()=>void changeStatus(item,'archived')} className="rounded-lg border border-rose-200 px-3 py-2 text-xs font-bold text-rose-900 disabled:opacity-40">Archive</button>}
          </div>
        </article>)}
        {!records.length&&<p className="text-sm text-slate-500">No material drafts or approval requests in the verified database.</p>}
      </div>
      <div className="rounded-xl bg-slate-50 p-4">
        <h4 className="flex items-center gap-2 text-sm font-bold text-slate-900"><ClipboardCheck size={17}/>Recent server audit events</h4>
        <p className="mt-1 text-xs text-slate-500">{audit.length} events visible to Super Admin.</p>
        {audit.slice(0,8).map(row=><p key={row.id} className="mt-2 text-[11px] text-slate-600">{row.operation} · {new Date(row.logged_at).toLocaleString('en-IN')} · Material ••••{row.item_id.slice(-6)}</p>)}
      </div>
    </>}
  </section>;
};
