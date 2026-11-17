import React, { useState } from 'react';
import { Globe, Monitor, Settings2, ShieldCheck, Workflow } from 'lucide-react';
import { AdminVisualStudio } from './AdminVisualStudio';
import { AdminWebsiteManagement } from './AdminWebsiteManagement';

type Panel = 'studio' | 'settings';

/**
 * ONE Admin entry point for website editing, while preserving the existing
 * versioned site_config_versions storage and all published configurations.
 * Neither editor is deleted or silently promoted to a new data source.
 */
export const AdminWebsiteStudioHub: React.FC<{
  demoMode?: boolean;
  initialPanel?: Panel;
}> = ({ demoMode = false, initialPanel = 'studio' }) => {
  const [panel, setPanel] = useState<Panel>(initialPanel);
  return <section className="space-y-5" aria-label="Unified Website Studio">
    <header className="rounded-3xl border border-sky-200 bg-gradient-to-r from-[#092b60] to-[#0f7883] p-5 text-white shadow-sm sm:p-6">
      <p className="flex items-center gap-2 text-[11px] font-extrabold uppercase tracking-[.13em] text-sky-100">
        <Globe size={16}/> Website Studio
      </p>
      <h2 className="mt-2 text-2xl font-extrabold">Single Website Editing Workspace</h2>
      <p className="mt-2 max-w-3xl text-sm leading-6 text-sky-100">
        Website pages, branding and section visibility are managed from one Admin location.
        Previously saved site configuration versions and the separate Publish Manager remain intact.
      </p>
      <div className="mt-4 flex flex-wrap gap-2 text-xs font-bold">
        <span className="rounded-full border border-white/30 bg-white/10 px-3 py-1.5">Cloud Drafts preserved</span>
        <span className="rounded-full border border-white/30 bg-white/10 px-3 py-1.5">No automatic Production publish</span>
      </div>
    </header>
    <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-slate-200 bg-white p-2 shadow-sm" role="group" aria-label="Website editor panels">
      <button type="button" aria-pressed={panel==='studio'} onClick={()=>setPanel('studio')}
        className={'inline-flex min-h-11 items-center gap-2 rounded-xl px-4 text-xs font-extrabold '+(panel==='studio'?'bg-sky-900 text-white':'text-slate-700 hover:bg-sky-50')}>
        <Monitor size={17}/> Page Builder
      </button>
      <button type="button" aria-pressed={panel==='settings'} onClick={()=>setPanel('settings')}
        className={'inline-flex min-h-11 items-center gap-2 rounded-xl px-4 text-xs font-extrabold '+(panel==='settings'?'bg-sky-900 text-white':'text-slate-700 hover:bg-sky-50')}>
        <Settings2 size={17}/> Branding & Site Settings
      </button>
      <span className="ml-auto hidden items-center gap-1.5 px-3 text-[11px] font-semibold text-slate-500 sm:inline-flex"><Workflow size={15}/> Save Draft → Preview → Publish</span>
    </div>
    {panel==='settings'&&<p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs leading-5 text-amber-900">
      <ShieldCheck size={15} className="mr-2 inline"/>
      Legacy settings are kept inside this panel until every header, homepage,
      palette, draft and publish function is verified in the unified Page Builder.
      No existing configuration or history has been deleted.
    </p>}
    {panel==='studio' ? <AdminVisualStudio/> :
      <AdminWebsiteManagement demoMode={demoMode} onOpenVisualStudio={()=>setPanel('studio')}/>}
  </section>;
};
