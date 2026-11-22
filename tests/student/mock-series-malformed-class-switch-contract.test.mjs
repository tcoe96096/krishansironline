// Static malformed-payload and class-switch guard checks; not a browser or RLS test.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const source=readFileSync(new URL('../../src/components/StudentMockTestSeries.tsx',import.meta.url),'utf8');

test('malformed API collections fail closed without crashing the dashboard',()=>{
 assert.match(source,/Array\.isArray\(seriesResult\.data\)\?seriesResult\.data:\[\]/);
 assert.match(source,/Array\.isArray\(history\)\?history:\[\]/);
 assert.match(source,/Array\.isArray\(publishedTests\)\?publishedTests:\[\]/);
 assert.match(source,/Array\.isArray\(s\.test_ids\)\?s\.test_ids:\[\]/);
 assert.match(source,/typeof id==='string'/);
});
test('class switches suppress old catalogue and attempts before new response',()=>{
 assert.match(source,/setLoadedClass\(undefined\);setRows\(\[\]\);setAttempts\(\[\]\);setTests\(\[\]\)/);
 assert.match(source,/const classPending=Boolean\(classLevel\)&&loadedClass!==classLevel/);
 assert.match(source,/const visibleRows=!classPending\?rows\.filter\(series=>series\.class_level===classLevel\):\[\]/);
 assert.match(source,/if\(current!==requestId\.current\)return/);
});
test('no link is offered for empty published test intersection',()=>{
 assert.match(source,/const availableIds=uniqueSeriesIds\.filter\(id=>testById\.has\(id\)\)/);
 assert.match(source,/availableIds\.length===0\?</);
 assert.match(source,/encodeURIComponent\(launchId\|\|''\)/);
});
