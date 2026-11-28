// Review-only portable renderer. No filesystem, subprocess, secrets, or network.
// Inject the pinned PDFKit browser/standalone build and vetted font buffers.
// Draft only. Supabase Edge compatibility, glyph shaping and CPU limits are unverified.
import {renderResultDocument} from './result-generation-html-20261127-CANDIDATE-DO-NOT-DEPLOY.ts';
const MAX=10485760;
export async function renderEdgeResultDraft(snapshot,design,{PDFDocument,latinFont,hindiFont,purpose='preview'}){
  // Reuse the validated report input contract before rendering any content.
  renderResultDocument(snapshot,design);
  if(typeof PDFDocument!=='function'||![latinFont,hindiFont].every(x=>x instanceof Uint8Array&&x.length>0&&x.length<2_000_000))throw new Error('Invalid PDF engine or fonts');
  if(purpose!=='preview'&&purpose!=='prepared')throw new Error('Invalid document purpose');
  const start=performance.now();
  const doc=new PDFDocument({size:'A4',pdfVersion:'1.7',margin:42,autoFirstPage:true,font:latinFont,compress:true,info:{Title:purpose==='prepared'?'KSOL Examination Report Card':'KSOL Result Draft',Author:'KSOL'}});
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
    const segmenter=new Intl.Segmenter('hi',{granularity:'grapheme'});
    function runs(value){
      const out=[];
      for(const {segment} of segmenter.segment(value)){
        const hindi=/[\u0900-\u097f]/u.test(segment);
        const font=hindi?'Hindi':'Latin';
        if(hindi?!/^[\u0900-\u097f\u200c\u200d]+$/u.test(segment):!/^[\x20-\x7e]+$/u.test(segment))throw new Error('Unsupported draft text');
        if(out.at(-1)?.font===font)out.at(-1).text+=segment;
        else out.push({font,text:segment});
      }
      return out;
    }
    function measure(text,size){
      return runs(text).map(run=>({...run,width:doc.font(run.font).fontSize(size).widthOfString(run.text)}));
    }
    function wrap(value,size,width){
      const lines=[];let line='';
      for(const word of value.split(/ +/u)){
        const next=line?line+' '+word:word;
        const w=measure(next,size).reduce((n,r)=>n+r.width,0);
        if(w<=width){line=next;continue;}
        if(!line)throw new Error('Draft word exceeds layout width');
        lines.push(measure(line,size));line=word;
        if(measure(word,size).reduce((n,r)=>n+r.width,0)>width)throw new Error('Draft word exceeds layout width');
      }
      if(line)lines.push(measure(line,size));
      return lines;
    }
    function draw(lines,x,y,width,size,color,align='left'){
      const step=size*1.6;
      if(y+lines.length*step>doc.page.height-55)throw new Error('Draft layout overflow');
      for(const row of lines){
        const total=row.reduce((n,r)=>n+r.width,0);
        let dx=x+(align==='center'?(width-total)/2:0);
        // Group a complete logical line, rather than splitting its ActualText
        // by visual font runs. Preserve shaping and logical reading order.
        doc.markContent('Span',{actual:row.map(run=>run.text).join(''),lang:row.some(run=>run.font==='Hindi')?'hi-IN':'en'});
        try{
          for(const run of row){
            doc.font(run.font).fontSize(size).fillColor(color).text(run.text,dx,y,{lineBreak:false});
            dx+=run.width;
          }
        }finally{doc.endMarkedContent();}
        y+=step;
      }
      return lines.length*step;
    }
    const left=48,right=doc.page.width-48,width=right-left;
    const accent=design.theme==='classic'?'#785322':design.theme==='modern'?'#164e80':'#334155';
    let y=48;
    function line(value,fontSize,color,align='left'){
      value=clean(value);
      if(!value)return;
      y+=draw(wrap(value,fontSize,width),left,y,width,fontSize,color,align)+7;
    }
    line(design.options.brandTitle||'KRISHAN SIR ONLINE LEARNING',19,accent,'center');
    line('परीक्षा अंकपत्र',18,accent,'center');
    line(purpose==='prepared'?'Examination Report Card':'Examination Report Card - DRAFT',13,accent,'center');
    line(design.options.tagline,10,'#334155','center');
    y+=7;
    for(const [hi,en,value] of [
      ['विद्यार्थी','Student',snapshot.studentName],['रोल नंबर','Roll number',snapshot.rollNo],
      ['कक्षा','Class',snapshot.classLevel],['विद्यालय','School',snapshot.schoolName],
      ['परीक्षा','Test',snapshot.testTitle.hi||snapshot.testTitle.en],['विषय','Subject',snapshot.subject],
      ['अंक','Score',snapshot.score+' / '+snapshot.totalMarks],['प्रतिशत','Percentage',snapshot.percentage+'%']
    ]){
      const v=clean(value)||'-';
      doc.markContent('Span',{actual:hi,lang:'hi-IN'});
      try{doc.font('Hindi').fontSize(10).fillColor(accent).text(hi,left,y,{width:122,lineBreak:false});}
      finally{doc.endMarkedContent();}
      doc.font('Latin').fontSize(8).fillColor('#334155').text(en,left,y+14,{width:122,lineBreak:false});
      const rows=wrap(v,12,width-145);
      const h=rows.length*12*1.6;
      const rowHeight=Math.max(30,h+10);
      if(y+rowHeight>doc.page.height-90)throw new Error('Draft layout overflow');
      draw(rows,left+145,y,width-145,12,'#172033');
      y+=rowHeight;
    }
    line('Submitted UTC: '+new Date(snapshot.submittedAt).toISOString(),9,'#334155');
    line('Attempt: '+snapshot.attemptId+' / Template v'+design.version,8,'#334155');
    line(design.options.footerNote,9,'#334155');
    line(purpose==='prepared'?'Valid only when released in the KSOL student portal.':'Generation preview - not an approved or released official PDF.',9,'#334155','center');
    if(pages!==1)throw new Error('Draft must fit on one page');
    doc.end();
    const bytes=await output;
    if(bytes.length<8||new TextDecoder().decode(bytes.subarray(0,5))!=='%PDF-')throw new Error('Invalid PDF bytes');
    const digest=new Uint8Array(await crypto.subtle.digest('SHA-256',bytes));
    return {bytes,sha256:Array.from(digest,x=>x.toString(16).padStart(2,'0')).join(''),templateVersion:design.version,attemptId:snapshot.attemptId,elapsedMs:performance.now()-start};
  }catch(error){doc.destroy();throw error;}
}
