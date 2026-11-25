import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';
import { useTheme } from '@/components/useTheme';
import { getAppEnv } from '@/config/env';
import type { InstanceSettings, UserProfile } from '@/domain/models/auth';
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
} from '@/services/authService';
import { fetchInstanceSettings } from '@/services/instanceService';

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
  const [sessionUserId, setSessionUserId] = useState<string | null>(null);
  const lastSyncedUserIdRef = useRef<string | null>(null);

  const loadSessionContext = useCallback(
    async (session: Session | null) => {
      if (!session) {
        lastSyncedUserIdRef.current = null;
        setSessionUserId(null);
        setProfile(null);
        setInstanceSettings(null);
        setStatus('unauthenticated');
        return;
      }

      setSessionUserId(session.user.id);

      try {
        const [loadedProfile, loadedSettings] = await Promise.all([
          fetchOwnProfile(session.user.id),
          fetchInstanceSettings().catch(() => null),
        ]);

        if (!loadedProfile) {
          setProfile(null);
          setInstanceSettings(null);
          setStatus('unauthenticated');
          return;
        }

        setProfile(loadedProfile);
        setInstanceSettings(loadedSettings);

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

  const signOut = useCallback(async () => {
    await signOutService();
    lastSyncedUserIdRef.current = null;
    setSessionUserId(null);
    setProfile(null);
    setInstanceSettings(null);
    setStatus('unauthenticated');
  }, []);

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
      can,
      canAny,
      refreshProfile,
      refreshInstanceSettings,
      signOut,
    };
  }, [
    can,
    canAny,
    instanceSettings,
    permissions,
    profile,
    refreshInstanceSettings,
    refreshProfile,
    signOut,
    status,
    valueOverride,
  ]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
