import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it as vitestIt, vi } from 'vitest';
import { ThemeProvider } from '@/components/ThemeProvider';
import type { Instrument } from '@/domain/models/instruments';
import { can, canAny, getPermissionsForRole } from '@/domain/rbac/permissions';
import type { AuthContextValue } from '@/features/auth/authContextStore';
import { AuthProvider } from '@/features/auth/AuthProvider';
import { MusicalProfileSection } from '@/features/profile/MusicalProfileSection';
import { it } from '@/i18n/it';
import { updateOwnProfile } from '@/services/authService';
import { saveUserInstruments } from '@/services/instrumentsService';

vi.mock('@/services/instrumentsService', () => ({
  saveUserInstruments: vi.fn(async () => []),
  listInstruments: vi.fn(async () => []),
  listUserInstruments: vi.fn(async () => []),
}));

vi.mock('@/services/authService', () => ({
  updateOwnProfile: vi.fn(async () => undefined),
  fetchOwnProfile: vi.fn(async () => null),
  getSession: vi.fn(async () => null),
  onAuthStateChange: vi.fn(() => () => undefined),
  signOut: vi.fn(async () => undefined),
}));

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

describe('MusicalProfileSection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  vitestIt(
    'allows multi-instrument selection, setting primary and saving to services',
    async () => {
      const refreshInstruments = vi.fn(async () => undefined);
      const refreshProfile = vi.fn(async () => undefined);
      const permissions = getPermissionsForRole('musician', true);

      const authOverride: AuthContextValue = {
        status: 'authenticated',
        profile: {
          id: 'u1',
          email: 'musicista@arion.local',
          displayName: 'Musicista Demo',
          role: 'musician',
          isActive: true,
          activeInstrumentId: null,
          preferredNotation: 'italian',
          preferredTheme: 'daylight',
          preferredTextSize: 'compact',
          fontScale: 1,
        },
        permissions,
        instanceSettings: null,
        instruments: [SOPRANO, GUITAR],
        userInstruments: [{ userId: 'u1', instrumentId: SOPRANO.id, isPrimary: true }],
        activeInstrument: SOPRANO,
        can: (perm) => can(permissions, perm),
        canAny: (reqs) => canAny(permissions, reqs),
        setActiveInstrument: async () => undefined,
        refreshProfile,
        refreshInstanceSettings: async () => undefined,
        refreshInstruments,
        signOut: async () => undefined,
      };

      render(
        <MemoryRouter>
          <ThemeProvider>
            <AuthProvider valueOverride={authOverride}>
              <MusicalProfileSection />
            </AuthProvider>
          </ThemeProvider>
        </MemoryRouter>,
      );

      expect(screen.getByText(it.profileInstruments.voicesGroupTitle)).toBeInTheDocument();
      expect(screen.getByText(it.profileInstruments.instrumentsGroupTitle)).toBeInTheDocument();

      // Select Guitar and mark Guitar as primary
      fireEvent.click(screen.getByRole('button', { name: /Chitarra/i }));
      fireEvent.click(
        screen.getByRole('button', { name: `${it.profileInstruments.setPrimaryLabel} Chitarra` }),
      );

      fireEvent.click(screen.getByRole('button', { name: it.profileInstruments.saveButton }));

      await waitFor(() => {
        expect(saveUserInstruments).toHaveBeenCalledWith('u1', [SOPRANO.id, GUITAR.id], GUITAR.id);
        expect(updateOwnProfile).toHaveBeenCalledWith('u1', { activeInstrumentId: GUITAR.id });
        expect(refreshInstruments).toHaveBeenCalled();
        expect(refreshProfile).toHaveBeenCalled();
        expect(screen.getByText(it.profileInstruments.savedMessage)).toBeInTheDocument();
      });
    },
  );
});
