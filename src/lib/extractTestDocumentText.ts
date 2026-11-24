/** Extract PDF/DOCX text locally in the Admin browser.
 * Textless PDF pages are rendered and passed through Hindi/English OCR in the
 * browser; language-model/runtime assets may be fetched from external CDNs.
 * Document contents are NOT sent to a server by this reader.
 */
export const MAX_TEST_DOCUMENT_BYTES = 8 * 1024 * 1024;
const MAX_EXTRACTED_CHARACTERS = 2_000_000;
const MAX_PDF_PAGES = 100;
const MAX_OCR_PAGES = 12;
const MAX_CANVAS_PIXELS = 5_000_000;

type OcrWorker = {
  recognize: (image: HTMLCanvasElement) => Promise<{ data: { text: string } }>;
  terminate: () => Promise<unknown>;
};

export async function extractTestDocumentText(
  file: File,
  onProgress?: (status: string) => void,
): Promise<string> {
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
    const pdfDocument = await loadingTask.promise;
    let ocrWorker: OcrWorker | null = null;
    try {
      if (pdfDocument.numPages > MAX_PDF_PAGES) {
        throw new Error('PDF में 100 से अधिक पेज हैं; छोटी फाइल अपलोड करें।');
      }
      const pages: string[] = [];
      let totalCharacters = 0;
      let ocrPages = 0;
      for (let pageNumber = 1; pageNumber <= pdfDocument.numPages; pageNumber++) {
        const page = await pdfDocument.getPage(pageNumber);
        onProgress?.('PDF page ' + pageNumber + '/' + pdfDocument.numPages + ' पढ़ रही हूँ…');
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
          if (pageText.length > MAX_EXTRACTED_CHARACTERS) {
            throw new Error('PDF का टेक्स्ट import सीमा से बड़ा है।');
          }
        }
        if (!pageText.trim()) {
          ocrPages++;
          if (ocrPages > MAX_OCR_PAGES) {
            throw new Error('इस PDF में 12 से अधिक scanned pages हैं। OCR के लिए इसे छोटी PDFs में बाँटें।');
          }
          onProgress?.('Scanned page ' + pageNumber + '/' + pdfDocument.numPages + ' पर हिंदी/English OCR चल रहा है…');
          if (!ocrWorker) {
            const { createWorker } = await import('tesseract.js');
            ocrWorker = await createWorker('eng+hin');
          }
          const viewport = page.getViewport({ scale: 2 });
          const w = Math.ceil(viewport.width);
          const h = Math.ceil(viewport.height);
          if (w * h > MAX_CANVAS_PIXELS || w < 1 || h < 1) {
            throw new Error('Scanned PDF page OCR के लिए बहुत बड़ी है; छोटी PDF का उपयोग करें।');
          }
          const canvas = window.document.createElement('canvas');
          canvas.width = w;
          canvas.height = h;
          const context = canvas.getContext('2d', { willReadFrequently: true });
          if (!context) throw new Error('Browser OCR canvas उपलब्ध नहीं है।');
          try {
            await page.render({ canvasContext: context, viewport, canvas }).promise;
            const recognized = await ocrWorker.recognize(canvas);
            pageText = recognized.data.text;
          } finally {
            canvas.width = 0;
            canvas.height = 0;
          }
        }
        totalCharacters += pageText.length;
        if (totalCharacters > MAX_EXTRACTED_CHARACTERS) {
          throw new Error('PDF का टेक्स्ट import सीमा से बड़ा है।');
        }
        pages.push(pageText);
      }
      result = pages.join('\n');
    } finally {
      if (ocrWorker) {
        try { await ocrWorker.terminate(); } catch { /* best effort */ }
      }
      await loadingTask.destroy();
    }
  } else {
    if (bytes[0] !== 0x50 || bytes[1] !== 0x4b) {
      throw new Error('फाइल में वैध DOCX signature नहीं है।');
    }
    onProgress?.('Word document से प्रश्न निकाले जा रहे हैं…');
    const mammoth = await import('mammoth');
    const output = await mammoth.extractRawText({ arrayBuffer: bytes.buffer });
    result = output.value;
  }

  if (!result.trim()) {
    throw new Error('कोई पढ़ने योग्य टेक्स्ट नहीं मिला। Scanned PDF में स्पष्ट, उच्च-गुणवत्ता वाले पेज दें।');
  }
  if (result.length > MAX_EXTRACTED_CHARACTERS) throw new Error('फाइल का टेक्स्ट import सीमा से बड़ा है।');
  return result;
}
