import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {hasWebpContainerHeader} from '../src/lib/teacherPhotoContentValidation';

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
 assert.match(source,/hasWebpContainerHeader\(new Uint8Array\(await data\.slice\(0,12\)\.arrayBuffer\(\)\)\)/);
 assert.doesNotMatch(source,/getPublicUrl|createSignedUrl/);
});
