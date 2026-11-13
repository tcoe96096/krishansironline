import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import {
  Type, AlignLeft, MousePointerClick, Image as ImageIcon, Square, Minus,
  Columns2, MoveVertical, Video, Trash2, Copy, ChevronUp, ChevronDown,
  Monitor, Smartphone, Tablet, Undo2, Redo2, Save, Plus, Eye, Layers,
  Settings2, GripVertical, Sparkles
} from 'lucide-react';

type Kind = 'heading' | 'text' | 'button' | 'image' | 'card' | 'divider' | 'columns' | 'spacer' | 'video';
type Device = 'desktop'|'tablet'|'mobile';
type MediaAsset = { name:string; path:string; type:'image'|'video'; url:string; createdAt?:string };
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
type VisualPageId='home'|'classes'|'exams'|'tests'|'materials'|'polity'|'affairs'|'results'|'about'|'contact'|'studentDashboard';
const visualPages:{id:VisualPageId;label:string;path:string}[]=[
  {id:'home',label:'Home',path:'/'},{id:'classes',label:'Classes 6–12',path:'/classes/'},{id:'exams',label:'All Exams',path:'/all-exams/'},
  {id:'tests',label:'Online Tests',path:'/online-tests/'},{id:'materials',label:'Study Materials',path:'/study-materials/'},
  {id:'polity',label:'Constitution',path:'/constitution/'},{id:'affairs',label:'Current Affairs',path:'/current-affairs/'},
  {id:'results',label:'Results',path:'/results/'},{id:'about',label:'About',path:'/about/'},{id:'contact',label:'Contact',path:'/contact/'},
  {id:'studentDashboard',label:'Student Dashboard',path:'/student-dashboard/'}
];
type DomSelection={key:string;sectionKey:string;tag:string;text:string;color:string;backgroundColor:string;fontSize:number;textAlign:string;pageTitle?:string;sectionText?:string;hidden?:boolean};

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
  const [selected,setSelected] = useState<string>(blocks[0]?.id ?? '');
  const [mediaOpen,setMediaOpen] = useState(false);
  const [inspectorOpen,setInspectorOpen] = useState(false);
  const [selectedPage,setSelectedPage] = useState<VisualPageId>('home');
  const [selectedDom,setSelectedDom] = useState<DomSelection|null>(null);
  const [frameReady,setFrameReady] = useState(false);
  const iframeRef=useRef<HTMLIFrameElement|null>(null);
  const [canvasMode,setCanvasMode] = useState<'site'|'draft'>('site');
  const [componentsOpen,setComponentsOpen] = useState(false);
  const componentButtonRef = useRef<HTMLButtonElement|null>(null);
  const componentMenuRef = useRef<HTMLDivElement|null>(null);
  const [componentMenuPosition,setComponentMenuPosition] = useState({left:24,top:100,width:260});
  const [device,setDevice] = useState<Device>('desktop');
  const [notice,setNotice] = useState('Unsaved changes');
  const [history,setHistory] = useState<Block[][]>([]);
  const [future,setFuture] = useState<Block[][]>([]);
  const [previewMode,setPreviewMode] = useState(false);
  const [templateName,setTemplateName] = useState('Education Portal');
  const active = blocks.find(b=>b.id===selected) ?? blocks[0];
  const pageBase=import.meta.env.BASE_URL.endsWith('/')?import.meta.env.BASE_URL.slice(0,-1):import.meta.env.BASE_URL;
  const selectedPageInfo=visualPages.find(page=>page.id===selectedPage)??visualPages[0];
  const frameSrc=pageBase+selectedPageInfo.path+(previewMode?'':'?visual-editor=1');
  const frameWidth=device==='mobile'?'390px':device==='tablet'?'768px':'100%';
  const sendToPage=(type:string,payload:Record<string,unknown>={})=>{iframeRef.current?.contentWindow?.postMessage({source:'krishan-visual-parent',type,...payload},window.location.origin);};
  const toColor=(value:string,fallback:string)=>{
    if(/^#[0-9a-f]{6}$/i.test(value))return value;
    const match=value.match(/rgba?\\((\\d+),\\s*(\\d+),\\s*(\\d+)/i);
    return match?'#'+match.slice(1,4).map(part=>Number(part).toString(16).padStart(2,'0')).join(''):fallback;
  };
  useEffect(()=>{
    const handleMessage=(event:MessageEvent)=>{
      if(event.origin!==window.location.origin||event.source!==iframeRef.current?.contentWindow)return;
      const data=event.data;if(!data||data.source!=='krishan-visual-editor')return;
      if(data.type==='vs:ready'){setFrameReady(true);setNotice('Original website loaded · '+(data.pageTitle||selectedPageInfo.label));}
      if(data.type==='vs:select'){setSelectedDom(data as DomSelection);setInspectorOpen(true);}
      if(data.type==='vs:saved')setNotice('Page changes saved locally · '+selectedPageInfo.label);
      if(data.type==='vs:error')setNotice(String(data.message||'Draft save failed'));
    };
    window.addEventListener('message',handleMessage);return()=>window.removeEventListener('message',handleMessage);
  },[selectedPageInfo.label]);
  useEffect(()=>{setFrameReady(false);setSelectedDom(null);},[selectedPage,previewMode]);
  const save=()=>{try{localStorage.setItem(key,JSON.stringify(blocks));sendToPage('vs:save');setNotice('Current page draft saved in this browser');}catch{setNotice('Unable to save draft in browser storage');}};
  useEffect(()=>{
    if(!componentsOpen) return;
    const updatePosition=()=>{
      const rect=componentButtonRef.current?.getBoundingClientRect();
      if(!rect) return;
      const width=Math.min(280,window.innerWidth-24);
      const left=Math.max(12,Math.min(rect.left,window.innerWidth-width-12));
      const estimatedHeight=Math.min(palette.length*58+16,window.innerHeight-32);
      const top=rect.bottom+8+estimatedHeight>window.innerHeight?Math.max(12,rect.top-estimatedHeight-8):rect.bottom+8;
      setComponentMenuPosition({left,top,width});
    };
    const onPointerDown=(event:PointerEvent)=>{
      const target=event.target as Node;
      if(!componentButtonRef.current?.contains(target)&&!componentMenuRef.current?.contains(target)) setComponentsOpen(false);
    };
    const onKeyDown=(event:KeyboardEvent)=>{if(event.key==='Escape')setComponentsOpen(false);};
    updatePosition();
    window.addEventListener('resize',updatePosition);
    window.addEventListener('scroll',updatePosition,true);
    document.addEventListener('pointerdown',onPointerDown);
    document.addEventListener('keydown',onKeyDown);
    return ()=>{
      window.removeEventListener('resize',updatePosition);
      window.removeEventListener('scroll',updatePosition,true);
      document.removeEventListener('pointerdown',onPointerDown);
      document.removeEventListener('keydown',onKeyDown);
    };
  },[componentsOpen]);
    const loadMedia = async () => {
    if (!supabase || !user || !isAdmin) return;
    setMediaLoading(true); setMediaError('');
    try {
      const { data, error } = await supabase.storage.from('visual-studio-media').list(user.id,{limit:100,sortBy:{column:'created_at',order:'desc'}});
      if (error) throw error;
      const assets = await Promise.all((data??[]).filter(item=>item.name && !item.name.startsWith('.')).map(async item=>{
        const path = user.id+'/'+item.name;
        const { data: signed, error: signError } = await supabase.storage.from('visual-studio-media').createSignedUrl(path,3600);
        if (signError || !signed?.signedUrl) return null;
        const mime = item.metadata?.mimetype ?? '';
        return {name:item.name,path,type:mime.startsWith('video/')?'video' as const:'image' as const,url:signed.signedUrl,createdAt:item.created_at};
      }));
      setMediaItems(assets.filter((item):item is MediaAsset=>Boolean(item)));
    } catch(error) { setMediaError(error instanceof Error?error.message:'Media Library load नहीं हो सकी।'); }
    finally { setMediaLoading(false); }
  };
  useEffect(()=>{ void loadMedia(); },[user?.id,isAdmin]);
  const uploadMedia = async (file:File) => {
    if (!supabase || !user || !isAdmin) { setMediaError('केवल सत्यापित Admin Media Upload कर सकता है।'); return; }
    const allowed = ['image/jpeg','image/png','image/webp','image/gif','image/avif','video/mp4','video/webm'];
    if (!allowed.includes(file.type)) { setMediaError('केवल JPG, PNG, WEBP, GIF, AVIF, MP4 और WEBM फाइलें स्वीकार हैं।'); return; }
    if (file.size > 50*1024*1024) { setMediaError('फाइल का आकार 50 MB से कम होना चाहिए।'); return; }
    setMediaBusy(true); setMediaError('');
    try {
      const extension = file.name.split('.').pop()?.toLowerCase() || 'bin';
      const path = user.id+'/'+crypto.randomUUID()+'.'+extension;
      const {error} = await supabase.storage.from('visual-studio-media').upload(path,file,{contentType:file.type,cacheControl:'3600',upsert:false,metadata:{altText:mediaAlt.trim()}});
      if (error) throw error;
      setMediaAlt('');
      await loadMedia();
    } catch(error) { setMediaError(error instanceof Error?error.message:'Upload विफल रहा।'); }
    finally { setMediaBusy(false); }
  };
  const insertMedia = (asset:MediaAsset) => {
    if(canvasMode==='site'){
      sendToPage('vs:add',{kind:asset.type==='video'?'video':'image',text:mediaAlt||asset.name,url:asset.url});
      setNotice('Media added to '+selectedPageInfo.label+' draft');return;
    }
    const block:Block = {id:uid(),kind:asset.type==='video'?'video':'image',text:asset.name,mediaPath:asset.path,imageUrl:asset.url,altText:mediaAlt||asset.name,fit:'contain',background:'#f8fafc'};
    setHistory(h=>[...h,blocks]);setFuture([]);setBlocks(current=>[...current,block]);setSelected(block.id);setNotice('Media added to draft canvas');
  };

  useEffect(() => {
    const timer = window.setTimeout(() => {
      try { localStorage.setItem(key, JSON.stringify(blocks)); setNotice('All changes autosaved locally'); }
      catch { setNotice('Autosave unavailable — use Save Draft or export your work'); }
    }, 1200);
    return () => window.clearTimeout(timer);
  }, [blocks]);
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
    setHistory(h=>[...h,blocks]); setFuture([]); setBlocks(current=>{const next=[...current];next.splice(at,0,base);return next;});setSelected(base.id);if(canvasMode==='site'){setHomepageCustomBlockIds(ids=>{const next=[...ids,base.id];try{localStorage.setItem('krishan.visual-studio.home-blocks.v1',JSON.stringify(next));}catch{}return next;});}setNotice(canvasMode==='site'?'Component added to live homepage draft':'New component added');
  };
  const duplicate = () => {
    if (!active) return;
    const clone = { ...active, id: uid(), text: active.text + ' (Copy)' };
    const index = blocks.findIndex(b => b.id === active.id);
    setHistory(h => [...h, blocks]); setFuture([]);
    setBlocks(current => { const next = [...current]; next.splice(index + 1, 0, clone); return next; });
    setSelected(clone.id); if(canvasMode==='site'){setHomepageCustomBlockIds(ids=>{const next=[...ids,clone.id];try{localStorage.setItem('krishan.visual-studio.home-blocks.v1',JSON.stringify(next));}catch{}return next;});} setNotice('Component duplicated');
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
  const remove = () => { if(!active)return; setHistory(h=>[...h,blocks]);setBlocks(current=>current.filter(b=>b.id!==active.id));setSelected(blocks.find(b=>b.id!==active.id)?.id??'');setHomepageCustomBlockIds(ids=>{const next=ids.filter(id=>id!==active.id);try{localStorage.setItem('krishan.visual-studio.home-blocks.v1',JSON.stringify(next));}catch{}return next;});setNotice('Component removed from draft'); };
  const move = (id:string,dir:-1|1) => { const i=blocks.findIndex(b=>b.id===id),j=i+dir;if(j<0||j>=blocks.length)return;setHistory(h=>[...h,blocks]);setBlocks(current=>{const next=[...current];[next[i],next[j]]=[next[j],next[i]];return next;}); };
  const undo=()=>{if(!history.length)return;setFuture(f=>[blocks,...f]);setBlocks(history[history.length-1]);setHistory(h=>h.slice(0,-1));setNotice('Undo applied');};
  const redo=()=>{if(!future.length)return;setHistory(h=>[...h,blocks]);setBlocks(future[0]);setFuture(f=>f.slice(1));setNotice('Redo applied');};
  
  const onDrop=(event:React.DragEvent<HTMLDivElement>,index:number)=>{event.preventDefault();const kind=event.dataTransfer.getData('application/krishan-block') as Kind;if(kind&&palette.some(p=>p.kind===kind))add(kind,index);};
  const canvasWidth=device==='mobile'?'390px':device==='tablet'?'768px':'100%';
  const renderBlock=(b:Block,index:number)=> { if (b.responsive?.[device]?.hidden) return null; const responsiveFontSize=b.responsive?.[device]?.fontSize ?? b.size; return <div key={b.id} onClick={()=>{if(!previewMode)setSelected(b.id)}} onDragOver={e=>{if(!previewMode)e.preventDefault()}} onDrop={e=>{if(!previewMode)onDrop(e,index)}} className={`group relative my-0 border-0 p-0 transition-all duration-150 ${previewMode?'outline-none':selected===b.id?'z-[1] rounded-lg outline outline-2 outline-sky-500 outline-offset-4':'hover:outline hover:outline-1 hover:outline-slate-300 hover:outline-offset-2'}`} style={{background:['card','columns','spacer'].includes(b.kind)?(b.background??'transparent'):'transparent',textAlign:b.align??'left'}}>
    {!previewMode&&selected===b.id&&<div className="absolute -top-3 right-2 z-10 flex items-center gap-1 rounded-lg bg-sky-700 px-2 py-1 text-[10px] font-bold text-white shadow"><GripVertical className="h-3 w-3"/>{b.kind.toUpperCase()}<button onClick={e=>{e.stopPropagation();move(b.id,-1)}} title="Move up"><ChevronUp className="h-3 w-3"/></button><button onClick={e=>{e.stopPropagation();move(b.id,1)}} title="Move down"><ChevronDown className="h-3 w-3"/></button></div>}
    {b.kind==='heading'?<div contentEditable={!previewMode} suppressContentEditableWarning onBlur={e=>update(b.id,{text:e.currentTarget.textContent??''})} className="mx-auto max-w-5xl leading-tight tracking-tight py-2" style={{fontSize:responsiveFontSize,color:b.color??'#123b75',fontWeight:800,outline:'none'}}>{b.text}</div>
    :b.kind==='text'?<p contentEditable={!previewMode} suppressContentEditableWarning onBlur={e=>update(b.id,{text:e.currentTarget.textContent??''})} className="mx-auto max-w-4xl py-1 leading-8" style={{fontSize:responsiveFontSize,color:b.color??'#475569',outline:'none',lineHeight:1.75}}>{b.text}</p>
    :b.kind==='button'?<span contentEditable={!previewMode} suppressContentEditableWarning onBlur={e=>update(b.id,{text:e.currentTarget.textContent??''})} className="inline-flex min-h-12 items-center justify-center rounded-xl px-7 py-3 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md" style={{background:b.background??'#123b75',color:b.color??'#ffffff',fontWeight:700,outline:'none'}}>{b.text}</span>
    :b.kind==='image'?b.imageUrl?<img src={b.imageUrl} alt={b.altText??b.text} className="mx-auto max-h-[520px] w-full rounded-xl" style={{objectFit:b.fit??'contain'}}/>:<div className="grid min-h-64 place-items-center rounded-2xl border border-dashed border-slate-300 bg-gradient-to-br from-slate-50 to-sky-50 px-6 text-center text-sm text-slate-500"><div><ImageIcon className="mx-auto mb-3 h-9 w-9 text-slate-400"/><span className="font-semibold text-slate-600">Your image goes here</span><p className="mt-1 text-xs text-slate-400">Choose an image from Media Library</p></div></div>
    :b.kind==='card'||b.kind==='columns'?<div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm sm:p-7" style={{background:b.background??'#ffffff'}}><div contentEditable={!previewMode} suppressContentEditableWarning onBlur={e=>update(b.id,{text:e.currentTarget.textContent??''})} className="text-base font-bold tracking-tight" style={{color:b.color??'#172b4d'}}>{b.text}</div><p contentEditable={!previewMode} suppressContentEditableWarning onBlur={e=>update(b.id,{subtitle:e.currentTarget.textContent??''})} className="mt-2 text-sm leading-7 text-slate-600">{b.subtitle??'Add a supporting description here.'}</p></div>
    :b.kind==='video'?b.imageUrl?<video src={b.imageUrl} controls className="mx-auto max-h-[520px] w-full rounded-xl bg-black"/>:<div className="grid min-h-64 place-items-center rounded-2xl bg-slate-950 text-white shadow-inner"><div className="text-center"><div className="mx-auto mb-3 grid h-14 w-14 place-items-center rounded-full bg-white/10"><Video className="h-7 w-7"/></div><span className="text-sm font-semibold">Video section</span><p className="mt-1 text-xs text-slate-400">Choose a video from Media Library</p></div></div>
    :b.kind==='divider'?<hr className="border-slate-300"/>
    :<div className="h-10 rounded bg-slate-100"/>}
  </div>; };
  return <div className="min-h-[80vh] space-y-4">
    <header className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div><div className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-wider text-sky-700"><Sparkles className="h-4 w-4"/>Krishan Sir Visual Studio</div><h2 className="mt-1 text-xl font-extrabold text-slate-900">Drag & Drop Website Builder</h2><p className="mt-1 text-xs text-slate-500">{notice} · Separate development preview</p><div className="mt-2 inline-flex rounded-lg border border-slate-200 bg-slate-50 p-1"><button onClick={()=>{setCanvasMode('site');setPreviewMode(false);}} className={`rounded-md px-3 py-1.5 text-[10px] font-bold ${canvasMode==='site'?'bg-sky-900 text-white shadow-sm':'text-slate-600 hover:bg-white'}`}>Live Website</button><button onClick={()=>{setCanvasMode('draft');setPreviewMode(false);}} className={`rounded-md px-3 py-1.5 text-[10px] font-bold ${canvasMode==='draft'?'bg-sky-900 text-white shadow-sm':'text-slate-600 hover:bg-white'}`}>Draft Canvas</button></div></div>
      <div className="flex flex-wrap items-center gap-2">
        {!previewMode&&canvasMode==='draft'&&<><button onClick={undo} disabled={!history.length} className="rounded-lg border p-2 disabled:opacity-40" title="Undo"><Undo2 className="h-4 w-4"/></button><button onClick={redo} disabled={!future.length} className="rounded-lg border p-2 disabled:opacity-40" title="Redo"><Redo2 className="h-4 w-4"/></button></>}
        {!previewMode&&<><div className="flex rounded-lg border p-1"><button onClick={()=>setDevice('desktop')} className={`rounded p-2 ${device==='desktop'?'bg-sky-800 text-white':''}`} title="Desktop"><Monitor className="h-4 w-4"/></button><button onClick={()=>setDevice('tablet')} className={`rounded p-2 ${device==='tablet'?'bg-sky-800 text-white':''}`} title="Tablet"><Tablet className="h-4 w-4"/></button><button onClick={()=>setDevice('mobile')} className={`rounded p-2 ${device==='mobile'?'bg-sky-800 text-white':''}`} title="Mobile"><Smartphone className="h-4 w-4"/></button></div><button onClick={save} className="inline-flex items-center gap-2 rounded-lg bg-sky-900 px-3 py-2 text-xs font-bold text-white"><Save className="h-4 w-4"/>Save Draft</button></>}
        <button onClick={()=>setPreviewMode(v=>!v)} className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-bold"><Eye className="h-4 w-4"/>{previewMode?'Exit Preview':'Preview'}</button>
      </div>
    </header>
    <main className="relative min-h-[calc(100vh-185px)] overflow-hidden rounded-2xl border border-slate-200 bg-slate-100 shadow-sm">
      {canvasMode==='site' ? <div className="flex min-h-[calc(100vh-185px)] w-full justify-center overflow-auto">
        <iframe key={selectedPage+'-'+(previewMode?'preview':'edit')} ref={iframeRef} title={selectedPageInfo.label+' live website visual editor'} src={frameSrc} onLoad={()=>{setFrameReady(true);try{const path=iframeRef.current?.contentWindow?.location.pathname||'/';const match=visualPages.find(item=>item.path.replace(/\\/$/,'')===(path.replace(/\\/$/,'')||'/'));if(match)setSelectedPage(match.id);}catch{}}} className="block shrink-0 border-0 bg-white" style={{width:frameWidth,maxWidth:device==='desktop'?'100%':frameWidth,height:'calc(100vh - 185px)',minHeight:620}} />
      </div> : <div className="mx-auto w-full overflow-hidden bg-white" style={{maxWidth:canvasWidth}}>
        <div className="mb-3 flex items-center justify-between border-b border-slate-100 bg-slate-50 px-4 py-2"><div><p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">{previewMode?'Read-only draft preview':'Editable draft canvas'}</p><p className="text-xs font-bold text-slate-800">Draft page · {device}</p></div><span className="rounded-full bg-white px-3 py-1 text-[10px] text-slate-500">Not published</span></div>
        <div className="bg-[#090d14] px-3 py-1.5 text-center text-[9px] font-semibold tracking-wide text-slate-200">✦ WELCOME · FREE Online Learning · Classes 6–12 · Competitive Exams</div>
        <div className="border-b border-slate-200 bg-[#f2f7fc]"><div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6"><div className="flex items-center gap-3"><img src="/images/krishan-sir-logo.svg" alt="Krishan Sir Online" className="h-11 w-11 rounded-full border-2 border-white bg-white object-contain shadow" onError={e=>{e.currentTarget.style.display='none'}}/><div><div className="text-xl font-extrabold leading-none tracking-tight text-[#102f63]">Krishan Sir</div><div className="mt-1 inline-flex rounded bg-[#087d9b] px-2 py-0.5 text-[10px] font-bold text-white">Online Learning</div><div className="mt-0.5 text-[8px] font-semibold uppercase tracking-wider text-[#24466f]">Learn · Practice · Improve · Succeed</div></div></div><nav className="flex flex-wrap items-center gap-x-4 gap-y-2 text-[11px] font-bold text-[#173d70]"><span>Home</span><span>Classes</span><span>Online Tests</span><span>Study Materials</span><span>Current Affairs</span><span>About</span></nav></div></div>
        <div onDragOver={e=>{if(!previewMode)e.preventDefault()}} onDrop={e=>{if(!previewMode)onDrop(e,blocks.length)}} className="min-h-[280px] bg-white px-5 py-8 sm:px-8" style={{maxWidth:canvasWidth}}><div className="mx-auto max-w-7xl">{blocks.map(renderBlock)}</div>{!previewMode&&<div className="mx-auto mt-6 max-w-7xl border-2 border-dashed border-sky-200 bg-sky-50/50 px-5 py-6 text-center text-xs font-medium text-sky-700">+ Add next content section</div>}</div>
        <footer className="border-t-[3px] border-cyan-500 bg-[#071b38] px-5 py-8 text-slate-300"><div className="mx-auto grid max-w-7xl gap-6 sm:grid-cols-2 lg:grid-cols-4"><div><div className="text-lg font-extrabold text-white">Krishan Sir</div><div className="text-xs font-bold text-amber-300">Online Learning</div><p className="mt-2 text-[11px] leading-5 text-slate-400">A bilingual digital learning platform for school students, teachers and competitive exam aspirants.</p></div><div><div className="text-xs font-extrabold uppercase tracking-wider text-white">Educator</div><p className="mt-2 text-[11px] leading-5">Krishan Kumar · TGT Social Science</p></div><div><div className="text-xs font-extrabold uppercase tracking-wider text-white">Quick Gateways</div><p className="mt-2 text-[11px] leading-5">Classes 6–12 · Online Tests · Study Materials · Constitution</p></div><div><div className="text-xs font-extrabold uppercase tracking-wider text-white">Learning Promise</div><p className="mt-2 text-[11px] leading-5 text-slate-400">Learn · Practice · Improve · Succeed</p></div></div></footer>
      </div>}
    </main>
    {!previewMode&&<div className="fixed bottom-5 left-1/2 z-[70] flex -translate-x-1/2 items-center gap-1.5 rounded-2xl border border-slate-200 bg-white/95 p-2 shadow-[0_12px_40px_rgba(15,23,42,0.20)] backdrop-blur">
      <button ref={componentButtonRef} type="button" aria-expanded={componentsOpen} aria-controls="visual-studio-component-menu" onClick={()=>setComponentsOpen(v=>!v)} className="inline-flex items-center gap-1.5 rounded-xl bg-sky-900 px-3 py-2.5 text-[11px] font-bold text-white hover:bg-sky-800"><Plus className="h-4 w-4"/>Components <span className="rounded-full bg-white/15 px-1.5 py-0.5 text-[9px]">{palette.length}</span></button>
      <button type="button" onClick={()=>{setPreviewMode(false);setComponentsOpen(false);setMediaOpen(v=>!v);setInspectorOpen(false);}} className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-2.5 text-[11px] font-bold ${mediaOpen?'bg-violet-100 text-violet-900':'bg-slate-100 text-slate-700 hover:bg-violet-50'}`}><ImageIcon className="h-4 w-4"/>Media</button>
      <button type="button" onClick={()=>{setPreviewMode(false);setComponentsOpen(false);setMediaOpen(false);setInspectorOpen(v=>!v);}} className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-2.5 text-[11px] font-bold ${inspectorOpen?'bg-sky-100 text-sky-900':'bg-slate-100 text-slate-700 hover:bg-sky-50'}`}><Settings2 className="h-4 w-4"/>Inspector</button>
    </div>}
    {!previewMode&&componentsOpen&&createPortal(<div ref={componentMenuRef} id="visual-studio-component-menu" role="dialog" aria-label="Add components" className="fixed z-[99999] max-h-[min(70vh,560px)] overflow-y-auto overscroll-contain rounded-xl border border-slate-200 bg-white p-2 shadow-[0_18px_48px_rgba(15,23,42,0.28)]" style={{left:componentMenuPosition.left,top:componentMenuPosition.top,width:componentMenuPosition.width}}><div className="mb-2 flex items-center justify-between border-b border-slate-100 px-1 pb-2"><span className="text-[11px] font-extrabold text-slate-800">{canvasMode==='site'?'Add to homepage':'Add a component'}</span><button type="button" onClick={()=>setComponentsOpen(false)} className="rounded-md px-2 py-1 text-xs text-slate-500 hover:bg-slate-100">Esc ✕</button></div>{canvasMode==='draft'&&<label className="mb-2 block text-[10px] font-semibold text-slate-600">Starter template<select value={templateName} onChange={e=>applyTemplate(e.target.value)} className="mt-1 w-full rounded-lg border p-2 text-xs"><option>Education Portal</option><option>Course Landing Page</option><option>Announcement Page</option></select></label>}<div className="grid grid-cols-1 gap-1">{palette.map(p=>{const Icon=p.icon;return <button key={p.kind} draggable onDragStart={e=>e.dataTransfer.setData('application/krishan-block',p.kind)} onClick={()=>{add(p.kind);setPreviewMode(false);setComponentsOpen(false);}} className="flex w-full items-center gap-3 rounded-lg border border-transparent bg-white p-2.5 text-left transition hover:border-sky-200 hover:bg-sky-50"><span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-sky-50"><Icon className="h-4 w-4 text-sky-800"/></span><span className="min-w-0 flex-1"><span className="block text-xs font-bold leading-4 text-slate-800">{p.label}</span><span className="block text-[10px] leading-4 text-slate-500">{p.hint}</span></span><Plus className="h-3.5 w-3.5 shrink-0 text-slate-400"/></button>})}</div></div>,document.body)}
    {!previewMode&&mediaOpen&&createPortal(<section className="fixed bottom-20 left-1/2 z-[80] max-h-[min(70vh,620px)] w-[min(360px,calc(100vw-24px))] -translate-x-1/2 overflow-y-auto rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_18px_48px_rgba(15,23,42,0.24)]"><div className="mb-3 flex items-center justify-between"><div><h3 className="text-sm font-extrabold text-slate-900">Media Library</h3><p className="text-[10px] text-slate-500">Private · Admin-only · Max 50 MB</p></div><button onClick={()=>setMediaOpen(false)} className="rounded-lg border px-2 py-1 text-xs">Close ✕</button></div><input value={mediaAlt} onChange={e=>setMediaAlt(e.target.value)} placeholder="Alt text / accessible description" className="mb-2 w-full rounded-lg border p-2 text-[11px]"/><label className="block cursor-pointer rounded-lg border border-dashed border-violet-300 bg-violet-50 p-3 text-center text-[11px] font-bold text-violet-900">{mediaBusy?'Uploading…':'Upload Image / Video'}<input type="file" accept="image/jpeg,image/png,image/webp,image/gif,image/avif,video/mp4,video/webm" disabled={mediaBusy} className="hidden" onChange={e=>{const file=e.target.files?.[0];if(file)void uploadMedia(file);e.currentTarget.value='';}}/></label>{mediaError&&<p role="alert" className="mt-2 rounded-lg bg-rose-50 p-2 text-[10px] text-rose-700">{mediaError}</p>}{mediaLoading?<p className="py-4 text-center text-xs text-slate-500">Loading media…</p>:mediaItems.length===0?<p className="py-4 text-center text-xs text-slate-400">No media uploaded yet.</p>:<div className="mt-3 grid grid-cols-2 gap-2">{mediaItems.map(asset=><div key={asset.path} className="overflow-hidden rounded-lg border border-slate-200 bg-white"><div className="grid h-20 place-items-center bg-slate-100">{asset.type==='image'?<img src={asset.url} alt={asset.name} className="h-full w-full object-cover"/>:<Video className="h-7 w-7 text-slate-500"/>}</div><p className="truncate px-2 pt-1 text-[9px] text-slate-600">{asset.name}</p><button onClick={()=>{insertMedia(asset);setMediaOpen(false);}} className="m-1 w-[calc(100%-8px)] rounded-md bg-sky-900 p-1.5 text-[10px] font-bold text-white">Insert</button></div>)}</div>}<button onClick={()=>void loadMedia()} disabled={mediaLoading} className="mt-3 w-full rounded-lg border p-2 text-[10px] font-bold text-slate-600">Refresh Library</button></section>,document.body)}
    {!previewMode&&inspectorOpen&&createPortal(<aside className="fixed bottom-20 right-4 z-[80] max-h-[min(75vh,700px)] w-[min(340px,calc(100vw-24px))] overflow-y-auto rounded-2xl border border-slate-200 bg-white p-3 shadow-[0_18px_48px_rgba(15,23,42,0.24)]">
      <div className="mb-3 flex items-center justify-between"><h3 className="flex items-center gap-2 text-sm font-extrabold"><Settings2 className="h-4 w-4"/>{canvasMode==='site'?'Homepage Inspector':'Draft Inspector'}</h3><button onClick={()=>setInspectorOpen(false)} className="rounded-lg border px-2 py-1 text-xs">Close ✕</button></div>
      {canvasMode==='site'&&!homepageCustomBlockIds.includes(selected)?<div className="space-y-3">
        <div className="rounded-xl border border-sky-100 bg-sky-50 p-3"><div className="text-[10px] font-bold uppercase tracking-wider text-sky-700">Selected live-site section</div><div className="mt-1 text-sm font-extrabold text-slate-900">{HOME_SECTION_LABELS[selectedHomepageSection]}</div><p className="mt-1 text-[10px] leading-4 text-slate-600">यह मौजूदा Homepage का वास्तविक React section है। इसे Canvas पर पकड़कर ऊपर/नीचे खिसकाएँ या नीचे क्रम बदलें।</p></div>
        <label className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 p-3 text-xs font-semibold text-slate-700"><span>Show this section on Homepage</span><input type="checkbox" checked={!hiddenHomepageSections.includes(selectedHomepageSection)} onChange={()=>toggleHomepageSection(selectedHomepageSection)} className="h-4 w-4 accent-sky-800"/></label>
        <div className="grid grid-cols-2 gap-2"><button onClick={()=>moveHomepageSection(selectedHomepageSection,-1)} disabled={homepageOrder.indexOf(selectedHomepageSection)<=0} className="rounded-lg border p-2 text-xs font-bold disabled:opacity-40"><ChevronUp className="mr-1 inline h-3.5 w-3.5"/>Move Up</button><button onClick={()=>moveHomepageSection(selectedHomepageSection,1)} disabled={homepageOrder.indexOf(selectedHomepageSection)>=homepageOrder.length-1} className="rounded-lg border p-2 text-xs font-bold disabled:opacity-40"><ChevronDown className="mr-1 inline h-3.5 w-3.5"/>Move Down</button></div>
        <div className="border-t border-slate-100 pt-3"><h4 className="mb-2 flex items-center gap-2 text-xs font-extrabold"><Layers className="h-4 w-4"/>Homepage Sections · Drag to reorder</h4><div className="space-y-1">{homepageOrder.map((id,index)=><div key={id} className={`flex items-center gap-1 rounded-lg border p-1.5 ${selectedHomepageSection===id?'border-sky-300 bg-sky-50':'border-slate-100'}`}><button onClick={()=>setSelectedHomepageSection(id)} className="min-w-0 flex-1 truncate text-left text-[10px] font-semibold text-slate-700">{index+1}. {HOME_SECTION_LABELS[id]}</button><button onClick={()=>toggleHomepageSection(id)} title={hiddenHomepageSections.includes(id)?'Show section':'Hide section'} className={`rounded-md px-2 py-1 text-[10px] font-bold ${hiddenHomepageSections.includes(id)?'bg-rose-50 text-rose-700':'bg-emerald-50 text-emerald-700'}`}>{hiddenHomepageSections.includes(id)?'Hidden':'Visible'}</button><button onClick={()=>moveHomepageSection(id,-1)} disabled={index===0} className="rounded p-1 text-slate-500 disabled:opacity-30" title="Move up"><ChevronUp className="h-3 w-3"/></button><button onClick={()=>moveHomepageSection(id,1)} disabled={index===homepageOrder.length-1} className="rounded p-1 text-slate-500 disabled:opacity-30" title="Move down"><ChevronDown className="h-3 w-3"/></button></div>)}</div></div>
        <div className="rounded-lg bg-amber-50 p-2 text-[10px] leading-4 text-amber-900">ये बदलाव केवल इस Browser के Visual Studio Draft में सेव होते हैं। Live website अभी नहीं बदलती।</div>
      </div>:!active?<p className="text-xs text-slate-500">Select a component on the Draft Canvas.</p>:<div className="space-y-3">
        <div className="rounded-lg bg-slate-50 p-2 text-xs font-bold">{active.kind.toUpperCase()} · {active.id}</div>
        {active.kind!=='divider'&&active.kind!=='spacer'&&<label className="block text-xs font-semibold">Text / Label<input value={active.text} onChange={e=>update(active.id,{text:e.target.value})} className="mt-1 w-full rounded-lg border p-2 text-sm"/></label>}
        {['card','columns'].includes(active.kind)&&<label className="block text-xs font-semibold">Description<input value={active.subtitle??''} onChange={e=>update(active.id,{subtitle:e.target.value})} className="mt-1 w-full rounded-lg border p-2 text-sm"/></label>}
        <label className="block text-xs font-semibold">Text colour<input type="color" value={active.color??'#24364b'} onChange={e=>update(active.id,{color:e.target.value})} className="mt-1 h-9 w-full"/></label>
        <label className="block text-xs font-semibold">Background<input type="color" value={active.background??'#ffffff'} onChange={e=>update(active.id,{background:e.target.value})} className="mt-1 h-9 w-full"/></label>
        <label className="block text-xs font-semibold">Font size · {active.size??16}px<input type="range" min="10" max="56" value={active.size??16} onChange={e=>update(active.id,{size:Number(e.target.value)})} className="mt-1 w-full"/></label>
        <label className="block text-xs font-semibold">Alignment<select value={active.align??'left'} onChange={e=>update(active.id,{align:e.target.value as Block['align']})} className="mt-1 w-full rounded-lg border p-2 text-sm"><option value="left">Left</option><option value="center">Center</option><option value="right">Right</option></select></label>
        <div className="rounded-xl border border-sky-100 bg-sky-50/60 p-3"><div className="mb-2 flex items-center justify-between"><span className="text-xs font-extrabold text-sky-900">Responsive override</span><span className="rounded-full bg-white px-2 py-1 text-[10px] font-bold uppercase text-sky-800">{device}</span></div><label className="block text-xs font-semibold">Font size on {device} · {active.responsive?.[device]?.fontSize ?? active.size ?? 16}px<input type="range" min="10" max="56" value={active.responsive?.[device]?.fontSize ?? active.size ?? 16} onChange={e=>update(active.id,{responsive:{...active.responsive,[device]:{...active.responsive?.[device],fontSize:Number(e.target.value)}}})} className="mt-1 w-full"/></label><label className="mt-3 flex items-center gap-2 text-xs font-semibold"><input type="checkbox" checked={!!active.responsive?.[device]?.hidden} onChange={e=>update(active.id,{responsive:{...active.responsive,[device]:{...active.responsive?.[device],hidden:e.target.checked}}})}/>Hide this component on {device}</label><button onClick={()=>{const responsive={...active.responsive};delete responsive[device];update(active.id,{responsive});}} className="mt-3 w-full rounded-lg border border-sky-200 bg-white p-2 text-[11px] font-bold text-sky-800">Reset {device} overrides</button></div>
        <button onClick={duplicate} className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-sky-50 p-2 text-xs font-bold text-sky-800"><Copy className="h-4 w-4"/>Duplicate component</button><button onClick={remove} className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-rose-50 p-2 text-xs font-bold text-rose-700"><Trash2 className="h-4 w-4"/>Remove selected component</button>
      </div>}
    </aside>,document.body)}

    {!previewMode&&<div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs leading-5 text-amber-900"><strong>Integration safety:</strong> यह अलग Visual Studio prototype है। Autosave और manual Draft अभी इसी browser में काम करते हैं; Templates, Preview, Duplicate और Undo/Redo उपलब्ध हैं। वास्तविक Live website, Online Test Engine या Production Database पर कोई बदलाव नहीं होता। Production integration approval और mapping tests के बाद होगी।</div>}
  </div>;
};
