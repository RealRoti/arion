import { describe, expect, it } from 'vitest';
import { isValidChord, parseChord, parsePitchRoot } from '@/domain/chords/parser';

describe('chord parser (ITA + ENG mixed formats)', () => {
  it('parses Italian roots and web chord notations accurately', () => {
    expect(parseChord('Do')).toMatchObject({
      rootPitch: 0,
      isMinor: false,
      suffix: '',
      bassPitch: null,
      sourceNotation: 'italian',
    });

    expect(parseChord('SIb')).toMatchObject({
      rootPitch: 10,
      isMinor: false,
      suffix: '',
      sourceNotation: 'italian',
    });

    expect(parseChord('Fa#m7')).toMatchObject({
      rootPitch: 6,
      isMinor: true,
      suffix: 'm7',
      sourceNotation: 'italian',
    });

    expect(parseChord('Mi-')).toMatchObject({
      rootPitch: 4,
      isMinor: true,
      suffix: 'm',
      sourceNotation: 'italian',
    });

    expect(parseChord('Sol7+')).toMatchObject({
      rootPitch: 7,
      isMinor: false,
      suffix: 'maj7',
      sourceNotation: 'italian',
    });

    expect(parseChord('Re4')).toMatchObject({
      rootPitch: 2,
      isMinor: false,
      suffix: 'sus4',
      sourceNotation: 'italian',
    });

    expect(parseChord('Sol/Si')).toMatchObject({
      rootPitch: 7,
      isMinor: false,
      suffix: '',
      bassPitch: 11,
      sourceNotation: 'italian',
    });

    expect(parseChord('Rem7/Do')).toMatchObject({
      rootPitch: 2,
      isMinor: true,
      suffix: 'm7',
      bassPitch: 0,
      sourceNotation: 'italian',
    });

    expect(parseChord('La6/9')).toMatchObject({
      rootPitch: 9,
      suffix: '6/9',
      bassPitch: null,
    });

    expect(parseChord('Si°7')).toMatchObject({
      rootPitch: 11,
      suffix: 'dim7',
      bassPitch: null,
    });

    expect(parseChord('Do+')).toMatchObject({
      rootPitch: 0,
      suffix: 'aug',
      bassPitch: null,
    });
  });

  it('handles uppercase Italian M minor vs mixed/English M7 maj7 correctly', () => {
    expect(parseChord('LAM')).toMatchObject({ rootPitch: 9, isMinor: true, suffix: 'm' });
    expect(parseChord('MIM7')).toMatchObject({ rootPitch: 4, isMinor: true, suffix: 'm7' });
    expect(parseChord('FA#M')).toMatchObject({ rootPitch: 6, isMinor: true, suffix: 'm' });
    expect(parseChord('DoM7')).toMatchObject({ rootPitch: 0, isMinor: false, suffix: 'maj7' });
    expect(parseChord('CM7')).toMatchObject({ rootPitch: 0, isMinor: false, suffix: 'maj7' });
  });

  it('resolves Fadd9 / Faug / G7/5- / Unicode accidentals without Italian prefix collisions', () => {
    expect(parseChord('Fadd9')).toMatchObject({
      rootPitch: 5,
      isMinor: false,
      suffix: 'add9',
      sourceNotation: 'english',
    });

    expect(parseChord('Faug')).toMatchObject({
      rootPitch: 5,
      isMinor: false,
      suffix: 'aug',
      sourceNotation: 'english',
    });

    expect(parseChord('C/E')).toMatchObject({
      rootPitch: 0,
      suffix: '',
      bassPitch: 4,
      sourceNotation: 'english',
    });

    expect(parseChord('G7/5-')).toMatchObject({
      rootPitch: 7,
      suffix: '7b5',
      bassPitch: null,
      sourceNotation: 'english',
    });

    expect(parseChord('Am7/5-')).toMatchObject({
      rootPitch: 9,
      isMinor: true,
      suffix: 'm7b5',
      bassPitch: null,
    });

    expect(parseChord('B♭maj7')).toMatchObject({
      rootPitch: 10,
      suffix: 'maj7',
      sourceNotation: 'english',
    });

    expect(parseChord('F♯m7/C♯')).toMatchObject({
      rootPitch: 6,
      isMinor: true,
      suffix: 'm7',
      bassPitch: 1,
      sourceNotation: 'english',
    });
  });

  it('rejects prose words, punctuation and ambiguous Italian words like Solo', () => {
    expect(isValidChord('')).toBe(false);
    expect(isValidChord('Dim')).toBe(false);
    expect(isValidChord('Casa')).toBe(false);
    expect(isValidChord('Amore')).toBe(false);
    expect(isValidChord('Solo')).toBe(false);
    expect(isValidChord('Dolore')).toBe(false);
    expect(isValidChord('La!')).toBe(false);
    expect(isValidChord('Do.')).toBe(false);
    expect(isValidChord('/Sol')).toBe(false);
    expect(isValidChord('Do/')).toBe(false);

    expect(isValidChord('a', { strictSingleLetterCase: true })).toBe(false);
    expect(isValidChord('e', { strictSingleLetterCase: true })).toBe(false);
    expect(isValidChord('A', { strictSingleLetterCase: true })).toBe(true);
    expect(isValidChord('E', { strictSingleLetterCase: true })).toBe(true);
  });

  it('parses standalone enharmonic pitch roots cleanly', () => {
    expect(parsePitchRoot('Si#')).toEqual({ pitch: 0, notation: 'italian', accidental: 'sharp' });
    expect(parsePitchRoot('Fab')).toEqual({ pitch: 4, notation: 'italian', accidental: 'flat' });
    expect(parsePitchRoot('Bb')).toEqual({ pitch: 10, notation: 'english', accidental: 'flat' });
    expect(parsePitchRoot('X')).toBeNull();
  });
});
