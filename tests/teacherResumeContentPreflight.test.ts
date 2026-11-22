import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Buffer} from 'node:buffer';
import {validateTeacherResumeContent} from '../src/lib/teacherResumeContentPreflight';
import {DOCX_MIME,PDF_MIME} from '../src/lib/teacherResumePolicy';

function zip(entries:Array<{name:string,body?:string}>):Uint8Array{
 const locals:Buffer[]=[],central:Buffer[]=[];
 let offset=0;
 for(const e of entries){
  const name=Buffer.from(e.name),body=Buffer.from(e.body??'<xml/>');
  const local=Buffer.alloc(30+name.length);
  local.writeUInt32LE(0x04034b50,0);
  local.writeUInt16LE(0,6);
  local.writeUInt16LE(0,8);
  local.writeUInt32LE(body.length,18);
  local.writeUInt32LE(body.length,22);
  local.writeUInt16LE(name.length,26);
  name.copy(local,30);
  locals.push(local,body);
  const cd=Buffer.alloc(46+name.length);
  cd.writeUInt32LE(0x02014b50,0);
  cd.writeUInt16LE(0,8);
  cd.writeUInt16LE(0,10);
  cd.writeUInt32LE(body.length,20);
  cd.writeUInt32LE(body.length,24);
  cd.writeUInt16LE(name.length,28);
  cd.writeUInt32LE(offset,42);
  name.copy(cd,46);
  central.push(cd);
  offset+=local.length+body.length;
 }
 const centralBuf=Buffer.concat(central);
 const eocd=Buffer.alloc(22);
 eocd.writeUInt32LE(0x06054b50,0);
 eocd.writeUInt16LE(entries.length,8);
 eocd.writeUInt16LE(entries.length,10);
 eocd.writeUInt32LE(centralBuf.length,12);
 eocd.writeUInt32LE(offset,16);
 return Buffer.concat([...locals,centralBuf,eocd]);
}
const validDocxEntries=[
 {name:'[Content_Types].xml',body:'<Types></Types>'},
 {name:'_rels/.rels',body:'<Relationships></Relationships>'},
 {name:'word/document.xml',body:'<w:document/>'},
 {name:'word/styles.xml',body:'<styles/>'}
];

test('PDF preflight rejects a missing trailer, spoofed header or content after %%EOF',()=>{
 const pdf=Buffer.from('%PDF-1.7\n1 0 obj\n<< /Type /Catalog >>\nendobj\n%%EOF\n');
 assert.equal(validateTeacherResumeContent(pdf,PDF_MIME),true);
 assert.equal(validateTeacherResumeContent(Buffer.from('%PDF-1.7\nNo closing marker'),PDF_MIME),false);
 assert.equal(validateTeacherResumeContent(Buffer.from('MZ'+pdf.toString()),PDF_MIME),false);
 assert.equal(validateTeacherResumeContent(Buffer.concat([pdf,Buffer.from('MZ executable data')]),PDF_MIME),false);
 assert.equal(validateTeacherResumeContent(pdf,DOCX_MIME),false);
 assert.equal(validateTeacherResumeContent(Buffer.alloc(0),PDF_MIME),false);
});

test('DOCX ZIP preflight requires central directory, package parts and safe names',()=>{
 const doc=zip(validDocxEntries);
 assert.equal(validateTeacherResumeContent(doc,DOCX_MIME),true);
 assert.equal(validateTeacherResumeContent(doc,PDF_MIME),false);
 assert.equal(validateTeacherResumeContent(doc.subarray(0,doc.length-3),DOCX_MIME),false);
 assert.equal(validateTeacherResumeContent(zip(validDocxEntries.slice(0,2)),DOCX_MIME),false);
 assert.equal(validateTeacherResumeContent(zip([...validDocxEntries,{name:'word/vbaProject.bin'}]),DOCX_MIME),false);
 assert.equal(validateTeacherResumeContent(zip([...validDocxEntries,{name:'word/activeX/control.bin'}]),DOCX_MIME),false);
 assert.equal(validateTeacherResumeContent(zip([...validDocxEntries,{name:'word/embeddings/oleObject1.bin'}]),DOCX_MIME),false);
 assert.equal(validateTeacherResumeContent(zip([...validDocxEntries,{name:'../external.txt'}]),DOCX_MIME),false);
 assert.equal(validateTeacherResumeContent(zip([...validDocxEntries,validDocxEntries[2]]),DOCX_MIME),false);
});

test('DOCX preflight rejects encryption, invalid local headers and ZIP central-directory corruption',()=>{
 const doc=Buffer.from(zip(validDocxEntries));
 const eocd=doc.length-22;
 const centralStart=doc.readUInt32LE(eocd+16);
 const encrypted=Buffer.from(doc);
 encrypted.writeUInt16LE(1,centralStart+8);
 assert.equal(validateTeacherResumeContent(encrypted,DOCX_MIME),false);
 const invalidLocal=Buffer.from(doc);
 invalidLocal.writeUInt32LE(0x12345678,0);
 assert.equal(validateTeacherResumeContent(invalidLocal,DOCX_MIME),false);
 const brokenCentral=Buffer.from(doc);
 brokenCentral.writeUInt32LE(0x999999, eocd+16);
 assert.equal(validateTeacherResumeContent(brokenCentral,DOCX_MIME),false);
});

test('preflight is only a client heuristic, never proof of malware scanning',()=>{
 // A structurally plausible ZIP can still carry malicious payload bytes.
 // No upload/verification flag should be enabled purely because this passes.
 const doc=zip(validDocxEntries);
 assert.equal(validateTeacherResumeContent(doc,DOCX_MIME),true);
});
