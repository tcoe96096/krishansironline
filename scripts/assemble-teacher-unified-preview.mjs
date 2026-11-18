#!/usr/bin/env node
// Assemble a separately built Teacher Beta portal into an isolated Preview artifact.
// No deployment, database access, or feature-flag activation occurs here.
import {cpSync, existsSync, lstatSync, mkdirSync, readdirSync, readFileSync, statSync} from 'node:fs';
import {join, resolve, relative, sep} from 'node:path';
const [siteArg, betaArg] = process.argv.slice(2);
if (!siteArg || !betaArg) {
 console.error('Usage: node scripts/assemble-teacher-unified-preview.mjs <site-dist> <teacher-beta-dist>');
 process.exit(2);
}
const site=resolve(siteArg), beta=resolve(betaArg), destination=join(site,'teacher-beta');
for (const dir of [site,beta]) if (!existsSync(dir)||!statSync(dir).isDirectory()) throw Error('Missing build directory: '+dir);
if (site===beta || site.startsWith(beta+sep) || beta.startsWith(site+sep)) throw Error('Build directories must be independent');
if (existsSync(destination)) throw Error('Refusing to overwrite existing teacher-beta output');
for (const path of ['index.html','staff-workspace/index.html','admin/index.html']) if (!existsSync(join(beta,path))) throw Error('Missing isolated portal route: '+path);
function checkTree(dir) {
 for(const item of readdirSync(dir)) {
  const p=join(dir,item),st=lstatSync(p);
  if(st.isSymbolicLink()) throw Error('Symlink forbidden in build artifact: '+relative(beta,p));
  if(st.isDirectory()) checkTree(p);
  else if(!st.isFile()) throw Error('Unexpected build artifact: '+relative(beta,p));
 }
}
checkTree(beta);
const html=readFileSync(join(beta,'index.html'),'utf8');
if(!html.includes('/krishansironline-preview-unified/teacher-beta/')) throw Error('Portal must be built with isolated GitHub Pages base path');
mkdirSync(destination);
cpSync(beta,destination,{recursive:true,errorOnExist:true,force:false});
console.log('Isolated teacher-beta preview assembled without changing existing site paths');
