import React, { useEffect, useState } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { TEACHER_INFO } from '../data/portalData';
import { BookOpen, ArrowUp, Mail, ShieldCheck } from 'lucide-react';
import { getPublishedWebsiteConfig } from '../services/siteConfigService';
import { learningLinks, infoLinks, publicHref, SUPPORT_EMAIL } from '../data/publicInfo';

interface FooterProps { onNavigate: (section: string) => void; }
const groups = [
  {en:'Quick Links',hi:'त्वरित लिंक',ids:['home','classes','tests','materials','exams','affairs','polity']},
  {en:'Student & Teacher Support',hi:'विद्यार्थी एवं शिक्षक सहायता',ids:['studentDashboard','teacher','results','help','examPolicy','feedback','grievance']},
  {en:'Legal & Privacy',hi:'कानूनी एवं गोपनीयता',ids:['privacy','terms','childSafety','disclaimer','copyright','cookies','dataDeletion']},
  {en:'About & Contact',hi:'परिचय एवं संपर्क',ids:['about','contact','accessibility','sitemap']},
];
export const Footer: React.FC<FooterProps> = () => {
  const {language} = useLanguage();
  const en = language === 'en';
  const [siteHeader,setSiteHeader] = useState<Record<string,string>>({});
  useEffect(()=>{
    let active=true;
    void getPublishedWebsiteConfig().then(config=>{if(active&&config?.header)setSiteHeader(config.header)}).catch(error=>console.warn('Published footer configuration unavailable:',error));
    return ()=>{active=false};
  },[]);
  const links=[...learningLinks,...infoLinks];
  return <footer className="border-t-[3px] border-cyan-500 bg-[#071b38] text-slate-300">
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-5">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white text-[#0b3979]"><BookOpen className="h-6 w-6" aria-hidden="true"/></div>
          <div className="min-w-0"><div className="break-words text-lg font-extrabold text-white">{siteHeader.brand||'Krishan Sir'}</div><div className="text-xs font-bold text-amber-300">{siteHeader.subBrand||'Online Learning'}</div></div>
        </div>
        <p className="max-w-xl text-xs leading-relaxed text-slate-300">{siteHeader.footer||(en?TEACHER_INFO.tagline.en:TEACHER_INFO.tagline.hi)}</p>
      </div>
      <div className="grid grid-cols-2 gap-x-4 gap-y-6 lg:grid-cols-4 lg:gap-8">
        {groups.map(g=><nav key={g.en} aria-label={en?g.en:g.hi} className="min-w-0">
          <h2 className="mb-3 text-xs font-extrabold uppercase tracking-wide text-amber-300">{en?g.en:g.hi}</h2>
          <ul className="space-y-1">{g.ids.map(id=>{const link=links.find(l=>l.id===id);return link?<li key={id}><a href={publicHref(link.slug)} className="inline-block min-h-8 break-words py-1.5 text-xs leading-relaxed text-slate-300 hover:text-white hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-300">{link.title[language]}</a></li>:null})}</ul>
          {g.en==='About & Contact'&&<div className="mt-3 space-y-2 border-t border-white/10 pt-3"><p className="text-xs font-bold text-white">{TEACHER_INFO.name}</p><a href={'mailto:'+SUPPORT_EMAIL} className="flex min-w-0 items-start gap-1.5 text-xs text-cyan-200 hover:underline"><Mail className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true"/><span className="break-all">{SUPPORT_EMAIL}</span></a></div>}
        </nav>)}
      </div>
      <div className="mt-6 flex items-start gap-2 rounded-xl border border-white/10 bg-white/5 p-3 text-xs leading-relaxed"><ShieldCheck className="h-4 w-4 shrink-0 text-emerald-300" aria-hidden="true"/><span>{en?'For student privacy, use the support contact and never share passwords or private student records.':'विद्यार्थी गोपनीयता के लिए सहायता संपर्क का उपयोग करें और पासवर्ड या निजी विद्यार्थी रिकॉर्ड साझा न करें।'}</span></div>
    </div>
    <div className="border-t border-white/10 bg-[#041329] px-4 py-4">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 text-[11px] text-slate-400">
        <p>© {new Date().getFullYear()} Krishan Sir – Online Learning. {en?'All rights reserved.':'सर्वाधिकार सुरक्षित।'}</p>
        <button type="button" onClick={()=>window.scrollTo({top:0,behavior:'smooth'})} className="flex min-h-9 items-center gap-2 rounded-lg bg-white/5 px-3 text-slate-200 hover:bg-white/10"><span>{en?'Back to top':'ऊपर जाएँ'}</span><ArrowUp className="h-3.5 w-3.5" aria-hidden="true"/></button>
      </div>
    </div>
  </footer>;
};
