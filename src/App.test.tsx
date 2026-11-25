import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it as vitestIt } from 'vitest';
import { App } from '@/App';
import type { Instrument } from '@/domain/models/instruments';
import { can, canAny, getPermissionsForRole, type Role } from '@/domain/rbac/permissions';
import type { AuthContextValue } from '@/features/auth/authContextStore';
import { it } from '@/i18n/it';

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

  vitestIt('opens Repertorio, enters SongReaderPage, toggles chords and scales font', () => {
    renderApp(['/repertorio']);

    expect(screen.getByRole('heading', { name: it.repertoire.title })).toBeInTheDocument();
    fireEvent.click(
      screen.getByRole('link', { name: it.repertoire.openSongLabel('Canto di Prova') }),
    );

    expect(screen.getByRole('heading', { name: 'Canto di Prova' })).toBeInTheDocument();
    expect(screen.getByText('Sol/Si')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: it.reader.modeChords }));
    expect(screen.queryByText('Sol/Si')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: it.reader.modeLyricsOnly })).toBeInTheDocument();

    const body = screen.getByTestId('lectern-song-body');
    expect(body.style.fontSize).toBe('1rem');
    fireEvent.click(screen.getByRole('button', { name: it.reader.fontIncreaseLabel }));
    expect(body.style.fontSize).toBe('1.1rem');
    fireEvent.click(screen.getByRole('button', { name: it.reader.fontDecreaseLabel }));
    expect(body.style.fontSize).toBe('1rem');
  });

  vitestIt(
    'defaults SongReaderPage to Solo Testo for a voice instrument and Chords for guitar',
    () => {
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
      expect(screen.queryByText('Sol/Si')).not.toBeInTheDocument();
      expect(screen.getByRole('button', { name: it.reader.modeLyricsOnly })).toBeInTheDocument();
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
      expect(screen.getByText('Sol/Si')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: it.reader.modeChords })).toBeInTheDocument();
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
    'navigates through Altro menu to Settings, Support, Guide, Privacy and Developer Info',
    () => {
      renderApp(['/altro']);

      expect(screen.getByRole('heading', { name: it.more.title })).toBeInTheDocument();

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
    },
  );
});
