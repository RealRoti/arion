import { describe, expect, it as vitestIt } from 'vitest';
import {
  convertChordsAboveLyricsToChordPro,
  DocxImportError,
  extractPositionedChords,
  importSongFromDocxArrayBuffer,
  isChordLine,
  mergeChordAndLyricLine,
} from '@/domain/chords/importer';

function buildMinimalDocxArrayBuffer(documentTextParagraphs: readonly string[]): ArrayBuffer {
  const encoder = new TextEncoder();

  const crcTable = new Uint32Array(256);
  for (let i = 0; i < 256; i += 1) {
    let c = i;
    for (let k = 0; k < 8; k += 1) {
      c = (c & 1) !== 0 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    crcTable[i] = c >>> 0;
  }

  const crc32 = (bytes: Uint8Array): number => {
    let crc = 0xffffffff;
    for (const byte of bytes) {
      crc = (crcTable[(crc ^ byte) & 0xff] ?? 0) ^ (crc >>> 8);
    }
    return (crc ^ 0xffffffff) >>> 0;
  };

  const escapeXml = (text: string) =>
    text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  const paragraphsXml = documentTextParagraphs
    .map((line) => `<w:p><w:r><w:t xml:space="preserve">${escapeXml(line)}</w:t></w:r></w:p>`)
    .join('');

  const files: Array<{ name: string; content: Uint8Array }> = [
    {
      name: '[Content_Types].xml',
      content: encoder.encode(
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
          '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
          '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' +
          '<Default Extension="xml" ContentType="application/xml"/>' +
          '<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>' +
          '</Types>',
      ),
    },
    {
      name: '_rels/.rels',
      content: encoder.encode(
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
          '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
          '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>' +
          '</Relationships>',
      ),
    },
    {
      name: 'word/document.xml',
      content: encoder.encode(
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
          '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">' +
          `<w:body>${paragraphsXml}</w:body></w:document>`,
      ),
    },
  ];

  const localChunks: Uint8Array[] = [];
  const centralChunks: Uint8Array[] = [];
  let offset = 0;

  for (const file of files) {
    const nameBytes = encoder.encode(file.name);
    const data = file.content;
    const sum = crc32(data);

    const localHeader = new Uint8Array(30 + nameBytes.length);
    const lv = new DataView(localHeader.buffer);
    lv.setUint32(0, 0x04034b50, true);
    lv.setUint16(4, 20, true);
    lv.setUint16(6, 0, true);
    lv.setUint16(8, 0, true);
    lv.setUint16(10, 0, true);
    lv.setUint16(12, 0, true);
    lv.setUint32(14, sum, true);
    lv.setUint32(18, data.length, true);
    lv.setUint32(22, data.length, true);
    lv.setUint16(26, nameBytes.length, true);
    lv.setUint16(28, 0, true);
    localHeader.set(nameBytes, 30);

    const centralHeader = new Uint8Array(46 + nameBytes.length);
    const cv = new DataView(centralHeader.buffer);
    cv.setUint32(0, 0x02014b50, true);
    cv.setUint16(4, 20, true);
    cv.setUint16(6, 20, true);
    cv.setUint16(8, 0, true);
    cv.setUint16(10, 0, true);
    cv.setUint16(12, 0, true);
    cv.setUint16(14, 0, true);
    cv.setUint32(16, sum, true);
    cv.setUint32(20, data.length, true);
    cv.setUint32(24, data.length, true);
    cv.setUint16(28, nameBytes.length, true);
    cv.setUint16(30, 0, true);
    cv.setUint16(32, 0, true);
    cv.setUint16(34, 0, true);
    cv.setUint16(36, 0, true);
    cv.setUint32(38, 0, true);
    cv.setUint32(42, offset, true);
    centralHeader.set(nameBytes, 46);

    localChunks.push(localHeader, data);
    centralChunks.push(centralHeader);
    offset += localHeader.length + data.length;
  }

  const centralSize = centralChunks.reduce((acc, c) => acc + c.length, 0);
  const eocd = new Uint8Array(22);
  const ev = new DataView(eocd.buffer);
  ev.setUint32(0, 0x06054b50, true);
  ev.setUint16(4, 0, true);
  ev.setUint16(6, 0, true);
  ev.setUint16(8, files.length, true);
  ev.setUint16(10, files.length, true);
  ev.setUint32(12, centralSize, true);
  ev.setUint32(16, offset, true);
  ev.setUint16(20, 0, true);

  const totalSize = offset + centralSize + eocd.length;
  const output = new Uint8Array(totalSize);
  let pos = 0;
  for (const chunk of [...localChunks, ...centralChunks, eocd]) {
    output.set(chunk, pos);
    pos += chunk.length;
  }
  return output.buffer;
}

describe('ChordPro importer & docx extraction', () => {
  vitestIt('detects true chord lines and rejects Italian lyric lines', () => {
    expect(isChordLine('Do      Sol/Si   Lam     Fa')).toBe(true);
    expect(isChordLine('G  D/F#  Em7  Cadd9')).toBe(true);
    expect(isChordLine('| Do | Sol | Lam7 | Fa |')).toBe(true);

    expect(isChordLine('E la luce che fa')).toBe(false);
    expect(isChordLine('A te la gloria')).toBe(false);
    expect(isChordLine('la fa')).toBe(false);
    expect(isChordLine('Mi ricordo ancora')).toBe(false);
    expect(isChordLine('Strofa 1:')).toBe(false);

    const positioned = extractPositionedChords('Do     Sol');
    expect(positioned?.[0]?.column).toBe(0);
    expect(positioned?.[1]?.column).toBe(7);
  });

  vitestIt('merges chords-above-lyrics columns accurately including trailing chords', () => {
    const merged = mergeChordAndLyricLine(
      'Do      Sol/Si  Lam           Fa7+',
      'Ecco il canto   che sale nel  cielo    ',
    );
    expect(merged).toContain('[Do]Ecco il [Sol/Si]canto');
    expect(merged).toContain('[Lam]che sale');

    const trailingMerged = mergeChordAndLyricLine('Do                 Sol', 'Canto breve');
    expect(trailingMerged).toBe('[Do]Canto breve [Sol]');
  });

  vitestIt('converts mixed web text with sections, metadata and Italian/English chords', () => {
    const mixedInput = `Titolo: Canto di Luce
Intro: Do  Sol  Am  F

Strofa 1:
C      G/B     Am7   Fadd9
Camminiamo insieme con gioia
Dm7        G4      C
verso la   casa di pace

Rit.
Sol    Re     Mim   Do7+
Ecco   il     giorno nuovo`;

    const result = convertChordsAboveLyricsToChordPro(mixedInput, {
      targetNotation: 'italian',
      accidentalPreference: 'sharp',
    });

    expect(result.detectedTitle).toBe('Canto di Luce');
    expect(result.detectedChordLines).toBe(4);
    expect(result.warnings).toEqual([]);
    expect(result.chordpro).toContain('{title: Canto di Luce}');
    expect(result.chordpro).toContain('{start_of_intro: Intro}');
    expect(result.chordpro).toContain('[Do] [Sol] [Lam] [Fa]');
    expect(result.chordpro).toContain('{start_of_verse: Strofa 1}');
    expect(result.chordpro).toContain('[Do]Cammini[Sol/Si]amo');
    expect(result.chordpro).toContain('{start_of_chorus: Rit}');
    expect(result.chordpro).toContain('[Sol]Ecco');
    expect(result.chordpro).toContain('{end_of_chorus}');
  });

  vitestIt('extracts and converts a valid .docx buffer using mammoth', async () => {
    const docxBuffer = buildMinimalDocxArrayBuffer([
      'Titolo: Inno di Prova',
      'Strofa 1:',
      'Do      Sol',
      'Ecco il canto',
    ]);

    const imported = await importSongFromDocxArrayBuffer(docxBuffer, 'canto.docx', {
      targetNotation: 'italian',
    });

    expect(imported.detectedTitle).toBe('Inno di Prova');
    expect(imported.chordpro).toContain('{start_of_verse: Strofa 1}');
    expect(imported.chordpro).toContain('[Do]Ecco il [Sol]canto');
  });

  vitestIt('rejects legacy binary .doc files and corrupted buffers clearly', async () => {
    const ole2Header = new Uint8Array([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]).buffer;
    await expect(importSongFromDocxArrayBuffer(ole2Header, 'vecchio.doc')).rejects.toMatchObject({
      code: 'LEGACY_DOC_UNSUPPORTED',
    } satisfies Partial<DocxImportError>);

    const garbage = new Uint8Array([1, 2, 3, 4, 5]).buffer;
    await expect(importSongFromDocxArrayBuffer(garbage, 'corrotto.docx')).rejects.toMatchObject({
      code: 'INVALID_DOCX',
    } satisfies Partial<DocxImportError>);
  });
});
