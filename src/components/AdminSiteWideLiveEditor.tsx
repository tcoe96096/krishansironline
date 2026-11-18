import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AlignLeft, BarChart3, BookOpen, ChevronDown, ChevronUp, Columns2, Copy, Download, HelpCircle, Image as ImageIcon, Megaphone, Minus, MousePointerClick, MoveVertical, Palette, Plus, Quote, Search, Settings2, Square, Trash2, Type, Video, Move, MoveDiagonal2 } from 'lucide-react';
import { STUDIO_THEMES, safeStudioMediaUrl, studioYouTubeEmbed, type StudioDraftPage, type StudioTheme } from '../visual-editor/studioBuilder';
import { STUDIO_ANIMATIONS, STUDIO_FILTERS, STUDIO_HOVERS, STUDIO_DESIGN_PRESETS, DEFAULT_STUDIO_EFFECT, applyStudioEffects, ensureStudioEffectsStyles, contrastTextForHex, safeStudioEffect, type StudioEffect, type StudioDesignPreset } from '../visual-editor/effects';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { getWebsiteConfigVersions, saveWebsiteConfigDraft, type WebsiteConfig } from '../services/siteConfigService';

type Kind = 'heading' | 'text' | 'button' | 'image' | 'card' | 'columns' | 'video' | 'pdf' | 'divider' | 'spacer' | 'quote' | 'faq' | 'callout' | 'stat' | 'hero' | 'steps';
type Media = { name: string; path: string; type: 'image' | 'video'; url: string };
type Added = { id: string; kind: Kind; text: string; parentSelector: string; subtitle?: string; mediaPath?: string; altText?: string; url?: string; effects?: StudioEffect };
type StyleDraft = { color: string; backgroundColor: string; fontSize: number; fontWeight: string; textAlign: 'left' | 'center' | 'right' | 'justify'; marginTop: number; marginBottom: number; padding: number; borderRadius: number; width: number; minHeight: number; effects?: StudioEffect };
type Override = { selector: string; text: string; textEditable: boolean; style: StyleDraft };
type Draft = { version: 1; pages: Record<string, Record<string, Override>>; addedComponents?: Record<string, Added[]>; themes?: Record<string, StudioTheme>; customPages?: StudioDraftPage[] };
type Selected = { tag: string; text: string; selector: string; width: number; height: number; textEditable: boolean };

const defaults: StyleDraft = { color: '#18263b', backgroundColor: 'original', fontSize: 16, fontWeight: '400', textAlign: 'left', marginTop: 0, marginBottom: 0, padding: 0, borderRadius: 0, width: 0, minHeight: 0, effects: DEFAULT_STUDIO_EFFECT };
const palette: { kind: Kind; label: string; hint: string; icon: React.ElementType }[] = [
  { kind: 'heading', label: 'Heading', hint: 'Section title or headline', icon: Type },
  { kind: 'text', label: 'Text', hint: 'Paragraph or description', icon: AlignLeft },
  { kind: 'button', label: 'Button', hint: 'Call-to-action button', icon: MousePointerClick },
  { kind: 'image', label: 'Image', hint: 'Add an image block', icon: ImageIcon },
  { kind: 'card', label: 'Card', hint: 'Content card', icon: Square },
  { kind: 'columns', label: 'Columns', hint: 'Two-column section', icon: Columns2 },
  { kind: 'video', label: 'Video Player', hint: 'MP4, WEBM or YouTube URL', icon: Video },
  { kind: 'pdf', label: 'PDF Reader', hint: 'Embed an HTTPS PDF link', icon: BookOpen },
  { kind: 'divider', label: 'Divider', hint: 'Horizontal separator', icon: Minus },
  { kind: 'spacer', label: 'Spacer', hint: 'Vertical spacing', icon: MoveVertical },
  { kind: 'quote', label: 'Quote', hint: 'Quotation and author', icon: Quote },
  { kind: 'faq', label: 'FAQ', hint: 'Expandable question and answer', icon: HelpCircle },
  { kind: 'callout', label: 'Callout', hint: 'Highlight a notice', icon: Megaphone },
  { kind: 'stat', label: 'Statistic', hint: 'Important number and context', icon: BarChart3 },
  { kind: 'hero', label: 'Hero Banner', hint: 'Page hero and supporting text', icon: ImageIcon },
  { kind: 'steps', label: 'Learning Steps', hint: 'Step-by-step timeline', icon: Columns2 },
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
// Style ordinary buttons and links even inside forms, but never edit form values,
// credentials, interactive behavior, or protected application controls.
const protectedElement = (element: Element) =>
  Boolean(element.closest('input,textarea,select,[data-visual-editor-protected],[data-visual-editor-ui]')) ||
  Boolean(element.closest('form') && !element.matches('button,a')) ||
  Boolean(element.closest('[role=button]') && !element.matches('button,a'));
const textLeaf = (element: Element) =>
  ['H1','H2','H3','H4','H5','H6','P','LI','SPAN','STRONG','EM','BUTTON','A'].includes(element.tagName) &&
  element.children.length === 0 && Boolean(element.textContent?.trim()) &&
  !element.closest('form,[data-visual-editor-protected]') && !protectedElement(element);
const selectable = (element: Element) => !['HTML','BODY','SCRIPT','STYLE','INPUT','TEXTAREA','SELECT','OPTION','SVG'].includes(element.tagName) && !protectedElement(element);
const hex = (value: string, fallback: string) => {
  if (/^#[0-9a-f]{6}$/i.test(value)) return value;
  if (value.trim().toLowerCase() === 'transparent') return fallback;
  const match = value.match(/^rgba?\(\s*(\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\s*\)$/i);
  if (!match || (match[4] !== undefined && Number(match[4]) < 1)) return fallback;
  return '#' + match.slice(1, 4).map(part => Number(part).toString(16).padStart(2, '0')).join('');
};

export const AdminSiteWideLiveEditor: React.FC<{ src: string; srcDoc?: string; pageId: string; pageLabel: string; mobile?: boolean; designOnly?: boolean; onDraftSaved?: (draftId: string) => void }> = ({ src, srcDoc, pageId, pageLabel, mobile = false, designOnly = false, onDraftSaved }) => {
  const { user, isAdmin } = useAuth();
  const iframe = useRef<HTMLIFrameElement>(null);
  const targetRef = useRef<HTMLElement | null>(null);
  const originalStyleRef = useRef<string | null>(null);
  const originalOutlineRef = useRef('');
  const [ready, setReady] = useState(false);
  const [selected, setSelected] = useState<Selected | null>(null);
  const [style, setStyle] = useState<StyleDraft>(defaults);
  const [backgroundSwatch, setBackgroundSwatch] = useState('#ffffff');
  const [draft, setDraft] = useState<Draft>({ version: 1, pages: {}, addedComponents: {} });
  const [status, setStatus] = useState('Cloud Draft loading…');
  const [cloudReady, setCloudReady] = useState(false);
  const [notice, setNotice] = useState('');
  const [saving, setSaving] = useState(false);
  const [componentsOpen, setComponentsOpen] = useState(false);
  const [mediaOpen, setMediaOpen] = useState(false);
  const [themesOpen, setThemesOpen] = useState(false);
  const [inspectorOpen, setInspectorOpen] = useState(true);
  const [media, setMedia] = useState<Media[]>([]);
  const [mediaLoading, setMediaLoading] = useState(false);
  const [mediaBusy, setMediaBusy] = useState(false);
  const [mediaError, setMediaError] = useState('');
  const [mediaAlt, setMediaAlt] = useState('');
  const [componentQuery, setComponentQuery] = useState('');
  const [copiedStyle, setCopiedStyle] = useState<StyleDraft | null>(null);
  const [smartToolsOpen, setSmartToolsOpen] = useState(false);
  const [managedComponentId, setManagedComponentId] = useState<string | null>(null);
  const [componentUndo, setComponentUndo] = useState<Record<string, Added[][]>>({});
  const [componentRedo, setComponentRedo] = useState<Record<string, Added[][]>>({});
  const toolbarRootRef = useRef<HTMLDivElement>(null);
  const inspectorRootRef = useRef<HTMLElement>(null);
  const [toolbarPos, setToolbarPos] = useState(() => ({ x: Math.max(12, Math.round((window.innerWidth - 650) / 2)), y: 80 }));
  const [inspectorPos, setInspectorPos] = useState(() => ({ x: Math.max(12, window.innerWidth - 372), y: 180 }));
  const [inspectorSize, setInspectorSize] = useState(() => ({
    width: Math.min(340, Math.max(240, window.innerWidth - 24)),
    height: Math.min(520, Math.max(240, window.innerHeight - 200)),
  }));
  const clampToViewport = (position: number, size: number, viewport: number) =>
    Math.max(8, Math.min(position, Math.max(8, viewport - size - 8)));
  const startFloatingDrag = (event: React.PointerEvent<HTMLButtonElement>, kind: 'toolbar' | 'inspector') => {
    if (event.button !== 0) return;
    const rect = (kind === 'toolbar' ? toolbarRootRef.current : inspectorRootRef.current)?.getBoundingClientRect();
    if (!rect) return;
    event.preventDefault();
    const startX = event.clientX, startY = event.clientY;
    const onMove = (move: PointerEvent) => {
      const x = clampToViewport(rect.left + move.clientX - startX, rect.width, window.innerWidth);
      const y = clampToViewport(rect.top + move.clientY - startY, rect.height, window.innerHeight);
      if (kind === 'toolbar') setToolbarPos({ x, y });
      else setInspectorPos({ x, y });
    };
    const stop = () => { window.removeEventListener('pointermove', onMove); window.removeEventListener('pointerup', stop); window.removeEventListener('pointercancel', stop); };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', stop, { once: true });
    window.addEventListener('pointercancel', stop, { once: true });
  };
  const startInspectorResize = (event: React.PointerEvent<HTMLButtonElement>) => {
    if (event.button !== 0) return;
    const rect = inspectorRootRef.current?.getBoundingClientRect();
    if (!rect) return;
    event.preventDefault();
    const startX = event.clientX, startY = event.clientY;
    const onMove = (move: PointerEvent) => {
      const availableWidth = Math.max(240, window.innerWidth - rect.left - 8);
      const availableHeight = Math.max(240, window.innerHeight - rect.top - 8);
      setInspectorSize({
        width: Math.max(Math.min(280, availableWidth), Math.min(availableWidth, rect.width + move.clientX - startX)),
        height: Math.max(Math.min(240, availableHeight), Math.min(availableHeight, rect.height + move.clientY - startY)),
      });
    };
    const stop = () => { window.removeEventListener('pointermove', onMove); window.removeEventListener('pointerup', stop); window.removeEventListener('pointercancel', stop); };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', stop, { once: true });
    window.addEventListener('pointercancel', stop, { once: true });
  };
  useEffect(() => {
    const ensureVisible = () => {
      const toolbar = toolbarRootRef.current?.getBoundingClientRect();
      setToolbarPos(current => ({ x: clampToViewport(current.x, toolbar?.width || 600, window.innerWidth), y: clampToViewport(current.y, toolbar?.height || 85, window.innerHeight) }));
      setInspectorSize(current => ({ width: Math.min(current.width, Math.max(240, window.innerWidth - 24)), height: Math.min(current.height, Math.max(240, window.innerHeight - 24)) }));
      setInspectorPos(current => ({ x: clampToViewport(current.x, inspectorRootRef.current?.getBoundingClientRect().width || 340, window.innerWidth), y: clampToViewport(current.y, inspectorRootRef.current?.getBoundingClientRect().height || 520, window.innerHeight) }));
    };
    window.addEventListener('resize', ensureVisible);
    return () => window.removeEventListener('resize', ensureVisible);
  }, []);
  const themeName: StudioTheme = draft.themes?.[pageId] && STUDIO_THEMES[draft.themes[pageId]]
    ? draft.themes[pageId] : 'original';
  const chooseTheme = (next: StudioTheme) => {
    if (user && isAdmin && !cloudReady) { setNotice('Load Cloud Draft before changing themes.'); return; }
    setDraft(current => ({ ...current, themes: { ...(current.themes || {}), [pageId]: next } }));
    setNotice('Theme changed in Preview. Save Cloud Draft to keep the selected theme.');
  };


  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const history = await getWebsiteConfigVersions();
        if (!active) return;
        const latest = history.find(item => item.status === 'draft') || history.find(item => item.status === 'published');
        const saved = latest?.config.visualEditor as Draft | undefined;
        if (saved?.version === 1 && saved.pages && typeof saved.pages === 'object') setDraft({ version: 1, pages: saved.pages, addedComponents: saved.addedComponents || {}, themes: saved.themes || {}, customPages: saved.customPages || [] });
        setStatus(latest ? 'Cloud Draft · Version ' + latest.version_number : 'Cloud Draft अभी खाली है');
        setCloudReady(true);
      } catch (error) {
        if (active) { setStatus(error instanceof Error ? error.message : 'Cloud Draft load नहीं हुआ'); setCloudReady(false); }
      }
    })();
    return () => { active = false; };
  }, []);

  useEffect(() => { setReady(false); setSelected(null); setManagedComponentId(null); targetRef.current = null; }, [src, srcDoc, pageId]);

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
    } else if (item.kind === 'video' && mediaUrl) {
      const video = doc.createElement('video'); video.src = mediaUrl; video.controls = true;
      video.style.cssText = 'display:block;width:100%;max-height:440px;background:#0f172a;border-radius:14px;margin:16px 0;';
      node = video;
    } else if (item.kind === 'video' && item.url && studioYouTubeEmbed(item.url)) {
      const player = doc.createElement('iframe');
      player.title = item.text || 'YouTube video player';
      player.src = studioYouTubeEmbed(item.url)!;
      player.allow = 'accelerometer; encrypted-media; gyroscope; picture-in-picture';
      player.setAttribute('sandbox', 'allow-scripts allow-same-origin allow-presentation');
      player.setAttribute('referrerpolicy', 'strict-origin-when-cross-origin');
      player.style.cssText = 'display:block;width:100%;aspect-ratio:16/9;border:0;border-radius:14px;background:#0f172a;margin:16px 0;';
      node = player;
    } else if (item.kind === 'video' && item.url && safeStudioMediaUrl(item.url)) {
      const video = doc.createElement('video');
      video.src = safeStudioMediaUrl(item.url)!; video.controls = true; video.preload = 'metadata';
      video.style.cssText = 'display:block;width:100%;max-height:460px;background:#0f172a;border-radius:14px;margin:16px 0;';
      node = video;
    } else if (item.kind === 'video') {
      const div = doc.createElement('div'); div.textContent = 'Video Player · Select an MP4, WEBM or YouTube URL in Inspector'; div.style.cssText = 'display:grid;place-items:center;min-height:160px;background:#0f172a;color:white;border-radius:14px;margin:16px 0;padding:20px;text-align:center;'; node = div;
    } else if (item.kind === 'pdf' && item.url && safeStudioMediaUrl(item.url)) {
      const box = doc.createElement('section');
      box.style.cssText = 'padding:12px;border:1px solid #cbd5e1;background:white;border-radius:14px;margin:16px 0;';
      const caption = doc.createElement('strong'); caption.textContent = item.text || 'PDF Reader';
      caption.style.cssText = 'display:block;margin:4px 6px 12px;color:#0b3979;';
      const pdf = doc.createElement('iframe');
      pdf.title = item.text || 'PDF document reader';
      pdf.src = safeStudioMediaUrl(item.url)!;
      pdf.setAttribute('sandbox', '');
      pdf.setAttribute('referrerpolicy', 'no-referrer');
      pdf.loading = 'lazy';
      pdf.style.cssText = 'display:block;width:100%;height:570px;max-height:72vh;border:0;background:#f8fafc;';
      const link = doc.createElement('a'); link.href = safeStudioMediaUrl(item.url)!;
      link.target = '_blank'; link.rel = 'noopener noreferrer';
      link.textContent = 'Open PDF in a new tab';
      link.style.cssText = 'display:block;margin:10px 6px;color:#0b3979;font-size:13px;';
      box.append(caption,pdf,link); node = box;
    } else if (item.kind === 'pdf') {
      const box = doc.createElement('section');
      box.textContent = 'PDF Reader · Add an HTTPS PDF document URL in Inspector';
      box.style.cssText = 'padding:45px 25px;border:2px dashed #93c5fd;border-radius:14px;background:#eff6ff;color:#0b3979;margin:16px 0;text-align:center;';
      node = box;
    } else if (item.kind === 'quote') {
      const quote = doc.createElement('blockquote');
      quote.style.cssText = 'border-left:4px solid #0b3979;padding:18px 22px;background:#f0f7ff;border-radius:8px;margin:20px 0;';
      const words = doc.createElement('p'); words.textContent = item.text; words.style.cssText = 'font-size:20px;line-height:1.6;font-style:italic;color:#1e3a5f;';
      const attribution = doc.createElement('cite'); attribution.textContent = item.subtitle || 'Attribution'; attribution.style.cssText = 'display:block;margin-top:10px;font-size:13px;color:#475569;';
      quote.append(words, attribution); node = quote;
    } else if (item.kind === 'faq') {
      const details = doc.createElement('details');
      details.style.cssText = 'margin:14px 0;padding:16px 18px;border:1px solid #bfdbfe;background:#f8fafc;border-radius:12px;';
      const summary = doc.createElement('summary'); summary.textContent = item.text; summary.style.cssText = 'font-weight:700;color:#0f3b75;cursor:pointer;';
      const answer = doc.createElement('p'); answer.textContent = item.subtitle || 'Write your answer here.'; answer.style.cssText = 'margin-top:12px;line-height:1.7;color:#475569;';
      details.append(summary, answer); node = details;
    } else if (item.kind === 'callout') {
      const aside = doc.createElement('aside');
      aside.style.cssText = 'padding:18px 20px;margin:16px 0;border-left:4px solid #0d9488;background:#f0fdfa;border-radius:12px;';
      const heading = doc.createElement('strong'); heading.textContent = item.text; heading.style.cssText = 'display:block;color:#115e59;font-size:17px;';
      const description = doc.createElement('p'); description.textContent = item.subtitle || 'Add your important notice.'; description.style.cssText = 'margin-top:8px;line-height:1.7;color:#134e4a;';
      aside.append(heading, description); node = aside;
    } else if (item.kind === 'stat') {
      const card = doc.createElement('section');
      card.style.cssText = 'padding:22px;margin:16px 0;border:1px solid #cbd5e1;background:#fff;border-radius:16px;text-align:center;';
      const value = doc.createElement('strong'); value.textContent = item.text; value.style.cssText = 'display:block;color:#0b3979;font-size:38px;font-weight:800;';
      const caption = doc.createElement('p'); caption.textContent = item.subtitle || 'Statistic description'; caption.style.cssText = 'margin-top:8px;color:#475569;font-size:14px;';
      card.append(value, caption); node = card;
    } else if (item.kind === 'hero') {
      const hero = doc.createElement('section'); hero.style.cssText = 'margin:16px 0;padding:50px 28px;background:linear-gradient(130deg,#0b3979,#0e7490);border-radius:22px;color:white;text-align:center;';
      const title = doc.createElement('h2'); title.textContent = item.text; title.style.cssText = 'font-size:clamp(26px,4vw,48px);font-weight:800;color:white;';
      const subtitle = doc.createElement('p'); subtitle.textContent = item.subtitle || 'Add your main message.'; subtitle.style.cssText = 'margin:15px auto 0;max-width:650px;line-height:1.7;color:white;';
      hero.append(title,subtitle); node = hero;
    } else if (item.kind === 'steps') {
      const section = doc.createElement('section'); section.style.cssText = 'padding:24px;margin:16px 0;border:1px solid #dbeafe;border-radius:16px;background:#f8fafc;';
      const title = doc.createElement('h2'); title.textContent = item.text; title.style.cssText = 'color:#0b3979;font-size:24px;margin-bottom:16px;';
      section.appendChild(title);
      (item.subtitle || 'Step 1: Learn\nStep 2: Practice\nStep 3: Review')
        .split('\n').filter(Boolean).slice(0,12).forEach((line,index) => {
          const paragraph = doc.createElement('p'); paragraph.textContent = (index+1) + '. ' + line.trim();
          paragraph.style.cssText = 'margin:12px 0;padding:12px 16px;border-radius:10px;background:white;border-left:3px solid #0d9488;color:#334155;';
          section.appendChild(paragraph);
        });
      node = section;
    } else {
      const section = doc.createElement('section'); section.textContent = item.text; section.style.cssText = 'padding:20px;background:#f1f5f9;border:1px solid #dbe5f0;border-radius:16px;margin:16px 0;'; node = section;
    }
    node.dataset.builderComponentId = item.id;
    ensureStudioEffectsStyles(doc);
    applyStudioEffects(node, item.effects);
    parent.appendChild(node);
  };

  useEffect(() => {
    if (!ready) return;
    const doc = iframe.current?.contentDocument;
    if (!doc) return;
    ensureStudioEffectsStyles(doc);
    const previous = doc.querySelector('style[data-studio-theme]');
    previous?.remove();
    if (themeName === 'original') return;
    const preset = STUDIO_THEMES[themeName];
    const themeStyle = doc.createElement('style');
    themeStyle.setAttribute('data-studio-theme', themeName);
    // Predefined palettes only, and entirely inside the temporary Preview iframe.
    themeStyle.textContent =
      'body{--studio-primary:' + preset.primary + ';--studio-accent:' + preset.accent + ';}' +
      'main h1,main h2,main h3,main a{color:var(--studio-primary)!important;}' +
      'main button:not([data-visual-editor-ui]),main [data-builder-component-id="button"]{background-color:var(--studio-primary)!important;}' +
      'main section[data-builder-component-id],main article[data-builder-component-id]{border-color:var(--studio-accent)!important;}' +
      'main blockquote,main details{border-left-color:var(--studio-accent)!important;}';
    doc.head.appendChild(themeStyle);
    return () => { themeStyle.remove(); };
  }, [ready, themeName, pageId, srcDoc]);

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
      element.style.color = s.color;
      // `original` means no background override: retain gradients, transparency and inherited design.
      if (/^#[0-9a-f]{6}$/i.test(s.backgroundColor)) element.style.backgroundColor = s.backgroundColor;
      element.style.fontSize = Math.min(72, Math.max(8, s.fontSize)) + 'px';
      element.style.fontWeight = s.fontWeight; element.style.textAlign = s.textAlign;
      element.style.marginTop = s.marginTop + 'px'; element.style.marginBottom = s.marginBottom + 'px';
      element.style.padding = s.padding + 'px'; element.style.borderRadius = s.borderRadius + 'px';
      element.style.width = s.width > 0 ? s.width + 'px' : '';
      element.style.minHeight = s.minHeight > 0 ? s.minHeight + 'px' : '';
      applyStudioEffects(element, s.effects);
    });
    // Reconcile editor-owned nodes only, leaving original website markup intact.
    doc.querySelectorAll('[data-builder-component-id]').forEach(node => node.remove());
    let current = true;
    (draft.addedComponents?.[pageId] || []).forEach(item => {
      const client = supabase;
      if (item.mediaPath && client && user?.id) {
        void client.storage.from('visual-studio-media').createSignedUrl(item.mediaPath, 3600)
          .then(({ data }) => { if (current) addDomNode(doc, item, data?.signedUrl); })
          .catch(() => { if (current) addDomNode(doc, item); });
      } else addDomNode(doc, item);
    });
    return () => { current = false; };
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
      const added = clicked.closest<HTMLElement>('[data-builder-component-id]');
      if (added) {
        // FAQ summaries retain their native expand/collapse interaction.
        if (!clicked.closest('summary')) { event.preventDefault(); event.stopPropagation(); }
        if (targetRef.current) targetRef.current.style.outline = originalOutlineRef.current;
        targetRef.current = null;
        setSelected(null);
        setManagedComponentId(added.dataset.builderComponentId || null);
        setInspectorOpen(true);
        return;
      }
      setManagedComponentId(null);
      // Never execute navigation, form submission or destructive controls while editing.
      // On protected pages these controls are appearance-only: no text/behavior edits.
      const operationalControl = clicked.closest('button,a,input,select,textarea,form,[role=button]');
      if (operationalControl) {
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();
      }
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
      const editable = !designOnly && textLeaf(candidate);
      setSelected({ tag: candidate.tagName.toLowerCase(), text: editable ? candidate.textContent || '' : '', selector: selectorFor(candidate), width: rect.width, height: rect.height, textEditable: editable });
      setBackgroundSwatch(hex(computed.backgroundColor, '#ffffff'));
      setStyle({
        color: hex(computed.color, '#18263b'), backgroundColor: 'original',
        fontSize: Number.parseFloat(computed.fontSize) || 16, fontWeight: computed.fontWeight,
        textAlign: (['left','center','right','justify'].includes(computed.textAlign) ? computed.textAlign : 'left') as StyleDraft['textAlign'],
        marginTop: Number.parseFloat(computed.marginTop) || 0, marginBottom: Number.parseFloat(computed.marginBottom) || 0,
        padding: Number.parseFloat(computed.paddingTop) || 0, borderRadius: Number.parseFloat(computed.borderRadius) || 0, width: 0, minHeight: 0,
        effects: safeStudioEffect(draft.pages[pageId]?.[selectorFor(candidate)]?.style?.effects),
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
  }, [ready, src, srcDoc, pageId, designOnly]);

  useEffect(() => {
    if (!ready || !selected) return;
    const element = targetRef.current;
    if (!element || protectedElement(element)) return;
    if (selected.textEditable) element.textContent = selected.text.slice(0, 2000);
    element.style.color = style.color;
    // Selection must never paint a transparent or gradient frame black (or any other colour).
    if (/^#[0-9a-f]{6}$/i.test(style.backgroundColor)) element.style.backgroundColor = style.backgroundColor;
    element.style.fontSize = style.fontSize + 'px'; element.style.fontWeight = style.fontWeight;
    element.style.textAlign = style.textAlign; element.style.marginTop = style.marginTop + 'px';
    element.style.marginBottom = style.marginBottom + 'px'; element.style.padding = style.padding + 'px';
    element.style.borderRadius = style.borderRadius + 'px'; element.style.width = style.width > 0 ? style.width + 'px' : '';
    element.style.minHeight = style.minHeight > 0 ? style.minHeight + 'px' : '';
    ensureStudioEffectsStyles(element.ownerDocument);
    applyStudioEffects(element, style.effects);
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

  const applySmartPreset = (preset: StudioDesignPreset) => {
    if (!selected) { setNotice('First select any text, card, button or section.'); return; }
    const next: Partial<StyleDraft> = preset === 'clean'
      ? { padding: 12, borderRadius: 6, backgroundColor: '#ffffff', color: '#0f172a', fontWeight: '400' }
      : preset === 'rounded'
        ? { padding: 24, borderRadius: 22, backgroundColor: '#eff6ff', color: '#0b3979', fontWeight: '600' }
        : preset === 'glass'
          ? { padding: 24, borderRadius: 18, backgroundColor: '#f1f5f9', color: '#334155', fontWeight: '500' }
          : { padding: 20, borderRadius: 10, backgroundColor: '#0b3979', color: '#ffffff', fontWeight: '800' };
    setStyle(current => ({ ...current, ...next }));
    setNotice('Smart design preset applied in Preview. Save Cloud Draft to keep it.');
  };
  const pageComponents = draft.addedComponents?.[pageId] || [];
  const managedComponent = pageComponents.find(item => item.id === managedComponentId);
  const replaceComponents = (next: Added[], message: string) => {
    if (user && isAdmin && !cloudReady) { setNotice('Cloud Draft लोड होने के बाद edit करें।'); return; }
    setComponentUndo(prev => ({ ...prev, [pageId]: [...(prev[pageId] || []), pageComponents].slice(-30) }));
    setComponentRedo(prev => ({ ...prev, [pageId]: [] }));
    setDraft(prev => ({ ...prev, addedComponents: { ...(prev.addedComponents || {}), [pageId]: next } }));
    setNotice(message + ' · Save Cloud Draft to keep changes.');
  };
  const undoComponents = () => {
    const history = componentUndo[pageId] || [];
    if (!history.length) return;
    setComponentUndo(prev => ({ ...prev, [pageId]: history.slice(0, -1) }));
    setComponentRedo(prev => ({ ...prev, [pageId]: [...(prev[pageId] || []), pageComponents].slice(-30) }));
    setDraft(prev => ({ ...prev, addedComponents: { ...(prev.addedComponents || {}), [pageId]: history[history.length - 1] } }));
    setManagedComponentId(null);
    setNotice('Undo applied to added components.');
  };
  const redoComponents = () => {
    const future = componentRedo[pageId] || [];
    if (!future.length) return;
    setComponentRedo(prev => ({ ...prev, [pageId]: future.slice(0, -1) }));
    setComponentUndo(prev => ({ ...prev, [pageId]: [...(prev[pageId] || []), pageComponents].slice(-30) }));
    setDraft(prev => ({ ...prev, addedComponents: { ...(prev.addedComponents || {}), [pageId]: future[future.length - 1] } }));
    setManagedComponentId(null);
    setNotice('Redo applied to added components.');
  };
  const updateComponent = (id: string, patch: Partial<Pick<Added, 'text' | 'subtitle' | 'url' | 'effects'>>) => {
    replaceComponents(pageComponents.map(item => item.id === id ? { ...item, ...patch } : item), 'Component updated');
  };
  const duplicateComponent = (id: string) => {
    const index = pageComponents.findIndex(item => item.id === id);
    if (index < 0) return;
    const copy = { ...pageComponents[index], id: 'builder-' + crypto.randomUUID() };
    replaceComponents([...pageComponents.slice(0,index+1), copy, ...pageComponents.slice(index+1)], 'Component duplicated');
    setManagedComponentId(copy.id);
  };
  const deleteComponent = (id: string) => {
    replaceComponents(pageComponents.filter(item => item.id !== id), 'Component deleted');
    setManagedComponentId(null);
  };
  const moveComponent = (id: string, offset: -1 | 1) => {
    const index = pageComponents.findIndex(item => item.id === id);
    const other = index + offset;
    if (index < 0 || other < 0 || other >= pageComponents.length) return;
    const next = [...pageComponents];
    [next[index], next[other]] = [next[other], next[index]];
    replaceComponents(next, 'Component reordered');
  };

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
      kind,
      text: kind === 'heading' ? 'New section heading' :
        kind === 'text' ? 'Write your content here.' :
        kind === 'button' ? 'Button label' :
        kind === 'card' ? 'New content card' :
        kind === 'columns' ? 'First column content' :
        kind === 'video' ? 'Video lesson' :
        kind === 'pdf' ? 'PDF learning resource' :
        kind === 'hero' ? 'Welcome to our learning portal' :
        kind === 'steps' ? 'Learning Roadmap' :
        kind === 'quote' ? 'Learning opens new possibilities.' :
        kind === 'faq' ? 'What will I learn?' :
        kind === 'callout' ? 'Important announcement' :
        kind === 'stat' ? '100+' : asset?.name || 'New component',
      subtitle: kind === 'quote' ? 'Your source or attribution' :
        kind === 'faq' ? 'Write the answer here.' :
        kind === 'callout' ? 'Add the important details here.' :
        kind === 'stat' ? 'Courses and resources' :
        kind === 'hero' ? 'Explore our latest courses and lessons.' :
        kind === 'steps' ? 'Choose a lesson\\nPractice new skills\\nReview progress' : undefined,
      parentSelector, ...(asset ? { mediaPath: asset.path, altText: mediaAlt || asset.name } : {}),
    };
    replaceComponents([...pageComponents, item], 'Component inserted');
    setManagedComponentId(item.id);
    setInspectorOpen(true);
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
    if (!cloudReady || saving) { setStatus('Cloud Draft लोड होने के बाद ही Save करें।'); return; }
    if (!selected && !(draft.addedComponents?.[pageId]?.length) && themeName === 'original') { setStatus('पहले page पर element, component या theme चुनें।'); return; }
    setSaving(true); setStatus('Supabase Draft सेव हो रहा है…');
    try {
      const history = await getWebsiteConfigVersions();
      const latest = history.find(item => item.status === 'draft') || history.find(item => item.status === 'published');
      const base: WebsiteConfig = latest?.config || { hero: {}, header: {}, sections: {}, palette: 'navy' };
      const existingVisual = (base.visualEditor || {}) as Draft;
      const next: Draft = {
        ...existingVisual,
        version: 1,
        pages: selected && safeSelector(selected.selector) ? {
          ...draft.pages,
          [pageId]: {
            ...(draft.pages[pageId] || {}),
            [selected.selector]: { selector: selected.selector, text: selected.textEditable ? selected.text.slice(0, 2000) : '', textEditable: selected.textEditable, style: { ...style } },
          },
        } : draft.pages,
        addedComponents: Object.fromEntries(Object.entries(draft.addedComponents || {}).map(([key, items]) => [
          key, items.map(item => ({ ...item, url: item.url ? safeStudioMediaUrl(item.url) || undefined : undefined })),
        ])),
        customPages: existingVisual.customPages || draft.customPages || [],
        themes: { ...(existingVisual.themes || {}), ...(draft.themes || {}) },
      };
      const savedId = await saveWebsiteConfigDraft({ ...base, visualEditor: next });
      onDraftSaved?.(savedId);
      setDraft(next);
      const refreshed = await getWebsiteConfigVersions();
      const saved = refreshed.find(item => item.status === 'draft');
      setStatus(saved ? 'Cloud Draft saved · Version ' + saved.version_number : 'Cloud Draft saved');
      setNotice('Supabase में Draft सुरक्षित हुआ। Live website publish नहीं हुई।');
    } catch (error) { setStatus(error instanceof Error ? error.message : 'Cloud Draft सेव नहीं हुआ'); }
    finally { setSaving(false); }
  };

  const restoreOriginalBackground = () => {
    const element = targetRef.current;
    if (!element) return;
    const original = element.ownerDocument.createElement('div');
    if (originalStyleRef.current) original.setAttribute('style', originalStyleRef.current);
    const background = original.style.getPropertyValue('background-color');
    if (background) element.style.setProperty('background-color', background, original.style.getPropertyPriority('background-color'));
    else element.style.removeProperty('background-color');
    setStyle(current => ({ ...current, backgroundColor: 'original' }));
    setNotice('Original background restored in Preview. Save Cloud Draft to keep it.');
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
    <div className="min-w-0 space-y-2">
      <div data-testid="studio-editor-workspace" className="min-w-0">
      <div className="mx-auto min-w-0 w-full overflow-hidden rounded-xl border border-slate-300 bg-white shadow-sm" style={{ height: 'min(76vh, 860px)', minHeight: 480, maxWidth: mobile ? '390px' : '100%' }}>
        <iframe ref={iframe} title={'Interactive website editor · ' + pageLabel} src={src} srcDoc={srcDoc} onLoad={() => setReady(true)} className="h-full w-full border-0" />
      </div>
      </div>
      {createPortal(<>
        <div ref={toolbarRootRef} data-testid="studio-editor-controls" style={{ left: toolbarPos.x, top: toolbarPos.y }} className="fixed z-[99990] w-max max-w-[calc(100vw-24px)] max-h-[calc(100vh-24px)] overflow-y-auto rounded-xl border border-slate-200 bg-white/95 p-2 shadow-[0_18px_48px_rgba(15,23,42,.24)] backdrop-blur">
          <div className="mb-1 flex items-center justify-between gap-3 border-b border-slate-100 px-1 pb-1">
            <button data-testid="studio-toolbar-grip" type="button" aria-label="Move toolbar" onPointerDown={event => startFloatingDrag(event, 'toolbar')} className="flex touch-none cursor-move items-center gap-2 rounded-md px-2 py-1 text-[11px] font-extrabold text-slate-800 hover:bg-slate-100"><Move className="h-3.5 w-3.5"/>Editor Tools</button>
            <span className="max-w-[200px] truncate text-[10px] font-semibold text-sky-800" title={status}>{status}</span>
          </div>
        <div data-visual-editor-ui="toolbar" className="flex min-w-0 flex-wrap items-center gap-1.5 rounded-lg bg-transparent p-1">
          <button type="button" aria-expanded={componentsOpen} onClick={() => { setComponentsOpen(value => !value); setMediaOpen(false); }} className="inline-flex items-center gap-1 rounded-lg bg-sky-900 px-3 py-2.5 text-xs font-bold text-white"><Plus className="h-3.5 w-3.5"/>Components <span className="rounded bg-white/15 px-1">{palette.length}</span></button>
          <button type="button" onClick={() => { setMediaOpen(value => !value); setComponentsOpen(false); }} className={'inline-flex items-center gap-1 rounded-lg px-3 py-2.5 text-xs font-bold ' + (mediaOpen ? 'bg-violet-100 text-violet-900' : 'bg-slate-100 text-slate-700')}><ImageIcon className="h-3.5 w-3.5"/>Media</button>
          <button type="button" onClick={() => { setInspectorOpen(value => !value); setComponentsOpen(false); }} aria-pressed={inspectorOpen} className={'inline-flex items-center gap-1 rounded-lg px-3 py-2.5 text-xs font-bold ' + (inspectorOpen ? 'bg-sky-100 text-sky-900' : 'bg-slate-100 text-slate-700')}><Settings2 className="h-3.5 w-3.5"/>{inspectorOpen ? 'Hide Properties' : 'Show Properties'}</button>
          <button type="button" onClick={() => { setThemesOpen(value => !value); setComponentsOpen(false); setMediaOpen(false); }} aria-expanded={themesOpen} className={'inline-flex items-center gap-1 rounded-lg px-3 py-2.5 text-xs font-bold ' + (themesOpen ? 'bg-orange-100 text-orange-900' : 'bg-slate-100 text-slate-700')}><Palette className="h-3.5 w-3.5"/>Themes</button>
          <button type="button" onClick={() => { setSmartToolsOpen(v => !v); setThemesOpen(false); setMediaOpen(false); setComponentsOpen(false); setInspectorOpen(true); }} aria-expanded={smartToolsOpen} className={'rounded-lg px-3 py-2.5 text-xs font-bold ' + (smartToolsOpen ? 'bg-violet-100 text-violet-900' : 'bg-slate-100 text-slate-700')}>✨ Smart Tools</button>
          <button type="button" aria-label="Undo added component" title="Undo added component" disabled={!(componentUndo[pageId] || []).length} onClick={undoComponents} className="rounded-lg border px-2 py-2 text-slate-700 disabled:opacity-40">↶</button>
          <button type="button" aria-label="Redo added component" title="Redo added component" disabled={!(componentRedo[pageId] || []).length} onClick={redoComponents} className="rounded-lg border px-2 py-2 text-slate-700 disabled:opacity-40">↷</button>
        </div>
        {(componentsOpen || mediaOpen || themesOpen || smartToolsOpen) && <div data-testid="studio-tool-panels" className="grid min-w-0 max-h-[min(55vh,480px)] gap-3 overflow-y-auto rounded-xl border border-slate-200 bg-slate-50 p-3 sm:grid-cols-2">
        {smartToolsOpen && <section data-visual-editor-ui="smart-tools-panel" 
          className="min-w-0 rounded-xl border border-violet-200 bg-white p-3 shadow-sm">
          <div  className="mb-3 flex  items-center justify-between border-b pb-2">
            <strong className="text-xs text-slate-900">✨ Smart Design Tools</strong>
            <button type="button" onClick={() => setSmartToolsOpen(false)} className="rounded border px-2 py-1 text-xs">×</button>
          </div>
          <p className="mb-2 text-[10px] text-slate-500">Select a website element, then apply a preset or copy a design.</p>
          <div className="grid grid-cols-2 gap-2">
            {STUDIO_DESIGN_PRESETS.map(preset => <button key={preset.value} type="button"
              onClick={() => applySmartPreset(preset.value)} disabled={!selected}
              className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-2 text-left disabled:opacity-50">
              <span className="block text-xs font-bold text-slate-800">{preset.label}</span>
              <span className="text-[10px] text-slate-500">{preset.hint}</span>
            </button>)}
          </div>
          <div className="mt-3 grid grid-cols-3 gap-1">
            <button type="button" disabled={!selected} onClick={() => { setCopiedStyle({ ...style, effects: safeStudioEffect(style.effects) }); setNotice('Style copied. Select a different element to paste.'); }}
              className="rounded-lg border p-2 text-[10px] font-bold disabled:opacity-50">Copy Style</button>
            <button type="button" disabled={!selected || !copiedStyle} onClick={() => { if(copiedStyle) setStyle({ ...copiedStyle }); setNotice('Style pasted in Preview. Save Cloud Draft to keep it.'); }}
              className="rounded-lg border p-2 text-[10px] font-bold disabled:opacity-50">Paste Style</button>
            <button type="button" disabled={!selected} onClick={() => setStyle(current => ({ ...current, color: contrastTextForHex(current.backgroundColor) }))}
              className="rounded-lg border border-violet-200 bg-violet-50 p-2 text-[10px] font-bold disabled:opacity-50">Auto Contrast</button>
          </div>
        </section>}
        {themesOpen && <section data-visual-editor-ui="themes-panel" 
          className="min-w-0 rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
          <div  className="mb-3 flex  items-center justify-between border-b pb-2">
            <strong className="text-xs text-slate-900">Theme Presets</strong>
            <button type="button" onClick={() => setThemesOpen(false)} className="rounded border px-2 py-1 text-xs">×</button>
          </div>
          <div className="grid gap-2">
            {(Object.entries(STUDIO_THEMES) as [StudioTheme, typeof STUDIO_THEMES[StudioTheme]][]).map(([id, preset]) =>
              <button type="button" key={id} aria-pressed={themeName === id}
                onClick={() => chooseTheme(id)}
                className={'flex items-center gap-3 rounded-lg border p-2 text-left text-xs ' + (themeName === id ? 'border-sky-500 bg-sky-50' : 'border-slate-200')}>
                <span className="flex shrink-0 overflow-hidden rounded-md border">
                  <i className="h-6 w-5" style={{ background: preset.primary }}/>
                  <i className="h-6 w-5" style={{ background: preset.accent }}/>
                  <i className="h-6 w-5" style={{ background: preset.surface }}/>
                </span><span className="font-bold text-slate-700">{preset.label}</span>
              </button>)}
          </div>
          <p className="mt-2 text-[10px] text-slate-500">Palette changes Preview only, until Cloud Draft is saved.</p>
        </section>}
        {componentsOpen && <div data-visual-editor-ui="components-menu"  className="min-w-0 max-h-[min(55vh,500px)] overflow-y-auto rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
          <div  className="mb-1 flex items-center justify-between border-b border-slate-100 px-1 pb-2 "><span className="text-[11px] font-extrabold text-slate-800">Add Component to Page</span><button onClick={() => setComponentsOpen(false)} className="rounded px-2 py-1 text-xs text-slate-500">×</button></div>
          <label className="mb-2 flex items-center gap-2 rounded-lg border border-slate-200 px-2"><Search className="h-3.5 w-3.5 text-slate-500"/><input aria-label="Search components" value={componentQuery} onChange={event => setComponentQuery(event.target.value)} placeholder="Search components…" className="w-full bg-transparent p-2 text-xs outline-none"/></label>
          {palette.filter(item => (item.label + ' ' + item.hint).toLowerCase().includes(componentQuery.trim().toLowerCase())).map(item => { const Icon = item.icon; return <button key={item.kind} onClick={() => insertComponent(item.kind)} className="flex w-full items-center gap-2 rounded-lg p-2 text-left hover:bg-sky-50"><span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-sky-50 text-sky-800"><Icon className="h-4 w-4"/></span><span className="min-w-0 flex-1"><span className="block text-xs font-bold text-slate-800">{item.label}</span><span className="block text-[10px] text-slate-500">{item.hint}</span></span><Plus className="h-3.5 w-3.5 text-slate-400"/></button>; })}
        </div>}
        {mediaOpen && <section data-visual-editor-ui="media-panel"  className="min-w-0 max-h-[min(55vh,500px)] overflow-y-auto rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div  className="mb-3 flex items-center justify-between "><div><h3 className="text-sm font-extrabold text-slate-900">Media Library</h3><p className="text-[10px] text-slate-500">Admin-only · Supabase Storage · Max 50 MB</p></div><button onClick={() => setMediaOpen(false)} className="rounded-lg border px-2 py-1 text-xs">Close ×</button></div>
          <input value={mediaAlt} onChange={event => setMediaAlt(event.target.value)} placeholder="Alt text / accessible description" className="mb-2 w-full rounded-lg border p-2 text-[11px]"/>
          <label className="block cursor-pointer rounded-lg border border-dashed border-violet-300 bg-violet-50 p-3 text-center text-[11px] font-bold text-violet-900">{mediaBusy ? 'Uploading…' : 'Upload Image / Video'}<input type="file" accept="image/jpeg,image/png,image/webp,image/gif,image/avif,video/mp4,video/webm" disabled={mediaBusy || !isAdmin} className="hidden" onChange={event => { const file = event.target.files?.[0]; if (file) void uploadMedia(file); event.currentTarget.value = ''; }}/></label>
          {mediaError && <p role="alert" className="mt-2 rounded-lg bg-rose-50 p-2 text-[10px] text-rose-700">{mediaError}</p>}
          {mediaLoading ? <p className="py-4 text-center text-xs text-slate-500">Loading media…</p> : media.length === 0 ? <p className="py-4 text-center text-xs text-slate-400">No media uploaded yet.</p> : <div className="mt-3 grid grid-cols-2 gap-2">{media.map(asset => <div key={asset.path} className="overflow-hidden rounded-lg border border-slate-200 bg-white"><div className="grid h-20 place-items-center bg-slate-100">{asset.type === 'image' ? <img src={asset.url} alt={asset.name} className="h-full w-full object-cover"/> : <Video className="h-7 w-7 text-slate-500"/>}</div><p className="truncate px-2 pt-1 text-[9px] text-slate-600">{asset.name}</p><button onClick={() => insertComponent(asset.type === 'video' ? 'video' : 'image', asset)} className="m-1 w-[calc(100%-8px)] rounded-md bg-sky-900 p-1.5 text-[10px] font-bold text-white">Insert into page</button></div>)}</div>}
          <button onClick={() => void loadMedia()} disabled={mediaLoading} className="mt-3 w-full rounded-lg border p-2 text-[10px] font-bold text-slate-600">Refresh Library</button>
        </section>}        </div>}
        </div>
        {inspectorOpen && <aside ref={inspectorRootRef} data-visual-editor-ui="inspector-panel" data-testid="studio-floating-inspector" style={{ left: inspectorPos.x, top: inspectorPos.y, width: inspectorSize.width, height: inspectorSize.height }} className="fixed z-[99997] flex max-w-[calc(100vw-16px)] max-h-[calc(100vh-16px)] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_20px_55px_rgba(15,23,42,.25)]">
          <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-b border-slate-200 bg-white px-3 py-2">
            <button data-testid="studio-inspector-grip" type="button" aria-label="Move Properties Inspector" onPointerDown={event => startFloatingDrag(event, 'inspector')} className="flex touch-none cursor-move items-center gap-2 rounded-lg px-2 py-1 text-left text-slate-900 hover:bg-slate-100">
              <Move className="h-4 w-4 text-slate-500"/><span className="text-sm font-extrabold">Properties Inspector</span>
            </button>
            <button type="button" aria-label="Close Inspector" onClick={() => setInspectorOpen(false)} className="rounded-lg border border-slate-200 px-2 py-1 text-xs">×</button>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-6 pt-3">
            <p className="mb-3 text-[11px] text-slate-500">Drag the title to move · resize from bottom-right</p>
          {managedComponent && <div data-testid="managed-component-editor" className="mb-3 space-y-2 rounded-xl border border-violet-200 bg-violet-50/40 p-3">
            <p className="text-xs font-bold text-violet-900">Edit Added Component · {managedComponent.kind}</p>
            <label className="block text-[10px] font-semibold text-slate-600">Title / Text<textarea aria-label="Component title" rows={2} maxLength={2000} value={managedComponent.text} onChange={event => updateComponent(managedComponent.id, { text: event.target.value })} className="mt-1 w-full rounded-lg border p-2 text-xs"/></label>
            <label className="block text-[10px] font-semibold text-slate-600">Subtitle / Answer / Attribution<textarea aria-label="Component subtitle" rows={2} maxLength={2000} value={managedComponent.subtitle || ''} onChange={event => updateComponent(managedComponent.id, { subtitle: event.target.value })} className="mt-1 w-full rounded-lg border p-2 text-xs"/></label>
            <div data-testid="component-effects" className="space-y-2 rounded-lg border border-violet-200 bg-white p-2">
              <p className="text-[10px] font-extrabold text-violet-900">Component Animation & Filters</p>
              <label className="block text-[10px] font-bold">Animation
                <select aria-label="Component animation" value={safeStudioEffect(managedComponent.effects).animation}
                  onChange={event => updateComponent(managedComponent.id, { effects: { ...safeStudioEffect(managedComponent.effects), animation: event.target.value as StudioEffect['animation'] } })}
                  className="mt-1 w-full rounded border p-2 text-xs">
                  {STUDIO_ANIMATIONS.map(item => <option key={item.value} value={item.value}>{item.label}</option>)}
                </select>
              </label>
              <label className="block text-[10px] font-bold">Filter
                <select aria-label="Component filter" value={safeStudioEffect(managedComponent.effects).filter}
                  onChange={event => updateComponent(managedComponent.id, { effects: { ...safeStudioEffect(managedComponent.effects), filter: event.target.value as StudioEffect['filter'] } })}
                  className="mt-1 w-full rounded border p-2 text-xs">
                  {STUDIO_FILTERS.map(item => <option key={item.value} value={item.value}>{item.label}</option>)}
                </select>
              </label>
              <label className="block text-[10px] font-bold">Hover Effect
                <select aria-label="Component hover" value={safeStudioEffect(managedComponent.effects).hover}
                  onChange={event => updateComponent(managedComponent.id, { effects: { ...safeStudioEffect(managedComponent.effects), hover: event.target.value as StudioEffect['hover'] } })}
                  className="mt-1 w-full rounded border p-2 text-xs">
                  {STUDIO_HOVERS.map(item => <option key={item.value} value={item.value}>{item.label}</option>)}
                </select>
              </label>
            </div>
            {['video', 'pdf'].includes(managedComponent.kind) && <label className="block text-[10px] font-semibold text-slate-600">
              {managedComponent.kind === 'pdf' ? 'PDF document HTTPS URL' : 'Video MP4/WEBM/YouTube HTTPS URL'}
              <input aria-label="Component media URL" type="url" placeholder="https://..." maxLength={2048}
                value={managedComponent.url || ''} onChange={event => updateComponent(managedComponent.id, { url: event.target.value })}
                className="mt-1 w-full rounded-lg border bg-white p-2 text-xs"/>
              {managedComponent.url && !safeStudioMediaUrl(managedComponent.url) &&
                <span role="alert" className="mt-1 block text-[10px] text-rose-700">Only HTTPS media URLs are allowed.</span>}
              {managedComponent.kind === 'pdf' && <span className="mt-1 block text-[10px] text-slate-500">PDF via external HTTPS link. Private PDF upload is not enabled in this Preview.</span>}
            </label>}
            <div className="grid grid-cols-4 gap-1">
              <button type="button" aria-label="Move component up" title="Move up" disabled={pageComponents.findIndex(item => item.id === managedComponent.id) === 0} onClick={() => moveComponent(managedComponent.id,-1)} className="rounded border bg-white p-2 disabled:opacity-40"><ChevronUp className="mx-auto h-4 w-4"/></button>
              <button type="button" aria-label="Move component down" title="Move down" disabled={pageComponents.findIndex(item => item.id === managedComponent.id) === pageComponents.length - 1} onClick={() => moveComponent(managedComponent.id,1)} className="rounded border bg-white p-2 disabled:opacity-40"><ChevronDown className="mx-auto h-4 w-4"/></button>
              <button type="button" aria-label="Duplicate component" title="Duplicate" onClick={() => duplicateComponent(managedComponent.id)} className="rounded border bg-white p-2"><Copy className="mx-auto h-4 w-4"/></button>
              <button type="button" aria-label="Delete component" title="Delete" onClick={() => deleteComponent(managedComponent.id)} className="rounded border border-rose-200 bg-rose-50 p-2 text-rose-700"><Trash2 className="mx-auto h-4 w-4"/></button>
            </div>
            <button type="button" onClick={() => void saveCloudDraft()} disabled={saving || !cloudReady || !isAdmin} className="w-full rounded-lg bg-emerald-700 px-3 py-2 text-xs font-bold text-white disabled:opacity-50">{saving ? 'Saving…' : 'Save Cloud Draft'}</button>
          </div>}
          {selected ? <div className="space-y-2">
            <p className="rounded-lg bg-sky-50 p-2 text-[10px] font-bold text-sky-900">{selected.tag.toUpperCase()} · {Math.round(selected.width)} × {Math.round(selected.height)} px</p>
            {selected.textEditable && <label className="block text-[10px] font-semibold text-slate-600">Text / Content<textarea rows={3} value={selected.text} onChange={event => setSelected(current => current ? { ...current, text: event.target.value } : current)} className="mt-1 w-full rounded-lg border p-2 text-xs"/></label>}
            <label className="block text-[10px] font-semibold text-slate-600">Text Colour<input type="color" value={style.color} onChange={event => setStyle(current => ({ ...current, color: event.target.value }))} className="mt-1 h-8 w-full"/></label>
            <label className="block text-[10px] font-semibold text-slate-600">Background · {style.backgroundColor === 'original' ? 'Original (unchanged)' : 'Custom colour'}<input aria-label="Background colour" type="color" value={style.backgroundColor === 'original' ? backgroundSwatch : style.backgroundColor} onChange={event => setStyle(current => ({ ...current, backgroundColor: event.target.value }))} className="mt-1 h-8 w-full"/></label>
            <button type="button" disabled={style.backgroundColor === 'original'} onClick={restoreOriginalBackground} className="w-full rounded-lg border border-sky-200 bg-sky-50 p-2 text-[10px] font-bold text-sky-900 disabled:opacity-50">Keep Original Background</button>
            <label className="block text-[10px] font-semibold text-slate-600">Font Size · {style.fontSize}px<input type="range" min="8" max="72" value={style.fontSize} onChange={event => setStyle(current => ({ ...current, fontSize: Number(event.target.value) }))} className="mt-1 w-full"/></label>
            <label className="block text-[10px] font-semibold text-slate-600">Width · {style.width ? style.width + 'px' : 'Auto'}<input type="range" min="0" max="1400" step="10" value={style.width} onChange={event => setStyle(current => ({ ...current, width: Number(event.target.value) }))} className="mt-1 w-full"/></label>
            <label className="block text-[10px] font-semibold text-slate-600">Min Height · {style.minHeight}px<input type="range" min="0" max="700" step="5" value={style.minHeight} onChange={event => setStyle(current => ({ ...current, minHeight: Number(event.target.value) }))} className="mt-1 w-full"/></label>
            <label className="block text-[10px] font-semibold text-slate-600">Padding · {style.padding}px<input type="range" min="0" max="80" value={style.padding} onChange={event => setStyle(current => ({ ...current, padding: Number(event.target.value) }))} className="mt-1 w-full"/></label>
            <label className="block text-[10px] font-semibold text-slate-600">Top Spacing · {style.marginTop}px<input type="range" min="0" max="120" value={style.marginTop} onChange={event => setStyle(current => ({ ...current, marginTop: Number(event.target.value) }))} className="mt-1 w-full"/></label>
            <label className="block text-[10px] font-semibold text-slate-600">Bottom Spacing · {style.marginBottom}px<input type="range" min="0" max="120" value={style.marginBottom} onChange={event => setStyle(current => ({ ...current, marginBottom: Number(event.target.value) }))} className="mt-1 w-full"/></label>
            <label className="block text-[10px] font-semibold text-slate-600">Corner Radius · {style.borderRadius}px<input type="range" min="0" max="48" value={style.borderRadius} onChange={event => setStyle(current => ({ ...current, borderRadius: Number(event.target.value) }))} className="mt-1 w-full"/></label>
            <label className="block text-[10px] font-semibold text-slate-600">Text Alignment<select value={style.textAlign} onChange={event => setStyle(current => ({ ...current, textAlign: event.target.value as StyleDraft['textAlign'] }))} className="mt-1 w-full rounded-lg border p-2 text-xs"><option value="left">Left</option><option value="center">Center</option><option value="right">Right</option><option value="justify">Justify</option></select></label>
            <div data-testid="effects-inspector" className="space-y-2 rounded-lg border border-violet-200 bg-violet-50/40 p-2">
              <p className="text-[11px] font-extrabold text-violet-900">Animations · Filters · Hover Effects</p>
              <label className="block text-[10px] font-bold text-slate-600">Entrance Animation
                <select aria-label="Entrance Animation" value={safeStudioEffect(style.effects).animation} onChange={event => setStyle(current => ({ ...current, effects: { ...safeStudioEffect(current.effects), animation: event.target.value as StudioEffect['animation'] } }))} className="mt-1 w-full rounded border p-2 text-xs">
                  {STUDIO_ANIMATIONS.map(item => <option value={item.value} key={item.value}>{item.label}</option>)}
                </select>
              </label>
              <label className="block text-[10px] font-bold text-slate-600">Visual Filter
                <select aria-label="Visual Filter" value={safeStudioEffect(style.effects).filter} onChange={event => setStyle(current => ({ ...current, effects: { ...safeStudioEffect(current.effects), filter: event.target.value as StudioEffect['filter'] } }))} className="mt-1 w-full rounded border p-2 text-xs">
                  {STUDIO_FILTERS.map(item => <option value={item.value} key={item.value}>{item.label}</option>)}
                </select>
              </label>
              <label className="block text-[10px] font-bold text-slate-600">Hover Animation
                <select aria-label="Hover Animation" value={safeStudioEffect(style.effects).hover} onChange={event => setStyle(current => ({ ...current, effects: { ...safeStudioEffect(current.effects), hover: event.target.value as StudioEffect['hover'] } }))} className="mt-1 w-full rounded border p-2 text-xs">
                  {STUDIO_HOVERS.map(item => <option value={item.value} key={item.value}>{item.label}</option>)}
                </select>
              </label>
              <span className="text-[10px] text-slate-500">Effects respect reduced-motion preferences. Preview first, then Save Cloud Draft.</span>
            </div>
            <div className="flex gap-2 pt-1"><button onClick={resetSelected} className="flex-1 rounded-lg border p-2 text-[10px] font-bold">Reset</button><button onClick={() => void saveCloudDraft()} disabled={saving || !cloudReady || !isAdmin} className="flex-1 rounded-lg bg-emerald-700 p-2 text-[10px] font-bold text-white disabled:opacity-50">{saving ? 'Saving…' : 'Save Cloud Draft'}</button></div>
          </div> : !managedComponent && <div className="space-y-3"><div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-4"><p className="text-sm font-bold text-slate-800">कोई Element चयनित नहीं है</p><p className="mt-2 text-xs leading-5 text-slate-600">Preview में किसी Text, Button, Card, Image या Section पर क्लिक करें। चुने हुए Element की Properties यहाँ दिखाई देंगी।</p><p className="mt-2 text-[11px] text-slate-500">नया Component जोड़ने के लिए ऊपर Components खोलें।</p></div>{(draft.addedComponents?.[pageId]?.length || 0) > 0 && <div className="rounded-xl border border-emerald-100 bg-emerald-50/50 p-3"><p className="mb-2 text-xs text-emerald-900">इस पेज पर {draft.addedComponents?.[pageId]?.length || 0} Added Component मौजूद हैं।</p><button type="button" onClick={() => void saveCloudDraft()} disabled={saving || !cloudReady || !isAdmin} className="w-full rounded-lg bg-emerald-700 p-2.5 text-xs font-bold text-white disabled:opacity-50">{saving ? 'Saving…' : 'Save Current Draft'}</button><p className="mt-2 text-[11px] text-emerald-900">केवल Draft सेव होगा; Live वेबसाइट publish नहीं होगी।</p></div>}</div>}
          <p className="mt-2 text-[9px] leading-4 text-slate-500">{notice || 'Changes appear immediately in this Preview. Cloud Draft save never publishes the Live website.'}</p>
          </div>
          <button type="button" data-testid="studio-inspector-resize" aria-label="Resize Properties Inspector" onPointerDown={startInspectorResize} className="absolute bottom-0 right-0 z-10 grid h-7 w-7 touch-none cursor-nwse-resize place-items-center rounded-tl-lg bg-sky-100 text-sky-800" title="Drag to resize inspector"><MoveDiagonal2 className="h-4 w-4"/></button>
        </aside>}
      </>, document.body)}
    </div>
  );
};
