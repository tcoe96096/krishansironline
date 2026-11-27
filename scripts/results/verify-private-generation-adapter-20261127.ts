// Synthetic network fixture. No live Supabase requests or credentials.
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createPrivateResultBackend} from '../../docs/results/result-generation-supabase-adapter-20261127-CANDIDATE-DO-NOT-DEPLOY.ts';
import {generateAndApprovePrivateResult} from '../../docs/results/result-generation-orchestrator-20261127-CANDIDATE-DO-NOT-DEPLOY.ts';
const actor='00000000-0000-0000-0000-000000000001';
const attempt='00000000-0000-0000-0000-000000000010';
const recipient='00000000-0000-0000-0000-000000000002';
const key='00000000-0000-0000-0000-000000000011';
const origin='https://syntheticonly.supabase.co';
const cfg={enabled:true,supabaseUrl:origin,anonKey:'fake-anon',serviceKey:'fake-service'};
const snapshot={attemptId:attempt,studentId:recipient,studentName:'Synthetic Student',rollNo:'SYN-01',classLevel:'10',schoolName:'Synthetic School',testTitle:{en:'Synthetic Test'},subject:'Social Science',score:8,totalMarks:10,percentage:80,submittedAt:'2026-01-01T00:00:00Z'};
const design={theme:'modern' as const,version:1,options:{brandTitle:'KSOL'}};
const bytes=Buffer.from('%PDF-1.4 synthetic bytes only');
const sha256=createHash('sha256').update(bytes).digest('hex');
const renderer=async()=>({bytes,sha256,templateVersion:1,attemptId:attempt});
let authorized=true,corrupt=false,stored=false,approvals=0;
const originalFetch=globalThis.fetch;
globalThis.fetch=async (input,init)=>{
 const url=new URL(String(input));assert.equal(url.origin,origin,'Unexpected network target');
 const headers=new Headers(init?.headers);
 const json=(value:unknown)=>Response.json(value);
 if(url.pathname==='/auth/v1/user'||url.pathname==='/rest/v1/rpc/is_super_admin'){
   assert.equal(headers.get('authorization'),'Bearer fake-user');
   assert.equal(headers.get('apikey'),'fake-anon');
   return json(url.pathname==='/auth/v1/user'?{id:actor}:authorized);
 }
 assert.equal(headers.get('authorization'),'Bearer fake-service');
 if(url.pathname==='/rest/v1/rpc/ksol_result_generation_snapshot')return json(snapshot);
 if(url.pathname==='/rest/v1/result_card_templates')return json([design]);
 if(url.pathname==='/storage/v1/object/result-cards-private/'+attempt+'/v1/'+sha256+'.pdf'){
   assert.equal(headers.get('x-upsert'),'false');assert.equal(init?.method,'POST');stored=true;return json({});
 }
 if(url.pathname==='/storage/v1/object/authenticated/result-cards-private/'+attempt+'/v1/'+sha256+'.pdf'){
   assert.equal(stored,true);
   return new Response(new Uint8Array(corrupt?Buffer.from('%PDF-corrupt'):bytes),{headers:{'Content-Type':'application/pdf'}});
 }
 if(url.pathname==='/rest/v1/rpc/ksol_result_approve_pdf'){
   const body=JSON.parse(String(init?.body));assert.deepEqual(body.p_expected_snapshot,snapshot);assert.equal(body.p_actor_id,actor);assert.equal(body.p_artifact_sha256,sha256);assert.equal(body.p_request_key,key);
   approvals++;return json('approved');
 }
 throw new Error('Unexpected API operation');
};
try{
 assert.throws(()=>createPrivateResultBackend({...cfg,enabled:false}));
 const backend=createPrivateResultBackend(cfg);
 const request={attemptId:attempt,expectedVersion:1,requestKey:key};
 const generate=()=>generateAndApprovePrivateResult(backend,'Bearer fake-user',request,renderer);
 assert.deepEqual(await generate(),{state:'approved',version:1,sha256});
 assert.equal(approvals,1);
 authorized=false;stored=false;
 await assert.rejects(generate);assert.equal(stored,false);assert.equal(approvals,1);
 authorized=true;corrupt=true;
 await assert.rejects(generate);assert.equal(approvals,1);
 console.log('RESULT_PRIVATE_GENERATION_ADAPTER_SYNTHETIC_ASSERTIONS_PASSED');
}finally{globalThis.fetch=originalFetch;}
