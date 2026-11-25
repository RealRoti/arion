import { beforeEach, describe, expect, it as vitestIt, vi } from 'vitest';
import {
  importSongFromOcrImageBlob,
  importSongFromOcrPdfArrayBuffer,
  OcrImportError,
  ocrWordsToPdfTextRuns,
} from '@/domain/chords/ocrImporter';

const mockTerminate = vi.fn(async () => ({ jobId: 'j1', data: {} }));
const mockRecognize = vi.fn();
const mockCreateWorker = vi.fn();
const mockPdfGetDocument = vi.fn();

vi.mock('tesseract.js', () => ({
  createWorker: (...args: unknown[]) => mockCreateWorker(...args),
}));

vi.mock('pdfjs-dist', () => ({
  GlobalWorkerOptions: { workerSrc: '' },
  getDocument: (...args: unknown[]) => mockPdfGetDocument(...args),
}));

describe('Browser OCR ChordPro importer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCreateWorker.mockResolvedValue({
      recognize: mockRecognize,
      terminate: mockTerminate,
    });
  });

  vitestIt('converts top-down OCR boxes to PDF coordinate space preserving chord columns', () => {
    const runs = ocrWordsToPdfTextRuns(
      [
        { text: 'La', bbox: { x0: 100, y0: 40, x1: 120, y1: 58 } },
        { text: 'Mi', bbox: { x0: 210, y0: 40, x1: 230, y1: 58 } },
        { text: 'Questo', bbox: { x0: 100, y0: 66, x1: 160, y1: 84 } },
        { text: 'canto', bbox: { x0: 210, y0: 66, x1: 255, y1: 84 } },
      ],
      800,
    );

    expect(runs).toHaveLength(4);
    expect(runs[0]).toMatchObject({ str: 'La', x: 100, y: 742, width: 20, height: 18 });
    expect(runs[2]?.y).toBeLessThan(runs[0]!.y);
  });

  vitestIt(
    'extracts chords and lyrics from an image blob via Tesseract and terminates worker',
    async () => {
      mockRecognize.mockResolvedValue({
        data: {
          text: 'La    Mi\nQuesto canto',
          blocks: [
            {
              paragraphs: [
                {
                  lines: [
                    {
                      words: [
                        { text: 'La', bbox: { x0: 40, y0: 40, x1: 58, y1: 54 } },
                        { text: 'Mi', bbox: { x0: 103, y0: 40, x1: 121, y1: 54 } },
                      ],
                    },
                    {
                      words: [
                        { text: 'Questo', bbox: { x0: 40, y0: 62, x1: 94, y1: 76 } },
                        { text: 'canto', bbox: { x0: 103, y0: 62, x1: 148, y1: 76 } },
                      ],
                    },
                  ],
                },
              ],
            },
          ],
        },
      });

      const blob = new Blob([new Uint8Array([137, 80, 78, 71])], { type: 'image/png' });
      const result = await importSongFromOcrImageBlob(blob, { targetNotation: 'italian' });

      expect(mockRecognize).toHaveBeenCalledWith(blob, {}, { text: true, blocks: true });
      expect(result.detectedChordLines).toBe(1);
      expect(result.chordpro).toContain('[La]Questo [Mi]canto');
      expect(mockTerminate).toHaveBeenCalledTimes(1);
    },
  );

  vitestIt(
    'throws EMPTY_OCR_TEXT when OCR produces blank output and still terminates worker',
    async () => {
      mockRecognize.mockResolvedValue({
        data: { text: '   ', blocks: [] },
      });

      const blob = new Blob([new Uint8Array([137, 80, 78, 71])], { type: 'image/png' });
      await expect(importSongFromOcrImageBlob(blob)).rejects.toMatchObject({
        code: 'EMPTY_OCR_TEXT',
      } satisfies Partial<OcrImportError>);
      expect(mockTerminate).toHaveBeenCalledTimes(1);
    },
  );

  vitestIt(
    'maps PDF loading failures to OCR_FAILED and always terminates the Tesseract worker',
    async () => {
      mockPdfGetDocument.mockReturnValue({
        promise: Promise.reject(new Error('InvalidPDFException')),
      });

      const pdfBuffer = new TextEncoder().encode('%PDF-1.7\n').buffer;
      await expect(importSongFromOcrPdfArrayBuffer(pdfBuffer)).rejects.toMatchObject({
        code: 'OCR_FAILED',
      } satisfies Partial<OcrImportError>);
      expect(mockTerminate).toHaveBeenCalledTimes(1);
    },
  );
});
