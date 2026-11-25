import { describe, expect, it } from 'vitest';
import type { Instrument } from '@/domain/models/instruments';
import {
  filterSongs,
  normalizeTagsInput,
  pickPreferredPdfAsset,
  resolveReaderViewMode,
  type Song,
  type SongAsset,
} from '@/domain/models/songs';

const VOICE: Instrument = {
  id: 'inst-voice',
  slug: 'soprano',
  name: 'Soprano',
  category: 'voice',
  defaultView: 'lyrics_only',
  transpositionSemitones: 0,
  supportsCapo: false,
  isEnabled: true,
  sortOrder: 10,
};

const ORGAN: Instrument = {
  id: 'inst-organ',
  slug: 'organo',
  name: 'Organo',
  category: 'instrument',
  defaultView: 'pdf',
  transpositionSemitones: 0,
  supportsCapo: false,
  isEnabled: true,
  sortOrder: 20,
};

const SAMPLE_SONGS: Song[] = [
  {
    id: 's1',
    title: 'Canto del Mattino',
    subtitle: 'Inno iniziale',
    author: 'Autore Demo',
    originalKey: 'Sol',
    tempoBpm: 76,
    timeSignature: '4/4',
    tags: ['Ingresso', 'Solenne'],
    chordproContent: '[Sol]Ecco il [Re]canto che [Mim]sale',
    conductorNotes: null,
    pdfCount: 1,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
  },
  {
    id: 's2',
    title: 'Preghiera della Sera',
    subtitle: null,
    author: null,
    originalKey: 'C',
    tempoBpm: null,
    timeSignature: null,
    tags: ['Meditazione'],
    chordproContent: '[C]Scende la [G]pace sul [Am]cuore',
    conductorNotes: null,
    pdfCount: 0,
    createdAt: '2026-01-02T00:00:00Z',
    updatedAt: '2026-01-02T00:00:00Z',
  },
];

describe('songs domain helpers', () => {
  it('normalizes tags deduplicating case-insensitively', () => {
    expect(normalizeTagsInput(' Ingresso, Solenne , ingresso ; Pace ')).toEqual([
      'Ingresso',
      'Solenne',
      'Pace',
    ]);
  });

  it('picks preferred PDF asset: user preference -> instrument match -> general -> fallback', () => {
    const assets: SongAsset[] = [
      {
        id: 'a-gen',
        songId: 's1',
        assetType: 'pdf',
        title: 'Spartito Generale',
        storagePath: 's1/gen.pdf',
        mimeType: 'application/pdf',
        fileSizeBytes: 1000,
        instrumentIds: [],
        metadata: {},
        sortOrder: 10,
        createdAt: '',
      },
      {
        id: 'a-org',
        songId: 's1',
        assetType: 'pdf',
        title: 'Partitura Organo',
        storagePath: 's1/organo.pdf',
        mimeType: 'application/pdf',
        fileSizeBytes: 2000,
        instrumentIds: [ORGAN.id],
        metadata: {},
        sortOrder: 20,
        createdAt: '',
      },
    ];

    expect(pickPreferredPdfAsset(assets, ORGAN.id, null)?.id).toBe('a-org');
    expect(pickPreferredPdfAsset(assets, VOICE.id, null)?.id).toBe('a-gen');
    expect(pickPreferredPdfAsset(assets, ORGAN.id, 'a-gen')?.id).toBe('a-gen');
    expect(pickPreferredPdfAsset([], ORGAN.id, null)).toBeNull();
  });

  it('resolves reader default view mode coherently with PDF availability', () => {
    expect(
      resolveReaderViewMode({
        activeInstrument: VOICE,
        userPreferenceView: null,
        hasPdfAssets: true,
      }),
    ).toBe('lyrics_only');

    expect(
      resolveReaderViewMode({
        activeInstrument: ORGAN,
        userPreferenceView: null,
        hasPdfAssets: true,
      }),
    ).toBe('pdf');

    expect(
      resolveReaderViewMode({
        activeInstrument: ORGAN,
        userPreferenceView: null,
        hasPdfAssets: false,
      }),
    ).toBe('chords');

    expect(
      resolveReaderViewMode({
        activeInstrument: VOICE,
        userPreferenceView: 'chords',
        hasPdfAssets: false,
      }),
    ).toBe('chords');
  });

  it('filters songs by query (including plain lyrics), tag, enharmonic key and pdf presence', () => {
    expect(filterSongs(SAMPLE_SONGS, { query: 'scende la pace' }).map((s) => s.id)).toEqual(['s2']);
    expect(filterSongs(SAMPLE_SONGS, { tag: 'Ingresso' }).map((s) => s.id)).toEqual(['s1']);
    // Searches key matching ITA 'Do' against song saved in ENG 'C'
    expect(filterSongs(SAMPLE_SONGS, { key: 'Do' }).map((s) => s.id)).toEqual(['s2']);
    expect(filterSongs(SAMPLE_SONGS, { pdfOnly: true }).map((s) => s.id)).toEqual(['s1']);
  });
});
