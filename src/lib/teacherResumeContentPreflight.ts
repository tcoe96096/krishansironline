import {DOCX_MIME,PDF_MIME,TEACHER_RESUME_MAX_BYTES} from './teacherResumePolicy';

/**
 * Untrusted document **client preflight**, never a virus scan or proof that a
 * PDF/DOCX is safe to download or render. Uploaded objects remain quarantined
 * until an independent server-side content scanner approves them.
 *
 * Detects obvious PDF polyglots and malformed/unsafe ZIP container metadata
 * before a server reservation is issued. The scan service MUST inspect the
 * actual stored bytes; neither extension, MIME nor ZIP directory is authority.
 */
export function validateTeacherResumeContent(bytes:Uint8Array,mime:string):boolean{
 if(!(bytes instanceof Uint8Array)||bytes.byteLength<10||bytes.byteLength>TEACHER_RESUME_MAX_BYTES)return false;
 if(mime===PDF_MIME)return pdfEnvelopeValid(bytes);
 if(mime===DOCX_MIME)return docxContainerValid(bytes);
 return false;
}

function pdfEnvelopeValid(b:Uint8Array):boolean{
 // Start at offset zero (no executable prefix or arbitrary polyglot preamble).
 const start=[37,80,68,70,45]; // %PDF-
 if(!start.every((v,i)=>b[i]===v)||b.length<12)return false;
 if(!((b[5]===49||b[5]===50)&&b[6]===46&&b[7]>=48&&b[7]<=57))return false;
 const eof=[37,37,69,79,70]; // %%EOF
 const from=Math.max(0,b.length-2048);
 for(let i=b.length-eof.length;i>=from;i--){
  if(eof.every((v,j)=>b[i+j]===v)){
   for(let k=i+eof.length;k<b.length;k++){
    if(![0,9,10,12,13,32].includes(b[k]))return false;
   }
   return true;
  }
 }
 return false;
}
function docxContainerValid(b:Uint8Array):boolean{
 const dv=new DataView(b.buffer,b.byteOffset,b.byteLength);
 const u16=(n:number)=>dv.getUint16(n,true);
 const u32=(n:number)=>dv.getUint32(n,true);
 const sig=(n:number)=>u32(n);
 if(sig(0)!==0x04034b50)return false;
 // End-of-central-directory record. ZIP64, multi-disk, encryption or truncated
 // ZIPs are intentionally rejected by this early, conservative check.
 let end=-1;
 for(let i=b.length-22;i>=Math.max(0,b.length-65557);i--){
  if(sig(i)===0x06054b50&&i+22<=b.length&&i+22+u16(i+20)===b.length){end=i;break;}
 }
 if(end<0||u16(end+4)!==0||u16(end+6)!==0)return false;
 const count=u16(end+10),onDisk=u16(end+8);
 const centralBytes=u32(end+12),centralStart=u32(end+16);
 if(count<3||count>200||onDisk!==count||count===65535||centralBytes===0||
  centralStart===0||centralStart+centralBytes!==end)return false;
 const textDecoder=new TextDecoder('utf-8',{fatal:true});
 const required=new Set(['[Content_Types].xml','_rels/.rels','word/document.xml']);
 const seen=new Set<string>();
 let pos=centralStart,totalUncompressed=0;
 for(let i=0;i<count;i++){
  if(pos+46>end||sig(pos)!==0x02014b50)return false;
  const flags=u16(pos+8),method=u16(pos+10);
  const compressed=u32(pos+20),uncompressed=u32(pos+24);
  const nameLen=u16(pos+28),extraLen=u16(pos+30),commentLen=u16(pos+32);
  const localOffset=u32(pos+42);
  const next=pos+46+nameLen+extraLen+commentLen;
  if(nameLen<1||next>end||flags&1||method!==0&&method!==8||
   compressed===0xffffffff||uncompressed===0xffffffff||
   localOffset+30>=centralStart||sig(localOffset)!==0x04034b50)return false;
  // Reject decompression bombs by bounding total expanded bytes and ratio.
  totalUncompressed+=uncompressed;
  if(totalUncompressed>30*1024*1024||uncompressed>0&&
    (compressed===0||uncompressed>Math.max(100,compressed*100)))return false;
  let name:string;
  try{name=textDecoder.decode(b.subarray(pos+46,pos+46+nameLen));}
  catch{return false;}
  if(name.startsWith('/')||name.includes('\\')||
   (name.endsWith('/')?name.slice(0,-1):name).split('/').some(part=>part==='..'||part==='.'||part==='')||
   seen.has(name))return false;
  const lower=name.toLowerCase();
  if(lower.includes('vbaproject')||lower.includes('/activex/')||
   lower.includes('/embeddings/')||lower.endsWith('.exe')||lower.endsWith('.dll'))return false;
  const localNameLen=u16(localOffset+26),localExtraLen=u16(localOffset+28);
  const localDataStart=localOffset+30+localNameLen+localExtraLen;
  if(localDataStart+compressed>centralStart||u16(localOffset+8)!==method)return false;
  if(localNameLen!==nameLen)return false;
  for(let j=0;j<nameLen;j++){
   if(b[localOffset+30+j]!==b[pos+46+j])return false;
  }
  required.delete(name);
  seen.add(name);
  pos=next;
 }
 return pos===end&&required.size===0;
}
