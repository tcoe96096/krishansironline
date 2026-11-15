import assert from 'node:assert/strict';
import { chromium } from 'playwright';

const base = (process.env.RESULT_TEST_BASE_URL || 'http://127.0.0.1:4173').replace(/\/$/, '');
const browser = await chromium.launch({ headless: true });
const errors = [];
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
page.on('pageerror', error => errors.push(error.message));

try {
  await page.goto(base + '/results/', { waitUntil: 'domcontentloaded', timeout: 45000 });
  await page.getByRole('heading', { name: /My Result Hub|मेरा स्मार्ट रिजल्ट हब/ }).waitFor();
  assert.equal(await page.getByRole('button', { name: /My Results|मेरे परिणाम/ }).count(), 1);
  assert.equal(await page.getByRole('button', { name: /External Results|अन्य परीक्षा परिणाम/ }).count(), 1);
  console.log('PASS: New responsive Smart Result Hub mounted on real results route');

  // Logged-out students must not see real saved grades or student identities.
  await page.getByRole('button', { name: /My Results|मेरे परिणाम/ }).click();
  await page.getByRole('heading', { name: /Sign in to view your personal results|अपने परिणाम देखने के लिए लॉगिन करें/ }).waitFor();
  assert.equal(await page.getByText('Verified score').count(), 0);
  console.log('PASS: Unauthenticated user sees sign-in boundary and no private grades');

  // A private shared URL must not bypass the authentication boundary.
  await page.goto(base + '/results/?resultId=cc527c3c-0899-42c0-a23e-120267f96e41', {waitUntil:'domcontentloaded'});
  await page.getByRole('heading',{name:/Sign in to view your personal results|अपने परिणाम देखने के लिए लॉगिन करें/}).waitFor();
  assert.equal(await page.getByRole('dialog').count(),0);
  console.log('PASS: Guessing a result link does not open an unauthenticated private report');

  // No API import/scraping: outbound links must point to official domains, with safe opener behavior.
  await page.getByRole('button', { name: /External Results|अन्य परीक्षा परिणाम/ }).click();
  const cbse = page.locator('a[href="https://results.cbse.nic.in/"]');
  const nta = page.locator('a[href="https://www.nta.ac.in/"]');
  assert.equal(await cbse.count(), 1);
  assert.equal(await nta.count(), 1);
  assert.equal(await cbse.getAttribute('target'), '_blank');
  assert.match(await cbse.getAttribute('rel') || '', /noopener/);
  assert.match(await nta.getAttribute('rel') || '', /noreferrer/);
  console.log('PASS: External result cards are official HTTPS links with safe target handling');

  await page.getByRole('button', { name: /Performance|प्रदर्शन विश्लेषण/ }).click();
  await page.getByRole('heading', { name: /Sign in to view your personal results|अपने परिणाम देखने के लिए लॉगिन करें/ }).waitFor();
  console.log('PASS: Performance insights are private behind student login');

  await page.goto(base + '/study-materials/?class=10&subject=History', { waitUntil: 'domcontentloaded' });
  await page.getByRole('heading', {name:/Chapter-Wise Revision Notes|अध्यायवार रिवीजन/}).waitFor();
  const historyFilter=page.getByRole('button',{name:'History',exact:true});
  assert.match(await historyFilter.getAttribute('class') || '',/bg-slate-900/);
  console.log('PASS: Result-to-material deep links filter the public class and subject catalogue');

  await page.goto(base + '/admin-preview/', { waitUntil: 'domcontentloaded' });
  await page.getByRole('button',{name:'Open notifications management'}).click();
  await page.getByRole('heading',{name:'Communication',exact:true}).waitFor();
  console.log('PASS: Admin notifications bell opens the actual Communication module');
  await page.getByRole('button', {name:'Study Materials',exact:true}).click();
  await page.getByRole('heading', {name:'Study Materials & Result Linking'}).waitFor();
  await page.getByRole('button', {name:'Staff Permissions',exact:true}).click();
  await page.getByRole('heading', {name:'Staff Control Board — Protected Demo'}).waitFor();
  console.log('PASS: Study material control board and staff navigation are functional without exposing private records');
  await page.goto(base + '/admin-preview/', { waitUntil: 'domcontentloaded' });
  await page.getByRole('button', { name: 'Staff & Permissions', exact: true }).click();
  await page.getByRole('heading', { name: 'Staff Control Board — Protected Demo' }).waitFor();
  assert.equal(await page.getByRole('button', { name: /Save Audited Role Grant/ }).count(), 0);
  console.log('PASS: Staff roles and write actions remain protected in demo mode');

  // A published material can be browsed in demo, but approval must never be usable.
  await page.getByRole('button', {name:'Study Materials',exact:true}).click();
  await page.getByRole('heading', {name:'Super Admin Content Approval'}).waitFor();
  assert.equal(await page.getByRole('button', {name:'Publish',exact:true}).count(),0);
  console.log('PASS: Super Admin approval writes unavailable in demo');

  // Result management also must not leak real students or permit mutation in demo.
  await page.getByRole('navigation').getByRole('button', { name: 'Results & Reports', exact: true }).click();
  await page.getByRole('heading', { name: 'Result Management — Protected Preview' }).waitFor();
  assert.equal(await page.getByRole('button', { name: 'Export CSV' }).count(), 0);
  console.log('PASS: Demo reports never expose real records or exports');

  await page.goto(base + '/staff-workspace/', { waitUntil: 'domcontentloaded' });
  await page.getByRole('heading', {name:'Teacher & Content Workspace'}).waitFor();
  assert.equal(await page.getByRole('button', {name:'Sign in with Google'}).count(),1);
  assert.equal(await page.getByRole('button', {name:'Copy Account ID'}).count(),0);
  assert.equal(await page.getByRole('button', {name:'Save private draft'}).count(),0);
  console.log('PASS: Staff workspace remains protected without a verified login and grant');

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(base + '/results/', { waitUntil: 'domcontentloaded' });
  await page.getByRole('heading', { name: /My Result Hub|मेरा स्मार्ट रिजल्ट हब/ }).waitFor();
  await page.getByRole('button', { name: /External Results|अन्य परीक्षा परिणाम/ }).click();
  assert.ok(await page.locator('a[href="https://results.cbse.nic.in/"]').isVisible());
  const dimensions = await page.evaluate(() => ({ body: document.documentElement.scrollWidth, width: window.innerWidth }));
  assert.ok(dimensions.body <= dimensions.width + 2,
    'Result page has horizontal scroll overflow on mobile: ' + JSON.stringify(dimensions));
  console.log('PASS: Result Hub renders usable narrow mobile layout without horizontal overflow');

  assert.deepEqual(errors, [], 'Uncaught browser runtime errors: ' + errors.join('; '));
  console.log('PASS: No uncaught JavaScript errors throughout result smoke');
} finally {
  await browser.close();
}
