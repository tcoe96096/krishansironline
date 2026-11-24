/** Read a teacher/admin-selected PDF or DOCX locally; no document bytes are uploaded.
 * Text-only extraction: scanned/image-only PDF pages need a separate OCR workflow.
 */
export const MAX_TEST_DOCUMENT_BYTES = 8 * 1024 * 1024;
const MAX_EXTRACTED_CHARACTERS = 2_000_000;
const MAX_PDF_PAGES = 100;

export async function extractTestDocumentText(file: File): Promise<string> {
  const extension = file.name.toLowerCase().split('.').pop();
  if (extension !== 'pdf' && extension !== 'docx') {
    throw new Error('केवल PDF (.pdf) और Word (.docx) समर्थित हैं।');
  }
  if (!file.size || file.size > MAX_TEST_DOCUMENT_BYTES) {
    throw new Error('फाइल खाली है या 8 MB से बड़ी है।');
  }
  const bytes = new Uint8Array(await file.arrayBuffer());
  let result = '';

  if (extension === 'pdf') {
    if (String.fromCharCode(...bytes.slice(0, 5)) !== '%PDF-') {
      throw new Error('फाइल में वैध PDF signature नहीं है।');
    }
    const pdfjs = await import('pdfjs-dist');
    const worker = await import('pdfjs-dist/build/pdf.worker.min.mjs?url');
    pdfjs.GlobalWorkerOptions.workerSrc = worker.default;
    const loadingTask = pdfjs.getDocument({ data: bytes });
    const document = await loadingTask.promise;
    try {
      if (document.numPages > MAX_PDF_PAGES) {
        throw new Error('PDF में 100 से अधिक पेज हैं; छोटी फाइल अपलोड करें।');
      }
      const pages: string[] = [];
      let totalCharacters = 0;
      for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber++) {
        const page = await document.getPage(pageNumber);
        const extracted = await page.getTextContent();
        let pageText = '';
        let lastY: number | null = null;
        for (const item of extracted.items) {
          if (!('str' in item)) continue;
          const y = Array.isArray(item.transform) ? item.transform[5] : null;
          if (pageText && y !== null && lastY !== null && Math.abs(y - lastY) > 2) pageText += '\n';
          else if (pageText && !pageText.endsWith('\n')) pageText += ' ';
          pageText += item.str;
          if (item.hasEOL) pageText += '\n';
          if (y !== null) lastY = y;
          if (pageText.length > MAX_EXTRACTED_CHARACTERS) throw new Error('PDF का टेक्स्ट import सीमा से बड़ा है।');
        }
        totalCharacters += pageText.length;
        if (totalCharacters > MAX_EXTRACTED_CHARACTERS) {
          throw new Error('PDF का टेक्स्ट import सीमा से बड़ा है।');
        }
        pages.push(pageText);
      }
      result = pages.join('\n');
    } finally {
      await loadingTask.destroy();
    }
  } else {
    if (bytes[0] !== 0x50 || bytes[1] !== 0x4b) {
      throw new Error('फाइल में वैध DOCX signature नहीं है।');
    }
    const mammoth = await import('mammoth');
    const output = await mammoth.extractRawText({ arrayBuffer: bytes.buffer });
    result = output.value;
  }

  if (!result.trim()) throw new Error('कोई पढ़ने योग्य टेक्स्ट नहीं मिला। Scan वाली PDF के लिए OCR अभी उपलब्ध नहीं है।');
  if (result.length > MAX_EXTRACTED_CHARACTERS) throw new Error('फाइल का टेक्स्ट import सीमा से बड़ा है।');
  return result;
}
