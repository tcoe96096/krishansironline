import assert from 'node:assert/strict';
import { test } from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { SmartResultReportCard, openSmartResultPrint } from './SmartResultReportCard';
import type { ResultReportData } from './SmartResultReportCard';
import type { TestAttempt } from '../services/testService';

const submitted: TestAttempt = {
  id: 'cc527c3c-0899-42c0-a23e-120267f96e41',
  student_id: '0e9cb855-09d6-4925-a359-68be86b5188c',
  test_id: 'sample-40',
  attempt_number: 2,
  status: 'submitted',
  started_at: '2026-11-12T10:00:00.000Z',
  expires_at: '2026-11-12T10:40:00.000Z',
  submitted_at: '2026-11-12T10:32:00.000Z',
  score: 32,
  total_marks: 40,
  percentage: 80,
  correct_count: 32,
  attempted_count: 38
};

const report = (overrides: Partial<ResultReportData> = {}): ResultReportData => ({
  attempt: submitted,
  title: 'Political Science 40 MCQs',
  subject: 'Political Science',
  student: {name:'Demo Learner', rollNo:'L-12', school:'Example School', classLevel:'12'},
  isEnglish: true,
  theme: 'modern',
  ...overrides
});

test('submitted attempts automatically produce correct card metrics and student details', () => {
  const html = renderToStaticMarkup(React.createElement(SmartResultReportCard,{data:report()}));
  assert.match(html,/Political Science 40 MCQs/);
  assert.match(html,/Demo Learner/);
  assert.match(html,/32/);
  assert.match(html,/40/);
  assert.match(html,/80\.0%/);
  assert.match(html,/Print \/ Save as PDF/);
});

test('non-submitted attempts never show a result card', () => {
  for (const status of ['in_progress','expired'] as const) {
    const html=renderToStaticMarkup(React.createElement(SmartResultReportCard,{
      data:report({attempt:{...submitted,status,score:null,percentage:null,correct_count:null}})
    }));
    assert.equal(html,'');
  }
});

test('all three card themes render without database writes', () => {
  for (const theme of ['modern','classic','minimal'] as const) {
    const html = renderToStaticMarkup(React.createElement(SmartResultReportCard,{data:report({theme})}));
    assert.match(html,/SMART RESULT REPORT/);
    assert.match(html,/80\.0%/);
    assert.ok(html.includes('style='));
  }
});

test('result report printing escapes student-provided markup before inserting HTML', () => {
  const written:string[]=[];
  const previous=(globalThis as unknown as {window?:unknown}).window;
  (globalThis as unknown as {window?:unknown}).window={
    open:()=>({opener:null,document:{write:(text:string)=>written.push(text),close:()=>{}}})
  };
  try{
    const opened=openSmartResultPrint(report({
      title: 'Test <script>alert(1)</script>',
      student: {name:'<img src=x onerror=alert(1)>',rollNo:'=SUM(1,2)',classLevel:'12'}
    }));
    assert.equal(opened,true);
    const output=written.join('');
    assert.match(output,/&lt;script&gt;alert\(1\)&lt;\/script&gt;/);
    assert.match(output,/&lt;img src=x onerror=alert\(1\)&gt;/);
    assert.ok(!output.includes('<img src=x onerror=alert(1)>'));
    assert.match(output,/32/);
  }finally{
    (globalThis as unknown as {window?:unknown}).window=previous;
  }
});

test('non-submitted report never attempts opening a print window',()=>{
  assert.equal(openSmartResultPrint(report({attempt:{...submitted,status:'in_progress'}})),false);
});

test('admin design options change presentation only, not server-recorded grades', () => {
  const original = report();
  const customized = report({
    options: {showInstitution:false,showMetrics:false,footerNote:'Keep revising every day.'}
  });
  const standardHtml = renderToStaticMarkup(React.createElement(SmartResultReportCard,{data:original}));
  const customHtml = renderToStaticMarkup(React.createElement(SmartResultReportCard,{data:customized}));
  assert.match(standardHtml,/Example School/);
  assert.ok(!customHtml.includes('Example School'));
  assert.ok(!customHtml.includes('>Incorrect<'));
  assert.match(customHtml,/Keep revising every day/);
  assert.match(customHtml,/80\.0%/);
  assert.match(customHtml,/32/);
  assert.equal(original.attempt.score,customized.attempt.score);
});

test('customized print note is HTML-escaped and does not change scores', () => {
  const written:string[]=[];
  const previous=(globalThis as unknown as {window?:unknown}).window;
  (globalThis as unknown as {window?:unknown}).window={
    open:()=>({opener:null,document:{write:(text:string)=>written.push(text),close:()=>{}}})
  };
  try {
    const success = openSmartResultPrint(report({
      options:{showInstitution:false,showMetrics:false,footerNote:'Review <img src=x onerror=alert(1)>'}
    }));
    assert.equal(success,true);
    const output=written.join('');
    assert.ok(!output.includes('Example School'));
    assert.ok(!output.includes('<div class="metrics">'));
    assert.match(output,/Review &lt;img src=x onerror=alert\(1\)&gt;/);
    assert.match(output,/32/);
    assert.match(output,/80\.0%/);
  }finally{
    (globalThis as unknown as {window?:unknown}).window=previous;
  }
});
