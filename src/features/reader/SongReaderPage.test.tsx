import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it as vitestIt, vi } from 'vitest';
import { ThemeProvider } from '@/components/ThemeProvider';
import type { Instrument } from '@/domain/models/instruments';
import type { Song, SongAsset } from '@/domain/models/songs';
import { can, canAny, getPermissionsForRole } from '@/domain/rbac/permissions';
import type { AuthContextValue } from '@/features/auth/authContextStore';
import { AuthProvider } from '@/features/auth/AuthProvider';
import { SongReaderPage } from '@/features/reader/SongReaderPage';
import { it } from '@/i18n/it';
import {
  getSongById,
  getUserSongPreferences,
  listSongAssets,
  upsertUserSongPreferences,
} from '@/services/songsService';

vi.mock('@/services/songsService', () => ({
  getSongById: vi.fn(),
  listSongAssets: vi.fn(),
  getUserSongPreferences: vi.fn(),
  upsertUserSongPreferences: vi.fn(async () => ({})),
}));

vi.mock('@/services/authService', () => ({
  updateOwnProfile: vi.fn(async () => undefined),
}));

vi.mock('@/services/storageService', () => ({
  downloadSongAssetArrayBuffer: vi.fn(async () => new ArrayBuffer(8)),
}));

vi.mock('pdfjs-dist', () => ({
  GlobalWorkerOptions: { workerSrc: '' },
  getDocument: vi.fn(() => ({
    promise: Promise.resolve({
      numPages: 2,
      cleanup: vi.fn(async () => undefined),
      getPage: vi.fn(async () => ({
        getViewport: ({ scale }: { scale: number }) => ({
          width: 600 * scale,
          height: 800 * scale,
        }),
        render: () => ({ promise: Promise.resolve(), cancel: vi.fn() }),
      })),
    }),
  })),
}));

const TEST_SONG: Song = {
  id: 'song-1',
  title: 'Canto di Prova',
  subtitle: null,
  author: 'Autore Demo',
  originalKey: 'Sol',
  tempoBpm: 76,
  timeSignature: '4/4',
  tags: ['Ingresso'],
  chordproContent: '{start_of_verse: Strofa 1}\n[Sol]Ecco il [Re/Fa#]canto\n{end_of_verse}',
  conductorNotes: 'Intro 4 battute',
  pdfCount: 1,
  createdAt: '',
  updatedAt: '',
};

const TEST_PDF_ASSET: SongAsset = {
  id: 'asset-1',
  songId: 'song-1',
  assetType: 'pdf',
  title: 'Partitura Organo',
  storagePath: 'songs/song-1/organo.pdf',
  mimeType: 'application/pdf',
  fileSizeBytes: 1024,
  instrumentIds: ['inst-organ'],
  metadata: {},
  sortOrder: 10,
  createdAt: '',
};

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
  slug: 'organo',
  name: 'Organo',
  category: 'instrument',
  defaultView: 'pdf',
  transpositionSemitones: 0,
  supportsCapo: false,
  isEnabled: true,
  sortOrder: 30,
};

function renderReader(activeInstrument: Instrument | null) {
  const permissions = getPermissionsForRole('musician', true);
  const authOverride: AuthContextValue = {
    status: 'authenticated',
    profile: {
      id: 'user-1',
      email: 'musicista@arion.local',
      displayName: 'Musicista Demo',
      role: 'musician',
      isActive: true,
      activeInstrumentId: activeInstrument?.id ?? null,
      preferredNotation: 'italian',
      preferredTheme: 'daylight',
      preferredTextSize: 'compact',
      fontScale: 1,
    },
    permissions,
    instanceSettings: null,
    instruments: [VOICE, GUITAR, ORGAN],
    userInstruments: [],
    activeInstrument,
    can: (perm) => can(permissions, perm),
    canAny: (reqs) => canAny(permissions, reqs),
    setActiveInstrument: async () => undefined,
    refreshProfile: async () => undefined,
    refreshInstanceSettings: async () => undefined,
    refreshInstruments: async () => undefined,
    signOut: async () => undefined,
  };

  render(
    <MemoryRouter initialEntries={['/repertorio/song-1']}>
      <ThemeProvider>
        <AuthProvider valueOverride={authOverride}>
          <Routes>
            <Route path="/repertorio/:songId" element={<SongReaderPage />} />
          </Routes>
        </AuthProvider>
      </ThemeProvider>
    </MemoryRouter>,
  );
}

describe('SongReaderPage (Unified ChordPro + PDF.js)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getSongById).mockResolvedValue(TEST_SONG);
    vi.mocked(listSongAssets).mockResolvedValue([TEST_PDF_ASSET]);
    vi.mocked(getUserSongPreferences).mockResolvedValue(null);
  });

  vitestIt(
    'opens in Solo Testo for a voice and toggles to Testo + Accordi persisting preference',
    async () => {
      renderReader(VOICE);

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: 'Canto di Prova' })).toBeInTheDocument();
      });

      expect(screen.queryByText('Re/Fa#')).not.toBeInTheDocument();
      expect(screen.getByText('Intro 4 battute')).toBeInTheDocument();

      fireEvent.click(screen.getByRole('button', { name: it.reader.modeChords }));

      expect(screen.getByText('Re/Fa#')).toBeInTheDocument();
      expect(upsertUserSongPreferences).toHaveBeenCalledWith({
        userId: 'user-1',
        songId: 'song-1',
        preferredView: 'chords',
      });
    },
  );

  vitestIt('applies and persists local capo for guitar with enharmonic transposition', async () => {
    renderReader(GUITAR);

    await waitFor(() => {
      expect(screen.getByText('Re/Fa#')).toBeInTheDocument();
    });

    fireEvent.change(screen.getByLabelText(it.reader.capoLabel), {
      target: { value: '2' },
    });

    // Sol - 2 semitones = Fa (uses flat accidental preference -> Do/Mi, Fa)
    expect(screen.getAllByText('Fa').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Do/Mi')).toBeInTheDocument();
    expect(screen.getByText(/Capo 2 \(leggi in Fa\)/i)).toBeInTheDocument();
    expect(upsertUserSongPreferences).toHaveBeenCalledWith({
      userId: 'user-1',
      songId: 'song-1',
      capoFrets: 2,
    });
  });

  vitestIt(
    'defaults to PDF canvas view (no iframe/embed) for organ when PDF asset is attached',
    async () => {
      renderReader(ORGAN);

      await waitFor(() => {
        expect(screen.getByText('Partitura Organo')).toBeInTheDocument();
      });

      await waitFor(() => {
        expect(document.querySelector('canvas')).not.toBeNull();
      });
      expect(document.querySelector('iframe')).toBeNull();
      expect(document.querySelector('embed')).toBeNull();
    },
  );
});
