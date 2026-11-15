import type { ResultReportTheme, ResultReportOptions } from '../components/SmartResultReportCard';

/**
 * KSOL Design-only backup format. Never persist student, attempt, marks,
 * answer keys, access tokens, email addresses or any other private results.
 * Browser-only save is not a published template and grants no permissions.
 */
export type ReportCardTemplateBackup = {
  schema: 'ksol.result-card.design';
  version: 1;
  theme: ResultReportTheme;
  options: ResultReportOptions;
};

export const defaultReportCardTemplate: ReportCardTemplateBackup = {
  schema: 'ksol.result-card.design',
  version: 1,
  theme: 'modern',
  options: {
    showInstitution: true, showMetrics: true, showSubjectTable: true,
    showLogo: true, showPortrait: true, watermarkOpacity: 8,
    brandTitle: 'KRISHAN SIR ONLINE LEARNING',
    tagline: 'STUDY • LEARN • PRACTICE • ACHIEVE',
    footerNote: ''
  }
};

const allowedKeys = new Set([
  'showInstitution', 'showMetrics', 'footerNote', 'brandTitle', 'tagline',
  'showLogo', 'showPortrait', 'watermarkOpacity', 'showSubjectTable',
  'logoImage', 'portraitImage'
]);

const ownRecord = (value: unknown): Record<string,unknown> => {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw new Error('Report design must be a JSON object.');
  return value as Record<string,unknown>;
};
const maxImageLength = 3200000;
const safeText = (value: unknown, max: number, label: string): string => {
  if (typeof value !== 'string' || value.length > max)
    throw new Error(label + ' must be text under ' + max + ' characters.');
  return value;
};
const safeImage = (value: unknown, label: string): string => {
  if (typeof value !== 'string' || value.length > maxImageLength ||
      !/^data:image\/(?:png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(value))
    throw new Error(label + ' must be a safe PNG, JPG or WEBP image.');
  return value;
};

export function normalizeReportCardTemplate(input: unknown): ReportCardTemplateBackup {
  const object = ownRecord(input);
  if (object.schema !== 'ksol.result-card.design' || object.version !== 1)
    throw new Error('Unsupported report card backup format or version.');
  if (object.theme !== 'modern' && object.theme !== 'classic' && object.theme !== 'minimal')
    throw new Error('Unknown report card theme.');
  if (Object.keys(object).some((key) => !['schema','version','theme','options'].includes(key)))
    throw new Error('The backup contains fields unrelated to report card design.');
  const options = ownRecord(object.options);
  if (Object.keys(options).some((key) => !allowedKeys.has(key)))
    throw new Error('The backup contains unsupported design options.');

  const clean: ResultReportOptions = {};
  for (const key of ['showInstitution','showMetrics','showLogo','showPortrait','showSubjectTable'] as const) {
    if (options[key] !== undefined) {
      if (typeof options[key] !== 'boolean') throw new Error(key+' must be a boolean.');
      clean[key] = options[key];
    }
  }
  for (const [key,max] of [['brandTitle',80],['tagline',110],['footerNote',180]] as const) {
    if (options[key] !== undefined) clean[key] = safeText(options[key],max,key);
  }
  if (options.watermarkOpacity !== undefined) {
    const value = options.watermarkOpacity;
    if (typeof value !== 'number' || !Number.isFinite(value) || value < 0 || value > 18)
      throw new Error('Watermark opacity must be between 0 and 18%.');
    clean.watermarkOpacity = value;
  }
  for (const key of ['logoImage','portraitImage'] as const) {
    if (options[key] !== undefined) clean[key] = safeImage(options[key],key);
  }
  return {schema:'ksol.result-card.design',version:1,theme:object.theme,options:clean};
}

export function serializeReportCardTemplate(theme: ResultReportTheme, options: ResultReportOptions): string {
  return JSON.stringify(
    normalizeReportCardTemplate({schema:'ksol.result-card.design',version:1,theme,options}),null,2
  );
}

export function parseReportCardTemplate(json: string): ReportCardTemplateBackup {
  if (typeof json !== 'string' || json.length > 6500000)
    throw new Error('Design file is too large.');
  let parsed: unknown;
  try { parsed = JSON.parse(json); }
  catch { throw new Error('The selected file is not valid JSON.'); }
  return normalizeReportCardTemplate(parsed);
}

/** Local draft is scoped to a verified admin's account ID on this device. */
export function localReportDraftKey(userId: string): string {
  if (!/^[0-9a-f]{8}-[0-9a-f-]{27}$/i.test(userId))
    throw new Error('A valid signed-in account is required.');
  return 'ksol.report-card-template.draft.v2.' + userId.toLowerCase();
}
