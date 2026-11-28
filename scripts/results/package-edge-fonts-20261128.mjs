// Review-only packager: create temporary deploy input, never upload font files or secrets.
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {resolve} from 'node:path';
const [latin,hindi,latinExpected,hindiExpected,output]=process.argv.slice(2);
if(!output||!latin||!hindi||![latinExpected,hindiExpected].every(x=>/^[a-f0-9]{64}$/.test(x)))throw new Error('Provide two vetted font files, independently pinned SHA-256 digests, and a staging output path');
function vetted(path,expected){
 const bytes=readFileSync(path);
 if(bytes.length<1024||bytes.length>=2000000||bytes.readUInt32BE(0)!==0x00010000)throw new Error('Invalid TrueType font');
 if(createHash('sha256').update(bytes).digest('hex')!==expected)throw new Error('Font checksum mismatch');
 return bytes.toString('base64');
}
const a=vetted(latin,latinExpected),b=vetted(hindi,hindiExpected);
const content='// Generated temporary deployment asset. Retain applicable font license. Do not commit.\n'+
 'export const latinBase64='+JSON.stringify(a)+';\n'+
 'export const hindiBase64='+JSON.stringify(b)+';\n'+
 'export const latinSha256='+JSON.stringify(latinExpected)+';\n'+
 'export const hindiSha256='+JSON.stringify(hindiExpected)+';\n';
writeFileSync(resolve(output),content,{flag:'wx',mode:0o600});
console.log('FONT_PACKAGE_GENERATED_FOR_PRIVATE_STAGING');
