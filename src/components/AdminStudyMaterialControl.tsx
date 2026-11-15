import React, { useEffect, useMemo, useState } from 'react';
import { BookOpen, ClipboardList, ExternalLink, GraduationCap, LockKeyhole, Search, ShieldCheck, RefreshCw } from 'lucide-react';
import { STUDY_CHAPTERS } from '../data/portalData';
import { getPublishedTests, type PublishedTest } from '../services/testService';
import { studyMaterialUrl } from '../services/learningLinks';

type Props = {
  onOpenAcademic: () => void;
  onOpenResults: () => void;
  onOpenStaff: () => void;
  demoMode?: boolean;
};
export const AdminStudyMaterialControl: React.FC<Props> = ({ onOpenAcademic, onOpenResults, onOpenStaff, demoMode = false }) => {
  const [query,setQuery] = useState('');
  const [selectedClass,setSelectedClass] = useState('all');
  const [tests,setTests] = useState<PublishedTest[]>([]);
  const [testError,setTestError] = useState('');
  const [busy,setBusy] = useState(false);
  const [reload,setReload] = useState(0);
  useEffect(() => {
    if (demoMode) { setTests([]); return; }
    let active = true;
    setBusy(true); setTestError('');
    void getPublishedTests().then((data) => { if(active) setTests(data); })
      .catch(() => { if(active) { setTests([]);setTestError('Test links are unavailable right now. The public study catalogue remains usable.'); } })
      .finally(() => { if(active) setBusy(false); });
    return () => {active=false;};
  },[demoMode,reload]);
  const shown = useMemo(() => STUDY_CHAPTERS.filter((chapter) =>
    (selectedClass === 'all' || chapter.classLevel === selectedClass) &&
    (!query.trim() || [chapter.title.en,chapter.title.hi,chapter.subject,chapter.summary.en].some((text) => text.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase())))
  ),[selectedClass,query]);
  const base = import.meta.env.BASE_URL;
  return (
    <section className="space-y-5 pb-10">
      <header className="rounded-3xl bg-gradient-to-r from-[#061e42] via-[#092d63] to-[#087f8c] p-6 text-white sm:p-8">
        <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-teal-200"><BookOpen size={16}/> Academic Content Studio</p>
        <h2 className="mt-3 text-2xl font-extrabold">Study Materials & Result Linking</h2>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-sky-100">Published chapter catalogue, related practice tests, academic drafts और Super Admin permission controls एक जगह। Only approved server-side rules can unlock future staff writes.</p>
        <div className="mt-5 flex flex-wrap gap-2">
          <button type="button" onClick={onOpenAcademic} className="rounded-xl bg-white px-4 py-2.5 text-xs font-bold text-sky-900 hover:bg-sky-50">Open Academic Draft Editor</button>
          <button type="button" onClick={onOpenResults} className="rounded-xl border border-white/30 px-4 py-2.5 text-xs font-bold hover:bg-white/10">Results & Reports</button>
          <button type="button" onClick={onOpenStaff} className="rounded-xl border border-white/30 px-4 py-2.5 text-xs font-bold hover:bg-white/10">Staff Permissions</button>
        </div>
      </header>
      <div className="grid gap-3 md:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-5"><BookOpen className="text-sky-800"/><p className="mt-3 text-2xl font-extrabold">{STUDY_CHAPTERS.length}</p><p className="text-xs font-semibold text-slate-500">Available catalogue chapters</p></div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5"><ClipboardList className="text-sky-800"/><p className="mt-3 text-2xl font-extrabold">{demoMode?'—':busy?'…':testError?'—':tests.length}</p><p className="text-xs font-semibold text-slate-500">Published practice tests linked by class and subject</p></div>
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5"><LockKeyhole className="text-amber-800"/><p className="mt-3 text-sm font-extrabold text-amber-950">Secure publishing pending</p><p className="mt-1 text-xs leading-5 text-amber-900">Staff upload, review and publish will remain locked until Preview RLS and audit tests are approved.</p></div>
      </div>
      <div className="rounded-3xl border border-slate-200 bg-white p-5 sm:p-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div><h3 className="text-lg font-extrabold text-slate-900">Browse & Link Resources</h3><p className="mt-1 text-xs text-slate-500">Open links navigate to the real public material reader; records are not mock data.</p></div>
          <button type="button" disabled={busy || demoMode} onClick={()=>setReload((n)=>n+1)} className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-slate-200 px-3 text-xs font-bold disabled:opacity-50"><RefreshCw size={16}/>Refresh test links</button>
        </div>
        <div className="mt-5 flex flex-col gap-3 sm:flex-row">
          <label className="relative flex-1"><span className="sr-only">Search study materials</span><Search className="absolute left-3 top-3 h-4 w-4 text-slate-400"/><input aria-label="Search study materials" value={query} onChange={(event)=>setQuery(event.target.value)} placeholder="Find chapters, subjects, notes…" className="h-11 w-full rounded-xl border border-slate-200 pl-9 pr-3 text-sm"/></label>
          <label className="text-xs font-semibold text-slate-600">Class<select aria-label="Filter materials by class" value={selectedClass} onChange={(event)=>setSelectedClass(event.target.value)} className="ml-2 h-11 rounded-xl border border-slate-200 px-3 text-sm"><option value="all">All classes</option>{['6','7','8','9','10','11','12'].map((cl)=><option key={cl} value={cl}>Class {cl}</option>)}</select></label>
        </div>
        {testError && <p role="alert" className="mt-3 text-xs text-amber-800">{testError}</p>}
        <div className="mt-4 grid gap-3 lg:grid-cols-2">
          {shown.map((chapter)=>{
            const matches=tests.filter((item)=>item.class_level===chapter.classLevel && item.subject===chapter.subject);
            return <article key={chapter.id} className="rounded-2xl border border-slate-200 p-4">
              <p className="text-[11px] font-semibold text-teal-800">Class {chapter.classLevel} · {chapter.subject}</p>
              <h4 className="mt-1 text-sm font-bold text-slate-900">{chapter.title.en}</h4>
              <p className="mt-1 line-clamp-2 text-xs text-slate-500">{chapter.summary.en}</p>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <a href={studyMaterialUrl(base,{class_level:chapter.classLevel,subject:chapter.subject})} className="inline-flex min-h-9 items-center gap-1.5 rounded-lg bg-sky-900 px-3 py-2 text-xs font-bold text-white hover:bg-sky-800"><ExternalLink size={13}/>Open material</a>
                {matches.length ? <a href={base+'online-tests/?testId='+encodeURIComponent(matches[0].id)} className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-sky-200 px-3 py-2 text-xs font-bold text-sky-800 hover:bg-sky-50"><ClipboardList size={13}/>Related test</a> : <span className="text-[11px] text-slate-500">No published test matched</span>}
              </div>
            </article>;
          })}
          {!shown.length && <p className="p-5 text-sm text-slate-500">No chapters matched these filters.</p>}
        </div>
      </div>
      <div className="rounded-2xl border border-sky-200 bg-sky-50 p-5">
        <h3 className="flex items-center gap-2 text-sm font-bold text-sky-950"><ShieldCheck size={18}/> Role separation & permissions</h3>
        <p className="mt-2 text-xs leading-6 text-sky-900">Super Admin controls staff grants and publishing; Admin manages assigned operations; Teacher prepares assigned content; Students view published content and their own learning progress. The new materials database authorization remains a review-only proposal until its security checks pass.</p>
        <button type="button" onClick={onOpenStaff} className="mt-3 inline-flex items-center gap-2 text-xs font-extrabold text-sky-900 hover:underline"><GraduationCap size={16}/>Open Super Admin governance</button>
      </div>
    </section>
  );
};
