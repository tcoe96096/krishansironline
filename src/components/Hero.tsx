import React from 'react';
import { useLanguage } from '../context/LanguageContext';
import { TEACHER_INFO } from '../data/portalData';
import { CheckCircle2, Award, FileText, ArrowRight, ShieldCheck, GraduationCap, Sparkles } from 'lucide-react';

interface HeroProps {
  onNavigate: (section: string) => void;
}

export const Hero: React.FC<HeroProps> = ({ onNavigate }) => {
  const { language, t } = useLanguage();

  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-slate-100/70 via-white to-slate-50 border-b border-slate-200/80 pt-8 pb-14 lg:py-16">
      {/* Decorative Subtle Background Elements */}
      <div className="absolute top-0 right-1/4 w-96 h-96 bg-sky-100/40 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-10 w-80 h-80 bg-amber-100/30 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        {/* Top Trust Marker */}
        <div className="flex flex-wrap items-center gap-2 mb-6 text-xs text-slate-600 font-medium">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-sky-50 text-sky-900 border border-sky-200 font-semibold">
            <ShieldCheck className="w-3.5 h-3.5 text-sky-700" />
            <span>{t('common.verified')}</span>
          </span>
          <span aria-hidden="true" className="text-slate-300">·</span>
          <span>{TEACHER_INFO.school}</span>
          <span aria-hidden="true" className="text-slate-300">·</span>
          <span className="text-amber-800 font-semibold">{t('common.free')}</span>
        </div>

        {/* 2-Column Split: Intro & Action Buttons (Left) + Teacher Photo & Credentials (Right) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
          
          {/* Left Column (7 cols): Heading, Subheading, Text, Action Buttons */}
          <div className="lg:col-span-7 space-y-6">
            
            <div className="space-y-3">
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-slate-900 tracking-tight font-display text-balance leading-tight">
                {t('hero.title')}
              </h1>
              
              <p className="text-lg sm:text-xl font-semibold text-sky-950/90 text-balance leading-snug">
                {t('hero.subtitle')}
              </p>
            </div>

            <p className="text-base sm:text-lg text-slate-600 leading-relaxed max-w-2xl">
              {t('hero.description')}
            </p>

            {/* Tagline Badge */}
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-amber-50 border border-amber-200/80 text-amber-900 text-xs sm:text-sm font-semibold">
              <Sparkles className="w-4 h-4 text-amber-600 shrink-0" />
              <span>{t('hero.tagline')}</span>
            </div>

            {/* 4 Action Buttons as requested */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 max-w-xl">
              <button
                onClick={() => onNavigate('tests')}
                className="flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-sky-900 hover:bg-sky-800 text-white font-semibold text-sm shadow-md hover:shadow-lg transition-all text-center"
              >
                <Award className="w-4 h-4 text-amber-300" />
                <span>{t('hero.btnTest')}</span>
              </button>

              <button
                onClick={() => onNavigate('exams')}
                className="flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-white hover:bg-slate-50 text-slate-800 font-semibold text-sm border border-slate-300 shadow-xs hover:border-slate-400 transition-all text-center"
              >
                <FileText className="w-4 h-4 text-sky-800" />
                <span>{t('hero.btnMaterials')}</span>
              </button>


              <button
                onClick={() => onNavigate('about')}
                className="flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-950 font-semibold text-sm border border-amber-300/80 transition-all text-center"
              >
                <ArrowRight className="w-4 h-4 text-amber-700" />
                <span>{t('hero.btnAbout')}</span>
              </button>
            </div>

            {/* Core Stats Row */}
            <div className="pt-4 border-t border-slate-200/80 flex flex-wrap items-center gap-6 text-xs sm:text-sm text-slate-600">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Classes 6 to 12 Covered</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Chapter-wise MCQs & Notes</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>HBSE & CBSE Exam Blueprint</span>
              </div>
            </div>

          </div>

          {/* Right Column (5 cols): Teacher Photograph & Professional Credential Card */}
          <div className="lg:col-span-5">
            <div className="relative mx-auto max-w-md lg:max-w-none">
              
              {/* Outer Card with subtle border and elevation */}
              <div className="relative rounded-2xl bg-white p-3.5 sm:p-5 shadow-lg border border-slate-200/90 transition-all">
                
                {/* Image Container with high quality crop */}
                <div className="relative aspect-4/3 sm:aspect-square w-full rounded-xl overflow-hidden bg-slate-100 border border-slate-200/60 shadow-inner group">
                  <img
                    src="/images/krishan-sir.png"
                    alt="Krishan Sir – TGT Social Science"
                    className="w-full h-full object-cover object-[24%_28%] group-hover:scale-105 transition-transform duration-300"
                    referrerPolicy="no-referrer"
                    onError={(e) => {
                      e.currentTarget.src = '/assets/aistudio/Smiling_Educator_with_Study_Essentials_be80b46f.png';
                    }}
                  />
                  
                  {/* Subtle Image Overlay Bar */}
                  <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-slate-950/90 via-slate-900/60 to-transparent p-4 text-white">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-base font-bold tracking-tight">Krishan Kumar</div>
                        <div className="text-xs text-amber-300 font-medium">TGT Social Science · GGHS Dhanger</div>
                      </div>
                      <span className="text-[11px] font-semibold px-2 py-0.5 rounded-sm bg-white/20 backdrop-blur-xs text-white">
                        Haryana Edu Dept
                      </span>
                    </div>
                  </div>
                </div>

                {/* Teacher Profile Highlights Card */}
                <div className="mt-4 pt-3 border-t border-slate-100 space-y-2.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500 font-medium">Qualifications:</span>
                    <span className="text-slate-800 font-semibold text-right">
                      M.A. (Pol Sci) · UGC NET (2x) · M.Ed · M.Phil
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500 font-medium">Eligibility Tests:</span>
                    <span className="text-slate-800 font-semibold text-right">
                      UGC NET Edu · CTET (Both) · HTET TGT
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500 font-medium">Experience:</span>
                    <span className="text-slate-800 font-semibold text-right">
                      2 Yrs Asst Prof + 2 Yrs 8 Mos Govt TGT
                    </span>
                  </div>

                  <div className="bg-sky-50/70 rounded-lg p-2.5 text-xs text-sky-950 flex items-start gap-2 border border-sky-100">
                    <GraduationCap className="w-4 h-4 text-sky-700 shrink-0 mt-0.5" />
                    <p className="text-[11px] leading-relaxed">
                      {language === 'en'
                        ? '"Guiding students towards conceptual clarity, factual accuracy, and board exam excellence."'
                        : '"विद्यार्थियों में वैचारिक स्पष्टता, तथ्यात्मक शुद्धता एवं परीक्षा में श्रेष्ठता का संचार।"'}
                    </p>
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
