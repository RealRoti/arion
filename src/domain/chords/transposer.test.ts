import { describe, expect, it } from 'vitest';
import { parseChord } from '@/domain/chords/parser';
import {
  calculateEffectiveTransposition,
  computeKeyOffsetSemitones,
  formatChord,
  formatKey,
  getKeyAccidentalPreference,
  parseKey,
  transposeChord,
} from '@/domain/chords/transposer';

describe('chord transposer & circle of fifths enharmonics', () => {
  it('chooses accurate circle-of-fifths sharp vs flat spelling per key', () => {
    expect(getKeyAccidentalPreference(5, false)).toBe('flat'); // Fa
    expect(getKeyAccidentalPreference(10, false)).toBe('flat'); // Sib
    expect(getKeyAccidentalPreference(7, false)).toBe('sharp'); // Sol
    expect(getKeyAccidentalPreference(4, false)).toBe('sharp'); // Mi
    expect(getKeyAccidentalPreference(2, true)).toBe('flat'); // Rem
    expect(getKeyAccidentalPreference(6, true)).toBe('sharp'); // Fa#m
  });

  it('transposes chords and slash bass notes accurately in ITA and ENG notations', () => {
    const gOverB = parseChord('Sol/Si')!;
    const downTwo = transposeChord(gOverB, -2);
    expect(formatChord(downTwo, 'italian', 'flat')).toBe('Fa/La');
    expect(formatChord(downTwo, 'english', 'flat')).toBe('F/A');

    // Moving C -> Bb (-2 semitones): C -> Bb, G/B -> F/A, Am7 -> Gm7, Fmaj7 -> Ebmaj7
    const fMaj7 = parseChord('Fa7+')!;
    const fMaj7InBb = transposeChord(fMaj7, -2);
    expect(formatChord(fMaj7InBb, 'italian', 'flat')).toBe('Mib7+');
    expect(formatChord(fMaj7InBb, 'english', 'flat')).toBe('Ebmaj7');
  });

  it('computes effective transposition combining song key, instrument transposition and capo', () => {
    // Guitar plays song originally in Sol, lowered to Fa (-2), with Capo 1 -> reads in Mi (with sharps!)
    const guitarCapo = calculateEffectiveTransposition({
      originalKey: 'Sol',
      activeKey: 'Fa',
      instrumentTranspositionSemitones: 0,
      capoFrets: 1,
      notation: 'italian',
    });

    expect(guitarCapo.songKeyOffset).toBe(-2);
    expect(guitarCapo.totalSemitones).toBe(-3);
    expect(guitarCapo.concertKeyLabel).toBe('Fa');
    expect(guitarCapo.readingKeyLabel).toBe('Mi');
    expect(guitarCapo.accidentalPreference).toBe('sharp');

    const firstChord = transposeChord(parseChord('Sol')!, guitarCapo.totalSemitones);
    const secondChord = transposeChord(parseChord('Mim7')!, guitarCapo.totalSemitones);
    const thirdChord = transposeChord(parseChord('Do/Mi')!, guitarCapo.totalSemitones);
    expect(formatChord(firstChord, 'italian', guitarCapo.accidentalPreference)).toBe('Mi');
    expect(formatChord(secondChord, 'italian', guitarCapo.accidentalPreference)).toBe('Do#m7');
    expect(formatChord(thirdChord, 'italian', guitarCapo.accidentalPreference)).toBe('La/Do#');
  });

  it('handles transposing instruments (Clarinet in Bb +2, Alto Sax in Eb -3)', () => {
    // Concert key Fa -> Clarinet in Bb (+2) reads in Sol (1 sharp)
    const clarinet = calculateEffectiveTransposition({
      originalKey: 'Fa',
      instrumentTranspositionSemitones: 2,
      capoFrets: 0,
      notation: 'italian',
    });
    expect(clarinet.totalSemitones).toBe(2);
    expect(clarinet.concertKeyLabel).toBe('Fa');
    expect(clarinet.readingKeyLabel).toBe('Sol');
    expect(clarinet.accidentalPreference).toBe('sharp');

    // Concert key Do -> Alto Sax in Eb (-3) reads in La (3 sharps)
    const sax = calculateEffectiveTransposition({
      originalKey: 'Do',
      instrumentTranspositionSemitones: -3,
      capoFrets: 0,
      notation: 'english',
    });
    expect(sax.totalSemitones).toBe(-3);
    expect(sax.readingKeyLabel).toBe('A');
    expect(sax.accidentalPreference).toBe('sharp');
  });

  it('computes shortest signed offset between keys and parses minor keys cleanly', () => {
    expect(computeKeyOffsetSemitones('Do', 'Re')).toBe(2);
    expect(computeKeyOffsetSemitones('Do', 'Sib')).toBe(-2);
    expect(computeKeyOffsetSemitones('Do', 'Sol')).toBe(-5);

    const parsedMinor = parseKey('Mi-');
    expect(parsedMinor).not.toBeNull();
    expect(formatKey(parsedMinor!, 'italian')).toBe('Mim');
    expect(formatKey(parsedMinor!, 'english')).toBe('Em');
  });
});
