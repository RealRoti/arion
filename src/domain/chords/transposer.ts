import { parseChord, parsePitchRoot } from '@/domain/chords/parser';
import type {
  AccidentalPreference,
  EffectiveTranspositionResult,
  MusicalKey,
  ParsedChord,
  PitchClass,
  TranspositionContext,
} from '@/domain/chords/types';
import type { NotationSystem } from '@/domain/models/theme';

const ITALIAN_SHARP_NAMES: readonly string[] = [
  'Do',
  'Do#',
  'Re',
  'Re#',
  'Mi',
  'Fa',
  'Fa#',
  'Sol',
  'Sol#',
  'La',
  'La#',
  'Si',
];

const ITALIAN_FLAT_NAMES: readonly string[] = [
  'Do',
  'Reb',
  'Re',
  'Mib',
  'Mi',
  'Fa',
  'Solb',
  'Sol',
  'Lab',
  'La',
  'Sib',
  'Si',
];

const ENGLISH_SHARP_NAMES: readonly string[] = [
  'C',
  'C#',
  'D',
  'D#',
  'E',
  'F',
  'F#',
  'G',
  'G#',
  'A',
  'A#',
  'B',
];

const ENGLISH_FLAT_NAMES: readonly string[] = [
  'C',
  'Db',
  'D',
  'Eb',
  'E',
  'F',
  'Gb',
  'G',
  'Ab',
  'A',
  'Bb',
  'B',
];

// Circle of fifths preference per pitch class in Major mode
const MAJOR_ACCIDENTAL_BY_PITCH: Record<PitchClass, AccidentalPreference> = {
  0: 'sharp', // Do / C (0 accidentals)
  1: 'flat', // Reb / Db (5 flats; Do# = 7 sharps)
  2: 'sharp', // Re / D (2 sharps)
  3: 'flat', // Mib / Eb (3 flats)
  4: 'sharp', // Mi / E (4 sharps)
  5: 'flat', // Fa / F (1 flat)
  6: 'sharp', // Fa# / F# (6 sharps; Solb = 6 flats, standard pop/choir prefers Fa#)
  7: 'sharp', // Sol / G (1 sharp)
  8: 'flat', // Lab / Ab (4 flats)
  9: 'sharp', // La / A (3 sharps)
  10: 'flat', // Sib / Bb (2 flats)
  11: 'sharp', // Si / B (5 sharps)
};

// Circle of fifths preference per pitch class in Minor mode
const MINOR_ACCIDENTAL_BY_PITCH: Record<PitchClass, AccidentalPreference> = {
  0: 'flat', // Dom / Cm (3 flats)
  1: 'sharp', // Do#m / C#m (4 sharps)
  2: 'flat', // Rem / Dm (1 flat)
  3: 'flat', // Mibm / Ebm (6 flats)
  4: 'sharp', // Mim / Em (1 sharp)
  5: 'flat', // Fam / Fm (4 flats)
  6: 'sharp', // Fa#m / F#m (3 sharps)
  7: 'flat', // Solm / Gm (2 flats)
  8: 'sharp', // Sol#m / G#m (5 sharps)
  9: 'sharp', // Lam / Am (0 accidentals)
  10: 'flat', // Sibm / Bbm (5 flats)
  11: 'sharp', // Sim / Bm (2 sharps)
};

export const STANDARD_KEYS_MAJOR: readonly MusicalKey[] = (
  [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11] as const
).map((pitch) => ({
  rootPitch: pitch,
  isMinor: false,
  accidentalPreference: MAJOR_ACCIDENTAL_BY_PITCH[pitch],
}));

export const STANDARD_KEYS_MINOR: readonly MusicalKey[] = (
  [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11] as const
).map((pitch) => ({
  rootPitch: pitch,
  isMinor: true,
  accidentalPreference: MINOR_ACCIDENTAL_BY_PITCH[pitch],
}));

export function getKeyAccidentalPreference(
  rootPitch: PitchClass,
  isMinor: boolean,
): AccidentalPreference {
  return isMinor ? MINOR_ACCIDENTAL_BY_PITCH[rootPitch] : MAJOR_ACCIDENTAL_BY_PITCH[rootPitch];
}

export function transposePitch(pitch: PitchClass, semitones: number): PitchClass {
  const shifted = Math.trunc(semitones);
  return ((((pitch + shifted) % 12) + 12) % 12) as PitchClass;
}

export function formatPitch(
  pitch: PitchClass,
  notation: NotationSystem,
  accidentalPreference: AccidentalPreference = 'sharp',
): string {
  if (notation === 'italian') {
    return accidentalPreference === 'flat'
      ? (ITALIAN_FLAT_NAMES[pitch] ?? 'Do')
      : (ITALIAN_SHARP_NAMES[pitch] ?? 'Do');
  }
  return accidentalPreference === 'flat'
    ? (ENGLISH_FLAT_NAMES[pitch] ?? 'C')
    : (ENGLISH_SHARP_NAMES[pitch] ?? 'C');
}

export function formatSuffix(suffix: string, notation: NotationSystem): string {
  if (notation === 'italian') {
    if (suffix === 'maj7') return '7+';
    if (suffix === 'mmaj7') return 'm7+';
    return suffix;
  }
  if (suffix === 'mmaj7') {
    return 'm(maj7)';
  }
  return suffix;
}

export function transposeChord(chord: ParsedChord, semitones: number): ParsedChord {
  const shift = Math.trunc(semitones);
  if (shift === 0) {
    return chord;
  }
  return {
    ...chord,
    rootPitch: transposePitch(chord.rootPitch, shift),
    bassPitch: chord.bassPitch !== null ? transposePitch(chord.bassPitch, shift) : null,
  };
}

export function formatChord(
  chord: ParsedChord,
  notation: NotationSystem,
  accidentalPreference: AccidentalPreference = 'sharp',
): string {
  const root = formatPitch(chord.rootPitch, notation, accidentalPreference);
  const suffix = formatSuffix(chord.suffix, notation);
  const bass =
    chord.bassPitch !== null
      ? `/${formatPitch(chord.bassPitch, notation, accidentalPreference)}`
      : '';
  return `${root}${suffix}${bass}`;
}

export function parseKey(keyText: string): MusicalKey | null {
  const trimmed = keyText.trim();
  if (!trimmed) {
    return null;
  }

  const parsed = parseChord(trimmed);
  if (parsed && (parsed.suffix === '' || parsed.suffix === 'm')) {
    const rootCandidate = parsePitchRoot(
      trimmed.endsWith('m') || trimmed.endsWith('-') ? trimmed.slice(0, -1) : trimmed,
    );
    const explicitAccidental = rootCandidate?.accidental;
    return {
      rootPitch: parsed.rootPitch,
      isMinor: parsed.isMinor,
      accidentalPreference:
        explicitAccidental ?? getKeyAccidentalPreference(parsed.rootPitch, parsed.isMinor),
    };
  }

  return null;
}

export function formatKey(key: MusicalKey, notation: NotationSystem): string {
  const root = formatPitch(key.rootPitch, notation, key.accidentalPreference);
  return key.isMinor ? `${root}m` : root;
}

export function transposeKey(key: MusicalKey, semitones: number): MusicalKey {
  const nextPitch = transposePitch(key.rootPitch, semitones);
  return {
    rootPitch: nextPitch,
    isMinor: key.isMinor,
    accidentalPreference: getKeyAccidentalPreference(nextPitch, key.isMinor),
  };
}

export function computeKeyOffsetSemitones(originalKey: string, targetKey: string): number {
  const orig = parseKey(originalKey);
  const dest = parseKey(targetKey);
  if (!orig || !dest) {
    return 0;
  }

  const rawDiff = (((dest.rootPitch - orig.rootPitch) % 12) + 12) % 12;
  return rawDiff > 6 ? rawDiff - 12 : rawDiff;
}

export function calculateEffectiveTransposition(
  context: TranspositionContext,
): EffectiveTranspositionResult {
  const instrumentShift = Math.trunc(context.instrumentTranspositionSemitones ?? 0);
  const capoFrets = Math.max(0, Math.trunc(context.capoFrets ?? 0));

  const parsedOriginalKey = parseKey(context.originalKey);
  let songKeyOffset = 0;

  if (context.explicitSemitoneShift !== undefined) {
    songKeyOffset = Math.trunc(context.explicitSemitoneShift);
  } else if (context.activeKey) {
    songKeyOffset = computeKeyOffsetSemitones(context.originalKey, context.activeKey);
  }

  const totalSemitones = songKeyOffset + instrumentShift - capoFrets;

  let concertKey: MusicalKey | null = null;
  let readingKey: MusicalKey | null = null;

  if (parsedOriginalKey) {
    if (context.activeKey && context.explicitSemitoneShift === undefined) {
      const parsedActiveKey = parseKey(context.activeKey);
      concertKey = parsedActiveKey ?? transposeKey(parsedOriginalKey, songKeyOffset);
    } else {
      concertKey = transposeKey(parsedOriginalKey, songKeyOffset);
    }
    readingKey = transposeKey(concertKey, instrumentShift - capoFrets);
  }

  const accidentalPreference: AccidentalPreference = readingKey
    ? readingKey.accidentalPreference
    : parsedOriginalKey
      ? parsedOriginalKey.accidentalPreference
      : 'sharp';

  return {
    songKeyOffset,
    instrumentTranspositionSemitones: instrumentShift,
    capoFrets,
    totalSemitones,
    concertKey,
    readingKey,
    concertKeyLabel: concertKey ? formatKey(concertKey, context.notation) : context.originalKey,
    readingKeyLabel: readingKey ? formatKey(readingKey, context.notation) : context.originalKey,
    accidentalPreference,
  };
}
