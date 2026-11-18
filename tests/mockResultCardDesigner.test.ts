import assert from 'node:assert/strict';
import test from 'node:test';
import {mockMarksTotal} from '../src/components/MockResultCardDesigner';

type MarksRow = Parameters<typeof mockMarksTotal>[0][number];
const row = (subject:string, maximum:string, obtained:string):MarksRow =>
  ({id:1,subject,maximum,obtained});

test('mock totals handle valid marks without rounding away decimal scores',()=>{
  assert.deepEqual(mockMarksTotal([row('History','100','82.5'),{...row('Political Science','50','49.25'),id:2}]),{maximum:150,obtained:131.75});
});
test('blank, invalid and excessive subject lists cannot display a valid total',()=>{
  assert.equal(mockMarksTotal([]),null);
  assert.equal(mockMarksTotal([row('  ','100','80')]),null);
  assert.equal(mockMarksTotal([row('History','0','0')]),null);
  assert.equal(mockMarksTotal([row('History','100','101')]),null);
  assert.equal(mockMarksTotal([row('History','100','-1')]),null);
  assert.equal(mockMarksTotal([row('History','100','NaN')]),null);
  assert.equal(mockMarksTotal([row('History','100','1.234')]),null);
  assert.equal(mockMarksTotal([row('History','1001','1')]),null);
  assert.equal(mockMarksTotal(Array.from({length:13},(_,i)=>({...row('History','100','80'),id:i+1}))),null);
});
test('mock validation never assigns an official grade or publishes a result',()=>{
  assert.deepEqual(mockMarksTotal([row('हिंदी','100','0')]),{maximum:100,obtained:0});
});
