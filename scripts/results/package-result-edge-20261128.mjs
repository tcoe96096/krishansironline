// Review-only offline staging packager. No deploy, network, credentials, or font commits.
import {readFileSync,writeFileSync,mkdirSync,existsSync} from 'node:fs';
import {resolve,join} from 'node:path';
import {createHash} from 'node:crypto';
const [fontModule,output]=process.argv.slice(2);
if(!fontModule||!output)throw new Error('Provide verified temporary font module and new output directory');
const dir=resolve(output),root=resolve('docs/results');
if(existsSync(dir))throw new Error('Use a fresh staging directory');
const files=[
 'result-generation-edge-entrypoint-20261128-CANDIDATE-DO-NOT-DEPLOY.ts',
 'result-generation-edge-handler-20261128-CANDIDATE-DO-NOT-DEPLOY.ts',
 'result-generation-edge-renderer-20261127-CANDIDATE-DO-NOT-DEPLOY.mjs',
 'result-generation-orchestrator-20261127-CANDIDATE-DO-NOT-DEPLOY.ts',
 'result-generation-supabase-adapter-20261127-CANDIDATE-DO-NOT-DEPLOY.ts',
 'result-generation-html-20261127-CANDIDATE-DO-NOT-DEPLOY.ts'
];
// Package only the repository-owned public brand PNG; never retrieve student images.
const logo=readFileSync(resolve('public/images/file_0000000037ec8208af2a0ed280e2faf8.png'));
if(logo.length<33||logo.length>4*1024*1024||logo.subarray(0,8).toString('hex')!=='89504e470d0a1a0a'||logo.toString('ascii',12,16)!=='IHDR'||![logo.readUInt32BE(16),logo.readUInt32BE(20)].every(n=>n>0&&n<=4096))throw new Error('Invalid packaged brand PNG');
const logoDigest=createHash('sha256').update(logo).digest('hex');
const contents=new Map();
for(const name of files){
 let value=readFileSync(join(root,name),'utf8');
 // Remove Node-only type dependency; the portable HTML renderer has the same input.
 if(name.startsWith('result-generation-orchestrator')){
   value=value.replace("import type {renderPrivateResultDraft} from './result-generation-private-renderer-20261127-CANDIDATE-DO-NOT-DEPLOY.ts';","import type {renderResultDocument} from './result-generation-html-20261127-CANDIDATE-DO-NOT-DEPLOY.ts';").replaceAll('typeof renderPrivateResultDraft','typeof renderResultDocument');
 }
 if(name===files[0]){
   if(!value.includes('enabled:false'))throw new Error('Review package must remain hard disabled');
   if(!value.includes("const packagedLogoBase64='';")||!value.includes("const packagedLogoSha256='';"))throw new Error('Brand placeholders missing');
   value=value.replace("const packagedLogoBase64='';","const packagedLogoBase64='"+logo.toString('base64')+"';").replace("const packagedLogoSha256='';","const packagedLogoSha256='"+logoDigest+"';");
   contents.set('index.ts',value);
 }else contents.set(name,value);
}
const fonts=readFileSync(fontModule,'utf8');
if(fonts.length>5500000||!/^\/\/ Generated temporary deployment asset\./.test(fonts))throw new Error('Invalid font module');
contents.set('generated-verified-fonts.ts',fonts);
for(const [name,source] of contents){
 for(const match of source.matchAll(/(?:from|import)\s*['"]\.\/([^'"]+)['"]/g)){
   if(!contents.has(match[1]))throw new Error('Unpackaged dependency in '+name);
 }
}
mkdirSync(dir,{mode:0o700});
const manifest={status:'REVIEW_ONLY_DISABLED',entrypoint:'index.ts',files:[]};
for(const [name,source] of contents){
 writeFileSync(join(dir,name),source,{flag:'wx',mode:0o600});
 manifest.files.push({name,sha256:createHash('sha256').update(source).digest('hex')});
}
writeFileSync(join(dir,'manifest.json'),JSON.stringify(manifest,null,2)+'\n',{flag:'wx',mode:0o600});
console.log('DISABLED_EDGE_PACKAGE_STAGED');
