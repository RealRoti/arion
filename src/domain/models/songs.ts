import { parseKey } from '@/domain/chords/transposer';
import type { Instrument, InstrumentDefaultView } from '@/domain/models/instruments';

export const SONG_ASSET_TYPES = ['pdf', 'midi', 'musicxml'] as const;

export type SongAssetType = (typeof SONG_ASSET_TYPES)[number];

export interface Song {
  readonly id: string;
  readonly title: string;
  readonly subtitle: string | null;
  readonly author: string | null;
  readonly originalKey: string;
  readonly tempoBpm: number | null;
  readonly timeSignature: string | null;
  readonly tags: readonly string[];
  readonly chordproContent: string;
  readonly conductorNotes: string | null;
  readonly pdfCount: number;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface SongAsset {
  readonly id: string;
  readonly songId: string;
  readonly assetType: SongAssetType;
  readonly title: string;
  readonly storagePath: string;
  readonly mimeType: string;
  readonly fileSizeBytes: number;
  readonly instrumentIds: readonly string[];
  readonly metadata: Readonly<Record<string, unknown>>;
  readonly sortOrder: number;
  readonly createdAt: string;
}

export interface UserSongPreferences {
  readonly userId: string;
  readonly songId: string;
  readonly capoFrets: number;
  readonly preferredView: InstrumentDefaultView | null;
  readonly preferredAssetId: string | null;
  readonly personalNotes: string | null;
  readonly updatedAt: string;
}

export function isSongAssetType(value: string): value is SongAssetType {
  return (SONG_ASSET_TYPES as readonly string[]).includes(value);
}

export function normalizeTagsInput(raw: string): string[] {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const part of raw.split(/[;,]/)) {
    const cleaned = part.trim().replace(/\s+/g, ' ');
    if (!cleaned) continue;
    const key = cleaned.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(cleaned);
  }

  return result;
}

export function pickPreferredPdfAsset(
  assets: readonly SongAsset[],
  activeInstrumentId: string | null,
  preferredAssetId: string | null,
): SongAsset | null {
  const pdfAssets = assets.filter((asset) => asset.assetType === 'pdf');
  if (pdfAssets.length === 0) {
    return null;
  }

  if (preferredAssetId) {
    const explicit = pdfAssets.find((asset) => asset.id === preferredAssetId);
    if (explicit) {
      return explicit;
    }
  }

  if (activeInstrumentId) {
    const byInstrument = pdfAssets.find((asset) =>
      asset.instrumentIds.includes(activeInstrumentId),
    );
    if (byInstrument) {
      return byInstrument;
    }
  }

  const general = pdfAssets.find((asset) => asset.instrumentIds.length === 0);
  if (general) {
    return general;
  }

  return pdfAssets[0] ?? null;
}

export function resolveReaderViewMode({
  activeInstrument,
  userPreferenceView,
  hasPdfAssets,
}: {
  readonly activeInstrument: Instrument | null;
  readonly userPreferenceView: InstrumentDefaultView | null;
  readonly hasPdfAssets: boolean;
}): InstrumentDefaultView {
  if (userPreferenceView) {
    if (userPreferenceView === 'pdf' && !hasPdfAssets) {
      return activeInstrument?.defaultView === 'lyrics_only' ? 'lyrics_only' : 'chords';
    }
    return userPreferenceView;
  }

  const defaultView = activeInstrument?.defaultView;
  if (defaultView === 'pdf') {
    return hasPdfAssets ? 'pdf' : 'chords';
  }
  if (defaultView === 'lyrics_only') {
    return 'lyrics_only';
  }
  return 'chords';
}

function stripChordProMarkup(chordpro: string): string {
  return chordpro
    .replace(/\{[^}]*\}/g, ' ')
    .replace(/\[[^\]]*\]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export interface SongFilterCriteria {
  readonly query?: string;
  readonly tag?: string;
  readonly key?: string;
  readonly pdfOnly?: boolean;
}

export function filterSongs(songs: readonly Song[], criteria: SongFilterCriteria): Song[] {
  const normalizedQuery = criteria.query?.trim().toLowerCase() ?? '';
  const selectedTag = criteria.tag && criteria.tag !== 'ALL' ? criteria.tag : null;
  const selectedKey = criteria.key && criteria.key !== 'ALL' ? parseKey(criteria.key) : null;
  const pdfOnly = Boolean(criteria.pdfOnly);

  return songs.filter((song) => {
    if (selectedTag && !song.tags.includes(selectedTag)) {
      return false;
    }

    if (pdfOnly && song.pdfCount === 0) {
      return false;
    }

    if (selectedKey) {
      const songKey = parseKey(song.originalKey);
      if (
        !songKey ||
        songKey.rootPitch !== selectedKey.rootPitch ||
        songKey.isMinor !== selectedKey.isMinor
      ) {
        return false;
      }
    }

    if (!normalizedQuery) {
      return true;
    }

    const plainLyrics = stripChordProMarkup(song.chordproContent);
    const haystack = [
      song.title,
      song.subtitle ?? '',
      song.author ?? '',
      song.tags.join(' '),
      plainLyrics,
    ]
      .join(' ')
      .toLowerCase();

    return haystack.includes(normalizedQuery);
  });
}
