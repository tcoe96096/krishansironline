// Contract browser tests with synthetic auth/API responses. No live database writes.
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
const base=process.env.TEACHER_TEST_BASE_URL||'http://127.0.0.1:4174';
const adminNavLabel=process.env.TEACHER_TEST_PORTAL==='true'?'Teacher Directory':'Staff & Permissions';
const id='11111111-1111-4111-8111-111111111111';
const browser=await chromium.launch({headless:true});
const context=await browser.newContext({viewport:{width:390,height:844}});
const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
const requestPaths=[];page.on('request',r=>requestPaths.push(new URL(r.url()).pathname));
let profile=null,active=true,denySave=false,denySnapshot=false,admin=false,superAdmin=false,legacyGrant=false;const writes=[];
await context.addInitScript(({id})=>{
 const user={id,email:'teacher@example.test',aud:'authenticated',role:'authenticated',user_metadata:{name:'Test Teacher'},app_metadata:{provider:'google'}};
 const token=btoa(JSON.stringify({alg:'HS256',typ:'JWT'}))+'.'+btoa(JSON.stringify({sub:id,exp:Math.floor(Date.now()/1000)+3600}))+'.test';
 localStorage.setItem('sb-teacher-test-auth-token',JSON.stringify({access_token:token,refresh_token:'test',expires_at:Math.floor(Date.now()/1000)+3600,expires_in:3600,token_type:'bearer',user}));
},{id});
await context.route('https://teacher-test.supabase.test/**',async route=>{
 const req=route.request(),url=new URL(req.url());let data=null,status=200;
 if(url.pathname.includes('/rpc/')){
 const op=url.pathname.split('/').at(-1),args=req.postDataJSON()||{};
 if(op==='teacher_v2_beta_capabilities')data={registration:true,materials:false,analytics:false,resumes:false,advanced:false};
 else if(op==='teacher_v2_snapshot'){if(denySnapshot){status=403;data={code:'42501'};}else if(active)data=profile;else{status=404;data={code:'PGRST202'};}}
 else if(op==='teacher_v2_save_application'){
  writes.push({op,args});if(denySave){status=403;data={code:'42501'};}else{
   profile={user_id:id,employee_id:null,...{display_name:args.p_profile.displayName,contact_email:args.p_profile.contactEmail,phone:args.p_profile.phone,experience_years:args.p_profile.experienceYears},status:'pending',revision:profile?profile.revision+1:2,submitted_at:args.p_submit?'2026-11-16T10:00:00Z':null,application_reason:args.p_reason,requested_scopes:args.p_scopes,qualifications:args.p_qualifications,assignments:[],resumes:[]};data=profile.revision;
  }
 }else if(op==='teacher_v2_withdraw'){profile.submitted_at=null;profile.revision++;data=true;writes.push({op,args});}
 else if(op==='is_super_admin')data=superAdmin;
 else if(op==='teacher_v2_directory'){if(superAdmin)data=[profile];else{status=403;data={code:'42501'};}}
 else if(op==='teacher_v2_review'){
  writes.push({op,args});
  if(args.p_decision==='approve'&&(!args.p_verified||!Array.isArray(args.p_assignments)||args.p_assignments.length===0)){
   status=400;data={code:'22023'};
  }else{
   profile.status=args.p_decision==='approve'?'approved':'rejected';
   profile.employee_id=args.p_decision==='approve'?'KSOL-T-123456ABCDEF':null;
   profile.submitted_at=null;profile.decision_reason=args.p_reason;
   profile.assignments=args.p_decision==='approve'?args.p_assignments.map((s,i)=>({id:'review-'+i,class_level:s.classLevel,subject:s.subject,work_type:s.workType,status:'active'})):[];
   data=profile.employee_id;
  }
 }
 else if(op==='teacher_v2_suspend'){writes.push({op,args});profile.status='suspended';profile.decision_reason=args.p_reason;profile.assignments.forEach(a=>a.status='revoked');data=true;}
 else if(op==='teacher_v2_restore'){writes.push({op,args});profile.status='approved';profile.decision_reason=args.p_reason;data=true;}
 else if(op==='teacher_v2_set_assignment'){
  writes.push({op,args});
  if(args.p_action==='grant')profile.assignments.push({id:'assignment1',class_level:args.p_class_level,subject:args.p_subject,work_type:args.p_work_type,status:'active'});
  else profile.assignments.forEach(a=>{if(a.class_level===args.p_class_level&&a.subject===args.p_subject&&a.work_type===args.p_work_type)a.status='revoked';});
  data='assignment1';
 }
 else if(op==='teacher_v2_audit')data=[{id:'audit1',action:'teacher.suspended',reason:'Access suspended for role review',created_at:'2026-11-16'}];
 else {status=403;data={code:'42501'};}
 }else if(url.pathname.includes('/rest/v1/')){
  data=url.pathname.endsWith('/result_staff_grants')&&legacyGrant?{user_id:id,role:'teacher',permissions:['materials.read','materials.draft.write'],scope_class:'10',is_active:true}:url.pathname.endsWith('/user_roles')&&admin?[{role:'admin'}]:req.headers().accept?.includes('vnd.pgrst.object')?null:[];
 }else if(url.pathname.includes('/auth/v1/user'))data={id,email:'teacher@example.test',user_metadata:{}};
 await route.fulfill({status,contentType:'application/json',headers:{'Access-Control-Allow-Origin':'*'},body:JSON.stringify(data)});
});
try{
 await page.goto(base+'/staff-workspace/');const panel=page.getByRole('region',{name:'Teacher Management v2',exact:true});
 await panel.getByLabel('Full name',{exact:true}).fill('Test Teacher');
 assert.equal(await page.getByRole('region',{name:'Teacher enrollment request',exact:true}).count(),0,'Core Beta presents exactly one v2 registration flow');
 await panel.getByLabel('Contact email',{exact:true}).fill('teacher@example.test');
 await panel.getByRole('button',{name:'Add qualification',exact:true}).click();
 await panel.getByLabel('title 1',{exact:true}).fill('MA History');await panel.getByLabel('institution 1',{exact:true}).fill('Test University');
 await panel.getByRole('button',{name:'Add scope',exact:true}).click();
 await panel.getByLabel('Application reason',{exact:true}).fill('Please verify my teaching application');
 denySave=true;await panel.getByRole('button',{name:'Save profile draft',exact:true}).click();await panel.getByRole('alert').waitFor();
 assert.equal(await panel.getByText('Profile draft saved.',{exact:true}).count(),0);
 denySave=false;await panel.getByRole('button',{name:'Save profile draft',exact:true}).click();
 await panel.getByText('Employee ID:',{exact:false}).waitFor();
 await page.getByRole('region',{name:'Teacher enrollment request',exact:true}).waitFor({state:'detached'});
 if(process.env.TEACHER_TEST_RESUME_ENABLED==='true'){
  const upload=panel.getByLabel('Upload private PDF/DOCX resume (5 MiB maximum)',{exact:true});
  assert.equal(await upload.isDisabled(),false);
  await panel.getByLabel('Full name',{exact:true}).fill('Unsaved teacher edit');
  assert.equal(await upload.isDisabled(),true);
  page.once('dialog',dialog=>dialog.dismiss());
  await panel.getByRole('button',{name:'Refresh teacher profile',exact:true}).click();
  assert.equal(await panel.getByLabel('Full name',{exact:true}).inputValue(),'Unsaved teacher edit');
  await panel.getByLabel('Full name',{exact:true}).fill('Test Teacher');
  assert.equal(await upload.isDisabled(),false);
 }

 await panel.getByRole('button',{name:'Submit for Admin Review',exact:true}).click();await panel.getByRole('button',{name:'Withdraw to edit'}).waitFor();
 assert.equal(await panel.getByRole('button',{name:'Submit for Admin Review',exact:true}).count(),0);
 assert.equal(writes.at(-1).args.p_expected_revision,2);assert.equal(writes.at(-1).args.p_submit,true);assert.equal(writes.at(-1).args.p_qualifications[0].title,'MA History');
 assert.equal(writes.at(-1).args.p_scopes[0].workType,'materials.draft');
 await panel.getByRole('button',{name:'Withdraw to edit'}).click();await panel.getByRole('button',{name:'Submit for Admin Review',exact:true}).waitFor();
 active=false;await page.reload();await panel.getByText(/awaiting owner-approved backend activation/).waitFor();
 assert.equal(await panel.getByRole('button',{name:'Submit for Admin Review',exact:true}).count(),0);
 assert.equal(await panel.locator('input[type=file]').count(),0);
 assert.equal(await page.getByRole('button',{name:/publish|edit marks/i}).count(),0);
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>window.innerWidth),false);
 // Ordinary Admin must not receive the v2 directory. Super Admin reviews explicitly.
 await page.setViewportSize({width:1440,height:1000});admin=true;await page.goto(base+'/admin/');
 assert.equal(await page.getByRole('button',{name:adminNavLabel,exact:true}).count(),0,'Ordinary Admin must not see Super Admin directory navigation');
 const directory=page.getByRole('region',{name:'Teacher Directory v2',exact:true});
 assert.equal(await directory.count(),0);
 superAdmin=true;active=true;profile.submitted_at='2026-11-16T10:00:00Z';await page.reload();
 await page.getByRole('button',{name:adminNavLabel,exact:true}).click();
 await directory.getByRole('button',{name:'Review profile and access',exact:true}).click();
 await directory.getByLabel('Decision reason').fill('Independently verified teaching identity');
 assert.equal(await directory.getByRole('button',{name:'Approve verified teacher'}).isDisabled(),true);
 await directory.getByLabel('Identity independently verified').check();
 assert.equal(await directory.getByRole('button',{name:'Approve verified teacher'}).isDisabled(),true,'Verification alone must not approve an empty-scope teacher');
 await directory.getByRole('button',{name:'Add scope',exact:true}).click();
 assert.equal(await directory.getByRole('button',{name:'Approve verified teacher'}).isDisabled(),false);
 const reviewedRevision=profile.revision;page.on('dialog',dialog=>dialog.accept());await directory.getByRole('button',{name:'Approve verified teacher'}).click();
 await directory.getByText(/KSOL-T-123456ABCDEF/).waitFor();
 assert.equal(writes.at(-1).args.p_revision,reviewedRevision);assert.equal(writes.at(-1).args.p_verified,true);
 assert.deepEqual(writes.at(-1).args.p_assignments,[{classLevel:'10',subject:'History',workType:'materials.draft'}]);
 // Core Beta deliberately excludes the optional material editor.
 await page.goto(base+'/staff-workspace/');
 await page.getByRole('heading',{name:'Basic Teacher Dashboard',exact:true}).waitFor();
 assert.equal(await page.getByRole('heading',{name:'Create study material draft',exact:true}).count(),0);
 await page.goto(base+'/admin/');
 await page.getByRole('button',{name:adminNavLabel,exact:true}).click();
 await directory.getByRole('button',{name:'Review profile and access',exact:true}).click();
 await directory.getByLabel('Decision reason').fill('Grant verified class and subject material work');
 await directory.getByLabel('Assignment class',{exact:true}).selectOption('11');
 await directory.getByLabel('Assignment subject',{exact:true}).selectOption('Political Science');
 await directory.getByRole('button',{name:'Add scope',exact:true}).click();
 await directory.getByRole('button',{name:'Assign class 11 · Political Science',exact:true}).click();await directory.getByLabel('Decision reason').waitFor({state:'hidden'});
 await directory.getByRole('button',{name:'Review profile and access',exact:true}).click();
 await directory.getByLabel('Decision reason').fill('Revoke the assignment for a work change');
 await directory.getByRole('button',{name:'Revoke assignment',exact:true}).last().click();await directory.getByLabel('Decision reason').waitFor({state:'hidden'});
 assert.equal(writes.at(-1).args.p_action,'revoke');
 await directory.getByRole('button',{name:'Review profile and access',exact:true}).click();
 await directory.getByLabel('Decision reason').fill('Access suspended for role review');
 await directory.getByRole('button',{name:'Suspend teacher and revoke access'}).click();await directory.getByRole('heading',{name:/Test Teacher · suspended/}).waitFor();
 await directory.getByRole('button',{name:'Review profile and access',exact:true}).click();
 await directory.getByLabel('Decision reason').fill('Teacher identity reverified after suspension');
 await directory.getByRole('button',{name:'Restore teacher status without assignments',exact:true}).click();await directory.getByLabel('Decision reason').waitFor({state:'hidden'});
 await directory.getByRole('heading',{name:/Test Teacher · approved/}).waitFor();
 assert.equal(profile.employee_id,'KSOL-T-123456ABCDEF');
 assert.equal(profile.assignments.every(a=>a.status==='revoked'),true);
 assert.equal(writes.at(-1).op,'teacher_v2_restore');
 profile.status='pending';profile.submitted_at='2026-11-16T10:00:00Z';profile.employee_id=null;
 await directory.getByRole('button',{name:'Refresh directory',exact:true}).click();
 await directory.getByRole('button',{name:'Review profile and access',exact:true}).click();
 await directory.getByLabel('Decision reason').fill('Qualification documents require correction');
 await directory.getByRole('button',{name:'Reject application',exact:true}).click();await directory.getByLabel('Decision reason').waitFor({state:'hidden'});
 await directory.getByRole('heading',{name:/Test Teacher · rejected/}).waitFor();
 assert.equal(writes.at(-1).args.p_decision,'reject');
 assert.equal(profile.employee_id,null);
 await page.goto(base+'/staff-workspace/');
 await panel.getByText('Last review note: Qualification documents require correction',{exact:true}).waitFor();
 assert.equal(await page.getByRole('region',{name:'Teacher enrollment request',exact:true}).count(),0,'Rejected v2 applicants must not see duplicate enrollment');
 legacyGrant=true;await page.reload();
 await page.getByRole('heading',{name:'Basic Teacher Dashboard',exact:true}).waitFor();
 assert.equal(await page.getByRole('heading',{name:'Create study material draft',exact:true}).count(),0);
 assert.equal(await panel.locator('input[type=file]').count(),0);
 assert.equal(await panel.getByRole('button',{name:'Review result summary'}).count(),0);
 profile.status='approved';profile.employee_id='KSOL-T-123456ABCDEF';
 await page.reload();await panel.getByText('Employee ID:',{exact:false}).waitFor();
 assert.equal(await page.getByRole('heading',{name:'Create study material draft',exact:true}).count(),0);
 if(process.env.TEACHER_TEST_PORTAL==='true'){
  for(const forbidden of ['result_staff_grants','study_material_items','test_attempts','teacher_v2_result_summary','teacher-resume'])assert.equal(requestPaths.some(path=>path.includes(forbidden)),false,forbidden);
  const loggedOut=await browser.newContext();const anonymousPage=await loggedOut.newPage();
  await anonymousPage.goto(base+'/');await anonymousPage.getByRole('heading',{name:'Teacher Google Login',exact:true}).waitFor();
  assert.equal(await anonymousPage.getByRole('button',{name:'Submit for Admin Review',exact:true}).count(),0);
  await loggedOut.close();
 }
 assert.deepEqual(errors,[]);
 console.log('PASS: teacher v2 mobile registration, multiple qualifications/scopes, failed save, pending lock, withdrawal, inactive backend, upload gate, Admin denial, approval, assignment grant/revoke, rejection notes, suspension, restoration without revived grants and publication boundary (mock API).');
}finally{await browser.close();}
