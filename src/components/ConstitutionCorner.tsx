import React, { useState } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { PREAMBLE_TERMS } from '../data/portalData';
import { Landmark, BookOpen, ShieldCheck, Award, Sparkles, ChevronRight, HelpCircle } from 'lucide-react';

interface ConstitutionCornerProps {
  onStartQuiz: () => void;
}

export const ConstitutionCorner: React.FC<ConstitutionCornerProps> = ({ onStartQuiz }) => {
  const { language } = useLanguage();
  const [selectedTerm, setSelectedTerm] = useState<string>(PREAMBLE_TERMS[0].term);

  const activeTermData = PREAMBLE_TERMS.find((t) => t.term === selectedTerm) || PREAMBLE_TERMS[0];

  const fundamentalRights = [
    {
      title: 'Right to Equality',
      titleHi: 'समानता का अधिकार',
      articles: 'Articles 14 – 18',
      summary: 'Equality before law, prohibition of discrimination on grounds of religion, race, caste, sex or place of birth, equal opportunity in public employment, and abolition of untouchability (Art. 17).',
      summaryHi: 'विधि के समक्ष समानता, धर्म, मूलवंश, जाति, लिंग या जन्म स्थान के आधार पर विभेद का प्रतिषेध, लोक नियोजन में अवसर की समानता तथा अस्पृश्यता का अंत (अनुच्छेद 17)।',
    },
    {
      title: 'Right to Freedom',
      titleHi: 'स्वतंत्रता का अधिकार',
      articles: 'Articles 19 – 22',
      summary: 'Six freedoms under Article 19 (Speech, Assembly, Association, Movement, Residence, Profession), protection in respect of conviction for offences (Art. 20), Protection of Life & Personal Liberty (Art. 21), and Right to Education (Art. 21A).',
      summaryHi: 'अनुच्छेद 19 के तहत 6 स्वतंत्रताएं (भाषण, शांतिपूर्ण सम्मेलन, संगठन, भ्रमण, निवास, व्यापार), अपराधों के दोषसिद्धि के संबंध में संरक्षण, जीवन व व्यक्तिगत स्वतंत्रता (अनुच्छेद 21) एवं निःशुल्क शिक्षा (अनुच्छेद 21A)।',
    },
    {
      title: 'Right against Exploitation',
      titleHi: 'शोषण के विरुद्ध अधिकार',
      articles: 'Articles 23 – 24',
      summary: 'Prohibition of traffic in human beings and forced labor (Begar) under Article 23; Prohibition of employment of children below 14 years in factories, mines, or hazardous employment under Article 24.',
      summaryHi: 'मानव दुर्व्यापार और बंधुआ मजदूरी (बेगार) का प्रतिषेध (अनुच्छेद 23); 14 वर्ष से कम आयु के बच्चों को कारखानों या जोखिम भरे कार्यों में लगाने पर रोक (अनुच्छेद 24)।',
    },
    {
      title: 'Right to Freedom of Religion',
      titleHi: 'धार्मिक स्वतंत्रता का अधिकार',
      articles: 'Articles 25 – 28',
      summary: 'Freedom of conscience and free profession, practice and propagation of religion (Art. 25), freedom to manage religious affairs (Art. 26), and freedom as to payment of taxes for promotion of any religion.',
      summaryHi: 'अंतःकरण की और धर्म के अबाध रूप से मानने, आचरण और प्रचार करने की स्वतंत्रता (अनुच्छेद 25), धार्मिक कार्यों के प्रबंध की स्वतंत्रता (अनुच्छेद 26)। भारत का कोई राज्य धर्म नहीं है।',
    },
    {
      title: 'Cultural and Educational Rights',
      titleHi: 'संस्कृति और शिक्षा संबंधी अधिकार',
      articles: 'Articles 29 – 30',
      summary: 'Protection of language, script and culture of minorities (Art. 29); Right of religious and linguistic minorities to establish and administer educational institutions of their choice (Art. 30).',
      summaryHi: 'अल्पसंख्यकों की भाषा, लिपि और संस्कृति के संरक्षण का अधिकार (अनुच्छेद 29); अपनी पसंद की शिक्षण संस्थाओं की स्थापना और प्रशासन करने का अधिकार (अनुच्छेद 30)।',
    },
    {
      title: 'Right to Constitutional Remedies',
      titleHi: 'संवैधानिक उपचारों का अधिकार',
      articles: 'Article 32',
      summary: 'Termed the "Heart and Soul of the Constitution" by Dr. B.R. Ambedkar. Guarantees the right to move the Supreme Court for enforcement of rights via 5 prerogative writs: Habeas Corpus, Mandamus, Prohibition, Quo-Warranto, and Certiorari.',
      summaryHi: 'डॉ. बी.आर. आंबेडकर द्वारा "संविधान का हृदय और आत्मा" कहा गया। नागरिकों के मौलिक अधिकारों के हनन पर सर्वोच्च न्यायालय द्वारा 5 रिट जारी करने का अधिकार।',
    },
  ];

  return (
    <section id="polity" className="py-14 bg-white border-b border-slate-200/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Heading */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-10">
          <div>
            <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-sky-800 mb-2">
              <Landmark className="w-4 h-4 text-rose-600" />
              <span>{language === 'en' ? 'Specialized Academic Corner' : 'विशेषज्ञ अध्ययन अनुभाग'}</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 font-display">
              {language === 'en' ? 'Indian Constitution & Political Science Hub' : 'भारतीय संविधान एवं राजनीति विज्ञान केंद्र'}
            </h2>
            <p className="mt-1 text-sm sm:text-base text-slate-600 max-w-2xl">
              {language === 'en'
                ? 'Curated by Krishan Kumar (M.A. Political Science, UGC NET Qualified twice). Deep conceptual clarity on constitutional foundations and governance.'
                : 'कृष्ण कुमार (एम.ए. राजनीति विज्ञान, दो बार यूजीसी नेट उत्तीर्ण) द्वारा तैयार। भारतीय संविधान, लोकतांत्रिक शासन एवं मौलिक अधिकारों का प्रामाणिक विश्लेषण।'}
            </p>
          </div>

          <button
            onClick={onStartQuiz}
            className="px-4 py-2.5 rounded-xl bg-sky-900 hover:bg-sky-800 text-white font-semibold text-xs transition-colors flex items-center gap-2 shadow-xs shrink-0 self-start md:self-auto"
          >
            <Award className="w-4 h-4 text-amber-300" />
            <span>Attempt Constitution Quiz</span>
          </button>
        </div>

        {/* Preamble Explorer Card */}
        <div className="bg-gradient-to-br from-slate-900 via-sky-950 to-slate-900 text-white rounded-2xl p-6 sm:p-8 shadow-xl mb-12 border border-slate-800">
          
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-white/10 mb-6">
            <div>
              <span className="text-amber-400 font-mono text-xs font-semibold uppercase tracking-wider">
                Soul of the Constitution · संविधान की आत्मा
              </span>
              <h3 className="text-xl sm:text-2xl font-bold font-display text-white mt-1">
                The Preamble to the Constitution of India
              </h3>
            </div>
            <div className="text-xs text-slate-300">
              Interactive Keyword Explorer · Select a word below to read meaning
            </div>
          </div>

          {/* Interactive Preamble Keyword Buttons */}
          <div className="flex flex-wrap gap-2 mb-6">
            {PREAMBLE_TERMS.map((item) => {
              const isSelected = selectedTerm === item.term;
              return (
                <button
                  key={item.term}
                  onClick={() => setSelectedTerm(item.term)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    isSelected
                      ? 'bg-amber-400 text-slate-950 shadow-md ring-2 ring-amber-300 ring-offset-2 ring-offset-slate-900 scale-105'
                      : 'bg-white/10 text-slate-200 hover:bg-white/20'
                  }`}
                >
                  {item.term} · {item.termHi.split(' ')[0]}
                </button>
              );
            })}
          </div>

          {/* Expanded Selected Keyword Explanation */}
          <div className="bg-white/10 rounded-xl p-5 backdrop-blur-xs border border-white/15 animate-in fade-in duration-150">
            <div className="flex items-center justify-between gap-2 mb-2">
              <span className="text-amber-300 font-extrabold text-base sm:text-lg font-display">
                {activeTermData.term} ({activeTermData.termHi})
              </span>
              <span className="text-[11px] text-slate-300 font-mono">
                Preamble Key Value
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-200 leading-relaxed">
              {language === 'hi' ? activeTermData.meaning.hi : activeTermData.meaning.en}
            </p>
          </div>

          <div className="mt-4 text-[11px] text-slate-400 text-right">
            Adopted by the Constituent Assembly of India on 26 November 1949 (National Constitution Day)
          </div>

        </div>

        {/* Fundamental Rights Grid */}
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-lg sm:text-xl font-bold text-slate-900 font-display">
              {language === 'en' ? 'Six Fundamental Rights (Part III of the Constitution)' : 'छह मौलिक अधिकार (संविधान का भाग III)'}
            </h3>
            <span className="text-xs text-slate-500 font-mono">
              Articles 12 to 35
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {fundamentalRights.map((fr, idx) => (
              <div
                key={idx}
                className="bg-slate-50/70 border border-slate-200 hover:border-sky-300 rounded-xl p-5 transition-all shadow-xs hover:bg-white flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 text-xs mb-2">
                    <span className="font-bold text-sky-800 font-mono">{fr.articles}</span>
                    <span className="w-5 h-5 rounded-full bg-sky-100 text-sky-900 text-xs font-bold flex items-center justify-center">
                      {idx + 1}
                    </span>
                  </div>

                  <h4 className="text-base font-bold text-slate-900 mb-2 leading-snug">
                    {language === 'hi' ? fr.titleHi : fr.title}
                  </h4>

                  <p className="text-xs text-slate-600 leading-relaxed">
                    {language === 'hi' ? fr.summaryHi : fr.summary}
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-200/80 text-[11px] text-slate-500 font-medium flex items-center justify-between">
                  <span>Enforceable via Supreme Court</span>
                  <span className="text-sky-700 font-semibold">Art. 32</span>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </section>
  );
};
