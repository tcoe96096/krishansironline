import assert from 'node:assert/strict';
import {chromium} from 'playwright';

// The active website is built against synthetic configuration only.
// No Google OAuth sign-in or database write is performed.
const base=process.env.KSOL_ACTIVE_TEACHER_TEST_BASE_URL||'http://127.0.0.1:4185';
const browser=await chromium.launch({headless:true});
const page=await browser.newPage({viewport:{width:390,height:844}});
const failures=[];
page.on('pageerror',e=>failures.push(e.message));
try{
 await page.goto(base+'/teacher-registration/',{waitUntil:'domcontentloaded'});
 await page.getByRole('heading',{name:'Teacher Registration'}).first().waitFor();
 await page.getByRole('button',{name:'Login to register'}).waitFor();
 assert.equal(await page.getByRole('button',{name:'Save profile draft'}).count(),0);
 await page.goto(base+'/teacher-login/',{waitUntil:'domcontentloaded'});
 await page.getByRole('button',{name:'Continue with Google'}).waitFor();
 await page.goto(base+'/teacher-dashboard/',{waitUntil:'domcontentloaded'});
 await page.getByRole('button',{name:'Teacher Login'}).waitFor();
 assert.deepEqual(failures,[]);
 console.log('PASS: activated Teacher pages inside main KSOL website render guest registration/login/dashboard safely without making a backend write.');
}finally{await browser.close();}
