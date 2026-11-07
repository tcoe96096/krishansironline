import React, { useState } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { Search, Menu, X, Home, Layers, BookOpen, Laptop, Newspaper, Info, Phone, Shield, GraduationCap, ChevronDown, FileText, Globe } from 'lucide-react';

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
    { id: 'tests', label: language === 'en' ? 'Tests' : 'टेस्ट', icon: Laptop },
    { id: 'exams', label: language === 'en' ? 'All Exams' : 'सभी परीक्षाएँ', icon: GraduationCap },
    { id: 'classes', label: language === 'en' ? 'Classes' : 'कक्षाएं', icon: BookOpen },
    { id: 'materials', label: language === 'en' ? 'Study Materials' : 'अध्ययन सामग्री', icon: Layers },
    { id: 'affairs', label: language === 'en' ? 'Current Affairs' : 'करेंट अफेयर्स', icon: Newspaper },
    { id: 'about', label: language === 'en' ? 'About' : 'परिचय', icon: Info },
    { id: 'contact', label: language === 'en' ? 'Contact' : 'संपर्क', icon: Phone },
  ];
  const handleNavClick = (id: string) => { onNavigate(id); setMobileMenuOpen(false); };
  const adminUrl = 'https://script.google.com/macros/s/AKfycbwfc1ERULBNJ_tu9mKWK4kLcfx88Mw0bbHwlCcmUk82GNk0tV78bBvLyeBPlBvXWX-u/exec';

  return (
    <header className="sticky top-0 z-40 bg-white/95 shadow-[0_8px_30px_rgba(10,35,75,.12)] backdrop-blur-xl">
      <div className="bg-[#090d14] text-white border-b border-white/10">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 min-h-5 flex items-center justify-center overflow-hidden">
          <div className="flex items-center justify-center gap-x-3 sm:gap-x-5 whitespace-nowrap text-[9px] sm:text-[10px] font-semibold tracking-wide text-slate-200">
            <span className="text-amber-300">✦ {language === 'en' ? 'WELCOME' : 'स्वागत है'}</span>
            <span>{language === 'en' ? 'Bilingual Learning • Classes 6–12 • Competitive Exams' : 'द्विभाषी शिक्षा • कक्षा 6–12 • प्रतियोगी परीक्षाएँ'}</span>
            <span className="hidden sm:inline text-cyan-300">| {language === 'en' ? 'Learn • Practice • Succeed' : 'सीखें • अभ्यास करें • सफल हों'}</span>
          </div>
        </div>
      </div>

      <div className="relative isolate overflow-hidden bg-[#f2f7fc]">
        <div className="absolute inset-0 -z-10 bg-no-repeat bg-center bg-cover opacity-[.18]" style={{ backgroundImage: `url(${import.meta.env.BASE_URL}images/file_00000000eb6482108586a0d9a2d631c8.png)` }} aria-hidden="true" />
        <div className="absolute inset-0 -z-10 bg-gradient-to-r from-white/95 via-white/85 to-[#e9f4ff]/90" aria-hidden="true" />
        <div className="relative max-w-7xl mx-auto px-3 sm:px-5 py-0 sm:py-0 grid grid-cols-1 sm:grid-cols-[1fr_auto_1fr] items-center gap-2 sm:gap-3">
          <div className="flex items-center gap-1.5 min-w-0 sm:col-start-1">
            <div className="h-[44px] w-[44px] sm:h-[56px] sm:w-[56px] shrink-0 overflow-hidden rounded-full border-[3px] border-white bg-white shadow-lg ring-2 ring-[#17477e]/70">
              <img src={`${import.meta.env.BASE_URL}images/file_0000000037ec8208af2a0ed280e2faf8.png`} alt="Krishan Sir Online Learning logo" className="h-full w-full rounded-full object-contain" onError={(e) => { e.currentTarget.src = `${import.meta.env.BASE_URL}images/krishan-sir-logo.svg`; }} />
            </div>
            <div className="min-w-0">
              <div className="text-[clamp(1.3rem,3.2vw,2rem)] leading-[1.02] font-extrabold tracking-[-.04em] text-[#102f63]">Krishan Sir</div>
              <div className="mt-0.5 inline-flex items-center gap-1.5 rounded-md bg-[#087d9b] px-2.5 sm:px-3 py-0.5 text-white text-[11px] sm:text-xs font-bold tracking-wide shadow-sm"><GraduationCap className="w-3 h-3" /> Online Learning</div>
              <div className="mt-0.5 text-[6px] sm:text-[7px] font-semibold tracking-[.08em] uppercase text-[#24466f]">Learn <span className="text-amber-500">•</span> Practice <span className="text-amber-500">•</span> Improve <span className="text-amber-500">•</span> Succeed</div>
            </div>
          </div>

          <div className="relative z-10 flex w-full items-center justify-center gap-2 translate-x-[14px] sm:col-start-3 sm:row-start-1 sm:w-auto sm:justify-self-end sm:translate-x-0" aria-label="Header tools">
            <button onClick={onOpenSearch} aria-label="Search" className="min-h-8 w-[280px] sm:w-[360px] inline-flex items-center justify-center gap-1.5 rounded-xl bg-white text-[#092c60] px-3 py-1.5 shadow-sm ring-1 ring-[#17477e]/15 text-xs sm:text-sm font-bold transition hover:-translate-y-0.5 hover:shadow-md"><Search className="w-4 h-4 shrink-0" /><span>Search</span></button>
            <div className="ml-8 sm:ml-24 flex items-center gap-3 sm:gap-4">
              <button onClick={toggleLanguage} className="min-h-8 inline-flex items-center justify-center rounded-xl border border-[#17477e]/20 bg-white text-[#092c60] px-3 py-1.5 text-[10px] sm:text-sm font-bold whitespace-nowrap shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">{language === 'en' ? 'हिंदी | En' : 'हि | English'}</button>
              <a href={adminUrl} target="_blank" rel="noopener noreferrer" className="min-h-8 inline-flex items-center justify-center gap-1.5 rounded-xl bg-[#092f68] text-white px-3 py-1.5 text-xs sm:text-sm font-extrabold shadow-sm transition hover:-translate-y-0.5 hover:bg-[#124887] hover:shadow-md"><Shield className="w-4 h-4 shrink-0" /><span>Admin</span></a>
            </div>
          </div>
          <div className="hidden sm:block sm:col-start-3" aria-hidden="true" />
        </div>
      </div>

      <nav className="bg-[#edf3f9] text-[#173b68] border-b-[3px] border-[#c8d9e9] shadow-sm" aria-label="Main navigation">
        <div className="max-w-7xl mx-auto px-3 sm:px-5 flex items-center min-h-[40px]">
          <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="lg:hidden inline-flex items-center gap-2 p-2 rounded-lg text-[#173b68] hover:bg-[#dce8f3]" aria-label="Toggle navigation" aria-expanded={mobileMenuOpen}>
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            <span className="text-xs font-bold">{language === 'en' ? 'Menu' : 'मेन्यू'}</span>
            <ChevronDown className={`w-3.5 h-3.5 transition-transform ${mobileMenuOpen ? 'rotate-180' : ''}`} />
          </button>
          <div className="hidden lg:flex flex-1 items-center justify-between gap-1">
            {navLinks.map(({id,label,icon:Icon}) => <button key={id} onClick={() => handleNavClick(id)} aria-current={activeSection === id ? 'page' : undefined} className={`flex items-center gap-2 whitespace-nowrap rounded-lg px-2.5 py-2 text-xs sm:text-sm font-extrabold transition-all ${activeSection === id ? 'bg-[#d4e5f3] text-[#092c60] shadow-sm ring-1 ring-[#b7cde1]' : 'text-[#24466f] hover:bg-[#dce8f3] hover:text-[#092c60]'}`}><Icon className="w-4 h-4" />{label}</button>)}
          </div>
        </div>
        {mobileMenuOpen && <div className="lg:hidden grid grid-cols-2 sm:grid-cols-3 gap-2 p-3 bg-[#edf3f9] border-t border-[#c8d9e9]">{navLinks.map(({id,label,icon:Icon}) => <button key={id} onClick={() => handleNavClick(id)} aria-current={activeSection === id ? 'page' : undefined} className={`flex items-center gap-2 rounded-xl p-3 text-left text-xs sm:text-sm font-extrabold transition ${activeSection === id ? 'bg-[#d4e5f3] text-[#092c60]' : 'bg-white text-[#24466f] hover:bg-[#dce8f3]'}`}><Icon className="w-4 h-4 shrink-0" />{label}</button>)}</div>}
      </nav>
    </header>
  );
};
