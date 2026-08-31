import type { Request } from "express";
import type { User } from "../../drizzle/schema";
import { ENV } from "./env";

/** Custom header every browser mutation must carry. Forces a CORS preflight,
 *  which (together with the Origin check) makes cross-site request forgery
 *  impossible even though the session lives in a cookie. */
export const CSRF_HEADER = "x-reka-csrf";
export const CSRF_HEADER_VALUE = "1";

export type OwnerDecision =
  | { ok: true }
  | { ok: false; code: "UNAUTHORIZED" | "FORBIDDEN"; reason: string };

/**
 * Single source of truth for "is this authenticated identity the store owner?".
 * Every private procedure and every private page gate derives from this.
 *
 * The decision is made purely from server-side facts:
 *  1. a verified session produced a database user,
 *  2. that user's openId is on the server allowlist (OWNER_OPEN_IDS / OWNER_OPEN_ID),
 *  3. the database row carries the admin role,
 *  4. the identity is not a scheduled/cron pseudo-user.
 * Nothing the browser sends (headers, body, query, local state) can change it.
 */
export function evaluateOwner(user: (User & { isCron?: boolean }) | null | undefined): OwnerDecision {
  if (!user) return { ok: false, code: "UNAUTHORIZED", reason: "no-session" };
  if (user.isCron) return { ok: false, code: "FORBIDDEN", reason: "cron-identity" };
  const allowlist = ENV.ownerOpenIds;
  if (allowlist.length === 0) return { ok: false, code: "FORBIDDEN", reason: "owner-not-configured" };
  if (!allowlist.includes(user.openId)) return { ok: false, code: "FORBIDDEN", reason: "not-owner" };
  if (user.role !== "admin") return { ok: false, code: "FORBIDDEN", reason: "role-mismatch" };
  return { ok: true };
}

export const isOwner = (user: (User & { isCron?: boolean }) | null | undefined) => evaluateOwner(user).ok;

function firstHeader(value: string | string[] | undefined) {
  if (Array.isArray(value)) return value[0];
  return value;
}

export function requestHost(req: Pick<Request, "headers">): string {
  const forwarded = firstHeader(req.headers["x-forwarded-host"]);
  const host = (forwarded ?? firstHeader(req.headers.host) ?? "").split(",")[0].trim().toLowerCase();
  return host.replace(/:\d+$/, "");
}

/** Origins that are allowed to issue cookie-authenticated mutations. */
export function allowedOrigins(req: Pick<Request, "headers">): Set<string> {
  const origins = new Set<string>();
  const host = requestHost(req);
  if (host) {
    origins.add(`https://${host}`);
    if (!ENV.isProduction) origins.add(`http://${host}`);
    const port = (firstHeader(req.headers.host) ?? "").match(/:(\d+)$/)?.[1];
    if (port && !ENV.isProduction) {
      origins.add(`http://${host}:${port}`);
      origins.add(`https://${host}:${port}`);
    }
  }
  if (ENV.adminHostname) origins.add(`https://${ENV.adminHostname}`);
  if (ENV.publicHostname) origins.add(`https://${ENV.publicHostname}`);
  for (const extra of ENV.corsAllowlist) origins.add(extra.replace(/\/+$/, "").toLowerCase());
  return origins;
}

/**
 * CSRF defence for state-changing, cookie-authenticated requests.
 *  - `Sec-Fetch-Site: cross-site` is rejected outright.
 *  - When an Origin header is present it must be on the allowlist.
 *  - The custom CSRF header must be present (non-simple request => preflight).
 */
export function checkCsrf(req: Pick<Request, "headers">): { ok: true } | { ok: false; reason: string } {
  const fetchSite = firstHeader(req.headers["sec-fetch-site"]);
  if (fetchSite === "cross-site") return { ok: false, reason: "cross-site" };

  const origin = firstHeader(req.headers.origin);
  if (origin && origin !== "null") {
    if (!allowedOrigins(req).has(origin.toLowerCase().replace(/\/+$/, ""))) {
      return { ok: false, reason: "origin" };
    }
  }

  const csrfHeader = firstHeader(req.headers[CSRF_HEADER]);
  if (csrfHeader !== CSRF_HEADER_VALUE) return { ok: false, reason: "header" };
  return { ok: true };
}

/** True when the request arrived on the private console hostname (or no split is configured). */
export function isAdminHostRequest(req: Pick<Request, "headers">): boolean {
  if (!ENV.adminHostname) return true;
  return requestHost(req) === ENV.adminHostname;
}
