import assert from 'node:assert/strict';
import { parseExtractedMcqs } from '../src/lib/parseExtractedMcqs';

const sample = [
  'Class: 10', 'Subject: Social Science',
  '1. Which crop suits black soil?',
  'A. Wheat', 'B. Cotton', 'C. Rice', 'D. Tea', 'Answer: B',
  '2. मिट्टी के कटाव को क्या रोकता है?',
  'A. खनन', 'B. वनों की कटाई', 'C. वृक्षारोपण', 'D. अतिचारण'
].join('\n');

const parsed = parseExtractedMcqs(sample);
assert.equal(parsed.questions.length, 2);
assert.equal(parsed.questions[0].question, 'Which crop suits black soil?');
assert.deepEqual(parsed.questions[0].options, ['Wheat', 'Cotton', 'Rice', 'Tea']);
assert.equal(parsed.questions[0].answerIndex, 1);
assert.equal(parsed.questions[1].answerIndex, null);
assert.ok(parsed.warnings.some(x => /Question 2: answer requires review/.test(x)));

const inline = parseExtractedMcqs([
  'Q1. Select the river. A. Yamuna B. Sutlej C. Ganga D. Godavari Answer: C',
  'Q2) भारत की राजधानी? (A) दिल्ली (B) जयपुर (C) लखनऊ (D) चंडीगढ़',
].join('\n'));
assert.equal(inline.questions.length, 2);
assert.equal(inline.questions[0].question, 'Select the river.');
assert.deepEqual(inline.questions[0].options, ['Yamuna', 'Sutlej', 'Ganga', 'Godavari']);
assert.equal(inline.questions[0].answerIndex, 2);
assert.deepEqual(inline.questions[1].options, ['दिल्ली', 'जयपुर', 'लखनऊ', 'चंडीगढ़']);
assert.equal(inline.questions[1].answerIndex, null);

const multiLine = parseExtractedMcqs([
  '3. A question that wraps',
  'to another line',
  'A. Choice which wraps', 'to another line',
  'B. Second', 'C. Third', 'D. Fourth', 'Correct Answer: D',
].join('\n'));
assert.equal(multiLine.questions.length, 1);
assert.equal(multiLine.questions[0].question, 'A question that wraps to another line');
assert.equal(multiLine.questions[0].options[0], 'Choice which wraps to another line');
assert.equal(multiLine.questions[0].answerIndex, 3);

const incomplete = parseExtractedMcqs('4. Missing D?\nA. One\nB. Two\nC. Three');
assert.equal(incomplete.questions.length, 0);
assert.ok(incomplete.warnings.some(x => /expected four options/.test(x)));
assert.throws(() => parseExtractedMcqs('x'.repeat(2_000_001)), /limit/);
assert.equal(parseExtractedMcqs('Random text without MCQs').questions.length, 0);


// End-of-document answer key can contain multiple entries per line.
const separateKey = parseExtractedMcqs([
  '1. The largest planet?',
  'A. Earth B. Jupiter C. Mars D. Venus',
  '(2) Which is a metal?',
  '(A) Wood (B) Iron (C) Rubber (D) Paper',
  'उत्तर कुंजी: 1-B, 2-B',
].join('\n'));
assert.equal(separateKey.questions.length, 2);
assert.deepEqual(separateKey.questions.map(x => x.answerIndex), [1, 1]);
assert.equal(separateKey.questions[0].options[1], 'Jupiter');
assert.ok(!separateKey.questions[1].options[3].includes('उत्तर कुंजी'));

const conflict = parseExtractedMcqs([
  '1. Choose the correctly spelled word',
  'A. Beter B. Better C. Btter D. Beteer',
  'Answer: B',
  'Answer Key: 1-C',
].join('\n'));
assert.equal(conflict.questions[0].answerIndex, null);
assert.ok(conflict.warnings.some(x => /conflicts with inline/.test(x)));

const ambiguousKey = parseExtractedMcqs([
  '1. Choose one.',
  'A. One B. Two C. Three D. Four',
  'Answer key: 1-A, 1-D',
].join('\n'));
assert.equal(ambiguousKey.questions[0].answerIndex, null);
assert.ok(ambiguousKey.warnings.some(x => /ambiguous answer key/.test(x)));

const missingEntry = parseExtractedMcqs([
  '1. Choose one.',
  'A. One B. Two C. Three D. Four',
  'Answer Key:',
  '1-A',
  '2-C',
].join('\n'));
assert.equal(missingEntry.questions[0].answerIndex, 0);
assert.ok(missingEntry.warnings.some(x => /entry 2: question missing/.test(x)));

console.log('MCQ parser review-first tests passed');
