import { formatChord, formatKey, getKeyAccidentalPreference } from '@/domain/chords/transposer';
import type {
  AccidentalPreference,
  ImportChordProOptions,
  MusicalKey,
  ParsedChord,
  PitchClass,
  TextImportResult,
} from '@/domain/chords/types';
import type { NotationSystem } from '@/domain/models/theme';

export type MusicXmlImportErrorCode =
  'FINALE_MUSX_UNSUPPORTED' | 'INVALID_MUSICXML' | 'EXTRACTION_FAILED';

export class MusicXmlImportError extends Error {
  readonly code: MusicXmlImportErrorCode;

  constructor(code: MusicXmlImportErrorCode, message: string) {
    super(message);
    this.name = 'MusicXmlImportError';
    this.code = code;
  }
}

const STEP_PITCH_MAP: Record<string, PitchClass> = {
  C: 0,
  D: 2,
  E: 4,
  F: 5,
  G: 7,
  A: 9,
  B: 11,
};

const MUSICXML_KIND_MAP: Record<string, { isMinor: boolean; suffix: string }> = {
  major: { isMinor: false, suffix: '' },
  minor: { isMinor: true, suffix: 'm' },
  dominant: { isMinor: false, suffix: '7' },
  'major-seventh': { isMinor: false, suffix: 'maj7' },
  'minor-seventh': { isMinor: true, suffix: 'm7' },
  'major-minor': { isMinor: true, suffix: 'mmaj7' },
  'minor-major': { isMinor: true, suffix: 'mmaj7' },
  diminished: { isMinor: false, suffix: 'dim' },
  'diminished-seventh': { isMinor: false, suffix: 'dim7' },
  'half-diminished': { isMinor: true, suffix: 'm7b5' },
  augmented: { isMinor: false, suffix: 'aug' },
  'augmented-seventh': { isMinor: false, suffix: 'aug7' },
  'suspended-fourth': { isMinor: false, suffix: 'sus4' },
  'suspended-second': { isMinor: false, suffix: 'sus2' },
  power: { isMinor: false, suffix: '5' },
  'major-sixth': { isMinor: false, suffix: '6' },
  'minor-sixth': { isMinor: true, suffix: 'm6' },
  'dominant-ninth': { isMinor: false, suffix: '9' },
  'major-ninth': { isMinor: false, suffix: 'maj9' },
  'minor-ninth': { isMinor: true, suffix: 'm9' },
  'dominant-11th': { isMinor: false, suffix: '11' },
  'minor-11th': { isMinor: true, suffix: 'm11' },
  'dominant-13th': { isMinor: false, suffix: '13' },
  'major-13th': { isMinor: false, suffix: 'maj13' },
  'minor-13th': { isMinor: true, suffix: 'm13' },
  none: { isMinor: false, suffix: '' },
};

function mod12(value: number): PitchClass {
  return (((value % 12) + 12) % 12) as PitchClass;
}

function hasMagicBytes(bytes: Uint8Array, expected: readonly number[]): boolean {
  if (bytes.length < expected.length) {
    return false;
  }
  return expected.every((byte, idx) => bytes[idx] === byte);
}

function getDirectChildText(parent: Element | null | undefined, tagName: string): string | null {
  if (!parent) return null;
  for (const child of Array.from(parent.children)) {
    if (child.tagName === tagName) {
      const value = child.textContent?.trim();
      if (value) return value;
    }
  }
  return null;
}

function getFirstDescendantText(root: Element, tagName: string): string | null {
  const el = root.getElementsByTagName(tagName)[0];
  const value = el?.textContent?.trim();
  return value && value.length > 0 ? value : null;
}

function parseStepAndAlter(stepRaw: string | null, alterRaw: string | null): PitchClass | null {
  if (!stepRaw) return null;
  const basePitch = STEP_PITCH_MAP[stepRaw.trim().toUpperCase()];
  if (basePitch === undefined) return null;
  const alter = alterRaw ? Number.parseInt(alterRaw, 10) : 0;
  return mod12(basePitch + (Number.isNaN(alter) ? 0 : alter));
}

function keyFromFifths(fifthsRaw: string | null, modeRaw: string | null): MusicalKey | null {
  if (!fifthsRaw) return null;
  const fifths = Number.parseInt(fifthsRaw, 10);
  if (Number.isNaN(fifths)) return null;
  const isMinor = modeRaw?.trim().toLowerCase() === 'minor';
  const rootPitch = mod12(fifths * 7 + (isMinor ? 9 : 0));
  const accidentalPreference: AccidentalPreference =
    fifths < 0 ? 'flat' : fifths > 0 ? 'sharp' : getKeyAccidentalPreference(rootPitch, isMinor);

  return {
    rootPitch,
    isMinor,
    accidentalPreference,
  };
}

function parseHarmonyElement(harmonyEl: Element): ParsedChord | null {
  const rootEl = harmonyEl.getElementsByTagName('root')[0];
  const rootStep = getDirectChildText(rootEl, 'root-step');
  const rootAlter = getDirectChildText(rootEl, 'root-alter');
  const rootPitch = parseStepAndAlter(rootStep, rootAlter);
  if (rootPitch === null) {
    return null;
  }

  const kindEl = harmonyEl.getElementsByTagName('kind')[0];
  const kindText = kindEl?.textContent?.trim().toLowerCase() ?? 'major';
  const kindInfo = MUSICXML_KIND_MAP[kindText] ?? { isMinor: false, suffix: '' };

  const { isMinor } = kindInfo;
  let { suffix } = kindInfo;

  // Handle MusicXML <degree> adjustments commonly emitted by Finale (e.g. add9, 7sus4)
  const degreeEls = Array.from(harmonyEl.getElementsByTagName('degree'));
  for (const degreeEl of degreeEls) {
    const val = getDirectChildText(degreeEl, 'degree-value');
    const alter = getDirectChildText(degreeEl, 'degree-alter');
    const type = getDirectChildText(degreeEl, 'degree-type')?.toLowerCase();
    if (val === '9' && (!alter || alter === '0') && type === 'add') {
      if (suffix === '') suffix = 'add9';
      else if (suffix === 'm') suffix = 'madd9';
    } else if (val === '4' && type === 'add' && suffix === '7') {
      suffix = '7sus4';
    }
  }

  const bassEl = harmonyEl.getElementsByTagName('bass')[0];
  const bassPitch = bassEl
    ? parseStepAndAlter(
        getDirectChildText(bassEl, 'bass-step'),
        getDirectChildText(bassEl, 'bass-alter'),
      )
    : null;

  return {
    rootPitch,
    isMinor,
    suffix,
    bassPitch,
    sourceNotation: 'english',
    originalText: `${rootStep ?? ''}${kindText}`,
  };
}

interface VerseBuffer {
  lines: string[];
  currentLine: string;
  inWord: boolean;
  chordLinesCount: number;
  currentLineHasChord: boolean;
}

function createVerseBuffer(): VerseBuffer {
  return {
    lines: [],
    currentLine: '',
    inWord: false,
    chordLinesCount: 0,
    currentLineHasChord: false,
  };
}

function flushVerseLine(verse: VerseBuffer): void {
  const trimmed = verse.currentLine.trim();
  if (trimmed.length > 0) {
    verse.lines.push(trimmed);
    if (verse.currentLineHasChord) {
      verse.chordLinesCount += 1;
    }
  }
  verse.currentLine = '';
  verse.inWord = false;
  verse.currentLineHasChord = false;
}

function appendSyllableToVerse(
  verse: VerseBuffer,
  chordTags: readonly string[],
  syllableText: string,
  syllabic: string,
): void {
  if (!verse.inWord && verse.currentLine.length > 0 && !verse.currentLine.endsWith(' ')) {
    verse.currentLine += ' ';
  }
  if (chordTags.length > 0) {
    verse.currentLine += chordTags.map((chord) => `[${chord}]`).join(' ');
    verse.currentLineHasChord = true;
  }
  verse.currentLine += syllableText;
  verse.inWord = syllabic === 'begin' || syllabic === 'middle';
}

function flushTrailingChordsToVerse(verse: VerseBuffer, chordTags: readonly string[]): void {
  if (chordTags.length === 0) return;
  if (verse.currentLine.length > 0 && !verse.currentLine.endsWith(' ')) {
    verse.currentLine += ' ';
  }
  verse.currentLine += chordTags.map((chord) => `[${chord}]`).join(' ');
  verse.inWord = false;
  verse.currentLineHasChord = true;
}

function extractLyricText(lyricEl: Element): string {
  const textEls = Array.from(lyricEl.getElementsByTagName('text'));
  if (textEls.length === 0) {
    return '';
  }
  return textEls.map((el) => el.textContent ?? '').join('');
}

export function parseMusicXmlToChordPro(
  xmlText: string,
  options?: ImportChordProOptions,
): TextImportResult {
  const cleanedXml = xmlText.replace(/^\uFEFF/, '').trim();
  if (!cleanedXml) {
    throw new MusicXmlImportError('INVALID_MUSICXML', 'Empty MusicXML content.');
  }

  const doc = new DOMParser().parseFromString(cleanedXml, 'application/xml');
  if (doc.getElementsByTagName('parsererror').length > 0) {
    throw new MusicXmlImportError('INVALID_MUSICXML', 'Malformed MusicXML document.');
  }

  const root = doc.documentElement;
  if (root.tagName !== 'score-partwise' && root.tagName !== 'score-timewise') {
    throw new MusicXmlImportError(
      'INVALID_MUSICXML',
      `Unexpected MusicXML root element: ${root.tagName}`,
    );
  }

  const targetNotation: NotationSystem = options?.targetNotation ?? 'italian';

  const detectedTitle =
    getFirstDescendantText(root, 'work-title') ??
    getFirstDescendantText(root, 'movement-title') ??
    null;

  let detectedAuthor: string | null = null;
  const creators = Array.from(root.getElementsByTagName('creator'));
  const composer = creators.find((el) => el.getAttribute('type') === 'composer') ?? creators[0];
  if (composer?.textContent?.trim()) {
    detectedAuthor = composer.textContent.trim();
  }

  const firstKeyEl = root.getElementsByTagName('key')[0];
  const musicalKey = firstKeyEl
    ? keyFromFifths(
        getDirectChildText(firstKeyEl, 'fifths'),
        getDirectChildText(firstKeyEl, 'mode'),
      )
    : null;
  const detectedKey = musicalKey ? formatKey(musicalKey, targetNotation) : null;
  const accidentalPreference: AccidentalPreference =
    options?.accidentalPreference ?? musicalKey?.accidentalPreference ?? 'sharp';

  const firstTimeEl = root.getElementsByTagName('time')[0];
  const beats = getDirectChildText(firstTimeEl, 'beats');
  const beatType = getDirectChildText(firstTimeEl, 'beat-type');
  const detectedTimeSignature = beats && beatType ? `${beats}/${beatType}` : null;

  let detectedTempoBpm: number | null = null;
  const soundEl = Array.from(root.getElementsByTagName('sound')).find((el) =>
    el.hasAttribute('tempo'),
  );
  const rawTempo =
    soundEl?.getAttribute('tempo') ?? getFirstDescendantText(root, 'per-minute') ?? null;
  if (rawTempo) {
    const parsedTempo = Math.round(Number.parseFloat(rawTempo));
    if (!Number.isNaN(parsedTempo) && parsedTempo >= 20 && parsedTempo <= 300) {
      detectedTempoBpm = parsedTempo;
    }
  }

  const parts = Array.from(root.children).filter((child) => child.tagName === 'part');
  let lyricPart = parts[0] ?? null;
  let bestLyricCount = -1;
  for (const part of parts) {
    const count = part.getElementsByTagName('lyric').length;
    if (count > bestLyricCount) {
      bestLyricCount = count;
      lyricPart = part;
    }
  }

  const lyricPartHasHarmony = (lyricPart?.getElementsByTagName('harmony').length ?? 0) > 0;
  const harmonyFallbackPart = lyricPartHasHarmony
    ? lyricPart
    : (parts.find((part) => part.getElementsByTagName('harmony').length > 0) ?? lyricPart);

  const lyricMeasures = lyricPart
    ? Array.from(lyricPart.children).filter((el) => el.tagName === 'measure')
    : [];
  const harmonyFallbackMeasures = harmonyFallbackPart
    ? Array.from(harmonyFallbackPart.children).filter((el) => el.tagName === 'measure')
    : [];

  const hasExplicitPrintBreaks = Boolean(
    lyricPart &&
    Array.from(lyricPart.getElementsByTagName('print')).some(
      (p) => p.getAttribute('new-system') === 'yes' || p.getAttribute('new-page') === 'yes',
    ),
  );

  // Discover all verse numbers first so multi-verse stanzas stay complete
  const verseOrder: string[] = [];
  if (lyricPart) {
    for (const lyricEl of Array.from(lyricPart.getElementsByTagName('lyric'))) {
      const num = lyricEl.getAttribute('number')?.trim() || '1';
      if (!verseOrder.includes(num)) {
        verseOrder.push(num);
      }
    }
  }

  const verses = new Map<string, VerseBuffer>();
  if (verseOrder.length > 0) {
    for (const num of verseOrder) {
      verses.set(num, createVerseBuffer());
    }
  } else {
    verses.set('chords', createVerseBuffer());
  }

  const formatParsedHarmony = (harmonyEl: Element): string | null => {
    const parsed = parseHarmonyElement(harmonyEl);
    return parsed ? formatChord(parsed, targetNotation, accidentalPreference) : null;
  };

  for (let mIdx = 0; mIdx < lyricMeasures.length; mIdx += 1) {
    const measure = lyricMeasures[mIdx];
    if (!measure) continue;

    let pendingChords: string[] = [];

    // If harmony lives on a separate accompaniment part, preload measure's harmonies
    if (harmonyFallbackPart && harmonyFallbackPart !== lyricPart) {
      const hMeasure = harmonyFallbackMeasures[mIdx];
      if (hMeasure) {
        for (const child of Array.from(hMeasure.children)) {
          if (child.tagName === 'harmony') {
            const formatted = formatParsedHarmony(child);
            if (formatted) pendingChords.push(formatted);
          }
        }
      }
    }

    for (const child of Array.from(measure.children)) {
      if (child.tagName === 'print') {
        const isLineBreak =
          child.getAttribute('new-system') === 'yes' || child.getAttribute('new-page') === 'yes';
        if (isLineBreak) {
          for (const verse of verses.values()) {
            flushTrailingChordsToVerse(verse, pendingChords);
            flushVerseLine(verse);
          }
          pendingChords = [];
        }
        continue;
      }

      if (child.tagName === 'harmony') {
        const formatted = formatParsedHarmony(child);
        if (formatted) {
          pendingChords.push(formatted);
        }
        continue;
      }

      if (child.tagName === 'note') {
        const isChordTone = child.getElementsByTagName('chord').length > 0;
        if (isChordTone) continue;

        const lyricEls = Array.from(child.children).filter((el) => el.tagName === 'lyric');
        if (lyricEls.length === 0) {
          continue;
        }

        const matchedVerses = new Set<string>();
        for (const lyricEl of lyricEls) {
          const vNum = lyricEl.getAttribute('number')?.trim() || '1';
          const verse = verses.get(vNum);
          if (!verse) continue;
          const syllabic = getDirectChildText(lyricEl, 'syllabic') ?? 'single';
          const text = extractLyricText(lyricEl);
          if (text.length > 0) {
            appendSyllableToVerse(verse, pendingChords, text, syllabic);
            matchedVerses.add(vNum);
          }
        }

        if (matchedVerses.size > 0) {
          pendingChords = [];
        }
      }
    }

    if (pendingChords.length > 0) {
      for (const verse of verses.values()) {
        flushTrailingChordsToVerse(verse, pendingChords);
      }
    }

    if (!hasExplicitPrintBreaks && (mIdx + 1) % 4 === 0) {
      for (const verse of verses.values()) {
        flushVerseLine(verse);
      }
    }
  }

  for (const verse of verses.values()) {
    flushVerseLine(verse);
  }

  const headerLines: string[] = [];
  if (detectedTitle) {
    headerLines.push(`{title: ${detectedTitle}}`);
  }
  if (detectedKey) {
    headerLines.push(`{key: ${detectedKey}}`);
  }

  const bodyBlocks: string[] = [];
  let totalChordLines = 0;
  const nonEmptyVerses = Array.from(verses.entries()).filter(
    ([, buffer]) => buffer.lines.length > 0,
  );

  for (const [vNum, buffer] of nonEmptyVerses) {
    totalChordLines += buffer.chordLinesCount;
    if (nonEmptyVerses.length > 1 && vNum !== 'chords') {
      const label = /^\d+$/.test(vNum) ? `Strofa ${vNum}` : vNum;
      bodyBlocks.push([`{start_of_verse: ${label}}`, ...buffer.lines, '{end_of_verse}'].join('\n'));
    } else {
      bodyBlocks.push(buffer.lines.join('\n'));
    }
  }

  const partsCombined = [
    ...(headerLines.length > 0 ? [headerLines.join('\n')] : []),
    ...(bodyBlocks.length > 0 ? [bodyBlocks.join('\n\n')] : []),
  ];

  const warnings: string[] = [];
  if (totalChordLines === 0) {
    warnings.push('no_chords_detected');
  }

  return {
    chordpro: partsCombined.join('\n\n').trim(),
    detectedTitle,
    detectedKey,
    detectedChordLines: totalChordLines,
    detectedAuthor,
    detectedTimeSignature,
    detectedTempoBpm,
    warnings,
  };
}

export async function importSongFromMusicXmlArrayBuffer(
  buffer: ArrayBuffer,
  fileName?: string,
  options?: ImportChordProOptions,
): Promise<TextImportResult> {
  if (fileName && /\.musx$/i.test(fileName.trim())) {
    throw new MusicXmlImportError(
      'FINALE_MUSX_UNSUPPORTED',
      'Proprietary Finale .musx binary files cannot be read directly in browser.',
    );
  }

  const bytes = new Uint8Array(buffer);

  // Compressed MusicXML (.mxl) or Finale .musx renamed to another extension uses PKZIP
  if (hasMagicBytes(bytes, [0x50, 0x4b, 0x03, 0x04])) {
    try {
      const { default: JSZip } = await import('jszip');
      const zip = await JSZip.loadAsync(buffer);
      const entryNames = Object.keys(zip.files).filter((name) => !zip.files[name]?.dir);

      let scorePath: string | null = null;
      const containerEntry = zip.file('META-INF/container.xml');
      if (containerEntry) {
        const containerXml = await containerEntry.async('string');
        const containerDoc = new DOMParser().parseFromString(containerXml, 'application/xml');
        const rootfileEl = containerDoc.getElementsByTagName('rootfile')[0];
        const fullPath = rootfileEl?.getAttribute('full-path')?.trim();
        if (fullPath && zip.file(fullPath)) {
          scorePath = fullPath;
        }
      }

      if (!scorePath) {
        scorePath =
          entryNames.find(
            (name) => !name.startsWith('META-INF/') && /\.(musicxml|xml)$/i.test(name),
          ) ?? null;
      }

      if (!scorePath) {
        if (entryNames.some((name) => /(^|\/)score\.dat$/i.test(name))) {
          throw new MusicXmlImportError(
            'FINALE_MUSX_UNSUPPORTED',
            'Detected Finale .musx score.dat container.',
          );
        }
        throw new MusicXmlImportError(
          'INVALID_MUSICXML',
          'No MusicXML score found inside .mxl archive.',
        );
      }

      const scoreEntry = zip.file(scorePath);
      if (!scoreEntry) {
        throw new MusicXmlImportError('INVALID_MUSICXML', 'Missing rootfile inside .mxl archive.');
      }

      const xmlText = await scoreEntry.async('string');
      return parseMusicXmlToChordPro(xmlText, options);
    } catch (err) {
      if (err instanceof MusicXmlImportError) {
        throw err;
      }
      throw new MusicXmlImportError(
        'EXTRACTION_FAILED',
        err instanceof Error ? err.message : 'Failed to extract .mxl MusicXML archive.',
      );
    }
  }

  try {
    const xmlText = new TextDecoder('utf-8').decode(bytes);
    return parseMusicXmlToChordPro(xmlText, options);
  } catch (err) {
    if (err instanceof MusicXmlImportError) {
      throw err;
    }
    throw new MusicXmlImportError(
      'EXTRACTION_FAILED',
      err instanceof Error ? err.message : 'Failed to parse MusicXML file.',
    );
  }
}
