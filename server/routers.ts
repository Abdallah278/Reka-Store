import { TRPCError } from "@trpc/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { productImages, products, storeSettings } from "../drizzle/schema";
import { ASSIGNABLE_DEPARTMENTS } from "@shared/departments";
import { ORDER_STATUSES } from "@shared/orders";
import { buildOrderMessage, whatsappChatUrl, type OrderMessageInput } from "@shared/whatsapp";
import { checkCsrf, evaluateOwner } from "./_core/authz";
import { orderLimiter, reviewLimiter } from "./_core/security";
import { ownerProcedure, publicProcedure, router } from "./_core/trpc";
import { storageKeyFor, UploadValidationError, validateImageUpload } from "./_core/uploads";
import {
  createOrder,
  getDb,
  getOrderById,
  getProductById,
  getPublicOrderStatus,
  getStoreSettings,
  invalidateUserSessions,
  listApprovedReviews,
  listAudit,
  listCategories,
  listOrders,
  listProducts,
  listPublicProducts,
  listReviewsForOwner,
  moderateReview,
  OrderCreationError,
  OrderTransitionError,
  setOrderNotes,
  submitReview,
  toPublicSettings,
  updateOrderStatus,
  writeAudit,
} from "./db";
import { storagePut } from "./storage";

/* ------------------------------------------------------------------ */
/* Schemas                                                             */
/* ------------------------------------------------------------------ */

const imageInput = z.object({
  url: z.string().min(1).max(1024).regex(/^(\/manus-storage\/|https:\/\/)/, "Image url must be a storage reference"),
  key: z.string().min(1).max(512).regex(/^[A-Za-z0-9/_.-]+$/).refine(k => !k.includes(".."), "Invalid storage key"),
});

const hex = z.string().regex(/^#[0-9A-Fa-f]{6}$/, "Use a #RRGGBB colour");

const productInput = z
  .object({
    name: z.string().trim().min(2).max(160),
    description: z.string().max(4000).optional(),
    price: z.number().int().nonnegative().max(100_000_000),
    /** Genuine previous price — must be strictly greater than the sale price. */
    originalPrice: z.number().int().positive().max(100_000_000).nullable().optional(),
    offerEndsAt: z.date().nullable().optional(),
    department: z.enum(ASSIGNABLE_DEPARTMENTS).default("makeup"),
    brand: z.string().trim().max(120).nullable().optional(),
    sku: z.string().trim().max(64).nullable().optional(),
    productNotes: z.string().max(4000).nullable().optional(),
    variantLabel: z.string().trim().max(160).nullable().optional(),
    categoryId: z.number().int().nullable().optional(),
    isSoldOut: z.boolean().default(false),
    isPublished: z.boolean().default(true),
    /** Optional tracked stock — null/omitted means "not tracked". */
    stockQuantity: z.number().int().min(0).max(1_000_000).nullable().optional(),
    images: z.array(imageInput).max(8).default([]),
  })
  .refine(v => v.originalPrice == null || v.originalPrice > v.price, {
    message: "Original price must be higher than the sale price — discounts must be genuine",
    path: ["originalPrice"],
  });

const settingsInput = z.object({
  storeName: z.string().trim().min(2).max(120),
  logoUrl: z.string().max(1024).nullable(),
  whatsappNumber: z.string().trim().regex(/^\+?[0-9 ()-]{8,32}$/, "Enter digits only, e.g. 2010xxxxxxxx"),
  primaryColor: hex,
  accentColor: hex,
  heroTitle: z.string().trim().min(2).max(180),
  heroSubtitle: z.string().max(500),
  heroImageUrl: z.string().max(1024).nullable(),
  instagramUrl: z.string().max(255).regex(/^https:\/\/(www\.)?instagram\.com\/[A-Za-z0-9._]+\/?$/, "Enter a full instagram.com profile URL").nullable().or(z.literal("").transform(() => null)),
  deliveryFee: z.number().int().min(0).max(100_000).default(0),
});

const uploadInput = z.object({
  dataUrl: z.string().max(12 * 1024 * 1024),
  filename: z.string().max(120),
  mimeType: z.string().max(64),
  scope: z.enum(["products", "brand"]).default("products"),
});

/**
 * Checkout input. Deliberately contains NO prices and NO totals — the server
 * recalculates everything from the live catalogue. Only identity of products
 * and quantities come from the browser.
 */
const checkoutInput = z.object({
  customerName: z.string().trim().min(2).max(120),
  phone: z.string().trim().regex(/^\+?[0-9 ()-]{8,32}$/, "Enter a valid mobile number"),
  whatsapp: z.string().trim().regex(/^\+?[0-9 ()-]{8,32}$/).nullable().optional(),
  city: z.string().trim().min(2).max(80),
  address: z.string().trim().min(8).max(1000),
  building: z.string().trim().max(160).nullable().optional(),
  deliveryNotes: z.string().trim().max(1000).nullable().optional(),
  consent: z.literal(true, { error: "Please agree to be contacted on WhatsApp" }),
  items: z.array(z.object({ productId: z.number().int().positive(), quantity: z.number().int().min(1).max(20) })).min(1).max(30),
});

const reviewInput = z.object({
  productId: z.number().int().positive(),
  customerName: z.string().trim().min(2).max(80),
  rating: z.number().int().min(1).max(5),
  body: z.string().trim().max(2000).optional(),
});

const slugify = (value: string) =>
  `${value
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^\w؀-ۿ-]/g, "")
    .replace(/(^-|-$)/g, "")}-${Date.now().toString(36)}`;

const ensureDb = async () => {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
  return db;
};

const changedFields = (before: Record<string, unknown> | null, after: Record<string, unknown>) =>
  Object.keys(after).filter(k => !before || JSON.stringify(before[k]) !== JSON.stringify(after[k]));

/** Strip characters that could break the WhatsApp message structure. */
const sanitizeLine = (value: string) => value.replace(/[\r\n]+/g, " ").trim();

/* ------------------------------------------------------------------ */
/* Router                                                              */
/* ------------------------------------------------------------------ */

export const appRouter = router({
  system: router({}),

  /**
   * Session endpoints. `me` deliberately returns a minimal, non-forgeable
   * view: no openId, e-mail or role. `isOwner` is computed server-side.
   */
  auth: router({
    me: publicProcedure.query(({ ctx }) => {
      if (!ctx.user) return null;
      return { name: ctx.user.name ?? "", isOwner: evaluateOwner(ctx.user).ok };
    }),
    logout: publicProcedure.mutation(async ({ ctx }) => {
      // Server-side revocation: Supabase access tokens issued before this
      // instant are rejected by authenticateRequest, so logout is immediate
      // even for unexpired JWTs. The client additionally calls
      // supabase.auth.signOut() to drop its local session.
      if (ctx.user && !ctx.user.isCron) await invalidateUserSessions(ctx.user.openId);
      return { success: true } as const;
    }),
  }),

  /** Read-only public data + the order request flow. No private data leaves here. */
  storefront: router({
    settings: publicProcedure.query(async () => toPublicSettings(await getStoreSettings())),
    products: publicProcedure.query(() => listPublicProducts()),
    productBySlug: publicProcedure.input(z.object({ slug: z.string().min(1).max(200) })).query(async ({ input }) => {
      const all = await listPublicProducts();
      return all.find(p => p.slug === input.slug) ?? null;
    }),
    categories: publicProcedure.query(async () => (await listCategories()).map(c => ({ id: c.id, name: c.name, slug: c.slug }))),

    /** Approved reviews only. When none exist the storefront shows "No reviews yet" — never fake stars. */
    reviews: publicProcedure.input(z.object({ productId: z.number().int().positive() })).query(({ input }) => listApprovedReviews(input.productId)),

    submitReview: publicProcedure.input(reviewInput).mutation(async ({ input, ctx }) => {
      const csrf = checkCsrf(ctx.req);
      if (!csrf.ok) throw new TRPCError({ code: "FORBIDDEN", message: "Request blocked (CSRF)" });
      if (!(await reviewLimiter.allow(ctx.req))) throw new TRPCError({ code: "TOO_MANY_REQUESTS", message: "Too many reviews — please try again later." });
      await submitReview({ productId: input.productId, customerName: sanitizeLine(input.customerName), rating: input.rating, body: input.body ? input.body.trim() : null });
      return { success: true, moderation: "pending" } as const;
    }),

    /**
     * Create the order server-side BEFORE WhatsApp opens. All prices and
     * totals are recalculated here from the live catalogue; the browser sends
     * only product ids + quantities. Returns the reference and the ready
     * WhatsApp handoff (message built from server data only).
     */
    createOrder: publicProcedure.input(checkoutInput).mutation(async ({ input, ctx }) => {
      const csrf = checkCsrf(ctx.req);
      if (!csrf.ok) throw new TRPCError({ code: "FORBIDDEN", message: "Request blocked (CSRF)" });
      if (!(await orderLimiter.allow(ctx.req))) throw new TRPCError({ code: "TOO_MANY_REQUESTS", message: "Too many order requests — please wait a few minutes." });
      let order;
      try {
        order = await createOrder({
          customerName: sanitizeLine(input.customerName),
          phone: sanitizeLine(input.phone),
          whatsapp: input.whatsapp ? sanitizeLine(input.whatsapp) : null,
          city: sanitizeLine(input.city),
          address: sanitizeLine(input.address),
          building: input.building ? sanitizeLine(input.building) : null,
          deliveryNotes: input.deliveryNotes ? sanitizeLine(input.deliveryNotes) : null,
          items: input.items,
        });
      } catch (error) {
        if (error instanceof OrderCreationError) throw new TRPCError({ code: "BAD_REQUEST", message: error.message });
        throw error;
      }
      const settings = await getStoreSettings();
      const messageInput: OrderMessageInput = {
        reference: order.reference,
        customerName: order.customerName,
        phone: order.phone,
        whatsapp: order.whatsapp,
        city: order.city,
        address: order.address,
        building: order.building,
        deliveryNotes: order.deliveryNotes,
        items: order.items.map(item => ({ name: item.name, quantity: item.quantity, unitPrice: item.unitPrice })),
        subtotal: order.subtotal,
        deliveryFee: order.deliveryFee,
        total: order.total,
      };
      const message = buildOrderMessage(messageInput);
      return {
        reference: order.reference,
        subtotal: order.subtotal,
        deliveryFee: order.deliveryFee,
        total: order.total,
        message,
        whatsappUrl: whatsappChatUrl(settings.whatsappNumber, message),
        storeWhatsapp: settings.whatsappNumber,
      };
    }),

    /** Public status lookup: reference, status, date. Nothing private. */
    orderStatus: publicProcedure.input(z.object({ reference: z.string().trim().regex(/^RKS-[0-9]{4,10}$/i) })).query(async ({ input }) => {
      return getPublicOrderStatus(input.reference.toUpperCase());
    }),
  }),

  /** Every procedure below passes ownerProcedure (session + allowlist + role + host + CSRF + rate limit). */
  owner: router({
    products: ownerProcedure.query(() => listProducts(true)),
    settings: ownerProcedure.query(() => getStoreSettings()),
    categories: ownerProcedure.query(() => listCategories()),
    audit: ownerProcedure.input(z.object({ limit: z.number().int().min(1).max(500).default(100) }).optional()).query(({ input }) => listAudit(input?.limit ?? 100)),

    createProduct: ownerProcedure.input(productInput).mutation(async ({ input, ctx }) => {
      const db = await ensureDb();
      const created = await db.insert(products).values({
        name: input.name,
        slug: slugify(input.name),
        description: input.description ?? null,
        price: input.price,
        originalPrice: input.originalPrice ?? null,
        offerEndsAt: input.offerEndsAt ?? null,
        department: input.department,
        brand: input.brand ?? null,
        sku: input.sku ?? null,
        productNotes: input.productNotes ?? null,
        variantLabel: input.variantLabel ?? null,
        categoryId: input.categoryId ?? null,
        isSoldOut: input.isSoldOut ? 1 : 0,
        isPublished: input.isPublished ? 1 : 0,
        stockQuantity: input.stockQuantity ?? null,
      }).returning({ id: products.id });
      const productId = Number(created[0]?.id);
      if (input.images.length) {
        await db.insert(productImages).values(input.images.map((image, index) => ({ productId, imageUrl: image.url, storageKey: image.key, sortOrder: index })));
      }
      await writeAudit({ actorOpenId: ctx.user.openId, actorUserId: ctx.user.id, action: "product.create", targetType: "product", targetId: productId, metadata: { name: input.name, department: input.department, imageCount: input.images.length, isPublished: input.isPublished, isSoldOut: input.isSoldOut } });
      return { id: productId };
    }),

    updateProduct: ownerProcedure.input(productInput.safeExtend({ id: z.number().int() })).mutation(async ({ input, ctx }) => {
      const db = await ensureDb();
      const before = await getProductById(input.id);
      if (!before) throw new TRPCError({ code: "NOT_FOUND", message: "Product not found" });
      const next = {
        name: input.name,
        description: input.description ?? null,
        price: input.price,
        originalPrice: input.originalPrice ?? null,
        offerEndsAt: input.offerEndsAt ?? null,
        department: input.department,
        brand: input.brand ?? null,
        sku: input.sku ?? null,
        productNotes: input.productNotes ?? null,
        variantLabel: input.variantLabel ?? null,
        categoryId: input.categoryId ?? null,
        isSoldOut: input.isSoldOut ? 1 : 0,
        isPublished: input.isPublished ? 1 : 0,
        stockQuantity: input.stockQuantity ?? null,
      };
      await db.update(products).set(next).where(eq(products.id, input.id));
      await db.delete(productImages).where(eq(productImages.productId, input.id));
      if (input.images.length) {
        await db.insert(productImages).values(input.images.map((image, index) => ({ productId: input.id, imageUrl: image.url, storageKey: image.key, sortOrder: index })));
      }
      const fields = changedFields(before as unknown as Record<string, unknown>, next);
      if (before.images.length !== input.images.length || before.images.some((img, i) => img.storageKey !== input.images[i]?.key)) fields.push("images");
      await writeAudit({ actorOpenId: ctx.user.openId, actorUserId: ctx.user.id, action: "product.update", targetType: "product", targetId: input.id, metadata: { name: input.name, changedFields: fields } });
      return { success: true } as const;
    }),

    setProductState: ownerProcedure
      .input(z.object({ id: z.number().int(), isPublished: z.boolean().optional(), isSoldOut: z.boolean().optional() }).refine(v => v.isPublished !== undefined || v.isSoldOut !== undefined, "Nothing to change"))
      .mutation(async ({ input, ctx }) => {
        const db = await ensureDb();
        const patch: Partial<{ isPublished: number; isSoldOut: number }> = {};
        if (input.isPublished !== undefined) patch.isPublished = input.isPublished ? 1 : 0;
        if (input.isSoldOut !== undefined) patch.isSoldOut = input.isSoldOut ? 1 : 0;
        await db.update(products).set(patch).where(eq(products.id, input.id));
        const action = input.isPublished !== undefined ? (input.isPublished ? "product.publish" : "product.unpublish") : input.isSoldOut ? "product.soldout" : "product.available";
        await writeAudit({ actorOpenId: ctx.user.openId, actorUserId: ctx.user.id, action, targetType: "product", targetId: input.id, metadata: { changedFields: Object.keys(patch) } });
        return { success: true } as const;
      }),

    deleteProduct: ownerProcedure.input(z.object({ id: z.number().int() })).mutation(async ({ input, ctx }) => {
      const db = await ensureDb();
      await db.delete(productImages).where(eq(productImages.productId, input.id));
      await db.delete(products).where(eq(products.id, input.id));
      await writeAudit({ actorOpenId: ctx.user.openId, actorUserId: ctx.user.id, action: "product.delete", targetType: "product", targetId: input.id });
      return { success: true } as const;
    }),

    saveSettings: ownerProcedure.input(settingsInput).mutation(async ({ input, ctx }) => {
      const db = await ensureDb();
      const before = await getStoreSettings();
      const existing = await db.select({ id: storeSettings.id }).from(storeSettings).limit(1);
      const values = { ...input, whatsappNumber: input.whatsappNumber.replace(/[^0-9]/g, "") };
      if (existing[0]) await db.update(storeSettings).set(values).where(eq(storeSettings.id, existing[0].id));
      else await db.insert(storeSettings).values(values);
      await writeAudit({ actorOpenId: ctx.user.openId, actorUserId: ctx.user.id, action: "settings.update", targetType: "settings", targetId: existing[0]?.id ?? "new", metadata: { changedFields: changedFields(before as unknown as Record<string, unknown>, values) } });
      return { success: true } as const;
    }),

    uploadImage: ownerProcedure.input(uploadInput).mutation(async ({ input, ctx }) => {
      let image;
      try {
        image = validateImageUpload(input);
      } catch (error) {
        if (error instanceof UploadValidationError) throw new TRPCError({ code: "BAD_REQUEST", message: error.message });
        throw error;
      }
      const key = storageKeyFor(input.scope, image.extension);
      const result = await storagePut(key, image.bytes, image.mimeType);
      await writeAudit({ actorOpenId: ctx.user.openId, actorUserId: ctx.user.id, action: "image.upload", targetType: "image", targetId: result.key, metadata: { scope: input.scope, mimeType: image.mimeType, size: image.bytes.length } });
      return { key: result.key, url: result.url };
    }),

    /* ---------------------------- Orders ---------------------------- */

    orders: ownerProcedure.query(() => listOrders()),

    order: ownerProcedure.input(z.object({ id: z.number().int().positive() })).query(async ({ input }) => {
      const order = await getOrderById(input.id);
      if (!order) throw new TRPCError({ code: "NOT_FOUND", message: "Order not found" });
      return order;
    }),

    /**
     * Manual status change — the ONLY way an order becomes transfer_claimed,
     * paid or approved. Transition validity is enforced server-side.
     */
    updateOrderStatus: ownerProcedure
      .input(z.object({ id: z.number().int().positive(), status: z.enum(ORDER_STATUSES), note: z.string().trim().max(1000).optional() }))
      .mutation(async ({ input, ctx }) => {
        let result;
        try {
          result = await updateOrderStatus(input.id, input.status, ctx.user.openId, input.note ?? null);
        } catch (error) {
          if (error instanceof OrderTransitionError) throw new TRPCError({ code: "BAD_REQUEST", message: error.message });
          throw error;
        }
        await writeAudit({
          actorOpenId: ctx.user.openId,
          actorUserId: ctx.user.id,
          action: input.status === "paid" ? "order.mark-paid" : input.status === "transfer_claimed" ? "order.transfer-claimed" : "order.status",
          targetType: "order",
          targetId: input.id,
          metadata: { from: result.from, to: result.to },
        });
        return { success: true, from: result.from, to: result.to } as const;
      }),

    setOrderNotes: ownerProcedure.input(z.object({ id: z.number().int().positive(), notes: z.string().max(4000) })).mutation(async ({ input, ctx }) => {
      await setOrderNotes(input.id, input.notes);
      await writeAudit({ actorOpenId: ctx.user.openId, actorUserId: ctx.user.id, action: "order.notes", targetType: "order", targetId: input.id });
      return { success: true } as const;
    }),

    /* ---------------------------- Reviews --------------------------- */

    reviews: ownerProcedure.query(() => listReviewsForOwner()),

    moderateReview: ownerProcedure.input(z.object({ id: z.number().int().positive(), status: z.enum(["approved", "rejected"]) })).mutation(async ({ input, ctx }) => {
      await moderateReview(input.id, input.status);
      await writeAudit({ actorOpenId: ctx.user.openId, actorUserId: ctx.user.id, action: `review.${input.status}`, targetType: "review", targetId: input.id });
      return { success: true } as const;
    }),
  }),
});

export type AppRouter = typeof appRouter;
