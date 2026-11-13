import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { AdminVisualEditorV2 } from './AdminVisualEditorV2';
import {
  Type, AlignLeft, MousePointerClick, Image as ImageIcon, Square, Minus,
  Columns2, MoveVertical, Video, Trash2, Copy, ChevronUp, ChevronDown,
  Monitor, Smartphone, Tablet, Undo2, Redo2, Save, Plus, Eye, Layers,
  Settings2, GripVertical, Sparkles
} from 'lucide-react';

type Kind = 'heading' | 'text' | 'button' | 'image' | 'card' | 'divider' | 'columns' | 'spacer' | 'video';
type Device = 'desktop'|'tablet'|'mobile';
type MediaAsset = { name:string; path:string; type:'image'|'video'; url:string; createdAt?:string | null };
type ResponsiveStyle = { fontSize?: number; hidden?: boolean };
type Block = { id: string; kind: Kind; text: string; subtitle?: string; color?: string; background?: string; size?: number; align?: 'left'|'center'|'right'; imageUrl?: string; mediaPath?:string; altText?:string; fit?:'cover'|'contain'; responsive?: Partial<Record<Device, ResponsiveStyle>> };
const starter: Block[] = [
  { id:'b1', kind:'heading', text:'Welcome to Krishan Sir Online Learning', size:34, color:'#123b75', align:'left' },
  { id:'b2', kind:'text', text:'A dedicated digital learning platform designed to make quality education accessible, engaging and meaningful for every learner.', size:16, color:'#475569', align:'left' },
  { id:'b3', kind:'button', text:'Explore Learning', background:'#123b75', color:'#ffffff', align:'left' },
  { id:'b4', kind:'columns', text:'Learning for Classes 6–12', subtitle:'Study materials · Online tests · Practice questions', background:'#eff6ff' },
];
const palette: {kind:Kind;label:string;icon:React.ElementType;hint:string}[] = [
  {kind:'heading',label:'Heading',icon:Type,hint:'Section title or headline'},
  {kind:'text',label:'Text',icon:AlignLeft,hint:'Paragraph or description'},
  {kind:'button',label:'Button',icon:MousePointerClick,hint:'Call-to-action button'},
  {kind:'image',label:'Image',icon:ImageIcon,hint:'Image block'},
  {kind:'card',label:'Card',icon:Square,hint:'Content card'},
  {kind:'columns',label:'Columns',icon:Columns2,hint:'Two-column section'},
  {kind:'video',label:'Video',icon:Video,hint:'Video embed placeholder'},
  {kind:'divider',label:'Divider',icon:Minus,hint:'Horizontal separator'},
  {kind:'spacer',label:'Spacer',icon:MoveVertical,hint:'Vertical spacing'},
];
const uid = () => 'block-' + Math.random().toString(36).slice(2,10);
const key = 'krishan.visual-studio.draft.v1';

export const AdminVisualStudio: React.FC = () => {
  const { user, isAdmin } = useAuth();
  const [mediaItems,setMediaItems] = useState<MediaAsset[]>([]);
  const [mediaLoading,setMediaLoading] = useState(false);
  const [mediaBusy,setMediaBusy] = useState(false);
  const [mediaError,setMediaError] = useState('');
  const [mediaAlt,setMediaAlt] = useState('');
  const [blocks,setBlocks] = useState<Block[]>(() => {
    try { const saved=localStorage.getItem(key); return saved ? JSON.parse(saved) as Block[] : starter; } catch { return starter; }
  });
  const [draftReady,setDraftReady] = useState(false);
  const [selected,setSelected] = useState<string>(blocks[0]?.id ?? '');
  const [mediaOpen,setMediaOpen] = useState(false);
  const [device,setDevice] = useState<Device>('desktop');
  const [notice,setNotice] = useState('Unsaved changes');
  const [history,setHistory] = useState<Block[][]>([]);
  const [future,setFuture] = useState<Block[][]>([]);
  const [previewMode,setPreviewMode] = useState(false);
  const [templateName,setTemplateName] = useState('Education Portal');
  const [realPageMode,setRealPageMode] = useState(false);
  if (realPageMode) return <AdminVisualEditorV2 onBack={() => setRealPageMode(false)} />;
  const active = blocks.find(b=>b.id===selected) ?? blocks[0];
  const loadMedia = async () => {
    const client = supabase;
    if (!client || !user || !isAdmin) return;
    setMediaLoading(true); setMediaError('');
    try {
      const { data, error } = await client.storage.from('visual-studio-media').list(user.id,{limit:100,sortBy:{column:'created_at',order:'desc'}});
      if (error) throw error;
      const assets: (MediaAsset | null)[] = await Promise.all((data??[]).filter(item=>item.name && !item.name.startsWith('.')).map(async (item): Promise<MediaAsset | null> => {
        const path = user.id+'/'+item.name;
        const { data: signed, error: signError } = await client.storage.from('visual-studio-media').createSignedUrl(path,3600);
        if (signError || !signed?.signedUrl) return null;
        const mime = item.metadata?.mimetype ?? '';
        return {name:item.name,path,type:mime.startsWith('video/')?'video' as const:'image' as const,url:signed.signedUrl,createdAt:item.created_at ?? undefined};
      }));
      setMediaItems(assets.filter(item => item !== null));
    } catch(error) { setMediaError(error instanceof Error?error.message:'Media Library load नहीं हो सकी।'); }
    finally { setMediaLoading(false); }
  };
  useEffect(()=>{ void loadMedia(); },[user?.id,isAdmin]);
  const uploadMedia = async (file:File) => {
    const client = supabase;
    if (!client || !user || !isAdmin) { setMediaError('केवल सत्यापित Admin Media Upload कर सकता है।'); return; }
    const allowed = ['image/jpeg','image/png','image/webp','image/gif','image/avif','video/mp4','video/webm'];
    if (!allowed.includes(file.type)) { setMediaError('केवल JPG, PNG, WEBP, GIF, AVIF, MP4 और WEBM फाइलें स्वीकार हैं।'); return; }
    if (file.size > 50*1024*1024) { setMediaError('फाइल का आकार 50 MB से कम होना चाहिए।'); return; }
    setMediaBusy(true); setMediaError('');
    try {
      const extension = file.name.split('.').pop()?.toLowerCase() || 'bin';
      const path = user.id+'/'+crypto.randomUUID()+'.'+extension;
      const {error} = await client.storage.from('visual-studio-media').upload(path,file,{contentType:file.type,cacheControl:'3600',upsert:false,metadata:{altText:mediaAlt.trim()}});
      if (error) throw error;
      setMediaAlt('');
      await loadMedia();
    } catch(error) { setMediaError(error instanceof Error?error.message:'Upload विफल रहा।'); }
    finally { setMediaBusy(false); }
  };
  const insertMedia = (asset:MediaAsset) => {
    const block:Block = {id:uid(),kind:asset.type==='video'?'video':'image',text:asset.name,mediaPath:asset.path,imageUrl:asset.url,altText:mediaAlt||asset.name,fit:'contain',background:'#f8fafc'};
    setHistory(h=>[...h,blocks]); setFuture([]); setBlocks(current=>[...current,block]); setSelected(block.id); setNotice('Media added to canvas');
  };

  useEffect(() => {
    let active = true;
    const restoreDraft = async () => {
      const client = supabase;
      if (!client || !user || !isAdmin) { setDraftReady(true); return; }
      setDraftReady(false);
      try {
        const { data, error } = await client.from('visual_studio_drafts').select('content').eq('user_id', user.id).eq('draft_key', 'main').maybeSingle();
        if (error) throw error;
        if (active && Array.isArray(data?.content)) {
          const restored = await Promise.all((data.content as Block[]).map(async block => {
            if (!block.mediaPath) return block;
            const { data: signed } = await client.storage.from('visual-studio-media').createSignedUrl(block.mediaPath, 3600);
            return signed?.signedUrl ? { ...block, imageUrl: signed.signedUrl } : block;
          }));
          if (active) { setBlocks(restored); setSelected(restored[0]?.id ?? ''); setNotice('Cloud draft restored'); }
        }
      } catch (error) {
        if (active) setNotice(error instanceof Error ? 'Cloud draft unavailable; local backup active' : 'Cloud draft unavailable; local backup active');
      } finally { if (active) setDraftReady(true); }
    };
    void restoreDraft();
    return () => { active = false; };
  }, [user?.id, isAdmin]);

  useEffect(() => {
    if (!draftReady) return;
    const timer = window.setTimeout(async () => {
      try {
        localStorage.setItem(key, JSON.stringify(blocks));
        if (supabase && user && isAdmin) {
          const { error } = await supabase.from('visual_studio_drafts').upsert({ user_id: user.id, draft_key: 'main', content: blocks, updated_at: new Date().toISOString() }, { onConflict: 'user_id,draft_key' });
          if (error) throw error;
          setNotice('Draft autosaved to cloud and this browser');
        } else setNotice('All changes autosaved locally');
      } catch {
        setNotice('Cloud autosave failed — local backup saved');
      }
    }, 1500);
    return () => window.clearTimeout(timer);
  }, [blocks, draftReady, user?.id, isAdmin]);
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target?.isContentEditable || ['INPUT','TEXTAREA','SELECT'].includes(target?.tagName ?? '')) return;
      if (!(event.ctrlKey || event.metaKey)) return;
      if (event.key.toLowerCase() === 'z' && !event.shiftKey) { event.preventDefault(); undo(); }
      if (event.key.toLowerCase() === 'y' || (event.key.toLowerCase() === 'z' && event.shiftKey)) { event.preventDefault(); redo(); }
      if (event.key.toLowerCase() === 's') { event.preventDefault(); save(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });
  const update = (id:string, patch:Partial<Block>) => { setHistory(h=>[...h,blocks]); setFuture([]); setBlocks(current=>current.map(b=>b.id===id?{...b,...patch}:b)); setNotice('Unsaved changes'); };
  const add = (kind:Kind, at=blocks.length) => {
    const base:Block = {id:uid(),kind,text:kind==='heading'?'New heading':kind==='text'?'Write your text here':kind==='button'?'Button label':kind==='card'?'New content card':kind==='columns'?'Column section':kind==='video'?'Video block':kind==='image'?'Image placeholder':'',size:kind==='heading'?30:16,color:'#24364b',background:kind==='card'||kind==='columns'?'#f1f5f9':'#ffffff',align:'left'};
    setHistory(h=>[...h,blocks]); setFuture([]); setBlocks(current=>{const next=[...current];next.splice(at,0,base);return next;});setSelected(base.id);setNotice('New component added');
  };
  const duplicate = () => {
    if (!active) return;
    const clone = { ...active, id: uid(), text: active.text + ' (Copy)' };
    const index = blocks.findIndex(b => b.id === active.id);
    setHistory(h => [...h, blocks]); setFuture([]);
    setBlocks(current => { const next = [...current]; next.splice(index + 1, 0, clone); return next; });
    setSelected(clone.id); setNotice('Component duplicated');
  };
  const applyTemplate = (name: string) => {
    const layouts: Record<string, Block[]> = {
      'Education Portal': starter,
      'Course Landing Page': [
        {id:'t1',kind:'heading',text:'Learn. Practice. Achieve.',size:38,color:'#123b75',align:'center'},
        {id:'t2',kind:'text',text:'Structured courses, expert guidance and practice resources for every learner.',size:17,color:'#475569',align:'center'},
        {id:'t3',kind:'button',text:'Explore Courses',background:'#123b75',color:'#ffffff',align:'center'},
        {id:'t4',kind:'columns',text:'Expert Lessons',subtitle:'Clear explanations and chapter-wise learning resources.',background:'#eff6ff'},
        {id:'t5',kind:'card',text:'Practice Tests',subtitle:'Assess your preparation and track your progress.',background:'#f8fafc'}
      ],
      'Announcement Page': [
        {id:'a1',kind:'heading',text:'Latest Announcements',size:36,color:'#123b75',align:'left'},
        {id:'a2',kind:'text',text:'Important updates, notices and upcoming activities.',size:16,color:'#475569'},
        {id:'a3',kind:'card',text:'Important Notice',subtitle:'Add your announcement details here.',background:'#fff7ed'},
        {id:'a4',kind:'button',text:'Read More',background:'#123b75',color:'#ffffff'}
      ]
    };
    const next = layouts[name] ?? starter;
    setHistory(h=>[...h,blocks]); setFuture([]); setBlocks(next.map(b=>({...b,id:uid()}))); setSelected(''); setTemplateName(name); setNotice(name+' template loaded — edit before saving');
  };
  const remove = () => { if(!active)return; setHistory(h=>[...h,blocks]);setBlocks(current=>current.filter(b=>b.id!==active.id));setSelected(blocks.find(b=>b.id!==active.id)?.id??'');setNotice('Component removed from draft'); };
  const move = (id:string,dir:-1|1) => { const i=blocks.findIndex(b=>b.id===id),j=i+dir;if(j<0||j>=blocks.length)return;setHistory(h=>[...h,blocks]);setBlocks(current=>{const next=[...current];[next[i],next[j]]=[next[j],next[i]];return next;}); };
  const undo=()=>{if(!history.length)return;setFuture(f=>[blocks,...f]);setBlocks(history[history.length-1]);setHistory(h=>h.slice(0,-1));setNotice('Undo applied');};
  const redo=()=>{if(!future.length)return;setHistory(h=>[...h,blocks]);setBlocks(future[0]);setFuture(f=>f.slice(1));setNotice('Redo applied');};
  const save=async()=>{try{localStorage.setItem(key,JSON.stringify(blocks));if(supabase&&user&&isAdmin){const {error}=await supabase.from('visual_studio_drafts').upsert({user_id:user.id,draft_key:'main',content:blocks,updated_at:new Date().toISOString()},{onConflict:'user_id,draft_key'});if(error)throw error;setNotice('Draft saved securely to cloud and this browser');}else setNotice('Draft saved in this browser');}catch{setNotice('Cloud save failed — browser backup is available');}};
  const onDrop=(event:React.DragEvent<HTMLDivElement>,index:number)=>{event.preventDefault();const draggedId=event.dataTransfer.getData('application/krishan-sort-block');if(draggedId){const from=blocks.findIndex(b=>b.id===draggedId);if(from<0||from===index)return;setHistory(h=>[...h,blocks]);setFuture([]);setBlocks(current=>{const next=[...current];const [item]=next.splice(from,1);const target=from<index?index-1:index;next.splice(Math.max(0,Math.min(target,next.length)),0,item);return next;});setSelected(draggedId);setNotice('Component order updated');return;}const kind=event.dataTransfer.getData('application/krishan-block') as Kind;if(kind&&palette.some(p=>p.kind===kind))add(kind,index);};
  const canvasWidth=device==='mobile'?'390px':device==='tablet'?'768px':'100%';
  const renderBlock=(b:Block,index:number)=> { if (b.responsive?.[device]?.hidden) return null; const responsiveFontSize=b.responsive?.[device]?.fontSize ?? b.size; return <div key={b.id} onClick={()=>{if(!previewMode)setSelected(b.id)}} onDragOver={e=>{if(!previewMode)e.preventDefault()}} onDrop={e=>{if(!previewMode)onDrop(e,index)}} className={`group relative my-2 rounded-xl border-2 p-3 transition ${previewMode?'border-transparent':selected===b.id?'border-sky-500 ring-2 ring-sky-100':'border-transparent hover:border-slate-300'}`} style={{background:b.background??'transparent',textAlign:b.align??'left'}}>
    {!previewMode&&selected===b.id&&<div className="absolute -top-3 right-2 z-10 flex items-center gap-1 rounded-lg bg-sky-700 px-2 py-1 text-[10px] font-bold text-white shadow"><span draggable onDragStart={e=>{e.stopPropagation();e.dataTransfer.effectAllowed='move';e.dataTransfer.setData('application/krishan-sort-block',b.id);}} onClick={e=>e.stopPropagation()} title="Drag to reorder" className="flex cursor-grab items-center gap-1 active:cursor-grabbing"><GripVertical className="h-3 w-3"/>DRAG</span>{b.kind.toUpperCase()}<button onClick={e=>{e.stopPropagation();move(b.id,-1)}} title="Move up"><ChevronUp className="h-3 w-3"/></button><button onClick={e=>{e.stopPropagation();move(b.id,1)}} title="Move down"><ChevronDown className="h-3 w-3"/></button></div>}
    {b.kind==='heading'?<div contentEditable={!previewMode} suppressContentEditableWarning onBlur={e=>update(b.id,{text:e.currentTarget.textContent??''})} style={{fontSize:responsiveFontSize,color:b.color,fontWeight:800,outline:'none'}}>{b.text}</div>
    :b.kind==='text'?<p contentEditable={!previewMode} suppressContentEditableWarning onBlur={e=>update(b.id,{text:e.currentTarget.textContent??''})} style={{fontSize:responsiveFontSize,color:b.color,outline:'none',lineHeight:1.7}}>{b.text}</p>
    :b.kind==='button'?<span contentEditable={!previewMode} suppressContentEditableWarning onBlur={e=>update(b.id,{text:e.currentTarget.textContent??''})} style={{display:'inline-block',padding:'12px 20px',borderRadius:10,background:b.background,color:b.color,fontWeight:700,outline:'none'}}>{b.text}</span>
    :b.kind==='image'?b.imageUrl?<img src={b.imageUrl} alt={b.altText??b.text} className="mx-auto max-h-[520px] w-full rounded-xl" style={{objectFit:b.fit??'contain'}}/>:<div className="grid min-h-32 place-items-center rounded-xl border border-dashed border-slate-300 bg-slate-50 text-sm text-slate-500"><ImageIcon className="mb-2 h-6 w-6"/>Media Library से Image चुनें</div>
    :b.kind==='card'||b.kind==='columns'?<div className="rounded-xl border border-slate-200 p-5" style={{background:b.background}}><div contentEditable={!previewMode} suppressContentEditableWarning onBlur={e=>update(b.id,{text:e.currentTarget.textContent??''})} className="font-bold" style={{color:b.color}}>{b.text}</div><p contentEditable={!previewMode} suppressContentEditableWarning onBlur={e=>update(b.id,{subtitle:e.currentTarget.textContent??''})} className="mt-2 text-sm text-slate-600">{b.subtitle??'Add a supporting description here.'}</p></div>
    :b.kind==='video'?b.imageUrl?<video src={b.imageUrl} controls className="mx-auto max-h-[520px] w-full rounded-xl bg-black"/>:<div className="grid min-h-36 place-items-center rounded-xl bg-slate-900 text-white"><Video className="h-8 w-8"/><span className="text-sm">Media Library से Video चुनें</span></div>
    :b.kind==='divider'?<hr className="border-slate-300"/>
    :<div className="h-10 rounded bg-slate-100"/>}
  </div>; };
  return <div className="min-h-[80vh] space-y-4">
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-sky-200 bg-sky-50 p-3">
      <div><p className="text-sm font-extrabold text-slate-900">Visual Website Studio</p><p className="text-xs text-slate-600">Canvas Builder और वास्तविक वेबसाइट पेज एडिटर एक ही Studio में</p></div>
      <button type="button" onClick={() => setRealPageMode(true)} className="rounded-lg bg-sky-900 px-4 py-2 text-xs font-bold text-white hover:bg-sky-800">वास्तविक वेबसाइट पेज Edit करें</button>
    </div>
    <header className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div><div className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-wider text-sky-700"><Sparkles className="h-4 w-4"/>Krishan Sir Visual Studio</div><h2 className="mt-1 text-xl font-extrabold text-slate-900">Drag & Drop Website Builder</h2><p className="mt-1 text-xs text-slate-500">{notice} · Separate development preview</p></div>
      <div className="flex flex-wrap items-center gap-2">
        {!previewMode&&<><button onClick={undo} disabled={!history.length} className="rounded-lg border p-2 disabled:opacity-40" title="Undo"><Undo2 className="h-4 w-4"/></button><button onClick={redo} disabled={!future.length} className="rounded-lg border p-2 disabled:opacity-40" title="Redo"><Redo2 className="h-4 w-4"/></button>
        <div className="flex rounded-lg border p-1"><button onClick={()=>setDevice('desktop')} className={`rounded p-2 ${device==='desktop'?'bg-sky-800 text-white':''}`} title="Desktop"><Monitor className="h-4 w-4"/></button><button onClick={()=>setDevice('tablet')} className={`rounded p-2 ${device==='tablet'?'bg-sky-800 text-white':''}`} title="Tablet"><Tablet className="h-4 w-4"/></button><button onClick={()=>setDevice('mobile')} className={`rounded p-2 ${device==='mobile'?'bg-sky-800 text-white':''}`} title="Mobile"><Smartphone className="h-4 w-4"/></button></div>
        <button onClick={save} className="inline-flex items-center gap-2 rounded-lg bg-sky-900 px-3 py-2 text-xs font-bold text-white"><Save className="h-4 w-4"/>Save Draft</button></>}
        <button onClick={()=>setPreviewMode(v=>!v)} className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-bold"><Eye className="h-4 w-4"/>{previewMode?'Exit Preview':'Preview'}</button>
      </div>
    </header>
    <div className={`grid gap-4 ${previewMode?'grid-cols-1':'xl:grid-cols-[220px_minmax(0,1fr)_270px]'}`}>
      {!previewMode&&<aside className="rounded-2xl border border-slate-200 bg-white p-3">
        <h3 className="mb-3 flex items-center gap-2 text-sm font-extrabold"><Plus className="h-4 w-4"/>Add Components</h3><label className="mb-3 block text-[11px] font-semibold text-slate-600">Starter template<select value={templateName} onChange={e=>applyTemplate(e.target.value)} className="mt-1 w-full rounded-lg border p-2 text-xs"><option>Education Portal</option><option>Course Landing Page</option><option>Announcement Page</option></select></label>
        <div className="grid grid-cols-2 gap-2 xl:grid-cols-1">{palette.map(p=>{const Icon=p.icon;return <button key={p.kind} draggable onDragStart={e=>e.dataTransfer.setData('application/krishan-block',p.kind)} onClick={()=>add(p.kind)} className="flex items-center gap-2 rounded-xl border border-slate-200 p-2 text-left hover:border-sky-400 hover:bg-sky-50"><Icon className="h-4 w-4 text-sky-800"/><span><span className="block text-xs font-bold">{p.label}</span><span className="hidden text-[9px] text-slate-500 xl:block">{p.hint}</span></span></button>})}</div>
        <div className="mt-4 rounded-lg bg-sky-50 p-2 text-[10px] leading-5 text-sky-900">किसी component को क्लिक करके जोड़ें या Canvas पर Drag & Drop करें।</div>
        <div className="mt-4 border-t border-slate-100 pt-3">
          <button onClick={()=>setMediaOpen(v=>!v)} className="flex w-full items-center justify-between rounded-xl bg-violet-50 p-3 text-left text-xs font-extrabold text-violet-900"><span className="flex items-center gap-2"><ImageIcon className="h-4 w-4"/>Media Library</span><span>{mediaOpen?'−':'+'}</span></button>
          {mediaOpen&&<div className="mt-3 space-y-2">
            <p className="text-[10px] leading-4 text-slate-500">Private Storage · Admin-only upload · Max 50 MB</p>
            <input value={mediaAlt} onChange={e=>setMediaAlt(e.target.value)} placeholder="Alt text / accessible description" className="w-full rounded-lg border p-2 text-[11px]"/>
            <label className="block cursor-pointer rounded-lg border border-dashed border-violet-300 bg-violet-50 p-3 text-center text-[11px] font-bold text-violet-900">{mediaBusy?'Uploading…':'Upload Image / Video'}<input type="file" accept="image/jpeg,image/png,image/webp,image/gif,image/avif,video/mp4,video/webm" disabled={mediaBusy} className="hidden" onChange={e=>{const file=e.target.files?.[0];if(file)void uploadMedia(file);e.currentTarget.value='';}}/></label>
            {mediaError&&<p role="alert" className="rounded-lg bg-rose-50 p-2 text-[10px] text-rose-700">{mediaError}</p>}
            {mediaLoading?<p className="text-[10px] text-slate-500">Loading media…</p>:mediaItems.length===0?<p className="text-[10px] text-slate-400">अभी कोई media upload नहीं है।</p>:<div className="grid grid-cols-2 gap-2">{mediaItems.map(asset=><div key={asset.path} className="overflow-hidden rounded-lg border border-slate-200 bg-white"><div className="grid h-20 place-items-center bg-slate-100">{asset.type==='image'?<img src={asset.url} alt={asset.name} className="h-full w-full object-cover"/>:<Video className="h-7 w-7 text-slate-500"/>}</div><p className="truncate px-2 pt-1 text-[9px] text-slate-600">{asset.name}</p><button onClick={()=>insertMedia(asset)} className="m-1 w-[calc(100%-8px)] rounded-md bg-sky-900 p-1.5 text-[10px] font-bold text-white">Insert</button></div>)}</div>}
            <button onClick={()=>void loadMedia()} disabled={mediaLoading} className="w-full rounded-lg border p-2 text-[10px] font-bold text-slate-600">Refresh Library</button>
          </div>}
        </div>
      </aside>}
      <main className={`min-w-0 rounded-2xl border p-3 sm:p-5 ${previewMode?'border-transparent bg-transparent':'border-slate-200 bg-slate-100'}`}>
        <div className="mb-3 flex items-center justify-between"><h3 className="text-sm font-extrabold text-slate-800">{previewMode?'Preview Canvas':'Website Canvas'}</h3><span className="text-[10px] text-slate-500">{previewMode?'Read-only preview':'Click to select · Edit text inline'}</span></div>
        <div onDragOver={e=>{if(!previewMode)e.preventDefault()}} onDrop={e=>{if(!previewMode)onDrop(e,blocks.length)}} className="mx-auto min-h-[620px] rounded-xl border border-slate-200 bg-white p-4 shadow-sm" style={{maxWidth:canvasWidth}}>{blocks.map(renderBlock)}{!previewMode&&<div className="mt-4 rounded-lg border-2 border-dashed border-slate-200 p-5 text-center text-xs text-slate-400">Drop a component here to add a new section</div>}</div>
      </main>
      {!previewMode&&<aside className="rounded-2xl border border-slate-200 bg-white p-3">
        <h3 className="mb-3 flex items-center gap-2 text-sm font-extrabold"><Settings2 className="h-4 w-4"/>Inspector</h3>
        {!active?<p className="text-xs text-slate-500">Select a component on the canvas.</p>:<div className="space-y-3">
          <div className="rounded-lg bg-slate-50 p-2 text-xs font-bold">{active.kind.toUpperCase()} · {active.id}</div>
          {active.kind!=='divider'&&active.kind!=='spacer'&&<label className="block text-xs font-semibold">Text / Label<input value={active.text} onChange={e=>update(active.id,{text:e.target.value})} className="mt-1 w-full rounded-lg border p-2 text-sm"/></label>}
          {['card','columns'].includes(active.kind)&&<label className="block text-xs font-semibold">Description<input value={active.subtitle??''} onChange={e=>update(active.id,{subtitle:e.target.value})} className="mt-1 w-full rounded-lg border p-2 text-sm"/></label>}
          <label className="block text-xs font-semibold">Text colour<input type="color" value={active.color??'#24364b'} onChange={e=>update(active.id,{color:e.target.value})} className="mt-1 h-9 w-full"/></label>
          <label className="block text-xs font-semibold">Background<input type="color" value={active.background??'#ffffff'} onChange={e=>update(active.id,{background:e.target.value})} className="mt-1 h-9 w-full"/></label>
          <label className="block text-xs font-semibold">Font size · {active.size??16}px<input type="range" min="10" max="56" value={active.size??16} onChange={e=>update(active.id,{size:Number(e.target.value)})} className="mt-1 w-full"/></label>
          <label className="block text-xs font-semibold">Alignment<select value={active.align??'left'} onChange={e=>update(active.id,{align:e.target.value as Block['align']})} className="mt-1 w-full rounded-lg border p-2 text-sm"><option value="left">Left</option><option value="center">Center</option><option value="right">Right</option></select></label>
          <div className="rounded-xl border border-sky-100 bg-sky-50/60 p-3">
            <div className="mb-2 flex items-center justify-between"><span className="text-xs font-extrabold text-sky-900">Responsive override</span><span className="rounded-full bg-white px-2 py-1 text-[10px] font-bold uppercase text-sky-800">{device}</span></div>
            <label className="block text-xs font-semibold">Font size on {device} · {active.responsive?.[device]?.fontSize ?? active.size ?? 16}px
              <input type="range" min="10" max="56" value={active.responsive?.[device]?.fontSize ?? active.size ?? 16} onChange={e=>update(active.id,{responsive:{...active.responsive,[device]:{...active.responsive?.[device],fontSize:Number(e.target.value)}}})} className="mt-1 w-full"/>
            </label>
            <label className="mt-3 flex items-center gap-2 text-xs font-semibold"><input type="checkbox" checked={!!active.responsive?.[device]?.hidden} onChange={e=>update(active.id,{responsive:{...active.responsive,[device]:{...active.responsive?.[device],hidden:e.target.checked}}})}/>Hide this component on {device}</label>
            <button onClick={()=>{const responsive={...active.responsive};delete responsive[device];update(active.id,{responsive});}} className="mt-3 w-full rounded-lg border border-sky-200 bg-white p-2 text-[11px] font-bold text-sky-800">Reset {device} overrides</button>
          </div>
          <button onClick={duplicate} className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-sky-50 p-2 text-xs font-bold text-sky-800"><Copy className="h-4 w-4"/>Duplicate component</button><button onClick={remove} className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-rose-50 p-2 text-xs font-bold text-rose-700"><Trash2 className="h-4 w-4"/>Remove selected component</button>
        </div>}
        <div className="mt-4 border-t pt-3"><h4 className="mb-2 flex items-center gap-2 text-xs font-extrabold"><Layers className="h-4 w-4"/>Layers</h4>{blocks.map((b,i)=><button key={b.id} onClick={()=>setSelected(b.id)} className={`mb-1 flex w-full items-center justify-between rounded-lg p-2 text-left text-[10px] ${selected===b.id?'bg-sky-100 text-sky-900':'hover:bg-slate-50'}`}><span>{i+1}. {b.kind} — {b.text.slice(0,22)}</span><GripVertical className="h-3 w-3"/></button>)}</div>
      </aside>}
    </div>
    {!previewMode&&<div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs leading-5 text-amber-900"><strong>Integration safety:</strong> यह अलग Visual Studio prototype है। Autosave और manual Draft अभी इसी browser में काम करते हैं; Templates, Preview, Duplicate और Undo/Redo उपलब्ध हैं। वास्तविक Live website, Online Test Engine या Production Database पर कोई बदलाव नहीं होता। Production integration approval और mapping tests के बाद होगी।</div>}
  </div>;
};
