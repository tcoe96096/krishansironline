import React from 'react';
import { useLanguage } from '../context/LanguageContext';
import { TEACHER_INFO } from '../data/portalData';
import { GraduationCap, Award, Briefcase, BookOpen, Quote, ShieldCheck, CheckCircle2, HeartHandshake } from 'lucide-react';

export const AboutTeacher: React.FC = () => {
  const { language } = useLanguage();

  return (
    <section id="about" className="py-16 bg-white border-b border-slate-200/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-12">
          <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-sky-800 mb-2">
            <GraduationCap className="w-4 h-4 text-sky-700" />
            <span>{language === 'en' ? 'Teacher Profile & Credentials' : 'शिक्षक परिचय एवं योग्यताएं'}</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 font-display">
            About Krishan Sir (Krishan Kumar)
          </h2>
          <p className="mt-2 text-base text-slate-600">
            {TEACHER_INFO.designation} · {TEACHER_INFO.school}
          </p>
        </div>

        {/* 2-Column Profile Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
          
          {/* Left Column (5 cols): Official Photograph, Fast Facts Card */}
          <div className="lg:col-span-5 space-y-6">
            
            <div className="bg-slate-50 rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-sm">
              <div className="relative aspect-4/3 sm:aspect-square w-full rounded-xl overflow-hidden bg-slate-200 shadow-xs border border-slate-200 group">
                <img
                  src={`${import.meta.env.BASE_URL}images/krishan-sir.png`}
                  alt="Krishan Sir – TGT Social Science"
                  className="w-full h-full object-cover object-[24%_28%] group-hover:scale-105 transition-transform duration-300"
                  referrerPolicy="no-referrer"
                  onError={(e) => {
                    e.currentTarget.src = `${import.meta.env.BASE_URL}assets/aistudio/Smiling_Educator_with_Study_Essentials_be80b46f.png`;
                  }}
                />
                <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-slate-950/85 via-slate-900/50 to-transparent p-4 text-white">
                  <div className="text-base font-bold">Krishan Kumar</div>
                  <div className="text-xs text-amber-300">TGT Social Science · Government School Educator</div>
                </div>
              </div>

              {/* Verified School Badge */}
              <div className="mt-4 p-3 bg-white rounded-xl border border-slate-200 text-xs space-y-2">
                <div className="flex items-center gap-2 text-emerald-700 font-bold">
                  <ShieldCheck className="w-4 h-4" />
                  <span>Officially Verified School Teacher</span>
                </div>
                <div className="text-slate-600 leading-relaxed text-[11px]">
                  <strong>Current Posting:</strong> Government Girls High School (GGHS), Village Dhanger, District Fatehabad, Haryana, India (PIN 125048).
                </div>
              </div>
            </div>

            {/* Teaching Subjects Cloud */}
            <div className="bg-slate-50 rounded-2xl p-6 border border-slate-200">
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-3 flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-sky-800" />
                <span>Teaching Disciplines & Subjects:</span>
              </h3>
              <div className="flex flex-wrap gap-1.5">
                {TEACHER_INFO.teachingSubjects.map((sub, sIdx) => (
                  <span
                    key={sIdx}
                    className="px-2.5 py-1 rounded-md bg-white border border-slate-200 text-xs font-semibold text-slate-700"
                  >
                    {language === 'hi' ? sub.hi : sub.en}
                  </span>
                ))}
              </div>
            </div>

          </div>

          {/* Right Column (7 cols): Full Biography, Qualifications List, Experience, Philosophy */}
          <div className="lg:col-span-7 space-y-8">
            
            {/* Bio Prose */}
            <div className="space-y-4 text-slate-700 text-sm sm:text-base leading-relaxed">
              <p>
                <strong>Krishan Kumar</strong> is a trained Social Science educator currently serving as <strong>TGT Social Science at Government Girls High School (GGHS), Dhanger, Haryana</strong>.
              </p>
              <p>
                He is deeply committed to promoting quality education through digital learning, interactive assessments, conceptual clarity, and student-centred teaching methodologies. Through this <strong>Krishan Sir – Online Learning Portal</strong>, he empowers rural and school students across Haryana and all over India with free access to high-standard study materials, chapter-wise MCQs, online assessments, and comprehensive board examination guidance.
              </p>
            </div>

            {/* 9 Educational Qualifications Detailed List */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sky-900 font-bold text-base font-display">
                <Award className="w-5 h-5 text-amber-600 shrink-0" />
                <h3>Educational Qualifications & National Honors</h3>
              </div>

              <div className="grid grid-cols-1 gap-2.5">
                {TEACHER_INFO.qualifications.map((q) => (
                  <div
                    key={q.id}
                    className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/60 hover:bg-white transition-colors flex items-start gap-3 text-xs sm:text-sm"
                  >
                    <span className="w-6 h-6 rounded-full bg-sky-900 text-white font-bold flex items-center justify-center text-xs shrink-0 mt-0.5">
                      {q.id}
                    </span>
                    <div>
                      <div className="font-bold text-slate-900">
                        {language === 'hi' ? q.hi : q.title}
                      </div>
                      <div className="text-xs text-slate-500 font-mono mt-0.5">
                        {q.institution}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Professional Experience */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sky-900 font-bold text-base font-display">
                <Briefcase className="w-5 h-5 text-sky-800 shrink-0" />
                <h3>Professional Teaching Experience</h3>
              </div>

              <div className="space-y-3">
                {TEACHER_INFO.experience.map((exp, idx) => (
                  <div
                    key={idx}
                    className="p-4 rounded-xl border border-slate-200 bg-white shadow-xs space-y-1.5 text-xs sm:text-sm"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="font-bold text-slate-900 text-sm">
                        {language === 'hi' ? exp.roleHi : exp.role}
                      </span>
                      <span className="text-xs font-semibold px-2 py-0.5 rounded-sm bg-sky-50 text-sky-800 border border-sky-100">
                        {language === 'hi' ? exp.durationHi : exp.duration}
                      </span>
                    </div>
                    <div className="text-slate-600 font-medium">
                      {language === 'hi' ? exp.organizationHi : exp.organization}
                    </div>
                    <p className="text-xs text-slate-500 leading-relaxed pt-1">
                      {exp.description}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Teaching Philosophy */}
            <div className="relative overflow-hidden p-6 sm:p-7 rounded-2xl bg-gradient-to-br from-[#edf6ff] via-white to-[#eaf7f5] border border-sky-200 text-slate-800 shadow-sm space-y-3">
              <div className="flex items-center gap-2 text-sky-950 font-extrabold text-base">
                <Quote className="w-4 h-4 text-teal-700" />
                <span>Teaching Philosophy of Krishan Sir:</span>
              </div>
              <p className="text-xs sm:text-sm leading-relaxed text-slate-700 text-sm sm:text-base leading-relaxed italic">
                "{language === 'hi' ? TEACHER_INFO.philosophy.hi : TEACHER_INFO.philosophy.en}"
              </p>
            </div>

          </div>

        </div>

        {/* Full Official Portrait & Study Environment Showcase */}
        <div className="mt-12 pt-8 border-t border-slate-200">
          <div className="bg-slate-900 rounded-2xl overflow-hidden border border-slate-800 shadow-xl">
            <div className="relative aspect-16/9 sm:aspect-21/9 w-full">
              <img
                src={`${import.meta.env.BASE_URL}images/krishan-sir.png`}
                alt="Krishan Sir with Study Essentials and Educational Resources"
                className="w-full h-full object-cover object-center"
                referrerPolicy="no-referrer"
                onError={(e) => {
                  e.currentTarget.src = `${import.meta.env.BASE_URL}assets/aistudio/Smiling_Educator_with_Study_Essentials_be80b46f.png`;
                }}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/20 to-transparent flex items-end p-6 sm:p-8">
                <div className="text-white max-w-2xl">
                  <span className="text-xs font-semibold px-2.5 py-0.5 rounded-sm bg-amber-400 text-slate-950 uppercase tracking-wider">
                    Official Educator Identity
                  </span>
                  <h3 className="text-xl sm:text-2xl font-bold font-display mt-2">
                    Krishan Kumar — Dedicated to Illuminating Young Minds
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-300 mt-1">
                    Government Girls High School (GGHS), Dhanger, Fatehabad, Haryana · Classes 6–12 Social Science Learning Hub
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

      </div>
    </section>

  );
};
