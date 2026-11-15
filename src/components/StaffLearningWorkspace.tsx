import React, { useEffect, useState } from 'react';
import { FileText, LockKeyhole, RefreshCw, Save, ShieldCheck, UserRound, ExternalLink, Copy } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { requireSupabase } from '../lib/supabase';

type StaffGrant = { user_id:string; role:string; permissions:string[]; scope_class:string|null; is_active:boolean };
type Material = {
  id:string; title:string; description:string; subject:string; class_level:string;
  kind:string; resource_url:string|null; status:string; created_by:string; review_note:string;
};
const classes=['6','7','8','9','10','11','12'];
const subjects=['Political Science','History','Geography','Economics','Other'];
const emptyDraft = {title:'',description:'',subject:'History',class_level:'10',kind:'notes',resource_url:''};

export const StaffLearningWorkspace: React.FC = () => {
  const { user, loading:authLoading, signInWithGoogle } = useAuth();
  const [grant,setGrant] = useState<StaffGrant|null>(null);
  const [ready,setReady] = useState(false);
  const [loading,setLoading] = useState(true);
  const [busy,setBusy] = useState(false);
  const [message,setMessage] = useState('');
  const [error,setError] = useState('');
  const [accountNotice,setAccountNotice] = useState('');
  const [reload,setReload] = useState(0);
  const [items,setItems] = useState<Material[]>([]);
  const [draft,setDraft] = useState(emptyDraft);
  const [editing,setEditing] = useState<string|null>(null);

  useEffect(()=>{
    let mounted=true;
    if(!user){setLoading(false);setGrant(null);setItems([]);setReady(false);return;}
    setLoading(true);setError('');setMessage('');setReady(false);setItems([]);setGrant(null);
    void (async()=>{
      try{
        const client=requireSupabase();
        const roles=await client.from('result_staff_grants')
          .select('user_id,role,permissions,scope_class,is_active').eq('user_id',user.id).maybeSingle();
        if(roles.error) throw roles.error;
        if(!mounted)return;
        const assigned=(roles.data||null) as StaffGrant|null;
        if(!assigned||!assigned.is_active){setGrant(null);return;}
        setGrant(assigned);
        setDraft({...emptyDraft,class_level:assigned.scope_class||'10'});
        const materialRows=await client.from('study_material_items')
          .select('id,title,description,subject,class_level,kind,resource_url,status,created_by,review_note')
          .order('updated_at',{ascending:false}).limit(150);
        if(!mounted)return;
        if(materialRows.error) throw materialRows.error;
        setReady(true);
        setItems((materialRows.data||[]) as Material[]);
      }catch(cause){
        if(mounted) setError('Staff backend is not enabled or access was denied: '+(cause instanceof Error?cause.message:'Unavailable'));
      }finally{if(mounted)setLoading(false);}
    })();
    return()=>{mounted=false;};
  },[user?.id,reload]);

  const copyAccountId = async () => {
    if (!user) return;
    try {
      if (!navigator.clipboard?.writeText) throw new Error('Clipboard is unavailable');
      await navigator.clipboard.writeText(user.id);
      setAccountNotice('Account ID copied. Send it privately to your Super Admin for identity verification and assignment.');
    } catch {
      setAccountNotice('Select and copy the Account ID above, then send it privately to your Super Admin.');
    }
  };

  const canEdit=Boolean(ready&&grant?.is_active&&grant.permissions.includes('materials.draft.write'));
  const canReview=Boolean(ready&&grant?.is_active&&grant.permissions.includes('materials.review.propose'));
  const withinScope=(classLevel:string)=>!grant?.scope_class||grant.scope_class===classLevel;

  const startEdit=(item:Material)=>{
    if(!canEdit||!user||item.created_by!==user.id||item.status!=='draft'||!withinScope(item.class_level))return;
    setEditing(item.id);
    setDraft({title:item.title,description:item.description,subject:item.subject,
      class_level:item.class_level,kind:item.kind,resource_url:item.resource_url||''});
    setMessage('');setError('');
  };
  const clearEditor=()=>{
    setEditing(null);setDraft({...emptyDraft,class_level:grant?.scope_class||'10'});
  };
  const saveDraft=async(event:React.FormEvent)=>{
    event.preventDefault();
    if(!canEdit||!user||busy||!withinScope(draft.class_level))return;
    if(draft.title.trim().length<3||draft.description.trim().length>3000){setError('Valid title and description (max 3000 characters) required.');return;}
    const resource=draft.resource_url.trim();
    if(resource && (!resource.startsWith('https://')||resource.length>2000)){setError('Resource link must be an HTTPS URL.');return;}
    setBusy(true);setError('');setMessage('');
    try{
      const client=requireSupabase();
      const record={title:draft.title.trim(),description:draft.description.trim(),subject:draft.subject,
        class_level:draft.class_level,kind:draft.kind,resource_url:resource||null};
      const result=editing
        ? await client.from('study_material_items').update(record).eq('id',editing).eq('created_by',user.id).eq('status','draft').select('id')
        : await client.from('study_material_items').insert({...record,status:'draft'}).select('id');
      if(result.error) throw result.error;
      if(!result.data?.length) throw new Error('Server did not authorize this change.');
      setMessage(editing?'Draft updated and audited.':'New private draft saved and audited.');
      clearEditor();setReload(n=>n+1);
    }catch(cause){setError(cause instanceof Error?cause.message:'Save denied by server.');}
    finally{setBusy(false);}
  };
  const submitReview=async(item:Material)=>{
    if(!canReview||!user||busy||item.status!=='draft'||item.created_by!==user.id||!withinScope(item.class_level))return;
    setBusy(true);setError('');setMessage('');
    try{
      const client=requireSupabase();
      const result=await client.from('study_material_items').update({status:'pending_review'})
        .eq('id',item.id).eq('created_by',user.id).eq('status','draft').select('id');
      if(result.error)throw result.error;
      if(!result.data?.length)throw new Error('Review request was not authorized.');
      setMessage('Submitted for Super Admin review. Not visible to students yet.');
      setReload(n=>n+1);
    }catch(cause){setError(cause instanceof Error?cause.message:'Review request failed.');}
    finally{setBusy(false);}
  };
  const removeDraft=async(item:Material)=>{
    if(!canEdit||!user||busy||item.status!=='draft'||item.created_by!==user.id||!withinScope(item.class_level))return;
    if(!window.confirm('Delete your draft? This action will be audited.'))return;
    setBusy(true);setError('');setMessage('');
    try{
      const client=requireSupabase();
      const result=await client.from('study_material_items').delete().eq('id',item.id)
        .eq('created_by',user.id).eq('status','draft').select('id');
      if(result.error)throw result.error;
      if(!result.data?.length)throw new Error('Delete was not authorized.');
      setMessage('Draft deleted with audit history.');setReload(n=>n+1);
    }catch(cause){setError(cause instanceof Error?cause.message:'Delete denied.');}
    finally{setBusy(false);}
  };

  if(authLoading||loading)return <main className="mx-auto max-w-5xl p-10 text-sm text-slate-600">Checking your staff permissions securely…</main>;
  if(!user)return <main className="mx-auto max-w-xl space-y-4 p-8"><UserRound className="text-sky-800"/><h1 className="text-2xl font-extrabold">Teacher & Content Workspace</h1><p className="text-sm text-slate-600">Log in with the Google account that Super Admin has assigned a staff role.</p><button onClick={()=>void signInWithGoogle('staff-workspace')} className="rounded-xl bg-sky-900 px-5 py-3 text-sm font-bold text-white">Sign in with Google</button></main>;
  return <main className="mx-auto max-w-6xl space-y-5 px-4 py-8 sm:px-6">
    <header className="rounded-3xl bg-gradient-to-r from-[#061e42] to-[#087f8c] p-6 text-white">
      <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-teal-200"><ShieldCheck size={18}/> Server-authorized Workspace</p>
      <h1 className="mt-3 text-2xl font-extrabold">Teacher & Content Workspace</h1>
      <p className="mt-2 text-sm text-sky-100">Your assigned scope and roles decide what can be edited. Students never see drafts.</p>
      <div className="mt-4 flex flex-wrap gap-2 text-xs font-bold">
        <span className="rounded-full bg-white/10 px-3 py-1.5">Role: {grant?.role||'Not assigned'}</span>
        <span className="rounded-full bg-white/10 px-3 py-1.5">Scope: {grant?.scope_class?'Class '+grant.scope_class:'No class restriction in grant'}</span>
        <a href={import.meta.env.BASE_URL+'study-materials/'} className="rounded-full border border-white/30 px-3 py-1.5 hover:bg-white/10">Open student materials <ExternalLink size={12} className="inline"/></a>
      </div>
    </header>
    <section className="rounded-2xl border border-sky-200 bg-sky-50 p-4">
      <h2 className="text-sm font-extrabold text-sky-950">Teacher Enrollment · Account Reference</h2>
      <p className="mt-1 text-xs leading-5 text-sky-900">Google sign-in identifies your account; it never grants Teacher privileges automatically. The Super Admin must independently verify your identity and approve a scoped role.</p>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <input aria-label="Your teacher account ID" readOnly value={user.id}
          className="min-w-0 flex-1 rounded-lg border border-sky-200 bg-white px-3 py-2 font-mono text-xs text-slate-700"/>
        <button type="button" onClick={()=>void copyAccountId()}
          className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-sky-900 px-3 text-xs font-bold text-white hover:bg-sky-800">
          <Copy size={14}/> Copy Account ID
        </button>
      </div>
      {accountNotice&&<p role="status" className="mt-2 text-xs text-sky-900">{accountNotice}</p>}
    </section>
    {error&&<p role="alert" className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs text-amber-900">{error}</p>}
    {message&&<p role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-xs text-emerald-900">{message}</p>}
    {!grant||!ready?<div className="rounded-2xl border border-amber-200 bg-amber-50 p-6"><LockKeyhole className="text-amber-900"/><h2 className="mt-2 font-extrabold text-amber-950">Staff permission backend not activated</h2><p className="mt-2 text-sm text-amber-900">Super Admin must approve the scoped grant migration and assign your account. No draft editing is allowed yet.</p></div>:<>
      <section className="rounded-2xl border border-slate-200 bg-white p-5">
        <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="font-extrabold text-slate-900">Your material drafts</h2><button onClick={()=>setReload(n=>n+1)} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold"><RefreshCw size={15}/>Refresh</button></div>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {items.filter(item=>item.created_by===user.id).map(item=><div key={item.id} className="rounded-xl border border-slate-200 p-4">
            <p className="text-xs font-semibold text-teal-800">Class {item.class_level} · {item.subject} · {item.status}</p>
            <h3 className="mt-1 text-sm font-bold text-slate-900">{item.title}</h3>
            <p className="mt-1 line-clamp-2 text-xs text-slate-500">{item.description}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {item.status==='draft'&&canEdit&&<button onClick={()=>startEdit(item)} className="rounded-lg border border-sky-200 px-3 py-2 text-xs font-bold text-sky-900">Edit draft</button>}
              {item.status==='draft'&&canReview&&<button disabled={busy} onClick={()=>void submitReview(item)} className="rounded-lg bg-sky-900 px-3 py-2 text-xs font-bold text-white disabled:opacity-40">Send for review</button>}
              {item.status==='draft'&&canEdit&&<button disabled={busy} onClick={()=>void removeDraft(item)} className="rounded-lg border border-rose-200 px-3 py-2 text-xs font-bold text-rose-800 disabled:opacity-40">Delete draft</button>}
            </div>
          </div>)}
          {!items.some(item=>item.created_by===user.id)&&<p className="text-sm text-slate-500">You have no drafts yet.</p>}
        </div>
      </section>
      {canEdit&&<form onSubmit={(event)=>void saveDraft(event)} className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5">
        <h2 className="flex items-center gap-2 font-extrabold text-slate-900"><FileText size={20}/>{editing?'Edit your draft':'Create study material draft'}</h2>
        <div className="grid gap-3 md:grid-cols-2">
          <label className="text-xs font-bold text-slate-700">Class
            <select value={draft.class_level} disabled={Boolean(grant?.scope_class)} onChange={event=>setDraft({...draft,class_level:event.target.value})} className="mt-1 block h-11 w-full rounded-xl border border-slate-200 px-3">
            {classes.filter(cl=>withinScope(cl)).map(cl=><option key={cl} value={cl}>{cl}</option>)}</select></label>
          <label className="text-xs font-bold text-slate-700">Subject
            <select value={draft.subject} onChange={event=>setDraft({...draft,subject:event.target.value})} className="mt-1 block h-11 w-full rounded-xl border border-slate-200 px-3">
              {subjects.map(subject=><option key={subject} value={subject}>{subject}</option>)}</select></label>
          <label className="text-xs font-bold text-slate-700">Title
            <input required minLength={3} maxLength={200} value={draft.title} onChange={event=>setDraft({...draft,title:event.target.value})} className="mt-1 block h-11 w-full rounded-xl border border-slate-200 px-3"/></label>
          <label className="text-xs font-bold text-slate-700">Format
            <select value={draft.kind} onChange={event=>setDraft({...draft,kind:event.target.value})} className="mt-1 block h-11 w-full rounded-xl border border-slate-200 px-3">
              {['notes','pdf','video','presentation','link'].map(k=><option key={k} value={k}>{k}</option>)}</select></label>
        </div>
        <label className="block text-xs font-bold text-slate-700">Summary or learning notes
          <textarea rows={4} maxLength={3000} value={draft.description} onChange={event=>setDraft({...draft,description:event.target.value})} className="mt-1 block w-full rounded-xl border border-slate-200 p-3"/></label>
        <label className="block text-xs font-bold text-slate-700">HTTPS resource link (optional)
          <input type="url" placeholder="https://..." value={draft.resource_url} onChange={event=>setDraft({...draft,resource_url:event.target.value})} className="mt-1 block h-11 w-full rounded-xl border border-slate-200 px-3"/></label>
        <div className="flex gap-2"><button type="submit" disabled={busy||!canEdit} className="flex items-center gap-2 rounded-xl bg-sky-900 px-5 py-3 text-sm font-bold text-white disabled:opacity-40"><Save size={17}/>{editing?'Save changes':'Save private draft'}</button>
          {editing&&<button type="button" onClick={clearEditor} className="rounded-xl border border-slate-200 px-4 py-3 text-xs font-bold">Cancel edit</button>}</div>
      </form>}
      {!canEdit&&<div className="rounded-xl bg-slate-50 p-4 text-xs text-slate-600"><LockKeyhole className="mr-2 inline h-4 w-4"/>Your role has no material-edit permission. Only assigned Super Admin grants can change this.</div>}
    </>}
  </main>;
};
