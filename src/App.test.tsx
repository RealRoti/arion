import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it as vitestIt, vi } from 'vitest';
import { App } from '@/App';
import { getAppEnv } from '@/config/env';
import type { Instrument } from '@/domain/models/instruments';
import type { Song } from '@/domain/models/songs';
import { can, canAny, getPermissionsForRole, type Role } from '@/domain/rbac/permissions';
import type { AuthContextValue } from '@/features/auth/authContextStore';
import { it } from '@/i18n/it';

const SAMPLE_SONG: Song = {
  id: 'canto-di-prova',
  title: 'Canto di Prova',
  subtitle: 'Brano di prova',
  author: 'Tradizionale (Demo)',
  originalKey: 'Sol',
  tempoBpm: 76,
  timeSignature: '4/4',
  tags: ['Ingresso'],
  chordproContent:
    '{start_of_verse: Strofa 1}\n[Sol]Ecco il [Sol/Si]canto che [Mim]sale\n{end_of_verse}',
  conductorNotes: null,
  pdfCount: 0,
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
};

vi.mock('@/services/songsService', () => ({
  listSongs: vi.fn(async () => [SAMPLE_SONG]),
  listRecentSongs: vi.fn(async () => [SAMPLE_SONG]),
  getSongById: vi.fn(async (songId: string) => (songId === SAMPLE_SONG.id ? SAMPLE_SONG : null)),
  listSongAssets: vi.fn(async () => []),
  getUserSongPreferences: vi.fn(async () => null),
  upsertUserSongPreferences: vi.fn(async () => undefined),
}));

function createMockAuth(
  role: Role,
  status: AuthContextValue['status'] = 'authenticated',
  activeInstrument: Instrument | null = null,
): AuthContextValue {
  const permissions = getPermissionsForRole(role, status === 'authenticated');
  return {
    status,
    profile:
      status === 'authenticated'
        ? {
            id: 'test-user-id',
            email: `${role}@arion.local`,
            displayName: 'Test Demo',
            role,
            isActive: true,
            activeInstrumentId: activeInstrument?.id ?? null,
            preferredNotation: 'italian',
            preferredTheme: 'daylight',
            preferredTextSize: 'compact',
            fontScale: 1,
          }
        : null,
    permissions,
    instanceSettings:
      status === 'authenticated'
        ? {
            id: 1,
            groupName: 'Coro Demo',
            groupSubtitle: null,
            logoPath: null,
            logoSignedUrl: null,
            defaultNotation: 'italian',
            defaultTheme: 'daylight',
            updatedAt: new Date().toISOString(),
          }
        : null,
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
}

function renderApp(initialEntries: string[] = ['/'], auth = createMockAuth('musician')) {
  return render(
    <MemoryRouter initialEntries={initialEntries}>
      <App authOverride={auth} />
    </MemoryRouter>,
  );
}

describe('Arion App Navigation & RBAC Screens', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  vitestIt('shows LoginPage when unauthenticated', () => {
    renderApp(['/'], createMockAuth('musician', 'unauthenticated'));

    expect(screen.getByRole('heading', { name: it.auth.loginTitle })).toBeInTheDocument();
  });

  vitestIt('renders the 5 primary navigation items and Home workspace when authenticated', () => {
    renderApp();

    expect(screen.getAllByRole('link', { name: it.nav.home }).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByRole('link', { name: it.nav.repertoire }).length).toBeGreaterThanOrEqual(
      1,
    );
    expect(screen.getAllByRole('link', { name: it.nav.live }).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByRole('link', { name: it.nav.calendar }).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByRole('link', { name: it.nav.more }).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(it.home.nextEventSampleTitle)).toBeInTheDocument();
  });

  vitestIt('opens Repertorio, enters SongReaderPage, toggles chords and scales font', async () => {
    renderApp(['/repertorio']);

    expect(screen.getByRole('heading', { name: it.repertoire.title })).toBeInTheDocument();
    await waitFor(() => {
      expect(
        screen.getByRole('link', { name: it.repertoire.openSongLabel('Canto di Prova') }),
      ).toBeInTheDocument();
    });

    fireEvent.click(
      screen.getByRole('link', { name: it.repertoire.openSongLabel('Canto di Prova') }),
    );

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Canto di Prova' })).toBeInTheDocument();
    });
    expect(screen.getByText('Sol/Si')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: it.reader.modeLyricsOnly }));
    expect(screen.queryByText('Sol/Si')).not.toBeInTheDocument();

    const body = screen.getByTestId('lectern-song-body');
    expect(body.style.fontSize).toBe('1rem');
    fireEvent.click(screen.getByRole('button', { name: it.reader.fontIncreaseLabel }));
    expect(body.style.fontSize).toBe('1.1rem');
    fireEvent.click(screen.getByRole('button', { name: it.reader.fontDecreaseLabel }));
    expect(body.style.fontSize).toBe('1rem');
  });

  vitestIt(
    'defaults SongReaderPage to Solo Testo for a voice instrument and Chords for guitar',
    async () => {
      const voiceInstrument: Instrument = {
        id: 'voice-1',
        slug: 'soprano',
        name: 'Soprano',
        category: 'voice',
        defaultView: 'lyrics_only',
        transpositionSemitones: 0,
        supportsCapo: false,
        isEnabled: true,
        sortOrder: 10,
      };

      const { unmount } = renderApp(
        ['/repertorio/canto-di-prova'],
        createMockAuth('musician', 'authenticated', voiceInstrument),
      );
      await waitFor(() => {
        expect(screen.getByRole('heading', { name: 'Canto di Prova' })).toBeInTheDocument();
      });
      expect(screen.queryByText('Sol/Si')).not.toBeInTheDocument();
      expect(screen.getByRole('button', { name: it.reader.modeLyricsOnly })).toHaveAttribute(
        'aria-pressed',
        'true',
      );
      unmount();

      const guitarInstrument: Instrument = {
        id: 'guitar-1',
        slug: 'chitarra',
        name: 'Chitarra',
        category: 'instrument',
        defaultView: 'chords',
        transpositionSemitones: 0,
        supportsCapo: true,
        isEnabled: true,
        sortOrder: 20,
      };

      renderApp(
        ['/repertorio/canto-di-prova'],
        createMockAuth('musician', 'authenticated', guitarInstrument),
      );
      await waitFor(() => {
        expect(screen.getByText('Sol/Si')).toBeInTheDocument();
      });
      expect(screen.getByRole('button', { name: it.reader.modeChords })).toHaveAttribute(
        'aria-pressed',
        'true',
      );
    },
  );

  vitestIt('switches CalendarPage between Prossimi and Mese views', () => {
    renderApp(['/calendario']);

    expect(screen.getByRole('heading', { name: it.calendar.title })).toBeInTheDocument();
    expect(screen.getByText('Prova settimanale di repertorio')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: it.calendar.viewMonth }));
    expect(screen.getByRole('button', { name: it.calendar.todayButton })).toBeInTheDocument();
    expect(screen.getByText(it.calendar.weekdaysShort[0])).toBeInTheDocument();
  });

  vitestIt('hides Admin section in Altro for musician and shows it for admin', () => {
    const { unmount } = renderApp(['/altro'], createMockAuth('musician'));
    expect(screen.queryByRole('link', { name: it.nav.adminControlPanel })).not.toBeInTheDocument();
    unmount();

    renderApp(['/altro'], createMockAuth('admin'));
    const adminLink = screen.getByRole('link', { name: it.nav.adminControlPanel });
    expect(adminLink).toBeInTheDocument();
    fireEvent.click(adminLink);
    expect(screen.getByRole('heading', { name: it.admin.title })).toBeInTheDocument();
  });

  vitestIt(
    'navigates through Altro menu, shows open-source Roti footer and reaches Developer Info releases',
    () => {
      renderApp(['/altro']);

      expect(screen.getByRole('heading', { name: it.more.title })).toBeInTheDocument();
      expect(
        screen.getByText(new RegExp(`versione ${getAppEnv().appVersion}`)),
      ).toBeInTheDocument();
      expect(screen.getByRole('link', { name: it.more.footerAuthorName })).toHaveAttribute(
        'href',
        it.app.githubRepoUrl,
      );
      expect(screen.getByText(it.more.footerOpenSource)).toBeInTheDocument();

      fireEvent.click(screen.getByRole('link', { name: it.nav.settings }));
      expect(screen.getByRole('heading', { name: it.settings.title })).toBeInTheDocument();
      fireEvent.click(screen.getByRole('radio', { name: it.themes.stageDark }));
      expect(document.documentElement.dataset.theme).toBe('stage_dark');

      const backLinks = screen.getAllByRole('link', { name: it.settings.backToMore });
      fireEvent.click(backLinks[backLinks.length - 1]!);
      fireEvent.click(screen.getByRole('link', { name: it.nav.support }));
      expect(screen.getByRole('heading', { name: it.support.title })).toBeInTheDocument();

      fireEvent.click(screen.getByRole('link', { name: it.nav.back }));
      fireEvent.click(screen.getByRole('link', { name: it.nav.privacy }));
      expect(screen.getByRole('heading', { name: it.privacy.title })).toBeInTheDocument();

      fireEvent.click(screen.getByRole('link', { name: it.nav.back }));
      fireEvent.click(screen.getByRole('link', { name: it.nav.guide }));
      expect(screen.getByRole('heading', { name: it.guide.title })).toBeInTheDocument();

      fireEvent.click(screen.getByRole('link', { name: it.nav.back }));
      fireEvent.click(screen.getByRole('link', { name: it.nav.devInfo }));
      expect(screen.getByRole('heading', { name: it.devInfo.title })).toBeInTheDocument();

      fireEvent.click(screen.getByRole('button', { name: new RegExp(it.devInfo.techTitle) }));
      expect(screen.getByText(it.devInfo.techItems[0])).toBeInTheDocument();

      fireEvent.click(screen.getByRole('button', { name: new RegExp(it.devInfo.changelogTitle) }));
      expect(screen.getByText(it.devInfo.changelogReleases[0]!.title)).toBeInTheDocument();
    },
  );
});
