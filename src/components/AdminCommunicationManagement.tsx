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

const localizedText = (value: unknown): Localized => {
  if (value && typeof value === 'object') {
    const item = value as Record<string, unknown>;
    return { en: typeof item.en === 'string' ? item.en : '', hi: typeof item.hi === 'string' ? item.hi : '' };
  }
  return { en: typeof value === 'string' ? value : '', hi: '' };
};

export const AdminCommunicationManagement: React.FC = () => {
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

  const table = tab === 'notices' ? 'site_notices' : 'admin_content_items';

  const loadRows = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const client = requireSupabase();
      const query = tab === 'notices'
        ? client.from('site_notices').select('*').order('display_order', { ascending: true }).order('created_at', { ascending: false })
        : client.from('admin_content_items').select('*').eq('section', tab).order('display_order', { ascending: true }).order('created_at', { ascending: false });
      const result = await query;
      if (result.error) throw result.error;
      setRows((result.data ?? []) as Row[]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'डेटा लोड नहीं हो सका।');
    } finally {
      setLoading(false);
    }
  }, [tab]);

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
        const noticePayload = { ...common, link: link.trim() || null, created_by: user?.id ?? null };
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
            en: optionsEn.split('\\n').map((value) => value.trim()).filter(Boolean),
            hi: optionsHi.split('\\n').map((value) => value.trim()).filter(Boolean),
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
          return <article key={row.id} className="flex flex-col gap-3 rounded-xl border border-slate-100 p-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><p className="truncate text-sm font-bold text-slate-800">{heading}</p><span className={`rounded-full px-2 py-1 text-[9px] font-extrabold ${row.is_published ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>{row.is_published ? 'PUBLISHED' : 'DRAFT'}</span></div><p className="mt-1 text-[11px] text-slate-500">{[row.class_level && 'Class '+row.class_level,row.subject,row.chapter,row.category].filter(Boolean).join(' · ') || 'Website announcement'}</p></div>
            <div className="flex shrink-0 flex-wrap gap-2"><button type="button" onClick={() => void togglePublish(row)} className="rounded-lg border border-slate-200 px-3 py-2 text-[10px] font-bold text-slate-600">{row.is_published ? 'Unpublish' : 'Publish'}</button><button type="button" onClick={() => editRow(row)} className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-2 text-[10px] font-bold text-slate-600"><Edit3 className="h-3 w-3"/>Edit</button><button type="button" onClick={() => void deleteRow(row)} className="inline-flex items-center gap-1 rounded-lg border border-rose-100 px-3 py-2 text-[10px] font-bold text-rose-600"><Trash2 className="h-3 w-3"/>Delete</button></div>
          </article>;
        })}</div>}
      </section>
      <p className="text-[10px] leading-5 text-slate-400">नोट: प्रश्न बैंक फ़ीड वेबसाइट पर प्रकाशित सामग्री है; इसे Online Test में जोड़ने के लिए अलग Test Management प्रक्रिया आवश्यक है। File URL अभी external link है—Google Drive integration सक्रिय नहीं है।</p>
    </div>
  );
};
