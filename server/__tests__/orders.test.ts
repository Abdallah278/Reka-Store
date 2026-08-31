import { beforeEach, describe, expect, it, vi } from "vitest";
import { appRouter } from "../routers";
import { __setTestDb, orderReferenceFor } from "../db";
import { orderLimiter } from "../_core/security";
import { buildOrderMessage, whatsappOrderUrl } from "@shared/whatsapp";
import { createFakeDb, makeContext, normalUser, ownerUser, validSettings } from "./helpers";

/**
 * Order flow tests. The fake DB never touches a real database. The catalogue
 * reaches createOrder through the real listPublicProducts() over the fake
 * select chain, so the *actual* server-side revalidation logic is exercised.
 */

vi.mock("../db", async importOriginal => {
  const actual = await importOriginal<typeof import("../db")>();
  const { validSettings } = await import("./helpers");
  return {
    ...actual,
    // Router-level settings read (WhatsApp number for the handoff URL).
    getStoreSettings: vi.fn(async () => ({ id: 1, ...validSettings, updatedAt: new Date() })),
  };
});

const fake = vi.hoisted(() => ({ current: null as ReturnType<typeof import("./helpers")["createFakeDb"]> | null }));

const rawProduct = (overrides: Record<string, unknown> = {}) => ({
  id: 10,
  name: "Velvet Tint",
  slug: "velvet-tint-x",
  description: null,
  price: 350,
  originalPrice: null,
  offerEndsAt: null,
  department: "makeup",
  brand: null,
  sku: null,
  productNotes: null,
  variantLabel: null,
  categoryId: 1,
  isSoldOut: 0,
  isPublished: 1,
  stockQuantity: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

const productRow = (overrides: Record<string, unknown> = {}) => ({ product: rawProduct(overrides), category: { id: 1, name: "Lips", slug: "lips", createdAt: new Date() } });

const validCheckout = {
  customerName: "Nour Ahmed",
  phone: "+20 100 123 4567",
  whatsapp: null,
  city: "Cairo",
  address: "12 Tahrir Street, Downtown, Apartment 4",
  building: "Bldg 3, floor 2",
  deliveryNotes: "Call before arriving",
  consent: true as const,
  items: [{ productId: 10, quantity: 2 }],
};

beforeEach(() => {
  fake.current = createFakeDb();
  __setTestDb(fake.current.db);
  orderLimiter.reset();
});

describe("storefront.createOrder", () => {
  it("creates the order server-side with recalculated totals before WhatsApp opens", async () => {
    fake.current!.setSelectRows([productRow()]);
    const caller = appRouter.createCaller(makeContext(null));
    const result = await caller.storefront.createOrder(validCheckout);

    // Reference is server-generated from the insert id.
    expect(result.reference).toBe(orderReferenceFor(42));
    expect(result.reference).toMatch(/^RKS-\d{6}$/);
    // Totals recalculated from the live catalogue price (350 x 2).
    expect(result.subtotal).toBe(700);
    expect(result.total).toBe(result.subtotal + result.deliveryFee);
    // Order row, items and status history were persisted BEFORE returning.
    expect(fake.current!.inserted.length).toBeGreaterThanOrEqual(3);
    const orderInsert = fake.current!.inserted[0].values as Record<string, unknown>;
    expect(orderInsert.status).toBe("pending_contact");
    expect(orderInsert.subtotal).toBe(700);
    // WhatsApp handoff is complete and URL-encoded.
    expect(result.whatsappUrl.startsWith("https://wa.me/201000000000?text=")).toBe(true);
    const text = decodeURIComponent(result.whatsappUrl.split("text=")[1]);
    expect(text).toContain(result.reference);
    expect(text).toContain("Nour Ahmed");
    expect(text).toContain("+20 100 123 4567");
    expect(text).toContain("Cairo");
    expect(text).toContain("12 Tahrir Street");
    expect(text).toContain("Velvet Tint x 2 — 350 EGP");
    expect(text).toContain("Subtotal: 700 EGP");
    expect(text).toContain("confirmed manually");
  });

  it("ignores browser-supplied totals — they cannot override server prices", async () => {
    fake.current!.setSelectRows([productRow({ price: 500 })]);
    const caller = appRouter.createCaller(makeContext(null));
    const forged = { ...validCheckout, total: 1, subtotal: 1, price: 1 } as typeof validCheckout;
    const result = await caller.storefront.createOrder(forged);
    expect(result.subtotal).toBe(1000); // 500 x 2 from the server catalogue
    expect(result.total).toBeGreaterThanOrEqual(1000);
  });

  it("rejects sold-out products without creating anything", async () => {
    fake.current!.setSelectRows([productRow({ isSoldOut: 1 })]);
    const caller = appRouter.createCaller(makeContext(null));
    await expect(caller.storefront.createOrder(validCheckout)).rejects.toMatchObject({ code: "BAD_REQUEST" });
    expect(fake.current!.inserted).toHaveLength(0);
  });

  it("treats tracked stock 0 as sold out", async () => {
    fake.current!.setSelectRows([productRow({ stockQuantity: 0 })]);
    const caller = appRouter.createCaller(makeContext(null));
    await expect(caller.storefront.createOrder(validCheckout)).rejects.toMatchObject({ code: "BAD_REQUEST" });
    expect(fake.current!.inserted).toHaveLength(0);
  });

  it("rejects quantities above tracked stock", async () => {
    fake.current!.setSelectRows([productRow({ stockQuantity: 1 })]);
    const caller = appRouter.createCaller(makeContext(null));
    await expect(caller.storefront.createOrder(validCheckout)).rejects.toMatchObject({ code: "BAD_REQUEST" });
    expect(fake.current!.inserted).toHaveLength(0);
  });

  it("decrements tracked stock after the order is created", async () => {
    fake.current!.setSelectRows([productRow({ stockQuantity: 5 })]);
    const caller = appRouter.createCaller(makeContext(null));
    await caller.storefront.createOrder(validCheckout); // quantity 2
    const stockUpdate = fake.current!.updated.find(u => (u.values as Record<string, unknown>).stockQuantity !== undefined);
    expect(stockUpdate).toBeDefined();
    expect((stockUpdate!.values as Record<string, unknown>).stockQuantity).toBe(3);
  });

  it("leaves untracked stock (null) untouched", async () => {
    fake.current!.setSelectRows([productRow({ stockQuantity: null })]);
    const caller = appRouter.createCaller(makeContext(null));
    await caller.storefront.createOrder(validCheckout);
    const stockUpdate = fake.current!.updated.find(u => (u.values as Record<string, unknown>).stockQuantity !== undefined);
    expect(stockUpdate).toBeUndefined();
  });

  it("rejects unpublished products", async () => {
    fake.current!.setSelectRows([productRow({ isPublished: 0 })]);
    const caller = appRouter.createCaller(makeContext(null));
    await expect(caller.storefront.createOrder(validCheckout)).rejects.toMatchObject({ code: "BAD_REQUEST" });
    expect(fake.current!.inserted).toHaveLength(0);
  });

  it("rejects unknown products", async () => {
    fake.current!.setSelectRows([]);
    const caller = appRouter.createCaller(makeContext(null));
    await expect(caller.storefront.createOrder(validCheckout)).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("validates delivery information", async () => {
    fake.current!.setSelectRows([productRow()]);
    const caller = appRouter.createCaller(makeContext(null));
    const bad = [
      { ...validCheckout, customerName: "A" },
      { ...validCheckout, phone: "abc" },
      { ...validCheckout, city: "" },
      { ...validCheckout, address: "short" },
      { ...validCheckout, consent: false as unknown as true },
      { ...validCheckout, items: [] },
      { ...validCheckout, items: [{ productId: 10, quantity: 0 }] },
      { ...validCheckout, items: [{ productId: 10, quantity: 99 }] },
    ];
    for (const payload of bad) {
      await expect(caller.storefront.createOrder(payload)).rejects.toMatchObject({ code: "BAD_REQUEST" });
    }
    expect(fake.current!.inserted).toHaveLength(0);
  });

  it("requires the CSRF header even though it is public", async () => {
    fake.current!.setSelectRows([productRow()]);
    const caller = appRouter.createCaller(makeContext(null, { withCsrf: false }));
    await expect(caller.storefront.createOrder(validCheckout)).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("is rate limited per IP", async () => {
    fake.current!.setSelectRows([productRow()]);
    const caller = appRouter.createCaller(makeContext(null));
    for (let i = 0; i < 10; i++) await caller.storefront.createOrder(validCheckout);
    await expect(caller.storefront.createOrder(validCheckout)).rejects.toMatchObject({ code: "TOO_MANY_REQUESTS" });
  });
});

describe("storefront.orderStatus", () => {
  it("returns reference, status and date only — no customer data", async () => {
    fake.current!.setSelectRows([
      { id: 1, reference: "RKS-000001", status: "preparing", customerName: "PRIVATE", phone: "PRIVATE", address: "PRIVATE", ownerNotes: "PRIVATE", createdAt: new Date() },
    ]);
    const result = await appRouter.createCaller(makeContext(null)).storefront.orderStatus({ reference: "RKS-000001" });
    expect(result).toEqual({ reference: "RKS-000001", status: "preparing", createdAt: expect.any(Date) });
    expect(JSON.stringify(result)).not.toContain("PRIVATE");
  });

  it("rejects malformed references", async () => {
    const caller = appRouter.createCaller(makeContext(null));
    await expect(caller.storefront.orderStatus({ reference: "1 OR 1=1" })).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });
});

describe("owner order management", () => {
  const orderRow = (status: string) => ({
    id: 1,
    reference: "RKS-000001",
    status,
    customerName: "Nour",
    phone: "201001234567",
    whatsapp: null,
    city: "Cairo",
    address: "12 Tahrir Street",
    building: null,
    deliveryNotes: null,
    subtotal: 700,
    deliveryFee: 0,
    total: 700,
    ownerNotes: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  it("denies order reads and mutations to logged-out users", async () => {
    const caller = appRouter.createCaller(makeContext(null));
    await expect(caller.owner.orders()).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    await expect(caller.owner.order({ id: 1 })).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    await expect(caller.owner.updateOrderStatus({ id: 1, status: "contacted" })).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    await expect(caller.owner.setOrderNotes({ id: 1, notes: "x" })).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });

  it("denies order reads and mutations to normal authenticated users", async () => {
    const caller = appRouter.createCaller(makeContext(normalUser()));
    await expect(caller.owner.orders()).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(caller.owner.updateOrderStatus({ id: 1, status: "paid" })).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(fake.current!.updated).toHaveLength(0);
  });

  it("lets the owner make a valid transition and records history + audit", async () => {
    fake.current!.setSelectRows([orderRow("pending_contact")]);
    const caller = appRouter.createCaller(makeContext(ownerUser()));
    const result = await caller.owner.updateOrderStatus({ id: 1, status: "contacted" });
    expect(result).toMatchObject({ success: true, from: "pending_contact", to: "contacted" });
    expect(fake.current!.updated.length).toBeGreaterThanOrEqual(1);
    // history + audit rows were appended
    expect(fake.current!.inserted.length).toBeGreaterThanOrEqual(2);
  });

  it("refuses invalid workflow transitions (pending_contact -> paid)", async () => {
    fake.current!.setSelectRows([orderRow("pending_contact")]);
    const caller = appRouter.createCaller(makeContext(ownerUser()));
    await expect(caller.owner.updateOrderStatus({ id: 1, status: "paid" })).rejects.toMatchObject({ code: "BAD_REQUEST" });
    expect(fake.current!.updated).toHaveLength(0);
  });

  it("never marks paid automatically — paid is only reachable via the manual owner mutation", async () => {
    // The customer-facing flow can only ever produce pending_contact.
    fake.current!.setSelectRows([productRow()]);
    const anon = appRouter.createCaller(makeContext(null));
    await anon.storefront.createOrder(validCheckout);
    for (const { values } of fake.current!.inserted) {
      const v = values as Record<string, unknown>;
      if ("status" in v) expect(v.status).toBe("pending_contact");
      if ("toStatus" in v) expect(v.toStatus).toBe("pending_contact");
    }
  });

  it("terminal states cannot be changed", async () => {
    fake.current!.setSelectRows([orderRow("completed")]);
    const caller = appRouter.createCaller(makeContext(ownerUser()));
    await expect(caller.owner.updateOrderStatus({ id: 1, status: "cancelled" })).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });
});

describe("buildOrderMessage", () => {
  const order = {
    reference: "RKS-000123",
    customerName: "Nour Ahmed",
    phone: "201001234567",
    whatsapp: null,
    city: "Giza",
    address: "5 Nile Street",
    building: "Floor 3",
    deliveryNotes: "Evening delivery",
    items: [
      { name: "Velvet Tint", quantity: 2, unitPrice: 350 },
      { name: "Amber Mist 50ml", quantity: 1, unitPrice: 1250 },
    ],
    subtotal: 1950,
    deliveryFee: 60,
    total: 2010,
  };

  it("contains every required field", () => {
    const msg = buildOrderMessage(order);
    for (const expected of [
      "Order reference: RKS-000123",
      "Name: Nour Ahmed",
      "Phone: 201001234567",
      "City: Giza",
      "Address: 5 Nile Street",
      "Building/Floor/Apt: Floor 3",
      "Notes: Evening delivery",
      "- Velvet Tint x 2 — 350 EGP",
      "- Amber Mist 50ml x 1 — 1,250 EGP",
      "Subtotal: 1,950 EGP",
      "Delivery: 60 EGP",
      "Total: 2,010 EGP",
      "confirmed manually",
    ]) {
      expect(msg).toContain(expected);
    }
  });

  it("URL-encodes the full message", () => {
    const url = whatsappOrderUrl("+20 100 123 4567", order);
    expect(url.startsWith("https://wa.me/201001234567?text=")).toBe(true);
    expect(url).not.toContain("\n");
    expect(url).not.toContain(" ");
    expect(decodeURIComponent(url.split("text=")[1])).toContain("RKS-000123");
  });

  it("shows delivery as to-be-confirmed when no fee is configured", () => {
    const msg = buildOrderMessage({ ...order, deliveryFee: 0, total: 1950 });
    expect(msg).toContain("Delivery: to be confirmed");
  });
});
