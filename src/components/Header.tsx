import React, { useState } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { Search, Menu, X, Globe } from 'lucide-react';

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

  const adminUrl = 'https://script.google.com/macros/s/AKfycbwfc1ERULBNJ_tu9mKWK4kLcfx88Mw0bbHwlCcmUk82GNk0tV78bBvLyeBPlBvXWX-u/exec';

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-xl border-b border-slate-200 shadow-sm">
      <div className="bg-[#071b3b] text-slate-100 text-[11px] sm:text-xs py-2 px-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <span className="relative flex h-2 w-2 shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-300 opacity-70" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-400" />
            </span>
            <span className="font-semibold tracking-wide truncate">
              {language === 'en'
                ? 'Free Online Learning • Learn • Practice • Succeed'
                : 'निःशुल्क ऑनलाइन लर्निंग • सीखें • अभ्यास करें • सफलता पाएं'}
            </span>
          </div>
          <span className="hidden sm:block shrink-0 text-slate-300">HBSE & CBSE · Classes 6–12</span>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
        <div className="flex min-h-[72px] sm:min-h-[82px] items-center justify-between gap-2 sm:gap-4">
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="lg:hidden shrink-0 inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50"
            aria-label="Toggle Navigation Menu"
            aria-expanded={mobileMenuOpen}
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>

          <button
            onClick={() => handleNavClick('home')}
            className="flex min-w-0 flex-1 lg:flex-none items-center gap-2.5 sm:gap-3 text-left group py-1"
            aria-label="Krishan Sir home"
          >
            <span className="relative shrink-0 h-11 w-11 sm:h-[58px] sm:w-[58px] rounded-full p-[3px] bg-gradient-to-br from-amber-400 via-sky-500 to-[#102b59] shadow-md">
              <img
                src={`${import.meta.env.BASE_URL}images/krishan-sir.png`}
                alt="Krishan Sir"
                className="h-full w-full rounded-full object-cover object-[24%_28%] border-2 border-white bg-slate-100"
                onError={(e) => { e.currentTarget.src = `${import.meta.env.BASE_URL}images/krishan-sir-logo.svg`; }}
              />
            </span>
            <span className="min-w-0 flex flex-col justify-center">
              <span className="whitespace-nowrap text-[20px] sm:text-[29px] leading-tight font-extrabold tracking-tight text-[#102b59]">
                Krishan Sir
              </span>
              <span className="mt-1 inline-flex self-start rounded-md bg-[#eaf3ff] px-2 py-0.5 text-[10px] sm:text-xs font-bold tracking-wide text-[#24558f]">
                ONLINE LEARNING
              </span>
            </span>
          </button>

          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            <button
              onClick={onOpenSearch}
              className="inline-flex h-9 w-9 sm:h-10 sm:w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900"
              title="Search Portal (Ctrl+K)"
              aria-label="Search"
            >
              <Search className="w-4 h-4" />
            </button>
            <button
              onClick={toggleLanguage}
              className="flex shrink-0 items-center gap-1 px-2 sm:px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50"
              title={language === 'en' ? 'Switch to Hindi' : 'Switch to English'}
            >
              <Globe className="w-4 h-4 text-sky-700" />
              <span>{language === 'en' ? 'हिंदी' : 'English'}</span>
            </button>
            <a
              href={adminUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="hidden sm:inline-flex shrink-0 items-center justify-center rounded-xl bg-[#102b59] px-3 sm:px-4 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-[#19427e] transition-colors"
              title="Open Admin Dashboard"
            >Admin</a>
          </div>
        </div>
      </div>

      <nav className="hidden lg:flex bg-[#102b59] text-white">
        <div className="max-w-7xl mx-auto w-full flex flex-wrap items-center justify-center gap-1 px-4 py-2">
          {navLinks.map((item) => {
            const isActive = activeSection === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleNavClick(item.id)}
                className={`relative whitespace-nowrap rounded-lg px-3 py-2 text-xs xl:text-sm font-semibold transition-colors ${
                  isActive
                    ? 'bg-white text-[#102b59] shadow-sm'
                    : 'text-slate-100 hover:bg-white/15 hover:text-white'
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </div>
      </nav>

      {mobileMenuOpen && (
        <div className="lg:hidden border-t border-slate-200 bg-white px-4 pt-3 pb-5 shadow-xl">
          <div className="grid grid-cols-2 gap-2 mb-4">
            {navLinks.map((item) => (
              <button
                key={item.id}
                onClick={() => handleNavClick(item.id)}
                className={`text-left px-3 py-2.5 rounded-xl text-sm font-semibold transition-colors ${
                  activeSection === item.id
                    ? 'bg-sky-50 text-sky-900 border border-sky-200'
                    : 'text-slate-700 hover:bg-slate-50 border border-transparent'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
          <a
            href={adminUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="block w-full text-center px-3 py-3 rounded-xl text-sm font-bold text-white bg-[#102b59]"
          >Admin Dashboard</a>
          <div className="text-center text-xs text-slate-500 pt-3">
            {language === 'en' ? 'Krishan Kumar · TGT Social Science' : 'कृष्ण कुमार · टीजीटी सामाजिक विज्ञान'}
          </div>
        </div>
      )}
    </header>
  );
};
