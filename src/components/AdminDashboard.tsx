import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  Activity, ArrowLeft, Bell, BookOpen, BookMarked, ChevronDown, ChevronRight,
  ClipboardList, FileText, GraduationCap, Headphones, LayoutDashboard, LogOut,
  Menu, Monitor, Search, Settings, Shield, ShieldCheck, Users, X, BarChart3,
  Megaphone, Database, LockKeyhole, PanelLeftClose, PanelLeftOpen
} from 'lucide-react';

type ModuleId =
  | 'overview' | 'website' | 'academic' | 'materials' | 'tests' | 'students'
  | 'reports' | 'staff' | 'communication' | 'helpdesk' | 'settings'
  | 'backup' | 'security' | 'health';

const modules: { id: ModuleId; label: string; labelHi: string; group: string; icon: React.ElementType; description: string }[] = [
  { id: 'overview', label: 'Dashboard Overview', labelHi: 'डैशबोर्ड सारांश', group: 'MAIN', icon: LayoutDashboard, description: 'Platform overview, key indicators and quick actions.' },
  { id: 'website', label: 'Website Management', labelHi: 'वेबसाइट प्रबंधन', group: 'CONTENT & ACADEMICS', icon: Monitor, description: 'Homepage, hero, banners, text, images, header, footer, design and publishing workflow.' },
  { id: 'academic', label: 'Academic Management', labelHi: 'शैक्षणिक प्रबंधन', group: 'CONTENT & ACADEMICS', icon: GraduationCap, description: 'Manage classes, courses, subjects and chapters.' },
  { id: 'materials', label: 'Study Materials', labelHi: 'अध्ययन सामग्री', group: 'CONTENT & ACADEMICS', icon: BookOpen, description: 'Manage PPT, PDF, video and notes with separate access, publish, view and download permissions.' },
  { id: 'tests', label: 'Online Test Management', labelHi: 'ऑनलाइन टेस्ट प्रबंधन', group: 'ASSESSMENT', icon: ClipboardList, description: 'Question bank, test creation, scheduling, evaluation, retests and result approval.' },
  { id: 'students', label: 'Student Management', labelHi: 'विद्यार्थी प्रबंधन', group: 'PEOPLE & REPORTS', icon: Users, description: 'Registration, profiles, class assignment and account status.' },
  { id: 'reports', label: 'Results & Reports', labelHi: 'परिणाम एवं रिपोर्ट', group: 'PEOPLE & REPORTS', icon: BarChart3, description: 'Student, test, result, material, progress and activity reports with export options.' },
  { id: 'staff', label: 'Staff & Permissions', labelHi: 'स्टाफ एवं अनुमतियाँ', group: 'PEOPLE & REPORTS', icon: ShieldCheck, description: 'Super Admin, Academic Admin, Content Manager, Teacher and Viewer roles.' },
  { id: 'communication', label: 'Communication', labelHi: 'सूचनाएँ एवं संवाद', group: 'OPERATIONS', icon: Megaphone, description: 'Announcements, class-targeted notices and in-site notifications.' },
  { id: 'helpdesk', label: 'Help Desk', labelHi: 'सहायता केंद्र', group: 'OPERATIONS', icon: Headphones, description: 'Student support tickets, replies, priority and resolution status.' },
  { id: 'settings', label: 'System Settings', labelHi: 'सिस्टम सेटिंग्स', group: 'SYSTEM & SECURITY', icon: Settings, description: 'Website status, maintenance mode, contact and SEO settings.' },
  { id: 'backup', label: 'Backup & Restore', labelHi: 'बैकअप एवं रीस्टोर', group: 'SYSTEM & SECURITY', icon: Database, description: 'Backup history, recovery status and Super Admin controlled restore.' },
  { id: 'security', label: 'Security & Activity Logs', labelHi: 'सुरक्षा एवं गतिविधि लॉग', group: 'SYSTEM & SECURITY', icon: LockKeyhole, description: 'Login history, sessions, staff activity and access protection.' },
  { id: 'health', label: 'Website Health', labelHi: 'वेबसाइट स्वास्थ्य', group: 'SYSTEM & SECURITY', icon: Activity, description: 'Website, database, authentication, backup, errors and performance status.' },
];

type Props = { onBackToWebsite: () => void; demoMode?: boolean };

export const AdminDashboard: React.FC<Props> = ({ onBackToWebsite, demoMode = false }) => {
  const { user, isAdmin, adminLoading, loading, signOut, signInWithGoogle } = useAuth();
  const [loginBusy, setLoginBusy] = useState(false);
  const [loginError, setLoginError] = useState('');
  const handleAdminLogin = async () => {
    setLoginBusy(true);
    setLoginError('');
    try {
      await signInWithGoogle();
    } catch (error) {
      setLoginError(error instanceof Error ? error.message : 'Google Admin Login विफल रहा।');
      setLoginBusy(false);
    }
  };
  const [active, setActive] = useState<ModuleId>('overview');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [query, setQuery] = useState('');
  const selected = modules.find((item) => item.id === active) ?? modules[0];
  const filtered = modules.filter((item) => (item.label + ' ' + item.labelHi).toLowerCase().includes(query.toLowerCase()));

  if (!demoMode && (loading || adminLoading)) {
    return <div className="min-h-screen grid place-items-center bg-slate-100 p-6"><div className="rounded-2xl bg-white p-8 text-center shadow-sm"><div className="mx-auto mb-3 h-8 w-8 animate-spin rounded-full border-4 border-sky-100 border-t-sky-800" /><p className="text-sm font-semibold text-slate-700">Admin access सत्यापित किया जा रहा है…</p></div></div>;
  }

  if (!demoMode && !user) {
    return <div className="min-h-screen grid place-items-center bg-slate-100 p-5"><div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm"><div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-sky-50 text-sky-900"><ShieldCheck className="h-7 w-7" /></div><h1 className="mt-5 text-2xl font-extrabold text-slate-900">Admin Login</h1><p className="mt-2 text-sm leading-6 text-slate-600">इस सुरक्षित क्षेत्र में प्रवेश के लिए अधिकृत Admin Google account से लॉगिन करें।</p><button onClick={() => void handleAdminLogin()} disabled={loginBusy} className="mt-6 w-full rounded-xl bg-sky-900 px-5 py-3 text-sm font-bold text-white hover:bg-sky-800 disabled:cursor-wait disabled:opacity-60">{loginBusy ? 'Google से जोड़ा जा रहा है…' : 'Continue with Google · Admin Login'}</button>{loginError && <p role="alert" className="mt-3 rounded-lg bg-rose-50 p-3 text-xs text-rose-700">{loginError}</p>}<p className="mt-3 text-xs leading-5 text-slate-500">केवल database में अधिकृत Admin Role वाले Google account को Dashboard access मिलेगा। Student registration यहाँ उपलब्ध नहीं है।</p><button onClick={onBackToWebsite} className="mt-3 text-sm font-semibold text-slate-600 hover:text-sky-900">← वापस वेबसाइट पर जाएँ</button></div></div>;
  }

  if (!demoMode && !isAdmin) {
    return <div className="min-h-screen grid place-items-center bg-slate-100 p-5"><div className="w-full max-w-md rounded-3xl border border-rose-100 bg-white p-8 text-center shadow-sm"><Shield className="mx-auto h-10 w-10 text-rose-600" /><h1 className="mt-4 text-xl font-extrabold text-slate-900">Admin Access नहीं मिला</h1><p className="mt-2 text-sm leading-6 text-slate-600">इस खाते को Database में Admin Role नहीं मिला है। सुरक्षा के लिए Dashboard उपलब्ध नहीं कराया गया है।</p><button onClick={onBackToWebsite} className="mt-6 rounded-xl bg-slate-900 px-5 py-3 text-sm font-bold text-white">वेबसाइट पर वापस जाएँ</button></div></div>;
  }

  return (
    <div className="min-h-screen bg-[#f4f7fb] text-slate-800">
      {sidebarOpen && <button aria-label="Close navigation overlay" onClick={() => setSidebarOpen(false)} className="fixed inset-0 z-30 bg-slate-950/40 lg:hidden" />}
      <aside className={`fixed inset-y-0 left-0 z-40 flex flex-col border-r border-slate-200 bg-white transition-all duration-200 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'} ${collapsed ? 'w-[84px]' : 'w-[278px]'}`}>
        <div className="flex h-[76px] items-center gap-3 border-b border-slate-100 px-5">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#082d65] text-white"><GraduationCap className="h-6 w-6" /></div>
          {!collapsed && <div className="min-w-0"><p className="truncate text-sm font-extrabold text-slate-900">KRISHAN SIR</p><p className="text-[10px] font-bold uppercase tracking-[.16em] text-sky-700">Admin Control Center</p></div>}
          <button onClick={() => setCollapsed(!collapsed)} className="ml-auto hidden rounded-lg p-2 text-slate-500 hover:bg-slate-100 lg:block" aria-label="Toggle sidebar">{collapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}</button>
          <button onClick={() => setSidebarOpen(false)} className="ml-auto rounded-lg p-2 text-slate-500 hover:bg-slate-100 lg:hidden" aria-label="Close sidebar"><X className="h-4 w-4" /></button>
        </div>
        <nav className="flex-1 overflow-y-auto px-3 py-4">
          {['MAIN','CONTENT & ACADEMICS','ASSESSMENT','PEOPLE & REPORTS','OPERATIONS','SYSTEM & SECURITY'].map((group) => {
            const items = filtered.filter((item) => item.group === group);
            if (!items.length) return null;
            return <div key={group} className="mb-4"><p className={`mb-2 px-3 text-[9px] font-extrabold tracking-[.16em] text-slate-400 ${collapsed ? 'text-center' : ''}`}>{collapsed ? '•' : group}</p>{items.map((item) => { const Icon = item.icon; return <button key={item.id} title={collapsed ? item.label : undefined} onClick={() => { setActive(item.id); setSidebarOpen(false); }} className={`mb-1 flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-[12px] font-semibold transition ${active === item.id ? 'bg-[#082d65] text-white shadow-sm' : 'text-slate-600 hover:bg-sky-50 hover:text-sky-900'}`}><Icon className="h-[17px] w-[17px] shrink-0" />{!collapsed && <><span className="min-w-0 flex-1">{item.label}</span>{active === item.id && <ChevronRight className="h-3.5 w-3.5" />}</>}</button>; })}</div>;
          })}
        </nav>
        <div className="border-t border-slate-100 p-3"><button onClick={onBackToWebsite} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-100"><ArrowLeft className="h-4 w-4" />{!collapsed && 'Back to Website'}</button></div>
      </aside>

      <div className={`min-h-screen transition-[padding] duration-200 ${collapsed ? 'lg:pl-[84px]' : 'lg:pl-[278px]'}`}>
        <header className="sticky top-0 z-20 flex h-[76px] items-center justify-between border-b border-slate-200 bg-white/95 px-4 backdrop-blur sm:px-7">
          <div className="flex min-w-0 items-center gap-3"><button onClick={() => setSidebarOpen(true)} className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 lg:hidden" aria-label="Open menu"><Menu className="h-5 w-5" /></button><div className="min-w-0"><p className="text-[10px] font-bold uppercase tracking-[.16em] text-sky-700">ADMIN CONTROL CENTER</p><h1 className="truncate text-base font-extrabold text-slate-900 sm:text-lg">{selected.label}</h1></div></div>
          <div className="flex items-center gap-2 sm:gap-4"><div className="hidden items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-[11px] font-semibold text-slate-500 md:flex"><ShieldCheck className="h-4 w-4 text-emerald-600" />{demoMode ? "Design Demo · No live access" : "Admin verified"}</div><button className="relative rounded-xl p-2 text-slate-500 hover:bg-slate-100" aria-label="Notifications"><Bell className="h-5 w-5" /><span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-amber-500" /></button><div className="hidden h-8 w-px bg-slate-200 sm:block" /><div className="hidden text-right sm:block"><p className="text-xs font-bold text-slate-800">{demoMode ? "Dashboard Preview" : "Super Admin"}</p><p className="max-w-[150px] truncate text-[10px] text-slate-500">{demoMode ? "Sample interface · No live data" : user?.email}</p></div>{!demoMode && <button onClick={() => void signOut()} className="rounded-xl border border-slate-200 p-2 text-slate-500 hover:border-rose-200 hover:bg-rose-50 hover:text-rose-700" title="Sign out"><LogOut className="h-4 w-4" /></button>}</div>
        </header>

        <main className="mx-auto max-w-[1600px] p-4 sm:p-7">
          {active === 'overview' ? <>
            <div className="mb-7 flex flex-col justify-between gap-3 md:flex-row md:items-end"><div><p className="text-xs font-semibold text-slate-500">Welcome to your administration workspace</p><h2 className="mt-1 text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">Platform Overview</h2><p className="mt-2 max-w-2xl text-sm text-slate-500">एक ही स्थान से Student Platform, Academic Content और Website Operations का प्रबंधन।</p></div><span className="inline-flex w-fit items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-3 py-1.5 text-[10px] font-bold text-amber-800"><Activity className="h-3.5 w-3.5" />UI Preview · Data not connected</span></div>
            <div className="mb-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{[{label:'Total Students',value:'—',icon:Users},{label:'Published Tests',value:'—',icon:ClipboardList},{label:'Study Materials',value:'—',icon:BookMarked},{label:'Pending Requests',value:'—',icon:Headphones}].map((card) => { const Icon = card.icon; return <div key={card.label} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex items-center justify-between"><span className="text-xs font-semibold text-slate-500">{card.label}</span><span className="grid h-9 w-9 place-items-center rounded-xl bg-sky-50 text-sky-900"><Icon className="h-4 w-4" /></span></div><p className="mt-4 text-3xl font-extrabold text-slate-900">{card.value}</p><p className="mt-1 text-[10px] text-slate-400">Will appear after approved data integration</p></div>; })}</div>
            <div className="grid gap-5 xl:grid-cols-[1.35fr_.85fr]"><section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6"><div className="flex items-center justify-between"><div><h3 className="text-sm font-extrabold text-slate-900">Management Modules</h3><p className="mt-1 text-xs text-slate-500">Blueprint के अनुसार सभी 14 विभाग</p></div><span className="rounded-lg bg-slate-100 px-2.5 py-1 text-[10px] font-bold text-slate-600">14 MODULES</span></div><div className="mt-5 grid gap-3 sm:grid-cols-2">{modules.filter((item) => item.id !== 'overview').map((item) => { const Icon = item.icon; return <button key={item.id} onClick={() => setActive(item.id)} className="group flex items-start gap-3 rounded-xl border border-slate-100 p-3 text-left transition hover:border-sky-200 hover:bg-sky-50/60"><span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-slate-100 text-slate-700 group-hover:bg-white group-hover:text-sky-900"><Icon className="h-4 w-4" /></span><span className="min-w-0"><span className="block text-xs font-bold text-slate-800">{item.label}</span><span className="mt-1 block text-[10px] leading-4 text-slate-500">{item.description}</span></span><ChevronRight className="ml-auto mt-1 h-3.5 w-3.5 shrink-0 text-slate-300" /></button>; })}</div></section><section className="space-y-5"><div className="rounded-2xl border border-slate-200 bg-white p-5"><h3 className="text-sm font-extrabold text-slate-900">Quick Actions</h3><p className="mt-1 text-xs text-slate-500">Common administration tasks</p><div className="mt-4 space-y-2">{[{label:'Manage Website Content',id:'website',icon:Monitor},{label:'Open Study Materials',id:'materials',icon:BookOpen},{label:'Manage Online Tests',id:'tests',icon:ClipboardList},{label:'View Student Reports',id:'reports',icon:BarChart3}].map((action) => { const Icon = action.icon; return <button key={action.id} onClick={() => setActive(action.id as ModuleId)} className="flex w-full items-center gap-3 rounded-xl border border-slate-100 px-3 py-3 text-left text-xs font-semibold text-slate-700 hover:border-sky-200 hover:bg-sky-50"><Icon className="h-4 w-4 text-sky-800" />{action.label}<ChevronRight className="ml-auto h-3.5 w-3.5 text-slate-400" /></button>; })}</div></div><div className="rounded-2xl border border-amber-200 bg-amber-50 p-5"><div className="flex items-center gap-2 text-amber-900"><Shield className="h-4 w-4" /><h3 className="text-xs font-extrabold">Safety & Approval Workflow</h3></div><p className="mt-2 text-xs leading-5 text-amber-900/80">Draft → Preview → Super Admin Approval → Publish. Live website changes केवल स्वीकृत प्रक्रिया से होंगे।</p><p className="mt-2 text-[10px] font-semibold text-amber-800">अभी कोई Database Write या Publish Action उपलब्ध नहीं है।</p></div></section></div>
          </> : <section className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8"><div className="flex items-start gap-4"><div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-sky-50 text-sky-900"><selected.icon className="h-6 w-6" /></div><div><p className="text-[10px] font-extrabold uppercase tracking-[.16em] text-sky-700">{selected.group}</p><h2 className="mt-1 text-2xl font-extrabold text-slate-900">{selected.label}</h2><p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">{selected.description}</p></div></div><div className="mt-7 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-6"><p className="text-sm font-bold text-slate-800">Module structure prepared</p><p className="mt-2 text-xs leading-5 text-slate-500">इस Module की detailed screens और backend integration अगले चरण में मौजूदा Blueprint, database structure और permissions की जाँच के बाद जोड़ी जाएँगी। अभी कोई data read/write operation या configuration change नहीं किया गया है।</p><span className="mt-4 inline-flex rounded-full bg-amber-100 px-3 py-1 text-[10px] font-bold text-amber-800">UI placeholder · Not connected</span></div><button onClick={() => setActive('overview')} className="mt-6 inline-flex items-center gap-2 text-xs font-bold text-sky-900 hover:text-sky-700"><ArrowLeft className="h-4 w-4" />Back to Overview</button></section>}
        </main>
      </div>
    </div>
  );
};
