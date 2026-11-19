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
