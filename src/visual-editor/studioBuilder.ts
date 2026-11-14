export type StudioTemplate = 'blank' | 'landing' | 'course' | 'article';
export type StudioTheme = 'original' | 'ocean' | 'forest' | 'sunset' | 'slate';

export type StudioDraftPage = {
  id: string;
  slug: string;
  title: string;
  description: string;
  template: StudioTemplate;
  createdAt: string;
};

export const STUDIO_THEMES: Record<StudioTheme, { label: string; primary: string; accent: string; surface: string }> = {
  original: { label: 'Original Site', primary: '#0b3979', accent: '#0d9488', surface: '#ffffff' },
  ocean: { label: 'Ocean Blue', primary: '#155eaa', accent: '#0891b2', surface: '#eff8ff' },
  forest: { label: 'Forest Green', primary: '#166534', accent: '#65a30d', surface: '#f0fdf4' },
  sunset: { label: 'Sunset Coral', primary: '#9a3412', accent: '#ea580c', surface: '#fff7ed' },
  slate: { label: 'Modern Slate', primary: '#334155', accent: '#7c3aed', surface: '#f8fafc' },
};

export const STUDIO_TEMPLATES: { value: StudioTemplate; label: string }[] = [
  { value: 'blank', label: 'Blank Page' },
  { value: 'landing', label: 'Landing Page' },
  { value: 'course', label: 'Course / Lesson' },
  { value: 'article', label: 'Article / Notes' },
];

export function normalizeStudioSlug(text: string): string {
  return text.trim().toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '').slice(0, 48);
}

export function isStudioPage(value: unknown): value is StudioDraftPage {
  if (!value || typeof value !== 'object') return false;
  const page = value as Partial<StudioDraftPage>;
  return typeof page.id === 'string' && /^custom-[a-z0-9-]{3,48}$/.test(page.id)
    && typeof page.slug === 'string' && page.id === 'custom-' + page.slug
    && typeof page.title === 'string' && page.title.length <= 120
    && typeof page.description === 'string' && page.description.length <= 600
    && ['blank','landing','course','article'].includes(String(page.template));
}

export function parseStudioPages(value: unknown): StudioDraftPage[] {
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();
  return value.filter(isStudioPage).filter(page => {
    if (seen.has(page.id)) return false;
    seen.add(page.id);
    return true;
  }).slice(0, 30);
}

function escapeHtml(text: string): string {
  return text.replace(/[&<>"']/g, character => {
    if (character === '&') return '&amp;';
    if (character === '<') return '&lt;';
    if (character === '>') return '&gt;';
    if (character === '"') return '&quot;';
    return '&#39;';
  });
}

/** Generates a static same-origin srcDoc preview. This is NOT a public route. */
export function studioPagePreviewHtml(page: StudioDraftPage): string {
  const title = escapeHtml(page.title);
  const description = escapeHtml(page.description || 'Build this page using floating components.');
  const section = page.template === 'course'
    ? '<section><h2>Course overview</h2><p>Add lesson outlines, documents and video learning resources.</p></section>'
    : page.template === 'article'
      ? '<article><h2>Introduction</h2><p>Add notes, references, quotations and reading materials.</p></article>'
      : page.template === 'landing'
        ? '<section><h2>Explore the content</h2><p>Design hero sections, feature cards and calls to action.</p></section>'
        : '<section><h2>Start designing</h2><p>Choose Components to build your custom page.</p></section>';
  return '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">'
    + '<title>' + title + ' (Draft)</title><style>*,*:before,*:after{box-sizing:border-box}'
    + 'body{margin:0;font-family:system-ui,Arial,sans-serif;background:#f8fafc;color:#1e293b}'
    + 'header{background:#0b3979;color:white;padding:14px 7%;font-size:13px;font-weight:700}'
    + 'main{max-width:1120px;margin:0 auto;min-height:75vh;padding:55px 7%}'
    + 'h1{font-size:clamp(28px,5vw,48px);line-height:1.15;color:#0b3979;max-width:840px}'
    + 'h2{font-size:24px;color:#0b3979}p{font-size:16px;line-height:1.8;max-width:850px}'
    + 'section,article{background:white;border:1px solid #dbe4ee;border-radius:18px;padding:28px;margin-top:32px}'
    + '</style></head><body><header>KRISHAN SIR · NEW PAGE DRAFT</header><main>'
    + '<h1>' + title + '</h1><p>' + description + '</p>' + section
    + '</main><footer style="padding:20px 7%;color:#64748b">Preview draft · Not published</footer></body></html>';
}

export function safeStudioMediaUrl(value: string): string | null {
  try {
    const url = new URL(value.trim());
    if (url.protocol !== 'https:' || url.username || url.password) return null;
    return url.toString();
  } catch {
    return null;
  }
}

export function studioYouTubeEmbed(value: string): string | null {
  const safe = safeStudioMediaUrl(value);
  if (!safe) return null;
  const url = new URL(safe);
  const domain = url.hostname.toLowerCase();
  let id: string | null = null;
  if (domain === 'youtu.be') id = url.pathname.slice(1);
  if (['youtube.com','www.youtube.com','m.youtube.com'].includes(domain)) {
    id = url.pathname === '/watch' ? url.searchParams.get('v')
      : url.pathname.startsWith('/shorts/') || url.pathname.startsWith('/embed/') ? url.pathname.split('/')[2] : null;
  }
  if (!id || !/^[\w-]{11}$/.test(id)) return null;
  return 'https://www.youtube-nocookie.com/embed/' + id;
}
