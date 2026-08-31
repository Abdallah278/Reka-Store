const num = (value: string | undefined, fallback: number) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const list = (value: string | undefined) =>
  (value ?? "")
    .split(",")
    .map(item => item.trim())
    .filter(Boolean);

export const ENV = {
  databaseUrl: process.env.DATABASE_URL ?? "",

  /* ---- Supabase ---------------------------------------------------- */
  /** Project URL (server side; falls back to the VITE_ value so one setting works everywhere). */
  supabaseUrl: (process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL ?? "").trim().replace(/\/+$/, ""),
  /** Public anon key — safe for the browser; used server-side only to verify user JWTs. */
  supabaseAnonKey: (process.env.SUPABASE_ANON_KEY ?? process.env.VITE_SUPABASE_ANON_KEY ?? "").trim(),
  /** Service role key — SERVER ONLY (storage writes). Never expose to the client bundle. */
  supabaseServiceRoleKey: (process.env.SUPABASE_SERVICE_ROLE_KEY ?? "").trim(),
  /** Storage bucket for product/brand images. */
  storageBucket: (process.env.SUPABASE_STORAGE_BUCKET ?? "product-images").trim(),

  /* ---- Owner allowlist --------------------------------------------- */
  /**
   * Server-side owner allowlist of Supabase Auth user ids (UUIDs). Only these
   * identities can ever pass `ownerProcedure`. Comma separated. Legacy
   * OWNER_OPEN_IDS / OWNER_OPEN_ID are still honoured so nothing breaks.
   * If the list is empty every private procedure fails closed.
   */
  ownerOpenIds: (() => {
    const ids = [
      ...list(process.env.OWNER_SUPABASE_USER_IDS),
      ...list(process.env.OWNER_OPEN_IDS),
    ];
    const legacy = (process.env.OWNER_OPEN_ID ?? "").trim();
    if (legacy && !ids.includes(legacy)) ids.push(legacy);
    return Array.from(new Set(ids));
  })(),

  /* ---- Store defaults ---------------------------------------------- */
  /** Fallback WhatsApp number used until store settings exist in the database. */
  storeWhatsappNumber: (process.env.STORE_WHATSAPP_NUMBER ?? "").replace(/[^0-9]/g, ""),

  /* ---- Rate limiting (multi-instance) ------------------------------ */
  /** Upstash Redis REST endpoint + token. When set, rate limits are shared
   *  across all serverless instances; otherwise an in-memory limiter is used
   *  (fine for local dev, logged as a warning in production). */
  upstashRedisUrl: (process.env.UPSTASH_REDIS_REST_URL ?? "").trim().replace(/\/+$/, ""),
  upstashRedisToken: (process.env.UPSTASH_REDIS_REST_TOKEN ?? "").trim(),

  isProduction: process.env.NODE_ENV === "production",

  /* ---- Hostname split ---------------------------------------------- */
  /** Hostname that serves the private owner console (e.g. manage.rekastore.com). */
  adminHostname: (process.env.ADMIN_HOSTNAME ?? "").trim().toLowerCase(),
  /** Hostname that serves the public storefront (e.g. rekastore.com). Optional. */
  publicHostname: (process.env.PUBLIC_HOSTNAME ?? "").trim().toLowerCase(),
  /** Extra origins allowed to call the API (only needed when frontends live on other origins). */
  corsAllowlist: list(process.env.CORS_ALLOWLIST),

  /* ---- Headers ------------------------------------------------------ */
  /** Value for CSP frame-ancestors (default 'none'). */
  frameAncestors: (process.env.FRAME_ANCESTORS ?? "'none'").trim(),
  /** Max decoded upload size for product/brand images. Default 5 MB. */
  maxUploadBytes: num(process.env.MAX_UPLOAD_BYTES, 5 * 1024 * 1024),
};
