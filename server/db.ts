import { asc, desc, eq, inArray } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import {
  auditLogs,
  categories,
  InsertUser,
  orderItems,
  orders,
  orderStatusHistory,
  productImages,
  products,
  reviews,
  storeSettings,
  users,
  type AuditLog,
  type Category,
  type Order,
  type OrderItem,
  type OrderStatusHistoryRow,
  type Product,
  type ProductImage,
  type Review,
  type StoreSettings,
} from "../drizzle/schema";
import { canTransition, isOrderStatus, type OrderStatus } from "@shared/orders";
import { ENV } from "./_core/env";

let _db: ReturnType<typeof drizzle> | null = null;
let _testDb: ReturnType<typeof drizzle> | null = null;

/** Test-only injection point so the suite never touches a real database. */
export function __setTestDb(db: unknown) {
  if (process.env.NODE_ENV !== "test") throw new Error("__setTestDb is only available under NODE_ENV=test");
  _testDb = db as ReturnType<typeof drizzle> | null;
}

export async function getDb() {
  if (_testDb) return _testDb;
  if (!_db && process.env.DATABASE_URL) {
    try {
      // Supabase PostgreSQL. `prepare: false` is required behind the Supabase
      // transaction pooler (PgBouncer); max 1 keeps serverless connections lean.
      // The timeouts matter on Vercel: a frozen-then-thawed function reuses
      // this cached client, and a socket the pooler already dropped would
      // otherwise make the next query hang until the platform's 300s kill.
      const client = postgres(process.env.DATABASE_URL, {
        prepare: false,
        max: 1,
        connect_timeout: 10,
        idle_timeout: 20,
        max_lifetime: 60 * 5,
      });
      _db = drizzle(client);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
    }
  }
  return _db;
}

/* ------------------------------------------------------------------ */
/* Users                                                               */
/* ------------------------------------------------------------------ */

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) return;
  const values: InsertUser = { openId: user.openId };
  const updateSet: Record<string, unknown> = {};
  for (const field of ["name", "email", "loginMethod"] as const) {
    if (user[field] !== undefined) {
      values[field] = user[field] ?? null;
      updateSet[field] = values[field];
    }
  }
  if (user.lastSignedIn !== undefined) {
    values.lastSignedIn = user.lastSignedIn;
    updateSet.lastSignedIn = user.lastSignedIn;
  }
  // Role is decided ONLY from the server-side owner allowlist. It is never
  // taken from the client. Owners are promoted; everyone else is demoted so a
  // stale admin row cannot outlive removal from the allowlist.
  const shouldBeAdmin = ENV.ownerOpenIds.includes(user.openId);
  values.role = shouldBeAdmin ? "admin" : "user";
  updateSet.role = values.role;
  values.lastSignedIn ??= new Date();
  updateSet.lastSignedIn ??= new Date();
  await db.insert(users).values(values).onConflictDoUpdate({ target: users.openId, set: updateSet });
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result[0];
}

/** Revoke every session issued up to now for this user. */
export async function invalidateUserSessions(openId: string): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.update(users).set({ sessionInvalidatedAt: new Date() }).where(eq(users.openId, openId));
}

/* ------------------------------------------------------------------ */
/* Products                                                            */
/* ------------------------------------------------------------------ */

export type ProductWithRelations = Product & { categoryName: string; images: ProductImage[] };

export async function listProducts(includeUnpublished = false): Promise<ProductWithRelations[]> {
  const db = await getDb();
  if (!db) return [];
  const rows = await db
    .select({ product: products, category: categories })
    .from(products)
    .leftJoin(categories, eq(products.categoryId, categories.id))
    .where(includeUnpublished ? undefined : eq(products.isPublished, 1))
    .orderBy(desc(products.createdAt));
  const ids = rows.map(r => r.product.id);
  const images = ids.length
    ? await db.select().from(productImages).where(inArray(productImages.productId, ids)).orderBy(asc(productImages.sortOrder))
    : [];
  return rows.map(({ product, category }) => ({
    ...product,
    categoryName: category?.name ?? "Uncategorised",
    images: images.filter(image => image.productId === product.id),
  }));
}

export async function getProductById(id: number): Promise<ProductWithRelations | null> {
  const all = await listProducts(true);
  return all.find(p => p.id === id) ?? null;
}

/** True when the product carries a genuine, currently-valid discount. */
export function hasActiveOffer(p: Pick<Product, "price" | "originalPrice" | "offerEndsAt">): boolean {
  if (p.originalPrice == null || p.originalPrice <= p.price) return false;
  if (p.offerEndsAt && p.offerEndsAt.getTime() < Date.now()) return false;
  return true;
}

/** Fields the public storefront is allowed to see. Nothing else leaves the server. */
export type PublicProduct = {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  price: number;
  /** Only present for a genuine, active discount (originalPrice > price, not expired). */
  originalPrice: number | null;
  offerEndsAt: Date | null;
  department: string;
  brand: string | null;
  productNotes: string | null;
  variantLabel: string | null;
  categoryId: number | null;
  categoryName: string;
  isSoldOut: boolean;
  updatedAt: Date;
  images: { id: number; url: string; sortOrder: number }[];
};

export function toPublicProduct(product: ProductWithRelations): PublicProduct {
  const offer = hasActiveOffer(product);
  return {
    id: product.id,
    name: product.name,
    slug: product.slug,
    description: product.description,
    price: product.price,
    originalPrice: offer ? product.originalPrice : null,
    offerEndsAt: offer ? product.offerEndsAt : null,
    department: product.department,
    brand: product.brand,
    productNotes: product.productNotes,
    variantLabel: product.variantLabel,
    categoryId: product.categoryId,
    categoryName: product.categoryName,
    isSoldOut: Boolean(product.isSoldOut),
    updatedAt: product.updatedAt,
    images: product.images.map(image => ({ id: image.id, url: image.imageUrl, sortOrder: image.sortOrder })),
  };
}

export async function listPublicProducts(): Promise<PublicProduct[]> {
  const rows = await listProducts(false);
  return rows.filter(p => p.isPublished === 1).map(toPublicProduct);
}

export async function listCategories(): Promise<Category[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(categories).orderBy(categories.name);
}

/* ------------------------------------------------------------------ */
/* Settings                                                            */
/* ------------------------------------------------------------------ */

export const DEFAULT_SETTINGS: Omit<StoreSettings, "id" | "updatedAt"> = {
  storeName: "Reka Store",
  logoUrl: null,
  whatsappNumber: "201000000000",
  primaryColor: "#310E10",
  accentColor: "#74070E",
  heroTitle: "Beauty, your way",
  heroSubtitle: "A considered edit of colour, skin and ritual — chosen for the way you actually live.",
  heroImageUrl: null,
  instagramUrl: null,
  deliveryFee: 0,
};

/** Read-only. Never writes on a public read. */
export async function getStoreSettings(): Promise<StoreSettings> {
  const db = await getDb();
  const fallback: StoreSettings = { id: 0, ...DEFAULT_SETTINGS, updatedAt: new Date(0) };
  if (!db) return fallback;
  const rows = await db.select().from(storeSettings).limit(1);
  return rows[0] ?? fallback;
}

export type PublicSettings = Omit<StoreSettings, "id">;

export function toPublicSettings(settings: StoreSettings): PublicSettings {
  const { id: _id, ...rest } = settings;
  return rest;
}

/* ------------------------------------------------------------------ */
/* Audit                                                               */
/* ------------------------------------------------------------------ */

const FORBIDDEN_META_KEYS = /(secret|token|password|credential|cookie|jwt|dataurl|bytes|base64|database|connection|dsn|authorization|key$)/i;

/** Strip anything that looks like a secret or payload before persisting. */
export function sanitizeAuditMetadata(meta: Record<string, unknown> | undefined): Record<string, unknown> {
  if (!meta) return {};
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(meta)) {
    if (FORBIDDEN_META_KEYS.test(k)) continue;
    if (typeof v === "string") out[k] = v.length > 200 ? `${v.slice(0, 200)}…` : v;
    else if (typeof v === "number" || typeof v === "boolean" || v === null) out[k] = v;
    else if (Array.isArray(v)) out[k] = v.filter(x => typeof x === "string" || typeof x === "number").slice(0, 50);
  }
  return out;
}

export async function writeAudit(entry: {
  actorOpenId: string;
  actorUserId: number | null;
  action: string;
  targetType: string;
  targetId?: string | number | null;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.insert(auditLogs).values({
    actorOpenId: entry.actorOpenId,
    actorUserId: entry.actorUserId,
    action: entry.action,
    targetType: entry.targetType,
    targetId: entry.targetId == null ? null : String(entry.targetId),
    metadata: JSON.stringify(sanitizeAuditMetadata(entry.metadata)),
    createdAt: new Date(),
  });
}

export async function listAudit(limit = 100): Promise<AuditLog[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(auditLogs).orderBy(desc(auditLogs.createdAt), desc(auditLogs.id)).limit(limit);
}

/* ------------------------------------------------------------------ */
/* Orders                                                              */
/* ------------------------------------------------------------------ */

export class OrderCreationError extends Error {
  constructor(public readonly reason: string, message: string) {
    super(message);
    this.name = "OrderCreationError";
  }
}

export type CreateOrderInput = {
  customerName: string;
  phone: string;
  whatsapp?: string | null;
  city: string;
  address: string;
  building?: string | null;
  deliveryNotes?: string | null;
  items: { productId: number; quantity: number }[];
};

export type CreatedOrder = {
  id: number;
  reference: string;
  status: OrderStatus;
  customerName: string;
  phone: string;
  whatsapp: string | null;
  city: string;
  address: string;
  building: string | null;
  deliveryNotes: string | null;
  items: { productId: number; name: string; department: string; unitPrice: number; quantity: number; lineTotal: number }[];
  subtotal: number;
  deliveryFee: number;
  total: number;
};

export const orderReferenceFor = (id: number) => `RKS-${String(id).padStart(6, "0")}`;

/**
 * Create an order server-side. Every price is read from the live catalogue:
 * nothing the browser sends about prices or totals is used. Sold-out,
 * unpublished and unknown products are rejected outright.
 */
export async function createOrder(input: CreateOrderInput): Promise<CreatedOrder> {
  const db = await getDb();
  if (!db) throw new OrderCreationError("db", "Database unavailable");
  if (input.items.length === 0) throw new OrderCreationError("empty", "The cart is empty");

  // Merge duplicate lines defensively.
  const wanted = new Map<number, number>();
  for (const item of input.items) {
    wanted.set(item.productId, (wanted.get(item.productId) ?? 0) + item.quantity);
  }

  const catalogue = await listPublicProducts();
  const items: CreatedOrder["items"] = [];
  for (const [productId, quantity] of Array.from(wanted.entries())) {
    const product = catalogue.find(p => p.id === productId);
    if (!product) throw new OrderCreationError("unavailable", "A product in your cart is no longer available");
    if (product.isSoldOut) throw new OrderCreationError("sold-out", `${product.name} is sold out`);
    if (quantity < 1 || quantity > 20) throw new OrderCreationError("quantity", "Quantity must be between 1 and 20");
    items.push({
      productId,
      name: product.name,
      department: product.department,
      unitPrice: product.price,
      quantity,
      lineTotal: product.price * quantity,
    });
  }

  const settings = await getStoreSettings();
  const subtotal = items.reduce((sum, item) => sum + item.lineTotal, 0);
  const deliveryFee = Math.max(0, settings.deliveryFee ?? 0);
  const total = subtotal + deliveryFee;

  const provisional = `RKS-P${Date.now().toString(36)}${Math.floor(Math.random() * 1e4)}`.slice(0, 24);
  const created = await db
    .insert(orders)
    .values({
      reference: provisional,
      status: "pending_contact",
      customerName: input.customerName,
      phone: input.phone,
      whatsapp: input.whatsapp ?? null,
      city: input.city,
      address: input.address,
      building: input.building ?? null,
      deliveryNotes: input.deliveryNotes ?? null,
      subtotal,
      deliveryFee,
      total,
    })
    .returning({ id: orders.id });
  const orderId = Number(created[0]?.id);
  const reference = orderReferenceFor(orderId);
  await db.update(orders).set({ reference }).where(eq(orders.id, orderId));
  await db.insert(orderItems).values(items.map(item => ({ orderId, ...item })));
  await db.insert(orderStatusHistory).values({ orderId, fromStatus: null, toStatus: "pending_contact", actor: "customer", note: null });

  return {
    id: orderId,
    reference,
    status: "pending_contact",
    customerName: input.customerName,
    phone: input.phone,
    whatsapp: input.whatsapp ?? null,
    city: input.city,
    address: input.address,
    building: input.building ?? null,
    deliveryNotes: input.deliveryNotes ?? null,
    items,
    subtotal,
    deliveryFee,
    total,
  };
}

/** Public order lookup: reference + status + date ONLY. No customer data. */
export async function getPublicOrderStatus(reference: string): Promise<{ reference: string; status: string; createdAt: Date } | null> {
  const db = await getDb();
  if (!db) return null;
  const rows = await db.select().from(orders).where(eq(orders.reference, reference)).limit(1);
  const order = rows[0];
  if (!order) return null;
  return { reference: order.reference, status: order.status, createdAt: order.createdAt };
}

export type OrderWithItems = Order & { items: OrderItem[] };

export async function listOrders(): Promise<OrderWithItems[]> {
  const db = await getDb();
  if (!db) return [];
  const rows = await db.select().from(orders).orderBy(desc(orders.createdAt), desc(orders.id)).limit(500);
  const ids = rows.map(o => o.id);
  const items = ids.length ? await db.select().from(orderItems).where(inArray(orderItems.orderId, ids)) : [];
  return rows.map(order => ({ ...order, items: items.filter(item => item.orderId === order.id) }));
}

export async function getOrderById(id: number): Promise<(OrderWithItems & { history: OrderStatusHistoryRow[] }) | null> {
  const db = await getDb();
  if (!db) return null;
  const rows = await db.select().from(orders).where(eq(orders.id, id)).limit(1);
  const order = rows[0];
  if (!order) return null;
  const items = await db.select().from(orderItems).where(eq(orderItems.orderId, id));
  const history = await db.select().from(orderStatusHistory).where(eq(orderStatusHistory.orderId, id)).orderBy(asc(orderStatusHistory.createdAt), asc(orderStatusHistory.id));
  return { ...order, items, history };
}

export class OrderTransitionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "OrderTransitionError";
  }
}

/**
 * Owner-only status change. Validates the workflow transition; payment states
 * (transfer_claimed / paid) are only ever reached through this manual path.
 */
export async function updateOrderStatus(id: number, toStatus: string, actorOpenId: string, note?: string | null): Promise<{ from: string; to: string }> {
  const db = await getDb();
  if (!db) throw new OrderTransitionError("Database unavailable");
  if (!isOrderStatus(toStatus)) throw new OrderTransitionError("Unknown order status");
  const rows = await db.select().from(orders).where(eq(orders.id, id)).limit(1);
  const order = rows[0];
  if (!order) throw new OrderTransitionError("Order not found");
  const from = order.status;
  if (!isOrderStatus(from) || !canTransition(from, toStatus)) {
    throw new OrderTransitionError(`Cannot move an order from "${from}" to "${toStatus}"`);
  }
  await db.update(orders).set({ status: toStatus }).where(eq(orders.id, id));
  await db.insert(orderStatusHistory).values({ orderId: id, fromStatus: from, toStatus, actor: actorOpenId, note: note ?? null });
  return { from, to: toStatus };
}

export async function setOrderNotes(id: number, ownerNotes: string): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.update(orders).set({ ownerNotes }).where(eq(orders.id, id));
}

/* ------------------------------------------------------------------ */
/* Reviews (moderated; nothing is ever seeded or fabricated)           */
/* ------------------------------------------------------------------ */

export async function submitReview(input: { productId: number; customerName: string; rating: number; body?: string | null }): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  await db.insert(reviews).values({
    productId: input.productId,
    customerName: input.customerName,
    rating: input.rating,
    body: input.body ?? null,
    status: "pending",
  });
}

/** Approved reviews only — with the reviewer's first name only. */
export async function listApprovedReviews(productId: number): Promise<{ id: number; name: string; rating: number; body: string | null; createdAt: Date }[]> {
  const db = await getDb();
  if (!db) return [];
  const rows = await db.select().from(reviews).where(eq(reviews.productId, productId)).orderBy(desc(reviews.createdAt));
  return rows
    .filter(r => r.status === "approved")
    .map(r => ({ id: r.id, name: r.customerName.trim().split(/\s+/)[0], rating: r.rating, body: r.body, createdAt: r.createdAt }));
}

export async function listReviewsForOwner(): Promise<Review[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(reviews).orderBy(desc(reviews.createdAt)).limit(500);
}

export async function moderateReview(id: number, status: "approved" | "rejected"): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.update(reviews).set({ status }).where(eq(reviews.id, id));
}
