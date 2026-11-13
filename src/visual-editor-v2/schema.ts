export type VisualEditorV2PageId = 'home' | 'classes' | 'exams' | 'materials' | 'constitution' | 'current-affairs' | 'about' | 'contact';
export type VisualEditorV2Style = {
  color: string;
  backgroundColor: string;
  fontSize: number;
  fontWeight: '400' | '500' | '600' | '700' | '800';
  textAlign: 'left' | 'center' | 'right';
  marginTop: number;
  marginBottom: number;
  padding: number;
  borderRadius: number;
};
export type VisualEditorV2Override = { selector: string; text: string; style: VisualEditorV2Style };
export type VisualEditorV2Draft = { schemaVersion: 2; pages: Partial<Record<VisualEditorV2PageId, Record<string, VisualEditorV2Override>>> };
export const DEFAULT_V2_STYLE: VisualEditorV2Style = {
  color: '#18263b', backgroundColor: '#ffffff', fontSize: 16, fontWeight: '400',
  textAlign: 'left', marginTop: 0, marginBottom: 0, padding: 0, borderRadius: 0,
};
const HEX = /^#[0-9a-f]{6}$/i;
export function isSafeV2Selector(value: unknown): value is string {
  if (typeof value !== 'string' || value.length > 500) return false;
  const parts = value.split(' > ');
  return parts[0] === 'body' && parts.length > 1 && parts.slice(1).every(part => /^[a-z][a-z0-9-]*:nth-of-type\([1-9]\d*\)$/i.test(part));
}
export function validateV2Override(value: unknown): value is VisualEditorV2Override {
  if (!value || typeof value !== 'object') return false;
  const item = value as Partial<VisualEditorV2Override>;
  const style = item.style;
  if (!isSafeV2Selector(item.selector) || typeof item.text !== 'string' || item.text.length > 2000 || !style) return false;
  return HEX.test(style.color) && HEX.test(style.backgroundColor)
    && Number.isFinite(style.fontSize) && style.fontSize >= 8 && style.fontSize <= 48
    && ['400','500','600','700','800'].includes(style.fontWeight)
    && ['left','center','right'].includes(style.textAlign)
    && [style.marginTop, style.marginBottom].every(n => Number.isFinite(n) && n >= 0 && n <= 80)
    && Number.isFinite(style.padding) && style.padding >= 0 && style.padding <= 40
    && Number.isFinite(style.borderRadius) && style.borderRadius >= 0 && style.borderRadius <= 32;
}
