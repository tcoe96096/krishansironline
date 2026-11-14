/** Strictly allowlisted visual effects for the Website Studio editor and published pages.
 * Effects never modify navigation, clicks, test submissions, or form logic.
 */
export type StudioAnimation = 'none' | 'fade' | 'slide-up' | 'slide-left' | 'zoom' | 'pulse';
export type StudioFilter = 'none' | 'grayscale' | 'sepia' | 'vibrant' | 'contrast' | 'soft' | 'bright';
export type StudioHover = 'none' | 'lift' | 'scale' | 'glow';
export type StudioEffect = { animation: StudioAnimation; filter: StudioFilter; hover: StudioHover };

export const STUDIO_ANIMATIONS: { value: StudioAnimation; label: string }[] = [
  { value: 'none', label: 'No animation' },
  { value: 'fade', label: 'Fade In' },
  { value: 'slide-up', label: 'Slide Up' },
  { value: 'slide-left', label: 'Slide from Left' },
  { value: 'zoom', label: 'Zoom In' },
  { value: 'pulse', label: 'Soft Pulse' },
];
export const STUDIO_FILTERS: { value: StudioFilter; label: string }[] = [
  { value: 'none', label: 'Original' },
  { value: 'grayscale', label: 'Black & White' },
  { value: 'sepia', label: 'Vintage Sepia' },
  { value: 'vibrant', label: 'Vivid Colors' },
  { value: 'contrast', label: 'High Contrast' },
  { value: 'soft', label: 'Soft Blur' },
  { value: 'bright', label: 'Brighter' },
];
export const STUDIO_HOVERS: { value: StudioHover; label: string }[] = [
  { value: 'none', label: 'No hover effect' },
  { value: 'lift', label: 'Lift Card' },
  { value: 'scale', label: 'Gentle Zoom' },
  { value: 'glow', label: 'Accent Glow' },
];
export const DEFAULT_STUDIO_EFFECT: StudioEffect = { animation: 'none', filter: 'none', hover: 'none' };
export type StudioDesignPreset = 'clean' | 'rounded' | 'glass' | 'bold';
export const STUDIO_DESIGN_PRESETS: { value: StudioDesignPreset; label: string; hint: string }[] = [
  { value: 'clean', label: 'Clean', hint: 'Simple readable layout' },
  { value: 'rounded', label: 'Rounded', hint: 'Soft cards and comfortable spacing' },
  { value: 'glass', label: 'Glass', hint: 'Subtle transparency and glow' },
  { value: 'bold', label: 'Bold', hint: 'High-contrast, striking headings' },
];

const animations = new Set<StudioAnimation>(STUDIO_ANIMATIONS.map(item => item.value));
const filters = new Set<StudioFilter>(STUDIO_FILTERS.map(item => item.value));
const hovers = new Set<StudioHover>(STUDIO_HOVERS.map(item => item.value));

export function safeStudioEffect(value: Partial<StudioEffect> | null | undefined): StudioEffect {
  return {
    animation: value?.animation && animations.has(value.animation) ? value.animation : 'none',
    filter: value?.filter && filters.has(value.filter) ? value.filter : 'none',
    hover: value?.hover && hovers.has(value.hover) ? value.hover : 'none',
  };
}

const filterCSS: Record<StudioFilter, string> = {
  none: '', grayscale: 'grayscale(1)', sepia: 'sepia(.85)', vibrant: 'saturate(1.7)',
  contrast: 'contrast(1.35)', soft: 'blur(1.5px)', bright: 'brightness(1.25)',
};
const stylesheet = `
@keyframes studio-fade {from{opacity:0}to{opacity:1}}
@keyframes studio-rise {from{opacity:0;transform:translateY(22px)}to{opacity:1;transform:translateY(0)}}
@keyframes studio-left {from{opacity:0;transform:translateX(-24px)}to{opacity:1;transform:translateX(0)}}
@keyframes studio-zoom {from{opacity:0;transform:scale(.92)}to{opacity:1;transform:scale(1)}}
@keyframes studio-pulse {0%,100%{opacity:1}50%{opacity:.84}}
[data-studio-animation="fade"]{animation:studio-fade .65s ease-out both}
[data-studio-animation="slide-up"]{animation:studio-rise .65s ease-out both}
[data-studio-animation="slide-left"]{animation:studio-left .65s ease-out both}
[data-studio-animation="zoom"]{animation:studio-zoom .65s ease-out both}
[data-studio-animation="pulse"]{animation:studio-pulse 2.4s ease-in-out infinite}
[data-studio-hover]{transition:transform .2s ease,box-shadow .2s ease}
[data-studio-hover="lift"]:hover{transform:translateY(-5px);box-shadow:0 12px 24px #0f172a22}
[data-studio-hover="scale"]:hover{transform:scale(1.03)}
[data-studio-hover="glow"]:hover{box-shadow:0 0 0 3px #22d3ee88,0 8px 20px #0f172a22}
@media(prefers-reduced-motion:reduce){
  [data-studio-animation]{animation:none!important}
  [data-studio-hover]{transition:none!important}
  [data-studio-hover]:hover{transform:none!important}
}
`;

/** Stylesheet is inserted once per document. All CSS values are hardcoded. */
export function ensureStudioEffectsStyles(doc: Document): void {
  if (doc.querySelector('style[data-studio-effects]')) return;
  const style = doc.createElement('style');
  style.dataset.studioEffects = '1';
  style.textContent = stylesheet;
  doc.head.appendChild(style);
}

export function applyStudioEffects(element: HTMLElement, effects: Partial<StudioEffect> | null | undefined): void {
  const safe = safeStudioEffect(effects);
  if (safe.animation !== 'none') element.dataset.studioAnimation = safe.animation;
  else delete element.dataset.studioAnimation;
  if (safe.hover !== 'none') element.dataset.studioHover = safe.hover;
  else delete element.dataset.studioHover;
  element.style.filter = filterCSS[safe.filter];
}

/** Picks readable, accessible black/white text for a solid background color. */
export function contrastTextForHex(background: string): '#ffffff' | '#0f172a' {
  if (!/^#[a-f\d]{6}$/i.test(background)) return '#0f172a';
  const rgb = [1,3,5].map(pos => parseInt(background.slice(pos, pos + 2), 16) / 255);
  const luminance = rgb.map(c => c <= 0.04045 ? c / 12.92 : Math.pow((c + .055)/1.055, 2.4));
  return (luminance[0] * .2126 + luminance[1] * .7152 + luminance[2] * .0722) > .179 ? '#0f172a' : '#ffffff';
}
