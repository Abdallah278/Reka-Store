import { describe, expect, it, vi } from "vitest";
import { appRouter } from "../routers";
import { makeContext, normalUser, sampleProduct, validSettings } from "./helpers";

vi.mock("../db", async importOriginal => {
  const actual = await importOriginal<typeof import("../db")>();
  const { sampleProduct, validSettings } = await import("./helpers");
  const all = [sampleProduct({ id: 1, isPublished: 1 }), sampleProduct({ id: 2, isPublished: 0, name: "Hidden draft" }), sampleProduct({ id: 3, isPublished: 1, isSoldOut: 1 })];
  return {
    ...actual,
    getDb: vi.fn(async () => null),
    listProducts: vi.fn(async (includeUnpublished: boolean) => (includeUnpublished ? all : all.filter(p => p.isPublished === 1))),
    listPublicProducts: vi.fn(async () => all.filter(p => p.isPublished === 1).map(actual.toPublicProduct)),
    getStoreSettings: vi.fn(async () => ({ id: 1, ...validSettings, updatedAt: new Date() })),
    listCategories: vi.fn(async () => [{ id: 1, name: "Lips", slug: "lips", createdAt: new Date() }]),
  };
});

describe("public storefront reads", () => {
  it("never return unpublished products, regardless of caller", async () => {
    for (const ctx of [makeContext(null), makeContext(normalUser())]) {
      const rows = await appRouter.createCaller(ctx).storefront.products();
      expect(rows.map(r => r.id)).toEqual([1, 3]);
      expect(rows.some(r => r.name === "Hidden draft")).toBe(false);
    }
  });

  it("do not accept an includeUnpublished parameter", async () => {
    const caller = appRouter.createCaller(makeContext(null));
    // Public procedure takes no input; passing one is ignored and cannot widen the result.
    const rows = await (caller.storefront.products as any)({ includeUnpublished: true });
    expect(rows.map((r: any) => r.id)).toEqual([1, 3]);
  });

  it("expose only public product fields (no storageKey / isPublished / createdAt)", async () => {
    const [row] = await appRouter.createCaller(makeContext(null)).storefront.products();
    expect(Object.keys(row).sort()).toEqual(["brand", "categoryId", "categoryName", "department", "description", "id", "images", "isSoldOut", "name", "offerEndsAt", "originalPrice", "price", "productNotes", "slug", "stockLeft", "updatedAt", "variantLabel"].sort());
    expect(row.images[0]).toEqual({ id: 100, url: "/manus-storage/reka/products/a.jpg", sortOrder: 0 });
    expect(row.images[0]).not.toHaveProperty("storageKey");
    expect(typeof row.isSoldOut).toBe("boolean");
  });

  it("expose sold-out state so the storefront can render it prominently", async () => {
    const rows = await appRouter.createCaller(makeContext(null)).storefront.products();
    expect(rows.find(r => r.id === 3)?.isSoldOut).toBe(true);
  });

  it("settings contain only public brand fields", async () => {
    const settings = await appRouter.createCaller(makeContext(null)).storefront.settings();
    expect(settings).not.toHaveProperty("id");
    expect(Object.keys(settings).sort()).toEqual([...Object.keys(validSettings), "updatedAt"].sort());
  });

  it("categories expose id, name, slug only", async () => {
    const [cat] = await appRouter.createCaller(makeContext(null)).storefront.categories();
    expect(cat).toEqual({ id: 1, name: "Lips", slug: "lips" });
  });

  it("the router has no legacy store.* or admin.* namespaces", () => {
    const names = Object.keys(appRouter._def.procedures);
    expect(names.some(n => n.startsWith("store.") || n.startsWith("admin."))).toBe(false);
    expect(names.filter(n => n.startsWith("storefront."))).toEqual([
      "storefront.settings",
      "storefront.products",
      "storefront.productBySlug",
      "storefront.categories",
      "storefront.reviews",
      "storefront.submitReview",
      "storefront.createOrder",
      "storefront.orderStatus",
    ]);
  });
});
