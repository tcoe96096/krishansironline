// REVIEW ONLY. Pure handler factory, no listener or live activation.
// Font bytes must be packaged from vetted licensed fonts in the private deployment.
import {generateAndApprovePrivateResult} from './result-generation-orchestrator-20261127-CANDIDATE-DO-NOT-DEPLOY.ts';
import {createPrivateResultBackend} from './result-generation-supabase-adapter-20261127-CANDIDATE-DO-NOT-DEPLOY.ts';
type Backend=Parameters<typeof generateAndApprovePrivateResult>[0];
type Renderer=Parameters<typeof generateAndApprovePrivateResult>[3];
type Config=Parameters<typeof createPrivateResultBackend>[0];
const ORIGINS=new Set(['https://krishansir.online','https://www.krishansir.online']);
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MAX_BODY=2048;
async function readRequest(req:Request){
  if(!req.body)throw new Error('Missing body');
  const reader=req.body.getReader();let size=0;const chunks:Uint8Array[]=[];
  try{for(;;){const {value,done}=await reader.read();if(done)break;size+=value.length;
    if(size>MAX_BODY){await reader.cancel();throw new Error('Request too large');}chunks.push(value);}}
  finally{reader.releaseLock();}
  const bytes=new Uint8Array(size);let offset=0;
  for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.length;}
  return JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes));
}
export function createResultGenerationHandler(config:Config,renderer:Renderer,backendFactory:(c:Config)=>Backend=createPrivateResultBackend){
  return async (req:Request):Promise<Response>=>{
    const origin=req.headers.get('origin');
    const headers=new Headers({'Cache-Control':'private, no-store','Vary':'Origin','Content-Type':'application/json','X-Content-Type-Options':'nosniff'});
    if(origin&&ORIGINS.has(origin)){
      headers.set('Access-Control-Allow-Origin',origin);
      headers.set('Access-Control-Allow-Headers','authorization,apikey,content-type,x-client-info');
      headers.set('Access-Control-Allow-Methods','POST,OPTIONS');
    }
    const reply=(status:number,body:unknown)=>new Response(JSON.stringify(body),{status,headers});
    if(origin&&!ORIGINS.has(origin))return reply(403,{error:'Origin not allowed'});
    if(req.method==='OPTIONS')return new Response(null,{status:204,headers});
    if(!config.enabled)return reply(423,{error:'Automatic report generation disabled'});
    if(req.method!=='POST')return reply(405,{error:'Method not allowed'});
    const bearer=req.headers.get('authorization')||'';
    if(!/^Bearer\s+\S+$/i.test(bearer))return reply(401,{error:'Sign in required'});
    if(req.headers.get('content-type')?.split(';')[0].trim().toLowerCase()!=='application/json')return reply(415,{error:'JSON required'});
    let input;
    try{input=await readRequest(req);}
    catch{return reply(400,{error:'Invalid generation request'});}
    if(!input||typeof input!=='object'||Array.isArray(input)||Object.keys(input).sort().join(',')!=='attemptId,expectedVersion,requestKey'||
      typeof input.attemptId!=='string'||!UUID.test(input.attemptId)||typeof input.requestKey!=='string'||!UUID.test(input.requestKey)||
      !Number.isSafeInteger(input.expectedVersion)||input.expectedVersion<1||input.expectedVersion>2147483647)
      return reply(400,{error:'Invalid generation request'});
    try{
      const backend=backendFactory(config);
      try{await backend.verifySuperAdmin(bearer);}catch{return reply(403,{error:'Not authorized'});}
      const result=await generateAndApprovePrivateResult(backend,bearer,input,renderer);
      return reply(200,{state:result.state,version:result.version});
    }catch{
      // Never expose error internals, student identifiers, marks, PDF bytes or credentials.
      return reply(409,{error:'Approval not confirmed. Refresh server status before retrying.'});
    }
  };
}
// A reviewed entrypoint must enforce disabled-by-default server flags, trusted
// packaged font assets, invocation limits, verified runtime and recovery gates.
// This factory does not deploy an Edge Function or release an official result.
