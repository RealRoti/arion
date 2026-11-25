import { execFileSync } from 'node:child_process';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

export interface SupabaseTestEnv {
  url: string;
  anonKey: string;
  serviceRoleKey: string;
}

function parseEnvLines(output: string): Record<string, string> {
  const result: Record<string, string> = {};
  for (const rawLine of output.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const eqIndex = line.indexOf('=');
    if (eqIndex <= 0) continue;
    const key = line.slice(0, eqIndex).trim();
    let value = line.slice(eqIndex + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    result[key] = value;
  }
  return result;
}

let cachedTestEnv: SupabaseTestEnv | null = null;

export function resolveSupabaseTestEnv(): SupabaseTestEnv {
  if (cachedTestEnv) {
    return cachedTestEnv;
  }

  const fromEnvUrl = process.env.SUPABASE_URL?.trim();
  const fromEnvAnon = process.env.SUPABASE_ANON_KEY?.trim();
  const fromEnvService = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

  if (fromEnvUrl && fromEnvAnon && fromEnvService) {
    cachedTestEnv = {
      url: fromEnvUrl,
      anonKey: fromEnvAnon,
      serviceRoleKey: fromEnvService,
    };
    return cachedTestEnv;
  }

  const rawStatus = execFileSync('npx', ['supabase', 'status', '-o', 'env'], {
    encoding: 'utf8',
  });
  const parsed = parseEnvLines(rawStatus);

  const url = parsed.API_URL ?? parsed.SUPABASE_URL ?? fromEnvUrl;
  const anonKey = parsed.ANON_KEY ?? parsed.SUPABASE_ANON_KEY ?? fromEnvAnon;
  const serviceRoleKey =
    parsed.SERVICE_ROLE_KEY ?? parsed.SUPABASE_SERVICE_ROLE_KEY ?? fromEnvService;

  if (!url || !anonKey || !serviceRoleKey) {
    throw new Error(
      'Unable to resolve local Supabase credentials. Start Supabase with `npm run db:start` before running `npm run test:rls`.',
    );
  }

  cachedTestEnv = { url, anonKey, serviceRoleKey };
  return cachedTestEnv;
}

export function createAnonClient(): SupabaseClient {
  const { url, anonKey } = resolveSupabaseTestEnv();
  return createClient(url, anonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

export function createAdminServiceClient(): SupabaseClient {
  const { url, serviceRoleKey } = resolveSupabaseTestEnv();
  return createClient(url, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

export async function ensureTestUserAndSignIn(
  email: string,
  password: string,
): Promise<{ userId: string; client: SupabaseClient }> {
  const { url, anonKey } = resolveSupabaseTestEnv();
  const authClient = createAnonClient();

  let signInResult = await authClient.auth.signInWithPassword({ email, password });

  if (signInResult.error || !signInResult.data.session) {
    const serviceClient = createAdminServiceClient();
    const { data: created, error: createError } = await serviceClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });

    if (createError && !createError.message.toLowerCase().includes('already')) {
      throw createError;
    }

    if (created.user?.id) {
      await serviceClient.auth.admin.updateUserById(created.user.id, {
        password,
        email_confirm: true,
      });
    }

    signInResult = await authClient.auth.signInWithPassword({ email, password });
  }

  if (signInResult.error || !signInResult.data.session || !signInResult.data.user) {
    throw new Error(
      `Failed to sign in test user ${email}: ${signInResult.error?.message ?? 'missing session'}`,
    );
  }

  const client = createClient(url, anonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
    global: {
      headers: {
        Authorization: `Bearer ${signInResult.data.session.access_token}`,
      },
    },
  });

  return {
    userId: signInResult.data.user.id,
    client,
  };
}
