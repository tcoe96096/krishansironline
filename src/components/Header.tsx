import React, { useState } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { BookOpen, Search, Menu, X, Globe, Sparkles, Award, FileText, CheckCircle2 } from 'lucide-react';

interface HeaderProps {
  activeSection: string;
  onNavigate: (section: string) => void;
  onOpenSearch: () => void;
}

export const Header: React.FC<HeaderProps> = ({ activeSection, onNavigate, onOpenSearch }) => {
  const { language, toggleLanguage, t } = useLanguage();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navLinks = [
    { id: 'home', label: t('nav.home') },
    { id: 'classes', label: t('nav.classes') },
    { id: 'tests', label: t('nav.tests') },
    { id: 'materials', label: t('nav.materials') },
    { id: 'questions', label: t('nav.questions') },
    { id: 'results', label: t('nav.results') },
    { id: 'polity', label: t('nav.polity') },
    { id: 'about', label: t('nav.about') },
    { id: 'contact', label: t('nav.contact') },
  ];

  const handleNavClick = (id: string) => {
    onNavigate(id);
    setMobileMenuOpen(false);
  };

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-xs transition-colors">
      {/* Top Banner Notice */}
      <div className="bg-slate-900 text-slate-100 text-xs py-1.5 px-4 hidden md:block">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="inline-block w-2 h-2 rounded-full bg-amber-400"></span>
            <span className="font-medium">
              {language === 'en'
                ? 'Free Online Learning Portal • Learn • Practice • Improve • Succeed'
                : 'निःशुल्क ऑनलाइन लर्निंग पोर्टल • सीखें • अभ्यास करें • सुधार करें • सफलता प्राप्त करें'}
            </span>
          </div>
          <div className="flex items-center gap-4 text-slate-300 text-xs">
            <span>HBSE & CBSE Syllabus</span>
            <span aria-hidden="true">·</span>
            <span>Classes 6–12</span>
            <span aria-hidden="true">·</span>
            <span className="text-amber-300 font-medium">By Krishan Sir (TGT Social Science)</span>
          </div>
        </div>
      </div>

      {/* Main Header Bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-4">
          
          {/* Zone 1: Brand Wordmark */}
          <button
            onClick={() => handleNavClick('home')}
            className="flex items-center gap-3 text-left group focus:outline-hidden"
          >
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-sky-800 to-sky-600 flex items-center justify-center text-white shadow-xs group-hover:scale-105 transition-transform">
              <BookOpen className="w-5 h-5 text-amber-300" />
            </div>
            <div>
              <div className="text-lg font-bold tracking-tight text-slate-900 font-display flex items-center gap-1.5">
                <span>Krishan Sir</span>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-sm bg-amber-100 text-amber-800 border border-amber-200">
                  Portal
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium hidden sm:block">
                Online Learning Portal
              </p>
            </div>
          </button>

          {/* Zone 2: Navigation Links */}
          <nav className="hidden lg:flex items-center gap-1 text-sm font-medium text-slate-600">
            {navLinks.slice(0, 7).map((item) => {
              const isActive = activeSection === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => handleNavClick(item.id)}
                  className={`px-3 py-2 rounded-lg transition-colors whitespace-nowrap ${
                    isActive
                      ? 'text-sky-900 bg-sky-50 font-semibold'
                      : 'hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  {item.label}
                </button>
              );
            })}

            <button
              onClick={() => handleNavClick('about')}
              className={`px-3 py-2 rounded-lg transition-colors whitespace-nowrap ${
                activeSection === 'about'
                  ? 'text-sky-900 bg-sky-50 font-semibold'
                  : 'hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              {t('nav.about')}
            </button>
          </nav>

          {/* Zone 3: Actions (Search, Language Switch, Primary CTA) */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            {/* Quick Search */}
            <button
              onClick={onOpenSearch}
              className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors flex items-center gap-1.5 text-xs font-medium border border-slate-200"
              title="Search Portal (Ctrl+K)"
            >
              <Search className="w-4 h-4 text-slate-500" />
              <span className="hidden md:inline text-slate-500">Search</span>
              <kbd className="hidden md:inline px-1.5 py-0.5 text-[10px] bg-slate-100 rounded-sm text-slate-400 font-mono">
                ⌘K
              </kbd>
            </button>

            {/* Language Switch Button */}
            <button
              onClick={toggleLanguage}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition-colors"
              title={language === 'en' ? 'Switch to Hindi (हिंदी में पढ़ें)' : 'Switch to English'}
            >
              <Globe className="w-3.5 h-3.5 text-sky-700" />
              <span>{language === 'en' ? 'हिंदी' : 'English'}</span>
            </button>

            {/* Primary Action Button */}
            <button
              onClick={() => handleNavClick('tests')}
              className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-sky-900 hover:bg-sky-800 rounded-lg shadow-xs transition-colors whitespace-nowrap"
            >
              <Award className="w-3.5 h-3.5 text-amber-300" />
              <span>{language === 'en' ? 'Take Online Test' : 'ऑनलाइन टेस्ट दें'}</span>
            </button>

            {/* Mobile Hamburger Toggle */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
              aria-label="Toggle Navigation Menu"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer Navigation */}
      {mobileMenuOpen && (
        <div className="lg:hidden border-t border-slate-200 bg-white px-4 pt-3 pb-6 shadow-xl animate-in slide-in-from-top-2 duration-150">
          <div className="grid grid-cols-2 gap-2 mb-4">
            {navLinks.map((item) => (
              <button
                key={item.id}
                onClick={() => handleNavClick(item.id)}
                className={`text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  activeSection === item.id
                    ? 'bg-sky-50 text-sky-900 font-semibold border-l-2 border-sky-800'
                    : 'text-slate-700 hover:bg-slate-50'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>

          <div className="pt-3 border-t border-slate-100 flex flex-col gap-2">
            <button
              onClick={() => handleNavClick('tests')}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 text-xs font-semibold text-white bg-sky-900 rounded-lg shadow-xs"
            >
              <Award className="w-4 h-4 text-amber-300" />
              <span>{language === 'en' ? 'Start Online Test Now' : 'अभी ऑनलाइन टेस्ट शुरू करें'}</span>
            </button>
            <div className="text-center text-xs text-slate-500 pt-1">
              {language === 'en'
                ? 'Krishan Kumar · TGT Social Science'
                : 'कृष्ण कुमार · टीजीटी सामाजिक विज्ञान'}
            </div>
          </div>
        </div>
      )}
    </header>
  );
};
