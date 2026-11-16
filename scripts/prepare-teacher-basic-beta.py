"""PREPARATION ONLY: emits a Preview-only migration request; never executes SQL.
No Production target, credentials, API calls, deployment or storage activation.
"""
from pathlib import Path
import hashlib,json,re
ROOT=Path(__file__).resolve().parents[1]
TARGET='zgpkmfqioqvincmgyfpi'
ORDER=['schema','beta_flags','profile_rpc','functions','lifecycle']
files=[];parts=[]
for name in ORDER:
    p=ROOT/f'docs/proposed-migrations/teacher_management_v2_{name}_REVIEW_ONLY.sql'
    source=p.read_text();files.append({'file':str(p.relative_to(ROOT)),'sha256':hashlib.sha256(p.read_bytes()).hexdigest()})
    parts.append(re.sub(r'(?m)^BEGIN;\s*$|^COMMIT;\s*$','',source))
preflight="""DO $core_preflight$ BEGIN
 IF to_regclass('public.user_roles') IS NULL OR to_regprocedure('public.is_super_admin()') IS NULL OR to_regprocedure('auth.uid()') IS NULL THEN
  RAISE EXCEPTION 'Required existing Auth/role foundation missing; stop'; END IF;
 IF to_regclass('public.teacher_profiles') IS NOT NULL OR to_regclass('private.teacher_beta_features') IS NOT NULL THEN
  RAISE EXCEPTION 'Existing v2 schema requires reviewed upgrade; stop'; END IF;
END $core_preflight$;
"""
query="SET LOCAL lock_timeout='5s';\nSET LOCAL statement_timeout='60s';\n"+preflight+'\n\n'.join(parts)
if 'storage.buckets' in query or 'CREATE FUNCTION public.teacher_v2_result_summary' in query:raise SystemExit('Forbidden minimal launch module')
out=ROOT/'work/basic-beta-approval';out.mkdir(parents=True,exist_ok=True)
manifest={'project_id':TARGET,'expected_project_name':'krishan-sir-lms-preview','status':'REVIEW_ONLY_HOLD','execute':False,'files':files,'query_sha256':hashlib.sha256(query.encode()).hexdigest(),'advanced_features':'all false','production_target_supported':False}
(out/'manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')
(out/'preview-request_REVIEW_ONLY.json').write_text(json.dumps({'project_id':TARGET,'name':'preview_teacher_management_v2_basic_beta','query':query},indent=2)+'\n')
print(json.dumps({'status':'PREPARED_ONLY_NOT_EXECUTED','target':TARGET,'files':len(files),'query_sha256':manifest['query_sha256']}))
review=ROOT/'docs/reviews';review.mkdir(exist_ok=True)
(review/'teacher-v2-core-beta-migration_REVIEW_ONLY.sql').write_text('-- REVIEW ONLY. NOT EXECUTED. Same core DDL for an independently approved target.\n-- No Production target is selected; owner approval and essential tests are required.\nBEGIN;\n'+query+'\nCOMMIT;\n')
(review/'teacher-v2-core-beta-manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')
