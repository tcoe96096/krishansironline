import React from 'react';
import { useLanguage } from '../context/LanguageContext';
import { CheckCircle2, Award, BookOpen } from 'lucide-react';

interface HeroProps { onNavigate: (section: string) => void; }

export const Hero: React.FC<HeroProps> = ({ onNavigate }) => {
  const { language } = useLanguage();
  const en = language === 'en';
  const benefits = en ? ['Study Materials','Online Tests','Practice Questions','Revision Notes'] : ['अध्ययन सामग्री','ऑनलाइन टेस्ट','अभ्यास प्रश्न','रिवीजन नोट्स'];
  const shortQualifications = en
    ? ['M.A. Political Science','M.Phil.','UGC NET – Political Science (2×)','UGC NET – Education','B.Ed. • M.Ed.','CTET (Both Levels) • HTET']
    : ['एम.ए. राजनीति विज्ञान','एम.फिल.','UGC NET – राजनीति विज्ञान (2 बार)','UGC NET – शिक्षा','बी.एड. • एम.एड.','CTET (दोनों स्तर) • HTET'];

  return (
    <section className="relative overflow-hidden bg-gradient-to-r from-[#edf6ff] via-white to-[#f8fbf4] border-b border-slate-200">
      <div className="absolute inset-y-0 right-0 w-full lg:w-[48%] opacity-90 bg-no-repeat bg-right bg-contain pointer-events-none" style={{ backgroundImage: `url(${import.meta.env.BASE_URL}images/hero-background.webp)` }} aria-hidden="true" />
      <div className="relative z-10 max-w-7xl mx-auto px-5 sm:px-8 py-7 sm:py-9 lg:py-10 grid lg:grid-cols-12 gap-6 items-center">
        {/* Left side: keep the existing Welcome / Hero content */}
        <div className="lg:col-span-7 relative z-10">
          <p className="text-lg sm:text-2xl font-extrabold text-[#12396f]">{en ? 'Welcome to' : 'आपका स्वागत है'}</p>
          <h1 className="mt-1 text-3xl sm:text-5xl lg:text-[3.4rem] leading-[1.08] font-extrabold tracking-tight text-[#12396f]">{en ? <>Krishan Sir <span className="text-[#078a8d]">Online Learning</span></> : <>कृष्ण सर <span className="text-[#078a8d]">ऑनलाइन लर्निंग</span></>}</h1>
          <div className="mt-3 h-1.5 w-48 rounded-full bg-gradient-to-r from-amber-400 via-amber-400 to-blue-800" />
          <p className="mt-4 max-w-2xl text-base sm:text-xl leading-snug font-medium text-slate-800">{en ? 'A Complete Learning Platform for School Education & Competitive Exams (Bilingual: Hindi – English)' : 'स्कूली शिक्षा एवं प्रतियोगी परीक्षाओं के लिए संपूर्ण अध्ययन मंच (हिंदी – अंग्रेज़ी)'}</p>
          <div className="mt-5 flex flex-wrap gap-x-5 gap-y-3">{benefits.map((item) => <span key={item} className="inline-flex items-center gap-2 text-sm sm:text-base font-bold text-slate-800"><CheckCircle2 className="w-5 h-5 text-green-600 fill-green-100" />{item}</span>)}</div>
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <button onClick={() => onNavigate('tests')} className="rounded-xl bg-gradient-to-r from-blue-700 to-sky-500 px-5 py-2.5 text-sm font-bold text-amber-300 shadow-md transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_0_18px_rgba(251,191,36,0.65)]">{en ? 'Test' : 'टेस्ट'}</button>
            <button onClick={() => onNavigate('materials')} className="rounded-xl bg-gradient-to-r from-blue-700 to-sky-500 px-5 py-2.5 text-sm font-bold text-amber-300 shadow-md transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_0_18px_rgba(251,191,36,0.65)]">{en ? 'Study Material' : 'अध्ययन सामग्री'}</button>
            <button onClick={() => onNavigate('about')} className="rounded-xl bg-gradient-to-r from-blue-700 to-sky-500 px-5 py-2.5 text-sm font-bold text-amber-300 shadow-md transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_0_18px_rgba(251,191,36,0.65)]">{en ? 'About Teacher' : 'शिक्षक परिचय'}</button>
          </div>
        </div>

        {/* Right side: same portrait treatment as the About Teacher section */}
        <div className="lg:col-span-5 relative z-10 flex justify-center lg:justify-end">
          <div className="w-full max-w-[390px] space-y-3">
            <div className="bg-slate-50 rounded-2xl p-3 sm:p-4 border border-slate-200 shadow-sm">
              <div className="relative aspect-[4/3] sm:aspect-square w-full rounded-xl overflow-hidden bg-slate-200 shadow-xs border border-slate-200">
                <img
                  src={`${import.meta.env.BASE_URL}images/krishan-sir.png`}
                  alt={en ? 'Krishan Kumar – TGT Social Science' : 'कृष्ण कुमार – टीजीटी सामाजिक विज्ञान'}
                  className="w-full h-full object-cover object-[24%_28%]"
                  loading="eager"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-slate-950/85 via-slate-900/50 to-transparent p-4 text-white">
                  <div className="text-base sm:text-lg font-bold">{en ? 'Krishan Kumar' : 'कृष्ण कुमार'}</div>
                  <div className="text-xs sm:text-sm text-amber-300">{en ? 'TGT Social Science · Government School Educator' : 'टीजीटी सामाजिक विज्ञान · सरकारी विद्यालय शिक्षक'}</div>
                </div>
              </div>

              <div className="mt-3 rounded-xl border border-slate-200 bg-white p-3">
                <h2 className="flex items-center gap-2 text-xs sm:text-sm font-bold text-slate-900">
                  <Award className="h-4 w-4 text-amber-600 shrink-0" />
                  {en ? 'Academic Qualifications' : 'शैक्षणिक योग्यताएँ'}
                </h2>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {shortQualifications.map((item) => <span key={item} className="px-2 py-1 rounded-md bg-slate-50 border border-slate-200 text-[10px] sm:text-[11px] font-semibold text-slate-700">{item}</span>)}
                </div>
                <div className="mt-3 rounded-xl border border-sky-200 bg-white/95 px-4 py-3 text-center shadow-sm">
                  <div className="flex items-center justify-center gap-2 text-[#12396f]">
                    <BookOpen className="h-4 w-4 shrink-0 text-[#078a8d]" />
                    <p className="text-xs font-extrabold leading-relaxed">
                      {en ? 'Guiding Students Towards Conceptual Clarity, Factual Accuracy & Board Exam Excellence' : 'विद्यार्थियों को अवधारणात्मक स्पष्टता, तथ्यात्मक सटीकता एवं बोर्ड परीक्षा में उत्कृष्टता की ओर मार्गदर्शन'}
                    </p>
                  </div>
                </div>
                </div>
              </div>
            </div>


          </div>
        </div>
      </div>
    </section>
  );
};
