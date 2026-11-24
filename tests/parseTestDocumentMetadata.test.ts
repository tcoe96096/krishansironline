import assert from 'node:assert/strict';
import { parseTestDocumentMetadata } from '../src/lib/parseTestDocumentMetadata';

const metadata = parseTestDocumentMetadata([
  'Test Title: Minerals and Energy Resources',
  'Class: 10',
  'Subject: Social Science',
  'Chapter: Minerals',
  'Time: 1 hour 30 minutes',
  'Attempt Limit: 2',
  'Marks per Question: 2',
  'Total Questions: 2',
  '1. First question?',
  '2. Second question?',
].join('\n'), 'backup.docx', 2);
assert.equal(metadata.title, 'Minerals and Energy Resources');
assert.equal(metadata.classLevel, '10');
assert.equal(metadata.subject, 'Social Science');
assert.equal(metadata.chapter, 'Minerals');
assert.equal(metadata.durationMinutes, 90);
assert.equal(metadata.attemptLimit, 2);
assert.equal(metadata.marksPerQuestion, 2);
assert.deepEqual(metadata.warnings, []);

const hindi = parseTestDocumentMetadata([
  'शीर्षक: पर्यावरण संरक्षण',
  'कक्षा: 8',
  'विषय: सामाजिक विज्ञान',
  'अध्याय: प्राकृतिक संसाधन',
  'समय: 45 मिनट',
  'प्रति प्रश्न अंक: 1.5',
  'कुल प्रश्न: 10',
].join('\n'), 'unknown.pdf', 9);
assert.equal(hindi.durationMinutes, 45);
assert.equal(hindi.marksPerQuestion, 1.5);
assert.equal(hindi.classLevel, '8');
assert.ok(hindi.warnings.some(x => /parser found 9/.test(x)));

const unsafe = parseTestDocumentMetadata([
  'Duration: 500 hours',
  'Attempt Limit: 300',
  'Marks per question: -5',
  'Class: 15',
  'Total Marks: 20',
], 'test__sample.pdf', 5);
assert.equal(unsafe.durationMinutes, undefined);
assert.equal(unsafe.attemptLimit, undefined);
assert.equal(unsafe.marksPerQuestion, undefined);
assert.equal(unsafe.classLevel, undefined);
assert.equal(unsafe.title, 'test sample');
assert.ok(unsafe.warnings.length >= 4);
console.log('Test document metadata parser tests passed');
