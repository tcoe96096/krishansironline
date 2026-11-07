import React from 'react';
import { useLanguage } from '../context/LanguageContext';
import { TEACHER_INFO } from '../data/portalData';
import { BookOpen, ShieldCheck, ArrowUp } from 'lucide-react';

interface FooterProps {
  onNavigate: (section: string) => void;
}

export const Footer: React.FC<FooterProps> = ({ onNavigate }) => {
  const { language } = useLanguage();

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <footer className="bg-slate-900 text-slate-300 text-xs border-t border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-sky-800 flex items-center justify-center text-amber-300"><BookOpen className="w-4 h-4" /></div>
              <span className="text-base font-bold text-white font-display">Krishan Sir</span>
            </div>
            <div className="text-amber-300 font-semibold text-xs">Online Learning</div>
            <p className="text-slate-400 text-xs leading-relaxed">A dedicated digital education platform for school students, teachers, and competitive exam aspirants across Classes 6 to 12.</p>
            <div className="text-[11px] text-slate-400 pt-1">{TEACHER_INFO.tagline.en}</div>
          </div>

          <div className="space-y-2">
            <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-2">Educator & Institution</h4>
            <div className="font-semibold text-slate-100">{TEACHER_INFO.name}</div>
            <div className="text-amber-300 text-[11px]">{TEACHER_INFO.designation}</div>
            <div className="text-slate-400 text-xs leading-relaxed">{TEACHER_INFO.school}</div>
            <div className="text-slate-400 text-[11px]">District Fatehabad, Haryana, India · PIN 125048</div>
            <div className="text-[11px] text-slate-400 pt-1">UGC NET Pol Sci (2x) · M.Phil · M.Ed · CTET · HTET</div>
            <a href="mailto:krishansir.online@gmail.com" className="inline-flex items-center gap-1.5 text-amber-300 hover:text-amber-200 text-[11px] pt-1">krishansir.online@gmail.com</a>
          </div>

          <div className="space-y-2">
            <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-2">Quick Gateways</h4>
            <ul className="space-y-1.5 text-xs text-slate-400">
              <li><button onClick={() => onNavigate('tests')} className="hover:text-amber-300 transition-colors">Online Test Simulator</button></li>
              <li><button onClick={() => onNavigate('materials')} className="hover:text-amber-300 transition-colors">Chapter-Wise Study Notes</button></li>
              <li><button onClick={() => onNavigate('affairs')} className="hover:text-amber-300 transition-colors">Current Affairs & General Awareness</button></li>
              <li><button onClick={() => onNavigate('tests')} className="hover:text-amber-300 transition-colors">Competitive Exam Preparation</button></li>
              <li><button onClick={() => onNavigate('polity')} className="hover:text-amber-300 transition-colors">Indian Constitution & Preamble Explorer</button></li>
              <li><button onClick={() => onNavigate('about')} className="hover:text-amber-300 transition-colors">About Krishan Sir</button></li>
            </ul>
          </div>

          <div className="space-y-3">
            <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-2">Educational Purpose</h4>
            <p className="text-slate-400 text-xs leading-relaxed">This non-commercial educational portal offers free learning resources to encourage regular practice, independent learning, and academic improvement for all learners.</p>
            <div className="p-3 rounded-lg bg-slate-800/80 border border-slate-700/80 text-[11px] text-slate-300 flex items-start gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <span>Free educational access under fair-use educational guidance.</span>
            </div>
          </div>
        </div>
      </div>

      <div className="border-t border-slate-800 bg-slate-950 py-4 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px] text-slate-400">
          <div>© {new Date().getFullYear()} Krishan Sir – Online Learning. Managed by Krishan Kumar (TGT Social Science, GGHS Dhanger, Haryana).</div>
          <div className="flex items-center gap-4">
            <span>Learn • Practice • Improve • Succeed</span>
            <button onClick={scrollToTop} className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-white transition-colors flex items-center gap-1" title="Scroll to Top"><span>Top</span><ArrowUp className="w-3.5 h-3.5" /></button>
          </div>
        </div>
      </div>
    </footer>
  );
};
