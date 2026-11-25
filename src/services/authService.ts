import type { Session } from '@supabase/supabase-js';
import type { UserProfile } from '@/domain/models/auth';
import {
  isNotationSystem,
  isTextSizeMode,
  isThemeMode,
  type NotationSystem,
  type TextSizeMode,
  type ThemeMode,
} from '@/domain/models/theme';
import { isRole } from '@/domain/rbac/permissions';
import { getSupabaseClient } from '@/services/supabaseClient';

export type AuthServiceErrorCode = 'NOT_AUTHORIZED' | 'INVALID_OTP' | 'RATE_LIMITED' | 'GENERIC';

export class AuthServiceError extends Error {
  readonly code: AuthServiceErrorCode;

  constructor(code: AuthServiceErrorCode, message: string) {
    super(message);
    this.name = 'AuthServiceError';
    this.code = code;
  }
}

interface ProfileRow {
  id: string;
  email: string;
  display_name: string;
  role: string;
  is_active: boolean;
  active_instrument_id: string | null;
  preferred_notation: string;
  preferred_theme: string;
  preferred_text_size: string;
  font_scale: number;
}

function mapProfileRow(row: ProfileRow): UserProfile {
  return {
    id: row.id,
    email: row.email,
    displayName: row.display_name,
    role: isRole(row.role) ? row.role : 'musician',
    isActive: row.is_active,
    activeInstrumentId: row.active_instrument_id,
    preferredNotation: isNotationSystem(row.preferred_notation)
      ? row.preferred_notation
      : 'italian',
    preferredTheme: isThemeMode(row.preferred_theme) ? row.preferred_theme : 'daylight',
    preferredTextSize: isTextSizeMode(row.preferred_text_size)
      ? row.preferred_text_size
      : 'compact',
    fontScale: Number(row.font_scale) || 1,
  };
}

function mapOtpRequestError(message: string): AuthServiceErrorCode {
  const lower = message.toLowerCase();
  if (
    lower.includes('database error saving new user') ||
    lower.includes('not authorized') ||
    lower.includes('allowed_emails') ||
    lower.includes('signups not allowed')
  ) {
    return 'NOT_AUTHORIZED';
  }
  if (
    lower.includes('rate limit') ||
    lower.includes('too many') ||
    lower.includes('security purposes')
  ) {
    return 'RATE_LIMITED';
  }
  return 'GENERIC';
}

export async function requestEmailOtp(rawEmail: string): Promise<void> {
  const email = rawEmail.trim().toLowerCase();
  const supabase = getSupabaseClient();
  const emailRedirectTo = typeof window !== 'undefined' ? `${window.location.origin}/` : undefined;

  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      shouldCreateUser: true,
      emailRedirectTo,
    },
  });

  if (error) {
    throw new AuthServiceError(mapOtpRequestError(error.message), error.message);
  }
}

export async function verifyEmailOtp(rawEmail: string, rawToken: string): Promise<Session> {
  const email = rawEmail.trim().toLowerCase();
  const token = rawToken.replace(/\s+/g, '');
  const supabase = getSupabaseClient();

  const { data, error } = await supabase.auth.verifyOtp({
    email,
    token,
    type: 'email',
  });

  if (error || !data.session) {
    const message = error?.message ?? 'Invalid or expired OTP token';
    const lower = message.toLowerCase();
    const code: AuthServiceErrorCode =
      lower.includes('expired') ||
      lower.includes('invalid') ||
      lower.includes('otp') ||
      lower.includes('token')
        ? 'INVALID_OTP'
        : 'GENERIC';
    throw new AuthServiceError(code, message);
  }

  return data.session;
}

export async function getSession(): Promise<Session | null> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.auth.getSession();
  if (error) {
    throw new AuthServiceError('GENERIC', error.message);
  }
  return data.session;
}

export function onAuthStateChange(callback: (session: Session | null) => void): () => void {
  const supabase = getSupabaseClient();
  const { data } = supabase.auth.onAuthStateChange((event, session) => {
    if (event === 'INITIAL_SESSION') {
      return;
    }
    callback(session);
  });
  return () => {
    data.subscription.unsubscribe();
  };
}

export async function signOut(): Promise<void> {
  const supabase = getSupabaseClient();
  const { error } = await supabase.auth.signOut();
  if (error) {
    throw new AuthServiceError('GENERIC', error.message);
  }
}

export async function fetchOwnProfile(userId: string): Promise<UserProfile | null> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('profiles')
    .select(
      'id, email, display_name, role, is_active, active_instrument_id, preferred_notation, preferred_theme, preferred_text_size, font_scale',
    )
    .eq('id', userId)
    .maybeSingle<ProfileRow>();

  if (error) {
    throw new AuthServiceError('GENERIC', error.message);
  }

  return data ? mapProfileRow(data) : null;
}

export interface UpdateOwnProfileInput {
  displayName?: string;
  preferredTheme?: ThemeMode;
  preferredTextSize?: TextSizeMode;
  preferredNotation?: NotationSystem;
}

export async function updateOwnProfile(
  userId: string,
  patch: UpdateOwnProfileInput,
): Promise<UserProfile> {
  const supabase = getSupabaseClient();
  const payload: Record<string, string> = {};

  if (patch.displayName !== undefined) {
    payload.display_name = patch.displayName.trim();
  }
  if (patch.preferredTheme !== undefined) {
    payload.preferred_theme = patch.preferredTheme;
  }
  if (patch.preferredTextSize !== undefined) {
    payload.preferred_text_size = patch.preferredTextSize;
  }
  if (patch.preferredNotation !== undefined) {
    payload.preferred_notation = patch.preferredNotation;
  }

  const { data, error } = await supabase
    .from('profiles')
    .update(payload)
    .eq('id', userId)
    .select(
      'id, email, display_name, role, is_active, active_instrument_id, preferred_notation, preferred_theme, preferred_text_size, font_scale',
    )
    .single<ProfileRow>();

  if (error) {
    throw new AuthServiceError('GENERIC', error.message);
  }

  return mapProfileRow(data);
}
