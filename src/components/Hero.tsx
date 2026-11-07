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
      <div className="absolute inset-y-0 right-0 w-full lg:w-[48%] opacity-90 bg-no-repeat bg-right bg-contain pointer-events-none" style={{ backgroundImage: `url(${import.meta.env.BASE_URL}images/hero-background.webp)` }} aria-hidden="true" />
      <div className="relative z-10 max-w-7xl mx-auto px-5 sm:px-8 py-8 sm:py-10 lg:py-12 grid lg:grid-cols-12 gap-5 items-center">
        <div className="lg:col-span-7 relative z-10">
          <p className="text-lg sm:text-2xl font-extrabold text-[#12396f]">{en ? 'Welcome to' : 'आपका स्वागत है'}</p>
          <h1 className="mt-1 text-3xl sm:text-5xl lg:text-[3.4rem] leading-[1.08] font-extrabold tracking-tight text-[#12396f]">{en ? <>Krishan Sir <span className="text-[#078a8d]">Online Learning</span></> : <>कृष्ण सर <span className="text-[#078a8d]">ऑनलाइन लर्निंग</span></>}</h1>
          <div className="mt-3 h-1.5 w-48 rounded-full bg-gradient-to-r from-amber-400 via-amber-400 to-blue-800" />
          <p className="mt-4 max-w-2xl text-base sm:text-xl leading-snug font-medium text-slate-800">{en ? 'A Complete Learning Platform for School Education & Competitive Exams (Bilingual: Hindi – English)' : 'स्कूली शिक्षा एवं प्रतियोगी परीक्षाओं के लिए संपूर्ण अध्ययन मंच (हिंदी – अंग्रेज़ी)'}</p>
          <div className="mt-5 flex flex-wrap gap-x-5 gap-y-3">{benefits.map((item) => <span key={item} className="inline-flex items-center gap-2 text-sm sm:text-base font-bold text-slate-800"><CheckCircle2 className="w-5 h-5 text-green-600 fill-green-100" />{item}</span>)}</div>
        </div>
        <div className="lg:col-span-5 relative min-h-[190px] sm:min-h-[240px] lg:min-h-[285px]" aria-hidden="true" />
      </div>
    </section>
  );
};
