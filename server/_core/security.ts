import type { Express, NextFunction, Request, Response } from "express";
import { allowedOrigins, isAdminHostRequest, requestHost } from "./authz";
import { ENV } from "./env";

/* ------------------------------------------------------------------ */
/* Rate limiting                                                       */
/*                                                                     */
/* Vercel runs many short-lived instances, so a purely in-memory       */
/* limiter cannot protect production. When UPSTASH_REDIS_REST_URL +    */
/* UPSTASH_REDIS_REST_TOKEN are configured the limiter uses a shared   */
/* Upstash Redis fixed window (INCR+EXPIRE over REST — no extra deps). */
/* Otherwise it falls back to the in-memory sliding window (fine for   */
/* local dev; logged loudly in production).                            */
/* ------------------------------------------------------------------ */

type LimiterRequest = Pick<Request, "headers" | "ip" | "socket">;

export type RateLimiter = {
  allow(req: LimiterRequest): boolean | Promise<boolean>;
  reset(): void;
};

function clientKey(req: LimiterRequest): string {
  const forwarded = req.headers?.["x-forwarded-for"];
  const first = Array.isArray(forwarded) ? forwarded[0] : forwarded?.split(",")[0];
  return (first ?? req.ip ?? req.socket?.remoteAddress ?? "unknown").trim();
}

type Bucket = { hits: number[] };

export class MemoryRateLimiter implements RateLimiter {
  private buckets = new Map<string, Bucket>();
  constructor(private limit: number, private windowMs: number) {}

  allow(req: LimiterRequest): boolean {
    const now = Date.now();
    const k = clientKey(req);
    const bucket = this.buckets.get(k) ?? { hits: [] };
    bucket.hits = bucket.hits.filter(ts => now - ts < this.windowMs);
    if (bucket.hits.length >= this.limit) {
      this.buckets.set(k, bucket);
      return false;
    }
    bucket.hits.push(now);
    this.buckets.set(k, bucket);
    if (this.buckets.size > 10_000) this.buckets.clear();
    return true;
  }

  reset() {
    this.buckets.clear();
  }
}

class UpstashRateLimiter implements RateLimiter {
  private warned = false;
  constructor(private name: string, private limit: number, private windowMs: number, private fallback: MemoryRateLimiter) {}

  async allow(req: LimiterRequest): Promise<boolean> {
    const window = Math.floor(Date.now() / this.windowMs);
    const key = `rl:${this.name}:${clientKey(req)}:${window}`;
    try {
      const res = await fetch(`${ENV.upstashRedisUrl}/pipeline`, {
        method: "POST",
        headers: { Authorization: `Bearer ${ENV.upstashRedisToken}`, "content-type": "application/json" },
        body: JSON.stringify([["INCR", key], ["EXPIRE", key, String(Math.ceil(this.windowMs / 1000) + 1)]]),
      });
      if (!res.ok) throw new Error(`Upstash ${res.status}`);
      const data = (await res.json()) as { result?: number | string }[];
      const count = Number(data?.[0]?.result ?? 0);
      return count > 0 && count <= this.limit;
    } catch (error) {
      if (!this.warned) {
        this.warned = true;
        console.error(`[Security] Upstash limiter "${this.name}" unreachable — using in-memory fallback:`, error instanceof Error ? error.message : error);
      }
      return this.fallback.allow(req);
    }
  }

  reset() {
    this.fallback.reset();
  }
}

const warnedMemoryInProd = new Set<string>();

function makeLimiter(name: string, limit: number, windowMs: number): RateLimiter {
  const memory = new MemoryRateLimiter(limit, windowMs);
  if (ENV.upstashRedisUrl && ENV.upstashRedisToken) return new UpstashRateLimiter(name, limit, windowMs, memory);
  if (ENV.isProduction && !warnedMemoryInProd.has(name)) {
    warnedMemoryInProd.add(name);
    console.warn(`[Security] Rate limiter "${name}" is in-memory only. Set UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN for multi-instance protection.`);
  }
  return memory;
}

/** 120 owner mutations per IP per minute. */
export const ownerMutationLimiter = makeLimiter("owner-mutations", 120, 60 * 1000);
/** 10 order requests per IP per 10 minutes — public checkout abuse guard. */
export const orderLimiter = makeLimiter("orders", 10, 10 * 60 * 1000);
/** 5 review submissions per IP per 10 minutes. */
export const reviewLimiter = makeLimiter("reviews", 5, 10 * 60 * 1000);

/* ------------------------------------------------------------------ */
/* Security headers                                                    */
/* ------------------------------------------------------------------ */

export function buildCsp(opts: { isAdmin: boolean; dev: boolean }): string {
  const directives: Record<string, string[]> = {
    "default-src": ["'self'"],
    "base-uri": ["'self'"],
    "object-src": ["'none'"],
    "frame-ancestors": [ENV.frameAncestors],
    "form-action": ["'self'"],
    "img-src": ["'self'", "data:", "blob:", "https:"],
    "font-src": ["'self'", "https://fonts.gstatic.com", "data:"],
    "style-src": ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
    "script-src": opts.dev ? ["'self'", "'unsafe-inline'", "'unsafe-eval'"] : ["'self'"],
    // The browser talks to Supabase Auth/Storage directly with the anon key.
    "connect-src": opts.dev ? ["'self'", "ws:", "wss:", "https:"] : ["'self'", ENV.supabaseUrl].filter(Boolean),
    "manifest-src": ["'self'"],
    "worker-src": ["'self'", "blob:"],
  };
  if (opts.isAdmin) directives["upgrade-insecure-requests"] = [];
  return Object.entries(directives)
    .map(([k, v]) => (v.length ? `${k} ${v.join(" ")}` : k))
    .join("; ");
}

export function securityHeaders(req: Request, res: Response, next: NextFunction) {
  const isAdmin = resolveApp(req) === "console";
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=(), payment=(), usb=()");
  res.setHeader("Cross-Origin-Opener-Policy", "same-origin");
  if (ENV.frameAncestors === "'none'") res.setHeader("X-Frame-Options", "DENY");
  if (ENV.isProduction) {
    res.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
    res.setHeader("Content-Security-Policy", buildCsp({ isAdmin, dev: false }));
  }
  if (isAdmin) {
    res.setHeader("X-Robots-Tag", "noindex, nofollow, noarchive");
    res.setHeader("Cache-Control", "no-store");
  }
  next();
}

/* ------------------------------------------------------------------ */
/* CORS (explicit allowlist; only needed for split-origin deployments) */
/* ------------------------------------------------------------------ */

export function corsMiddleware(req: Request, res: Response, next: NextFunction) {
  const origin = req.headers.origin;
  if (!origin) return next();
  const self = allowedOrigins(req);
  if (self.has(origin.toLowerCase())) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Access-Control-Allow-Credentials", "true");
    res.setHeader("Access-Control-Allow-Headers", "content-type, x-reka-csrf, authorization, x-trpc-source");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.setHeader("Vary", "Origin");
  }
  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }
  next();
}

/* ------------------------------------------------------------------ */
/* App routing helpers                                                  */
/* ------------------------------------------------------------------ */

export const ADMIN_PATH_PREFIX = "/manage";

/**
 * Which frontend should answer this request.
 *  - When ADMIN_HOSTNAME is configured: hostname decides (manage.rekastore.com => owner console).
 *  - Otherwise (single-host / dev): the /manage path prefix is the console entry.
 * This is only *routing*. Authorization always happens in the API.
 */
export function resolveApp(req: Pick<Request, "headers" | "path"> & { originalUrl?: string }): "storefront" | "console" | "blocked" {
  // Inside `app.use("*")` express rewrites req.path to "/", so prefer originalUrl.
  const fullPath = (req.originalUrl ?? req.path).split("?")[0];
  const underPrefix = fullPath === ADMIN_PATH_PREFIX || fullPath.startsWith(`${ADMIN_PATH_PREFIX}/`);
  if (ENV.adminHostname) {
    const host = requestHost(req);
    if (host === ENV.adminHostname) return "console";
    if (underPrefix) return "blocked";
    return "storefront";
  }
  return underPrefix ? "console" : "storefront";
}

export function registerRobots(app: Express) {
  app.get("/robots.txt", (req, res) => {
    res.type("text/plain");
    if (resolveApp(req) === "console" || ENV.adminHostname && isAdminHostRequest(req)) {
      res.send("User-agent: *\nDisallow: /\n");
      return;
    }
    res.send(`User-agent: *\nDisallow: ${ADMIN_PATH_PREFIX}\nAllow: /\n`);
  });
}
