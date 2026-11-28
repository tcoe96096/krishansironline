// Offline staging only; never contacts Supabase or deploys functions.
import {readFileSync,writeFileSync,mkdirSync,existsSync} from 'node:fs';
import {resolve,join} from 'node:path';
import {createHash} from 'node:crypto';
const target=process.argv[2];
if(!target)throw new Error('Specify a fresh staging directory');
const dir=resolve(target);
if(existsSync(dir))throw new Error('Use a fresh staging directory');
const name='docs/results/ksol-result-pdf-download-20261127-CANDIDATE-DO-NOT-DEPLOY.ts';
const source=readFileSync(name,'utf8');
const flag='if (Deno.env.get("KSOL_RESULT_CARD_FUNCTIONS_ENABLED") !== "true") {';
if(source.split(flag).length!==2)throw new Error('Download activation guard changed');
const hardDisabled='const KSOL_DOWNLOAD_REVIEW_DISABLED = true;\n';
const staged=hardDisabled+source.replace(flag,'if (KSOL_DOWNLOAD_REVIEW_DISABLED || Deno.env.get("KSOL_RESULT_CARD_FUNCTIONS_ENABLED") !== "true") {');
if(!staged.includes('KSOL_DOWNLOAD_REVIEW_DISABLED ||'))throw new Error('Review hard gate required');
mkdirSync(dir,{mode:0o700});
writeFileSync(join(dir,'index.ts'),staged,{flag:'wx',mode:0o600});
writeFileSync(join(dir,'manifest.json'),JSON.stringify({status:'REVIEW_ONLY_DISABLED',name:'ksol-result-pdf-download',entrypoint:'index.ts',files:[{name:'index.ts',sha256:createHash('sha256').update(staged).digest('hex')}]},null,2)+'\n',{flag:'wx',mode:0o600});
console.log('DISABLED_PRIVATE_DOWNLOAD_PACKAGE_STAGED');
