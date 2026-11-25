import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import { convertChordsAboveLyricsToChordPro } from '@/domain/chords/importer';
import type { ImportChordProOptions, TextImportResult } from '@/domain/chords/types';

export type PdfImportErrorCode = 'INVALID_PDF' | 'SCANNED_PDF_NO_TEXT' | 'EXTRACTION_FAILED';

export class PdfImportError extends Error {
  readonly code: PdfImportErrorCode;

  constructor(code: PdfImportErrorCode, message: string) {
    super(message);
    this.name = 'PdfImportError';
    this.code = code;
  }
}

export interface PdfTextRun {
  readonly str: string;
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

interface VisualLine {
  y: number;
  maxHeight: number;
  runs: PdfTextRun[];
}

function hasPdfMagicHeader(bytes: Uint8Array): boolean {
  const limit = Math.min(bytes.length, 1024);
  for (let i = 0; i <= limit - 5; i += 1) {
    if (
      bytes[i] === 0x25 &&
      bytes[i + 1] === 0x50 &&
      bytes[i + 2] === 0x44 &&
      bytes[i + 3] === 0x46 &&
      bytes[i + 4] === 0x2d
    ) {
      return true;
    }
  }
  return false;
}

function estimateAverageCharWidth(runs: readonly PdfTextRun[]): number {
  let totalWidth = 0;
  let totalChars = 0;
  for (const run of runs) {
    if (run.width > 0 && run.str.length > 0) {
      totalWidth += run.width;
      totalChars += run.str.length;
    }
  }
  if (totalChars === 0 || totalWidth <= 0) {
    return 5.5;
  }
  const avg = totalWidth / totalChars;
  return Math.max(3.5, Math.min(12, avg));
}

function computeMedianVerticalStep(lines: readonly VisualLine[]): number {
  const deltas: number[] = [];
  for (let i = 1; i < lines.length; i += 1) {
    const prev = lines[i - 1];
    const curr = lines[i];
    if (!prev || !curr) continue;
    const delta = prev.y - curr.y;
    if (delta > 0.5) {
      deltas.push(delta);
    }
  }
  if (deltas.length === 0) {
    return 14;
  }
  deltas.sort((a, b) => a - b);
  return deltas[Math.floor(deltas.length / 2)] ?? 14;
}

/**
 * Reconstructs aligned plain-text lines from positioned PDF.js text runs so that
 * chords placed above lyrics retain their column offsets across spaces.
 */
export function reconstructLinesFromPdfTextItems(runs: readonly PdfTextRun[]): string[] {
  const nonEmpty = runs.filter((run) => run.str.trim().length > 0);
  if (nonEmpty.length === 0) {
    return [];
  }

  let minX = nonEmpty[0]?.x ?? 0;
  for (const run of nonEmpty) {
    if (run.x < minX) {
      minX = run.x;
    }
  }

  const charWidth = estimateAverageCharWidth(nonEmpty);
  const sortedByY = [...nonEmpty].sort((a, b) => b.y - a.y || a.x - b.x);
  const visualLines: VisualLine[] = [];

  for (const run of sortedByY) {
    let matchedLine: VisualLine | null = null;
    for (let i = visualLines.length - 1; i >= 0; i -= 1) {
      const candidate = visualLines[i];
      if (!candidate) continue;
      const lineHeight = Math.max(candidate.maxHeight, run.height || 11);
      const tolerance = Math.max(2.5, Math.min(6, lineHeight * 0.42));
      if (Math.abs(candidate.y - run.y) <= tolerance) {
        matchedLine = candidate;
        break;
      }
      if (candidate.y - run.y > tolerance * 2) {
        break;
      }
    }

    if (matchedLine) {
      matchedLine.runs.push(run);
      if (run.height > matchedLine.maxHeight) {
        matchedLine.maxHeight = run.height;
      }
    } else {
      visualLines.push({
        y: run.y,
        maxHeight: run.height || 11,
        runs: [run],
      });
    }
  }

  visualLines.sort((a, b) => b.y - a.y);
  const medianStep = computeMedianVerticalStep(visualLines);
  const outputLines: string[] = [];

  for (let lineIdx = 0; lineIdx < visualLines.length; lineIdx += 1) {
    const line = visualLines[lineIdx];
    if (!line || line.runs.length === 0) continue;

    if (lineIdx > 0) {
      const prevLine = visualLines[lineIdx - 1];
      if (prevLine && prevLine.y - line.y > medianStep * 1.8 && outputLines.at(-1) !== '') {
        outputLines.push('');
      }
    }

    line.runs.sort((a, b) => a.x - b.x);
    const firstRun = line.runs[0];
    if (!firstRun) continue;

    const leadingIndent = Math.max(0, Math.round((firstRun.x - minX) / charWidth));
    let lineText = `${' '.repeat(leadingIndent)}${firstRun.str}`;
    let prevEndX =
      firstRun.x + (firstRun.width > 0 ? firstRun.width : firstRun.str.length * charWidth);

    for (let r = 1; r < line.runs.length; r += 1) {
      const run = line.runs[r];
      if (!run) continue;

      const gap = run.x - prevEndX;
      if (gap > charWidth * 0.35) {
        const spacesCount = Math.max(1, Math.round(gap / charWidth));
        if (!/\s$/.test(lineText) && !/^\s/.test(run.str)) {
          lineText += ' '.repeat(spacesCount);
        } else if (spacesCount > 1 && /\s$/.test(lineText) && !/^\s/.test(run.str)) {
          lineText += ' '.repeat(spacesCount - 1);
        }
      }

      lineText += run.str;
      const runAdvance = run.width > 0 ? run.width : run.str.length * charWidth;
      prevEndX = Math.max(prevEndX, run.x + runAdvance);
    }

    const trimmedEnd = lineText.replace(/\s+$/, '');
    if (trimmedEnd.trim().length > 0) {
      outputLines.push(trimmedEnd);
    }
  }

  return outputLines;
}

export async function extractTextFromPdfArrayBuffer(buffer: ArrayBuffer): Promise<string> {
  const bytes = new Uint8Array(buffer);
  if (!hasPdfMagicHeader(bytes)) {
    throw new PdfImportError('INVALID_PDF', 'File is not a valid PDF document.');
  }

  try {
    const pdfjs = await import('pdfjs-dist');
    pdfjs.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

    const loadingTask = pdfjs.getDocument({ data: bytes });
    const doc = await loadingTask.promise;

    try {
      const pageTexts: string[] = [];

      for (let pageNumber = 1; pageNumber <= doc.numPages; pageNumber += 1) {
        const page = await doc.getPage(pageNumber);
        const textContent = await page.getTextContent();
        const runs: PdfTextRun[] = [];

        for (const item of textContent.items) {
          if (
            typeof item === 'object' &&
            item !== null &&
            'str' in item &&
            typeof item.str === 'string' &&
            'transform' in item &&
            Array.isArray(item.transform)
          ) {
            const x = Number(item.transform[4] ?? 0);
            const y = Number(item.transform[5] ?? 0);
            const width = 'width' in item && typeof item.width === 'number' ? item.width : 0;
            const rawHeight =
              'height' in item && typeof item.height === 'number' && item.height > 0
                ? item.height
                : Math.abs(Number(item.transform[3] ?? 11));

            runs.push({
              str: item.str,
              x,
              y,
              width,
              height: rawHeight > 0 ? rawHeight : 11,
            });
          }
        }

        const lines = reconstructLinesFromPdfTextItems(runs);
        if (lines.length > 0) {
          pageTexts.push(lines.join('\n'));
        }
      }

      const combined = pageTexts.join('\n\n').trim();
      if (!combined) {
        throw new PdfImportError(
          'SCANNED_PDF_NO_TEXT',
          'PDF appears to be a scanned image without selectable text.',
        );
      }

      return combined;
    } finally {
      await doc.cleanup();
    }
  } catch (err) {
    if (err instanceof PdfImportError) {
      throw err;
    }
    throw new PdfImportError(
      'EXTRACTION_FAILED',
      err instanceof Error ? err.message : 'Failed to extract text from PDF.',
    );
  }
}

export async function importSongFromPdfArrayBuffer(
  buffer: ArrayBuffer,
  options?: ImportChordProOptions,
): Promise<TextImportResult> {
  const rawText = await extractTextFromPdfArrayBuffer(buffer);
  return convertChordsAboveLyricsToChordPro(rawText, options);
}
