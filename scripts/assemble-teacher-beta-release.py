"""Local artifact assembly ONLY; never uploads/deploys. Preserves the approved site.
Use an owner-approved existing Production artifact as baseline, not PR #109's full build.
"""
import argparse,hashlib,json,shutil
from pathlib import Path

def inventory(root):
    result={}
    for path in sorted(root.rglob('*')):
        if path.is_symlink():raise ValueError('Symlinks are not allowed in a public release artifact')
        if path.is_file():
            if path.name.startswith('.env') or '.git' in path.parts:raise ValueError('Source/secret files are not public artifacts')
            result[path.relative_to(root).as_posix()]=hashlib.sha256(path.read_bytes()).hexdigest()
    return result

def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--baseline-dir',required=True);parser.add_argument('--beta-dir',default='teacher-beta-dist')
    parser.add_argument('--expected-baseline-sha256');parser.add_argument('--out-dir');parser.add_argument('--inspect-baseline',action='store_true')
    args=parser.parse_args();baseline=Path(args.baseline_dir).resolve();beta=Path(args.beta_dir).resolve()
    old=inventory(baseline);fingerprint=hashlib.sha256(json.dumps(old,sort_keys=True,separators=(',',':')).encode()).hexdigest()
    if args.inspect_baseline:print(json.dumps({'baseline_sha256':fingerprint,'files':len(old)}));return
    if not args.out_dir or args.expected_baseline_sha256!=fingerprint:raise ValueError('Owner-approved baseline fingerprint required')
    if not (baseline/'index.html').is_file() or (baseline/'teacher-beta').exists():raise ValueError('Expected existing site without Teacher Beta')
    if not (beta/'index.html').is_file() or '/teacher-beta/assets/' not in (beta/'index.html').read_text():raise ValueError('Teacher-only artifact/base path missing')
    new=inventory(beta);out=Path(args.out_dir).resolve()
    if out.exists() or out in baseline.parents or baseline in out.parents or out in beta.parents or beta in out.parents:raise ValueError('Output must be a fresh directory outside inputs')
    shutil.copytree(baseline,out);shutil.copytree(beta,out/'teacher-beta')
    assembled=inventory(out)
    if any(assembled.get(path)!=digest for path,digest in old.items()):raise ValueError('Baseline site content changed')
    if any(path not in old and not path.startswith('teacher-beta/') for path in assembled):raise ValueError('Unexpected release path')
    manifest={'status':'ASSEMBLED_ONLY_NOT_DEPLOYED','baseline_sha256':fingerprint,'baseline_files_unchanged':len(old),'teacher_beta_files':len(new),'teacher_beta_inventory':new,'launch_approval':False}
    (out/'teacher-beta/release-manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')
    print(json.dumps({'status':manifest['status'],'baseline_files_unchanged':len(old),'teacher_beta_files':len(new)}))
if __name__=='__main__':main()
