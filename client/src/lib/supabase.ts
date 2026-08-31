import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Browser-side Supabase client (ANON key only — never a service key).
 * Sign-in credentials go from the browser straight to Supabase's servers via
 * this official SDK; they never touch the Reka backend and are never logged.
 */

let _client: SupabaseClient | null = null;

/** Names of missing config vars (never values), or null when configured. */
export function supabaseConfigMissing(): string | null {
  const missing = [
    !import.meta.env.VITE_SUPABASE_URL && "VITE_SUPABASE_URL",
    !import.meta.env.VITE_SUPABASE_ANON_KEY && "VITE_SUPABASE_ANON_KEY",
  ].filter(Boolean);
  return missing.length ? missing.join(", ") : null;
}

export function getSupabase(): SupabaseClient {
  const missing = supabaseConfigMissing();
  if (missing) {
    throw new Error(`Sign-in is not configured on this deployment (missing ${missing}). Set the Supabase environment variables and rebuild.`);
  }
  if (!_client) {
    _client = createClient(import.meta.env.VITE_SUPABASE_URL, import.meta.env.VITE_SUPABASE_ANON_KEY);
  }
  return _client;
}

export function tryGetSupabase(): SupabaseClient | null {
  return supabaseConfigMissing() ? null : getSupabase();
}

/** Current access token for API calls, or null when signed out. */
export async function getAccessToken(): Promise<string | null> {
  const client = tryGetSupabase();
  if (!client) return null;
  try {
    const { data } = await client.auth.getSession();
    return data.session?.access_token ?? null;
  } catch {
    return null;
  }
}
