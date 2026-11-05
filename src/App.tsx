import React, { useEffect, useState } from 'react';
import { LanguageProvider } from './context/LanguageContext';
import { Header } from './components/Header';
import { Hero } from './components/Hero';
import { NoticeBoard } from './components/NoticeBoard';
import { QuickAccessCards } from './components/QuickAccessCards';
import { ClassSelector } from './components/ClassSelector';
import { OnlineTestEngine } from './components/OnlineTestEngine';
import { StudyMaterialsView } from './components/StudyMaterialsView';
import { QuestionBankView } from './components/QuestionBankView';
import { ResultsPortal } from './components/ResultsPortal';
import { ConstitutionCorner } from './components/ConstitutionCorner';
import { CurrentAffairsView } from './components/CurrentAffairsView';
import { AboutTeacher } from './components/AboutTeacher';
import { ContactSection } from './components/ContactSection';
import { Footer } from './components/Footer';
import { SearchModal } from './components/SearchModal';
import { LiveAdminContent } from './components/LiveAdminContent';
import { ClassLevel } from './types';

const pages = {
  home: { path: '/', title: 'Krishan Sir – Online Learning Portal', description: 'Bilingual Hindi-English learning resources, Social Science notes, online tests and exam preparation for Classes 6–12.' },
  classes: { path: '/classes/', title: 'Classes 6–12 | Krishan Sir', description: 'Explore class-wise learning resources and study support for Classes 6 to 12, aligned with HBSE and CBSE learning needs.' },
  tests: { path: '/online-tests/', title: 'Online Tests & MCQ Practice | Krishan Sir', description: 'Attempt online tests and bilingual MCQ practice for school Social Science and related subjects.' },
  materials: { path: '/study-materials/', title: 'Study Materials & Notes | Krishan Sir', description: 'Find chapter-wise study materials, notes and learning resources for Classes 6–12.' },
  results: { path: '/results/', title: 'Student Results Portal | Krishan Sir', description: 'Visit the student examination results portal. Verified result information will be published when an authorized source is connected.' },
  polity: { path: '/constitution/', title: 'Indian Constitution Corner | Krishan Sir', description: 'Explore Indian Constitution concepts, Preamble terms, constitutional values and polity learning resources.' },
  affairs: { path: '/current-affairs/', title: 'Current Affairs & General Awareness | Krishan Sir', description: 'Read educational current affairs and general awareness updates for students and competitive exam learners.' },
  about: { path: '/about/', title: 'About Krishan Sir | Teacher Profile', description: 'Learn about Krishan Kumar, TGT Social Science, and the Krishan Sir Online Learning Portal.' },
  contact: { path: '/contact/', title: 'Contact & Student Doubt Desk | Krishan Sir', description: 'Contact Krishan Sir and send an academic doubt or learning support request.' },
} as const;
type PageKey = keyof typeof pages;
const getPageFromPath = (): PageKey => {
  const path = window.location.pathname.replace(/\/+$/, '') || '/';
  return (Object.keys(pages) as PageKey[]).find((key) => pages[key].path.replace(/\/+$/, '') === path) || 'home';
};

const MainApp: React.FC = () => {
  const [activePage, setActivePage] = useState<PageKey>(getPageFromPath);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [selectedClassForMaterials, setSelectedClassForMaterials] = useState<ClassLevel>('10');

  useEffect(() => {
    const onPopState = () => { setActivePage(getPageFromPath()); window.scrollTo({ top: 0 }); };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  useEffect(() => {
    const page = pages[activePage];
    document.title = page.title;
    let description = document.querySelector('meta[name="description"]');
    if (!description) { description = document.createElement('meta'); description.setAttribute('name', 'description'); document.head.appendChild(description); }
    description.setAttribute('content', page.description);
    let canonical = document.querySelector('link[rel="canonical"]');
    if (!canonical) { canonical = document.createElement('link'); canonical.setAttribute('rel', 'canonical'); document.head.appendChild(canonical); }
    canonical.setAttribute('href', `https://krishansir.online${page.path}`);
  }, [activePage]);

  const scrollToSection = (sectionId: string) => {
    if (sectionId === 'questions') {
      if (window.location.pathname !== '/') {
        window.history.pushState({}, '', '/');
        setActivePage('home');
        window.setTimeout(() => document.getElementById('questions')?.scrollIntoView({ behavior: 'smooth' }), 80);
      } else {
        document.getElementById('questions')?.scrollIntoView({ behavior: 'smooth' });
      }
      return;
    }
    const key = sectionId === 'home' ? 'home' : sectionId as PageKey;
    if (key in pages) {
      const page = pages[key as PageKey];
      if (window.location.pathname !== page.path) window.history.pushState({}, '', page.path);
      setActivePage(key as PageKey);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };
  const handleClassAction = (classLevel: ClassLevel, action: 'materials' | 'tests' | 'questions') => {
    setSelectedClassForMaterials(classLevel);
    scrollToSection(action);
  };
  const isHome = activePage === 'home';
  const pageContent = () => {
    switch (activePage) {
      case 'classes': return <ClassSelector onSelectClassAction={handleClassAction} />;
      case 'tests': return <><OnlineTestEngine initialClassFilter={selectedClassForMaterials} /><LiveAdminContent section="tests" /></>;
      case 'materials': return <><StudyMaterialsView initialClass={selectedClassForMaterials} /><LiveAdminContent section="materials" /></>;
      case 'results': return <ResultsPortal />;
      case 'polity': return <ConstitutionCorner onStartQuiz={() => scrollToSection('tests')} />;
      case 'affairs': return <CurrentAffairsView />;
      case 'about': return <AboutTeacher />;
      case 'contact': return <ContactSection />;
      default: return null;
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-800">
      <Header activeSection={activePage} onNavigate={scrollToSection} onOpenSearch={() => setIsSearchOpen(true)} />
      <main className="flex-1">
        {isHome ? <>
          <Hero onNavigate={scrollToSection} />
          <div id="notices"><NoticeBoard onNavigate={scrollToSection} /></div>
          <QuickAccessCards onNavigate={scrollToSection} />
          <ClassSelector onSelectClassAction={handleClassAction} />
          <section id="tests"><OnlineTestEngine initialClassFilter={selectedClassForMaterials} /><LiveAdminContent section="tests" /></section>
          <section id="materials"><StudyMaterialsView initialClass={selectedClassForMaterials} /><LiveAdminContent section="materials" /></section>
          <section id="questions"><QuestionBankView /><LiveAdminContent section="questions" /></section>
          <ResultsPortal />
          <ConstitutionCorner onStartQuiz={() => scrollToSection('tests')} />
          <CurrentAffairsView />
          <AboutTeacher />
          <ContactSection />
        </> : <div className="min-h-[60vh]">
          <div className="bg-gradient-to-r from-slate-900 to-sky-900 text-white py-9 sm:py-12">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <p className="text-xs uppercase tracking-[0.2em] text-sky-200 mb-2">Krishan Sir · Online Learning Portal</p>
              <h1 className="text-2xl sm:text-3xl font-extrabold">{pages[activePage].title}</h1>
              <p className="mt-2 max-w-3xl text-sm sm:text-base text-slate-200">{pages[activePage].description}</p>
            </div>
          </div>
          {pageContent()}
        </div>}
      </main>
      <Footer onNavigate={scrollToSection} />
      <SearchModal isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} onNavigate={scrollToSection} />
    </div>
  );
};

export default function App() { return <LanguageProvider><MainApp /></LanguageProvider>; }
