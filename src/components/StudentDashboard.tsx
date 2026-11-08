import React, { useEffect, useState } from 'react';
import { BookOpen, ClipboardCheck, RefreshCw, UserRound } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { getMyTestAttempts, getPublishedTests, type TestAttempt, type PublishedTest } from '../services/testService';

export const StudentDashboard: React.FC = () => {
  const { profile, profileLoading, refreshProfile } = useAuth();
  const [attempts, setAttempts] = useState<TestAttempt[]>([]);
  const [tests, setTests] = useState<PublishedTest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadDashboard = async () => {
    setLoading(true);
    setError('');
    try {
      const [history, catalogue] = await Promise.all([getMyTestAttempts(), getPublishedTests()]);
      setAttempts(history);
      setTests(catalogue);
      await refreshProfile();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'डैशबोर्ड डेटा लोड नहीं हो सका।');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void loadDashboard(); }, []);

  const completed = attempts.filter((attempt) => attempt.status === 'submitted');
  const inProgress = attempts.filter((attempt) => attempt.status === 'in_progress');
  // Match the dashboard count to the same class-level catalogue shown in the test portal.
  const availableTests = profile
    ? tests.filter((test) => test.class_level === String(profile.class_level))
    : [];

  return (
    <section className="space-y-4" aria-label="Student dashboard">
      <div className="rounded-xl bg-sky-50 p-4">
        <div className="flex items-center gap-2 text-sky-950"><UserRound className="h-5 w-5" /><h3 className="font-bold">विद्यार्थी डैशबोर्ड</h3></div>
        {profileLoading ? <p className="mt-2 text-sm text-slate-600">प्रोफाइल लोड हो रही है…</p> : profile ? (
          <div className="mt-2 text-sm text-slate-700">
            <p className="font-semibold">{profile.student_name}</p>
            <p>कक्षा {profile.class_level} · रोल नंबर {profile.roll_no}</p>
            <p>{profile.school_name}</p>
          </div>
        ) : <p className="mt-2 text-sm text-amber-800">विद्यार्थी प्रोफाइल उपलब्ध नहीं है। विद्यालय/प्रोफाइल विवरण की जाँच आवश्यक है।</p>}
      </div>

      <div className="grid grid-cols-3 gap-2">
        <div className="rounded-lg border border-slate-200 p-3 text-center"><BookOpen className="mx-auto mb-1 h-5 w-5 text-sky-800" /><strong className="block text-xl">{availableTests.length}</strong><span className="text-[11px] text-slate-500">उपलब्ध टेस्ट</span></div>
        <div className="rounded-lg border border-slate-200 p-3 text-center"><ClipboardCheck className="mx-auto mb-1 h-5 w-5 text-emerald-700" /><strong className="block text-xl">{completed.length}</strong><span className="text-[11px] text-slate-500">पूर्ण टेस्ट</span></div>
        <div className="rounded-lg border border-slate-200 p-3 text-center"><RefreshCw className="mx-auto mb-1 h-5 w-5 text-amber-700" /><strong className="block text-xl">{inProgress.length}</strong><span className="text-[11px] text-slate-500">जारी टेस्ट</span></div>
      </div>

      <div className="flex items-center justify-between"><h4 className="font-bold text-slate-900">मेरे टेस्ट परिणाम</h4><button type="button" onClick={() => void loadDashboard()} disabled={loading} className="text-xs font-semibold text-sky-800 disabled:opacity-50">{loading ? 'लोड हो रहा है…' : 'रिफ्रेश करें'}</button></div>
      {error && <p role="alert" className="rounded-lg bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}
      {loading ? <p className="text-sm text-slate-500">टेस्ट रिकॉर्ड लोड हो रहे हैं…</p> : attempts.length === 0 ? <p className="rounded-lg bg-slate-50 p-3 text-sm text-slate-600">अभी कोई टेस्ट प्रयास उपलब्ध नहीं है।</p> : (
        <div className="max-h-56 space-y-2 overflow-y-auto">
          {attempts.map((attempt) => (
            <div key={attempt.id} className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 p-3 text-sm">
              <div><p className="font-semibold text-slate-800">{tests.find((test) => test.id === attempt.test_id)?.title.hi || attempt.test_id}</p><p className="text-xs text-slate-500">{new Date(attempt.started_at).toLocaleDateString('hi-IN')} · प्रयास {attempt.attempt_number}</p></div>
              <div className="shrink-0 text-right"><p className="font-bold text-slate-900">{attempt.status === 'submitted' ? `${attempt.score ?? 0}/${attempt.total_marks ?? 0}` : attempt.status === 'in_progress' ? 'जारी' : 'समाप्त'}</p><p className="text-[11px] text-slate-500">{attempt.status === 'submitted' ? `${attempt.percentage ?? 0}%` : attempt.status === 'in_progress' ? 'अधूरा प्रयास' : 'समय समाप्त'}</p></div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
};
