import assert from 'node:assert/strict';
import test from 'node:test';
import {MOCK_INBOX_ITEMS,visibleMockInboxItems,type MockInboxItem} from '../src/components/MockResultInbox';

test('synthetic inbox excludes drafts, revocations and other recipients',()=>{
  assert.deepEqual(visibleMockInboxItems(MOCK_INBOX_ITEMS).map(item=>item.id),['DEMO-RC-001']);
});
test('only demo-self issued records with positive integral revisions are visible',()=>{
  const fixture:MockInboxItem={id:'safe',title:'Sample',session:'2026–27',status:'issued',recipient:'demo-self',issuedAt:'',revision:1};
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
