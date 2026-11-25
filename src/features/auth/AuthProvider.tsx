import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';
import { useTheme } from '@/components/useTheme';
import { getAppEnv } from '@/config/env';
import type { InstanceSettings, UserProfile } from '@/domain/models/auth';
import {
  resolveActiveInstrument,
  type Instrument,
  type UserInstrumentAssignment,
} from '@/domain/models/instruments';
import {
  can as checkPermission,
  canAny as checkAnyPermission,
  getPermissionsForRole,
  type Permission,
} from '@/domain/rbac/permissions';
import {
  AuthContext,
  type AuthContextValue,
  type AuthStatus,
} from '@/features/auth/authContextStore';
import {
  fetchOwnProfile,
  getSession,
  onAuthStateChange,
  signOut as signOutService,
  updateOwnProfile,
} from '@/services/authService';
import { fetchInstanceSettings } from '@/services/instanceService';
import { listInstruments, listUserInstruments } from '@/services/instrumentsService';

interface AuthProviderProps {
  children: ReactNode;
  valueOverride?: AuthContextValue;
}

export function AuthProvider({ children, valueOverride }: AuthProviderProps) {
  const { setTheme, setTextSize, setNotation } = useTheme();
  const isConfigured = getAppEnv().isSupabaseConfigured;
  const skipRealAuth = Boolean(valueOverride) || !isConfigured;

  const [status, setStatus] = useState<AuthStatus>(() =>
    skipRealAuth ? 'unconfigured' : 'loading',
  );
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [instanceSettings, setInstanceSettings] = useState<InstanceSettings | null>(null);
  const [instruments, setInstruments] = useState<Instrument[]>([]);
  const [userInstruments, setUserInstruments] = useState<UserInstrumentAssignment[]>([]);
  const [sessionUserId, setSessionUserId] = useState<string | null>(null);
  const lastSyncedUserIdRef = useRef<string | null>(null);

  const loadSessionContext = useCallback(
    async (session: Session | null) => {
      if (!session) {
        lastSyncedUserIdRef.current = null;
        setSessionUserId(null);
        setProfile(null);
        setInstanceSettings(null);
        setInstruments([]);
        setUserInstruments([]);
        setStatus('unauthenticated');
        return;
      }

      setSessionUserId(session.user.id);

      try {
        const [loadedProfile, loadedSettings, loadedInstruments, loadedUserInstruments] =
          await Promise.all([
            fetchOwnProfile(session.user.id),
            fetchInstanceSettings().catch(() => null),
            listInstruments({ includeDisabled: false }).catch(() => []),
            listUserInstruments(session.user.id).catch(() => []),
          ]);

        if (!loadedProfile) {
          setProfile(null);
          setInstanceSettings(null);
          setInstruments([]);
          setUserInstruments([]);
          setStatus('unauthenticated');
          return;
        }

        setProfile(loadedProfile);
        setInstanceSettings(loadedSettings);
        setInstruments(loadedInstruments);
        setUserInstruments(loadedUserInstruments);

        if (!loadedProfile.isActive) {
          setStatus('inactive');
          return;
        }

        if (lastSyncedUserIdRef.current !== loadedProfile.id) {
          lastSyncedUserIdRef.current = loadedProfile.id;
          setTheme(loadedProfile.preferredTheme);
          setTextSize(loadedProfile.preferredTextSize);
          setNotation(loadedProfile.preferredNotation);
        }

        setStatus('authenticated');
      } catch (error) {
        console.error('[Arion Auth] Failed to load session context', error);
        setProfile(null);
        setInstanceSettings(null);
        setInstruments([]);
        setUserInstruments([]);
        setStatus('unauthenticated');
      }
    },
    [setNotation, setTextSize, setTheme],
  );

  useEffect(() => {
    if (skipRealAuth) {
      return;
    }

    let cancelled = false;

    const initialize = async () => {
      try {
        const initialSession = await getSession();
        if (!cancelled) {
          await loadSessionContext(initialSession);
        }
      } catch (error) {
        console.error('[Arion Auth] Failed to initialize auth session', error);
        if (!cancelled) {
          setStatus('unauthenticated');
        }
      }
    };

    void initialize();

    const unsubscribe = onAuthStateChange((nextSession) => {
      if (!cancelled) {
        void loadSessionContext(nextSession);
      }
    });

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [loadSessionContext, skipRealAuth]);

  const refreshProfile = useCallback(async () => {
    if (!sessionUserId) return;
    const updated = await fetchOwnProfile(sessionUserId);
    if (updated) {
      setProfile(updated);
      setStatus(updated.isActive ? 'authenticated' : 'inactive');
    }
  }, [sessionUserId]);

  const refreshInstanceSettings = useCallback(async () => {
    const updated = await fetchInstanceSettings();
    setInstanceSettings(updated);
  }, []);

  const refreshInstruments = useCallback(async () => {
    const loadedInstruments = await listInstruments({ includeDisabled: false });
    setInstruments(loadedInstruments);
    if (sessionUserId) {
      const loadedAssignments = await listUserInstruments(sessionUserId);
      setUserInstruments(loadedAssignments);
    }
  }, [sessionUserId]);

  const setActiveInstrument = useCallback(
    async (instrumentId: string) => {
      if (!profile) {
        return;
      }
      const previousInstrumentId = profile.activeInstrumentId;
      if (previousInstrumentId === instrumentId) {
        return;
      }

      setProfile((prev) => (prev ? { ...prev, activeInstrumentId: instrumentId } : prev));
      try {
        const updated = await updateOwnProfile(profile.id, { activeInstrumentId: instrumentId });
        setProfile(updated);
      } catch (error) {
        console.error('[Arion Auth] Failed to update active instrument', error);
        setProfile((prev) => (prev ? { ...prev, activeInstrumentId: previousInstrumentId } : prev));
      }
    },
    [profile],
  );

  const signOut = useCallback(async () => {
    await signOutService();
    lastSyncedUserIdRef.current = null;
    setSessionUserId(null);
    setProfile(null);
    setInstanceSettings(null);
    setInstruments([]);
    setUserInstruments([]);
    setStatus('unauthenticated');
  }, []);

  const activeInstrument = useMemo(
    () =>
      resolveActiveInstrument(instruments, userInstruments, profile?.activeInstrumentId ?? null),
    [instruments, profile?.activeInstrumentId, userInstruments],
  );

  const permissions = useMemo(
    () => getPermissionsForRole(profile?.role, profile?.isActive ?? false),
    [profile?.role, profile?.isActive],
  );

  const can = useCallback(
    (permission: Permission) => checkPermission(permissions, permission),
    [permissions],
  );

  const canAny = useCallback(
    (required: readonly Permission[]) => checkAnyPermission(permissions, required),
    [permissions],
  );

  const value = useMemo<AuthContextValue>(() => {
    if (valueOverride) {
      return valueOverride;
    }
    return {
      status,
      profile,
      permissions,
      instanceSettings,
      instruments,
      userInstruments,
      activeInstrument,
      can,
      canAny,
      setActiveInstrument,
      refreshProfile,
      refreshInstanceSettings,
      refreshInstruments,
      signOut,
    };
  }, [
    activeInstrument,
    can,
    canAny,
    instanceSettings,
    instruments,
    permissions,
    profile,
    refreshInstanceSettings,
    refreshInstruments,
    refreshProfile,
    setActiveInstrument,
    signOut,
    status,
    userInstruments,
    valueOverride,
  ]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
