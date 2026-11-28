// Review-only additive Preview package. Preserve existing templates and audit history.
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
const out=process.argv[2];
if(!out)throw new Error('Specify a new staging output file');
const guard=`DO $preview_guard$
BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relname='result_card_templates' AND c.relrowsecurity)
 OR NOT EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relname='result_card_template_audit' AND c.relrowsecurity)
 OR pg_catalog.to_regprocedure('public.publish_result_card_template(text,jsonb,text)') IS NULL
 OR pg_catalog.to_regprocedure('public.can_publish_result_card_template()') IS NULL
 OR pg_catalog.to_regprocedure('private.audit_result_card_template()') IS NULL THEN
   RAISE EXCEPTION 'Expected existing Preview template catalog missing; stop';
 END IF;
 IF (SELECT count(*) FROM information_schema.columns WHERE table_schema='public' AND table_name='result_card_templates' AND (column_name,data_type) IN (('template_key','text'),('theme','text'),('options','jsonb'),('version','integer'),('is_published','boolean'),('change_reason','text'),('updated_by','uuid'),('updated_at','timestamp with time zone'))) <> 8 THEN
   RAISE EXCEPTION 'Preview template columns differ; stop';
 END IF;
END;
$preview_guard$;
`;
const names=['result-generation-snapshot-20261127-CANDIDATE-DO-NOT-APPLY.sql','result-private-publication-20261127-CANDIDATE-DO-NOT-APPLY.sql'];
const modules=names.map(name=>{
 const sql=readFileSync('docs/results/'+name,'utf8');
 if([...sql.matchAll(/^BEGIN;[ \t]*$/gm)].length!==1||[...sql.matchAll(/^COMMIT;[ \t]*$/gm)].length!==1)throw new Error('Transaction envelope changed');
 return '-- Source: '+name+' SHA256: '+createHash('sha256').update(sql).digest('hex')+'\n'+sql.replace(/^BEGIN;[ \t]*$/m,'').replace(/^COMMIT;[ \t]*$/m,'');
});
writeFileSync(out,"-- REVIEW ONLY: additive Preview package; not executed automatically.\nBEGIN;\nSET LOCAL lock_timeout='5s';\nSET LOCAL statement_timeout='60s';\n"+guard+modules.join('\n')+'\nCOMMIT;\n',{flag:'wx',mode:0o600});
console.log('ADDITIVE_PREVIEW_SQL_PACKAGE_STAGED');
