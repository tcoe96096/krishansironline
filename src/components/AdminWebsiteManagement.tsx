import React, { useMemo, useState } from 'react';
import {
  Eye, Monitor, Smartphone, Save, RotateCcw, Send, Globe, Image,
  LayoutTemplate, Type, Palette, History, LockKeyhole, CheckCircle2,
  ChevronRight, Info, PanelsTopLeft
} from 'lucide-react';

type EditorTab = 'hero' | 'header' | 'sections' | 'design';
type LanguageTab = 'en' | 'hi';
type SectionKey = 'notices' | 'studentDashboard' | 'quickAccess' | 'pathways' | 'classes' | 'learningHubs' | 'teacher' | 'doubtDesk';

const initialSections: { key: SectionKey; title: string; description: string }[] = [
  { key: 'notices', title: 'Latest Announcements', description: 'Official updates and school notices' },
  { key: 'studentDashboard', title: 'Student Dashboard', description: 'Student shortcuts and learning progress entry' },
  { key: 'quickAccess', title: 'Quick Access', description: 'Tests, classes, materials and current affairs' },
  { key: 'pathways', title: 'Learning Pathways', description: 'Classes, Social Science, Constitution and competitive exams' },
  { key: 'classes', title: 'Class-wise Portal', description: 'Class 6 to 12 resource cards' },
  { key: 'learningHubs', title: 'Special Learning Hubs', description: 'Current affairs and competitive exam preparation' },
  { key: 'teacher', title: 'Meet Your Teacher', description: 'Teacher profile and academic qualifications' },
  { key: 'doubtDesk', title: 'Student Doubt Desk', description: 'Contact and academic support section' },
];

const palettes = {
  navy: { label: 'Navy + Teal', primary: '#0b3979', accent: '#078a8d', soft: '#eff6fb' },
  blue: { label: 'Royal Blue', primary: '#164e9b', accent: '#3b82f6', soft: '#eff6ff' },
  teal: { label: 'Deep Teal', primary: '#075b62', accent: '#0d9488', soft: '#ecfdf5' },
} as const;

type PaletteKey = keyof typeof palettes;

export const AdminWebsiteManagement: React.FC = () => {
  const [tab, setTab] = useState<EditorTab>('hero');
  const [language, setLanguage] = useState<LanguageTab>('en');
  const [previewMode, setPreviewMode] = useState<'desktop' | 'mobile'>('desktop');
  const [showPreview, setShowPreview] = useState(true);
  const [notice, setNotice] = useState('');
  const [draftLabel, setDraftLabel] = useState('Unsaved UI changes');
  const [palette, setPalette] = useState<PaletteKey>('navy');
  const [hero, setHero] = useState({
    eyebrowEn: 'FREE ONLINE LEARNING',
    eyebrowHi: 'निःशुल्क ऑनलाइन शिक्षा',
    welcomeEn: 'Welcome to',
    welcomeHi: 'आपका स्वागत है',
    titleEn: 'Krishan Sir Online Learning',
    titleHi: 'कृष्ण सर ऑनलाइन लर्निंग',
    descriptionEn: 'A dedicated digital learning platform designed to make quality education accessible, engaging and meaningful for every learner.',
    descriptionHi: 'प्रत्येक विद्यार्थी तक गुणवत्तापूर्ण शिक्षा को सरल, रोचक और प्रभावी रूप में पहुँचाने के उद्देश्य से विकसित एक समर्पित डिजिटल शिक्षण मंच।',
    secondaryEn: 'Explore bilingual study resources for Classes 6–12, Social Science, NCERT and HBSE, along with online tests, practice questions, current affairs and competitive exam preparation.',
    secondaryHi: 'यहाँ कक्षा 6–12, सामाजिक विज्ञान, NCERT एवं HBSE के लिए द्विभाषी अध्ययन सामग्री के साथ ऑनलाइन टेस्ट, अभ्यास प्रश्न, समसामयिक घटनाएँ और प्रतियोगी परीक्षाओं की तैयारी हेतु उपयोगी संसाधन उपलब्ध हैं।',
    taglineEn: 'Learn with Confidence. Prepare with Purpose. Achieve with Excellence.',
    taglineHi: 'आत्मविश्वास से सीखें। उद्देश्य के साथ तैयारी करें। उत्कृष्टता के साथ सफलता पाएँ।',
    primaryCtaEn: 'Explore Tests',
    primaryCtaHi: 'टेस्ट देखें',
    secondaryCtaEn: 'Study Materials',
    secondaryCtaHi: 'अध्ययन सामग्री',
  });
  const [header, setHeader] = useState({
    ticker: 'FREE Online Learning • Classes 6–12 • Competitive Exams',
    brand: 'Krishan Sir',
    subBrand: 'Online Learning',
    footer: 'Learn • Practice • Improve • Succeed',
  });
  const [sections, setSections] = useState<Record<SectionKey, boolean>>({
    notices: true, studentDashboard: true, quickAccess: true, pathways: true,
    classes: true, learningHubs: true, teacher: true, doubtDesk: true,
  });
  const currentPalette = palettes[palette];
  const title = language === 'en' ? hero.titleEn : hero.titleHi;
  const desc = language === 'en' ? hero.descriptionEn : hero.descriptionHi;
  const sectionCount = useMemo(() => Object.values(sections).filter(Boolean).length, [sections]);

  const updateHero = (key: keyof typeof hero, value: string) => {
    setHero((current) => ({ ...current, [key]: value }));
    setDraftLabel('Unsaved UI changes');
    setNotice('');
  };
  const updateHeader = (key: keyof typeof header, value: string) => {
    setHeader((current) => ({ ...current, [key]: value }));
    setDraftLabel('Unsaved UI changes');
    setNotice('');
  };
  const toggleSection = (key: SectionKey) => {
    setSections((current) => ({ ...current, [key]: !current[key] }));
    setDraftLabel('Unsaved UI changes');
    setNotice('');
  };
  const resetEditor = () => {
    setHero({
      eyebrowEn: 'FREE ONLINE LEARNING', eyebrowHi: 'निःशुल्क ऑनलाइन शिक्षा',
      welcomeEn: 'Welcome to', welcomeHi: 'आपका स्वागत है',
      titleEn: 'Krishan Sir Online Learning', titleHi: 'कृष्ण सर ऑनलाइन लर्निंग',
      descriptionEn: 'A dedicated digital learning platform designed to make quality education accessible, engaging and meaningful for every learner.',
      descriptionHi: 'प्रत्येक विद्यार्थी तक गुणवत्तापूर्ण शिक्षा को सरल, रोचक और प्रभावी रूप में पहुँचाने के उद्देश्य से विकसित एक समर्पित डिजिटल शिक्षण मंच।',
      secondaryEn: 'Explore bilingual study resources for Classes 6–12, Social Science, NCERT and HBSE, along with online tests, practice questions, current affairs and competitive exam preparation.',
      secondaryHi: 'यहाँ कक्षा 6–12, सामाजिक विज्ञान, NCERT एवं HBSE के लिए द्विभाषी अध्ययन सामग्री के साथ ऑनलाइन टेस्ट, अभ्यास प्रश्न, समसामयिक घटनाएँ और प्रतियोगी परीक्षाओं की तैयारी हेतु उपयोगी संसाधन उपलब्ध हैं।',
      taglineEn: 'Learn with Confidence. Prepare with Purpose. Achieve with Excellence.',
      taglineHi: 'आत्मविश्वास से सीखें। उद्देश्य के साथ तैयारी करें। उत्कृष्टता के साथ सफलता पाएँ।',
      primaryCtaEn: 'Explore Tests', primaryCtaHi: 'टेस्ट देखें',
      secondaryCtaEn: 'Study Materials', secondaryCtaHi: 'अध्ययन सामग्री',
    });
    setHeader({ ticker: 'FREE Online Learning • Classes 6–12 • Competitive Exams', brand: 'Krishan Sir', subBrand: 'Online Learning', footer: 'Learn • Practice • Improve • Succeed' });
    setSections({ notices: true, studentDashboard: true, quickAccess: true, pathways: true, classes: true, learningHubs: true, teacher: true, doubtDesk: true });
    setPalette('navy');
    setDraftLabel('Reset to current website content');
    setNotice('Editor को मौजूदा वेबसाइट के उपलब्ध content पर reset किया गया है। कोई Live बदलाव नहीं हुआ।');
  };

  const field = (label: string, value: string, onChange: (value: string) => void, multiline = false) => (
    <label className="block">
      <span className="mb-1.5 block text-xs font-bold text-slate-700">{label}</span>
      {multiline
        ? <textarea rows={3} value={value} onChange={(event) => onChange(event.target.value)} className="w-full resize-y rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm leading-6 text-slate-800 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-100" />
        : <input value={value} onChange={(event) => onChange(event.target.value)} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-100" />}
    </label>
  );

  const tabs: { id: EditorTab; label: string; icon: React.ElementType }[] = [
    { id: 'hero', label: 'Homepage Hero', icon: Type },
    { id: 'header', label: 'Header & Footer', icon: PanelsTopLeft },
    { id: 'sections', label: 'Homepage Sections', icon: LayoutTemplate },
    { id: 'design', label: 'Design Settings', icon: Palette },
  ];

  return (
    <div className="space-y-5">
      <div className="flex flex-col justify-between gap-3 xl:flex-row xl:items-end">
        <div>
          <div className="flex items-center gap-2 text-[10px] font-extrabold uppercase tracking-[.16em] text-sky-700"><Globe className="h-3.5 w-3.5" />Website Management</div>
          <h2 className="mt-1 text-2xl font-extrabold tracking-tight text-slate-900">Website Content Editor</h2>
          <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-500">Homepage, hero, announcements, teacher profile, header/footer और design settings का प्रबंधन। बदलाव अभी केवल इस Preview screen में दिखाई देंगे।</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-3 py-1.5 text-[10px] font-bold text-amber-800"><Info className="h-3.5 w-3.5" />Preview only · Not connected</span>
          <button onClick={() => { setShowPreview((value) => !value); setNotice(''); }} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50"><Eye className="h-4 w-4" />{showPreview ? 'Hide Preview' : 'Show Preview'}</button>
        </div>
      </div>

      <div className="grid gap-5 2xl:grid-cols-[minmax(0,1fr)_minmax(360px,.95fr)]">
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-4 py-4 sm:px-5">
            <div><h3 className="text-sm font-extrabold text-slate-900">Content Editor</h3><p className="mt-1 text-[11px] text-slate-500">मौजूदा वेबसाइट content के आधार पर editable preview</p></div>
            <div className="inline-flex rounded-xl bg-slate-100 p-1">
              <button onClick={() => setLanguage('en')} className={`rounded-lg px-3 py-1.5 text-xs font-bold ${language === 'en' ? 'bg-white text-sky-900 shadow-sm' : 'text-slate-500'}`}>English</button>
              <button onClick={() => setLanguage('hi')} className={`rounded-lg px-3 py-1.5 text-xs font-bold ${language === 'hi' ? 'bg-white text-sky-900 shadow-sm' : 'text-slate-500'}`}>हिन्दी</button>
            </div>
          </div>
          <div className="flex gap-1 overflow-x-auto border-b border-slate-100 px-3 pt-2">
            {tabs.map((item) => { const Icon = item.icon; return <button key={item.id} onClick={() => setTab(item.id)} className={`inline-flex shrink-0 items-center gap-2 rounded-t-lg px-3 py-3 text-xs font-bold transition ${tab === item.id ? 'border-b-2 border-sky-800 bg-sky-50 text-sky-900' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'}`}><Icon className="h-4 w-4" />{item.label}</button>; })}
          </div>

          <div className="space-y-4 p-4 sm:p-5">
            {tab === 'hero' && <>
              <div className="rounded-xl bg-sky-50 px-3 py-2 text-xs leading-5 text-sky-900">Hero content bilingual है। भाषा चुनकर उसी भाषा के text को edit करें; दूसरी भाषा का content सुरक्षित रहेगा।</div>
              {field('Top Label', language === 'en' ? hero.eyebrowEn : hero.eyebrowHi, (value) => updateHero(language === 'en' ? 'eyebrowEn' : 'eyebrowHi', value))}
              {field('Welcome Line', language === 'en' ? hero.welcomeEn : hero.welcomeHi, (value) => updateHero(language === 'en' ? 'welcomeEn' : 'welcomeHi', value))}
              {field('Main Heading', language === 'en' ? hero.titleEn : hero.titleHi, (value) => updateHero(language === 'en' ? 'titleEn' : 'titleHi', value))}
              {field('Description', language === 'en' ? hero.descriptionEn : hero.descriptionHi, (value) => updateHero(language === 'en' ? 'descriptionEn' : 'descriptionHi', value), true)}
              {field('Additional Description', language === 'en' ? hero.secondaryEn : hero.secondaryHi, (value) => updateHero(language === 'en' ? 'secondaryEn' : 'secondaryHi', value), true)}
              {field('Tagline', language === 'en' ? hero.taglineEn : hero.taglineHi, (value) => updateHero(language === 'en' ? 'taglineEn' : 'taglineHi', value))}
              <div className="grid gap-3 sm:grid-cols-2">
                {field('Primary Button', language === 'en' ? hero.primaryCtaEn : hero.primaryCtaHi, (value) => updateHero(language === 'en' ? 'primaryCtaEn' : 'primaryCtaHi', value))}
                {field('Secondary Button', language === 'en' ? hero.secondaryCtaEn : hero.secondaryCtaHi, (value) => updateHero(language === 'en' ? 'secondaryCtaEn' : 'secondaryCtaHi', value))}
              </div>
            </>}

            {tab === 'header' && <>
              <div className="rounded-xl bg-sky-50 px-3 py-2 text-xs leading-5 text-sky-900">Branding preview only. Logo/image file replacement और actual header navigation अभी connect नहीं हैं।</div>
              {field('Announcement Bar', header.ticker, (value) => updateHeader('ticker', value))}
              {field('Website Name', header.brand, (value) => updateHeader('brand', value))}
              {field('Brand Subtitle', header.subBrand, (value) => updateHeader('subBrand', value))}
              {field('Footer Tagline', header.footer, (value) => updateHeader('footer', value))}
              <div className="rounded-xl border border-dashed border-slate-200 p-4"><div className="flex items-center gap-2 text-xs font-bold text-slate-700"><Image className="h-4 w-4" />Logo & Teacher Image</div><p className="mt-1 text-xs leading-5 text-slate-500">वर्तमान वेबसाइट की logo और teacher image सुरक्षित रखी गई हैं। नया upload तब जोड़ा जाएगा जब approved file-storage workflow तैयार होगा।</p></div>
            </>}

            {tab === 'sections' && <>
              <div className="flex items-center justify-between rounded-xl bg-sky-50 px-3 py-2"><span className="text-xs font-bold text-sky-900">Homepage sections</span><span className="text-xs font-extrabold text-sky-900">{sectionCount} / {initialSections.length} visible</span></div>
              <p className="text-xs leading-5 text-slate-500">यहाँ section visibility बदलने से केवल साथ का local Preview बदलेगा। कोई section Live website से हटाया नहीं जाएगा।</p>
              <div className="space-y-2">{initialSections.map((item) => <label key={item.key} className="flex cursor-pointer items-center justify-between gap-3 rounded-xl border border-slate-100 px-3 py-3 hover:bg-slate-50"><span><span className="block text-xs font-bold text-slate-800">{item.title}</span><span className="mt-0.5 block text-[10px] text-slate-500">{item.description}</span></span><input type="checkbox" checked={sections[item.key]} onChange={() => toggleSection(item.key)} className="h-4 w-4 accent-sky-800" /></label>)}</div>
            </>}

            {tab === 'design' && <>
              <div><h4 className="text-xs font-bold text-slate-800">Colour Framework</h4><p className="mt-1 text-xs text-slate-500">एक palette चुनें; दाईं ओर preview में रंग बदलेंगे।</p></div>
              <div className="grid gap-3 sm:grid-cols-3">{(Object.keys(palettes) as PaletteKey[]).map((key) => <button key={key} onClick={() => { setPalette(key); setDraftLabel('Unsaved UI changes'); setNotice(''); }} className={`rounded-xl border p-3 text-left transition ${palette === key ? 'border-sky-700 bg-sky-50 ring-2 ring-sky-100' : 'border-slate-200 hover:bg-slate-50'}`}><span className="mb-2 flex gap-1"><span className="h-5 w-5 rounded-full" style={{ background: palettes[key].primary }} /><span className="h-5 w-5 rounded-full" style={{ background: palettes[key].accent }} /><span className="h-5 w-5 rounded-full border border-slate-200" style={{ background: palettes[key].soft }} /></span><span className="block text-xs font-bold text-slate-800">{palettes[key].label}</span></button>)}</div>
              <div className="rounded-xl border border-slate-200 p-4"><div className="flex items-center gap-2 text-xs font-bold text-slate-800"><Palette className="h-4 w-4" />Typography & Layout</div><p className="mt-1 text-xs leading-5 text-slate-500">Readable fonts, responsive spacing and mobile-first layout मौजूदा framework के अनुसार सुरक्षित रखे गए हैं। Advanced font upload और custom layout controls बाद के चरण में जुड़ेंगे।</p></div>
            </>}
          </div>

          <div className="flex flex-col gap-3 border-t border-slate-100 bg-slate-50 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
            <div className="flex items-center gap-2 text-[10px] font-semibold text-slate-500"><span className="h-2 w-2 rounded-full bg-amber-500" />{draftLabel}</div>
            <div className="flex flex-wrap gap-2">
              <button onClick={resetEditor} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-100"><RotateCcw className="h-3.5 w-3.5" />Reset</button>
              <button onClick={() => { setDraftLabel('Preview snapshot prepared · Not saved'); setNotice('यह केवल current preview session का snapshot है। Draft Database में save नहीं हुआ है और refresh पर reset हो जाएगा।'); }} className="inline-flex items-center gap-2 rounded-xl bg-sky-900 px-3 py-2.5 text-xs font-bold text-white hover:bg-sky-800"><Save className="h-3.5 w-3.5" />Save Draft Preview</button>
              <button disabled title="Approval workflow backend अभी connect नहीं है" className="inline-flex cursor-not-allowed items-center gap-2 rounded-xl bg-slate-200 px-3 py-2.5 text-xs font-bold text-slate-500"><Send className="h-3.5 w-3.5" />Submit for Approval</button>
            </div>
          </div>
          {notice && <p role="status" className="border-t border-sky-100 bg-sky-50 px-5 py-3 text-xs leading-5 text-sky-900">{notice}</p>}
        </section>

        {showPreview && <section className="min-w-0 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2"><div><h3 className="text-sm font-extrabold text-slate-900">Live Website Preview</h3><p className="mt-1 text-[11px] text-slate-500">यह preview editor की current values दिखाता है, Live website नहीं बदलता।</p></div><div className="inline-flex rounded-xl border border-slate-200 bg-white p-1"><button onClick={() => setPreviewMode('desktop')} className={`rounded-lg p-2 ${previewMode === 'desktop' ? 'bg-sky-900 text-white' : 'text-slate-500'}`} title="Desktop preview"><Monitor className="h-4 w-4" /></button><button onClick={() => setPreviewMode('mobile')} className={`rounded-lg p-2 ${previewMode === 'mobile' ? 'bg-sky-900 text-white' : 'text-slate-500'}`} title="Mobile preview"><Smartphone className="h-4 w-4" /></button></div></div>
          <div className={`mx-auto overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-all ${previewMode === 'mobile' ? 'max-w-[390px]' : 'w-full'}`}>
            <div className="px-3 py-2 text-center text-[9px] font-bold text-amber-300" style={{ background: '#0b0f18' }}>{header.ticker}</div>
            <div className="flex items-center justify-between gap-2 border-b px-4 py-3" style={{ background: currentPalette.soft, borderColor: '#dce7f2' }}><div><p className="text-sm font-extrabold" style={{ color: currentPalette.primary }}>{header.brand}</p><p className="text-[9px] font-bold" style={{ color: currentPalette.accent }}>{header.subBrand}</p></div><span className="rounded-full bg-white px-3 py-1 text-[9px] font-bold text-slate-600">Home · Classes · Tests</span></div>
            <div className={`grid gap-3 p-4 ${previewMode === 'mobile' ? 'grid-cols-1' : 'md:grid-cols-[1.25fr_.75fr]'}`} style={{ background: currentPalette.soft }}>
              <div className="space-y-2">
                <span className="inline-flex rounded-full border border-slate-200 bg-white px-3 py-1 text-[9px] font-extrabold" style={{ color: currentPalette.primary }}>{language === 'en' ? hero.eyebrowEn : hero.eyebrowHi}</span>
                <p className="pt-1 text-sm font-extrabold" style={{ color: currentPalette.primary }}>{language === 'en' ? hero.welcomeEn : hero.welcomeHi}</p>
                <h4 className="text-2xl font-extrabold leading-tight" style={{ color: currentPalette.primary }}>{title}</h4>
                <div className="h-1 w-20 rounded-full" style={{ background: currentPalette.accent }} />
                <p className="text-xs leading-5 text-slate-700">{desc}</p>
                <p className="text-[10px] leading-5 text-slate-600">{language === 'en' ? hero.secondaryEn : hero.secondaryHi}</p>
                <p className="text-[10px] font-bold" style={{ color: currentPalette.primary }}>{language === 'en' ? hero.taglineEn : hero.taglineHi}</p>
                <div className="flex flex-wrap gap-2"><span className="rounded-lg px-3 py-2 text-[10px] font-bold text-white" style={{ background: currentPalette.primary }}>{language === 'en' ? hero.primaryCtaEn : hero.primaryCtaHi}</span><span className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-[10px] font-bold" style={{ color: currentPalette.primary }}>{language === 'en' ? hero.secondaryCtaEn : hero.secondaryCtaHi}</span></div>
              </div>
              <div className="flex min-h-[170px] items-center justify-center rounded-xl border border-white bg-gradient-to-br from-sky-100 to-slate-200 p-4 text-center"><div><div className="mx-auto grid h-12 w-12 place-items-center rounded-full text-white" style={{ background: currentPalette.primary }}><Globe className="h-6 w-6" /></div><p className="mt-3 text-xs font-extrabold text-slate-700">Krishan Kumar</p><p className="text-[9px] text-slate-500">TGT Social Science</p><p className="mt-2 text-[9px] text-slate-400">Existing teacher image remains unchanged</p></div></div>
            </div>
            <div className="space-y-2 bg-white p-4"><div className="flex items-center justify-between"><h5 className="text-xs font-extrabold text-slate-900">Homepage Sections</h5><span className="text-[9px] font-semibold text-slate-400">{sectionCount} visible</span></div>{initialSections.filter((item) => sections[item.key]).map((item) => <div key={item.key} className="flex items-center gap-2 rounded-lg border border-slate-100 px-3 py-2"><span className="h-2 w-2 rounded-full" style={{ background: currentPalette.accent }} /><span className="text-[10px] font-semibold text-slate-700">{item.title}</span><ChevronRight className="ml-auto h-3 w-3 text-slate-300" /></div>)}</div>
            <div className="px-4 py-3 text-center text-[9px] font-semibold text-white" style={{ background: currentPalette.primary }}>{header.footer}</div>
          </div>
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-3"><div className="flex items-center gap-2 text-[11px] font-extrabold text-amber-900"><LockKeyhole className="h-3.5 w-3.5" />Publishing is locked</div><p className="mt-1 text-[10px] leading-5 text-amber-900/80">Live website पर बदलाव भेजने, Version History लिखने या approval submit करने की सुविधा अभी connect नहीं है।</p></div>
          <div className="rounded-xl border border-slate-200 bg-white p-4"><div className="flex items-center gap-2 text-xs font-extrabold text-slate-800"><History className="h-4 w-4 text-slate-500" />Version History</div><p className="mt-1 text-[11px] leading-5 text-slate-500">अभी कोई version record उपलब्ध नहीं है। यह panel backend approval और versioning integration के बाद सक्रिय होगा।</p><div className="mt-3 flex items-center gap-2 text-[10px] font-semibold text-slate-400"><CheckCircle2 className="h-3.5 w-3.5" />No existing version was changed</div></div>
        </section>}
      </div>
    </div>
  );
};
