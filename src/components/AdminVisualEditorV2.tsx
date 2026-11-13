import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, Monitor, Smartphone, MousePointer2, LockKeyhole, Info } from 'lucide-react';
import { VISUAL_EDITOR_V2_PAGES } from '../visual-editor-v2/registry';
import { DEFAULT_V2_STYLE, type VisualEditorV2Style, isSafeV2Selector } from '../visual-editor-v2/schema';

type SelectedNode = { tag: string; text: string; selector: string };
const editable = (node: Element): node is HTMLElement =>
  ['H1','H2','H3','H4','P','LI'].includes(node.tagName) && node.children.length === 0
  && !node.closest('a,button,form,[role=button],[data-visual-editor-protected]');
function selectorFor(node: HTMLElement): string {
  const parts: string[] = [];
  let current: HTMLElement | null = node;
  while (current && current.tagName !== 'BODY') {
    const parent = current.parentElement;
    if (!parent) return '';
    const index = (Array.from(parent.children) as HTMLElement[]).filter(sibling => sibling.tagName === current!.tagName).indexOf(current) + 1;
    if (index < 1) return '';
    parts.unshift(current.tagName.toLowerCase() + ':nth-of-type(' + index + ')');
    current = parent;
  }
  return current?.tagName === 'BODY' ? ['body', ...parts].join(' > ') : '';
}
export const AdminVisualEditorV2: React.FC<{ onBack?: () => void }> = ({ onBack }) => {
  const [pageId, setPageId] = useState(VISUAL_EDITOR_V2_PAGES[0].id);
  const [device, setDevice] = useState<'desktop'|'mobile'>('desktop');
  const [selected, setSelected] = useState<SelectedNode|null>(null);
  const [frameReady, setFrameReady] = useState(false);
  const [style, setStyle] = useState<VisualEditorV2Style>(DEFAULT_V2_STYLE);
  const [notice, setNotice] = useState('पहले Preview में किसी सामान्य Heading या Paragraph को चुनें।');
  const frame = useRef<HTMLIFrameElement>(null);
  const page = useMemo(() => VISUAL_EDITOR_V2_PAGES.find(item => item.id === pageId)!, [pageId]);
  const src = page.path === '/' ? import.meta.env.BASE_URL : import.meta.env.BASE_URL + page.path.replace(/^\\//, '');
  useEffect(() => { setSelected(null); setFrameReady(false); setNotice('नया पेज लोड हो रहा है।'); }, [pageId]);
  useEffect(() => {
    const doc = frame.current?.contentDocument;
    if (!doc) return;
    const handle = (event: MouseEvent) => {
      const target = event.target as Element | null;
      if (!target || typeof target.closest !== 'function') return;
      const candidate = target.closest<HTMLElement>('h1,h2,h3,h4,p,li');
      if (!candidate || !editable(candidate) || !candidate.textContent?.trim()) return;
      const selector = selectorFor(candidate);
      if (!isSafeV2Selector(selector)) return;
      event.preventDefault(); event.stopPropagation(); event.stopImmediatePropagation();
      const computed = doc.defaultView?.getComputedStyle(candidate);
      if (computed) setStyle({
        color: /^#[0-9a-f]{6}$/i.test(computed.color) ? computed.color : DEFAULT_V2_STYLE.color,
        backgroundColor: /^#[0-9a-f]{6}$/i.test(computed.backgroundColor) ? computed.backgroundColor : DEFAULT_V2_STYLE.backgroundColor,
        fontSize: Math.min(48, Math.max(8, parseFloat(computed.fontSize)||16)),
        fontWeight: (['400','500','600','700','800'].includes(computed.fontWeight) ? computed.fontWeight : '400') as VisualEditorV2Style['fontWeight'],
        textAlign: (['left','center','right'].includes(computed.textAlign) ? computed.textAlign : 'left') as VisualEditorV2Style['textAlign'],
        marginTop: Math.min(80, Math.max(0, parseFloat(computed.marginTop)||0)),
        marginBottom: Math.min(80, Math.max(0, parseFloat(computed.marginBottom)||0)),
        padding: Math.min(40, Math.max(0, parseFloat(computed.paddingTop)||0)),
        borderRadius: Math.min(32, Math.max(0, parseFloat(computed.borderRadius)||0)),
      });
      setSelected({ tag: candidate.tagName.toLowerCase(), text: candidate.textContent ?? '', selector });
      setNotice('Element चुना गया। बदलाव अभी केवल Preview में लागू होंगे।');
    };
    doc.addEventListener('click', handle, true);
    return () => doc.removeEventListener('click', handle, true);
  }, [pageId, frameReady]);
  const applyPreview = () => {
    if (!selected || !isSafeV2Selector(selected.selector)) return;
    const node = frame.current?.contentDocument?.querySelector(selected.selector);
    if (!node || !editable(node)) { setNotice('चुना गया Element अब उपलब्ध नहीं है।'); return; }
    node.textContent = selected.text.slice(0,2000);
    const target = node as HTMLElement;
    target.style.color = style.color; target.style.backgroundColor = style.backgroundColor;
    target.style.fontSize = style.fontSize + 'px'; target.style.fontWeight = style.fontWeight;
    target.style.textAlign = style.textAlign; target.style.marginTop = style.marginTop + 'px';
    target.style.marginBottom = style.marginBottom + 'px'; target.style.padding = style.padding + 'px';
    target.style.borderRadius = style.borderRadius + 'px';
    setNotice('Preview में बदलाव लागू हुआ। अभी Cloud Draft या Live Website में सेव नहीं हुआ।');
  };
  return <div className="min-h-[70vh] space-y-4 rounded-2xl bg-slate-50 p-3 sm:p-5">
    <div className="flex flex-wrap items-center justify-between gap-3"><div className="flex items-center gap-2"><button onClick={onBack} className="rounded-lg border bg-white p-2" aria-label="Back"><ArrowLeft className="h-4 w-4"/></button><div><p className="text-[10px] font-bold uppercase tracking-wider text-sky-700">New Visual Editor · Phase 1</p><h2 className="text-xl font-extrabold text-slate-900">Website Design Studio</h2></div></div><div className="flex gap-2"><button onClick={()=>setDevice('desktop')} className={'rounded-lg border p-2 '+(device==='desktop'?'bg-slate-900 text-white':'bg-white')}><Monitor className="h-4 w-4"/></button><button onClick={()=>setDevice('mobile')} className={'rounded-lg border p-2 '+(device==='mobile'?'bg-slate-900 text-white':'bg-white')}><Smartphone className="h-4 w-4"/></button></div></div>
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_300px]"><section className="min-w-0 rounded-xl border bg-white p-3"><div className="mb-3 flex flex-wrap items-center justify-between gap-2"><label className="text-xs font-bold text-slate-700">पेज चुनें<select value={pageId} onChange={e=>setPageId(e.target.value as typeof pageId)} className="ml-2 rounded-lg border px-3 py-2">{VISUAL_EDITOR_V2_PAGES.map(item=><option key={item.id} value={item.id}>{item.label}</option>)}</select></label><span className="text-[10px] text-slate-500">Actual website · Preview only</span></div><div className="mx-auto overflow-hidden rounded-xl border bg-slate-100" style={{width:device==='mobile'?'min(100%,390px)':'100%'}}><iframe key={pageId} ref={frame} title={'Website preview: '+page.label} src={src} onLoad={()=>{setFrameReady(true);setNotice('पेज तैयार है। Heading या Paragraph चुनें।');}} className="h-[68vh] min-h-[520px] w-full bg-white"/></div></section>
    <aside className="space-y-3 rounded-xl border bg-white p-4"><div className="flex items-center gap-2 text-sm font-extrabold"><MousePointer2 className="h-4 w-4 text-sky-700"/>Element Inspector</div>{selected?<><div className="rounded-lg bg-sky-50 p-3"><p className="text-[10px] font-bold uppercase text-sky-800">Selected · {selected.tag}</p><textarea value={selected.text} onChange={e=>setSelected({...selected,text:e.target.value.slice(0,2000)})} rows={4} maxLength={2000} className="mt-2 w-full rounded-lg border bg-white p-2 text-sm"/></div><label className="block text-xs">Text Color<input type="color" value={style.color} onChange={e=>setStyle({...style,color:e.target.value})} className="mt-1 block h-9 w-full"/></label><label className="block text-xs">Background<input type="color" value={style.backgroundColor} onChange={e=>setStyle({...style,backgroundColor:e.target.value})} className="mt-1 block h-9 w-full"/></label><label className="block text-xs">Font Size · {style.fontSize}px<input type="range" min="8" max="48" value={style.fontSize} onChange={e=>setStyle({...style,fontSize:Number(e.target.value)})} className="mt-1 w-full"/></label><label className="block text-xs">Font Weight<select value={style.fontWeight} onChange={e=>setStyle({...style,fontWeight:e.target.value as VisualEditorV2Style['fontWeight']})} className="mt-1 w-full rounded-lg border p-2">{['400','500','600','700','800'].map(value=><option key={value}>{value}</option>)}</select></label><label className="block text-xs">Text Alignment<select value={style.textAlign} onChange={e=>setStyle({...style,textAlign:e.target.value as VisualEditorV2Style['textAlign']})} className="mt-1 w-full rounded-lg border p-2">{['left','center','right'].map(value=><option key={value}>{value}</option>)}</select></label><button onClick={applyPreview} className="w-full rounded-lg bg-sky-900 px-3 py-2.5 text-xs font-bold text-white">Apply to Preview</button></>:<div className="rounded-lg border border-dashed p-4 text-center text-xs text-slate-500">किसी Heading, Paragraph या List Text पर क्लिक करें।</div>}<div className="rounded-lg bg-amber-50 p-3 text-[11px] leading-5 text-amber-900"><LockKeyhole className="mr-1 inline h-3.5 w-3.5"/>Test, Login, Results और interactive controls इस Editor से सुरक्षित रखे गए हैं।</div><p className="text-[10px] leading-4 text-slate-500"><Info className="mr-1 inline h-3 w-3"/>{notice}</p></aside></div>
    <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">यह नया Editor अभी isolated Preview milestone है। Cloud Save, Version History और Publish तब जोड़े जाएँगे जब Preview Editing और security tests सफल होंगे।</div>
  </div>;
};
