import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Request } from "express";
import type { User } from "../../drizzle/schema";
import { getUserByOpenId, upsertUser } from "../db";
import { ENV } from "./env";

/**
 * Supabase Auth verification — replaces the Manus OAuth SDK.
 *
 * The browser signs in against Supabase directly (supabase-js with the anon
 * key; credentials never touch this server). Every API request carries the
 * Supabase access token as `Authorization: Bearer <jwt>`; this module is the
 * ONLY place that turns it into an identity, and it does so with server-side
 * facts alone:
 *
 *   1. `auth.getUser(token)` asks Supabase to verify the token (signature,
 *      expiry, revocation) — nothing client-supplied is trusted.
 *   2. The verified user id (UUID) is upserted into our `users` table; the
 *      admin role is derived exclusively from the server-side owner allowlist
 *      (OWNER_SUPABASE_USER_IDS) inside `upsertUser` — never from the client
 *      and never from Supabase user_metadata.
 *   3. Tokens issued before `users.sessionInvalidatedAt` are rejected, so
 *      logout revokes access immediately even for still-unexpired JWTs.
 */

export type AuthenticatedUser = User & { isCron?: boolean };

let _client: SupabaseClient | null = null;
let warnedMissingConfig = false;

function supabaseAuthClient(): SupabaseClient | null {
  // Test-injected client (or an already-created one) wins before config checks.
  if (_client) return _client;
  if (!ENV.supabaseUrl || !ENV.supabaseAnonKey) {
    if (!warnedMissingConfig) {
      warnedMissingConfig = true;
      console.warn("[Auth] SUPABASE_URL / SUPABASE_ANON_KEY not configured — all authenticated requests will be treated as logged out.");
    }
    return null;
  }
  if (!_client) {
    _client = createClient(ENV.supabaseUrl, ENV.supabaseAnonKey, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    });
  }
  return _client;
}

/** Test-only injection point (mirrors __setTestDb). */
export function __setTestSupabase(client: unknown) {
  if (process.env.NODE_ENV !== "test") throw new Error("__setTestSupabase is only available under NODE_ENV=test");
  _client = client as SupabaseClient | null;
}

function bearerToken(req: Pick<Request, "headers">): string | null {
  const header = req.headers.authorization;
  const value = Array.isArray(header) ? header[0] : header;
  if (!value?.startsWith("Bearer ")) return null;
  const token = value.slice(7).trim();
  return token.length > 0 ? token : null;
}

/** Issued-at from an ALREADY-VERIFIED JWT (verification happened in getUser). */
function tokenIssuedAtMs(token: string): number | null {
  try {
    const payload = token.split(".")[1];
    if (!payload) return null;
    const json = JSON.parse(Buffer.from(payload.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf8"));
    return typeof json.iat === "number" ? json.iat * 1000 : null;
  } catch {
    return null;
  }
}

export async function authenticateRequest(req: Pick<Request, "headers">): Promise<AuthenticatedUser | null> {
  const token = bearerToken(req);
  if (!token) return null;
  const client = supabaseAuthClient();
  if (!client) return null;

  const { data, error } = await client.auth.getUser(token);
  if (error || !data?.user) return null;
  const su = data.user;

  const name =
    (typeof su.user_metadata?.name === "string" && su.user_metadata.name) ||
    (typeof su.user_metadata?.full_name === "string" && su.user_metadata.full_name) ||
    su.email ||
    "";

  // Role is decided inside upsertUser from the server-side allowlist only.
  await upsertUser({ openId: su.id, email: su.email ?? null, name, loginMethod: "supabase", lastSignedIn: new Date() });
  const user = await getUserByOpenId(su.id);

  if (!user) {
    // Database unavailable: expose a minimal non-privileged identity so public
    // pages still work. Owner checks fail closed (role !== "admin").
    const now = new Date();
    return { id: 0, openId: su.id, name, email: su.email ?? null, loginMethod: "supabase", role: "user", createdAt: now, updatedAt: now, lastSignedIn: now, sessionInvalidatedAt: null };
  }

  // Logout / revocation: reject tokens minted before the invalidation instant.
  const iatMs = tokenIssuedAtMs(token);
  if (user.sessionInvalidatedAt && iatMs !== null && iatMs < user.sessionInvalidatedAt.getTime()) {
    return null;
  }

  return user;
}
