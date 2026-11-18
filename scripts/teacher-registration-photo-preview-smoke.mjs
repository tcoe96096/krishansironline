// Browser-only acceptance of Registration photo -> Login screen -> Dashboard
// visual preview. Uses no real Supabase project, no credentials and no writes.
import assert from 'node:assert/strict';
import {chromium} from 'playwright';

const base=process.env.TEACHER_VISUAL_TEST_BASE_URL||'http://127.0.0.1:4178/teacher-beta';
const browser=await chromium.launch({headless:true});
const context=await browser.newContext({viewport:{width:390,height:844}});
const page=await context.newPage();
const pageErrors=[],writes=[];
page.on('pageerror',e=>pageErrors.push(e.message));
page.on('request',r=>{
  if(r.method()!=='GET'&&new URL(r.url()).pathname.includes('/rpc/'))writes.push(r.url());
});
await context.route('https://teacher-test.supabase.test/**',route=>route.fulfill({
  status:200,contentType:'application/json',
  body:JSON.stringify({access_token:null,session:null,user:null}),
}));
try {
  await page.goto(base+'/');
  await page.getByRole('button',{name:'Open Registration Page'}).click();
  await page.getByRole('heading',{name:'Teacher Registration Form'}).waitFor();
  assert.ok(page.url().endsWith('/registration/'),'Registration is a separate route');
  assert.equal(await page.getByLabel('Registration profile photo').count(),1);
  assert.equal(await page.getByLabel('Application reason').count(),0);
  const file=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScL/nwAAAABJRU5ErkJggg==','base64');
  await page.getByLabel('Select teacher photograph').setInputFiles({
    name:'teacher-registration.png',mimeType:'image/png',buffer:file,
  });
  const registrationImage=page.getByRole('img',{name:'Example Teacher registration photo preview'});
  await registrationImage.waitFor();
  const selectedSrc=await registrationImage.getAttribute('src');
  assert.ok(selectedSrc?.startsWith('blob:'),'Registration selection stays in memory only');
  await page.getByRole('button',{name:'Go to Login Page'}).click();
  await page.getByRole('heading',{name:'Teacher Google Login'}).waitFor();
  assert.ok(page.url().endsWith('/login/'),'Login is separate from Registration');
  assert.equal(await page.getByRole('button',{name:/Sign in with Google/}).isDisabled(),true,
    'Preview cannot sign in or create an account');
  await page.getByRole('button',{name:'View Dashboard Demo'}).click();
  await page.getByRole('heading',{name:'My Teacher Dashboard'}).waitFor();
  assert.ok(page.url().endsWith('/dashboard/'),'Dashboard is a separate route');
  assert.equal(await page.getByRole('button',{name:'Choose Photo'}).count(),0,
    'Dashboard photo is display-only, not re-uploaded there');
  const dashboardImage=page.getByRole('img',{name:'Example Teacher teacher photo (local preview)'});
  await dashboardImage.waitFor();
  assert.equal(await dashboardImage.getAttribute('src'),selectedSrc,'Registration photo is the same one shown in Dashboard Demo');
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>window.innerWidth),false,'No mobile overflow');
  await page.reload();
  await page.getByRole('heading',{name:'My Teacher Dashboard'}).waitFor();
  assert.equal(await page.getByRole('img',{name:'Example Teacher teacher photo (local preview)'}).count(),0,
    'Unpersisted preview photo must disappear on reload; no false saved-photo promise');
  assert.equal(await page.evaluate(()=>Object.keys(localStorage).filter(k=>/teacher.*photo|photo.*teacher/i.test(k)).length),0);
  assert.deepEqual(writes,[],'Registration preview may not call write RPCs');
  assert.deepEqual(pageErrors,[]);
  console.log('PASS: camera/gallery Registration photo stays local and appears on Dashboard Demo through Login page, never saves or uploads.');
} finally {
  await browser.close();
}
