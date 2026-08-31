import { beforeEach, describe, expect, it, vi } from "vitest";
import { appRouter } from "../routers";
import { __setTestDb } from "../db";
import { __setTestSupabase, authenticateRequest } from "../_core/supabaseAuth";
import { createFakeDb, makeContext, makeUser, ownerUser } from "./helpers";

/**
 * Supabase session verification. Tokens are verified by asking Supabase
 * (mocked here — no network, no real database); identity, role and
 * revocation all come from server-side facts.
 */

const fake = vi.hoisted(() => ({ current: null as ReturnType<typeof import("./helpers")["createFakeDb"]> | null }));

const b64url = (o: unknown) => Buffer.from(JSON.stringify(o)).toString("base64url");
/** Structurally-valid JWT (signature is irrelevant — verification is Supabase's mocked job). */
const fakeToken = (iatSec: number, sub = "owner-open-id") => `${b64url({ alg: "HS256", typ: "JWT" })}.${b64url({ sub, iat: iatSec })}.sig`;

const supabaseAccepting = (userId: string, email = "owner@example.com") =>
  ({ auth: { getUser: vi.fn(async () => ({ data: { user: { id: userId, email, user_metadata: { name: "Owner" } } }, error: null })) } });
const supabaseRejecting = (message: string) =>
  ({ auth: { getUser: vi.fn(async () => ({ data: { user: null }, error: { message } })) } });

const reqWith = (token?: string) => ({ headers: token ? { authorization: `Bearer ${token}` } : {} });

beforeEach(() => {
  fake.current = createFakeDb();
  __setTestDb(fake.current.db);
  __setTestSupabase(null);
});

describe("authenticateRequest", () => {
  it("returns null without an Authorization header", async () => {
    __setTestSupabase(supabaseAccepting("owner-open-id"));
    expect(await authenticateRequest(reqWith())).toBeNull();
  });

  it("returns null for non-Bearer or empty tokens", async () => {
    __setTestSupabase(supabaseAccepting("owner-open-id"));
    expect(await authenticateRequest({ headers: { authorization: "Basic abc" } })).toBeNull();
    expect(await authenticateRequest({ headers: { authorization: "Bearer   " } })).toBeNull();
  });

  it("rejects tokens Supabase refuses (expired sessions remove owner access)", async () => {
    __setTestSupabase(supabaseRejecting("token is expired"));
    expect(await authenticateRequest(reqWith(fakeToken(Math.floor(Date.now() / 1000) - 9000)))).toBeNull();
  });

  it("accepts a verified token, upserts the user, and takes the role from the DB row only", async () => {
    __setTestSupabase(supabaseAccepting("owner-open-id"));
    fake.current!.setSelectRows([makeUser({ openId: "owner-open-id", role: "admin", name: "Owner" })]);
    const user = await authenticateRequest(reqWith(fakeToken(Math.floor(Date.now() / 1000))));
    expect(user).not.toBeNull();
    expect(user!.openId).toBe("owner-open-id");
    expect(user!.role).toBe("admin");
    // upsert recorded (allowlist decides the stored role inside upsertUser)
    expect(fake.current!.inserted.length).toBeGreaterThanOrEqual(1);
  });

  it("a token issued before logout invalidation is rejected (logout removes owner access)", async () => {
    __setTestSupabase(supabaseAccepting("owner-open-id"));
    const invalidatedAt = new Date(Date.now() + 5_000); // invalidation AFTER token iat
    fake.current!.setSelectRows([makeUser({ openId: "owner-open-id", role: "admin", sessionInvalidatedAt: invalidatedAt })]);
    const user = await authenticateRequest(reqWith(fakeToken(Math.floor(Date.now() / 1000))));
    expect(user).toBeNull();
  });

  it("falls back to a NON-privileged identity when the database is unavailable", async () => {
    __setTestSupabase(supabaseAccepting("owner-open-id"));
    __setTestDb(null);
    const user = await authenticateRequest(reqWith(fakeToken(Math.floor(Date.now() / 1000))));
    expect(user).not.toBeNull();
    expect(user!.role).toBe("user"); // owner checks fail closed without a DB row
  });

  it("returns null when Supabase itself is not configured", async () => {
    __setTestSupabase(null);
    const previousUrl = process.env.SUPABASE_URL;
    // ENV snapshot was taken at import time with no Supabase config in tests,
    // so the unconfigured branch is the default here.
    expect(await authenticateRequest(reqWith(fakeToken(Math.floor(Date.now() / 1000))))).toBeNull();
    process.env.SUPABASE_URL = previousUrl;
  });
});

describe("auth.logout", () => {
  it("records server-side session invalidation for the user", async () => {
    const caller = appRouter.createCaller(makeContext(ownerUser()));
    await expect(caller.auth.logout()).resolves.toEqual({ success: true });
    // users.sessionInvalidatedAt update recorded
    expect(fake.current!.updated.length).toBeGreaterThanOrEqual(1);
    const patch = fake.current!.updated[0].values as Record<string, unknown>;
    expect(patch).toHaveProperty("sessionInvalidatedAt");
  });

  it("succeeds harmlessly when logged out already", async () => {
    const caller = appRouter.createCaller(makeContext(null));
    await expect(caller.auth.logout()).resolves.toEqual({ success: true });
    expect(fake.current!.updated).toHaveLength(0);
  });
});
