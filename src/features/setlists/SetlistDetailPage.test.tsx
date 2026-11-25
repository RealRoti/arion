import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it as vitestIt, vi } from 'vitest';
import { ThemeProvider } from '@/components/ThemeProvider';
import type { SetlistWithItems } from '@/domain/models/setlists';
import type { Song } from '@/domain/models/songs';
import { can, canAny, getPermissionsForRole, type Role } from '@/domain/rbac/permissions';
import type { AuthContextValue } from '@/features/auth/authContextStore';
import { AuthProvider } from '@/features/auth/AuthProvider';
import { SetlistDetailPage } from '@/features/setlists/SetlistDetailPage';
import { it } from '@/i18n/it';
import {
  addSongToSetlist,
  getSetlistById,
  reorderSetlistItems,
  updateSetlistItem,
} from '@/services/setlistsService';
import { listSongs } from '@/services/songsService';

vi.mock('@/services/setlistsService', () => ({
  getSetlistById: vi.fn(),
  updateSetlist: vi.fn(),
  addSongToSetlist: vi.fn(),
  updateSetlistItem: vi.fn(),
  removeSetlistItem: vi.fn(async () => undefined),
  reorderSetlistItems: vi.fn(async () => undefined),
}));

vi.mock('@/services/songsService', () => ({
  listSongs: vi.fn(),
}));

const INITIAL_SETLIST: SetlistWithItems = {
  id: 'sl-1',
  title: 'Scaletta Domenica',
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
        title: 'Canto Ingresso',
        author: null,
        originalKey: 'Do',
        tempoBpm: null,
        timeSignature: null,
      },
    },
    {
      id: 'item-2',
      setlistId: 'sl-1',
      songId: 'song-2',
      position: 1,
      overrideKey: 'Fa',
      notes: null,
      song: {
        id: 'song-2',
        title: 'Canto Offertorio',
        author: null,
        originalKey: 'Sol',
        tempoBpm: null,
        timeSignature: null,
      },
    },
  ],
};

const CATALOG_SONGS: Song[] = [
  {
    id: 'song-3',
    title: 'Canto Finale',
    subtitle: null,
    author: null,
    originalKey: 'Re',
    tempoBpm: null,
    timeSignature: null,
    tags: [],
    chordproContent: '',
    conductorNotes: null,
    pdfCount: 0,
    createdAt: '',
    updatedAt: '',
  },
];

function renderSetlistDetail(role: Role) {
  const permissions = getPermissionsForRole(role, true);
  const authOverride: AuthContextValue = {
    status: 'authenticated',
    profile: {
      id: 'user-1',
      email: `${role}@arion.local`,
      displayName: 'Utente Demo',
      role,
      isActive: true,
      activeInstrumentId: null,
      preferredNotation: 'italian',
      preferredTheme: 'daylight',
      preferredTextSize: 'compact',
      fontScale: 1,
    },
    permissions,
    instanceSettings: null,
    instruments: [],
    userInstruments: [],
    activeInstrument: null,
    can: (perm) => can(permissions, perm),
    canAny: (reqs) => canAny(permissions, reqs),
    setActiveInstrument: async () => undefined,
    refreshProfile: async () => undefined,
    refreshInstanceSettings: async () => undefined,
    refreshInstruments: async () => undefined,
    signOut: async () => undefined,
  };

  render(
    <MemoryRouter initialEntries={['/scalette/sl-1']}>
      <ThemeProvider>
        <AuthProvider valueOverride={authOverride}>
          <Routes>
            <Route path="/scalette/:setlistId" element={<SetlistDetailPage />} />
          </Routes>
        </AuthProvider>
      </ThemeProvider>
    </MemoryRouter>,
  );
}

describe('SetlistDetailPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getSetlistById).mockResolvedValue(INITIAL_SETLIST);
    vi.mocked(listSongs).mockResolvedValue(CATALOG_SONGS);
    vi.mocked(updateSetlistItem).mockResolvedValue({
      ...INITIAL_SETLIST.items[0]!,
      overrideKey: 'Re',
    });
    vi.mocked(addSongToSetlist).mockResolvedValue({
      id: 'item-3',
      setlistId: 'sl-1',
      songId: 'song-3',
      position: 2,
      overrideKey: null,
      notes: null,
      song: {
        id: 'song-3',
        title: 'Canto Finale',
        author: null,
        originalKey: 'Re',
        tempoBpm: null,
        timeSignature: null,
      },
    });
  });

  vitestIt('reorders items, changes override key and adds a song for conductor', async () => {
    renderSetlistDetail('conductor');

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Scaletta Domenica' })).toBeInTheDocument();
    });

    // Move first item down
    fireEvent.click(
      screen.getByRole('button', { name: `${it.setlists.moveDownLabel} Canto Ingresso` }),
    );
    await waitFor(() => {
      expect(reorderSetlistItems).toHaveBeenCalledWith('sl-1', ['item-2', 'item-1']);
    });

    // Change override key on first song
    const overrideSelect = screen.getByLabelText(
      `${it.setlists.itemKeyOverrideLabel} Canto Ingresso`,
    );
    fireEvent.change(overrideSelect, { target: { value: 'Re' } });
    await waitFor(() => {
      expect(updateSetlistItem).toHaveBeenCalledWith('item-1', { overrideKey: 'Re' });
    });

    // Add song from catalog
    fireEvent.click(screen.getByRole('button', { name: it.setlists.addSongButton }));
    await waitFor(() => {
      expect(addSongToSetlist).toHaveBeenCalledWith('sl-1', 'song-3', 2, {
        overrideKey: null,
        notes: null,
      });
      expect(screen.getByText('Canto Finale')).toBeInTheDocument();
    });
  });

  vitestIt('renders read-only sequence without management controls for musician', async () => {
    renderSetlistDetail('musician');

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Scaletta Domenica' })).toBeInTheDocument();
    });

    expect(screen.getByText('Canto Ingresso')).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: `${it.setlists.moveDownLabel} Canto Ingresso` }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: it.setlists.addSongButton }),
    ).not.toBeInTheDocument();
  });
});
