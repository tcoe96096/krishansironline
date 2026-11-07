import React from 'react';
import { useLanguage } from '../context/LanguageContext';
import { CheckCircle2, GraduationCap, BookOpen, ClipboardCheck, Trophy, UserRound, ArrowRight } from 'lucide-react';

interface HeroProps { onNavigate: (section: string) => void; }

export const Hero: React.FC<HeroProps> = ({ onNavigate }) => {
  const { language } = useLanguage();
  const en = language === 'en';
  const benefits = en ? ['Study Materials','Online Tests','Practice Questions','Revision Notes'] : ['अध्ययन सामग्री','ऑनलाइन टेस्ट','अभ्यास प्रश्न','रिवीजन नोट्स'];
  const actions = [
    { label: en ? 'Start Online Test' : 'ऑनलाइन टेस्ट दें', page: 'tests', Icon: ClipboardCheck, style: 'bg-[#12396f] text-white hover:bg-[#0d2d59]' },
    { label: en ? 'Explore Study Materials' : 'अध्ययन सामग्री देखें', page: 'materials', Icon: BookOpen, style: 'bg-[#078a8d] text-white hover:bg-[#067477]' },
    { label: en ? 'View Results' : 'परिणाम देखें', page: 'results', Icon: Trophy, style: 'bg-amber-500 text-white hover:bg-amber-600' },
    { label: en ? 'About Krishan Sir' : 'कृष्ण सर के बारे में', page: 'about', Icon: UserRound, style: 'bg-slate-100 text-[#12396f] hover:bg-slate-200' },
  ];

  return (
    <section className="relative overflow-hidden bg-gradient-to-r from-[#edf6ff] via-white to-[#f8fbf4] border-b border-slate-200">
      <div className="absolute inset-y-0 right-0 w-full lg:w-[48%] opacity-70 bg-no-repeat bg-right bg-contain pointer-events-none" style={{ backgroundImage: `url(${import.meta.env.BASE_URL}images/hero-background.webp)` }} aria-hidden="true" />
      <div className="relative z-10 max-w-7xl mx-auto px-5 sm:px-8 py-7 sm:py-9 lg:py-10 grid lg:grid-cols-12 gap-6 items-center">
        <div className="lg:col-span-7 relative z-10">
          <p className="text-lg sm:text-2xl font-extrabold text-[#12396f]">{en ? 'Welcome to' : 'आपका स्वागत है'}</p>
          <h1 className="mt-1 text-3xl sm:text-5xl lg:text-[3.4rem] leading-[1.08] font-extrabold tracking-tight text-[#12396f]">{en ? <>Krishan Sir <span className="text-[#078a8d]">Online Learning</span></> : <>कृष्ण सर <span className="text-[#078a8d]">ऑनलाइन लर्निंग</span></>}</h1>
          <div className="mt-3 h-1.5 w-48 rounded-full bg-gradient-to-r from-amber-400 via-amber-400 to-blue-800" />
          <p className="mt-4 max-w-2xl text-base sm:text-xl leading-snug font-medium text-slate-800">{en ? 'A Complete Learning Platform for School Education & Competitive Exams (Bilingual: Hindi – English)' : 'स्कूली शिक्षा एवं प्रतियोगी परीक्षाओं के लिए संपूर्ण अध्ययन मंच (हिंदी – अंग्रेज़ी)'}</p>
          <div className="mt-5 flex flex-wrap gap-x-5 gap-y-3">{benefits.map((item) => <span key={item} className="inline-flex items-center gap-2 text-sm sm:text-base font-bold text-slate-800"><CheckCircle2 className="w-5 h-5 text-green-600 fill-green-100" />{item}</span>)}</div>
        </div>

        <div className="lg:col-span-5 relative">
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl shadow-slate-900/10">
            <div className="grid grid-cols-[minmax(0,1fr)_42%] sm:grid-cols-[minmax(0,1fr)_40%] min-h-[230px] sm:min-h-[270px]">
              <div className="relative flex flex-col justify-end bg-gradient-to-br from-[#eaf4ff] via-[#f7fbff] to-[#dcecff] p-4 sm:p-5">
                <div className="absolute left-0 top-0 h-1 w-16 rounded-br-full bg-amber-400" />
                <span className="mb-auto inline-flex w-fit items-center gap-1.5 rounded-full bg-white/85 px-2.5 py-1 text-[10px] sm:text-xs font-bold text-[#12396f] shadow-sm"><GraduationCap className="h-4 w-4" />{en ? 'Meet Your Teacher' : 'आपके शिक्षक'}</span>
                <h2 className="text-lg sm:text-2xl font-extrabold leading-tight text-[#12396f]">{en ? 'Krishan Kumar' : 'कृष्ण कुमार'}</h2>
                <p className="mt-1 text-xs sm:text-sm font-bold text-[#078a8d]">{en ? 'TGT Social Science' : 'TGT सामाजिक विज्ञान'}</p>
                <p className="mt-1 text-[10px] sm:text-xs leading-snug text-slate-600">{en ? 'GGHS Dhanger, Haryana' : 'GGHS ढांगर, हरियाणा'}</p>
                <span className="mt-3 inline-flex w-fit rounded-md bg-[#12396f] px-2 py-1 text-[9px] sm:text-[10px] font-bold text-white">{en ? 'Haryana Education Department' : 'हरियाणा शिक्षा विभाग'}</span>
              </div>
              <div className="relative min-h-[230px] sm:min-h-[270px] bg-slate-100">
                <img src={`${import.meta.env.BASE_URL}images/krishan-sir.png`} alt={en ? 'Krishan Kumar, TGT Social Science' : 'कृष्ण कुमार, TGT सामाजिक विज्ञान'} className="absolute inset-0 h-full w-full object-cover object-top" loading="eager" />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 border-t border-slate-100 p-3 sm:p-4">
              <div className="rounded-lg bg-slate-50 p-2.5">
                <p className="text-[10px] sm:text-xs font-medium text-slate-500">{en ? 'Qualifications:' : 'शैक्षणिक योग्यताएँ:'}</p>
                <p className="mt-1 text-[10px] sm:text-[11px] font-semibold leading-snug text-slate-800">B.A. · M.A. (Pol. Sci.) · B.Ed. · M.Ed. · M.Phil.</p>
              </div>
              <div className="rounded-lg bg-slate-50 p-2.5">
                <p className="text-[10px] sm:text-xs font-medium text-slate-500">{en ? 'Eligibility Tests:' : 'पात्रता परीक्षाएँ:'}</p>
                <p className="mt-1 text-[10px] sm:text-[11px] font-semibold leading-snug text-slate-800">UGC NET (2×) · UGC NET Edu. · CTET · HTET</p>
              </div>
              <div className="rounded-lg bg-slate-50 p-2.5">
                <p className="text-[10px] sm:text-xs font-medium text-slate-500">{en ? 'Experience:' : 'अनुभव:'}</p>
                <p className="mt-1 text-[10px] sm:text-[11px] font-semibold leading-snug text-slate-800">{en ? '2 Yrs Asst. Prof. + 2 Yrs 8 Mos Govt. TGT' : '2 वर्ष सहायक प्रोफेसर + 2 वर्ष 8 माह सरकारी TGT'}</p>
              </div>
            </div>
            <div className="mx-3 mb-3 sm:mx-4 sm:mb-4 rounded-lg border border-sky-100 bg-sky-50/80 px-3 py-2 text-[10px] sm:text-xs leading-snug text-[#12396f]">
              {en ? '“Guiding students towards conceptual clarity, factual accuracy, and board exam excellence.”' : '“विद्यार्थियों को अवधारणात्मक स्पष्टता, तथ्यात्मक सटीकता और बोर्ड परीक्षा में उत्कृष्टता की ओर मार्गदर्शन।”'}
            </div>
            <div className="grid grid-cols-2 gap-2 px-3 pb-3 sm:px-4 sm:pb-4">
              {actions.map(({ label, page, Icon, style }) => <button key={page} type="button" onClick={() => onNavigate(page)} className={`inline-flex min-h-9 items-center justify-center gap-1 rounded-lg px-2 py-2 text-[10px] sm:text-xs font-bold transition-colors ${style}`}><Icon className="h-3.5 w-3.5 shrink-0" /><span>{label}</span><ArrowRight className="h-3 w-3 shrink-0" /></button>)}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
