import React, { useMemo, useState } from 'react';
import { Header } from './Header';
import { Footer } from './Footer';
import { Hero } from './Hero';
import { NoticeBoard } from './NoticeBoard';
import { QuickAccessCards } from './QuickAccessCards';
import { SearchModal } from './SearchModal';
import { AuthModal } from './AuthModal';
import { useLanguage } from '../context/LanguageContext';
import { TEACHER_INFO } from '../data/portalData';
import { ClassLevel } from '../types';
import {
  BookMarked, ArrowRight, BookOpen, Landmark, ShieldCheck, GraduationCap,
  ArrowUpRight, ChevronRight, Sparkles, UserRound, MessageSquare,
  LayoutDashboard, ClipboardCheck
} from 'lucide-react';

export type HomeSectionId = 'hero'|'notices'|'studentDashboard'|'quickAccess'|'pathways'|'classes'|'learningHubs'|'teacher'|'doubtDesk';
export const DEFAULT_HOME_SECTION_ORDER: HomeSectionId[] = ['hero','notices','studentDashboard','quickAccess','pathways','classes','learningHubs','teacher','doubtDesk'];
export const HOME_SECTION_LABELS: Record<HomeSectionId,string> = {
  hero:'Hero Banner', notices:'Announcements', studentDashboard:'Student Dashboard',
  quickAccess:'Quick Access', pathways:'Courses & Learning Pathways', classes:'Classes 6–12',
  learningHubs:'Special Learning Hubs', teacher:'Teacher Introduction', doubtDesk:'Student Doubt Desk'
};

type Props = {
  onNavigate:(page:string, filterClass?:string)=>void;
  editable?:boolean;
  sectionOrder?:HomeSectionId[];
  hiddenSections?:HomeSectionId[];
  selectedSection?:HomeSectionId|null;
  onSelectSection?:(section:HomeSectionId)=>void;
  onReorderSections?:(from:HomeSectionId,to:HomeSectionId)=>void;
  customContent?:React.ReactNode;
  onAddComponent?:(kind:string)=>void;
};

type HomeStudentSession = {studentName:string;studentClass:string};
const readStudentSession=():HomeStudentSession|null=>{
  try{
    const raw=localStorage.getItem('krishan_sir_active_test_session');
    if(raw){
      const session=JSON.parse(raw);
      const student=session?.student;
      if(typeof student?.studentName==='string'&&typeof student?.studentClass==='string') return {studentName:student.studentName,studentClass:student.studentClass};
    }
    const rawStudent=localStorage.getItem('krishan_sir_active_student');
    if(rawStudent){
      const student=JSON.parse(rawStudent);
      if(typeof student?.studentName==='string'&&typeof student?.studentClass==='string') return {studentName:student.studentName,studentClass:student.studentClass};
    }
  }catch{/* Ignore malformed local student session */}
  return null;
};

const StudentDashboardHome:React.FC<{onNavigate:(page:string)=>void;language:string}>=({onNavigate,language})=>{
  const en=language==='en';
  const [session]=useState<HomeStudentSession|null>(()=>readStudentSession());
  return <section className="py-8 sm:py-10 bg-white border-b border-slate-200">
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="rounded-2xl border border-sky-200 bg-gradient-to-br from-sky-50 via-white to-indigo-50 p-5 sm:p-7 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
          <div className="flex items-start gap-3"><div className="w-11 h-11 rounded-xl bg-sky-900 text-white flex items-center justify-center shrink-0"><LayoutDashboard className="w-5 h-5"/></div><div>
            <div className="text-xs font-bold uppercase tracking-wider text-sky-800">{en?'Student Dashboard':'विद्यार्थी डैशबोर्ड'}</div>
            <h2 className="mt-1 text-xl sm:text-2xl font-extrabold text-slate-900">{session?(en?'Welcome back, '+session.studentName:'वापसी पर स्वागत है, '+session.studentName):(en?'Your Learning Space':'आपका अध्ययन केंद्र')}</h2>
            <p className="mt-1 text-sm text-slate-600 max-w-2xl">{session?(en?'Class '+session.studentClass+' · Your saved test session is available on this device.':'कक्षा '+session.studentClass+' · आपकी सेव की गई टेस्ट प्रगति इस डिवाइस पर उपलब्ध है।'):(en?'Quick access to your classes, study notes, practice tests and results.':'कक्षाओं, अध्ययन नोट्स, अभ्यास टेस्ट और परिणामों तक त्वरित पहुँच।')}</p>
          </div></div>
          <div className="flex flex-wrap gap-2"><button onClick={()=>onNavigate('tests')} className="inline-flex items-center gap-2 rounded-xl bg-sky-900 px-4 py-2.5 text-sm font-bold text-white hover:bg-sky-800">{session?(en?'Continue Tests':'टेस्ट जारी रखें'):(en?'Start Learning':'पढ़ाई शुरू करें')}</button><button onClick={()=>onNavigate('results')} className="inline-flex items-center gap-2 rounded-xl border border-sky-200 bg-white px-4 py-2.5 text-sm font-bold text-sky-900 hover:bg-sky-50">{en?'My Results':'मेरे परिणाम'}</button></div>
        </div>
        <div className="mt-5 grid grid-cols-1 sm:grid-cols-3 gap-2"><button onClick={()=>onNavigate('classes')} className="flex items-center gap-2 rounded-xl bg-white/90 border border-slate-200 p-3 text-left text-sm font-semibold text-slate-700 hover:border-sky-300"><BookOpen className="w-4 h-4 text-sky-800"/>{en?'My Classes':'मेरी कक्षाएँ'}</button><button onClick={()=>onNavigate('materials')} className="flex items-center gap-2 rounded-xl bg-white/90 border border-slate-200 p-3 text-left text-sm font-semibold text-slate-700 hover:border-sky-300"><BookMarked className="w-4 h-4 text-sky-800"/>{en?'Study Materials':'अध्ययन सामग्री'}</button><button onClick={()=>onNavigate('tests')} className="flex items-center gap-2 rounded-xl bg-white/90 border border-slate-200 p-3 text-left text-sm font-semibold text-slate-700 hover:border-sky-300"><ClipboardCheck className="w-4 h-4 text-sky-800"/>{en?'Practice & Mock Tests':'अभ्यास एवं मॉक टेस्ट'}</button></div>
        <p className="mt-3 text-[11px] text-slate-500">{en?'Dashboard shortcuts use the existing learning portal and locally saved test progress; they do not create a separate student account.':'डैशबोर्ड मौजूदा पोर्टल और इस डिवाइस पर सेव टेस्ट प्रगति का उपयोग करता है; यह अलग विद्यार्थी अकाउंट नहीं बनाता।'}</p>
      </div>
    </div>
  </section>;
};

export const AdminHomepageCanvas:React.FC<Props>=({
  onNavigate,editable=false,sectionOrder=DEFAULT_HOME_SECTION_ORDER,hiddenSections=[],
  selectedSection=null,onSelectSection,onReorderSections,customContent,onAddComponent
})=>{
  const {language}=useLanguage();
  const [searchOpen,setSearchOpen]=useState(false);
  const [authOpen,setAuthOpen]=useState(false);
  const [dragging,setDragging]=useState<HomeSectionId|null>(null);

  const handleDrop=(event:React.DragEvent<HTMLDivElement>,target:HomeSectionId)=>{
    event.preventDefault();
    const component=event.dataTransfer.getData('application/krishan-block');
    if(component){onAddComponent?.(component);setDragging(null);return;}
    const from=(event.dataTransfer.getData('application/krishan-home-section')||dragging) as HomeSectionId|null;
    if(from&&from!==target) onReorderSections?.(from,target);
    setDragging(null);
  };

  const renderSection=(id:HomeSectionId):React.ReactNode=>{
    if(id==='hero') return <Hero onNavigate={onNavigate}/>;
    if(id==='notices') return <div id="notices"><NoticeBoard onNavigate={onNavigate}/></div>;
    if(id==='studentDashboard') return <StudentDashboardHome onNavigate={onNavigate} language={language}/>;
    if(id==='quickAccess') return <QuickAccessCards onNavigate={onNavigate}/>;
    if(id==='pathways') return <section className="py-12 bg-slate-50 border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 mb-7"><div>
          <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-sky-800 mb-2"><BookMarked className="w-4 h-4"/><span>{language==='en'?'Learning Pathways':'अध्ययन पाठ्यक्रम'}</span></div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 font-display">{language==='en'?'Explore Classes & Courses':'कक्षाएँ एवं पाठ्यक्रम चुनें'}</h2>
          <p className="mt-1 text-sm text-slate-600">{language==='en'?'Choose a learning path and move directly to the relevant resources.':'अपना अध्ययन क्षेत्र चुनें और संबंधित सामग्री तक सीधे पहुँचें।'}</p>
        </div><button onClick={()=>onNavigate('classes')} className="inline-flex items-center gap-1.5 text-xs font-bold text-sky-900 hover:text-sky-700">{language==='en'?'View all classes':'सभी कक्षाएँ देखें'} <ArrowRight className="w-4 h-4"/></button></div>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">{[
          {title:language==='en'?'School Learning · Classes 6–12':'विद्यालयी शिक्षा · कक्षा 6–12',detail:language==='en'?'Class-wise syllabus, chapter notes and learning resources.':'कक्षावार पाठ्यक्रम, अध्यायवार नोट्स और अध्ययन सामग्री।',icon:BookOpen,action:'classes'},
          {title:language==='en'?'Social Science':'सामाजिक विज्ञान',detail:language==='en'?'History, Geography, Political Science and Economics.':'इतिहास, भूगोल, राजनीति विज्ञान और अर्थशास्त्र।',icon:Landmark,action:'materials'},
          {title:language==='en'?'Indian Constitution':'भारतीय संविधान',detail:language==='en'?'Constitutional articles, rights, institutions and polity.':'संवैधानिक अनुच्छेद, अधिकार, संस्थाएँ और राजव्यवस्था।',icon:ShieldCheck,action:'polity'},
          {title:language==='en'?'Competitive Exams':'प्रतियोगी परीक्षाएँ',detail:language==='en'?'UGC NET, HTET, CTET and teacher recruitment practice.':'UGC NET, HTET, CTET और शिक्षक भर्ती परीक्षा अभ्यास।',icon:GraduationCap,action:'exams'}
        ].map(course=>{const Icon=course.icon;return <button key={course.title} onClick={()=>onNavigate(course.action)} className="group text-left rounded-2xl border border-slate-200 bg-white p-5 shadow-xs hover:-translate-y-1 hover:border-sky-300 hover:shadow-md transition-all"><div className="flex items-start justify-between gap-3"><span className="flex h-11 w-11 items-center justify-center rounded-xl bg-sky-50 text-sky-900 group-hover:bg-sky-900 group-hover:text-white transition-colors"><Icon className="w-5 h-5"/></span><ArrowUpRight className="w-4 h-4 text-slate-400 group-hover:text-sky-800"/></div><h3 className="mt-4 text-base font-extrabold text-slate-900">{course.title}</h3><p className="mt-2 text-sm leading-relaxed text-slate-600">{course.detail}</p><span className="mt-4 inline-flex items-center gap-1 text-xs font-bold text-sky-900">{language==='en'?'Explore pathway':'अध्ययन सामग्री देखें'} <ChevronRight className="w-3.5 h-3.5"/></span></button>})}</div>
      </div>
    </section>;
    if(id==='classes') return <section className="py-12 bg-white border-b border-slate-200"><div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8"><div><div className="inline-flex items-center gap-1.5 text-xs font-semibold text-sky-800 mb-2"><BookOpen className="w-4 h-4"/><span>{language==='en'?'Class-wise Portal':'कक्षावार अध्ययन पोर्टल'}</span></div><h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 font-display">{language==='en'?'Explore by Class (6 to 12)':'अपनी कक्षा चुनें (6 से 12)'}</h2><p className="mt-1 text-sm text-slate-600 max-w-2xl">{language==='en'?'Jump directly into your syllabus, chapter notes, and online tests.':'सीधे अपने पाठ्यक्रम, अध्यायवार नोट्स और ऑनलाइन टेस्ट तक पहुंचें।'}</p></div><button onClick={()=>onNavigate('classes')} className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-sky-900 text-white text-xs font-semibold hover:bg-sky-800 transition-colors shadow-xs self-start md:self-auto"><span>{language==='en'?'View Full Curriculum Page':'पूरा पाठ्यक्रम पृष्ठ देखें'}</span><ArrowRight className="w-4 h-4"/></button></div>
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">{(['6','7','8','9','10','11','12'] as ClassLevel[]).map(lvl=><div key={lvl} className="group bg-slate-50 hover:bg-sky-50 border border-slate-200 hover:border-sky-300 rounded-xl p-4 transition-all text-center flex flex-col justify-between"><div><div className="w-9 h-9 mx-auto rounded-lg bg-sky-900 text-white flex items-center justify-center font-bold text-sm mb-2 shadow-2xs group-hover:scale-105 transition-transform">{lvl}</div><div className="text-xs font-bold text-slate-900">{language==='en'?'Class '+lvl:'कक्षा '+lvl}</div><div className="text-[10px] text-slate-500 mt-0.5">{lvl==='10'?'Board Exam':lvl==='12'?'Sr. Secondary':'Social Science'}</div></div><div className="mt-3 pt-2 border-t border-slate-200/70 flex flex-col gap-1"><button onClick={()=>onNavigate('materials',lvl)} className="w-full py-1 text-[11px] font-semibold text-sky-800 hover:text-sky-950 hover:underline">{language==='en'?'Notes':'नोट्स'}</button><button onClick={()=>onNavigate('tests',lvl)} className="w-full py-1 text-[11px] font-semibold text-amber-800 hover:text-amber-950 hover:underline">{language==='en'?'Tests':'टेस्ट'}</button></div></div>)}</div>
    </div></section>;
    if(id==='learningHubs') return <section className="py-12 bg-slate-100/70 border-b border-slate-200"><div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8"><div className="text-center max-w-3xl mx-auto mb-8"><div className="inline-flex items-center gap-1.5 text-xs font-semibold text-sky-800 mb-2"><Sparkles className="w-4 h-4"/><span>{language==='en'?'Special Learning Hubs':'विशेष अध्ययन केंद्र'}</span></div><h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 font-display">{language==='en'?'Focused Learning & Exam Preparation':'विशेष अध्ययन एवं परीक्षा तैयारी'}</h2><p className="mt-2 text-sm text-slate-600">{language==='en'?'Explore current knowledge and prepare systematically for competitive examinations.':'समसामयिक ज्ञान प्राप्त करें और प्रतियोगी परीक्षाओं की व्यवस्थित तैयारी करें।'}</p></div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-5xl mx-auto"><div className="bg-white rounded-2xl p-6 sm:p-7 border border-slate-200 shadow-xs flex flex-col justify-between"><div><div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-sky-50 text-sky-800 text-xs font-bold border border-sky-200 mb-3"><Sparkles className="w-3.5 h-3.5"/><span>{language==='en'?'Learning Hub 01':'अध्ययन केंद्र 01'}</span></div><h3 className="text-xl font-extrabold text-slate-900 mb-2 font-display">{language==='en'?'Current Affairs & General Awareness':'करेंट अफेयर्स एवं सामान्य जागरूकता'}</h3><p className="text-sm text-slate-600 leading-relaxed">{language==='en'?'National and international developments, Haryana updates, government schemes, reports, indices, and exam-relevant general knowledge.':'राष्ट्रीय एवं अंतरराष्ट्रीय घटनाक्रम, हरियाणा की खबरें, सरकारी योजनाएँ, रिपोर्ट, सूचकांक और परीक्षा उपयोगी सामान्य ज्ञान।'}</p></div><button onClick={()=>onNavigate('affairs')} className="mt-6 pt-4 border-t border-slate-100 inline-flex items-center gap-2 text-xs font-bold text-sky-900 hover:text-sky-700"><span>{language==='en'?'Explore Current Affairs':'करेंट अफेयर्स देखें'}</span><ArrowRight className="w-3.5 h-3.5"/></button></div>
      <div className="bg-white rounded-2xl p-6 sm:p-7 border border-slate-200 shadow-xs flex flex-col justify-between"><div><div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 text-amber-900 text-xs font-bold border border-amber-200 mb-3"><GraduationCap className="w-3.5 h-3.5"/><span>{language==='en'?'Learning Hub 02':'अध्ययन केंद्र 02'}</span></div><h3 className="text-xl font-extrabold text-slate-900 mb-2 font-display">{language==='en'?'Competitive Exam Preparation':'प्रतियोगी परीक्षा तैयारी'}</h3><p className="text-sm text-slate-600 leading-relaxed">{language==='en'?'Focused preparation for UGC NET Political Science, UGC NET Education, HTET, CTET, and teacher recruitment examinations through study resources and practice tests.':'यूजीसी नेट राजनीति विज्ञान, यूजीसी नेट शिक्षा, एचटेट, सीटीईटी और शिक्षक भर्ती परीक्षाओं के लिए अध्ययन सामग्री एवं अभ्यास टेस्ट।'}</p></div><button onClick={()=>onNavigate('exams')} className="mt-6 pt-4 border-t border-slate-100 inline-flex items-center gap-2 text-xs font-bold text-sky-900 hover:text-sky-700"><span>{language==='en'?'Explore All Exams':'सभी परीक्षाएँ देखें'}</span><ArrowRight className="w-3.5 h-3.5"/></button></div></div>
    </div></section>;
    if(id==='teacher') return <section className="py-12 bg-white border-b border-slate-200"><div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8"><div className="rounded-2xl border border-slate-200 bg-gradient-to-r from-white via-sky-50/70 to-white p-5 sm:p-7 shadow-sm"><div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center"><div className="md:col-span-4"><div className="relative mx-auto max-w-[260px] aspect-[4/3] sm:aspect-square overflow-hidden rounded-2xl border border-slate-200 bg-slate-100 shadow-sm"><img src={import.meta.env.BASE_URL+'images/krishan-sir.png'} alt="Krishan Kumar – TGT Social Science" loading="lazy" className="h-full w-full object-cover object-[24%_28%]"/><div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-slate-950/85 to-transparent px-4 pb-3 pt-8 text-white"><div className="font-extrabold">Krishan Kumar</div><div className="text-xs text-amber-300">{TEACHER_INFO.designation}</div></div></div></div><div className="md:col-span-8"><div className="inline-flex items-center gap-1.5 text-xs font-bold text-sky-800 mb-2"><UserRound className="w-4 h-4"/>{language==='en'?'Meet Your Teacher':'अपने शिक्षक से मिलें'}</div><h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 font-display">{language==='en'?'Learn with Krishan Sir':'कृष्ण सर के साथ सीखें'}</h2><p className="mt-2 text-sm sm:text-base text-slate-600 leading-relaxed">{language==='en'?'TGT Social Science and dedicated educator focused on conceptual clarity, bilingual learning and meaningful exam preparation.':'टीजीटी सामाजिक विज्ञान शिक्षक; वैचारिक स्पष्टता, द्विभाषी अध्ययन और प्रभावी परीक्षा तैयारी पर विशेष ध्यान।'}</p><div className="mt-4 flex flex-wrap gap-2">{['M.A. Political Science','M.Phil.','UGC NET – Political Science (2×)','UGC NET – Education','B.Ed. • M.Ed.','CTET • HTET'].map(item=><span key={item} className="rounded-lg border border-sky-100 bg-white px-2.5 py-1.5 text-[11px] font-semibold text-slate-700">{item}</span>)}</div><div className="mt-5 flex flex-wrap items-center gap-3"><button onClick={()=>onNavigate('about')} className="inline-flex items-center gap-2 rounded-xl bg-sky-900 px-4 py-2.5 text-sm font-bold text-white hover:bg-sky-800 transition-colors">{language==='en'?'View Full Teacher Profile':'शिक्षक का पूरा परिचय देखें'} <ArrowRight className="w-4 h-4"/></button><span className="text-xs text-slate-500">{TEACHER_INFO.school}</span></div></div></div></div></div></section>;
    if(id==='doubtDesk') return <section className="py-10 bg-sky-900 text-white"><div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-6"><div><div className="flex items-center gap-2 text-amber-300 text-xs font-bold mb-1"><MessageSquare className="w-4 h-4"/><span>{language==='en'?'Student Doubt Desk':'विद्यार्थी शंका समाधान केंद्र'}</span></div><h3 className="text-xl sm:text-2xl font-bold font-display">{language==='en'?'Have a Question or Exam Doubt?':'क्या आपको किसी पाठ में कोई शंका है?'}</h3><p className="text-slate-300 text-xs sm:text-sm mt-1 max-w-xl">{language==='en'?'Submit your academic query directly to Krishan Sir and receive personalized guidance for your studies.':'अपना प्रश्न सीधे कृष्ण सर को भेजें और अपनी परीक्षा तैयारी में व्यक्तिगत मार्गदर्शन पाएं।'}</p></div><button onClick={()=>onNavigate('contact')} className="px-6 py-3 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs shadow-md transition-all shrink-0">{language==='en'?'Ask Doubt / Contact Now':'शंका पूछें / संपर्क करें'}</button></div></section>;
    return null;
  };

  const ordered=useMemo(()=>sectionOrder.filter(id=>!hiddenSections.includes(id)),[sectionOrder,hiddenSections]);
  const wrap=(id:HomeSectionId,index:number)=> <div
    key={id}
    data-home-editor-section={id}
    draggable={editable}
    onDragStart={editable?(event)=>{event.dataTransfer.effectAllowed='move';event.dataTransfer.setData('application/krishan-home-section',id);setDragging(id);}:undefined}
    onDragEnd={editable?()=>setDragging(null):undefined}
    onDragOver={editable?(event)=>event.preventDefault():undefined}
    onDrop={editable?(event)=>handleDrop(event,id):undefined}
    onClick={editable?()=>onSelectSection?.(id):undefined}
    className={editable?'group relative transition-shadow '+(selectedSection===id?'outline outline-2 outline-sky-500 outline-offset-[-2px]':'hover:outline hover:outline-1 hover:outline-sky-300 hover:outline-offset-[-1px]'):'contents'}
  >
    {editable&&<div className="pointer-events-none absolute right-3 top-3 z-30 flex items-center gap-2 rounded-lg bg-sky-900/95 px-2.5 py-1.5 text-[10px] font-extrabold text-white opacity-0 shadow transition group-hover:opacity-100">{index+1}. {HOME_SECTION_LABELS[id]} <span className="text-sky-200">⋮⋮</span></div>}
    {renderSection(id)}
  </div>;

  return <div className="min-h-screen bg-slate-50 text-slate-800">
    <Header activeSection="home" onNavigate={onNavigate} onOpenSearch={()=>setSearchOpen(true)} onOpenAuth={()=>setAuthOpen(true)}/>
    <main className="space-y-0">{ordered.map((id,index)=>wrap(id,index))}{customContent&&<div data-home-editor-section="customContent" className={editable?"relative border-t border-dashed border-sky-300":""}>{editable&&<div className="px-4 py-2 text-[10px] font-bold text-sky-700">ADDED COMPONENTS · DRAFT ONLY</div>}{customContent}</div>}</main>
    <Footer onNavigate={onNavigate}/>
    <SearchModal isOpen={searchOpen} onClose={()=>setSearchOpen(false)} onNavigate={onNavigate}/>
    <AuthModal isOpen={authOpen} onClose={()=>setAuthOpen(false)}/>
  </div>;
};
