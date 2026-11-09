import React, { useMemo, useState } from 'react';
import {
  GraduationCap, BookOpen, Layers3, ListTree, Plus, Search, Pencil,
  Save, X, CheckCircle2, Info, ChevronRight, BookMarked, FileText,
  Sparkles, RotateCcw
} from 'lucide-react';
import { CLASSES_METADATA, STUDY_CHAPTERS } from '../data/portalData';

type Status = 'active' | 'coming-soon' | 'draft';
type Tab = 'overview' | 'classes' | 'courses' | 'subjects' | 'chapters';
type Kind = Exclude<Tab, 'overview'>;

type ClassRecord = {
  id: string; level: string; titleEn: string; titleHi: string; badgeEn: string; badgeHi: string;
  descriptionEn: string; descriptionHi: string; status: Status;
  resourceCount: { notes: number; tests: number; mcqs: number };
};
type CourseRecord = {
  id: string; titleEn: string; titleHi: string; descriptionEn: string; descriptionHi: string;
  classLevels: string[]; status: Status;
};
type SubjectRecord = { id: string; classLevel: string; titleEn: string; titleHi: string; status: Status };
type ChapterRecord = {
  id: string; classLevel: string; subject: string; number: number; titleEn: string; titleHi: string;
  summaryEn: string; summaryHi: string; hasResources: boolean; status: Status;
};
type Workspace = { classes: ClassRecord[]; courses: CourseRecord[]; subjects: SubjectRecord[]; chapters: ChapterRecord[] };
type FormState = {
  kind: Kind; id: string; classLevel: string; number: string; titleEn: string; titleHi: string;
  badgeEn: string; badgeHi: string; descriptionEn: string; descriptionHi: string;
  subject: string; classLevelsText: string; status: Status; hasResources: boolean;
};

const STORAGE_KEY = 'krishansir.admin-academic-management.draft.v1';
const makeId = (kind: string) => \`\${kind}-draft-\${Date.now()}-\${Math.random().toString(36).slice(2, 7)}\`;

const initialWorkspace = (): Workspace => ({
  classes: CLASSES_METADATA.map((item) => ({
    id: \`class-\${item.level}\`, level: item.level, titleEn: item.title.en, titleHi: item.title.hi,
    badgeEn: item.badge.en, badgeHi: item.badge.hi, descriptionEn: item.description.en,
    descriptionHi: item.description.hi, status: item.status,
    resourceCount: { ...item.resourceCount },
  })),
  courses: [
    { id: 'school-learning', titleEn: 'School Learning · Classes 6–12', titleHi: 'विद्यालयी शिक्षा · कक्षा 6–12', descriptionEn: 'Class-wise syllabus, chapter notes and learning resources.', descriptionHi: 'कक्षावार पाठ्यक्रम, अध्यायवार नोट्स और अध्ययन संसाधन।', classLevels: ['6','7','8','9','10','11','12'], status: 'active' },
    { id: 'social-science', titleEn: 'Social Science', titleHi: 'सामाजिक विज्ञान', descriptionEn: 'History, Geography, Political Science and Economics.', descriptionHi: 'इतिहास, भूगोल, राजनीति विज्ञान और अर्थशास्त्र।', classLevels: ['6','7','8','9','10'], status: 'active' },
    { id: 'indian-constitution', titleEn: 'Indian Constitution', titleHi: 'भारतीय संविधान', descriptionEn: 'Constitutional articles, rights, institutions and polity.', descriptionHi: 'संवैधानिक अनुच्छेद, अधिकार, संस्थाएँ और राजव्यवस्था।', classLevels: ['8','9','10','11','12'], status: 'active' },
    { id: 'competitive-exams', titleEn: 'Competitive Exams', titleHi: 'प्रतियोगी परीक्षाएँ', descriptionEn: 'UGC NET, HTET, CTET and teacher recruitment practice.', descriptionHi: 'UGC NET, HTET, CTET और शिक्षक भर्ती परीक्षा अभ्यास।', classLevels: ['11','12'], status: 'active' },
  ],
  subjects: CLASSES_METADATA.flatMap((item) => item.subjects.map((subject, index) => ({
    id: \`subject-\${item.level}-\${index + 1}\`, classLevel: item.level,
    titleEn: subject.en, titleHi: subject.hi, status: 'active' as Status,
  }))),
  chapters: STUDY_CHAPTERS.map((item) => ({
    id: item.id, classLevel: item.classLevel, subject: item.subject, number: item.chapterNumber,
    titleEn: item.title.en, titleHi: item.title.hi, summaryEn: item.summary.en,
    summaryHi: item.summary.hi, hasResources: item.hasResources, status: 'active',
  })),
});

const loadDraft = (): Workspace => {
  if (typeof window === 'undefined') return initialWorkspace();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return initialWorkspace();
    const parsed = JSON.parse(raw);
    const value = parsed?.version === 1 ? parsed.data : null;
    if (value && ['classes','courses','subjects','chapters'].every((key) => Array.isArray(value[key]))) return value as Workspace;
  } catch {
    // Invalid local draft: retain the bundled website source data.
  }
  return initialWorkspace();
};

const newForm = (kind: Kind): FormState => ({
  kind, id: '', classLevel: '10', number: '1', titleEn: '', titleHi: '', badgeEn: '', badgeHi: '',
  descriptionEn: '', descriptionHi: '', subject: 'Political Science',
  classLevelsText: '6, 7, 8, 9, 10, 11, 12', status: 'draft', hasResources: false,
});
const statusText: Record<Status, string> = { active: 'Active', 'coming-soon': 'Coming soon', draft: 'Draft' };

export const AdminAcademicManagement: React.FC = () => {
  const [data, setData] = useState<Workspace>(loadDraft);
  const [tab, setTab] = useState<Tab>('overview');
  const [query, setQuery] = useState('');
  const [filterClass, setFilterClass] = useState('all');
  const [form, setForm] = useState<FormState | null>(null);
  const [message, setMessage] = useState('');
  const [draftSaved, setDraftSaved] = useState(false);

  const tabs: { id: Tab; label: string; hi: string; icon: React.ElementType }[] = [
    { id: 'overview', label: 'Overview', hi: 'सारांश', icon: GraduationCap },
    { id: 'classes', label: 'Classes', hi: 'कक्षाएँ', icon: BookOpen },
    { id: 'courses', label: 'Courses', hi: 'कोर्स', icon: Layers3 },
    { id: 'subjects', label: 'Subjects', hi: 'विषय', icon: BookMarked },
    { id: 'chapters', label: 'Chapters', hi: 'अध्याय', icon: ListTree },
  ];

  const totalCount = data.classes.length + data.courses.length + data.subjects.length + data.chapters.length;
  const activeCount = data.classes.filter(x => x.status === 'active').length + data.courses.filter(x => x.status === 'active').length +
    data.subjects.filter(x => x.status === 'active').length + data.chapters.filter(x => x.status === 'active').length;

  const filteredClasses = useMemo(() => data.classes.filter(x => {
    const text = \`\${x.level} \${x.titleEn} \${x.titleHi} \${x.badgeEn}\`.toLowerCase();
    return text.includes(query.toLowerCase());
  }), [data.classes, query]);
  const filteredCourses = useMemo(() => data.courses.filter(x => \`\${x.titleEn} \${x.titleHi}\`.toLowerCase().includes(query.toLowerCase())), [data.courses, query]);
  const filteredSubjects = useMemo(() => data.subjects.filter(x => {
    const text = \`\${x.titleEn} \${x.titleHi} \${x.classLevel}\`.toLowerCase();
    return text.includes(query.toLowerCase()) && (filterClass === 'all' || x.classLevel === filterClass);
  }), [data.subjects, query, filterClass]);
  const filteredChapters = useMemo(() => data.chapters.filter(x => {
    const text = \`\${x.titleEn} \${x.titleHi} \${x.subject} \${x.classLevel}\`.toLowerCase();
    return text.includes(query.toLowerCase()) && (filterClass === 'all' || x.classLevel === filterClass);
  }), [data.chapters, query, filterClass]);

  const openNew = (kind: Kind) => { setForm(newForm(kind)); setMessage(''); };
  const openEdit = (kind: Kind, id: string) => {
    const common = { ...newForm(kind), id };
    if (kind === 'classes') {
      const x = data.classes.find(v => v.id === id); if (!x) return;
      setForm({ ...common, classLevel: x.level, titleEn: x.titleEn, titleHi: x.titleHi, badgeEn: x.badgeEn, badgeHi: x.badgeHi, descriptionEn: x.descriptionEn, descriptionHi: x.descriptionHi, status: x.status });
    } else if (kind === 'courses') {
      const x = data.courses.find(v => v.id === id); if (!x) return;
      setForm({ ...common, titleEn: x.titleEn, titleHi: x.titleHi, descriptionEn: x.descriptionEn, descriptionHi: x.descriptionHi, classLevelsText: x.classLevels.join(', '), status: x.status });
    } else if (kind === 'subjects') {
      const x = data.subjects.find(v => v.id === id); if (!x) return;
      setForm({ ...common, classLevel: x.classLevel, titleEn: x.titleEn, titleHi: x.titleHi, status: x.status });
    } else {
      const x = data.chapters.find(v => v.id === id); if (!x) return;
      setForm({ ...common, classLevel: x.classLevel, number: String(x.number), subject: x.subject, titleEn: x.titleEn, titleHi: x.titleHi, descriptionEn: x.summaryEn, descriptionHi: x.summaryHi, hasResources: x.hasResources, status: x.status });
    }
    setMessage('');
  };

  const saveForm = () => {
    if (!form || !form.titleEn.trim() || !form.titleHi.trim()) {
      setMessage('English और हिन्दी दोनों नाम भरें।');
      return;
    }
    const id = form.id || makeId(form.kind);
    const next = { ...data };
    if (form.kind === 'classes') {
      if (!form.classLevel.trim()) { setMessage('Class number आवश्यक है।'); return; }
      const duplicate = next.classes.some(x => x.level === form.classLevel.trim() && x.id !== form.id);
      if (duplicate) { setMessage('यह Class पहले से मौजूद है।'); return; }
      const old = next.classes.find(x => x.id === form.id);
      const record: ClassRecord = { id, level: form.classLevel.trim(), titleEn: form.titleEn.trim(), titleHi: form.titleHi.trim(),
        badgeEn: form.badgeEn.trim() || 'School', badgeHi: form.badgeHi.trim() || 'विद्यालय',
        descriptionEn: form.descriptionEn.trim(), descriptionHi: form.descriptionHi.trim(), status: form.status,
        resourceCount: old?.resourceCount ?? { notes: 0, tests: 0, mcqs: 0 } };
      next.classes = old ? next.classes.map(x => x.id === id ? record : x) : [...next.classes, record];
    } else if (form.kind === 'courses') {
      const levels = form.classLevelsText.split(',').map(x => x.trim()).filter(x => next.classes.some(c => c.level === x));
      const record: CourseRecord = { id, titleEn: form.titleEn.trim(), titleHi: form.titleHi.trim(), descriptionEn: form.descriptionEn.trim(),
        descriptionHi: form.descriptionHi.trim(), classLevels: levels, status: form.status };
      next.courses = form.id ? next.courses.map(x => x.id === id ? record : x) : [...next.courses, record];
    } else if (form.kind === 'subjects') {
      if (!next.classes.some(x => x.level === form.classLevel)) { setMessage('पहले उपलब्ध Class चुनें।'); return; }
      const record: SubjectRecord = { id, classLevel: form.classLevel, titleEn: form.titleEn.trim(), titleHi: form.titleHi.trim(), status: form.status };
      next.subjects = form.id ? next.subjects.map(x => x.id === id ? record : x) : [...next.subjects, record];
    } else {
      if (!next.classes.some(x => x.level === form.classLevel)) { setMessage('पहले उपलब्ध Class चुनें।'); return; }
      const record: ChapterRecord = { id, classLevel: form.classLevel, subject: form.subject, number: Math.max(1, Number(form.number) || 1),
        titleEn: form.titleEn.trim(), titleHi: form.titleHi.trim(), summaryEn: form.descriptionEn.trim(),
        summaryHi: form.descriptionHi.trim(), hasResources: form.hasResources, status: form.status };
      next.chapters = form.id ? next.chapters.map(x => x.id === id ? record : x) : [...next.chapters, record];
    }
    setData(next);
    setForm(null);
    setDraftSaved(false);
    setMessage('Draft record तैयार है। इसे Save Draft करने पर इसी browser में रखा जाएगा।');
  };

  const saveDraft = () => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: 1, data }));
      setDraftSaved(true);
      setMessage('Academic Draft इस browser में सुरक्षित है। यह Supabase या Live website पर नहीं भेजा गया।');
    } catch {
      setMessage('इस browser में Draft save नहीं हो सका। Storage उपलब्धता जाँचें।');
    }
  };

  const resetDraft = () => {
    window.localStorage.removeItem(STORAGE_KEY);
    setData(initialWorkspace());
    setForm(null);
    setDraftSaved(false);
    setMessage('Draft हटाकर मौजूदा website source data फिर से लोड किया गया।');
  };

  const statCards = [
    { label: 'Classes', value: data.classes.length, icon: BookOpen, detail: 'Class 6–12 source data' },
    { label: 'Courses', value: data.courses.length, icon: GraduationCap, detail: 'Learning pathways' },
    { label: 'Subjects', value: data.subjects.length, icon: BookMarked, detail: 'Class-wise subjects' },
    { label: 'Chapters', value: data.chapters.length, icon: ListTree, detail: 'Bundled chapter records' },
  ];

  const renderRows = () => {
    if (tab === 'classes') return filteredClasses.map(x => (
      <div key={x.id} className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 sm:flex-row sm:items-center">
        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-sky-50 text-sky-900"><BookOpen className="h-5 w-5" /></div>
        <div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><b className="text-sm text-slate-900">Class {x.level}</b><span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] text-slate-600">{statusText[x.status]}</span></div><p className="mt-1 text-xs text-slate-700">{x.titleEn}</p><p className="text-xs text-slate-500">{x.titleHi}</p><p className="mt-1 text-[10px] text-slate-400">{x.resourceCount.notes} notes · {x.resourceCount.tests} tests · {x.resourceCount.mcqs} MCQs</p></div>
        <button onClick={() => openEdit('classes', x.id)} className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"><Pencil className="h-3.5 w-3.5" />Edit</button>
      </div>
    ));
    if (tab === 'courses') return filteredCourses.map(x => (
      <div key={x.id} className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 sm:flex-row sm:items-center">
        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-indigo-50 text-indigo-800"><GraduationCap className="h-5 w-5" /></div>
        <div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><b className="text-sm text-slate-900">{x.titleEn}</b><span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] text-slate-600">{statusText[x.status]}</span></div><p className="text-xs text-slate-500">{x.titleHi}</p><p className="mt-1 text-[10px] text-slate-400">Classes: {x.classLevels.join(', ') || 'Not assigned'}</p></div>
        <button onClick={() => openEdit('courses', x.id)} className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"><Pencil className="h-3.5 w-3.5" />Edit</button>
      </div>
    ));
    if (tab === 'subjects') return filteredSubjects.map(x => (
      <div key={x.id} className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 sm:flex-row sm:items-center">
        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-emerald-50 text-emerald-800"><BookMarked className="h-5 w-5" /></div>
        <div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><b className="text-sm text-slate-900">Class {x.classLevel}</b><span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] text-slate-600">{statusText[x.status]}</span></div><p className="mt-1 text-xs text-slate-700">{x.titleEn}</p><p className="text-xs text-slate-500">{x.titleHi}</p></div>
        <button onClick={() => openEdit('subjects', x.id)} className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"><Pencil className="h-3.5 w-3.5" />Edit</button>
      </div>
    ));
    return filteredChapters.map(x => (
      <div key={x.id} className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 sm:flex-row sm:items-center">
        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-amber-50 text-amber-800"><FileText className="h-5 w-5" /></div>
        <div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><b className="text-sm text-slate-900">Class {x.classLevel} · Chapter {x.number}</b><span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] text-slate-600">{statusText[x.status]}</span>{x.hasResources && <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] text-emerald-700">Resources linked in source</span>}</div><p className="mt-1 text-xs text-slate-700">{x.titleEn}</p><p className="text-xs text-slate-500">{x.titleHi}</p><p className="mt-1 text-[10px] text-slate-400">{x.subject}</p></div>
        <button onClick={() => openEdit('chapters', x.id)} className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"><Pencil className="h-3.5 w-3.5" />Edit</button>
      </div>
    ));
  };

  const labelFor = (kind: Kind) => ({ classes: 'Class', courses: 'Course', subjects: 'Subject', chapters: 'Chapter' })[kind];

  return (
    <div className="space-y-5">
      <div className="flex flex-col justify-between gap-3 xl:flex-row xl:items-end">
        <div>
          <div className="flex items-center gap-2 text-[10px] font-extrabold uppercase tracking-[.16em] text-sky-700"><GraduationCap className="h-3.5 w-3.5" />Academic Management</div>
          <h2 className="mt-1 text-2xl font-extrabold tracking-tight text-slate-900">Academic Structure</h2>
          <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-500">Classes, Courses, Subjects और Chapters को व्यवस्थित करें। ये controls अभी Preview Draft तक सीमित हैं।</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-3 py-1.5 text-[10px] font-bold text-amber-800"><Info className="h-3.5 w-3.5" />Preview Draft · No database writes</span>
          <button onClick={saveDraft} className="inline-flex items-center gap-2 rounded-xl bg-sky-900 px-3 py-2.5 text-xs font-bold text-white hover:bg-sky-800"><Save className="h-4 w-4" />Save Draft</button>
          <button onClick={resetDraft} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50"><RotateCcw className="h-4 w-4" />Reset</button>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {statCards.map(item => { const Icon = item.icon; return <div key={item.label} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><div className="flex items-center justify-between"><span className="text-xs font-semibold text-slate-500">{item.label}</span><span className="grid h-9 w-9 place-items-center rounded-xl bg-sky-50 text-sky-900"><Icon className="h-4 w-4" /></span></div><p className="mt-3 text-2xl font-extrabold text-slate-900">{item.value}</p><p className="mt-1 text-[10px] text-slate-400">{item.detail}</p></div>; })}
      </div>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-slate-100 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div><h3 className="text-sm font-extrabold text-slate-900">Academic Workspace</h3><p className="mt-1 text-[11px] text-slate-500">{activeCount} active records · {totalCount} total records</p></div>
          <div className="relative w-full sm:max-w-xs"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search records..." className="w-full rounded-xl border border-slate-200 py-2.5 pl-9 pr-3 text-xs outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100" /></div>
        </div>
        <div className="flex gap-1 overflow-x-auto border-b border-slate-100 px-3 pt-2">
          {tabs.map(item => { const Icon = item.icon; return <button key={item.id} onClick={() => { setTab(item.id); setQuery(''); setFilterClass('all'); setForm(null); }} className={\`inline-flex shrink-0 items-center gap-2 rounded-t-lg px-3 py-3 text-xs font-bold transition \${tab === item.id ? 'border-b-2 border-sky-800 bg-sky-50 text-sky-900' : 'text-slate-500 hover:bg-slate-50'}\`}><Icon className="h-4 w-4" />{item.label}<span className="rounded-full bg-slate-100 px-1.5 py-0.5 text-[9px]">{({ overview: totalCount, classes: data.classes.length, courses: data.courses.length, subjects: data.subjects.length, chapters: data.chapters.length })[item.id]}</span></button>; })}
        </div>

        <div className="space-y-3 p-4 sm:p-5">
          {tab === 'overview' ? <>
            <div className="rounded-xl border border-sky-100 bg-sky-50 p-4"><div className="flex items-center gap-2 text-xs font-extrabold text-sky-900"><Sparkles className="h-4 w-4" />Current website data loaded for review</div><p className="mt-1 text-xs leading-5 text-sky-900/80">Class names, subject lists and chapter titles are initialized from the website's bundled source data. Editing here changes only this Academic Preview workspace until a separately approved publishing workflow is implemented.</p></div>
            <div className="grid gap-3 sm:grid-cols-2">{tabs.filter(x => x.id !== 'overview').map(item => { const Icon = item.icon; return <button key={item.id} onClick={() => setTab(item.id)} className="flex items-center gap-3 rounded-xl border border-slate-200 p-4 text-left hover:border-sky-200 hover:bg-sky-50/50"><span className="grid h-10 w-10 place-items-center rounded-xl bg-slate-100 text-slate-700"><Icon className="h-5 w-5" /></span><span className="min-w-0 flex-1"><b className="block text-sm text-slate-800">{item.label}</b><span className="text-[11px] text-slate-500">{item.hi}</span></span><ChevronRight className="h-4 w-4 text-slate-400" /></button>; })}</div>
            <div className="rounded-xl border border-slate-200 p-4"><p className="text-xs font-bold text-slate-800">Data integrity note</p><p className="mt-1 text-[11px] leading-5 text-slate-500">No production records are created, deleted or updated. Existing website routes, class cards, tests, materials and learner progress remain unchanged.</p></div>
          </> : <>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div><h4 className="text-sm font-extrabold text-slate-900">{tabs.find(x => x.id === tab)?.label}</h4><p className="mt-1 text-[11px] text-slate-500">Manage records in the local Preview draft.</p></div>
              <div className="flex flex-wrap items-center gap-2">
                {(tab === 'subjects' || tab === 'chapters') && <select value={filterClass} onChange={e => setFilterClass(e.target.value)} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs"><option value="all">All classes</option>{data.classes.map(x => <option key={x.id} value={x.level}>Class {x.level}</option>)}</select>}
                <button onClick={() => openNew(tab as Kind)} className="inline-flex items-center gap-2 rounded-xl bg-sky-900 px-3 py-2.5 text-xs font-bold text-white hover:bg-sky-800"><Plus className="h-4 w-4" />Add {labelFor(tab as Kind)}</button>
              </div>
            </div>
            {form && form.kind === tab && <div className="rounded-2xl border border-sky-200 bg-sky-50/50 p-4 sm:p-5">
              <div className="mb-4 flex items-center justify-between gap-3"><div><h4 className="text-sm font-extrabold text-slate-900">{form.id ? 'Edit' : 'New'} {labelFor(form.kind)} Draft</h4><p className="mt-1 text-[10px] text-slate-500">Required: English and Hindi names.</p></div><button onClick={() => setForm(null)} className="rounded-lg p-2 text-slate-500 hover:bg-white" aria-label="Close editor"><X className="h-4 w-4" /></button></div>
              <div className="grid gap-3 sm:grid-cols-2">
                {(form.kind === 'classes' || form.kind === 'subjects' || form.kind === 'chapters') && <label className="block"><span className="mb-1 block text-[11px] font-bold text-slate-700">Class</span><select value={form.classLevel} onChange={e => setForm({ ...form, classLevel: e.target.value })} className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-xs">{data.classes.map(x => <option key={x.id} value={x.level}>Class {x.level}</option>)}</select></label>}
                {form.kind === 'chapters' && <><label className="block"><span className="mb-1 block text-[11px] font-bold text-slate-700">Chapter Number</span><input type="number" min="1" value={form.number} onChange={e => setForm({ ...form, number: e.target.value })} className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-xs" /></label><label className="block"><span className="mb-1 block text-[11px] font-bold text-slate-700">Subject</span><input value={form.subject} onChange={e => setForm({ ...form, subject: e.target.value })} className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-xs" /></label></>}
                {form.kind === 'classes' && <><label className="block"><span className="mb-1 block text-[11px] font-bold text-slate-700">Class number</span><input value={form.classLevel} onChange={e => setForm({ ...form, classLevel: e.target.value })} className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-xs" /></label><label className="block"><span className="mb-1 block text-[11px] font-bold text-slate-700">Badge (English)</span><input value={form.badgeEn} onChange={e => setForm({ ...form, badgeEn: e.target.value })} className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-xs" /></label><label className="block"><span className="mb-1 block text-[11px] font-bold text-slate-700">Badge (Hindi)</span><input value={form.badgeHi} onChange={e => setForm({ ...form, badgeHi: e.target.value })} className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-xs" /></label></>}
                {form.kind === 'courses' && <label className="block sm:col-span-2"><span className="mb-1 block text-[11px] font-bold text-slate-700">Class levels (comma separated)</span><input value={form.classLevelsText} onChange={e => setForm({ ...form, classLevelsText: e.target.value })} className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-xs" /></label>}
                <label className="block"><span className="mb-1 block text-[11px] font-bold text-slate-700">Title (English) *</span><input value={form.titleEn} onChange={e => setForm({ ...form, titleEn: e.target.value })} className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-xs" /></label>
                <label className="block"><span className="mb-1 block text-[11px] font-bold text-slate-700">Title (Hindi) *</span><input value={form.titleHi} onChange={e => setForm({ ...form, titleHi: e.target.value })} className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-xs" /></label>
                {(form.kind === 'classes' || form.kind === 'courses' || form.kind === 'chapters') && <><label className="block"><span className="mb-1 block text-[11px] font-bold text-slate-700">Description / Summary (English)</span><textarea rows={3} value={form.descriptionEn} onChange={e => setForm({ ...form, descriptionEn: e.target.value })} className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-xs" /></label><label className="block"><span className="mb-1 block text-[11px] font-bold text-slate-700">Description / Summary (Hindi)</span><textarea rows={3} value={form.descriptionHi} onChange={e => setForm({ ...form, descriptionHi: e.target.value })} className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-xs" /></label></>}
                <label className="block"><span className="mb-1 block text-[11px] font-bold text-slate-700">Status</span><select value={form.status} onChange={e => setForm({ ...form, status: e.target.value as Status })} className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-xs"><option value="draft">Draft</option><option value="active">Active (Preview label only)</option><option value="coming-soon">Coming soon</option></select></label>
                {form.kind === 'chapters' && <label className="flex items-center gap-2 self-end rounded-lg bg-white px-3 py-2.5 text-xs font-semibold text-slate-700"><input type="checkbox" checked={form.hasResources} onChange={e => setForm({ ...form, hasResources: e.target.checked })} className="h-4 w-4 accent-sky-800" />Resources linked in source</label>}
              </div>
              {message && <p className="mt-3 text-xs font-semibold text-sky-900">{message}</p>}
              <div className="mt-4 flex flex-wrap justify-end gap-2"><button onClick={() => setForm(null)} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600">Cancel</button><button onClick={saveForm} className="inline-flex items-center gap-2 rounded-lg bg-sky-900 px-3 py-2 text-xs font-bold text-white"><CheckCircle2 className="h-3.5 w-3.5" />Save to Draft Workspace</button></div>
            </div>}
            <div className="space-y-2">{renderRows()}{((tab === 'classes' && filteredClasses.length === 0) || (tab === 'courses' && filteredCourses.length === 0) || (tab === 'subjects' && filteredSubjects.length === 0) || (tab === 'chapters' && filteredChapters.length === 0)) && <div className="rounded-xl border border-dashed border-slate-300 p-8 text-center text-xs text-slate-500">No records found. Search another term or add a new draft.</div>}</div>
          </>}
        </div>
      </section>
      {message && !form && <p role="status" className="rounded-xl border border-sky-100 bg-sky-50 px-4 py-3 text-xs leading-5 text-sky-900">{message}</p>}
      {draftSaved && <p className="inline-flex items-center gap-2 text-[10px] font-semibold text-emerald-700"><CheckCircle2 className="h-3.5 w-3.5" />Draft saved in this browser only.</p>}
    </div>
  );
};
