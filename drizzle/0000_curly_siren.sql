CREATE TABLE "audit_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"actorOpenId" varchar(64) NOT NULL,
	"actorUserId" integer,
	"action" varchar(64) NOT NULL,
	"targetType" varchar(32) NOT NULL,
	"targetId" varchar(64),
	"metadata" text,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "banners" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" varchar(160) NOT NULL,
	"subtitle" text,
	"imageUrl" text,
	"ctaLabel" varchar(80),
	"sortOrder" integer DEFAULT 0 NOT NULL,
	"isPublished" integer DEFAULT 1 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "categories" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(80) NOT NULL,
	"slug" varchar(100) NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "categories_name_unique" UNIQUE("name"),
	CONSTRAINT "categories_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "order_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"orderId" integer NOT NULL,
	"productId" integer,
	"name" varchar(160) NOT NULL,
	"department" varchar(32) DEFAULT 'makeup' NOT NULL,
	"unitPrice" integer NOT NULL,
	"quantity" integer NOT NULL,
	"lineTotal" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "order_status_history" (
	"id" serial PRIMARY KEY NOT NULL,
	"orderId" integer NOT NULL,
	"fromStatus" varchar(24),
	"toStatus" varchar(24) NOT NULL,
	"actor" varchar(64) NOT NULL,
	"note" text,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "orders" (
	"id" serial PRIMARY KEY NOT NULL,
	"reference" varchar(24) NOT NULL,
	"status" varchar(24) DEFAULT 'pending_contact' NOT NULL,
	"customerName" varchar(120) NOT NULL,
	"phone" varchar(32) NOT NULL,
	"whatsapp" varchar(32),
	"city" varchar(80) NOT NULL,
	"address" text NOT NULL,
	"building" varchar(160),
	"deliveryNotes" text,
	"subtotal" integer NOT NULL,
	"deliveryFee" integer DEFAULT 0 NOT NULL,
	"total" integer NOT NULL,
	"ownerNotes" text,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "orders_reference_unique" UNIQUE("reference")
);
--> statement-breakpoint
CREATE TABLE "product_images" (
	"id" serial PRIMARY KEY NOT NULL,
	"productId" integer NOT NULL,
	"imageUrl" text NOT NULL,
	"storageKey" text NOT NULL,
	"sortOrder" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "products" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(160) NOT NULL,
	"slug" varchar(180) NOT NULL,
	"description" text,
	"price" integer DEFAULT 0 NOT NULL,
	"originalPrice" integer,
	"offerEndsAt" timestamp with time zone,
	"department" varchar(32) DEFAULT 'makeup' NOT NULL,
	"brand" varchar(120),
	"sku" varchar(64),
	"productNotes" text,
	"variantLabel" varchar(160),
	"categoryId" integer,
	"isSoldOut" integer DEFAULT 0 NOT NULL,
	"isPublished" integer DEFAULT 1 NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "products_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "reviews" (
	"id" serial PRIMARY KEY NOT NULL,
	"productId" integer NOT NULL,
	"customerName" varchar(80) NOT NULL,
	"rating" integer NOT NULL,
	"body" text,
	"status" varchar(12) DEFAULT 'pending' NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "store_settings" (
	"id" serial PRIMARY KEY NOT NULL,
	"storeName" varchar(120) DEFAULT 'Reka Store' NOT NULL,
	"logoUrl" text,
	"whatsappNumber" varchar(32) DEFAULT '201000000000' NOT NULL,
	"primaryColor" varchar(20) DEFAULT '#310E10' NOT NULL,
	"accentColor" varchar(20) DEFAULT '#74070E' NOT NULL,
	"heroTitle" varchar(180) DEFAULT 'Beauty, your way' NOT NULL,
	"heroSubtitle" text,
	"heroImageUrl" text,
	"instagramUrl" varchar(255),
	"deliveryFee" integer DEFAULT 0 NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"openId" varchar(64) NOT NULL,
	"name" text,
	"email" varchar(320),
	"loginMethod" varchar(64),
	"role" varchar(16) DEFAULT 'user' NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL,
	"lastSignedIn" timestamp with time zone DEFAULT now() NOT NULL,
	"sessionInvalidatedAt" timestamp with time zone,
	CONSTRAINT "users_openId_unique" UNIQUE("openId")
);
