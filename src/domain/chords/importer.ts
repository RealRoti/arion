import { parseChord } from '@/domain/chords/parser';
import { formatChord, formatKey, parseKey } from '@/domain/chords/transposer';
import type {
  ChordProSectionType,
  ImportChordProOptions,
  PositionedChord,
  TextImportResult,
} from '@/domain/chords/types';

export type DocxImportErrorCode = 'LEGACY_DOC_UNSUPPORTED' | 'INVALID_DOCX' | 'EXTRACTION_FAILED';

export class DocxImportError extends Error {
  readonly code: DocxImportErrorCode;

  constructor(code: DocxImportErrorCode, message: string) {
    super(message);
    this.name = 'DocxImportError';
    this.code = code;
  }
}

const ITALIAN_FUNCTION_WORDS = new Set(['a', 'e', 'la', 'mi', 'si', 'do', 'fa', 're']);

const SECTION_END_DIRECTIVES: Record<
  Exclude<ChordProSectionType, 'generic'>,
  { start: string; end: string }
> = {
  verse: { start: 'start_of_verse', end: 'end_of_verse' },
  chorus: { start: 'start_of_chorus', end: 'end_of_chorus' },
  bridge: { start: 'start_of_bridge', end: 'end_of_bridge' },
  intro: { start: 'start_of_intro', end: 'end_of_intro' },
  outro: { start: 'start_of_outro', end: 'end_of_outro' },
};

function expandTabs(line: string): string {
  return line.replace(/\t/g, '    ');
}

interface DetectedSectionHeader {
  readonly type: Exclude<ChordProSectionType, 'generic'>;
  readonly label: string;
  readonly inlineRemainder: string;
}

function detectSectionHeader(rawLine: string): DetectedSectionHeader | null {
  const trimmed = rawLine.trim();
  if (!trimmed) {
    return null;
  }

  // Matches e.g. "[Strofa 1]", "[Ritornello]", "Strofa 1:", "Rit.", "Ritornello:", "Bridge:", "Intro: Do Sol"
  const bracketMatch = /^\[([a-zA-ZÀ-ÿ0-9\s._-]+)\]$/.exec(trimmed);
  const candidate = bracketMatch ? (bracketMatch[1] ?? '').trim() : trimmed;

  const colonIdx = candidate.indexOf(':');
  const head = colonIdx >= 0 ? candidate.slice(0, colonIdx).trim() : candidate;
  const remainder = colonIdx >= 0 ? candidate.slice(colonIdx + 1).trim() : '';

  if (colonIdx < 0 && !bracketMatch && candidate.split(/\s+/).length > 2) {
    return null;
  }

  const lowerHead = head.toLowerCase().replace(/\.$/, '');
  let type: Exclude<ChordProSectionType, 'generic'> | null = null;

  if (/^(strofa|verse|v|s)(\s*\d+)?$/i.test(lowerHead)) {
    type = 'verse';
  } else if (/^(ritornello|rit|coro|chorus|pre-?ritornello|refrain)(\s*\d+)?$/i.test(lowerHead)) {
    type = 'chorus';
  } else if (/^(ponte|bridge|special)(\s*\d+)?$/i.test(lowerHead)) {
    type = 'bridge';
  } else if (/^(intro|introduzione)(\s*\d+)?$/i.test(lowerHead)) {
    type = 'intro';
  } else if (/^(outro|finale|coda)(\s*\d+)?$/i.test(lowerHead)) {
    type = 'outro';
  }

  if (!type) {
    return null;
  }

  return {
    type,
    label: head.replace(/\.$/, ''),
    inlineRemainder: remainder,
  };
}

function isIgnorableChordLineSymbol(token: string): boolean {
  return (
    /^\|+$/.test(token) ||
    token === '|:' ||
    token === ':|' ||
    token === '/' ||
    token === '-' ||
    token === '–' ||
    token === '—' ||
    /^\(?x\d+\)?$/i.test(token) ||
    /^\(?\d+x\)?$/i.test(token)
  );
}

export function extractPositionedChords(rawLine: string): PositionedChord[] | null {
  const expanded = expandTabs(rawLine);
  const trimmed = expanded.trim();
  if (!trimmed || detectSectionHeader(expanded)) {
    return null;
  }

  // Already ChordPro format lines are not treated as plain chord-above-lyric lines
  if (/\[[^\]]+\]/.test(trimmed) || (trimmed.startsWith('{') && trimmed.endsWith('}'))) {
    return null;
  }

  const chords: PositionedChord[] = [];
  const tokenRegex = /\S+/g;

  for (const match of expanded.matchAll(tokenRegex)) {
    const token = match[0];
    const column = match.index ?? 0;

    if (isIgnorableChordLineSymbol(token)) {
      continue;
    }

    // Strip leading/trailing barlines or outer parentheses wrapping a single chord
    const stripped = token
      .replace(/^\|+/, '')
      .replace(/\|+$/, '')
      .replace(/^\((.+)\)$/, '$1');

    if (!stripped) {
      continue;
    }

    const parsed = parseChord(stripped, { strictSingleLetterCase: true });
    if (!parsed) {
      return null;
    }

    chords.push({
      column,
      raw: stripped,
      parsed,
    });
  }

  if (chords.length === 0) {
    return null;
  }

  // Reject single-spaced lowercase Italian lyric snippets such as "la fa" or "e mi"
  const hasMultiSpaceGap = /\s{2,}/.test(trimmed);
  if (
    !hasMultiSpaceGap &&
    chords.every((item) => ITALIAN_FUNCTION_WORDS.has(item.parsed.originalText))
  ) {
    return null;
  }

  return chords;
}

export function isChordLine(rawLine: string): boolean {
  return extractPositionedChords(rawLine) !== null;
}

function renderImportedChord(chord: PositionedChord, options?: ImportChordProOptions): string {
  if (options?.targetNotation) {
    return formatChord(
      chord.parsed,
      options.targetNotation,
      options.accidentalPreference ?? 'sharp',
    );
  }
  return chord.raw;
}

export function mergeChordAndLyricLine(
  chordLine: string,
  lyricLine: string,
  options?: ImportChordProOptions,
): string {
  const chords = extractPositionedChords(chordLine);
  if (!chords || chords.length === 0) {
    return lyricLine;
  }

  const expandedLyric = expandTabs(lyricLine);
  const inlineChords = chords.filter((item) => item.column <= expandedLyric.length);
  const trailingChords = chords.filter((item) => item.column > expandedLyric.length);

  let cursor = 0;
  let merged = '';

  for (const item of inlineChords) {
    if (item.column > cursor) {
      merged += expandedLyric.slice(cursor, item.column);
      cursor = item.column;
    }
    merged += `[${renderImportedChord(item, options)}]`;
  }

  merged += expandedLyric.slice(cursor);

  if (trailingChords.length > 0) {
    const renderedTrailing = trailingChords
      .map((item) => `[${renderImportedChord(item, options)}]`)
      .join(' ');
    if (merged.length > 0 && !merged.endsWith(' ')) {
      merged += ` ${renderedTrailing}`;
    } else {
      merged += renderedTrailing;
    }
  }

  return merged;
}

export function convertChordsAboveLyricsToChordPro(
  rawText: string,
  options?: ImportChordProOptions,
): TextImportResult {
  const normalized = rawText.replace(/\r\n?/g, '\n');
  const lines = normalized.split('\n');

  let detectedTitle: string | null = null;
  let detectedKey: string | null = null;
  let detectedChordLines = 0;
  const warnings: string[] = [];

  let activeSectionType: Exclude<ChordProSectionType, 'generic'> | null = null;
  const bodyLines: string[] = [];
  const headerLines: string[] = [];

  const closeActiveSection = () => {
    if (!activeSectionType) return;
    bodyLines.push(`{${SECTION_END_DIRECTIVES[activeSectionType].end}}`);
    activeSectionType = null;
  };

  let firstChordForKey: PositionedChord | null = null;

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i] ?? '';
    const trimmed = line.trim();

    if (trimmed === '') {
      if (bodyLines.length > 0 && bodyLines[bodyLines.length - 1] !== '') {
        bodyLines.push('');
      }
      continue;
    }

    // Check explicit metadata header lines (e.g. "Titolo: ...", "Tonalità: ...")
    const titleMetaMatch = /^(?:titolo|title)\s*:\s*(.+)$/i.exec(trimmed);
    if (titleMetaMatch && !detectedTitle) {
      detectedTitle = (titleMetaMatch[1] ?? '').trim();
      headerLines.push(`{title: ${detectedTitle}}`);
      continue;
    }

    const keyMetaMatch = /^(?:tonalit[aà]|key)\s*:\s*(.+)$/i.exec(trimmed);
    if (keyMetaMatch && !detectedKey) {
      const rawKey = (keyMetaMatch[1] ?? '').trim();
      const parsedKey = parseKey(rawKey);
      detectedKey = parsedKey ? formatKey(parsedKey, options?.targetNotation ?? 'italian') : rawKey;
      headerLines.push(`{key: ${detectedKey}}`);
      continue;
    }

    // Preserve already existing ChordPro directives
    if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
      const tMatch = /^\{(?:t|title)\s*:\s*(.+)\}$/i.exec(trimmed);
      if (tMatch) detectedTitle = (tMatch[1] ?? '').trim();
      const kMatch = /^\{key\s*:\s*(.+)\}$/i.exec(trimmed);
      if (kMatch) detectedKey = (kMatch[1] ?? '').trim();
      headerLines.push(trimmed);
      continue;
    }

    const sectionHeader = detectSectionHeader(line);
    if (sectionHeader) {
      closeActiveSection();
      activeSectionType = sectionHeader.type;
      bodyLines.push(
        `{${SECTION_END_DIRECTIVES[sectionHeader.type].start}: ${sectionHeader.label}}`,
      );

      if (sectionHeader.inlineRemainder) {
        const inlineChords = extractPositionedChords(sectionHeader.inlineRemainder);
        if (inlineChords) {
          detectedChordLines += 1;
          if (!firstChordForKey) firstChordForKey = inlineChords[0] ?? null;
          bodyLines.push(inlineChords.map((c) => `[${renderImportedChord(c, options)}]`).join(' '));
        } else {
          bodyLines.push(sectionHeader.inlineRemainder);
        }
      }
      continue;
    }

    const chords = extractPositionedChords(line);
    if (chords) {
      detectedChordLines += 1;
      if (!firstChordForKey) {
        firstChordForKey = chords[0] ?? null;
      }

      const nextLine = lines[i + 1];
      const nextTrimmed = nextLine?.trim() ?? '';
      const nextIsLyric =
        nextLine !== undefined &&
        nextTrimmed.length > 0 &&
        !isChordLine(nextLine) &&
        !detectSectionHeader(nextLine) &&
        !(nextTrimmed.startsWith('{') && nextTrimmed.endsWith('}'));

      if (nextIsLyric && nextLine !== undefined) {
        bodyLines.push(mergeChordAndLyricLine(line, nextLine, options));
        i += 1;
      } else {
        bodyLines.push(chords.map((c) => `[${renderImportedChord(c, options)}]`).join(' '));
      }
      continue;
    }

    bodyLines.push(trimmed);
  }

  closeActiveSection();

  if (!detectedKey && firstChordForKey) {
    const inferredNotation = options?.targetNotation ?? firstChordForKey.parsed.sourceNotation;
    const inferredSuffix = firstChordForKey.parsed.isMinor ? 'm' : '';
    detectedKey = `${formatChord(
      {
        ...firstChordForKey.parsed,
        suffix: inferredSuffix,
        bassPitch: null,
      },
      inferredNotation,
      options?.accidentalPreference ?? 'sharp',
    )}`;
  }

  if (detectedChordLines === 0) {
    warnings.push('no_chords_detected');
  }

  while (bodyLines[bodyLines.length - 1] === '') {
    bodyLines.pop();
  }

  const combined =
    headerLines.length > 0 && bodyLines.length > 0
      ? [...headerLines, '', ...bodyLines]
      : [...headerLines, ...bodyLines];

  return {
    chordpro: combined.join('\n').trim(),
    detectedTitle,
    detectedKey,
    detectedChordLines,
    warnings,
  };
}

function hasMagicBytes(bytes: Uint8Array, expected: readonly number[]): boolean {
  if (bytes.length < expected.length) {
    return false;
  }
  return expected.every((byte, idx) => bytes[idx] === byte);
}

export async function extractTextFromDocxArrayBuffer(
  buffer: ArrayBuffer,
  fileName?: string,
): Promise<string> {
  if (fileName && /\.doc$/i.test(fileName.trim())) {
    throw new DocxImportError(
      'LEGACY_DOC_UNSUPPORTED',
      'Legacy binary .doc files are not supported in browser. Convert to .docx or paste text.',
    );
  }

  const bytes = new Uint8Array(buffer);
  // OLE2 Compound Document signature (.doc pre-2007)
  if (hasMagicBytes(bytes, [0xd0, 0xcf, 0x11, 0xe0])) {
    throw new DocxImportError(
      'LEGACY_DOC_UNSUPPORTED',
      'Legacy binary .doc files are not supported in browser. Convert to .docx or paste text.',
    );
  }

  // PKZIP signature (.docx)
  if (!hasMagicBytes(bytes, [0x50, 0x4b, 0x03, 0x04])) {
    throw new DocxImportError('INVALID_DOCX', 'File is not a valid .docx archive.');
  }

  try {
    const mammoth = await import('mammoth');
    const maybeNodeBuffer = (globalThis as { Buffer?: { from: (data: ArrayBuffer) => Uint8Array } })
      .Buffer;
    const input = maybeNodeBuffer
      ? ({ arrayBuffer: buffer, buffer: maybeNodeBuffer.from(buffer) } as unknown as {
          arrayBuffer: ArrayBuffer;
        })
      : { arrayBuffer: buffer };
    const result = await mammoth.extractRawText(input);
    // Mammoth joins each Word <w:p> paragraph with \n\n; collapsing pairs restores 1-line chord/lyric adjacency while keeping blank <w:p> separators
    return result.value.replace(/\r\n?/g, '\n').replace(/\n\n/g, '\n');
  } catch (err) {
    if (err instanceof DocxImportError) {
      throw err;
    }
    throw new DocxImportError(
      'EXTRACTION_FAILED',
      err instanceof Error ? err.message : 'Failed to extract text from .docx file.',
    );
  }
}

export async function importSongFromDocxArrayBuffer(
  buffer: ArrayBuffer,
  fileName?: string,
  options?: ImportChordProOptions,
): Promise<TextImportResult> {
  const rawText = await extractTextFromDocxArrayBuffer(buffer, fileName);
  return convertChordsAboveLyricsToChordPro(rawText, options);
}
