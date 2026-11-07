import React, { useState } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { Search, Menu, X, Home, Layers, BookOpen, Laptop, Newspaper, Info, Phone, Shield, Globe } from 'lucide-react';

interface HeaderProps {
  activeSection: string;
  onNavigate: (section: string) => void;
  onOpenSearch: () => void;
}

export const Header: React.FC<HeaderProps> = ({ activeSection, onNavigate, onOpenSearch }) => {
  const { language, toggleLanguage, t } = useLanguage();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const navLinks = [
    { id: 'home', label: language === 'en' ? 'Home' : 'होम', icon: Home },
    { id: 'classes', label: language === 'en' ? 'Classes' : 'कक्षाएं', icon: BookOpen },
    { id: 'tests', label: language === 'en' ? 'Tests' : 'टेस्ट', icon: Laptop },
    { id: 'materials', label: language === 'en' ? 'Study Materials' : 'अध्ययन सामग्री', icon: Layers },
    { id: 'affairs', label: language === 'en' ? 'Current Affairs' : 'करेंट अफेयर्स', icon: Newspaper },
    { id: 'about', label: language === 'en' ? 'About' : 'परिचय', icon: Info },
    { id: 'contact', label: language === 'en' ? 'Contact' : 'संपर्क', icon: Phone },
  ];
  const handleNavClick = (id: string) => { onNavigate(id); setMobileMenuOpen(false); };
  const adminUrl = 'https://script.google.com/macros/s/AKfycbwfc1ERULBNJ_tu9mKWK4kLcfx88Mw0bbHwlCcmUk82GNk0tV78bBvLyeBPlBvXWX-u/exec';

  return (
    <header className="sticky top-0 z-40 bg-white shadow-md">
      <div className="relative overflow-hidden bg-gradient-to-r from-[#eef7ff] via-white to-[#f3f8ed]">
        <div className="absolute inset-0 opacity-100 bg-no-repeat bg-center bg-cover" style={{ backgroundImage: `url(${import.meta.env.BASE_URL}images/header-background.webp)` }} aria-hidden="true" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 py-2 sm:py-2.5 flex items-center gap-2 sm:gap-4">
          <div className="h-[68px] w-[68px] sm:h-20 sm:w-20 shrink-0 overflow-hidden rounded-full border-[3px] border-white bg-white shadow-lg ring-2 ring-[#0b4aa2]">
            <img src={`${import.meta.env.BASE_URL}images/file_0000000037ec8208af2a0ed280e2faf8.png`} alt="Krishan Sir Online Learning circular logo" className="h-full w-full rounded-full object-contain" onError={(e) => { e.currentTarget.src = `${import.meta.env.BASE_URL}images/krishan-sir-logo.svg`; }} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-[clamp(1.45rem,4vw,2.8rem)] leading-none font-extrabold tracking-tight text-[#102f63]">Krishan Sir</div>
            <div className="mt-1 inline-flex items-center gap-2 rounded-full bg-[#087d9b] px-3 sm:px-4 py-0.5 text-white text-xs sm:text-base font-bold tracking-wide">
              <GraduationCapMark /> Online Learning
            </div>
            <div className="mt-0.5 text-[9px] sm:text-xs font-bold text-[#153b70] tracking-wide">Learn <span className="text-amber-500">•</span> Practice <span className="text-amber-500">•</span> Improve <span className="text-amber-500">•</span> Succeed</div>
          </div>
          <div className="hidden md:flex items-center justify-center w-16 h-16 shrink-0 text-amber-500">
            <BookOpen className="w-12 h-12 text-[#17477e]" strokeWidth={1.6} />
            <span className="absolute -translate-y-8 text-3xl">☀</span>
          </div>
          <div className="hidden xl:block text-4xl opacity-80">🌍</div>
        </div>
      </div>
      <nav className="bg-[#082d65] text-white border-b-4 border-cyan-400">
        <div className="max-w-7xl mx-auto px-3 sm:px-5 flex items-center gap-1 min-h-[46px]">
          <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="lg:hidden p-2 rounded-lg hover:bg-white/10" aria-label="Toggle navigation">{mobileMenuOpen ? <X /> : <Menu />}</button>
          <div className="hidden lg:flex flex-1 items-center justify-between gap-1 overflow-x-auto">
            {navLinks.map(({id,label,icon:Icon}) => <button key={id} onClick={() => handleNavClick(id)} className={`flex items-center gap-2 whitespace-nowrap rounded-lg px-2.5 py-2 text-xs font-bold transition-colors ${activeSection === id ? 'bg-amber-400 text-[#092c60]' : 'hover:bg-white/15'}`}><Icon className="w-5 h-5" />{label}</button>)}
          </div>
          <div className="ml-auto flex items-center gap-2">
            <button onClick={onOpenSearch} aria-label="Search" className="rounded-xl bg-white text-[#092c60] p-2"><Search className="w-5 h-5" /></button>
            <button onClick={toggleLanguage} className="rounded-xl border border-white/70 px-2.5 py-1.5 text-xs font-bold whitespace-nowrap">{language === 'en' ? 'हिंदी | En' : 'हि | English'}</button>
            <a href={adminUrl} target="_blank" rel="noopener noreferrer" className="inline-flex rounded-xl bg-white text-slate-900 px-2.5 py-1.5 text-xs font-extrabold items-center gap-1"><Shield className="w-4 h-4" /><span>Admin</span></a>
          </div>
        </div>
        {mobileMenuOpen && <div className="lg:hidden grid grid-cols-2 gap-2 p-3 bg-[#0b3979]">{navLinks.map(({id,label,icon:Icon}) => <button key={id} onClick={() => handleNavClick(id)} className="flex items-center gap-2 rounded-lg p-3 text-left text-sm font-semibold hover:bg-white/10"><Icon className="w-4 h-4" />{label}</button>)}<a href={adminUrl} target="_blank" rel="noopener noreferrer" className="rounded-lg p-3 bg-white text-[#092c60] font-bold text-center">Admin Dashboard</a></div>}
      </nav>
    </header>
  );
};

const GraduationCapMark: React.FC = () => <span aria-hidden="true" className="text-lg">🎓</span>;
