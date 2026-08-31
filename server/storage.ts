// Supabase Storage helpers (replaces the Manus Forge presigned-URL flow).
//
// Uploads go through the SERVICE ROLE key, which exists only in server-side
// environment variables — it is never bundled into any frontend. The only
// caller is the owner-only `uploadImage` procedure, which sits behind
// `ownerProcedure` and the full magic-byte/MIME/size validation in uploads.ts.

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { ENV } from "./_core/env";

let _admin: SupabaseClient | null = null;

function adminClient(): SupabaseClient {
  if (!ENV.supabaseUrl || !ENV.supabaseServiceRoleKey) {
    throw new Error("Storage config missing: set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY");
  }
  if (!_admin) {
    _admin = createClient(ENV.supabaseUrl, ENV.supabaseServiceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    });
  }
  return _admin;
}

function normalizeKey(relKey: string): string {
  return relKey.replace(/^\/+/, "");
}

function appendHashSuffix(relKey: string): string {
  const hash = crypto.randomUUID().replace(/-/g, "").slice(0, 8);
  const lastDot = relKey.lastIndexOf(".");
  if (lastDot === -1) return `${relKey}_${hash}`;
  return `${relKey.slice(0, lastDot)}_${hash}${relKey.slice(lastDot)}`;
}

export async function storagePut(
  relKey: string,
  data: Buffer | Uint8Array | string,
  contentType = "application/octet-stream",
): Promise<{ key: string; url: string }> {
  const supabase = adminClient();
  const key = appendHashSuffix(normalizeKey(relKey));

  const body = typeof data === "string" ? Buffer.from(data) : Buffer.from(data);
  const { error } = await supabase.storage.from(ENV.storageBucket).upload(key, body, {
    contentType,
    upsert: false,
    cacheControl: "31536000",
  });
  if (error) {
    throw new Error(`Storage upload failed: ${error.message}`);
  }

  const { data: pub } = supabase.storage.from(ENV.storageBucket).getPublicUrl(key);
  if (!pub?.publicUrl) throw new Error("Storage upload succeeded but no public URL was returned");
  return { key, url: pub.publicUrl };
}

export async function storageGet(relKey: string): Promise<{ key: string; url: string }> {
  const key = normalizeKey(relKey);
  const { data } = adminClient().storage.from(ENV.storageBucket).getPublicUrl(key);
  return { key, url: data.publicUrl };
}

export async function storageGetSignedUrl(relKey: string, expiresInSeconds = 3600): Promise<string> {
  const key = normalizeKey(relKey);
  const { data, error } = await adminClient().storage.from(ENV.storageBucket).createSignedUrl(key, expiresInSeconds);
  if (error || !data?.signedUrl) throw new Error(`Storage signed URL failed: ${error?.message ?? "no url"}`);
  return data.signedUrl;
}
