import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { parseChordPro } from '@/domain/chords/chordpro';
import { ChordProRenderer } from '@/features/reader/ChordProRenderer';

const SAMPLE = parseChordPro(`{start_of_intro: Intro}
[Do]   [Sol]   [Lam]
{end_of_intro}

{start_of_verse: Strofa 1}
[Sol]Ecco il [Re/Fa#]canto che [Mim]sale
[Sol]Can[Re]tiamo insieme
{end_of_verse}`);

describe('ChordProRenderer', () => {
  it('hides chords, hides instrumental intro and merges syllables cleanly in Solo Testo mode', () => {
    render(<ChordProRenderer document={SAMPLE} showChords={false} fontScale={1.1} />);

    const body = screen.getByTestId('lectern-song-body');
    expect(body.style.fontSize).toBe('1.1rem');
    expect(screen.queryByText('Intro')).not.toBeInTheDocument();
    expect(screen.queryByText('Re/Fa#')).not.toBeInTheDocument();
    expect(screen.getByText('Ecco il canto che sale')).toBeInTheDocument();
    expect(screen.getByText('Cantiamo insieme')).toBeInTheDocument();
  });

  it('shows chords, instrumental intro and 2-column layout class in Testo + Accordi mode', () => {
    render(<ChordProRenderer document={SAMPLE} showChords twoColumns />);

    const body = screen.getByTestId('lectern-song-body');
    expect(body.className).toContain('md:columns-2');
    expect(screen.getByText('Intro')).toBeInTheDocument();
    expect(screen.getByText('Re/Fa#')).toBeInTheDocument();
  });
});
