import React from 'react';
import { useLanguage } from '../context/LanguageContext';
import { GraduationCap, ClipboardCheck, BookOpen, Trophy, UserRound, ArrowRight, Award, Briefcase } from 'lucide-react';

interface HeroProps { onNavigate: (section: string) => void; }

export const Hero: React.FC<HeroProps> = ({ onNavigate }) => {
  const { language } = useLanguage();
  const en = language === 'en';
  const actions = [
    { label: en ? 'Online Tests' : 'ऑनलाइन टेस्ट', page: 'tests', Icon: ClipboardCheck },
    { label: en ? 'Study Materials' : 'अध्ययन सामग्री', page: 'materials', Icon: BookOpen },
    { label: en ? 'Results' : 'परिणाम', page: 'results', Icon: Trophy },
    { label: en ? 'About Me' : 'मेरे बारे में', page: 'about', Icon: UserRound },
  ];

  return (
    <section className="relative overflow-hidden border-b border-slate-200 bg-[#eaf4ff]">
      <div className="relative mx-auto max-w-7xl px-3 py-4 sm:px-5 sm:py-6 lg:px-7">
        <div className="relative isolate overflow-hidden rounded-[26px] border border-white bg-gradient-to-br from-[#0b4f91] via-[#5ca8e6] to-[#d8edff] shadow-xl">
          <div className="absolute inset-0 -z-10 bg-no-repeat bg-right bg-cover opacity-25" style={{ backgroundImage: `url(${import.meta.env.BASE_URL}images/hero-background.webp)` }} aria-hidden="true" />
          <div className="grid min-h-[390px] grid-cols-1 lg:grid-cols-12">
            <div className="relative z-10 flex flex-col justify-center px-5 py-6 sm:px-8 sm:py-8 lg:col-span-8 lg:px-9 lg:py-8">
              <div className="border-l-[5px] border-amber-400 pl-4 sm:pl-5">
                <p className="text-2xl font-extrabold tracking-tight text-white sm:text-4xl lg:text-[2.7rem]">Krishan Kumar</p>
                <p className="mt-1 text-lg font-extrabold text-amber-300 sm:text-2xl">TGT Social Science</p>
                <p className="mt-1 text-sm font-semibold text-white sm:text-lg">{en ? 'Govt. Girls High School, Dhanger (Haryana)' : 'राजकीय कन्या उच्च विद्यालय, ढांगर (हरियाणा)'}</p>
              </div>

              <div className="mt-6 grid grid-cols-1 gap-2.5 sm:grid-cols-3">
                <div className="rounded-xl border border-white/70 bg-white/90 p-3 shadow-sm backdrop-blur-sm">
                  <h3 className="flex items-center gap-2 text-sm font-extrabold text-blue-700"><GraduationCap className="h-5 w-5 shrink-0" />{en ? 'Qualifications:' : 'शैक्षणिक योग्यताएँ:'}</h3>
                  <p className="mt-2 text-xs font-semibold leading-relaxed text-slate-800 sm:text-sm">B.A. · M.A. (Political Science)<br />UGC NET (2×) · B.Ed.<br />M.Ed. · M.Phil.</p>
                </div>
                <div className="rounded-xl border border-white/70 bg-white/90 p-3 shadow-sm backdrop-blur-sm">
                  <h3 className="flex items-center gap-2 text-sm font-extrabold text-emerald-700"><Award className="h-5 w-5 shrink-0" />{en ? 'Eligibility Tests:' : 'पात्रता परीक्षाएँ:'}</h3>
                  <p className="mt-2 text-xs font-semibold leading-relaxed text-slate-800 sm:text-sm">UGC NET Education<br />CTET (Both Levels)<br />HTET TGT (Hindi & SST)</p>
                </div>
                <div className="rounded-xl border border-white/70 bg-white/90 p-3 shadow-sm backdrop-blur-sm">
                  <h3 className="flex items-center gap-2 text-sm font-extrabold text-violet-700"><Briefcase className="h-5 w-5 shrink-0" />{en ? 'Experience:' : 'अनुभव:'}</h3>
                  <p className="mt-2 text-xs font-semibold leading-relaxed text-slate-800 sm:text-sm">2 Yrs Asst. Professor<br />2 Yrs 8 Mos Govt. TGT</p>
                </div>
              </div>

              <div className="mt-3 rounded-xl border border-sky-100 bg-sky-50/95 px-3 py-3 text-xs font-medium leading-relaxed text-[#12396f] sm:text-sm">
                <span className="mr-2 inline-flex align-middle"><GraduationCap className="h-4 w-4" /></span>
                “{en ? 'Guiding students towards conceptual clarity, factual accuracy, and board exam excellence.' : 'विद्यार्थियों को वैचारिक स्पष्टता, तथ्यात्मक शुद्धता और बोर्ड परीक्षा में उत्कृष्टता की ओर मार्गदर्शन।'}”
              </div>

              <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
                {actions.map(({ label, page, Icon }) => <button key={page} type="button" onClick={() => onNavigate(page)} className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-lg border border-white/40 bg-white/95 px-2 py-2 text-[11px] font-bold text-[#12396f] shadow-sm transition hover:-translate-y-0.5 hover:bg-amber-50 sm:text-xs"><Icon className="h-4 w-4 shrink-0" /><span>{label}</span><ArrowRight className="h-3 w-3 shrink-0" /></button>)}
              </div>
            </div>

            <div className="relative min-h-[300px] overflow-hidden lg:col-span-4 lg:min-h-full">
              <div className="absolute inset-0 bg-gradient-to-r from-[#5ca8e6]/10 via-transparent to-[#0b4f91]/10" />
              <img
                src={`${import.meta.env.BASE_URL}images/krishan-sir.png`}
                alt="Krishan Kumar – TGT Social Science"
                className="absolute inset-0 h-full w-full scale-x-[-1] object-cover object-[24%_28%] lg:object-[24%_center]"
                loading="eager"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#082d55]/45 via-transparent to-transparent lg:bg-gradient-to-l lg:from-transparent lg:via-transparent lg:to-[#0b4f91]/15" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
