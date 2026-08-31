import { formatPrice } from "@shared/whatsapp";
import { DEPARTMENTS, isDepartmentSlug } from "@shared/departments";
import { ArrowUpRight, ShoppingBag } from "lucide-react";
import { Link } from "wouter";
import { artByKey, type ArtKey } from "./art/BeautyArt";
import { useCart } from "./cart";
import type { PublicProduct } from "./types";

/* ------------------------------------------------------------------ */
/* Product imagery                                                     */
/* ------------------------------------------------------------------ */

const fallbackArt: ArtKey[] = ["lips", "compact", "brush", "texture", "hands", "eye"];

export function productArtKey(product: { id: number; categoryName: string; department?: string }): ArtKey {
  const c = product.categoryName.toLowerCase();
  if (c.includes("lip")) return "lips";
  if (c.includes("eye")) return "eye";
  if (c.includes("face") || c.includes("skin") || c.includes("serum") || c.includes("cream")) return "texture";
  if (c.includes("tool") || c.includes("brush")) return "brush";
  if (product.department === "perfumes") return "botanical";
  return fallbackArt[product.id % fallbackArt.length];
}

export function ProductImage({ product, index = 0, className = "", eager = false }: { product: PublicProduct; index?: number; className?: string; eager?: boolean }) {
  const image = product.images[index];
  if (image) {
    return <img src={image.url} alt={`${product.name} — image ${index + 1} of ${product.images.length}`} loading={eager ? "eager" : "lazy"} decoding="async" className={`h-full w-full object-cover ${className}`} />;
  }
  const Art = artByKey[productArtKey(product)];
  return <Art title={`${product.name} — brand illustration`} className={`h-full w-full ${className}`} />;
}

/* ------------------------------------------------------------------ */
/* Price with genuine-discount treatment                               */
/* ------------------------------------------------------------------ */

export function PriceTag({ product, className = "", big = false }: { product: PublicProduct; className?: string; big?: boolean }) {
  if (product.originalPrice && product.originalPrice > product.price) {
    return (
      <span className={`inline-flex flex-wrap items-baseline gap-x-2 ${className}`}>
        <span className={`font-semibold text-burgundy ${big ? "text-3xl tracking-tight" : ""}`}>{formatPrice(product.price)}</span>
        <s className={`text-olive/80 ${big ? "text-lg" : "text-xs"}`} aria-label={`Original price ${formatPrice(product.originalPrice)}`}>
          {formatPrice(product.originalPrice)}
        </s>
      </span>
    );
  }
  return <span className={`font-semibold ${big ? "text-3xl tracking-tight" : ""} ${className}`}>{formatPrice(product.price)}</span>;
}

export const discountPercent = (product: PublicProduct) =>
  product.originalPrice && product.originalPrice > product.price ? Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100) : 0;

/* ------------------------------------------------------------------ */
/* Product card                                                        */
/* ------------------------------------------------------------------ */

export function ProductCard({ product, eager = false, showDepartment = false, tone = "light" }: { product: PublicProduct; eager?: boolean; showDepartment?: boolean; tone?: "light" | "dark" }) {
  const cart = useCart();
  const dept = isDepartmentSlug(product.department) ? DEPARTMENTS[product.department] : null;
  const off = discountPercent(product);
  const dark = tone === "dark";
  return (
    <article className={`group ${product.isSoldOut ? "opacity-95" : ""}`} aria-label={`${product.name}${product.isSoldOut ? " — sold out" : ""}`}>
      <Link href={`/product/${product.slug}`} className={`relative block w-full overflow-hidden rounded-[1.5rem] bg-clay text-left ring-1 transition-shadow duration-300 hover:shadow-[0_30px_50px_-30px_rgba(49,14,16,.55)] ${dark ? "ring-canvas/15" : "ring-ink/10"}`} aria-label={`Open ${product.name}`}>
        <div className={`brand-tone relative aspect-[4/5] ${product.isSoldOut ? "grayscale-[.4]" : ""}`}>
          <ProductImage product={product} eager={eager} className="transition-transform duration-500 group-hover:scale-[1.04]" />
        </div>
        <span className={`absolute left-3 top-3 rounded-full px-3 py-1.5 text-[11px] font-bold uppercase tracking-[.18em] ${product.isSoldOut ? "bg-burgundy text-canvas" : "bg-canvas/95 text-ink"}`}>
          {product.isSoldOut ? "Sold out" : "Available"}
        </span>
        {off > 0 && !product.isSoldOut && (
          <span className="absolute right-3 top-3 rounded-full bg-ink px-3 py-1.5 text-[11px] font-bold uppercase tracking-[.14em] text-canvas">−{off}%</span>
        )}
        {product.isSoldOut && (
          <span aria-hidden="true" className="absolute inset-x-0 bottom-0 bg-ink/80 py-2 text-center text-xs font-semibold uppercase tracking-[.2em] text-canvas">
            Currently unavailable
          </span>
        )}
      </Link>
      <div className="mt-4 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className={`truncate font-semibold ${dark ? "text-canvas" : ""}`}>
            <Link href={`/product/${product.slug}`} className="hover:text-burgundy">{product.name}</Link>
          </h3>
          <p className={`mt-0.5 text-xs ${dark ? "text-canvas/60" : "text-olive"}`}>
            {showDepartment && dept ? `${dept.name} · ` : ""}{product.categoryName}
          </p>
        </div>
        <PriceTag product={product} className={`shrink-0 ${dark ? "text-canvas" : ""}`} />
      </div>
      {product.isSoldOut ? (
        <p className={`mt-3 flex min-h-11 items-center justify-center rounded-full border border-dashed text-xs font-semibold ${dark ? "border-canvas/30 text-canvas/70" : "border-burgundy/40 text-burgundy"}`} role="status">
          Sold out — back soon
        </p>
      ) : (
        <button type="button" onClick={() => cart.add(product)} className="btn-wa mt-3 w-full min-h-11 text-[13px]">
          <ShoppingBag className="h-4 w-4" aria-hidden="true" /> Add to order
        </button>
      )}
    </article>
  );
}

/* ------------------------------------------------------------------ */
/* Section heading                                                     */
/* ------------------------------------------------------------------ */

export function SectionHead({ eyebrow, title, text, tone = "light", id }: { eyebrow: string; title: string; text?: string; tone?: "light" | "dark"; id?: string }) {
  const dark = tone === "dark";
  return (
    <div className="max-w-2xl">
      <p className={`eyebrow ${dark ? "text-canvas/60" : "text-burgundy"}`}>{eyebrow}</p>
      <h2 id={id} className={`mt-3 font-display text-[clamp(2.2rem,5vw,4.2rem)] font-medium leading-[1.02] tracking-tight ${dark ? "text-canvas" : ""}`}>{title}</h2>
      {text && <p className={`mt-4 text-base leading-8 ${dark ? "text-canvas/75" : "text-olive"}`}>{text}</p>}
    </div>
  );
}

export function EmptyCollection({ note, tone = "light" }: { note: string; tone?: "light" | "dark" }) {
  const dark = tone === "dark";
  return (
    <div className={`mt-10 rounded-[1.75rem] border border-dashed px-6 py-16 text-center ${dark ? "border-canvas/30 text-canvas" : "border-olive/40 bg-canvas/50"}`}>
      <p className="font-display text-3xl">Nothing here yet</p>
      <p className={`mx-auto mt-3 max-w-sm text-sm leading-7 ${dark ? "text-canvas/70" : "text-olive"}`}>{note}</p>
      <Link href="/" className={`mt-6 inline-flex min-h-11 items-center gap-2 rounded-full px-6 text-sm font-semibold ${dark ? "bg-canvas text-ink" : "bg-ink text-canvas"}`}>
        Back to the homepage <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
      </Link>
    </div>
  );
}
