import { createContext } from 'react';
import type { InstanceSettings, UserProfile } from '@/domain/models/auth';
import type { Permission } from '@/domain/rbac/permissions';

export type AuthStatus =
  'loading' | 'unconfigured' | 'unauthenticated' | 'inactive' | 'authenticated';

export interface AuthContextValue {
  status: AuthStatus;
  profile: UserProfile | null;
  permissions: ReadonlySet<Permission>;
  instanceSettings: InstanceSettings | null;
  can: (permission: Permission) => boolean;
  canAny: (required: readonly Permission[]) => boolean;
  refreshProfile: () => Promise<void>;
  refreshInstanceSettings: () => Promise<void>;
  signOut: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextValue | null>(null);
