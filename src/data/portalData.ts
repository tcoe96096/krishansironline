import { StudyChapter, OnlineTest, StudentResult, Notice, CurrentAffairItem, ClassLevel } from '../types';

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

export const STUDY_CHAPTERS: StudyChapter[] = [];

export const ONLINE_TESTS: OnlineTest[] = [];

export const STUDENT_RESULTS: StudentResult[] = [];
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

export const CURRENT_AFFAIRS: CurrentAffairItem[] = [];
