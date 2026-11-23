import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {hasWebpContainerHeader,hasConsistentWebpContainer} from '../src/lib/teacherPhotoContentValidation';

const header=(length:number)=>new Uint8Array([0x52,0x49,0x46,0x46,length&255,(length>>>8)&255,(length>>>16)&255,(length>>>24)&255,0x57,0x45,0x42,0x50]);

test('private photo header gate accepts a WebP RIFF marker',()=>{
 assert.equal(hasWebpContainerHeader(header(4)),true);
 assert.equal(hasWebpContainerHeader(header(1024)),true);
});
test('rejects truncated, spoofed, empty or invalid private photo responses',()=>{
 for(const bytes of [new Uint8Array(),new Uint8Array(11),header(0),header(3),new Uint8Array([0x3c,0x68,0x74,0x6d,0x6c,0x3e,0,0,0,0,0,0]),new Uint8Array([0x52,0x49,0x46,0x46,4,0,0,0,0x50,0x44,0x46,0x21])])
  assert.equal(hasWebpContainerHeader(bytes),false);
});
test('private photo read validates downloaded bytes before returning a blob',()=>{
 const source=readFileSync('src/services/teacherPrivatePhoto.ts','utf8');
 assert.match(source,/hasConsistentWebpContainer\(new Uint8Array\(await data\.arrayBuffer\(\)\)\)/);
 assert.doesNotMatch(source,/getPublicUrl|createSignedUrl/);
 assert.doesNotMatch(source,/hasWebpContainerHeader\(/);
});

test('complete WebP gate rejects mismatched RIFF sizes and missing image chunks',()=>{
 const valid=new Uint8Array([...header(14),0x56,0x50,0x38,0x4c,2,0,0,0,0x2f,0]);
 assert.equal(hasConsistentWebpContainer(valid),true);
 assert.equal(hasConsistentWebpContainer(header(4)),false);
 const badSize=valid.slice();badSize[4]=15;
 assert.equal(hasConsistentWebpContainer(badSize),false);
 const badChunk=valid.slice();badChunk[12]=0x50;
 assert.equal(hasConsistentWebpContainer(badChunk),false);
 const badLength=valid.slice();badLength[16]=3;
 assert.equal(hasConsistentWebpContainer(badLength),false);
});

test('complete WebP gate rejects truncated trailing RIFF chunks and accepts aligned metadata chunks',()=>{
 const base=new Uint8Array([...header(14),0x56,0x50,0x38,0x4c,2,0,0,0,0x2f,0]);
 const junk=new Uint8Array([...base,0x00]);junk[4]=15;
 assert.equal(hasConsistentWebpContainer(junk),false);
 const metadata=new Uint8Array([...base,0x45,0x58,0x49,0x46,1,0,0,0,0x41,0]);metadata[4]=24;
 assert.equal(hasConsistentWebpContainer(metadata),true);
 const truncated=metadata.slice(0,-1);truncated[4]=23;
 assert.equal(hasConsistentWebpContainer(truncated),false);
});

test('complete WebP gate rejects an empty primary image payload',()=>{
 const empty=new Uint8Array([...header(12),0x56,0x50,0x38,0x4c,0,0,0,0]);
 assert.equal(hasConsistentWebpContainer(empty),false);
});

test('complete WebP gate rejects nonzero RIFF padding for odd metadata chunks',()=>{
 const base=new Uint8Array([...header(14),0x56,0x50,0x38,0x4c,2,0,0,0,0x2f,0]);
 const metadata=new Uint8Array([...base,0x45,0x58,0x49,0x46,1,0,0,0,0x41,0]);metadata[4]=24;
 assert.equal(hasConsistentWebpContainer(metadata),true);
 metadata[metadata.length-1]=0x7f;
 assert.equal(hasConsistentWebpContainer(metadata),false);
});
