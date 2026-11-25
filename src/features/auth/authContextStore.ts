import { createContext } from 'react';
import type { InstanceSettings, UserProfile } from '@/domain/models/auth';
import type { Instrument, UserInstrumentAssignment } from '@/domain/models/instruments';
import type { Permission } from '@/domain/rbac/permissions';

export type AuthStatus =
  'loading' | 'unconfigured' | 'unauthenticated' | 'inactive' | 'authenticated';

export interface AuthContextValue {
  status: AuthStatus;
  profile: UserProfile | null;
  permissions: ReadonlySet<Permission>;
  instanceSettings: InstanceSettings | null;
  instruments: readonly Instrument[];
  userInstruments: readonly UserInstrumentAssignment[];
  activeInstrument: Instrument | null;
  can: (permission: Permission) => boolean;
  canAny: (required: readonly Permission[]) => boolean;
  setActiveInstrument: (instrumentId: string) => Promise<void>;
  refreshProfile: () => Promise<void>;
  refreshInstanceSettings: () => Promise<void>;
  refreshInstruments: () => Promise<void>;
  signOut: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextValue | null>(null);
