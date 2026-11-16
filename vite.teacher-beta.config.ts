import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import {defineConfig} from 'vite';
import path from 'node:path';
import {mkdirSync,readFileSync,writeFileSync} from 'node:fs';
const root=import.meta.dirname;
const out=path.resolve(root,'teacher-beta-dist');
export default defineConfig({
 root:path.resolve(root,'teacher-beta'),envDir:root,base:'/teacher-beta/',
 plugins:[react(),tailwindcss(),{name:'teacher-beta-callback-pages',writeBundle(){
  const html=readFileSync(path.join(out,'index.html'),'utf8');
  for(const name of ['staff-workspace','admin']){mkdirSync(path.join(out,name),{recursive:true});writeFileSync(path.join(out,name,'index.html'),html);}
  writeFileSync(path.join(out,'404.html'),html);
 }}],
 build:{outDir:out,emptyOutDir:true},
});
