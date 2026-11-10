import React, { useEffect, useMemo, useState } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import {
  getAdminTests,
  getAdminTestAttempts,
  getAdminStudentSummaries,
  updateAdminTestSettings,
  type AdminTestSummary,
  type AdminStudentSummary,
  type TestAttempt,
} from '../services/testService';
import { ShieldCheck, RefreshCw, Save, ClipboardList, Users, Award } from 'lucide-react';

type TestDraft = { attemptLimit: number; isPublished: boolean };

export const AdminDashboard: React.FC = () => {
  const { language } = useLanguage();
  const { isAdmin, adminLoading } = useAuth();
  const en = language === 'en';
  const [tests, setTests] = useState<AdminTestSummary[]>([]);
  const [attempts, setAttempts] = useState<TestAttempt[]>([]);
  const [students, setStudents] = useState<AdminStudentSummary[]>([]);
  const [drafts, setDrafts] = useState<Record<string, TestDraft>>({});
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const load = async () => {
    if (!isAdmin) return;
    setLoading(true);
    setError('');
    try {
      const [catalogue, history] = await Promise.all([getAdminTests(), getAdminTestAttempts()]);
      const profiles = await getAdminStudentSummaries(history.map((item) => item.student_id));
      setTests(catalogue);
      setAttempts(history);
      setStudents(profiles);
      setDrafts(Object.fromEntries(catalogue.map((test) => [test.id, {
        attemptLimit: test.attempt_limit,
        isPublished: test.is_published,
      }])));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Admin data could not be loaded.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, [isAdmin]);

  const publishedCount = tests.filter((test) => test.is_published).length;
  const submittedCount = attempts.filter((attempt) => attempt.status === 'submitted').length;
  const studentById = useMemo(() => new Map(students.map((student) => [student.user_id, student])), [students]);
  const testById = useMemo(() => new Map(tests.map((test) => [test.id, test])), [tests]);

  const saveSettings = async (test: AdminTestSummary) => {
    const draft = drafts[test.id];
    if (!draft) return;
    setSavingId(test.id);
    setError('');
    setNotice('');
    try {
      await updateAdminTestSettings(test.id, {
        attempt_limit: draft.attemptLimit,
        is_published: draft.isPublished,
      });
      setTests((current) => current.map((item) => item.id === test.id
        ? { ...item, attempt_limit: draft.attemptLimit, is_published: draft.isPublished }
        : item));
      setNotice(en ? 'Test settings saved.' : 'टेस्ट सेटिंग सुरक्षित हो गई।');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Test settings could not be saved.');
    } finally {
      setSavingId('');
    }
  };

  if (adminLoading) return <p className="rounded-xl bg-slate-50 p-4 text-sm text-slate-500">Admin access जाँचा जा रहा है…</p>;
  if (!isAdmin) return null;

  return (
    <section className="space-y-5 rounded-2xl border border-emerald-200 bg-white p-4 shadow-sm sm:p-6" aria-label="Admin test dashboard">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-emerald-800">
            <ShieldCheck className="h-4 w-4" /> {en ? 'Verified administrator' : 'सत्यापित एडमिन'}
          </div>
          <h3 className="mt-1 text-xl font-extrabold text-slate-900">{en ? 'Test Management' : 'टेस्ट प्रबंधन'}</h3>
          <p className="mt-1 text-xs text-slate-500">{en ? 'Manage publication and per-test attempt limits. Student records remain private.' : 'टेस्ट प्रकाशित करने और प्रत्येक टेस्ट की प्रयास सीमा नियंत्रित करने के लिए। विद्यार्थी रिकॉर्ड निजी रहेंगे।'}</p>
        </div>
        <button type="button" onClick={() => void load()} disabled={loading} className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50">
          <RefreshCw className="h-3.5 w-3.5" /> {en ? 'Refresh' : 'रिफ्रेश'}
        </button>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <div className="rounded-xl bg-sky-50 p-3 text-center"><ClipboardList className="mx-auto mb-1 h-4 w-4 text-sky-800" /><strong className="block text-xl">{tests.length}</strong><span className="text-[10px] text-slate-600">{en ? 'Tests' : 'कुल टेस्ट'}</span></div>
        <div className="rounded-xl bg-emerald-50 p-3 text-center"><ShieldCheck className="mx-auto mb-1 h-4 w-4 text-emerald-800" /><strong className="block text-xl">{publishedCount}</strong><span className="text-[10px] text-slate-600">{en ? 'Published' : 'प्रकाशित'}</span></div>
        <div className="rounded-xl bg-amber-50 p-3 text-center"><Award className="mx-auto mb-1 h-4 w-4 text-amber-800" /><strong className="block text-xl">{submittedCount}</strong><span className="text-[10px] text-slate-600">{en ? 'Submitted' : 'जमा प्रयास'}</span></div>
      </div>

      {error && <p role="alert" className="rounded-lg bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}
      {notice && <p role="status" className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800">{notice}</p>}

      <div>
        <h4 className="mb-3 font-bold text-slate-900">{en ? 'Published test catalogue' : 'टेस्ट सूची एवं प्रकाशन नियंत्रण'}</h4>
        {loading ? <p className="text-sm text-slate-500">{en ? 'Loading tests…' : 'टेस्ट लोड हो रहे हैं…'}</p> : tests.length === 0 ? (
          <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-800">{en ? 'No test records are present in this database yet. Add the approved question dataset before publishing.' : 'इस डेटाबेस में अभी टेस्ट रिकॉर्ड नहीं हैं। प्रकाशित करने से पहले स्वीकृत प्रश्न डेटा जोड़ें।'}</p>
        ) : (
          <div className="space-y-3">
            {tests.map((test) => {
              const draft = drafts[test.id] || { attemptLimit: test.attempt_limit, isPublished: test.is_published };
              return (
                <article key={test.id} className="rounded-xl border border-slate-200 p-3 sm:p-4">
                  <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <p className="font-bold text-slate-900">{en ? test.title.en : test.title.hi}</p>
                      <p className="mt-1 text-xs text-slate-500">Class {test.class_level} · {test.subject} · {test.question_count} {en ? 'questions' : 'प्रश्न'} · {test.total_marks} {en ? 'marks' : 'अंक'} · {test.duration_minutes} min</p>
                    </div>
                    <span className="text-[10px] font-semibold text-slate-400">{test.id}</span>
                  </div>
                  <div className="mt-3 flex flex-wrap items-end gap-3 border-t border-slate-100 pt-3">
                    <label className="flex flex-col gap-1 text-xs font-semibold text-slate-700">
                      {en ? 'Allowed attempts' : 'अनुमत प्रयास'}
                      <input type="number" min={1}  step={1} value={draft.attemptLimit}
                        onChange={(event) => setDrafts((current) => ({ ...current, [test.id]: { ...draft, attemptLimit: Number(event.target.value) } }))}
                        className="w-24 rounded-lg border border-slate-300 px-3 py-2 text-sm" />
                    </label>
                    <label className="inline-flex items-center gap-2 pb-2 text-xs font-semibold text-slate-700">
                      <input type="checkbox" checked={draft.isPublished}
                        onChange={(event) => setDrafts((current) => ({ ...current, [test.id]: { ...draft, isPublished: event.target.checked } }))}
                        className="h-4 w-4 rounded border-slate-300" />
                      {en ? 'Published' : 'विद्यार्थियों के लिए प्रकाशित'}
                    </label>
                    <button type="button" onClick={() => void saveSettings(test)} disabled={savingId === test.id || draft.attemptLimit < 1 || !Number.isInteger(draft.attemptLimit)}
                      className="ml-auto inline-flex items-center gap-2 rounded-lg bg-sky-900 px-4 py-2 text-xs font-bold text-white hover:bg-sky-800 disabled:opacity-50">
                      <Save className="h-3.5 w-3.5" /> {savingId === test.id ? (en ? 'Saving…' : 'सेव हो रहा है…') : (en ? 'Save settings' : 'सेटिंग सेव करें')}
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>

      <div>
        <div className="mb-3 flex items-center gap-2"><Users className="h-4 w-4 text-sky-800" /><h4 className="font-bold text-slate-900">{en ? 'Recent student attempts' : 'विद्यार्थियों के हाल के प्रयास'}</h4></div>
        {loading ? <p className="text-sm text-slate-500">{en ? 'Loading attempts…' : 'प्रयास लोड हो रहे हैं…'}</p> : attempts.length === 0 ? (
          <p className="rounded-lg bg-slate-50 p-3 text-sm text-slate-600">{en ? 'No attempts have been recorded.' : 'अभी कोई टेस्ट प्रयास दर्ज नहीं हुआ है।'}</p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="min-w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600"><tr><th className="px-3 py-2">{en ? 'Student' : 'विद्यार्थी'}</th><th className="px-3 py-2">{en ? 'Test' : 'टेस्ट'}</th><th className="px-3 py-2">{en ? 'Status' : 'स्थिति'}</th><th className="px-3 py-2">{en ? 'Score' : 'अंक'}</th></tr></thead>
              <tbody>
                {attempts.slice(0, 30).map((attempt) => {
                  const student = studentById.get(attempt.student_id);
                  const test = testById.get(attempt.test_id);
                  return <tr key={attempt.id} className="border-t border-slate-100">
                    <td className="px-3 py-2"><span className="font-semibold text-slate-800">{student?.student_name || '—'}</span><span className="block text-[10px] text-slate-500">{student ? `Class ${student.class_level} · Roll ${student.roll_no}` : ''}</span></td>
                    <td className="px-3 py-2 text-slate-700">{test ? (en ? test.title.en : test.title.hi) : attempt.test_id}</td>
                    <td className="px-3 py-2 text-slate-700">{attempt.status}</td>
                    <td className="px-3 py-2 font-bold text-slate-800">{attempt.status === 'submitted' ? `${attempt.score ?? 0}/${attempt.total_marks ?? 0}` : '—'}</td>
                  </tr>;
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
};
