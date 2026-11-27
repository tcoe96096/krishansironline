// REVIEW ONLY. No listener, deployment, credentials or live database calls at import.
import type {generateAndApprovePrivateResult} from './result-generation-orchestrator-20261127-CANDIDATE-DO-NOT-DEPLOY.ts';
type Backend=Parameters<typeof generateAndApprovePrivateResult>[0];
type Snapshot=Awaited<ReturnType<Backend['getSnapshot']>>;
type Design=Awaited<ReturnType<Backend['getPublishedDesign']>>;
const MAX_PDF=10485760;
const KEY=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\/v[1-9][0-9]*\/[0-9a-f]{64}\.pdf$/;
async function bounded(res:Response,max:number){
  if(!res.body)throw new Error('Missing response');
  const reader=res.body.getReader();const chunks:Uint8Array[]=[];let size=0;
  try{while(true){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>max){await reader.cancel();throw new Error('Response too large');}chunks.push(value);}}
  finally{reader.releaseLock();}
  const out=new Uint8Array(size);let offset=0;for(const chunk of chunks){out.set(chunk,offset);offset+=chunk.byteLength;}return out;
}
export function createPrivateResultBackend(config:{enabled:boolean;supabaseUrl:string;anonKey:string;serviceKey:string}):Backend{
  if(!config.enabled)throw new Error('Private generation disabled');
  const url=new URL(config.supabaseUrl);
  if(url.protocol!=='https:'||! /^[a-z0-9]+\.supabase\.co$/.test(url.hostname)||url.username||url.password||url.port||url.pathname!=='/'||url.search||url.hash||!config.anonKey||!config.serviceKey)throw new Error('Invalid private backend configuration');
  const base=url.origin;
  const serviceAuth={apikey:config.serviceKey,Authorization:'Bearer '+config.serviceKey};
  const request=(path:string,init:RequestInit)=>fetch(base+path,{...init,redirect:'error',cache:'no-store',signal:AbortSignal.timeout(20000)});
  async function json(path:string,headers:Record<string,string>,body?:unknown):Promise<unknown>{
    const res=await request(path,{method:body===undefined?'GET':'POST',headers:{...headers,'Content-Type':'application/json'},...(body===undefined?{}:{body:JSON.stringify(body)})});
    if(!res.ok)throw new Error('Private backend operation failed');
    return JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(await bounded(res,65536)));
  }
  const objectPath=(key:string)=>{if(!KEY.test(key))throw new Error('Invalid private artifact key');return key.split('/').map(encodeURIComponent).join('/');};
  return {
    async verifySuperAdmin(bearer){
      if(!/^Bearer\s+\S+$/i.test(bearer))throw new Error('Sign in required');
      const headers={apikey:config.anonKey,Authorization:bearer};
      const user=await json('/auth/v1/user',headers) as {id?:unknown};
      if(typeof user?.id!=='string'||await json('/rest/v1/rpc/is_super_admin',headers,{})!==true)throw new Error('Not authorized');
      return user.id;
    },
    async getSnapshot(actorId,attemptId){
      const value=await json('/rest/v1/rpc/ksol_result_generation_snapshot',serviceAuth,{p_actor_id:actorId,p_attempt_id:attemptId});
      if(!value||typeof value!=='object'||Array.isArray(value))throw new Error('Invalid snapshot');
      return value as Snapshot;
    },
    async getPublishedDesign(){
      const value=await json('/rest/v1/result_card_templates?select=theme,options,version&template_key=eq.default&is_published=eq.true',serviceAuth);
      if(!Array.isArray(value)||value.length!==1||!value[0]||typeof value[0].options!=='object'||!value[0].options||Array.isArray(value[0].options))throw new Error('Published design unavailable');
      return value[0] as Design;
    },
    async putPrivatePdf(key,bytes){
      if(bytes.length<8||bytes.length>MAX_PDF)throw new Error('Invalid PDF size');
      const res=await request('/storage/v1/object/result-cards-private/'+objectPath(key),{method:'POST',headers:{...serviceAuth,'Content-Type':'application/pdf','x-upsert':'false'},body:new Uint8Array(bytes)});
      // Conflict can only be reconciled by the orchestrator's exact byte readback.
      if(!res.ok&&res.status!==409)throw new Error('Private PDF storage failed');
      await res.body?.cancel();
    },
    async readPrivatePdf(key,maxBytes){
      if(!Number.isSafeInteger(maxBytes)||maxBytes<8||maxBytes>MAX_PDF)throw new Error('Invalid read limit');
      const res=await request('/storage/v1/object/authenticated/result-cards-private/'+objectPath(key),{method:'GET',headers:serviceAuth});
      if(!res.ok||res.headers.get('content-type')?.split(';')[0].trim().toLowerCase()!=='application/pdf')throw new Error('Private PDF unavailable');
      return bounded(res,maxBytes);
    },
    async approve(input){
      const value=await json('/rest/v1/rpc/ksol_result_approve_pdf',serviceAuth,{p_actor_id:input.actorId,p_attempt_id:input.attemptId,p_expected_version:input.expectedVersion,p_artifact_sha256:input.sha256,p_request_key:input.requestKey,p_expected_snapshot:input.expectedSnapshot});
      if(value!=='approved')throw new Error('Approval not confirmed');
      return 'approved';
    },
  };
}
// Call only from a reviewed private server, with secrets in server environment.
// Never expose this adapter to Vite or publish service credentials.
// No actual endpoint or private runtime is provisioned by this candidate.
