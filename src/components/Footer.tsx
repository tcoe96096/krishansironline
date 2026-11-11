import React from 'react';
import { useLanguage } from '../context/LanguageContext';
import { TEACHER_INFO } from '../data/portalData';
import { BookOpen, ShieldCheck, ArrowUp, Mail, Phone, MapPin, GraduationCap } from 'lucide-react';

interface FooterProps { onNavigate: (section: string) => void; }

export const Footer: React.FC<FooterProps> = ({ onNavigate }) => {
  const { language } = useLanguage();
  const en = language === 'en';
  const scrollToTop = () => window.scrollTo({ top: 0, behavior: 'smooth' });
  return (
    <footer className="bg-[#071b38] text-slate-300 text-xs border-t-[3px] border-cyan-500">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-11 sm:py-14">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-10">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-white flex items-center justify-center text-[#0b3979] shadow-md"><BookOpen className="w-6 h-6" /></div>
              <div><div className="text-lg font-extrabold tracking-tight text-white">Krishan Sir</div><div className="text-amber-300 font-bold text-xs">Online Learning</div></div>
            </div>
            <p className="text-slate-400 text-xs leading-relaxed">{en ? 'A bilingual digital learning platform for school students, teachers and competitive exam aspirants.' : 'विद्यालयी विद्यार्थियों, शिक्षकों और प्रतियोगी परीक्षार्थियों के लिए द्विभाषी डिजिटल अध्ययन मंच।'}</p>
            <div className="text-[11px] text-slate-400">{en ? TEACHER_INFO.tagline.en : TEACHER_INFO.tagline.hi}</div>
          </div>
          <div className="space-y-3">
            <h4 className="text-xs font-extrabold text-white uppercase tracking-[.14em]">{en ? 'Educator' : 'शिक्षक परिचय'}</h4>
            <div className="font-bold text-slate-100">{TEACHER_INFO.name}</div>
            <div className="text-amber-300 text-[11px]">{TEACHER_INFO.designation}</div>
            <div className="text-slate-400 text-xs leading-relaxed">{TEACHER_INFO.school}</div>
            <div className="inline-flex items-center gap-2 text-slate-400 text-[11px]"><MapPin className="w-3.5 h-3.5" />Fatehabad, Haryana, India</div>
            <a href="tel:9812534934" className="flex items-center gap-2 text-cyan-200 hover:text-white text-[11px]"><Phone className="w-3.5 h-3.5" />9812534934</a>\n            <a href="mailto:krishansir.online@gmail.com" className="flex items-center gap-2 text-amber-300 hover:text-amber-200 text-[11px]"><Mail className="w-3.5 h-3.5" />krishansir.online@gmail.com</a>
          </div>
          <div className="space-y-3">
            <h4 className="text-xs font-extrabold text-white uppercase tracking-[.14em]">{en ? 'Quick Gateways' : 'त्वरित लिंक'}</h4>
            <ul className="space-y-2 text-xs text-slate-400">
              <li><button onClick={() => onNavigate('classes')} className="hover:text-amber-300 transition-colors">{en ? 'Classes 6–12' : 'कक्षा 6–12'}</button></li>
              <li><button onClick={() => onNavigate('exams')} className="hover:text-amber-300 transition-colors">{en ? 'All Competitive Exams' : 'सभी प्रतियोगी परीक्षाएँ'}</button></li>\n              <li><button onClick={() => onNavigate('tests')} className="hover:text-amber-300 transition-colors">{en ? 'Online Test Simulator' : 'ऑनलाइन टेस्ट'}</button></li>
              <li><button onClick={() => onNavigate('materials')} className="hover:text-amber-300 transition-colors">{en ? 'Chapter-Wise Study Notes' : 'अध्यायवार अध्ययन सामग्री'}</button></li>
              <li><button onClick={() => onNavigate('affairs')} className="hover:text-amber-300 transition-colors">{en ? 'Current Affairs' : 'करेंट अफेयर्स'}</button></li>
              <li><button onClick={() => onNavigate('polity')} className="hover:text-amber-300 transition-colors">{en ? 'Indian Constitution' : 'भारतीय संविधान'}</button></li>
              <li><button onClick={() => onNavigate('about')} className="hover:text-amber-300 transition-colors">{en ? 'About Krishan Sir' : 'कृष्ण सर के बारे में'}</button></li>
            </ul>
          </div>
          <div className="space-y-3">
            <h4 className="text-xs font-extrabold text-white uppercase tracking-[.14em]">{en ? 'Learning Promise' : 'हमारा उद्देश्य'}</h4>
            <p className="text-slate-400 text-xs leading-relaxed">{en ? 'Free educational resources to encourage regular practice, independent learning and academic improvement.' : 'नियमित अभ्यास, स्वतंत्र अध्ययन और शैक्षणिक सुधार को प्रोत्साहित करने के लिए निःशुल्क शैक्षणिक संसाधन।'}</p>
            <div className="p-3 rounded-xl bg-white/5 border border-white/10 text-[11px] text-slate-300 flex items-start gap-2"><ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" /><span>{en ? 'Educational resources designed for responsible learning.' : 'जिम्मेदार और गुणवत्तापूर्ण शिक्षा के लिए तैयार संसाधन।'}</span></div>
            <div className="inline-flex items-center gap-2 text-[11px] text-cyan-200"><GraduationCap className="w-4 h-4" />{en ? 'Learn • Practice • Improve • Succeed' : 'सीखें • अभ्यास करें • सुधारें • सफल हों'}</div>
          </div>
        </div>
      </div>
      <div className="border-t border-white/10 bg-[#041329] py-4 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-[10px] sm:text-[11px] text-slate-400">
          <div>© {new Date().getFullYear()} Krishan Sir – Online Learning. {en ? 'All rights reserved.' : 'सर्वाधिकार सुरक्षित।'}</div>
          <button onClick={scrollToTop} className="px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white transition-colors flex items-center gap-2" title="Scroll to Top"><span>{en ? 'Back to top' : 'ऊपर जाएँ'}</span><ArrowUp className="w-3.5 h-3.5" /></button>
        </div>
      </div>
    </footer>
  );
};
