// @ts-nocheck -- Deno-only temporary fixture; not part of browser runtime.
// SYNTHETIC CI FIXTURE ONLY. Never deploy to a hosted project.
// Copied only to the disposable local stack, not the review deployment package.
// No real data, no database writes, no external HTTP requests.
import PDFDocument from 'npm:pdfkit@0.17.2';
import {Buffer} from 'node:buffer';
import {renderEdgeResultDraft} from './result-generation-edge-renderer-20261127-CANDIDATE-DO-NOT-DEPLOY.mjs';
import {createResultGenerationHandler} from './result-generation-edge-handler-20261128-CANDIDATE-DO-NOT-DEPLOY.ts';
import {latinBase64,hindiBase64,latinSha256,hindiSha256} from './generated-verified-fonts.ts';
const local=Deno.env.get('SUPABASE_URL')||'';
if(!/^http:\/\/(?:kong|supabase_kong_ksol-synthetic-stack):8000\/?$/.test(local))throw new Error('Disposable local Edge only');
const anon=Deno.env.get('SUPABASE_ANON_KEY')||'';
if(!anon)throw new Error('Missing local fixture credential');
const actor='00000000-0000-0000-0000-000000000001';
const snapshot={studentId:'00000000-0000-0000-0000-000000000002',attemptId:'00000000-0000-0000-0000-000000000010',studentName:'काल्पनिक विद्यार्थी (Synthetic Student)',rollNo:'SYN-01',classLevel:'10',schoolName:'नमूना विद्यालय',testTitle:{hi:'सामाजिक विज्ञान'},subject:'सामाजिक विज्ञान',score:8,totalMarks:10,percentage:80,submittedAt:'2026-01-01T00:00:00Z'};
const design={theme:'modern',version:1,options:{brandTitle:'KRISHAN SIR ONLINE LEARNING',tagline:'शिक्षा और ज्ञान',footerNote:'Synthetic data only'}} as const;
const digest=async(bytes:Uint8Array)=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new Uint8Array(bytes))),b=>b.toString(16).padStart(2,'0')).join('');
const decode=async(value:string,sha:string)=>{const b=Buffer.from(value,'base64');if(await digest(b)!==sha)throw new Error('Synthetic font mismatch');return b;};
const renderer=async(s,d)=>renderEdgeResultDraft(s,d,{purpose:'prepared',PDFDocument,latinFont:await decode(latinBase64,latinSha256),hindiFont:await decode(hindiBase64,hindiSha256)});
Deno.serve(async req=>{
 // Per-request, entirely in-memory synthetic backend. No real user is authenticated here.
 let stored:{key:string;bytes:Uint8Array}|undefined;
 const backend={
   async verifySuperAdmin(bearer:string){if(bearer!=='Bearer '+anon)throw new Error('Fixture authorization denied');return actor;},
   async getSnapshot(id:string,attempt:string){if(id!==actor||attempt!==snapshot.attemptId)throw new Error('Unknown fixture');return snapshot;},
   async getPublishedDesign(){return design;},
   async putPrivatePdf(key:string,bytes:Uint8Array){if(stored)throw new Error('Duplicate fixture object');stored={key,bytes:new Uint8Array(bytes)};},
   async readPrivatePdf(key:string,max:number){if(!stored||stored.key!==key||stored.bytes.length>max)throw new Error('Fixture missing');return stored.bytes;},
   async approve(input){if(!stored||input.actorId!==actor||input.attemptId!==snapshot.attemptId||input.expectedVersion!==1||input.expectedSnapshot.studentId!==snapshot.studentId||await digest(stored.bytes)!==input.sha256||stored.key!==snapshot.attemptId+'/v1/'+input.sha256+'.pdf')throw new Error('Fixture approval mismatch');return 'approved' as const;}
 };
 const handler=createResultGenerationHandler({enabled:true,supabaseUrl:local,anonKey:anon,serviceKey:''},renderer,()=>backend);
 return handler(req);
});
