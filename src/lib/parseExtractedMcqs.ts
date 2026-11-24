/** Parses extracted plain text from PDF/DOCX into reviewable MCQ candidates.
 * This does not infer correct answers or translate text. All output is untrusted.
 */
export type ImportedMcq = {
  question: string;
  options: [string, string, string, string];
  answerIndex: number | null;
};
export type ParseResult = { questions: ImportedMcq[]; warnings: string[] };
const questionStart = /^(?:Q(?:uestion)?\s*)?(\d{1,4})\s*[.)\-:]\s*(.+)$/i;
const optionStart = /^\(?([A-Da-d])\)?\s*[.)\-:]\s*(.+)$/;
const answerLine = /^(?:answer|correct answer|उत्तर|सही उत्तर)\s*[:\-]\s*\(?([A-Da-d])\)?\s*$/i;
export function parseExtractedMcqs(text: string): ParseResult {
  if (text.length > 2_000_000) throw new Error('Document text exceeds import limit');
  const lines = text.replace(/\r\n?/g, '\n').split('\n').map(x => x.trim()).filter(Boolean);
  const questions: ImportedMcq[] = [];
  const warnings: string[] = [];
  let stem = '';
  let options: string[] = [];
  let answer: number | null = null;
  let number = 0;
  function flush() {
    if (!stem) return;
    if (options.length === 4 && options.every(Boolean)) {
      questions.push({question: stem, options: options as [string,string,string,string], answerIndex: answer});
      if (answer === null) warnings.push('Question ' + number + ': answer requires review');
    } else warnings.push('Question ' + number + ': expected four options, found ' + options.length);
    stem = ''; options = []; answer = null;
  }
  for (const line of lines) {
    const q = line.match(questionStart);
    if (q && (options.length > 0 || !stem)) {
      flush(); number = Number(q[1]); stem = q[2]; continue;
    }
    const opt = line.match(optionStart);
    if (stem && opt) {
      const idx = opt[1].toUpperCase().charCodeAt(0) - 65;
      if (idx === options.length) options.push(opt[2]);
      else warnings.push('Question ' + number + ': option order is invalid');
      continue;
    }
    const key = line.match(answerLine);
    if (stem && key) { answer = key[1].toUpperCase().charCodeAt(0) - 65; continue; }
    if (stem && options.length === 0) stem += ' ' + line;
    else if (stem && options.length > 0) options[options.length - 1] += ' ' + line;
  }
  flush();
  return {questions, warnings};
}
