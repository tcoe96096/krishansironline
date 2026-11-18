import React, { useEffect, useState } from 'react';
import { CalendarClock, FilePlus2, Monitor, Send, Smartphone } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { AdminSiteWideLiveEditor } from './AdminSiteWideLiveEditor';
import { getVisualDesignPreviewPages } from '../visual-editor/registry';
import { getWebsiteConfigVersions, saveWebsiteConfigDraft, publishWebsiteConfig,
  scheduleStudioPublish, cancelStudioPublish, getStudioPublishSchedules, type WebsiteConfig, type StudioPublishSchedule
} from '../services/siteConfigService';
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
  const [publishPanelOpen, setPublishPanelOpen] = useState(false);
  const [draftId, setDraftId] = useState<string | null>(null);
  const [publishBusy, setPublishBusy] = useState(false);
  const [publishMessage, setPublishMessage] = useState('');
  const [scheduleAt, setScheduleAt] = useState('');
  const [recentSchedules, setRecentSchedules] = useState<StudioPublishSchedule[]>([]);
  const [publishedVersion, setPublishedVersion] = useState<number | null>(null);

  useEffect(() => {
    let active = true;
    setPagesReady(false);
    void getWebsiteConfigVersions().then(history => {
      if (!active) return;
      const current = history.find(item => item.status === 'draft') || history.find(item => item.status === 'published');
      const visual = current?.config.visualEditor as { customPages?: unknown } | undefined;
      setCustomPages(parseStudioPages(visual?.customPages));
      setDraftId(history.find(item => item.status === 'draft')?.id || null);
      setPublishedVersion(history.find(item => item.status === 'published')?.version_number || null);
      setPagesReady(true);
      if (user && isAdmin) void getStudioPublishSchedules()
        .then(items => { if (active) setRecentSchedules(items); })
        .catch(() => { if (active) setPublishMessage('Schedule API not connected yet. The Preview database migration must be applied.'); });
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
        const newDraftId = await saveWebsiteConfigDraft({
          ...config,
          visualEditor: { ...(config.visualEditor || {}), customPages: [...currentPages, added] },
        });
        setDraftId(newDraftId);
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

  const refreshPublishing = async () => {
    if (!user || !isAdmin) return;
    const [versions, plans] = await Promise.all([getWebsiteConfigVersions(), getStudioPublishSchedules()]);
    setDraftId(versions.find(version => version.status === 'draft')?.id || null);
    setPublishedVersion(versions.find(version => version.status === 'published')?.version_number || null);
    setRecentSchedules(plans);
  };
  const publishNow = async () => {
    if (!user || !isAdmin || !draftId || publishBusy) return;
    if (!window.confirm('Publish the currently saved Studio Draft to the connected website database? This is separate from deploying code.')) return;
    setPublishBusy(true);
    try {
      const plans = recentSchedules.filter(plan => plan.status === 'pending' && plan.source_version_id === draftId);
      for (const plan of plans) await cancelStudioPublish(plan.id);
      const version = await publishWebsiteConfig(draftId);
      setPublishMessage('Published saved Website Draft version ' + version + '. Public pages update after their publication refresh.');
      await refreshPublishing();
    } catch (error) {
      setPublishMessage(error instanceof Error ? error.message : 'Publish failed.');
    } finally {
      setPublishBusy(false);
    }
  };
  const schedulePublish = async () => {
    if (!user || !isAdmin || !draftId || !scheduleAt || publishBusy) return;
    const selected = new Date(scheduleAt);
    const diff = selected.getTime() - Date.now();
    if (!Number.isFinite(diff) || diff < 120000 || diff > 365 * 86400000) {
      setPublishMessage('Select a future date/time between 2 minutes and 365 days from now.'); return;
    }
    setPublishBusy(true);
    try {
      const saved = await scheduleStudioPublish(draftId, selected.toISOString());
      setPublishMessage('Scheduled saved Draft ID ' + saved.slice(0,8) + '… for ' + selected.toLocaleString() +
        '. This schedule runs server-side; later edits do not change the scheduled snapshot.');
      await refreshPublishing();
    } catch (error) {
      setPublishMessage(error instanceof Error ? error.message : 'Scheduling failed.');
    } finally {
      setPublishBusy(false);
    }
  };
  const cancelPublish = async (id: string) => {
    if (!user || !isAdmin || publishBusy) return;
    setPublishBusy(true);
    try {
      await cancelStudioPublish(id);
      await refreshPublishing();
      setPublishMessage('Scheduled publication cancelled.');
    } catch (error) {
      setPublishMessage(error instanceof Error ? error.message : 'Cancellation failed.');
    } finally {
      setPublishBusy(false);
    }
  };

  return <section data-testid="visual-studio-main" className="min-h-[80vh] space-y-4">
    <div className="flex flex-wrap items-center justify-between gap-2">
      <h2 className="text-base font-extrabold text-slate-900 sm:text-lg">Advanced Real Page Editor</h2>
      <span className="rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-[11px] font-bold text-sky-900">Draft-only editing</span>
    </div>
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
      <button type="button" onClick={() => setPublishPanelOpen(v => !v)}
        aria-expanded={publishPanelOpen} className="inline-flex items-center gap-2 rounded-lg border border-emerald-500 bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-900">
        <CalendarClock className="h-4 w-4"/> Publish & Schedule
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
    {publishPanelOpen && <section data-testid="studio-publishing-panel" className="space-y-3 rounded-xl border border-emerald-200 bg-white p-4">
      <div>
        <h3 className="text-sm font-extrabold text-slate-900">Publish Manager · Scheduled Publishing</h3>
        <p className="mt-1 text-xs text-slate-600">Save your changes with <strong>Save Cloud Draft</strong> in the Inspector first.
          Publish applies the saved version, not unsaved visual changes.</p>
      </div>
      <div className="flex flex-wrap gap-2 text-xs">
        <span className="rounded-lg bg-sky-50 px-3 py-2 text-sky-900">Draft: {draftId ? 'Ready (' + draftId.slice(0,8) + '…)' : 'Not saved'}</span>
        <span className="rounded-lg bg-emerald-50 px-3 py-2 text-emerald-900">Live Version: {publishedVersion ?? 'None'}</span>
      </div>
      <div className="flex flex-wrap items-end gap-3">
        <button type="button" onClick={() => void publishNow()}
          disabled={!isAdmin || !draftId || publishBusy}
          className="inline-flex items-center gap-2 rounded-lg bg-emerald-700 px-4 py-2.5 text-xs font-bold text-white disabled:opacity-50">
          <Send className="h-4 w-4"/> {publishBusy ? 'Working…' : 'Publish Saved Draft Now'}
        </button>
        <label className="text-xs font-bold text-slate-700">Schedule local date & time
          <input type="datetime-local" aria-label="Schedule publication date and time" value={scheduleAt}
            onChange={event => setScheduleAt(event.target.value)}
            className="mt-1 block rounded-lg border p-2 text-xs"/>
        </label>
        <button type="button" onClick={() => void schedulePublish()}
          disabled={!isAdmin || !draftId || !scheduleAt || publishBusy}
          className="rounded-lg border border-sky-800 bg-sky-50 px-4 py-2.5 text-xs font-bold text-sky-900 disabled:opacity-50">
          Schedule Publish
        </button>
      </div>
      <p className="text-[11px] text-slate-500">Timezone: {Intl.DateTimeFormat().resolvedOptions().timeZone || 'Browser local'}.
        Scheduler checks due plans around once a minute and publishes the saved snapshot.
        Only one pending publication is supported; scheduling another replaces it.</p>
      {recentSchedules.filter(item => item.status === 'pending').map(plan => <div key={plan.id}
        className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3">
        <span className="text-xs text-amber-900">Scheduled: {new Date(plan.scheduled_for).toLocaleString()} · Draft {plan.source_version_id?.slice(0,8) || 'unknown'}…</span>
        <button type="button" disabled={publishBusy || !isAdmin} onClick={() => void cancelPublish(plan.id)}
          className="rounded-lg border border-amber-500 px-3 py-1.5 text-xs font-bold text-amber-900 disabled:opacity-50">Cancel Schedule</button>
      </div>)}
      <button type="button" onClick={() => void refreshPublishing().catch(error => setPublishMessage(error instanceof Error ? error.message : 'Refresh failed'))}
        disabled={!isAdmin || publishBusy} className="rounded-lg border px-3 py-2 text-xs font-bold disabled:opacity-50">Refresh Publish Status</button>
      {publishMessage && <p role="status" className="rounded-lg bg-sky-50 p-3 text-xs text-sky-900">{publishMessage}</p>}
      <p className="text-xs font-medium text-amber-900">
        Preview deployments use their connected Preview database. PR merge and Production code deployment remain separate, explicit actions.
      </p>
    </section>}
    <AdminSiteWideLiveEditor key={active.id} src={src}
      srcDoc={customPage ? studioPagePreviewHtml(customPage) : undefined}
      pageId={active.id} pageLabel={active.label} mobile={mobile} designOnly={designOnly}
      onDraftSaved={savedId => { setDraftId(savedId); setPublishMessage('Cloud Draft saved. Publish Manager can now publish or schedule this version.'); }}/>
  </section>;
};
