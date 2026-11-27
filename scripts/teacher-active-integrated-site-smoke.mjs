// Active Teacher integration in the main website, synthetic credentials and RPCs only.
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
const base='http://127.0.0.1:4181';
const id='11111111-1111-4111-8111-111111111111';
const browser=await chromium.launch({headless:true});
const context=await browser.newContext({viewport:{width:390,height:844}});
let foreign=false;
const calls=[];
const snapshot={user_id:id,employee_id:null,display_name:'Synthetic Teacher',contact_email:'teacher@example.test',phone:null,experience_years:3,status:'pending',revision:1,submitted_at:null,reviewed_at:null,application_reason:null,decision_reason:null,requested_scopes:[],qualifications:[],assignments:[],resumes:[]};
try{
 await context.route('**/*',async route=>{
  const req=route.request(),url=new URL(req.url());
  if(url.origin===base)return route.continue();
  if(url.origin!=='https://teacher-test.supabase.test')return route.abort();
  const op=url.pathname.split('/').at(-1);
  let data=null,status=200;
  if(url.pathname.includes('/rpc/')){
   calls.push(op);
   if(op==='teacher_v2_beta_capabilities')data={registration:true,materials:false,analytics:false,resumes:false,photos:false,advanced:false};
   else if(op==='teacher_v2_snapshot'){
    assert.equal(req.postDataJSON().p_user_id,id);
    data=foreign?{...snapshot,user_id:'22222222-2222-4222-8222-222222222222',display_name:'Foreign synthetic profile'}:snapshot;
   }else if(op==='is_super_admin')data=false;
   else {status=403;data={code:'42501'};}
  }else if(url.pathname.endsWith('/auth/v1/user'))data={id,email:'teacher@example.test',user_metadata:{},app_metadata:{provider:'google'}};
  else if(url.pathname.includes('/rest/v1/'))data=req.headers().accept?.includes('vnd.pgrst.object')?null:[];
  await route.fulfill({status,contentType:'application/json',headers:{'Access-Control-Allow-Origin':'*'},body:JSON.stringify(data)});
 });
 const page=await context.newPage();
 await page.goto(base+'/teacher-login/');
 await page.getByRole('button',{name:'Continue with Google',exact:true}).waitFor();
 await page.goto(base+'/teacher-registration/');
 await page.getByRole('button',{name:'Login to register',exact:true}).waitFor();
 await page.goto(base+'/teacher-dashboard/');
 await page.getByRole('region',{name:'Teacher dashboard page'}).getByRole('button',{name:'Teacher Login',exact:true}).waitFor();
 assert.equal(calls.filter(x=>x==='teacher_v2_snapshot').length,0);
 await context.addInitScript(({id})=>{
  const user={id,email:'teacher@example.test',aud:'authenticated',role:'authenticated',user_metadata:{name:'Synthetic Teacher'},app_metadata:{provider:'google'}};
  const token=btoa(JSON.stringify({alg:'HS256',typ:'JWT'}))+'.'+btoa(JSON.stringify({sub:id,exp:Math.floor(Date.now()/1000)+3600}))+'.test';
  localStorage.setItem('sb-teacher-test-auth-token',JSON.stringify({access_token:token,refresh_token:'test',expires_at:Math.floor(Date.now()/1000)+3600,expires_in:3600,token_type:'bearer',user}));
 },{id});
 await page.goto(base+'/teacher-registration/');
 const registration=page.getByRole('region',{name:'Teacher Management v2',exact:true});
 await registration.getByLabel('Full name',{exact:true}).waitFor();
 await registration.getByLabel('Full name',{exact:true}).evaluate(el=>{if(el.value!=='Synthetic Teacher')throw Error('Own profile not populated');});
 await page.goto(base+'/teacher-dashboard/');
 const panel=page.getByRole('region',{name:'Teacher verified profile details',exact:true});
 await panel.getByText('Registration draft · Not submitted',{exact:true}).waitFor();
 await panel.getByText('Synthetic Teacher',{exact:true}).waitFor();
 await panel.getByText('Not issued',{exact:true}).waitFor();
 foreign=true;
 await panel.getByRole('button',{name:'Refresh Profile',exact:true}).click();
 await panel.getByRole('alert').waitFor();
 assert.equal(await panel.getByText('Foreign synthetic profile',{exact:true}).count(),0);
 assert.equal(calls.some(op=>op==='teacher_v2_save_application'||op==='teacher_v2_review'),false);
 console.log('PASS: integrated active teacher login gates, own registration/dashboard and foreign snapshot denial (synthetic only).');
}finally{await browser.close();}
