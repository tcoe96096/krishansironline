// Real browser acceptance against a fully intercepted synthetic Supabase API.
// Never call Preview/Production. No real teacher records, photos or storage objects.
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
const base=process.env.TEACHER_PHOTO_MOCK_BASE_URL||'http://127.0.0.1:4179/teacher-beta';
const uuid='11111111-1111-4111-8111-111111111111';
const bucket='teacher-profile-photos-private';
const objectPath=uuid+'/profile.webp';
const browser=await chromium.launch({headless:true});
const context=await browser.newContext({viewport:{width:390,height:844}});
const page=await context.newPage();
const errors=[],writes=[],unhandled=[],storageRequests=[];
let denyUpload=true,photo=null;
let profile={
 user_id:uuid,employee_id:null,display_name:'Synthetic Teacher',
 contact_email:'teacher@example.test',phone:null,experience_years:0,
 status:'pending',revision:2,submitted_at:null,application_reason:null,
 decision_reason:null,reviewed_at:null,requested_scopes:[],
 qualifications:[],assignments:[],resumes:[],
};
page.on('pageerror',e=>errors.push(e.message));
page.on('requestfailed',r=>unhandled.push(r.url()));
page.on('request',r=>{if(new URL(r.url()).pathname.includes('/storage/v1/'))storageRequests.push({method:r.method(),path:new URL(r.url()).pathname});});
await context.addInitScript(({uuid})=>{
 const user={id:uuid,email:'teacher@example.test',aud:'authenticated',role:'authenticated',
  user_metadata:{name:'Synthetic Teacher'},app_metadata:{provider:'google'}};
 const token=btoa(JSON.stringify({alg:'HS256',typ:'JWT'}))+'.'+
  btoa(JSON.stringify({sub:uuid,exp:Math.floor(Date.now()/1000)+3600}))+'.test';
 localStorage.setItem('sb-teacher-test-auth-token',JSON.stringify({
  access_token:token,refresh_token:'test',expires_at:Math.floor(Date.now()/1000)+3600,
  expires_in:3600,token_type:'bearer',user,
 }));
},{uuid});
await context.route('https://teacher-test.supabase.test/**',async route=>{
 const req=route.request(),url=new URL(req.url());
 const path=url.pathname,method=req.method();
 const send=(data,status=200)=>route.fulfill({status,contentType:'application/json',
  headers:{'Access-Control-Allow-Origin':'*'},body:JSON.stringify(data)});
 if(path.endsWith('/auth/v1/user'))return send({
  id:uuid,email:'teacher@example.test',user_metadata:{name:'Synthetic Teacher'},
  app_metadata:{provider:'google'},aud:'authenticated',role:'authenticated'
 });
 if(path.endsWith('/rest/v1/rpc/is_super_admin'))return send(false);
 if(path.endsWith('/rest/v1/rpc/teacher_v2_beta_capabilities'))
  return send({registration:true,resumes:false,analytics:false,advanced:false,materials:false,photos:true});
 if(path.endsWith('/rest/v1/rpc/teacher_v2_snapshot')){
  const args=req.postDataJSON()||{};
  if(args.p_user_id!==uuid)return send({code:'42501'},403);
  return send(profile);
 }
 if(path.includes('/rest/v1/'))return send([]);
 if(path.includes('/storage/v1/object/')){
  const isGet=path.endsWith('/object/'+bucket+'/'+objectPath); // Authenticated SDK download uses bearer token on this route.
  const isPut=path.endsWith('/object/'+bucket+'/'+objectPath);
  if(isGet&&method==='GET'){
   if(photo)return route.fulfill({status:200,body:photo,contentType:'image/webp',
    headers:{'Access-Control-Allow-Origin':'*'}});
   return send({statusCode:'404',error:'Not found',message:'Object not found'},404);
  }
  if(isPut&&(method==='POST'||method==='PUT')){
   writes.push({method,path,bytes:req.postDataBuffer()});
   if(denyUpload)return send({statusCode:'403',error:'Unauthorized',message:'RLS denied'},403);
   const uploaded=req.postDataBuffer();
   assert.ok(uploaded?.includes(Buffer.from('WEBP')),'Uploaded payload must be decoded and converted to WebP');
   // Extract the encoded image bytes from multipart/form-data (do not persist source metadata).
   const riff=uploaded.indexOf(Buffer.from('RIFF')),webp=uploaded.indexOf(Buffer.from('WEBP'),riff);
   assert.ok(riff>=0&&webp===riff+8,'Valid WebP RIFF header expected');
   const len=uploaded.readUInt32LE(riff+4)+8;
   assert.ok(len>12&&len<3*1024*1024&&riff+len<=uploaded.length);
   photo=uploaded.subarray(riff,riff+len);
   return send({Key:bucket+'/'+objectPath});
  }
  return send({statusCode:'403',message:'Forbidden storage path'},403);
 }
 // No external service is allowed in this synthetic acceptance test.
 return send({code:'42501',message:'Unexpected endpoint'},403);
});
try{
 // Generate a valid PNG from Chromium rather than relying on a tiny fixture
 // whose pixel stream may be accepted for display but rejected by createImageBitmap.
 const pngBase64=await page.evaluate(()=>{
  const canvas=document.createElement('canvas');
  canvas.width=8;canvas.height=8;
  const ctx=canvas.getContext('2d');ctx.fillStyle='#0080cc';ctx.fillRect(0,0,8,8);
  return canvas.toDataURL('image/png').split(',')[1];
 });
 const png=Buffer.from(pngBase64,'base64');
 await page.goto(base+'/registration/');
 const registration=page.getByRole('region',{name:'Teacher registration page'});
 await registration.getByRole('heading',{name:'Teacher Registration',exact:true}).waitFor();
 const editor=page.getByRole('region',{name:'Teacher Management v2'});
 await editor.getByRole('region',{name:'Private teacher profile photo'}).waitFor();
 const input=editor.getByLabel('Upload registered teacher photo',{exact:true});
 assert.equal(await input.isDisabled(),false,'An authenticated teacher with an unsent draft can upload');
 await input.setInputFiles({name:'private-teacher.png',mimeType:'image/png',buffer:png});
 try{
  await editor.getByText('Private photo upload was denied or unavailable.').waitFor({timeout:15000});
 }catch(e){
  const statuses=await editor.locator('[role="status"],[role="alert"]').allTextContents();
  throw new Error('Unexpected mock upload result: '+JSON.stringify(statuses)+'; pageerrors='+JSON.stringify(errors)+'; '+String(e));
 }
 assert.equal(photo,null,'Denied upload does not persist media');
 denyUpload=false;
 await input.setInputFiles({name:'private-teacher.png',mimeType:'image/png',buffer:png});
 try{await editor.getByRole('img',{name:'My registered teacher photo'}).waitFor({timeout:12000});}
 catch(e){
  const statuses=await editor.locator('[role="status"],[role="alert"]').allTextContents();
  throw new Error('Photo persisted but UI did not show image: '+JSON.stringify({statuses,storageRequests,photoBytes:photo?.length??0,writes:writes.map(w=>({method:w.method,path:w.path,bytes:w.bytes?.length??0})),errors,unhandled})+'; '+String(e));
 }
 assert.ok(photo&&photo.toString('ascii',8,12)==='WEBP','Successful storage object is normalized WebP');
 assert.equal(writes.length,2,'A denied attempt followed by a permitted upload');
 assert.ok(writes.every(w=>w.path.endsWith('/'+bucket+'/'+objectPath)));
 await page.getByRole('button',{name:'Login',exact:true}).click();
 await page.getByRole('heading',{name:'Teacher Google Login'}).waitFor();
 await page.getByRole('button',{name:'Go to My Dashboard'}).click();
 await page.getByRole('heading',{name:'My Teacher Dashboard'}).waitFor();
 await page.getByRole('img',{name:'My registered teacher photo'}).waitFor();
 assert.equal(await page.getByRole('button',{name:'Upload private photo'}).count(),0,
  'Approved/dashboards only display, never overwrite');
 await page.reload();
 await page.getByRole('img',{name:'My registered teacher photo'}).waitFor();
 assert.equal(await page.evaluate(()=>Object.keys(localStorage).filter(k=>/photo|resume/i.test(k)).length),0,
  'No private media is persisted in localStorage');
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
 assert.deepEqual(unhandled,[]);
 assert.deepEqual(errors,[]);
 console.log('PASS: mocked private WebP photo storage denies unauthorized upload, allows owner draft upload, and restores photo after login and reload without public URL or data persistence.');
}finally{await browser.close();}
