import React from 'react';
import { useLanguage } from '../context/LanguageContext';
import { CheckCircle2, Award, BookOpen, ArrowUpRight, Sparkles } from 'lucide-react';

interface HeroProps { onNavigate: (section: string) => void; }

export const Hero: React.FC<HeroProps> = ({ onNavigate }) => {
  const { language } = useLanguage();
  const en = language === 'en';
  const benefits = en ? ['Study Materials', 'Online Tests', 'Practice Questions', 'Revision Notes'] : ['अध्ययन सामग्री', 'ऑनलाइन टेस्ट', 'अभ्यास प्रश्न', 'रिवीजन नोट्स'];
  const shortQualifications = en
    ? ['M.A. Political Science', 'M.Phil.', 'UGC NET – Political Science (2×)', 'UGC NET – Education', 'B.Ed. • M.Ed.', 'CTET (Both Levels) • HTET']
    : ['एम.ए. राजनीति विज्ञान', 'एम.फिल.', 'UGC NET – राजनीति विज्ञान (2 बार)', 'UGC NET – शिक्षा', 'बी.एड. • एम.एड.', 'CTET (दोनों स्तर) • HTET'];
  const heroButtons = [
    { label: en ? 'Explore Tests' : 'टेस्ट देखें', section: 'tests', hint: en ? 'Practice & assess' : 'अभ्यास और मूल्यांकन' },
    { label: en ? 'Study Materials' : 'अध्ययन सामग्री', section: 'materials', hint: en ? 'Notes, MCQs & PDFs' : 'नोट्स, MCQs और PDF' },
    { label: en ? 'About Teacher' : 'शिक्षक परिचय', section: 'about', hint: en ? 'Meet your educator' : 'शिक्षक से परिचय' },
  ];

  return (
    <section className="relative isolate overflow-hidden bg-[#f2f7fc] border-b border-[#dce7f2]">
      <div className="absolute inset-0 -z-10 bg-gradient-to-br from-[#f7fbff] via-white to-[#e8f3fa]" />
      <div className="absolute inset-y-0 right-0 -z-10 w-full lg:w-[52%] opacity-55 bg-no-repeat bg-right bg-contain pointer-events-none" style={{ backgroundImage: `url(${import.meta.env.BASE_URL}images/hero-background.webp)` }} aria-hidden="true" />
      <div className="absolute -top-24 -right-20 -z-10 h-72 w-72 rounded-full bg-cyan-200/30 blur-3xl" />
      <div className="relative max-w-7xl mx-auto px-4 sm:px-7 lg:px-8 py-8 sm:py-11 lg:py-14 grid lg:grid-cols-12 gap-8 lg:gap-10 items-center">
        <div className="lg:col-span-7 relative z-10">
          <div className="inline-flex items-center gap-2 rounded-full border border-[#c9dced] bg-white/80 px-3 py-1.5 text-[11px] sm:text-xs font-bold text-[#17477e] shadow-sm">
            <Sparkles className="w-4 h-4 text-amber-500" />
            {en ? 'FREE ONLINE LEARNING' : 'निःशुल्क ऑनलाइन शिक्षा'}
          </div>
          <p className="mt-5 text-lg sm:text-2xl font-extrabold text-[#12396f]">{en ? 'Welcome to' : 'आपका स्वागत है'}</p>
          <h1 className="mt-1 text-[clamp(1.65rem,3.7vw,3.1rem)] leading-[1.15] font-bold tracking-[-.03em] text-[#12396f]">{en ? <>Krishan Sir <span className="text-[#078a8d]">Online Learning</span></> : <>कृष्ण सर <span className="text-[#078a8d]">ऑनलाइन लर्निंग</span></>}</h1>
          <div className="mt-4 h-1.5 w-44 rounded-full bg-gradient-to-r from-amber-400 via-cyan-500 to-blue-900" />
          <div className="mt-5 max-w-2xl space-y-2 text-[13px] sm:text-[15px] lg:text-base leading-7 font-normal tracking-[0.005em] text-slate-700">
            <p>{en ? <>A dedicated digital learning platform designed to make quality education <span className="font-semibold text-[#24466f]">accessible, engaging and meaningful</span> for every learner.</> : <>प्रत्येक विद्यार्थी तक गुणवत्तापूर्ण शिक्षा को <span className="font-semibold text-[#24466f]">सरल, रोचक और प्रभावी</span> रूप में पहुँचाने के उद्देश्य से विकसित एक समर्पित डिजिटल शिक्षण मंच।</>}</p>
            <p>{en ? <>Explore bilingual study resources for Classes 6–12, Social Science, NCERT and HBSE, along with online tests, practice questions, current affairs and competitive exam preparation.</> : <>यहाँ कक्षा 6–12, सामाजिक विज्ञान, NCERT एवं HBSE के लिए द्विभाषी अध्ययन सामग्री के साथ ऑनलाइन टेस्ट, अभ्यास प्रश्न, समसामयिक घटनाएँ और प्रतियोगी परीक्षाओं की तैयारी हेतु उपयोगी संसाधन उपलब्ध हैं।</>}</p>
            <p className="pt-1 text-[12px] sm:text-sm font-semibold text-[#17477e]">{en ? 'Learn with Confidence. Prepare with Purpose. Achieve with Excellence.' : 'आत्मविश्वास से सीखें। उद्देश्य के साथ तैयारी करें। उत्कृष्टता के साथ सफलता पाएँ।'}</p>
          </div>
          <div className="mt-5 flex flex-wrap gap-x-5 gap-y-3">{benefits.map((item) => <span key={item} className="inline-flex items-center gap-2 text-xs sm:text-sm font-bold text-slate-700"><CheckCircle2 className="w-4 h-4 text-emerald-600" />{item}</span>)}</div>
          <div className="mt-7 grid grid-cols-1 sm:grid-cols-3 gap-3 max-w-3xl">
            {heroButtons.map(({label, section, hint}, index) => (
              <button key={section} onClick={() => onNavigate(section)} className={`group min-h-[86px] w-full rounded-2xl border px-4 py-4 text-left shadow-md transition-all duration-200 hover:-translate-y-1 hover:shadow-xl focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-300/70 ${index === 0 ? 'border-[#0b3979] bg-[#0b3979] text-white' : 'border-[#d7e3ef] bg-white/95 text-[#12396f] hover:border-[#8eb8d8]'}`}>
                <span className="flex items-center justify-between gap-2 text-sm sm:text-base font-extrabold">{label}<ArrowUpRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" /></span>
                <span className={`mt-1 block text-[10px] sm:text-[11px] font-medium ${index === 0 ? 'text-blue-100' : 'text-slate-500'}`}>{hint}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="lg:col-span-5 relative z-10 flex justify-center lg:justify-end">
          <div className="w-full max-w-[410px]">
            <div className="rounded-[1.8rem] border border-white/80 bg-white/90 p-3 sm:p-4 shadow-[0_22px_60px_rgba(15,48,87,.16)] backdrop-blur-sm">
              <div className="relative aspect-[4/3] sm:aspect-[5/4] w-full rounded-[1.25rem] overflow-hidden bg-slate-200 shadow-sm">
                <img src={`${import.meta.env.BASE_URL}images/krishan-sir.png`} alt={en ? 'Krishan Kumar – TGT Social Science' : 'कृष्ण कुमार – टीजीटी सामाजिक विज्ञान'} className="w-full h-full object-cover object-[24%_28%]" loading="eager" referrerPolicy="no-referrer" />
                <div className="absolute inset-0 bg-gradient-to-t from-[#071d3e]/90 via-transparent to-transparent" />
                <div className="absolute bottom-0 inset-x-0 p-4 sm:p-5 text-white">
                  <div className="text-lg sm:text-xl font-extrabold">{en ? 'Krishan Kumar' : 'कृष्ण कुमार'}</div>
                  <div className="mt-0.5 text-xs sm:text-sm text-amber-300 font-semibold">{en ? 'TGT Social Science · Government School Educator' : 'टीजीटी सामाजिक विज्ञान · सरकारी विद्यालय शिक्षक'}</div>
                </div>
              </div>
              <div className="mt-3 rounded-2xl border border-[#e1eaf2] bg-[#f7faff] p-3 sm:p-4">
                <h2 className="flex items-center gap-2 text-xs sm:text-sm font-extrabold text-[#12396f]"><Award className="h-4 w-4 text-amber-600 shrink-0" />{en ? 'Academic Qualifications' : 'शैक्षणिक योग्यताएँ'}</h2>
                <div className="mt-2 flex flex-wrap gap-1.5">{shortQualifications.map((item) => <span key={item} className="px-2 py-1 rounded-lg bg-white border border-[#dce7f2] text-[10px] sm:text-[11px] font-semibold text-slate-700">{item}</span>)}</div>
              </div>
              <div className="mt-3 rounded-2xl border border-cyan-100 bg-white px-4 py-3 text-center">
                <div className="flex items-center justify-center gap-2 text-[#12396f]"><BookOpen className="h-4 w-4 shrink-0 text-[#078a8d]" /><p className="text-[9px] sm:text-[10px] font-medium leading-snug tracking-wide text-slate-500">{en ? 'Guiding Students Towards Conceptual Clarity, Factual Accuracy & Board Exam Excellence' : 'विद्यार्थियों को अवधारणात्मक स्पष्टता, तथ्यात्मक सटीकता एवं बोर्ड परीक्षा में उत्कृष्टता की ओर मार्गदर्शन'}</p></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
