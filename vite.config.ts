import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { defineConfig } from 'vite';

const seoPages = [
  { slug: 'classes', title: 'Classes 6–12 | Krishan Sir', description: 'Explore class-wise learning resources and study support for Classes 6 to 12, aligned with HBSE and CBSE learning needs.' },
  { slug: 'online-tests', title: 'Online Tests & MCQ Practice | Krishan Sir', description: 'Attempt online tests and bilingual MCQ practice for school Social Science and related subjects.' },
  { slug: 'study-materials', title: 'Study Materials & Notes | Krishan Sir', description: 'Find chapter-wise study materials, notes and learning resources for Classes 6–12.' },
  { slug: 'results', title: 'Student Results Portal | Krishan Sir', description: 'Visit the student examination results portal. Verified result information will be published when an authorized source is connected.' },
  { slug: 'constitution', title: 'Indian Constitution Corner | Krishan Sir', description: 'Explore Indian Constitution concepts, Preamble terms, constitutional values and polity learning resources.' },
  { slug: 'current-affairs', title: 'Current Affairs & General Awareness | Krishan Sir', description: 'Read educational current affairs and general awareness updates for students and competitive exam learners.' },
  { slug: 'about', title: 'About Krishan Sir | Teacher Profile', description: 'Learn about Krishan Kumar, TGT Social Science, and the Krishan Sir Online Learning Portal.' },
  { slug: 'contact', title: 'Contact & Student Doubt Desk | Krishan Sir', description: 'Contact Krishan Sir and send an academic doubt or learning support request.' },
  { slug: 'admin', title: 'Admin Control Center | Krishan Sir', description: 'Restricted administration portal for authorized website administrators.' },
];

const generateSeoPages = () => ({
  name: 'generate-seo-friendly-pages',
  writeBundle() {
    const indexPath = path.resolve(__dirname, 'dist/index.html');
    if (!existsSync(indexPath)) return;
    const template = readFileSync(indexPath, 'utf8');
    for (const page of seoPages) {
      const canonical = `https://krishansir.online/${page.slug}/`;
      const html = template
        .replace(/<title>.*?<\/title>/, `<title>${page.title}</title>`)
        .replace(/<meta name="description" content=".*?" \/>/, `<meta name="description" content="${page.description}" />`)
        .replace(/<link rel="canonical" href=".*?" \/>/, `<link rel="canonical" href="${canonical}" />`)
        .replace(/<meta property="og:url" content=".*?" \/>/, `<meta property="og:url" content="${canonical}" />`)
        .replace(/<meta property="og:title" content=".*?" \/>/, `<meta property="og:title" content="${page.title}" />`)
        .replace(/<meta property="og:description" content=".*?" \/>/, `<meta property="og:description" content="${page.description}" />`);
      if (page.slug === 'admin') html = html.replace('</head>', '  <meta name="robots" content="noindex, nofollow" />\\n</head>');
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
