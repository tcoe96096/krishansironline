/** Extract only explicitly labelled test settings from user-provided document text.
 * Never treats missing settings as reliable. Caller can apply its own safe defaults.
 */
export type TestDocumentMetadata = {
  title?: string;
  classLevel?: string;
  subject?: string;
  chapter?: string;
  durationMinutes?: number;
  attemptLimit?: number;
  marksPerQuestion?: number;
  warnings: string[];
};
const MAX_HEADER_LINES = 100;

const labels = {
  title: /^(?:test\s*title|paper\s*title|title|शीर्षक|परीक्षा\s*नाम|टेस्ट\s*का\s*नाम)\s*[:：\-]\s*(.+)$/i,
  classLevel: /^(?:class|grade|कक्षा)\s*[:：\-]?\s*(.+)$/i,
  subject: /^(?:subject|विषय)\s*[:：\-]\s*(.+)$/i,
  chapter: /^(?:chapter|unit|अध्याय|इकाई)\s*[:：\-]\s*(.+)$/i,
  duration: /^(?:duration|time\s*limit|time\s*allowed|time|समय|अवधि|समय\s*सीमा)\s*[:：\-]\s*(.+)$/i,
  attemptLimit: /^(?:attempt\s*limit|max(?:imum)?\s*attempts|प्रयास\s*सीमा|अधिकतम\s*प्रयास)\s*[:：\-]\s*(.+)$/i,
  marksPerQuestion: /^(?:marks?\s*per\s*question|marks?\s*each|per\s*question\s*marks|प्रति\s*प्रश्न\s*अंक|प्रत्येक\s*प्रश्न\s*के\s*अंक)\s*[:：\-]\s*(.+)$/i,
  totalMarks: /^(?:total\s*marks?|maximum\s*marks?|पूर्णांक|कुल\s*अंक)\s*[:：\-]\s*(.+)$/i,
  questionCount: /^(?:total\s*questions?|number\s*of\s*questions?|कुल\s*प्रश्न|प्रश्नों\s*की\s*संख्या)\s*[:：\-]\s*(.+)$/i,
};

function findLabel(lines: string[], pattern: RegExp): string | undefined {
  for (const line of lines) {
    const matched = line.match(pattern);
    if (matched && matched[1].trim()) return matched[1].trim().slice(0, 250);
  }
  return undefined;
}
function parsePositiveInteger(s: string, max: number): number | undefined {
  const match = s.trim().match(/^(\d{1,4})(?:\s*(?:times?|attempts?|प्रयास))?$/i);
  if (!match) return undefined;
  const n = Number(match[1]);
  return n >= 1 && n <= max ? n : undefined;
}
function durationMinutes(s: string): number | undefined {
  const value = s.toLowerCase().trim();
  const hours = value.match(/(\d+(?:\.\d+)?)\s*(?:hours?|hrs?|घंटा|घंटे)/i);
  const minutes = value.match(/(\d+(?:\.\d+)?)\s*(?:minutes?|mins?|min|मिनट)/i);
  let result: number | undefined;
  if (hours || minutes) {
    result = (hours ? Number(hours[1]) * 60 : 0) + (minutes ? Number(minutes[1]) : 0);
  } else if (/^\d{1,3}$/.test(value)) {
    result = Number(value); // A labelled bare integer means minutes.
  }
  return result !== undefined && Number.isInteger(result) && result >= 1 && result <= 600 ? result : undefined;
}
function parseMarks(s: string): number | undefined {
  const value = s.trim().match(/^(\d+(?:\.\d{1,2})?)(?:\s*(?:marks?|अंक))?$/i);
  if (!value) return undefined;
  const result = Number(value[1]);
  return result >= 0.25 && result <= 100 && Number.isInteger(result * 4) ? result : undefined;
}

export function parseTestDocumentMetadata(
  text: string,
  filename: string,
  parsedQuestionCount: number,
): TestDocumentMetadata {
  const lines = text.replace(/\r\n?/g, '\n').split('\n')
    .map(line => line.trim()).filter(Boolean).slice(0, MAX_HEADER_LINES);
  const warnings: string[] = [];
  const title = findLabel(lines, labels.title) ||
    filename.replace(/\.(pdf|docx)$/i, '').replace(/[_-]+/g, ' ').trim().slice(0, 250) ||
    undefined;
  const classRaw = findLabel(lines, labels.classLevel);
  const classFound = classRaw?.match(/(?:^|[^\d])(6|7|8|9|10|11|12)(?:$|[^\d])/);
  if (classRaw && !classFound) warnings.push('Class / कक्षा: unsupported class; please review');
  const durationRaw = findLabel(lines, labels.duration);
  const duration = durationRaw ? durationMinutes(durationRaw) : undefined;
  if (durationRaw && duration === undefined) warnings.push('Time / समय: duration needs manual review');
  const attemptsRaw = findLabel(lines, labels.attemptLimit);
  const attempts = attemptsRaw ? parsePositiveInteger(attemptsRaw, 20) : undefined;
  if (attemptsRaw && attempts === undefined) warnings.push('Attempt limit: value needs manual review');
  const marksRaw = findLabel(lines, labels.marksPerQuestion);
  const marks = marksRaw ? parseMarks(marksRaw) : undefined;
  if (marksRaw && marks === undefined) warnings.push('Marks per question: value needs manual review');
  const totalMarksRaw = findLabel(lines, labels.totalMarks);
  if (totalMarksRaw && marks === undefined) warnings.push('Total marks shown without marks per question; verify marks manually');
  const countRaw = findLabel(lines, labels.questionCount);
  if (countRaw) {
    const count = parsePositiveInteger(countRaw, 1000);
    if (count === undefined) warnings.push('Total questions: unclear count');
    else if (count !== parsedQuestionCount) {
      warnings.push('Document says ' + count + ' questions; parser found ' + parsedQuestionCount + '. Review missing questions');
    }
  }
  return {
    title,
    classLevel: classFound?.[1],
    subject: findLabel(lines, labels.subject),
    chapter: findLabel(lines, labels.chapter),
    durationMinutes: duration,
    attemptLimit: attempts,
    marksPerQuestion: marks,
    warnings,
  };
}
