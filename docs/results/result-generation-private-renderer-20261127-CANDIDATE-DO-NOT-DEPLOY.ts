// REVIEW ONLY: trusted private worker. Never run real student records on public CI.
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {mkdtemp,writeFile,readFile,rm,stat} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,isAbsolute} from 'node:path';
import {pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
import {renderResultDocument} from './result-generation-html-20261127-CANDIDATE-DO-NOT-DEPLOY.ts';

type Snapshot=Parameters<typeof renderResultDocument>[0];
type Design=Parameters<typeof renderResultDocument>[1];
const run=promisify(execFile);
const MAX_PDF=10485760;

/** This worker must be isolated from external networks, use a verified
 * Chromium binary and a non-root account with Chromium sandbox enabled.
 * No service keys or other credentials are passed into the renderer process.
 * It returns draft bytes to the trusted server, not a public URL or a release.
 */
export async function renderPrivateResultDraft(snapshot:Snapshot,design:Design,chromiumExecutable:string){
  if(!isAbsolute(chromiumExecutable)||process.getuid?.()===0)throw new Error('Private renderer requires an absolute browser path and non-root sandbox');
  const html=renderResultDocument(snapshot,design);
  const dir=await mkdtemp(join(tmpdir(),'ksol-private-report-'));
  try{
    const source=join(dir,'report.html'),pdfPath=join(dir,'report.pdf');
    await writeFile(source,html,{encoding:'utf8',mode:0o600,flag:'wx'});
    try{
      await run(chromiumExecutable,[
        '--headless','--disable-gpu','--disable-background-networking','--no-first-run',
        '--no-default-browser-check','--no-pdf-header-footer',
        '--user-data-dir='+join(dir,'profile'),'--print-to-pdf='+pdfPath,
        pathToFileURL(source).href,
      ],{
        cwd:dir,timeout:30000,maxBuffer:65536,
        env:{HOME:dir,TMPDIR:dir,PATH:'/usr/bin:/bin',LANG:'C.UTF-8'},
      });
    }catch{throw new Error('Private PDF rendering failed');}
    const size=(await stat(pdfPath)).size;
    if(size<8||size>MAX_PDF)throw new Error('Invalid generated PDF size');
    const bytes=await readFile(pdfPath);
    if(bytes.length!==size||bytes.subarray(0,5).toString('ascii')!=='%PDF-')throw new Error('Invalid generated PDF');
    return {bytes,sha256:createHash('sha256').update(bytes).digest('hex'),templateVersion:design.version,attemptId:snapshot.attemptId};
  }finally{await rm(dir,{recursive:true,force:true});}
}
// Do not connect to a public HTTP rendering API. Deployment requires an
// approved private worker, resource limits, sandbox and egress verification,
// font validation, authorization, snapshot binding and recovery proof.
