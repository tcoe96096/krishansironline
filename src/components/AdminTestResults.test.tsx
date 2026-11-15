import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync } from 'node:fs';

// Structural source-contract checks only. Real DOM/navigation behavior is
// validated separately by the Playwright Chromium workflow.
const resultSource = readFileSync(new URL('./AdminTestResults.tsx', import.meta.url), 'utf8');
const dashboardSource = readFileSync(new URL('./AdminDashboard.tsx', import.meta.url), 'utf8');

test('admin result card studio, permission and material controls have handlers', () => {
  for (const token of [
    'ADMIN RESULT CONTROL BOARD',
    'Open Digital Card Studio',
    'onOpenMaterials',
    'onOpenStaff',
    'setSelected(completed[0])',
    'setShowCardDesigner(true)',
    'Save Design (Local Draft)',
    'Copy Secure Student Link',
    'Share Digitally',
    'Print / PDF',
  ]) assert.ok(resultSource.includes(token), 'Missing admin source contract: ' + token);
});

test('disabled or gated controls never claim database features are fully activated', () => {
  for (const token of [
    'disabled={!completed.length || loading}',
    'Local Draft',
    'Backend-gated',
    'inAppDeliveryAvailable &&',
    'Layout edits are not saved to the database.',
  ]) assert.ok(resultSource.includes(token), 'Missing control safety boundary: ' + token);
});

test('notification bell and report navigation point to functional admin modules', () => {
  assert.ok(dashboardSource.includes("onClick={() => {setActive('communication');setSidebarOpen(false);}}"));
  assert.ok(dashboardSource.includes("onOpenMaterials={() => setActive('materials')}"));
  assert.ok(dashboardSource.includes("onOpenStaff={() => setActive('staff')}"));
  assert.ok(dashboardSource.includes('"Admin Account"'));
});
