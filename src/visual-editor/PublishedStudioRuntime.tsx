import { useEffect } from 'react';
import { STUDIO_THEMES, parseStudioPages, safeStudioMediaUrl, studioYouTubeEmbed, type StudioTheme } from './studioBuilder';
import { getVisualEditorPage } from './registry';
import { ensureStudioEffectsStyles, applyStudioEffects, type StudioEffect } from './effects';
import type { WebsiteConfig } from '../services/siteConfigService';

type VisualComponent = { id: string; kind: string; text: string; subtitle?: string; parentSelector: string; url?: string; mediaPath?: string };
type VisualStyle = {
  color: string; backgroundColor: string; fontSize: number; fontWeight: string; textAlign: string; effects?: StudioEffect;
  marginTop: number; marginBottom: number; padding: number; borderRadius: number; width: number; minHeight: number;
};
type VisualOverride = { selector: string; text: string; textEditable: boolean; style: VisualStyle };
type VisualPayload = {
  version: number;
  pages?: Record<string, Record<string, VisualOverride>>;
  addedComponents?: Record<string, VisualComponent[]>;
  themes?: Record<string, StudioTheme>;
  customPages?: unknown;
};

const safeSelector = (selector: string): boolean =>
  selector.length < 1024 && /^body( > [a-z][a-z0-9-]*:nth-of-type\([1-9]\d*\))+$/.test(selector);

const protectedMarkup = (element: Element): boolean =>
  Boolean(element.closest('form,input,textarea,select,[data-visual-editor-protected],[data-visual-editor-ui]'));

const make = (doc: Document, tag: string, text: string, style?: string): HTMLElement => {
  const node = doc.createElement(tag);
  node.textContent = text.slice(0, 2000);
  if (style) node.style.cssText = style;
  return node;
};

/** Render published components using DOM nodes/textContent, not raw HTML or scripts. */
function renderComponent(doc: Document, item: VisualComponent, parent: Element): void {
  if (!/^builder-[a-z0-9-]{5,100}$/i.test(item.id) || !item.text || item.text.length > 2000) return;
  if (doc.querySelector('[data-builder-component-id="' + item.id + '"]')) return;
  const title = item.text;
  const subtitle = (item.subtitle || '').slice(0, 2000);
  let element: HTMLElement;
  switch (item.kind) {
    case 'heading':
      element = make(doc, 'h2', title, 'font-size:28px;font-weight:800;color:#0b3979;margin:20px 0'); break;
    case 'text':
      element = make(doc, 'p', title, 'line-height:1.7;margin:16px 0'); break;
    case 'button':
      element = make(doc, 'button', title, 'border-radius:10px;background:#0b3979;color:white;padding:12px 20px;margin:12px 0;font-weight:700');
      (element as HTMLButtonElement).type = 'button'; break;
    case 'divider':
      element = make(doc, 'hr', '', 'margin:24px 0;border:0;border-top:1px solid #cbd5e1;'); break;
    case 'spacer':
      element = make(doc, 'div', '', 'height:32px;');
      element.setAttribute('aria-hidden', 'true'); break;
    case 'quote': {
      element = make(doc, 'blockquote', '', 'margin:16px 0;padding:20px;border-left:4px solid #0b3979;background:#eff6ff;border-radius:12px');
      element.append(make(doc, 'p', title, 'font-size:20px;font-style:italic;'), make(doc, 'cite', subtitle || 'Source'));
      break;
    }
    case 'faq': {
      element = make(doc, 'details', '', 'margin:14px 0;padding:18px;border:1px solid #bfdbfe;border-radius:12px;');
      element.append(make(doc, 'summary', title, 'font-weight:700;cursor:pointer;'), make(doc, 'p', subtitle || 'Answer', 'margin-top:10px;'));
      break;
    }
    case 'hero': {
      element = make(doc, 'section', '', 'margin:16px 0;padding:44px 28px;text-align:center;background:linear-gradient(120deg,#0b3979,#0e7490);color:white;border-radius:22px;');
      element.append(make(doc, 'h2', title, 'font-size:36px;color:white;'), make(doc, 'p', subtitle, 'line-height:1.6;color:white;'));
      break;
    }
    case 'stat': {
      element = make(doc, 'section', '', 'margin:16px 0;padding:24px;border:1px solid #e2e8f0;border-radius:14px;text-align:center;');
      element.append(make(doc, 'strong', title, 'display:block;font-size:38px;color:#0b3979;'), make(doc, 'p', subtitle));
      break;
    }
    case 'callout': {
      element = make(doc, 'aside', '', 'padding:20px;margin:16px 0;background:#f0fdfa;border-left:4px solid #0d9488;border-radius:12px;');
      element.append(make(doc, 'strong', title, 'font-size:17px;'), make(doc, 'p', subtitle));
      break;
    }
    case 'steps': {
      element = make(doc, 'section', '', 'margin:16px 0;padding:22px;background:#f8fafc;border:1px solid #cbd5e1;border-radius:12px;');
      element.appendChild(make(doc, 'h2', title));
      (subtitle || 'Learn\nPractice\nReview').split('\n').slice(0, 12)
        .forEach((step, index) => element.appendChild(make(doc, 'p', (index + 1) + '. ' + step, 'padding:10px;background:white;border-radius:8px;')));
      break;
    }
    case 'video': {
      const url = safeStudioMediaUrl(item.url || '');
      const youtube = url ? studioYouTubeEmbed(url) : null;
      if (youtube) {
        element = make(doc, 'iframe', '') as HTMLIFrameElement;
        const frame = element as HTMLIFrameElement;
        frame.src = youtube; frame.title = title;
        frame.allow = 'encrypted-media; picture-in-picture';
        frame.setAttribute('sandbox', 'allow-scripts allow-same-origin allow-presentation');
        frame.style.cssText = 'width:100%;aspect-ratio:16/9;border:0;border-radius:12px;margin:16px 0;';
      } else if (url) {
        element = make(doc, 'video', '') as HTMLVideoElement;
        const video = element as HTMLVideoElement;
        video.controls = true; video.preload = 'metadata'; video.src = url;
        video.style.cssText = 'width:100%;max-height:440px;background:#0f172a;border-radius:12px;margin:16px 0;';
      } else element = make(doc, 'p', title + ' · Video URL required');
      break;
    }
    case 'pdf': {
      const url = safeStudioMediaUrl(item.url || '');
      element = make(doc, 'section', '', 'margin:16px 0;padding:14px;border:1px solid #cbd5e1;border-radius:12px;');
      element.appendChild(make(doc, 'h3', title));
      if (url) {
        const frame = doc.createElement('iframe');
        frame.title = title; frame.src = url; frame.loading = 'lazy';
        frame.setAttribute('sandbox', '');
        frame.style.cssText = 'display:block;width:100%;height:560px;border:0;';
        const link = make(doc, 'a', 'Open PDF in new tab') as HTMLAnchorElement;
        link.href = url; link.target = '_blank'; link.rel = 'noopener noreferrer';
        element.append(frame, link);
      }
      break;
    }
    case 'columns':
      element = make(doc, 'div', title + ' | ' + (subtitle || 'Second column'),
        'display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:16px;padding:20px;margin:16px 0;background:#eff6ff;border-radius:12px;'); break;
    case 'card':
      element = make(doc, 'section', title + (subtitle ? ' · ' + subtitle : ''),
        'padding:22px;margin:16px 0;background:#f1f5f9;border-radius:16px;'); break;
    case 'image':
      // Editor's private storage path is not a public URL. Never expose it.
      element = make(doc, 'div', title + ' · Media requires public delivery configuration',
        'padding:24px;border:2px dashed #94a3b8;margin:16px 0;border-radius:12px;'); break;
    default:
      return;
  }
  element.dataset.builderComponentId = item.id;
  parent.appendChild(element);
}

function applyPublished(doc: Document, visual: VisualPayload, pageId: string): void {
  const page = getVisualEditorPage(pageId);
  const custom = parseStudioPages(visual.customPages).some(item => item.id === pageId);
  if (!custom && !page?.editable) return;
  const scope = doc.querySelector('main');
  if (!scope) return;
  ensureStudioEffectsStyles(doc);
  const pageElement = custom ? scope.querySelector('article[data-studio-published-page]') : null;
  const resolve = (selector: string) => {
    if (!safeSelector(selector)) return null;
    // Draft custom-page srcDoc has body > main; published app wraps this in a
    // public React page. Translate only the exact known template root.
    if (pageElement) {
      const root = 'body > main:nth-of-type(1)';
      if (!selector.startsWith(root) || (selector.length > root.length && selector[root.length] !== ' ')) return null;
      const rest = selector.slice(root.length);
      return (rest ? pageElement.querySelector(rest.replace(/^ > /, '')) : pageElement) as HTMLElement | null;
    }
    return doc.querySelector<HTMLElement>(selector);
  };
  doc.querySelector('style[data-published-studio-theme]')?.remove();
  const name = visual.themes?.[pageId];
  if (name && name !== 'original' && Object.prototype.hasOwnProperty.call(STUDIO_THEMES, name)) {
    const theme = STUDIO_THEMES[name];
    const style = doc.createElement('style');
    style.setAttribute('data-published-studio-theme', name);
    style.textContent = 'main{--studio-primary:' + theme.primary + ';--studio-accent:' + theme.accent + ';}' +
      'main h1,main h2,main h3{color:var(--studio-primary)!important;}' +
      'main [data-builder-component-id]{border-color:var(--studio-accent)!important;}';
    doc.head.appendChild(style);
  }
  for (const item of Object.values(visual.pages?.[pageId] || {})) {
    if (!item || !safeSelector(item.selector) || !item.style) continue;
    const node = resolve(item.selector);
    if (!node || !scope.contains(node) || protectedMarkup(node)) continue;
    if (item.textEditable && node.children.length === 0 && /^(H[1-6]|P|LI|SPAN|STRONG|EM)$/.test(node.tagName)) {
      node.textContent = (item.text || '').slice(0, 2000);
    }
    const style = item.style;
    const pixels = (value: number, max: number): string => Math.max(0, Math.min(max, Number(value) || 0)) + 'px';
    if (/^#[0-9a-f]{6}$/i.test(style.color)) node.style.color = style.color;
    if (/^#[0-9a-f]{6}$/i.test(style.backgroundColor)) node.style.backgroundColor = style.backgroundColor;
    node.style.fontSize = pixels(style.fontSize, 72);
    node.style.padding = pixels(style.padding, 80);
    node.style.marginTop = pixels(style.marginTop, 120);
    node.style.marginBottom = pixels(style.marginBottom, 120);
    node.style.borderRadius = pixels(style.borderRadius, 48);
    node.style.textAlign = ['left','center','right','justify'].includes(style.textAlign) ? style.textAlign : 'left';
    if (style.width > 0) node.style.width = pixels(style.width, 1400);
    if (style.minHeight > 0) node.style.minHeight = pixels(style.minHeight, 700);
    if (/^(400|500|600|700|800|900)$/.test(style.fontWeight)) node.style.fontWeight = style.fontWeight;
    applyStudioEffects(node, style.effects);
  }
  const components = visual.addedComponents?.[pageId] || [];
  if (!Array.isArray(components)) return;
  // Only reconcile elements owned by the published studio overlay.
  doc.querySelectorAll('[data-builder-component-id]').forEach(node => node.remove());
  components.slice(0, 100).forEach(item => {
    if (!item || !safeSelector(item.parentSelector)) return;
    const parent = resolve(item.parentSelector);
    if (!parent || !scope.contains(parent) || protectedMarkup(parent)) return;
    renderComponent(doc, item, parent);
  });
}

/** Runs only for actually published versions and public, editable pages. */
export function PublishedStudioRuntime({ config, pageId }: { config: WebsiteConfig | null; pageId: string }) {
  useEffect(() => {
    if (new URLSearchParams(window.location.search).has('visual-editor')) return;
    const visual = config?.visualEditor as VisualPayload | undefined;
    if (!visual || visual.version !== 1) return;
    const root = document.querySelector('main');
    if (!root) return;
    let scheduled = false;
    let running = false;
    const apply = () => {
      if (running) return;
      running = true;
      observer.disconnect();
      try { applyPublished(document, visual, pageId); }
      finally {
        running = false;
        observer.observe(root, { childList: true, subtree: true });
      }
    };
    const observer = new MutationObserver(() => {
      if (scheduled) return;
      scheduled = true;
      requestAnimationFrame(() => { scheduled = false; apply(); });
    });
    apply();
    return () => {
      observer.disconnect();
      document.querySelectorAll('[data-builder-component-id]').forEach(node => node.remove());
      document.querySelector('style[data-published-studio-theme]')?.remove();
    };
  }, [config, pageId]);
  return null;
}
