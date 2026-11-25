import { describe, expect, it } from 'vitest';
import {
  extractPlainLyrics,
  parseChordPro,
  serializeChordPro,
  transposeChordProDocument,
} from '@/domain/chords/chordpro';

const SAMPLE_CHORDPRO = `{title: Canto del Mattino}
{artist: Autore Demo}
{key: Sol}
{tempo: 76}

{start_of_verse: Strofa 1}
[Sol]Ecco il [Re/Fa#]canto che [Mim]sale nell'[Do]alba
{end_of_verse}

{start_of_chorus: Ritornello}
{c: Ripetere due volte}
[Sol]Can[Re]tiamo insieme [Mim]con gi[Do]oia
{end_of_chorus}`;

describe('ChordPro structural parser, plain lyrics & serializer', () => {
  it('parses metadata, explicit sections, comments and inline segments accurately', () => {
    const doc = parseChordPro(SAMPLE_CHORDPRO);

    expect(doc.metadata).toEqual({
      title: 'Canto del Mattino',
      author: 'Autore Demo',
      key: 'Sol',
      tempo: 76,
    });
    expect(doc.sections).toHaveLength(2);
    expect(doc.sections[0]).toMatchObject({ type: 'verse', label: 'Strofa 1' });
    expect(doc.sections[1]).toMatchObject({ type: 'chorus', label: 'Ritornello' });

    const chorusFirstLine = doc.sections[1]?.lines[0];
    expect(chorusFirstLine?.kind).toBe('comment');
    expect(chorusFirstLine?.commentText).toBe('Ripetere due volte');
  });

  it('extracts plain lyrics cleanly without breaking mid-word chord splits and skips instrumental lines', () => {
    const withInstrumental = `${SAMPLE_CHORDPRO}

{start_of_intro: Intro}
[Sol]   [Re]   [Mim]   [Do]
{end_of_intro}`;

    const doc = parseChordPro(withInstrumental);
    const plain = extractPlainLyrics(doc);

    expect(plain).toContain("Ecco il canto che sale nell'alba");
    expect(plain).toContain('Cantiamo insieme con gioia');
    expect(plain).not.toContain('Intro:');
    expect(plain).not.toContain('[');
  });

  it('transposes entire document across notations and round-trips cleanly', () => {
    const doc = parseChordPro(SAMPLE_CHORDPRO);
    const transposed = transposeChordProDocument(doc, {
      semitones: -2,
      notation: 'english',
      accidentalPreference: 'flat',
    });

    expect(transposed.metadata.key).toBe('F');
    const serialized = serializeChordPro(transposed);
    expect(serialized).toContain('{title: Canto del Mattino}');
    expect(serialized).toContain('{key: F}');
    expect(serialized).toContain("[F]Ecco il [C/E]canto che [Dm]sale nell'[Bb]alba");
    expect(serialized).toContain('[F]Can[C]tiamo insieme [Dm]con gi[Bb]oia');
  });
});
