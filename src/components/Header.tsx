import React, { useEffect, useRef, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { Search, Menu, X, Home, Layers, BookOpen, Laptop, Newspaper, Info, Phone, Shield, UserRound, GraduationCap, ChevronDown, FileText, Globe } from 'lucide-react';

interface HeaderProps {
  activeSection: string;
  onNavigate: (section: string) => void;
  onOpenSearch: () => void;
  onOpenAuth: () => void;
}

export const Header: React.FC<HeaderProps> = ({ activeSection, onNavigate, onOpenSearch, onOpenAuth }) => {
  const { language, toggleLanguage } = useLanguage();
  const { user, profile, profileLoading, signOut } = useAuth();
  const studentDisplayName = profile?.student_name || user?.user_metadata?.full_name || user?.user_metadata?.name || (profileLoading ? (language === 'en' ? 'Loading…' : 'लोड हो रहा है…') : (language === 'en' ? 'Student' : 'विद्यार्थी'));
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [headerHiddenOnScroll, setHeaderHiddenOnScroll] = useState(false);
  const lastScrollY = useRef(0);

  // Auto-hide the site header in an active exam on both mobile and desktop.
  // Scrolling down hides it; scrolling up reveals it. The floating exam watch
  // reads the measured header height and follows this visibility state.
  const headerRef = useRef<HTMLElement | null>(null);
  useEffect(() => {
    const header = headerRef.current;
    if (!header) return;
    const root = document.documentElement;
    const updateHeaderHeight = () => {
      root.style.setProperty('--exam-header-visible-height', `${Math.ceil(header.getBoundingClientRect().height)}px`);
    };
    updateHeaderHeight();
    const resizeObserver = new ResizeObserver(updateHeaderHeight);
    resizeObserver.observe(header);
    window.addEventListener('resize', updateHeaderHeight);
    return () => {
      resizeObserver.disconnect();
      window.removeEventListener('resize', updateHeaderHeight);
      root.style.removeProperty('--exam-header-visible-height');
    };
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    const body = document.body;
    root.classList.toggle('exam-header-hidden', headerHiddenOnScroll);
    body.classList.toggle('exam-header-hidden', headerHiddenOnScroll);
    return () => {
      root.classList.remove('exam-header-hidden');
      body.classList.remove('exam-header-hidden');
    };
  }, [headerHiddenOnScroll]);

  useEffect(() => {
    const handleScroll = () => {
      const examActive = document.body.classList.contains('exam-mode-active') || document.documentElement.classList.contains('exam-mode-active');
      const currentY = Math.max(0, window.scrollY);
      if (!examActive || currentY < 24) {
        setHeaderHiddenOnScroll(false);
        lastScrollY.current = currentY;
        return;
      }
      const delta = currentY - lastScrollY.current;
      if (delta > 5) setHeaderHiddenOnScroll(true);
      else if (delta < -5) setHeaderHiddenOnScroll(false);
      lastScrollY.current = currentY;
    };
    lastScrollY.current = Math.max(0, window.scrollY);
    window.addEventListener('scroll', handleScroll, { passive: true });
    const observer = new MutationObserver(handleScroll);
    observer.observe(document.body, { attributes: true, attributeFilter: ['class'] });
    return () => {
      window.removeEventListener('scroll', handleScroll);
      observer.disconnect();
    };
  }, []);
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const [accountMenuError, setAccountMenuError] = useState('');
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
  return (
    <header ref={headerRef} className={`sticky top-0 z-40 bg-white/95 shadow-[0_8px_30px_rgba(10,35,75,.12)] backdrop-blur-xl transition-transform duration-300 ease-out will-change-transform ${headerHiddenOnScroll ? "-translate-y-full" : "translate-y-0"}`}>
      <div className="bg-[#090d14] text-white border-b border-white/10">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 min-h-[18px] flex items-center justify-center overflow-hidden">
          <div className="flex items-center justify-center gap-x-3 sm:gap-x-5 whitespace-nowrap text-[8px] sm:text-[10px] font-semibold tracking-wide text-slate-200">
            <span className="text-amber-300">✦ {language === 'en' ? 'WELCOME' : 'स्वागत है'}</span>
            <span><span className="text-amber-400 font-extrabold animate-pulse">{language === 'en' ? 'FREE Online Learning' : 'फ्री ऑनलाइन लर्निंग'}</span><span> • {language === 'en' ? 'Classes 6–12 • Competitive Exams' : 'कक्षा 6–12 • प्रतियोगी परीक्षाएँ'}</span></span>
            <span className="hidden sm:inline text-cyan-300">| {language === 'en' ? 'Learn • Practice • Succeed' : 'सीखें • अभ्यास करें • सफल हों'}</span>
          </div>
        </div>
      </div>

      <div className="relative isolate overflow-visible bg-[#f2f7fc]">
        <div className="absolute inset-0 -z-10 bg-no-repeat bg-center bg-cover opacity-[.18]" style={{ backgroundImage: `url(${import.meta.env.BASE_URL}images/file_00000000eb6482108586a0d9a2d631c8.png)` }} aria-hidden="true" />
        <div className="absolute inset-0 -z-10 bg-gradient-to-r from-white/95 via-white/85 to-[#e9f4ff]/90" aria-hidden="true" />
        <div className="relative max-w-7xl mx-auto px-3 sm:px-5 py-1 sm:py-0 flex flex-col items-stretch justify-center gap-1.5 lg:grid lg:grid-cols-[1fr_auto_1fr] sm:items-center sm:gap-3">
          <div className="flex w-full items-center gap-1.5 min-w-0 sm:w-auto sm:flex-none sm:col-start-1">
            <a href={import.meta.env.BASE_URL} onClick={(e) => { e.preventDefault(); handleNavClick('home'); }} aria-label="Go to home page" className="h-[44px] w-[44px] sm:h-[58px] sm:w-[58px] shrink-0 overflow-hidden rounded-full border-[3px] border-white bg-white shadow-lg ring-2 ring-[#17477e]/70 cursor-pointer">
              <img src={`${import.meta.env.BASE_URL}images/file_0000000037ec8208af2a0ed280e2faf8.png`} alt="Krishan Sir Online Learning logo" className="h-full w-full rounded-full object-contain" onError={(e) => { e.currentTarget.src = `${import.meta.env.BASE_URL}images/krishan-sir-logo.svg`; }} />
            </a>
            <a href={import.meta.env.BASE_URL} onClick={(e) => { e.preventDefault(); handleNavClick('home'); }} aria-label="Krishan Sir branding - Go to home page" className="min-w-0 cursor-pointer no-underline">
            <div className="min-w-0">
              <div className="text-[clamp(1.3rem,3.2vw,2rem)] leading-[1.02] font-extrabold tracking-[-.04em] text-[#102f63]">Krishan Sir</div>
              <div className="mt-0.5 inline-flex items-center gap-1.5 rounded-md bg-[#087d9b] px-2.5 sm:px-3 py-0.5 text-white text-[11px] sm:text-xs font-bold tracking-wide shadow-sm"><GraduationCap className="w-3 h-3" /> Online Learning</div>
              <div className="mt-0.5 text-[6px] sm:text-[7px] font-semibold tracking-[.08em] uppercase text-[#24466f]">Learn <span className="text-amber-500">•</span> Practice <span className="text-amber-500">•</span> Improve <span className="text-amber-500">•</span> Succeed</div>
            </div>
            </a>
          </div>

          <div className="relative z-10 hidden lg:flex w-full shrink-0 items-center justify-end gap-1 py-1 sm:w-auto sm:gap-2 sm:py-0 sm:col-start-3 sm:row-start-1 sm:justify-self-end sm:translate-x-0" aria-label="Header tools">
            <button onClick={onOpenSearch} aria-label="Search" title="Search" className="h-10 w-10 sm:min-h-7 sm:h-7 sm:w-[360px] inline-flex shrink-0 items-center justify-center gap-1.5 rounded-xl bg-white text-[#092c60] px-0 sm:px-3 py-1 shadow-sm ring-1 ring-[#17477e]/15 text-xs sm:text-sm font-bold transition hover:-translate-y-0.5 hover:shadow-md"><Search className="w-4 h-4 shrink-0" /><span className="hidden sm:inline">Search</span></button>
            <div className="flex shrink-0 items-center gap-1 sm:ml-4 sm:gap-4">
              <div role="group" aria-label="Select language" className="inline-flex h-9 sm:h-8 items-center rounded-full border border-[#17477e]/15 bg-[#eaf1fb] p-1 shadow-sm">
                <button type="button" onClick={() => { if (language === 'en') toggleLanguage(); }} aria-pressed={language !== 'en'} aria-label="हिन्दी" className={`rounded-full px-2.5 sm:px-3 h-full text-[11px] sm:text-xs font-extrabold transition-colors ${language !== 'en' ? 'bg-[#123c70] text-white shadow-sm' : 'text-[#17477e] hover:bg-white/80'}`}><span className="sm:hidden">HI</span><span className="hidden sm:inline">हिन्दी</span></button>
                <button type="button" onClick={() => { if (language !== 'en') toggleLanguage(); }} aria-pressed={language === 'en'} aria-label="English" className={`rounded-full px-2.5 sm:px-3 h-full text-[11px] sm:text-xs font-extrabold transition-colors ${language === 'en' ? 'bg-[#123c70] text-white shadow-sm' : 'text-[#17477e] hover:bg-white/80'}`}><span className="sm:hidden">EN</span><span className="hidden sm:inline">English</span></button>
              </div>
              <div className="relative">
              <button type="button" onClick={() => { if (user) setAccountMenuOpen(open => !open); else onOpenAuth(); }} aria-haspopup={user ? 'menu' : undefined} aria-expanded={user ? accountMenuOpen : undefined} aria-label={user ? "Open student account" : "Student Login"} title={user ? studentDisplayName : "Student Login"} className="h-10 w-10 sm:min-h-7 sm:h-7 sm:w-auto sm:max-w-none inline-flex items-center justify-center gap-1.5 rounded-xl bg-[#092f68] text-white px-0 sm:px-3 py-1 text-[11px] sm:text-sm font-extrabold shadow-sm transition hover:-translate-y-0.5 hover:bg-[#124887] hover:shadow-md"><UserRound className="w-4 h-4 shrink-0" /><span className="hidden sm:inline max-w-[180px] truncate">{user ? studentDisplayName : "Student Login"}</span>{user && <ChevronDown className={`w-3.5 h-3.5 shrink-0 transition-transform ${accountMenuOpen ? 'rotate-180' : ''}`} />}</button>
              {user && accountMenuOpen && <div role="menu" aria-label="Student account options" className="absolute right-0 top-full z-[80] mt-2 w-56 overflow-hidden rounded-xl border border-slate-200 bg-white py-1.5 text-slate-800 shadow-[0_16px_40px_rgba(15,23,42,.22)]">
                <div className="border-b border-slate-100 px-4 py-2.5"><p className="truncate text-sm font-bold text-slate-900">{studentDisplayName}</p><p className="text-[11px] text-slate-500">{language === 'en' ? 'Student Account' : 'विद्यार्थी खाता'}</p></div>
                <button role="menuitem" type="button" onClick={() => { setAccountMenuOpen(false); setAccountMenuError(''); handleNavClick('studentDashboard'); }} className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm font-semibold hover:bg-sky-50"><UserRound className="h-4 w-4 text-sky-800" />{language === 'en' ? 'My Dashboard' : 'मेरा डैशबोर्ड'}</button>
                <button role="menuitem" type="button" onClick={() => { setAccountMenuOpen(false); setAccountMenuError(''); handleNavClick('results'); }} className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm font-semibold hover:bg-sky-50"><FileText className="h-4 w-4 text-sky-800" />{language === 'en' ? 'My Results' : 'मेरे परिणाम'}</button>
                <button role="menuitem" type="button" onClick={() => { setAccountMenuOpen(false); setAccountMenuError(''); handleNavClick('studentDashboard'); }} className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm font-semibold hover:bg-sky-50"><UserRound className="h-4 w-4 text-sky-800" />{language === 'en' ? 'My Profile' : 'मेरी प्रोफाइल'}</button>
                <div className="my-1 border-t border-slate-100" />
                <button role="menuitem" type="button" onClick={async () => { setAccountMenuError(''); try { await signOut(); setAccountMenuOpen(false); } catch (error) { setAccountMenuError(error instanceof Error ? error.message : 'Sign out failed.'); } }} className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm font-semibold text-rose-700 hover:bg-rose-50"><Shield className="h-4 w-4" />{language === 'en' ? 'Sign Out' : 'लॉगआउट'}</button>
                {accountMenuError && <p role="alert" className="px-4 py-2 text-xs text-rose-700">{accountMenuError}</p>}
              </div>}
            </div>
            </div>
          </div>
          <div className="hidden lg:block lg:col-start-3" aria-hidden="true" />
        </div>
      </div>

      <nav className="bg-[#edf3f9] text-[#173b68] border-b-[3px] border-[#c8d9e9] shadow-sm" aria-label="Main navigation">
        <div className="max-w-7xl mx-auto px-3 sm:px-5 flex items-center justify-between gap-2 min-h-[44px]">
                    <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="lg:hidden inline-flex items-center gap-2 p-2 rounded-lg text-[#173b68] hover:bg-[#dce8f3]" aria-label="Toggle navigation" aria-expanded={mobileMenuOpen}>
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            <span className="text-xs font-bold">{language === 'en' ? 'Menu' : 'मेन्यू'}</span>
            <ChevronDown className={`w-3.5 h-3.5 transition-transform ${mobileMenuOpen ? 'rotate-180' : ''}`} />
          </button>
<div className="lg:hidden flex items-center justify-end gap-2">
            <button type="button" onClick={onOpenSearch} aria-label="Search" title="Search" className="h-10 w-10 shrink-0 inline-flex items-center justify-center rounded-xl border border-[#17477e]/20 bg-white text-[#092c60] shadow-sm transition hover:bg-[#f5f9ff]"><Search className="h-4 w-4" /></button>
            <div role="group" aria-label="Select language" className="inline-flex h-10 shrink-0 items-center rounded-xl border border-[#17477e]/20 bg-white p-1 shadow-sm">
              <button type="button" onClick={() => { if (language === 'en') toggleLanguage(); }} aria-pressed={language !== 'en'} aria-label="हिन्दी" className={`h-full rounded-full px-2 text-[11px] font-extrabold ${language !== 'en' ? 'bg-[#123c70] text-white shadow-sm' : 'text-[#17477e]'}`}>HI</button>
              <button type="button" onClick={() => { if (language !== 'en') toggleLanguage(); }} aria-pressed={language === 'en'} aria-label="English" className={`h-full rounded-full px-2 text-[11px] font-extrabold ${language === 'en' ? 'bg-[#123c70] text-white shadow-sm' : 'text-[#17477e]'}`}>EN</button>
            </div>
            <button type="button" onClick={() => onOpenAuth()} aria-label={user ? "Open student dashboard" : "Student Login"} title={user ? studentDisplayName : "Student Login"} className="h-10 min-w-10 max-w-[150px] shrink-0 inline-flex items-center justify-center gap-1.5 rounded-xl border border-[#17477e]/20 bg-[#123c70] px-2 text-white shadow-sm transition hover:bg-[#124887]"><UserRound className="h-4 w-4 shrink-0" /><span className="max-w-[92px] truncate text-[11px] font-bold">{user ? studentDisplayName : (language === "en" ? "Login" : "लॉगिन")}</span></button>
          </div>
          <div className="hidden lg:flex flex-1 items-center justify-between gap-1">
            {navLinks.map(({id,label,icon:Icon}) => <button key={id} onClick={() => handleNavClick(id)} aria-current={activeSection === id ? 'page' : undefined} className={`flex items-center gap-2 whitespace-nowrap rounded-lg px-2.5 py-1 text-xs sm:text-sm font-extrabold transition-all ${activeSection === id ? 'bg-[#d4e5f3] text-[#092c60] shadow-sm ring-1 ring-[#b7cde1]' : 'text-[#24466f] hover:bg-[#dce8f3] hover:text-[#092c60]'}`}><Icon className="w-4 h-4" />{label}</button>)}
          </div>
        </div>
        {mobileMenuOpen && <div className="lg:hidden grid grid-cols-2 sm:grid-cols-3 gap-2 p-3 bg-[#edf3f9] border-t border-[#c8d9e9]">{navLinks.map(({id,label,icon:Icon}) => <button key={id} onClick={() => handleNavClick(id)} aria-current={activeSection === id ? 'page' : undefined} className={`flex items-center gap-2 rounded-xl p-3 text-left text-xs sm:text-sm font-extrabold transition ${activeSection === id ? 'bg-[#d4e5f3] text-[#092c60]' : 'bg-white text-[#24466f] hover:bg-[#dce8f3]'}`}><Icon className="w-4 h-4 shrink-0" />{label}</button>)}</div>}
      </nav>
    </header>
  );
};
