import React, { useState } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { STUDENT_RESULTS } from '../data/portalData';
import { StudentResult } from '../types';
import { GraduationCap, Search, Printer, Award, CheckCircle, ShieldCheck, UserCheck, Calendar } from 'lucide-react';

export const ResultsPortal: React.FC = () => {
  const { language } = useLanguage();
  const [searchQuery, setSearchQuery] = useState('GGHS-1001');
  const [searchResult, setSearchResult] = useState<StudentResult | null>(STUDENT_RESULTS[0]);
  const [hasSearched, setHasSearched] = useState(true);

  const handleSearch = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const q = searchQuery.trim().toLowerCase();
    if (!q) {
      setSearchResult(null);
      setHasSearched(true);
      return;
    }

    const found = STUDENT_RESULTS.find(
      (r) =>
        r.rollNo.toLowerCase().includes(q) ||
        r.studentName.toLowerCase().includes(q)
    );

    setSearchResult(found || null);
    setHasSearched(true);
  };

  const selectPredefined = (roll: string) => {
    setSearchQuery(roll);
    const found = STUDENT_RESULTS.find((r) => r.rollNo === roll);
    if (found) setSearchResult(found);
  };

  return (
    <section id="results" className="py-14 bg-white border-b border-slate-200/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Heading */}
        <div className="text-center max-w-3xl mx-auto mb-10">
          <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-sky-800 mb-2">
            <GraduationCap className="w-4 h-4 text-emerald-600" />
            <span>{language === 'en' ? 'Official Examination Results' : 'आधिकारिक परीक्षा परिणाम पोर्टल'}</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 font-display">
            {language === 'en' ? 'Online Student Result & Marksheet Portal' : 'विद्यार्थी परीक्षा परिणाम एवं अंकतालिका'}
          </h2>
          <p className="mt-2 text-sm sm:text-base text-slate-600">
            {language === 'en'
              ? 'Authorized assessment records and downloadable progress certificates for students of GGHS Dhanger, Haryana.'
              : 'राजकीय कन्या उच्च विद्यालय (GGHS), ढांगर, हरियाणा के विद्यार्थियों की प्रमाणित अंकतालिका एवं प्रगति पत्र।'}
          </p>
        </div>

        {/* Search Bar & Quick Roll Numbers */}
        <div className="max-w-2xl mx-auto mb-10">
          <form onSubmit={handleSearch} className="flex items-center gap-2 mb-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400" />
              <input
                type="text"
                placeholder="Enter Roll Number (e.g. GGHS-1001) or Student Name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-sky-500 focus:outline-hidden shadow-xs"
              />
            </div>
            <button
              type="submit"
              className="px-6 py-3 rounded-xl bg-sky-900 hover:bg-sky-800 text-white font-semibold text-sm transition-colors shadow-xs shrink-0"
            >
              Search Result
            </button>
          </form>

          {/* Quick Demo Roll Chips */}
          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600">
            <span className="font-medium text-slate-400">Sample Records:</span>
            {['GGHS-1001 (Pooja)', 'GGHS-1002 (Sunita)', 'GGHS-1003 (Anjali)', 'GGHS-0901 (Simran)'].map(
              (item, idx) => {
                const roll = item.split(' ')[0];
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => selectPredefined(roll)}
                    className="px-2.5 py-1 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 font-mono text-[11px] transition-colors"
                  >
                    {item}
                  </button>
                );
              }
            )}
          </div>
        </div>

        {/* Search Result Marksheet Card */}
        {searchResult ? (
          <div className="max-w-3xl mx-auto bg-white rounded-2xl border-2 border-slate-300 shadow-xl overflow-hidden print:border-none print:shadow-none">
            
            {/* Marksheet Official Header */}
            <div className="bg-slate-900 text-white p-6 sm:p-8 text-center border-b-4 border-amber-400 relative">
              <div className="text-xs uppercase tracking-widest text-amber-300 font-bold mb-1">
                Haryana School Education Department
              </div>
              <h3 className="text-xl sm:text-2xl font-black font-display tracking-tight text-white">
                GOVERNMENT GIRLS HIGH SCHOOL (GGHS), DHANGER
              </h3>
              <div className="text-xs text-slate-300 mt-1">
                District: Fatehabad, Haryana · Established Under Haryana Edu Dept
              </div>
              <div className="mt-3 inline-block px-4 py-1 rounded-full bg-white/10 text-amber-200 text-xs font-semibold backdrop-blur-xs">
                {searchResult.examName} · Academic Session 2026–27
              </div>
            </div>

            {/* Student Particulars */}
            <div className="p-6 sm:p-8 space-y-6">
              
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs">
                <div>
                  <span className="text-slate-400 block text-[11px]">Student Name</span>
                  <span className="font-bold text-slate-900 text-sm font-sans">{searchResult.studentName}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">Father\'s Name</span>
                  <span className="font-semibold text-slate-800">{searchResult.fatherName}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">Roll Number</span>
                  <span className="font-bold font-mono text-sky-900">{searchResult.rollNo}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">Class & Section</span>
                  <span className="font-semibold text-slate-800">Class {searchResult.classLevel} - A</span>
                </div>
              </div>

              {/* Subject-Wise Marks Breakdown Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border border-slate-200 rounded-lg overflow-hidden">
                  <thead className="bg-slate-100 text-slate-700 uppercase font-semibold text-[11px]">
                    <tr>
                      <th className="py-3 px-4">Subject & Paper</th>
                      <th className="py-3 px-4 text-center">Max Marks</th>
                      <th className="py-3 px-4 text-center">Marks Obtained</th>
                      <th className="py-3 px-4 text-right">Performance</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {searchResult.subjects.map((sub, sIdx) => {
                      const pct = ((sub.marksObtained / sub.maxMarks) * 100).toFixed(0);
                      return (
                        <tr key={sIdx} className="hover:bg-slate-50/50">
                          <td className="py-3 px-4 font-medium text-slate-900">{sub.name}</td>
                          <td className="py-3 px-4 text-center font-mono tabular-nums text-slate-500">{sub.maxMarks}</td>
                          <td className="py-3 px-4 text-center font-mono tabular-nums font-bold text-sky-900">{sub.marksObtained}</td>
                          <td className="py-3 px-4 text-right">
                            <span className="text-emerald-700 font-semibold font-mono tabular-nums">{pct}%</span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot className="bg-slate-50 font-bold text-slate-900 border-t border-slate-200">
                    <tr>
                      <td className="py-3 px-4">Grand Total</td>
                      <td className="py-3 px-4 text-center font-mono tabular-nums">{searchResult.maxMarks}</td>
                      <td className="py-3 px-4 text-center font-mono tabular-nums text-sky-900 text-sm">
                        {searchResult.totalMarks}
                      </td>
                      <td className="py-3 px-4 text-right text-emerald-700 font-mono text-sm">
                        {searchResult.percentage}%
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {/* Result Summary Strip */}
              <div className="grid grid-cols-3 gap-3 text-center p-4 rounded-xl bg-sky-50/60 border border-sky-100">
                <div>
                  <div className="text-[11px] text-slate-500">Overall Grade</div>
                  <div className="text-base sm:text-lg font-extrabold text-sky-900">{searchResult.grade}</div>
                </div>
                <div>
                  <div className="text-[11px] text-slate-500">Class Rank</div>
                  <div className="text-base sm:text-lg font-extrabold text-amber-700 font-mono">
                    {searchResult.rank ? `#${searchResult.rank} in Class` : 'Qualified'}
                  </div>
                </div>
                <div>
                  <div className="text-[11px] text-slate-500">Result Status</div>
                  <div className="text-base sm:text-lg font-extrabold text-emerald-700">PASSED</div>
                </div>
              </div>

              {/* Teacher\'s Personalized Remark */}
              <div className="p-4 rounded-xl bg-amber-50/60 border border-amber-200/80 text-xs">
                <div className="font-bold text-amber-950 mb-1 flex items-center gap-1.5">
                  <Award className="w-4 h-4 text-amber-700" />
                  <span>Teacher Assessment by Krishan Kumar (TGT Social Science):</span>
                </div>
                <p className="text-slate-700 leading-relaxed italic">
                  "{language === 'hi' ? searchResult.remarks.hi : searchResult.remarks.en}"
                </p>
              </div>

              {/* Verification & Signatures */}
              <div className="pt-6 border-t border-slate-200 flex flex-wrap items-center justify-between gap-4 text-xs">
                <div className="flex items-center gap-2 text-slate-500">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  <span>Officially Verified · GGHS Dhanger Records</span>
                </div>

                <div className="text-right">
                  <div className="font-bold text-slate-900">Krishan Kumar</div>
                  <div className="text-[11px] text-slate-500">TGT Social Science / Evaluator</div>
                </div>
              </div>

              {/* Print Button (hidden in print view) */}
              <div className="text-center pt-2 no-print">
                <button
                  onClick={() => window.print()}
                  className="px-6 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold shadow-xs flex items-center justify-center gap-2 mx-auto"
                >
                  <Printer className="w-4 h-4 text-amber-300" />
                  <span>Print Official Progress Marksheet</span>
                </button>
              </div>

            </div>
          </div>
        ) : hasSearched ? (
          <div className="text-center py-12 max-w-md mx-auto bg-slate-50 rounded-2xl border border-slate-200 p-8">
            <p className="text-sm text-slate-600">
              No results found for "{searchQuery}". Please check the Roll Number or try one of the sample buttons above.
            </p>
          </div>
        ) : null}

        {/* Top Scorers Merit Board */}
        <div className="mt-14 pt-10 border-t border-slate-200">
          <div className="text-center mb-6">
            <h3 className="text-lg font-bold text-slate-900 font-display">
              {language === 'en' ? 'GGHS Dhanger — Recent Assessment Merit Standings' : 'राजकीय कन्या उच्च विद्यालय ढांगर — हालिया मूल्यांकन मेरिट सूची'}
            </h3>
            <p className="text-xs text-slate-500">
              Consistent achievers in Social Science online and offline classroom assessments
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-4xl mx-auto">
            {STUDENT_RESULTS.slice(0, 3).map((std, idx) => (
              <div
                key={std.rollNo}
                onClick={() => selectPredefined(std.rollNo)}
                className="cursor-pointer bg-slate-50/80 hover:bg-white p-4 rounded-xl border border-slate-200 hover:border-sky-300 transition-all text-center shadow-xs"
              >
                <div className="w-8 h-8 rounded-full bg-amber-100 text-amber-800 font-bold text-xs flex items-center justify-center mx-auto mb-2">
                  #{idx + 1}
                </div>
                <div className="font-bold text-slate-900 text-sm">{std.studentName}</div>
                <div className="text-xs text-slate-500 font-mono mt-0.5">{std.rollNo} · Class {std.classLevel}</div>
                <div className="text-emerald-700 font-extrabold text-base font-mono mt-2">
                  {std.percentage}%
                </div>
                <div className="text-[11px] text-slate-400 mt-1">Click to view marksheet</div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </section>
  );
};
