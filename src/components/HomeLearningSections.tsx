import React from 'react';
import { BookOpen, ClipboardCheck, GraduationCap, UserRound, ArrowRight, LayoutDashboard, FileText } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

type Props = { onNavigate: (page: string, filterClass?: string) => void };
export const HomeLearningSections: React.FC<Props> = ({ onNavigate }) => {
  const { language } = useLanguage();
  const en = language === 'en';
  const classes = ['6','7','8','9','10','11','12'];
  const courses = [
    { en: 'Social Science', hi: 'सामाजिक विज्ञान', descEn: 'History, Geography, Civics and Economics', descHi: 'इतिहास, भूगोल, नागरिक शास्त्र और अर्थशास्त्र', page: 'materials' },
    { en: 'Competitive Exams', hi: 'प्रतियोगी परीक्षाएँ', descEn: 'UGC NET, HTET, CTET and more', descHi: 'UGC NET, HTET, CTET और अन्य परीक्षाएँ', page: 'tests' },
    { en: 'Indian Constitution', hi: 'भारतीय संविधान', descEn: 'Constitution and political science resources', descHi: 'संविधान और राजनीति विज्ञान सामग्री', page: 'polity' }
  ];
  return <div className="bg-white">
    <section aria-labelledby="home-classes-title" className="py-12 border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-3 mb-2 text-sky-800"><BookOpen className="w-5 h-5" /><span className="text-sm font-bold">{en ? 'Class-wise learning' : 'कक्षावार अध्ययन'}</span></div>
        <h2 id="home-classes-title" className="text-2xl sm:text-3xl font-extrabold text-slate-900">{en ? 'Explore Classes & Courses' : 'कक्षाएँ और पाठ्यक्रम देखें'}</h2>
        <p className="mt-2 text-slate-600">{en ? 'Choose a class or explore a learning pathway.' : 'अपनी कक्षा या अध्ययन क्षेत्र चुनें।'}</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3 mt-6">
          {classes.map(level => <div key={level} className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-center hover:border-sky-400 transition-colors">
            <div className="mx-auto mb-3 grid place-items-center rounded-xl bg-sky-900 text-white w-12 h-12 font-bold text-lg">{level}</div>
            <h3 className="font-bold text-slate-900">{en ? 'Class' : 'कक्षा'} {level}</h3>
            <div className="grid gap-2 mt-3">
              <button onClick={() => onNavigate('materials',level)} className="rounded-lg bg-white border border-slate-200 py-2 text-xs font-semibold text-sky-900 hover:bg-sky-50">{en ? 'Study Notes' : 'नोट्स'}</button>
              <button onClick={() => onNavigate('tests',level)} className="rounded-lg bg-sky-900 py-2 text-xs font-semibold text-white hover:bg-sky-800">{en ? 'Practice Tests' : 'टेस्ट'}</button>
            </div>
          </div>)}
        </div>
        <div className="grid md:grid-cols-3 gap-4 mt-8">
          {courses.map(c => <button key={c.en} onClick={() => onNavigate(c.page)} className="text-left rounded-2xl border border-slate-200 bg-white p-5 hover:border-sky-400 hover:shadow-md transition-all">
            <GraduationCap className="w-7 h-7 text-sky-800 mb-3" />
            <h3 className="text-lg font-bold text-slate-900">{en ? c.en : c.hi}</h3>
            <p className="mt-2 text-sm text-slate-600">{en ? c.descEn : c.descHi}</p>
            <span className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-sky-800">{en ? 'Explore' : 'देखें'} <ArrowRight className="w-4 h-4" /></span>
          </button>)}
        </div>
      </div>
    </section>
    <section aria-labelledby="teacher-title" className="py-12 bg-slate-50 border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center gap-6">
        <div className="rounded-2xl bg-white border border-slate-200 p-5 shrink-0"><UserRound className="w-12 h-12 text-sky-900" /></div>
        <div className="flex-1">
          <h2 id="teacher-title" className="text-2xl sm:text-3xl font-extrabold text-slate-900">{en ? 'Meet Your Teacher' : 'अपने शिक्षक से मिलें'}</h2>
          <h3 className="mt-2 text-lg font-bold text-sky-900">{en ? 'Krishan Kumar' : 'कृष्ण कुमार'}</h3>
          <p className="text-slate-600">{en ? 'TGT Social Science · Government School Educator' : 'टीजीटी सामाजिक विज्ञान · सरकारी विद्यालय शिक्षक'}</p>
          <p className="mt-2 text-sm text-slate-600">{en ? 'Learn about academic qualifications, teaching experience and educational vision.' : 'शैक्षणिक योग्यताओं, शिक्षण अनुभव और शैक्षिक दृष्टिकोण के बारे में जानें।'}</p>
          <button onClick={() => onNavigate('about')} className="mt-4 inline-flex items-center gap-2 rounded-xl bg-sky-900 px-5 py-3 text-sm font-semibold text-white hover:bg-sky-800">{en ? 'View Teacher Profile' : 'शिक्षक परिचय देखें'} <ArrowRight className="w-4 h-4" /></button>
        </div>
      </div>
    </section>
    <section aria-labelledby="dashboard-title" className="py-12 bg-white border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-2 text-sky-800 text-sm font-bold mb-2"><LayoutDashboard className="w-5 h-5" /> {en ? 'Student learning hub' : 'विद्यार्थी अध्ययन केंद्र'}</div>
        <h2 id="dashboard-title" className="text-2xl sm:text-3xl font-extrabold text-slate-900">{en ? 'Student Dashboard' : 'विद्यार्थी डैशबोर्ड'}</h2>
        <p className="mt-2 text-slate-600">{en ? 'Quickly access your learning tools. Personal progress tracking will be available after secure student accounts are introduced.' : 'अध्ययन सुविधाओं तक तुरंत पहुँचें। सुरक्षित विद्यार्थी अकाउंट बनने के बाद व्यक्तिगत प्रगति दिखाई जाएगी।'}</p>
        <div className="grid sm:grid-cols-3 gap-4 mt-6">
          {[
            {icon:BookOpen, en:'My Classes', hi:'मेरी कक्षाएँ', page:'classes'},
            {icon:FileText, en:'Study Materials', hi:'अध्ययन सामग्री', page:'materials'},
            {icon:ClipboardCheck, en:'Practice Tests', hi:'अभ्यास टेस्ट', page:'tests'}
          ].map(item => <button key={item.page} onClick={() => onNavigate(item.page)} className="flex items-center justify-between gap-3 text-left p-5 rounded-2xl bg-sky-50 border border-sky-100 hover:border-sky-400 transition-colors">
            <span className="flex items-center gap-3 font-bold text-slate-900"><item.icon className="w-6 h-6 text-sky-900" />{en ? item.en : item.hi}</span><ArrowRight className="w-4 h-4 text-sky-900" />
          </button>)}
        </div>
      </div>
    </section>
  </div>;
};
