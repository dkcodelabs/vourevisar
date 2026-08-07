import { beforeAll, describe, expect, it } from 'vitest';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

let extractPdfText: typeof import('./pdfTextExtractor').extractPdfText;

beforeAll(async () => {
  ({ extractPdfText } = await import('./pdfTextExtractor'));
  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
  pdfjs.GlobalWorkerOptions.workerSrc = pathToFileURL(
    resolve('node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs'),
  ).href;
});

function createTextPdf(text: string) {
  const escapedText = text.replace(/([\\()])/g, '\\$1');
  const stream = `BT /F1 12 Tf 72 720 Td (${escapedText}) Tj ET`;
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
    `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`,
  ];

  let pdf = '%PDF-1.4\n';
  const offsets = [0];

  objects.forEach((object, index) => {
    offsets.push(pdf.length);
    pdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });

  const xrefOffset = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n`;
  pdf += '0000000000 65535 f \n';
  pdf += offsets.slice(1).map((offset) => `${String(offset).padStart(10, '0')} 00000 n \n`).join('');
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;

  return new Blob([pdf], { type: 'application/pdf' });
}

describe('extractPdfText', () => {
  it('extracts text from a real PDF with PDF.js 6', async () => {
    const result = await extractPdfText(createTextPdf('CONTEUDO PROGRAMATICO Direito Constitucional'));

    expect(result.pages).toHaveLength(1);
    expect(result.fullText).toContain('CONTEUDO PROGRAMATICO');
    expect(result.metrics.pageCount).toBe(1);
    expect(result.metrics.hasConteudoProgramatico).toBe(true);
  });
});
