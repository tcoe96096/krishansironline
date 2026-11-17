// Browser contract: optional resumes/analytics with Advanced Mode OFF.
// Synthetic Google auth + API. No Supabase writes or real student data.
import assert from 'node:assert/strict';
import {chromium} from 'playwright';

const base='http://127.0.0.1:4179';
const id='11111111-1111-4111-8111-111111111111';
let analyticsReady=false,resumesReady=false,resultCalls=0;
const errors=[];
const profile={
 user_id:id,display_name:'Test Teacher',contact_email:'teacher@example.test',
 phone:null,experience_years:2,status:'pending',revision:2,submitted_at:null,
 employee_id:null,application_reason:null,decision_reason:null,
 qualifications:[],requested_scopes:[],assignments:[],resumes:[]
};
const browser=await chromium.launch({headless:true});
try{
 const context=await browser.newContext({viewport:{width:390,height:844}});
 const page=await context.newPage();
 page.on('pageerror',e=>errors.push(e.message));
 await context.addInitScript(({id})=>{
  const user={id,email:'teacher@example.test',aud:'authenticated',role:'authenticated',
    user_metadata:{name:'Test Teacher'},app_metadata:{provider:'google'}};
  const token=btoa(JSON.stringify({alg:'HS256',typ:'JWT'}))+'.'+
   btoa(JSON.stringify({sub:id,exp:Math.floor(Date.now()/1000)+3600}))+'.test';
  localStorage.setItem('sb-teacher-test-auth-token',JSON.stringify({
   access_token:token,refresh_token:'test',expires_at:Math.floor(Date.now()/1000)+3600,
   expires_in:3600,token_type:'bearer',user
  }));
 },{id});
 await context.route('https://teacher-test.supabase.test/**',async route=>{
  const req=route.request(),url=new URL(req.url());
  let data=null,status=200;
  if(url.pathname.includes('/rpc/')){
   const op=url.pathname.split('/').at(-1);
   if(op==='teacher_v2_beta_capabilities')
    data={registration:true,materials:false,analytics:analyticsReady,resumes:resumesReady,advanced:false};
   else if(op==='teacher_v2_snapshot')data=profile;
   else if(op==='teacher_v2_result_summary'){
    resultCalls++;
    data=[{test_id:'test-x',availability:'available',average_band:'60-<80'}];
   }else if(op==='is_super_admin')data=false;
   else {status=403;data={code:'42501'};}
  }else if(url.pathname.includes('/rest/v1/')){
   data=req.headers().accept?.includes('vnd.pgrst.object')?null:[];
  }else if(url.pathname.includes('/auth/v1/user')){
   data={id,email:'teacher@example.test',user_metadata:{}};
  }
  await route.fulfill({status,contentType:'application/json',
   headers:{'Access-Control-Allow-Origin':'*'},body:JSON.stringify(data)});
 });
 await page.goto(base+'/staff-workspace/');
 const panel=page.getByRole('region',{name:'Teacher Management v2',exact:true});
 await panel.getByText('Employee ID:',{exact:false}).waitFor();
 assert.equal(await panel.getByLabel('Assignment work',{exact:true}).count(),0);
 assert.equal(await panel.locator('input[type=file]').count(),0);
 assert.equal(await panel.getByRole('button',{name:'Review result summary'}).count(),0);
 assert.equal(resultCalls,0,'No private analytics RPC before explicit teacher action');

 analyticsReady=true;resumesReady=true;
 await panel.getByRole('button',{name:'Refresh teacher profile',exact:true}).click();
 const work=panel.getByLabel('Assignment work',{exact:true});
 await work.waitFor();
 assert.deepEqual(await work.locator('option').allTextContents(),['materials.draft','result.review'],
  'Analytics must not unlock assessment authoring or unrestricted advanced work');
 await panel.locator('input[type=file]').waitFor();
 await work.selectOption('result.review');
 await panel.getByRole('button',{name:'Add scope',exact:true}).click();
 await panel.getByText('Class 10 · History · result.review',{exact:false}).waitFor();
 
 profile.status='approved';profile.employee_id='KSOL-T-123456ABCDEF';
 profile.assignments=[{id:'a1',class_level:'10',subject:'History',work_type:'result.review',status:'active'}];
 profile.resumes=[{id:'d1',original_filename:'verified-resume.pdf',verification_status:'verified'}];
 await page.reload();
 await panel.getByRole('button',{name:'Review result summary'}).waitFor();
 await panel.getByRole('button',{name:'Review result summary'}).click();
 await panel.getByText('Fixed-cohort average band: 60-<80%',{exact:false}).waitFor();
 assert.equal(resultCalls,1);
 assert.equal(await panel.getByText(/average_percentage|submitted_count|student_id/).count(),0);

 analyticsReady=false;resumesReady=false;
 await page.reload();
 await panel.getByText('Employee ID:',{exact:false}).waitFor();
 assert.equal(await panel.getByRole('button',{name:'Review result summary'}).count(),0);
 assert.equal(await panel.getByRole('button',{name:'Download private resume'}).count(),0);
 assert.equal(resultCalls,1,'Feature toggle off must not make another analytics call');
 assert.deepEqual(errors,[]);
 console.log('PASS: optional analytics/resume server capabilities gate UI; no advanced assessment permission, fixed band only, server OFF hides actions (synthetic API).');
}finally{await browser.close();}
