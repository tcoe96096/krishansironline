// Review-only portable renderer. No filesystem, subprocess, secrets, or network.
// Inject the pinned PDFKit browser/standalone build and vetted font buffers.
// Draft only. Supabase Edge compatibility, glyph shaping and CPU limits are unverified.
import {renderResultDocument} from './result-generation-html-20261127-CANDIDATE-DO-NOT-DEPLOY.ts';
const MAX=10485760;
export async function renderEdgeResultDraft(snapshot,design,{PDFDocument,latinFont,hindiFont}){
  // Reuse the validated report input contract before rendering any content.
  renderResultDocument(snapshot,design);
  if(typeof PDFDocument!=='function'||![latinFont,hindiFont].every(x=>x instanceof Uint8Array&&x.length>0&&x.length<2_000_000))throw new Error('Invalid PDF engine or fonts');
  const start=performance.now();
  const doc=new PDFDocument({size:'A4',margin:42,autoFirstPage:true,font:latinFont,compress:true,info:{Title:'KSOL Result Draft',Author:'KSOL'}});
  const chunks=[];let size=0,pages=1;
  doc.on('pageAdded',()=>pages++);
  const output=new Promise((resolve,reject)=>{
    doc.on('data',chunk=>{size+=chunk.length;if(size>MAX){doc.destroy(new Error('PDF limit exceeded'));return;}chunks.push(new Uint8Array(chunk));});
    doc.on('error',reject);
    doc.on('end',()=>{const bytes=new Uint8Array(size);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.length;}resolve(bytes);});
  });
  // Attach rejection handler immediately, including when a layout guard fails.
  output.catch(()=>{});
  try{
    doc.registerFont('Latin',latinFont);doc.registerFont('Hindi',hindiFont);
    const clean=v=>String(v??'').trim();
    // Mixed-script values are deliberately rejected until multi-font run shaping
    // has been validated. Hindi labels and English labels are separate runs.
    function selectFont(value){
      if(/[\u0900-\u097f]/u.test(value)){
        if(/[A-Za-z]/.test(value))throw new Error('Mixed-script draft field not yet supported');
        return 'Hindi';
      }
      if(/[^\x20-\x7e]/u.test(value))throw new Error('Unsupported draft text');
      return 'Latin';
    }
    const left=48,right=doc.page.width-48,width=right-left;
    const accent=design.theme==='classic'?'#785322':design.theme==='modern'?'#164e80':'#334155';
    let y=48;
    function line(value,fontSize,color,align='left'){
      value=clean(value);
      if(!value)return;
      doc.font(selectFont(value)).fontSize(fontSize).fillColor(color);
      const h=doc.heightOfString(value,{width,align,lineGap:2});
      if(!Number.isFinite(h)||y+h>doc.page.height-55)throw new Error('Draft layout exceeds one A4 page');
      doc.text(value,left,y,{width,align,lineGap:2});y+=h+7;
    }
    line(design.options.brandTitle||'KRISHAN SIR ONLINE LEARNING',19,accent,'center');
    line('परीक्षा अंकपत्र',18,accent,'center');
    line('Examination Report Card - DRAFT',13,accent,'center');
    line(design.options.tagline,10,'#334155','center');
    y+=7;
    for(const [hi,en,value] of [
      ['विद्यार्थी','Student',snapshot.studentName],['रोल नंबर','Roll number',snapshot.rollNo],
      ['कक्षा','Class',snapshot.classLevel],['विद्यालय','School',snapshot.schoolName],
      ['परीक्षा','Test',snapshot.testTitle.hi||snapshot.testTitle.en],['विषय','Subject',snapshot.subject],
      ['अंक','Score',snapshot.score+' / '+snapshot.totalMarks],['प्रतिशत','Percentage',snapshot.percentage+'%']
    ]){
      const v=clean(value)||'-';
      doc.font('Hindi').fontSize(10).fillColor(accent).text(hi,left,y,{width:122,lineBreak:false});
      doc.font('Latin').fontSize(8).fillColor('#334155').text(en,left,y+14,{width:122,lineBreak:false});
      doc.font(selectFont(v)).fontSize(12).fillColor('#172033');
      const h=doc.heightOfString(v,{width:width-145,lineGap:2});
      const rowHeight=Math.max(30,h+10);
      if(y+rowHeight>doc.page.height-90)throw new Error('Draft layout overflow');
      doc.text(v,left+145,y,{width:width-145,lineGap:2});
      y+=rowHeight;
    }
    line('Submitted UTC: '+new Date(snapshot.submittedAt).toISOString(),9,'#334155');
    line('Attempt: '+snapshot.attemptId+' / Template v'+design.version,8,'#334155');
    line(design.options.footerNote,9,'#334155');
    line('Generation preview - not an approved or released official PDF.',9,'#334155','center');
    if(pages!==1)throw new Error('Draft must fit on one page');
    doc.end();
    const bytes=await output;
    if(bytes.length<8||new TextDecoder().decode(bytes.subarray(0,5))!=='%PDF-')throw new Error('Invalid PDF bytes');
    const digest=new Uint8Array(await crypto.subtle.digest('SHA-256',bytes));
    return {bytes,sha256:Array.from(digest,x=>x.toString(16).padStart(2,'0')).join(''),templateVersion:design.version,attemptId:snapshot.attemptId,elapsedMs:performance.now()-start};
  }catch(error){doc.destroy();throw error;}
}
