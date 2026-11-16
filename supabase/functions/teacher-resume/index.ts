// DRAFT ONLY. No deployment or storage activation is authorized.
import {createClient,type SupabaseClient} from 'npm:@supabase/supabase-js@2.119.0';
import {hasSafeResumeStructure} from '../../../src/lib/teacherResumeStructure.ts';
import {validateTeacherResume} from '../../../src/lib/teacherManagementValidation.ts';
const bucket='teacher-resumes-private';
const maxBytes=5*1024*1024;
const json=(status:number,value:unknown,headers:HeadersInit)=>new Response(JSON.stringify(value),{status,headers:{...headers,'Content-Type':'application/json','Cache-Control':'no-store'}});
export async function handleTeacherResume(req:Request):Promise<Response>{
 const origin=Deno.env.get('TEACHER_APP_ORIGIN');
 const headers={'Access-Control-Allow-Origin':origin||'null','Access-Control-Allow-Headers':'authorization, apikey, content-type, x-client-info','Access-Control-Allow-Methods':'POST, OPTIONS','Vary':'Origin'};
 if(!origin||req.headers.get('Origin')!==origin)return json(403,{error:'Origin denied'},headers);
 if(req.method==='OPTIONS')return new Response(null,{status:204,headers});
 if(req.method!=='POST')return json(405,{error:'Method denied'},headers);
 let uploadedPath:string|null=null;
 const url=Deno.env.get('SUPABASE_URL')!,key=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
 let admin:SupabaseClient|null=null;
 try{
  if(!url||!key)return json(503,{error:'Resume service unavailable'},headers);
  admin=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
  const token=req.headers.get('Authorization')?.replace(/^Bearer /,'');
  if(!token)return json(401,{error:'Authentication required'},headers);
  const {data:{user},error:authError}=await admin.auth.getUser(token);
  if(authError||!user)return json(401,{error:'Authentication required'},headers);
  // Bound bytes before parsing multipart/JSON; Content-Length is never trusted.
  const chunks:Uint8Array[]=[];let size=0;const reader=req.body?.getReader();
  if(!reader)throw new Error('Body required');
  for(;;){const {value,done}=await reader.read();if(done)break;size+=value.length;if(size>maxBytes+65536){await reader.cancel();return json(413,{error:'File too large'},headers);}chunks.push(value);}
  const bytes=new Uint8Array(size);let offset=0;for(const part of chunks){bytes.set(part,offset);offset+=part.length;}
  const body=new Request(req.url,{method:'POST',headers:{'Content-Type':req.headers.get('Content-Type')||''},body:bytes});
  if(req.headers.get('Content-Type')?.startsWith('application/json')){
   const {documentId}=await body.json();
   if(typeof documentId!=='string'||!/^[a-f0-9-]{36}$/i.test(documentId))throw new Error('Invalid document');
   // User-bound RPC authorizes every read; service_role never decides identity from input.
   const client=createClient(url,Deno.env.get('SUPABASE_ANON_KEY')!,{global:{headers:{Authorization:`Bearer ${token}`}},auth:{persistSession:false}});
   const {data:path,error}=await client.rpc('teacher_v2_resume_path',{p_document_id:documentId});
   if(error||!path)return json(403,{error:'Document access denied'},headers);
   const result=await admin.storage.from(bucket).download(path);
   if(result.error)throw result.error;
   // Proxy bytes: no bearer URL that survives a later access revocation.
   return new Response(result.data,{headers:{...headers,'Content-Type':'application/octet-stream','Content-Disposition':'attachment; filename="teacher-resume"','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
  }
  const form=await body.formData(),file=form.get('file');
  if(!(file instanceof File)||!validateTeacherResume(file))return json(400,{error:'Invalid PDF/DOCX resume'},headers);
  const revision=Number(form.get('revision'));
  if(!Number.isSafeInteger(revision)||revision<1)throw new Error('Invalid revision');
  const {data:profile,error:profileError}=await admin.from('teacher_profiles').select('status,submitted_at,revision').eq('user_id',user.id).single();
  if(profileError||profile.status!=='pending'||profile.submitted_at||profile.revision!==revision)return json(409,{error:'Save an editable profile before upload'},headers);
  // A database reservation enforces a per-user cooldown before expensive scanning.
  const reservation=await admin.rpc('teacher_v2_reserve_resume',{p_user_id:user.id,p_revision:revision});
  if(reservation.error)return json(429,{error:'Upload unavailable; wait before retrying'},headers);
  const fileBytes=new Uint8Array(await file.arrayBuffer());
  if(!hasSafeResumeStructure(fileBytes,file.type))return json(422,{error:'Document structure rejected'},headers);
  const digest=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',fileBytes))).map(x=>x.toString(16).padStart(2,'0')).join('');
  // Scanner must verify bytes, PDF structure / DOCX XML package, archive expansion
  // limits, no macros/encryption, and malware. An unavailable scanner fails closed.
  const scanner=Deno.env.get('TEACHER_RESUME_SCANNER_URL'),scannerKey=Deno.env.get('TEACHER_RESUME_SCANNER_KEY');
  if(!scanner?.startsWith('https://')||!scannerKey)throw new Error('Private scanner unavailable');
  const scan=await fetch(scanner,{method:'POST',redirect:'error',signal:AbortSignal.timeout(20000),headers:{Authorization:`Bearer ${scannerKey}`,'Content-Type':file.type,'X-Content-SHA256':digest},body:fileBytes});
  if(!scan.ok)throw new Error('Verification unavailable');
  const scanReader=scan.body?.getReader();
  if(!scanReader)throw new Error('Invalid scanner response');
  const scanChunks:Uint8Array[]=[];let scanSize=0;
  for(;;){const part=await scanReader.read();if(part.done)break;scanSize+=part.value.length;if(scanSize>16384){await scanReader.cancel();throw new Error('Invalid scanner response');}scanChunks.push(part.value);}
  const scanBytes=new Uint8Array(scanSize);let scanOffset=0;for(const part of scanChunks){scanBytes.set(part,scanOffset);scanOffset+=part.length;}
  const verification=JSON.parse(new TextDecoder().decode(scanBytes));
  if(verification.clean!==true||verification.validDocument!==true||verification.sha256!==digest||verification.contentType!==file.type)return json(422,{error:'Document verification failed'},headers);
  const path=`${user.id}/${crypto.randomUUID()}.${file.type==='application/pdf'?'pdf':'docx'}`;
  const upload=await admin.storage.from(bucket).upload(path,fileBytes,{contentType:file.type,upsert:false});
  if(upload.error)throw upload.error;
  uploadedPath=path;
  const finalized=await admin.rpc('teacher_v2_finalize_resume',{p_user_id:user.id,p_revision:revision,p_path:path,p_filename:file.name,p_content_type:file.type,p_size:file.size,p_sha256:digest});
  if(finalized.error||typeof finalized.data!=='string'||!/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i.test(finalized.data))throw new Error('Attachment not confirmed');
  uploadedPath=null;
  return json(200,{documentId:finalized.data},headers);
 }catch{
  if(uploadedPath&&admin){try{await admin.storage.from(bucket).remove([uploadedPath]);}catch{/* Private orphan cleanup must be retried by the approved retention worker. */}}
  return json(400,{error:'Resume operation failed; no verified document was attached'},headers);
 }
}
if(import.meta.main)Deno.serve(handleTeacherResume);
