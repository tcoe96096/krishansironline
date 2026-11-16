"""No network, SQL, credentials, deployment or real artifact access."""
import hashlib,importlib.util,json,subprocess,sys,tempfile,unittest
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
def module(name,file):
 spec=importlib.util.spec_from_file_location(name,ROOT/'scripts'/file);m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m);return m
recovery=module('recovery','verify-preview-logical-recovery.py')
class RecoveryGuardTests(unittest.TestCase):
 def test_exact_preview_connection_only(self):
  good=f'postgresql://postgres:test-only@db.{recovery.TARGET}.supabase.co:5432/postgres?sslmode=require'
  self.assertEqual(recovery.preview_connection(good)['PGHOST'],f'db.{recovery.TARGET}.supabase.co')
  self.assertIn('default_transaction_read_only=on',recovery.preview_connection(good)['PGOPTIONS'])
  self.assertNotIn('test-only',str({k:v for k,v in recovery.preview_connection(good).items() if k!='PGPASSWORD'}))
 def test_production_and_ambiguous_targets_are_rejected(self):
  for url in ['postgresql://postgres:x@db.production.supabase.co/postgres',f'postgresql://postgres:x@db.{recovery.TARGET}.supabase.co.evil.test/postgres',f'postgresql://postgres:x@db.{recovery.TARGET}.supabase.co/other',f'postgresql://postgres:x@db.{recovery.TARGET}.supabase.co/postgres?sslmode=disable','postgresql://postgres:x@localhost/postgres']:
   with self.assertRaises(ValueError):recovery.preview_connection(url)
 def test_transaction_pooler_is_not_a_backup_target(self):
  with self.assertRaises(ValueError):recovery.preview_connection(f'postgresql://postgres.{recovery.TARGET}:x@aws-0-ap-south-1.pooler.supabase.com:6543/postgres')
class ReleaseAssemblyTests(unittest.TestCase):
 def test_only_teacher_prefix_added_and_baseline_is_preserved(self):
  with tempfile.TemporaryDirectory() as temp:
   root=Path(temp);old=root/'baseline';beta=root/'beta';old.mkdir();beta.mkdir()
   (old/'index.html').write_text('approved existing website');(old/'student.html').write_text('unchanged student entry')
   (beta/'index.html').write_text('<script src="/teacher-beta/assets/app.js"></script>');(beta/'assets').mkdir();(beta/'assets/app.js').write_text('synthetic teacher app')
   script=str(ROOT/'scripts/assemble-teacher-beta-release.py')
   info=json.loads(subprocess.check_output([sys.executable,script,'--baseline-dir',str(old),'--inspect-baseline']))
   args=[sys.executable,script,'--baseline-dir',str(old),'--beta-dir',str(beta),'--out-dir',str(root/'release'),'--expected-baseline-sha256',info['baseline_sha256']]
   subprocess.run(args,check=True,stdout=subprocess.DEVNULL)
   self.assertEqual((root/'release/student.html').read_bytes(),(old/'student.html').read_bytes())
   self.assertTrue((root/'release/teacher-beta/index.html').is_file())
   self.assertEqual(json.loads((root/'release/teacher-beta/release-manifest.json').read_text())['launch_approval'],False)
   self.assertNotEqual(subprocess.run(args,stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL).returncode,0)
 def test_core_migration_preparation_has_no_optional_module_dependency(self):
  r=subprocess.run([sys.executable,str(ROOT/'scripts/prepare-teacher-basic-beta.py')],cwd=ROOT,capture_output=True,text=True,check=True)
  self.assertEqual(json.loads(r.stdout)['files'],5)
  request=json.loads((ROOT/'work/basic-beta-approval/preview-request_REVIEW_ONLY.json').read_text())
  self.assertEqual(request['project_id'],recovery.TARGET)
  self.assertNotIn('DROP POLICY',request['query'])
  self.assertNotIn('CREATE FUNCTION public.teacher_v2_result_summary',request['query'])
  self.assertNotIn('INSERT INTO storage.buckets',request['query'])
if __name__=='__main__':unittest.main()
