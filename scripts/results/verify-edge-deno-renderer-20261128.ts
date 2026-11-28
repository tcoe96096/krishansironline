// @ts-nocheck -- Deno-only synthetic fixture; checked by its dedicated runtime.
// Synthetic Deno Node-compat runtime compatibility only. No network permissions or live data.
import PDFDocument from 'npm:pdfkit@0.17.2';
import {Buffer} from 'node:buffer';
import {renderEdgeResultDraft} from '../../docs/results/result-generation-edge-renderer-20261127-CANDIDATE-DO-NOT-DEPLOY.mjs';
const [latin,hindi]=Deno.args;
if(!latin||!hindi)throw new Error('Synthetic font fixture paths required');
const deps={PDFDocument,latinFont:Buffer.from(await Deno.readFile(latin)),hindiFont:Buffer.from(await Deno.readFile(hindi))};
const snapshot={attemptId:'00000000-0000-0000-0000-000000000010',studentName:'काल्पनिक विद्यार्थी (Synthetic Student)',rollNo:'SYN-01',classLevel:'10',schoolName:'नमूना विद्यालय Public School',testTitle:{hi:'सामाजिक विज्ञान Social Science'},subject:'सामाजिक विज्ञान',score:8,totalMarks:10,percentage:80,submittedAt:'2026-01-01T00:00:00Z'};
const design={theme:'modern',version:1,options:{brandTitle:'KRISHAN SIR ONLINE LEARNING',tagline:'शिक्षा और ज्ञान',footerNote:'Synthetic data only'}};
const result=await renderEdgeResultDraft(snapshot,design,deps);
if(!/^[0-9a-f]{64}$/.test(result.sha256)||result.attemptId!==snapshot.attemptId||result.templateVersion!==1)throw new Error('Invalid synthetic output metadata');
const digest=new Uint8Array(await crypto.subtle.digest('SHA-256',result.bytes));
if(Array.from(digest,b=>b.toString(16).padStart(2,'0')).join('')!==result.sha256)throw new Error('Digest mismatch');
await Deno.writeFile('/tmp/ksol-result-render/deno-portable.pdf',result.bytes);
console.log('DENO_PORTABLE_PDF_RENDER_MS='+Math.round(result.elapsedMs));
console.log('DENO_PORTABLE_PDF_SYNTHETIC_ASSERTIONS_PASSED');
