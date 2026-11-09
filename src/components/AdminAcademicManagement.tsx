import React, { useMemo, useState } from 'react';
import {
  GraduationCap, BookOpen, Layers3, ListTree, Plus, Search, Pencil,
  Save, X, CheckCircle2, Info, ChevronRight, BookMarked, FileText,
  Sparkles, RotateCcw, CalendarDays, FileSpreadsheet, History, Link2,
  ClipboardCheck, ArrowUp, ArrowDown, Archive, Download, Upload, Eye,
  ShieldCheck, Target, ListChecks, BookOpenCheck
} from 'lucide-react';
import { CLASSES_METADATA, STUDY_CHAPTERS } from '../data/portalData';

type Status = 'active' | 'coming-soon' | 'draft' | 'archived';
type Coverage = 'not-started' | 'in-progress' | 'completed';
type Tab = 'overview' | 'sessions' | 'classes' | 'subjects' | 'chapters' | 'mapping' | 'import-export' | 'history';
type Kind = 'classes' | 'courses' | 'subjects' | 'chapters';
type Dataset = 'sessions' | Kind;

type SessionRecord = { id: string; name: string; year: string; board: string; medium: string; status: Status };
type ClassRecord = {
  id: string; level: string; titleEn: string; titleHi: string; badgeEn: string; badgeHi: string;
  descriptionEn: string; descriptionHi: string; status: Status;
  resourceCount: { notes: number; tests: number; mcqs: number };
};
type CourseRecord = {
  id: string; titleEn: string; titleHi: string; descriptionEn: string; descriptionHi: string;
  classLevels: string[]; status: Status;
};
type SubjectRecord = { id: string; classLevel: string; courseId: string; titleEn: string; titleHi: string; status: Status };
type MaterialLink = { id: string; title: string; format: string; resourceRef: string; access: string; status: Status };
type TestLink = { id: string; title: string; testRef: string; testType: string; status: Status };
type ChapterRecord = {
  id: string; classLevel: string; subjectId: string; subject: string; number: number; unit: string;
  titleEn: string; titleHi: string; summaryEn: string; summaryHi: string;
  topics: string[]; outcomes: string[]; weightage: number; periods: number;
  coverage: Coverage; hasResources: boolean; materials: MaterialLink[]; tests: TestLink[]; status: Status;
};
type AcademicSnapshot = {
  sessions: SessionRecord[]; selectedSessionId: string;
  classes: ClassRecord[]; courses: CourseRecord[]; subjects: SubjectRecord[]; chapters: ChapterRecord[];
};
type VersionEntry = { id: string; label: string; createdAt: string; summary: string; snapshot: AcademicSnapshot };
type Workspace = AcademicSnapshot & { versions: VersionEntry[]; reviewState: 'draft' | 'pending-review' };
type FormState = {
  kind: Kind; id: string; classLevel: string; number: string; titleEn: string; titleHi: string;
  badgeEn: string; badgeHi: string; descriptionEn: string; descriptionHi: string;
  subjectId: string; courseId: string; classLevelsText: string; status: Status;
  unit: string; topicsText: string; outcomesText: string; weightage: string; periods: string; coverage: Coverage;
};
type SessionForm = { id: string; name: string; year: string; board: string; medium: string; status: Status };
type LinkForm = { chapterId: string; title: string; format: string; resourceRef: string; access: string; status: Status };
type TestForm = { chapterId: string; title: string; testRef: string; testType: string; status: Status };

const STORAGE_KEY = 'krishansir.admin-academic-management.draft.v2';
const LEGACY_STORAGE_KEY = 'krishansir.admin-academic-management.draft.v1';
const makeId = (kind: string) => kind + '-draft-' + Date.now() + '-' + Math.random().toString(36).slice(2, 7);
const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value)) as T;
const statusText: Record<Status, string> = { active: 'Active', 'coming-soon': 'Coming soon', draft: 'Draft', archived: 'Archived' };
const coverageText: Record<Coverage, string> = { 'not-started': 'Not started', 'in-progress': 'In progress', completed: 'Completed' };

const initialWorkspace = (): Workspace => {
  const courses: CourseRecord[] = [
    { id: 'school-learning', titleEn: 'School Learning · Classes 6–12', titleHi: 'विद्यालयी शिक्षा · कक्षा 6–12', descriptionEn: 'Class-wise syllabus, chapter notes and learning resources.', descriptionHi: 'कक्षावार पाठ्यक्रम, अध्यायवार नोट्स और अध्ययन संसाधन।', classLevels: ['6','7','8','9','10','11','12'], status: 'active' },
    { id: 'social-science', titleEn: 'Social Science', titleHi: 'सामाजिक विज्ञान', descriptionEn: 'History, Geography, Political Science and Economics.', descriptionHi: 'इतिहास, भूगोल, राजनीति विज्ञान और अर्थशास्त्र।', classLevels: ['6','7','8','9','10'], status: 'active' },
    { id: 'indian-constitution', titleEn: 'Indian Constitution', titleHi: 'भारतीय संविधान', descriptionEn: 'Constitutional articles, rights, institutions and polity.', descriptionHi: 'संवैधानिक अनुच्छेद, अधिकार, संस्थाएँ और राजव्यवस्था।', classLevels: ['8','9','10','11','12'], status: 'active' },
    { id: 'competitive-exams', titleEn: 'Competitive Exams', titleHi: 'प्रतियोगी परीक्षाएँ', descriptionEn: 'UGC NET, HTET, CTET and teacher recruitment practice.', descriptionHi: 'UGC NET, HTET, CTET और शिक्षक भर्ती परीक्षा अभ्यास।', classLevels: ['11','12'], status: 'active' },
  ];
  const classes: ClassRecord[] = CLASSES_METADATA.map((item) => ({
    id: 'class-' + item.level, level: item.level, titleEn: item.title.en, titleHi: item.title.hi,
    badgeEn: item.badge.en, badgeHi: item.badge.hi, descriptionEn: item.description.en,
    descriptionHi: item.description.hi, status: item.status,
    resourceCount: { ...item.resourceCount },
  }));
  const subjects: SubjectRecord[] = CLASSES_METADATA.flatMap((item) => item.subjects.map((subject, index) => ({
    id: 'subject-' + item.level + '-' + (index + 1), classLevel: item.level,
    courseId: 'social-science', titleEn: subject.en, titleHi: subject.hi, status: 'active' as Status,
  })));
  const chapters: ChapterRecord[] = STUDY_CHAPTERS.map((item) => {
    const normalized = item.subject.toLowerCase();
    const subject = subjects.find((x) => x.classLevel === item.classLevel &&
      (normalized.includes(x.titleEn.toLowerCase()) || x.titleEn.toLowerCase().includes(normalized))) ||
      subjects.find((x) => x.classLevel === item.classLevel);
    return {
      id: item.id, classLevel: item.classLevel, subjectId: subject?.id || '', subject: item.subject,
      number: item.chapterNumber, unit: '', titleEn: item.title.en, titleHi: item.title.hi,
      summaryEn: item.summary.en, summaryHi: item.summary.hi, topics: [], outcomes: [],
      weightage: 0, periods: 1, coverage: 'not-started' as Coverage,
      hasResources: item.hasResources, materials: [], tests: [], status: 'active' as Status,
    };
  });
  const session: SessionRecord = { id: 'session-2026-27', name: 'Academic Session 2026–27', year: '2026–27', board: 'HBSE', medium: 'Bilingual', status: 'active' };
  return { sessions: [session], selectedSessionId: session.id, classes, courses, subjects, chapters, versions: [], reviewState: 'draft' };
};

const snapshotOf = (data: Workspace): AcademicSnapshot => ({
  sessions: clone(data.sessions), selectedSessionId: data.selectedSessionId,
  classes: clone(data.classes), courses: clone(data.courses), subjects: clone(data.subjects), chapters: clone(data.chapters),
});

const hydrateWorkspace = (value: unknown): Workspace | null => {
  if (!value || typeof value !== 'object') return null;
  const raw = value as Record<string, unknown>;
  const base = initialWorkspace();
  if (!Array.isArray(raw.classes) || !Array.isArray(raw.courses) || !Array.isArray(raw.subjects) || !Array.isArray(raw.chapters)) return null;
  const classes = raw.classes as ClassRecord[];
  const courses = raw.courses as CourseRecord[];
  const subjects = (raw.subjects as Array<Partial<SubjectRecord>>).map((item) => ({
    id: item.id || makeId('subject'), classLevel: item.classLevel || '10', courseId: item.courseId || 'social-science',
    titleEn: item.titleEn || '', titleHi: item.titleHi || '', status: item.status || 'draft',
  })) as SubjectRecord[];
  const chapters = (raw.chapters as Array<Partial<ChapterRecord>>).map((item) => {
    const subject = subjects.find((x) => x.classLevel === item.classLevel &&
      (x.titleEn.toLowerCase().includes((item.subject || '').toLowerCase()) || (item.subject || '').toLowerCase().includes(x.titleEn.toLowerCase()))) ||
      subjects.find((x) => x.classLevel === item.classLevel);
    return {
      id: item.id || makeId('chapter'), classLevel: item.classLevel || '10', subjectId: item.subjectId || subject?.id || '',
      subject: item.subject || subject?.titleEn || '', number: Number(item.number) || 1, unit: item.unit || '',
      titleEn: item.titleEn || '', titleHi: item.titleHi || '', summaryEn: item.summaryEn || '', summaryHi: item.summaryHi || '',
      topics: Array.isArray(item.topics) ? item.topics : [], outcomes: Array.isArray(item.outcomes) ? item.outcomes : [],
      weightage: Number(item.weightage) || 0, periods: Number(item.periods) || 1,
      coverage: item.coverage || 'not-started', hasResources: Boolean(item.hasResources),
      materials: Array.isArray(item.materials) ? item.materials : [], tests: Array.isArray(item.tests) ? item.tests : [],
      status: item.status || 'active',
    } as ChapterRecord;
  });
  const sessions = Array.isArray(raw.sessions) ? raw.sessions as SessionRecord[] : base.sessions;
  const selectedSessionId = typeof raw.selectedSessionId === 'string' && sessions.some(x => x.id === raw.selectedSessionId)
    ? raw.selectedSessionId : sessions[0]?.id || base.selectedSessionId;
  return {
    sessions, selectedSessionId, classes, courses, subjects, chapters,
    versions: Array.isArray(raw.versions) ? raw.versions as VersionEntry[] : [],
    reviewState: raw.reviewState === 'pending-review' ? 'pending-review' : 'draft',
  };
};

const loadDraft = (): Workspace => {
  if (typeof window === 'undefined') return initialWorkspace();
  try {
    const current = window.localStorage.getItem(STORAGE_KEY);
    if (current) {
      const parsed = JSON.parse(current);
      if (parsed?.version === 2) return hydrateWorkspace(parsed.data) || initialWorkspace();
    }
    const legacy = window.localStorage.getItem(LEGACY_STORAGE_KEY);
    if (legacy) {
      const parsed = JSON.parse(legacy);
      if (parsed?.version === 1) {
        const migrated = hydrateWorkspace(parsed.data);
        if (migrated) return migrated;
      }
    }
  } catch {
    // Invalid local draft: retain the bundled website source data.
  }
  return initialWorkspace();
};

const newForm = (kind: Kind): FormState => ({
  kind, id: '', classLevel: '10', number: '1', titleEn: '', titleHi: '', badgeEn: '', badgeHi: '',
  descriptionEn: '', descriptionHi: '', subjectId: '', courseId: 'social-science',
  classLevelsText: '6, 7, 8, 9, 10, 11, 12', status: 'draft',
  unit: '', topicsText: '', outcomesText: '', weightage: '', periods: '1', coverage: 'not-started',
});

const csvCell = (value: unknown) => '"' + String(value ?? '').replace(/"/g, '""') + '"';
const parseCsv = (input: string): string[][] => {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let quoted = false;
  for (let i = 0; i < input.length; i += 1) {
    const char = input[i];
    if (char === '"' && quoted && input[i + 1] === '"') { cell += '"'; i += 1; }
    else if (char === '"') quoted = !quoted;
    else if (char === ',' && !quoted) { row.push(cell); cell = ''; }
    else if ((char === '\n' || char === '\r') && !quoted) {
      if (char === '\r' && input[i + 1] === '\n') i += 1;
      row.push(cell); cell = '';
      if (row.some(x => x.trim())) rows.push(row);
      row = [];
    } else cell += char;
  }
  row.push(cell);
  if (row.some(x => x.trim())) rows.push(row);
  return rows;
};

export const AdminAcademicManagement: React.FC = () => {
  const [data, setData] = useState<Workspace>(loadDraft);
  const [tab, setTab] = useState<Tab>('overview');
  const [query, setQuery] = useState('');
  const [filterClass, setFilterClass] = useState('all');
  const [form, setForm] = useState<FormState | null>(null);
  const [sessionForm, setSessionForm] = useState<SessionForm | null>(null);
  const [linkForm, setLinkForm] = useState<LinkForm | null>(null);
  const [testForm, setTestForm] = useState<TestForm | null>(null);
  const [selectedChapterId, setSelectedChapterId] = useState('');
  const [dataset, setDataset] = useState<Dataset>('chapters');
  const [message, setMessage] = useState('');
  const [draftSaved, setDraftSaved] = useState(false);
  const [importSummary, setImportSummary] = useState('');
  const [showHistory, setShowHistory] = useState(true);

  const activeSession = data.sessions.find(x => x.id === data.selectedSessionId) || data.sessions[0];
  const currentChapters = data.chapters.filter(x => x.status !== 'archived');
  const totalCount = data.classes.length + data.courses.length + data.subjects.length + data.chapters.length;
  const activeCount = data.classes.filter(x => x.status === 'active').length + data.courses.filter(x => x.status === 'active').length +
    data.subjects.filter(x => x.status === 'active').length + data.chapters.filter(x => x.status === 'active').length;
  const syllabusCompletion = currentChapters.length
    ? Math.round(currentChapters.filter(x => x.coverage === 'completed').length / currentChapters.length * 100) : 0;
  const tabs: { id: Tab; label: string; hi: string; icon: React.ElementType }[] = [
    { id: 'overview', label: 'Overview', hi: 'सारांश', icon: GraduationCap },
    { id: 'sessions', label: 'Sessions', hi: 'सत्र', icon: CalendarDays },
    { id: 'classes', label: 'Classes & Courses', hi: 'कक्षाएँ एवं कोर्स', icon: Layers3 },
    { id: 'subjects', label: 'Subjects', hi: 'विषय', icon: BookMarked },
    { id: 'chapters', label: 'Chapters & Syllabus', hi: 'अध्याय एवं पाठ्यक्रम', icon: ListTree },
    { id: 'mapping', label: 'Materials & Tests', hi: 'सामग्री एवं टेस्ट', icon: Link2 },
    { id: 'import-export', label: 'Import / Export', hi: 'आयात / निर्यात', icon: FileSpreadsheet },
    { id: 'history', label: 'Versions & Approval', hi: 'संस्करण एवं अनुमोदन', icon: History },
  ];

  const filteredClasses = useMemo(() => data.classes.filter(x =>
    (filterClass === 'all' || x.level === filterClass) &&
    (x.level + ' ' + x.titleEn + ' ' + x.titleHi + ' ' + x.badgeEn).toLowerCase().includes(query.toLowerCase())
  ), [data.classes, filterClass, query]);
  const filteredCourses = useMemo(() => data.courses.filter(x =>
    (x.titleEn + ' ' + x.titleHi).toLowerCase().includes(query.toLowerCase())
  ), [data.courses, query]);
  const filteredSubjects = useMemo(() => data.subjects.filter(x =>
    (filterClass === 'all' || x.classLevel === filterClass) &&
    (x.titleEn + ' ' + x.titleHi + ' ' + x.classLevel).toLowerCase().includes(query.toLowerCase())
  ), [data.subjects, filterClass, query]);
  const filteredChapters = useMemo(() => data.chapters.filter(x =>
    (filterClass === 'all' || x.classLevel === filterClass) &&
    (x.titleEn + ' ' + x.titleHi + ' ' + x.subject + ' ' + x.unit).toLowerCase().includes(query.toLowerCase())
  ), [data.chapters, filterClass, query]);

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
      setForm({ ...common, classLevel: x.classLevel, courseId: x.courseId, titleEn: x.titleEn, titleHi: x.titleHi, status: x.status });
    } else {
      const x = data.chapters.find(v => v.id === id); if (!x) return;
      setForm({ ...common, classLevel: x.classLevel, number: String(x.number), subjectId: x.subjectId,
        titleEn: x.titleEn, titleHi: x.titleHi, descriptionEn: x.summaryEn, descriptionHi: x.summaryHi,
        status: x.status, unit: x.unit, topicsText: x.topics.join('\n'), outcomesText: x.outcomes.join('\n'),
        weightage: String(x.weightage || ''), periods: String(x.periods || 1), coverage: x.coverage });
    }
    setMessage('');
  };

  const saveForm = () => {
    if (!form || !form.titleEn.trim() || !form.titleHi.trim()) { setMessage('English और हिन्दी दोनों नाम भरें।'); return; }
    const id = form.id || makeId(form.kind);
    const next = clone(data);
    if (form.kind === 'classes') {
      const level = form.classLevel.trim();
      if (!level || next.classes.some(x => x.level === level && x.id !== form.id)) { setMessage('Class number खाली है या पहले से मौजूद है।'); return; }
      const old = next.classes.find(x => x.id === form.id);
      const record: ClassRecord = { id, level, titleEn: form.titleEn.trim(), titleHi: form.titleHi.trim(),
        badgeEn: form.badgeEn.trim() || 'School', badgeHi: form.badgeHi.trim() || 'विद्यालय',
        descriptionEn: form.descriptionEn.trim(), descriptionHi: form.descriptionHi.trim(), status: form.status,
        resourceCount: old?.resourceCount || { notes: 0, tests: 0, mcqs: 0 } };
      next.classes = old ? next.classes.map(x => x.id === id ? record : x) : [...next.classes, record];
    } else if (form.kind === 'courses') {
      const levels = form.classLevelsText.split(',').map(x => x.trim()).filter(x => next.classes.some(c => c.level === x));
      const record: CourseRecord = { id, titleEn: form.titleEn.trim(), titleHi: form.titleHi.trim(),
        descriptionEn: form.descriptionEn.trim(), descriptionHi: form.descriptionHi.trim(), classLevels: levels, status: form.status };
      next.courses = form.id ? next.courses.map(x => x.id === id ? record : x) : [...next.courses, record];
    } else if (form.kind === 'subjects') {
      if (!next.classes.some(x => x.level === form.classLevel)) { setMessage('पहले उपलब्ध Class चुनें।'); return; }
      const record: SubjectRecord = { id, classLevel: form.classLevel, courseId: form.courseId,
        titleEn: form.titleEn.trim(), titleHi: form.titleHi.trim(), status: form.status };
      next.subjects = form.id ? next.subjects.map(x => x.id === id ? record : x) : [...next.subjects, record];
    } else {
      if (!next.classes.some(x => x.level === form.classLevel)) { setMessage('पहले उपलब्ध Class चुनें।'); return; }
      const subject = next.subjects.find(x => x.id === form.subjectId && x.classLevel === form.classLevel);
      if (!subject) { setMessage('इस Class के लिए Subject चुनें।'); return; }
      const record: ChapterRecord = { id, classLevel: form.classLevel, subjectId: subject.id, subject: subject.titleEn,
        number: Math.max(1, Number(form.number) || 1), unit: form.unit.trim(),
        titleEn: form.titleEn.trim(), titleHi: form.titleHi.trim(), summaryEn: form.descriptionEn.trim(), summaryHi: form.descriptionHi.trim(),
        topics: form.topicsText.split('\n').map(x => x.trim()).filter(Boolean),
        outcomes: form.outcomesText.split('\n').map(x => x.trim()).filter(Boolean),
        weightage: Math.min(100, Math.max(0, Number(form.weightage) || 0)), periods: Math.max(1, Number(form.periods) || 1),
        coverage: form.coverage, hasResources: false, materials: [], tests: [], status: form.status };
      const old = next.chapters.find(x => x.id === form.id);
      if (old) { record.materials = old.materials || []; record.tests = old.tests || []; record.hasResources = old.hasResources; }
      next.chapters = old ? next.chapters.map(x => x.id === id ? record : x) : [...next.chapters, record];
    }
    setData(next); setForm(null); setDraftSaved(false);
    setMessage('Record Draft Workspace में तैयार है। स्थायी रखने के लिए Save Draft करें।');
  };

  const saveSession = () => {
    if (!sessionForm || !sessionForm.name.trim() || !sessionForm.year.trim()) { setMessage('Session name और Academic Year भरें।'); return; }
    const next = clone(data);
    const record: SessionRecord = { ...sessionForm, name: sessionForm.name.trim(), year: sessionForm.year.trim() };
    next.sessions = sessionForm.id ? next.sessions.map(x => x.id === record.id ? record : x) : [...next.sessions, record];
    if (record.status === 'active') next.sessions = next.sessions.map(x => ({ ...x, status: x.id === record.id ? 'active' : (x.status === 'active' ? 'archived' : x.status) }));
    if (!sessionForm.id) next.selectedSessionId = record.id;
    setData(next); setSessionForm(null); setDraftSaved(false);
    setMessage('Academic Session Draft update हुआ है। Save Draft करें।');
  };

  const archiveRecord = (kind: Kind, id: string) => {
    const next = clone(data);
    if (kind === 'classes') next.classes = next.classes.map(x => x.id === id ? { ...x, status: 'archived' } : x);
    if (kind === 'courses') next.courses = next.courses.map(x => x.id === id ? { ...x, status: 'archived' } : x);
    if (kind === 'subjects') next.subjects = next.subjects.map(x => x.id === id ? { ...x, status: 'archived' } : x);
    if (kind === 'chapters') next.chapters = next.chapters.map(x => x.id === id ? { ...x, status: 'archived' } : x);
    setData(next); setDraftSaved(false); setMessage('Record archived in local draft. इसे वेबसाइट से नहीं हटाया गया।');
  };

  const saveDraft = () => {
    try {
      const next = clone(data);
      const version: VersionEntry = {
        id: makeId('version'), label: 'Academic Draft v' + (next.versions.length + 1),
        createdAt: new Date().toISOString(), summary: next.classes.length + ' classes · ' + next.subjects.length + ' subjects · ' + next.chapters.length + ' chapters',
        snapshot: snapshotOf(next),
      };
      next.versions = [version, ...next.versions].slice(0, 15);
      next.reviewState = 'draft';
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: 2, data: next }));
      setData(next); setDraftSaved(true);
      setMessage('Draft और Version History इस browser में सुरक्षित हैं। Supabase/Live पर कुछ नहीं भेजा गया।');
    } catch {
      setMessage('इस browser में Draft save नहीं हो सका। Storage availability जाँचें।');
    }
  };

  const submitForReview = () => {
    const next = { ...data, reviewState: 'pending-review' as const };
    setData(next); setDraftSaved(false);
    try { window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: 2, data: next })); } catch { /* Local state remains available for this session. */ }
    setMessage('Local Preview status: Pending Approval. कोई वास्तविक notification या approval request नहीं भेजी गई।');
  };

  const restoreVersion = (version: VersionEntry) => {
    const restored = { ...clone(version.snapshot), versions: data.versions, reviewState: 'draft' as const };
    setData(restored); setDraftSaved(false);
    setMessage(version.label + ' local workspace में restore हुआ। Save Draft करके नया version बनाएँ।');
  };

  const exportCsv = () => {
    let headers: string[] = [];
    let rows: unknown[][] = [];
    if (dataset === 'sessions') {
      headers = ['id','name','year','board','medium','status'];
      rows = data.sessions.map(x => [x.id,x.name,x.year,x.board,x.medium,x.status]);
    } else if (dataset === 'classes') {
      headers = ['level','titleEn','titleHi','badgeEn','badgeHi','descriptionEn','descriptionHi','status'];
      rows = data.classes.map(x => [x.level,x.titleEn,x.titleHi,x.badgeEn,x.badgeHi,x.descriptionEn,x.descriptionHi,x.status]);
    } else if (dataset === 'courses') {
      headers = ['titleEn','titleHi','descriptionEn','descriptionHi','classLevels','status'];
      rows = data.courses.map(x => [x.titleEn,x.titleHi,x.descriptionEn,x.descriptionHi,x.classLevels.join('|'),x.status]);
    } else if (dataset === 'subjects') {
      headers = ['classLevel','courseId','titleEn','titleHi','status'];
      rows = data.subjects.map(x => [x.classLevel,x.courseId,x.titleEn,x.titleHi,x.status]);
    } else {
      headers = ['classLevel','subject','number','unit','titleEn','titleHi','summaryEn','summaryHi','topics','outcomes','weightage','periods','coverage','status'];
      rows = data.chapters.map(x => [x.classLevel,x.subject,x.number,x.unit,x.titleEn,x.titleHi,x.summaryEn,x.summaryHi,x.topics.join('|'),x.outcomes.join('|'),x.weightage,x.periods,x.coverage,x.status]);
    }
    const csv = [headers.map(csvCell).join(','), ...rows.map(row => row.map(csvCell).join(','))].join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url; link.download = 'academic-' + dataset + '-preview.csv'; link.click();
    URL.revokeObjectURL(url);
    setMessage('CSV export तैयार हुआ। यह local Preview data का export है।');
  };

  const importCsv = (file: File | undefined) => {
    if (!file) return;
    if (!file.name.toLowerCase().endsWith('.csv')) { setImportSummary('कृपया CSV file चुनें।'); return; }
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = parseCsv(String(reader.result || '').replace(/^\uFEFF/, ''));
        if (parsed.length < 2) { setImportSummary('CSV में header और कम-से-कम एक data row होनी चाहिए।'); return; }
        const headers = parsed[0].map(x => x.trim().toLowerCase());
        const get = (row: string[], key: string) => row[headers.indexOf(key.toLowerCase())]?.trim() || '';
        const next = clone(data);
        let added = 0; let skipped = 0;
        parsed.slice(1).forEach(row => {
          const titleEn = get(row, 'titleEn');
          const titleHi = get(row, 'titleHi');
          if (dataset !== 'sessions' && !titleEn) { skipped++; return; }
          if (dataset === 'sessions') {
            const name = get(row,'name'); const year = get(row,'year');
            if (!name || !year) { skipped++; return; }
            if (next.sessions.some(x => x.year === year)) { skipped++; return; }
            next.sessions.push({ id: makeId('session'), name, year, board: get(row,'board') || 'Other', medium: get(row,'medium') || 'Bilingual', status: 'draft' });
            added++;
          } else if (dataset === 'classes') {
            const level = get(row,'level');
            if (!level || next.classes.some(x => x.level === level)) { skipped++; return; }
            next.classes.push({ id: makeId('class'), level, titleEn, titleHi: titleHi || titleEn, badgeEn: get(row,'badgeEn'), badgeHi: get(row,'badgeHi'),
              descriptionEn: get(row,'descriptionEn'), descriptionHi: get(row,'descriptionHi'), status: 'draft',
              resourceCount: { notes: 0, tests: 0, mcqs: 0 } });
            added++;
          } else if (dataset === 'courses') {
            if (next.courses.some(x => x.titleEn.toLowerCase() === titleEn.toLowerCase())) { skipped++; return; }
            next.courses.push({ id: makeId('course'), titleEn, titleHi: titleHi || titleEn,
              descriptionEn: get(row,'descriptionEn'), descriptionHi: get(row,'descriptionHi'),
              classLevels: (get(row,'classLevels') || '').split('|').map(x => x.trim()).filter(Boolean), status: 'draft' });
            added++;
          } else if (dataset === 'subjects') {
            const classLevel = get(row,'classLevel');
            if (!next.classes.some(x => x.level === classLevel)) { skipped++; return; }
            next.subjects.push({ id: makeId('subject'), classLevel, courseId: get(row,'courseId') || 'social-science',
              titleEn, titleHi: titleHi || titleEn, status: 'draft' });
            added++;
          } else if (dataset === 'chapters') {
            const classLevel = get(row,'classLevel');
            const subjectText = get(row,'subject');
            const subject = next.subjects.find(x => x.classLevel === classLevel && x.titleEn.toLowerCase() === subjectText.toLowerCase());
            if (!subject) { skipped++; return; }
            next.chapters.push({ id: makeId('chapter'), classLevel, subjectId: subject.id, subject: subject.titleEn,
              number: Math.max(1, Number(get(row,'number')) || 1), unit: get(row,'unit'), titleEn, titleHi: titleHi || titleEn,
              summaryEn: get(row,'summaryEn'), summaryHi: get(row,'summaryHi'),
              topics: (get(row,'topics') || '').split('|').filter(Boolean), outcomes: (get(row,'outcomes') || '').split('|').filter(Boolean),
              weightage: Number(get(row,'weightage')) || 0, periods: Math.max(1, Number(get(row,'periods')) || 1),
              coverage: 'not-started', hasResources: false, materials: [], tests: [], status: 'draft' });
            added++;
          }
        });
        setData(next); setDraftSaved(false);
        setImportSummary(added + ' draft records import हुए; ' + skipped + ' rows skip हुईं। Save Draft करके सुरक्षित करें।');
      } catch {
        setImportSummary('CSV पढ़ने में समस्या आई। Header names और file format जाँचें।');
      }
    };
    reader.onerror = () => setImportSummary('CSV file पढ़ी नहीं जा सकी।');
    reader.readAsText(file);
  };

  const openNewSession = () => setSessionForm({ id: '', name: 'Academic Session', year: '2027–28', board: 'HBSE', medium: 'Bilingual', status: 'draft' });
  const activeSubjects = data.subjects.filter(x => x.classLevel === filterClass && x.status !== 'archived');
  const selectedChapter = data.chapters.find(x => x.id === selectedChapterId) || data.chapters[0];
  const mappingChapter = selectedChapter || data.chapters[0];

  const updateChapter = (id: string, patch: Partial<ChapterRecord>) => {
    setData(current => ({ ...current, chapters: current.chapters.map(x => x.id === id ? { ...x, ...patch } : x) }));
    setDraftSaved(false);
  };

  const moveChapter = (chapter: ChapterRecord, direction: -1 | 1) => {
    const siblings = data.chapters.filter(x => x.classLevel === chapter.classLevel && x.subjectId === chapter.subjectId && x.status !== 'archived').sort((a,b) => a.number - b.number);
    const index = siblings.findIndex(x => x.id === chapter.id);
    const target = siblings[index + direction];
    if (!target) return;
    const next = clone(data);
    next.chapters = next.chapters.map(x => x.id === chapter.id ? { ...x, number: target.number } : x.id === target.id ? { ...x, number: chapter.number } : x);
    setData(next); setDraftSaved(false);
  };

  const addMaterialLink = () => {
    if (!linkForm || !linkForm.title.trim() || !linkForm.resourceRef.trim()) { setMessage('Material title और resource reference भरें।'); return; }
    const chapter = data.chapters.find(x => x.id === linkForm.chapterId);
    if (!chapter) return;
    updateChapter(chapter.id, { materials: [...chapter.materials, { id: makeId('material'), title: linkForm.title.trim(), format: linkForm.format, resourceRef: linkForm.resourceRef.trim(), access: linkForm.access, status: linkForm.status }], hasResources: true });
    setLinkForm(null); setMessage('Material mapping local draft में जुड़ गई। कोई वास्तविक Drive/Storage link नहीं बना।');
  };

  const addTestLink = () => {
    if (!testForm || !testForm.title.trim() || !testForm.testRef.trim()) { setMessage('Test title और test reference भरें।'); return; }
    const chapter = data.chapters.find(x => x.id === testForm.chapterId);
    if (!chapter) return;
    updateChapter(chapter.id, { tests: [...chapter.tests, { id: makeId('test-link'), title: testForm.title.trim(), testRef: testForm.testRef.trim(), testType: testForm.testType, status: testForm.status }] });
    setTestForm(null); setMessage('Test mapping local draft में जुड़ी। Test अभी वास्तविक रूप से link नहीं हुआ।');
  };

  const removeMaterial = (chapter: ChapterRecord, id: string) => updateChapter(chapter.id, { materials: chapter.materials.filter(x => x.id !== id), hasResources: chapter.materials.some(x => x.id !== id) });
  const removeTest = (chapter: ChapterRecord, id: string) => updateChapter(chapter.id, { tests: chapter.tests.filter(x => x.id !== id) });

  const statCards = [
    { label: 'Classes', value: data.classes.length, icon: BookOpen },
    { label: 'Courses', value: data.courses.length, icon: GraduationCap },
    { label: 'Subjects', value: data.subjects.length, icon: BookMarked },
    { label: 'Chapters', value: data.chapters.length, icon: ListTree },
  ];

  const field = (label: string, value: string, onChange: (value: string) => void, multiline = false) => (
    <label className="block"><span className="mb-1 block text-[11px] font-bold text-slate-700">{label}</span>
      {multiline
        ? <textarea rows={3} value={value} onChange={e => onChange(e.target.value)} className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-xs leading-5 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100" />
        : <input value={value} onChange={e => onChange(e.target.value)} className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-xs outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100" />}
    </label>
  );

  const recordEditor = form && (
    <div className="rounded-2xl border border-sky-200 bg-sky-50/50 p-4 sm:p-5">
      <div className="mb-4 flex items-center justify-between gap-3"><div><h4 className="text-sm font-extrabold text-slate-900">{form.id ? 'Edit' : 'New'} {form.kind.slice(0,-1)} Draft</h4><p className="mt-1 text-[10px] text-slate-500">English और हिन्दी दोनों नाम आवश्यक हैं।</p></div><button onClick={() => setForm(null)} className="rounded-lg p-2 text-slate-500 hover:bg-white" aria-label="Close editor"><X className="h-4 w-4" /></button></div>
      <div className="grid gap-3 sm:grid-cols-2">
        {form.kind !== 'courses' && <label className="block"><span className="mb-1 block text-[11px] font-bold text-slate-700">Class</span><select value={form.classLevel} onChange={e => setForm({ ...form, classLevel: e.target.value, subjectId: '' })} className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-xs">{data.classes.filter(x => x.status !== 'archived').map(x => <option key={x.id} value={x.level}>Class {x.level}</option>)}</select></label>}
        {form.kind === 'classes' && <>{field('Class number', form.classLevel, value => setForm({ ...form, classLevel: value }))}{field('Badge (English)', form.badgeEn, value => setForm({ ...form, badgeEn: value }))}{field('Badge (Hindi)', form.badgeHi, value => setForm({ ...form, badgeHi: value }))}</>}
        {form.kind === 'courses' && <label className="block sm:col-span-2"><span className="mb-1 block text-[11px] font-bold text-slate-700">Class levels (comma separated)</span><input value={form.classLevelsText} onChange={e => setForm({ ...form, classLevelsText: e.target.value })} className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-xs" /></label>}
        {form.kind === 'subjects' && <label className="block"><span className="mb-1 block text-[11px] font-bold text-slate-700">Course</span><select value={form.courseId} onChange={e => setForm({ ...form, courseId: e.target.value })} className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-xs">{data.courses.map(x => <option key={x.id} value={x.id}>{x.titleEn}</option>)}</select></label>}
        {form.kind === 'chapters' && <><label className="block"><span className="mb-1 block text-[11px] font-bold text-slate-700">Subject</span><select value={form.subjectId} onChange={e => setForm({ ...form, subjectId: e.target.value })} className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-xs"><option value="">Select subject</option>{data.subjects.filter(x => x.classLevel === form.classLevel && x.status !== 'archived').map(x => <option key={x.id} value={x.id}>{x.titleEn}</option>)}</select></label>{field('Chapter Number', form.number, value => setForm({ ...form, number: value }))}{field('Unit / Section', form.unit, value => setForm({ ...form, unit: value }))}</>}
        {field('Title (English) *', form.titleEn, value => setForm({ ...form, titleEn: value }))}
        {field('Title (Hindi) *', form.titleHi, value => setForm({ ...form, titleHi: value }))}
        {(form.kind === 'classes' || form.kind === 'courses' || form.kind === 'chapters') && <>{field('Description / Summary (English)', form.descriptionEn, value => setForm({ ...form, descriptionEn: value }), true)}{field('Description / Summary (Hindi)', form.descriptionHi, value => setForm({ ...form, descriptionHi: value }), true)}</>}
        {form.kind === 'chapters' && <>
          {field('Topics (one per line)', form.topicsText, value => setForm({ ...form, topicsText: value }), true)}
          {field('Learning Outcomes (one per line)', form.outcomesText, value => setForm({ ...form, outcomesText: value }), true)}
          {field('Exam Weightage (%)', form.weightage, value => setForm({ ...form, weightage: value }))}
          {field('Teaching Periods', form.periods, value => setForm({ ...form, periods: value }))}
          <label className="block"><span className="mb-1 block text-[11px] font-bold text-slate-700">Syllabus Coverage</span><select value={form.coverage} onChange={e => setForm({ ...form, coverage: e.target.value as Coverage })} className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-xs"><option value="not-started">Not started</option><option value="in-progress">In progress</option><option value="completed">Completed</option></select></label>
        </>}
        <label className="block"><span className="mb-1 block text-[11px] font-bold text-slate-700">Record Status</span><select value={form.status} onChange={e => setForm({ ...form, status: e.target.value as Status })} className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-xs"><option value="draft">Draft</option><option value="active">Active (Preview label only)</option><option value="coming-soon">Coming soon</option><option value="archived">Archived</option></select></label>
      </div>
      <div className="mt-4 flex flex-wrap justify-end gap-2"><button onClick={() => setForm(null)} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600">Cancel</button><button onClick={saveForm} className="inline-flex items-center gap-2 rounded-lg bg-sky-900 px-3 py-2 text-xs font-bold text-white"><CheckCircle2 className="h-3.5 w-3.5" />Save to Draft Workspace</button></div>
    </div>
  );

  const chapterList = (items: ChapterRecord[]) => [...items].sort((a,b) => a.classLevel.localeCompare(b.classLevel) || a.subject.localeCompare(b.subject) || a.number-b.number).map((x) => {
    const siblings = data.chapters.filter(c => c.classLevel === x.classLevel && c.subjectId === x.subjectId && c.status !== 'archived').sort((a,b) => a.number-b.number);
    const index = siblings.findIndex(c => c.id === x.id);
    return <div key={x.id} className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 sm:flex-row sm:items-center">
      <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-amber-50 text-amber-800"><FileText className="h-5 w-5" /></div>
      <div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><b className="text-sm text-slate-900">Class {x.classLevel} · Chapter {x.number}</b><span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] text-slate-600">{statusText[x.status]}</span><span className="rounded-full bg-sky-50 px-2 py-0.5 text-[10px] text-sky-800">{coverageText[x.coverage]}</span></div><p className="mt-1 text-xs text-slate-700">{x.titleEn}</p><p className="text-xs text-slate-500">{x.titleHi}</p><p className="mt-1 text-[10px] text-slate-400">{x.subject} · {x.unit || 'No unit'} · {x.weightage}% weightage · {x.periods} periods</p></div>
      <div className="flex flex-wrap gap-1"><button disabled={index <= 0} onClick={() => moveChapter(x,-1)} title="Move up" className="rounded-lg border border-slate-200 p-2 text-slate-600 disabled:opacity-30"><ArrowUp className="h-3.5 w-3.5" /></button><button disabled={index === siblings.length-1} onClick={() => moveChapter(x,1)} title="Move down" className="rounded-lg border border-slate-200 p-2 text-slate-600 disabled:opacity-30"><ArrowDown className="h-3.5 w-3.5" /></button><button onClick={() => openEdit('chapters',x.id)} className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700"><Pencil className="h-3.5 w-3.5" />Edit</button><button onClick={() => archiveRecord('chapters',x.id)} className="rounded-lg border border-slate-200 p-2 text-slate-500 hover:bg-amber-50" title="Archive"><Archive className="h-3.5 w-3.5" /></button></div>
    </div>;
  });

  return (
    <div className="space-y-5">
      <div className="flex flex-col justify-between gap-3 xl:flex-row xl:items-end">
        <div><div className="flex items-center gap-2 text-[10px] font-extrabold uppercase tracking-[.16em] text-sky-700"><GraduationCap className="h-3.5 w-3.5" />Academic Management</div><h2 className="mt-1 text-2xl font-extrabold tracking-tight text-slate-900">Academic Structure</h2><p className="mt-1 max-w-3xl text-sm leading-6 text-slate-500">Academic Session, Classes, Courses, Subjects, Chapters, syllabus, materials और assessments को एक संरचना में व्यवस्थित करें।</p></div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-3 py-1.5 text-[10px] font-bold text-amber-800"><Info className="h-3.5 w-3.5" />Local Preview Draft · No database writes</span>
          <button onClick={saveDraft} className="inline-flex items-center gap-2 rounded-xl bg-sky-900 px-3 py-2.5 text-xs font-bold text-white hover:bg-sky-800"><Save className="h-4 w-4" />Save Draft</button>
          <button onClick={() => { setData(initialWorkspace()); window.localStorage.removeItem(STORAGE_KEY); window.localStorage.removeItem(LEGACY_STORAGE_KEY); setDraftSaved(false); setMessage('Local draft cleared; bundled website source data reloaded.'); }} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50"><RotateCcw className="h-4 w-4" />Reset Draft</button>
        </div>
      </div>

      <div className="rounded-2xl border border-sky-100 bg-gradient-to-r from-white to-sky-50 p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-[10px] font-bold uppercase tracking-wider text-sky-700">Selected Academic Session</p><h3 className="mt-1 text-lg font-extrabold text-slate-900">{activeSession?.name || 'No session selected'}</h3><p className="mt-1 text-xs text-slate-500">{activeSession?.board || '—'} · {activeSession?.medium || '—'} · {activeSession?.year || '—'}</p></div><button onClick={() => setTab('sessions')} className="inline-flex items-center gap-2 self-start rounded-xl border border-sky-200 bg-white px-3 py-2 text-xs font-bold text-sky-900"><CalendarDays className="h-4 w-4" />Manage Sessions</button></div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{statCards.map(item => { const Icon = item.icon; return <div key={item.label} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><div className="flex items-center justify-between"><span className="text-xs font-semibold text-slate-500">{item.label}</span><span className="grid h-9 w-9 place-items-center rounded-xl bg-sky-50 text-sky-900"><Icon className="h-4 w-4" /></span></div><p className="mt-3 text-2xl font-extrabold text-slate-900">{item.value}</p></div>; })}</div>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-slate-100 p-4 sm:flex-row sm:items-center sm:justify-between"><div><h3 className="text-sm font-extrabold text-slate-900">Academic Workspace</h3><p className="mt-1 text-[11px] text-slate-500">{activeCount} active records · {totalCount} total records · {syllabusCompletion}% syllabus coverage marked complete</p></div><div className="relative w-full sm:max-w-xs"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search academic records..." className="w-full rounded-xl border border-slate-200 py-2.5 pl-9 pr-3 text-xs outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100" /></div></div>
        <div className="flex gap-1 overflow-x-auto border-b border-slate-100 px-3 pt-2">{tabs.map(item => { const Icon = item.icon; return <button key={item.id} onClick={() => { setTab(item.id); setQuery(''); setForm(null); setSessionForm(null); }} className={'inline-flex shrink-0 items-center gap-2 rounded-t-lg px-3 py-3 text-xs font-bold transition ' + (tab === item.id ? 'border-b-2 border-sky-800 bg-sky-50 text-sky-900' : 'text-slate-500 hover:bg-slate-50')}><Icon className="h-4 w-4" />{item.label}</button>; })}</div>

        <div className="space-y-4 p-4 sm:p-5">
          {tab === 'overview' && <>
            <div className="grid gap-3 lg:grid-cols-3">
              <div className="rounded-xl border border-slate-200 p-4"><div className="flex items-center gap-2 text-xs font-bold text-slate-800"><CalendarDays className="h-4 w-4 text-sky-800" />Academic Session</div><p className="mt-2 text-lg font-extrabold text-slate-900">{activeSession?.year || 'Not selected'}</p><p className="text-[10px] text-slate-500">{activeSession?.board} · {activeSession?.medium}</p></div>
              <div className="rounded-xl border border-slate-200 p-4"><div className="flex items-center gap-2 text-xs font-bold text-slate-800"><BookOpenCheck className="h-4 w-4 text-sky-800" />Syllabus Completion</div><p className="mt-2 text-lg font-extrabold text-slate-900">{syllabusCompletion}%</p><div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-sky-700" style={{ width: syllabusCompletion + '%' }} /></div></div>
              <div className="rounded-xl border border-slate-200 p-4"><div className="flex items-center gap-2 text-xs font-bold text-slate-800"><ClipboardCheck className="h-4 w-4 text-sky-800" />Linked Assessments</div><p className="mt-2 text-lg font-extrabold text-slate-900">{data.chapters.reduce((sum,x) => sum + x.tests.length,0)}</p><p className="text-[10px] text-slate-500">Local test mapping references</p></div>
            </div>
            <div className="rounded-xl border border-sky-100 bg-sky-50 p-4"><div className="flex items-center gap-2 text-xs font-extrabold text-sky-900"><Sparkles className="h-4 w-4" />Smart Academic Hierarchy</div><p className="mt-1 text-xs leading-5 text-sky-900/80">Session → Class → Course → Subject → Unit → Chapter → Topics & Learning Outcomes. Class, subject और chapter relationships editable local drafts में जुड़ी हुई हैं।</p></div>
            <div className="grid gap-3 sm:grid-cols-2">{tabs.filter(x => x.id !== 'overview').map(item => { const Icon = item.icon; return <button key={item.id} onClick={() => setTab(item.id)} className="flex items-center gap-3 rounded-xl border border-slate-200 p-4 text-left hover:border-sky-200 hover:bg-sky-50/50"><span className="grid h-10 w-10 place-items-center rounded-xl bg-slate-100 text-slate-700"><Icon className="h-5 w-5" /></span><span className="min-w-0 flex-1"><b className="block text-sm text-slate-800">{item.label}</b><span className="text-[11px] text-slate-500">{item.hi}</span></span><ChevronRight className="h-4 w-4 text-slate-400" /></button>; })}</div>
            <p className="text-[11px] leading-5 text-slate-500">यह workspace source code से bundled class/subject/chapter data लेकर local copy बनाता है। कोई existing route, test, study material या student progress update नहीं होता।</p>
          </>}

          {tab === 'sessions' && <>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><h4 className="text-sm font-extrabold text-slate-900">Academic Sessions</h4><p className="mt-1 text-[11px] text-slate-500">Session, Board, Medium और academic year चुनें।</p></div><button onClick={openNewSession} className="inline-flex items-center gap-2 rounded-xl bg-sky-900 px-3 py-2.5 text-xs font-bold text-white"><Plus className="h-4 w-4" />Add Session</button></div>
            {sessionForm && <div className="grid gap-3 rounded-xl border border-sky-200 bg-sky-50/50 p-4 sm:grid-cols-2">{field('Session Name',sessionForm.name,v=>setSessionForm({ ...sessionForm,name:v }))}{field('Academic Year',sessionForm.year,v=>setSessionForm({ ...sessionForm,year:v }))}<label className="block"><span className="mb-1 block text-[11px] font-bold text-slate-700">Board</span><select value={sessionForm.board} onChange={e=>setSessionForm({ ...sessionForm,board:e.target.value })} className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-xs"><option>HBSE</option><option>CBSE</option><option>Other</option></select></label><label className="block"><span className="mb-1 block text-[11px] font-bold text-slate-700">Medium</span><select value={sessionForm.medium} onChange={e=>setSessionForm({ ...sessionForm,medium:e.target.value })} className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-xs"><option>Bilingual</option><option>Hindi</option><option>English</option></select></label><label className="block"><span className="mb-1 block text-[11px] font-bold text-slate-700">Status</span><select value={sessionForm.status} onChange={e=>setSessionForm({ ...sessionForm,status:e.target.value })} className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-xs"><option value="draft">Draft</option><option value="active">Active</option><option value="archived">Archived</option></select></label><div className="flex items-end justify-end gap-2"><button onClick={()=>setSessionForm(null)} className="rounded-lg border bg-white px-3 py-2 text-xs">Cancel</button><button onClick={saveSession} className="rounded-lg bg-sky-900 px-3 py-2 text-xs font-bold text-white">Save Session Draft</button></div></div>}
            <div className="grid gap-3 md:grid-cols-2">{data.sessions.map(s => <div key={s.id} className="rounded-xl border border-slate-200 p-4"><div className="flex items-start justify-between gap-2"><div><p className="text-sm font-extrabold text-slate-900">{s.name}</p><p className="mt-1 text-xs text-slate-500">{s.year} · {s.board} · {s.medium}</p></div><span className="rounded-full bg-slate-100 px-2 py-1 text-[10px]">{statusText[s.status]}</span></div><div className="mt-3 flex flex-wrap gap-2"><button onClick={()=>setData({ ...data,selectedSessionId:s.id })} className={'rounded-lg px-3 py-2 text-xs font-bold ' + (data.selectedSessionId===s.id ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-700')}>{data.selectedSessionId===s.id ? 'Selected' : 'Select Session'}</button><button onClick={()=>setSessionForm({ ...s })} className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold">Edit</button></div></div>)}</div>
          </>}

          {tab === 'classes' && <>
            <div className="flex flex-wrap items-center justify-between gap-2"><div><h4 className="text-sm font-extrabold text-slate-900">Classes & Courses</h4><p className="mt-1 text-[11px] text-slate-500">Classes और learning pathways के records।</p></div><div className="flex gap-2"><button onClick={()=>openNew('classes')} className="rounded-lg bg-sky-900 px-3 py-2 text-xs font-bold text-white"><Plus className="mr-1 inline h-3.5 w-3.5" />Add Class</button><button onClick={()=>openNew('courses')} className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700"><Plus className="mr-1 inline h-3.5 w-3.5" />Add Course</button></div></div>
            {recordEditor}
            <div className="grid gap-2 lg:grid-cols-2">{filteredClasses.map(x=><div key={x.id} className="flex items-center gap-3 rounded-xl border border-slate-200 p-3"><BookOpen className="h-5 w-5 text-sky-800"/><div className="min-w-0 flex-1"><b className="text-sm text-slate-900">Class {x.level}</b><p className="text-xs text-slate-600">{x.titleEn}</p><p className="text-[10px] text-slate-500">{x.titleHi} · {statusText[x.status]}</p></div><button onClick={()=>openEdit('classes',x.id)} className="rounded-lg border p-2"><Pencil className="h-3.5 w-3.5"/></button><button onClick={()=>archiveRecord('classes',x.id)} className="rounded-lg border p-2 text-slate-500"><Archive className="h-3.5 w-3.5"/></button></div>)}</div>
            <h4 className="pt-3 text-sm font-extrabold text-slate-900">Courses / Learning Pathways</h4>
            <div className="grid gap-2 lg:grid-cols-2">{filteredCourses.map(x=><div key={x.id} className="rounded-xl border border-slate-200 p-3"><div className="flex items-center justify-between gap-2"><b className="text-sm text-slate-900">{x.titleEn}</b><button onClick={()=>openEdit('courses',x.id)} className="rounded-lg border p-2"><Pencil className="h-3.5 w-3.5"/></button></div><p className="text-xs text-slate-500">{x.titleHi}</p><p className="mt-1 text-[10px] text-slate-400">Classes: {x.classLevels.join(', ')}</p></div>)}</div>
          </>}

          {tab === 'subjects' && <>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><h4 className="text-sm font-extrabold text-slate-900">Class-wise Subjects</h4><p className="mt-1 text-[11px] text-slate-500">Subject को Class और Course दोनों से link करें।</p></div><button onClick={()=>openNew('subjects')} className="rounded-lg bg-sky-900 px-3 py-2 text-xs font-bold text-white"><Plus className="mr-1 inline h-3.5 w-3.5"/>Add Subject</button></div>
            {recordEditor}
            <div className="flex flex-wrap gap-2"><label className="text-xs font-bold text-slate-600">Class <select value={filterClass} onChange={e=>setFilterClass(e.target.value)} className="ml-2 rounded-lg border px-3 py-2"><option value="all">All</option>{data.classes.map(x=><option key={x.id} value={x.level}>{x.level}</option>)}</select></label></div>
            <div className="grid gap-2 sm:grid-cols-2">{filteredSubjects.map(x=><div key={x.id} className="flex items-center gap-2 rounded-xl border border-slate-200 p-3"><BookMarked className="h-4 w-4 text-emerald-800"/><div className="min-w-0 flex-1"><b className="text-xs text-slate-800">Class {x.classLevel} · {x.titleEn}</b><p className="text-[10px] text-slate-500">{x.titleHi} · {data.courses.find(c=>c.id===x.courseId)?.titleEn || 'Course not mapped'}</p></div><button onClick={()=>openEdit('subjects',x.id)} className="rounded-lg border p-2"><Pencil className="h-3.5 w-3.5"/></button><button onClick={()=>archiveRecord('subjects',x.id)} className="rounded-lg border p-2"><Archive className="h-3.5 w-3.5"/></button></div>)}</div>
          </>}

          {tab === 'chapters' && <>
            <div className="flex flex-wrap items-center justify-between gap-2"><div><h4 className="text-sm font-extrabold text-slate-900">Chapters & Syllabus</h4><p className="mt-1 text-[11px] text-slate-500">Unit, Topics, Learning Outcomes, Weightage और Teaching Periods manage करें।</p></div><button onClick={()=>openNew('chapters')} className="rounded-lg bg-sky-900 px-3 py-2 text-xs font-bold text-white"><Plus className="mr-1 inline h-3.5 w-3.5"/>Add Chapter</button></div>
            {recordEditor}
            <div className="flex flex-wrap gap-2"><label className="text-xs font-bold text-slate-600">Class <select value={filterClass} onChange={e=>setFilterClass(e.target.value)} className="ml-2 rounded-lg border px-3 py-2"><option value="all">All</option>{data.classes.map(x=><option key={x.id} value={x.level}>{x.level}</option>)}</select></label></div>
            <div className="space-y-2">{chapterList(filteredChapters)}</div>
          </>}

          {tab === 'mapping' && <>
            <div><h4 className="text-sm font-extrabold text-slate-900">Study Material & Test Mapping</h4><p className="mt-1 text-[11px] leading-5 text-slate-500">Chapter से PPT/PDF/Video/Notes और Online Tests का reference जोड़ें। यह अभी metadata-only local draft है; secure file permissions और वास्तविक Test IDs backend integration के बाद जुड़ेंगे।</p></div>
            <label className="block max-w-lg"><span className="mb-1 block text-[11px] font-bold text-slate-700">Select Chapter</span><select value={selectedChapterId || mappingChapter?.id || ''} onChange={e=>setSelectedChapterId(e.target.value)} className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-xs">{data.chapters.filter(x=>x.status!=='archived').map(x=><option key={x.id} value={x.id}>Class {x.classLevel} · {x.subject} · Ch {x.number}: {x.titleEn}</option>)}</select></label>
            {mappingChapter && <div className="grid gap-4 xl:grid-cols-2">
              <div className="space-y-3 rounded-xl border border-slate-200 p-4"><div className="flex items-center justify-between"><h5 className="text-xs font-extrabold text-slate-900">Materials ({mappingChapter.materials.length})</h5><button onClick={()=>{setLinkForm({chapterId:mappingChapter.id,title:'',format:'PPT',resourceRef:'',access:'Registered',status:'draft'});setMessage('');}} className="rounded-lg bg-sky-900 px-3 py-2 text-[11px] font-bold text-white"><Plus className="mr-1 inline h-3 w-3"/>Add Material</button></div>
                {linkForm?.chapterId===mappingChapter.id && <div className="space-y-2 rounded-lg bg-sky-50 p-3">{field('Material title',linkForm.title,v=>setLinkForm({ ...linkForm,title:v }))}<div className="grid grid-cols-2 gap-2"><label className="text-[10px] font-bold">Format<select value={linkForm.format} onChange={e=>setLinkForm({ ...linkForm,format:e.target.value })} className="mt-1 w-full rounded-lg border bg-white p-2"><option>PPT</option><option>PDF</option><option>Video</option><option>Notes</option><option>Other</option></select></label><label className="text-[10px] font-bold">Access<select value={linkForm.access} onChange={e=>setLinkForm({ ...linkForm,access:e.target.value })} className="mt-1 w-full rounded-lg border bg-white p-2"><option>Free</option><option>Registered</option></select></label></div>{field('File / Drive Reference (metadata only)',linkForm.resourceRef,v=>setLinkForm({ ...linkForm,resourceRef:v }))}<div className="flex justify-end gap-2"><button onClick={()=>setLinkForm(null)} className="rounded-lg border bg-white px-3 py-2 text-xs">Cancel</button><button onClick={addMaterialLink} className="rounded-lg bg-sky-900 px-3 py-2 text-xs font-bold text-white">Add Link Draft</button></div></div>}
                {mappingChapter.materials.length===0 && <p className="rounded-lg border border-dashed p-4 text-center text-xs text-slate-400">No material mappings in this draft.</p>}
                {mappingChapter.materials.map(x=><div key={x.id} className="flex items-center gap-2 rounded-lg border p-3"><FileText className="h-4 w-4 text-sky-800"/><div className="min-w-0 flex-1"><b className="block text-xs text-slate-800">{x.title}</b><span className="text-[10px] text-slate-500">{x.format} · {x.access} · {x.resourceRef}</span></div><button onClick={()=>removeMaterial(mappingChapter,x.id)} className="text-[10px] text-rose-600">Remove</button></div>)}
              </div>
              <div className="space-y-3 rounded-xl border border-slate-200 p-4"><div className="flex items-center justify-between"><h5 className="text-xs font-extrabold text-slate-900">Tests ({mappingChapter.tests.length})</h5><button onClick={()=>{setTestForm({chapterId:mappingChapter.id,title:'',testRef:'',testType:'Practice',status:'draft'});setMessage('');}} className="rounded-lg bg-sky-900 px-3 py-2 text-[11px] font-bold text-white"><Plus className="mr-1 inline h-3 w-3"/>Map Test</button></div>
                {testForm?.chapterId===mappingChapter.id && <div className="space-y-2 rounded-lg bg-sky-50 p-3">{field('Test title',testForm.title,v=>setTestForm({ ...testForm,title:v }))}{field('Test ID / Reference (metadata only)',testForm.testRef,v=>setTestForm({ ...testForm,testRef:v }))}<label className="text-[10px] font-bold">Test type<select value={testForm.testType} onChange={e=>setTestForm({ ...testForm,testType:e.target.value })} className="mt-1 w-full rounded-lg border bg-white p-2"><option>Practice</option><option>Chapter Test</option><option>Mock Test</option><option>Board Test</option></select></label><div className="flex justify-end gap-2"><button onClick={()=>setTestForm(null)} className="rounded-lg border bg-white px-3 py-2 text-xs">Cancel</button><button onClick={addTestLink} className="rounded-lg bg-sky-900 px-3 py-2 text-xs font-bold text-white">Save Test Mapping</button></div></div>}
                {mappingChapter.tests.length===0 && <p className="rounded-lg border border-dashed p-4 text-center text-xs text-slate-400">No test mappings in this draft.</p>}
                {mappingChapter.tests.map(x=><div key={x.id} className="flex items-center gap-2 rounded-lg border p-3"><ClipboardCheck className="h-4 w-4 text-emerald-800"/><div className="min-w-0 flex-1"><b className="block text-xs text-slate-800">{x.title}</b><span className="text-[10px] text-slate-500">{x.testType} · {x.testRef}</span></div><button onClick={()=>removeTest(mappingChapter,x.id)} className="text-[10px] text-rose-600">Remove</button></div>)}
              </div>
            </div>}
          </>}

          {tab === 'import-export' && <>
            <div><h4 className="text-sm font-extrabold text-slate-900">Bulk Import / Export</h4><p className="mt-1 text-xs leading-5 text-slate-500">CSV file से records import या export करें। Import records केवल Draft status में जोड़े जाते हैं; कोई existing record overwrite नहीं होता।</p></div>
            <div className="grid gap-3 md:grid-cols-2"><div className="rounded-xl border border-slate-200 p-4"><div className="flex items-center gap-2 text-xs font-extrabold text-slate-800"><Download className="h-4 w-4 text-sky-800"/>Export CSV</div><p className="mt-1 text-[11px] text-slate-500">चुने गए data type का CSV डाउनलोड करें।</p><label className="mt-3 block text-[11px] font-bold text-slate-700">Data Type<select value={dataset} onChange={e=>setDataset(e.target.value as Dataset)} className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-xs"><option value="sessions">Sessions</option><option value="classes">Classes</option><option value="courses">Courses</option><option value="subjects">Subjects</option><option value="chapters">Chapters & Syllabus</option></select></label><button onClick={exportCsv} className="mt-3 inline-flex items-center gap-2 rounded-lg bg-sky-900 px-3 py-2.5 text-xs font-bold text-white"><Download className="h-3.5 w-3.5"/>Download CSV</button></div>
              <div className="rounded-xl border border-slate-200 p-4"><div className="flex items-center gap-2 text-xs font-extrabold text-slate-800"><Upload className="h-4 w-4 text-sky-800"/>Import CSV</div><p className="mt-1 text-[11px] text-slate-500">Exported column headers उपयोग करें। Duplicates या invalid rows skip होंगी।</p><label className="mt-3 block text-[11px] font-bold text-slate-700">Upload CSV<input type="file" accept=".csv,text/csv" onChange={e=>importCsv(e.target.files?.[0])} className="mt-2 block w-full text-xs file:mr-3 file:rounded-lg file:border-0 file:bg-sky-50 file:px-3 file:py-2 file:text-xs file:font-bold file:text-sky-900"/></label>{importSummary && <p className="mt-3 rounded-lg bg-sky-50 p-3 text-xs text-sky-900">{importSummary}</p>}</div></div>
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-[11px] leading-5 text-amber-900">Excel में CSV format (UTF-8) खुलता है। Import/export इस browser के local draft workspace के लिए है; यह live academic catalogue को update नहीं करता।</div>
          </>}

          {tab === 'history' && <>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between"><div><h4 className="text-sm font-extrabold text-slate-900">Draft, Approval & Version History</h4><p className="mt-1 text-[11px] leading-5 text-slate-500">Local snapshots, restore और approval-state preview।</p></div><button onClick={submitForReview} className="inline-flex items-center gap-2 rounded-lg border border-sky-200 bg-sky-50 px-3 py-2 text-xs font-bold text-sky-900"><ShieldCheck className="h-4 w-4"/>Submit for Approval (Preview)</button></div>
            <div className="rounded-xl border border-slate-200 p-4"><div className="flex items-center justify-between gap-2"><b className="text-xs text-slate-800">Current workflow state</b><span className="rounded-full bg-amber-100 px-2.5 py-1 text-[10px] font-bold text-amber-900">{data.reviewState==='pending-review'?'Pending Approval · Local':'Draft · Local'}</span></div><p className="mt-2 text-[11px] leading-5 text-slate-500">Approval submit अभी केवल local status बदलता है। वास्तविक Super Admin approval, publish या website content replacement active नहीं है।</p><button disabled title="Backend approval workflow is not connected" className="mt-3 cursor-not-allowed rounded-lg bg-slate-200 px-3 py-2 text-xs font-bold text-slate-500"><Eye className="mr-1 inline h-3.5 w-3.5"/>Publish (Locked)</button></div>
            <div className="flex items-center justify-between"><h5 className="text-xs font-extrabold text-slate-800">Version History ({data.versions.length})</h5><button onClick={()=>setShowHistory(!showHistory)} className="text-xs font-semibold text-sky-900">{showHistory?'Hide':'Show'}</button></div>
            {showHistory && data.versions.length===0 && <p className="rounded-xl border border-dashed border-slate-300 p-6 text-center text-xs text-slate-500">No saved versions yet. Use Save Draft to create the first snapshot.</p>}
            {showHistory && data.versions.map(v=><div key={v.id} className="flex flex-col gap-3 rounded-xl border border-slate-200 p-4 sm:flex-row sm:items-center"><History className="h-5 w-5 text-sky-800"/><div className="min-w-0 flex-1"><b className="text-xs text-slate-900">{v.label}</b><p className="text-[10px] text-slate-500">{new Date(v.createdAt).toLocaleString()} · {v.summary}</p></div><button onClick={()=>restoreVersion(v)} className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold">Restore Version</button></div>)}
          </>}
        </div>
      </section>
      {message && <p role="status" className="rounded-xl border border-sky-100 bg-sky-50 px-4 py-3 text-xs leading-5 text-sky-900">{message}</p>}
      {draftSaved && <p className="inline-flex items-center gap-2 text-[10px] font-semibold text-emerald-700"><CheckCircle2 className="h-3.5 w-3.5"/>Local browser draft saved.</p>}
    </div>
  );
};
