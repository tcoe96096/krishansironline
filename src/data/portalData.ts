import { StudyChapter, OnlineTest, StudentResult, Notice, CurrentAffairItem, ClassLevel } from '../types';
import { UPLOADED_CLASS9_ONLINE_TEST } from './class9Test60Data';
import { NMMS_CLASS8_HISTORY_CH1_TEST } from './nmmsClass8HistoryChapter1';

export const TEACHER_INFO = {
  name: 'Krishan Kumar',
  designation: 'TGT Social Science',
  school: 'Government Girls High School (GGHS), Dhanger, Haryana, India',
  district: 'Fatehabad',
  state: 'Haryana',
  pincode: '125048',
  tagline: {
    en: 'Learn • Practice • Improve • Succeed',
    hi: 'सीखें • अभ्यास करें • सुधार करें • सफलता प्राप्त करें',
  },
  photo: '/images/krishan-sir.png',
  qualifications: [
    { id: 1, title: 'Bachelor of Arts (B.A.)', hi: 'कला स्नातक (बी.ए.)', institution: 'Recognized University' },
    { id: 2, title: 'Master of Arts (M.A.) in Political Science', hi: 'राजनीति विज्ञान में स्नातकोत्तर (एम.ए.)', institution: 'Post Graduate University' },
    { id: 3, title: 'UGC NET in Political Science — Qualified Twice', hi: 'यूजीसी नेट (राजनीति विज्ञान) — दो बार उत्तीर्ण', institution: 'University Grants Commission (UGC)' },
    { id: 4, title: 'Bachelor of Education (B.Ed.)', hi: 'शिक्षा स्नातक (बी.एड.)', institution: 'Teacher Training Institute' },
    { id: 5, title: 'Master of Education (M.Ed.)', hi: 'शिक्षा में स्नातकोत्तर (एम.एड.)', institution: 'Education Department' },
    { id: 6, title: 'Master of Philosophy (M.Phil.)', hi: 'दर्शनशास्त्र में मास्टर (एम.फिल.)', institution: 'Research University' },
    { id: 7, title: 'UGC NET in Education', hi: 'यूजीसी नेट (शिक्षाशास्त्र) उत्तीर्ण', institution: 'University Grants Commission (UGC)' },
    { id: 8, title: 'Central Teacher Eligibility Test (CTET) — Both Levels (Paper I & II)', hi: 'केंद्रीय शिक्षक पात्रता परीक्षा (CTET) — दोनों स्तर', institution: 'CBSE New Delhi' },
    { id: 9, title: 'Haryana Teacher Eligibility Test (HTET) — TGT Hindi and Social Science', hi: 'हरियाणा शिक्षक पात्रता परीक्षा (HTET) — टीजीटी हिंदी एवं सामाजिक विज्ञान', institution: 'Board of School Education Haryana (BSEH)' },
  ],
  experience: [
    {
      role: 'TGT Social Science',
      roleHi: 'टीजीटी सामाजिक विज्ञान',
      organization: 'Government Girls High School (GGHS), Dhanger, Haryana',
      organizationHi: 'राजकीय कन्या उच्च विद्यालय (GGHS), ढांगर, हरियाणा',
      duration: '2 Years 8 Months (Current)',
      durationHi: '2 वर्ष 8 माह (वर्तमान)',
      description: 'Teaching Social Science to high school students, conducting digital classroom tests, mentoring for HBSE Board examinations and competitive foundation.',
    },
    {
      role: 'Assistant Professor (Teacher Educator)',
      roleHi: 'सहायक प्रोफेसर (अध्यापक शिक्षा)',
      organization: 'B.Ed. College of Education',
      organizationHi: 'बी.एड. कॉलेज ऑफ एजुकेशन',
      duration: '2 Years',
      durationHi: '2 वर्ष',
      description: 'Taught pedagogical methods in Social Studies and Educational Foundations to prospective teachers in B.Ed. programs.',
    },
  ],
  teachingSubjects: [
    { en: 'Social Science', hi: 'सामाजिक विज्ञान' },
    { en: 'History', hi: 'इतिहास' },
    { en: 'Geography', hi: 'भूगोल' },
    { en: 'Political Science', hi: 'राजनीति विज्ञान' },
    { en: 'Economics', hi: 'अर्थशास्त्र' },
    { en: 'Civics', hi: 'नागरिक शास्त्र' },
    { en: 'Indian Constitution', hi: 'भारतीय संविधान' },
    { en: 'Political Theory', hi: 'राजनीतिक सिद्धांत' },
    { en: 'Indian Political System', hi: 'भारतीय राजनीतिक व्यवस्था' },
    { en: 'Contemporary World Politics', hi: 'समकालीन विश्व राजनीति' },
  ],
  philosophy: {
    en: 'Education is the most powerful tool for intellectual liberation and social empowerment. My teaching focuses on conceptual clarity, factual accuracy, critical thinking, and regular assessment. By connecting historical events, geographical realities, and democratic institutions to real life, we equip students not just to score top marks in board exams, but to become thoughtful, aware, and responsible citizens of India.',
    hi: 'शिक्षा बौद्धिक मुक्ति और सामाजिक सशक्तिकरण का सबसे सशक्त साधन है। मेरा शिक्षण मुख्य रूप से वैचारिक स्पष्टता, तथ्यात्मक शुद्धता, विश्लेषणात्मक चिंतन और सतत मूल्यांकन पर केंद्रित है। जब विद्यार्थी इतिहास, भूगोल और लोकतांत्रिक संस्थाओं को दैनिक जीवन से जोड़कर समझते हैं, तब वे केवल परीक्षा में उत्कृष्ट अंक ही प्राप्त नहीं करते, बल्कि एक जागरूक और उत्तरदायी नागरिक भी बनते हैं।',
  },
};

export const INITIAL_NOTICES: Notice[] = [
  {
    id: 'n1',
    date: '2026-10-28',
    category: 'Test',
    isNew: true,
    title: {
      en: 'Class 10 Social Science Board Model Practice Test (Term-II) is now Live',
      hi: 'कक्षा 10 सामाजिक विज्ञान बोर्ड मॉडल अभ्यास टेस्ट (सत्र-2) प्रारंभ हो चुका है',
    },
    details: {
      en: 'Special HBSE & CBSE board pattern test featuring 20 MCQs and immediate scoring analysis.',
      hi: 'हरियाणा विद्यालय शिक्षा बोर्ड एवं सीबीएसई पैटर्न पर आधारित 20 वस्तुनिष्ठ प्रश्न और तुरंत परिणाम विश्लेषण।',
    },
    link: '#tests',
  },
  {
    id: 'n2',
    date: '2026-10-25',
    category: 'Result',
    isNew: true,
    title: {
      en: 'Weekly Assessment #14 Results Declared for GGHS Dhanger Students',
      hi: 'GGHS ढांगर के विद्यार्थियों हेतु साप्ताहिक मूल्यांकन #14 का परीक्षा परिणाम घोषित',
    },
    details: {
      en: 'Students can search their marksheet by Roll Number or Name in the Results section.',
      hi: 'विद्यार्थी परीक्षा परिणाम अनुभाग में अपने रोल नंबर अथवा नाम से अपनी अंकतालिका देख सकते हैं।',
    },
    link: '#results',
  },
  {
    id: 'n3',
    date: '2026-10-20',
    category: 'Notes',
    isNew: false,
    title: {
      en: 'Class 9 Political Science: Chapter 2 Constitutional Design Revision Notes Added',
      hi: 'कक्षा 9 राजनीति विज्ञान: अध्याय 2 संविधान निर्माण के रिवीजन नोट्स उपलब्ध',
    },
    details: {
      en: 'Comprehensive notes covering South Africa struggle, Indian Preamble, and institutional design.',
      hi: 'दक्षिण अफ्रीका का संघर्ष, भारतीय संविधान की प्रस्तावना और संस्थाओं के स्वरूप पर आधारित विस्तृत नोट्स।',
    },
    link: '#materials',
  },
  {
    id: 'n4',
    date: '2026-10-15',
    category: 'Important',
    isNew: false,
    title: {
      en: 'HBSE Social Science Map-Work Guide for Class 9 & 10 Released',
      hi: 'कक्षा 9 एवं 10 के लिए हरियाणा बोर्ड सामाजिक विज्ञान मानचित्र कार्य मार्गदर्शिका जारी',
    },
    details: {
      en: 'Master all 100% expected board map locations: Major Dams, Soil types, and National Movement centers.',
      hi: 'बोर्ड परीक्षा के संभावित मानचित्र स्थल: प्रमुख बांध, मृदा के प्रकार और राष्ट्रीय आंदोलन के केंद्र।',
    },
    link: '#questions',
  },
];

export const CLASSES_METADATA: {
  level: ClassLevel;
  title: { en: string; hi: string };
  badge: { en: string; hi: string };
  subjects: { en: string; hi: string }[];
  description: { en: string; hi: string };
  status: 'active' | 'coming-soon';
  resourceCount: { notes: number; tests: number; mcqs: number };
}[] = [
  {
    level: '6',
    title: { en: 'Class 6 - Social Science', hi: 'कक्षा 6 - सामाजिक विज्ञान' },
    badge: { en: 'Middle Stage', hi: 'प्रारंभिक चरण' },
    subjects: [
      { en: 'History (Our Pasts - I)', hi: 'इतिहास (हमारे अतीत - I)' },
      { en: 'Geography (The Earth: Our Habitat)', hi: 'भूगोल (पृथ्वी: हमारा आवास)' },
      { en: 'Civics (Social & Political Life - I)', hi: 'नागरिक शास्त्र (सामाजिक एवं राजनीतिक जीवन - I)' },
    ],
    description: {
      en: 'Introduction to early human societies, Harappan civilization, earth rotation, and democratic diversity.',
      hi: 'प्रारंभिक मानव बस्तियां, हड़प्पा सभ्यता, पृथ्वी की गतियां और विविधता की मूल समझ।',
    },
    status: 'active',
    resourceCount: { notes: 8, tests: 6, mcqs: 120 },
  },
  {
    level: '7',
    title: { en: 'Class 7 - Social Science', hi: 'कक्षा 7 - सामाजिक विज्ञान' },
    badge: { en: 'Middle Stage', hi: 'माध्यमिक स्तर' },
    subjects: [
      { en: 'History (Our Pasts - II)', hi: 'इतिहास (हमारे अतीत - II)' },
      { en: 'Geography (Our Environment)', hi: 'भूगोल (हमारा पर्यावरण)' },
      { en: 'Civics (Social & Political Life - II)', hi: 'नागरिक शास्त्र (सामाजिक एवं राजनीतिक जीवन - II)' },
    ],
    description: {
      en: 'Medieval Indian history, Delhi Sultanate, Mughal empire, atmospheric layers, and equality in democracy.',
      hi: 'मध्यकालीन भारत, दिल्ली सल्तनत, मुगल साम्राज्य, पर्यावरण के घटक और लोकतंत्र में समानता।',
    },
    status: 'active',
    resourceCount: { notes: 9, tests: 7, mcqs: 140 },
  },
  {
    level: '8',
    title: { en: 'Class 8 - Social Science', hi: 'कक्षा 8 - सामाजिक विज्ञान' },
    badge: { en: 'Upper Middle', hi: 'उच्च प्राथमिक' },
    subjects: [
      { en: 'History (Our Pasts - III)', hi: 'इतिहास (हमारे अतीत - III)' },
      { en: 'Geography (Resources & Development)', hi: 'भूगोल (संसाधन एवं विकास)' },
      { en: 'Civics (Social & Political Life - III)', hi: 'नागरिक शास्त्र (सामाजिक एवं राजनीतिक जीवन - III)' },
    ],
    description: {
      en: 'British colonial expansion, 1857 revolution, Indian Constitution, secularism, and independent judiciary.',
      hi: 'ब्रिटिश उपनिवेशवाद, 1857 की क्रांति, भारतीय संविधान, धर्मनिरपेक्षता और स्वतंत्र न्यायपालिका।',
    },
    status: 'active',
    resourceCount: { notes: 12, tests: 10, mcqs: 180 },
  },
  {
    level: '9',
    title: { en: 'Class 9 - Social Science', hi: 'कक्षा 9 - सामाजिक विज्ञान' },
    badge: { en: 'Secondary Stage', hi: 'माध्यमिक चरण' },
    subjects: [
      { en: 'History (India and Contemporary World - I)', hi: 'इतिहास (भारत और समकालीन विश्व - I)' },
      { en: 'Geography (Contemporary India - I)', hi: 'भूगोल (समकालीन भारत - I)' },
      { en: 'Pol Science (Democratic Politics - I)', hi: 'लोकतांत्रिक राजनीति - I' },
      { en: 'Economics', hi: 'अर्थशास्त्र' },
    ],
    description: {
      en: 'French Revolution, Socialism in Europe, India physical features, drainage, constitutional design, and village economy.',
      hi: 'फ्रांसीसी क्रांति, नात्सीवाद, भारत का भौतिक स्वरूप, संविधान निर्माण, चुनावी राजनीति और पालमपुर की कहानी।',
    },
    status: 'active',
    resourceCount: { notes: 15, tests: 14, mcqs: 240 },
  },
  {
    level: '10',
    title: { en: 'Class 10 - Social Science (Board Prep)', hi: 'कक्षा 10 - सामाजिक विज्ञान (बोर्ड विशेष)' },
    badge: { en: 'HBSE / CBSE Board', hi: 'बोर्ड परीक्षा विशेष' },
    subjects: [
      { en: 'History (India & Contemporary World - II)', hi: 'इतिहास (भारत और समकालीन विश्व - II)' },
      { en: 'Geography (Contemporary India - II)', hi: 'भूगोल (समकालीन भारत - II)' },
      { en: 'Pol Science (Democratic Politics - II)', hi: 'लोकतांत्रिक राजनीति - II' },
      { en: 'Economics (Understanding Economic Dev)', hi: 'आर्थिक विकास की समझ' },
    ],
    description: {
      en: 'Complete board preparation: Nationalism in Europe & India, Power Sharing, Federalism, Resources, Agriculture, Money & Credit, and Map Skills.',
      hi: 'बोर्ड परीक्षा की संपूर्ण तैयारी: भारत में राष्ट्रवाद, सत्ता की साझेदारी, संघवाद, संसाधन, कृषि और मानचित्र कार्य।',
    },
    status: 'active',
    resourceCount: { notes: 22, tests: 20, mcqs: 350 },
  },
  {
    level: '11',
    title: { en: 'Class 11 - Political Science', hi: 'कक्षा 11 - राजनीति विज्ञान' },
    badge: { en: 'Senior Secondary', hi: 'उच्चतर माध्यमिक' },
    subjects: [
      { en: 'Indian Constitution at Work', hi: 'भारत का संविधान: सिद्धांत और व्यवहार' },
      { en: 'Political Theory', hi: 'राजनीतिक सिद्धांत' },
    ],
    description: {
      en: 'Philosophical foundation of the Indian Constitution, Fundamental Rights, Judiciary, Federalism, Freedom, Equality, and Justice.',
      hi: 'भारतीय संविधान के दार्शनिक आधार, मौलिक अधिकार, न्यायपालिका, संघवाद, स्वतंत्रता, समानता और सामाजिक न्याय।',
    },
    status: 'active',
    resourceCount: { notes: 10, tests: 8, mcqs: 160 },
  },
  {
    level: '12',
    title: { en: 'Class 12 - Political Science & Board Prep', hi: 'कक्षा 12 - राजनीति विज्ञान एवं बोर्ड' },
    badge: { en: 'Senior Secondary', hi: 'उच्चतर माध्यमिक' },
    subjects: [
      { en: 'Contemporary World Politics', hi: 'समकालीन विश्व राजनीति' },
      { en: 'Politics in India Since Independence', hi: 'स्वतंत्र भारत में राजनीति' },
    ],
    description: {
      en: 'Cold War era, Unipolar world, South Asia regional dynamics, Nation-building challenges, Era of one-party dominance, and Recent developments.',
      hi: 'शीतयुद्ध काल, दक्षिण एशिया, राष्ट्र निर्माण की चुनौतियां, एक दल के प्रभुत्व का दौर और भारतीय राजनीति के नवीनतम रुझान।',
    },
    status: 'coming-soon',
    resourceCount: { notes: 0, tests: 0, mcqs: 0 },
  },
];

export const STUDY_CHAPTERS: StudyChapter[] = [
  // Class 10 Civics
  {
    id: 'c10-civ-1',
    classLevel: '10',
    subject: 'Political Science',
    chapterNumber: 1,
    title: {
      en: 'Power Sharing (Democratic Politics - II)',
      hi: 'सत्ता की साझेदारी (लोकतांत्रिक राजनीति - II)',
    },
    summary: {
      en: 'Power sharing is the very spirit of democracy. Through the comparative case studies of Belgium and Sri Lanka, this chapter explains why power sharing is desirable both prudentially and morally.',
      hi: 'सत्ता की साझेदारी लोकतंत्र की मूल आत्मा है। बेल्जियम और श्रीलंका के तुलनात्मक अध्ययन के माध्यम से यह अध्याय समझाता है कि सत्ता का बंटवारा युक्तिपरक और नैतिक दोनों दृष्टियों से क्यों आवश्यक है।',
    },
    keyPoints: {
      en: [
        'Belgium accommodated diversity through a flexible community government and equal Dutch-French ministers.',
        'Sri Lanka adopted Majoritarianism in 1956, declaring Sinhala as the only official language and alienating Sri Lankan Tamils.',
        'Prudential Reason: Reduces the possibility of conflict between social groups and ensures political stability.',
        'Moral Reason: In a democracy, power must be shared with those affected by its exercise.',
        'Forms of Power Sharing: Horizontal (Legislature, Executive, Judiciary), Vertical (Federal/State/Local), Social Groups, and Political Parties/Pressure Groups.',
      ],
      hi: [
        'बेल्जियम ने डच और फ्रेंच भाषी मंत्रियों को समान प्रतिनिधित्व देकर सामाजिक विविधता का सफल समायोजन किया।',
        'श्रीलंका ने 1956 में सिंहली को एकमात्र राजभाषा बनाकर बहुसंख्यकवादी नीतियां लागू कीं, जिससे गृहयुद्ध की स्थिति बनी।',
        'युक्तिपरक (Prudential) तर्क: यह सामाजिक समूहों के मध्य टकराव को टालता है और राजनीतिक स्थिरता लाता है।',
        'नैतिक (Moral) तर्क: लोकतंत्र का अर्थ ही सत्ता में जनभागीदारी है।',
        'विभाजन के रूप: क्षैतिज वितरण (विधायिका, कार्यपालिका, न्यायपालिका), ऊर्ध्वाधर वितरण (केंद्र, राज्य, स्थानीय निकाय)।',
      ],
    },
    importantTerms: [
      {
        term: { en: 'Majoritarianism', hi: 'बहुसंख्यकवाद' },
        definition: {
          en: 'A belief that the majority community should be able to rule a country in whichever way it wants, by disregarding the wishes and needs of the minority.',
          hi: 'यह मान्यता कि बहुसंख्यक समुदाय अपने मनचाहे ढंग से शासन कर सकता है और वह अल्पसंख्यकों की आवश्यकताओं की उपेक्षा कर सकता है।',
        },
      },
      {
        term: { en: 'Check and Balance', hi: 'नियंत्रण और संतुलन' },
        definition: {
          en: 'A system in horizontal power sharing where each organ of government checks the others, resulting in a balance of power.',
          hi: 'शासन के विभिन्न अंगों (विधायिका, कार्यपालिका, न्यायपालिका) द्वारा एक-दूसरे पर अंकुश रखने की प्रणाली ताकि संतुलन बना रहे।',
        },
      },
      {
        term: { en: 'Community Government', hi: 'सामुदायिक सरकार' },
        definition: {
          en: 'A government elected by people belonging to one language community (Dutch, French, and German in Belgium) with cultural and educational powers.',
          hi: 'बेल्जियम में एक भाषा समुदाय (डच, फ्रेंच, जर्मन) द्वारा चुनी गई सरकार जिसे संस्कृति, शिक्षा और भाषा संबंधी निर्णय लेने का अधिकार है।',
        },
      },
    ],
    hasResources: true,
  },

  // Class 10 Civics Chapter 2
  {
    id: 'c10-civ-2',
    classLevel: '10',
    subject: 'Political Science',
    chapterNumber: 2,
    title: {
      en: 'Federalism (Democratic Politics - II)',
      hi: 'संघवाद (लोकतांत्रिक राजनीति - II)',
    },
    summary: {
      en: 'Federalism is a system of government in which power is divided between a central authority and constituent units. Examines Indian federal features, three lists, and decentralization through 73rd and 74th Amendments.',
      hi: 'संघवाद शासन की वह व्यवस्था है जिसमें शक्ति का विभाजन केंद्रीय सत्ता और उसकी घटक इकाइयों के बीच होता है। यह अध्याय भारत की संघीय व्यवस्था, तीनों सूचियों और 73वें-74वें संविधान संशोधनों द्वारा विकेंद्रीकरण को स्पष्ट करता है।',
    },
    keyPoints: {
      en: [
        'India is a "Holding Together" federation with a strong center, referred to in Article 1 as a "Union of States".',
        'Three Lists of Legislative Powers: Union List (100 items), State List (61 items), and Concurrent List (52 items).',
        'Residuary subjects like computer software belong exclusively to the Union Government.',
        'Linguistic States and Language Policy: No single national language; Hindi and 21 other scheduled languages in the 8th Schedule.',
        '1992 Decentralization Amendment: Mandatory regular panchayat elections, reservation for SC/ST/OBC and at least 1/3 seats for women, State Election Commission creation.',
      ],
      hi: [
        'भारत एक "सबको साथ लेकर चलने वाला" (Holding Together) संघ है, जिसे अनुच्छेद 1 में "राज्यों का संघ" कहा गया है।',
        'तीन सूचियां: संघ सूची (रक्षा, विदेश, बैंकिंग), राज्य सूची (पुलिस, व्यापार, कृषि), समवर्ती सूची (शिक्षा, वन, विवाह)।',
        'अवशिष्ट विषय (Residuary Subjects) जैसे कंप्यूटर सॉफ्टवेयर केवल केंद्र सरकार के अधिकार क्षेत्र में हैं।',
        'भाषा नीति: भारत की कोई एक राष्ट्रभाषा नहीं है; 8वीं अनुसूची में हिंदी सहित 22 अनुसूचित भाषाएं हैं।',
        '1992 का ऐतिहासिक विकेंद्रीकरण: पंचायतों के नियमित चुनाव, महिलाओं को कम से कम 33% आरक्षण, राज्य चुनाव आयोग का गठन।',
      ],
    },
    importantTerms: [
      {
        term: { en: 'Union List', hi: 'संघ सूची' },
        definition: {
          en: 'Includes subjects of national importance (Defense, Foreign Affairs, Banking, Currency). Only Union Govt can make laws.',
          hi: 'राष्ट्रीय महत्व के विषय जिन पर कानून बनाने का अधिकार केवल केंद्र सरकार को होता है।',
        },
      },
      {
        term: { en: 'Decentralization', hi: 'विकेंद्रीकरण' },
        definition: {
          en: 'When power is taken away from Central and State governments and given to local government (Panchayati Raj & Municipalities).',
          hi: 'जब केंद्र और राज्य सरकार से शक्तियां लेकर स्थानीय स्वशासन निकायों (ग्राम पंचायत एवं नगर पालिका) को दी जाती हैं।',
        },
      },
    ],
    hasResources: true,
  },

  // Class 10 History
  {
    id: 'c10-his-2',
    classLevel: '10',
    subject: 'History',
    chapterNumber: 2,
    title: {
      en: 'Nationalism in India (India and Contemporary World - II)',
      hi: 'भारत में राष्ट्रवाद (भारत और समकालीन विश्व - II)',
    },
    summary: {
      en: 'Explores how Mahatma Gandhi transformed the freedom struggle with Satyagraha, the Non-Cooperation Movement (1920-22), the Civil Disobedience Movement (1930), the Salt March, and the sense of collective belonging.',
      hi: 'यह अध्याय महात्मा गांधी द्वारा सत्याग्रह के विचार, असहयोग आंदोलन (1920-22), नमक सत्याग्रह, सविनय अवज्ञा आंदोलन (1930) तथा सामूहिक अपनेपन के भाव से राष्ट्र निर्माण की गाथा का विश्लेषण करता है।',
    },
    keyPoints: {
      en: [
        'Idea of Satyagraha: Truth and non-violence as pure soul-force against oppression without physical malice.',
        'Early Satyagrahas: Champaran (1917, Indigo farmers), Kheda (1917, Revenue remission), Ahmedabad (1918, Cotton mill workers).',
        'Rowlatt Act (1919) and Jallianwala Bagh Massacre on 13 April 1919 ordered by General Dyer.',
        'Non-Cooperation Movement launched in 1920, uniting with Khilafat; called off after Chauri Chaura incident in February 1922.',
        'Salt March (Dandi March): 12 March to 6 April 1930, 240 miles from Sabarmati to Dandi with 78 volunteers, breaking the salt monopoly.',
      ],
      hi: [
        'सत्याग्रह का विचार: सत्य की शक्ति पर आग्रह और अहिंसा के मार्ग पर चलकर उत्पीड़क की चेतना को जगाना।',
        'गांधीजी के प्रारंभिक सत्याग्रह: चंपारण (1917 नील किसान), खेड़ा (1917 लगान माफी), अहमदाबाद (1918 सूती मिल मजदूर)।',
        'रौलट एक्ट (1919) तथा 13 अप्रैल 1919 को बैसाखी के दिन जलियांवाला बाग हत्याकांड (जनरल डायर द्वारा गोलीबारी)।',
        'असहयोग आंदोलन (1920-22) और खिलाफत का समन्वय; फरवरी 1922 में चौरी-चौरा की हिंसक घटना के बाद आंदोलन स्थगित।',
        'नमक यात्रा (दांडी मार्च): 12 मार्च से 6 अप्रैल 1930 तक, साबरमती से दांडी (240 मील), 78 स्वयंसेवकों संग नमक कानून तोड़ा।',
      ],
    },
    importantTerms: [
      {
        term: { en: 'Satyagraha', hi: 'सत्याग्रह' },
        definition: {
          en: 'A passive non-violent resistance philosophy emphasizing the power of truth and the need to search for truth.',
          hi: 'सत्य और अहिंसा के मार्ग पर आधारित अन्याय के विरुद्ध नैतिक एवं शांतिपूर्ण प्रतिरोध।',
        },
      },
      {
        term: { en: 'Poona Pact (1932)', hi: 'पूना पैक्ट (1932)' },
        definition: {
          en: 'Agreement between Dr. B.R. Ambedkar and Mahatma Gandhi reserving seats for Depressed Classes within general electorates.',
          hi: 'डॉ. बी.आर. आंबेडकर और महात्मा गांधी के बीच समझौता, जिसके तहत दलित वर्ग को सामान्य निर्वाचन क्षेत्रों में आरक्षित सीटें दी गईं।',
        },
      },
    ],
    hasResources: true,
  },

  // Class 10 Geography
  {
    id: 'c10-geo-1',
    classLevel: '10',
    subject: 'Geography',
    chapterNumber: 1,
    title: {
      en: 'Resources and Development (Contemporary India - II)',
      hi: 'संसाधन एवं विकास (समकालीन भारत - II)',
    },
    summary: {
      en: 'Everything available in our environment which can be used to satisfy our needs, provided it is technologically accessible, economically feasible and culturally acceptable. Details soil classification in India.',
      hi: 'हमारे पर्यावरण में उपलब्ध प्रत्येक वस्तु जो हमारी आवश्यकताओं को पूरा करने में प्रयुक्त हो सकती है और जिसको बनाने के लिए प्रौद्योगिकी उपलब्ध है, संसाधन कहलाती है। इसमें मृदा के प्रकार और भू-उपयोग का विस्तृत अध्ययन है।',
    },
    keyPoints: {
      en: [
        'Classification of Resources: Origin (Biotic/Abiotic), Exhaustibility (Renewable/Non-renewable), Ownership (Individual, Community, National, International), Status of Development (Potential, Developed, Stock, Reserve).',
        'Rio de Janeiro Earth Summit (1992) and Agenda 21 for achieving Global Sustainable Development.',
        'Major Soils of India: Alluvial Soil (most widespread, fertile, northern plains), Black Soil (Regur, cotton growth, Deccan trap), Red and Yellow Soil, Laterite Soil, Arid Soil, Forest Soil.',
        'Land Degradation Causes: Deforestation, overgrazing (Gujarat, Rajasthan), over-irrigation causing salinity (Punjab, Haryana), and mining dust.',
      ],
      hi: [
        'संसाधनों का वर्गीकरण: उत्पत्ति (जैव/अजैव), समाप्यता (नवीकरण/अनवीकरण), स्वामित्व (व्यक्तिगत, सामुदायिक, राष्ट्रीय, अंतर्राष्ट्रीय), विकास का स्तर।',
        'रियो डी जेनेरो पृथ्वी सम्मेलन (1992) एवं सतत पोषणीय विकास हेतु एजेंडा 21 की स्वीकृति।',
        'भारत की प्रमुख मृदाएं: जलोढ़ मृदा (सर्वाधिक उपजाऊ, उत्तरी मैदान), काली मृदा (रेगुर मृदा, कपास हेतु सर्वोत्तम, दक्कन का पठार), लाल-पीली मृदा, लैटेराइट मृदा, मरुस्थलीय मृदा, वन मृदा।',
        'हरियाणा एवं पंजाब में भूमि निम्नीकरण का मुख्य कारण अत्यधिक सिंचाई से उत्पन्न जलजमाव एवं लवणीयता है।',
      ],
    },
    importantTerms: [
      {
        term: { en: 'Sustainable Development', hi: 'सतत पोषणीय विकास' },
        definition: {
          en: 'Development that meets the needs of the present without compromising the ability of future generations to meet their own needs.',
          hi: 'पर्यावरण को नुकसान पहुंचाए बिना वर्तमान की आवश्यकताओं की पूर्ति तथा भावी पीढ़ी के हितों का संरक्षण।',
        },
      },
      {
        term: { en: 'Regur Soil', hi: 'रेगुर (काली) मृदा' },
        definition: {
          en: 'Black cotton soil rich in calcium carbonate, magnesium, potash and lime, formed by volcanic lava flows.',
          hi: 'ज्वालामुखीय लावा से निर्मित काली मृदा जो नमी धारण करने की उच्च क्षमता रखती है तथा कपास उत्पादन के लिए आदर्श है।',
        },
      },
    ],
    hasResources: true,
  },

  // Class 9 Civics
  {
    id: 'c9-civ-2',
    classLevel: '9',
    subject: 'Political Science',
    chapterNumber: 2,
    title: {
      en: 'Constitutional Design (Democratic Politics - I)',
      hi: 'संविधान निर्माण (लोकतांत्रिक राजनीति - I)',
    },
    summary: {
      en: 'Examines why a democratic country needs a constitution, drawing parallels with the anti-apartheid movement in South Africa and the drafting of the Indian Constitution by the Constituent Assembly.',
      hi: 'यह अध्याय व्याख्या करता है कि किसी लोकतांत्रिक देश को संविधान की आवश्यकता क्यों होती है। दक्षिण अफ्रीका में रंगभेद विरोधी संघर्ष और भारत की संविधान सभा द्वारा संविधान निर्माण का तुलनात्मक विश्लेषण।',
    },
    keyPoints: {
      en: [
        'Apartheid in South Africa: Racial segregation system ended in 1994, leading to a rainbow nation constitution.',
        'Indian Constituent Assembly: 299 members drafted the Constitution under Dr. Rajendra Prasad (President) and Dr. B.R. Ambedkar (Drafting Committee Chairman).',
        'Adopted on 26 November 1949 and came into effect on 26 January 1950 (Republic Day).',
        'Preamble: The philosophy and guiding soul of the Constitution outlining Justice, Liberty, Equality, and Fraternity.',
      ],
      hi: [
        'दक्षिण अफ्रीका में रंगभेद नीति का 1994 में अंत हुआ और नेल्सन मंडेला के नेतृत्व में समावेशी संविधान बना।',
        'भारतीय संविधान सभा: 299 सदस्यों ने डॉ. राजेंद्र प्रसाद (अध्यक्ष) और डॉ. बी.आर. आंबेडकर (प्रारूप समिति अध्यक्ष) के नेतृत्व में कार्य किया।',
        'संविधान 26 नवंबर 1949 को अंगीकृत किया गया और 26 जनवरी 1950 को लागू हुआ।',
        'प्रस्तावना: संविधान की आत्मा और मार्गदर्शक सिद्धांत (न्याय, स्वतंत्रता, समानता, बंधुता)।',
      ],
    },
    importantTerms: [
      {
        term: { en: 'Constituent Assembly', hi: 'संविधान सभा' },
        definition: {
          en: 'An assembly of elected representatives that drafted the Constitution for India between 1946 and 1949.',
          hi: 'जनप्रतिनिधियों की वह निर्वाचित सभा जिसने स्वतंत्र भारत के संविधान का निर्माण किया।',
        },
      },
    ],
    hasResources: true,
  },

  // Class 8 Civics
  {
    id: 'c8-civ-1',
    classLevel: '8',
    subject: 'Political Science',
    chapterNumber: 1,
    title: {
      en: 'The Indian Constitution (Social & Political Life - III)',
      hi: 'भारतीय संविधान (सामाजिक एवं राजनीतिक जीवन - III)',
    },
    summary: {
      en: 'Introduces why a country needs a constitution, preventing the tyranny of the majority, separation of powers, and the six Fundamental Rights guaranteed to Indian citizens.',
      hi: 'संविधान की आवश्यकता, बहुसंख्यक के वर्चस्व से अल्पसंख्यकों की सुरक्षा, शक्तियों का बंटवारा तथा नागरिकों को प्राप्त 6 मौलिक अधिकारों का परिचयात्मक अध्ययन।',
    },
    keyPoints: {
      en: [
        'Key features: Federalism, Parliamentary Form of Government, Separation of Powers, Fundamental Rights, Secularism.',
        'Six Fundamental Rights: Right to Equality, Right to Freedom, Right against Exploitation, Right to Freedom of Religion, Cultural & Educational Rights, Right to Constitutional Remedies (Article 32).',
      ],
      hi: [
        'मुख्य लक्षण: संघवाद, संसदीय शासन प्रणाली, शक्तियों का बंटवारा, मौलिक अधिकार, धर्मनिरपेक्षता।',
        'छह मौलिक अधिकार: समानता का अधिकार, स्वतंत्रता का अधिकार, शोषण के विरुद्ध अधिकार, धार्मिक स्वतंत्रता का अधिकार, सांस्कृतिक एवं शैक्षिक अधिकार, संवैधानिक उपचारों का अधिकार (अनुच्छेद 32)।',
      ],
    },
    importantTerms: [
      {
        term: { en: 'Secularism', hi: 'धर्मनिरपेक्षता' },
        definition: {
          en: 'A secular state does not officially promote any one religion as the state religion.',
          hi: 'राज्य किसी भी धर्म को राजकीय धर्म के रूप में बढ़ावा नहीं देता और सभी धर्मों का समान आदर करता है।',
        },
      },
    ],
    hasResources: true,
  },

  // Class 6 History
  {
    id: 'c6-his-1',
    classLevel: '6',
    subject: 'History',
    chapterNumber: 1,
    title: {
      en: 'What, Where, How and When? (Our Pasts - I)',
      hi: 'क्या, कब, कहाँ और कैसे? (हमारे अतीत - I)',
    },
    summary: {
      en: 'Understanding how historians reconstruct early human life along river banks (Indus, Narmada, Ganga) using manuscripts, inscriptions, coins, and archaeological excavations.',
      hi: 'इतिहासकार पांडुलिपियों, अभिलेखों, सिक्कों और पुरातात्विक उत्खनन के माध्यम से नर्मदा, सिंधु और गंगा नदियों के किनारे बसे प्रारंभिक मानव समाज का अध्ययन कैसे करते हैं।',
    },
    keyPoints: {
      en: [
        'Manuscripts: Hand-written records usually on palm leaf or specially prepared birch bark (Bhurja).',
        'Inscriptions: Writings on relatively hard surfaces such as stone or metal (e.g. Ashokan edicts).',
        'Origin of the name India: Derived from the river Indus, called "Sindhu" in Sanskrit and "Hindos" or "Indos" by Iranians and Greeks.',
      ],
      hi: [
        'पांडुलिपि: ताड़पत्रों अथवा भोजपत्र पर हाथ से लिखी गई प्राचीन पुस्तकें।',
        'अभिलेख: पत्थर अथवा धातु जैसी कठोर सतह पर उत्कीर्ण किए गए ऐतिहासिक लेख (जैसे सम्राट अशोक के शिलालेख)।',
        'इंडिया शब्द: सिंधु नदी (संस्कृत में "सिंधु") से निकला है, जिसे ईरानी और यूनानी लोगों ने "इंडोस" या "हिन्दोस" कहा।',
      ],
    },
    importantTerms: [
      {
        term: { en: 'Archaeology', hi: 'पुरातत्व' },
        definition: {
          en: 'The scientific study of material remains of past human life and activities.',
          hi: 'अतीत के भौतिक अवशेषों (ईमारतों, बर्तनों, औजारों) का वैज्ञानिक अध्ययन।',
        },
      },
    ],
    hasResources: true,
  },
];

export const ONLINE_TESTS: OnlineTest[] = [
  {
    id: 'test-c10-board-full',
    title: {
      en: 'Class 10 Social Science: Board Pattern Mock Test #1',
      hi: 'कक्षा 10 सामाजिक विज्ञान: बोर्ड पैटर्न संपूर्ण मॉक टेस्ट #1',
    },
    classLevel: '10',
    subject: 'Social Science',
    chapter: 'All Board Chapters (History, Pol Sci, Geo, Eco)',
    durationMinutes: 15,
    totalMarks: 20,
    googleFormUrl: 'https://docs.google.com/forms/d/e/1FAIpQLScKRISHAN-SIR-GGHS-DHANGER-TEST1/viewform',
    instructions: {
      en: [
        'This test consists of 5 high-yield multiple-choice questions aligned with the latest HBSE & CBSE board exam blueprint.',
        'Each correct answer carries 4 marks (Total 20 marks).',
        'There is no negative marking.',
        'Read both English and Hindi versions carefully before selecting an answer.',
        'Detailed pedagogical explanation is provided after completion.',
      ],
      hi: [
        'यह टेस्ट नवीनतम हरियाणा बोर्ड (HBSE) एवं सीबीएसई परीक्षा पैटर्न पर आधारित 5 महत्वपूर्ण प्रश्नों से युक्त है।',
        'प्रत्येक सही उत्तर के लिए 4 अंक निर्धारित हैं (कुल 20 अंक)।',
        'कोई नकारात्मक अंकन (Negative Marking) नहीं है।',
        'उत्तर चुनने से पहले प्रश्न को ध्यानपूर्वक पढ़ें।',
        'टेस्ट सबमिट करते ही आपको कृष्ण सर द्वारा तैयार विस्तृत समाधान प्राप्त होगा।',
      ],
    },
    questions: [
      {
        id: 'q1',
        chapter: 'Power Sharing',
        question: {
          en: 'Which of the following is an example of horizontal power sharing in the Indian democratic system?',
          hi: 'भारतीय लोकतांत्रिक व्यवस्था में सत्ता के क्षैतिज वितरण (Horizontal Power Sharing) का उदाहरण निम्नलिखित में से कौन सा है?',
        },
        options: {
          en: [
            'Division of power between Central Government, State Government and Panchayats',
            'Division of power between Legislature, Executive and Judiciary at the same level',
            'Reservation of seats for Women and SC/ST communities in Parliament',
            'Power sharing between different religious and linguistic communities',
          ],
          hi: [
            'केंद्र सरकार, राज्य सरकार और ग्राम पंचायतों के मध्य शक्ति का बंटवारा',
            'एक ही स्तर पर विधायिका, कार्यपालिका और न्यायपालिका के बीच शक्ति का बंटवारा',
            'संसद में महिलाओं और अनुसूचित जाति/जनजाति के लिए सीटों का आरक्षण',
            'विभिन्न धार्मिक और भाषाई समुदायों के मध्य सत्ता का विभाजन',
          ],
        },
        correctAnswer: 1,
        explanation: {
          en: 'Horizontal distribution places different organs of government (Legislature, Executive, and Judiciary) at the same level so that none can exercise unlimited power, establishing a system of checks and balances.',
          hi: 'सत्ता का क्षैतिज वितरण शासन के विभिन्न अंगों (विधायिका, कार्यपालिका और न्यायपालिका) को एक ही स्तर पर रखकर शक्तियों का संतुलन और नियंत्रण (Checks and Balances) सुनिश्चित करता है।',
        },
      },
      {
        id: 'q2',
        chapter: 'Federalism',
        question: {
          en: 'Under which list of the Indian Constitution do subjects like Police, Trade, Commerce, Agriculture, and Irrigation fall?',
          hi: 'भारतीय संविधान की किस सूची के अंतर्गत पुलिस, व्यापार, वाणिज्य, कृषि और सिंचाई जैसे विषय आते हैं?',
        },
        options: {
          en: [
            'Union List',
            'State List',
            'Concurrent List',
            'Residuary Subjects',
          ],
          hi: [
            'संघ सूची (Union List)',
            'राज्य सूची (State List)',
            'समवर्ती सूची (Concurrent List)',
            'अवशिष्ट विषय (Residuary Subjects)',
          ],
        },
        correctAnswer: 1,
        explanation: {
          en: 'State List contains subjects of state and local importance such as Police, Trade, Commerce, Agriculture, and Irrigation. Only State Governments have the power to enact laws on these subjects.',
          hi: 'राज्य सूची में स्थानीय महत्व के विषय जैसे पुलिस, व्यापार, वाणिज्य, कृषि और सिंचाई शामिल हैं, जिन पर केवल राज्य विधानमंडल को कानून बनाने का अधिकार है।',
        },
      },
      {
        id: 'q3',
        chapter: 'Nationalism in India',
        question: {
          en: 'Why did Mahatma Gandhi organize the famous historic Satyagraha at Champaran in Bihar in 1917?',
          hi: '1917 में महात्मा गांधी ने बिहार के चंपारण में प्रसिद्ध ऐतिहासिक सत्याग्रह किस कारण से आयोजित किया था?',
        },
        options: {
          en: [
            'To support the cotton mill workers for higher wages',
            'To demand revenue remission for peasants affected by crop failure',
            'To inspire the peasants to struggle against the oppressive indigo plantation system',
            'To protest against the Rowlatt Act passed by the Imperial Legislative Council',
          ],
          hi: [
            'सूती कपड़ा मिल मजदूरों के वेतन वृद्धि की मांग का समर्थन करने हेतु',
            'फसल खराब होने पर किसानों के लिए लगान माफी की मांग करने हेतु',
            'दमनकारी नील बागान व्यवस्था (तपिया प्रणाली) के विरुद्ध किसानों को संघर्ष हेतु प्रेरित करने के लिए',
            'इम्पीरियल लेजिस्लेटिव काउंसिल द्वारा पारित रौलट एक्ट का विरोध करने के लिए',
          ],
        },
        correctAnswer: 2,
        explanation: {
          en: 'Champaran Satyagraha (1917) was Gandhiji\'s first major satyagraha in India, launched to protect poor peasants from British planters forcing them to cultivate indigo under the exploitative Tinkathia system.',
          hi: 'चंपारण सत्याग्रह (1917) भारत में गांधीजी का पहला सफल सत्याग्रह था, जो नील बागान मालिकों की दमनकारी तिनकठिया प्रथा के विरुद्ध किसानों के शोषण को समाप्त करने के लिए किया गया था।',
        },
      },
      {
        id: 'q4',
        chapter: 'Resources and Development',
        question: {
          en: 'Which soil is widely known as "Regur Soil" and is considered ideal for growing cotton crops?',
          hi: 'किस मृदा को "रेगुर मृदा" के नाम से भी जाना जाता है और वह कपास की खेती के लिए सर्वाधिक उपयुक्त मानी जाती है?',
        },
        options: {
          en: [
            'Alluvial Soil',
            'Black Soil',
            'Laterite Soil',
            'Red and Yellow Soil',
          ],
          hi: [
            'जलोढ़ मृदा',
            'काली मृदा (Black Soil)',
            'लैटेराइट मृदा',
            'लाल और पीली मृदा',
          ],
        },
        correctAnswer: 1,
        explanation: {
          en: 'Black soil is also known as Regur soil or Black Cotton soil. It is rich in soil nutrients like calcium carbonate, magnesium, potash and lime, and is found across the Deccan trap region.',
          hi: 'काली मृदा को रेगुर मृदा या काली कपास मृदा भी कहा जाता है। यह बारीक कणों वाली होती है और इसमें नमी धारण करने की अपार क्षमता होती है, जो कपास की उत्तम फसल के लिए आदर्श है।',
        },
      },
      {
        id: 'q5',
        chapter: 'Indian Constitution & Decentralization',
        question: {
          en: 'Which major constitutional amendment made local self-government (Panchayati Raj) constitutionally mandatory and reserved at least one-third of all seats for women?',
          hi: 'किस महत्वपूर्ण संविधान संशोधन ने स्थानीय स्वशासन (पंचायती राज) को संवैधानिक मान्यता दी और महिलाओं के लिए कम से कम एक-तिहाई सीटें आरक्षित कीं?',
        },
        options: {
          en: [
            '42nd Constitutional Amendment Act, 1976',
            '44th Constitutional Amendment Act, 1978',
            '73rd Constitutional Amendment Act, 1992',
            '86th Constitutional Amendment Act, 2002',
          ],
          hi: [
            '42वां संविधान संशोधन अधिनियम, 1976',
            '44वां संविधान संशोधन अधिनियम, 1978',
            '73वां संविधान संशोधन अधिनियम, 1992',
            '86वां संविधान संशोधन अधिनियम, 2002',
          ],
        },
        correctAnswer: 2,
        explanation: {
          en: 'The 73rd Constitutional Amendment Act of 1992 institutionalized the 3-tier Panchayati Raj system, mandated 5-yearly elections, set up State Finance Commissions, and reserved at least 33% seats for women.',
          hi: '73वें संविधान संशोधन (1992) द्वारा संविधान में भाग 9 और 11वीं अनुसूची जोड़ी गई, जिसने पंचायती राज को अनिवार्य बनाया और महिलाओं को 33% आरक्षण प्रदान कर महिला सशक्तिकरण की नींव रखी।',
        },
      },
    ],
  },
  {
    id: 'test-polity-constitution',
    title: {
      en: 'Indian Constitution & Polity: Fundamental Rights & Preamble Quiz',
      hi: 'भारतीय संविधान एवं राजव्यवस्था: मौलिक अधिकार व प्रस्तावना क्विज',
    },
    classLevel: '9',
    subject: 'Indian Constitution',
    chapter: 'Constitutional Design & Fundamental Rights',
    durationMinutes: 10,
    totalMarks: 16,
    googleFormUrl: 'https://docs.google.com/forms/d/e/1FAIpQLSeKRISHAN-SIR-CONSTITUTION-QUIZ/viewform',
    instructions: {
      en: [
        'Essential for Class 8, 9, 10, 11 students as well as competitive exam aspirants (CTET, HTET, HSSC, NET).',
        '4 questions carrying 4 marks each.',
      ],
      hi: [
        'कक्षा 8, 9, 10, 11 के विद्यार्थियों के साथ-साथ प्रतियोगी परीक्षाओं (CTET, HTET, HSSC, NET) के अभ्यर्थियों हेतु अति महत्वपूर्ण।',
        '4 प्रश्न, प्रत्येक 4 अंक का।',
      ],
    },
    questions: [
      {
        id: 'cq1',
        chapter: 'Preamble',
        question: {
          en: 'By which Constitutional Amendment were the words "Socialist", "Secular", and "Integrity" added to the Preamble of the Indian Constitution?',
          hi: 'किस संविधान संशोधन द्वारा भारतीय संविधान की प्रस्तावना में "समाजवादी", "धर्मनिरपेक्ष" (पंथनिरपेक्ष) और "अखंडता" शब्द जोड़े गए थे?',
        },
        options: {
          en: [
            '24th Amendment, 1971',
            '42nd Amendment, 1976',
            '44th Amendment, 1978',
            '52nd Amendment, 1985',
          ],
          hi: [
            '24वां संशोधन, 1971',
            '42वां संशोधन, 1976',
            '44वां संशोधन, 1978',
            '52वां संशोधन, 1985',
          ],
        },
        correctAnswer: 1,
        explanation: {
          en: 'The 42nd Amendment Act of 1976 amended the Preamble to insert the words "Socialist", "Secular", and "Integrity". It is often called the "Mini-Constitution".',
          hi: '42वें संविधान संशोधन अधिनियम (1976) द्वारा प्रस्तावना में "समाजवादी", "पंथनिरपेक्ष" और "अखंडता" शब्द सम्मिलित किए गए। इसे "लघु संविधान" भी कहा जाता है।',
        },
      },
      {
        id: 'cq2',
        chapter: 'Fundamental Rights',
        question: {
          en: 'Which Article was described by Dr. B.R. Ambedkar as the "Heart and Soul of the Constitution"?',
          hi: 'डॉ. बी.आर. आंबेडकर ने किस अनुच्छेद को "संविधान का हृदय और आत्मा" कहा था?',
        },
        options: {
          en: [
            'Article 14 (Right to Equality)',
            'Article 19 (Right to Freedom)',
            'Article 21 (Right to Life and Personal Liberty)',
            'Article 32 (Right to Constitutional Remedies)',
          ],
          hi: [
            'अनुच्छेद 14 (समानता का अधिकार)',
            'अनुच्छेद 19 (स्वतंत्रता का अधिकार)',
            'अनुच्छेद 21 (प्राण एवं दैहिक स्वतंत्रता)',
            'अनुच्छेद 32 (संवैधानिक उपचारों का अधिकार)',
          ],
        },
        correctAnswer: 3,
        explanation: {
          en: 'Article 32 empowers citizens to directly approach the Supreme Court for enforcement of Fundamental Rights through writs (Habeas Corpus, Mandamus, Prohibition, Quo-Warranto, and Certiorari).',
          hi: 'अनुच्छेद 32 नागरिकों को मौलिक अधिकारों के संरक्षण हेतु सीधे सर्वोच्च न्यायालय जाने का अधिकार देता है, जहाँ कोर्ट 5 प्रकार की रिट जारी कर सकता है।',
        },
      },
      {
        id: 'cq3',
        chapter: 'Constituent Assembly',
        question: {
          en: 'Who served as the Chairman of the Drafting Committee of the Constituent Assembly?',
          hi: 'संविधान सभा की प्रारूप समिति (Drafting Committee) के अध्यक्ष कौन थे?',
        },
        options: {
          en: [
            'Dr. Rajendra Prasad',
            'Dr. B.R. Ambedkar',
            'Pandit Jawaharlal Nehru',
            'Sardar Vallabhbhai Patel',
          ],
          hi: [
            'डॉ. राजेंद्र प्रसाद',
            'डॉ. बी.आर. आंबेडकर',
            'पंडित जवाहरलाल नेहरू',
            'सरदार वल्लभभाई पटेल',
          ],
        },
        correctAnswer: 1,
        explanation: {
          en: 'Dr. B.R. Ambedkar was the Chairman of the 7-member Drafting Committee appointed on 29 August 1947. Dr. Rajendra Prasad was the President of the Constituent Assembly.',
          hi: '29 अगस्त 1947 को गठित 7 सदस्यीय प्रारूप समिति के अध्यक्ष बाबासाहेब डॉ. भीमराव आंबेडकर थे, जिन्होंने आधुनिक भारत का संविधान गढ़ा।',
        },
      },
      {
        id: 'cq4',
        chapter: 'Fundamental Rights',
        question: {
          en: 'Under Article 21A, free and compulsory education is guaranteed as a Fundamental Right for children of which age group?',
          hi: 'अनुच्छेद 21A के अंतर्गत किस आयु वर्ग के बच्चों के लिए निःशुल्क और अनिवार्य शिक्षा मौलिक अधिकार बनाई गई है?',
        },
        options: {
          en: [
            '3 to 6 years',
            '6 to 14 years',
            '6 to 18 years',
            'Up to 12 years',
          ],
          hi: [
            '3 से 6 वर्ष',
            '6 से 14 वर्ष',
            '6 से 18 वर्ष',
            '12 वर्ष तक',
          ],
        },
        correctAnswer: 1,
        explanation: {
          en: 'The 86th Constitutional Amendment Act, 2002 inserted Article 21A making free and compulsory education for children aged 6 to 14 years a Fundamental Right, implemented through the RTE Act 2009.',
          hi: '86वें संविधान संशोधन (2002) द्वारा अनुच्छेद 21A जोड़ा गया, जिसके तहत 6 से 14 वर्ष के बच्चों को निःशुल्क एवं अनिवार्य प्राथमिक शिक्षा का अधिकार मिला।',
        },
      },
    ],
  },
  // Migrated question banks from the previous portal.
  UPLOADED_CLASS9_ONLINE_TEST,
  NMMS_CLASS8_HISTORY_CH1_TEST,
];

export const STUDENT_RESULTS: StudentResult[] = [
  {
    rollNo: 'GGHS-1001',
    studentName: 'Pooja Rani',
    fatherName: 'Sh. Suresh Kumar',
    classLevel: '10',
    schoolName: 'Government Girls High School (GGHS), Dhanger',
    examName: 'Mid-Term Board Preparatory Exam 2026',
    examDate: '2026-10-15',
    subjects: [
      { name: 'History (भारत और समकालीन विश्व)', marksObtained: 24, maxMarks: 25 },
      { name: 'Political Science (लोकतांत्रिक राजनीति)', marksObtained: 25, maxMarks: 25 },
      { name: 'Geography (समकालीन भारत)', marksObtained: 23, maxMarks: 25 },
      { name: 'Economics (आर्थिक विकास की समझ)', marksObtained: 24, maxMarks: 25 },
    ],
    totalMarks: 96,
    maxMarks: 100,
    percentage: 96.0,
    grade: 'A+ (Merit)',
    rank: 1,
    remarks: {
      en: 'Outstanding conceptual clarity in Power Sharing & Map identification. Exemplary handwriting and analytical depth.',
      hi: 'सत्ता की साझेदारी और मानचित्र कार्य में असाधारण वैचारिक स्पष्टता। उत्कृष्ट लेखन शैली और विश्लेषणात्मक समझ।',
    },
  },
  {
    rollNo: 'GGHS-1002',
    studentName: 'Sunita Devi',
    fatherName: 'Sh. Ramesh Singh',
    classLevel: '10',
    schoolName: 'Government Girls High School (GGHS), Dhanger',
    examName: 'Mid-Term Board Preparatory Exam 2026',
    examDate: '2026-10-15',
    subjects: [
      { name: 'History (भारत और समकालीन विश्व)', marksObtained: 22, maxMarks: 25 },
      { name: 'Political Science (लोकतांत्रिक राजनीति)', marksObtained: 24, maxMarks: 25 },
      { name: 'Geography (समकालीन भारत)', marksObtained: 22, maxMarks: 25 },
      { name: 'Economics (आर्थिक विकास की समझ)', marksObtained: 23, maxMarks: 25 },
    ],
    totalMarks: 91,
    maxMarks: 100,
    percentage: 91.0,
    grade: 'A+ (Distinction)',
    rank: 2,
    remarks: {
      en: 'Excellent grasp of historical timeline and Gandhian satyagrahas. Keep practicing 5-mark long answers.',
      hi: 'ऐतिहासिक तिथियों और गांधीवादी सत्याग्रह पर उत्कृष्ट पकड़। 5 अंक वाले निबंधात्मक प्रश्नों का नियमित अभ्यास जारी रखें।',
    },
  },
  {
    rollNo: 'GGHS-1003',
    studentName: 'Anjali Sharma',
    fatherName: 'Sh. Vinod Sharma',
    classLevel: '10',
    schoolName: 'Government Girls High School (GGHS), Dhanger',
    examName: 'Mid-Term Board Preparatory Exam 2026',
    examDate: '2026-10-15',
    subjects: [
      { name: 'History (भारत और समकालीन विश्व)', marksObtained: 21, maxMarks: 25 },
      { name: 'Political Science (लोकतांत्रिक राजनीति)', marksObtained: 23, maxMarks: 25 },
      { name: 'Geography (समकालीन भारत)', marksObtained: 20, maxMarks: 25 },
      { name: 'Economics (आर्थिक विकास की समझ)', marksObtained: 22, maxMarks: 25 },
    ],
    totalMarks: 86,
    maxMarks: 100,
    percentage: 86.0,
    grade: 'A (First Division)',
    rank: 3,
    remarks: {
      en: 'Very good performance. Revise Geography soil classification and mineral distribution for 100% target.',
      hi: 'अति उत्तम प्रदर्शन। भूगोल में मृदा वर्गीकरण और खनिज वितरण की पुनरावृत्ति करें ताकि 100% लक्ष्य प्राप्त हो।',
    },
  },
  {
    rollNo: 'GGHS-0901',
    studentName: 'Simran Kaur',
    fatherName: 'Sh. Balwinder Singh',
    classLevel: '9',
    schoolName: 'Government Girls High School (GGHS), Dhanger',
    examName: 'Social Science Term-1 Comprehensive Assessment',
    examDate: '2026-09-28',
    subjects: [
      { name: 'History (फ्रांसीसी क्रांति)', marksObtained: 23, maxMarks: 25 },
      { name: 'Democratic Politics (संविधान निर्माण)', marksObtained: 25, maxMarks: 25 },
      { name: 'Geography (भारत: आकार और स्थिति)', marksObtained: 22, maxMarks: 25 },
      { name: 'Economics (पालमपुर गांव की कहानी)', marksObtained: 24, maxMarks: 25 },
    ],
    totalMarks: 94,
    maxMarks: 100,
    percentage: 94.0,
    grade: 'A+ (Merit)',
    rank: 1,
    remarks: {
      en: 'Splendid understanding of constitutional design principles and Preamble keywords.',
      hi: 'संविधान निर्माण के सिद्धांतों और प्रस्तावना के प्रमुख शब्दों की शानदार समझ।',
    },
  },
  {
    rollNo: 'GGHS-0801',
    studentName: 'Meenu Kumari',
    fatherName: 'Sh. Rajesh Chander',
    classLevel: '8',
    schoolName: 'Government Girls High School (GGHS), Dhanger',
    examName: 'Quarterly Social Science Assessment',
    examDate: '2026-09-15',
    subjects: [
      { name: 'History (1857 की क्रांति)', marksObtained: 22, maxMarks: 25 },
      { name: 'Civics (भारतीय संविधान व धर्मनिरपेक्षता)', marksObtained: 24, maxMarks: 25 },
      { name: 'Geography (संसाधन)', marksObtained: 21, maxMarks: 25 },
    ],
    totalMarks: 67,
    maxMarks: 75,
    percentage: 89.33,
    grade: 'A (First Division)',
    rank: 1,
    remarks: {
      en: 'Consistent, curious, and disciplined learner. Regular practice is reflecting in high marks.',
      hi: 'नियमित, जिज्ञासु और अनुशासित छात्रा। सतत अभ्यास से अंक लगातार उत्कृष्ट हो रहे हैं।',
    },
  },
];

export const PREAMBLE_TERMS = [
  {
    term: 'SOVEREIGN',
    termHi: 'सम्पूर्ण प्रभुत्व-सम्पन्न',
    meaning: {
      en: 'India is completely free to take all decisions internally and externally without any foreign control or interference.',
      hi: 'भारत आंतरिक और बाहरी मामलों में निर्णय लेने के लिए पूर्णतः स्वतंत्र है। कोई भी विदेशी सत्ता भारत पर अपनी इच्छा नहीं थोप सकती।',
    },
  },
  {
    term: 'SOCIALIST',
    termHi: 'समाजवादी',
    meaning: {
      en: 'Wealth should be generated socially and shared equally by society to reduce socio-economic inequalities.',
      hi: 'समाज में संपदा का उत्पादन सामाजिक रूप से हो और उसका न्यायसंगत वितरण हो, ताकि आर्थिक असमानता को कम किया जा सके।',
    },
  },
  {
    term: 'SECULAR',
    termHi: 'पंथनिरपेक्ष',
    meaning: {
      en: 'Citizens have complete freedom to follow any religion. There is no official state religion in India.',
      hi: 'सभी नागरिकों को किसी भी धर्म को मानने और आचरण करने की पूर्ण स्वतंत्रता है। राज्य का अपना कोई आधिकारिक धर्म नहीं है।',
    },
  },
  {
    term: 'DEMOCRATIC',
    termHi: 'लोकतंत्रात्मक',
    meaning: {
      en: 'A form of government where people enjoy equal political rights, elect their rulers through universal adult suffrage, and hold them accountable.',
      hi: 'शासन की वह प्रणाली जहाँ जनता अपने प्रतिनिधियों को सार्वभौमिक वयस्क मताधिकार द्वारा चुनती है और सरकार जनता के प्रति उत्तरदायी होती है।',
    },
  },
  {
    term: 'REPUBLIC',
    termHi: 'गणराज्य',
    meaning: {
      en: 'The head of state (The President of India) is an elected person for a fixed term, and not a hereditary monarch.',
      hi: 'राष्ट्र का प्रमुख (भारत का राष्ट्रपति) जनता द्वारा निश्चित अवधि के लिए चुना जाता है, न कि वंशानुगत राजा होता है।',
    },
  },
  {
    term: 'JUSTICE',
    termHi: 'न्याय (सामाजिक, आर्थिक और राजनीतिक)',
    meaning: {
      en: 'Citizens cannot be discriminated against on the grounds of caste, religion, and gender. Special focus on disadvantaged groups.',
      hi: 'नागरिकों से जाति, धर्म और लिंग के आधार पर कोई भेदभाव नहीं किया जा सकता। कमजोर वर्गों के कल्याण पर विशेष बल।',
    },
  },
  {
    term: 'LIBERTY',
    termHi: 'स्वतंत्रता (विचार, अभिव्यक्ति, विश्वास, धर्म और उपासना की)',
    meaning: {
      en: 'There are no unreasonable restrictions on citizens in what they think, how they wish to express their thoughts, and the way they follow up their beliefs in action.',
      hi: 'नागरिकों के विचार करने, अभिव्यक्ति करने तथा अपनी आस्था व पूजा पद्धति का पालन करने पर कोई अनुचित पाबंदी नहीं है।',
    },
  },
  {
    term: 'EQUALITY',
    termHi: 'समता (प्रतिष्ठा और अवसर की)',
    meaning: {
      en: 'All are equal before the law. Traditional social inequalities have to be ended. Government ensures equal opportunity for all.',
      hi: 'कानून के समक्ष सभी नागरिक समान हैं। जन्म या सामाजिक पृष्ठभूमि के आधार पर विशेषाधिकारों का अंत तथा समान अवसर।',
    },
  },
  {
    term: 'FRATERNITY',
    termHi: 'बंधुता (व्यक्ति की गरिमा और राष्ट्र की एकता व अखंडता)',
    meaning: {
      en: 'All citizens should behave as if they are members of the same family. No one should treat a fellow citizen as inferior.',
      hi: 'हम सभी ऐसा आचरण करें जैसे एक ही परिवार के सदस्य हों। कोई भी नागरिक दूसरे को हीन न समझे।',
    },
  },
];

export const CURRENT_AFFAIRS: CurrentAffairItem[] = [
  {
    id: 'ca1',
    date: '2026-10-30',
    category: 'National',
    title: {
      en: 'National Unity Day celebrated on the Birth Anniversary of Sardar Vallabhbhai Patel',
      hi: 'सरदार वल्लभभाई पटेल की जयंती पर राष्ट्रीय एकता दिवस का आयोजन',
    },
    summary: {
      en: 'October 31st marks National Unity Day (Rashtriya Ekta Diwas). Krishan Sir organized a special school assembly at GGHS Dhanger discussing the integration of 562 princely states.',
      hi: '31 अक्टूबर को राष्ट्रीय एकता दिवस मनाया जाता है। GGHS ढांगर में कृष्ण सर ने 562 देशी रियासतों के एकीकरण में सरदार पटेल के ऐतिहासिक योगदान पर विशेष परिचर्चा आयोजित की।',
    },
    relevance: {
      en: 'Directly relevant to Class 10 History (Nationalism) and Class 12 Political Science (Nation Building Challenges).',
      hi: 'कक्षा 10 इतिहास (राष्ट्रवाद) और कक्षा 12 राजनीति विज्ञान (राष्ट्र निर्माण की चुनौतियां) से सीधा संबंधित।',
    },
  },
  {
    id: 'ca2',
    date: '2026-10-24',
    category: 'Constitution & Polity',
    title: {
      en: 'United Nations Day observed: Role of UN Security Council & India\'s Demand for Permanent Seat',
      hi: 'संयुक्त राष्ट्र दिवस: यूएन सुरक्षा परिषद की भूमिका और भारत की स्थायी सदस्यता की मांग',
    },
    summary: {
      en: 'October 24 marks the founding of the United Nations in 1945. Students studied the six principal organs of the UN and democratic reforms needed in global governance.',
      hi: '24 अक्टूबर को 1945 में स्थापित संयुक्त राष्ट्र संघ की वर्षगांठ। विद्यार्थियों ने संयुक्त राष्ट्र के 6 प्रमुख अंगों और वैश्विक शासन में सुधारों का अध्ययन किया।',
    },
    relevance: {
      en: 'Important for Class 9 Civics (Democratic International Organizations) and Class 12 World Politics.',
      hi: 'कक्षा 9 नागरिक शास्त्र और कक्षा 12 समकालीन विश्व राजनीति के लिए अत्यंत महत्वपूर्ण।',
    },
  },
  {
    id: 'ca3',
    date: '2026-10-18',
    category: 'Haryana State',
    title: {
      en: 'Haryana Day Preparations: Celebrating Rich Cultural Heritage and Agricultural Milestones',
      hi: 'हरियाणा दिवस की तैयारियां: समृद्ध सांस्कृतिक धरोहर और हरित क्रांति की उपलब्धियों का पुनरावलोकन',
    },
    summary: {
      en: 'On 1 November 1966, Haryana was carved out of Punjab. GGHS Dhanger students prepared timeline charts showing Haryana\'s growth from agricultural leader to industrial hub.',
      hi: '1 नवंबर 1966 को हरियाणा अलग राज्य बना। छात्राओं ने कृषि प्रधानता से लेकर आधुनिक औद्योगिक राज्य बनने तक के विकास का चार्ट तैयार किया।',
    },
    relevance: {
      en: 'Essential for HBSE State curriculum, Social Studies projects, and state competitive exams (HTET/HSSC).',
      hi: 'हरियाणा बोर्ड पाठ्यक्रम, सामाजिक विज्ञान प्रोजेक्ट और एचटेट/एचएसएससी परीक्षाओं हेतु उपयोगी।',
    },
  },
];
