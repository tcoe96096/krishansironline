import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  defaultReportCardTemplate, normalizeReportCardTemplate, serializeReportCardTemplate,
  parseReportCardTemplate, localReportDraftKey
} from './reportCardTemplate';

const design = (options: Record<string,unknown> = {}) => ({
  schema:'ksol.result-card.design',version:1,theme:'modern',
  options:{...defaultReportCardTemplate.options,...options}
});

test('versioned design-only backup survives roundtrip', () => {
  const exported = serializeReportCardTemplate('classic', {
    brandTitle:'KRISHAN SIR ONLINE LEARNING', footerNote:'Revise your lessons',
    showMetrics:true,showPortrait:true,watermarkOpacity:7
  });
  const imported = parseReportCardTemplate(exported);
  assert.equal(imported.theme,'classic');
  assert.equal(imported.options.footerNote,'Revise your lessons');
  assert.equal(imported.options.watermarkOpacity,7);
  assert.ok(!exported.includes('student_id'));
  assert.ok(!exported.includes('score'));
  assert.ok(!exported.includes('attempt'));
});

test('rejects student data and unsafe non-design keys', () => {
  assert.throws(()=>normalizeReportCardTemplate({...design(),student_id:'abc'}),/unrelated/);
  assert.throws(()=>normalizeReportCardTemplate(design({marks:100})),/unsupported/);
  assert.throws(()=>normalizeReportCardTemplate(design({role:'super_admin'})),/unsupported/);
  assert.throws(()=>normalizeReportCardTemplate(design({html:'<script>alert(1)</script>'})),/unsupported/);
});

test('rejects unsupported version, theme, invalid option types and oversized text', () => {
  assert.throws(()=>normalizeReportCardTemplate({...design(),version:2}),/Unsupported/);
  assert.throws(()=>normalizeReportCardTemplate({...design(),theme:'invalid'}),/Unknown/);
  assert.throws(()=>normalizeReportCardTemplate(design({showLogo:'true'})),/boolean/);
  assert.throws(()=>normalizeReportCardTemplate(design({footerNote:'a'.repeat(181)})),/under/);
  assert.throws(()=>normalizeReportCardTemplate(design({watermarkOpacity:101})),/between/);
  assert.throws(()=>normalizeReportCardTemplate(design({watermarkOpacity:Number.NaN})),/between/);
  assert.throws(()=>parseReportCardTemplate('not-json'),/not valid JSON/);
});

test('image options accept data images only, not external or active URLs', () => {
  const logo='data:image/png;base64,aGVsbG8=';
  assert.equal(normalizeReportCardTemplate(design({logoImage:logo})).options.logoImage,logo);
  assert.throws(()=>normalizeReportCardTemplate(design({logoImage:'javascript:alert(1)'})),/safe PNG/);
  assert.throws(()=>normalizeReportCardTemplate(design({portraitImage:'https://example.com/photo.png'})),/safe PNG/);
  assert.throws(()=>normalizeReportCardTemplate(design({portraitImage:'data:image/svg+xml;base64,YQ=='})),/safe PNG/);
});

test('admin local draft is isolated by authenticated UUID', () => {
  const a='cc527c3c-0899-42c0-a23e-120267f96e41';
  const b='cc527c3c-0899-42c0-a23e-120267f96e42';
  assert.notEqual(localReportDraftKey(a),localReportDraftKey(b));
  assert.throws(()=>localReportDraftKey(''),/valid signed-in account/);
  assert.throws(()=>localReportDraftKey('student;malicious'),/valid signed-in account/);
});
