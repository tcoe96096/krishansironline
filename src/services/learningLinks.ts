import type { PublishedTest } from './testService';

export const VALID_STUDY_CLASSES = ['6','7','8','9','10','11','12'] as const;
export const VALID_STUDY_SUBJECTS = ['Political Science','History','Geography','Economics'] as const;

/** Only allow catalogue-backed filters; do not trust arbitrary URL parameters as access rights. */
export function studyFiltersFromSearch(search: string): { classLevel?: string; subject?: string } {
  const params = new URLSearchParams(search);
  const classLevel = params.get('class') || '';
  const subject = params.get('subject') || '';
  return {
    ...(VALID_STUDY_CLASSES.some((c) => c === classLevel) ? { classLevel } : {}),
    ...(VALID_STUDY_SUBJECTS.some((s) => s === subject) ? { subject } : {}),
  };
}

export function studyMaterialUrl(baseUrl: string, test?: Pick<PublishedTest, 'class_level' | 'subject'> | null): string {
  const root = baseUrl.endsWith('/') ? baseUrl : baseUrl + '/';
  const url = root + 'study-materials/';
  if (!test) return url;
  const params = new URLSearchParams();
  if (VALID_STUDY_CLASSES.some((level) => level === test.class_level)) params.set('class',test.class_level);
  if (VALID_STUDY_SUBJECTS.some((subject) => subject === test.subject)) params.set('subject',test.subject);
  return params.size ? url + '?' + params.toString() : url;
}
