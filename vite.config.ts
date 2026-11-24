import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { defineConfig } from 'vite';

import { publicInfoPages } from './src/data/publicInfo';

const seoPages = [
  ...publicInfoPages.map(p=>({slug:p.slug,title:p.title.en.replace(/&/g,'&amp;')+' | Krishan Sir',description:'Public information and learning support from Krishan Sir Online Learning.'})),
  { slug: 'student-dashboard', title: 'Student Dashboard | Krishan Sir', description: 'Student account and dashboard access.' },
  { slug: 'classes', title: 'Classes 6–12 | Krishan Sir', description: 'Explore class-wise learning resources and study support for Classes 6 to 12, aligned with HBSE and CBSE learning needs.' },
  { slug: 'all-exams', title: 'All Competitive Exams & Preparation | Krishan Sir', description: 'Explore exam-wise preparation pathways and learning resources for UGC NET, HTET, CTET, UPSC, HPSC and teacher recruitment.' },
  { slug: 'online-tests', title: 'Online Tests & MCQ Practice | Krishan Sir', description: 'Attempt online tests and bilingual MCQ practice for school Social Science and related subjects.' },
  { slug: 'study-materials', title: 'Study Materials & Notes | Krishan Sir', description: 'Find chapter-wise study materials, notes and learning resources for Classes 6–12.' },
  { slug: 'results', title: 'Student Results Portal | Krishan Sir', description: 'Visit the student examination results portal. Verified result information will be published when an authorized source is connected.' },
  { slug: 'constitution', title: 'Indian Constitution Corner | Krishan Sir', description: 'Explore Indian Constitution concepts, Preamble terms, constitutional values and polity learning resources.' },
  { slug: 'current-affairs', title: 'Current Affairs & General Awareness | Krishan Sir', description: 'Read educational current affairs and general awareness updates for students and competitive exam learners.' },
  { slug: 'about', title: 'About Krishan Sir | Teacher Profile', description: 'Learn about Krishan Kumar, TGT Social Science, and the Krishan Sir Online Learning Portal.' },
  { slug: 'contact', title: 'Contact & Student Doubt Desk | Krishan Sir', description: 'Contact Krishan Sir and send an academic doubt or learning support request.' },
  { slug: 'teacher', title: 'Teacher Management | Krishan Sir', description: 'Teacher registration, secure login and dashboard inside Krishan Sir Online Learning.' },
  { slug: 'teacher-registration', title: 'Teacher Registration | Krishan Sir', description: 'Teacher registration with qualifications and class/subject requests, subject to activation and approval.' },
  { slug: 'teacher-login', title: 'Teacher Login | Krishan Sir', description: 'Secure teacher login on Krishan Sir Online Learning.' },
  { slug: 'teacher-dashboard', title: 'Teacher Dashboard | Krishan Sir', description: 'Private teacher profile, approval status and class/subject assignments.' },
  { slug: 'admin', title: 'Admin Control Center | Krishan Sir', description: 'Restricted administration portal for authorized website administrators.' },
];

const generateSeoPages = () => ({
  name: 'generate-seo-friendly-pages',
  writeBundle() {
    const indexPath = path.resolve(__dirname, 'dist/index.html');
    if (!existsSync(indexPath)) return;
    const template = readFileSync(indexPath, 'utf8');
    // Keep the original OAuth consent-screen URLs working and aligned with the new policy text.
    const escapeHtml = (value: string) => value.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
    for (const [id, filename] of [['privacy','privacy-policy.html'],['terms','terms-of-service.html']] as const) {
      const info = publicInfoPages.find(p=>p.id===id);
      if (!info) throw new Error('Missing legacy policy: '+id);
      const body = (['en','hi'] as const).map(lang=>'<section lang="'+lang+'"><h1>'+escapeHtml(info.title[lang])+'</h1>'+info.sections.map(s=>'<h2>'+escapeHtml(s.title[lang])+'</h2><p>'+escapeHtml(s.text[lang])+'</p>').join('')+'</section>').join('<hr>');
      const html = '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>'+escapeHtml(info.title.en)+' | Krishan Sir Online</title><link rel="canonical" href="https://krishansir.online/'+info.slug+'/"><style>body{font-family:system-ui,sans-serif;line-height:1.7;margin:0;background:#f8fafc;color:#172033}main{max-width:850px;margin:auto;padding:24px}a{color:#075985}h2{font-size:1.2rem}p{overflow-wrap:anywhere}</style></head><body><main><nav><a href="/">Home</a> · <a href="/'+info.slug+'/">Interactive bilingual policy</a> · <a href="/ksol-encrypted-backup.html">Encrypted Backup</a></nav><p>Version 1.0 · Updated 2026-11-24</p>'+body+'<p>Contact: <a href="mailto:krishansir.online@gmail.com">krishansir.online@gmail.com</a></p></main></body></html>';
      writeFileSync(path.resolve(__dirname,'dist',filename),html);
    }
    for (const page of seoPages) {
      const canonical = `https://krishansir.online/${page.slug}/`;
      let html = template
        .replace(/<title>.*?<\/title>/, `<title>${page.title}</title>`)
        .replace(/<meta name="description" content=".*?" \/>/, `<meta name="description" content="${page.description}" />`)
        .replace(/<link rel="canonical" href=".*?" \/>/, `<link rel="canonical" href="${canonical}" />`)
        .replace(/<meta property="og:url" content=".*?" \/>/, `<meta property="og:url" content="${canonical}" />`)
        .replace(/<meta property="og:title" content=".*?" \/>/, `<meta property="og:title" content="${page.title}" />`)
        .replace(/<meta property="og:description" content=".*?" \/>/, `<meta property="og:description" content="${page.description}" />`);
      if (['admin', 'teacher-login', 'teacher-dashboard', 'teacher-registration'].includes(page.slug) || page.slug === 'student-dashboard') html = html.replace('</head>', '  <meta name="robots" content="noindex, nofollow" />\n</head>');
      const directory = path.resolve(__dirname, 'dist', page.slug);
      mkdirSync(directory, { recursive: true });
      writeFileSync(path.join(directory, 'index.html'), html);
    }
  },
});

export default defineConfig(() => ({
  plugins: [react(), tailwindcss(), generateSeoPages()],
  resolve: { alias: { '@': path.resolve(__dirname, '.') } },
  server: {
    // HMR is disabled in AI Studio via DISABLE_HMR env VAR.
    // Do not modify—file watching is disabled to prevent flickering during agent edits.
    hmr: process.env.DISABLE_HMR !== 'true',
    watch: process.env.DISABLE_HMR === 'true' ? null : {},
  },
}));
