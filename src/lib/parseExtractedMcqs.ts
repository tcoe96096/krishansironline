/** Review-first MCQ parser for extracted text; never invents answers or translations. */
export type ImportedMcq = {
  question: string;
  options: [string, string, string, string];
  answerIndex: number | null;
};
export type ParseResult = { questions: ImportedMcq[]; warnings: string[] };

const questionStart = /^(?:Q(?:uestion)?\s*\.?\s*)?(?:\((\d{1,4})\)\s*|(\d{1,4})\s*[.)\-:]\s*)(.+)$/i;
const answerSuffix = /(?:^|\s)(?:correct\s+answer|answer|सही\s+उत्तर|उत्तर)\s*[:：\-]\s*\(?([A-Da-dकखगघ])\)?\s*$/i;
const optionMarker = /(^|\s)(?:\(([A-Da-dकखगघ])\)|([A-Da-dकखगघ])[.)\-:])\s*/g;
const answerKeyHeading = /^(?:answer\s*(?:key|sheet|list)|answers|correct\s*answers|उत्तर\s*(?:कुंजी|माला|सूची)|उत्तरमाला)(?:\s*[:：\-]\s*|\s*$)/i;
const answerEntry = /(?:^|[\s,;|])(?:Q(?:uestion)?\s*\.?\s*)?(?:\((\d{1,4})\)|(\d{1,4})\s*[.)\-:]?)\s*(?:[:=\-]\s*)?\(?([A-Da-dकखगघ])\)?(?=$|[\s,;|])/gi;

const optionIndex = (letter: string): number => {
  const hindi = 'कखगघ'.indexOf(letter);
  return hindi >= 0 ? hindi : letter.toUpperCase().charCodeAt(0) - 65;
};

export function parseExtractedMcqs(text: string): ParseResult {
  if (text.length > 2_000_000) throw new Error('Document text exceeds import limit');
  const lines = text.replace(/\r\n?/g, '\n').split('\n').map(x => x.trim()).filter(Boolean);
  const questions: ImportedMcq[] = [];
  const questionNumbers: number[] = [];
  const warnings: string[] = [];
  const keyedAnswers = new Map<number, Set<number>>();
  let stem = '';
  let options: string[] = [];
  let answer: number | null = null;
  let number = 0;
  let inAnswerKey = false;

  function flush(): void {
    if (!stem) return;
    if (options.length === 4 && options.every(Boolean)) {
      questions.push({
        question: stem,
        options: options as [string, string, string, string],
        answerIndex: answer,
      });
      questionNumbers.push(number);
    } else {
      warnings.push('Question ' + number + ': expected four options, found ' + options.length);
    }
    stem = '';
    options = [];
    answer = null;
  }

  function collectAnswers(source: string): void {
    // The answer key is treated as untrusted source data and not proof of correctness.
    for (const entry of source.matchAll(answerEntry)) {
      const questionNumber = Number(entry[1] || entry[2]);
      const answerOptionIndex = optionIndex(entry[3]);
      if (!keyedAnswers.has(questionNumber)) keyedAnswers.set(questionNumber, new Set());
      keyedAnswers.get(questionNumber)!.add(answerOptionIndex);
    }
  }

  function appendText(value: string): void {
    const trimmed = value.trim();
    if (!trimmed || !stem) return;
    if (options.length === 0) stem += ' ' + trimmed;
    else options[options.length - 1] += ' ' + trimmed;
  }

  function consumeLine(value: string): void {
    if (!stem) return;
    let line = value.trim();
    const suffix = line.match(answerSuffix);
    if (suffix) {
      answer = optionIndex(suffix[1]);
      line = line.slice(0, suffix.index).trim();
    }
    if (!line) return;
    const markers = [...line.matchAll(optionMarker)];
    if (!markers.length) { appendText(line); return; }
    appendText(line.slice(0, markers[0].index));
    for (let i = 0; i < markers.length; i++) {
      const marker = markers[i];
      const letter = (marker[2] || marker[3]).toUpperCase();
      const foundIndex = optionIndex(letter);
      const end = i + 1 < markers.length ? markers[i + 1].index : line.length;
      const body = line.slice(marker.index! + marker[0].length, end).trim();
      if (foundIndex !== options.length || !body) {
        warnings.push('Question ' + number + ': option ' + letter + ' is out of order or empty');
        continue;
      }
      options.push(body);
    }
  }

  for (const line of lines) {
    if (inAnswerKey) {
      collectAnswers(line);
      continue;
    }
    const heading = line.match(answerKeyHeading);
    if (heading) {
      flush();
      inAnswerKey = true;
      collectAnswers(line.slice(heading[0].length));
      continue;
    }
    const question = line.match(questionStart);
    if (question) {
      flush();
      number = Number(question[1] || question[2]);
      stem = question[3].trim();
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

  const counts = new Map<number, number>();
  for (const n of questionNumbers) counts.set(n, (counts.get(n) || 0) + 1);
  const foundNumbers = new Set(questionNumbers);
  questions.forEach((question, index) => {
    const n = questionNumbers[index];
    const possible = keyedAnswers.get(n);
    if (possible) {
      if (counts.get(n)! > 1 || possible.size !== 1) {
        question.answerIndex = null;
        warnings.push('Question ' + n + ': ambiguous answer key; manual review required');
      } else {
        const keyed = [...possible][0];
        if (question.answerIndex !== null && question.answerIndex !== keyed) {
          question.answerIndex = null;
          warnings.push('Question ' + n + ': answer key conflicts with inline answer');
        } else {
          question.answerIndex = keyed;
        }
      }
    }
    if (question.answerIndex === null) {
      warnings.push('Question ' + n + ': answer requires review');
    }
  });
  for (const n of keyedAnswers.keys()) {
    if (!foundNumbers.has(n)) warnings.push('Answer key entry ' + n + ': question missing or incomplete');
  }
  return { questions, warnings };
}
