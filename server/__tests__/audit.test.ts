import { beforeEach, describe, expect, it, vi } from "vitest";
import { sanitizeAuditMetadata } from "../db";
import { appRouter } from "../routers";
import { __setTestDb } from "../db";
import { createFakeDb, makeContext, ownerUser, sampleProduct, validProductInput, validSettings } from "./helpers";

const fake = vi.hoisted(() => ({ current: null as any }));

vi.mock("../db", async importOriginal => {
  const actual = await importOriginal<typeof import("../db")>();
  return {
    ...actual,
    getDb: vi.fn(async () => fake.current?.db ?? null), __setTestDb: actual.__setTestDb,
    getProductById: vi.fn(async () => sampleProduct()),
    getStoreSettings: vi.fn(async () => ({ id: 1, ...validSettings, updatedAt: new Date() })),
  };
});

beforeEach(() => {
  fake.current = createFakeDb();
  __setTestDb(fake.current.db);
});

const auditRows = () => fake.current.inserted.filter((r: any) => typeof r.values?.action === "string").map((r: any) => r.values);

describe("audit logging", () => {
  it("records product create/update/state/delete with actor, action, target and changed fields", async () => {
    const caller = appRouter.createCaller(makeContext(ownerUser()));
    await caller.owner.createProduct(validProductInput);
    await caller.owner.updateProduct({ ...validProductInput, id: 10, price: 420, isSoldOut: true });
    await caller.owner.setProductState({ id: 10, isSoldOut: true });
    await caller.owner.setProductState({ id: 10, isPublished: false });
    await caller.owner.deleteProduct({ id: 10 });

    const rows = auditRows();
    expect(rows.map((r: any) => r.action)).toEqual(["product.create", "product.update", "product.soldout", "product.unpublish", "product.delete"]);
    for (const row of rows) {
      expect(row.actorOpenId).toBe("owner-open-id");
      expect(row.actorUserId).toBe(1);
      expect(row.targetType).toBe("product");
      expect(row.createdAt).toBeInstanceOf(Date);
      expect(typeof row.targetId).toBe("string");
    }
    const update = JSON.parse(rows[1].metadata);
    expect(update.changedFields).toEqual(expect.arrayContaining(["price", "isSoldOut"]));
    expect(update.changedFields).not.toContain("name");
  });

  it("records settings updates with changed field names only", async () => {
    const caller = appRouter.createCaller(makeContext(ownerUser()));
    await caller.owner.saveSettings({ ...validSettings, whatsappNumber: "201234567890", heroTitle: "New season" });
    const [row] = auditRows();
    expect(row.action).toBe("settings.update");
    expect(row.targetType).toBe("settings");
    const meta = JSON.parse(row.metadata);
    expect(meta.changedFields.sort()).toEqual(["heroTitle", "whatsappNumber"]);
    // Values are not stored — only field names.
    expect(row.metadata).not.toContain("201234567890");
  });

  it("never persists secrets, tokens, credentials or payloads", () => {
    const meta = sanitizeAuditMetadata({
      name: "ok",
      token: "abc",
      jwtSecret: "abc",
      password: "abc",
      DATABASE_URL: "mysql://",
      storageKey: "reka/x.png",
      dataUrl: "data:image/png;base64,AAAA",
      bytes: "…",
      cookie: "session=…",
      nested: { deep: true },
      long: "x".repeat(500),
    });
    expect(Object.keys(meta).sort()).toEqual(["long", "name"]);
    expect((meta.long as string).length).toBeLessThan(210);
  });
});
