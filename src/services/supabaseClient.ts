import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { getAppEnv } from '@/config/env';

let cachedClient: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient {
  if (cachedClient) {
    return cachedClient;
  }

  const env = getAppEnv();
  if (!env.supabaseUrl || !env.supabaseAnonKey) {
    throw new Error(
      'Supabase client is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env.local.',
    );
  }

  cachedClient = createClient(env.supabaseUrl, env.supabaseAnonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  });

  return cachedClient;
}

export function resetSupabaseClientForTests(): void {
  cachedClient = null;
}
