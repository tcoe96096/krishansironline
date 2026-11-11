import React, { useState, useEffect } from 'react';
import { LanguageProvider, useLanguage } from './context/LanguageContext';
import { Header } from './components/Header';
import { AuthModal } from './components/AuthModal';
import { FloatingStudentLogin } from './components/FloatingStudentLogin';
import { StudentDashboard } from './components/StudentDashboard';
import { useAuth } from './context/AuthContext';
import { Hero } from './components/Hero';
import { NoticeBoard } from './components/NoticeBoard';
import { QuickAccessCards } from './components/QuickAccessCards';
import { ClassSelector } from './components/ClassSelector';
import { OnlineTestEngine } from './components/OnlineTestEngine';
import { StudyMaterialsView } from './components/StudyMaterialsView';
import { ConstitutionCorner } from './components/ConstitutionCorner';
import { CurrentAffairsView } from './components/CurrentAffairsView';
import { AboutTeacher } from './components/AboutTeacher';
import { ContactSection } from './components/ContactSection';
import { ResultsPortal } from './components/ResultsPortal';
import { Footer } from './components/Footer';
import { AdminDashboard } from './components/AdminDashboard';
import { SearchModal } from './components/SearchModal';
import { PageHeaderBanner } from './components/PageHeaderBanner';
import { ClassLevel } from './types';
import { TEACHER_INFO } from './data/portalData';
import {
  BookOpen,
  LayoutDashboard,
  BookMarked,
  ClipboardCheck,
  UserRound,
  ArrowUpRight,
  Award,
  FileText,
  Landmark,
  GraduationCap,
  HelpCircle,
  ArrowRight,
  Sparkles,
  ShieldCheck,
  ChevronRight,
  MessageSquare,
  Laptop,
} from 'lucide-react';

type PageId = 'home' | 'classes' | 'exams' | 'tests' | 'materials' | 'polity' | 'affairs' | 'results' | 'about' | 'contact' | 'studentDashboard' | 'admin' | 'adminPreview';

const VALID_PAGES: PageId[] = [
  'home',
  'classes',
  'exams',
  'tests',
  'materials',
  'polity',
  'affairs',
  'results',
  'about',
  'contact',
  'studentDashboard',
  'admin',
  'adminPreview',
];

interface HomeStudentSession {
  studentName: string;
  studentClass: string;
  testId?: string;
  timeLeftSeconds?: number;
}

const readHomeStudentSession = (): HomeStudentSession | null => {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem('krishan_sir_active_test_session');
    if (raw) {
      const session = JSON.parse(raw);
      const student = session?.student;
      if (student && typeof student.studentName === 'string' && typeof student.studentClass === 'string') {
        return {
          studentName: student.studentName,
          studentClass: student.studentClass,
          testId: typeof session.testId === 'string' ? session.testId : undefined,
          timeLeftSeconds: typeof session.timeLeftSeconds === 'number' ? session.timeLeftSeconds : undefined,
        };
      }
    }
    const rawStudent = localStorage.getItem('krishan_sir_active_student');
    if (rawStudent) {
      const student = JSON.parse(rawStudent);
      if (typeof student?.studentName === 'string' && typeof student?.studentClass === 'string') {
        return { studentName: student.studentName, studentClass: student.studentClass };
      }
    }
  } catch {
    return null;
  }
  return null;
};

const StudentDashboardHome: React.FC<{ onNavigate: (page: string) => void; language: string }> = ({ onNavigate, language }) => {
  const en = language === 'en';
  const [session] = useState<HomeStudentSession | null>(() => readHomeStudentSession());

  return (
    <section className="py-8 sm:py-10 bg-white border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="rounded-2xl border border-sky-200 bg-gradient-to-br from-sky-50 via-white to-indigo-50 p-5 sm:p-7 shadow-sm">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
            <div className="flex items-start gap-3">
              <div className="w-11 h-11 rounded-xl bg-sky-900 text-white flex items-center justify-center shrink-0">
                <LayoutDashboard className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xs font-bold uppercase tracking-wider text-sky-800">
                  {en ? 'Student Dashboard' : 'विद्यार्थी डैशबोर्ड'}
                </div>
                <h2 className="mt-1 text-xl sm:text-2xl font-extrabold text-slate-900">
                  {session
                    ? (en ? `Welcome back, ${session.studentName}` : `वापसी पर स्वागत है, ${session.studentName}`)
                    : (en ? 'Your Learning Space' : 'आपका अध्ययन केंद्र')}
                </h2>
                <p className="mt-1 text-sm text-slate-600 max-w-2xl">
                  {session
                    ? (en ? `Class ${session.studentClass} · Your saved test session is available on this device.` : `कक्षा ${session.studentClass} · आपकी सेव की गई टेस्ट प्रगति इस डिवाइस पर उपलब्ध है।`)
                    : (en ? 'Quick access to your classes, study notes, practice tests and results.' : 'कक्षाओं, अध्ययन नोट्स, अभ्यास टेस्ट और परिणामों तक त्वरित पहुँच।')}
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <button onClick={() => onNavigate('tests')} className="inline-flex items-center gap-2 rounded-xl bg-sky-900 px-4 py-2.5 text-sm font-bold text-white hover:bg-sky-800 transition-colors">
                <ClipboardCheck className="w-4 h-4" />
                {session ? (en ? 'Continue Tests' : 'टेस्ट जारी रखें') : (en ? 'Start Learning' : 'पढ़ाई शुरू करें')}
              </button>
              <button onClick={() => onNavigate('results')} className="inline-flex items-center gap-2 rounded-xl border border-sky-200 bg-white px-4 py-2.5 text-sm font-bold text-sky-900 hover:bg-sky-50 transition-colors">
                {en ? 'My Results' : 'मेरे परिणाम'}
                <ArrowUpRight className="w-4 h-4" />
              </button>
            </div>
          </div>
          <div className="mt-5 grid grid-cols-1 sm:grid-cols-3 gap-2">
            <button onClick={() => onNavigate('classes')} className="flex items-center gap-2 rounded-xl bg-white/90 border border-slate-200 p-3 text-left text-sm font-semibold text-slate-700 hover:border-sky-300">
              <BookOpen className="w-4 h-4 text-sky-800" />{en ? 'My Classes' : 'मेरी कक्षाएँ'}
            </button>
            <button onClick={() => onNavigate('materials')} className="flex items-center gap-2 rounded-xl bg-white/90 border border-slate-200 p-3 text-left text-sm font-semibold text-slate-700 hover:border-sky-300">
              <BookMarked className="w-4 h-4 text-sky-800" />{en ? 'Study Materials' : 'अध्ययन सामग्री'}
            </button>
            <button onClick={() => onNavigate('tests')} className="flex items-center gap-2 rounded-xl bg-white/90 border border-slate-200 p-3 text-left text-sm font-semibold text-slate-700 hover:border-sky-300">
              <ClipboardCheck className="w-4 h-4 text-sky-800" />{en ? 'Practice & Mock Tests' : 'अभ्यास एवं मॉक टेस्ट'}
            </button>
          </div>
          <p className="mt-3 text-[11px] text-slate-500">
            {en ? 'Dashboard shortcuts use the existing learning portal and locally saved test progress; they do not create a separate student account.' : 'डैशबोर्ड मौजूदा पोर्टल और इस डिवाइस पर सेव टेस्ट प्रगति का उपयोग करता है; यह अलग विद्यार्थी अकाउंट नहीं बनाता।'}
          </p>
        </div>
      </div>
    </section>
  );
};

const MainApp: React.FC = () => {
  const { language, t } = useLanguage();
  const { user, profile } = useAuth();
  const basePath = import.meta.env.BASE_URL.replace(/\/$/, '');
  
  // Support clean SEO URLs and legacy hash links.
  const pathToPage: Record<string, PageId> = {
    '/': 'home',
    '/classes': 'classes',
    '/all-exams': 'exams',
    '/online-tests': 'tests',
    '/study-materials': 'materials',
    '/constitution': 'polity',
    '/current-affairs': 'affairs',
    '/results': 'results',
    '/about': 'about',
    '/contact': 'contact',
    '/student-dashboard': 'studentDashboard',
    '/admin': 'admin',
    '/admin-preview': 'adminPreview',
  };
  const pageToPath: Record<PageId, string> = {
    home: '/', classes: '/classes/', exams: '/all-exams/', tests: '/online-tests/',
    materials: '/study-materials/',
    polity: '/constitution/', affairs: '/current-affairs/',
    results: '/results/', about: '/about/', contact: '/contact/', studentDashboard: '/student-dashboard/', admin: '/admin/', adminPreview: '/admin-preview/',
  };
  const readPageFromLocation = (): PageId => {
    const pathname = window.location.pathname;
    const appPath = basePath && pathname.startsWith(basePath) ? pathname.slice(basePath.length) || '/' : pathname;
    const path = appPath.replace(/\/+$/, '') || '/';
    const fromPath = pathToPage[path];
    if (fromPath) return fromPath;
    const hash = window.location.hash.replace('#', '') as PageId;
    return VALID_PAGES.includes(hash) ? hash : 'home';
  };
  const [activePage, setActivePage] = useState<PageId>(() =>
    typeof window !== 'undefined' ? readPageFromLocation() : 'home'
  );

  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [selectedClassForMaterials, setSelectedClassForMaterials] = useState<ClassLevel>('9');


  // Handle browser back/forward navigation for clean page URLs.
  useEffect(() => {
    const handleLocationChange = () => setActivePage(readPageFromLocation());
    window.addEventListener('popstate', handleLocationChange);
    window.addEventListener('hashchange', handleLocationChange);
    return () => {
      window.removeEventListener('popstate', handleLocationChange);
      window.removeEventListener('hashchange', handleLocationChange);
    };
  }, []);

  const navigateTo = (pageId: string, filterClass?: string) => {
    if (filterClass && ['6', '7', '8', '9', '10', '11', '12'].includes(filterClass)) {
      setSelectedClassForMaterials(filterClass as ClassLevel);
    }

    if (pageId === 'notices') {
      setActivePage('home');
      const homePath = `${basePath}/`;
      if (window.location.pathname !== homePath) window.history.pushState(null, '', homePath);
      setTimeout(() => document.getElementById('notices')?.scrollIntoView({ behavior: 'smooth' }), 50);
      return;
    }

    const targetPage = VALID_PAGES.includes(pageId as PageId) ? (pageId as PageId) : 'home';
    setActivePage(targetPage);
    const targetPath = `${basePath}${pageToPath[targetPage]}`;
    if (window.location.pathname !== targetPath) window.history.pushState(null, '', targetPath);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleClassAction = (classLevel: ClassLevel, action: 'materials' | 'tests') => {
    navigateTo(action, classLevel);
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-800">
      {/* Top Header with navigation to all pages */}
      {activePage !== 'admin' && activePage !== 'adminPreview' && <Header
        activeSection={activePage}
        onNavigate={navigateTo}
        onOpenSearch={() => setIsSearchOpen(true)}
        onOpenAuth={() => setIsAuthOpen(true)}
      />}

      {/* Main Dedicated Page Routing */}
      <main className="flex-1">
        {activePage === 'studentDashboard' && (user && profile ? <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8"><StudentDashboard /></div> : <div className="mx-auto max-w-3xl px-4 py-16 text-center"><h2 className="text-xl font-extrabold text-slate-900">विद्यार्थी लॉगिन आवश्यक है</h2><p className="mt-2 text-sm text-slate-600">अपना Student Account खोलने के लिए लॉगिन करें।</p><button onClick={() => setIsAuthOpen(true)} className="mt-5 rounded-xl bg-sky-900 px-5 py-3 text-sm font-bold text-white">Student Login</button></div>)}
        {activePage === 'admin' && <AdminDashboard onBackToWebsite={() => navigateTo('home')} />}
        {activePage === 'adminPreview' && <AdminDashboard demoMode onBackToWebsite={() => navigateTo('home')} />}
        {/* ==================== PAGE 1: HOME ==================== */}
        {activePage === 'home' && (
          <div className="space-y-0">
            {/* Hero Banner with Quick Actions */}
            <Hero onNavigate={navigateTo} />

            {/* Latest Announcements & Notice Board */}
            <div id="notices">
              <NoticeBoard onNavigate={navigateTo} />
            </div>

            {/* Student Dashboard: personalized shortcuts and saved test-session entry */}
            <StudentDashboardHome onNavigate={navigateTo} language={language} />

            {/* 8 Quick Access Cards to Dedicated Pages */}
            <QuickAccessCards onNavigate={navigateTo} />

            {/* Courses showcase: subject and exam pathways */}
            <section className="py-12 bg-slate-50 border-b border-slate-200">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 mb-7">
                  <div>
                    <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-sky-800 mb-2">
                      <BookMarked className="w-4 h-4" />
                      <span>{language === 'en' ? 'Learning Pathways' : 'अध्ययन पाठ्यक्रम'}</span>
                    </div>
                    <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 font-display">
                      {language === 'en' ? 'Explore Classes & Courses' : 'कक्षाएँ एवं पाठ्यक्रम चुनें'}
                    </h2>
                    <p className="mt-1 text-sm text-slate-600">
                      {language === 'en' ? 'Choose a learning path and move directly to the relevant resources.' : 'अपना अध्ययन क्षेत्र चुनें और संबंधित सामग्री तक सीधे पहुँचें।'}
                    </p>
                  </div>
                  <button onClick={() => navigateTo('classes')} className="inline-flex items-center gap-1.5 text-xs font-bold text-sky-900 hover:text-sky-700">
                    {language === 'en' ? 'View all classes' : 'सभी कक्षाएँ देखें'} <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                  {[
                    { title: language === 'en' ? 'School Learning · Classes 6–12' : 'विद्यालयी शिक्षा · कक्षा 6–12', detail: language === 'en' ? 'Class-wise syllabus, chapter notes and learning resources.' : 'कक्षावार पाठ्यक्रम, अध्यायवार नोट्स और अध्ययन सामग्री।', icon: BookOpen, action: 'classes', tone: 'sky' },
                    { title: language === 'en' ? 'Social Science' : 'सामाजिक विज्ञान', detail: language === 'en' ? 'History, Geography, Political Science and Economics.' : 'इतिहास, भूगोल, राजनीति विज्ञान और अर्थशास्त्र।', icon: Landmark, action: 'materials', tone: 'teal' },
                    { title: language === 'en' ? 'Indian Constitution' : 'भारतीय संविधान', detail: language === 'en' ? 'Constitutional articles, rights, institutions and polity.' : 'संवैधानिक अनुच्छेद, अधिकार, संस्थाएँ और राजव्यवस्था।', icon: ShieldCheck, action: 'polity', tone: 'amber' },
                    { title: language === 'en' ? 'Competitive Exams' : 'प्रतियोगी परीक्षाएँ', detail: language === 'en' ? 'UGC NET, HTET, CTET and teacher recruitment practice.' : 'UGC NET, HTET, CTET और शिक्षक भर्ती परीक्षा अभ्यास।', icon: GraduationCap, action: 'exams', tone: 'indigo' },
                  ].map((course) => (
                    <button key={course.title} onClick={() => navigateTo(course.action)} className="group text-left rounded-2xl border border-slate-200 bg-white p-5 shadow-xs hover:-translate-y-1 hover:border-sky-300 hover:shadow-md transition-all">
                      <div className="flex items-start justify-between gap-3">
                        <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-sky-50 text-sky-900 group-hover:bg-sky-900 group-hover:text-white transition-colors">
                          <course.icon className="w-5 h-5" />
                        </span>
                        <ArrowUpRight className="w-4 h-4 text-slate-400 group-hover:text-sky-800" />
                      </div>
                      <h3 className="mt-4 text-base font-extrabold text-slate-900">{course.title}</h3>
                      <p className="mt-2 text-sm leading-relaxed text-slate-600">{course.detail}</p>
                      <span className="mt-4 inline-flex items-center gap-1 text-xs font-bold text-sky-900">
                        {language === 'en' ? 'Explore pathway' : 'अध्ययन सामग्री देखें'} <ChevronRight className="w-3.5 h-3.5" />
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </section>

            {/* Home Showcase: Classes 6 to 12 Quick Jump */}
            <section className="py-12 bg-white border-b border-slate-200">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
                  <div>
                    <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-sky-800 mb-2">
                      <BookOpen className="w-4 h-4" />
                      <span>{language === 'en' ? 'Class-wise Portal' : 'कक्षावार अध्ययन पोर्टल'}</span>
                    </div>
                    <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 font-display">
                      {language === 'en' ? 'Explore by Class (6 to 12)' : 'अपनी कक्षा चुनें (6 से 12)'}
                    </h2>
                    <p className="mt-1 text-sm text-slate-600 max-w-2xl">
                      {language === 'en'
                        ? 'Jump directly into your syllabus, chapter notes, and online tests.'
                        : 'सीधे अपने पाठ्यक्रम, अध्यायवार नोट्स और ऑनलाइन टेस्ट तक पहुंचें।'}
                    </p>
                  </div>

                  <button
                    onClick={() => navigateTo('classes')}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-sky-900 text-white text-xs font-semibold hover:bg-sky-800 transition-colors shadow-xs self-start md:self-auto"
                  >
                    <span>{language === 'en' ? 'View Full Curriculum Page' : 'पूरा पाठ्यक्रम पृष्ठ देखें'}</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
                  {(['6', '7', '8', '9', '10', '11', '12'] as ClassLevel[]).map((lvl) => (
                    <div
                      key={lvl}
                      className="group bg-slate-50 hover:bg-sky-50 border border-slate-200 hover:border-sky-300 rounded-xl p-4 transition-all text-center flex flex-col justify-between"
                    >
                      <div>
                        <div className="w-9 h-9 mx-auto rounded-lg bg-sky-900 text-white flex items-center justify-center font-bold text-sm mb-2 shadow-2xs group-hover:scale-105 transition-transform">
                          {lvl}
                        </div>
                        <div className="text-xs font-bold text-slate-900">
                          {language === 'en' ? `Class ${lvl}` : `कक्षा ${lvl}`}
                        </div>
                        <div className="text-[10px] text-slate-500 mt-0.5">
                          {lvl === '10' ? 'Board Exam' : lvl === '12' ? 'Sr. Secondary' : 'Social Science'}
                        </div>
                      </div>

                      <div className="mt-3 pt-2 border-t border-slate-200/70 flex flex-col gap-1">
                        <button
                          onClick={() => handleClassAction(lvl, 'materials')}
                          className="w-full py-1 text-[11px] font-semibold text-sky-800 hover:text-sky-950 hover:underline"
                        >
                          {language === 'en' ? 'Notes' : 'नोट्स'}
                        </button>
                        <button
                          onClick={() => handleClassAction(lvl, 'tests')}
                          className="w-full py-1 text-[11px] font-semibold text-amber-800 hover:text-amber-950 hover:underline"
                        >
                          {language === 'en' ? 'Tests' : 'टेस्ट'}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            {/* Special Learning Hubs */}
            <section className="py-12 bg-slate-100/70 border-b border-slate-200">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="text-center max-w-3xl mx-auto mb-8">
                  <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-sky-800 mb-2"><Sparkles className="w-4 h-4" /><span>{language === 'en' ? 'Special Learning Hubs' : 'विशेष अध्ययन केंद्र'}</span></div>
                  <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 font-display">{language === 'en' ? 'Focused Learning & Exam Preparation' : 'विशेष अध्ययन एवं परीक्षा तैयारी'}</h2>
                  <p className="mt-2 text-sm text-slate-600">{language === 'en' ? 'Explore current knowledge and prepare systematically for competitive examinations.' : 'समसामयिक ज्ञान प्राप्त करें और प्रतियोगी परीक्षाओं की व्यवस्थित तैयारी करें।'}</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-5xl mx-auto">
                  <div className="bg-white rounded-2xl p-6 sm:p-7 border border-slate-200 shadow-xs flex flex-col justify-between">
                    <div><div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-sky-50 text-sky-800 text-xs font-bold border border-sky-200 mb-3"><Sparkles className="w-3.5 h-3.5" /><span>{language === 'en' ? 'Learning Hub 01' : 'अध्ययन केंद्र 01'}</span></div>
                    <h3 className="text-xl font-extrabold text-slate-900 mb-2 font-display">{language === 'en' ? 'Current Affairs & General Awareness' : 'करेंट अफेयर्स एवं सामान्य जागरूकता'}</h3>
                    <p className="text-sm text-slate-600 leading-relaxed">{language === 'en' ? 'National and international developments, Haryana updates, government schemes, reports, indices, and exam-relevant general knowledge.' : 'राष्ट्रीय एवं अंतरराष्ट्रीय घटनाक्रम, हरियाणा की खबरें, सरकारी योजनाएँ, रिपोर्ट, सूचकांक और परीक्षा उपयोगी सामान्य ज्ञान।'}</p></div>
                    <button onClick={() => navigateTo('affairs')} className="mt-6 pt-4 border-t border-slate-100 inline-flex items-center gap-2 text-xs font-bold text-sky-900 hover:text-sky-700"><span>{language === 'en' ? 'Explore Current Affairs' : 'करेंट अफेयर्स देखें'}</span><ArrowRight className="w-3.5 h-3.5" /></button>
                  </div>
                  <div className="bg-white rounded-2xl p-6 sm:p-7 border border-slate-200 shadow-xs flex flex-col justify-between">
                    <div><div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 text-amber-900 text-xs font-bold border border-amber-200 mb-3"><GraduationCap className="w-3.5 h-3.5" /><span>{language === 'en' ? 'Learning Hub 02' : 'अध्ययन केंद्र 02'}</span></div>
                    <h3 className="text-xl font-extrabold text-slate-900 mb-2 font-display">{language === 'en' ? 'Competitive Exam Preparation' : 'प्रतियोगी परीक्षा तैयारी'}</h3>
                    <p className="text-sm text-slate-600 leading-relaxed">{language === 'en' ? 'Focused preparation for UGC NET Political Science, UGC NET Education, HTET, CTET, and teacher recruitment examinations through study resources and practice tests.' : 'यूजीसी नेट राजनीति विज्ञान, यूजीसी नेट शिक्षा, एचटेट, सीटीईटी और शिक्षक भर्ती परीक्षाओं के लिए अध्ययन सामग्री एवं अभ्यास टेस्ट।'}</p></div>
                    <button onClick={() => navigateTo('exams')} className="mt-6 pt-4 border-t border-slate-100 inline-flex items-center gap-2 text-xs font-bold text-sky-900 hover:text-sky-700"><span>{language === 'en' ? 'Explore All Exams' : 'सभी परीक्षाएँ देखें'}</span><ArrowRight className="w-3.5 h-3.5" /></button>
                  </div>
                </div>
              </div>
            </section>

            {/* Meet Your Teacher: compact homepage introduction; full profile remains on About page */}
            <section className="py-12 bg-white border-b border-slate-200">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="rounded-2xl border border-slate-200 bg-gradient-to-r from-white via-sky-50/70 to-white p-5 sm:p-7 shadow-sm">
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
                    <div className="md:col-span-4">
                      <div className="relative mx-auto max-w-[260px] aspect-[4/3] sm:aspect-square overflow-hidden rounded-2xl border border-slate-200 bg-slate-100 shadow-sm">
                        <img
                          src={`${import.meta.env.BASE_URL}images/krishan-sir.png`}
                          alt="Krishan Kumar – TGT Social Science"
                          loading="lazy"
                          className="h-full w-full object-cover object-[24%_28%]"
                        />
                        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-slate-950/85 to-transparent px-4 pb-3 pt-8 text-white">
                          <div className="font-extrabold">Krishan Kumar</div>
                          <div className="text-xs text-amber-300">{TEACHER_INFO.designation}</div>
                        </div>
                      </div>
                    </div>
                    <div className="md:col-span-8">
                      <div className="inline-flex items-center gap-1.5 text-xs font-bold text-sky-800 mb-2">
                        <UserRound className="w-4 h-4" />
                        {language === 'en' ? 'Meet Your Teacher' : 'अपने शिक्षक से मिलें'}
                      </div>
                      <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 font-display">
                        {language === 'en' ? 'Learn with Krishan Sir' : 'कृष्ण सर के साथ सीखें'}
                      </h2>
                      <p className="mt-2 text-sm sm:text-base text-slate-600 leading-relaxed">
                        {language === 'en'
                          ? 'TGT Social Science and dedicated educator focused on conceptual clarity, bilingual learning and meaningful exam preparation.'
                          : 'टीजीटी सामाजिक विज्ञान शिक्षक; वैचारिक स्पष्टता, द्विभाषी अध्ययन और प्रभावी परीक्षा तैयारी पर विशेष ध्यान।'}
                      </p>
                      <div className="mt-4 flex flex-wrap gap-2">
                        {['M.A. Political Science', 'M.Phil.', 'UGC NET – Political Science (2×)', 'UGC NET – Education', 'B.Ed. • M.Ed.', 'CTET • HTET'].map((item) => (
                          <span key={item} className="rounded-lg border border-sky-100 bg-white px-2.5 py-1.5 text-[11px] font-semibold text-slate-700">{item}</span>
                        ))}
                      </div>
                      <div className="mt-5 flex flex-wrap items-center gap-3">
                        <button onClick={() => navigateTo('about')} className="inline-flex items-center gap-2 rounded-xl bg-sky-900 px-4 py-2.5 text-sm font-bold text-white hover:bg-sky-800 transition-colors">
                          {language === 'en' ? 'View Full Teacher Profile' : 'शिक्षक का पूरा परिचय देखें'} <ArrowRight className="w-4 h-4" />
                        </button>
                        <span className="text-xs text-slate-500">{TEACHER_INFO.school}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </section>


            {/* Home Doubts CTA Banner */}
            <section className="py-10 bg-sky-900 text-white">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-6">
                <div>
                  <div className="flex items-center gap-2 text-amber-300 text-xs font-bold mb-1">
                    <MessageSquare className="w-4 h-4" />
                    <span>{language === 'en' ? 'Student Doubt Desk' : 'विद्यार्थी शंका समाधान केंद्र'}</span>
                  </div>
                  <h3 className="text-xl sm:text-2xl font-bold font-display">
                    {language === 'en' ? 'Have a Question or Exam Doubt?' : 'क्या आपको किसी पाठ में कोई शंका है?'}
                  </h3>
                  <p className="text-slate-300 text-xs sm:text-sm mt-1 max-w-xl">
                    {language === 'en'
                      ? 'Submit your academic query directly to Krishan Sir and receive personalized guidance for your studies.'
                      : 'अपना प्रश्न सीधे कृष्ण सर को भेजें और अपनी परीक्षा तैयारी में व्यक्तिगत मार्गदर्शन पाएं।'}
                  </p>
                </div>
                <button
                  onClick={() => navigateTo('contact')}
                  className="px-6 py-3 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs shadow-md transition-all shrink-0"
                >
                  {language === 'en' ? 'Ask Doubt / Contact Now' : 'शंका पूछें / संपर्क करें'}
                </button>
              </div>
            </section>
          </div>
        )}

        {/* ==================== PAGE 2: CLASSES (कक्षा 6 से 12) ==================== */}
        {activePage === 'classes' && (
          <div>
            <PageHeaderBanner
              titleEn="Classes 6 to 12 Curriculum & Learning Hub"
              titleHi="कक्षा 6 से 12 – पाठ्यक्रम एवं अध्ययन केंद्र"
              subtitleEn="Explore NCERT, Haryana Board (HBSE), and CBSE aligned Social Science chapters, textbooks, and interactive test modules for every class."
              subtitleHi="कक्षा 6 से 12 के लिए एनसीईआरटी, हरियाणा बोर्ड (HBSE) और सीबीएसई पाठ्यक्रम आधारित अध्याय, नोट्स और ऑनलाइन टेस्ट।"
              badgeEn="Curriculum Architecture"
              badgeHi="कक्षावार पाठ्यक्रम"
              icon={BookOpen}
              onBackHome={() => navigateTo('home')}
            />
            <ClassSelector onSelectClassAction={handleClassAction} />
          </div>
        )}

        {/* ==================== PAGE 3: ONLINE TESTS (ऑनलाइन टेस्ट) ==================== */}
        {activePage === 'exams' && (
          <div>
            <PageHeaderBanner
              titleEn="All Competitive Exams & Preparation Hub"
              titleHi="सभी प्रतियोगी परीक्षाएँ एवं तैयारी केंद्र"
              subtitleEn="Explore exam-wise preparation pathways, core syllabus areas and study resources for teaching and competitive examinations."
              subtitleHi="शिक्षक भर्ती एवं प्रतियोगी परीक्षाओं के लिए परीक्षा-वार तैयारी, प्रमुख पाठ्यक्रम और अध्ययन सामग्री।"
              badgeEn="All Exams"
              badgeHi="सभी परीक्षाएँ"
              icon={GraduationCap}
              onBackHome={() => navigateTo('home')}
            />

            <section className="bg-[#f4f8fc] py-8 sm:py-10 border-b border-slate-200">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="max-w-3xl mb-6">
                  <p className="text-[10px] sm:text-xs font-extrabold tracking-[.16em] uppercase text-[#087d9b]">{language === 'en' ? 'Exam-wise learning tracks' : 'परीक्षा-वार अध्ययन सामग्री'}</p>
                  <h2 className="mt-1 text-xl sm:text-2xl font-extrabold text-[#102f63]">{language === 'en' ? 'Choose Your Examination' : 'अपनी परीक्षा चुनें'}</h2>
                  <p className="mt-2 text-xs sm:text-sm leading-relaxed text-slate-600">{language === 'en' ? 'Start with the syllabus areas below, then use the study-material library and online test simulator for structured practice.' : 'नीचे दिए गए पाठ्यक्रम क्षेत्रों से तैयारी शुरू करें और व्यवस्थित अभ्यास के लिए अध्ययन सामग्री तथा ऑनलाइन टेस्ट का उपयोग करें।'}</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                  {[
                    { title: 'UGC NET – Political Science', hi: 'UGC NET – राजनीति विज्ञान', topics: 'Political Theory • Indian Government • Comparative Politics • International Relations • Public Administration • Political Thought', topicsHi: 'राजनीतिक सिद्धांत • भारतीय शासन • तुलनात्मक राजनीति • अंतरराष्ट्रीय संबंध • लोक प्रशासन • राजनीतिक चिंतन' },
                    { title: 'UGC NET – Education', hi: 'UGC NET – शिक्षा', topics: 'Educational Philosophy • Psychology • Research & Statistics • Curriculum • Teacher Education • Educational Management', topicsHi: 'शिक्षा दर्शन • मनोविज्ञान • शोध एवं सांख्यिकी • पाठ्यचर्या • शिक्षक शिक्षा • शैक्षिक प्रबंधन' },
                    { title: 'HTET – PRT / TGT / PGT', hi: 'HTET – PRT / TGT / PGT', topics: 'Child Development • Pedagogy • Hindi & English • Reasoning • Haryana GK • Subject Knowledge', topicsHi: 'बाल विकास • शिक्षाशास्त्र • हिंदी एवं अंग्रेज़ी • तर्कशक्ति • हरियाणा सामान्य ज्ञान • विषय ज्ञान' },
                    { title: 'CTET – Paper I & II', hi: 'CTET – पेपर I एवं II', topics: 'Child Development • Learning & Pedagogy • Language I & II • Mathematics • Environmental Studies • Social Studies', topicsHi: 'बाल विकास • अधिगम एवं शिक्षाशास्त्र • भाषा I एवं II • गणित • पर्यावरण अध्ययन • सामाजिक अध्ययन' },
                    { title: 'UPSC / HPSC – General Studies', hi: 'UPSC / HPSC – सामान्य अध्ययन', topics: 'Indian History • Geography • Constitution • Economy • Environment • Science & Technology • Current Affairs', topicsHi: 'भारतीय इतिहास • भूगोल • संविधान • अर्थव्यवस्था • पर्यावरण • विज्ञान एवं प्रौद्योगिकी • समसामयिकी' },
                    { title: 'TGT Social Science Recruitment', hi: 'TGT सामाजिक विज्ञान भर्ती', topics: 'History • Geography • Political Science • Economics • Haryana GK • Teaching Aptitude • School Pedagogy', topicsHi: 'इतिहास • भूगोल • राजनीति विज्ञान • अर्थशास्त्र • हरियाणा सामान्य ज्ञान • शिक्षण अभिरुचि • विद्यालयी शिक्षाशास्त्र' },
                  ].map((exam, index) => (
                    <article key={exam.title} className="rounded-2xl border border-[#dce7f2] bg-white p-5 shadow-sm hover:shadow-md transition-shadow">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#eaf4fb] text-[#0b3979]"><GraduationCap className="h-5 w-5" /></div>
                        <span className="rounded-full bg-[#f1f6fb] px-2.5 py-1 text-[10px] font-bold text-[#315779]">0{index + 1}</span>
                      </div>
                      <h3 className="mt-3 text-base font-extrabold leading-snug text-[#12396f]">{language === 'en' ? exam.title : exam.hi}</h3>
                      <p className="mt-2 text-[11px] sm:text-xs leading-relaxed text-slate-600">{language === 'en' ? exam.topics : exam.topicsHi}</p>
                      <div className="mt-4 flex flex-wrap gap-2 border-t border-slate-100 pt-3">
                        <button onClick={() => navigateTo('materials')} className="inline-flex items-center gap-1 rounded-lg bg-[#0b3979] px-3 py-2 text-[10px] font-bold text-white hover:bg-[#124887]"><FileText className="h-3.5 w-3.5" />{language === 'en' ? 'Study Material' : 'अध्ययन सामग्री'}</button>
                        <button onClick={() => navigateTo('tests')} className="inline-flex items-center gap-1 rounded-lg border border-[#d5e2ee] px-3 py-2 text-[10px] font-bold text-[#12396f] hover:bg-slate-50"><Laptop className="h-3.5 w-3.5" />{language === 'en' ? 'Practice Tests' : 'अभ्यास टेस्ट'}</button>
                      </div>
                    </article>
                  ))}
                </div>
              </div>
            </section>

          </div>
        )}

        {activePage === 'tests' && (
          <div>
            <PageHeaderBanner
              titleEn="Online Tests & Practice Portal"
              titleHi="ऑनलाइन टेस्ट एवं अभ्यास पोर्टल"
              subtitleEn="Attempt available online tests and practice questions with the dedicated test engine."
              subtitleHi="समर्पित टेस्ट पोर्टल के माध्यम से उपलब्ध ऑनलाइन टेस्ट एवं अभ्यास प्रश्न हल करें।"
              badgeEn="Tests & Practice"
              badgeHi="टेस्ट एवं अभ्यास"
              icon={Laptop}
              onBackHome={() => navigateTo('home')}
            />
            <OnlineTestEngine initialClassFilter={selectedClassForMaterials} onRequestLogin={() => setIsAuthOpen(true)} />
          </div>
        )}

        {/* ==================== PAGE 4: STUDY MATERIALS (अध्ययन सामग्री) ==================== */}
        {activePage === 'materials' && (
          <div>
            <PageHeaderBanner
              titleEn="Chapter-wise Study Materials & Notes"
              titleHi="अध्यायवार अध्ययन सामग्री एवं नोट्स"
              subtitleEn="Curated NCERT revision notes, summary points, key terms, and printable PDF documents prepared by Krishan Sir."
              subtitleHi="कृष्ण सर द्वारा तैयार संक्षिप्त रिवीजन नोट्स, महत्वपूर्ण बिंदु, शब्दावली और अध्ययन सामग्री।"
              badgeEn="NCERT & HBSE Syllabus"
              badgeHi="एनसीईआरटी व एचबीएसई नोट्स"
              icon={FileText}
              onBackHome={() => navigateTo('home')}
            />
            <StudyMaterialsView initialClass={selectedClassForMaterials} />
          </div>
        )}

        {/* ==================== PAGE 6: POLITY & CONSTITUTION (संविधान / राजनीति) ==================== */}
        {activePage === 'polity' && (
          <div>
            <PageHeaderBanner
              titleEn="Indian Constitution & Political Science Corner"
              titleHi="भारतीय संविधान एवं राजनीति विज्ञान केंद्र"
              subtitleEn="Interactive Preamble explorer, Fundamental Rights, Articles, Democratic Politics, and General Civic Awareness."
              subtitleHi="संविधान की प्रस्तावना, मौलिक अधिकार, महत्वपूर्ण अनुच्छेद, लोकतांत्रिक राजनीति और नागरिक जागरूकता।"
              badgeEn="Civics & Constitutional Law"
              badgeHi="संविधान व नागरिक शास्त्र"
              icon={Landmark}
              onBackHome={() => navigateTo('home')}
            />
            <ConstitutionCorner onStartQuiz={() => navigateTo('tests')} />
            <CurrentAffairsView />
          </div>
        )}

        {/* ==================== CURRENT AFFAIRS PAGE ==================== */}
        {activePage === 'affairs' && (
          <div>
            <PageHeaderBanner
              titleEn="Current Affairs & General Awareness"
              titleHi="करेंट अफेयर्स एवं सामान्य जागरूकता"
              subtitleEn="Educational current affairs updates for school and competitive examination preparation."
              subtitleHi="विद्यालयी एवं प्रतियोगी परीक्षाओं की तैयारी के लिए शैक्षणिक करेंट अफेयर्स।"
              badgeEn="Current Affairs"
              badgeHi="करेंट अफेयर्स"
              icon={Sparkles}
              onBackHome={() => navigateTo('home')}
            />
            <CurrentAffairsView />
          </div>
        )}

        {/* ==================== RESULTS PAGE ==================== */}
        {activePage === 'results' && (
          <div>
            <PageHeaderBanner
              titleEn="Student Results Portal"
              titleHi="विद्यार्थी परीक्षा परिणाम पोर्टल"
              subtitleEn="Access verified student assessment results when authorized result data is available."
              subtitleHi="अधिकृत परिणाम डेटा उपलब्ध होने पर विद्यार्थियों के सत्यापित परीक्षा परिणाम देखें।"
              badgeEn="Results & Assessment"
              badgeHi="परिणाम एवं मूल्यांकन"
              icon={Award}
              onBackHome={() => navigateTo('home')}
            />
            <ResultsPortal />
          </div>
        )}

        {/* ==================== PAGE 7: ABOUT TEACHER (शिक्षक परिचय) ==================== */}
        {activePage === 'about' && (
          <div>
            <PageHeaderBanner
              titleEn="About Educator – Krishan Kumar (Krishan Sir)"
              titleHi="शिक्षक परिचय – श्री कृष्ण कुमार (कृष्ण सर)"
              subtitleEn="TGT Social Science at Government Girls High School (GGHS), Dhanger, Fatehabad (Haryana). Educational credentials, teaching journey, and mission."
              subtitleHi="टीजीटी सामाजिक विज्ञान, राजकीय कन्या उच्च विद्यालय (GGHS), ढांगर, फतेहाबाद (हरियाणा)। शैक्षणिक योग्यताएं एवं शिक्षण अनुभव।"
              badgeEn="Verified Govt Educator"
              badgeHi="प्रमाणित शिक्षक परिचय"
              icon={GraduationCap}
              onBackHome={() => navigateTo('home')}
            />
            <AboutTeacher />
          </div>
        )}

        {/* ==================== PAGE 8: CONTACT & DOUBTS (संपर्क एवं शंका समाधान) ==================== */}
        {activePage === 'contact' && (
          <div>
            <PageHeaderBanner
              titleEn="Contact & Student Doubt Clearance Desk"
              titleHi="संपर्क एवं विद्यार्थी शंका समाधान केंद्र"
              subtitleEn="Submit your academic questions directly to Krishan Sir, view school location at GGHS Dhanger, and read student FAQs."
              subtitleHi="अपने शैक्षणिक प्रश्न सीधे कृष्ण सर से पूछें, विद्यालय का पता देखें और महत्वपूर्ण प्रश्नोत्तर पढ़ें।"
              badgeEn="Doubt Desk & School Contact"
              badgeHi="शंका समाधान व संपर्क"
              icon={HelpCircle}
              onBackHome={() => navigateTo('home')}
            />
            <ContactSection />
          </div>
        )}

        {/* Explore Other Pages Bottom Ribbon (shown on all dedicated subpages) */}
        {activePage !== 'home' && activePage !== 'admin' && activePage !== 'adminPreview' && (
          <div className="py-8 bg-slate-100 border-t border-slate-200">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <span className="text-xs font-semibold text-slate-600">
                  {language === 'en' ? 'Quick Switch to Other Portal Pages:' : 'अन्य पृष्ठों पर त्वरित जाएं:'}
                </span>
                <div className="flex flex-wrap items-center justify-center gap-2">
                  <button
                    onClick={() => navigateTo('home')}
                    className="px-3 py-1.5 rounded-lg bg-white hover:bg-slate-200 text-slate-800 text-xs font-semibold border border-slate-200 transition-colors"
                  >
                    {t('nav.home')}
                  </button>
                  <button
                    onClick={() => navigateTo('classes')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
                      activePage === 'classes' ? 'bg-sky-900 text-white border-sky-900' : 'bg-white hover:bg-slate-200 text-slate-800 border-slate-200'
                    }`}
                  >
                    {t('nav.classes')}
                  </button>
                  <button
                    onClick={() => navigateTo('tests')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
                      activePage === 'tests' ? 'bg-sky-900 text-white border-sky-900' : 'bg-white hover:bg-slate-200 text-slate-800 border-slate-200'
                    }`}
                  >
                    {t('nav.tests')}
                  </button>
                  <button
                    onClick={() => navigateTo('materials')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
                      activePage === 'materials' ? 'bg-sky-900 text-white border-sky-900' : 'bg-white hover:bg-slate-200 text-slate-800 border-slate-200'
                    }`}
                  >
                    {t('nav.materials')}
                  </button>
                  <button
                    onClick={() => navigateTo('exams')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
                      activePage === 'exams' ? 'bg-sky-900 text-white border-sky-900' : 'bg-white hover:bg-slate-200 text-slate-800 border-slate-200'
                    }`}
                  >
                    {language === 'en' ? 'All Exams' : 'सभी परीक्षाएं'}
                  </button>
                  <button
                    onClick={() => navigateTo('affairs')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${activePage === 'affairs' ? 'bg-sky-900 text-white border-sky-900' : 'bg-white hover:bg-slate-200 text-slate-800 border-slate-200'}`}
                  >
                    {language === 'en' ? 'Current Affairs' : 'करेंट अफेयर्स'}
                  </button>

                  <button
                    onClick={() => navigateTo('about')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
                      activePage === 'about' ? 'bg-sky-900 text-white border-sky-900' : 'bg-white hover:bg-slate-200 text-slate-800 border-slate-200'
                    }`}
                  >
                    {t('nav.about')}
                  </button>
                  <button
                    onClick={() => navigateTo('contact')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
                      activePage === 'contact' ? 'bg-sky-900 text-white border-sky-900' : 'bg-white hover:bg-slate-200 text-slate-800 border-slate-200'
                    }`}
                  >
                    {t('nav.contact')}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      {activePage !== 'admin' && activePage !== 'adminPreview' && <Footer onNavigate={navigateTo} />}

      {/* Global Search Modal */}
      <SearchModal
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        onNavigate={navigateTo}
      />
      <AuthModal isOpen={isAuthOpen} onClose={() => setIsAuthOpen(false)} />
      {activePage !== 'admin' && activePage !== 'adminPreview' && <FloatingStudentLogin onClick={() => {
        if (user && profile) navigateTo('studentDashboard');
        else setIsAuthOpen(true);
      }} />}
    </div>
  );
};

export default function App() {
  return (
    <LanguageProvider>
      <MainApp />
    </LanguageProvider>
  );
}