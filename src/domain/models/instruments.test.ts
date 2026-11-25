import { describe, expect, it } from 'vitest';
import {
  formatTranspositionSemitones,
  getEffectiveDefaultShowChords,
  partitionSelectableInstruments,
  resolveActiveInstrument,
  slugifyInstrumentName,
  type Instrument,
  type UserInstrumentAssignment,
} from '@/domain/models/instruments';

const VOICE_SOPRANO: Instrument = {
  id: 'inst-soprano',
  slug: 'soprano',
  name: 'Soprano',
  category: 'voice',
  defaultView: 'lyrics_only',
  transpositionSemitones: 0,
  supportsCapo: false,
  isEnabled: true,
  sortOrder: 10,
};

const GUITAR: Instrument = {
  id: 'inst-guitar',
  slug: 'chitarra',
  name: 'Chitarra',
  category: 'instrument',
  defaultView: 'chords',
  transpositionSemitones: 0,
  supportsCapo: true,
  isEnabled: true,
  sortOrder: 20,
};

const ORGAN: Instrument = {
  id: 'inst-organ',
  slug: 'tastiera-organo',
  name: 'Tastiera / Organo',
  category: 'instrument',
  defaultView: 'pdf',
  transpositionSemitones: 0,
  supportsCapo: false,
  isEnabled: true,
  sortOrder: 30,
};

const CLARINET_DISABLED: Instrument = {
  id: 'inst-clarinet',
  slug: 'clarinetto-sib',
  name: 'Clarinetto in Sib',
  category: 'instrument',
  defaultView: 'pdf',
  transpositionSemitones: 2,
  supportsCapo: false,
  isEnabled: false,
  sortOrder: 40,
};

const ALL_INSTRUMENTS = [VOICE_SOPRANO, GUITAR, ORGAN, CLARINET_DISABLED];

describe('instruments domain helpers', () => {
  it('slugifies Italian names cleanly with accent removal and neutral fallback', () => {
    expect(slugifyInstrumentName('Tastiera / Organo')).toBe('tastiera-organo');
    expect(slugifyInstrumentName('Violoncello Più Acuto')).toBe('violoncello-piu-acuto');
    expect(slugifyInstrumentName('   ---   ')).toBe('strumento');
  });

  it('resolves active instrument with priority: activeId -> primary -> first assigned -> first enabled', () => {
    const assignments: UserInstrumentAssignment[] = [
      { userId: 'u1', instrumentId: ORGAN.id, isPrimary: false },
      { userId: 'u1', instrumentId: GUITAR.id, isPrimary: true },
    ];

    expect(resolveActiveInstrument(ALL_INSTRUMENTS, assignments, ORGAN.id)?.id).toBe(ORGAN.id);
    // Disabled activeInstrumentId falls back to primary assigned enabled instrument
    expect(resolveActiveInstrument(ALL_INSTRUMENTS, assignments, CLARINET_DISABLED.id)?.id).toBe(
      GUITAR.id,
    );
    expect(resolveActiveInstrument(ALL_INSTRUMENTS, assignments, null)?.id).toBe(GUITAR.id);

    // Primary disabled falls back to other assigned enabled instrument
    const primaryDisabledAssignments: UserInstrumentAssignment[] = [
      { userId: 'u1', instrumentId: CLARINET_DISABLED.id, isPrimary: true },
      { userId: 'u1', instrumentId: ORGAN.id, isPrimary: false },
    ];
    expect(resolveActiveInstrument(ALL_INSTRUMENTS, primaryDisabledAssignments, null)?.id).toBe(
      ORGAN.id,
    );

    // No assignments falls back to first enabled catalog item
    expect(resolveActiveInstrument(ALL_INSTRUMENTS, [], null)?.id).toBe(VOICE_SOPRANO.id);

    // No enabled instruments returns null
    expect(resolveActiveInstrument([CLARINET_DISABLED], assignments, null)).toBeNull();
  });

  it('partitions enabled instruments into assigned (primary first) and others', () => {
    const assignments: UserInstrumentAssignment[] = [
      { userId: 'u1', instrumentId: VOICE_SOPRANO.id, isPrimary: false },
      { userId: 'u1', instrumentId: ORGAN.id, isPrimary: true },
      { userId: 'u1', instrumentId: CLARINET_DISABLED.id, isPrimary: false },
    ];

    const { assigned, others } = partitionSelectableInstruments(ALL_INSTRUMENTS, assignments);
    expect(assigned.map((item) => item.id)).toEqual([ORGAN.id, VOICE_SOPRANO.id]);
    expect(others.map((item) => item.id)).toEqual([GUITAR.id]);
  });

  it('determines effective default chord visibility from active instrument defaultView', () => {
    expect(getEffectiveDefaultShowChords(VOICE_SOPRANO)).toBe(false);
    expect(getEffectiveDefaultShowChords(GUITAR)).toBe(true);
    expect(getEffectiveDefaultShowChords(ORGAN)).toBe(true);
    expect(getEffectiveDefaultShowChords(null)).toBe(true);
  });

  it('formats transposition semitones cleanly', () => {
    expect(formatTranspositionSemitones(0)).toBe('0');
    expect(formatTranspositionSemitones(2)).toBe('+2');
    expect(formatTranspositionSemitones(-3)).toBe('-3');
  });
});
