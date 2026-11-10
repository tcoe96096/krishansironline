import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { X, UserRound, LogOut, ShieldCheck, GraduationCap, School, Eye, EyeOff, ArrowLeft, ArrowRight, CheckCircle2, MapPin, LockKeyhole, BookOpen } from 'lucide-react';
import { StudentDashboard } from './StudentDashboard';

type AuthModalProps = { isOpen: boolean; onClose: () => void };

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose }) => {
  const { language } = useLanguage();
  const { user, profile, configured, isAdmin, adminLoading, signInWithMobile, registerStudent, signOut } = useAuth();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [registrationStep, setRegistrationStep] = useState(1);
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [studentName, setStudentName] = useState('');
  const [studentClass, setStudentClass] = useState<'6' | '7' | '8' | '9' | '10' | '11' | '12'>('10');
  const [classMenuOpen, setClassMenuOpen] = useState(false);
  const [rollNo, setRollNo] = useState('');
  const [schoolName, setSchoolName] = useState('Govt Girls High School, Dhanger');
  const [otherSchool, setOtherSchool] = useState('');
  const [country, setCountry] = useState('India');
  const [state, setState] = useState('Haryana');
  const [district, setDistrict] = useState('');
  const [areaType, setAreaType] = useState<'village' | 'city' | 'town' | 'other'>('village');
  const [localityName, setLocalityName] = useState('');
  const [pinCode, setPinCode] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const en = language === 'en';

  if (!isOpen) return null;

  const switchMode = (nextMode: 'login' | 'register') => {
    setMode(nextMode);
    setRegistrationStep(1);
    setError('');
    setMessage('');
  };

  const nextRegistrationStep = () => {
    setError('');
    if (registrationStep === 1) {
      if (!studentName.trim() || !rollNo.trim() || (schoolName === 'Other' && !otherSchool.trim())) {
        setError(en ? 'Please complete your name, roll number and school details.' : 'कृपया नाम, रोल नंबर और विद्यालय का विवरण भरें।');
        return;
      }
    }
    if (registrationStep === 2) {
      if (!country.trim() || !state.trim() || !district.trim() || !localityName.trim()) {
        setError(en ? 'Please complete all required location details.' : 'कृपया स्थान विवरण के सभी आवश्यक कॉलम भरें।');
        return;
      }
      if (pinCode && !/^\\d{6}$/.test(pinCode)) {
        setError(en ? 'PIN Code must contain 6 digits.' : 'PIN Code में 6 अंक होने चाहिए।');
        return;
      }
    }
    setRegistrationStep(step => Math.min(3, step + 1));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    setMessage('');
    if (mode === 'register') {
      if (registrationStep < 3) {
        nextRegistrationStep();
        return;
      }
      if (!identifier.trim()) {
        setError(en ? 'Enter a mobile number or email ID.' : 'मोबाइल नंबर या Email ID दर्ज करें।');
        return;
      }
      if (password.length < 8) {
        setError(en ? 'Password must be at least 8 characters.' : 'पासवर्ड कम-से-कम 8 अक्षरों का होना चाहिए।');
        return;
      }
      if (password !== confirmPassword) {
        setError(en ? 'Passwords do not match.' : 'दोनों पासवर्ड मेल नहीं खाते।');
        return;
      }
    }
    setBusy(true);
    try {
      if (mode === 'login') {
        await signInWithMobile(identifier, password);
        onClose();
      } else {
        await registerStudent({
          identifier, password, studentName, studentClass, rollNo,
          schoolName: schoolName === 'Other' ? otherSchool : schoolName,
          country, state, district, areaType, localityName, pinCode,
        });
        setMessage(en
          ? 'Registration successful. You can now sign in with your mobile number or email ID and password.'
          : 'पंजीकरण सफल रहा। अब आप मोबाइल नंबर या Email ID और पासवर्ड से लॉगिन कर सकते हैं।');
        setMode('login');
        setRegistrationStep(1);
        setPassword('');
        setConfirmPassword('');
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : (en ? 'Something went wrong.' : 'कुछ त्रुटि हुई।'));
    } finally {
      setBusy(false);
    }
  };

  const inputClass = 'w-full min-w-0 rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-teal-600 focus:ring-2 focus:ring-teal-600/10 sm:rounded-xl sm:px-3.5 sm:py-2.5';
  const labelClass = 'mb-1 block text-[11px] font-semibold text-slate-600 sm:text-xs';
  const stepTitles = en ? ['Personal & Academic', 'Location Details', 'Account Security'] : ['व्यक्तिगत व शैक्षणिक', 'स्थान विवरण', 'खाता सुरक्षा'];

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/70 p-0 backdrop-blur-sm sm:p-4" role="dialog" aria-modal="true" aria-label={en ? 'Student account' : 'विद्यार्थी खाता'}>
      <div className="relative flex max-h-[100dvh] min-h-[100dvh] w-full max-w-6xl flex-col overflow-hidden bg-white shadow-2xl sm:min-h-0 sm:max-h-[92vh] sm:flex-row sm:rounded-[1.5rem]">
        <button onClick={onClose} className="absolute right-3 top-3 z-30 rounded-full bg-white/15 p-2.5 text-white ring-1 ring-white/30 transition hover:bg-white/25" aria-label="Close"><X className="h-5 w-5" /></button>

        {!user && <aside className="relative hidden w-[30%] shrink-0 flex-col justify-between overflow-hidden bg-gradient-to-br from-[#102b50] via-[#123f68] to-[#087f89] p-6 text-white lg:flex">
          <div className="absolute -right-20 -top-16 h-64 w-64 rounded-full border-[36px] border-white/5" />
          <div className="absolute -bottom-24 -left-20 h-72 w-72 rounded-full border-[42px] border-white/5" />
          <div className="relative">
            <div className="mb-7 flex h-14 w-14 items-center justify-center rounded-2xl bg-white/15 ring-1 ring-white/25"><GraduationCap className="h-8 w-8" /></div>
            <p className="text-[10px] font-bold uppercase tracking-[.22em] text-teal-200">KRISHAN SIR • ONLINE LEARNING</p>
            <h2 className="mt-4 text-3xl font-black leading-tight">{mode === 'login' ? (en ? 'Welcome back!' : 'वापसी पर स्वागत है!') : (en ? 'Start your learning journey' : 'अपनी सीखने की यात्रा शुरू करें')}</h2>
            <p className="mt-4 text-sm leading-6 text-blue-100">{en ? 'Learn with clarity. Practice with purpose. Improve every day.' : 'समझ के साथ सीखें। अभ्यास करें। हर दिन बेहतर बनें।'}</p>
            <div className="mt-8 space-y-4 text-sm text-blue-50">
              <div className="flex items-center gap-3"><BookOpen className="h-5 w-5 text-teal-200" />{en ? 'Class-wise study resources' : 'कक्षा के अनुसार अध्ययन सामग्री'}</div>
              <div className="flex items-center gap-3"><GraduationCap className="h-5 w-5 text-teal-200" />{en ? 'Online tests and practice' : 'ऑनलाइन टेस्ट और अभ्यास'}</div>
              <div className="flex items-center gap-3"><ShieldCheck className="h-5 w-5 text-teal-200" />{en ? 'Secure student account' : 'सुरक्षित विद्यार्थी खाता'}</div>
            </div>
          </div>
          <p className="relative text-xs text-blue-200">Learn • Practice • Improve • Succeed</p>
        </aside>}

        <main className="flex min-h-0 min-w-0 flex-1 flex-col bg-[#f7fafc]">
          <header className="shrink-0 bg-gradient-to-r from-[#102b50] to-[#087f89] px-4 pb-3 pt-3 text-white sm:bg-white sm:px-7 sm:pb-2 sm:pt-5 sm:text-slate-900">
            <div className="flex items-center gap-3 sm:hidden">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/15"><GraduationCap className="h-6 w-6" /></div>
              <div><p className="text-[9px] font-bold tracking-[.18em] text-teal-100">KRISHAN SIR</p><p className="text-sm font-extrabold">ONLINE LEARNING</p></div>
            </div>
            <p className="mt-3 text-xs font-bold uppercase tracking-[.16em] text-teal-300 sm:text-teal-700">{user ? (en ? 'Student Portal' : 'विद्यार्थी पोर्टल') : (en ? 'Your learning space' : 'आपका अध्ययन पोर्टल')}</p>
            <h2 className="mt-1 text-2xl font-black sm:text-3xl">{user ? (en ? 'Student Dashboard' : 'विद्यार्थी डैशबोर्ड') : mode === 'login' ? (en ? 'Sign in to continue' : 'लॉगिन करके आगे बढ़ें') : (en ? 'Create student account' : 'विद्यार्थी खाता बनाएँ')}</h2>
            <p className="mt-1 text-xs text-blue-100 sm:text-slate-500">{user ? (en ? 'Your learning, progress and results in one place.' : 'आपकी पढ़ाई, प्रगति और परिणाम एक ही जगह।') : mode === 'login' ? (en ? 'Access your classes, tests and learning progress.' : 'अपनी कक्षाओं, टेस्ट और अध्ययन प्रगति तक पहुँचें।') : (en ? 'A few simple steps to set up your account.' : 'अपना खाता बनाने के लिए कुछ आसान चरण।')}</p>
          </header>

          <div className="min-h-0 flex-1 overflow-y-auto px-3 pb-4 pt-3 sm:px-6 sm:pb-5 sm:pt-3">
            {!configured && <p className="mb-4 rounded-xl bg-amber-50 p-3 text-sm text-amber-900">{en ? 'Supabase environment variables are not configured for this deployment yet.' : 'इस deployment में Supabase environment variables अभी configure नहीं हैं।'}</p>}

            {user ? (
              <div className="space-y-5">
                {adminLoading ? <p className="rounded-xl bg-slate-100 p-3 text-xs text-slate-500">Admin role जाँचा जा रहा है…</p> : isAdmin ? <p className="rounded-xl bg-emerald-50 p-3 text-sm font-semibold text-emerald-800">Admin access verified / एडमिन अनुमति सत्यापित</p> : null}
                <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-center"><div><p className="text-xs font-bold uppercase tracking-[.16em] text-teal-700">{en ? 'Your learning overview' : 'आपकी पढ़ाई का संक्षिप्त विवरण'}</p><h3 className="mt-1 text-lg font-extrabold text-slate-900">{en ? 'Keep learning, keep improving!' : 'सीखते रहें, आगे बढ़ते रहें!'}</h3><p className="mt-1 text-sm text-slate-500">{en ? 'Your tests, progress and results in one place.' : 'आपके टेस्ट, प्रगति और परिणाम एक ही स्थान पर।'}</p></div><div className="inline-flex w-fit items-center gap-2 rounded-xl border border-sky-100 bg-white px-3 py-2 text-xs font-semibold text-sky-900 shadow-sm"><School className="h-4 w-4" />{profile?.school_name || (en ? 'Student Portal' : 'विद्यार्थी पोर्टल')}</div></div>
                <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm sm:p-5"><StudentDashboard /></div>
                <div className="flex flex-col-reverse gap-2 border-t border-slate-200 pt-4 sm:flex-row sm:items-center sm:justify-between"><p className="text-xs text-slate-500"><ShieldCheck className="mr-1 inline h-4 w-4 text-emerald-700" />{en ? 'Your student session is secure.' : 'आपका विद्यार्थी सत्र सुरक्षित है।'}</p><button onClick={async () => { await signOut(); setMessage(en ? 'Signed out.' : 'लॉगआउट हो गया।'); }} className="inline-flex items-center justify-center gap-2 rounded-xl border border-rose-200 bg-white px-4 py-2.5 text-sm font-bold text-rose-700 transition hover:bg-rose-50"><LogOut className="h-4 w-4" />{en ? 'Sign out' : 'लॉगआउट'}</button></div>
              </div>
            ) : (
              <div className="mx-auto w-full max-w-3xl">
                <div className="mb-3 rounded-xl border border-slate-200 bg-white p-1 shadow-sm">
                  <div className="grid grid-cols-2 gap-1">
                    <button type="button" onClick={() => switchMode('login')} className={`rounded-xl px-3 py-3 text-sm font-bold transition ${mode === 'login' ? 'bg-[#102b50] text-white shadow' : 'text-slate-500 hover:bg-slate-50'}`}>{en ? 'Student Login' : 'विद्यार्थी लॉगिन'}</button>
                    <button type="button" onClick={() => switchMode('register')} className={`rounded-xl px-3 py-3 text-sm font-bold transition ${mode === 'register' ? 'bg-[#102b50] text-white shadow' : 'text-slate-500 hover:bg-slate-50'}`}>{en ? 'New Registration' : 'नया पंजीकरण'}</button>
                  </div>
                </div>

                {mode === 'login' ? (
                  <form onSubmit={handleSubmit} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_12px_36px_-24px_rgba(15,45,80,.35)] sm:p-7">
                    <div className="mb-6 flex items-center gap-3"><div className="flex h-11 w-11 items-center justify-center rounded-xl bg-teal-50 text-teal-700"><LockKeyhole className="h-5 w-5" /></div><div><h3 className="font-extrabold text-slate-900">{en ? 'Welcome back, Student' : 'स्वागत है विद्यार्थी!'}</h3><p className="text-xs text-slate-500">{en ? 'Enter your account details below.' : 'नीचे अपने खाते का विवरण भरें।'}</p></div></div>
                    <label className={labelClass}>{en ? 'Mobile Number / Email ID' : 'मोबाइल नंबर / Email ID'}</label>
                    <input required type="text" autoComplete="username" value={identifier} onChange={e=>setIdentifier(e.target.value)} placeholder={en ? 'Enter mobile number or email' : 'मोबाइल नंबर या Email ID लिखें'} className={inputClass} />
                    <label className={`${labelClass} mt-4`}>{en ? 'Password' : 'पासवर्ड'}</label>
                    <div className="relative"><input required type={showPassword ? 'text' : 'password'} minLength={8} autoComplete="current-password" value={password} onChange={e=>setPassword(e.target.value)} placeholder={en ? 'Enter your password' : 'अपना पासवर्ड लिखें'} className={inputClass + ' pr-12'} /><button type="button" onClick={()=>setShowPassword(value=>!value)} aria-label={showPassword ? 'Hide password' : 'Show password'} className="absolute inset-y-0 right-3 text-slate-500">{showPassword ? <EyeOff className="h-4 w-4"/> : <Eye className="h-4 w-4"/>}</button></div>
                    <button disabled={!configured || busy} className="mt-6 w-full rounded-xl bg-gradient-to-r from-[#102b50] to-[#087f89] px-4 py-3.5 text-sm font-extrabold text-white shadow-lg shadow-teal-900/10 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50">{busy ? (en ? 'Please wait…' : 'कृपया प्रतीक्षा करें…') : (en ? 'Sign in securely' : 'सुरक्षित लॉगिन करें')}</button>
                    <p className="mt-4 text-center text-xs text-slate-500">{en ? 'New to the portal?' : 'पोर्टल पर नए हैं?'} <button type="button" onClick={()=>switchMode('register')} className="font-bold text-teal-700 hover:underline">{en ? 'Create an account' : 'नया खाता बनाएँ'}</button></p>
                  </form>
                ) : (
                  <form onSubmit={handleSubmit} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_12px_36px_-24px_rgba(15,45,80,.35)] sm:p-6">
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <div><h3 className="font-extrabold text-slate-900">{stepTitles[registrationStep - 1]}</h3><p className="mt-1 text-xs text-slate-500">{en ? `Step ${registrationStep} of 3` : `चरण ${registrationStep} / 3`}</p></div>
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-50 text-teal-700">{registrationStep === 1 ? <UserRound className="h-5 w-5"/> : registrationStep === 2 ? <MapPin className="h-5 w-5"/> : <LockKeyhole className="h-5 w-5"/>}</div>
                    </div>
                    <div className="mb-4">
                      <div className="mb-2 flex items-center justify-between gap-2">
                        {stepTitles.map((title, index) => <div key={title} className={`flex min-w-0 items-center gap-1.5 text-[10px] font-bold sm:text-xs ${registrationStep >= index + 1 ? 'text-teal-700' : 'text-slate-400'}`}><span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${registrationStep > index + 1 ? 'bg-teal-600 text-white' : registrationStep === index + 1 ? 'bg-[#102b50] text-white' : 'bg-slate-100 text-slate-400'}`}>{registrationStep > index + 1 ? <CheckCircle2 className="h-4 w-4"/> : index + 1}</span><span className="hidden truncate sm:inline">{title}</span></div>)}
                      </div>
                      <div className="h-1.5 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-gradient-to-r from-[#102b50] to-teal-500 transition-all duration-300" style={{ width: `${registrationStep / 3 * 100}%` }} /></div>
                    </div>

                    {registrationStep === 1 && <div className="space-y-3">
                      <div><label className={labelClass}>{en ? 'Student full name' : 'विद्यार्थी का पूरा नाम'}</label><input required value={studentName} onChange={e=>setStudentName(e.target.value)} placeholder={en ? 'Enter full name' : 'पूरा नाम लिखें'} className={inputClass} autoComplete="name" /></div>
                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <div><label className={labelClass}>{en ? 'Class' : 'कक्षा'}</label><div className="relative"><button type="button" aria-haspopup="listbox" aria-expanded={classMenuOpen} onClick={() => setClassMenuOpen(open => !open)} className={inputClass + ' flex items-center justify-between text-left'}><span>{en ? `Class ${studentClass}` : `कक्षा ${studentClass}`}</span><span className="text-slate-500">▾</span></button>{classMenuOpen && <div role="listbox" aria-label={en ? 'Select class' : 'कक्षा चुनें'} className="absolute z-20 mt-1 max-h-56 w-full overflow-y-auto rounded-xl border border-slate-200 bg-white p-1 shadow-xl">{(['6','7','8','9','10','11','12'] as const).map(grade => <button key={grade} type="button" role="option" aria-selected={studentClass === grade} onClick={() => { setStudentClass(grade); setClassMenuOpen(false); }} className={`w-full rounded-lg px-3 py-3 text-left text-sm ${studentClass === grade ? 'bg-teal-50 font-bold text-teal-800' : 'text-slate-700 hover:bg-slate-50'}`}>{en ? `Class ${grade}` : `कक्षा ${grade}`}</button>)}</div>}</div></div>
                        <div><label className={labelClass}>{en ? 'Roll number' : 'रोल नंबर'}</label><input required value={rollNo} onChange={e=>setRollNo(e.target.value)} placeholder={en ? 'Enter roll number' : 'रोल नंबर लिखें'} className={inputClass} /></div>
                      </div>
                      <div><label className={labelClass}>{en ? 'School name' : 'विद्यालय का नाम'}</label><select value={schoolName} onChange={e=>setSchoolName(e.target.value)} className={inputClass}><option value="Govt Girls High School, Dhanger">Govt Girls High School, Dhanger</option><option value="Other">{en ? 'Other school' : 'अन्य विद्यालय'}</option></select>{schoolName === 'Other' && <input required value={otherSchool} onChange={e=>setOtherSchool(e.target.value)} placeholder={en ? 'Enter school name' : 'विद्यालय का नाम लिखें'} className={inputClass + ' mt-3'} />}</div>
                    </div>}

                    {registrationStep === 2 && <div className="space-y-3">
                      <div className="rounded-xl bg-teal-50 px-3 py-2 text-xs text-teal-800"><MapPin className="mr-1 inline h-4 w-4"/> {en ? 'Your location helps organize relevant learning resources.' : 'आपका स्थान सही अध्ययन सामग्री व्यवस्थित करने में सहायता करता है।'}</div>
                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
                        <div><label className={labelClass}>{en ? 'Country' : 'देश'}</label><input required value={country} onChange={e=>setCountry(e.target.value)} placeholder="India" className={inputClass} /></div>
                        <div><label className={labelClass}>{en ? 'State' : 'राज्य'}</label><input required value={state} onChange={e=>setState(e.target.value)} placeholder="Haryana" className={inputClass} /></div>
                        <div><label className={labelClass}>{en ? 'District' : 'जिला'}</label><input required value={district} onChange={e=>setDistrict(e.target.value)} placeholder={en ? 'Enter district' : 'जिला लिखें'} className={inputClass} /></div>
                        <div><label className={labelClass}>{en ? 'Area type' : 'क्षेत्र का प्रकार'}</label><select required value={areaType} onChange={e=>setAreaType(e.target.value as typeof areaType)} className={inputClass}><option value="village">Village / गाँव</option><option value="city">City / शहर</option><option value="town">Town / कस्बा</option><option value="other">Other / अन्य</option></select></div>
                      </div>
                      <div className="sm:col-span-2 xl:col-span-3"><label className={labelClass}>{en ? 'Village / City / Town name' : 'गाँव / शहर / कस्बे का नाम'}</label><input required value={localityName} onChange={e=>setLocalityName(e.target.value)} placeholder={en ? 'Enter locality name' : 'अपने गाँव या शहर का नाम लिखें'} className={inputClass} /></div>
                      <div className="sm:col-span-2 xl:col-span-1"><label className={labelClass}>{en ? 'PIN Code (optional)' : 'पिन कोड (वैकल्पिक)'}</label><input value={pinCode} onChange={e=>setPinCode(e.target.value.replace(/\\D/g,'').slice(0,6))} inputMode="numeric" pattern="[0-9]{6}" placeholder="6-digit PIN Code" className={inputClass} /></div>
                    </div>}

                    {registrationStep === 3 && <div className="space-y-3">
                      <div className="rounded-xl bg-blue-50 px-3 py-2 text-xs text-blue-800"><ShieldCheck className="mr-1 inline h-4 w-4"/> {en ? 'Use either your mobile number or email ID. Keep your password private.' : 'मोबाइल नंबर या Email ID में से कोई एक दें। अपना पासवर्ड गोपनीय रखें।'}</div>
                      <div><label className={labelClass}>{en ? 'Mobile Number / Email ID' : 'मोबाइल नंबर / Email ID'}</label><input required type="text" autoComplete="username" value={identifier} onChange={e=>setIdentifier(e.target.value)} placeholder={en ? 'Enter mobile number or email' : 'मोबाइल नंबर या Email ID लिखें'} className={inputClass} /></div>
                      <div><label className={labelClass}>{en ? 'Create password' : 'पासवर्ड बनाएँ'}</label><div className="relative"><input required type={showPassword ? 'text' : 'password'} minLength={8} autoComplete="new-password" value={password} onChange={e=>setPassword(e.target.value)} placeholder={en ? 'At least 8 characters' : 'कम-से-कम 8 अक्षर'} className={inputClass + ' pr-12'} /><button type="button" onClick={()=>setShowPassword(value=>!value)} aria-label={showPassword ? 'Hide password' : 'Show password'} className="absolute inset-y-0 right-3 text-slate-500">{showPassword ? <EyeOff className="h-4 w-4"/> : <Eye className="h-4 w-4"/>}</button></div></div>
                      <div><label className={labelClass}>{en ? 'Confirm password' : 'पासवर्ड की पुष्टि करें'}</label><div className="relative"><input required type={showConfirmPassword ? 'text' : 'password'} minLength={8} autoComplete="new-password" value={confirmPassword} onChange={e=>setConfirmPassword(e.target.value)} placeholder={en ? 'Re-enter password' : 'पासवर्ड दोबारा लिखें'} className={inputClass + ' pr-12'} /><button type="button" onClick={()=>setShowConfirmPassword(value=>!value)} aria-label={showConfirmPassword ? 'Hide password' : 'Show password'} className="absolute inset-y-0 right-3 text-slate-500">{showConfirmPassword ? <EyeOff className="h-4 w-4"/> : <Eye className="h-4 w-4"/>}</button></div></div>
                    </div>}

                    <div className="mt-4 flex gap-2 sm:mt-3">
                      {registrationStep > 1 && <button type="button" onClick={()=>{setError('');setRegistrationStep(step=>step-1);}} className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-700 hover:bg-slate-50"><ArrowLeft className="h-4 w-4"/>{en ? 'Back' : 'वापस'}</button>}
                      {registrationStep < 3 ? <button type="button" onClick={nextRegistrationStep} className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#102b50] to-[#087f89] px-4 py-3 text-sm font-extrabold text-white shadow-lg shadow-teal-900/10 hover:brightness-110">{en ? 'Continue' : 'आगे बढ़ें'}<ArrowRight className="h-4 w-4"/></button> : <button type="submit" disabled={!configured || busy} className="flex-1 rounded-xl bg-gradient-to-r from-[#102b50] to-[#087f89] px-4 py-3 text-sm font-extrabold text-white shadow-lg shadow-teal-900/10 hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50">{busy ? (en ? 'Creating account…' : 'खाता बनाया जा रहा है…') : (en ? 'Create student account' : 'विद्यार्थी खाता बनाएँ')}</button>}
                    </div>
                  </form>
                )}
              </div>
            )}

            {error && <p role="alert" className="mx-auto mt-4 max-w-2xl rounded-xl border border-rose-100 bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}
            {message && <p role="status" className="mx-auto mt-4 max-w-2xl rounded-xl border border-emerald-100 bg-emerald-50 p-3 text-sm text-emerald-800">{message}</p>}
            <p className="mx-auto mt-5 flex max-w-2xl items-start gap-2 border-t border-slate-200 pt-4 text-[11px] leading-relaxed text-slate-500"><ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-teal-700" />{en ? 'Your session is stored by Supabase Auth on this device. Student data access is controlled separately by database security policies.' : 'आपका session इस डिवाइस पर Supabase Auth द्वारा सुरक्षित रखा जाता है। विद्यार्थी डेटा की पहुँच अलग database security policies से नियंत्रित होगी।'}</p>
          </div>
        </main>
      </div>
    </div>
  );
};
