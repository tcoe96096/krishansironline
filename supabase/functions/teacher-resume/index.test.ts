import {handleTeacherResume} from './index.ts';
const id='11111111-1111-4111-8111-111111111111';
const origin='https://school.example.test';
function assert(value:unknown,message:string){if(!value)throw new Error(message);}
async function setup(run:(calls:string[])=>Promise<void>){
 const previous=globalThis.fetch;const calls:string[]=[];
 Deno.env.set('TEACHER_APP_ORIGIN',origin);Deno.env.set('SUPABASE_URL','https://api.example.test');Deno.env.set('SUPABASE_SERVICE_ROLE_KEY','service-test');
 Deno.env.delete('TEACHER_RESUME_SCANNER_URL');Deno.env.delete('TEACHER_RESUME_SCANNER_KEY');
 globalThis.fetch=async(input)=>{
  const url=String(input instanceof Request?input.url:input);calls.push(url);
  const data=url.includes('/auth/v1/user')?{id,email:'teacher@example.test'}:url.includes('/teacher_profiles')?{status:'pending',submitted_at:null,revision:1}:true;
  return new Response(JSON.stringify(data),{headers:{'Content-Type':'application/json'}});
 };
 try{await run(calls);}finally{globalThis.fetch=previous;}
}
Deno.test('wrong origin and missing authentication fail before storage',()=>setup(async calls=>{
 assert((await handleTeacherResume(new Request(origin,{method:'POST',headers:{Origin:'https://evil.test'}}))).status===403,'origin denied');
 assert((await handleTeacherResume(new Request(origin,{method:'POST',headers:{Origin:origin}}))).status===401,'auth denied');assert(calls.length===0,'no backend calls');
}));
Deno.test('oversized body is bounded even without trusting Content-Length',()=>setup(async calls=>{
 const result=await handleTeacherResume(new Request(origin,{method:'POST',headers:{Origin:origin,Authorization:'Bearer test'},body:new Uint8Array(5*1024*1024+65537)}));
 assert(result.status===413,'oversize denied');assert(!calls.some(x=>x.includes('/storage/')),'no upload');
}));
Deno.test('executable extension is rejected without scan or upload',()=>setup(async calls=>{
 const form=new FormData();form.append('revision','1');form.append('file',new File(['%PDF-test'],'resume.exe',{type:'application/pdf'}));
 const result=await handleTeacherResume(new Request(origin,{method:'POST',headers:{Origin:origin,Authorization:'Bearer test'},body:form}));
 assert(result.status===400,'bad extension denied');assert(calls.length===1,'only auth request');
}));
Deno.test('missing private scanner fails closed without upload or metadata attachment',()=>setup(async calls=>{
 const form=new FormData();form.append('revision','1');form.append('file',new File(['%PDF-test'],'resume.pdf',{type:'application/pdf'}));
 const result=await handleTeacherResume(new Request(origin,{method:'POST',headers:{Origin:origin,Authorization:'Bearer test'},body:form}));
 assert(result.status===400,'scanner absent denied');assert(calls.some(x=>x.includes('reserve_resume')),'cooldown reserved');assert(!calls.some(x=>x.includes('/storage/')||x.includes('finalize_resume')),'no upload or attachment');
}));
Deno.test('verified scanner receipt uploads privately and attaches through service RPC',()=>setup(async calls=>{
 Deno.env.set('TEACHER_RESUME_SCANNER_URL','https://scanner.example.test');Deno.env.set('TEACHER_RESUME_SCANNER_KEY','test-scanner-key');
 const normal=globalThis.fetch;
 globalThis.fetch=async(input,init)=>{
  const url=String(input instanceof Request?input.url:input);
  if(url.startsWith('https://scanner.'))return new Response(JSON.stringify({clean:true,validDocument:true,sha256:new Headers(init?.headers).get('X-Content-SHA256'),contentType:'application/pdf'}),{headers:{'Content-Type':'application/json'}});
  if(url.includes('/storage/')){calls.push(url);return new Response(JSON.stringify({Key:'private-object'}),{headers:{'Content-Type':'application/json'}});}
  if(url.includes('finalize_resume')){calls.push(url);return new Response(JSON.stringify('44444444-4444-4444-8444-444444444444'),{headers:{'Content-Type':'application/json'}});}
  return normal(input,init);
 };
 const form=new FormData();form.append('revision','1');form.append('file',new File(['%PDF-test'],'resume.pdf',{type:'application/pdf'}));
 const result=await handleTeacherResume(new Request(origin,{method:'POST',headers:{Origin:origin,Authorization:'Bearer test'},body:form}));
 assert(result.status===200,'verified file attached');assert(calls.some(x=>x.includes('/storage/v1/object/teacher-resumes-private/'+id+'/')),'random private user prefix');
 assert(calls.some(x=>x.includes('finalize_resume')),'server metadata attachment');
}));
Deno.test('download RPC denial never returns private bytes',()=>setup(async calls=>{
 Deno.env.set('SUPABASE_ANON_KEY','test-anon');const normal=globalThis.fetch;
 globalThis.fetch=async(input,init)=>{
  const url=String(input instanceof Request?input.url:input);
  if(url.includes('resume_path')){calls.push(url);return new Response(JSON.stringify({code:'42501',message:'denied'}),{status:403,headers:{'Content-Type':'application/json'}});}
  return normal(input,init);
 };
 const result=await handleTeacherResume(new Request(origin,{method:'POST',headers:{Origin:origin,Authorization:'Bearer test','Content-Type':'application/json'},body:JSON.stringify({documentId:'44444444-4444-4444-8444-444444444444'})}));
 assert(result.status===403,'private download denied');assert(!calls.some(x=>x.includes('/storage/')),'no byte retrieval');
}));
