import React from 'react';
import { useLanguage } from '../context/LanguageContext';
import { publicInfoPages, learningLinks, publicHref, SUPPORT_EMAIL, INFO_VERSION, INFO_UPDATED, type InfoPageId } from '../data/publicInfo';
import { ArrowLeft, Mail } from 'lucide-react';

export const PublicInfoPage: React.FC<{ pageId: InfoPageId }> = ({pageId}) => {
  const {language} = useLanguage();
  const en = language === 'en';
  const page = publicInfoPages.find(p=>p.id===pageId);
  if (!page) return null;
  const links = [...learningLinks,...publicInfoPages];
  return <article className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-8 sm:py-10" aria-labelledby="public-info-title">
    <a href={publicHref('')} className="mb-4 inline-flex min-h-10 items-center gap-2 rounded-lg text-sm font-semibold text-sky-900 hover:underline"><ArrowLeft className="h-4 w-4" aria-hidden="true"/>{en?'Back to Home':'मुख्य पृष्ठ पर वापस जाएँ'}</a>
    <header className="rounded-2xl bg-sky-950 p-5 text-white sm:p-7">
      <p className="text-xs font-semibold text-sky-200">{en?'Legal & Support Centre':'नीति एवं सहायता केंद्र'}</p>
      <h1 id="public-info-title" className="mt-2 text-2xl font-extrabold sm:text-3xl">{page.title[language]}</h1>
      <p className="mt-3 text-xs text-sky-100">{en?'Version':'संस्करण'} {INFO_VERSION} · {en?'Updated':'अद्यतन'}: <time dateTime={INFO_UPDATED}>{INFO_UPDATED}</time></p>
    </header>
    <div className="mt-4 space-y-4 rounded-2xl border border-slate-200 bg-white p-4 sm:p-7">
      {page.sections.map(s=><section key={s.title.en} className="border-b border-slate-100 pb-4 last:border-0 last:pb-0">
        <h2 className="text-lg font-bold text-sky-950">{s.title[language]}</h2>
        <p className="mt-2 break-words text-sm leading-7 text-slate-700">{s.text[language]}</p>
      </section>)}
      {pageId==='sitemap' && <nav aria-label={en?'Public pages':'सार्वजनिक पृष्ठ'} className="grid gap-2 sm:grid-cols-2">{links.map(p=><a key={p.id} href={publicHref(p.slug)} className="rounded-lg border border-slate-200 p-3 text-sm font-semibold text-sky-900 hover:bg-sky-50">{p.title[language]}</a>)}</nav>}
      {'emailSubject' in page && <div className="rounded-xl border border-sky-100 bg-sky-50 p-4">
        <p className="mb-3 text-sm text-slate-700">{en?'Use your email application to send a request. Do not include passwords or unnecessary personal information.':'अनुरोध भेजने के लिए अपने ईमेल ऐप का उपयोग करें। पासवर्ड या अनावश्यक व्यक्तिगत जानकारी न भेजें।'}</p>
        <a href={'mailto:'+SUPPORT_EMAIL+'?subject='+encodeURIComponent(page.emailSubject)} className="inline-flex min-h-11 max-w-full items-center gap-2 rounded-lg bg-sky-900 px-4 py-2 text-sm font-bold text-white hover:bg-sky-800"><Mail className="h-4 w-4 shrink-0" aria-hidden="true"/>{en?'Open support email':'सहायता ईमेल खोलें'}</a>
        <p className="mt-2 break-all text-xs text-slate-600">{SUPPORT_EMAIL}</p>
      </div>}
    </div>
    <nav aria-label={en?'Related policies':'संबंधित नीतियाँ'} className="mt-5 flex flex-wrap gap-2">
      {publicInfoPages.filter(p=>p.id!==pageId).map(p=><a key={p.id} href={publicHref(p.slug)} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-sky-900 hover:bg-sky-50">{p.title[language]}</a>)}
    </nav>
  </article>;
};
