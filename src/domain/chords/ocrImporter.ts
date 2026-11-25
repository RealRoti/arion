import type { Block } from 'tesseract.js';
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import { convertChordsAboveLyricsToChordPro } from '@/domain/chords/importer';
import { reconstructPageLinesFromPdfTextItems, type PdfTextRun } from '@/domain/chords/pdfImporter';
import type { ImportChordProOptions, TextImportResult } from '@/domain/chords/types';

export type OcrImportErrorCode = 'EMPTY_OCR_TEXT' | 'OCR_FAILED';

export class OcrImportError extends Error {
  readonly code: OcrImportErrorCode;

  constructor(code: OcrImportErrorCode, message: string) {
    super(message);
    this.name = 'OcrImportError';
    this.code = code;
  }
}

export interface OcrProgress {
  readonly page: number;
  readonly totalPages: number;
  readonly progress: number;
}

export interface OcrWordBox {
  readonly text: string;
  readonly bbox: {
    readonly x0: number;
    readonly y0: number;
    readonly x1: number;
    readonly y1: number;
  };
}

/**
 * Converts top-down Tesseract word bounding boxes into bottom-up PDF.js coordinate space
 * so standard column/line reconstruction works identically on scanned images.
 */
export function ocrWordsToPdfTextRuns(
  words: readonly OcrWordBox[],
  imageHeight: number,
): PdfTextRun[] {
  const runs: PdfTextRun[] = [];
  for (const word of words) {
    const cleaned = word.text.trim();
    if (!cleaned) continue;
    const width = Math.max(1, word.bbox.x1 - word.bbox.x0);
    const height = Math.max(8, word.bbox.y1 - word.bbox.y0);
    runs.push({
      str: cleaned,
      x: word.bbox.x0,
      y: Math.max(0, imageHeight - word.bbox.y1),
      width,
      height,
    });
  }
  return runs;
}

function extractWordsFromBlocks(blocks: readonly Block[] | null | undefined): OcrWordBox[] {
  if (!blocks || blocks.length === 0) {
    return [];
  }
  const words: OcrWordBox[] = [];
  for (const block of blocks) {
    for (const paragraph of block.paragraphs ?? []) {
      for (const line of paragraph.lines ?? []) {
        for (const word of line.words ?? []) {
          if (word.text.trim().length > 0) {
            words.push({
              text: word.text,
              bbox: word.bbox,
            });
          }
        }
      }
    }
  }
  return words;
}

function reconstructTextFromOcrResult(
  page: { readonly text: string; readonly blocks: readonly Block[] | null },
  imageWidth?: number,
  imageHeight?: number,
): string {
  const words = extractWordsFromBlocks(page.blocks);
  if (words.length > 0) {
    const inferredHeight = imageHeight ?? Math.max(...words.map((w) => w.bbox.y1), 100);
    const inferredWidth = imageWidth ?? Math.max(...words.map((w) => w.bbox.x1), 100);
    const runs = ocrWordsToPdfTextRuns(words, inferredHeight);
    const lines = reconstructPageLinesFromPdfTextItems(runs, inferredWidth);
    if (lines.length > 0) {
      return lines.join('\n');
    }
  }
  return (page.text ?? '').trim();
}

async function readImageDimensions(blob: Blob): Promise<{ width?: number; height?: number }> {
  if (typeof createImageBitmap === 'function') {
    try {
      const bitmap = await createImageBitmap(blob);
      const dims = { width: bitmap.width, height: bitmap.height };
      bitmap.close();
      return dims;
    } catch {
      return {};
    }
  }
  return {};
}

export async function importSongFromOcrPdfArrayBuffer(
  buffer: ArrayBuffer,
  options?: ImportChordProOptions & {
    onProgress?: (progress: OcrProgress) => void;
    maxPages?: number;
  },
): Promise<TextImportResult> {
  if (buffer.byteLength === 0) {
    throw new OcrImportError('OCR_FAILED', 'PDF buffer is empty or detached.');
  }

  const tesseract = await import('tesseract.js');
  const pdfjs = await import('pdfjs-dist');
  pdfjs.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

  let activePage = 1;
  let pagesToProcess = 1;

  const worker = await tesseract.createWorker('ita', undefined, {
    logger: (msg) => {
      if (msg.status === 'recognizing text' && typeof msg.progress === 'number') {
        options?.onProgress?.({
          page: activePage,
          totalPages: pagesToProcess,
          progress: Math.round(msg.progress * 100),
        });
      }
    },
  });

  let doc: Awaited<ReturnType<typeof pdfjs.getDocument>['promise']> | null = null;
  try {
    doc = await pdfjs.getDocument({ data: new Uint8Array(buffer).slice() }).promise;
    pagesToProcess = Math.max(1, Math.min(doc.numPages, options?.maxPages ?? 6));
    const pageTexts: string[] = [];

    for (let pageNumber = 1; pageNumber <= pagesToProcess; pageNumber += 1) {
      activePage = pageNumber;
      const page = await doc.getPage(pageNumber);
      const viewport = page.getViewport({ scale: 2 });

      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.floor(viewport.width));
      canvas.height = Math.max(1, Math.floor(viewport.height));
      const context = canvas.getContext('2d');
      if (!context) {
        throw new OcrImportError('OCR_FAILED', 'Canvas 2D context is unavailable.');
      }

      context.fillStyle = '#ffffff';
      context.fillRect(0, 0, canvas.width, canvas.height);

      await page.render({ canvas, canvasContext: context, viewport }).promise;
      const result = await worker.recognize(canvas, {}, { text: true, blocks: true });
      const text = reconstructTextFromOcrResult(result.data, canvas.width, canvas.height);
      if (text.trim()) {
        pageTexts.push(text);
      }
    }

    const combined = pageTexts.join('\n\n').trim();
    if (!combined) {
      throw new OcrImportError('EMPTY_OCR_TEXT', 'No readable text extracted via OCR.');
    }

    return convertChordsAboveLyricsToChordPro(combined, options);
  } catch (err) {
    if (err instanceof OcrImportError) {
      throw err;
    }
    throw new OcrImportError(
      'OCR_FAILED',
      err instanceof Error ? err.message : 'OCR processing failed.',
    );
  } finally {
    if (doc) {
      await doc.cleanup();
    }
    await worker.terminate();
  }
}

export async function importSongFromOcrImageBlob(
  blob: Blob,
  options?: ImportChordProOptions & {
    onProgress?: (progress: OcrProgress) => void;
  },
): Promise<TextImportResult> {
  const tesseract = await import('tesseract.js');
  const worker = await tesseract.createWorker('ita', undefined, {
    logger: (msg) => {
      if (msg.status === 'recognizing text' && typeof msg.progress === 'number') {
        options?.onProgress?.({
          page: 1,
          totalPages: 1,
          progress: Math.round(msg.progress * 100),
        });
      }
    },
  });

  try {
    const dims = await readImageDimensions(blob);
    const result = await worker.recognize(blob, {}, { text: true, blocks: true });
    const combined = reconstructTextFromOcrResult(result.data, dims.width, dims.height).trim();
    if (!combined) {
      throw new OcrImportError('EMPTY_OCR_TEXT', 'No readable text extracted via OCR.');
    }

    return convertChordsAboveLyricsToChordPro(combined, options);
  } catch (err) {
    if (err instanceof OcrImportError) {
      throw err;
    }
    throw new OcrImportError(
      'OCR_FAILED',
      err instanceof Error ? err.message : 'OCR processing failed.',
    );
  } finally {
    await worker.terminate();
  }
}
