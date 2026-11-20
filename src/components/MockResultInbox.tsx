import React, {useState} from 'react';

/** Synthetic display fixtures only. Never wire these to real students or result delivery. */
export type MockInboxItem = {
  id:string; title:string; session:string; status:'issued'|'revoked'|'draft';
  recipient:'demo-self'|'other'; issuedAt:string; revision:number;
};
export const MOCK_INBOX_ITEMS:readonly MockInboxItem[] = [
  {id:'DEMO-RC-001',title:'Class 10 · Term I / कक्षा 10',session:'2026–27',status:'issued',recipient:'demo-self',issuedAt:'2026-10-01',revision:1},
  {id:'DEMO-RC-002',title:'Class 10 · Term II / कक्षा 10',session:'2026–27',status:'draft',recipient:'demo-self',issuedAt:'',revision:1},
  {id:'DEMO-RC-003',title:'Other account / अन्य खाता',session:'2026–27',status:'issued',recipient:'other',issuedAt:'2026-10-02',revision:1},
  {id:'DEMO-RC-004',title:'Revoked / निरस्त',session:'2026–27',status:'revoked',recipient:'demo-self',issuedAt:'2026-10-03',revision:2}
];

/** Display-only eligibility. The future backend must independently enforce authenticated ownership, issuance and revocation. */
/** Strictly check synthetic issue dates, including calendar validity. Real dates are server-verified. */
export function isValidMockIssueDate(value:string):boolean {
  if(!/^\d{4}-\d{2}-\d{2}$/.test(value))return false;
  const [year,month,day]=value.split('-').map(Number);
  if(year<1||month<1||month>12||day<1)return false;
  const daysInMonth=[31,((year%4===0&&year%100!==0)||year%400===0)?29:28,31,30,31,30,31,31,30,31,30,31];
  return day<=daysInMonth[month-1];
}

export function visibleMockInboxItems(items:readonly MockInboxItem[]):MockInboxItem[] {
  const seen=new Set<string>();
  return items.filter(item=>{
    // Treat even typed fixtures as untrusted at runtime; malformed API-shaped values must not crash the preview.
    if(!item||typeof item!=='object'||typeof item.id!=='string'||typeof item.issuedAt!=='string'||typeof item.title!=='string'||typeof item.session!=='string')return false;
    const normalizedId=item.id.trim();
    if(item.recipient!=='demo-self'||item.status!=='issued'||!Number.isSafeInteger(item.revision)||item.revision<=0||!normalizedId||!isValidMockIssueDate(item.issuedAt)||seen.has(normalizedId))return false;
    seen.add(normalizedId);
    return true;
  });
}

export const MockResultInbox:React.FC=()=>{
  const [selected,setSelected]=useState<string|null>(null);
  const items=visibleMockInboxItems(MOCK_INBOX_ITEMS);
  const current=items.find(item=>item.id===selected);
  return <section className="mx-auto max-w-4xl space-y-4 p-5" aria-label="Synthetic private result inbox preview">
    <header className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-amber-950">
      <h2 className="text-xl font-bold">Result Inbox — Design Preview / परिणाम इनबॉक्स</h2>
      <p className="mt-1 text-sm">DEMO ONLY · NOT ISSUED BY KSOL. Synthetic records; no sign-in, database, real results, download, print, share or delivery.</p>
    </header>
    <div className="space-y-3" aria-label="Synthetic inbox entries">
      {items.length===0&&<p role="status" className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">No sample results available / कोई उदाहरण परिणाम उपलब्ध नहीं है। This preview never queries real student records.</p>}
      {items.map(item=><article key={item.id} className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div><h3 className="font-bold text-slate-900">{item.title}</h3><p className="text-sm text-slate-600">{item.session} · Sample {item.id} · Revision {item.revision}</p></div>
          <button type="button" aria-expanded={selected===item.id} aria-controls="mock-result-inbox-detail" onClick={()=>setSelected(old=>old===item.id?null:item.id)} className="rounded-lg border border-sky-800 px-3 py-2 text-sm font-semibold text-sky-900">{selected===item.id?'Hide sample':'View sample'}</button>
        </div>
      </article>)}
    </div>
    <div id="mock-result-inbox-detail" aria-live="polite" className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-5">
      {current?<div><p className="font-bold text-slate-900">SAMPLE / उदाहरण — {current.title}</p><p className="mt-2 text-sm text-slate-700">Illustrative status: issued · Synthetic date: {current.issuedAt}. No marks, certificate or personal data are loaded.</p><p className="mt-2 text-xs text-amber-800">Real issuance, ownership, revision, revocation, download and audit must be enforced by reviewed backend RPCs before activation.</p></div>:<p className="text-sm text-slate-600">Select a sample entry to inspect its non-sensitive preview.</p>}
    </div>
    <p className="text-xs text-slate-500">Draft, revoked and other-recipient fixtures are deliberately excluded from the demo inbox. This UI filtering is not an authorization boundary.</p>
  </section>;
};
