import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it as vitestIt, vi } from 'vitest';
import { ThemeProvider } from '@/components/ThemeProvider';
import type { Instrument, UserInstrumentAssignment } from '@/domain/models/instruments';
import { can, canAny, getPermissionsForRole } from '@/domain/rbac/permissions';
import type { AuthContextValue } from '@/features/auth/authContextStore';
import { AuthProvider } from '@/features/auth/AuthProvider';
import { ActiveInstrumentSwitcher } from '@/features/profile/ActiveInstrumentSwitcher';
import { it } from '@/i18n/it';

const SOPRANO: Instrument = {
  id: 'inst-soprano',
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

const CLARINET: Instrument = {
  id: 'inst-clarinet',
  slug: 'clarinetto-sib',
  name: 'Clarinetto in Sib',
  category: 'instrument',
  defaultView: 'pdf',
  transpositionSemitones: 2,
  supportsCapo: false,
  isEnabled: true,
  sortOrder: 30,
};

function renderSwitcher(setActiveInstrument = vi.fn(async () => undefined)) {
  const permissions = getPermissionsForRole('musician', true);
  const assignments: UserInstrumentAssignment[] = [
    { userId: 'u1', instrumentId: SOPRANO.id, isPrimary: true },
    { userId: 'u1', instrumentId: GUITAR.id, isPrimary: false },
  ];

  const authOverride: AuthContextValue = {
    status: 'authenticated',
    profile: {
      id: 'u1',
      email: 'musicista@arion.local',
      displayName: 'Musicista Demo',
      role: 'musician',
      isActive: true,
      activeInstrumentId: SOPRANO.id,
      preferredNotation: 'italian',
      preferredTheme: 'daylight',
      preferredTextSize: 'compact',
      fontScale: 1,
    },
    permissions,
    instanceSettings: null,
    instruments: [SOPRANO, GUITAR, CLARINET],
    userInstruments: assignments,
    activeInstrument: SOPRANO,
    can: (perm) => can(permissions, perm),
    canAny: (reqs) => canAny(permissions, reqs),
    setActiveInstrument,
    refreshProfile: async () => undefined,
    refreshInstanceSettings: async () => undefined,
    refreshInstruments: async () => undefined,
    signOut: async () => undefined,
  };

  render(
    <MemoryRouter>
      <ThemeProvider>
        <AuthProvider valueOverride={authOverride}>
          <ActiveInstrumentSwitcher />
        </AuthProvider>
      </ThemeProvider>
    </MemoryRouter>,
  );

  return { setActiveInstrument };
}

describe('ActiveInstrumentSwitcher', () => {
  vitestIt('opens partitioned menu and switches active instrument in 1 tap', () => {
    const setActiveInstrument = vi.fn(async () => undefined);
    renderSwitcher(setActiveInstrument);

    const trigger = screen.getByRole('button', { name: it.instruments.switcherButtonLabel });
    expect(trigger).toHaveTextContent('Soprano');

    fireEvent.click(trigger);

    expect(screen.getByRole('listbox', { name: it.instruments.switcherMenuLabel })).toBeVisible();
    expect(screen.getByText(it.instruments.myInstrumentsHeading)).toBeInTheDocument();
    expect(screen.getByText(it.instruments.otherInstrumentsHeading)).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: it.instruments.manageMyInstrumentsLink }),
    ).toHaveAttribute('href', '/impostazioni');

    fireEvent.click(screen.getByRole('option', { name: /Chitarra/i }));
    expect(setActiveInstrument).toHaveBeenCalledWith(GUITAR.id);
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  vitestIt('closes popover on Escape key', () => {
    renderSwitcher();

    fireEvent.click(screen.getByRole('button', { name: it.instruments.switcherButtonLabel }));
    expect(screen.getByRole('listbox')).toBeInTheDocument();

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });
});
