import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { X, UserRound, LogOut, ShieldCheck } from 'lucide-react';

type AuthModalProps = { isOpen: boolean; onClose: () => void };

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose }) => {
  const { language } = useLanguage();
  const { user, configured, isAdmin, adminLoading, signInWithGoogle, signInWithMobile, registerStudent, signOut } = useAuth();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [mobile, setMobile] = useState('');
  const [password, setPassword] = useState('');
  const [studentName, setStudentName] = useState('');
  const [studentClass, setStudentClass] = useState<'8' | '9' | '10'>('10');
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
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/60 p-3" role="dialog" aria-modal="true" aria-label={en ? 'Student account' : 'विद्यार्थी खाता'}>
      <div className="relative max-h-[92vh] w-full max-w-md overflow-y-auto rounded-2xl bg-white p-5 shadow-2xl sm:p-7">
        <button onClick={onClose} className="absolute right-4 top-4 rounded-lg p-2 text-slate-500 hover:bg-slate-100" aria-label="Close"><X className="h-5 w-5" /></button>
        <div className="mb-5 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-sky-100 text-sky-900"><UserRound className="h-5 w-5" /></div>
          <div><h2 className="text-xl font-bold text-slate-900">{en ? 'Student Account' : 'विद्यार्थी लॉगिन'}</h2><p className="text-xs text-slate-500">{en ? 'Mobile number + password' : 'मोबाइल नंबर + पासवर्ड'}</p></div>
        </div>
        {!configured && <p className="mb-4 rounded-lg bg-amber-50 p-3 text-sm text-amber-900">{en ? 'Supabase environment variables are not configured for this deployment yet.' : 'इस deployment में Supabase environment variables अभी configure नहीं हैं।'}</p>}
        {user ? (
          <div className="space-y-4">
            {adminLoading ? <p className="text-xs text-slate-500">Admin role जाँचा जा रहा है…</p> : isAdmin ? <p className="rounded-lg bg-emerald-50 p-3 text-sm font-semibold text-emerald-800">Admin access verified / एडमिन अनुमति सत्यापित</p> : null}
            <p className="text-sm text-slate-700">{en ? 'You are signed in.' : 'आप लॉगिन हैं।'} <span className="font-semibold">{user.email || 'Account'}</span></p>
            <button onClick={async () => { await signOut(); setMessage(en ? 'Signed out.' : 'लॉगआउट हो गया।'); }} className="flex w-full items-center justify-center gap-2 rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white"><LogOut className="h-4 w-4" />{en ? 'Sign out' : 'लॉगआउट'}</button>
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
                <select value={studentClass} onChange={e=>setStudentClass(e.target.value as '8'|'9'|'10')} className={inputClass}><option value="8">{en ? 'Class 8' : 'कक्षा 8'}</option><option value="9">{en ? 'Class 9' : 'कक्षा 9'}</option><option value="10">{en ? 'Class 10' : 'कक्षा 10'}</option></select>
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
  );
};
