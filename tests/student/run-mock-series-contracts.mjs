// Run with: node tests/student/run-mock-series-contracts.mjs
// Static source-contract coverage only; NOT browser, JWT/RLS, or runtime acceptance.
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {dirname,resolve} from 'node:path';

const directory=dirname(fileURLToPath(import.meta.url));
const cases=[
 'mock-series-source-contract.test.mjs',
 'mock-series-navigation-contract.test.mjs',
 'mock-series-privacy-lifecycle-contract.test.mjs',
 'mock-series-a11y-boundaries-contract.test.mjs',
 'mock-series-bilingual-states-contract.test.mjs',
];
const result=spawnSync(process.execPath,['--test',...cases.map(name=>resolve(directory,name))],{
 cwd:directory,stdio:'inherit',env:{...process.env,NODE_ENV:'test'},timeout:120000,
});
if(result.error){console.error('Student source-contract runner failed:',result.error.message);process.exitCode=1;}
else process.exitCode=result.status===0?0:1;
