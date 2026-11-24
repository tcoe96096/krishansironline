// Public information, reviewed separately from authentication and database rules.
type Bilingual = { en: string; hi: string };
type InfoEntry = { id: string; slug: string; title: Bilingual; sections: { title: Bilingual; text: Bilingual }[]; emailSubject?: string };
const pair = (en: string, hi: string): Bilingual => ({en, hi});
const section = (en: string, hi: string, textEn: string, textHi: string) => ({title: pair(en,hi), text: pair(textEn,textHi)});
export const SUPPORT_EMAIL = 'krishansir.online@gmail.com';
export const INFO_VERSION = '1.0';
export const INFO_UPDATED = '2026-11-24';
export const publicInfoPages = [
  {id:'privacy',slug:'privacy-policy',title:pair('Privacy Policy','गोपनीयता नीति'),sections:[
    section('Information used','उपयोग की जाने वाली जानकारी','Student registration asks for name, class, roll number, school, country, state, district, area type, locality, optional PIN code and a mobile number or email. Authentication credentials are handled through Supabase Auth. Tests may record attempts, answers, scores and timing; account and teacher workflows may require additional profile information.','विद्यार्थी पंजीकरण में नाम, कक्षा, रोल नंबर, विद्यालय, देश, राज्य, जिला, क्षेत्र का प्रकार, स्थान, वैकल्पिक पिन कोड और मोबाइल नंबर या ईमेल माँगे जाते हैं। लॉगिन विवरण Supabase Auth द्वारा संभाले जाते हैं। परीक्षा में प्रयास, उत्तर, अंक और समय दर्ज हो सकते हैं; खाता व शिक्षक प्रक्रियाओं में अतिरिक्त प्रोफाइल विवरण आवश्यक हो सकते हैं।'),
    section('Purpose and access','उद्देश्य और पहुँच','Information is used to administer accounts, provide class-appropriate learning, manage examinations and results, and respond to support requests. Access should be limited to authorized users and service providers performing these functions. Do not publish identifiable student records without authorization.','जानकारी का उपयोग खाते, कक्षा के अनुसार अध्ययन, परीक्षाओं, परिणामों और सहायता अनुरोधों के लिए होता है। पहुँच अधिकृत उपयोगकर्ताओं और संबंधित सेवा प्रदाताओं तक सीमित होनी चाहिए। बिना अनुमति पहचान योग्य विद्यार्थी रिकॉर्ड प्रकाशित न करें।'),
    section('Storage and requests','भंडारण और अनुरोध','The website uses GitHub Pages for hosting and Supabase for authentication and database services. Browser storage supports sessions, preferences and exam recovery. Retention and deletion depend on the record and applicable obligations; request access, correction or deletion through the support email. No fixed deletion period or absolute security guarantee is promised.','वेबसाइट GitHub Pages पर होस्ट होती है और प्रमाणीकरण व डेटाबेस के लिए Supabase का उपयोग करती है। ब्राउज़र स्टोरेज सत्र, पसंद और परीक्षा रिकवरी में सहायक है। रिकॉर्ड रखने और हटाने की अवधि रिकॉर्ड तथा लागू दायित्वों पर निर्भर करती है; पहुँच, सुधार या हटाने के लिए सहायता ईमेल पर अनुरोध करें। निश्चित समय या पूर्ण सुरक्षा की गारंटी नहीं दी जाती।'),
    section('Children','बच्चे','Read the Child Safety & Privacy page with a parent or guardian before registration. Do not send passwords, identity documents or private student details through ordinary email.','पंजीकरण से पहले अभिभावक के साथ बाल सुरक्षा एवं गोपनीयता पृष्ठ पढ़ें। साधारण ईमेल से पासवर्ड, पहचान पत्र या निजी विद्यार्थी विवरण न भेजें।')
  ],emailSubject:'Privacy request'},
  {id:'terms',slug:'terms-and-conditions',title:pair('Terms & Conditions','नियम एवं शर्तें'),sections:[
    section('Educational use','शैक्षणिक उपयोग','Use the platform for lawful learning and practice. Keep credentials private, provide accurate information, and do not impersonate others or interfere with examinations or website security.','मंच का उपयोग वैध अध्ययन और अभ्यास के लिए करें। लॉगिन विवरण गोपनीय रखें, सही जानकारी दें और किसी अन्य की पहचान का उपयोग या परीक्षा अथवा वेबसाइट सुरक्षा में हस्तक्षेप न करें।'),
    section('Accounts and availability','खाते और उपलब्धता','Registration may require approval. Features and published content may change; access may be restricted for misuse or security reasons. These terms do not remove rights available under applicable law.','पंजीकरण के लिए अनुमोदन आवश्यक हो सकता है। सुविधाएँ और प्रकाशित सामग्री बदल सकती हैं; दुरुपयोग या सुरक्षा कारणों से पहुँच सीमित हो सकती है। ये शर्तें लागू कानून के अधिकारों को समाप्त नहीं करतीं।')
  ]},
  {id:'childSafety',slug:'child-safety',title:pair('Child Safety & Privacy','बाल सुरक्षा एवं गोपनीयता'),sections:[
    section('Guardian involvement','अभिभावक की भागीदारी','Students under 18 should review registration and data use with a parent or guardian. Guardians may contact support about a child’s account, correction or deletion. A registration acknowledgment alone does not establish verified parental consent.','18 वर्ष से कम आयु के विद्यार्थी अभिभावक के साथ पंजीकरण और डेटा उपयोग की जानकारी पढ़ें। अभिभावक बच्चे के खाते, सुधार या हटाने के लिए सहायता से संपर्क कर सकते हैं। केवल पंजीकरण की स्वीकृति सत्यापित अभिभावकीय सहमति नहीं है।'),
    section('Safe learning','सुरक्षित अध्ययन','Do not share home addresses, passwords, private photos or another student’s information in messages or reports. If something feels unsafe, tell a trusted adult and report it through the support contact.','संदेशों या शिकायतों में घर का पता, पासवर्ड, निजी तस्वीरें या अन्य विद्यार्थी की जानकारी साझा न करें। असुरक्षित स्थिति में विश्वसनीय वयस्क को बताएं और सहायता संपर्क पर रिपोर्ट करें।')
  ],emailSubject:'Child safety concern'},
  {id:'disclaimer',slug:'disclaimer',title:pair('Disclaimer','अस्वीकरण'),sections:[
    section('Educational information','शैक्षणिक जानकारी','Notes, quizzes and practice results are learning aids, not official board results or a guarantee of examination success. Verify examination dates, syllabi and official notifications with the responsible authority.','नोट्स, क्विज और अभ्यास परिणाम अध्ययन सहायक हैं, आधिकारिक बोर्ड परिणाम या सफलता की गारंटी नहीं। परीक्षा तिथि, पाठ्यक्रम और आधिकारिक सूचना संबंधित प्राधिकरण से सत्यापित करें।'),
    section('External resources','बाहरी संसाधन','External websites have their own terms and privacy practices. Report inaccurate or outdated educational content using the support contact.','बाहरी वेबसाइटों के अपने नियम और गोपनीयता प्रावधान हैं। गलत या पुरानी शैक्षणिक सामग्री की सूचना सहायता संपर्क पर दें।')
  ]},
  {id:'copyright',slug:'copyright-policy',title:pair('Copyright Policy','कॉपीराइट नीति'),sections:[
    section('Ownership and use','स्वामित्व और उपयोग','Original material and third-party resources remain subject to their respective rights and licenses. Personal learning is encouraged; republication, redistribution or commercial use requires permission where applicable.','मौलिक और तृतीय-पक्ष सामग्री अपने संबंधित अधिकारों और लाइसेंस के अधीन है। व्यक्तिगत अध्ययन को प्रोत्साहन दिया जाता है; पुनर्प्रकाशन, वितरण या व्यावसायिक उपयोग के लिए जहाँ आवश्यक हो अनुमति लें।'),
    section('Rights concerns','अधिकार संबंधी शिकायत','Send a resource URL, description of the concern and evidence of your rights through the support email. Do not attach unrelated personal records.','संसाधन का URL, समस्या का विवरण और अधिकार का प्रमाण सहायता ईमेल पर भेजें। असंबंधित निजी रिकॉर्ड संलग्न न करें।')
  ],emailSubject:'Copyright concern'},
  {id:'cookies',slug:'cookie-policy',title:pair('Cookies & Browser Storage','कुकी एवं ब्राउज़र स्टोरेज'),sections:[
    section('Browser storage','ब्राउज़र भंडारण','The portal uses local storage and session storage for language preferences, authentication and examination recovery. Hosting and external resources may use their own cookies or similar technologies.','पोर्टल भाषा की पसंद, लॉगिन और परीक्षा रिकवरी के लिए लोकल तथा सेशन स्टोरेज का उपयोग करता है। होस्टिंग और बाहरी संसाधन अपनी कुकी या समान तकनीक उपयोग कर सकते हैं।'),
    section('Your controls','आपके नियंत्रण','Sign out on shared devices. You can clear site storage in browser settings, but doing so during a test may remove locally saved progress or sign you out.','साझा डिवाइस पर लॉगआउट करें। ब्राउज़र सेटिंग से साइट स्टोरेज हटा सकते हैं, लेकिन परीक्षा के दौरान ऐसा करने से स्थानीय प्रगति हट सकती है या लॉगआउट हो सकता है।')
  ]},
  {id:'examPolicy',slug:'exam-result-policy',title:pair('Exam & Result Policy','परीक्षा एवं परिणाम नीति'),sections:[
    section('Attempts and timing','प्रयास और समय','Follow the published test instructions, class eligibility, attempt limit and time shown in the test. Use your own account. Avoid changing devices or clearing storage during an active examination.','प्रकाशित परीक्षा निर्देश, कक्षा पात्रता, प्रयास सीमा और निर्धारित समय का पालन करें। अपने खाते का उपयोग करें। चलती परीक्षा में डिवाइस बदलने या स्टोरेज हटाने से बचें।'),
    section('Results and correction','परिणाम और सुधार','Online practice scores are not official board certificates. If an attempt or result appears incorrect, report the test name, approximate date and issue through support. Do not send credentials or other students’ records.','ऑनलाइन अभ्यास अंक आधिकारिक बोर्ड प्रमाणपत्र नहीं हैं। प्रयास या परिणाम गलत लगे तो टेस्ट का नाम, अनुमानित तिथि और समस्या सहायता को बताएं। लॉगिन विवरण या अन्य विद्यार्थियों के रिकॉर्ड न भेजें।')
  ],emailSubject:'Exam or result issue'},
  {id:'help',slug:'help-centre',title:pair('Help Centre & FAQ','सहायता केंद्र एवं प्रश्नोत्तर'),sections:[
    section('How do I start a test?','टेस्ट कैसे शुरू करें?','Open Online Tests, choose a test for your class and sign in when prompted. Read the test instructions before starting.','ऑनलाइन टेस्ट खोलें, अपनी कक्षा का टेस्ट चुनें और आवश्यकता होने पर लॉगिन करें। शुरू करने से पहले परीक्षा निर्देश पढ़ें।'),
    section('Login or result issue?','लॉगिन या परिणाम में समस्या?','Check your sign-in identifier and account approval status. Contact support if the problem continues. Do not send your password or one-time codes.','अपना लॉगिन पहचानकर्ता और खाते की अनुमोदन स्थिति जाँचें। समस्या जारी रहने पर सहायता से संपर्क करें। पासवर्ड या एक बार उपयोग होने वाले कोड न भेजें।'),
    section('How can I contact support?','सहायता से संपर्क कैसे करें?','Use the email link below; it opens your email application. Sending and delivery depend on your email application.','नीचे दिए ईमेल लिंक से अपना ईमेल ऐप खोलें। संदेश भेजना और पहुँचना आपके ईमेल ऐप पर निर्भर है।')
  ],emailSubject:'Learning portal support'},
  {id:'grievance',slug:'grievance-redressal',title:pair('Grievance Redressal','शिकायत निवारण'),sections:[
    section('Submit a concern','शिकायत भेजें','Use the support email with a brief description, relevant page URL and approximate date. Avoid passwords, private photos and unnecessary personal information. A parent or guardian can assist a child.','सहायता ईमेल पर संक्षिप्त विवरण, संबंधित पृष्ठ का URL और अनुमानित तिथि भेजें। पासवर्ड, निजी तस्वीरें और अनावश्यक व्यक्तिगत जानकारी न दें। अभिभावक बच्चे की सहायता कर सकते हैं।'),
    section('Follow up','अनुवर्ती कार्रवाई','Keep a copy of your message and follow up in the same email thread. No automatic ticket or guaranteed response time is implied.','अपने संदेश की प्रति रखें और उसी ईमेल क्रम में अनुवर्ती संपर्क करें। स्वचालित टिकट या निश्चित उत्तर समय का दावा नहीं है।')
  ],emailSubject:'Grievance request'},
  {id:'dataDeletion',slug:'account-data-deletion',title:pair('Account & Data Deletion','खाता एवं डेटा हटाना'),sections:[
    section('Request a change or deletion','सुधार या हटाने का अनुरोध','Email support to request access, correction, or deletion of your account and associated personal information. Use your registered contact method if available. Guardians can request help for a child.','अपने खाते और संबंधित व्यक्तिगत जानकारी की पहुँच, सुधार या हटाने के लिए सहायता को ईमेल करें। उपलब्ध होने पर पंजीकृत संपर्क माध्यम का उपयोग करें। अभिभावक बच्चे के लिए सहायता माँग सकते हैं।'),
    section('Verification and handling','सत्यापन और प्रक्रिया','Requests require appropriate identity verification and review of applicable record-retention obligations. This page starts a request only; it does not automatically delete an account or database record. Never send your password.','अनुरोध में उचित पहचान सत्यापन और लागू रिकॉर्ड रखने के दायित्वों की समीक्षा आवश्यक है। यह पृष्ठ केवल अनुरोध शुरू करता है; खाता या डेटाबेस रिकॉर्ड स्वतः नहीं हटाता। पासवर्ड कभी न भेजें।')
  ],emailSubject:'Account and data request'},
  {id:'accessibility',slug:'accessibility',title:pair('Accessibility Statement','सुगम्यता विवरण'),sections:[
    section('Inclusive learning','समावेशी अध्ययन','The portal aims to support mobile and desktop access, bilingual navigation, readable content and keyboard operation. Some resources or documents may not yet be fully accessible.','पोर्टल मोबाइल और डेस्कटॉप पहुँच, द्विभाषी नेविगेशन, पठनीय सामग्री और कीबोर्ड उपयोग का लक्ष्य रखता है। कुछ संसाधन या दस्तावेज अभी पूरी तरह सुगम न हों।'),
    section('Request assistance','सहायता माँगें','If a page or document is difficult to use, send its URL and the accessibility difficulty. Formal accessibility certification is not claimed.','यदि पृष्ठ या दस्तावेज उपयोग में कठिन है तो उसका URL और सुगम्यता संबंधी समस्या भेजें। औपचारिक सुगम्यता प्रमाणन का दावा नहीं है।')
  ],emailSubject:'Accessibility support'},
  {id:'feedback',slug:'feedback',title:pair('Feedback & Suggestions','प्रतिक्रिया एवं सुझाव'),sections:[
    section('Help improve the portal','पोर्टल सुधार में सहयोग','Share learning suggestions, corrections or technical issues via the email below. Include the page URL and a short description; remove private student details from screenshots.','नीचे दिए ईमेल से अध्ययन सुझाव, सुधार या तकनीकी समस्याएँ भेजें। पृष्ठ का URL और संक्षिप्त विवरण दें; स्क्रीनशॉट से निजी विद्यार्थी विवरण हटा दें।')
  ],emailSubject:'Website feedback'},
  {id:'sitemap',slug:'sitemap',title:pair('Sitemap','साइट मानचित्र'),sections:[]}
] as const satisfies readonly InfoEntry[];
export type InfoPageId = typeof publicInfoPages[number]['id'];
export const infoLinks = publicInfoPages.map(p => ({id:p.id,slug:p.slug,title:p.title}));
export const learningLinks = [
  {id:'home',slug:'',title:pair('Home','मुख्य पृष्ठ')},
  {id:'classes',slug:'classes',title:pair('Classes 6–12','कक्षा 6–12')},
  {id:'exams',slug:'all-exams',title:pair('Competitive Exams','प्रतियोगी परीक्षाएँ')},
  {id:'tests',slug:'online-tests',title:pair('Online Tests','ऑनलाइन टेस्ट')},
  {id:'materials',slug:'study-materials',title:pair('Study Materials','अध्ययन सामग्री')},
  {id:'affairs',slug:'current-affairs',title:pair('Current Affairs','करेंट अफेयर्स')},
  {id:'polity',slug:'constitution',title:pair('Indian Constitution','भारतीय संविधान')},
  {id:'results',slug:'results',title:pair('Results & Report Cards','परिणाम एवं रिपोर्ट कार्ड')},
  {id:'studentDashboard',slug:'student-dashboard',title:pair('Student Dashboard','विद्यार्थी डैशबोर्ड')},
  {id:'teacher',slug:'teacher',title:pair('Teacher Portal','शिक्षक पोर्टल')},
  {id:'about',slug:'about',title:pair('About Us','हमारे बारे में')},
  {id:'contact',slug:'contact',title:pair('Contact Us','संपर्क करें')}
];
export const publicHref = (slug:string) => import.meta.env.BASE_URL.replace(/\/$/,'') + '/' + (slug ? slug+'/' : '');
