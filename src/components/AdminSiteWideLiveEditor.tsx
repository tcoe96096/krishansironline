import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AlignLeft, Columns2, Image as ImageIcon, Minus, MousePointerClick, MoveVertical, Plus, Settings2, Square, Type, Video } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { getWebsiteConfigVersions, saveWebsiteConfigDraft, type WebsiteConfig } from '../services/siteConfigService';

type Kind = 'heading' | 'text' | 'button' | 'image' | 'card' | 'columns' | 'video' | 'divider' | 'spacer';
type Media = { name: string; path: string; type: 'image' | 'video'; url: string };
type Added = { id: string; kind: Kind; text: string; parentSelector: string; mediaPath?: string; altText?: string };
type StyleDraft = { color: string; backgroundColor: string; fontSize: number; fontWeight: string; textAlign: 'left' | 'center' | 'right' | 'justify'; marginTop: number; marginBottom: number; padding: number; borderRadius: number; width: number; minHeight: number };
type Override = { selector: string; text: string; textEditable: boolean; style: StyleDraft };
type Draft = { version: 1; pages: Record<string, Record<string, Override>>; addedComponents?: Record<string, Added[]> };
type Selected = { tag: string; text: string; selector: string; width: number; height: number; textEditable: boolean };

const defaults: StyleDraft = { color: '#18263b', backgroundColor: '#ffffff', fontSize: 16, fontWeight: '400', textAlign: 'left', marginTop: 0, marginBottom: 0, padding: 0, borderRadius: 0, width: 0, minHeight: 0 };
const palette: { kind: Kind; label: string; hint: string; icon: React.ElementType }[] = [
  { kind: 'heading', label: 'Heading', hint: 'Section title or headline', icon: Type },
  { kind: 'text', label: 'Text', hint: 'Paragraph or description', icon: AlignLeft },
  { kind: 'button', label: 'Button', hint: 'Call-to-action button', icon: MousePointerClick },
  { kind: 'image', label: 'Image', hint: 'Add an image block', icon: ImageIcon },
  { kind: 'card', label: 'Card', hint: 'Content card', icon: Square },
  { kind: 'columns', label: 'Columns', hint: 'Two-column section', icon: Columns2 },
  { kind: 'video', label: 'Video', hint: 'Video placeholder', icon: Video },
  { kind: 'divider', label: 'Divider', hint: 'Horizontal separator', icon: Minus },
  { kind: 'spacer', label: 'Spacer', hint: 'Vertical spacing', icon: MoveVertical },
];
const safeSelector = (selector: string) => {
  const parts = selector.split(' > ');
  return parts[0] === 'body' && parts.length > 1 && parts.slice(1).every(part => /^[a-z][a-z0-9-]*:nth-of-type\([1-9]\d*\)$/i.test(part));
};
const selectorFor = (element: HTMLElement) => {
  const parts: string[] = [];
  let current: HTMLElement | null = element;
  while (current && current.tagName.toLowerCase() !== 'body') {
    const parentElement: HTMLElement | null = current.parentElement;
    if (!parentElement) break;
    const siblings = Array.from(parentElement.children) as HTMLElement[];
    const index = siblings.filter(item => item.tagName === current!.tagName).indexOf(current) + 1;
    parts.unshift(current.tagName.toLowerCase() + ':nth-of-type(' + index + ')');
    current = parentElement;
  }
  return ['body', ...parts].join(' > ');
};
const protectedElement = (element: Element) => Boolean(element.closest('form,input,textarea,select,[role=button],[data-visual-editor-protected],[data-visual-editor-ui]'));
const textLeaf = (element: Element) => ['H1','H2','H3','H4','H5','H6','P','LI','SPAN','STRONG','EM','BUTTON','A'].includes(element.tagName) && element.children.length === 0 && Boolean(element.textContent?.trim()) && !protectedElement(element);
const selectable = (element: Element) => !['HTML','BODY','SCRIPT','STYLE','INPUT','TEXTAREA','SELECT','OPTION','SVG'].includes(element.tagName) && !protectedElement(element);
const hex = (value: string, fallback: string) => {
  if (/^#[0-9a-f]{6}$/i.test(value)) return value;
  const match = value.match(/^rgba?\((\d+),\s*(\d+),\s*(\d+)/i);
  return match ? '#' + match.slice(1, 4).map(part => Number(part).toString(16).padStart(2, '0')).join('') : fallback;
};

export const AdminSiteWideLiveEditor: React.FC<{ src: string; pageId: string; pageLabel: string; mobile?: boolean }> = ({ src, pageId, pageLabel, mobile = false }) => {
  const { user, isAdmin } = useAuth();
  const iframe = useRef<HTMLIFrameElement>(null);
  const targetRef = useRef<HTMLElement | null>(null);
  const originalStyleRef = useRef<string | null>(null);
  const originalOutlineRef = useRef('');
  const [ready, setReady] = useState(false);
  const [selected, setSelected] = useState<Selected | null>(null);
  const [style, setStyle] = useState<StyleDraft>(defaults);
  const [draft, setDraft] = useState<Draft>({ version: 1, pages: {}, addedComponents: {} });
  const [status, setStatus] = useState('Cloud Draft loading…');
  const [notice, setNotice] = useState('');
  const [saving, setSaving] = useState(false);
  const [componentsOpen, setComponentsOpen] = useState(false);
  const [mediaOpen, setMediaOpen] = useState(false);
  const [inspectorOpen, setInspectorOpen] = useState(true);
  const [media, setMedia] = useState<Media[]>([]);
  const [mediaLoading, setMediaLoading] = useState(false);
  const [mediaBusy, setMediaBusy] = useState(false);
  const [mediaError, setMediaError] = useState('');
  const [mediaAlt, setMediaAlt] = useState('');
  const [toolbarPos, setToolbarPos] = useState({ x: Math.max(12, Math.round((window.innerWidth - 360) / 2)), y: Math.max(12, window.innerHeight - 90) });
  const [componentsPos, setComponentsPos] = useState({ x: 16, y: 100 });
  const [mediaPos, setMediaPos] = useState({ x: 16, y: 100 });
  const [inspectorPos, setInspectorPos] = useState({ x: Math.max(12, window.innerWidth - 360), y: 100 });
  const dragPanel = (event: React.PointerEvent<HTMLElement>, setter: React.Dispatch<React.SetStateAction<{x:number;y:number}>>) => {
    if ((event.target as HTMLElement).closest('button,input,select,textarea,label')) return;
    event.preventDefault();
    const startX = event.clientX, startY = event.clientY;
    const dragTarget = event.currentTarget.dataset.visualEditorUi === 'toolbar' ? event.currentTarget : event.currentTarget.parentElement as HTMLElement;
    const origin = dragTarget.getBoundingClientRect();
    const move = (e: PointerEvent) => setter({ x: Math.max(0, Math.min(window.innerWidth - 80, origin.left + e.clientX - startX)), y: Math.max(0, Math.min(window.innerHeight - 48, origin.top + e.clientY - startY)) });
    const stop = () => { window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', stop); };
    window.addEventListener('pointermove', move); window.addEventListener('pointerup', stop, { once: true });
  };


  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const history = await getWebsiteConfigVersions();
        if (!active) return;
        const latest = history.find(item => item.status === 'draft') || history.find(item => item.status === 'published');
        const saved = latest?.config.visualEditor as Draft | undefined;
        if (saved?.version === 1 && saved.pages && typeof saved.pages === 'object') setDraft({ version: 1, pages: saved.pages, addedComponents: saved.addedComponents || {} });
        setStatus(latest ? 'Cloud Draft · Version ' + latest.version_number : 'Cloud Draft अभी खाली है');
      } catch (error) {
        if (active) setStatus(error instanceof Error ? error.message : 'Cloud Draft load नहीं हुआ');
      }
    })();
    return () => { active = false; };
  }, []);

  useEffect(() => { setReady(false); setSelected(null); targetRef.current = null; }, [src, pageId]);

  const addDomNode = (doc: Document, item: Added, mediaUrl?: string) => {
    if (!safeSelector(item.parentSelector) || doc.querySelector('[data-builder-component-id="' + item.id + '"]')) return;
    const parent = doc.querySelector(item.parentSelector);
    if (!parent) return;
    let node: HTMLElement;
    if (item.kind === 'image') {
      const img = doc.createElement('img');
      img.src = mediaUrl || ''; img.alt = item.altText || item.text;
      img.style.cssText = 'display:block;max-width:100%;max-height:420px;object-fit:contain;border-radius:12px;margin:16px 0;';
      node = img;
    } else if (item.kind === 'divider') {
      const hr = doc.createElement('hr'); hr.style.cssText = 'margin:24px 0;border:0;border-top:1px solid #cbd5e1;'; node = hr;
    } else if (item.kind === 'spacer') {
      const spacer = doc.createElement('div'); spacer.style.cssText = 'height:32px;'; spacer.setAttribute('aria-hidden', 'true'); node = spacer;
    } else if (item.kind === 'button') {
      const button = doc.createElement('button'); button.type = 'button'; button.textContent = item.text; button.style.cssText = 'display:inline-flex;padding:10px 18px;border:0;border-radius:10px;background:#0b3979;color:white;font-weight:700;margin:12px 0;'; node = button;
    } else if (item.kind === 'heading') {
      const h = doc.createElement('h2'); h.textContent = item.text; h.style.cssText = 'font-size:28px;font-weight:800;color:#0b3979;margin:20px 0 12px;'; node = h;
    } else if (item.kind === 'text') {
      const p = doc.createElement('p'); p.textContent = item.text; p.style.cssText = 'font-size:16px;line-height:1.7;color:#334155;margin:12px 0;'; node = p;
    } else if (item.kind === 'columns') {
      const div = doc.createElement('div'); div.textContent = item.text + '  |  Second column'; div.style.cssText = 'display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:16px;padding:18px;background:#eff6ff;border-radius:14px;margin:16px 0;'; node = div;
    } else if (item.kind === 'video') {
      const div = doc.createElement('div'); div.textContent = 'Video block · ' + item.text; div.style.cssText = 'display:grid;place-items:center;min-height:160px;background:#0f172a;color:white;border-radius:14px;margin:16px 0;padding:20px;'; node = div;
    } else {
      const section = doc.createElement('section'); section.textContent = item.text; section.style.cssText = 'padding:20px;background:#f1f5f9;border:1px solid #dbe5f0;border-radius:16px;margin:16px 0;'; node = section;
    }
    node.dataset.builderComponentId = item.id;
    parent.appendChild(node);
  };

  useEffect(() => {
    if (!ready) return;
    const doc = iframe.current?.contentDocument;
    if (!doc) return;
    Object.values(draft.pages[pageId] || {}).forEach(item => {
      if (!safeSelector(item.selector)) return;
      const element = doc.querySelector(item.selector) as HTMLElement | null;
      if (!element || protectedElement(element)) return;
      if (item.textEditable && textLeaf(element)) element.textContent = (item.text || '').slice(0, 2000);
      const s = item.style;
      element.style.color = s.color; element.style.backgroundColor = s.backgroundColor;
      element.style.fontSize = Math.min(72, Math.max(8, s.fontSize)) + 'px';
      element.style.fontWeight = s.fontWeight; element.style.textAlign = s.textAlign;
      element.style.marginTop = s.marginTop + 'px'; element.style.marginBottom = s.marginBottom + 'px';
      element.style.padding = s.padding + 'px'; element.style.borderRadius = s.borderRadius + 'px';
      element.style.width = s.width > 0 ? s.width + 'px' : '';
      element.style.minHeight = s.minHeight > 0 ? s.minHeight + 'px' : '';
    });
    (draft.addedComponents?.[pageId] || []).forEach(item => {
      const client = supabase;
      if (item.mediaPath && client && user?.id) {
        void client.storage.from('visual-studio-media').createSignedUrl(item.mediaPath, 3600).then(({ data }) => addDomNode(doc, item, data?.signedUrl));
      } else addDomNode(doc, item);
    });
  }, [ready, draft, pageId, user?.id]);

  useEffect(() => {
    if (!ready) return;
    const doc = iframe.current?.contentDocument;
    const view = doc?.defaultView;
    if (!doc || !view) return;
    let overlay: HTMLDivElement | null = null;
    let active: HTMLElement | null = null;
    const draw = () => {
      if (!overlay || !active) return;
      const rect = active.getBoundingClientRect();
      overlay.style.left = rect.left + 'px'; overlay.style.top = rect.top + 'px';
      overlay.style.width = Math.max(1, rect.width) + 'px'; overlay.style.height = Math.max(1, rect.height) + 'px';
    };
    const selectElement = (event: MouseEvent) => {
      const clicked = event.target as HTMLElement | null;
      if (!clicked || typeof clicked.closest !== 'function' || clicked.closest('[data-visual-editor-ui]')) return;
      const candidate = clicked.closest<HTMLElement>('h1,h2,h3,h4,h5,h6,p,li,span,strong,em,button,a,img,section,article,header,footer,main,aside,nav,figure,div');
      if (!candidate || !selectable(candidate) || candidate === doc.body || candidate.id === 'root') return;
      event.preventDefault(); event.stopPropagation(); event.stopImmediatePropagation();
      if (targetRef.current) targetRef.current.style.outline = originalOutlineRef.current;
      active = candidate; targetRef.current = candidate;
      originalOutlineRef.current = candidate.style.outline;
      originalStyleRef.current = candidate.getAttribute('style');
      candidate.style.outline = '2px solid #f59e0b';
      const computed = view.getComputedStyle(candidate);
      const rect = candidate.getBoundingClientRect();
      const editable = textLeaf(candidate);
      setSelected({ tag: candidate.tagName.toLowerCase(), text: editable ? candidate.textContent || '' : '', selector: selectorFor(candidate), width: rect.width, height: rect.height, textEditable: editable });
      setStyle({
        color: hex(computed.color, '#18263b'), backgroundColor: hex(computed.backgroundColor, '#ffffff'),
        fontSize: Number.parseFloat(computed.fontSize) || 16, fontWeight: computed.fontWeight,
        textAlign: (['left','center','right','justify'].includes(computed.textAlign) ? computed.textAlign : 'left') as StyleDraft['textAlign'],
        marginTop: Number.parseFloat(computed.marginTop) || 0, marginBottom: Number.parseFloat(computed.marginBottom) || 0,
        padding: Number.parseFloat(computed.paddingTop) || 0, borderRadius: Number.parseFloat(computed.borderRadius) || 0, width: 0, minHeight: 0,
      });
      setInspectorOpen(true);
      if (!overlay) {
        overlay = doc.createElement('div'); overlay.dataset.visualEditorUi = 'resize-overlay';
        overlay.style.cssText = 'position:fixed;z-index:2147483000;pointer-events:none;border:1px solid #0ea5e9;box-sizing:border-box;';
        const handle = doc.createElement('button'); handle.type = 'button'; handle.dataset.visualEditorUi = 'resize-handle';
        handle.setAttribute('aria-label', 'Drag to resize selected element');
        handle.style.cssText = 'position:absolute;right:-7px;bottom:-7px;width:14px;height:14px;border:2px solid white;border-radius:4px;background:#0284c7;box-shadow:0 1px 5px #0f172a66;cursor:nwse-resize;pointer-events:auto;touch-action:none;';
        overlay.appendChild(handle); doc.body.appendChild(overlay);
        handle.addEventListener('pointerdown', pointer => {
          pointer.preventDefault(); pointer.stopPropagation();
          if (!active) return;
          const rectStart = active.getBoundingClientRect(); const x = pointer.clientX; const y = pointer.clientY;
          let width = rectStart.width; let height = rectStart.height;
          const move = (e: PointerEvent) => {
            width = Math.max(80, Math.min(1600, rectStart.width + e.clientX - x));
            height = Math.max(24, Math.min(900, rectStart.height + e.clientY - y));
            active!.style.width = width + 'px'; active!.style.minHeight = height + 'px'; draw();
          };
          const up = () => {
            view.removeEventListener('pointermove', move);
            setStyle(s => ({ ...s, width: Math.round(width), minHeight: Math.round(height) }));
            setSelected(s => s ? { ...s, width: Math.round(width), height: Math.round(height) } : s);
            setNotice('Cursor resize applied. Save Cloud Draft to keep it.');
          };
          view.addEventListener('pointermove', move); view.addEventListener('pointerup', up, { once: true });
        });
      }
      draw();
    };
    doc.addEventListener('click', selectElement, true);
    view.addEventListener('scroll', draw, true); view.addEventListener('resize', draw);
    return () => {
      doc.removeEventListener('click', selectElement, true); view.removeEventListener('scroll', draw, true); view.removeEventListener('resize', draw);
      if (targetRef.current) targetRef.current.style.outline = originalOutlineRef.current;
      overlay?.remove(); targetRef.current = null;
    };
  }, [ready, src, pageId]);

  useEffect(() => {
    if (!ready || !selected) return;
    const element = targetRef.current;
    if (!element || protectedElement(element)) return;
    if (selected.textEditable) element.textContent = selected.text.slice(0, 2000);
    element.style.color = style.color; element.style.backgroundColor = style.backgroundColor;
    element.style.fontSize = style.fontSize + 'px'; element.style.fontWeight = style.fontWeight;
    element.style.textAlign = style.textAlign; element.style.marginTop = style.marginTop + 'px';
    element.style.marginBottom = style.marginBottom + 'px'; element.style.padding = style.padding + 'px';
    element.style.borderRadius = style.borderRadius + 'px'; element.style.width = style.width > 0 ? style.width + 'px' : '';
    element.style.minHeight = style.minHeight > 0 ? style.minHeight + 'px' : '';
    const rect = element.getBoundingClientRect();
    const overlay = element.ownerDocument.querySelector<HTMLElement>('[data-visual-editor-ui="resize-overlay"]');
    if (overlay) {
      overlay.style.left = rect.left + 'px';
      overlay.style.top = rect.top + 'px';
      overlay.style.width = Math.max(1, rect.width) + 'px';
      overlay.style.height = Math.max(1, rect.height) + 'px';
    }
    setSelected(current => {
      if (!current || (Math.abs(current.width - rect.width) < 0.5 && Math.abs(current.height - rect.height) < 0.5)) return current;
      return { ...current, width: rect.width, height: rect.height };
    });
  }, [ready, selected?.text, style]);

  const insertComponent = (kind: Kind, asset?: Media) => {
    const doc = iframe.current?.contentDocument;
    if (!doc) return;
    const selectedElement = targetRef.current;
    const parent = (selectedElement?.closest('main,section,article') as HTMLElement | null) || doc.querySelector('main') || (doc.body.firstElementChild as HTMLElement | null);
    if (!parent) { setNotice('इस page पर सुरक्षित insertion point नहीं मिला।'); return; }
    const parentSelector = selectorFor(parent as HTMLElement);
    if (!safeSelector(parentSelector)) { setNotice('इस page पर सुरक्षित insertion point नहीं मिला।'); return; }
    const item: Added = {
      id: 'builder-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 7),
      kind, text: kind === 'heading' ? 'New section heading' : kind === 'text' ? 'Write your content here.' : kind === 'button' ? 'Button label' : kind === 'card' ? 'New content card' : kind === 'columns' ? 'First column content' : kind === 'video' ? 'Video placeholder' : asset?.name || 'New component',
      parentSelector, ...(asset ? { mediaPath: asset.path, altText: mediaAlt || asset.name } : {}),
    };
    setDraft(current => ({ ...current, addedComponents: { ...(current.addedComponents || {}), [pageId]: [...(current.addedComponents?.[pageId] || []), item] } }));
    setNotice('Component preview में जोड़ा गया। Save Cloud Draft दबाकर draft सुरक्षित करें।');
    setComponentsOpen(false); setMediaOpen(false);
  };

  const loadMedia = async () => {
    const client = supabase;
    if (!client || !user || !isAdmin) return;
    setMediaLoading(true); setMediaError('');
    try {
      const { data, error } = await client.storage.from('visual-studio-media').list(user.id, { limit: 100, sortBy: { column: 'created_at', order: 'desc' } });
      if (error) throw error;
      const assets = await Promise.all((data || []).filter(item => item.name && !item.name.startsWith('.')).map(async item => {
        const path = user.id + '/' + item.name;
        const { data: signed, error: signedError } = await client.storage.from('visual-studio-media').createSignedUrl(path, 3600);
        if (signedError || !signed?.signedUrl) return null;
        const mime = item.metadata?.mimetype || '';
        return { name: item.name, path, type: mime.startsWith('video/') ? 'video' as const : 'image' as const, url: signed.signedUrl };
      }));
      setMedia(assets.filter((item): item is Media => Boolean(item)));
    } catch (error) { setMediaError(error instanceof Error ? error.message : 'Media Library load नहीं हो सकी।'); }
    finally { setMediaLoading(false); }
  };

  const uploadMedia = async (file: File) => {
    const client = supabase;
    if (!client || !user || !isAdmin) { setMediaError('केवल सत्यापित Admin Media Upload कर सकता है।'); return; }
    const allowed = ['image/jpeg','image/png','image/webp','image/gif','image/avif','video/mp4','video/webm'];
    if (!allowed.includes(file.type)) { setMediaError('केवल JPG, PNG, WEBP, GIF, AVIF, MP4 और WEBM फाइलें स्वीकार हैं।'); return; }
    if (file.size > 50 * 1024 * 1024) { setMediaError('फाइल का आकार 50 MB से कम होना चाहिए।'); return; }
    setMediaBusy(true); setMediaError('');
    try {
      const extension = file.name.split('.').pop()?.toLowerCase() || 'bin';
      const path = user.id + '/' + crypto.randomUUID() + '.' + extension;
      const { error } = await client.storage.from('visual-studio-media').upload(path, file, { contentType: file.type, cacheControl: '3600', upsert: false, metadata: { altText: mediaAlt.trim() } });
      if (error) throw error;
      setMediaAlt(''); await loadMedia();
    } catch (error) { setMediaError(error instanceof Error ? error.message : 'Upload विफल रहा।'); }
    finally { setMediaBusy(false); }
  };

  const saveCloudDraft = async () => {
    if (!supabase || !user || !isAdmin) { setStatus('Draft save करने के लिए Admin authentication आवश्यक है।'); return; }
    if (!selected && !(draft.addedComponents?.[pageId]?.length)) { setStatus('पहले page पर कोई element चुनें या component जोड़ें।'); return; }
    setSaving(true); setStatus('Supabase Draft सेव हो रहा है…');
    try {
      const history = await getWebsiteConfigVersions();
      const latest = history.find(item => item.status === 'draft') || history.find(item => item.status === 'published');
      const base: WebsiteConfig = latest?.config || { hero: {}, header: {}, sections: {}, palette: 'navy' };
      const next: Draft = {
        version: 1,
        pages: selected && safeSelector(selected.selector) ? {
          ...draft.pages,
          [pageId]: {
            ...(draft.pages[pageId] || {}),
            [selected.selector]: { selector: selected.selector, text: selected.textEditable ? selected.text.slice(0, 2000) : '', textEditable: selected.textEditable, style: { ...style } },
          },
        } : draft.pages,
        addedComponents: draft.addedComponents || {},
      };
      await saveWebsiteConfigDraft({ ...base, visualEditor: next });
      setDraft(next);
      const refreshed = await getWebsiteConfigVersions();
      const saved = refreshed.find(item => item.status === 'draft');
      setStatus(saved ? 'Cloud Draft saved · Version ' + saved.version_number : 'Cloud Draft saved');
      setNotice('Supabase में Draft सुरक्षित हुआ। Live website publish नहीं हुई।');
    } catch (error) { setStatus(error instanceof Error ? error.message : 'Cloud Draft सेव नहीं हुआ'); }
    finally { setSaving(false); }
  };

  const resetSelected = () => {
    const element = targetRef.current;
    if (!element) return;
    if (originalStyleRef.current === null) element.removeAttribute('style');
    else element.setAttribute('style', originalStyleRef.current);
    element.style.outline = originalOutlineRef.current;
    targetRef.current = null; setSelected(null); setStyle(defaults);
    setNotice('चयनित element का मूल style केवल Preview में लौटाया गया।');
  };

  useEffect(() => { if (mediaOpen) void loadMedia(); }, [mediaOpen, user?.id, isAdmin]);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-sky-200 bg-sky-50 px-3 py-2 text-[10px] leading-5 text-sky-950">
        <span><strong>Interactive Live Page Preview:</strong> {pageLabel}. किसी text, image, card या section पर click करें। नीले corner handle से size बदलें। सभी edits Draft-only हैं।</span>
        <span className="font-semibold text-sky-800">{status}</span>
      </div>
      <div className="mx-auto overflow-hidden rounded-xl border border-slate-300 bg-white shadow-sm" style={{ height: 'min(76vh, 860px)', minHeight: 560, maxWidth: mobile ? '390px' : '100%' }}>
        <iframe ref={iframe} title={'Interactive website editor · ' + pageLabel} src={src} onLoad={() => setReady(true)} className="h-full w-full border-0" />
      </div>
      {createPortal(<>
        <div data-visual-editor-ui="toolbar" style={{ left: toolbarPos.x, top: toolbarPos.y }} onPointerDown={event => dragPanel(event, setToolbarPos)} className="fixed z-[99990] flex items-center gap-1 rounded-xl cursor-move touch-none border border-slate-200 bg-white/95 p-1.5 shadow-[0_12px_40px_rgba(15,23,42,.22)] backdrop-blur">
          <button type="button" aria-expanded={componentsOpen} onClick={() => { setComponentsOpen(value => !value); setMediaOpen(false); }} className="inline-flex items-center gap-1 rounded-lg bg-sky-900 px-2.5 py-2 text-[10px] font-bold text-white"><Plus className="h-3.5 w-3.5"/>Components <span className="rounded bg-white/15 px-1">{palette.length}</span></button>
          <button type="button" onClick={() => { setMediaOpen(value => !value); setComponentsOpen(false); }} className={'inline-flex items-center gap-1 rounded-lg px-2.5 py-2 text-[10px] font-bold ' + (mediaOpen ? 'bg-violet-100 text-violet-900' : 'bg-slate-100 text-slate-700')}><ImageIcon className="h-3.5 w-3.5"/>Media</button>
          <button type="button" onClick={() => { setInspectorOpen(value => !value); setComponentsOpen(false); }} className={'inline-flex items-center gap-1 rounded-lg px-2.5 py-2 text-[10px] font-bold ' + (inspectorOpen ? 'bg-sky-100 text-sky-900' : 'bg-slate-100 text-slate-700')}><Settings2 className="h-3.5 w-3.5"/>Inspector</button>
        </div>
        {componentsOpen && <div data-visual-editor-ui="components-menu" style={{ left: componentsPos.x, top: componentsPos.y }} className="fixed z-[99999] max-h-[min(65vh,520px)] w-[min(280px,calc(100vw-24px))] overflow-y-auto rounded-xl border border-slate-200 bg-white p-2 shadow-[0_18px_48px_rgba(15,23,42,.26)]">
          <div onPointerDown={event => dragPanel(event, setComponentsPos)} className="mb-1 flex items-center justify-between border-b border-slate-100 px-1 pb-2 cursor-move touch-none"><span className="text-[11px] font-extrabold text-slate-800">Add Component to Page</span><button onClick={() => setComponentsOpen(false)} className="rounded px-2 py-1 text-xs text-slate-500">×</button></div>
          {palette.map(item => { const Icon = item.icon; return <button key={item.kind} onClick={() => insertComponent(item.kind)} className="flex w-full items-center gap-2 rounded-lg p-2 text-left hover:bg-sky-50"><span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-sky-50 text-sky-800"><Icon className="h-4 w-4"/></span><span className="min-w-0 flex-1"><span className="block text-xs font-bold text-slate-800">{item.label}</span><span className="block text-[10px] text-slate-500">{item.hint}</span></span><Plus className="h-3.5 w-3.5 text-slate-400"/></button>; })}
        </div>}
        {mediaOpen && <section data-visual-editor-ui="media-panel" style={{ left: mediaPos.x, top: mediaPos.y }} className="fixed z-[99998] max-h-[min(70vh,620px)] w-[min(360px,calc(100vw-24px))] overflow-y-auto rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_18px_48px_rgba(15,23,42,.24)]">
          <div onPointerDown={event => dragPanel(event, setMediaPos)} className="mb-3 flex items-center justify-between cursor-move touch-none"><div><h3 className="text-sm font-extrabold text-slate-900">Media Library</h3><p className="text-[10px] text-slate-500">Admin-only · Supabase Storage · Max 50 MB</p></div><button onClick={() => setMediaOpen(false)} className="rounded-lg border px-2 py-1 text-xs">Close ×</button></div>
          <input value={mediaAlt} onChange={event => setMediaAlt(event.target.value)} placeholder="Alt text / accessible description" className="mb-2 w-full rounded-lg border p-2 text-[11px]"/>
          <label className="block cursor-pointer rounded-lg border border-dashed border-violet-300 bg-violet-50 p-3 text-center text-[11px] font-bold text-violet-900">{mediaBusy ? 'Uploading…' : 'Upload Image / Video'}<input type="file" accept="image/jpeg,image/png,image/webp,image/gif,image/avif,video/mp4,video/webm" disabled={mediaBusy || !isAdmin} className="hidden" onChange={event => { const file = event.target.files?.[0]; if (file) void uploadMedia(file); event.currentTarget.value = ''; }}/></label>
          {mediaError && <p role="alert" className="mt-2 rounded-lg bg-rose-50 p-2 text-[10px] text-rose-700">{mediaError}</p>}
          {mediaLoading ? <p className="py-4 text-center text-xs text-slate-500">Loading media…</p> : media.length === 0 ? <p className="py-4 text-center text-xs text-slate-400">No media uploaded yet.</p> : <div className="mt-3 grid grid-cols-2 gap-2">{media.map(asset => <div key={asset.path} className="overflow-hidden rounded-lg border border-slate-200 bg-white"><div className="grid h-20 place-items-center bg-slate-100">{asset.type === 'image' ? <img src={asset.url} alt={asset.name} className="h-full w-full object-cover"/> : <Video className="h-7 w-7 text-slate-500"/>}</div><p className="truncate px-2 pt-1 text-[9px] text-slate-600">{asset.name}</p><button onClick={() => insertComponent(asset.type === 'video' ? 'video' : 'image', asset)} className="m-1 w-[calc(100%-8px)] rounded-md bg-sky-900 p-1.5 text-[10px] font-bold text-white">Insert into page</button></div>)}</div>}
          <button onClick={() => void loadMedia()} disabled={mediaLoading} className="mt-3 w-full rounded-lg border p-2 text-[10px] font-bold text-slate-600">Refresh Library</button>
        </section>}
        {inspectorOpen && <aside data-visual-editor-ui="inspector-panel" style={{ left: inspectorPos.x, top: inspectorPos.y }} className="fixed z-[99997] max-h-[min(75vh,700px)] w-[min(340px,calc(100vw-24px))] overflow-y-auto rounded-2xl border border-slate-200 bg-white p-3 shadow-[0_18px_48px_rgba(15,23,42,.24)]">
          <div onPointerDown={event => dragPanel(event, setInspectorPos)} className="mb-3 flex items-center justify-between cursor-move touch-none"><div><h3 className="flex items-center gap-2 text-sm font-extrabold text-slate-900"><Settings2 className="h-4 w-4"/>Live Inspector</h3><p className="text-[10px] text-slate-500">Click an element in the website preview</p></div><button onClick={() => setInspectorOpen(false)} className="rounded-lg border px-2 py-1 text-xs">×</button></div>
          {selected ? <div className="space-y-2">
            <p className="rounded-lg bg-sky-50 p-2 text-[10px] font-bold text-sky-900">{selected.tag.toUpperCase()} · {Math.round(selected.width)} × {Math.round(selected.height)} px</p>
            {selected.textEditable && <label className="block text-[10px] font-semibold text-slate-600">Text / Content<textarea rows={3} value={selected.text} onChange={event => setSelected(current => current ? { ...current, text: event.target.value } : current)} className="mt-1 w-full rounded-lg border p-2 text-xs"/></label>}
            <label className="block text-[10px] font-semibold text-slate-600">Text Colour<input type="color" value={style.color} onChange={event => setStyle(current => ({ ...current, color: event.target.value }))} className="mt-1 h-8 w-full"/></label>
            <label className="block text-[10px] font-semibold text-slate-600">Background<input type="color" value={style.backgroundColor} onChange={event => setStyle(current => ({ ...current, backgroundColor: event.target.value }))} className="mt-1 h-8 w-full"/></label>
            <label className="block text-[10px] font-semibold text-slate-600">Font Size · {style.fontSize}px<input type="range" min="8" max="72" value={style.fontSize} onChange={event => setStyle(current => ({ ...current, fontSize: Number(event.target.value) }))} className="mt-1 w-full"/></label>
            <label className="block text-[10px] font-semibold text-slate-600">Width · {style.width ? style.width + 'px' : 'Auto'}<input type="range" min="0" max="1400" step="10" value={style.width} onChange={event => setStyle(current => ({ ...current, width: Number(event.target.value) }))} className="mt-1 w-full"/></label>
            <label className="block text-[10px] font-semibold text-slate-600">Min Height · {style.minHeight}px<input type="range" min="0" max="700" step="5" value={style.minHeight} onChange={event => setStyle(current => ({ ...current, minHeight: Number(event.target.value) }))} className="mt-1 w-full"/></label>
            <label className="block text-[10px] font-semibold text-slate-600">Padding · {style.padding}px<input type="range" min="0" max="80" value={style.padding} onChange={event => setStyle(current => ({ ...current, padding: Number(event.target.value) }))} className="mt-1 w-full"/></label>
            <label className="block text-[10px] font-semibold text-slate-600">Top Spacing · {style.marginTop}px<input type="range" min="0" max="120" value={style.marginTop} onChange={event => setStyle(current => ({ ...current, marginTop: Number(event.target.value) }))} className="mt-1 w-full"/></label>
            <label className="block text-[10px] font-semibold text-slate-600">Bottom Spacing · {style.marginBottom}px<input type="range" min="0" max="120" value={style.marginBottom} onChange={event => setStyle(current => ({ ...current, marginBottom: Number(event.target.value) }))} className="mt-1 w-full"/></label>
            <label className="block text-[10px] font-semibold text-slate-600">Corner Radius · {style.borderRadius}px<input type="range" min="0" max="48" value={style.borderRadius} onChange={event => setStyle(current => ({ ...current, borderRadius: Number(event.target.value) }))} className="mt-1 w-full"/></label>
            <label className="block text-[10px] font-semibold text-slate-600">Text Alignment<select value={style.textAlign} onChange={event => setStyle(current => ({ ...current, textAlign: event.target.value as StyleDraft['textAlign'] }))} className="mt-1 w-full rounded-lg border p-2 text-xs"><option value="left">Left</option><option value="center">Center</option><option value="right">Right</option><option value="justify">Justify</option></select></label>
            <div className="flex gap-2 pt-1"><button onClick={resetSelected} className="flex-1 rounded-lg border p-2 text-[10px] font-bold">Reset</button><button onClick={() => void saveCloudDraft()} disabled={saving} className="flex-1 rounded-lg bg-emerald-700 p-2 text-[10px] font-bold text-white disabled:opacity-50">{saving ? 'Saving…' : 'Save Cloud Draft'}</button></div>
          </div> : <div className="space-y-3"><p className="rounded-lg bg-slate-50 p-3 text-[10px] leading-5 text-slate-600">वेबसाइट के किसी भी text, card, section या image पर click करें। फिर properties बदलें या नीले corner handle को खींचें।</p>{(draft.addedComponents?.[pageId]?.length || 0) > 0 && <button onClick={() => void saveCloudDraft()} disabled={saving} className="w-full rounded-lg bg-emerald-700 p-2 text-[10px] font-bold text-white">{saving ? 'Saving…' : 'Save Added Components to Cloud Draft'}</button>}</div>}
          <p className="mt-2 text-[9px] leading-4 text-slate-500">{notice || 'Changes appear immediately in this Preview. Cloud Draft save never publishes the Live website.'}</p>
        </aside>}
      </>, document.body)}
    </div>
  );
};
