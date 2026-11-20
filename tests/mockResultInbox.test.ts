import assert from 'node:assert/strict';
import test from 'node:test';
import {MOCK_INBOX_ITEMS,visibleMockInboxItems,isValidMockIssueDate,type MockInboxItem} from '../src/components/MockResultInbox';

test('synthetic inbox excludes drafts, revocations and other recipients',()=>{
  assert.deepEqual(visibleMockInboxItems(MOCK_INBOX_ITEMS).map(item=>item.id),['DEMO-RC-001']);
});
test('only demo-self issued records with positive integral revisions are visible',()=>{
  const fixture:MockInboxItem={id:'safe',title:'Sample',session:'2026–27',status:'issued',recipient:'demo-self',issuedAt:'2026-10-01',revision:1};
  assert.deepEqual(visibleMockInboxItems([fixture]),[fixture]);
  for(const revision of [0,-1,1.5,Number.NaN,Number.POSITIVE_INFINITY]){
    assert.deepEqual(visibleMockInboxItems([{...fixture,revision}]),[]);
  }
});
test('input fixture array remains unchanged after filtering',()=>{
  const before=JSON.stringify(MOCK_INBOX_ITEMS);
  visibleMockInboxItems(MOCK_INBOX_ITEMS);
  assert.equal(JSON.stringify(MOCK_INBOX_ITEMS),before);
});

test('duplicate and blank synthetic identifiers fail closed without mutating fixtures',()=>{
  const base:MockInboxItem={id:'DEMO-ONE',title:'Demo',session:'2026–27',status:'issued',recipient:'demo-self',issuedAt:'2026-10-01',revision:1};
  const entries=[base,{...base,title:'Duplicate'},{...base,id:'   '},{...base,id:'DEMO-TWO'}];
  const before=JSON.stringify(entries);
  assert.deepEqual(visibleMockInboxItems(entries).map(item=>item.id),['DEMO-ONE','DEMO-TWO']);
  assert.equal(JSON.stringify(entries),before);
});


test('synthetic inbox rejects missing and invalid issue dates, including leap-day mistakes',()=>{
  for(const date of ['', '2026-02-29', '2026-13-01', '2026-04-31', '2026-1-01', '2026-01-01T00:00:00Z', '0000-01-01']){
    assert.equal(isValidMockIssueDate(date),false,date);
    const item:MockInboxItem={id:'DATE',title:'Demo',session:'2026–27',status:'issued',recipient:'demo-self',issuedAt:date,revision:1};
    assert.deepEqual(visibleMockInboxItems([item]),[],date);
  }
  for(const date of ['2024-02-29','2000-02-29','2026-12-31'])assert.equal(isValidMockIssueDate(date),true,date);
  assert.equal(isValidMockIssueDate('1900-02-29'),false);
});


test('synthetic IDs differing only by surrounding whitespace cannot create duplicate entries',()=>{
  const base:MockInboxItem={id:'DEMO-ONE',title:'Demo',session:'2026–27',status:'issued',recipient:'demo-self',issuedAt:'2026-10-01',revision:1};
  const entries=[base,{...base,id:' DEMO-ONE '},{...base,id:'DEMO-TWO'}];
  const snapshot=JSON.stringify(entries);
  assert.deepEqual(visibleMockInboxItems(entries).map(item=>item.id),['DEMO-ONE','DEMO-TWO']);
  assert.equal(JSON.stringify(entries),snapshot);
});


test('synthetic inbox rejects unsafe revision numbers and preserves the supplied fixtures',()=>{
  const base:MockInboxItem={id:'DEMO-SAFE',title:'Demo',session:'2026–27',status:'issued',recipient:'demo-self',issuedAt:'2026-11-19',revision:1};
  const invalid=[Number.MAX_SAFE_INTEGER+1,Number.NEGATIVE_INFINITY,Number.POSITIVE_INFINITY,Number.NaN,0.5];
  const items=invalid.map((revision,index)=>({...base,id:`DEMO-INVALID-${index}`,revision}));
  const snapshot=items.map(item=>({...item}));
  assert.deepEqual(visibleMockInboxItems(items),[]);
  assert.deepEqual(items,snapshot);
  assert.deepEqual(visibleMockInboxItems([{...base,revision:Number.MAX_SAFE_INTEGER}]).map(item=>item.id),['DEMO-SAFE']);
});

test('synthetic issue dates enforce Gregorian century leap-year rules',()=>{
  for(const date of ['1600-02-29','2000-02-29','2400-02-29'])assert.equal(isValidMockIssueDate(date),true,date);
  for(const date of ['1700-02-29','1800-02-29','1900-02-29','2100-02-29'])assert.equal(isValidMockIssueDate(date),false,date);
});

test('synthetic inbox fails closed on unexpected runtime recipient and status values',()=>{
  const base:MockInboxItem={id:'DEMO-VALID',title:'Sample',session:'2026–27',status:'issued',recipient:'demo-self',issuedAt:'2026-11-20',revision:1};
  // API-shaped malformed values must never be treated as display authorization.
  const malformed:MockInboxItem[]=[
    {...base,id:'BAD-RECIPIENT',recipient:'demo-self ' as MockInboxItem['recipient']},
    {...base,id:'BAD-STATUS',status:'ISSUED' as MockInboxItem['status']},
    {...base,id:'BAD-NULL',recipient:null as unknown as MockInboxItem['recipient']},
    {...base,id:'BAD-REVISION',revision:Number.MIN_VALUE}
  ];
  const snapshot=malformed.map(item=>({...item}));
  assert.deepEqual(visibleMockInboxItems(malformed),[]);
  assert.deepEqual(malformed,snapshot);
  assert.deepEqual(visibleMockInboxItems([base,...malformed]).map(item=>item.id),['DEMO-VALID']);
});


test('synthetic inbox ignores malformed runtime records without crashing or leaking valid entries',()=>{
  const valid:MockInboxItem={id:'SAFE',title:'Demo',session:'2026–27',status:'issued',recipient:'demo-self',issuedAt:'2026-11-20',revision:1};
  const malformed=[null,undefined,42,'unexpected',{...valid,id:null},{...valid,id:42},{...valid,issuedAt:null},{...valid,issuedAt:20261120}];
  const payload=[...malformed,valid] as unknown as MockInboxItem[];
  assert.doesNotThrow(()=>visibleMockInboxItems(payload));
  assert.deepEqual(visibleMockInboxItems(payload).map(item=>item.id),['SAFE']);
});

test('synthetic inbox ignores malformed title and session fields before React rendering',()=>{
  const valid:MockInboxItem={id:'SAFE-TEXT',title:'Sample',session:'2026–27',status:'issued',recipient:'demo-self',issuedAt:'2026-11-20',revision:1};
  const malformed=[
    {...valid,id:'BAD-TITLE-NULL',title:null},
    {...valid,id:'BAD-TITLE-OBJECT',title:{unsafe:'object'}},
    {...valid,id:'BAD-SESSION-ARRAY',session:['2026–27']},
    {...valid,id:'BAD-SESSION-UNDEFINED',session:undefined}
  ] as unknown as MockInboxItem[];
  const payload=[...malformed,valid];
  assert.doesNotThrow(()=>visibleMockInboxItems(payload));
  assert.deepEqual(visibleMockInboxItems(payload).map(item=>item.id),['SAFE-TEXT']);
});

test('invalid duplicate cannot shadow a later valid synthetic inbox item',()=>{
  const valid:MockInboxItem={id:'DEMO-RECOVER',title:'Safe',session:'2026–27',status:'issued',recipient:'demo-self',issuedAt:'2026-11-20',revision:1};
  const invalid={...valid,id:' DEMO-RECOVER ',status:'revoked' as const};
  const input=[invalid,valid];
  const snapshot=JSON.stringify(input);
  assert.deepEqual(visibleMockInboxItems(input).map(item=>item.id),['DEMO-RECOVER']);
  assert.equal(JSON.stringify(input),snapshot);
});

test('synthetic inbox excludes blank labels and control-character display fields',()=>{
  const valid:MockInboxItem={id:'SAFE-LABEL',title:'Readable result',session:'2026–27',status:'issued',recipient:'demo-self',issuedAt:'2026-11-20',revision:1};
  const invalid=[
    {...valid,id:'BLANK-TITLE',title:'   '},
    {...valid,id:'BLANK-SESSION',session:'\t'},
    {...valid,id:'CTRL-TITLE',title:'Demo\u0000title'},
    {...valid,id:'CTRL-SESSION',session:'2026\u001f27'},
    {...valid,id:'CTRL-ID\u007f'}
  ];
  const snapshot=JSON.stringify(invalid);
  assert.deepEqual(visibleMockInboxItems([...invalid,valid]).map(item=>item.id),['SAFE-LABEL']);
  assert.equal(JSON.stringify(invalid),snapshot);
});


test('synthetic inbox rejects bidirectional override and isolate controls in display fields',()=>{
  const valid:MockInboxItem={id:'BIDI-SAFE',title:'परिणाम / Result',session:'2026–27',status:'issued',recipient:'demo-self',issuedAt:'2026-11-20',revision:1};
  const malformed=[
    {...valid,id:'BIDI-\u202e-ID'},
    {...valid,id:'BIDI-TITLE',title:'Result\u202d hidden'},
    {...valid,id:'BIDI-SESSION',session:'2026\u2066–27\u2069'}
  ];
  const before=JSON.stringify(malformed);
  assert.deepEqual(visibleMockInboxItems([...malformed,valid]).map(item=>item.id),['BIDI-SAFE']);
  assert.equal(JSON.stringify(malformed),before);
});
