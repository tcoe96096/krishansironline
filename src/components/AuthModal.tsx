import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { X, UserRound, LogOut, ShieldCheck, GraduationCap, Sparkles, School } from 'lucide-react';
import { StudentDashboard } from './StudentDashboard';

type AuthModalProps = { isOpen: boolean; onClose: () => void };

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose }) => {
  const { language } = useLanguage();
  const { user, profile, configured, isAdmin, adminLoading, signInWithGoogle, signInWithMobile, registerStudent, signOut } = useAuth();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [mobile, setMobile] = useState('');
  const [password, setPassword] = useState('');
  const [studentName, setStudentName] = useState('');
  const [studentClass, setStudentClass] = useState<'6' | '7' | '8' | '9' | '10' | '11' | '12'>('10');
  const [classMenuOpen, setClassMenuOpen] = useState(false);
  const [rollNo, setRollNo] = useState('');
  const [schoolName, setSchoolName] = useState('Govt Girls High School, Dhanger');
  const [otherSchool, setOtherSchool] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const en = language === 'en';

  if (!isOpen) return null;

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true); setError(''); setMessage('');
    try {
      if (mode === 'login') {
        await signInWithMobile(mobile, password);
        setMessage(en ? 'Login successful.' : 'लॉगिन सफल रहा।');
      } else {
        await registerStudent({
          mobile, password, studentName, studentClass, rollNo,
          schoolName: schoolName === 'Other' ? otherSchool : schoolName,
        });
        setMessage(en
          ? 'Registration successful. You can now sign in with your mobile number and password.'
          : 'पंजीकरण सफल रहा। अब आप मोबाइल नंबर और पासवर्ड से लॉगिन कर सकते हैं।');
        setMode('login');
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : (en ? 'Something went wrong.' : 'कुछ त्रुटि हुई।'));
    } finally { setBusy(false); }
  };

  const inputClass = 'w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-sky-600 focus:ring-2 focus:ring-sky-100';
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/65 p-0 backdrop-blur-sm sm:p-4" role="dialog" aria-modal="true" aria-label={en ? 'Student account' : 'विद्यार्थी खाता'}>
      <div className="relative flex max-h-[100dvh] min-h-[100dvh] w-full max-w-5xl flex-col overflow-hidden bg-slate-50 shadow-2xl sm:min-h-0 sm:max-h-[94vh] sm:rounded-[1.75rem]">
        <button onClick={onClose} className="absolute right-3 top-3 z-20 rounded-full bg-white/15 p-2.5 text-white ring-1 ring-white/30 transition hover:bg-white/25" aria-label="Close"><X className="h-5 w-5" /></button>
        <div className="shrink-0 bg-gradient-to-r from-[#082d65] via-[#104b83] to-[#087d9b] px-5 pb-6 pt-5 text-white sm:px-8 sm:pb-7 sm:pt-6">
          <div className="flex items-center gap-3"><div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/15 ring-1 ring-white/25"><GraduationCap className="h-6 w-6" /></div><div><p className="text-[10px] font-bold uppercase tracking-[.2em] text-cyan-100">KRISHAN SIR • ONLINE LEARNING</p><h2 className="text-xl font-extrabold sm:text-2xl">{user ? (en ? 'Student Dashboard' : 'विद्यार्थी डैशबोर्ड') : (en ? 'Student Account' : 'विद्यार्थी लॉगिन')}</h2></div></div>
          {user && <div className="mt-5 flex items-center gap-3"><div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-amber-300 text-[#082d65] shadow-lg"><UserRound className="h-6 w-6" /></div><div className="min-w-0"><p className="text-xs font-medium text-cyan-100">{en ? 'Welcome back' : 'आपका स्वागत है'}</p><p className="truncate text-lg font-bold">{profile?.student_name || user.user_metadata?.full_name || user.user_metadata?.name || (en ? 'Student' : 'विद्यार्थी')}</p><p className="text-xs text-blue-100">{profile ? (en ? 'Class ' : 'कक्षा ') + profile.class_level + ' • ' + (en ? 'Roll No. ' : 'रोल नंबर ') + profile.roll_no : (en ? 'Your learning space' : 'आपका अपना अध्ययन पोर्टल')}</p></div><div className="ml-auto hidden rounded-full bg-emerald-400/15 px-3 py-1.5 text-[11px] font-bold text-emerald-100 ring-1 ring-emerald-200/30 sm:block"><Sparkles className="mr-1 inline h-3.5 w-3.5" />{en ? 'Learning active' : 'लर्निंग सक्रिय'}</div></div>}
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-7">
        {!configured && <p className="mb-4 rounded-lg bg-amber-50 p-3 text-sm text-amber-900">{en ? 'Supabase environment variables are not configured for this deployment yet.' : 'इस deployment में Supabase environment variables अभी configure नहीं हैं।'}</p>}
        {user ? (
          <div className="space-y-5">
            {adminLoading ? <p className="rounded-xl bg-slate-100 p-3 text-xs text-slate-500">Admin role जाँचा जा रहा है…</p> : isAdmin ? <p className="rounded-xl bg-emerald-50 p-3 text-sm font-semibold text-emerald-800">Admin access verified / एडमिन अनुमति सत्यापित</p> : null}
            <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-center"><div><p className="text-xs font-bold uppercase tracking-[.16em] text-sky-700">{en ? 'Your learning overview' : 'आपकी पढ़ाई का संक्षिप्त विवरण'}</p><h3 className="mt-1 text-lg font-extrabold text-slate-900">{en ? 'Keep learning, keep improving!' : 'सीखते रहें, आगे बढ़ते रहें!'}</h3><p className="mt-1 text-sm text-slate-500">{en ? 'Your tests, progress and results in one place.' : 'आपके टेस्ट, प्रगति और परिणाम एक ही स्थान पर।'}</p></div><div className="inline-flex w-fit items-center gap-2 rounded-xl border border-sky-100 bg-white px-3 py-2 text-xs font-semibold text-sky-900 shadow-sm"><School className="h-4 w-4" />{profile?.school_name || (en ? 'Student Portal' : 'विद्यार्थी पोर्टल')}</div></div>
            <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm sm:p-5"><StudentDashboard /></div>
            <div className="flex flex-col-reverse gap-2 border-t border-slate-200 pt-4 sm:flex-row sm:items-center sm:justify-between"><p className="text-xs text-slate-500"><ShieldCheck className="mr-1 inline h-4 w-4 text-emerald-700" />{en ? 'Your student session is secure.' : 'आपका विद्यार्थी सत्र सुरक्षित है।'}</p><button onClick={async () => { await signOut(); setMessage(en ? 'Signed out.' : 'लॉगआउट हो गया।'); }} className="inline-flex items-center justify-center gap-2 rounded-xl border border-rose-200 bg-white px-4 py-2.5 text-sm font-bold text-rose-700 transition hover:bg-rose-50"><LogOut className="h-4 w-4" />{en ? 'Sign out' : 'लॉगआउट'}</button></div>
          </div>
        ) : (
          <>
            <div className="mb-4 grid grid-cols-2 rounded-lg bg-slate-100 p-1">
              <button type="button" onClick={() => {setMode('login');setError('');setMessage('');}} className={`rounded-md py-2 text-sm font-semibold ${mode === 'login' ? 'bg-white text-sky-900 shadow-sm' : 'text-slate-600'}`}>{en ? 'Login' : 'लॉगिन'}</button>
              <button type="button" onClick={() => {setMode('register');setError('');setMessage('');}} className={`rounded-md py-2 text-sm font-semibold ${mode === 'register' ? 'bg-white text-sky-900 shadow-sm' : 'text-slate-600'}`}>{en ? 'Register' : 'पंजीकरण'}</button>
            </div>
            <button type="button" disabled={!configured || busy} onClick={async () => {
              setBusy(true); setError('');
              try { await signInWithGoogle(); }
              catch (cause) { setError(cause instanceof Error ? cause.message : 'Google sign-in failed.'); }
              finally { setBusy(false); }
            }} className="mb-3 w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-800 hover:bg-slate-50 disabled:opacity-50">
              Continue with Google · Admin Login
            </button>
            <p className="mb-3 text-xs text-slate-500">केवल database में Admin role दिए गए Google account को Admin access मिलेगा।</p>
            <form onSubmit={handleSubmit} className="space-y-3">
              {mode === 'register' && <>
                <input required value={studentName} onChange={e=>setStudentName(e.target.value)} placeholder={en ? 'Student full name' : 'विद्यार्थी का पूरा नाम'} className={inputClass} autoComplete="name" />
                <div className="relative">
                  <button type="button" aria-haspopup="listbox" aria-expanded={classMenuOpen} onClick={() => setClassMenuOpen(open => !open)} className={`${inputClass} flex items-center justify-between bg-white text-left`}>
                    <span>{en ? `Class ${studentClass}` : `कक्षा ${studentClass}`}</span>
                    <span aria-hidden="true" className="text-slate-500">▾</span>
                  </button>
                  {classMenuOpen && <div role="listbox" aria-label={en ? 'Select class' : 'कक्षा चुनें'} className="absolute z-20 mt-1 max-h-56 w-full overflow-y-auto overscroll-contain rounded-lg border border-slate-300 bg-white p-1 shadow-xl">
                    {(['6','7','8','9','10','11','12'] as const).map(grade => <button key={grade} type="button" role="option" aria-selected={studentClass === grade} onClick={() => { setStudentClass(grade); setClassMenuOpen(false); }} className={`w-full rounded-md px-3 py-3 text-left text-sm ${studentClass === grade ? 'bg-sky-100 font-semibold text-sky-900' : 'text-slate-700 hover:bg-slate-100'}`}>{en ? `Class ${grade}` : `कक्षा ${grade}`}</button>)}
                  </div>}
                </div>
                <input required value={rollNo} onChange={e=>setRollNo(e.target.value)} placeholder={en ? 'Roll number' : 'रोल नंबर'} className={inputClass} />
                <select value={schoolName} onChange={e=>setSchoolName(e.target.value)} className={inputClass}><option value="Govt Girls High School, Dhanger">Govt Girls High School, Dhanger</option><option value="Other">{en ? 'Other school' : 'अन्य विद्यालय'}</option></select>
                {schoolName === 'Other' && <input required value={otherSchool} onChange={e=>setOtherSchool(e.target.value)} placeholder={en ? 'Enter school name' : 'विद्यालय का नाम लिखें'} className={inputClass} />}
              </>}
              <input required type="text" inputMode="text" autoComplete="username" value={mobile} onChange={e=>setMobile(e.target.value)} placeholder={en ? '10-digit mobile number' : '10 अंकों का मोबाइल नंबर'} className={inputClass} />
              <input required type="password" minLength={8} autoComplete={mode === 'login' ? 'current-password' : 'new-password'} value={password} onChange={e=>setPassword(e.target.value)} placeholder={en ? 'Password (minimum 8 characters)' : 'पासवर्ड (कम-से-कम 8 अक्षर)'} className={inputClass} />
              {mode === 'register' && <p className="text-xs leading-relaxed text-amber-800">{en ? 'Use your Indian mobile number. SMS OTP is not used; keep your password safe.' : 'अपना भारतीय मोबाइल नंबर दर्ज करें। SMS OTP का उपयोग नहीं होगा; अपना पासवर्ड सुरक्षित रखें।'}</p>}
              <button disabled={!configured || busy} className="w-full rounded-lg bg-sky-900 px-4 py-3 text-sm font-bold text-white hover:bg-sky-800 disabled:cursor-not-allowed disabled:opacity-50">{busy ? (en ? 'Please wait…' : 'कृपया प्रतीक्षा करें…') : mode === 'login' ? (en ? 'Login securely' : 'सुरक्षित लॉगिन') : (en ? 'Create student account' : 'विद्यार्थी खाता बनाएँ')}</button>
            </form>
          </>
        )}
        {error && <p role="alert" className="mt-3 rounded-lg bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}
        {message && <p role="status" className="mt-3 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800">{message}</p>}
        <p className="mt-4 flex items-start gap-2 border-t border-slate-100 pt-3 text-[11px] leading-relaxed text-slate-500"><ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />{en ? 'Your session is stored by Supabase Auth on this device. Student data access is controlled separately by database security policies.' : 'आपका session इस डिवाइस पर Supabase Auth द्वारा सुरक्षित रखा जाता है। विद्यार्थी डेटा की पहुँच अलग database security policies से नियंत्रित होगी।'}</p>
        </div>
      </div>
    </div>
  );
};
