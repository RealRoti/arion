import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it as vitestIt } from 'vitest';
import { RequirePermission } from '@/components/RequirePermission';
import { ThemeProvider } from '@/components/ThemeProvider';
import { can, canAny, getPermissionsForRole, type Role } from '@/domain/rbac/permissions';
import type { AuthContextValue } from '@/features/auth/authContextStore';
import { AuthProvider } from '@/features/auth/AuthProvider';
import { it } from '@/i18n/it';

function buildAuthOverride(role: Role): AuthContextValue {
  const permissions = getPermissionsForRole(role, true);
  return {
    status: 'authenticated',
    profile: {
      id: 'user-1',
      email: `${role}@arion.local`,
      displayName: 'Test User',
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
}

describe('RequirePermission', () => {
  vitestIt('renders children when user has required permission', () => {
    render(
      <MemoryRouter>
        <ThemeProvider>
          <AuthProvider valueOverride={buildAuthOverride('admin')}>
            <RequirePermission permission="users:manage">
              <div>Area Admin</div>
            </RequirePermission>
          </AuthProvider>
        </ThemeProvider>
      </MemoryRouter>,
    );

    expect(screen.getByText('Area Admin')).toBeInTheDocument();
  });

  vitestIt('renders Italian forbidden message by default when lacking permission', () => {
    render(
      <MemoryRouter>
        <ThemeProvider>
          <AuthProvider valueOverride={buildAuthOverride('musician')}>
            <RequirePermission permission="users:manage">
              <div>Area Admin</div>
            </RequirePermission>
          </AuthProvider>
        </ThemeProvider>
      </MemoryRouter>,
    );

    expect(screen.queryByText('Area Admin')).not.toBeInTheDocument();
    expect(screen.getByText(it.forbidden.title)).toBeInTheDocument();
  });

  vitestIt('renders custom fallback when provided (e.g. null)', () => {
    render(
      <MemoryRouter>
        <ThemeProvider>
          <AuthProvider valueOverride={buildAuthOverride('musician')}>
            <RequirePermission anyOf={['instance:manage', 'users:manage']} fallback={null}>
              <div>Menu Nascosto</div>
            </RequirePermission>
          </AuthProvider>
        </ThemeProvider>
      </MemoryRouter>,
    );

    expect(screen.queryByText('Menu Nascosto')).not.toBeInTheDocument();
    expect(screen.queryByText(it.forbidden.title)).not.toBeInTheDocument();
  });
});
