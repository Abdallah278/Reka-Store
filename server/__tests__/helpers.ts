import { vi } from "vitest";
import type { TrpcContext } from "../_core/context";
import { CSRF_HEADER, CSRF_HEADER_VALUE } from "../_core/authz";
import type { ProductWithRelations } from "../db";

export type Recorded = { table: unknown; values: unknown };

/** Minimal in-memory stand-in for the drizzle client. Never touches a real database. */
export function createFakeDb() {
  const inserted: Recorded[] = [];
  const updated: Recorded[] = [];
  const deleted: unknown[] = [];
  let selectRows: unknown[] = [];

  const selectChain = () => {
    const chain: any = {};
    for (const m of ["from", "leftJoin", "where", "orderBy", "limit"]) chain[m] = vi.fn(() => chain);
    chain.then = (resolve: (v: unknown) => unknown, reject?: (e: unknown) => unknown) => Promise.resolve(selectRows).then(resolve, reject);
    return chain;
  };

  const db = {
    insert: vi.fn((table: unknown) => ({
      values: vi.fn((values: unknown) => {
        inserted.push({ table, values });
        // Awaitable insert chain matching drizzle's pg builder:
        //   await db.insert(t).values(v)
        //   await db.insert(t).values(v).returning({ id })
        //   await db.insert(t).values(v).onConflictDoUpdate({...})
        const chain: any = {
          returning: vi.fn(async () => [{ id: 42 }]),
          onConflictDoUpdate: vi.fn(async () => undefined),
          then: (resolve: (v: unknown) => unknown, reject?: (e: unknown) => unknown) => Promise.resolve(undefined).then(resolve, reject),
        };
        return chain;
      }),
    })),
    update: vi.fn((table: unknown) => ({
      set: vi.fn((values: unknown) => ({
        where: vi.fn(async () => {
          updated.push({ table, values });
        }),
      })),
    })),
    delete: vi.fn((table: unknown) => ({
      where: vi.fn(async () => {
        deleted.push(table);
      }),
    })),
    select: vi.fn(() => selectChain()),
  };

  return {
    db,
    inserted,
    updated,
    deleted,
    setSelectRows(rows: unknown[]) {
      selectRows = rows;
    },
    reset() {
      inserted.length = 0;
      updated.length = 0;
      deleted.length = 0;
      selectRows = [];
    },
  };
}

type UserRow = NonNullable<TrpcContext["user"]>;

export function makeUser(overrides: Partial<UserRow> = {}): UserRow {
  return {
    id: 7,
    openId: "some-user",
    name: "Sample",
    email: "sample@example.com",
    loginMethod: "test",
    role: "user",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
    sessionInvalidatedAt: null,
    ...overrides,
  };
}

export type CtxOptions = {
  headers?: Record<string, string>;
  withCsrf?: boolean;
};

export function makeContext(user: UserRow | null, opts: CtxOptions = {}): TrpcContext & { cleared: { name: string; options: Record<string, unknown> }[] } {
  const cleared: { name: string; options: Record<string, unknown> }[] = [];
  const headers: Record<string, string> = { host: "localhost:3000", ...(opts.headers ?? {}) };
  if (opts.withCsrf !== false) headers[CSRF_HEADER] = CSRF_HEADER_VALUE;
  return {
    user,
    cleared,
    req: { protocol: "https", headers, ip: "127.0.0.1", socket: { remoteAddress: "127.0.0.1" } } as unknown as TrpcContext["req"],
    res: { clearCookie: (name: string, options: Record<string, unknown>) => cleared.push({ name, options }) } as unknown as TrpcContext["res"],
  };
}

export const ownerUser = () => makeUser({ id: 1, openId: "owner-open-id", role: "admin", name: "Owner" });
export const normalUser = () => makeUser({ id: 2, openId: "some-user", role: "user" });
/** Right openId, but the DB row is not admin — must still be rejected. */
export const allowlistedButNotAdmin = () => makeUser({ id: 3, openId: "owner-open-id", role: "user" });
/** DB says admin, but the identity is not on the allowlist — must still be rejected. */
export const adminRoleButNotAllowlisted = () => makeUser({ id: 4, openId: "impostor", role: "admin" });

export const sampleProduct = (overrides: Partial<ProductWithRelations> = {}): ProductWithRelations => ({
  id: 10,
  name: "Velvet Tint",
  slug: "velvet-tint-x",
  description: "Soft everyday colour",
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
  createdAt: new Date("2026-01-01T00:00:00Z"),
  updatedAt: new Date("2026-01-02T00:00:00Z"),
  categoryName: "Lips",
  images: [{ id: 100, productId: 10, imageUrl: "/manus-storage/reka/products/a.jpg", storageKey: "reka/products/a.jpg", sortOrder: 0 }],
  ...overrides,
});

export const validSettings = {
  storeName: "Reka Store",
  logoUrl: null,
  whatsappNumber: "201000000000",
  primaryColor: "#310E10",
  accentColor: "#74070E",
  heroTitle: "Beauty, your way",
  heroSubtitle: "A considered beauty edit.",
  heroImageUrl: null,
  instagramUrl: null,
  deliveryFee: 0,
};

export const validProductInput = {
  name: "Velvet Tint",
  description: "Soft everyday colour",
  price: 350,
  categoryId: null,
  isSoldOut: false,
  isPublished: true,
  images: [{ url: "/manus-storage/reka/products/a.jpg", key: "reka/products/a.jpg" }],
};

/* Image fixtures ----------------------------------------------------- */

const PNG_HEADER = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

export function pngBytes(size = 64): Buffer {
  return Buffer.concat([PNG_HEADER, Buffer.alloc(Math.max(0, size - PNG_HEADER.length), 1)]);
}

export function jpegBytes(size = 64): Buffer {
  return Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.alloc(Math.max(0, size - 4), 1)]);
}

export const dataUrl = (mime: string, bytes: Buffer) => `data:${mime};base64,${bytes.toString("base64")}`;

export const validPngUpload = () => ({ dataUrl: dataUrl("image/png", pngBytes()), filename: "look.png", mimeType: "image/png", scope: "products" as const });
