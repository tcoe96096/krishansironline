import React from 'react';
import { useLanguage } from '../context/LanguageContext';
import { TEACHER_INFO } from '../data/portalData';
import { CheckCircle2, Award, FileText, ArrowRight, ShieldCheck, GraduationCap, Sparkles, BookOpen, Globe2 } from 'lucide-react';

interface HeroProps {
  onNavigate: (section: string) => void;
}

export const Hero: React.FC<HeroProps> = ({ onNavigate }) => {
  const { language, t } = useLanguage();

  return (
    <section className="relative isolate overflow-hidden border-b border-slate-200 bg-gradient-to-br from-[#eaf3ff] via-white to-[#f8f5eb] py-9 sm:py-12 lg:py-16">
      <div
        aria-hidden="true"
        className="absolute inset-0 -z-10 opacity-60"
        style={{
          backgroundImage: 'radial-gradient(circle at 12% 18%, rgba(59,130,246,.15), transparent 27%), radial-gradient(circle at 88% 78%, rgba(245,158,11,.16), transparent 28%), linear-gradient(135deg, transparent 48%, rgba(16,43,89,.035) 49%, transparent 50%)',
          backgroundSize: 'auto, auto, 34px 34px',
        }}
      />
      <div className="absolute -top-24 right-[8%] -z-10 h-72 w-72 rounded-full bg-sky-200/40 blur-3xl" />
      <div className="absolute -bottom-24 left-[12%] -z-10 h-72 w-72 rounded-full bg-amber-200/30 blur-3xl" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
        <div className="flex flex-wrap items-center gap-2 mb-6 text-xs text-slate-600 font-semibold">
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/85 text-sky-900 border border-sky-200 shadow-sm">
            <ShieldCheck className="w-3.5 h-3.5 text-sky-700" />
            <span>{t('common.verified')}</span>
          </span>
          <span className="text-slate-300">•</span>
          <span>{TEACHER_INFO.school}</span>
          <span className="text-slate-300">•</span>
          <span className="text-amber-800">{t('common.free')}</span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-9 lg:gap-12 items-center">
          <div className="lg:col-span-7 space-y-6">
            <div className="space-y-3">
              <div className="inline-flex items-center gap-2 text-xs sm:text-sm font-extrabold uppercase tracking-[0.16em] text-[#24558f]">
                <span className="h-px w-7 bg-amber-500" />
                {language === 'en' ? 'Learn • Practice • Achieve' : 'सीखें • अभ्यास करें • सफलता पाएं'}
              </div>
              <h1 className="text-3xl sm:text-4xl lg:text-5xl xl:text-[3.4rem] font-extrabold text-[#102b59] tracking-tight font-display text-balance leading-[1.12]">
                {t('hero.title')}
              </h1>
              <p className="text-lg sm:text-xl font-bold text-sky-900 text-balance leading-snug">
                {t('hero.subtitle')}
              </p>
            </div>

            <p className="text-base sm:text-lg text-slate-600 leading-relaxed max-w-2xl">
              {t('hero.description')}
            </p>

            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-amber-50 border border-amber-200 text-amber-900 text-xs sm:text-sm font-bold shadow-sm">
              <Sparkles className="w-4 h-4 text-amber-600 shrink-0" />
              <span>{t('hero.tagline')}</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 max-w-xl">
              <button onClick={() => onNavigate('tests')} className="flex items-center justify-center gap-2 px-5 py-3.5 rounded-xl bg-[#102b59] hover:bg-[#19427e] text-white font-bold text-sm shadow-lg hover:shadow-xl transition-all">
                <Award className="w-4 h-4 text-amber-300" />
                <span>{t('hero.btnTest')}</span>
              </button>
              <button onClick={() => onNavigate('materials')} className="flex items-center justify-center gap-2 px-5 py-3.5 rounded-xl bg-white hover:bg-sky-50 text-[#102b59] font-bold text-sm border border-sky-200 shadow-sm transition-all">
                <FileText className="w-4 h-4 text-sky-800" />
                <span>{t('hero.btnMaterials')}</span>
              </button>
              <button onClick={() => onNavigate('results')} className="flex items-center justify-center gap-2 px-5 py-3.5 rounded-xl bg-white hover:bg-emerald-50 text-slate-800 font-bold text-sm border border-slate-200 shadow-sm transition-all">
                <GraduationCap className="w-4 h-4 text-emerald-700" />
                <span>{t('hero.btnResults')}</span>
              </button>
              <button onClick={() => onNavigate('about')} className="flex items-center justify-center gap-2 px-5 py-3.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-950 font-bold text-sm border border-amber-200 transition-all">
                <ArrowRight className="w-4 h-4 text-amber-700" />
                <span>{t('hero.btnAbout')}</span>
              </button>
            </div>

            <div className="pt-4 border-t border-slate-200/80 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs sm:text-sm text-slate-600">
              <div className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" /><span>Classes 6 to 12</span></div>
              <div className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" /><span>Chapter-wise MCQs & Notes</span></div>
              <div className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" /><span>HBSE & CBSE Preparation</span></div>
            </div>
          </div>

          <div className="lg:col-span-5">
            <div className="relative mx-auto max-w-md lg:max-w-none">
              <div className="absolute -inset-3 rounded-[2rem] bg-gradient-to-br from-sky-300/50 via-white to-amber-200/60 blur-xl" />
              <div className="relative rounded-[1.6rem] bg-white/90 p-3 sm:p-4 shadow-2xl border border-white">
                <div className="relative aspect-[4/3] sm:aspect-square w-full rounded-[1.15rem] overflow-hidden bg-slate-100 border border-slate-200 group">
                  <img
                    src={`${import.meta.env.BASE_URL}images/krishan-sir.png`}
                    alt="Krishan Sir – TGT Social Science"
                    className="w-full h-full object-cover object-[24%_28%] group-hover:scale-105 transition-transform duration-500"
                    onError={(e) => { e.currentTarget.src = `${import.meta.env.BASE_URL}images/krishan-sir-logo.svg`; }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#071b3b]/95 via-transparent to-transparent" />
                  <div className="absolute bottom-0 inset-x-0 p-4 sm:p-5 text-white">
                    <div className="text-xl sm:text-2xl font-extrabold tracking-tight">Krishan Kumar</div>
                    <div className="text-xs sm:text-sm text-amber-300 font-semibold mt-1">TGT Social Science · GGHS Dhanger</div>
                    <div className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-white/15 border border-white/25 px-3 py-1 text-[10px] sm:text-xs font-semibold backdrop-blur-sm">
                      <ShieldCheck className="w-3.5 h-3.5" /> Haryana Educator
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 sm:gap-3 mt-3">
                  <div className="rounded-xl bg-sky-50 border border-sky-100 p-3">
                    <div className="flex items-center gap-1.5 text-sky-900 text-xs font-extrabold"><BookOpen className="w-4 h-4" /> {language === 'en' ? 'Study Resources' : 'अध्ययन सामग्री'}</div>
                    <p className="text-[11px] text-slate-600 mt-1">NCERT · HBSE · CBSE</p>
                  </div>
                  <div className="rounded-xl bg-amber-50 border border-amber-100 p-3">
                    <div className="flex items-center gap-1.5 text-amber-900 text-xs font-extrabold"><Globe2 className="w-4 h-4" /> {language === 'en' ? 'Bilingual Learning' : 'द्विभाषी अध्ययन'}</div>
                    <p className="text-[11px] text-slate-600 mt-1">Hindi · English</p>
                  </div>
                </div>
                <div className="mt-3 rounded-xl bg-[#f5f8fc] border border-slate-100 p-3 text-xs text-slate-700 leading-relaxed">
                  <strong className="text-[#102b59]">{language === 'en' ? 'Our learning promise:' : 'हमारा अध्ययन संकल्प:'}</strong>{' '}
                  {language === 'en'
                    ? 'Conceptual clarity, factual accuracy and confident exam preparation.'
                    : 'वैचारिक स्पष्टता, तथ्यात्मक शुद्धता और आत्मविश्वासपूर्ण परीक्षा तैयारी।'}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
