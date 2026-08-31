import { int, mysqlTable, text, timestamp, varchar } from "drizzle-orm/mysql-core";

export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: varchar("role", { length: 16 }).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
  /**
   * Sessions issued before this instant are rejected. Set on logout so a
   * stateless JWT session can be revoked immediately, server-side.
   */
  sessionInvalidatedAt: timestamp("sessionInvalidatedAt"),
});

export const storeSettings = mysqlTable("store_settings", {
  id: int("id").autoincrement().primaryKey(),
  storeName: varchar("storeName", { length: 120 }).notNull().default("Reka Store"),
  logoUrl: text("logoUrl"),
  whatsappNumber: varchar("whatsappNumber", { length: 32 }).notNull().default("201000000000"),
  primaryColor: varchar("primaryColor", { length: 20 }).notNull().default("#310E10"),
  accentColor: varchar("accentColor", { length: 20 }).notNull().default("#74070E"),
  heroTitle: varchar("heroTitle", { length: 180 }).notNull().default("Beauty, your way"),
  heroSubtitle: text("heroSubtitle"),
  heroImageUrl: text("heroImageUrl"),
  instagramUrl: varchar("instagramUrl", { length: 255 }),
  /** Flat delivery fee in EGP added to every order. 0 = "to be confirmed on WhatsApp". */
  deliveryFee: int("deliveryFee").notNull().default(0),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const categories = mysqlTable("categories", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 80 }).notNull().unique(),
  slug: varchar("slug", { length: 100 }).notNull().unique(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const products = mysqlTable("products", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 160 }).notNull(),
  slug: varchar("slug", { length: 180 }).notNull().unique(),
  description: text("description"),
  price: int("price").notNull().default(0),
  /**
   * Genuine previous price. Only set when a real discount exists — the API
   * rejects originalPrice <= price. Presence of this field is what places a
   * product in the Offers department.
   */
  originalPrice: int("originalPrice"),
  /** Real, configured offer expiry. Never used to fake urgency. */
  offerEndsAt: timestamp("offerEndsAt"),
  /** One of the assignable departments (korean-skincare | french-skincare | makeup | perfumes). */
  department: varchar("department", { length: 32 }).notNull().default("makeup"),
  brand: varchar("brand", { length: 120 }),
  sku: varchar("sku", { length: 64 }),
  /** Ingredients, fragrance notes, shades or other variant metadata (free text). */
  productNotes: text("productNotes"),
  variantLabel: varchar("variantLabel", { length: 160 }),
  categoryId: int("categoryId"),
  isSoldOut: int("isSoldOut").notNull().default(0),
  isPublished: int("isPublished").notNull().default(1),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const productImages = mysqlTable("product_images", {
  id: int("id").autoincrement().primaryKey(),
  productId: int("productId").notNull(),
  imageUrl: text("imageUrl").notNull(),
  storageKey: text("storageKey").notNull(),
  sortOrder: int("sortOrder").notNull().default(0),
});

export const banners = mysqlTable("banners", {
  id: int("id").autoincrement().primaryKey(),
  title: varchar("title", { length: 160 }).notNull(),
  subtitle: text("subtitle"),
  imageUrl: text("imageUrl"),
  ctaLabel: varchar("ctaLabel", { length: 80 }),
  sortOrder: int("sortOrder").notNull().default(0),
  isPublished: int("isPublished").notNull().default(1),
});

/**
 * Append-only audit trail for every owner mutation. Never stores secrets,
 * tokens, credentials or image bytes — only the actor, action, target and
 * the names of changed fields.
 */
export const auditLogs = mysqlTable("audit_logs", {
  id: int("id").autoincrement().primaryKey(),
  actorOpenId: varchar("actorOpenId", { length: 64 }).notNull(),
  actorUserId: int("actorUserId"),
  action: varchar("action", { length: 64 }).notNull(),
  targetType: varchar("targetType", { length: 32 }).notNull(),
  targetId: varchar("targetId", { length: 64 }),
  metadata: text("metadata"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

/**
 * Customer order requests. Created server-side BEFORE WhatsApp opens; every
 * price and total is recalculated on the server. Status only ever changes
 * through the owner console (manual payment confirmation) — see shared/orders.ts.
 */
export const orders = mysqlTable("orders", {
  id: int("id").autoincrement().primaryKey(),
  /** Server-generated public reference, e.g. RKS-000123. */
  reference: varchar("reference", { length: 24 }).notNull().unique(),
  status: varchar("status", { length: 24 }).notNull().default("pending_contact"),
  customerName: varchar("customerName", { length: 120 }).notNull(),
  phone: varchar("phone", { length: 32 }).notNull(),
  whatsapp: varchar("whatsapp", { length: 32 }),
  city: varchar("city", { length: 80 }).notNull(),
  address: text("address").notNull(),
  building: varchar("building", { length: 160 }),
  deliveryNotes: text("deliveryNotes"),
  subtotal: int("subtotal").notNull(),
  deliveryFee: int("deliveryFee").notNull().default(0),
  total: int("total").notNull(),
  /** Private. Never exposed through any public endpoint. */
  ownerNotes: text("ownerNotes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

/** Immutable per-item price snapshot taken at order time. */
export const orderItems = mysqlTable("order_items", {
  id: int("id").autoincrement().primaryKey(),
  orderId: int("orderId").notNull(),
  productId: int("productId"),
  name: varchar("name", { length: 160 }).notNull(),
  department: varchar("department", { length: 32 }).notNull().default("makeup"),
  unitPrice: int("unitPrice").notNull(),
  quantity: int("quantity").notNull(),
  lineTotal: int("lineTotal").notNull(),
});

/** Append-only status history. actor is "customer" or the owner's openId. */
export const orderStatusHistory = mysqlTable("order_status_history", {
  id: int("id").autoincrement().primaryKey(),
  orderId: int("orderId").notNull(),
  fromStatus: varchar("fromStatus", { length: 24 }),
  toStatus: varchar("toStatus", { length: 24 }).notNull(),
  actor: varchar("actor", { length: 64 }).notNull(),
  note: text("note"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

/**
 * Moderated customer reviews. Everything starts as "pending"; only reviews
 * the owner explicitly approves are shown publicly. Nothing is ever seeded.
 */
export const reviews = mysqlTable("reviews", {
  id: int("id").autoincrement().primaryKey(),
  productId: int("productId").notNull(),
  customerName: varchar("customerName", { length: 80 }).notNull(),
  rating: int("rating").notNull(),
  body: text("body"),
  status: varchar("status", { length: 12 }).notNull().default("pending"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type Product = typeof products.$inferSelect;
export type ProductImage = typeof productImages.$inferSelect;
export type Category = typeof categories.$inferSelect;
export type StoreSettings = typeof storeSettings.$inferSelect;
export type AuditLog = typeof auditLogs.$inferSelect;
export type Order = typeof orders.$inferSelect;
export type OrderItem = typeof orderItems.$inferSelect;
export type OrderStatusHistoryRow = typeof orderStatusHistory.$inferSelect;
export type Review = typeof reviews.$inferSelect;
