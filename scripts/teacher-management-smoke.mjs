// Contract browser tests with synthetic auth/API responses. No live database writes.
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
const base=process.env.TEACHER_TEST_BASE_URL||'http://127.0.0.1:4174';
const id='11111111-1111-4111-8111-111111111111';
const browser=await chromium.launch({headless:true});
const context=await browser.newContext({viewport:{width:390,height:844}});
const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
let profile=null,active=true,denySave=false,admin=false,superAdmin=false;const writes=[];
await context.addInitScript(({id})=>{
 const user={id,email:'teacher@example.test',aud:'authenticated',role:'authenticated',user_metadata:{name:'Test Teacher'},app_metadata:{provider:'google'}};
 const token=btoa(JSON.stringify({alg:'HS256',typ:'JWT'}))+'.'+btoa(JSON.stringify({sub:id,exp:Math.floor(Date.now()/1000)+3600}))+'.test';
 localStorage.setItem('sb-teacher-test-auth-token',JSON.stringify({access_token:token,refresh_token:'test',expires_at:Math.floor(Date.now()/1000)+3600,expires_in:3600,token_type:'bearer',user}));
},{id});
await context.route('https://teacher-test.supabase.test/**',async route=>{
 const req=route.request(),url=new URL(req.url());let data=null,status=200;
 if(url.pathname.includes('/rpc/')){
 const op=url.pathname.split('/').at(-1),args=req.postDataJSON()||{};
 if(op==='teacher_v2_snapshot'){if(active)data=profile;else{status=404;data={code:'PGRST202'};}}
 else if(op==='teacher_v2_save_application'){
  writes.push({op,args});if(denySave){status=403;data={code:'42501'};}else{
   profile={user_id:id,employee_id:null,...{display_name:args.p_profile.displayName,contact_email:args.p_profile.contactEmail,phone:args.p_profile.phone,experience_years:args.p_profile.experienceYears},status:'pending',revision:2,submitted_at:args.p_submit?'2026-11-16T10:00:00Z':null,application_reason:args.p_reason,requested_scopes:args.p_scopes,qualifications:args.p_qualifications,assignments:[],resumes:[]};data=2;
  }
 }else if(op==='teacher_v2_withdraw'){profile.submitted_at=null;data=true;writes.push({op,args});}
 else if(op==='is_super_admin')data=superAdmin;
 else if(op==='teacher_v2_directory'){if(superAdmin)data=[profile];else{status=403;data={code:'42501'};}}
 else if(op==='teacher_v2_review'){writes.push({op,args});profile.status=args.p_decision==='approve'?'approved':'rejected';profile.employee_id=args.p_decision==='approve'?'KSOL-T-123456ABCDEF':null;profile.submitted_at=null;data=profile.employee_id;}
 else if(op==='teacher_v2_suspend'){writes.push({op,args});profile.status='suspended';data=true;}
 else if(op==='teacher_v2_audit')data=[{id:'audit1',action:'teacher.suspended',reason:'Access suspended for role review',created_at:'2026-11-16'}];
 else {status=403;data={code:'42501'};}
 }else if(url.pathname.includes('/rest/v1/')){
  data=url.pathname.endsWith('/user_roles')&&admin?[{role:'admin'}]:req.headers().accept?.includes('vnd.pgrst.object')?null:[];
 }else if(url.pathname.includes('/auth/v1/user'))data={id,email:'teacher@example.test',user_metadata:{}};
 await route.fulfill({status,contentType:'application/json',headers:{'Access-Control-Allow-Origin':'*'},body:JSON.stringify(data)});
});
try{
 await page.goto(base+'/staff-workspace/');const panel=page.getByRole('region',{name:'Teacher Management v2',exact:true});
 await panel.getByLabel('Full name',{exact:true}).fill('Test Teacher');
 await panel.getByLabel('Contact email',{exact:true}).fill('teacher@example.test');
 await panel.getByRole('button',{name:'Add qualification',exact:true}).click();
 await panel.getByLabel('title 1',{exact:true}).fill('MA History');await panel.getByLabel('institution 1',{exact:true}).fill('Test University');
 await panel.getByRole('button',{name:'Add scope',exact:true}).click();
 await panel.getByLabel('Application reason',{exact:true}).fill('Please verify my teaching application');
 denySave=true;await panel.getByRole('button',{name:'Save profile draft',exact:true}).click();await panel.getByRole('alert').waitFor();
 assert.equal(await panel.getByText('Profile draft saved.',{exact:true}).count(),0);
 denySave=false;await panel.getByRole('button',{name:'Save profile draft',exact:true}).click();
 await panel.getByText('Employee ID:',{exact:false}).waitFor();
 await panel.getByRole('button',{name:'Submit v2 application',exact:true}).click();await panel.getByRole('button',{name:'Withdraw to edit'}).waitFor();
 assert.equal(await panel.getByRole('button',{name:'Submit v2 application',exact:true}).count(),0);
 assert.equal(writes.at(-1).args.p_submit,true);assert.equal(writes.at(-1).args.p_qualifications[0].title,'MA History');
 assert.equal(writes.at(-1).args.p_scopes[0].workType,'materials.draft');
 await panel.getByRole('button',{name:'Withdraw to edit'}).click();await panel.getByRole('button',{name:'Submit v2 application',exact:true}).waitFor();
 active=false;await page.reload();await panel.getByText(/await owner-approved backend activation/).waitFor();
 assert.equal(await panel.getByRole('button',{name:'Submit v2 application',exact:true}).count(),0);
 assert.equal(await panel.locator('input[type=file]').count(),0);
 assert.equal(await page.getByRole('button',{name:/publish|edit marks/i}).count(),0);
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>window.innerWidth),false);
 // Ordinary Admin must not receive the v2 directory. Super Admin reviews explicitly.
 await page.setViewportSize({width:1440,height:1000});admin=true;await page.goto(base+'/admin/');await page.getByRole('button',{name:'Staff & Permissions',exact:true}).click();
 const directory=page.getByRole('region',{name:'Teacher Directory v2',exact:true});
 assert.equal(await directory.getByRole('button',{name:'Review profile and access',exact:true}).count(),0);
 superAdmin=true;active=true;profile.submitted_at='2026-11-16T10:00:00Z';await page.reload();
 await page.getByRole('button',{name:'Staff & Permissions',exact:true}).click();
 await directory.getByRole('button',{name:'Review profile and access',exact:true}).click();
 await directory.getByLabel('Decision reason').fill('Independently verified teaching identity');
 assert.equal(await directory.getByRole('button',{name:'Approve verified teacher'}).isDisabled(),true);
 await directory.getByLabel('Identity independently verified').check();
 page.on('dialog',dialog=>dialog.accept());await directory.getByRole('button',{name:'Approve verified teacher'}).click();
 await directory.getByText(/KSOL-T-123456ABCDEF/).waitFor();
 assert.equal(writes.at(-1).args.p_revision,2);assert.equal(writes.at(-1).args.p_verified,true);
 await directory.getByRole('button',{name:'Review profile and access',exact:true}).click();
 await directory.getByLabel('Decision reason').fill('Access suspended for role review');
 await directory.getByRole('button',{name:'Suspend teacher and revoke access'}).click();await directory.getByRole('heading',{name:/Test Teacher · suspended/}).waitFor();
 assert.deepEqual(errors,[]);
 console.log('PASS: teacher v2 mobile registration, multiple qualifications/scopes, failed save, pending lock, withdrawal, inactive backend, upload gate and publication boundary (mock API).');
}finally{await browser.close();}
