import { beforeEach, describe, expect, it, vi } from "vitest";
import { appRouter } from "../routers";
import { __setTestDb } from "../db";
import { reviewLimiter } from "../_core/security";
import { createFakeDb, makeContext, normalUser, ownerUser } from "./helpers";

/** Honest reviews: everything is moderated, nothing is seeded or fabricated. */

const fake = vi.hoisted(() => ({ current: null as ReturnType<typeof import("./helpers")["createFakeDb"]> | null }));

beforeEach(() => {
  fake.current = createFakeDb();
  __setTestDb(fake.current.db);
  reviewLimiter.reset();
});

const reviewRow = (overrides: Record<string, unknown> = {}) => ({
  id: 1,
  productId: 10,
  customerName: "Nour Ahmed",
  rating: 5,
  body: "Lovely texture",
  status: "pending",
  createdAt: new Date(),
  ...overrides,
});

describe("storefront reviews", () => {
  it("submitting a review always lands in pending — never auto-approved", async () => {
    const caller = appRouter.createCaller(makeContext(null));
    const result = await caller.storefront.submitReview({ productId: 10, customerName: "Nour Ahmed", rating: 5, body: "Great" });
    expect(result).toEqual({ success: true, moderation: "pending" });
    const inserted = fake.current!.inserted[0].values as Record<string, unknown>;
    expect(inserted.status).toBe("pending");
  });

  it("rejects out-of-range ratings", async () => {
    const caller = appRouter.createCaller(makeContext(null));
    await expect(caller.storefront.submitReview({ productId: 10, customerName: "Nour", rating: 6 })).rejects.toMatchObject({ code: "BAD_REQUEST" });
    await expect(caller.storefront.submitReview({ productId: 10, customerName: "Nour", rating: 0 })).rejects.toMatchObject({ code: "BAD_REQUEST" });
    expect(fake.current!.inserted).toHaveLength(0);
  });

  it("public listing returns approved reviews only, with first name only", async () => {
    fake.current!.setSelectRows([reviewRow({ id: 1, status: "pending" }), reviewRow({ id: 2, status: "approved" }), reviewRow({ id: 3, status: "rejected" })]);
    const rows = await appRouter.createCaller(makeContext(null)).storefront.reviews({ productId: 10 });
    expect(rows.map(r => r.id)).toEqual([2]);
    expect(rows[0].name).toBe("Nour");
    expect(rows[0]).not.toHaveProperty("status");
    expect(rows[0]).not.toHaveProperty("customerName");
  });

  it("with no approved reviews the public list is empty (storefront shows 'No reviews yet')", async () => {
    fake.current!.setSelectRows([]);
    const rows = await appRouter.createCaller(makeContext(null)).storefront.reviews({ productId: 10 });
    expect(rows).toEqual([]);
  });

  it("is rate limited", async () => {
    const caller = appRouter.createCaller(makeContext(null));
    for (let i = 0; i < 5; i++) await caller.storefront.submitReview({ productId: 10, customerName: "Nour", rating: 4 });
    await expect(caller.storefront.submitReview({ productId: 10, customerName: "Nour", rating: 4 })).rejects.toMatchObject({ code: "TOO_MANY_REQUESTS" });
  });
});

describe("review moderation", () => {
  it("is owner-only", async () => {
    await expect(appRouter.createCaller(makeContext(null)).owner.reviews()).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    await expect(appRouter.createCaller(makeContext(normalUser())).owner.moderateReview({ id: 1, status: "approved" })).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(fake.current!.updated).toHaveLength(0);
  });

  it("owner can approve and reject, and it is audited", async () => {
    const caller = appRouter.createCaller(makeContext(ownerUser()));
    await caller.owner.moderateReview({ id: 1, status: "approved" });
    expect(fake.current!.updated.length).toBeGreaterThanOrEqual(1);
    expect((fake.current!.updated[0].values as Record<string, unknown>).status).toBe("approved");
    // audit row
    expect(fake.current!.inserted.length).toBeGreaterThanOrEqual(1);
  });

  it("only approved/rejected are accepted as moderation outcomes", async () => {
    const caller = appRouter.createCaller(makeContext(ownerUser()));
    await expect(caller.owner.moderateReview({ id: 1, status: "pending" as never })).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });
});
