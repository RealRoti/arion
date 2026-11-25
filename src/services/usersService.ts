import type { AllowedEmailEntry, UserProfile } from '@/domain/models/auth';
import { isNotationSystem, isTextSizeMode, isThemeMode } from '@/domain/models/theme';
import { isRole, type Role } from '@/domain/rbac/permissions';
import { getSupabaseClient } from '@/services/supabaseClient';

export type UsersServiceErrorCode = 'DUPLICATE_EMAIL' | 'LAST_ADMIN_GUARD' | 'GENERIC';

export class UsersServiceError extends Error {
  readonly code: UsersServiceErrorCode;

  constructor(code: UsersServiceErrorCode, message: string) {
    super(message);
    this.name = 'UsersServiceError';
    this.code = code;
  }
}

interface AllowedEmailRow {
  id: string;
  email: string;
  role: string;
  display_name: string | null;
  default_instrument_ids: string[];
  is_active: boolean;
  created_at: string;
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

function mapAllowedEmailRow(row: AllowedEmailRow): AllowedEmailEntry {
  return {
    id: row.id,
    email: row.email,
    role: isRole(row.role) ? row.role : 'musician',
    displayName: row.display_name,
    defaultInstrumentIds: row.default_instrument_ids ?? [],
    isActive: row.is_active,
    createdAt: row.created_at,
  };
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

export async function listAllowedEmails(): Promise<AllowedEmailEntry[]> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('allowed_emails')
    .select('id, email, role, display_name, default_instrument_ids, is_active, created_at')
    .order('created_at', { ascending: false })
    .returns<AllowedEmailRow[]>();

  if (error) {
    throw new UsersServiceError('GENERIC', error.message);
  }

  return (data ?? []).map(mapAllowedEmailRow);
}

export interface CreateAllowedEmailInput {
  email: string;
  role: Role;
  displayName?: string;
}

export async function createAllowedEmail(
  input: CreateAllowedEmailInput,
): Promise<AllowedEmailEntry> {
  const supabase = getSupabaseClient();
  const normalizedEmail = input.email.trim().toLowerCase();
  const trimmedName = input.displayName?.trim() ?? '';

  const { data, error } = await supabase
    .from('allowed_emails')
    .insert({
      email: normalizedEmail,
      role: input.role,
      display_name: trimmedName.length > 0 ? trimmedName : null,
      is_active: true,
    })
    .select('id, email, role, display_name, default_instrument_ids, is_active, created_at')
    .single<AllowedEmailRow>();

  if (error) {
    if (error.code === '23505' || error.message.toLowerCase().includes('duplicate')) {
      throw new UsersServiceError('DUPLICATE_EMAIL', error.message);
    }
    throw new UsersServiceError('GENERIC', error.message);
  }

  return mapAllowedEmailRow(data);
}

export async function updateAllowedEmail(
  id: string,
  patch: { role?: Role; isActive?: boolean; displayName?: string | null },
): Promise<AllowedEmailEntry> {
  const supabase = getSupabaseClient();
  const payload: Record<string, string | boolean | null> = {};

  if (patch.role !== undefined) {
    payload.role = patch.role;
  }
  if (patch.isActive !== undefined) {
    payload.is_active = patch.isActive;
  }
  if (patch.displayName !== undefined) {
    payload.display_name = patch.displayName ? patch.displayName.trim() : null;
  }

  const { data, error } = await supabase
    .from('allowed_emails')
    .update(payload)
    .eq('id', id)
    .select('id, email, role, display_name, default_instrument_ids, is_active, created_at')
    .single<AllowedEmailRow>();

  if (error) {
    throw new UsersServiceError('GENERIC', error.message);
  }

  return mapAllowedEmailRow(data);
}

export async function deleteAllowedEmail(id: string): Promise<void> {
  const supabase = getSupabaseClient();
  const { error } = await supabase.from('allowed_emails').delete().eq('id', id);
  if (error) {
    throw new UsersServiceError('GENERIC', error.message);
  }
}

export async function listProfiles(): Promise<UserProfile[]> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('profiles')
    .select(
      'id, email, display_name, role, is_active, active_instrument_id, preferred_notation, preferred_theme, preferred_text_size, font_scale',
    )
    .order('display_name', { ascending: true })
    .returns<ProfileRow[]>();

  if (error) {
    throw new UsersServiceError('GENERIC', error.message);
  }

  return (data ?? []).map(mapProfileRow);
}

export async function updateUserProfileAdmin(
  userId: string,
  patch: { role?: Role; isActive?: boolean },
): Promise<UserProfile> {
  const supabase = getSupabaseClient();
  const payload: Record<string, string | boolean> = {};

  if (patch.role !== undefined) {
    payload.role = patch.role;
  }
  if (patch.isActive !== undefined) {
    payload.is_active = patch.isActive;
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
    if (error.code === 'P0001' || error.message.toLowerCase().includes('last active admin')) {
      throw new UsersServiceError('LAST_ADMIN_GUARD', error.message);
    }
    throw new UsersServiceError('GENERIC', error.message);
  }

  return mapProfileRow(data);
}
