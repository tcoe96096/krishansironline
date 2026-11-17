import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  percentageLabel, percentBarWidth, submittedMetrics, escapeSpreadsheetCell, findOwnedSubmittedResult
} from './resultMetrics';

test('renders zero and numeric percentages without inventing missing results', () => {
  assert.equal(percentageLabel(0), '0.0%');
  assert.equal(percentageLabel(85.246), '85.2%');
  assert.equal(percentageLabel(null), '—');
  assert.equal(percentageLabel(Number.NaN), '—');
  assert.equal(percentBarWidth(120), '100%');
  assert.equal(percentBarWidth(-20), '0%');
  assert.equal(percentBarWidth(null), '0%');
});

test('result metrics are unavailable before a valid submitted attempt', () => {
  const attempt = {
    status: 'in_progress' as const, percentage: null, correct_count: null,
    attempted_count: null, score: null, total_marks: 40
  };
  assert.equal(submittedMetrics(attempt), null);
  assert.equal(submittedMetrics({ ...attempt, status: 'expired' }), null);
});

test('completed result shows counts from server without regrading', () => {
  const attempt = {
    status: 'submitted' as const, percentage: 80, correct_count: 32,
    attempted_count: 38, score: 32, total_marks: 40
  };
  assert.deepEqual(submittedMetrics(attempt), {
    correct:32, attempted:38, incorrect:6, score:32, totalMarks:40, percentage:80
  });
  assert.equal(attempt.score, 32);
});

test('malformed counts cannot produce negative incorrect count', () => {
  const attempt = {
    status: 'submitted' as const, percentage: 100, correct_count: 12,
    attempted_count: 9, score: 10, total_marks: 10
  };
  assert.equal(submittedMetrics(attempt)?.incorrect, 0);
});

test('CSV formulas and special characters remain plain text and quoted', () => {
  assert.equal(escapeSpreadsheetCell('=SUM(A1:A2)'), '"\'=SUM(A1:A2)"');
  assert.equal(escapeSpreadsheetCell('+1+2'), '"\'+1+2"');
  assert.equal(escapeSpreadsheetCell('\t=1+2'), '"\'\t=1+2"');
  assert.equal(escapeSpreadsheetCell('A "quote"'), '"A ""quote"""');
  assert.equal(escapeSpreadsheetCell(null), '""');
  assert.equal(escapeSpreadsheetCell('Krishan Sir'), '"Krishan Sir"');
});

test('private result links never open another student or unfinished attempt', () => {
  const first = { id:'cc527c3c-0899-42c0-a23e-120267f96e41',student_id:'student-a',status:'submitted' };
  const other = { id:'dc527c3c-0899-42c0-a23e-120267f96e42',student_id:'student-b',status:'submitted' };
  const pending = { id:'ec527c3c-0899-42c0-a23e-120267f96e43',student_id:'student-a',status:'in_progress' };
  const attempts = [first,other,pending] as const;
  assert.deepEqual(findOwnedSubmittedResult(attempts,'student-a',first.id),first);
  assert.equal(findOwnedSubmittedResult(attempts,'student-a',other.id),null);
  assert.equal(findOwnedSubmittedResult(attempts,'student-a',pending.id),null);
  assert.equal(findOwnedSubmittedResult(attempts,'student-b',first.id),null);
  assert.equal(findOwnedSubmittedResult(attempts,null,first.id),null);
  assert.equal(findOwnedSubmittedResult(attempts,'student-a','not-a-valid-uuid'),null);
  assert.equal(findOwnedSubmittedResult(attempts,'student-a',null),null);
});
