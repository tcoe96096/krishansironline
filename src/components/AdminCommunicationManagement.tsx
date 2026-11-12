import React, { useCallback, useEffect, useState } from 'react';
import { requireSupabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { Bell, BookOpen, ClipboardList, Edit3, Loader2, RefreshCw, Save, Trash2, X } from 'lucide-react';

type Tab = 'notices' | 'materials' | 'questions';
type Row = Record<string, any> & { id: string };
type Localized = { en: string; hi: string };

const emptyLocalized = (): Localized => ({ en: '', hi: '' });
const inputClass = 'w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100';
const labelClass = 'mb-1.5 block text-xs font-bold text-slate-600';
const announcementTemplates = [
  { id: 'general', label: 'General Notice', category: 'Notice', title: { en: 'Important Website Announcement', hi: 'महत्वपूर्ण वेबसाइट सूचना' }, details: { en: 'Please read this important update from the website administration.', hi: 'कृपया वेबसाइट प्रशासन द्वारा जारी इस महत्वपूर्ण सूचना को पढ़ें।' } },
  { id: 'test', label: 'New Test Published', category: 'Test Update', title: { en: 'New Online Test Published', hi: 'नई ऑनलाइन टेस्ट प्रकाशित' }, details: { en: 'A new online test is now available. Visit the Tests section to participate.', hi: 'नई ऑनलाइन टेस्ट उपलब्ध है। भाग लेने के लिए टेस्ट सेक्शन में जाएँ।' } },
  { id: 'material', label: 'Study Material Added', category: 'Study Material', title: { en: 'New Study Material Available', hi: 'नई अध्ययन सामग्री उपलब्ध' }, details: { en: 'New study material has been added. Open Study Materials to view it.', hi: 'नई अध्ययन सामग्री जोड़ दी गई है। इसे देखने के लिए अध्ययन सामग्री सेक्शन खोलें।' } },
  { id: 'exam', label: 'Exam Update', category: 'Exam Update', title: { en: 'Important Exam Update', hi: 'महत्वपूर्ण परीक्षा सूचना' }, details: { en: 'Please check the latest examination update and follow the instructions.', hi: 'कृपया परीक्षा से संबंधित नवीनतम सूचना देखें और निर्देशों का पालन करें।' } },
  { id: 'event', label: 'School Event', category: 'Event', title: { en: 'Upcoming School Activity', hi: 'आगामी विद्यालय गतिविधि' }, details: { en: 'An upcoming school activity has been scheduled. Please check the details.', hi: 'विद्यालय की आगामी गतिविधि निर्धारित की गई है। कृपया विवरण देखें।' } },
];
const toDateTimeInput = (date: Date): string => {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 16);
};

const toLocalDateTimeInput = (value: unknown): string => {
  if (typeof value !== 'string' || !value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 16);
};

const localizedText = (value: unknown): Localized => {
  if (value && typeof value === 'object') {
    const item = value as Record<string, unknown>;
    return { en: typeof item.en === 'string' ? item.en : '', hi: typeof item.hi === 'string' ? item.hi : '' };
  }
  return { en: typeof value === 'string' ? value : '', hi: '' };
};

export const AdminCommunicationManagement: React.FC<{ demoMode?: boolean }> = ({ demoMode = false }) => {
  const { user } = useAuth();
  const [tab, setTab] = useState<Tab>('notices');
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [title, setTitle] = useState<Localized>(emptyLocalized);
  const [details, setDetails] = useState<Localized>(emptyLocalized);
  const [category, setCategory] = useState('Notice');
  const [link, setLink] = useState('');
  const [classLevel, setClassLevel] = useState('');
  const [subject, setSubject] = useState('');
  const [chapter, setChapter] = useState('');
  const [fileUrl, setFileUrl] = useState('');
  const [externalUrl, setExternalUrl] = useState('');
  const [question, setQuestion] = useState<Localized>(emptyLocalized);
  const [optionsEn, setOptionsEn] = useState('');
  const [optionsHi, setOptionsHi] = useState('');
  const [explanation, setExplanation] = useState<Localized>(emptyLocalized);
  const [published, setPublished] = useState(false);
  const [showOnHomepage, setShowOnHomepage] = useState(true);
  const [pinned, setPinned] = useState(false);
  const [displayOrder, setDisplayOrder] = useState('0');
  const [startsAt, setStartsAt] = useState('');
  const [expiresAt, setExpiresAt] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [schedulePreset, setSchedulePreset] = useState('now');
  const [expiryPreset, setExpiryPreset] = useState('never');

  const table = tab === 'notices' ? 'site_notices' : 'admin_content_items';

  const applyAnnouncementTemplate = (templateId: string) => {
    const template = announcementTemplates.find((item) => item.id === templateId);
    if (!template) return;
    setSelectedTemplate(templateId);
    setTitle(template.title);
    setDetails(template.details);
    setCategory(template.category);
  };

  const applySchedulePreset = (value: string) => {
    setSchedulePreset(value);
    if (value === 'now') setStartsAt('');
    else if (value === 'in1hour') setStartsAt(toDateTimeInput(new Date(Date.now() + 60 * 60 * 1000)));
    else if (value === 'tomorrow') {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(9, 0, 0, 0);
      setStartsAt(toDateTimeInput(tomorrow));
    }
  };

  const applyExpiryPreset = (value: string) => {
    setExpiryPreset(value);
    if (value === 'never') setExpiresAt('');
    else if (value === '1day') setExpiresAt(toDateTimeInput(new Date(Date.now() + 24 * 60 * 60 * 1000)));
    else if (value === '7days') setExpiresAt(toDateTimeInput(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)));
    else if (value === '30days') setExpiresAt(toDateTimeInput(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)));
  };

  const loadRows = useCallback(async () => {
    if (demoMode) { setRows([]); setLoading(false); return; }
    setLoading(true);
    setError('');
    try {
      const client = requireSupabase();
      const query = tab === 'notices'
        ? client.from('site_notices').select('*').order('is_pinned', { ascending: false }).order('display_order', { ascending: true }).order('created_at', { ascending: false })
        : client.from('admin_content_items').select('*').eq('section', tab).order('display_order', { ascending: true }).order('created_at', { ascending: false });
      const result = await query;
      if (result.error) throw result.error;
      setRows((result.data ?? []) as Row[]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'डेटा लोड नहीं हो सका।');
    } finally {
      setLoading(false);
    }
  }, [tab, demoMode]);

  useEffect(() => { void loadRows(); }, [loadRows]);

  const resetForm = () => {
    setEditingId(null);
    setTitle(emptyLocalized());
    setDetails(emptyLocalized());
    setCategory('Notice');
    setLink('');
    setClassLevel('');
    setSubject('');
    setChapter('');
    setFileUrl('');
    setExternalUrl('');
    setQuestion(emptyLocalized());
    setOptionsEn('');
    setOptionsHi('');
    setExplanation(emptyLocalized());
    setPublished(false);
    setShowOnHomepage(true);
    setPinned(false);
    setDisplayOrder('0');
    setStartsAt('');
    setExpiresAt('');
    setSelectedTemplate('');
    setSchedulePreset('now');
    setExpiryPreset('never');
    setError('');
    setMessage('');
  };

  const editRow = (row: Row) => {
    setEditingId(row.id);
    setTitle(localizedText(row.title));
    setDetails(localizedText(row.details));
    setCategory(row.category || 'Notice');
    setLink(row.link || '');
    setClassLevel(row.class_level || '');
    setSubject(row.subject || '');
    setChapter(row.chapter || '');
    setFileUrl(row.file_url || '');
    setExternalUrl(row.external_url || '');
    setQuestion(localizedText(row.question));
    const options = row.options && typeof row.options === 'object' ? row.options : {};
    setOptionsEn(Array.isArray(options.en) ? options.en.join('\n') : Array.isArray(options) ? options.join('\n') : '');
    setOptionsHi(Array.isArray(options.hi) ? options.hi.join('\n') : '');
    setExplanation(localizedText(row.explanation));
    setPublished(Boolean(row.is_published));
    setShowOnHomepage(row.show_on_homepage !== false);
    setPinned(Boolean(row.is_pinned));
    setDisplayOrder(String(row.display_order ?? 0));
    setStartsAt(toLocalDateTimeInput(row.starts_at));
    setExpiresAt(toLocalDateTimeInput(row.expires_at));
    setSelectedTemplate('');
    setSchedulePreset(row.starts_at ? 'custom' : 'now');
    setExpiryPreset(row.expires_at ? 'custom' : 'never');
    setMessage('');
    setError('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const saveRow = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    setMessage('');
    try {
      if (!title.en.trim() && !title.hi.trim() && tab !== 'questions') throw new Error('शीर्षक दर्ज करें।');
      if (tab === 'questions' && !question.en.trim() && !question.hi.trim()) throw new Error('प्रश्न दर्ज करें।');
      if (tab === 'notices' && startsAt && expiresAt && new Date(expiresAt).getTime() <= new Date(startsAt).getTime()) {
        throw new Error('समाप्ति समय, प्रकाशन शुरू होने के समय से बाद का होना चाहिए।');
      }
      const orderValue = Number(displayOrder || 0);
      if (tab === 'notices' && (!Number.isInteger(orderValue) || orderValue < 0)) throw new Error('Display Priority में 0 या उससे बड़ी पूर्ण संख्या दर्ज करें।');
      const now = new Date().toISOString();
      const common = {
        title: { en: title.en.trim(), hi: title.hi.trim() },
        details: { en: details.en.trim(), hi: details.hi.trim() },
        category: category.trim() || (tab === 'notices' ? 'Notice' : null),
        is_published: published,
        published_at: published ? now : null,
        updated_at: now,
      };
      const client = requireSupabase();
      if (tab === 'notices') {
        const noticePayload = {
          ...common,
          link: link.trim() || null,
          show_on_homepage: showOnHomepage,
          is_pinned: pinned,
          display_order: orderValue,
          starts_at: startsAt ? new Date(startsAt).toISOString() : null,
          expires_at: expiresAt ? new Date(expiresAt).toISOString() : null,
          created_by: user?.id ?? null,
        };
        const result = editingId
          ? await client.from('site_notices').update(noticePayload).eq('id', editingId)
          : await client.from('site_notices').insert(noticePayload);
        if (result.error) throw result.error;
      } else {
        const contentPayload = {
          ...common,
          section: tab,
          class_level: classLevel || null,
          subject: subject.trim() || null,
          chapter: chapter.trim() || null,
          file_url: tab === 'materials' ? fileUrl.trim() || null : null,
          external_url: externalUrl.trim() || null,
          question: tab === 'questions' ? { en: question.en.trim(), hi: question.hi.trim() } : null,
          options: tab === 'questions' ? {
            en: optionsEn.split(String.fromCharCode(10)).map((value) => value.trim()).filter(Boolean),
            hi: optionsHi.split(String.fromCharCode(10)).map((value) => value.trim()).filter(Boolean),
          } : null,
          explanation: tab === 'questions' ? { en: explanation.en.trim(), hi: explanation.hi.trim() } : null,
          created_by: user?.id ?? null,
        };
        const result = editingId
          ? await client.from('admin_content_items').update(contentPayload).eq('id', editingId)
          : await client.from('admin_content_items').insert(contentPayload);
        if (result.error) throw result.error;
      }
      resetForm();
      setMessage(published ? 'सामग्री सफलतापूर्वक प्रकाशित हुई।' : 'Draft सफलतापूर्वक सेव हुआ।');
      await loadRows();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'सेव नहीं हो सका।');
    } finally {
      setSaving(false);
    }
  };

  const togglePublish = async (row: Row) => {
    setError('');
    setMessage('');
    const next = !row.is_published;
    const result = await requireSupabase().from(table).update({
      is_published: next,
      published_at: next ? new Date().toISOString() : null,
      updated_at: new Date().toISOString(),
    }).eq('id', row.id);
    if (result.error) setError(result.error.message);
    else { setMessage(next ? 'प्रकाशित कर दिया गया।' : 'Unpublish कर दिया गया।'); await loadRows(); }
  };

  const toggleNoticeFlag = async (row: Row, field: 'show_on_homepage' | 'is_pinned') => {
    setError('');
    setMessage('');
    const current = field === 'show_on_homepage' ? row.show_on_homepage !== false : Boolean(row.is_pinned);
    const next = !current;
    const result = await requireSupabase().from('site_notices').update({
      [field]: next,
      updated_at: new Date().toISOString(),
    }).eq('id', row.id);
    if (result.error) setError(result.error.message);
    else {
      setMessage(field === 'show_on_homepage' ? (next ? 'Homepage पर दिखाना चालू किया गया।' : 'Homepage से छिपा दिया गया।') : (next ? 'सूचना सबसे ऊपर Pin कर दी गई।' : 'सूचना Unpin कर दी गई।'));
      await loadRows();
    }
  };

  const deleteRow = async (row: Row) => {
    if (!window.confirm('क्या आप इस रिकॉर्ड को स्थायी रूप से हटाना चाहते हैं?')) return;
    const result = await requireSupabase().from(table).delete().eq('id', row.id);
    if (result.error) setError(result.error.message);
    else { setMessage('रिकॉर्ड हटा दिया गया।'); if (editingId === row.id) resetForm(); await loadRows(); }
  };

  const tabs: { id: Tab; label: string; icon: React.ElementType }[] = [
    { id: 'notices', label: 'सूचनाएँ', icon: Bell },
    { id: 'materials', label: 'अध्ययन सामग्री', icon: BookOpen },
    { id: 'questions', label: 'प्रश्न बैंक फ़ीड', icon: ClipboardList },
  ];
  const isNotice = tab === 'notices';
  const isQuestion = tab === 'questions';

  if (demoMode) return <section className="rounded-2xl border border-slate-200 bg-white p-6"><h2 className="text-lg font-extrabold text-slate-900">Communication · Preview</h2><p className="mt-2 text-sm leading-6 text-slate-600">यह Demo Preview है। वास्तविक Database से कोई डेटा नहीं पढ़ा या बदला जाएगा। Supabase CRUD केवल अधिकृत Admin session में उपलब्ध है।</p><span className="mt-4 inline-flex rounded-full bg-amber-50 px-3 py-1 text-[10px] font-bold text-amber-800">Read-only demo</span></section>;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div><h2 className="text-lg font-extrabold text-slate-900">सूचनाएँ एवं सामग्री प्रबंधन</h2><p className="mt-1 text-xs text-slate-500">Supabase Database से सीधे Draft, Publish, Edit और Delete करें।</p></div>
        <button onClick={() => void loadRows()} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700"><RefreshCw className="h-4 w-4"/>Refresh</button>
      </div>
      <div className="flex flex-wrap gap-2">{tabs.map(({ id, label, icon: Icon }) => <button key={id} onClick={() => { resetForm(); setTab(id); }} className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold ${tab === id ? 'bg-sky-900 text-white' : 'border border-slate-200 bg-white text-slate-600'}`}><Icon className="h-4 w-4"/>{label}</button>)}</div>
      {(error || message) && <div role="status" className={`rounded-xl p-3 text-xs ${error ? 'bg-rose-50 text-rose-700' : 'bg-emerald-50 text-emerald-700'}`}>{error || message}</div>}

      <form onSubmit={saveRow} className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
        <div className="mb-4 flex items-center justify-between"><h3 className="font-extrabold text-slate-900">{editingId ? 'रिकॉर्ड संपादित करें' : 'नई सामग्री जोड़ें'}</h3>{editingId && <button type="button" onClick={resetForm} className="inline-flex items-center gap-1 text-xs font-bold text-slate-500"><X className="h-4 w-4"/>Cancel</button>}</div>
        {isNotice && <section className="mb-5 space-y-3 rounded-xl border border-sky-100 bg-sky-50/50 p-3">
          <div><p className="text-sm font-extrabold text-slate-900">Quick Start · Click to Use a Template</p><p className="mt-1 text-xs text-slate-500">किसी विकल्प पर क्लिक करें; Title, Description और Category अपने आप भर जाएँगे। बाद में आप इन्हें बदल भी सकते हैं।</p></div>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {announcementTemplates.map((template) => <button key={template.id} type="button" onClick={() => applyAnnouncementTemplate(template.id)} className={`rounded-xl border px-3 py-3 text-left text-xs font-bold transition ${selectedTemplate === template.id ? 'border-sky-700 bg-sky-900 text-white shadow-sm' : 'border-slate-200 bg-white text-slate-700 hover:border-sky-300 hover:bg-sky-50'}`}>{template.label}<span className={`mt-1 block text-[10px] font-medium ${selectedTemplate === template.id ? 'text-sky-100' : 'text-slate-400'}`}>Click to fill form</span></button>)}
          </div>
        </section>}
        <div className="grid gap-3 md:grid-cols-2">
          <label><span className={labelClass}>{isQuestion ? 'प्रश्न का शीर्षक (वैकल्पिक)' : 'शीर्षक · English'}</span><input className={inputClass} value={title.en} onChange={(e) => setTitle((v) => ({ ...v, en: e.target.value }))} placeholder="English title"/></label>
          <label><span className={labelClass}>{isQuestion ? 'प्रश्न का शीर्षक (वैकल्पिक)' : 'शीर्षक · हिन्दी'}</span><input className={inputClass} value={title.hi} onChange={(e) => setTitle((v) => ({ ...v, hi: e.target.value }))} placeholder="हिन्दी शीर्षक"/></label>
          {isQuestion ? <>
            <label className="md:col-span-2"><span className={labelClass}>प्रश्न · English</span><textarea className={inputClass} rows={2} value={question.en} onChange={(e) => setQuestion((v) => ({ ...v, en: e.target.value }))}/></label>
            <label className="md:col-span-2"><span className={labelClass}>प्रश्न · हिन्दी</span><textarea className={inputClass} rows={2} value={question.hi} onChange={(e) => setQuestion((v) => ({ ...v, hi: e.target.value }))}/></label>
            <label><span className={labelClass}>विकल्प English · प्रत्येक नई लाइन में</span><textarea className={inputClass} rows={4} value={optionsEn} onChange={(e) => setOptionsEn(e.target.value)} placeholder={'Option A\nOption B\nOption C\nOption D'}/></label>
            <label><span className={labelClass}>विकल्प हिन्दी · प्रत्येक नई लाइन में</span><textarea className={inputClass} rows={4} value={optionsHi} onChange={(e) => setOptionsHi(e.target.value)} placeholder={'विकल्प A\nविकल्प B\nविकल्प C\nविकल्प D'}/></label>
            <label><span className={labelClass}>व्याख्या English</span><textarea className={inputClass} rows={2} value={explanation.en} onChange={(e) => setExplanation((v) => ({ ...v, en: e.target.value }))}/></label>
            <label><span className={labelClass}>व्याख्या हिन्दी</span><textarea className={inputClass} rows={2} value={explanation.hi} onChange={(e) => setExplanation((v) => ({ ...v, hi: e.target.value }))}/></label>
          </> : <>
            <label className="md:col-span-2"><span className={labelClass}>विवरण · English</span><textarea className={inputClass} rows={2} value={details.en} onChange={(e) => setDetails((v) => ({ ...v, en: e.target.value }))}/></label>
            <label className="md:col-span-2"><span className={labelClass}>विवरण · हिन्दी</span><textarea className={inputClass} rows={2} value={details.hi} onChange={(e) => setDetails((v) => ({ ...v, hi: e.target.value }))}/></label>
          </>}
          <label><span className={labelClass}>Category</span><input className={inputClass} value={category} onChange={(e) => setCategory(e.target.value)} placeholder="Notice / PDF / Chapter"/></label>
          {!isNotice && <label><span className={labelClass}>कक्षा</span><select className={inputClass} value={classLevel} onChange={(e) => setClassLevel(e.target.value)}><option value="">सभी कक्षाएँ</option>{['6','7','8','9','10','11','12'].map((v) => <option key={v} value={v}>Class {v}</option>)}</select></label>}
          {!isNotice && <label><span className={labelClass}>विषय</span><input className={inputClass} value={subject} onChange={(e) => setSubject(e.target.value)}/></label>}
          {!isNotice && <label><span className={labelClass}>अध्याय</span><input className={inputClass} value={chapter} onChange={(e) => setChapter(e.target.value)}/></label>}
          {isNotice && <label className="md:col-span-2"><span className={labelClass}>Link (वैकल्पिक)</span><input className={inputClass} type="url" value={link} onChange={(e) => setLink(e.target.value)} placeholder="https://…"/></label>}
          {isNotice && <>
            <div className="md:col-span-2 rounded-xl border border-sky-100 bg-sky-50/70 p-3">
              <p className="text-xs font-extrabold text-sky-950">Homepage Display Controls</p>
              <p className="mt-1 text-[11px] leading-5 text-sky-800">यहाँ की सेटिंग से तय होगा कि सूचना Homepage पर कब और किस क्रम में दिखाई देगी।</p>
            </div>
            <div className="rounded-xl border border-slate-200 p-3"><p className={labelClass}>Homepage Visibility · Click to Select</p><div className="flex flex-wrap gap-2"><button type="button" onClick={() => setShowOnHomepage(true)} className={`rounded-lg px-3 py-2 text-xs font-bold ${showOnHomepage ? 'bg-emerald-600 text-white' : 'border border-slate-200 text-slate-600'}`}>Show on Homepage</button><button type="button" onClick={() => setShowOnHomepage(false)} className={`rounded-lg px-3 py-2 text-xs font-bold ${!showOnHomepage ? 'bg-slate-700 text-white' : 'border border-slate-200 text-slate-600'}`}>Hide from Homepage</button></div><label className="mt-3 flex items-center gap-2 text-xs text-slate-500"><input type="checkbox" checked={showOnHomepage} onChange={(e) => setShowOnHomepage(e.target.checked)} className="h-4 w-4 rounded border-slate-300" /> Keep checkbox control</label></div>
            <div className="rounded-xl border border-slate-200 p-3"><p className={labelClass}>Homepage Position · Click to Select</p><div className="flex flex-wrap gap-2"><button type="button" onClick={() => setPinned(true)} className={`rounded-lg px-3 py-2 text-xs font-bold ${pinned ? 'bg-amber-500 text-white' : 'border border-slate-200 text-slate-600'}`}>Pin to Top</button><button type="button" onClick={() => setPinned(false)} className={`rounded-lg px-3 py-2 text-xs font-bold ${!pinned ? 'bg-sky-900 text-white' : 'border border-slate-200 text-slate-600'}`}>Normal</button></div><label className="mt-3 flex items-center gap-2 text-xs text-slate-500"><input type="checkbox" checked={pinned} onChange={(e) => setPinned(e.target.checked)} className="h-4 w-4 rounded border-slate-300" /> Keep checkbox control</label></div>
            <div className="md:col-span-2 rounded-xl border border-slate-200 p-3"><p className={labelClass}>Display Priority · Quick Select</p><div className="flex flex-wrap gap-2">{[{value:'0',label:'0 · Highest'},{value:'1',label:'1 · High'},{value:'2',label:'2 · Normal'},{value:'3',label:'3 · Low'}].map((item) => <button key={item.value} type="button" onClick={() => setDisplayOrder(item.value)} className={`rounded-lg px-3 py-2 text-xs font-bold ${displayOrder === item.value ? 'bg-sky-900 text-white' : 'border border-slate-200 bg-white text-slate-600'}`}>{item.label}</button>)}</div></div>
            <label><span className={labelClass}>Display Priority (कम संख्या पहले)</span><input className={inputClass} type="number" min="0" step="1" value={displayOrder} onChange={(e) => setDisplayOrder(e.target.value)} /></label>
            <div><label><span className={labelClass}>Quick Schedule · Select an Option</span><select className={inputClass} value={schedulePreset} onChange={(e) => applySchedulePreset(e.target.value)}><option value="now">Publish Immediately</option><option value="in1hour">Start in 1 Hour</option><option value="tomorrow">Tomorrow · 9:00 AM</option><option value="custom">Custom Date & Time</option></select></label><label className="mt-2 block"><span className={labelClass}>Start Date & Time</span><input className={inputClass} type="datetime-local" value={startsAt} onChange={(e) => { setStartsAt(e.target.value); setSchedulePreset(e.target.value ? 'custom' : 'now'); }} /></label></div>
            <div><label><span className={labelClass}>Quick Expiry · Select an Option</span><select className={inputClass} value={expiryPreset} onChange={(e) => applyExpiryPreset(e.target.value)}><option value="never">No Automatic Expiry</option><option value="1day">Expire After 1 Day</option><option value="7days">Expire After 7 Days</option><option value="30days">Expire After 30 Days</option><option value="custom">Custom Date & Time</option></select></label><label className="mt-2 block"><span className={labelClass}>Expiry Date & Time</span><input className={inputClass} type="datetime-local" value={expiresAt} onChange={(e) => { setExpiresAt(e.target.value); setExpiryPreset(e.target.value ? 'custom' : 'never'); }} /></label></div>
          </>}
          {tab === 'materials' && <label className="md:col-span-2"><span className={labelClass}>File URL (PDF/PPT/Video)</span><input className={inputClass} type="url" value={fileUrl} onChange={(e) => setFileUrl(e.target.value)} placeholder="https://…"/></label>}
          {!isNotice && <label className="md:col-span-2"><span className={labelClass}>External URL (वैकल्पिक)</span><input className={inputClass} type="url" value={externalUrl} onChange={(e) => setExternalUrl(e.target.value)} placeholder="https://…"/></label>}
        </div>
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4">
          <label className="inline-flex items-center gap-2 text-xs font-semibold text-slate-600"><input type="checkbox" checked={published} onChange={(e) => setPublished(e.target.checked)} className="h-4 w-4 rounded border-slate-300"/>Save as Published</label>
          <button disabled={saving} className="inline-flex items-center gap-2 rounded-xl bg-sky-900 px-5 py-2.5 text-xs font-extrabold text-white disabled:opacity-60">{saving ? <Loader2 className="h-4 w-4 animate-spin"/> : <Save className="h-4 w-4"/>}{saving ? 'Saving…' : editingId ? 'Update Record' : 'Save Record'}</button>
        </div>
      </form>

      <section className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
        <div className="mb-4 flex items-center justify-between"><h3 className="font-extrabold text-slate-900">Saved Records <span className="text-xs font-semibold text-slate-400">({rows.length})</span></h3><span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Supabase</span></div>
        {loading ? <div className="flex items-center gap-2 py-8 text-sm text-slate-500"><Loader2 className="h-4 w-4 animate-spin"/>Loading…</div> : rows.length === 0 ? <p className="py-8 text-center text-sm text-slate-400">अभी कोई रिकॉर्ड नहीं है।</p> : <div className="space-y-2">{rows.map((row) => {
          const rowTitle = localizedText(row.title);
          const rowQuestion = localizedText(row.question);
          const heading = rowTitle.en || rowTitle.hi || rowQuestion.en || rowQuestion.hi || 'Untitled';
          const now = Date.now();
          const isExpired = Boolean(row.expires_at && new Date(row.expires_at).getTime() <= now);
          const isScheduled = Boolean(row.is_published && row.starts_at && new Date(row.starts_at).getTime() > now);
          const status = !row.is_published ? 'DRAFT' : isExpired ? 'EXPIRED' : isScheduled ? 'SCHEDULED' : 'PUBLISHED';
          const statusClass = status === 'PUBLISHED' ? 'bg-emerald-50 text-emerald-700' : status === 'SCHEDULED' ? 'bg-sky-50 text-sky-700' : status === 'EXPIRED' ? 'bg-slate-100 text-slate-600' : 'bg-amber-50 text-amber-700';
          return <article key={row.id} className="flex flex-col gap-3 rounded-xl border border-slate-100 p-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><p className="truncate text-sm font-bold text-slate-800">{heading}</p><span className={`rounded-full px-2 py-1 text-[9px] font-extrabold ${statusClass}`}>{status}</span>{row.is_pinned && <span className="rounded-full bg-amber-50 px-2 py-1 text-[9px] font-extrabold text-amber-700">PINNED</span>}</div><p className="mt-1 text-[11px] text-slate-500">{[row.class_level && 'Class '+row.class_level,row.subject,row.chapter,row.category,`Priority ${row.display_order ?? 0}`,row.show_on_homepage === false ? 'Homepage OFF' : 'Homepage ON'].filter(Boolean).join(' · ') || 'Website announcement'}</p></div>
            <div className="flex shrink-0 flex-wrap gap-2"><button type="button" onClick={() => void togglePublish(row)} className="rounded-lg border border-slate-200 px-3 py-2 text-[10px] font-bold text-slate-600">{row.is_published ? 'Unpublish' : 'Publish'}</button>{tab === 'notices' && <button type="button" onClick={() => void toggleNoticeFlag(row, 'show_on_homepage')} className="rounded-lg border border-sky-100 px-3 py-2 text-[10px] font-bold text-sky-800">{row.show_on_homepage === false ? 'Show on Home' : 'Hide from Home'}</button>}{tab === 'notices' && <button type="button" onClick={() => void toggleNoticeFlag(row, 'is_pinned')} className="rounded-lg border border-amber-100 px-3 py-2 text-[10px] font-bold text-amber-800">{row.is_pinned ? 'Unpin' : 'Pin to Top'}</button>}<button type="button" onClick={() => editRow(row)} className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-2 text-[10px] font-bold text-slate-600"><Edit3 className="h-3 w-3"/>Edit</button><button type="button" onClick={() => void deleteRow(row)} className="inline-flex items-center gap-1 rounded-lg border border-rose-100 px-3 py-2 text-[10px] font-bold text-rose-600"><Trash2 className="h-3 w-3"/>Delete</button></div>
          </article>;
        })}</div>}
      </section>
      <p className="text-[10px] leading-5 text-slate-400">नोट: प्रश्न बैंक फ़ीड वेबसाइट पर प्रकाशित सामग्री है; इसे Online Test में जोड़ने के लिए अलग Test Management प्रक्रिया आवश्यक है। File URL अभी external link है—Google Drive integration सक्रिय नहीं है।</p>
    </div>
  );
};
