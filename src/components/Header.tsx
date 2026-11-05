import React, { useState } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { Search, Menu, X, Globe, Award } from 'lucide-react';

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
    { id: 'affairs', label: language === 'en' ? 'Current Affairs' : 'करेंट अफेयर्स' },
    { id: 'about', label: t('nav.about') },
    { id: 'contact', label: t('nav.contact') },
  ];

  const handleNavClick = (id: string) => {
    onNavigate(id);
    setMobileMenuOpen(false);
  };

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-xs transition-colors">
      {/* Top Banner Notice - Recovered */}
      <div className="bg-slate-900 text-slate-100 text-xs py-2 px-4 border-b border-slate-800">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="inline-block w-2 h-2 rounded-full bg-amber-400 animate-pulse"></span>
            <span className="font-medium tracking-wide">
              {language === 'en'
                ? 'Free Online Learning Portal • Learn • Practice • Improve • Succeed'
                : 'निःशुल्क ऑनलाइन लर्निंग पोर्टल • सीखें • अभ्यास करें • सुधार करें • सफलता प्राप्त करें'}
            </span>
          </div>
          <div className="hidden sm:flex items-center gap-3 text-slate-300 text-xs">
            <span>HBSE & CBSE Syllabus</span>
            <span aria-hidden="true" className="text-slate-500">·</span>
            <span>Classes 6–12</span>
            <span aria-hidden="true" className="text-slate-500">·</span>
            <span className="text-amber-300 font-semibold">By Krishan Sir (TGT Social Science)</span>
          </div>
        </div>
      </div>

      {/* Main Header Bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex min-h-[76px] sm:min-h-[88px] items-center justify-between gap-2 sm:gap-3 xl:gap-4">
          {/* Mobile menu toggle — placed at the left edge */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="lg:hidden shrink-0 inline-flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 transition-colors"
            aria-label="Toggle Navigation Menu"
            aria-expanded={mobileMenuOpen}
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>

          {/* Brand Wordmark */}
          <button
            onClick={() => handleNavClick('home')}
            className="flex min-w-0 flex-1 lg:flex-none items-center gap-2 sm:gap-3 text-left group focus:outline-hidden py-1"
            aria-label="Krishan Sir home"
          >
            <img
              src={`${import.meta.env.BASE_URL}images/krishan-sir-logo.svg`}
              alt="Krishan Sir logo"
              className="h-11 w-11 sm:h-[60px] sm:w-[60px] shrink-0 object-contain transition-transform group-hover:scale-105"
            />
            <div className="flex flex-col justify-center">
              <div
                className="whitespace-nowrap text-[23px] sm:text-[30px] leading-tight font-bold tracking-tight text-left select-none flex items-center text-[#1f4d89]"
                style={{ fontFamily: 'Georgia, serif' }}
              >
                Krishan Sir
              </div>
              <p
                style={{
                  fontSize: 'clamp(10px, 2.5vw, 14px)',
                  fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, sans-serif',
                  color: '#3168b5',
                  backgroundColor: '#def0ef',
                  fontWeight: 'bold',
                  textAlign: 'left',
                }}
                className="px-2 py-0.5 rounded-sm inline-block mt-1 self-start"
              >
                Online Learning Portal
              </p>
            </div>
          </button>

          {/* Zone 2: Navigation Links (Recovered all pages in header) */}
          <nav className="hidden lg:flex items-center gap-0.5 xl:gap-1 text-xs xl:text-sm font-medium text-slate-700">
            {navLinks.map((item) => {
              const isActive = activeSection === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => handleNavClick(item.id)}
                  className={`px-2.5 py-1.5 rounded-lg transition-colors whitespace-nowrap relative ${
                    isActive
                      ? 'text-sky-950 bg-sky-100 font-bold shadow-2xs'
                      : 'hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  {item.label}
                  {isActive && (
                    <span className="absolute bottom-0 left-2 right-2 h-0.5 bg-sky-800 rounded-full" />
                  )}
                </button>
              );
            })}
          </nav>

          {/* Zone 3: Actions (Search, Language Switch, Primary CTA, Mobile menu) */}
          <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
            <button
              onClick={onOpenSearch}
              className="p-2.5 text-slate-600 hover:text-slate-900 hover:bg-slate-50 rounded-lg transition-colors border border-slate-200"
              title="Search Portal (Ctrl+K)"
              aria-label="Search"
            >
              <Search className="w-4 h-4 text-slate-600" />
            </button>

            <button
              onClick={toggleLanguage}
              className="flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-2 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
              title={language === 'en' ? 'Switch to Hindi (हिंदी में पढ़ें)' : 'Switch to English'}
            >
              <Globe className="w-4 h-4 text-sky-700" />
              <span className="hidden sm:inline">{language === 'en' ? 'हिंदी' : 'English'}</span>
            </button>
            <a
              href="https://script.google.com/macros/s/AKfycbwfc1ERULBNJ_tu9mKWK4kLcfx88Mw0bbHwlCcmUk82GNk0tV78bBvLyeBPlBvXWX-u/exec"
              target="_blank"
              rel="noopener noreferrer"
              className="hidden md:inline-flex items-center px-3 py-2 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
              title="Open Admin Dashboard"
            >Admin</a>

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
            <a
              href="https://script.google.com/macros/s/AKfycbwfc1ERULBNJ_tu9mKWK4kLcfx88Mw0bbHwlCcmUk82GNk0tV78bBvLyeBPlBvXWX-u/exec"
              target="_blank"
              rel="noopener noreferrer"
              className="w-full text-center px-3 py-2 rounded-lg text-sm font-semibold text-sky-900 bg-sky-50 border border-sky-200"
            >Admin Dashboard</a>
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
