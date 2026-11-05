import React, { useState, useEffect } from 'react';
import { LanguageProvider, useLanguage } from './context/LanguageContext';
import { Header } from './components/Header';
import { Hero } from './components/Hero';
import { NoticeBoard } from './components/NoticeBoard';
import { QuickAccessCards } from './components/QuickAccessCards';
import { ClassSelector } from './components/ClassSelector';
import { OnlineTestEngine } from './components/OnlineTestEngine';
import { StudyMaterialsView } from './components/StudyMaterialsView';
import { QuestionBankView } from './components/QuestionBankView';
import { ConstitutionCorner } from './components/ConstitutionCorner';
import { CurrentAffairsView } from './components/CurrentAffairsView';
import { AboutTeacher } from './components/AboutTeacher';
import { ContactSection } from './components/ContactSection';
import { ResultsPortal } from './components/ResultsPortal';
import { Footer } from './components/Footer';
import { SearchModal } from './components/SearchModal';
import { PageHeaderBanner } from './components/PageHeaderBanner';
import { ClassLevel } from './types';
import {
  BookOpen,
  Award,
  FileText,
  CheckSquare,
  Landmark,
  GraduationCap,
  HelpCircle,
  ArrowRight,
  Sparkles,
  ShieldCheck,
  ChevronRight,
  MessageSquare,
} from 'lucide-react';

type PageId = 'home' | 'classes' | 'tests' | 'materials' | 'questions' | 'polity' | 'affairs' | 'results' | 'about' | 'contact';

const VALID_PAGES: PageId[] = [
  'home',
  'classes',
  'tests',
  'materials',
  'questions',
  'polity',
  'affairs',
  'results',
  'about',
  'contact',
];

const MainApp: React.FC = () => {
  const { language, t } = useLanguage();
  
  // Support clean SEO URLs and legacy hash links.
  const pathToPage: Record<string, PageId> = {
    '/': 'home',
    '/classes': 'classes',
    '/online-tests': 'tests',
    '/study-materials': 'materials',
    '/constitution': 'polity',
    '/current-affairs': 'affairs',
    '/results': 'results',
    '/about': 'about',
    '/contact': 'contact',
  };
  const pageToPath: Record<PageId, string> = {
    home: '/', classes: '/classes/', tests: '/online-tests/',
    materials: '/study-materials/', questions: '/',
    polity: '/constitution/', affairs: '/current-affairs/',
    results: '/results/', about: '/about/', contact: '/contact/',
  };
  const readPageFromLocation = (): PageId => {
    const path = window.location.pathname.replace(/\/+$/, '') || '/';
    const fromPath = pathToPage[path];
    if (fromPath) return fromPath;
    const hash = window.location.hash.replace('#', '') as PageId;
    return VALID_PAGES.includes(hash) ? hash : 'home';
  };
  const [activePage, setActivePage] = useState<PageId>(() =>
    typeof window !== 'undefined' ? readPageFromLocation() : 'home'
  );

  const [isSearchOpen, setIsSearchOpen] = useState(false);
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
      if (window.location.pathname !== '/') window.history.pushState(null, '', '/');
      setTimeout(() => document.getElementById('notices')?.scrollIntoView({ behavior: 'smooth' }), 50);
      return;
    }

    // Question Bank remains available on the homepage, not as a separate route.
    if (pageId === 'questions') {
      setActivePage('home');
      if (window.location.pathname !== '/') window.history.pushState(null, '', '/');
      setTimeout(() => document.getElementById('questions')?.scrollIntoView({ behavior: 'smooth' }), 80);
      return;
    }

    const targetPage = VALID_PAGES.includes(pageId as PageId) ? (pageId as PageId) : 'home';
    setActivePage(targetPage);
    const targetPath = pageToPath[targetPage];
    if (window.location.pathname !== targetPath) window.history.pushState(null, '', targetPath);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleClassAction = (classLevel: ClassLevel, action: 'materials' | 'tests' | 'questions') => {
    navigateTo(action, classLevel);
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-800">
      {/* Top Header with navigation to all pages */}
      <Header
        activeSection={activePage}
        onNavigate={navigateTo}
        onOpenSearch={() => setIsSearchOpen(true)}
      />

      {/* Main Dedicated Page Routing */}
      <main className="flex-1">
        {/* ==================== PAGE 1: HOME ==================== */}
        {activePage === 'home' && (
          <div className="space-y-0">
            {/* Hero Banner with Quick Actions */}
            <Hero onNavigate={navigateTo} />

            {/* Latest Announcements & Notice Board */}
            <div id="notices">
              <NoticeBoard onNavigate={navigateTo} />
            </div>

            {/* 8 Quick Access Cards to Dedicated Pages */}
            <QuickAccessCards onNavigate={navigateTo} />

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
                        ? 'Jump directly into your syllabus, chapter notes, question banks, or online tests.'
                        : 'सीधे अपने पाठ्यक्रम, अध्यायवार नोट्स, प्रश्न बैंक या ऑनलाइन टेस्ट तक पहुंचें।'}
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

            {/* Home Feature Split: Constitution Spotlight & Meet Krishan Sir */}
            <section className="py-12 bg-slate-100/70 border-b border-slate-200">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Card 1: Constitution & Civics Spotlight */}
                  <div className="bg-white rounded-2xl p-6 sm:p-7 border border-slate-200 shadow-xs flex flex-col justify-between">
                    <div>
                      <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-50 text-rose-800 text-xs font-bold border border-rose-200 mb-3">
                        <Landmark className="w-3.5 h-3.5 text-rose-600" />
                        <span>{language === 'en' ? 'Specialized Polity Corner' : 'संविधान एवं राजव्यवस्था केंद्र'}</span>
                      </div>
                      <h3 className="text-xl font-extrabold text-slate-900 mb-2 font-display">
                        {language === 'en' ? 'The Preamble & Fundamental Rights' : 'भारतीय संविधान की प्रस्तावना व मौलिक अधिकार'}
                      </h3>
                      <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                        {language === 'en'
                          ? 'Interactive terms explorer: Sovereign, Socialist, Secular, Democratic, Republic. Essential for Class 9–10 Board exams and competitive exams.'
                          : 'प्रभुत्व-संपन्न, समाजवादी, पंथनिरपेक्ष, लोकतंत्रात्मक, गणराज्य जैसे मुख्य शब्दों की प्रामाणिक व्याख्या और संविधान प्रश्नोत्तरी।'}
                      </p>
                    </div>

                    <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between">
                      <button
                        onClick={() => navigateTo('polity')}
                        className="inline-flex items-center gap-2 text-xs font-bold text-sky-900 hover:text-sky-700"
                      >
                        <span>{language === 'en' ? 'Open Constitution Corner' : 'संविधान पृष्ठ खोलें'}</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Card 2: Teacher Bio Spotlight */}
                  <div className="bg-white rounded-2xl p-6 sm:p-7 border border-slate-200 shadow-xs flex flex-col justify-between">
                    <div>
                      <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 text-amber-900 text-xs font-bold border border-amber-200 mb-3">
                        <GraduationCap className="w-3.5 h-3.5 text-amber-700" />
                        <span>{language === 'en' ? 'Educator Profile' : 'शिक्षक परिचय'}</span>
                      </div>
                      <h3 className="text-xl font-extrabold text-slate-900 mb-2 font-display">
                        {language === 'en' ? 'Guided by Krishan Kumar (TGT Social Science)' : 'श्री कृष्ण कुमार (टीजीटी सामाजिक विज्ञान)'}
                      </h3>
                      <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                        {language === 'en'
                          ? 'Teaching at GGHS Dhanger (Fatehabad, Haryana). UGC NET (Pol. Sci. 2x & Edu), M.Phil, M.Ed. Dedicated to empowering government school students with free digital education.'
                          : 'राजकीय कन्या उच्च विद्यालय, ढांगर (फतेहाबाद, हरियाणा)। 2 बार यूजीसी नेट (राजनीति विज्ञान), एम.फिल., एम.एड.। ग्रामीण एवं सरकारी स्कूल विद्यार्थियों के उज्ज्वल भविष्य हेतु समर्पित।'}
                      </p>
                    </div>

                    <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between">
                      <button
                        onClick={() => navigateTo('about')}
                        className="inline-flex items-center gap-2 text-xs font-bold text-sky-900 hover:text-sky-700"
                      >
                        <span>{language === 'en' ? 'View Teacher Profile & Journey' : 'शिक्षक की पूरी जानकारी देखें'}</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
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
        {activePage === 'tests' && (
          <div>
            <PageHeaderBanner
              titleEn="Online Examination & Assessment Portal"
              titleHi="ऑनलाइन परीक्षा एवं मूल्यांकन केंद्र"
              subtitleEn="Practice chapter-wise MCQs in real examination conditions with live timer, question palette, bilingual review, and Google Forms assessment."
              subtitleHi="टाइमर, प्रश्न तालिका, द्विभाषी प्रश्न और तुरंत समाधान के साथ वास्तविक परीक्षा वातावरण में ऑनलाइन टेस्ट दें।"
              badgeEn="CBT Simulator & Assessments"
              badgeHi="ऑनलाइन टेस्ट व मूल्यांकन"
              icon={Award}
              onBackHome={() => navigateTo('home')}
            />
            <OnlineTestEngine initialClassFilter={selectedClassForMaterials} />
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

        {/* ==================== PAGE 5: QUESTION BANK (प्रश्न बैंक) ==================== */}
        {activePage === 'questions' && (
          <div>
            <PageHeaderBanner
              titleEn="Objective Question Bank & Model Answers"
              titleHi="वस्तुनिष्ठ प्रश्न बैंक एवं मॉडल उत्तर"
              subtitleEn="Chapter-wise multiple-choice questions with explanation reveals, 3-mark & 5-mark board model answers, and map work guides."
              subtitleHi="अध्यायवार बहुविकल्पीय प्रश्न (MCQ) विस्तृत समाधान सहित, 3 व 5 अंक वाले मॉडल उत्तर और मानचित्र अभ्यास।"
              badgeEn="Exam-Focused Question Bank"
              badgeHi="परीक्षा प्रश्न बैंक व मानचित्र"
              icon={CheckSquare}
              onBackHome={() => navigateTo('home')}
            />
            <QuestionBankView />
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
        {activePage !== 'home' && (
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
                    onClick={() => navigateTo('questions')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
                      activePage === 'questions' ? 'bg-sky-900 text-white border-sky-900' : 'bg-white hover:bg-slate-200 text-slate-800 border-slate-200'
                    }`}
                  >
                    {t('nav.questions')}
                  </button>
                  <button
                    onClick={() => navigateTo('polity')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
                      activePage === 'polity' ? 'bg-sky-900 text-white border-sky-900' : 'bg-white hover:bg-slate-200 text-slate-800 border-slate-200'
                    }`}
                  >
                    {t('nav.polity')}
                  </button>
                  <button
                    onClick={() => navigateTo('affairs')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${activePage === 'affairs' ? 'bg-sky-900 text-white border-sky-900' : 'bg-white hover:bg-slate-200 text-slate-800 border-slate-200'}`}
                  >
                    {language === 'en' ? 'Current Affairs' : 'करेंट अफेयर्स'}
                  </button>
                  <button
                    onClick={() => navigateTo('results')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${activePage === 'results' ? 'bg-sky-900 text-white border-sky-900' : 'bg-white hover:bg-slate-200 text-slate-800 border-slate-200'}`}
                  >
                    {t('nav.results')}
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
      <Footer onNavigate={navigateTo} />

      {/* Global Search Modal */}
      <SearchModal
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        onNavigate={navigateTo}
      />
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
