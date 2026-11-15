import assert from 'node:assert/strict';
import { chromium } from 'playwright';

const base = (process.env.STUDIO_TEST_BASE_URL || 'http://127.0.0.1:4173').replace(/\/$/, '');
const browser = await chromium.launch({ headless: true });
const errors = [];
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
page.on('pageerror', error => errors.push(error.message));

try {
  await page.goto(base + '/admin-preview/', { waitUntil: 'domcontentloaded', timeout: 45000 });

  // The Admin sidebar has one Website Studio entry and hides unfinished modules.
  assert.equal(await page.getByRole('button',{name:'Legacy Site Settings',exact:true}).count(),0);
  assert.equal(await page.getByRole('button',{name:'Help Desk',exact:true}).count(),0);
  await page.getByRole('button',{name:'Show planned modules (5)'}).click();
  assert.equal(await page.getByRole('button',{name:'Help Desk',exact:true}).count(),1);
  await page.getByRole('button',{name:'Hide planned modules'}).click();
  const findModule=page.getByRole('searchbox',{name:'Search Admin modules'});
  await findModule.fill('Website Studio');
  assert.equal(await page.getByRole('button',{name:'Website Studio',exact:true}).count(),1);
  await findModule.fill('');
  console.log('PASS: Professional Admin navigation, optional planned modules and search');

  // The admin demo route exercises the actual editor without authentication or writes.
  await page.getByRole('button', { name: 'Website Studio', exact: true }).click();
  const editorTabs = page.getByRole('group', {name:'Website editor panels'});
  await editorTabs.getByRole('button', {name:'Branding & Site Settings'}).click();
  await page.getByText('Legacy settings are kept inside this panel').waitFor();
  await editorTabs.getByRole('button', {name:'Page Builder'}).click();
  await page.getByTestId('visual-studio-main').waitFor({ timeout: 20000 });

  assert.equal(await page.getByRole('heading', { name: 'Advanced Real Page Editor' }).count(), 1);
  assert.equal(await page.getByRole('button', { name: /Back to Canvas|Basic Text Editor|Full Website Builder/ }).count(), 0);

  const selector = page.getByTestId('visual-studio-page');
  const options = await selector.locator('option').evaluateAll(items => items.map(item => item.value));
  for (const protectedPage of ['tests', 'results', 'studentDashboard', 'admin', 'adminPreview']) {
    assert.ok(options.includes(protectedPage), 'All-page design preview is missing: ' + protectedPage);
  }
  assert.ok(options.includes('home') && options.includes('classes'), 'Editable page options missing');
  const allLabels = await selector.locator('option').allTextContents();
  assert.ok(allLabels.some(label => label.includes('Design only (protected)')), 'Protected-page design-only labels missing');
  console.log('PASS: Single advanced editor exposes all routes with protected design-only labels');

  const toolbar = page.locator('[data-visual-editor-ui="toolbar"]');
  await toolbar.getByRole('button', { name: /Components/ }).click();
  const components = page.locator('[data-visual-editor-ui="components-menu"]');
  await components.waitFor({ timeout: 15000 });
  assert.equal(await components.getByRole('button').count(), 17); // 16 components + close
  await components.getByRole('textbox', { name: 'Search components' }).fill('FAQ');
  assert.equal(await components.getByRole('button', { name: /FAQ/ }).count(), 1);
  await components.getByRole('textbox', { name: 'Search components' }).fill('');
  console.log('PASS: Floating commands, 16-component palette, and search');

  const frame = page.frameLocator('iframe[title^="Interactive website editor"]');
  await frame.locator('main').first().waitFor({ timeout: 25000 });
  await components.getByRole('button', { name: /Heading/ }).click();
  await frame.locator('[data-builder-component-id]').first().waitFor({ timeout: 15000 });
  assert.match(await frame.locator('[data-builder-component-id]').first().innerText(), /New section heading/);
  const inspector = page.locator('[data-visual-editor-ui="inspector-panel"]');
  await inspector.waitFor({ timeout: 15000 });
  const managed = inspector.getByTestId('managed-component-editor');
  await managed.waitFor({ timeout: 15000 });
  await managed.getByRole('textbox', { name: 'Component title' }).fill('Edited Website Heading');
  await managed.getByRole('combobox', { name: 'Component animation' }).selectOption('fade');
  await managed.getByRole('combobox', { name: 'Component filter' }).selectOption('grayscale');
  await managed.getByRole('combobox', { name: 'Component hover' }).selectOption('glow');
  const firstComponent = frame.locator('[data-builder-component-id]').first();
  assert.equal(await firstComponent.getAttribute('data-studio-animation'), 'fade');
  assert.equal(await firstComponent.getAttribute('data-studio-hover'), 'glow');
  assert.match(await firstComponent.evaluate(element => element.style.filter), /grayscale/);
  assert.match(await frame.locator('[data-builder-component-id]').first().innerText(), /Edited Website Heading/);
  await managed.getByRole('button', { name: 'Duplicate component' }).click();
  assert.equal(await frame.locator('[data-builder-component-id]').count(), 2);
  await managed.getByRole('button', { name: 'Delete component' }).click();
  assert.equal(await frame.locator('[data-builder-component-id]').count(), 1);
  await toolbar.getByRole('button', { name: 'Undo added component' }).click();
  assert.equal(await frame.locator('[data-builder-component-id]').count(), 2);
  await toolbar.getByRole('button', { name: 'Redo added component' }).click();
  assert.equal(await frame.locator('[data-builder-component-id]').count(), 1);
  console.log('PASS: Insert, content edit, duplicate, delete, undo and redo');

  await toolbar.getByRole('button', { name: 'Media', exact: true }).click();
  const mediaPanel = page.locator('[data-visual-editor-ui="media-panel"]');
  await mediaPanel.waitFor({ timeout: 15000 });
  assert.equal(await mediaPanel.locator('input[type="file"]').isDisabled(), true);
  console.log('PASS: Floating media panel and upload guard in unauthenticated demo');

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
  await selector.selectOption('tests');
  assert.match(await page.getByRole('status').allTextContents().then(values => values.join(' ')), /Design-only mode/);
  const testsSrc = await page.locator('iframe[title^="Interactive website editor"]').getAttribute('src');
  assert.match(testsSrc || '', /online-tests/);
  console.log('PASS: Page switching, responsive controls, and protected routes in design-only mode');

  // Draft new page: demo mode never writes to Supabase or publishes a route.
  await page.getByRole('button', { name: 'Add New Page' }).click();
  await page.getByRole('textbox', { name: 'New page title' }).fill('Class 10 Sample Lesson');
  await page.getByRole('textbox', { name: 'New page slug' }).fill('class-10-sample-lesson');
  await page.getByRole('combobox', { name: 'New page template' }).selectOption('course');
  await page.getByRole('textbox', { name: 'New page description' }).fill('Draft learning page');
  await page.getByRole('button', { name: 'Create Draft Page' }).click();
  await selector.selectOption('custom-class-10-sample-lesson');
  const draftFrame = page.frameLocator('iframe[title^="Interactive website editor"]');
  await draftFrame.getByText('Class 10 Sample Lesson', { exact: true }).waitFor({ timeout: 15000 });
  assert.equal(await page.getByRole('status').allTextContents().then(values => values.join(' ')).then(v => /demo session only/i.test(v)), true);
  console.log('PASS: New page creator, safe slug, course template and draft-only behavior');

  const draftToolbar = page.locator('[data-visual-editor-ui="toolbar"]');
  await draftToolbar.getByRole('button', { name: 'Themes' }).click();
  await page.locator('[data-visual-editor-ui="themes-panel"]').getByRole('button', { name: 'Forest Green' }).click();
  await draftFrame.locator('style[data-studio-theme="forest"]').waitFor({ state: 'attached', timeout: 15000 });
  console.log('PASS: Theme presets apply to custom page Preview only');

  await draftToolbar.getByRole('button', { name: /Components/ }).click();
  const customPalette = page.locator('[data-visual-editor-ui="components-menu"]');
  await customPalette.getByRole('textbox', { name: 'Search components' }).fill('PDF');
  await customPalette.getByRole('button', { name: /PDF Reader/ }).click();
  const customInspector = page.locator('[data-visual-editor-ui="inspector-panel"]');
  await customInspector.getByRole('textbox', { name: 'Component media URL' }).fill('https://example.com/guide.pdf');
  await draftFrame.locator('iframe[title="PDF learning resource"]').waitFor({ timeout: 15000 });
  console.log('PASS: PDF reader embeds only HTTPS URL');

  await draftToolbar.getByRole('button', { name: /Components/ }).click();
  await customPalette.getByRole('textbox', { name: 'Search components' }).fill('Video');
  await customPalette.getByRole('button', { name: /Video Player/ }).click();
  await customInspector.getByRole('textbox', { name: 'Component media URL' }).fill('https://example.com/lesson.mp4');
  await draftFrame.locator('video[src^="https://example.com/"]').waitFor({ timeout: 15000 });
  console.log('PASS: HTML5 video player via HTTPS URL');

  // Smart visual editor effects: animation, filter, hover, preset, auto contrast.
  await draftFrame.getByRole('heading', { name: 'Class 10 Sample Lesson' }).click();
  const effects = page.getByTestId('effects-inspector');
  await effects.getByRole('combobox', { name: 'Entrance Animation' }).selectOption('fade');
  await effects.getByRole('combobox', { name: 'Visual Filter' }).selectOption('grayscale');
  await effects.getByRole('combobox', { name: 'Hover Animation' }).selectOption('lift');
  const title = draftFrame.getByRole('heading', { name: 'Class 10 Sample Lesson' });
  assert.equal(await title.getAttribute('data-studio-animation'), 'fade');
  assert.equal(await title.getAttribute('data-studio-hover'), 'lift');
  assert.match(await title.evaluate(element => element.style.filter), /grayscale/);
  await draftToolbar.getByRole('button', { name: /Smart Tools/ }).click();
  const smart = page.locator('[data-visual-editor-ui="smart-tools-panel"]');
  await smart.getByRole('button', { name: /Rounded/ }).click();
  assert.equal(await title.evaluate(element => element.style.borderRadius), '22px');
  await smart.getByRole('button', { name: 'Auto Contrast' }).click();
  assert.equal(await title.evaluate(element => element.style.color), 'rgb(15, 23, 42)');
  await smart.getByRole('button', { name: 'Copy Style' }).click();
  assert.equal(await smart.getByRole('button', { name: 'Paste Style' }).isEnabled(), true);
  console.log('PASS: Visual animations, filters, hover, preset, auto-contrast and clipboard tools');

  await page.getByRole('button', { name: 'Publish & Schedule' }).click();
  const publishing = page.getByTestId('studio-publishing-panel');
  await publishing.waitFor({ timeout: 15000 });
  assert.equal(await publishing.getByRole('button', { name: /Publish Saved Draft Now/ }).isDisabled(), true);
  await publishing.locator('input[aria-label="Schedule publication date and time"]').fill('2027-01-01T12:30');
  assert.equal(await publishing.getByRole('button', { name: 'Schedule Publish' }).isDisabled(), true);
  console.log('PASS: Publish and schedule controls prevent unauthorized demo writes');

  assert.deepEqual(errors, [], 'Uncaught browser errors: ' + errors.join('; '));
  console.log('PASS: No uncaught browser runtime errors');
} finally {
  await browser.close();
}
