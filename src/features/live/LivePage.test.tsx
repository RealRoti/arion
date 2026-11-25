import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it as vitestIt, vi } from 'vitest';
import { ThemeProvider } from '@/components/ThemeProvider';
import type { Instrument } from '@/domain/models/instruments';
import {
  createIdleLiveSession,
  type FlashSignal,
  type LivePresenceMember,
  type LiveSessionState,
} from '@/domain/models/live';
import type { SetlistWithItems } from '@/domain/models/setlists';
import type { Song } from '@/domain/models/songs';
import { can, canAny, getPermissionsForRole, type Role } from '@/domain/rbac/permissions';
import type { AuthContextValue } from '@/features/auth/authContextStore';
import { AuthProvider } from '@/features/auth/AuthProvider';
import { LivePage } from '@/features/live/LivePage';
import { it } from '@/i18n/it';
import {
  endLiveSession,
  fetchLiveSession,
  subscribeToLiveChannel,
  updateLiveSession,
} from '@/services/liveService';
import { listSetlists } from '@/services/setlistsService';
import {
  getSongById,
  getUserSongPreferences,
  listSongAssets,
  listSongs,
  upsertUserSongPreferences,
} from '@/services/songsService';

const mockSendStateSync = vi.fn(async () => undefined);
const mockSendFlashSignal = vi.fn(async () => undefined);
const mockUpdatePresence = vi.fn(async () => undefined);
const mockUnsubscribe = vi.fn();

let capturedChannelCallbacks: {
  onStateSync?: (session: LiveSessionState) => void;
  onFlashSignal?: (signal: FlashSignal) => void;
  onPresenceChange?: (members: LivePresenceMember[]) => void;
  onConnectionChange?: (
    state: 'connecting' | 'connected' | 'reconnecting' | 'disconnected',
  ) => void;
} = {};

vi.mock('@/services/liveService', () => ({
  fetchLiveSession: vi.fn(),
  updateLiveSession: vi.fn(),
  endLiveSession: vi.fn(),
  subscribeToLiveChannel: vi.fn((opts) => {
    capturedChannelCallbacks = opts;
    opts.onConnectionChange('connected');
    return {
      sendStateSync: mockSendStateSync,
      sendFlashSignal: mockSendFlashSignal,
      updatePresence: mockUpdatePresence,
      unsubscribe: mockUnsubscribe,
    };
  }),
}));

vi.mock('@/services/setlistsService', () => ({
  listSetlists: vi.fn(),
}));

vi.mock('@/services/songsService', () => ({
  listSongs: vi.fn(),
  getSongById: vi.fn(),
  listSongAssets: vi.fn(async () => []),
  getUserSongPreferences: vi.fn(async () => null),
  upsertUserSongPreferences: vi.fn(async () => ({})),
}));

const SONG_ONE: Song = {
  id: 'song-1',
  title: 'Canto Uno',
  subtitle: null,
  author: 'Autore Demo',
  originalKey: 'Sol',
  tempoBpm: 76,
  timeSignature: '4/4',
  tags: [],
  chordproContent:
    '{start_of_verse: Strofa 1}\n[Sol]Ecco il [Re/Fa#]canto\n{end_of_verse}\n\n{start_of_chorus: Ritornello}\n[Do]Lode al [Re]cielo\n{end_of_chorus}',
  conductorNotes: null,
  pdfCount: 0,
  createdAt: '',
  updatedAt: '',
};

const SONG_TWO: Song = {
  id: 'song-2',
  title: 'Canto Due',
  subtitle: null,
  author: null,
  originalKey: 'Re',
  tempoBpm: null,
  timeSignature: null,
  tags: [],
  chordproContent: '{start_of_verse: Strofa 1}\n[Re]Secondo [La]brano\n{end_of_verse}',
  conductorNotes: null,
  pdfCount: 0,
  createdAt: '',
  updatedAt: '',
};

const SONG_EXTRA: Song = {
  id: 'song-extra',
  title: 'Canto Fuori Scaletta',
  subtitle: null,
  author: null,
  originalKey: 'Lam',
  tempoBpm: null,
  timeSignature: null,
  tags: [],
  chordproContent: '{start_of_verse: Strofa 1}\n[Lam]Fuori [Mi]scaletta\n{end_of_verse}',
  conductorNotes: null,
  pdfCount: 0,
  createdAt: '',
  updatedAt: '',
};

const SAMPLE_SETLIST: SetlistWithItems = {
  id: 'sl-1',
  title: 'Scaletta Prova',
  eventDate: '2026-12-06',
  notes: null,
  itemCount: 2,
  createdAt: '',
  updatedAt: '',
  items: [
    {
      id: 'item-1',
      setlistId: 'sl-1',
      songId: 'song-1',
      position: 0,
      overrideKey: null,
      notes: null,
      song: {
        id: 'song-1',
        title: 'Canto Uno',
        author: null,
        originalKey: 'Sol',
        tempoBpm: 76,
        timeSignature: '4/4',
      },
    },
    {
      id: 'item-2',
      setlistId: 'sl-1',
      songId: 'song-2',
      position: 1,
      overrideKey: 'Do',
      notes: null,
      song: {
        id: 'song-2',
        title: 'Canto Due',
        author: null,
        originalKey: 'Re',
        tempoBpm: null,
        timeSignature: null,
      },
    },
  ],
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
  sortOrder: 10,
};

function renderLive(role: Role, userId: string, activeInstrument: Instrument | null = GUITAR) {
  const permissions = getPermissionsForRole(role, true);
  const authOverride: AuthContextValue = {
    status: 'authenticated',
    profile: {
      id: userId,
      email: `${role}@arion.local`,
      displayName: role === 'conductor' ? 'Maestro Demo' : 'Musicista Demo',
      role,
      isActive: true,
      activeInstrumentId: activeInstrument?.id ?? null,
      preferredNotation: 'italian',
      preferredTheme: 'daylight',
      preferredTextSize: 'compact',
      fontScale: 1,
    },
    permissions,
    instanceSettings: null,
    instruments: activeInstrument ? [activeInstrument] : [],
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

  return render(
    <MemoryRouter initialEntries={['/live']}>
      <ThemeProvider>
        <AuthProvider valueOverride={authOverride}>
          <LivePage />
        </AuthProvider>
      </ThemeProvider>
    </MemoryRouter>,
  );
}

describe('LivePage (Live Mode v1 Realtime Console & Musician Sync)', () => {
  let currentServerSession: LiveSessionState;

  beforeEach(() => {
    vi.clearAllMocks();
    capturedChannelCallbacks = {};
    currentServerSession = createIdleLiveSession();

    vi.mocked(fetchLiveSession).mockImplementation(async () => currentServerSession);
    vi.mocked(listSetlists).mockResolvedValue([SAMPLE_SETLIST]);
    vi.mocked(listSongs).mockResolvedValue([SONG_ONE, SONG_TWO, SONG_EXTRA]);
    vi.mocked(getSongById).mockImplementation(async (id) => {
      return [SONG_ONE, SONG_TWO, SONG_EXTRA].find((s) => s.id === id) ?? null;
    });
    vi.mocked(listSongAssets).mockResolvedValue([]);
    vi.mocked(getUserSongPreferences).mockResolvedValue(null);
    vi.mocked(upsertUserSongPreferences).mockResolvedValue({
      userId: 'user-1',
      songId: 'song-1',
      capoFrets: 0,
      preferredView: 'chords',
      preferredAssetId: null,
      personalNotes: null,
      updatedAt: '',
    });

    vi.mocked(updateLiveSession).mockImplementation(async (patch) => {
      currentServerSession = {
        ...currentServerSession,
        isActive: patch.is_active ?? currentServerSession.isActive,
        conductorId:
          patch.conductor_id !== undefined ? patch.conductor_id : currentServerSession.conductorId,
        conductorName: 'Maestro Demo',
        setlistId:
          patch.setlist_id !== undefined ? patch.setlist_id : currentServerSession.setlistId,
        activeSetlistItemId:
          patch.active_setlist_item_id !== undefined
            ? patch.active_setlist_item_id
            : currentServerSession.activeSetlistItemId,
        activeSongId:
          patch.active_song_id !== undefined
            ? patch.active_song_id
            : currentServerSession.activeSongId,
        activeKey:
          patch.active_key !== undefined ? patch.active_key : currentServerSession.activeKey,
        activeSectionIndex:
          patch.active_section_index !== undefined
            ? patch.active_section_index
            : currentServerSession.activeSectionIndex,
        activePage:
          patch.active_page !== undefined ? patch.active_page : currentServerSession.activePage,
        nextSongId:
          patch.next_song_id !== undefined ? patch.next_song_id : currentServerSession.nextSongId,
        nextSongKey:
          patch.next_song_key !== undefined
            ? patch.next_song_key
            : currentServerSession.nextSongKey,
        flashSignal:
          patch.flash_signal !== undefined ? patch.flash_signal : currentServerSession.flashSignal,
      };
      return currentServerSession;
    });

    vi.mocked(endLiveSession).mockImplementation(async () => {
      currentServerSession = createIdleLiveSession();
      return currentServerSession;
    });
  });

  vitestIt(
    'allows conductor to start from setlist, announce next song, sync section, launch off-setlist & return, send flash signal and end Live',
    async () => {
      renderLive('conductor', 'cond-1');

      await waitFor(() => {
        expect(screen.getByRole('button', { name: it.live.startLiveButton })).toBeInTheDocument();
      });

      expect(subscribeToLiveChannel).toHaveBeenCalledTimes(1);

      // Start from setlist
      fireEvent.click(screen.getByRole('button', { name: it.live.startLiveButton }));
      await waitFor(() => {
        expect(screen.getByRole('heading', { name: 'Canto Uno' })).toBeInTheDocument();
      });
      expect(mockSendStateSync).toHaveBeenCalled();

      // Announce next song in setlist
      fireEvent.click(screen.getByRole('button', { name: it.live.announceNextShort('Canto Due') }));
      await waitFor(() => {
        expect(screen.getByTestId('live-next-song-banner')).toHaveTextContent('Canto Due');
      });

      // Click ChordPro section badge ("Ritornello") to broadcast activeSectionIndex = 1
      fireEvent.click(screen.getByRole('button', { name: 'Ritornello' }));
      await waitFor(() => {
        expect(updateLiveSession).toHaveBeenCalledWith({ active_section_index: 1 });
      });

      // Launch off-setlist song
      fireEvent.click(screen.getByRole('button', { name: it.live.offSetlistButton }));
      const launchButtons = screen.getAllByRole('button', { name: it.live.launchNowButton });
      fireEvent.click(launchButtons[2]!); // Canto Fuori Scaletta

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: 'Canto Fuori Scaletta' })).toBeInTheDocument();
      });

      // Return to paused setlist position
      fireEvent.click(screen.getByRole('button', { name: it.live.returnToSetlistButton }));
      await waitFor(() => {
        expect(screen.getByRole('heading', { name: 'Canto Uno' })).toBeInTheDocument();
      });

      // Send flash signal preset
      fireEvent.click(screen.getByRole('button', { name: it.live.flashSignalsButton }));
      fireEvent.click(screen.getByRole('button', { name: it.live.signalPresets[0]! }));
      await waitFor(() => {
        expect(screen.getByRole('status')).toHaveTextContent(it.live.signalPresets[0]!);
        expect(mockSendFlashSignal).toHaveBeenCalled();
      });

      // End Live session
      fireEvent.click(screen.getByRole('button', { name: it.live.endLiveButton }));
      fireEvent.click(screen.getByRole('button', { name: it.live.confirmEndButton }));
      await waitFor(() => {
        expect(endLiveSession).toHaveBeenCalledTimes(1);
        expect(screen.getByRole('button', { name: it.live.startLiveButton })).toBeInTheDocument();
      });
    },
  );

  vitestIt(
    'allows musician to receive broadcast updates, transpose with local capo, browse off-Live (detach) and re-attach via Torna al Live',
    async () => {
      currentServerSession = {
        ...createIdleLiveSession(),
        isActive: true,
        conductorId: 'cond-1',
        conductorName: 'Maestro Demo',
        setlistId: 'sl-1',
        activeSetlistItemId: 'item-1',
        activeSongId: 'song-1',
        activeKey: 'La',
        nextSongId: 'song-2',
        nextSongKey: 'Do',
      };

      renderLive('musician', 'mus-1', GUITAR);

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: 'Canto Uno' })).toBeInTheDocument();
      });

      // Live activeKey 'La' transposed from original 'Sol' shows Mi/Sol#
      await waitFor(() => {
        expect(screen.getByText('Mi/Sol#')).toBeInTheDocument();
      });
      expect(screen.getByTestId('live-next-song-banner')).toHaveTextContent('Canto Due');

      // Receive flash signal via Broadcast callback
      capturedChannelCallbacks.onFlashSignal?.({
        id: 'sig-live-1',
        message: 'Senza intro',
        issuedAt: new Date().toISOString(),
        issuedByName: 'Maestro Demo',
      });
      await waitFor(() => {
        expect(screen.getByRole('status')).toHaveTextContent('Senza intro');
      });

      // Musician locally consults another song -> detaches
      fireEvent.click(screen.getByRole('button', { name: it.live.browseOtherSongButton }));
      fireEvent.click(screen.getByRole('button', { name: /Canto Fuori Scaletta/i }));

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: 'Canto Fuori Scaletta' })).toBeInTheDocument();
        expect(screen.getByTestId('live-detached-banner')).toBeInTheDocument();
      });

      // Return to Live re-attaches immediately to Conductor's active song
      fireEvent.click(screen.getByRole('button', { name: it.live.returnToLiveButton }));
      await waitFor(() => {
        expect(screen.getByRole('heading', { name: 'Canto Uno' })).toBeInTheDocument();
        expect(screen.queryByTestId('live-detached-banner')).not.toBeInTheDocument();
      });
    },
  );

  vitestIt('allows a second conductor to explicitly take over an active session', async () => {
    currentServerSession = {
      ...createIdleLiveSession(),
      isActive: true,
      conductorId: 'cond-original',
      conductorName: 'Maestro Precedente',
      activeSongId: 'song-1',
      activeKey: 'Sol',
    };

    renderLive('conductor', 'cond-2', GUITAR);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: it.live.takeoverButton })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: it.live.takeoverButton }));
    fireEvent.click(screen.getByRole('button', { name: it.live.confirmTakeoverButton }));

    await waitFor(() => {
      expect(updateLiveSession).toHaveBeenCalledWith({ conductor_id: 'cond-2' });
      expect(screen.getByTestId('live-conductor-console')).toBeInTheDocument();
    });
  });
});
