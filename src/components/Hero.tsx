import React from 'react';
import { useLanguage } from '../context/LanguageContext';
import { CheckCircle2, GraduationCap, BookOpen } from 'lucide-react';

interface HeroProps { onNavigate: (section: string) => void; }

export const Hero: React.FC<HeroProps> = ({ onNavigate }) => {
  const { language } = useLanguage();
  const en = language === 'en';
  const benefits = en ? ['Study Materials','Online Tests','Practice Questions','Revision Notes'] : ['अध्ययन सामग्री','ऑनलाइन टेस्ट','अभ्यास प्रश्न','रिवीजन नोट्स'];

  return (
    <section className="relative overflow-hidden bg-gradient-to-r from-[#edf6ff] via-white to-[#f8fbf4] border-b border-slate-200">
      <div className="absolute inset-y-0 right-0 w-full lg:w-[48%] opacity-90 bg-no-repeat bg-right bg-contain pointer-events-none" style={{ backgroundImage: `url(${import.meta.env.BASE_URL}images/hero-background.webp)` }} aria-hidden="true" />
      <div className="relative z-10 max-w-7xl mx-auto px-5 sm:px-8 py-8 sm:py-10 lg:py-12 grid lg:grid-cols-12 gap-6 items-center">
        <div className="lg:col-span-7 relative z-10">
          <p className="text-lg sm:text-2xl font-extrabold text-[#12396f]">{en ? 'Welcome to' : 'आपका स्वागत है'}</p>
          <h1 className="mt-1 text-3xl sm:text-5xl lg:text-[3.4rem] leading-[1.08] font-extrabold tracking-tight text-[#12396f]">{en ? <>Krishan Sir <span className="text-[#078a8d]">Online Learning</span></> : <>कृष्ण सर <span className="text-[#078a8d]">ऑनलाइन लर्निंग</span></>}</h1>
          <div className="mt-3 h-1.5 w-48 rounded-full bg-gradient-to-r from-amber-400 via-amber-400 to-blue-800" />
          <p className="mt-4 max-w-2xl text-base sm:text-xl leading-snug font-medium text-slate-800">{en ? 'A Complete Learning Platform for School Education & Competitive Exams (Bilingual: Hindi – English)' : 'स्कूली शिक्षा एवं प्रतियोगी परीक्षाओं के लिए संपूर्ण अध्ययन मंच (हिंदी – अंग्रेज़ी)'}</p>
          <div className="mt-5 flex flex-wrap gap-x-5 gap-y-3">{benefits.map((item) => <span key={item} className="inline-flex items-center gap-2 text-sm sm:text-base font-bold text-slate-800"><CheckCircle2 className="w-5 h-5 text-green-600 fill-green-100" />{item}</span>)}</div>
        </div>

        <div className="lg:col-span-5 relative flex justify-center lg:justify-end">
          <div className="w-full max-w-[390px] rounded-3xl border border-white/80 bg-white/90 p-4 sm:p-5 shadow-xl shadow-slate-900/10 backdrop-blur-sm">
            <div className="flex items-center gap-4 sm:gap-5">
              <div className="h-28 w-24 sm:h-36 sm:w-32 shrink-0 overflow-hidden rounded-2xl border-2 border-white shadow-md bg-slate-100">
                <img
                  src={`${import.meta.env.BASE_URL}images/krishan-sir.png`}
                  alt={en ? 'Krishan Sir, Social Science Teacher' : 'कृष्ण सर, सामाजिक विज्ञान शिक्षक'}
                  className="h-full w-full object-cover object-top"
                  loading="eager"
                />
              </div>
              <div className="min-w-0">
                <div className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-2.5 py-1 text-xs font-bold text-[#12396f]">
                  <GraduationCap className="h-4 w-4" />
                  {en ? 'Meet Your Teacher' : 'आपके शिक्षक'}
                </div>
                <h2 className="mt-2 text-xl sm:text-2xl font-extrabold leading-tight text-[#12396f]">{en ? 'Krishan Kumar' : 'कृष्ण कुमार'}</h2>
                <p className="mt-1 text-sm sm:text-base font-bold text-[#078a8d]">{en ? 'TGT – Social Science' : 'टीजीटी – सामाजिक विज्ञान'}</p>
                <p className="mt-1 text-xs sm:text-sm leading-snug text-slate-600">{en ? 'Govt. Girls High School, Dhanger' : 'राजकीय कन्या उच्च विद्यालय, ढांगर'}</p>
              </div>
            </div>
            <div className="mt-4 flex items-center gap-2 border-t border-slate-100 pt-3 text-xs sm:text-sm font-semibold text-slate-700">
              <BookOpen className="h-4 w-4 shrink-0 text-[#078a8d]" />
              {en ? 'Social Science • Bilingual Learning' : 'सामाजिक विज्ञान • द्विभाषी शिक्षण'}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
