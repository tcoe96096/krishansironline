/** Deterministic, review-first parser for extracted PDF/DOCX MCQ text.
 * Never guesses answer keys, translations or explanations.
 */
export type ImportedMcq = {
  question: string;
  options: [string, string, string, string];
  answerIndex: number | null;
};
export type ParseResult = { questions: ImportedMcq[]; warnings: string[] };

const questionStart = /^(?:Q(?:uestion)?\s*\.?\s*)?(\d{1,4})\s*[.)\-:]\s*(.+)$/i;
const answerSuffix = /(?:^|\s)(?:correct\s+answer|answer|सही\s+उत्तर|उत्तर)\s*[:：\-]\s*\(?([A-Da-d])\)?\s*$/i;
// Recognises A. / B) / (C) / D: even when all four appear on the same PDF line.
const optionMarker = /(^|\s)(?:\(([A-Da-d])\)|([A-Da-d])[.)\-:])\s*/g;

export function parseExtractedMcqs(text: string): ParseResult {
  if (text.length > 2_000_000) throw new Error('Document text exceeds import limit');
  const lines = text.replace(/\r\n?/g, '\n').split('\n').map(x => x.trim()).filter(Boolean);
  const questions: ImportedMcq[] = [];
  const warnings: string[] = [];
  let stem = '';
  let options: string[] = [];
  let answer: number | null = null;
  let number = 0;

  function flush(): void {
    if (!stem) return;
    if (options.length === 4 && options.every(Boolean)) {
      questions.push({ question: stem, options: options as [string, string, string, string], answerIndex: answer });
      if (answer === null) warnings.push('Question ' + number + ': answer requires review');
    } else {
      warnings.push('Question ' + number + ': expected four options, found ' + options.length);
    }
    stem = '';
    options = [];
    answer = null;
  }

  function addText(content: string): void {
    if (!content.trim() || !stem) return;
    const part = content.trim();
    if (options.length === 0) stem += ' ' + part;
    else options[options.length - 1] += ' ' + part;
  }

  function consumeLine(value: string): void {
    if (!stem) return;
    let line = value.trim();
    const suffix = line.match(answerSuffix);
    if (suffix) {
      answer = suffix[1].toUpperCase().charCodeAt(0) - 65;
      line = line.slice(0, suffix.index).trim();
    }
    if (!line) return;

    const markers = [...line.matchAll(optionMarker)];
    if (!markers.length) {
      addText(line);
      return;
    }

    addText(line.slice(0, markers[0].index));
    for (let index = 0; index < markers.length; index++) {
      const marker = markers[index];
      const letter = (marker[2] || marker[3]).toUpperCase();
      const expected = options.length;
      const optionIndex = letter.charCodeAt(0) - 65;
      const end = index + 1 < markers.length ? markers[index + 1].index : line.length;
      const body = line.slice(marker.index! + marker[0].length, end).trim();
      if (optionIndex !== expected || !body) {
        warnings.push('Question ' + number + ': option ' + letter + ' is out of order or empty');
        continue;
      }
      options.push(body);
    }
  }

  for (const line of lines) {
    const question = line.match(questionStart);
    if (question) {
      flush();
      number = Number(question[1]);
      stem = '';
      options = [];
      answer = null;
      // A numbered question may include inline options on the same line.
      stem = question[2].trim();
      const firstOption = [...stem.matchAll(optionMarker)][0];
      if (firstOption && firstOption.index !== undefined) {
        const tail = stem.slice(firstOption.index);
        stem = stem.slice(0, firstOption.index).trim();
        if (stem) consumeLine(tail);
      }
      continue;
    }
    consumeLine(line);
  }

  flush();
  return { questions, warnings };
}
