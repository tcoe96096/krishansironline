// Browser validation of Teacher Management INSIDE the existing KSOL website.
// Synthetic/no-auth environment only: no Production or Preview data writes.
import assert from 'node:assert/strict';
import {chromium} from 'playwright';

const base=process.env.INTEGRATED_SITE_TEST_BASE_URL||'http://127.0.0.1:4184';
const browser=await chromium.launch({headless:true});
const page=await browser.newPage({viewport:{width:1366,height:900}});
const teacherRpcRequests=[];
page.on('request',req=>{if(req.url().includes('/rpc/teacher_v2_'))teacherRpcRequests.push(req.url());});
try{
 await page.goto(base+'/',{waitUntil:'domcontentloaded'});
 const headerTeacher=page.getByRole('button',{name:'Teacher Management'}).first();
 await headerTeacher.waitFor({state:'visible'});
 await headerTeacher.click();
 assert.equal(new URL(page.url()).pathname,'/teacher/','Header must route inside the main website');
 const workspace=page.getByRole('region',{name:'Teacher Management portal'});
 await workspace.waitFor();
 await page.getByText('Teacher registration अभी सक्रिय नहीं है।',{exact:false}).waitFor();
 const nav=page.getByRole('navigation',{name:'Teacher management navigation'});
 await nav.getByRole('button',{name:'Registration'}).click();
 assert.equal(new URL(page.url()).pathname,'/teacher-registration/');
 assert.equal(await page.getByRole('button',{name:'Save profile draft'}).count(),0,'Disabled beta must not create applications');
 await nav.getByRole('button',{name:'Login'}).click();
 assert.equal(new URL(page.url()).pathname,'/teacher-login/');
 assert.equal(await page.getByRole('button',{name:'Continue with Google'}).count(),0,'Disabled beta must not start OAuth');
 await nav.getByRole('button',{name:'Dashboard'}).click();
 assert.equal(new URL(page.url()).pathname,'/teacher-dashboard/');
 assert.equal(await page.getByText('Backend Activation के बाद यहाँ Teacher Dashboard उपलब्ध होगा।').count(),1);
 await page.reload({waitUntil:'domcontentloaded'});
 await page.getByRole('heading',{name:'Teacher Dashboard'}).first().waitFor();
 assert.equal(new URL(page.url()).pathname,'/teacher-dashboard/','Direct reload preserves teacher route');
 await page.goto(base+'/student-dashboard/',{waitUntil:'domcontentloaded'});
 await page.getByText('विद्यार्थी लॉगिन आवश्यक है').waitFor();
 await page.goto(base+'/admin/',{waitUntil:'domcontentloaded'});
 await page.getByRole('button',{name:/Google|Sign in|लॉगिन/i}).first().waitFor({timeout:15000});
 assert.deepEqual(teacherRpcRequests,[],'Disabled beta must not access Teacher v2 backend');
 await page.setViewportSize({width:390,height:844});
 await page.goto(base+'/',{waitUntil:'domcontentloaded'});
 await page.getByRole('button',{name:'Teacher Management'}).first().click();
 assert.equal(new URL(page.url()).pathname,'/teacher/','Mobile Teacher access stays in main website');
 console.log('PASS: existing KSOL header, Teacher Registration/Login/Dashboard direct routes, disabled permissions, student and admin routes, mobile navigation (no real backend).');
}finally{await browser.close();}
