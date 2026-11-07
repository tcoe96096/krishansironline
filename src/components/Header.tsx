import React, { useState } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { Search, Menu, X, Home, Layers, BookOpen, Laptop, Newspaper, Info, Phone, Shield, Landmark, Award, ChevronDown } from 'lucide-react';

interface HeaderProps {
  activeSection: string;
  onNavigate: (section: string) => void;
  onOpenSearch: () => void;
}

export const Header: React.FC<HeaderProps> = ({ activeSection, onNavigate, onOpenSearch }) => {
  const { language, toggleLanguage } = useLanguage();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const navLinks = [
    { id: 'home', label: language === 'en' ? 'Home' : 'होम', icon: Home },
    { id: 'classes', label: language === 'en' ? 'Classes' : 'कक्षाएं', icon: BookOpen },
    { id: 'tests', label: language === 'en' ? 'Tests' : 'टेस्ट', icon: Laptop },
    { id: 'materials', label: language === 'en' ? 'Study Materials' : 'अध्ययन सामग्री', icon: Layers },
    { id: 'polity', label: language === 'en' ? 'Polity' : 'राजव्यवस्था', icon: Landmark },
    { id: 'results', label: language === 'en' ? 'Results' : 'परिणाम', icon: Award },
    { id: 'affairs', label: language === 'en' ? 'Current Affairs' : 'करेंट अफेयर्स', icon: Newspaper },
    { id: 'about', label: language === 'en' ? 'About' : 'परिचय', icon: Info },
    { id: 'contact', label: language === 'en' ? 'Contact' : 'संपर्क', icon: Phone },
  ];
  const handleNavClick = (id: string) => { onNavigate(id); setMobileMenuOpen(false); };
  const adminUrl = 'https://script.google.com/macros/s/AKfycbwfc1ERULBNJ_tu9mKWK4kLcfx88Mw0bbHwlCcmUk82GNk0tV78bBvLyeBPlBvXWX-u/exec';

  return (
    <header className="sticky top-0 z-40 bg-white/95 shadow-[0_8px_30px_rgba(10,35,75,.12)] backdrop-blur-xl">
      <div className="relative isolate overflow-hidden bg-[#f2f7fc]">
        <div className="absolute inset-0 -z-10 bg-no-repeat bg-center bg-cover opacity-[.18]" style={{ backgroundImage: `url(${import.meta.env.BASE_URL}images/file_00000000eb6482108586a0d9a2d631c8.png)` }} aria-hidden="true" />
        <div className="absolute inset-0 -z-10 bg-gradient-to-r from-white/95 via-white/85 to-[#e9f4ff]/90" aria-hidden="true" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 py-3 sm:py-4 flex flex-wrap items-center gap-3 sm:gap-5">
          <div className="h-[58px] w-[58px] sm:h-[76px] sm:w-[76px] shrink-0 overflow-hidden rounded-full border-[3px] border-white bg-white shadow-lg ring-2 ring-[#17477e]/70">
            <img src={`${import.meta.env.BASE_URL}images/file_0000000037ec8208af2a0ed280e2faf8.png`} alt="Krishan Sir Online Learning logo" className="h-full w-full rounded-full object-contain" onError={(e) => { e.currentTarget.src = `${import.meta.env.BASE_URL}images/krishan-sir-logo.svg`; }} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-[clamp(1.55rem,4vw,2.65rem)] leading-[1.04] font-extrabold tracking-[-.04em] text-[#102f63]">Krishan Sir</div>
            <div className="mt-1 inline-flex items-center gap-2 rounded-md bg-[#087d9b] px-3 sm:px-4 py-1 text-white text-xs sm:text-sm font-bold tracking-wide shadow-sm">
              <span aria-hidden="true">🎓</span> Online Learning
            </div>
            <div className="mt-1 text-[9px] sm:text-[11px] font-semibold tracking-[.12em] uppercase text-[#24466f]">Learn <span className="text-amber-500">•</span> Practice <span className="text-amber-500">•</span> Improve <span className="text-amber-500">•</span> Succeed</div>
          </div>
          <div className="relative z-10 mt-1 grid w-full grid-cols-3 gap-2 sm:mt-0 sm:w-auto sm:ml-auto sm:flex sm:items-center sm:gap-2.5" aria-label="Header tools">
            <button onClick={onOpenSearch} aria-label="Search" className="min-h-10 inline-flex items-center justify-center gap-1.5 rounded-xl bg-white text-[#092c60] px-2.5 py-2 shadow-sm ring-1 ring-[#17477e]/15 text-xs sm:text-sm font-bold transition hover:-translate-y-0.5 hover:shadow-md">
              <Search className="w-4 h-4 shrink-0" /><span>Search</span>
            </button>
            <button onClick={toggleLanguage} className="min-h-10 inline-flex items-center justify-center rounded-xl border border-[#17477e]/20 bg-white text-[#092c60] px-2.5 py-2 text-[10px] sm:text-sm font-bold whitespace-nowrap shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
              {language === 'en' ? 'हिंदी | En' : 'हि | English'}
            </button>
            <a href={adminUrl} target="_blank" rel="noopener noreferrer" className="min-h-10 inline-flex items-center justify-center gap-1.5 rounded-xl bg-[#092f68] text-white px-2.5 py-2 text-xs sm:text-sm font-extrabold shadow-sm transition hover:-translate-y-0.5 hover:bg-[#124887] hover:shadow-md">
              <Shield className="w-4 h-4 shrink-0" /><span>Admin</span>
            </a>
          </div>
        </div>
      </div>
      <nav className="bg-[#082d65] text-white border-b-[3px] border-cyan-400" aria-label="Main navigation">
        <div className="max-w-7xl mx-auto px-3 sm:px-5 flex items-center min-h-[48px]">
          <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="lg:hidden inline-flex items-center gap-2 p-2.5 rounded-lg hover:bg-white/10" aria-label="Toggle navigation" aria-expanded={mobileMenuOpen}>
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            <span className="text-xs font-bold">{language === 'en' ? 'Menu' : 'मेन्यू'}</span>
            <ChevronDown className={`w-3.5 h-3.5 transition-transform ${mobileMenuOpen ? 'rotate-180' : ''}`} />
          </button>
          <div className="hidden lg:flex flex-1 items-center justify-between gap-1">
            {navLinks.map(({id,label,icon:Icon}) => <button key={id} onClick={() => handleNavClick(id)} aria-current={activeSection === id ? 'page' : undefined} className={`flex items-center gap-2 whitespace-nowrap rounded-lg px-2.5 py-2.5 text-[11px] xl:text-xs font-bold transition-all ${activeSection === id ? 'bg-amber-400 text-[#092c60] shadow-sm' : 'text-white/90 hover:bg-white/15 hover:text-white'}`}><Icon className="w-4 h-4" />{label}</button>)}
          </div>
        </div>
        {mobileMenuOpen && <div className="lg:hidden grid grid-cols-2 sm:grid-cols-3 gap-2 p-3 bg-[#0b3979] border-t border-white/10">{navLinks.map(({id,label,icon:Icon}) => <button key={id} onClick={() => handleNavClick(id)} aria-current={activeSection === id ? 'page' : undefined} className={`flex items-center gap-2 rounded-xl p-3 text-left text-xs font-semibold transition ${activeSection === id ? 'bg-amber-400 text-[#092c60]' : 'bg-white/5 text-white hover:bg-white/10'}`}><Icon className="w-4 h-4 shrink-0" />{label}</button>)}</div>}
      </nav>
    </header>
  );
};
