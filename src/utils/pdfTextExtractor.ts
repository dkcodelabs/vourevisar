import * as pdfjs from 'pdfjs-dist';
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.mjs?url';

pdfjs.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

export type PdfTextExtractionQuality = 'good' | 'medium' | 'poor';

export interface PdfTextPage {
  pageNumber: number;
  text: string;
  charCount: number;
}

export interface PdfTextMetrics {
  pageCount: number;
  charCount: number;
  avgCharsPerPage: number;
  hasConhecimentos: boolean;
  hasConteudoProgramatico: boolean;
  uppercaseHeadingCount: number;
  numberedTopicCount: number;
  controlCharCount: number;
  extractionQuality: PdfTextExtractionQuality;
  qualityReasons: string[];
}

export interface PdfTextExtractionResult {
  fullText: string;
  pages: PdfTextPage[];
  metrics: PdfTextMetrics;
}

function isRemovableControlChar(charCode: number) {
  return (charCode >= 0 && charCode <= 8) || charCode === 11 || charCode === 12 || (charCode >= 14 && charCode <= 31) || charCode === 127;
}

function removeControlChars(value: string) {
  let cleaned = '';
  for (const char of value) {
    if (!isRemovableControlChar(char.charCodeAt(0))) {
      cleaned += char;
    }
  }
  return cleaned;
}

function countControlChars(value: string) {
  let count = 0;
  for (const char of value) {
    if (isRemovableControlChar(char.charCodeAt(0))) {
      count += 1;
    }
  }
  return count;
}

function normalizeWhitespace(value: string) {
  return removeControlChars(value)
    .replace(/\r/g, '\n')
    .replace(/[ \t]+/g, ' ')
    .replace(/[ \t]*\n[ \t]*/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function joinBrokenHyphenation(value: string) {
  return value.replace(/([A-Za-zÀ-ÿ])-\n([A-Za-zÀ-ÿ])/g, '$1$2');
}

function normalizeForSearch(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .toLowerCase()
    .trim();
}

function countMatches(value: string, pattern: RegExp) {
  return Array.from(value.matchAll(pattern)).length;
}

function getTextItemValue(item: unknown) {
  if (item && typeof item === 'object' && 'str' in item) {
    return String((item as { str?: unknown }).str || '');
  }
  return '';
}

function cleanPageText(rawText: string) {
  return normalizeWhitespace(joinBrokenHyphenation(rawText));
}

function scorePdfText(fullText: string, pageCount: number): PdfTextMetrics {
  const normalized = normalizeForSearch(fullText);
  const charCount = fullText.length;
  const controlCharCount = countControlChars(fullText);
  const hasConhecimentos = /\bconhecimentos\b/.test(normalized);
  const hasConteudoProgramatico = /\b(conteudo programatico|objetos de avaliacao)\b/.test(normalized);
  const uppercaseHeadingCount = countMatches(
    fullText,
    /\b[A-ZÁÉÍÓÚÂÊÔÃÕÇ]{3,}(?:\s+[A-ZÁÉÍÓÚÂÊÔÃÕÇ]{2,}){1,}\s*:/g,
  );
  const numberedTopicCount = countMatches(
    fullText,
    /(?:^|\s)\d{1,3}(?:\.\d{1,3})*\s+[A-Za-zÀ-ÿ]/g,
  );
  const avgCharsPerPage = pageCount > 0 ? Math.round(charCount / pageCount) : 0;
  const qualityReasons: string[] = [];

  if (charCount < 1000) qualityReasons.push('texto extraido muito curto');
  if (!hasConhecimentos && !hasConteudoProgramatico) qualityReasons.push('marcadores de conteudo programatico nao encontrados');
  if (numberedTopicCount < 10) qualityReasons.push('poucos topicos numerados detectados');
  if (uppercaseHeadingCount < 2) qualityReasons.push('poucos cabecalhos de disciplina detectados');
  if (avgCharsPerPage < 300) qualityReasons.push('baixa densidade media de texto por pagina');

  let extractionQuality: PdfTextExtractionQuality = 'poor';
  if (
    charCount >= 3000 &&
    (hasConhecimentos || hasConteudoProgramatico) &&
    numberedTopicCount >= 20 &&
    uppercaseHeadingCount >= 3
  ) {
    extractionQuality = 'good';
  } else if (
    charCount >= 1000 &&
    (hasConhecimentos || hasConteudoProgramatico || numberedTopicCount >= 10)
  ) {
    extractionQuality = 'medium';
  }

  if (extractionQuality === 'good') {
    qualityReasons.push('texto suficiente para fatiamento por ancoras');
  } else if (extractionQuality === 'medium') {
    qualityReasons.push('texto possivelmente utilizavel, mas exige fallback');
  }

  return {
    pageCount,
    charCount,
    avgCharsPerPage,
    hasConhecimentos,
    hasConteudoProgramatico,
    uppercaseHeadingCount,
    numberedTopicCount,
    controlCharCount,
    extractionQuality,
    qualityReasons,
  };
}

export async function extractPdfText(file: File): Promise<PdfTextExtractionResult> {
  const data = new Uint8Array(await file.arrayBuffer());
  const documentTask = pdfjs.getDocument({ data });
  const document = await documentTask.promise;
  const pages: PdfTextPage[] = [];

  try {
    for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber += 1) {
      const page = await document.getPage(pageNumber);
      const textContent = await page.getTextContent();
      const rawText = textContent.items
        .map(getTextItemValue)
        .filter(Boolean)
        .join(' ');
      const text = cleanPageText(rawText);

      pages.push({
        pageNumber,
        text,
        charCount: text.length,
      });
    }
  } finally {
    document.destroy();
  }

  const fullText = normalizeWhitespace(pages.map((page) => page.text).join('\n\n'));
  const metrics = scorePdfText(fullText, document.numPages);

  return {
    fullText,
    pages,
    metrics,
  };
}
