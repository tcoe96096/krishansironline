import React, {useState} from 'react';

/** Standalone design-only preview: no database, network, storage, issuance or delivery. */
type Row = {id:number;subject:string;maximum:string;obtained:string};
type Draft = {heading:string;session:string;student:string;roll:string;classLevel:string;remarks:string;rows:Row[]};
const initial:Draft = {heading:'KRISHAN SIR ONLINE LEARNING',session:'2026–27',student:'Demo Student / उदाहरण विद्यार्थी',roll:'DEMO-001',classLevel:'10',remarks:'Only a sample / केवल उदाहरण',rows:[{id:1,subject:'Political Science',maximum:'100',obtained:'82'}]};
const sanitize=(v:string,max=120)=>v.replace(/[\u0000-\u001f\u007f-\u009f\u202a-\u202e\u2066-\u2069]/g,'').slice(0,max);
export function mockMarksTotal(rows:Row[]){
  if(!rows.length||rows.some(r=>!/^\d{1,3}(?:\.\d{1,2})?$/.test(r.maximum)||!/^\d{1,3}(?:\.\d{1,2})?$/.test(r.obtained)||Number(r.maximum)<=0||Number(r.maximum)>1000||Number(r.obtained)>Number(r.maximum)))return null;
  return rows.reduce((a,r)=>({maximum:a.maximum+Number(r.maximum),obtained:a.obtained+Number(r.obtained)}),{maximum:0,obtained:0});
}
export const MockResultCardDesigner:React.FC=()=>{
  const [draft,setDraft]=useState<Draft>(initial);
  const [nextId,setNextId]=useState(2);
  const total=mockMarksTotal(draft.rows);
  const edit=(key:keyof Omit<Draft,'rows'>,value:string)=>setDraft(old=>({...old,[key]:sanitize(value,key==='remarks'?240:120)}));
  const editRow=(id:number,key:'subject'|'maximum'|'obtained',value:string)=>setDraft(old=>({...old,rows:old.rows.map(r=>r.id===id?{...r,[key]:sanitize(value,80)}:r)}));
  return <section className="mx-auto max-w-5xl space-y-5 p-5" aria-label="Local mock result card designer">
    <header className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-amber-950">
      <h2 className="text-xl font-bold">Digital Result Card — Local Design Preview</h2>
      <p className="text-sm">DRAFT / NOT ISSUED. No real student records, backend, publishing, upload or delivery. Refresh discards edits.</p>
    </header>
    <div className="grid gap-3 md:grid-cols-2">
      {([['heading','Heading / शीर्षक'],['session','Session / सत्र'],['student','Demo student / उदाहरण विद्यार्थी'],['roll','Demo roll / उदाहरण रोल'],['classLevel','Class / कक्षा'],['remarks','Remarks / टिप्पणी']] as const).map(([key,label])=><label key={key} className="text-sm font-semibold">{label}<input className="mt-1 w-full rounded-lg border p-2" value={draft[key]} onChange={e=>edit(key,e.target.value)}/></label>)}
    </div>
    <div className="space-y-2"><h3 className="font-bold">Subject rows / विषय</h3>
      {draft.rows.map(row=><div key={row.id} className="grid grid-cols-[minmax(0,2fr)_1fr_1fr_auto] gap-2">
        {(['subject','maximum','obtained'] as const).map(key=><label key={key} className="text-xs">{key}<input aria-label={key+' '+row.id} className="mt-1 w-full rounded border p-2" value={row[key]} onChange={e=>editRow(row.id,key,e.target.value)}/></label>)}
        <button type="button" aria-label={'Remove subject '+row.id} className="self-end rounded border px-3 py-2" onClick={()=>setDraft(old=>({...old,rows:old.rows.filter(r=>r.id!==row.id)}))}>×</button>
      </div>)}
      <button type="button" disabled={draft.rows.length>=12} className="rounded border px-3 py-2 disabled:opacity-40" onClick={()=>{setDraft(old=>({...old,rows:[...old.rows,{id:nextId,subject:'',maximum:'100',obtained:'0'}]}));setNextId(x=>x+1);}}>+ Add subject</button>
    </div>
    <article className="relative overflow-hidden rounded-2xl border-2 border-sky-900 bg-white p-6 text-slate-900" aria-label="Unissued mock report preview">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 flex items-center justify-center text-center text-4xl font-black text-slate-200 opacity-60 -rotate-12">DRAFT / NOT ISSUED</div>
      <div className="relative">
        <h2 className="text-center text-xl font-black">{draft.heading||'KSOL'}</h2><p className="text-center text-sm">Digital Result Card · DEMO · {draft.session}</p>
        <div className="mt-5 grid grid-cols-2 gap-2 text-sm"><p>Student: {draft.student}</p><p>Roll: {draft.roll}</p><p>Class: {draft.classLevel}</p><p>Status: NOT ISSUED</p></div>
        <table className="mt-4 w-full border-collapse text-left text-sm"><thead><tr><th className="border p-2">Subject</th><th className="border p-2">Maximum</th><th className="border p-2">Obtained</th></tr></thead><tbody>{draft.rows.map(r=><tr key={r.id}><td className="border p-2">{r.subject}</td><td className="border p-2">{r.maximum}</td><td className="border p-2">{r.obtained}</td></tr>)}</tbody></table>
        <p role="status" className="mt-3 font-semibold">{total?`Demo total: ${total.obtained} / ${total.maximum} (${(total.obtained/total.maximum*100).toFixed(1)}%)`:'Enter valid subject marks to calculate demo total.'}</p>
        <p className="mt-4 text-sm">Remarks: {draft.remarks}</p><p className="mt-5 border-t pt-3 text-xs">Signature placeholder · Not an official certificate</p>
      </div>
    </article>
    <button type="button" className="rounded border px-4 py-2" onClick={()=>{setDraft(initial);setNextId(2);}}>Reset demo</button>
  </section>;
};
