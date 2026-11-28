// Review only: assemble the exact three Result modules into one atomic SQL file.
// No connection, deployment, secrets, or automatic execution.
import {readFileSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
const out=process.argv[2];
if(!out)throw new Error('Specify new staging output file');
const names=[
 'result-template-production-CANDIDATE-DO-NOT-APPLY.sql',
 'result-generation-snapshot-20261127-CANDIDATE-DO-NOT-APPLY.sql',
 'result-private-publication-20261127-CANDIDATE-DO-NOT-APPLY.sql'
];
const modules=names.map(name=>{
 const sql=readFileSync(join('docs/results',name),'utf8');
 const begins=[...sql.matchAll(/^BEGIN;[ \t]*$/gm)];
 const commits=[...sql.matchAll(/^COMMIT;[ \t]*$/gm)];
 if(begins.length!==1||commits.length!==1||begins[0].index>=commits[0].index)throw new Error('Transaction envelope changed: '+name);
 return '-- Source: '+name+'\n-- SHA256: '+createHash('sha256').update(sql).digest('hex')+'\n'+sql.replace(/^BEGIN;[ \t]*$/m,'').replace(/^COMMIT;[ \t]*$/m,'');
});
const body='-- REVIEW ONLY: DO NOT APPLY without verified recovery and authorization.\nBEGIN;\nSET LOCAL lock_timeout = \'5s\';\nSET LOCAL statement_timeout = \'60s\';\n'+modules.join('\n')+'\nCOMMIT;\n';
writeFileSync(out,body,{flag:'wx',mode:0o600});
console.log('ATOMIC_RESULT_SQL_PACKAGE_STAGED');
