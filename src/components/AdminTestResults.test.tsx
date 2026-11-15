import assert from 'node:assert/strict';
import { test } from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { AdminTestResults } from './AdminTestResults';

test('non-demo result admin shows the control board and its navigation links', () => {
  const html = renderToStaticMarkup(React.createElement(AdminTestResults, {
    onOpenMaterials: () => {},
    onOpenStaff: () => {}
  }));
  for (const label of ['ADMIN RESULT CONTROL BOARD','Digital Report Card &amp; Permissions',
    'Open Digital Card Studio','Study Materials','Staff Permissions','Local Draft','Backend-gated']) {
    assert.ok(html.includes(label), 'Missing admin control label: ' + label);
  }
  // No fabricated student results. The studio opens only for submitted records.
  assert.match(html, /Open Digital Card Studio<\/button>/);
  assert.match(html, /Submitted Result/);
  assert.match(html, /disabled=""/);
  assert.equal(html.includes('Student Result Inbox sent successfully'), false);
});

test('public admin preview never displays real report controls', () => {
  const html = renderToStaticMarkup(React.createElement(AdminTestResults, {demoMode: true}));
  assert.match(html, /Result Management — Protected Preview/);
  assert.equal(html.includes('Export CSV'),false);
  assert.equal(html.includes('Open Digital Card Studio'),false);
  assert.equal(html.includes('Send to Student Inbox'),false);
});
