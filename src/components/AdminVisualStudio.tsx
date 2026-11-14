import React, { useEffect, useState } from 'react';
import { FilePlus2, Layers3, Monitor, MousePointerClick, Image as ImageIcon, ShieldCheck, Smartphone } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { AdminSiteWideLiveEditor } from './AdminSiteWideLiveEditor';
import { getVisualDesignPreviewPages } from '../visual-editor/registry';
import { getWebsiteConfigVersions, saveWebsiteConfigDraft, type WebsiteConfig } from '../services/siteConfigService';
import {
  normalizeStudioSlug, parseStudioPages, studioPagePreviewHtml, STUDIO_TEMPLATES,
  type StudioDraftPage, type StudioTemplate,
} from '../visual-editor/studioBuilder';

const standardPages = getVisualDesignPreviewPages();

export const AdminVisualStudio: React.FC = () => {
  const { user, isAdmin } = useAuth();
  const [pageId, setPageId] = useState<string>('home');
  const [mobile, setMobile] = useState(false);
  const [customPages, setCustomPages] = useState<StudioDraftPage[]>([]);
  const [pagesReady, setPagesReady] = useState(false);
  const [pagesStatus, setPagesStatus] = useState('');
  const [newPageOpen, setNewPageOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newSlug, setNewSlug] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newTemplate, setNewTemplate] = useState<StudioTemplate>('landing');
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    let active = true;
    setPagesReady(false);
    void getWebsiteConfigVersions().then(history => {
      if (!active) return;
      const current = history.find(item => item.status === 'draft') || history.find(item => item.status === 'published');
      const visual = current?.config.visualEditor as { customPages?: unknown } | undefined;
      setCustomPages(parseStudioPages(visual?.customPages));
      setPagesReady(true);
    }).catch(() => {
      if (!active) return;
      setCustomPages([]);
      setPagesReady(true);
      setPagesStatus('Cloud page list unavailable. Preview-only work can still be explored.');
    });
    return () => { active = false; };
  }, [user?.id, isAdmin]);

  const registryPage = standardPages.find(page => page.id === pageId);
  const customPage = customPages.find(page => page.id === pageId);
  const active = registryPage ?? (customPage ? {
    id: customPage.id, path: '/', label: customPage.title, editable: true,
  } : standardPages[0]);
  const designOnly = !active.editable;
  const base = import.meta.env.BASE_URL;
  const pagePath = active.path === '/' ? base : base + active.path.slice(1);
  const src = pagePath + (pagePath.includes('?') ? '&' : '?') + 'visual-editor=1';

  const createDraftPage = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (creating) return;
    const title = newTitle.trim().slice(0, 120);
    const slug = normalizeStudioSlug(newSlug || title);
    if (!title || slug.length < 3) { setPagesStatus('Page title और कम से कम 3 अक्षरों का slug आवश्यक है।'); return; }
    if (customPages.length >= 30) { setPagesStatus('Preview Draft में अधिकतम 30 custom pages बनाए जा सकते हैं।'); return; }
    const reserved = standardPages.some(page => page.path.replace(/^\/|\/$/g, '') === slug || page.id === slug);
    if (reserved || ['admin','admin-preview','login','student-dashboard'].includes(slug) || customPages.some(page => page.slug === slug)) {
      setPagesStatus('यह URL slug पहले से मौजूद है। अलग नाम चुनें।');
      return;
    }
    const added: StudioDraftPage = {
      id: 'custom-' + slug,
      slug, title, description: newDescription.trim().slice(0, 600),
      template: newTemplate, createdAt: new Date().toISOString(),
    };
    setCreating(true);
    try {
      if (user && isAdmin) {
        if (!pagesReady) throw new Error('Cloud pages अभी लोड हो रहे हैं।');
        // Re-read on save to preserve other draft content and existing site config.
        const history = await getWebsiteConfigVersions();
        const latest = history.find(item => item.status === 'draft') || history.find(item => item.status === 'published');
        const currentPages = parseStudioPages((latest?.config.visualEditor as { customPages?: unknown } | undefined)?.customPages);
        if (currentPages.some(page => page.slug === slug)) throw new Error('यह URL slug अभी किसी अन्य draft में जुड़ गया है।');
        const config: WebsiteConfig = latest?.config || { hero: {}, header: {}, sections: {}, palette: 'navy' };
        await saveWebsiteConfigDraft({
          ...config,
          visualEditor: { ...(config.visualEditor || {}), customPages: [...currentPages, added] },
        });
      }
      setCustomPages(prev => [...prev, added]);
      setPageId(added.id);
      setNewPageOpen(false);
      setNewTitle(''); setNewSlug(''); setNewDescription('');
      setPagesStatus(user && isAdmin
        ? 'New page saved to Cloud Draft. It is NOT a public URL and is not published.'
        : 'New page created in this demo session only. Admin login is needed to save it.');
    } catch (error) {
      setPagesStatus(error instanceof Error ? error.message : 'Page draft सुरक्षित नहीं हुआ।');
    } finally {
      setCreating(false);
    }
  };

  return <section data-testid="visual-studio-main" className="min-h-[80vh] space-y-4">
    <header className="rounded-2xl border border-sky-200 bg-sky-50 p-4 sm:p-5">
      <p className="text-[10px] font-extrabold uppercase tracking-[.16em] text-sky-800">
        Krishan Sir · Advanced Visual Website Builder
      </p>
      <h2 className="mt-1 text-xl font-extrabold text-slate-900 sm:text-2xl">Advanced Real Page Editor</h2>
      <p className="mt-2 text-xs leading-5 text-slate-700">
        Existing pages और नए Draft Pages को Design करें। Floating Components, Inspector,
        Themes, Video Player और PDF Reader Tools उपलब्ध हैं।
        Draft Save कभी भी Live Publish नहीं करता।
      </p>
      <div className="mt-3 flex flex-wrap gap-2 text-[10px] font-bold text-sky-900">
        <span className="inline-flex items-center gap-1 rounded-full border border-sky-200 bg-white px-2 py-1"><MousePointerClick className="h-3.5 w-3.5"/> Click to Edit</span>
        <span className="inline-flex items-center gap-1 rounded-full border border-sky-200 bg-white px-2 py-1"><Layers3 className="h-3.5 w-3.5"/> Components</span>
        <span className="inline-flex items-center gap-1 rounded-full border border-sky-200 bg-white px-2 py-1"><ImageIcon className="h-3.5 w-3.5"/> Media Tools</span>
        <span className="inline-flex items-center gap-1 rounded-full border border-sky-200 bg-white px-2 py-1"><ShieldCheck className="h-3.5 w-3.5"/> Draft Only</span>
      </div>
    </header>
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-3">
      <label className="text-xs font-bold text-slate-700">
        Website page
        <select data-testid="visual-studio-page" aria-label="Website page" value={active.id}
          onChange={event => setPageId(event.target.value)}
          className="ml-2 max-w-[250px] rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs">
          <optgroup label="Existing website pages">
            {standardPages.map(page => <option key={page.id} value={page.id}>
              {page.label}{page.editable ? '' : ' · Design only (protected)'}
            </option>)}
          </optgroup>
          {customPages.length > 0 && <optgroup label="New draft pages (not live)">
            {customPages.map(page => <option key={page.id} value={page.id}>{page.title} · Draft</option>)}
          </optgroup>}
        </select>
      </label>
      <button type="button" onClick={() => setNewPageOpen(open => !open)}
        aria-expanded={newPageOpen}
        className="inline-flex items-center gap-2 rounded-lg bg-sky-900 px-3 py-2 text-xs font-bold text-white">
        <FilePlus2 className="h-4 w-4"/> Add New Page
      </button>
      {designOnly && <p role="status" className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-900">
        Design-only mode: authentication, test submissions, results and admin actions cannot be edited.
      </p>}
      <div className="flex items-center rounded-lg border border-slate-200 p-1" role="group" aria-label="Preview screen">
        <button type="button" onClick={() => setMobile(false)} aria-pressed={!mobile}
          className={'inline-flex items-center gap-1 rounded px-3 py-2 text-xs font-bold ' + (!mobile ? 'bg-sky-900 text-white' : 'text-slate-600')}>
          <Monitor className="h-4 w-4"/> Desktop
        </button>
        <button type="button" onClick={() => setMobile(true)} aria-pressed={mobile}
          className={'inline-flex items-center gap-1 rounded px-3 py-2 text-xs font-bold ' + (mobile ? 'bg-sky-900 text-white' : 'text-slate-600')}>
          <Smartphone className="h-4 w-4"/> Mobile
        </button>
      </div>
    </div>
    {newPageOpen && <form data-testid="new-page-form" onSubmit={event => void createDraftPage(event)}
      className="grid gap-3 rounded-xl border border-sky-200 bg-white p-4 sm:grid-cols-2">
      <label className="text-xs font-bold text-slate-700">Page Title
        <input aria-label="New page title" required maxLength={120} value={newTitle}
          onChange={event => setNewTitle(event.target.value)}
          placeholder="e.g. Class 10 History Notes" className="mt-1 block w-full rounded-lg border p-2.5"/>
      </label>
      <label className="text-xs font-bold text-slate-700">URL Slug (Draft only)
        <input aria-label="New page slug" maxLength={48} value={newSlug}
          onChange={event => setNewSlug(event.target.value)}
          placeholder="e.g. class-10-history" className="mt-1 block w-full rounded-lg border p-2.5"/>
      </label>
      <label className="text-xs font-bold text-slate-700">Page Template
        <select aria-label="New page template" value={newTemplate} onChange={event => setNewTemplate(event.target.value as StudioTemplate)}
          className="mt-1 block w-full rounded-lg border p-2.5">
          {STUDIO_TEMPLATES.map(item => <option key={item.value} value={item.value}>{item.label}</option>)}
        </select>
      </label>
      <label className="text-xs font-bold text-slate-700">Description
        <input aria-label="New page description" maxLength={600} value={newDescription}
          onChange={event => setNewDescription(event.target.value)}
          placeholder="A short introductory description" className="mt-1 block w-full rounded-lg border p-2.5"/>
      </label>
      <div className="flex flex-wrap items-center justify-between gap-2 sm:col-span-2">
        <p className="text-xs text-amber-800">New pages are saved as Studio Drafts; publishing a public URL requires a separate routing approval.</p>
        <button type="submit" disabled={creating || (Boolean(user && isAdmin) && !pagesReady)}
          className="rounded-lg bg-emerald-700 px-4 py-2 text-xs font-bold text-white disabled:opacity-50">
          {creating ? 'Creating…' : 'Create Draft Page'}
        </button>
      </div>
    </form>}
    {pagesStatus && <p role="status" className="rounded-lg bg-sky-50 px-3 py-2 text-xs text-sky-900">{pagesStatus}</p>}
    <AdminSiteWideLiveEditor key={active.id} src={src}
      srcDoc={customPage ? studioPagePreviewHtml(customPage) : undefined}
      pageId={active.id} pageLabel={active.label} mobile={mobile} designOnly={designOnly}/>
  </section>;
};
