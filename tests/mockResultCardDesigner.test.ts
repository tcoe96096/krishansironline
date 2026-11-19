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

test('boundary cases: twelve rows are permitted and thirteen rejected',()=>{
  const twelve=Array.from({length:12},(_,i)=>({...row('Subject '+i,'100','99.99'),id:i+1}));
  const total=mockMarksTotal(twelve);
  assert.equal(total?.maximum,1200);
  assert.ok(total && Math.abs(total.obtained-1199.88)<1e-8);
  assert.equal(mockMarksTotal([...twelve,{...row('Extra','100','0'),id:13}]),null);
});
test('invalid numeric notation and over-maximum decimal values are rejected',()=>{
  for(const [maximum,obtained] of [
    ['100','100.01'],['100','1e2'],['100','Infinity'],['100',' 90'],
    ['100','90 '],['100','90,5'],['100','90.000'],['100','-0.5'],
    ['0.00','0'],['1000.01','1']
  ]) assert.equal(mockMarksTotal([row('Hindi',maximum,obtained)]),null);
});
test('unicode subject names remain valid in local mock totals',()=>{
  assert.deepEqual(mockMarksTotal([row('राजनीति विज्ञान','100','75.25')]),{maximum:100,obtained:75.25});
});
