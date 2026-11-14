import React, { useState } from 'react';
import { Monitor, Smartphone, MousePointerClick, Image as ImageIcon, Layers3, ShieldCheck } from 'lucide-react';
import { AdminSiteWideLiveEditor } from './AdminSiteWideLiveEditor';
import { getVisualDesignPreviewPages } from '../visual-editor/registry';

// The Advanced Real Page Editor is the single visual-design entry point.
// The previous Canvas, V2 text editor and site-wide builder are no longer
// offered in the Admin UI. Publishing remains a separate explicit action.
const editablePages = getVisualDesignPreviewPages();

export const AdminVisualStudio: React.FC = () => {
  const [pageId, setPageId] = useState<string>(editablePages[0]?.id ?? 'home');
  const [mobile, setMobile] = useState(false);
  const page = editablePages.find(item => item.id === pageId) ?? editablePages[0];

  if (!page) {
    return <p role="alert" className="rounded-xl bg-amber-50 p-5 text-sm text-amber-900">No editable website pages are configured.</p>;
  }

  const pagePath = page.path === '/'
    ? import.meta.env.BASE_URL
    : import.meta.env.BASE_URL + page.path.slice(1);
  const src = pagePath + (pagePath.includes('?') ? '&' : '?') + 'visual-editor=1';
  const designOnly = !page.editable;

  return (
    <section data-testid="visual-studio-main" className="min-h-[80vh] space-y-4">
      <header className="rounded-2xl border border-sky-200 bg-sky-50 p-4 sm:p-5">
        <p className="text-[10px] font-extrabold uppercase tracking-[.16em] text-sky-800">
          Krishan Sir · Main Visual Website Editor
        </p>
        <h2 className="mt-1 text-xl font-extrabold text-slate-900 sm:text-2xl">Advanced Real Page Editor</h2>
        <p className="mt-2 text-xs leading-5 text-slate-700">
          वेबसाइट को Preview में सीधे Edit करें। Floating Commands, Components, Media Library और Inspector इसी Editor में हैं।
          Save Cloud Draft सुरक्षित है; Live Publish अलग Website Settings में किया जाता है।
        </p>
        <div className="mt-3 flex flex-wrap gap-2 text-[10px] font-bold text-sky-900">
          <span className="inline-flex items-center gap-1 rounded-full border border-sky-200 bg-white px-2 py-1"><MousePointerClick className="h-3.5 w-3.5"/> Click to Edit</span>
          <span className="inline-flex items-center gap-1 rounded-full border border-sky-200 bg-white px-2 py-1"><Layers3 className="h-3.5 w-3.5"/> Floating Components</span>
          <span className="inline-flex items-center gap-1 rounded-full border border-sky-200 bg-white px-2 py-1"><ImageIcon className="h-3.5 w-3.5"/> Media Library</span>
          <span className="inline-flex items-center gap-1 rounded-full border border-sky-200 bg-white px-2 py-1"><ShieldCheck className="h-3.5 w-3.5"/> Draft Only</span>
        </div>
      </header>
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-3">
        <label className="text-xs font-bold text-slate-700">
          Website page
          <select
            data-testid="visual-studio-page"
            aria-label="Website page"
            value={page.id}
            onChange={event => setPageId(event.target.value)}
            className="ml-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs"
          >
            {editablePages.map(item => <option key={item.id} value={item.id}>{item.label}{item.editable ? '' : ' · Design only (protected)'}</option>)}
          </select>
        </label>
        {designOnly && <p role="status" className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-900">Design-only mode: authentication, test submission, results and admin actions cannot be edited.</p>}
        <div className="flex items-center rounded-lg border border-slate-200 p-1" role="group" aria-label="Preview screen">
          <button
            type="button"
            onClick={() => setMobile(false)}
            aria-pressed={!mobile}
            className={'inline-flex items-center gap-1 rounded px-3 py-2 text-xs font-bold ' + (!mobile ? 'bg-sky-900 text-white' : 'text-slate-600')}
          ><Monitor className="h-4 w-4"/> Desktop</button>
          <button
            type="button"
            onClick={() => setMobile(true)}
            aria-pressed={mobile}
            className={'inline-flex items-center gap-1 rounded px-3 py-2 text-xs font-bold ' + (mobile ? 'bg-sky-900 text-white' : 'text-slate-600')}
          ><Smartphone className="h-4 w-4"/> Mobile</button>
        </div>
      </div>
      <AdminSiteWideLiveEditor
        key={page.id}
        src={src}
        pageId={page.id}
        pageLabel={page.label}
        mobile={mobile}
        designOnly={designOnly}
      />
    </section>
  );
};
