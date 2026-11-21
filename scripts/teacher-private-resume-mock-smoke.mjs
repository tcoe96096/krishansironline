// Browser acceptance for private Teacher Resume using ONLY intercepted synthetic API.
// No Preview/Production Supabase, no personal documents, no real Storage writes.
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
const base=process.env.TEACHER_RESUME_MOCK_BASE_URL||'http://127.0.0.1:4180/teacher-beta';
const userId='11111111-1111-4111-8111-111111111111';
const docIds=['a3333333-3333-4333-8333-333333333333','b3333333-3333-4333-8333-333333333333'];
const bucket='teacher-resumes-private';
const browser=await chromium.launch({headless:true});
const context=await browser.newContext({viewport:{width:390,height:844}});
const page=await context.newPage();
const errors=[],unhandled=[],writes=[],publicLinks=[];
let deniedReserve=true,deniedUpload=true,reservationNumber=0,finalizeCount=0;
const stored=new Map();
const profile={
 user_id:userId,employee_id:null,display_name:'Synthetic Resume Teacher',
 contact_email:'teacher@example.test',phone:null,experience_years:0,
 status:'pending',revision:3,submitted_at:null,application_reason:null,
 decision_reason:null,reviewed_at:null,requested_scopes:[],qualifications:[],
 assignments:[],resumes:[]
};
page.on('pageerror',e=>errors.push(e.message));
page.on('requestfailed',r=>unhandled.push(r.url()));
page.on('request',r=>{
 const path=new URL(r.url()).pathname;
 if(/\/storage\/v1\/object\/(?:public|sign)\//.test(path))publicLinks.push(path);
});
await context.addInitScript(({userId})=>{
 const user={id:userId,email:'teacher@example.test',aud:'authenticated',role:'authenticated',
  user_metadata:{name:'Synthetic Resume Teacher'},app_metadata:{provider:'google'}};
 const token=btoa(JSON.stringify({alg:'HS256',typ:'JWT'}))+'.'+
   btoa(JSON.stringify({sub:userId,exp:Math.floor(Date.now()/1000)+3600}))+'.test';
 localStorage.setItem('sb-teacher-test-auth-token',JSON.stringify({
  access_token:token,refresh_token:'test',expires_at:Math.floor(Date.now()/1000)+3600,
  expires_in:3600,token_type:'bearer',user
 }));
},{userId});
await context.route('https://teacher-test.supabase.test/**',async route=>{
 const req=route.request(),url=new URL(req.url()),path=url.pathname,method=req.method();
 const json=(data,status=200)=>route.fulfill({status,contentType:'application/json',
  headers:{'Access-Control-Allow-Origin':'*'},body:JSON.stringify(data)});
 if(path.endsWith('/auth/v1/user'))return json({
  id:userId,email:'teacher@example.test',aud:'authenticated',role:'authenticated',
  user_metadata:{name:'Synthetic Resume Teacher'},app_metadata:{provider:'google'}
 });
 if(path.endsWith('/rest/v1/rpc/is_super_admin'))return json(false);
 if(path.endsWith('/rest/v1/rpc/teacher_v2_beta_capabilities'))
  return json({registration:true,resumes:true,photos:false,analytics:false,advanced:false,materials:false});
 if(path.endsWith('/rest/v1/rpc/teacher_v2_snapshot')){
  const args=req.postDataJSON()||{};
  return args.p_user_id===userId?json(profile):json({code:'42501',message:'Forbidden'},403);
 }
 if(path.endsWith('/rest/v1/rpc/teacher_v2_resume_reserve')){
  writes.push({op:'reserve',args:req.postDataJSON()});
  if(deniedReserve)return json({code:'42501',message:'Server denied reservation'},403);
  const args=req.postDataJSON(),id=docIds[reservationNumber++];
  if(!id||args.p_filename!=='professional-cv.pdf'||args.p_content_type!=='application/pdf')
   return json({code:'22023',message:'Invalid file metadata'},400);
  return json({document_id:id,storage_path:userId+'/'+id+'.pdf'});
 }
 if(path.endsWith('/rest/v1/rpc/teacher_v2_resume_finalize')){
  const args=req.postDataJSON();
  writes.push({op:'finalize',args});
  const key=userId+'/'+args.p_document_id+'.pdf';
  if(!stored.has(key))return json({code:'42501',message:'Missing private object'},403);
  finalizeCount++;
  profile.resumes.push({id:args.p_document_id,original_filename:'professional-cv.pdf',verification_status:'pending'});
  return json(true);
 }
 if(path.startsWith('/storage/v1/object/')){
  const prefix='/storage/v1/object/'+bucket+'/';
  if(!path.startsWith(prefix)||method!=='POST')return json({statusCode:'403',message:'Forbidden'},403);
  const key=path.slice(prefix.length),payload=req.postDataBuffer();
  writes.push({op:'storage',key,bytes:payload?.length??0});
  if(deniedUpload)return json({statusCode:'403',error:'Unauthorized',message:'RLS denied'},403);
  assert.ok(docIds.some(id=>key===userId+'/'+id+'.pdf'),'Only server issued, owner-scoped key may be uploaded');
  assert.ok(payload?.includes(Buffer.from('%PDF-')),'Uploaded payload must contain PDF signature');
  stored.set(key,payload);
  return json({Key:bucket+'/'+key});
 }
 if(path.startsWith('/rest/v1/'))return json([]);
 return json({code:'42501',message:'Unexpected fake endpoint'},403);
});
try{
 await page.goto(base+'/registration/');
 await page.getByRole('heading',{name:'Teacher Registration',exact:true}).waitFor();
 const editor=page.getByRole('region',{name:'Teacher Management v2'});
 await editor.getByRole('region',{name:'Private teacher resume upload'}).waitFor();
 const input=editor.getByLabel('Select private teacher resume',{exact:true});
 await input.setInputFiles({name:'fake.pdf',mimeType:'application/pdf',buffer:Buffer.from('not-a-pdf')});
 await editor.getByText('Document contents do not match the selected PDF/DOCX type.').waitFor();
 assert.equal(writes.length,0,'Bad file signatures cannot reach an RPC or Storage');
 const valid=Buffer.from('%PDF-1.7\n1 0 obj\n<< /Type /Catalog >>\nendobj\n%%EOF\n');
 await input.setInputFiles({name:'professional-cv.pdf',mimeType:'application/pdf',buffer:valid});
 await editor.getByText('Teacher operation denied or unavailable. Refresh and check your access.').waitFor();
 assert.deepEqual(writes.map(w=>w.op),['reserve'],'Denied reservation must not upload anything');
 deniedReserve=false;
 await input.setInputFiles({name:'professional-cv.pdf',mimeType:'application/pdf',buffer:valid});
 await editor.getByText('Private resume upload was denied. The reservation was not finalized.').waitFor();
 assert.equal(finalizeCount,0,'Storage denial must not finalize document');
 deniedUpload=false;
 await input.setInputFiles({name:'professional-cv.pdf',mimeType:'application/pdf',buffer:valid});
 // Upload success refreshes the parent form, so the transient status can
 // unmount before Playwright sees it. Assert the server-side finalization instead.
 for(let i=0;i<100&&finalizeCount===0;i++)await new Promise(resolve=>setTimeout(resolve,50));
 assert.equal(finalizeCount,1,'Only confirmed Storage upload permits one finalize');
 assert.equal(profile.resumes.length,1);
 assert.equal(profile.resumes[0].verification_status,'pending','Upload is not verification');
 assert.equal(writes.filter(w=>w.op==='storage').length,2);
 assert.equal(writes.filter(w=>w.op==='finalize').length,1);
 await page.getByRole('button',{name:'Login',exact:true}).click();
 await page.getByRole('heading',{name:'Teacher Google Login'}).waitFor();
 await page.getByRole('button',{name:'Go to My Dashboard'}).click();
 await page.getByRole('heading',{name:'My Teacher Dashboard'}).waitFor();
 await page.getByText('professional-cv.pdf',{exact:true}).waitFor();
 await page.reload();
 await page.getByText('professional-cv.pdf',{exact:true}).waitFor();
 assert.equal(await page.getByRole('button',{name:'Select and upload private resume'}).count(),0,'Dashboard does not offer resume upload');
 assert.equal(await page.evaluate(()=>Object.keys(localStorage).filter(k=>/resume|document/i.test(k)).length),0);
 assert.deepEqual(publicLinks,[],'No public or signed document URL was used');
 assert.deepEqual(unhandled,[]);
 assert.deepEqual(errors,[]);
 console.log('PASS: synthetic private teacher resume rejects invalid bytes, denies unapproved reserve/storage, finalizes once and restores pending metadata after login/reload.');
}finally{await browser.close();}
