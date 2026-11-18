import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,writeFileSync,existsSync,rmSync,readFileSync,symlinkSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {spawnSync} from 'node:child_process';

const script=new URL('../scripts/assemble-teacher-unified-preview.mjs',import.meta.url);
function fixture(base='/krishansironline-preview-unified/teacher-beta/'){
 const root=mkdtempSync(join(tmpdir(),'ksol-teacher-preview-'));
 const site=join(root,'site'),beta=join(root,'beta');
 mkdirSync(site);mkdirSync(beta);
 mkdirSync(join(site,'admin'));
 writeFileSync(join(site,'index.html'),'original site');
 writeFileSync(join(site,'admin','index.html'),'original admin');
 for(const path of ['staff-workspace','registration','login','dashboard','admin'])mkdirSync(join(beta,path));
 const html='<html><script src="'+base+'assets/main.js"></script></html>';
 for(const path of ['index.html','staff-workspace/index.html','registration/index.html','login/index.html','dashboard/index.html','admin/index.html'])writeFileSync(join(beta,path),html);
 return {root,site,beta};
}
function run(site,beta){return spawnSync(process.execPath,[script.pathname,site,beta],{encoding:'utf8'});}
test('assembles teacher portal without modifying existing pages',()=>{
 const f=fixture();
 try{
  const r=run(f.site,f.beta);assert.equal(r.status,0,r.stderr);
  for (const page of ['registration','login','dashboard','staff-workspace','admin']) assert.ok(existsSync(join(f.site,'teacher-beta',page,'index.html')),page);
  assert.equal(readFileSync(join(f.site,'index.html'),'utf8'),'original site');
  assert.equal(readFileSync(join(f.site,'admin','index.html'),'utf8'),'original admin');
 }finally{rmSync(f.root,{recursive:true,force:true});}
});
test('refuses an existing teacher-beta destination',()=>{
 const f=fixture();
 try{
  mkdirSync(join(f.site,'teacher-beta'));
  const r=run(f.site,f.beta);assert.notEqual(r.status,0);
  assert.match(r.stderr,/Refusing to overwrite/);
 }finally{rmSync(f.root,{recursive:true,force:true});}
});
test('rejects wrong Pages base path',()=>{
 const f=fixture('/teacher-beta/');
 try{
  const r=run(f.site,f.beta);assert.notEqual(r.status,0);
  assert.match(r.stderr,/isolated GitHub Pages base path/);
  assert.ok(!existsSync(join(f.site,'teacher-beta')));
 }finally{rmSync(f.root,{recursive:true,force:true});}
});

test('rejects symlinks inside the isolated portal artifact',()=>{
 const f=fixture();
 try{
  symlinkSync(join(f.site,'index.html'),join(f.beta,'linked-page.html'));
  const r=run(f.site,f.beta);assert.notEqual(r.status,0);
  assert.match(r.stderr,/Symlink forbidden/);
  assert.ok(!existsSync(join(f.site,'teacher-beta')));
 }finally{rmSync(f.root,{recursive:true,force:true});}
});
test('refuses to combine overlapping source and destination directories',()=>{
 const f=fixture();
 try{
  const r=run(f.site,f.site);assert.notEqual(r.status,0);
  assert.match(r.stderr,/Build directories must be independent/);
 }finally{rmSync(f.root,{recursive:true,force:true});}
});
