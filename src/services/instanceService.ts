import type { InstanceSettings } from '@/domain/models/auth';
import {
  isNotationSystem,
  isThemeMode,
  type NotationSystem,
  type ThemeMode,
} from '@/domain/models/theme';
import { getSupabaseClient } from '@/services/supabaseClient';

const BRANDING_BUCKET = 'instance-branding';
const MAX_LOGO_SIZE_BYTES = 5 * 1024 * 1024;
const ALLOWED_LOGO_MIME_TYPES = new Set(['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml']);

export type InstanceLogoErrorCode = 'INVALID_TYPE' | 'FILE_TOO_LARGE' | 'GENERIC';

export class InstanceServiceError extends Error {
  readonly code: InstanceLogoErrorCode;

  constructor(code: InstanceLogoErrorCode, message: string) {
    super(message);
    this.name = 'InstanceServiceError';
    this.code = code;
  }
}

interface InstanceSettingsRow {
  id: number;
  group_name: string;
  group_subtitle: string | null;
  support_email: string | null;
  logo_path: string | null;
  default_notation: string;
  default_theme: string;
  updated_at: string;
}

const INSTANCE_SETTINGS_COLUMNS =
  'id, group_name, group_subtitle, support_email, logo_path, default_notation, default_theme, updated_at';

async function resolveSignedLogoUrl(logoPath: string | null): Promise<string | null> {
  if (!logoPath) {
    return null;
  }
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.storage
    .from(BRANDING_BUCKET)
    .createSignedUrl(logoPath, 3600);

  if (error || !data?.signedUrl) {
    return null;
  }
  return data.signedUrl;
}

async function mapSettingsRow(row: InstanceSettingsRow): Promise<InstanceSettings> {
  const logoSignedUrl = await resolveSignedLogoUrl(row.logo_path);
  return {
    id: row.id,
    groupName: row.group_name,
    groupSubtitle: row.group_subtitle,
    supportEmail: row.support_email,
    logoPath: row.logo_path,
    logoSignedUrl,
    defaultNotation: isNotationSystem(row.default_notation) ? row.default_notation : 'italian',
    defaultTheme: isThemeMode(row.default_theme) ? row.default_theme : 'daylight',
    updatedAt: row.updated_at,
  };
}

export async function fetchInstanceSettings(): Promise<InstanceSettings> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('instance_settings')
    .select(INSTANCE_SETTINGS_COLUMNS)
    .eq('id', 1)
    .single<InstanceSettingsRow>();

  if (error) {
    throw new InstanceServiceError('GENERIC', error.message);
  }

  return mapSettingsRow(data);
}

export interface UpdateInstanceSettingsInput {
  groupName: string;
  groupSubtitle: string | null;
  supportEmail: string | null;
  defaultNotation: NotationSystem;
  defaultTheme: ThemeMode;
}

export async function updateInstanceSettings(
  input: UpdateInstanceSettingsInput,
): Promise<InstanceSettings> {
  const supabase = getSupabaseClient();
  const trimmedSubtitle = input.groupSubtitle?.trim() ?? '';
  const trimmedSupportEmail = input.supportEmail?.trim() ?? '';

  const { data, error } = await supabase
    .from('instance_settings')
    .update({
      group_name: input.groupName.trim(),
      group_subtitle: trimmedSubtitle.length > 0 ? trimmedSubtitle : null,
      support_email: trimmedSupportEmail.length > 0 ? trimmedSupportEmail : null,
      default_notation: input.defaultNotation,
      default_theme: input.defaultTheme,
    })
    .eq('id', 1)
    .select(INSTANCE_SETTINGS_COLUMNS)
    .single<InstanceSettingsRow>();

  if (error) {
    throw new InstanceServiceError('GENERIC', error.message);
  }

  return mapSettingsRow(data);
}

function getFileExtension(file: File): string {
  switch (file.type) {
    case 'image/png':
      return 'png';
    case 'image/jpeg':
      return 'jpg';
    case 'image/webp':
      return 'webp';
    case 'image/svg+xml':
      return 'svg';
    default:
      return 'png';
  }
}

export async function uploadInstanceLogo(
  file: File,
  previousLogoPath: string | null,
): Promise<InstanceSettings> {
  if (!ALLOWED_LOGO_MIME_TYPES.has(file.type)) {
    throw new InstanceServiceError('INVALID_TYPE', `Unsupported image type: ${file.type}`);
  }
  if (file.size > MAX_LOGO_SIZE_BYTES) {
    throw new InstanceServiceError('FILE_TOO_LARGE', 'Logo exceeds 5 MiB limit');
  }

  const supabase = getSupabaseClient();
  const ext = getFileExtension(file);
  const nextPath = `logo-${Date.now()}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from(BRANDING_BUCKET)
    .upload(nextPath, file, {
      contentType: file.type,
      upsert: false,
    });

  if (uploadError) {
    throw new InstanceServiceError('GENERIC', uploadError.message);
  }

  const { data, error: updateError } = await supabase
    .from('instance_settings')
    .update({ logo_path: nextPath })
    .eq('id', 1)
    .select(INSTANCE_SETTINGS_COLUMNS)
    .single<InstanceSettingsRow>();

  if (updateError) {
    await supabase.storage.from(BRANDING_BUCKET).remove([nextPath]);
    throw new InstanceServiceError('GENERIC', updateError.message);
  }

  if (previousLogoPath && previousLogoPath !== nextPath) {
    await supabase.storage.from(BRANDING_BUCKET).remove([previousLogoPath]);
  }

  return mapSettingsRow(data);
}

export async function removeInstanceLogo(
  currentLogoPath: string | null,
): Promise<InstanceSettings> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('instance_settings')
    .update({ logo_path: null })
    .eq('id', 1)
    .select(INSTANCE_SETTINGS_COLUMNS)
    .single<InstanceSettingsRow>();

  if (error) {
    throw new InstanceServiceError('GENERIC', error.message);
  }

  if (currentLogoPath) {
    await supabase.storage.from(BRANDING_BUCKET).remove([currentLogoPath]);
  }

  return mapSettingsRow(data);
}
