// @ts-nocheck -- Deno-only deployment template, excluded from browser runtime.
// REVIEW ONLY: package with the reviewed renderer, handler and generated font module.
// Never enable in production until complete recovery, private storage and JWT checks pass.
import PDFDocument from 'npm:pdfkit@0.17.2';
import {Buffer} from 'node:buffer';
import {renderEdgeResultDraft} from './result-generation-edge-renderer-20261127-CANDIDATE-DO-NOT-DEPLOY.mjs';
import {createResultGenerationHandler} from './result-generation-edge-handler-20261128-CANDIDATE-DO-NOT-DEPLOY.ts';
import {latinBase64,hindiBase64,latinSha256,hindiSha256} from './generated-verified-fonts.ts';
const env=(name:string)=>Deno.env.get(name)||'';
const font=async(encoded:string,expected:string)=>{
  const bytes=Buffer.from(encoded,'base64');
  if(bytes.length<1024||bytes.length>=2000000||!/^[a-f0-9]{64}$/.test(expected))throw new Error('Invalid packaged font');
  const actual=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),b=>b.toString(16).padStart(2,'0')).join('');
  if(actual!==expected)throw new Error('Packaged font digest mismatch');
  return bytes;
};
const config={enabled:false,supabaseUrl:env('SUPABASE_URL'),anonKey:env('SUPABASE_ANON_KEY'),serviceKey:env('SUPABASE_SERVICE_ROLE_KEY')};
// Hard disabled in this review entrypoint: a separate reviewed release must
// remove this gate only after official-document wording and full recovery pass.
const renderer=async(snapshot,design)=>renderEdgeResultDraft(snapshot,design,{
  purpose:'prepared',PDFDocument,latinFont:await font(latinBase64,latinSha256),hindiFont:await font(hindiBase64,hindiSha256)
});
Deno.serve(createResultGenerationHandler(config,renderer));
