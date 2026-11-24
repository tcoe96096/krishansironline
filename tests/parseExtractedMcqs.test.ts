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
assert.throws(() => parseExtractedMcqs('x'.repeat(2_000_001)), /limit/);
assert.equal(parseExtractedMcqs('Random text without MCQs').questions.length, 0);
console.log('MCQ parser review-first tests passed');
