import React, { useEffect, useState } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { getMyTestAttempts, getPublishedTests, type TestAttempt, type PublishedTest } from '../services/testService';
import { GraduationCap, ShieldCheck, Clock, RefreshCw, Award } from 'lucide-react';
import { isResumableAttempt } from '../services/testAttemptStatus';
import { publicHref } from '../data/publicInfo';
import { StudentResultPdfDownload } from './StudentResultPdfDownload';
import { getPublishedResultTemplate, isResultTemplateEnabled, type ResultTemplate } from '../services/resultTemplateService';

/**
 * Student results are private: this view reads only the signed-in user's
 * attempts. Public visitors never receive another student's result records.
 */
export const ResultsPortal: React.FC = () => {
  const { language } = useLanguage();
  const { user, profile } = useAuth();
  const isEnglish = language === 'en';
  const testFilter = new URLSearchParams(window.location.search).get('testId');
  const [attempts, setAttempts] = useState<TestAttempt[]>([]);
  const visibleAttempts = attempts.filter(row=>row.student_id===user?.id && (!testFilter || row.test_id===testFilter));
  const [tests, setTests] = useState<PublishedTest[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [resultTemplate, setResultTemplate] = useState<ResultTemplate | null>(null);
  useEffect(() => {
    let active = true;
    setResultTemplate(null);
    if (user?.id && isResultTemplateEnabled()) void getPublishedResultTemplate().then(value => { if (active) setResultTemplate(value); }).catch(() => { /* Optional styling: existing results remain available. */ });
    return () => { active = false; };
  }, [user?.id]);
  const templateStyle = resultTemplate?.theme === 'modern' ? 'border-sky-300 bg-sky-50/30' : resultTemplate?.theme === 'classic' ? 'border-amber-300 bg-amber-50/30' : 'border-slate-200 bg-white';
  const designText = (key: 'brandTitle' | 'tagline' | 'footerNote') => typeof resultTemplate?.options[key] === 'string' ? resultTemplate.options[key] : '';

  useEffect(() => {
    let active = true;
    if (!user) {
      setAttempts([]);
      setTests([]);
      setLoading(false);
      setError('');
      return;
    }

    setLoading(true);
    setAttempts([]);
    setTests([]);
    setError('');
    void Promise.all([getMyTestAttempts(), getPublishedTests()])
      .then(([history, catalogue]) => {
        if (!active) return;
        setAttempts(history.filter(row=>row.student_id===user.id));
        setTests(catalogue);
      })
      .catch((cause) => {
        if (active) setError(isEnglish?'Results could not be loaded. Please refresh.':'परिणाम लोड नहीं हो सके। कृपया रिफ्रेश करें।');
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => { active = false; };
  }, [user?.id]);

  const testTitle = (testId: string) => {
    const test = tests.find((item) => item.id === testId);
    return isEnglish ? (test?.title.en || testId) : (test?.title.hi || testId);
  };

  const formatDate = (value: string | null) => value
    ? new Date(value).toLocaleString(isEnglish ? 'en-IN' : 'hi-IN', { dateStyle: 'medium', timeStyle: 'short' })
    : (isEnglish ? 'Not submitted' : 'जमा नहीं हुआ');

  return (
    <section id="results" className="py-14 bg-white border-b border-slate-200/80">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-8">
          <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-sky-800 mb-2">
            <GraduationCap className="w-4 h-4 text-emerald-600" />
            <span>{isEnglish ? 'Student Results Portal' : 'विद्यार्थी परीक्षा परिणाम पोर्टल'}</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 font-display">
            {testFilter ? (isEnglish?'Test Result & Attempt History':'टेस्ट परिणाम एवं प्रयास इतिहास') : (isEnglish ? 'My Test Results' : 'मेरे टेस्ट परिणाम')}
          </h2>
          <p className="mt-2 text-sm sm:text-base text-slate-600">
            {isEnglish
              ? 'Your private test history and server-verified scores.'
              : 'आपकी निजी टेस्ट हिस्ट्री और सर्वर द्वारा सत्यापित परिणाम।'}
          </p>
        </div>

        {testFilter && <div className="mb-5 flex flex-wrap items-center justify-center gap-3 text-xs font-semibold text-sky-900"><a href={publicHref('online-tests')} className="rounded-lg border border-sky-200 px-3 py-2">{isEnglish?'Back to tests':'टेस्ट पर वापस जाएँ'}</a><a href={publicHref('results')} className="underline">{isEnglish?'View all results':'सभी परिणाम देखें'}</a></div>}
        {!user ? (
          <div className="max-w-2xl mx-auto rounded-2xl border border-sky-200 bg-sky-50/70 p-6 sm:p-8 text-center">
            <ShieldCheck className="w-8 h-8 text-sky-800 mx-auto mb-3" />
            <h3 className="text-lg font-bold text-slate-900 mb-2">
              {isEnglish ? 'Sign in to view your results' : 'अपने परिणाम देखने के लिए लॉगिन करें'}
            </h3>
            <p className="text-sm text-slate-700">
              {isEnglish
                ? 'Use Student Login in the header. Only your own results will be shown here.'
                : 'वेबसाइट के Student Login से लॉगिन करें। यहाँ केवल आपके अपने परिणाम दिखाई देंगे।'}
            </p>
          </div>
        ) : (
          <div className="max-w-3xl mx-auto">
            <div className="mb-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 rounded-xl border border-slate-200 bg-slate-50 p-4">
              <div>
                <p className="font-bold text-slate-900">{profile?.student_name || (isEnglish ? 'Student account' : 'विद्यार्थी खाता')}</p>
                {profile && <p className="text-xs text-slate-600">{isEnglish ? 'Class' : 'कक्षा'} {profile.class_level}</p>}
              </div>
              <div className="inline-flex items-center gap-2 text-xs font-semibold text-emerald-800">
                <ShieldCheck className="w-4 h-4" />
                {isEnglish ? 'Private account results' : 'निजी खाते के परिणाम'}
              </div>
            </div>

            {error && <p role="alert" className="mb-4 rounded-lg bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}
            {loading ? (
              <p role="status" className="py-8 text-center text-sm text-slate-500">{isEnglish ? 'Loading your results…' : 'आपके परिणाम लोड हो रहे हैं…'}</p>
            ) : error ? null : visibleAttempts.length === 0 ? (
              <div className="rounded-2xl border border-amber-200 bg-amber-50/70 p-6 text-center">
                <Clock className="w-7 h-7 text-amber-700 mx-auto mb-2" />
                <p className="font-semibold text-slate-900">{isEnglish ? 'No test attempts yet' : 'अभी कोई टेस्ट प्रयास उपलब्ध नहीं है'}</p>
                <p className="mt-1 text-sm text-slate-600">{isEnglish ? 'Your submitted tests and scores will appear here.' : 'टेस्ट जमा करने के बाद आपका परिणाम यहाँ दिखाई देगा।'}</p>
              </div>
            ) : (
              <div className="space-y-3">
                {visibleAttempts.map((attempt) => {
                  const submitted = attempt.status === 'submitted';
                  const inProgress = isResumableAttempt(attempt);
                  return (
                    <article key={attempt.id} className={'rounded-xl border p-4 shadow-sm ' + (submitted ? templateStyle : 'border-slate-200 bg-white')}>
                      {submitted && resultTemplate && <header className="mb-4 border-b border-slate-200 pb-3 text-center"><p className="text-sm font-bold tracking-wide text-slate-900">{designText('brandTitle') || 'KRISHAN SIR ONLINE LEARNING'}</p>{designText('tagline') && <p className="mt-1 text-xs text-slate-600">{designText('tagline')}</p>}<p className="mt-2 text-[10px] font-semibold uppercase tracking-wider text-slate-500">{isEnglish ? 'Personal examination scorecard' : 'व्यक्तिगत परीक्षा अंकपत्र'}</p></header>}
                      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                        <div className="min-w-0">
                          <h3 className="font-bold text-slate-900">{testTitle(attempt.test_id)}</h3>
                          <p className="mt-1 text-xs text-slate-500">
                            {isEnglish ? 'Attempt' : 'प्रयास'} {attempt.attempt_number} · {formatDate(attempt.submitted_at || attempt.started_at)}
                          </p>
                        </div>
                        <span className={`inline-flex w-fit items-center rounded-full px-3 py-1 text-xs font-bold ${submitted ? 'bg-emerald-50 text-emerald-800' : inProgress ? 'bg-amber-50 text-amber-800' : 'bg-slate-100 text-slate-600'}`}>
                          {submitted ? (isEnglish ? 'Submitted' : 'जमा किया गया') : inProgress ? (isEnglish ? 'In progress' : 'जारी') : (isEnglish ? 'Expired' : 'समय समाप्त')}
                        </span>
                      </div>
                      {submitted ? (
                        <div className="mt-4 grid grid-cols-3 gap-2 border-t border-slate-100 pt-3 text-center">
                          <div><Award className="mx-auto mb-1 h-4 w-4 text-sky-800" /><strong className="block text-lg text-slate-900">{attempt.score ?? '—'}/{attempt.total_marks ?? '—'}</strong><span className="text-[11px] text-slate-500">{isEnglish ? 'Score' : 'अंक'}</span></div>
                          <div><strong className="block text-lg text-slate-900">{attempt.percentage===null?'—':Number(attempt.percentage).toFixed(1)+'%'}</strong><span className="text-[11px] text-slate-500">{isEnglish ? 'Percentage' : 'प्रतिशत'}</span></div>
                          <div><strong className="block text-lg text-slate-900">{attempt.correct_count ?? '—'}</strong><span className="text-[11px] text-slate-500">{isEnglish ? 'Correct' : 'सही उत्तर'}</span></div>
                        </div>
                      ) : (
                        <p className="mt-3 text-xs text-slate-600">
                          {inProgress
                            ? (isEnglish ? 'Return to the test page to continue this attempt.' : 'इस प्रयास को जारी रखने के लिए टेस्ट पेज पर जाएँ।')
                            : (isEnglish ? 'The allowed time for this attempt has ended.' : 'इस प्रयास का निर्धारित समय समाप्त हो गया है।')}
                        </p>
                      )}
                      {submitted && resultTemplate && designText('footerNote') && <p className="mt-4 border-t border-slate-200 pt-3 text-center text-xs text-slate-600">{designText('footerNote')}</p>}
                      <StudentResultPdfDownload attemptId={attempt.id} studentId={attempt.student_id} submitted={submitted}/>
                    </article>
                  );
                })}
              </div>
            )}
            <button type="button" onClick={() => window.location.reload()} disabled={loading} className="mt-5 inline-flex items-center gap-2 rounded-lg border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50">
              <RefreshCw className="h-3.5 w-3.5" /> {isEnglish ? 'Refresh results' : 'परिणाम रिफ्रेश करें'}
            </button>
          </div>
        )}
      </div>
    </section>
  );
};
