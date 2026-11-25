import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it as vitestIt, vi } from 'vitest';
import { ThemeProvider } from '@/components/ThemeProvider';
import type { Instrument } from '@/domain/models/instruments';
import { can, canAny, getPermissionsForRole, type Role } from '@/domain/rbac/permissions';
import { AdminInstrumentsPage } from '@/features/admin/AdminInstrumentsPage';
import type { AuthContextValue } from '@/features/auth/authContextStore';
import { AuthProvider } from '@/features/auth/AuthProvider';
import { it } from '@/i18n/it';
import {
  createInstrument,
  listInstruments,
  swapInstrumentSortOrder,
  updateInstrument,
} from '@/services/instrumentsService';

vi.mock('@/services/instrumentsService', () => ({
  listInstruments: vi.fn(),
  createInstrument: vi.fn(),
  updateInstrument: vi.fn(),
  swapInstrumentSortOrder: vi.fn(),
  listUserInstruments: vi.fn(async () => []),
  InstrumentsServiceError: class extends Error {
    readonly code: string;
    constructor(code: string, message: string) {
      super(message);
      this.code = code;
    }
  },
}));

const VOICE: Instrument = {
  id: 'inst-1',
  slug: 'voce',
  name: 'Voce / Corista',
  category: 'voice',
  defaultView: 'lyrics_only',
  transpositionSemitones: 0,
  supportsCapo: false,
  isEnabled: true,
  sortOrder: 10,
};

const CLARINET_DISABLED: Instrument = {
  id: 'inst-2',
  slug: 'clarinetto-sib',
  name: 'Clarinetto in Sib',
  category: 'instrument',
  defaultView: 'pdf',
  transpositionSemitones: 2,
  supportsCapo: false,
  isEnabled: false,
  sortOrder: 20,
};

function renderAdminInstruments(
  role: Role = 'admin',
  refreshInstruments = vi.fn(async () => undefined),
) {
  const permissions = getPermissionsForRole(role, true);
  const authOverride: AuthContextValue = {
    status: 'authenticated',
    profile: {
      id: 'u1',
      email: `${role}@arion.local`,
      displayName: 'Demo User',
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
    instruments: [VOICE],
    userInstruments: [],
    activeInstrument: VOICE,
    can: (perm) => can(permissions, perm),
    canAny: (reqs) => canAny(permissions, reqs),
    setActiveInstrument: async () => undefined,
    refreshProfile: async () => undefined,
    refreshInstanceSettings: async () => undefined,
    refreshInstruments,
    signOut: async () => undefined,
  };

  render(
    <MemoryRouter>
      <ThemeProvider>
        <AuthProvider valueOverride={authOverride}>
          <AdminInstrumentsPage />
        </AuthProvider>
      </ThemeProvider>
    </MemoryRouter>,
  );
}

describe('AdminInstrumentsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(listInstruments).mockResolvedValue([VOICE, CLARINET_DISABLED]);
    vi.mocked(createInstrument).mockResolvedValue({
      id: 'inst-3',
      slug: 'tromba-in-sib',
      name: 'Tromba in Sib',
      category: 'instrument',
      defaultView: 'pdf',
      transpositionSemitones: 2,
      supportsCapo: false,
      isEnabled: true,
      sortOrder: 30,
    });
    vi.mocked(updateInstrument).mockResolvedValue({
      ...CLARINET_DISABLED,
      isEnabled: true,
    });
    vi.mocked(swapInstrumentSortOrder).mockResolvedValue(undefined);
  });

  vitestIt('blocks access for non-admin roles', () => {
    renderAdminInstruments('musician');
    expect(screen.getByText(it.forbidden.title)).toBeInTheDocument();
  });

  vitestIt('lists, filters, creates, toggles and reorders instruments for admin', async () => {
    const refreshInstruments = vi.fn(async () => undefined);
    renderAdminInstruments('admin', refreshInstruments);

    await waitFor(() => {
      expect(screen.getByText('Voce / Corista')).toBeInTheDocument();
      expect(screen.getByText('Clarinetto in Sib')).toBeInTheDocument();
    });

    // Filter to disabled only
    fireEvent.click(screen.getByRole('button', { name: /Disabilitati \(1\)/i }));
    expect(screen.queryByText('Voce / Corista')).not.toBeInTheDocument();
    expect(screen.getByText('Clarinetto in Sib')).toBeInTheDocument();

    // Back to all
    fireEvent.click(screen.getByRole('button', { name: /Tutti \(2\)/i }));
    expect(screen.getByText('Voce / Corista')).toBeInTheDocument();

    // Create a new instrument
    fireEvent.change(screen.getByLabelText(it.adminInstruments.nameLabel), {
      target: { value: 'Tromba in Sib' },
    });
    fireEvent.change(screen.getByLabelText(it.adminInstruments.defaultViewLabel), {
      target: { value: 'pdf' },
    });
    fireEvent.change(screen.getByLabelText(it.adminInstruments.transpositionLabel), {
      target: { value: '2' },
    });
    fireEvent.click(screen.getByRole('button', { name: it.adminInstruments.createButton }));

    await waitFor(() => {
      expect(createInstrument).toHaveBeenCalledWith({
        name: 'Tromba in Sib',
        slug: undefined,
        category: 'instrument',
        defaultView: 'pdf',
        transpositionSemitones: 2,
        supportsCapo: false,
        isEnabled: true,
      });
      expect(refreshInstruments).toHaveBeenCalled();
      expect(screen.getByText(it.adminInstruments.createdMessage)).toBeInTheDocument();
    });

    // Enable disabled instrument
    fireEvent.click(
      screen.getByRole('button', {
        name: `${it.adminInstruments.enableButton} Clarinetto in Sib`,
      }),
    );

    await waitFor(() => {
      expect(updateInstrument).toHaveBeenCalledWith(CLARINET_DISABLED.id, { isEnabled: true });
    });

    // Reorder first item down
    fireEvent.click(
      screen.getByRole('button', {
        name: `${it.adminInstruments.moveDownLabel} Voce / Corista`,
      }),
    );

    await waitFor(() => {
      expect(swapInstrumentSortOrder).toHaveBeenCalled();
    });
  });
});
