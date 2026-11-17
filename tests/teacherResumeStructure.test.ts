import {test} from 'node:test';
import assert from 'node:assert/strict';
import {hasSafeResumeStructure} from '../src/lib/teacherResumeStructure';
const pdf='application/pdf',docx='application/vnd.openxmlformats-officedocument.wordprocessingml.document';
const encode=(s:string)=>new TextEncoder().encode(s);
function archive(names=['[Content_Types].xml','_rels/.rels','word/document.xml'],options:{expanded?:number;method?:number;flags?:number;badOffset?:boolean}={}){
 const locals:Uint8Array[]=[],centrals:Uint8Array[]=[];let offset=0;
 for(const name of names){
  const data=encode('<xml/>'),path=encode(name),local=new Uint8Array(30+path.length+data.length),central=new Uint8Array(46+path.length);
  const a=new DataView(local.buffer),b=new DataView(central.buffer),expanded=options.expanded??data.length;
  a.setUint32(0,0x04034b50,true);a.setUint16(6,options.flags??0,true);a.setUint16(8,options.method??0,true);a.setUint32(18,data.length,true);a.setUint32(22,expanded,true);a.setUint16(26,path.length,true);local.set(path,30);local.set(data,30+path.length);
  b.setUint32(0,0x02014b50,true);b.setUint16(8,options.flags??0,true);b.setUint16(10,options.method??0,true);b.setUint32(20,data.length,true);b.setUint32(24,expanded,true);b.setUint16(28,path.length,true);b.setUint32(42,options.badOffset?0xffffff:offset,true);central.set(path,46);
  locals.push(local);centrals.push(central);offset+=local.length;
 }
 const centralSize=centrals.reduce((n,p)=>n+p.length,0),end=new Uint8Array(22),v=new DataView(end.buffer);
 v.setUint32(0,0x06054b50,true);v.setUint16(8,names.length,true);v.setUint16(10,names.length,true);v.setUint32(12,centralSize,true);v.setUint32(16,offset,true);
 const result=new Uint8Array(offset+centralSize+end.length);let at=0;for(const part of [...locals,...centrals,end]){result.set(part,at);at+=part.length;}return result;
}
test('PDF structural preflight checks real header and EOF, still requiring private scanning',()=>{
 assert.equal(hasSafeResumeStructure(encode('%PDF-1.7\ncontent\n%%EOF\n'),pdf),true);
 assert.equal(hasSafeResumeStructure(encode('%PDF-2.0\ncontent\n%%EOF'),pdf),true);
 for(const text of ['resume.exe','%PDF-test','%PDF-1.7\ntruncated','<script>%PDF-1.7\n%%EOF','%PDF-9.9\n%%EOF'])assert.equal(hasSafeResumeStructure(encode(text),pdf),false,text);
 assert.equal(hasSafeResumeStructure(new Uint8Array(5*1024*1024+1),pdf),false);
});
test('DOCX preflight requires ZIP directory and the three required package entries',()=>{
 assert.equal(hasSafeResumeStructure(archive(),docx),true);
 assert.equal(hasSafeResumeStructure(archive(['test.txt']),docx),false);
 assert.equal(hasSafeResumeStructure(encode('PK plain text spoof'),docx),false);
 assert.equal(hasSafeResumeStructure(archive(),pdf),false);
 assert.equal(hasSafeResumeStructure(archive().subarray(0,50),docx),false);
});
test('archive expansion, encryption, macro payloads, traversal, duplicate entries and bad offsets fail closed',()=>{
 for(const data of [archive(undefined,{expanded:30*1024*1024,method:8}),archive(undefined,{flags:1}),archive(undefined,{badOffset:true}),archive(['[Content_Types].xml','_rels/.rels','word/document.xml','word/vbaProject.bin']),archive(['[Content_Types].xml','_rels/.rels','word/document.xml','../outside.xml']),archive(['[Content_Types].xml','_rels/.rels','word/document.xml','word/document.xml'])])assert.equal(hasSafeResumeStructure(data,docx),false);
});
test('malformed archive fuzz cannot throw or accept random bytes',()=>{
 for(let length=0;length<512;length++){
  const bytes=new Uint8Array(length);for(let n=0;n<length;n++)bytes[n]=(length*17+n*31)%256;
  assert.equal(hasSafeResumeStructure(bytes,docx),false);
 }
});
