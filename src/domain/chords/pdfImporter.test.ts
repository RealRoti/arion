import { beforeEach, describe, expect, it as vitestIt, vi } from 'vitest';
import {
  importSongFromPdfArrayBuffer,
  PdfImportError,
  reconstructLinesFromPdfTextItems,
} from '@/domain/chords/pdfImporter';

const mockCleanup = vi.fn(async () => undefined);
const mockGetTextContent = vi.fn();
const mockGetDocument = vi.fn();

vi.mock('pdfjs-dist', () => ({
  GlobalWorkerOptions: { workerSrc: '' },
  getDocument: (...args: unknown[]) => mockGetDocument(...args),
}));

function makePdfBuffer(): ArrayBuffer {
  return new TextEncoder().encode('%PDF-1.7\n1 0 obj\n<<>>\nendobj\n').buffer;
}

describe('PDF ChordPro importer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetDocument.mockReturnValue({
      promise: Promise.resolve({
        numPages: 1,
        cleanup: mockCleanup,
        getPage: vi.fn(async () => ({
          getTextContent: mockGetTextContent,
        })),
      }),
    });
  });

  vitestIt('reconstructs visual lines preserving chord column offsets and stanza breaks', () => {
    const lines = reconstructLinesFromPdfTextItems([
      { str: 'Strofa 1:', x: 40, y: 740, width: 45, height: 12 },
      { str: 'Do', x: 40, y: 720, width: 14, height: 11 },
      { str: 'Sol/Si', x: 94, y: 720, width: 32, height: 11 },
      { str: 'Lam', x: 148, y: 720, width: 22, height: 11 },
      { str: 'Ecco il', x: 40, y: 706, width: 35, height: 11 },
      { str: 'canto che', x: 94, y: 706, width: 45, height: 11 },
      { str: 'sale', x: 148, y: 706, width: 20, height: 11 },
      // Second stanza separated by larger vertical gap (> 1.8 * 14pt)
      { str: 'Ritornello:', x: 40, y: 660, width: 55, height: 12 },
    ]);

    expect(lines[0]).toBe('Strofa 1:');
    expect(lines[1]).toContain('Do');
    expect(lines[1]).toContain('Sol/Si');
    expect(lines[2]).toContain('Ecco il');
    expect(lines[2]).toContain('canto che');
    expect(lines).toContain('');
    expect(lines.at(-1)).toBe('Ritornello:');
  });

  vitestIt('extracts text-based PDF into ChordPro and cleans up pdfjs document', async () => {
    mockGetTextContent.mockResolvedValue({
      items: [
        { str: 'Titolo: Canto dal PDF', transform: [1, 0, 0, 12, 40, 760], width: 120, height: 12 },
        { str: 'Strofa 1:', transform: [1, 0, 0, 11, 40, 735], width: 48, height: 11 },
        { str: 'C', transform: [1, 0, 0, 11, 40, 718], width: 7, height: 11 },
        { str: 'G/B', transform: [1, 0, 0, 11, 88, 718], width: 18, height: 11 },
        { str: 'Ecco il', transform: [1, 0, 0, 11, 40, 704], width: 42, height: 11 },
        { str: 'canto', transform: [1, 0, 0, 11, 88, 704], width: 28, height: 11 },
      ],
    });

    const result = await importSongFromPdfArrayBuffer(makePdfBuffer(), {
      targetNotation: 'italian',
    });

    expect(result.detectedTitle).toBe('Canto dal PDF');
    expect(result.detectedChordLines).toBe(1);
    expect(result.chordpro).toContain('{start_of_verse: Strofa 1}');
    expect(result.chordpro).toContain('[Do]Ecco il [Sol/Si]canto');
    expect(mockCleanup).toHaveBeenCalledTimes(1);
  });

  vitestIt('throws SCANNED_PDF_NO_TEXT when PDF contains no selectable text layer', async () => {
    mockGetTextContent.mockResolvedValue({
      items: [{ str: '   ', transform: [1, 0, 0, 11, 40, 700], width: 0, height: 11 }],
    });

    await expect(importSongFromPdfArrayBuffer(makePdfBuffer())).rejects.toMatchObject({
      code: 'SCANNED_PDF_NO_TEXT',
    } satisfies Partial<PdfImportError>);
    expect(mockCleanup).toHaveBeenCalledTimes(1);
  });

  vitestIt('throws INVALID_PDF when buffer lacks %PDF- magic header', async () => {
    const invalidBuffer = new Uint8Array([0x50, 0x4b, 0x03, 0x04, 0x14]).buffer;

    await expect(importSongFromPdfArrayBuffer(invalidBuffer)).rejects.toMatchObject({
      code: 'INVALID_PDF',
    } satisfies Partial<PdfImportError>);
    expect(mockGetDocument).not.toHaveBeenCalled();
  });
});
