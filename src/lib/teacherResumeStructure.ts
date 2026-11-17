/** Bounded structural preflight only. A trusted private scanner must still inspect
 * actual PDF/DOCX content and malware before any file is attached. */
export function hasSafeResumeStructure(bytes:Uint8Array,mime:string):boolean {
 if(bytes.length===0||bytes.length>5*1024*1024)return false;
 if(mime==='application/pdf'){
  const header=new TextDecoder().decode(bytes.subarray(0,9));
  const tail=new TextDecoder().decode(bytes.subarray(Math.max(0,bytes.length-1024))).trimEnd();
  return /^%PDF-(?:1\.[0-7]|2\.0)(?:\r|\n)/.test(header)&&tail.endsWith('%%EOF');
 }
 if(mime!=='application/vnd.openxmlformats-officedocument.wordprocessingml.document'||bytes.length<22)return false;
 const view=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength);
 const u16=(n:number)=>view.getUint16(n,true),u32=(n:number)=>view.getUint32(n,true);
 if(u32(0)!==0x04034b50)return false;
 // ZIP end-of-central-directory: require one ordinary archive, no ZIP64/spanning.
 let end=-1;
 for(let n=bytes.length-22;n>=Math.max(0,bytes.length-65557);n--){
  if(u32(n)===0x06054b50&&n+22+u16(n+20)===bytes.length){end=n;break;}
 }
 if(end<0||u16(end+4)!==0||u16(end+6)!==0)return false;
 const count=u16(end+10),start=u32(end+16),length=u32(end+12);
 if(count===0||count>1024||u16(end+8)!==count||start+length!==end)return false;
 let pos=start,total=0;const names=new Set<string>(),ranges:{start:number;end:number}[]=[];
 try{
  for(let i=0;i<count;i++){
   if(pos+46>end||u32(pos)!==0x02014b50)return false;
   const flags=u16(pos+8),method=u16(pos+10),compressed=u32(pos+20),expanded=u32(pos+24);
   const nameLength=u16(pos+28),extraLength=u16(pos+30),commentLength=u16(pos+32),local=u32(pos+42);
   const next=pos+46+nameLength+extraLength+commentLength;
   if(next>end||nameLength===0||u16(pos+34)!==0||(flags&0x41)!==0||![0,8].includes(method))return false;
   if(method===0&&compressed!==expanded)return false;
   total+=expanded;
   if(total>20*1024*1024||expanded>10*1024*1024||compressed>bytes.length||local+30>start)return false;
   const nameBytes=bytes.subarray(pos+46,pos+46+nameLength);
   const name=new TextDecoder('utf-8',{fatal:true}).decode(nameBytes);
   if(names.has(name)||name.startsWith('/')||name.includes('\\')||name.split('/').includes('..')||/[\x00-\x1f\x7f]/.test(name)||/vbaProject|\.(?:exe|dll|js|vbs|bin)$/i.test(name))return false;
   names.add(name);
   if(u32(local)!==0x04034b50||u16(local+6)!==flags||u16(local+8)!==method||u16(local+26)!==nameLength)return false;
   const data=local+30+nameLength+u16(local+28),dataEnd=data+compressed;
   if(dataEnd>start||!nameBytes.every((value,j)=>bytes[local+30+j]===value))return false;
   if((flags&8)===0&&(u32(local+18)!==compressed||u32(local+22)!==expanded))return false;
   // Overlapping entry ranges can hide parser-dependent payloads.
   if(ranges.some(r=>local<r.end&&dataEnd>r.start))return false;
   ranges.push({start:local,end:dataEnd});pos=next;
  }
  return pos===end&&names.has('[Content_Types].xml')&&names.has('_rels/.rels')&&names.has('word/document.xml');
 }catch{return false;}
}
