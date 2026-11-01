import React, { useState } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { CheckSquare, Eye, EyeOff, MapPin, Award, BookOpen, Search, Sparkles } from 'lucide-react';

export const QuestionBankView: React.FC = () => {
  const { language } = useLanguage();
  const [activeTab, setActiveTab] = useState<'mcq' | 'subjective' | 'map'>('mcq');
  const [revealedAnswers, setRevealedAnswers] = useState<Record<string, boolean>>({});

  const toggleReveal = (id: string) => {
    setRevealedAnswers((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const mcqBank = [
    {
      id: 'qb1',
      subject: 'Political Science',
      classLevel: '10',
      question: {
        en: 'In which year was the historic Panchayati Raj 73rd Constitutional Amendment Act passed by the Parliament of India?',
        hi: 'भारत की संसद द्वारा ऐतिहासिक पंचायती राज 73वां संविधान संशोधन अधिनियम किस वर्ष पारित किया गया था?',
      },
      options: {
        en: ['1976', '1989', '1992', '2001'],
        hi: ['1976', '1989', '1992', '2001'],
      },
      correctAnswer: 2,
      explanation: {
        en: 'The 73rd Amendment was enacted in 1992 and came into force on 24 April 1993, which is celebrated annually as National Panchayati Raj Day.',
        hi: '73वां संशोधन 1992 में पारित हुआ और 24 अप्रैल 1993 को लागू हुआ, जिसे प्रतिवर्ष राष्ट्रीय पंचायती राज दिवस के रूप में मनाया जाता है।',
      },
    },
    {
      id: 'qb2',
      subject: 'History',
      classLevel: '10',
      question: {
        en: 'On which date did the tragic Jallianwala Bagh Massacre take place in Amritsar on the day of Baisakhi?',
        hi: 'अमृतसर में बैसाखी के दिन जलियांवाला बाग का दर्दनाक हत्याकांड किस तिथि को घटित हुआ था?',
      },
      options: {
        en: ['10 April 1919', '13 April 1919', '1 August 1920', '12 March 1930'],
        hi: ['10 अप्रैल 1919', '13 अप्रैल 1919', '1 अगस्त 1920', '12 मार्च 1930'],
      },
      correctAnswer: 1,
      explanation: {
        en: 'On 13 April 1919, a large crowd gathered at Jallianwala Bagh to protest the arrest of Dr. Saifuddin Kitchlew and Dr. Satyapal, when General Dyer blocked exits and ordered indiscriminate firing.',
        hi: '13 अप्रैल 1919 को बैसाखी मेले के दिन डॉ. सैफुद्दीन किचलू और डॉ. सत्यपाल की गिरफ्तारी के शांतिपूर्ण विरोध में एकत्रित निहत्थे लोगों पर जनरल डायर ने गोलियां चलवाईं।',
      },
    },
    {
      id: 'qb3',
      subject: 'Geography',
      classLevel: '10',
      question: {
        en: 'Which Indian state is the largest producer of groundnut according to recent agricultural data?',
        hi: 'नवीनतम कृषि आंकड़ों के अनुसार मूंगफली का सबसे बड़ा उत्पादक राज्य कौन सा है?',
      },
      options: {
        en: ['Haryana', 'Gujarat', 'Punjab', 'Uttar Pradesh'],
        hi: ['हरियाणा', 'गुजरात', 'पंजाब', 'उत्तर प्रदेश'],
      },
      correctAnswer: 1,
      explanation: {
        en: 'Gujarat is the largest producer of groundnuts in India, followed by Rajasthan and Tamil Nadu. Groundnut is a Kharif crop.',
        hi: 'भारत में मूंगफली उत्पादन में गुजरात प्रथम स्थान पर है। मूंगफली एक महत्वपूर्ण खरीफ तिलहन फसल है।',
      },
    },
    {
      id: 'qb4',
      subject: 'Economics',
      classLevel: '10',
      question: {
        en: 'Under MGNREGA 2005, how many days of guaranteed wage employment are provided in a financial year to every rural household?',
        hi: 'मनरेगा (MGNREGA 2005) के अंतर्गत प्रत्येक ग्रामीण परिवार को एक वित्तीय वर्ष में कितने दिनों के रोजगार की गारंटी दी जाती है?',
      },
      options: {
        en: ['50 days', '100 days', '150 days', '200 days'],
        hi: ['50 दिन', '100 दिन', '150 दिन', '200 दिन'],
      },
      correctAnswer: 1,
      explanation: {
        en: 'Mahatma Gandhi National Rural Employment Guarantee Act guarantees 100 days of wage employment. If the government fails to provide employment within 15 days, unemployment allowance is provided.',
        hi: 'मनरेगा अधिनियम के तहत ग्रामीण क्षेत्रों में 100 दिनों के अकुशल काम की गारंटी है। काम न मिलने पर बेरोजगारी भत्ता देय होता है।',
      },
    },
  ];

  const subjectiveQuestions = [
    {
      id: 'sub1',
      subject: 'Political Science',
      classLevel: '10',
      marks: 3,
      title: {
        en: 'State three difference between Prudential and Moral reasons for Power Sharing.',
        hi: 'सत्ता की साझेदारी के युक्तिपरक (Prudential) और नैतिक (Moral) कारणों में तीन प्रमुख अंतर बताइए।',
      },
      modelAnswer: {
        en: '1. Prudential reasons stress that power sharing brings better outcomes by avoiding violence and political instability.\n2. Moral reasons emphasize that power sharing is the very spirit of democracy—citizens have a right to be consulted on how they are governed.\n3. Prudential example: Equal language ministers in Belgium; Moral example: Decentralization via Panchayati Raj in India.',
        hi: '1. युक्तिपरक तर्क इस बात पर बल देता है कि सत्ता का बंटवारा सामाजिक टकराव को रोकता है और शासन को स्थिरता प्रदान करता है।\n2. नैतिक तर्क कहता है कि सत्ता की साझेदारी लोकतंत्र की मूल आत्मा है—जनता को यह जानने का अधिकार है कि उन पर शासन कैसे किया जाए।\n3. उदाहरण: बेल्जियम में भाषाई संतुलन युक्तिपरक है, जबकि भारत में पंचायती राज जनभागीदारी का नैतिक उदाहरण है।',
      },
    },
    {
      id: 'sub2',
      subject: 'History',
      classLevel: '10',
      marks: 5,
      title: {
        en: 'Explain the circumstances that led Mahatma Gandhi to launch the Non-Cooperation Movement in 1920.',
        hi: 'उन परिस्थितियों की व्याख्या कीजिए जिनके कारण महात्मा गांधी ने 1920 में असहयोग आंदोलन प्रारंभ किया।',
      },
      modelAnswer: {
        en: '1. Economic Hardships after WWI: Extreme price rise, forced recruitment of villagers into the British army, and famine.\n2. The Rowlatt Act (1919): Authorized the government to imprison any person without trial for up to 2 years.\n3. Jallianwala Bagh Massacre (13 April 1919): Brutal slaughter of innocents by General Dyer outraged the entire nation.\n4. Khilafat Issue: British harsh treatment of the Ottoman Emperor (Caliph). Gandhiji saw this as an opportunity to unite Hindus and Muslims under one umbrella.\n5. Gandhiji\'s conviction: In "Hind Swaraj" (1909), Gandhiji stated British rule was established and survived only with Indian cooperation. Refusal to cooperate would bring Swaraj within a year.',
        hi: '1. प्रथम विश्व युद्ध के बाद की आर्थिक कठिनाइयां: भारी मूल्य वृद्धि, करों में वृद्धि और सेना में जबरन भर्ती।\n2. रौलट एक्ट (1919): बिना मुकदमा चलाए दो साल तक जेल में बंद रखने का काला कानून।\n3. जलियांवाला बाग हत्याकांड (13 अप्रैल 1919): जनरल डायर द्वारा निहत्थों पर बर्बर गोलीबारी से पूरे देश में रोष।\n4. खिलाफत आंदोलन: तुर्की के खलीफा के समर्थन में हिंदू-मुस्लिम एकता का ऐतिहासिक अवसर।\n5. "हिंद स्वराज" (1909) में गांधीजी का विचार: ब्रिटिश शासन भारतीयों के सहयोग से ही टिका है; यदि भारतीय सहयोग वापस ले लें, तो स्वराज्य अवश्य प्राप्त होगा।',
      },
    },
  ];

  const mapItems = [
    {
      category: 'Indian National Movement (History - Class 10)',
      categoryHi: 'भारतीय राष्ट्रीय आंदोलन के महत्वपूर्ण केंद्र',
      items: [
        { name: 'Champaran (Bihar)', note: 'Movement of Indigo Planters (1917)' },
        { name: 'Kheda (Gujarat)', note: 'Peasant Satyagraha for revenue remission (1917)' },
        { name: 'Ahmedabad (Gujarat)', note: 'Cotton Mill Workers Satyagraha (1918)' },
        { name: 'Amritsar (Punjab)', note: 'Jallianwala Bagh Massacre (13 April 1919)' },
        { name: 'Chauri Chaura (UP)', note: 'Calling off Non-Cooperation Movement (1922)' },
        { name: 'Dandi (Gujarat)', note: 'Civil Disobedience Movement / Salt March (1930)' },
      ],
    },
    {
      category: 'Major Dams & Water Resources (Geography - Class 10)',
      categoryHi: 'भारत के प्रमुख बांध एवं बहुउद्देशीय परियोजनाएं',
      items: [
        { name: 'Salal Project', note: 'Chenab River, Jammu & Kashmir' },
        { name: 'Bhakra Nangal', note: 'Satluj River, Himachal Pradesh / Punjab border' },
        { name: 'Tehri Dam', note: 'Bhagirathi River, Uttarakhand (Highest dam)' },
        { name: 'Rana Pratap Sagar', note: 'Chambal River, Rajasthan' },
        { name: 'Sardar Sarovar', note: 'Narmada River, Gujarat' },
        { name: 'Hirakud Dam', note: 'Mahanadi River, Odisha (Longest dam)' },
      ],
    },
  ];

  return (
    <section id="questions" className="py-14 bg-slate-50 border-b border-slate-200/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Heading */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
          <div>
            <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-sky-800 mb-2">
              <CheckSquare className="w-4 h-4 text-emerald-600" />
              <span>{language === 'en' ? 'Exam Success Hub' : 'परीक्षा सफलता केंद्र'}</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 font-display">
              {language === 'en' ? 'HBSE & CBSE Question Bank' : 'हरियाणा बोर्ड व सीबीएसई प्रश्न बैंक'}
            </h2>
            <p className="mt-1 text-sm sm:text-base text-slate-600 max-w-2xl">
              {language === 'en'
                ? 'High-yield objective MCQs with answer reveals, 3 & 5 mark model answers, and board map practice.'
                : 'उत्तर कुंजी युक्त वस्तुनिष्ठ प्रश्न, 3 व 5 अंकों वाले आदर्श उत्तर और अनिवार्य मानचित्र कार्य अभ्यास।'}
            </p>
          </div>

          {/* Tab Selector */}
          <div className="flex items-center gap-1 p-1 bg-white border border-slate-200 rounded-lg shadow-xs">
            <button
              onClick={() => setActiveTab('mcq')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                activeTab === 'mcq'
                  ? 'bg-sky-900 text-white'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              MCQs (बहुविकल्पीय)
            </button>
            <button
              onClick={() => setActiveTab('subjective')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                activeTab === 'subjective'
                  ? 'bg-sky-900 text-white'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              3 & 5 Marks Answers
            </button>
            <button
              onClick={() => setActiveTab('map')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                activeTab === 'map'
                  ? 'bg-sky-900 text-white'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Map Work (मानचित्र)
            </button>
          </div>
        </div>

        {/* Tab 1: MCQs */}
        {activeTab === 'mcq' && (
          <div className="space-y-4">
            {mcqBank.map((item, idx) => {
              const isRevealed = revealedAnswers[item.id];
              return (
                <div
                  key={item.id}
                  className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs hover:border-slate-300 transition-all"
                >
                  <div className="flex items-center justify-between gap-2 text-xs text-slate-500 mb-3 font-mono">
                    <span className="font-semibold text-sky-800">
                      {item.subject} · Class {item.classLevel}
                    </span>
                    <span>Q#{idx + 1}</span>
                  </div>

                  <h3 className="text-sm sm:text-base font-bold text-slate-900 mb-4 leading-snug">
                    <span className="text-sky-900 mr-2 font-mono">{idx + 1}.</span>
                    {language === 'hi' ? item.question.hi : item.question.en}
                  </h3>

                  {/* Options */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-4">
                    {(language === 'hi' ? item.options.hi : item.options.en).map((opt, oIdx) => {
                      const isCorrect = oIdx === item.correctAnswer;
                      return (
                        <div
                          key={oIdx}
                          className={`p-3 rounded-lg border text-xs flex items-center gap-2.5 ${
                            isRevealed && isCorrect
                              ? 'bg-emerald-50 border-emerald-300 text-emerald-950 font-semibold'
                              : 'bg-slate-50/60 border-slate-200 text-slate-700'
                          }`}
                        >
                          <span className="w-5 h-5 rounded-full bg-white border border-slate-300 flex items-center justify-center font-bold text-[11px] shrink-0">
                            {String.fromCharCode(65 + oIdx)}
                          </span>
                          <span>{opt}</span>
                        </div>
                      );
                    })}
                  </div>

                  {/* Reveal Answer Action */}
                  <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
                    <button
                      onClick={() => toggleReveal(item.id)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition-colors"
                    >
                      {isRevealed ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      <span>{isRevealed ? 'Hide Solution' : 'Reveal Correct Answer & Reason'}</span>
                    </button>

                    {isRevealed && (
                      <span className="text-xs font-bold text-emerald-700">
                        Correct: Option {String.fromCharCode(65 + item.correctAnswer)}
                      </span>
                    )}
                  </div>

                  {/* Explanation if revealed */}
                  {isRevealed && (
                    <div className="mt-3 p-3 bg-emerald-50/60 border border-emerald-200 rounded-lg text-xs text-slate-800 animate-in fade-in duration-150">
                      <div className="font-bold text-emerald-950 mb-0.5">
                        Krishan Sir\'s Concept Breakdown:
                      </div>
                      <p className="leading-relaxed">
                        {language === 'hi' ? item.explanation.hi : item.explanation.en}
                      </p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Tab 2: Subjective (3 & 5 Marks) */}
        {activeTab === 'subjective' && (
          <div className="space-y-6">
            {subjectiveQuestions.map((sq, idx) => (
              <div
                key={sq.id}
                className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs"
              >
                <div className="flex items-center justify-between gap-2 text-xs text-slate-500 mb-2 font-mono">
                  <span className="font-semibold text-sky-800">{sq.subject} · Class {sq.classLevel}</span>
                  <span className="bg-amber-100 text-amber-900 px-2 py-0.5 rounded-sm font-bold">
                    {sq.marks} Marks
                  </span>
                </div>

                <h3 className="text-base sm:text-lg font-bold text-slate-900 mb-4 leading-snug">
                  {language === 'hi' ? sq.title.hi : sq.title.en}
                </h3>

                <div className="bg-slate-50 rounded-xl p-4 border border-slate-200/80">
                  <div className="text-xs font-bold text-sky-900 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                    <span>Model Answer (Structured for Maximum Board Marks):</span>
                  </div>
                  <div className="text-xs sm:text-sm text-slate-700 leading-relaxed whitespace-pre-line font-sans">
                    {language === 'hi' ? sq.modelAnswer.hi : sq.modelAnswer.en}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Tab 3: Map Work */}
        {activeTab === 'map' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {mapItems.map((group, gIdx) => (
              <div
                key={gIdx}
                className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs"
              >
                <div className="flex items-center gap-2 text-sky-900 font-bold text-base mb-4 font-display">
                  <MapPin className="w-5 h-5 text-amber-600 shrink-0" />
                  <h4>{language === 'hi' ? group.categoryHi : group.category}</h4>
                </div>

                <div className="space-y-2.5">
                  {group.items.map((it, iIdx) => (
                    <div
                      key={iIdx}
                      className="p-3 rounded-lg border border-slate-100 bg-slate-50/60 flex items-start justify-between gap-3 text-xs"
                    >
                      <div>
                        <div className="font-bold text-slate-900">{it.name}</div>
                        <div className="text-slate-500 mt-0.5">{it.note}</div>
                      </div>
                      <span className="px-2 py-0.5 rounded-sm bg-sky-50 text-sky-800 font-mono text-[10px] shrink-0 font-semibold border border-sky-100">
                        Locate on Map
                      </span>
                    </div>
                  ))}
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 text-[11px] text-slate-500">
                  Guaranteed 5 marks in Class 10 Board exam Social Science map section.
                </div>
              </div>
            ))}
          </div>
        )}

      </div>
    </section>
  );
};
