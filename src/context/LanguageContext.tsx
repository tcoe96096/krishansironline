import React, { createContext, useContext, useState, useEffect } from 'react';
import { Language } from '../types';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  toggleLanguage: () => void;
  t: (key: string) => string;
}

const translations: Record<string, Record<Language, string>> = {
  // Navigation
  'nav.home': { en: 'Home', hi: 'मुख्य पृष्ठ' },
  'nav.about': { en: 'About Teacher', hi: 'शिक्षक परिचय' },
  'nav.classes': { en: 'Classes 6–12', hi: 'कक्षा 6–12' },
  'nav.tests': { en: 'Online Tests', hi: 'ऑनलाइन टेस्ट' },
  'nav.materials': { en: 'Study Materials', hi: 'अध्ययन सामग्री' },
  'nav.questions': { en: 'Question Bank', hi: 'प्रश्न बैंक' },
  'nav.results': { en: 'Results', hi: 'परीक्षा परिणाम' },
  'nav.polity': { en: 'Political Science', hi: 'राजनीति विज्ञान' },
  'nav.affairs': { en: 'Current Affairs', hi: 'समसामयिकी' },
  'nav.contact': { en: 'Contact', hi: 'संपर्क करें' },

  // Hero
  'hero.title': { en: 'Welcome to Krishan Sir – Online Learning Portal', hi: 'कृष्ण सर – ऑनलाइन लर्निंग पोर्टल में आपका स्वागत है' },
  'hero.subtitle': { en: 'Your Learning Partner for Classes 6–12, Social Science, Online Tests, and Examination Preparation.', hi: 'कक्षा 6–12, सामाजिक विज्ञान, ऑनलाइन टेस्ट और परीक्षा तैयारी का आपका विश्वस्त साथी।' },
  'hero.description': { en: 'Explore chapter-wise study materials, practice MCQs, attempt online tests, and improve your academic performance through regular practice.', hi: 'अध्यायवार अध्ययन सामग्री, बहुविकल्पीय प्रश्न (MCQ), ऑनलाइन टेस्ट का अभ्यास करें और अपनी शैक्षणिक सफलता सुनिश्चित करें।' },
  'hero.tagline': { en: 'Learn • Practice • Improve • Succeed', hi: 'सीखें • अभ्यास करें • सुधार करें • सफलता प्राप्त करें' },
  'hero.btnTest': { en: 'Start Online Test', hi: 'ऑनलाइन टेस्ट शुरू करें' },
  'hero.btnMaterials': { en: 'Explore Study Materials', hi: 'अध्ययन सामग्री देखें' },
  'hero.btnResults': { en: 'View Results', hi: 'परीक्षा परिणाम देखें' },
  'hero.btnAbout': { en: 'About Krishan Sir', hi: 'कृष्ण सर के बारे में' },

  // Teacher Profile Card
  'teacher.name': { en: 'Krishan Kumar', hi: 'कृष्ण कुमार' },
  'teacher.designation': { en: 'TGT Social Science', hi: 'टीजीटी सामाजिक विज्ञान' },
  'teacher.school': { en: 'Government Girls High School (GGHS), Dhanger, Haryana', hi: 'राजकीय कन्या उच्च विद्यालय (GGHS), ढांगर, हरियाणा' },
  'teacher.qualifications': { en: 'M.A. Pol Sci, UGC NET (2x), M.Ed, M.Phil, UGC NET (Edu), CTET, HTET', hi: 'एम.ए. राजनीति विज्ञान, यूजीसी नेट (2 बार), एम.एड., एम.फिल., यूजीसी नेट (शिक्षा), सीटीईटी, एचटेट' },

  // Quick Access
  'quick.title': { en: 'Quick Access Portal', hi: 'त्वरित पहुंच पोर्टल' },
  'quick.onlineTests': { en: 'Online Tests', hi: 'ऑनलाइन टेस्ट' },
  'quick.studyMaterials': { en: 'Study Materials', hi: 'अध्ययन सामग्री' },
  'quick.questionBank': { en: 'MCQ Question Bank', hi: 'वस्तुनिष्ठ प्रश्न बैंक' },
  'quick.results': { en: 'Results', hi: 'परीक्षा परिणाम' },
  'quick.constitution': { en: 'Indian Constitution', hi: 'भारतीय संविधान' },
  'quick.politicalScience': { en: 'Political Science', hi: 'राजनीति विज्ञान' },
  'quick.announcements': { en: 'Latest Announcements', hi: 'नवीनतम सूचनाएं' },
  'quick.revision': { en: 'Revision Resources', hi: 'पुनरावृत्ति संसाधन' },

  // Classes
  'class.heading': { en: 'Select Your Class', hi: 'अपनी कक्षा का चयन करें' },
  'class.subheading': { en: 'Class-wise structured NCERT, HBSE and CBSE curriculum learning modules', hi: 'कक्षावार एनसीईआरटी, हरियाणा बोर्ड (HBSE) और सीबीएसई पाठ्यक्रम आधारित अध्ययन' },
  'class.comingSoon': { en: 'Resources Coming Soon', hi: 'पाठ्य सामग्री शीघ्र उपलब्ध होगी' },
  'class.comingSoonDesc': { en: 'Curriculum modules and test series for this class are currently under preparation.', hi: 'इस कक्षा के लिए अध्ययन सामग्री और टेस्ट श्रृंखला वर्तमान में तैयार की जा रही है।' },
  'class.viewMaterials': { en: 'Study Materials', hi: 'अध्ययन सामग्री' },
  'class.takeTest': { en: 'Attempt Online Test', hi: 'ऑनलाइन टेस्ट दें' },

  // Common
  'common.search': { en: 'Search resources, notes, tests...', hi: 'नोट्स, टेस्ट या विषय खोजें...' },
  'common.readMore': { en: 'Read More', hi: 'और पढ़ें' },
  'common.downloadPdf': { en: 'Download PDF Notes', hi: 'पीडीएफ डाउनलोड करें' },
  'common.close': { en: 'Close', hi: 'बंद करें' },
  'common.verified': { en: 'Verified Govt Teacher', hi: 'प्रमाणित सरकारी शिक्षक' },
  'common.free': { en: '100% Free Access', hi: 'निःशुल्क शिक्षा' },
};

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguage] = useState<Language>(() => {
    const saved = localStorage.getItem('krishan_portal_lang');
    return (saved === 'hi' || saved === 'en') ? saved : 'en';
  });

  useEffect(() => {
    localStorage.setItem('krishan_portal_lang', language);
  }, [language]);

  const toggleLanguage = () => {
    setLanguage(prev => (prev === 'en' ? 'hi' : 'en'));
  };

  const t = (key: string): string => {
    if (translations[key] && translations[key][language]) {
      return translations[key][language];
    }
    return key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, toggleLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};
