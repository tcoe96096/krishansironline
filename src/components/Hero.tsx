import React from 'react';
import { useLanguage } from '../context/LanguageContext';
import { CheckCircle2, ArrowRight, BookOpen, GraduationCap, Laptop, Newspaper, FileText } from 'lucide-react';

interface HeroProps { onNavigate: (section: string) => void; }

export const Hero: React.FC<HeroProps> = ({ onNavigate }) => {
  const { language } = useLanguage();
  const en = language === 'en';
  const benefits = en ? ['Study Materials','Online Tests','Practice Questions','Revision Notes'] : ['अध्ययन सामग्री','ऑनलाइन टेस्ट','अभ्यास प्रश्न','रिवीजन नोट्स'];
  return (
    <section className="relative overflow-hidden bg-gradient-to-r from-[#edf6ff] via-white to-[#f8fbf4] border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-5 sm:px-8 py-8 sm:py-10 lg:py-12 grid lg:grid-cols-12 gap-5 items-center">
        <div className="lg:col-span-7 relative z-10">
          <p className="text-lg sm:text-2xl font-extrabold text-[#12396f]">{en ? 'Welcome to' : 'आपका स्वागत है'}</p>
          <h1 className="mt-1 text-3xl sm:text-5xl lg:text-[3.4rem] leading-[1.08] font-extrabold tracking-tight text-[#12396f]">{en ? <>Krishan Sir <span className="text-[#078a8d]">Online Learning</span></> : <>कृष्ण सर <span className="text-[#078a8d]">ऑनलाइन लर्निंग</span></>}</h1>
          <div className="mt-3 h-1.5 w-48 rounded-full bg-gradient-to-r from-amber-400 via-amber-400 to-blue-800" />
          <p className="mt-4 max-w-2xl text-base sm:text-xl leading-snug font-medium text-slate-800">{en ? 'A Complete Learning Platform for School Education & Competitive Exams (Bilingual: Hindi – English)' : 'स्कूली शिक्षा एवं प्रतियोगी परीक्षाओं के लिए संपूर्ण अध्ययन मंच (हिंदी – अंग्रेज़ी)'}</p>
          <div className="mt-5 flex flex-wrap gap-x-5 gap-y-3">{benefits.map((item) => <span key={item} className="inline-flex items-center gap-2 text-sm sm:text-base font-bold text-slate-800"><CheckCircle2 className="w-5 h-5 text-green-600 fill-green-100" />{item}</span>)}</div>
        </div>
        <div className="lg:col-span-5 relative min-h-[220px] sm:min-h-[270px] flex items-center justify-center">
          <div className="absolute inset-0 rounded-[45%] bg-gradient-to-br from-green-100/70 via-sky-50 to-amber-50 blur-2xl" />
          <div className="relative w-full max-w-[440px] h-[235px] sm:h-[285px]">
            <div className="absolute right-2 top-0 text-6xl sm:text-8xl drop-shadow-lg">🌍</div>
            <div className="absolute left-2 top-10 rounded-xl bg-white/90 p-3 shadow-lg"><span className="text-3xl">✏️📚</span><div className="text-xs font-bold text-slate-600">LEARN EVERY DAY</div></div>
            <div className="absolute left-8 right-5 bottom-5 space-y-1.5">
              {[
                ['Social Science','#1767b7'],['Political Science','#c51e46'],['Constitution of India','#16845c'],['Current Affairs','#703c91']
              ].map(([name,color]) => <div key={name} className="rounded-lg px-4 py-2 text-center text-sm sm:text-base font-extrabold text-white shadow-md border-b-4 border-black/10" style={{backgroundColor:color, transform:'perspective(500px) rotateX(-5deg)'}}>{name}</div>)}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
