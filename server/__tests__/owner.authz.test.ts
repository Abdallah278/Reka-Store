import { beforeEach, describe, expect, it, vi } from "vitest";
import { appRouter } from "../routers";
import { __setTestDb } from "../db";
import { createFakeDb, makeContext, ownerUser, normalUser, allowlistedButNotAdmin, adminRoleButNotAllowlisted, sampleProduct, validProductInput, validSettings, validPngUpload, makeUser } from "./helpers";

const fake = vi.hoisted(() => ({ current: null as ReturnType<typeof import("./helpers")["createFakeDb"]> | null }));

vi.mock("../db", async importOriginal => {
  const actual = await importOriginal<typeof import("../db")>();
  return {
    ...actual,
    getDb: vi.fn(async () => fake.current?.db ?? null), __setTestDb: actual.__setTestDb,
    listProducts: vi.fn(async () => [sampleProduct(), sampleProduct({ id: 11, isPublished: 0 })]),
    listPublicProducts: vi.fn(async () => [actual.toPublicProduct(sampleProduct())]),
    getProductById: vi.fn(async (id: number) => (id === 10 ? sampleProduct() : null)),
    getStoreSettings: vi.fn(async () => ({ id: 1, ...validSettings, updatedAt: new Date() })),
    listCategories: vi.fn(async () => [{ id: 1, name: "Lips", slug: "lips", createdAt: new Date() }]),
    listAudit: vi.fn(async () => []),
    invalidateUserSessions: vi.fn(async () => undefined),
    listOrders: vi.fn(async () => []),
    getOrderById: vi.fn(async () => ({ id: 1, reference: "RKS-000001", status: "pending_contact", customerName: "N", phone: "201000000000", whatsapp: null, city: "Cairo", address: "12 Tahrir Street", building: null, deliveryNotes: null, subtotal: 0, deliveryFee: 0, total: 0, ownerNotes: null, createdAt: new Date(), updatedAt: new Date(), items: [], history: [] })),
    updateOrderStatus: vi.fn(async () => ({ from: "pending_contact", to: "contacted" })),
    setOrderNotes: vi.fn(async () => undefined),
    listReviewsForOwner: vi.fn(async () => []),
    moderateReview: vi.fn(async () => undefined),
  };
});

vi.mock("../storage", () => ({
  storagePut: vi.fn(async (key: string) => ({ key, url: `/manus-storage/${key}` })),
}));

beforeEach(() => {
  fake.current = createFakeDb();
  __setTestDb(fake.current.db);
});

type Caller = ReturnType<typeof appRouter.createCaller>;

/** Every private procedure, exercised with a valid payload. */
const ownerCalls: Record<string, (c: Caller) => Promise<unknown>> = {
  "owner.products": c => c.owner.products(),
  "owner.settings": c => c.owner.settings(),
  "owner.categories": c => c.owner.categories(),
  "owner.audit": c => c.owner.audit({ limit: 10 }),
  "owner.createProduct": c => c.owner.createProduct(validProductInput),
  "owner.updateProduct": c => c.owner.updateProduct({ ...validProductInput, id: 10 }),
  "owner.deleteProduct": c => c.owner.deleteProduct({ id: 10 }),
  "owner.publish": c => c.owner.setProductState({ id: 10, isPublished: true }),
  "owner.unpublish": c => c.owner.setProductState({ id: 10, isPublished: false }),
  "owner.soldOut": c => c.owner.setProductState({ id: 10, isSoldOut: true }),
  "owner.available": c => c.owner.setProductState({ id: 10, isSoldOut: false }),
  "owner.saveSettings": c => c.owner.saveSettings(validSettings),
  "owner.uploadImage": c => c.owner.uploadImage(validPngUpload()),
  "owner.orders": c => c.owner.orders(),
  "owner.order": c => c.owner.order({ id: 1 }),
  "owner.updateOrderStatus": c => c.owner.updateOrderStatus({ id: 1, status: "contacted" }),
  "owner.setOrderNotes": c => c.owner.setOrderNotes({ id: 1, notes: "check transfer" }),
  "owner.reviews": c => c.owner.reviews(),
  "owner.moderateReview": c => c.owner.moderateReview({ id: 1, status: "approved" }),
};

describe("logged-out users", () => {
  for (const [name, call] of Object.entries(ownerCalls)) {
    it(`cannot call ${name}`, async () => {
      const caller = appRouter.createCaller(makeContext(null));
      await expect(call(caller)).rejects.toMatchObject({ code: "UNAUTHORIZED" });
      expect(fake.current!.inserted).toHaveLength(0);
      expect(fake.current!.updated).toHaveLength(0);
      expect(fake.current!.deleted).toHaveLength(0);
    });
  }

  it("auth.me returns null (no identity leak)", async () => {
    await expect(appRouter.createCaller(makeContext(null)).auth.me()).resolves.toBeNull();
  });
});

describe("normal authenticated users", () => {
  for (const [name, call] of Object.entries(ownerCalls)) {
    it(`cannot call ${name}`, async () => {
      const caller = appRouter.createCaller(makeContext(normalUser()));
      await expect(call(caller)).rejects.toMatchObject({ code: "FORBIDDEN" });
      expect(fake.current!.inserted).toHaveLength(0);
      expect(fake.current!.updated).toHaveLength(0);
      expect(fake.current!.deleted).toHaveLength(0);
    });
  }

  it("auth.me exposes only name + isOwner=false — never openId, email or role", async () => {
    const me = await appRouter.createCaller(makeContext(normalUser())).auth.me();
    expect(me).toEqual({ name: "Sample", isOwner: false });
    expect(me).not.toHaveProperty("openId");
    expect(me).not.toHaveProperty("email");
    expect(me).not.toHaveProperty("role");
  });
});

describe("forged roles do not grant access", () => {
  it("a user whose DB row says admin but who is not on the allowlist is rejected", async () => {
    const caller = appRouter.createCaller(makeContext(adminRoleButNotAllowlisted()));
    await expect(caller.owner.products()).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(caller.owner.createProduct(validProductInput)).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("an allowlisted identity without the server-side admin role is rejected", async () => {
    const caller = appRouter.createCaller(makeContext(allowlistedButNotAdmin()));
    await expect(caller.owner.products()).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("client-supplied role/owner hints in headers or input are ignored", async () => {
    const caller = appRouter.createCaller(
      makeContext(normalUser(), { headers: { "x-role": "admin", "x-owner-open-id": "owner-open-id", "x-user-role": "admin" } })
    );
    await expect(caller.owner.products()).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect((caller.owner.createProduct as any)({ ...validProductInput, role: "admin", isOwner: true, openId: "owner-open-id" })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("cron pseudo-identities are rejected even when they carry the owner openId", async () => {
    const cron = { ...ownerUser(), isCron: true } as any;
    await expect(appRouter.createCaller(makeContext(cron)).owner.products()).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("no public procedure can promote a user", () => {
    const publicProcedures = Object.keys(appRouter._def.procedures).filter(p => p.startsWith("storefront.") || p.startsWith("auth."));
    expect(publicProcedures.some(p => /role|promote|admin|owner/i.test(p))).toBe(false);
  });
});

describe("the authorized owner", () => {
  for (const [name, call] of Object.entries(ownerCalls)) {
    it(`can call ${name}`, async () => {
      const caller = appRouter.createCaller(makeContext(ownerUser()));
      await expect(call(caller)).resolves.toBeDefined();
    });
  }

  it("auth.me reports isOwner=true without leaking identity fields", async () => {
    const me = await appRouter.createCaller(makeContext(ownerUser())).auth.me();
    expect(me).toEqual({ name: "Owner", isOwner: true });
  });

  it("sees unpublished products in the private listing", async () => {
    const rows = await appRouter.createCaller(makeContext(ownerUser())).owner.products();
    expect(rows.some(r => r.isPublished === 0)).toBe(true);
  });
});

describe("CSRF protection on owner mutations", () => {
  it("rejects mutations missing the custom CSRF header", async () => {
    const caller = appRouter.createCaller(makeContext(ownerUser(), { withCsrf: false }));
    await expect(caller.owner.deleteProduct({ id: 10 })).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(fake.current!.deleted).toHaveLength(0);
  });

  it("rejects cross-site requests (Sec-Fetch-Site: cross-site)", async () => {
    const caller = appRouter.createCaller(makeContext(ownerUser(), { headers: { "sec-fetch-site": "cross-site" } }));
    await expect(caller.owner.saveSettings(validSettings)).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("rejects requests from a foreign Origin", async () => {
    const caller = appRouter.createCaller(makeContext(ownerUser(), { headers: { origin: "https://evil.example" } }));
    await expect(caller.owner.saveSettings(validSettings)).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("accepts requests from the same origin", async () => {
    const caller = appRouter.createCaller(makeContext(ownerUser(), { headers: { origin: "https://localhost", "sec-fetch-site": "same-origin" } }));
    await expect(caller.owner.saveSettings(validSettings)).resolves.toEqual({ success: true });
  });

  it("owner queries (reads) do not require the CSRF header", async () => {
    const caller = appRouter.createCaller(makeContext(ownerUser(), { withCsrf: false }));
    await expect(caller.owner.products()).resolves.toBeDefined();
  });
});

describe("owner allowlist fails closed", () => {
  it("denies everyone when OWNER_OPEN_IDS is empty", async () => {
    vi.resetModules();
    const previous = process.env.OWNER_OPEN_IDS;
    process.env.OWNER_OPEN_IDS = "";
    const { evaluateOwner } = await import("../_core/authz");
    expect(evaluateOwner(makeUser({ openId: "owner-open-id", role: "admin" }))).toMatchObject({ ok: false, code: "FORBIDDEN", reason: "owner-not-configured" });
    process.env.OWNER_OPEN_IDS = previous;
    vi.resetModules();
  });
});

describe("safe error responses", () => {
  it("does not leak internals when the database is unavailable", async () => {
    fake.current = null;
    __setTestDb(null);
    const caller = appRouter.createCaller(makeContext(ownerUser()));
    await expect(caller.owner.createProduct(validProductInput)).rejects.toMatchObject({ code: "INTERNAL_SERVER_ERROR" });
  });
});
