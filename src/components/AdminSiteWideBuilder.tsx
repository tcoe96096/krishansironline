import React, { useEffect, useMemo, useRef, useState } from 'react';
import { getVisualEditorPage } from '../visual-editor/registry';
import {
  FilePlus2, FileText, Globe, Image as ImageIcon, Palette, Type, PanelsTopLeft,
  Smartphone, Monitor, Eye, CheckCircle2, Info, Plus, ChevronRight,
  Upload, LockKeyhole, RotateCcw, LayoutTemplate
} from 'lucide-react';

type PageBlock = { id: string; titleEn: string; titleHi: string; textEn: string; textHi: string };
type SitePage = {
  id: string; path: string; labelEn: string; labelHi: string; titleEn: string; titleHi: string;
  badgeEn: string; badgeHi: string; subtitleEn: string; subtitleHi: string;
  sectionTitleEn: string; sectionTitleHi: string; sectionTextEn: string; sectionTextHi: string;
  blocks?: PageBlock[];
  visible: boolean; custom: boolean;
};

const DRAFT_STORAGE_KEY = 'krishansir.admin-site-builder.draft.v1';
const defaultTheme = { primary:'#0b3979', accent:'#078a8d', background:'#f2f7fc', surface:'#ffffff', text:'#18263b' };
type BuilderDraft = {
  version: 1; savedAt: string; pages: SitePage[]; theme: typeof defaultTheme;
  font: string; headingScale: number; cardFrame: string; textFrame: string;
  imageFrame: string; cornerRadius: number; borderWidth: number; shadow: boolean;
};
const loadBuilderDraft = (): BuilderDraft | null => {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(DRAFT_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as BuilderDraft;
    if (parsed.version !== 1 || !Array.isArray(parsed.pages) || !parsed.pages.length) return null;
    return parsed;
  } catch { return null; }
};
const blocksForPage = (page: SitePage): PageBlock[] => page.blocks ?? [];

const starterPages: SitePage[] = [
  { id:'home',path:'/',labelEn:'Home',labelHi:'होम',titleEn:'Krishan Sir Online Learning',titleHi:'कृष्ण सर ऑनलाइन लर्निंग',badgeEn:'FREE ONLINE LEARNING',badgeHi:'निःशुल्क ऑनलाइन शिक्षा',subtitleEn:'A dedicated digital learning platform for every learner.',subtitleHi:'प्रत्येक विद्यार्थी के लिए एक समर्पित डिजिटल शिक्षण मंच।',sectionTitleEn:'Explore the portal',sectionTitleHi:'पोर्टल का अन्वेषण करें',sectionTextEn:'Study materials, online tests, learning pathways and teacher information.',sectionTextHi:'अध्ययन सामग्री, ऑनलाइन टेस्ट, अध्ययन मार्ग और शिक्षक परिचय।',visible:true,custom:false },
  { id:'classes',path:'/classes/',labelEn:'Classes 6–12',labelHi:'कक्षा 6–12',titleEn:'Classes 6 to 12 Curriculum & Learning Hub',titleHi:'कक्षा 6 से 12 – पाठ्यक्रम एवं अध्ययन केंद्र',badgeEn:'Curriculum Architecture',badgeHi:'कक्षावार पाठ्यक्रम',subtitleEn:'Explore NCERT, Haryana Board (HBSE), and CBSE aligned Social Science chapters, textbooks, and interactive test modules for every class.',subtitleHi:'कक्षा 6 से 12 के लिए एनसीईआरटी, हरियाणा बोर्ड (HBSE) और सीबीएसई पाठ्यक्रम आधारित अध्याय, नोट्स और ऑनलाइन टेस्ट।',sectionTitleEn:'Class-wise Curriculum',sectionTitleHi:'कक्षावार पाठ्यक्रम',sectionTextEn:'Explore resources for Classes 6 to 12.',sectionTextHi:'कक्षा 6 से 12 के लिए अध्ययन सामग्री देखें।',visible:true,custom:false },
  { id:'exams',path:'/all-exams/',labelEn:'All Exams',labelHi:'सभी परीक्षाएँ',titleEn:'All Competitive Exams & Preparation Hub',titleHi:'सभी प्रतियोगी परीक्षाएँ एवं तैयारी केंद्र',badgeEn:'All Exams',badgeHi:'सभी परीक्षाएँ',subtitleEn:'Explore exam-wise preparation pathways, core syllabus areas and study resources for teaching and competitive examinations.',subtitleHi:'शिक्षक भर्ती एवं प्रतियोगी परीक्षाओं के लिए परीक्षा-वार तैयारी, प्रमुख पाठ्यक्रम और अध्ययन सामग्री।',sectionTitleEn:'Choose Your Examination',sectionTitleHi:'अपनी परीक्षा चुनें',sectionTextEn:'Exam-wise learning tracks and preparation resources.',sectionTextHi:'परीक्षा-वार अध्ययन सामग्री और तैयारी के संसाधन।',visible:true,custom:false },
  { id:'tests',path:'/online-tests/',labelEn:'Online Tests',labelHi:'ऑनलाइन टेस्ट',titleEn:'Online Tests & Practice Portal',titleHi:'ऑनलाइन टेस्ट एवं अभ्यास पोर्टल',badgeEn:'Tests & Practice',badgeHi:'टेस्ट एवं अभ्यास',subtitleEn:'Attempt available online tests and practice questions with the dedicated test engine.',subtitleHi:'समर्पित टेस्ट पोर्टल के माध्यम से उपलब्ध ऑनलाइन टेस्ट एवं अभ्यास प्रश्न हल करें।',sectionTitleEn:'Available Tests',sectionTitleHi:'उपलब्ध टेस्ट',sectionTextEn:'Practice, assess and review your performance.',sectionTextHi:'अभ्यास करें, मूल्यांकन करें और अपना प्रदर्शन देखें।',visible:true,custom:false },
  { id:'materials',path:'/study-materials/',labelEn:'Study Materials',labelHi:'अध्ययन सामग्री',titleEn:'Chapter-wise Study Materials & Notes',titleHi:'अध्यायवार अध्ययन सामग्री एवं नोट्स',badgeEn:'NCERT & HBSE Syllabus',badgeHi:'एनसीईआरटी व एचबीएसई नोट्स',subtitleEn:'Curated NCERT revision notes, summary points, key terms, and printable PDF documents prepared by Krishan Sir.',subtitleHi:'कृष्ण सर द्वारा तैयार संक्षिप्त रिवीजन नोट्स, महत्वपूर्ण बिंदु, शब्दावली और अध्ययन सामग्री।',sectionTitleEn:'Chapter-wise Resources',sectionTitleHi:'अध्यायवार संसाधन',sectionTextEn:'Find notes, MCQs, PDFs and presentations.',sectionTextHi:'नोट्स, MCQ, PDF और प्रस्तुतियाँ प्राप्त करें।',visible:true,custom:false },
  { id:'polity',path:'/constitution/',labelEn:'Constitution',labelHi:'संविधान',titleEn:'Indian Constitution & Political Science Corner',titleHi:'भारतीय संविधान एवं राजनीति विज्ञान केंद्र',badgeEn:'Civics & Constitutional Law',badgeHi:'संविधान व नागरिक शास्त्र',subtitleEn:'Interactive Preamble explorer, Fundamental Rights, Articles, Democratic Politics, and General Civic Awareness.',subtitleHi:'संविधान की प्रस्तावना, मौलिक अधिकार, महत्वपूर्ण अनुच्छेद, लोकतांत्रिक राजनीति और नागरिक जागरूकता।',sectionTitleEn:'Explore the Constitution',sectionTitleHi:'संविधान को समझें',sectionTextEn:'Learn constitutional values, articles and institutions.',sectionTextHi:'संवैधानिक मूल्य, अनुच्छेद और संस्थाओं को समझें।',visible:true,custom:false },
  { id:'affairs',path:'/current-affairs/',labelEn:'Current Affairs',labelHi:'करेंट अफेयर्स',titleEn:'Current Affairs & General Awareness',titleHi:'करेंट अफेयर्स एवं सामान्य जागरूकता',badgeEn:'Current Affairs',badgeHi:'करेंट अफेयर्स',subtitleEn:'Educational current affairs updates for school and competitive examination preparation.',subtitleHi:'विद्यालयी एवं प्रतियोगी परीक्षाओं की तैयारी के लिए शैक्षणिक करेंट अफेयर्स।',sectionTitleEn:'Latest Updates',sectionTitleHi:'नवीनतम अपडेट',sectionTextEn:'National, Haryana and constitutional developments.',sectionTextHi:'राष्ट्रीय, हरियाणा और संवैधानिक घटनाक्रम।',visible:true,custom:false },
  { id:'results',path:'/results/',labelEn:'Results',labelHi:'परिणाम',titleEn:'Student Results Portal',titleHi:'विद्यार्थी परीक्षा परिणाम पोर्टल',badgeEn:'Results & Assessment',badgeHi:'परिणाम एवं मूल्यांकन',subtitleEn:'Access verified student assessment results when authorized result data is available.',subtitleHi:'अधिकृत परिणाम डेटा उपलब्ध होने पर विद्यार्थियों के सत्यापित परीक्षा परिणाम देखें।',sectionTitleEn:'Verified Results',sectionTitleHi:'सत्यापित परिणाम',sectionTextEn:'Only verified examination records will be published.',sectionTextHi:'केवल सत्यापित परीक्षा रिकॉर्ड ही प्रकाशित होंगे।',visible:true,custom:false },
  { id:'about',path:'/about/',labelEn:'About Teacher',labelHi:'शिक्षक परिचय',titleEn:'About Educator – Krishan Kumar (Krishan Sir)',titleHi:'शिक्षक परिचय – श्री कृष्ण कुमार (कृष्ण सर)',badgeEn:'Verified Govt Educator',badgeHi:'प्रमाणित सरकारी शिक्षक',subtitleEn:'TGT Social Science at Government Girls High School (GGHS), Dhanger, Fatehabad (Haryana). Educational credentials, teaching journey, and mission.',subtitleHi:'टीजीटी सामाजिक विज्ञान, राजकीय कन्या उच्च विद्यालय (GGHS), ढांगर, फतेहाबाद (हरियाणा)। शैक्षणिक योग्यताएं एवं शिक्षण अनुभव।',sectionTitleEn:'Meet Your Teacher',sectionTitleHi:'अपने शिक्षक से मिलें',sectionTextEn:'Teacher profile, qualifications and teaching experience.',sectionTextHi:'शिक्षक परिचय, योग्यताएँ और शिक्षण अनुभव।',visible:true,custom:false },
  { id:'contact',path:'/contact/',labelEn:'Contact',labelHi:'संपर्क',titleEn:'Contact & Student Doubt Clearance Desk',titleHi:'संपर्क एवं विद्यार्थी शंका समाधान केंद्र',badgeEn:'Doubt Desk & School Contact',badgeHi:'शंका समाधान व स्कूल संपर्क',subtitleEn:'Submit your academic questions directly to Krishan Sir, view school location at GGHS Dhanger, and read student FAQs.',subtitleHi:'अपने शैक्षणिक प्रश्न सीधे कृष्ण सर से पूछें, विद्यालय का पता देखें और महत्वपूर्ण प्रश्नोत्तर पढ़ें।',sectionTitleEn:'Ask a Question or Send Feedback',sectionTitleHi:'प्रश्न पूछें अथवा सुझाव भेजें',sectionTextEn:'Submit academic queries and feedback.',sectionTextHi:'शैक्षणिक प्रश्न और सुझाव भेजें।',visible:true,custom:false },
];

type BuilderTab = 'pages' | 'content' | 'branding' | 'theme' | 'frames';
type Language = 'en' | 'hi';

const readImage = (file: File): Promise<string> => new Promise((resolve, reject) => {
  if (!file.type.startsWith('image/')) { reject(new Error('कृपया image file चुनें।')); return; }
  if (file.size > 5 * 1024 * 1024) { reject(new Error('Image का आकार 5 MB से कम रखें।')); return; }
  const reader = new FileReader();
  reader.onload = () => typeof reader.result === 'string' ? resolve(reader.result) : reject(new Error('Image preview नहीं बन सका।'));
  reader.onerror = () => reject(new Error('Image पढ़ने में समस्या हुई।'));
  reader.readAsDataURL(file);
});

export const AdminSiteWideBuilder: React.FC<{ onBack?: () => void }> = ({ onBack }) => {
  const [initialDraft] = useState<BuilderDraft | null>(() => loadBuilderDraft());
  const [tab,setTab] = useState<BuilderTab>('pages');
  const [lang,setLang] = useState<Language>('en');
  const [pages,setPages] = useState<SitePage[]>(initialDraft?.pages ?? starterPages);
  const [selectedId,setSelectedId] = useState('home');
  const [newLabel,setNewLabel] = useState('');
  const [newPath,setNewPath] = useState('');
  const [newPageError,setNewPageError] = useState('');
  const [draftMessage,setDraftMessage] = useState(initialDraft ? 'Saved local draft restored from this browser.' : '');
  const [logo,setLogo] = useState('');
  const [teacherPhoto,setTeacherPhoto] = useState('');
  const [pageImage,setPageImage] = useState('');
  const [logoName,setLogoName] = useState('');
  const [photoName,setPhotoName] = useState('');
  const [pageImageName,setPageImageName] = useState('');
  const [mediaError,setMediaError] = useState('');
  const [theme,setTheme] = useState(initialDraft?.theme ?? defaultTheme);
  const [font,setFont] = useState(initialDraft?.font ?? 'system');
  const [headingScale,setHeadingScale] = useState(initialDraft?.headingScale ?? 38);
  const [cardFrame,setCardFrame] = useState(initialDraft?.cardFrame ?? 'shadow');
  const [textFrame,setTextFrame] = useState(initialDraft?.textFrame ?? 'soft');
  const [imageFrame,setImageFrame] = useState(initialDraft?.imageFrame ?? 'rounded');
  const [cornerRadius,setCornerRadius] = useState(initialDraft?.cornerRadius ?? 18);
  const [borderWidth,setBorderWidth] = useState(initialDraft?.borderWidth ?? 1);
  const [shadow,setShadow] = useState(initialDraft?.shadow ?? true);
  const [previewMode,setPreviewMode] = useState<'desktop'|'mobile'>('desktop');
  const [previewSource,setPreviewSource] = useState<'draft'|'live'>('draft');
  const [previewFrameReady,setPreviewFrameReady] = useState(false);
  const [selectedLiveElement,setSelectedLiveElement] = useState<{ tag: string; text: string } | null>(null);
  const livePreviewFrameRef = useRef<HTMLIFrameElement>(null);
  const selectedLiveElementRef = useRef<HTMLElement | null>(null);
  const previousOutlineRef = useRef('');
  const selected = pages.find((page) => page.id === selectedId) ?? pages[0];
  const livePage = getVisualEditorPage(selected.id);
  const livePreviewPath = livePage ? (livePage.path === '/' ? import.meta.env.BASE_URL : `${import.meta.env.BASE_URL}${livePage.path.slice(1)}`) : '';
  const [pageSearch,setPageSearch] = useState('');
  const filteredPages = useMemo(() => pages.filter(p => (p.labelEn+' '+p.labelHi+' '+p.path).toLowerCase().includes(pageSearch.toLowerCase())),[pages,pageSearch]);

  useEffect(() => {
    if (previewSource !== 'live' || !previewFrameReady || !livePage?.editable) return;
    const doc = livePreviewFrameRef.current?.contentDocument;
    if (!doc) return;
    const handleSelect = (event: MouseEvent) => {
      const target = event.target instanceof HTMLElement ? event.target : null;
      const candidate = target?.closest<HTMLElement>('h1,h2,h3,h4,p,li');
      if (!candidate || candidate.children.length > 0 || !candidate.textContent?.trim()) return;
      if (candidate.closest('form,button,a,[role="button"],[data-visual-editor-protected]')) return;
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      if (selectedLiveElementRef.current) selectedLiveElementRef.current.style.outline = previousOutlineRef.current;
      previousOutlineRef.current = candidate.style.outline;
      candidate.style.outline = '2px solid #f59e0b';
      selectedLiveElementRef.current = candidate;
      setSelectedLiveElement({ tag: candidate.tagName.toLowerCase(), text: candidate.textContent ?? '' });
    };
    doc.addEventListener('click', handleSelect, true);
    return () => {
      doc.removeEventListener('click', handleSelect, true);
      if (selectedLiveElementRef.current) selectedLiveElementRef.current.style.outline = previousOutlineRef.current;
      selectedLiveElementRef.current = null;
    };
  }, [previewSource, previewFrameReady, livePage?.editable, selectedId]);

  const updatePage = (key: keyof SitePage, value: string | boolean) => {
    setPages(current => current.map(p => p.id === selectedId ? { ...p, [key]: value } : p));
    setDraftMessage('Unsaved UI draft · Save Local Draft दबाएँ');
  };
  const updateBlock = (blockId: string, key: keyof Omit<PageBlock, 'id'>, value: string) => {
    setPages(current => current.map(page => page.id === selectedId
      ? { ...page, blocks: blocksForPage(page).map(block => block.id === blockId ? { ...block, [key]: value } : block) }
      : page));
    setDraftMessage('Unsaved UI draft · Save Local Draft दबाएँ');
  };
  const addContentBlock = () => {
    const block: PageBlock = {
      id: 'section-' + Date.now(),
      titleEn: 'New Content Section',
      titleHi: 'नया सामग्री अनुभाग',
      textEn: 'Add your content here.',
      textHi: 'यहाँ अपनी सामग्री जोड़ें।',
    };
    setPages(current => current.map(page => page.id === selectedId
      ? { ...page, blocks: [...blocksForPage(page), block] }
      : page));
    setDraftMessage('New content block added to the local draft.');
  };
  const addPage = () => {
    const label = newLabel.trim();
    const slug = newPath.trim().toLowerCase().replace(/^\/+|\/+$/g,'').replace(/[^a-z0-9-]+/g,'-').replace(/-+/g,'-');
    if (!label) { setNewPageError('नए Page का नाम लिखें।'); return; }
    if (!slug) { setNewPageError('Page URL slug लिखें।'); return; }
    if (pages.some(p => p.path.replace(/^\/+|\/+$/g,'') === slug)) { setNewPageError('यह Page URL पहले से मौजूद है।'); return; }
    const id = 'draft-'+slug;
    const page: SitePage = { id,path:'/'+slug+'/',labelEn:label,labelHi:label,titleEn:label,titleHi:label,badgeEn:'New Page',badgeHi:'नया पृष्ठ',subtitleEn:'Add a page description here.',subtitleHi:'यहाँ पृष्ठ का विवरण जोड़ें।',sectionTitleEn:'New Section',sectionTitleHi:'नया अनुभाग',sectionTextEn:'Add your content here.',sectionTextHi:'यहाँ अपनी सामग्री जोड़ें।',blocks:[],visible:true,custom:true };
    setPages(current => [...current,page]);
    setSelectedId(id);
    setNewLabel('');
    setNewPath('');
    setNewPageError('');
    setTab('content');
    setDraftMessage('New page draft created · अभी actual website route नहीं बना है');
  };
  const upload = async (file: File | undefined, type: 'logo' | 'photo' | 'pageImage') => {
    if (!file) return;
    try {
      const data = await readImage(file);
      if (type === 'logo') { setLogo(data); setLogoName(file.name); }
      else if (type === 'photo') { setTeacherPhoto(data); setPhotoName(file.name); }
      else { setPageImage(data); setPageImageName(file.name); }
      setMediaError('');
      setDraftMessage('Local media preview selected · cloud upload अभी disabled है');
    } catch (error) { setMediaError(error instanceof Error ? error.message : 'Image preview विफल रहा।'); }
  };
  const saveDraftPreview = () => {
    try {
      const payload: BuilderDraft = {
        version: 1, savedAt: new Date().toISOString(), pages, theme, font, headingScale,
        cardFrame, textFrame, imageFrame, cornerRadius, borderWidth, shadow,
      };
      window.localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(payload));
      setDraftMessage('Draft saved on this browser · Database/Live website unchanged.');
    } catch {
      setDraftMessage('Browser storage full or unavailable. Reduce draft content and try again.');
    }
  };
  const resetLocalDraft = () => {
    try { window.localStorage.removeItem(DRAFT_STORAGE_KEY); } catch { /* local storage may be unavailable */ }
    setPages(starterPages); setSelectedId('home'); setTheme(defaultTheme); setFont('system');
    setHeadingScale(38); setCardFrame('shadow'); setTextFrame('soft'); setImageFrame('rounded');
    setCornerRadius(18); setBorderWidth(1); setShadow(true);
    setLogo(''); setTeacherPhoto(''); setPageImage('');
    setLogoName(''); setPhotoName(''); setPageImageName('');
    setDraftMessage('Local draft cleared. Original website content remains unchanged.');
  };

  const tabs: { id:BuilderTab; label:string; icon:React.ElementType }[] = [
    {id:'pages',label:'Pages & Navigation',icon:PanelsTopLeft},
    {id:'content',label:'Page Content',icon:FileText},
    {id:'branding',label:'Logo & Photos',icon:ImageIcon},
    {id:'theme',label:'Global Theme',icon:Palette},
    {id:'frames',label:'Frames & Typography',icon:Type},
  ];
  const pageTitle = lang === 'en' ? selected.titleEn : selected.titleHi;
  const pageSubtitle = lang === 'en' ? selected.subtitleEn : selected.subtitleHi;
  const headingFont = font === 'serif' ? 'Georgia, serif' : font === 'rounded' ? 'Trebuchet MS, sans-serif' : 'Arial, sans-serif';
  const frameStyle = cardFrame === 'shadow' ? '0 10px 28px rgba(15,40,70,.10)' : cardFrame === 'border' ? 'none' : 'none';
  const textBoxStyle = textFrame === 'soft' ? theme.background : textFrame === 'outline' ? '#ffffff' : '#ffffff';
  const imageRadius = imageFrame === 'circle' ? '9999px' : imageFrame === 'square' ? '4px' : imageFrame === 'framed' ? '16px' : '28px';
  const imageBorder = imageFrame === 'framed' ? '7px solid white' : imageFrame === 'outline' ? '2px solid '+theme.accent : '0px solid transparent';

  return (
    <div className="space-y-5">
      <div className="flex flex-col justify-between gap-3 xl:flex-row xl:items-end">
        <div><div className="flex items-center gap-2 text-[10px] font-extrabold uppercase tracking-[.16em] text-sky-700"><Globe className="h-3.5 w-3.5"/>Full Website Builder</div><h2 className="mt-1 text-2xl font-extrabold text-slate-900">All Pages · Branding · Design System</h2><p className="mt-1 max-w-3xl text-sm leading-6 text-slate-500">सभी मौजूदा Pages, नए Page Drafts, Logo/Photos, global theme, typography और हर प्रकार के visual frames का नियंत्रण।</p></div>
        <div className="flex flex-wrap gap-2">{onBack && <button onClick={onBack} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700">← Website Management</button>}<span className="inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-3 py-2 text-[10px] font-bold text-amber-800"><LockKeyhole className="h-3.5 w-3.5"/>Design Draft · No Live Changes</span></div>
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.2fr)_minmax(320px,.8fr)]">
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex gap-1 overflow-x-auto border-b border-slate-100 px-3 pt-2">{tabs.map(t => {const Icon=t.icon;return <button key={t.id} onClick={()=>setTab(t.id)} className={`inline-flex shrink-0 items-center gap-2 rounded-t-lg px-3 py-3 text-xs font-bold ${tab===t.id?'border-b-2 border-sky-800 bg-sky-50 text-sky-900':'text-slate-500 hover:bg-slate-50'}`}><Icon className="h-4 w-4"/>{t.label}</button>;})}</div>
          <div className="space-y-4 p-4 sm:p-5">
            {tab==='pages' && <>
              <div className="flex items-center justify-between gap-2"><div><h3 className="text-sm font-extrabold text-slate-900">Website Pages & Navigation</h3><p className="mt-1 text-[11px] text-slate-500">{pages.filter(p=>!p.custom).length} existing pages · {pages.filter(p=>p.custom).length} new drafts</p></div><span className="rounded-lg bg-slate-100 px-2.5 py-1 text-[10px] font-bold text-slate-600">{pages.length} PAGES</span></div>
              <input value={pageSearch} onChange={e=>setPageSearch(e.target.value)} placeholder="Search pages..." className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-sky-500"/>
              <div className="grid gap-2 sm:grid-cols-2">{filteredPages.map(p=><button key={p.id} onClick={()=>{setSelectedId(p.id);setTab('content');}} className={`flex items-center gap-3 rounded-xl border p-3 text-left ${selectedId===p.id?'border-sky-300 bg-sky-50':'border-slate-200 hover:bg-slate-50'}`}><span className="grid h-9 w-9 place-items-center rounded-lg bg-slate-100 text-slate-700"><FileText className="h-4 w-4"/></span><span className="min-w-0 flex-1"><span className="block truncate text-xs font-bold text-slate-800">{lang==='en'?p.labelEn:p.labelHi}</span><span className="block truncate text-[10px] text-slate-500">{p.path}{p.custom?' · Draft':''}</span></span><span className={`h-2.5 w-2.5 rounded-full ${p.visible?'bg-emerald-500':'bg-slate-300'}`}/></button>)}</div>
              <div className="rounded-xl border border-dashed border-sky-200 bg-sky-50/70 p-4"><div className="mb-3 flex items-center gap-2 text-sm font-extrabold text-sky-950"><FilePlus2 className="h-4 w-4"/>Add New Page (Draft)</div><div className="grid gap-3 sm:grid-cols-2"><label className="block"><span className="mb-1 block text-[11px] font-bold text-slate-700">Page Name</span><input value={newLabel} onChange={e=>setNewLabel(e.target.value)} placeholder="e.g. Scholarship Corner" className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm"/></label><label className="block"><span className="mb-1 block text-[11px] font-bold text-slate-700">URL slug</span><input value={newPath} onChange={e=>setNewPath(e.target.value)} placeholder="scholarship-corner" className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm"/></label></div>{newPageError&&<p className="mt-2 text-xs font-semibold text-rose-700">{newPageError}</p>}<button onClick={addPage} className="mt-3 inline-flex items-center gap-2 rounded-xl bg-sky-900 px-4 py-2.5 text-xs font-bold text-white"><Plus className="h-4 w-4"/>Create Page Draft</button><p className="mt-2 text-[10px] leading-5 text-sky-900/75">यह page इस Admin editor में draft के रूप में बनेगा। Actual website navigation/route में जोड़ना approval और content storage integration के बाद होगा।</p></div>
              <div className="rounded-xl border border-slate-200 p-3 text-xs leading-5 text-slate-600">Existing pages यहाँ सुरक्षित रखे गए हैं। किसी existing page को delete करने का विकल्प नहीं है। Navigation visibility का वास्तविक असर publish workflow connect होने के बाद ही होगा।</div>
            </>}

            {tab==='content' && <>
              <div className="flex flex-wrap items-center justify-between gap-2"><div><h3 className="text-sm font-extrabold text-slate-900">Edit Page Content</h3><p className="mt-1 text-[11px] text-slate-500">{selected.path} {selected.custom?'· New Page Draft':'· Existing Page'}</p></div><div className="inline-flex rounded-xl bg-slate-100 p-1"><button onClick={()=>setLang('en')} className={`rounded-lg px-3 py-1.5 text-xs font-bold ${lang==='en'?'bg-white text-sky-900 shadow-sm':'text-slate-500'}`}>English</button><button onClick={()=>setLang('hi')} className={`rounded-lg px-3 py-1.5 text-xs font-bold ${lang==='hi'?'bg-white text-sky-900 shadow-sm':'text-slate-500'}`}>हिन्दी</button></div></div>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block"><span className="mb-1 block text-[11px] font-bold text-slate-700">Navigation Label</span><input value={lang==='en'?selected.labelEn:selected.labelHi} onChange={e=>updatePage(lang==='en'?'labelEn':'labelHi',e.target.value)} className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm"/></label>
                <label className="block"><span className="mb-1 block text-[11px] font-bold text-slate-700">Page Badge</span><input value={lang==='en'?selected.badgeEn:selected.badgeHi} onChange={e=>updatePage(lang==='en'?'badgeEn':'badgeHi',e.target.value)} className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm"/></label>
              </div>
              <label className="block"><span className="mb-1 block text-[11px] font-bold text-slate-700">Page Heading</span><textarea rows={2} value={lang==='en'?selected.titleEn:selected.titleHi} onChange={e=>updatePage(lang==='en'?'titleEn':'titleHi',e.target.value)} className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm"/></label>
              <label className="block"><span className="mb-1 block text-[11px] font-bold text-slate-700">Subtitle / Intro Text</span><textarea rows={3} value={lang==='en'?selected.subtitleEn:selected.subtitleHi} onChange={e=>updatePage(lang==='en'?'subtitleEn':'subtitleHi',e.target.value)} className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm leading-6"/></label>
              <div className="rounded-xl border border-slate-200 p-3"><div className="mb-3 text-xs font-extrabold text-slate-800">Content Section 01</div><label className="mb-3 block"><span className="mb-1 block text-[11px] font-bold text-slate-700">Section Heading</span><input value={lang==='en'?selected.sectionTitleEn:selected.sectionTitleHi} onChange={e=>updatePage(lang==='en'?'sectionTitleEn':'sectionTitleHi',e.target.value)} className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm"/></label><label className="block"><span className="mb-1 block text-[11px] font-bold text-slate-700">Section Text</span><textarea rows={3} value={lang==='en'?selected.sectionTextEn:selected.sectionTextHi} onChange={e=>updatePage(lang==='en'?'sectionTextEn':'sectionTextHi',e.target.value)} className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm leading-6"/></label></div>
              <div className="space-y-3">
                {blocksForPage(selected).map((block,index)=><div key={block.id} className="rounded-xl border border-slate-200 p-3">
                  <div className="mb-3 flex items-center justify-between"><span className="text-xs font-extrabold text-slate-800">Additional Content Section {String(index+2).padStart(2,'0')}</span><span className="rounded bg-slate-100 px-2 py-1 text-[9px] font-bold text-slate-500">Draft block</span></div>
                  <label className="mb-3 block"><span className="mb-1 block text-[11px] font-bold text-slate-700">Section Heading</span><input value={lang==='en'?block.titleEn:block.titleHi} onChange={e=>updateBlock(block.id,lang==='en'?'titleEn':'titleHi',e.target.value)} className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm"/></label>
                  <label className="block"><span className="mb-1 block text-[11px] font-bold text-slate-700">Section Text</span><textarea rows={3} value={lang==='en'?block.textEn:block.textHi} onChange={e=>updateBlock(block.id,lang==='en'?'textEn':'textHi',e.target.value)} className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm leading-6"/></label>
                </div>)}
                <button onClick={addContentBlock} className="inline-flex items-center gap-2 rounded-xl border border-dashed border-sky-300 bg-sky-50 px-4 py-2.5 text-xs font-bold text-sky-900 hover:bg-sky-100"><Plus className="h-4 w-4"/>Add Content Section</button>
              </div>
              <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-slate-50 p-3"><label className="flex items-center gap-2 text-xs font-bold text-slate-700"><input type="checkbox" checked={selected.visible} onChange={e=>updatePage('visible',e.target.checked)} className="h-4 w-4 accent-sky-800"/>Include in Navigation</label><span className="text-[10px] text-slate-500">Local draft only</span></div>
            </>}

            {tab==='branding' && <>
              <div><h3 className="text-sm font-extrabold text-slate-900">Logo & Photo Manager</h3><p className="mt-1 text-[11px] leading-5 text-slate-500">PNG, JPG, WEBP और SVG preview (image format). Selected files केवल browser में preview होंगे; cloud पर upload नहीं होंगे।</p></div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-xl border border-slate-200 p-4"><div className="mb-3 flex items-center gap-2 text-xs font-extrabold text-slate-800"><ImageIcon className="h-4 w-4"/>Website Logo</div><div className="mb-3 grid h-28 place-items-center rounded-xl bg-slate-50 p-3"><img src={logo||`${import.meta.env.BASE_URL}images/file_0000000037ec8208af2a0ed280e2faf8.png`} alt="Logo preview" className="max-h-full max-w-full object-contain"/></div><label className="flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-slate-200 px-3 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50"><Upload className="h-4 w-4"/>Choose Logo<input type="file" accept="image/*" className="hidden" onChange={e=>void upload(e.target.files?.[0],'logo')}/></label>{logoName&&<p className="mt-2 truncate text-[10px] text-emerald-700">{logoName} · local preview</p>}</div>
                <div className="rounded-xl border border-slate-200 p-4"><div className="mb-3 flex items-center gap-2 text-xs font-extrabold text-slate-800"><ImageIcon className="h-4 w-4"/>Teacher / Hero Photo</div><div className="mb-3 grid h-28 place-items-center overflow-hidden rounded-xl bg-slate-50"><img src={teacherPhoto||`${import.meta.env.BASE_URL}images/krishan-sir.png`} alt="Teacher image preview" className="h-full w-full object-cover"/></div><label className="flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-slate-200 px-3 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50"><Upload className="h-4 w-4"/>Choose Photo<input type="file" accept="image/*" className="hidden" onChange={e=>void upload(e.target.files?.[0],'photo')}/></label>{photoName&&<p className="mt-2 truncate text-[10px] text-emerald-700">{photoName} · local preview</p>}</div>
                <div className="rounded-xl border border-slate-200 p-4"><div className="mb-3 flex items-center gap-2 text-xs font-extrabold text-slate-800"><ImageIcon className="h-4 w-4"/>Selected Page Cover / Banner</div><div className="mb-3 grid h-28 place-items-center overflow-hidden rounded-xl bg-slate-50"><img src={pageImage||teacherPhoto||`${import.meta.env.BASE_URL}images/hero-background.webp`} alt="Page cover preview" className="h-full w-full object-cover"/></div><label className="flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-slate-200 px-3 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50"><Upload className="h-4 w-4"/>Choose Page Image<input type="file" accept="image/*" className="hidden" onChange={e=>void upload(e.target.files?.[0],'pageImage')}/></label>{pageImageName&&<p className="mt-2 truncate text-[10px] text-emerald-700">{pageImageName} · local preview</p>}</div>
              </div>
              {mediaError&&<p className="rounded-lg bg-rose-50 p-3 text-xs text-rose-700">{mediaError}</p>}
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs leading-5 text-amber-900">Logo/Photo को पूरे website में बदलने के लिए approved media storage और content publishing integration आवश्यक है। अभी original files untouched हैं।</div>
            </>}

            {tab==='theme' && <>
              <div><h3 className="text-sm font-extrabold text-slate-900">Global Theme Controls</h3><p className="mt-1 text-[11px] text-slate-500">यह palette preview सभी Admin preview sample elements पर लागू होगा।</p></div>
              <div className="grid gap-3 sm:grid-cols-2">{([{key:'primary',label:'Primary Colour'},{key:'accent',label:'Accent Colour'},{key:'background',label:'Page Background'},{key:'surface',label:'Card / Surface'},{key:'text',label:'Main Text'}] as const).map(item=><label key={item.key} className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 p-3"><span className="text-xs font-bold text-slate-700">{item.label}<span className="mt-1 block text-[10px] font-normal text-slate-500">{theme[item.key]}</span></span><input type="color" value={theme[item.key]} onChange={e=>setTheme(t=>({...t,[item.key]:e.target.value}))} className="h-9 w-12 cursor-pointer rounded border-0 bg-transparent"/></label>)}</div>
              <label className="block"><span className="mb-1.5 block text-xs font-bold text-slate-700">Website Font Family</span><select value={font} onChange={e=>setFont(e.target.value)} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm"><option value="system">Clean Sans</option><option value="rounded">Rounded Modern</option><option value="serif">Classic Serif</option></select></label>
              <label className="block"><span className="mb-2 block text-xs font-bold text-slate-700">Heading Size · {headingScale}px</span><input type="range" min="28" max="56" value={headingScale} onChange={e=>setHeadingScale(Number(e.target.value))} className="w-full accent-sky-800"/></label>
            </>}

            {tab==='frames' && <>
              <div><h3 className="text-sm font-extrabold text-slate-900">Text · Card · Photo Frame Controls</h3><p className="mt-1 text-[11px] leading-5 text-slate-500">पूरी website के card borders, image frames और text containers की style preview करें।</p></div>
              <label className="block"><span className="mb-1.5 block text-xs font-bold text-slate-700">Card Frame</span><select value={cardFrame} onChange={e=>setCardFrame(e.target.value)} className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm"><option value="shadow">Soft Shadow</option><option value="border">Clean Border</option><option value="flat">Flat / Minimal</option></select></label>
              <label className="block"><span className="mb-1.5 block text-xs font-bold text-slate-700">Text Frame</span><select value={textFrame} onChange={e=>setTextFrame(e.target.value)} className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm"><option value="soft">Soft Background</option><option value="outline">Outline Frame</option><option value="plain">Plain Text</option></select></label>
              <label className="block"><span className="mb-1.5 block text-xs font-bold text-slate-700">Photo Frame</span><select value={imageFrame} onChange={e=>setImageFrame(e.target.value)} className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm"><option value="rounded">Rounded</option><option value="square">Square</option><option value="circle">Circle</option><option value="framed">White Photo Frame</option><option value="outline">Accent Outline</option></select></label>
              <label className="block"><span className="mb-1.5 block text-xs font-bold text-slate-700">Corner Radius · {cornerRadius}px</span><input type="range" min="0" max="36" value={cornerRadius} onChange={e=>setCornerRadius(Number(e.target.value))} className="w-full accent-sky-800"/></label>
              <label className="block"><span className="mb-1.5 block text-xs font-bold text-slate-700">Border Width · {borderWidth}px</span><input type="range" min="0" max="4" value={borderWidth} onChange={e=>setBorderWidth(Number(e.target.value))} className="w-full accent-sky-800"/></label>
              <label className="flex items-center gap-2 text-xs font-bold text-slate-700"><input type="checkbox" checked={shadow} onChange={e=>setShadow(e.target.checked)} className="h-4 w-4 accent-sky-800"/>Enable soft shadows</label>
            </>}
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 bg-slate-50 px-4 py-3 sm:px-5"><div className="text-[10px] font-semibold text-slate-500">{draftMessage||'Preview draft · अभी save नहीं हुआ'}</div><div className="flex gap-2"><button onClick={resetLocalDraft} className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs font-bold text-slate-600"><RotateCcw className="h-3.5 w-3.5"/>Reset Local Draft</button><button onClick={saveDraftPreview} className="inline-flex items-center gap-1.5 rounded-xl bg-sky-900 px-3 py-2.5 text-xs font-bold text-white"><CheckCircle2 className="h-3.5 w-3.5"/>Save Local Draft</button></div></div>
        </section>

        <section className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2"><div><h3 className="text-sm font-extrabold text-slate-900">Website Design Preview</h3><p className="mt-1 text-[11px] text-slate-500">{previewSource==='live'?'Actual website route · Read-only preview':'Draft design sample · Local changes only'}</p></div><div className="flex flex-wrap items-center gap-2"><div className="inline-flex rounded-lg border border-slate-200 bg-white p-1"><button onClick={()=>setPreviewSource('draft')} className={`rounded px-2 py-1 text-[10px] font-bold ${previewSource==='draft'?'bg-sky-900 text-white':'text-slate-500'}`}>Draft</button><button onClick={()=>setPreviewSource('live')} disabled={!livePage} className={`rounded px-2 py-1 text-[10px] font-bold ${previewSource==='live'?'bg-sky-900 text-white':'text-slate-500'} disabled:opacity-40`}>Live Site</button></div><div className="inline-flex rounded-lg border border-slate-200 bg-white p-1"><button onClick={()=>setPreviewMode('desktop')} className={`inline-flex items-center gap-1 rounded px-2 py-1 text-[10px] font-bold ${previewMode==='desktop'?'bg-sky-900 text-white':'text-slate-500'}`}><Monitor className="h-3.5 w-3.5"/>Desktop</button><button onClick={()=>setPreviewMode('mobile')} className={`inline-flex items-center gap-1 rounded px-2 py-1 text-[10px] font-bold ${previewMode==='mobile'?'bg-sky-900 text-white':'text-slate-500'}`}><Smartphone className="h-3.5 w-3.5"/>Mobile</button></div></div></div>
          {previewSource==='live' ? <div className="space-y-2"><div className="flex items-start gap-2 rounded-xl border border-sky-200 bg-sky-50 p-3 text-[10px] leading-5 text-sky-950"><Eye className="mt-0.5 h-3.5 w-3.5 shrink-0"/><span><strong>Actual rendered page:</strong> {livePage?.label}. यह केवल वास्तविक वेबसाइट का read-only preview है; यहाँ किए गए local draft edits अभी live page में लागू नहीं होते। {livePage?.editable ? 'यह page Visual Editor में editable scope में है।' : 'यह route protected है; इसकी operational functionality editor से नहीं बदली जाएगी।'}</span></div><div style={{maxWidth:previewMode==='mobile'?'390px':'100%',height:previewMode==='mobile'?'700px':'760px',marginInline:'auto'}} className="overflow-hidden rounded-xl border border-slate-300 bg-white shadow-sm"><iframe key={selected.id} ref={livePreviewFrameRef} title={`Actual website preview: ${livePage?.label ?? selected.labelEn}`} src={livePreviewPath} onLoad={() => { setPreviewFrameReady(true); setSelectedLiveElement(null); }} className="h-full w-full border-0" loading="lazy" /></div>{livePage?.editable && <div className="rounded-xl border border-slate-200 bg-white p-3"><div className="flex items-center justify-between gap-2"><span className="text-[11px] font-extrabold text-slate-800">Click-to-Select Inspector</span><span className="text-[9px] text-slate-500">Preview only</span></div>{selectedLiveElement ? <><p className="mt-2 text-[10px] font-semibold text-sky-800">Selected: &lt;{selectedLiveElement.tag}&gt;</p><textarea rows={3} value={selectedLiveElement.text} onChange={e=>setSelectedLiveElement(current=>current?{...current,text:e.target.value}:current)} className="mt-2 w-full rounded-lg border border-slate-200 p-2 text-xs"/><button onClick={()=>{if(selectedLiveElementRef.current){selectedLiveElementRef.current.textContent=selectedLiveElement.text;setDraftMessage('Text changed in live preview only · अभी website या saved draft में बदलाव नहीं हुआ।');}}} className="mt-2 rounded-lg bg-sky-900 px-3 py-2 text-[10px] font-bold text-white">Apply to Preview</button></> : <p className="mt-2 text-[10px] leading-5 text-slate-500">वास्तविक page में किसी साधारण heading, paragraph या list text पर click करके उसे select करें। Buttons, forms और protected interactive elements select नहीं होंगे।</p>}</div>} </div> : <div style={{background:theme.background,fontFamily:headingFont,maxWidth:previewMode==='mobile'?'390px':'100%',marginInline:'auto',border:`${borderWidth}px solid ${cardFrame==='border'?theme.accent:'#dbe3ef'}`,borderRadius:cornerRadius,boxShadow:shadow&&cardFrame==='shadow'?frameStyle:'none'}} className="overflow-hidden"><div className="flex items-center justify-between gap-3 px-4 py-3" style={{background:theme.surface,borderBottom:`1px solid ${theme.accent}44`}}><div className="flex items-center gap-2"><img src={logo||`${import.meta.env.BASE_URL}images/file_0000000037ec8208af2a0ed280e2faf8.png`} alt="Brand logo" className="h-9 w-9 object-contain" style={{borderRadius:imageRadius,border:imageBorder}}/><div><div className="text-sm font-extrabold" style={{color:theme.primary}}>Krishan Sir</div><div className="text-[9px]" style={{color:theme.accent}}>Online Learning</div></div></div><span className="rounded-full px-2 py-1 text-[9px] font-bold" style={{background:theme.background,color:theme.primary}}>HI · EN</span></div>{pageImage && <img src={pageImage} alt="Selected page banner" className="h-28 w-full object-cover" style={{borderRadius:imageRadius,border:imageBorder}}/>}<div className="p-4 sm:p-5"><div className="mb-3 inline-flex rounded-full px-3 py-1 text-[9px] font-bold text-white" style={{background:theme.accent}}>{lang==='en'?selected.badgeEn:selected.badgeHi}</div><h4 className="font-extrabold leading-tight" style={{color:theme.primary,fontSize:headingScale}}>{pageTitle}</h4><p className="mt-3 text-xs leading-6" style={{color:theme.text}}>{pageSubtitle}</p><div className="mt-4 flex items-center gap-3"><img src={teacherPhoto||`${import.meta.env.BASE_URL}images/krishan-sir.png`} alt="Teacher" className="h-16 w-16 object-cover" style={{borderRadius:imageRadius,border:imageBorder}}/><div><div className="text-xs font-extrabold" style={{color:theme.primary}}>Krishan Kumar</div><div className="text-[10px]" style={{color:theme.text}}>TGT Social Science</div></div></div><div className="mt-4 p-3" style={{background:textBoxStyle,border:`${borderWidth}px solid ${theme.accent}55`,borderRadius:cornerRadius,boxShadow:shadow?frameStyle:'none'}}><h5 className="text-sm font-extrabold" style={{color:theme.primary}}>{lang==='en'?selected.sectionTitleEn:selected.sectionTitleHi}</h5><p className="mt-2 text-xs leading-5" style={{color:theme.text}}>{lang==='en'?selected.sectionTextEn:selected.sectionTextHi}</p></div>{blocksForPage(selected).map(block=><div key={block.id} className="mt-3 p-3" style={{background:textBoxStyle,border:`${borderWidth}px solid ${theme.accent}55`,borderRadius:cornerRadius,boxShadow:shadow?frameStyle:'none'}}><h5 className="text-sm font-extrabold" style={{color:theme.primary}}>{lang==='en'?block.titleEn:block.titleHi}</h5><p className="mt-2 text-xs leading-5" style={{color:theme.text}}>{lang==='en'?block.textEn:block.textHi}</p></div>)}</div><div className="px-4 py-3 text-center text-[9px] font-semibold text-white" style={{background:theme.primary}}>Learn · Practice · Improve · Succeed</div></div>}
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-3"><div className="flex items-center gap-2 text-[11px] font-extrabold text-amber-900"><LockKeyhole className="h-3.5 w-3.5"/>Safe Draft Mode</div><p className="mt-1 text-[10px] leading-5 text-amber-900/80">Text, page blocks और theme settings इस browser में Local Draft के रूप में save हो सकते हैं। Logo/Photo केवल current session में preview होते हैं। कोई Database write, cloud upload, website route change या Live publish नहीं होता।</p></div>
          <div className="rounded-xl border border-slate-200 bg-white p-3 text-[10px] leading-5 text-slate-500"><Eye className="mr-1 inline h-3.5 w-3.5"/>यह selected page के editable fields और content blocks का visual mockup है। Existing interactive areas (जैसे test engine, chapter lists, result checks) अपनी मौजूदा functionality में सुरक्षित हैं और अभी इस editor से replace नहीं होते।</div>
        </section>
      </div>
    </div>
  );
};
