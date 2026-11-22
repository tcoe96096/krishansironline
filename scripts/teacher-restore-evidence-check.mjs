#!/usr/bin/env node
/**
 * OFFLINE, READ-ONLY evidence-package consistency checker.
 *
 * This never runs pg_restore, SQL, Supabase, HTTP, or a deployment. It NEVER
 * approves Preview/Production changes, even for a structurally valid package.
 * Evidence can be fabricated; independent recovery review is mandatory.
 */
import {createHash} from 'node:crypto';
import {createReadStream,existsSync,lstatSync,realpathSync,statSync,readFileSync} from 'node:fs';
import {dirname,isAbsolute,join,relative,resolve,sep} from 'node:path';

export const PREVIEW_PROJECT_ID='zgpkmfqioqvincmgyfpi';
export const PRODUCTION_PROJECT_ID='vsqwlkqqsxcehvdsdbna';
export const REQUIRED_FILES=[
 'backup_archive','restore_log','source_inventory',
 'restored_inventory','reconciliation_report','smoke_report'
];
export const REQUIRED_CHECKS=[
 'schema','tables','row_counts','constraints','indexes','functions',
 'triggers','rls_policies','effective_grants','auth_dependencies',
 'storage_metadata','smoke_read','smoke_write_rollback'
];
const SHA256=/^[a-f0-9]{64}$/;
const ISO_UTC=/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z$/;
const BAD_FIELD=/(?:password|secret|token|credential|private.key|connection.string)/i;

const object=x=>x!==null&&typeof x==='object'&&!Array.isArray(x);
const validTime=x=>typeof x==='string'&&ISO_UTC.test(x)&&Number.isFinite(Date.parse(x));
function hasSensitiveKeys(value){
 if(Array.isArray(value))return value.some(hasSensitiveKeys);
 if(!object(value))return false;
 return Object.entries(value).some(([k,v])=>BAD_FIELD.test(k)||hasSensitiveKeys(v));
}
function fileUnderRoot(root,rel){
 if(typeof rel!=='string'||rel.length>240||isAbsolute(rel)||rel.includes('\\')||
   !/^[\w./-]+$/.test(rel)||rel.split('/').some(s=>s===''||s==='.'||s==='..'))
   throw new Error('Unsafe or invalid evidence file path');
 const filepath=join(root,rel);
 if(!existsSync(filepath)||lstatSync(filepath).isSymbolicLink())throw new Error('Missing evidence file or symlink');
 const actual=realpathSync(filepath);
 const difference=relative(root,actual);
 if(difference.startsWith('..'+sep)||difference==='..'||isAbsolute(difference))
   throw new Error('Evidence file is outside the package');
 if(!statSync(actual).isFile())throw new Error('Evidence file must be regular');
 return actual;
}
async function hashFile(path){
 const hash=createHash('sha256');
 for await (const chunk of createReadStream(path))hash.update(chunk);
 return hash.digest('hex');
}
function requiredString(o,k){
 if(typeof o?.[k]!=='string'||o[k].trim()===''||o[k].length>200)
  throw new Error('Missing or invalid '+k);
 return o[k];
}
export async function checkRestoreEvidence(manifestFile){
 const errors=[];
 let root,manifest;
 try{
  const absolute=resolve(manifestFile);
  root=realpathSync(dirname(absolute));
  if(!existsSync(absolute)||lstatSync(absolute).isSymbolicLink())
   throw new Error('Evidence manifest missing or symlink');
  manifest=JSON.parse(readFileSync(absolute,'utf8'));
  if(!object(manifest)||hasSensitiveKeys(manifest))
   throw new Error('Invalid manifest or sensitive field names');
 }catch{
  return {structurallyComplete:false,releaseGate:'NO_GO',status:'INVALID_EVIDENCE',errors:['Evidence manifest cannot be safely read']};
 }
 const requireGate=(condition,message)=>{if(!condition)errors.push(message);};
 requireGate(manifest.schema_version===1,'Schema version must be 1');
 const source=manifest.source,restore=manifest.restore;
 requireGate(object(source),'Missing source backup identity');
 requireGate(object(restore),'Missing disposable restore identity');
 if(object(source)){
  requireGate(source.project_id===PREVIEW_PROJECT_ID,'Source must be exact Preview project');
  requireGate(validTime(source.backup_created_at),'Backup creation time must be UTC ISO 8601');
  requireGate(typeof source.pg_dump_version==='string'&&source.pg_dump_version.length>=3,
   'Backup pg_dump version required');
 }
 if(object(restore)){
  requireGate(restore.target_environment==='disposable','Restore target must be disposable');
  requireGate(typeof restore.target_id==='string'&&restore.target_id.length>=8&&
    ![PREVIEW_PROJECT_ID,PRODUCTION_PROJECT_ID].includes(restore.target_id),
    'Restore target must differ from both real Supabase projects');
  requireGate(validTime(restore.started_at)&&validTime(restore.finished_at)&&
    Date.parse(restore.finished_at)>Date.parse(restore.started_at)&&
    Date.parse(restore.started_at)>=Date.parse(source?.backup_created_at),
    'Restore timestamps must be chronological UTC');
  requireGate(restore.exit_code===0,'Restore must have confirmed zero exit status');
  requireGate(restore.run_result==='completed','Restore must be marked completed');
  requireGate(typeof restore.pg_restore_version==='string'&&restore.pg_restore_version.length>=3,
    'Restore pg_restore version required');
 }
 const files=manifest.files;
 if(!object(files))errors.push('Missing evidence files');
 else{
  const seen=new Set();
  for(const kind of REQUIRED_FILES){
   const info=files[kind];
   if(!object(info)){errors.push('Missing '+kind+' file evidence');continue;}
   if(!SHA256.test(info.sha256)||!Number.isSafeInteger(info.bytes)||info.bytes<1){
    errors.push('Invalid digest or size for '+kind);continue;
   }
   try{
    const location=fileUnderRoot(root,info.path);
    if(seen.has(location)){errors.push('Duplicate evidence artifact');continue;}
    seen.add(location);
    const actualSize=statSync(location).size;
    if(actualSize!==info.bytes||await hashFile(location)!==info.sha256){
     errors.push('File size/digest mismatch for '+kind);
    }
   }catch{errors.push('Missing or unsafe file for '+kind);}
  }
 }
 const checks=manifest.reconciliation;
 if(!object(checks))errors.push('Missing reconciliation confirmations');
 else for(const check of REQUIRED_CHECKS)
  requireGate(checks[check]===true,'Missing passing reconciliation: '+check);
 // A JSON manifest alone cannot prove recovery, and a proof of restore alone
 // cannot prove that live Preview's present state was captured.
 requireGate(manifest.source_matches_current_preview===true,
   'Current Preview/source freshness must be independently reconciled');
 requireGate(manifest.evidence_only===true,
   'Manifest must explicitly state that this is evidence only, not approval');
 requireGate(manifest.release_authorized===undefined,
   'Release authorization cannot be declared by a restore package');
 return {
  structurallyComplete:errors.length===0,
  releaseGate:'NO_GO',
  status:errors.length===0?'STRUCTURALLY_CONSISTENT_NOT_VERIFIED':'INVALID_EVIDENCE',
  errors
 };
}
if(process.argv[1]&&resolve(process.argv[1])===resolve(new URL(import.meta.url).pathname)){
 const manifestPath=process.argv[2];
 if(!manifestPath){process.stderr.write('Usage: node scripts/teacher-restore-evidence-check.mjs /path/to/manifest.json\n');process.exitCode=2;}
 else{
  const result=await checkRestoreEvidence(manifestPath);
  process.stdout.write(JSON.stringify(result,null,2)+'\n');
  if(!result.structurallyComplete)process.exitCode=1;
 }
}
