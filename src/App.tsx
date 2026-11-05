import React, { useState } from 'react';
import { LanguageProvider, useLanguage } from './context/LanguageContext';
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

const MainApp: React.FC = () => {
  const [activeSection, setActiveSection] = useState<string>('home');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [selectedClassForMaterials, setSelectedClassForMaterials] = useState<ClassLevel>('10');

  const scrollToSection = (sectionId: string) => {
    setActiveSection(sectionId);
    if (sectionId === 'home') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const handleClassAction = (classLevel: ClassLevel, action: 'materials' | 'tests' | 'questions') => {
    setSelectedClassForMaterials(classLevel);
    scrollToSection(action);
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-800">
      {/* Top Header */}
      <Header
        activeSection={activeSection}
        onNavigate={scrollToSection}
        onOpenSearch={() => setIsSearchOpen(true)}
      />

      {/* Main Content Area */}
      <main className="flex-1">
        {/* Hero Section */}
        <Hero onNavigate={scrollToSection} />

        {/* Latest Announcements & Notice Board (Editable by Owner) */}
        <div id="notices">
          <NoticeBoard onNavigate={scrollToSection} />
        </div>

        {/* 8 Quick Access Cards */}
        <QuickAccessCards onNavigate={scrollToSection} />

        {/* Class-wise Sections (Classes 6 to 12) */}
        <ClassSelector onSelectClassAction={handleClassAction} />

        {/* Online Test Engine & Google Forms Assessment */}
        <OnlineTestEngine initialClassFilter={selectedClassForMaterials} />
        <LiveAdminContent section="tests" />

        {/* Chapter-wise Study Materials & Notes */}
        <StudyMaterialsView initialClass={selectedClassForMaterials} />
        <LiveAdminContent section="materials" />

        {/* Question Bank (MCQs, 3 & 5 Marks, Map Work) */}
        <QuestionBankView />
        <LiveAdminContent section="questions" />

        {/* Results Portal & Marksheet Search */}
        <ResultsPortal />

        {/* Political Science & Constitution Corner */}
        <ConstitutionCorner onStartQuiz={() => scrollToSection('tests')} />

        {/* Current Affairs & General Awareness */}
        <CurrentAffairsView />

        {/* About Teacher (Krishan Kumar - Krishan Sir) */}
        <AboutTeacher />

        {/* Contact & Student Doubt Desk */}
        <ContactSection />
      </main>

      {/* Footer */}
      <Footer onNavigate={scrollToSection} />

      {/* Global Search Modal */}
      <SearchModal
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        onNavigate={scrollToSection}
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
