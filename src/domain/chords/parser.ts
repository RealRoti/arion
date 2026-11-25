import type { ParsedChord, PitchClass } from '@/domain/chords/types';
import type { NotationSystem } from '@/domain/models/theme';

export interface ParseChordOptions {
  readonly strictSingleLetterCase?: boolean;
}

export interface ParsedRootResult {
  readonly pitch: PitchClass;
  readonly notation: NotationSystem;
  readonly accidental?: 'sharp' | 'flat';
}

interface RootCandidate {
  readonly pattern: string;
  readonly pitch: PitchClass;
}

const ITALIAN_ROOT_BASES: readonly RootCandidate[] = [
  { pattern: 'sol', pitch: 7 },
  { pattern: 'do', pitch: 0 },
  { pattern: 're', pitch: 2 },
  { pattern: 'mi', pitch: 4 },
  { pattern: 'fa', pitch: 5 },
  { pattern: 'la', pitch: 9 },
  { pattern: 'si', pitch: 11 },
];

const ENGLISH_ROOT_BASES: Record<string, PitchClass> = {
  C: 0,
  D: 2,
  E: 4,
  F: 5,
  G: 7,
  A: 9,
  B: 11,
};

interface SuffixNormalization {
  readonly isMinor: boolean;
  readonly suffix: string;
}

const EXACT_SUFFIX_MAP: Record<string, SuffixNormalization> = {
  '': { isMinor: false, suffix: '' },
  maj: { isMinor: false, suffix: '' },
  m: { isMinor: true, suffix: 'm' },
  '-': { isMinor: true, suffix: 'm' },
  min: { isMinor: true, suffix: 'm' },
  maj7: { isMinor: false, suffix: 'maj7' },
  '7+': { isMinor: false, suffix: 'maj7' },
  M7: { isMinor: false, suffix: 'maj7' },
  j7: { isMinor: false, suffix: 'maj7' },
  Δ: { isMinor: false, suffix: 'maj7' },
  Δ7: { isMinor: false, suffix: 'maj7' },
  m7: { isMinor: true, suffix: 'm7' },
  '-7': { isMinor: true, suffix: 'm7' },
  min7: { isMinor: true, suffix: 'm7' },
  mmaj7: { isMinor: true, suffix: 'mmaj7' },
  'm(maj7)': { isMinor: true, suffix: 'mmaj7' },
  'm7+': { isMinor: true, suffix: 'mmaj7' },
  '-7+': { isMinor: true, suffix: 'mmaj7' },
  minmaj7: { isMinor: true, suffix: 'mmaj7' },
  mΔ: { isMinor: true, suffix: 'mmaj7' },
  mΔ7: { isMinor: true, suffix: 'mmaj7' },
  '7': { isMinor: false, suffix: '7' },
  sus4: { isMinor: false, suffix: 'sus4' },
  '4': { isMinor: false, suffix: 'sus4' },
  sus: { isMinor: false, suffix: 'sus4' },
  sus2: { isMinor: false, suffix: 'sus2' },
  '2': { isMinor: false, suffix: 'sus2' },
  '7sus4': { isMinor: false, suffix: '7sus4' },
  '7/4': { isMinor: false, suffix: '7sus4' },
  '74': { isMinor: false, suffix: '7sus4' },
  '7sus': { isMinor: false, suffix: '7sus4' },
  dim: { isMinor: false, suffix: 'dim' },
  '°': { isMinor: false, suffix: 'dim' },
  dim7: { isMinor: false, suffix: 'dim7' },
  '°7': { isMinor: false, suffix: 'dim7' },
  m7b5: { isMinor: true, suffix: 'm7b5' },
  'm7-5': { isMinor: true, suffix: 'm7b5' },
  'm7/5-': { isMinor: true, suffix: 'm7b5' },
  '-7b5': { isMinor: true, suffix: 'm7b5' },
  '-7-5': { isMinor: true, suffix: 'm7b5' },
  '-7/5-': { isMinor: true, suffix: 'm7b5' },
  ø: { isMinor: true, suffix: 'm7b5' },
  ø7: { isMinor: true, suffix: 'm7b5' },
  '7b5': { isMinor: false, suffix: '7b5' },
  '7-5': { isMinor: false, suffix: '7b5' },
  '7/5-': { isMinor: false, suffix: '7b5' },
  aug: { isMinor: false, suffix: 'aug' },
  '+': { isMinor: false, suffix: 'aug' },
  aug7: { isMinor: false, suffix: 'aug7' },
  '+7': { isMinor: false, suffix: 'aug7' },
  '7#5': { isMinor: false, suffix: 'aug7' },
  '7+5': { isMinor: false, suffix: 'aug7' },
  '5': { isMinor: false, suffix: '5' },
  '6': { isMinor: false, suffix: '6' },
  m6: { isMinor: true, suffix: 'm6' },
  '-6': { isMinor: true, suffix: 'm6' },
  min6: { isMinor: true, suffix: 'm6' },
  '6/9': { isMinor: false, suffix: '6/9' },
  '69': { isMinor: false, suffix: '6/9' },
  '9': { isMinor: false, suffix: '9' },
  m9: { isMinor: true, suffix: 'm9' },
  '-9': { isMinor: true, suffix: 'm9' },
  min9: { isMinor: true, suffix: 'm9' },
  maj9: { isMinor: false, suffix: 'maj9' },
  M9: { isMinor: false, suffix: 'maj9' },
  '9+': { isMinor: false, suffix: 'maj9' },
  Δ9: { isMinor: false, suffix: 'maj9' },
  add9: { isMinor: false, suffix: 'add9' },
  '(add9)': { isMinor: false, suffix: 'add9' },
  madd9: { isMinor: true, suffix: 'madd9' },
  '-add9': { isMinor: true, suffix: 'madd9' },
  add2: { isMinor: false, suffix: 'add2' },
  add4: { isMinor: false, suffix: 'add4' },
  '11': { isMinor: false, suffix: '11' },
  m11: { isMinor: true, suffix: 'm11' },
  '-11': { isMinor: true, suffix: 'm11' },
  '13': { isMinor: false, suffix: '13' },
  m13: { isMinor: true, suffix: 'm13' },
  '-13': { isMinor: true, suffix: 'm13' },
  maj13: { isMinor: false, suffix: 'maj13' },
  M13: { isMinor: false, suffix: 'maj13' },
  '7b9': { isMinor: false, suffix: '7b9' },
  '7-9': { isMinor: false, suffix: '7b9' },
  '7#9': { isMinor: false, suffix: '7#9' },
  '7+9': { isMinor: false, suffix: '7#9' },
  '7#11': { isMinor: false, suffix: '7#11' },
  '7+11': { isMinor: false, suffix: '7#11' },
  '7b13': { isMinor: false, suffix: '7b13' },
  '7-13': { isMinor: false, suffix: '7b13' },
};

const CASE_INSENSITIVE_SUFFIX_MAP: Record<string, SuffixNormalization> = {
  maj: { isMinor: false, suffix: '' },
  maj7: { isMinor: false, suffix: 'maj7' },
  min: { isMinor: true, suffix: 'm' },
  min7: { isMinor: true, suffix: 'm7' },
  mmaj7: { isMinor: true, suffix: 'mmaj7' },
  minmaj7: { isMinor: true, suffix: 'mmaj7' },
  sus4: { isMinor: false, suffix: 'sus4' },
  sus: { isMinor: false, suffix: 'sus4' },
  sus2: { isMinor: false, suffix: 'sus2' },
  '7sus4': { isMinor: false, suffix: '7sus4' },
  '7sus': { isMinor: false, suffix: '7sus4' },
  dim: { isMinor: false, suffix: 'dim' },
  dim7: { isMinor: false, suffix: 'dim7' },
  m7b5: { isMinor: true, suffix: 'm7b5' },
  '7b5': { isMinor: false, suffix: '7b5' },
  aug: { isMinor: false, suffix: 'aug' },
  aug7: { isMinor: false, suffix: 'aug7' },
  min6: { isMinor: true, suffix: 'm6' },
  min9: { isMinor: true, suffix: 'm9' },
  maj9: { isMinor: false, suffix: 'maj9' },
  add9: { isMinor: false, suffix: 'add9' },
  '(add9)': { isMinor: false, suffix: 'add9' },
  madd9: { isMinor: true, suffix: 'madd9' },
  add2: { isMinor: false, suffix: 'add2' },
  add4: { isMinor: false, suffix: 'add4' },
  maj13: { isMinor: false, suffix: 'maj13' },
  '7b9': { isMinor: false, suffix: '7b9' },
  '7#9': { isMinor: false, suffix: '7#9' },
  '7#11': { isMinor: false, suffix: '7#11' },
  '7b13': { isMinor: false, suffix: '7b13' },
};

function normalizeAccidentals(text: string): string {
  return text.replace(/♯/g, '#').replace(/♭/g, 'b');
}

function mod12(value: number): PitchClass {
  return (((value % 12) + 12) % 12) as PitchClass;
}

function applyAccidental(
  basePitch: PitchClass,
  accidentalChar: string | undefined,
): { pitch: PitchClass; consumed: number; accidental?: 'sharp' | 'flat' } {
  if (accidentalChar === '#') {
    return { pitch: mod12(basePitch + 1), consumed: 1, accidental: 'sharp' };
  }
  if (accidentalChar === 'b' || accidentalChar === 'B') {
    return { pitch: mod12(basePitch - 1), consumed: 1, accidental: 'flat' };
  }
  return { pitch: basePitch, consumed: 0 };
}

interface RootPrefixMatch {
  readonly pitch: PitchClass;
  readonly notation: NotationSystem;
  readonly matchedLength: number;
  readonly accidental?: 'sharp' | 'flat';
  readonly isAllCapsItalian: boolean;
}

function matchItalianRootPrefix(token: string): RootPrefixMatch | null {
  const lower = token.toLowerCase();
  for (const candidate of ITALIAN_ROOT_BASES) {
    if (lower.startsWith(candidate.pattern)) {
      const letterPart = token.slice(0, candidate.pattern.length);
      const isAllCaps = letterPart === letterPart.toUpperCase();
      const afterLetter = token[candidate.pattern.length];
      // Treat uppercase 'B' only as flat when the root itself is uppercase (e.g. "SIB", "MIB") or lowercase 'b' ("Sib")
      const accidentalChar =
        afterLetter === '#' || afterLetter === 'b' || (afterLetter === 'B' && isAllCaps)
          ? afterLetter
          : undefined;
      const { pitch, consumed, accidental } = applyAccidental(candidate.pitch, accidentalChar);
      return {
        pitch,
        notation: 'italian',
        matchedLength: candidate.pattern.length + consumed,
        accidental,
        isAllCapsItalian: isAllCaps,
      };
    }
  }
  return null;
}

function matchEnglishRootPrefix(
  token: string,
  options?: ParseChordOptions,
): RootPrefixMatch | null {
  const firstChar = token[0];
  if (!firstChar) {
    return null;
  }

  if (options?.strictSingleLetterCase && firstChar !== firstChar.toUpperCase()) {
    return null;
  }

  const basePitch = ENGLISH_ROOT_BASES[firstChar.toUpperCase()];
  if (basePitch === undefined) {
    return null;
  }

  const afterLetter = token[1];
  const isUpperRoot = firstChar === firstChar.toUpperCase();
  const accidentalChar =
    afterLetter === '#' || afterLetter === 'b' || (afterLetter === 'B' && isUpperRoot)
      ? afterLetter
      : undefined;
  const { pitch, consumed, accidental } = applyAccidental(basePitch, accidentalChar);

  return {
    pitch,
    notation: 'english',
    matchedLength: 1 + consumed,
    accidental,
    isAllCapsItalian: false,
  };
}

function normalizeSuffix(
  rawSuffix: string,
  notation: NotationSystem,
  isAllCapsItalian: boolean,
): SuffixNormalization | null {
  const trimmed = rawSuffix.trim();

  // Handle English abbreviated diminished syntax (e.g., Bo, F#o7) without matching Italian words like "Solo"
  if (notation === 'english') {
    if (trimmed === 'o') {
      return { isMinor: false, suffix: 'dim' };
    }
    if (trimmed === 'o7') {
      return { isMinor: false, suffix: 'dim7' };
    }
  }

  // ALL-CAPS Italian notation (e.g., LAM, MIM7, FA#M7) uses uppercase 'M' for minor
  if (isAllCapsItalian && /^M($|7|6|9|11|13|7\+|b5|-5|\/5-|ADD9)/i.test(trimmed)) {
    const minorVariant = `m${trimmed.slice(1)}`;
    const matched =
      EXACT_SUFFIX_MAP[minorVariant] ?? CASE_INSENSITIVE_SUFFIX_MAP[minorVariant.toLowerCase()];
    if (matched) {
      return matched;
    }
  }

  const exact = EXACT_SUFFIX_MAP[trimmed];
  if (exact) {
    return exact;
  }

  if (trimmed === 'M7' || trimmed === 'M9' || trimmed === 'M13') {
    return EXACT_SUFFIX_MAP[trimmed] ?? null;
  }

  // In ALL-CAPS strings like "DOADD9", "SOLSUS4", "FA#M7b5", try lowercased lookup (preserving M vs m check done above)
  const lower = trimmed.toLowerCase();
  const caseInsensitive = CASE_INSENSITIVE_SUFFIX_MAP[lower];
  if (caseInsensitive) {
    return caseInsensitive;
  }

  // Check if all-uppercase suffix matches exact lower entry (e.g. "SOLM7B5" or "FA#ADD9")
  if (trimmed === trimmed.toUpperCase()) {
    return EXACT_SUFFIX_MAP[lower] ?? null;
  }

  return null;
}

export function parsePitchRoot(
  token: string,
  options?: ParseChordOptions,
): ParsedRootResult | null {
  const cleaned = normalizeAccidentals(token.trim());
  if (!cleaned) {
    return null;
  }

  const italianMatch = matchItalianRootPrefix(cleaned);
  if (italianMatch && italianMatch.matchedLength === cleaned.length) {
    return {
      pitch: italianMatch.pitch,
      notation: 'italian',
      accidental: italianMatch.accidental,
    };
  }

  const englishMatch = matchEnglishRootPrefix(cleaned, options);
  if (englishMatch && englishMatch.matchedLength === cleaned.length) {
    return {
      pitch: englishMatch.pitch,
      notation: 'english',
      accidental: englishMatch.accidental,
    };
  }

  return null;
}

export function parseChord(rawToken: string, options?: ParseChordOptions): ParsedChord | null {
  const trimmed = rawToken.trim();
  if (!trimmed || /\s/.test(trimmed) || /[.,;!?]$/.test(trimmed)) {
    return null;
  }

  const normalized = normalizeAccidentals(trimmed);
  let chordPart = normalized;
  let bassPitch: PitchClass | null = null;

  const lastSlash = normalized.lastIndexOf('/');
  if (lastSlash >= 0) {
    if (lastSlash === 0 || lastSlash === normalized.length - 1) {
      return null;
    }
    const rightSide = normalized.slice(lastSlash + 1);
    if (!/\d/.test(rightSide)) {
      const bassRoot = parsePitchRoot(rightSide, options);
      if (!bassRoot) {
        return null;
      }
      chordPart = normalized.slice(0, lastSlash);
      bassPitch = bassRoot.pitch;
    }
  }

  const italianRoot = matchItalianRootPrefix(chordPart);
  if (italianRoot) {
    const rawSuffix = chordPart.slice(italianRoot.matchedLength);
    const normalizedSuffix = normalizeSuffix(rawSuffix, 'italian', italianRoot.isAllCapsItalian);
    if (normalizedSuffix) {
      return {
        rootPitch: italianRoot.pitch,
        isMinor: normalizedSuffix.isMinor,
        suffix: normalizedSuffix.suffix,
        bassPitch,
        sourceNotation: 'italian',
        originalText: rawToken.trim(),
      };
    }
  }

  const englishRoot = matchEnglishRootPrefix(chordPart, options);
  if (englishRoot) {
    const rawSuffix = chordPart.slice(englishRoot.matchedLength);
    const normalizedSuffix = normalizeSuffix(rawSuffix, 'english', false);
    if (normalizedSuffix) {
      return {
        rootPitch: englishRoot.pitch,
        isMinor: normalizedSuffix.isMinor,
        suffix: normalizedSuffix.suffix,
        bassPitch,
        sourceNotation: 'english',
        originalText: rawToken.trim(),
      };
    }
  }

  return null;
}

export function isValidChord(token: string, options?: ParseChordOptions): boolean {
  return parseChord(token, options) !== null;
}
