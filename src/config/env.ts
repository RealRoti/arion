export interface AppEnv {
  supabaseUrl: string | null;
  supabaseAnonKey: string | null;
  supportEmail: string | null;
  isSupabaseConfigured: boolean;
  appVersion: string;
}

export const APP_VERSION = '0.1.5';

function normalizeEnvValue(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function getAppEnv(): AppEnv {
  const supabaseUrl = normalizeEnvValue(import.meta.env.VITE_SUPABASE_URL);
  const supabaseAnonKey = normalizeEnvValue(import.meta.env.VITE_SUPABASE_ANON_KEY);
  const supportEmail = normalizeEnvValue(import.meta.env.VITE_SUPPORT_EMAIL);

  return {
    supabaseUrl,
    supabaseAnonKey,
    supportEmail,
    isSupabaseConfigured: Boolean(supabaseUrl && supabaseAnonKey),
    appVersion: APP_VERSION,
  };
}
