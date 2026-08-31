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

/**
 * Current access token for API calls, or null when signed out.
 * Bounded by a timeout: if getSession() ever blocks (e.g. on the supabase-js
 * auth lock), API calls degrade to anonymous instead of hanging forever — the
 * server then answers 401/isOwner:false and the UI shows a real state.
 */
export async function getAccessToken(): Promise<string | null> {
  const client = tryGetSupabase();
  if (!client) return null;
  try {
    const session = client.auth
      .getSession()
      .then(({ data }) => data.session?.access_token ?? null);
    const timeout = new Promise<null>(resolve => setTimeout(() => resolve(null), 5000));
    return await Promise.race([session, timeout]);
  } catch {
    return null;
  }
}
