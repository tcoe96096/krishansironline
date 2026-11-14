import assert from 'node:assert/strict';
import { chromium } from 'playwright';

const base = (process.env.STUDIO_TEST_BASE_URL || 'http://127.0.0.1:4173').replace(/\/$/, '');
const browser = await chromium.launch({ headless: true });
const errors = [];
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
page.on('pageerror', error => errors.push(error.message));

try {
  await page.goto(base + '/admin-preview/', { waitUntil: 'domcontentloaded', timeout: 45000 });

  // The admin demo route exercises the actual editor without authentication or writes.
  await page.getByRole('button', { name: 'Website Settings & Publishing' }).click();
  await page.getByRole('button', { name: 'Open Main Visual Editor' }).click();
  await page.getByTestId('visual-studio-main').waitFor({ timeout: 20000 });

  assert.equal(await page.getByRole('heading', { name: 'Advanced Real Page Editor' }).count(), 1);
  assert.equal(await page.getByRole('button', { name: /Back to Canvas|Basic Text Editor|Full Website Builder/ }).count(), 0);

  const selector = page.getByTestId('visual-studio-page');
  const options = await selector.locator('option').evaluateAll(items => items.map(item => item.value));
  for (const protectedPage of ['tests', 'results', 'studentDashboard', 'admin', 'adminPreview']) {
    assert.ok(!options.includes(protectedPage), 'Protected page was editable: ' + protectedPage);
  }
  assert.ok(options.includes('home') && options.includes('classes'), 'Editable page options missing');
  console.log('PASS: Single advanced editor and route allowlist');

  const toolbar = page.locator('[data-visual-editor-ui="toolbar"]');
  await toolbar.getByRole('button', { name: /Components/ }).click();
  const components = page.locator('[data-visual-editor-ui="components-menu"]');
  await components.waitFor({ timeout: 15000 });
  assert.equal(await components.getByRole('button').count(), 10); // 9 components + close
  console.log('PASS: Floating commands and component palette');

  const frame = page.frameLocator('iframe[title^="Interactive website editor"]');
  await frame.locator('main').first().waitFor({ timeout: 25000 });
  await components.getByRole('button', { name: /Heading/ }).click();
  await frame.locator('[data-builder-component-id]').first().waitFor({ timeout: 15000 });
  assert.match(await frame.locator('[data-builder-component-id]').first().innerText(), /New section heading/);
  console.log('PASS: Insert component into same-origin live preview iframe');

  await toolbar.getByRole('button', { name: 'Media', exact: true }).click();
  const mediaPanel = page.locator('[data-visual-editor-ui="media-panel"]');
  await mediaPanel.waitFor({ timeout: 15000 });
  assert.equal(await mediaPanel.locator('input[type="file"]').isDisabled(), true);
  console.log('PASS: Floating media panel and upload guard in unauthenticated demo');

  const inspector = page.locator('[data-visual-editor-ui="inspector-panel"]');
  await inspector.waitFor({ timeout: 15000 });
  await frame.locator('h1,h2,h3,p').first().click();
  await inspector.getByText('Live Inspector').waitFor({ timeout: 15000 });
  assert.equal(await inspector.getByRole('button', { name: 'Save Cloud Draft' }).isDisabled(), true);
  console.log('PASS: Element inspector and no unauthorized draft save');

  await selector.selectOption('classes');
  await page.waitForTimeout(300);
  const iframeSrc = await page.locator('iframe[title^="Interactive website editor"]').getAttribute('src');
  assert.match(iframeSrc || '', /classes/);
  await page.getByRole('button', { name: /Mobile/ }).click();
  assert.equal(await page.getByRole('button', { name: /Mobile/ }).getAttribute('aria-pressed'), 'true');
  console.log('PASS: Page switching and responsive preview control');

  assert.deepEqual(errors, [], 'Uncaught browser errors: ' + errors.join('; '));
  console.log('PASS: No uncaught browser runtime errors');
} finally {
  await browser.close();
}
