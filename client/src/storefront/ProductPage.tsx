import { trpc } from "@/lib/trpc";
import { DEPARTMENTS, isDepartmentSlug } from "@shared/departments";
import { formatPrice, whatsappProductUrl } from "@shared/whatsapp";
import { ChevronLeft, ChevronRight, Loader2, MessageCircle, RefreshCw, ShoppingBag, Star } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Link } from "wouter";
import { useCart } from "./cart";
import { PriceTag, ProductCard, ProductImage, discountPercent } from "./components";
import type { PublicProduct, PublicSettings } from "./types";

type Props = {
  slug: string;
  settings: PublicSettings;
  products: PublicProduct[];
  loading: boolean;
  error: boolean;
  retry: () => void;
};

export default function ProductPage({ slug, settings, products, loading, error, retry }: Props) {
  const product = products.find(p => p.slug === slug) ?? null;

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "auto" });
  }, [slug]);
  useEffect(() => {
    if (product) document.title = `${product.name} — ${settings.storeName}`;
  }, [product, settings.storeName]);

  if (loading) {
    return (
      <div className="container pt-26 pb-16" aria-busy="true">
        <div className="grid gap-10 lg:grid-cols-2">
          <div className="aspect-[4/5] animate-pulse rounded-[2rem] bg-clay/40" />
          <div className="space-y-4 pt-6">
            <div className="h-4 w-24 animate-pulse rounded bg-clay/40" />
            <div className="h-12 w-3/4 animate-pulse rounded bg-clay/40" />
            <div className="h-4 w-full animate-pulse rounded bg-clay/30" />
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div role="alert" className="container pt-28 pb-16 text-center">
        <p className="font-display text-4xl">We couldn't load this product.</p>
        <button type="button" onClick={retry} className="btn-ink mt-6"><RefreshCw className="h-4 w-4" aria-hidden="true" /> Try again</button>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="container pt-28 pb-16 text-center">
        <p className="eyebrow text-burgundy">Not found</p>
        <h1 className="mt-3 font-display text-5xl">This piece isn't here anymore.</h1>
        <p className="mx-auto mt-4 max-w-sm text-sm leading-7 text-olive">It may have been retired from the edit. The departments are full of good company, though.</p>
        <Link href="/" className="btn-ink mt-7">Back to the homepage</Link>
      </div>
    );
  }

  return <ProductView product={product} settings={settings} products={products} />;
}

function ProductView({ product, settings, products }: { product: PublicProduct; settings: PublicSettings; products: PublicProduct[] }) {
  const cart = useCart();
  const [index, setIndex] = useState(0);
  const count = product.images.length;
  const dept = isDepartmentSlug(product.department) ? DEPARTMENTS[product.department] : null;
  const off = discountPercent(product);
  const related = products.filter(p => p.department === product.department && p.id !== product.id && !p.isSoldOut).slice(0, 4);

  useEffect(() => setIndex(0), [product.id]);

  const step = (delta: number) => {
    if (count < 2) return;
    setIndex(i => (i + delta + count) % count);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowRight") { e.preventDefault(); step(1); }
    else if (e.key === "ArrowLeft") { e.preventDefault(); step(-1); }
  };

  return (
    <div className="pt-20 sm:pt-24">
      <nav aria-label="Breadcrumb" className="container pb-4 text-sm text-olive">
        <ol className="flex flex-wrap items-center gap-2">
          <li><Link href="/" className="hover:text-burgundy">Home</Link></li>
          {dept && (
            <>
              <li aria-hidden="true">/</li>
              <li><Link href={`/${dept.slug}`} className="hover:text-burgundy">{dept.name}</Link></li>
            </>
          )}
          <li aria-hidden="true">/</li>
          <li aria-current="page" className="font-semibold text-ink">{product.name}</li>
        </ol>
      </nav>

      <section className="container grid gap-10 pb-16 lg:grid-cols-[1.05fr_.95fr] lg:gap-14" aria-label={product.name}>
        {/* Gallery */}
        <div onKeyDown={onKeyDown}>
          <figure className="relative aspect-[4/5] overflow-hidden rounded-[2rem] bg-clay ring-1 ring-ink/10">
            <div className="brand-tone relative h-full w-full">
              <ProductImage product={product} index={index} eager />
            </div>
            {product.isSoldOut && (
              <figcaption className="absolute left-4 top-4 rounded-full bg-burgundy px-4 py-2 text-xs font-bold uppercase tracking-[.18em] text-canvas">Sold out</figcaption>
            )}
            {off > 0 && !product.isSoldOut && (
              <span className="absolute right-4 top-4 rounded-full bg-ink px-4 py-2 text-xs font-bold uppercase tracking-[.14em] text-canvas">−{off}%</span>
            )}
            {count > 1 && (
              <>
                <button type="button" onClick={() => step(-1)} aria-label="Previous image" className="absolute left-3 top-1/2 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full bg-cream/90 text-ink shadow hover:bg-canvas">
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <button type="button" onClick={() => step(1)} aria-label="Next image" className="absolute right-3 top-1/2 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full bg-cream/90 text-ink shadow hover:bg-canvas">
                  <ChevronRight className="h-5 w-5" />
                </button>
              </>
            )}
          </figure>
          {count > 1 && (
            <div role="tablist" aria-label="Product images" className="no-scrollbar mt-3 flex gap-2 overflow-x-auto">
              {product.images.map((image, i) => (
                <button
                  key={image.id}
                  type="button"
                  role="tab"
                  aria-selected={index === i}
                  aria-label={`Show image ${i + 1} of ${count}`}
                  onClick={() => setIndex(i)}
                  className={`h-20 w-20 shrink-0 overflow-hidden rounded-xl ring-2 ring-offset-2 ring-offset-canvas transition ${index === i ? "ring-burgundy" : "ring-transparent hover:ring-clay"}`}
                >
                  <img src={image.url} alt="" loading="lazy" className="h-full w-full object-cover" />
                </button>
              ))}
            </div>
          )}
          <p className="mt-2 text-xs text-olive">
            {count > 1 ? `Image ${index + 1} of ${count} · use ← → keys` : count === 1 ? "1 image" : "Brand illustration shown until photography is added"}
          </p>
        </div>

        {/* Details */}
        <div className="flex flex-col">
          {dept && (
            <p className="eyebrow" style={{ color: dept.slug === "french-skincare" ? "#947268" : dept.color }}>
              {dept.name} · {product.categoryName}
            </p>
          )}
          <h1 className="mt-3 font-display text-[clamp(2.2rem,5vw,3.6rem)] font-semibold leading-[1] tracking-tight">{product.name}</h1>
          {product.brand && <p className="mt-2 text-sm font-semibold uppercase tracking-[.2em] text-olive">{product.brand}</p>}
          <p className="mt-5 text-base leading-8 text-olive">{product.description || "Details for this piece are coming soon. Ask us on WhatsApp for the full story."}</p>

          {product.variantLabel && (
            <p className="mt-4 inline-flex w-fit rounded-full bg-cream px-4 py-2 text-sm font-semibold ring-1 ring-ink/10">{product.variantLabel}</p>
          )}
          {product.productNotes && (
            <div className="mt-5 rounded-2xl bg-cream p-5 ring-1 ring-ink/10">
              <p className="eyebrow text-olive">{product.department === "perfumes" ? "Fragrance notes" : "Notes & ingredients"}</p>
              <p className="mt-2 whitespace-pre-line text-sm leading-7">{product.productNotes}</p>
            </div>
          )}

          <div className="mt-8 flex items-end justify-between border-t border-ink/10 pt-6">
            <div>
              <p className="eyebrow text-olive">Price</p>
              <PriceTag product={product} big className="mt-1" />
              {product.offerEndsAt && (
                <p className="mt-1 text-xs font-semibold text-burgundy">Offer ends {new Date(product.offerEndsAt).toLocaleDateString("en-GB", { day: "numeric", month: "long" })}</p>
              )}
            </div>
            <p className={`rounded-full px-3 py-1.5 text-xs font-bold uppercase tracking-[.18em] ${product.isSoldOut ? "bg-burgundy text-canvas" : product.stockLeft != null ? "bg-burgundy/90 text-canvas" : "bg-olive/15 text-olive"}`} aria-live="polite">
              {product.isSoldOut ? "Sold out" : product.stockLeft != null ? `Only ${product.stockLeft} left` : "Available"}
            </p>
          </div>

          <div className="mt-7 grid gap-3">
            {product.isSoldOut ? (
              <div role="status" className="rounded-2xl border border-burgundy/30 bg-burgundy/10 p-4 text-sm text-burgundy">
                <p className="font-semibold">This piece is currently sold out.</p>
                <p className="mt-1 text-burgundy/80">It can't be added to an order right now. Message us and we'll tell you when it returns.</p>
              </div>
            ) : (
              <button type="button" onClick={() => cart.add(product)} className="btn-ink w-full">
                <ShoppingBag className="h-4 w-4" aria-hidden="true" /> Add to order — {formatPrice(product.price)}
              </button>
            )}
            <a href={whatsappProductUrl(settings.whatsappNumber, product.name, product.price)} target="_blank" rel="noopener noreferrer" className="btn-wa w-full">
              <MessageCircle className="h-4 w-4" aria-hidden="true" /> Ask about this on WhatsApp
            </a>
            <p className="text-center text-xs text-olive">No online payment — your order is confirmed on WhatsApp and payment instructions are sent manually.</p>
          </div>
        </div>
      </section>

      <Reviews product={product} />

      {related.length > 0 && (
        <section className="container pb-14 lg:pb-20" aria-labelledby="related-title">
          <p className="eyebrow text-burgundy">Same department</p>
          <h2 id="related-title" className="mt-2 font-display text-4xl font-medium tracking-tight">You might also like</h2>
          <ul className="mt-8 grid gap-x-5 gap-y-10 sm:grid-cols-2 lg:grid-cols-4">
            {related.map(p => (
              <li key={p.id}><ProductCard product={p} /></li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Honest reviews: approved-only display + moderated submission        */
/* ------------------------------------------------------------------ */

function Reviews({ product }: { product: PublicProduct }) {
  const reviewsQuery = trpc.storefront.reviews.useQuery({ productId: product.id });
  const submit = trpc.storefront.submitReview.useMutation();
  const [form, setForm] = useState({ name: "", rating: 0, body: "" });
  const [sent, setSent] = useState(false);
  const reviews = reviewsQuery.data ?? [];
  const average = reviews.length ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length : 0;

  const send = async () => {
    if (form.name.trim().length < 2) return toast.error("Please add your first name.");
    if (form.rating < 1) return toast.error("Please choose a star rating.");
    try {
      await submit.mutateAsync({ productId: product.id, customerName: form.name.trim(), rating: form.rating, body: form.body.trim() || undefined });
      setSent(true);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not send your review");
    }
  };

  return (
    <section className="container pb-16" aria-labelledby="reviews-title">
      <div className="grid gap-8 rounded-[2rem] bg-cream p-6 ring-1 ring-ink/10 sm:p-10 lg:grid-cols-[1fr_.9fr]">
        <div>
          <p className="eyebrow text-burgundy">Customer reviews</p>
          <h2 id="reviews-title" className="mt-2 font-display text-4xl font-medium tracking-tight">What customers said</h2>
          {reviewsQuery.isLoading ? (
            <p className="mt-6 flex items-center gap-2 text-sm text-olive"><Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> Loading reviews…</p>
          ) : reviews.length === 0 ? (
            <div className="mt-6 rounded-2xl border border-dashed border-olive/40 p-6">
              <p className="font-display text-2xl">No reviews yet</p>
              <p className="mt-1 text-sm leading-7 text-olive">Only real, approved customer reviews appear here — we never invent them. Be the first after your order arrives.</p>
            </div>
          ) : (
            <>
              <p className="mt-4 flex items-center gap-2 text-sm font-semibold" aria-label={`Average rating ${average.toFixed(1)} out of 5 from ${reviews.length} review${reviews.length === 1 ? "" : "s"}`}>
                <Stars value={Math.round(average)} /> {average.toFixed(1)} · {reviews.length} review{reviews.length === 1 ? "" : "s"}
              </p>
              <ul className="mt-5 grid gap-4">
                {reviews.slice(0, 6).map(r => (
                  <li key={r.id} className="rounded-2xl bg-canvas/60 p-4 ring-1 ring-ink/10">
                    <div className="flex items-center justify-between gap-3">
                      <p className="font-semibold">{r.name}</p>
                      <Stars value={r.rating} />
                    </div>
                    {r.body && <p className="mt-2 text-sm leading-7 text-olive">{r.body}</p>}
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>

        <div className="rounded-2xl bg-canvas/60 p-5 ring-1 ring-ink/10 sm:p-7">
          <h3 className="font-display text-2xl font-semibold">Leave a review</h3>
          <p className="mt-1 text-xs leading-6 text-olive">Reviews are moderated before appearing — this keeps every rating on the site real.</p>
          {sent ? (
            <div role="status" className="mt-5 rounded-2xl bg-olive/10 p-5 text-sm leading-7 text-olive">
              <p className="font-semibold text-ink">Thank you — review received.</p>
              It will appear here once it has been checked and approved.
            </div>
          ) : (
            <div className="mt-5 grid gap-4">
              <label className="grid gap-1.5 text-sm font-semibold">
                Your first name
                <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} maxLength={80} className="min-h-12 rounded-xl border border-olive/30 bg-cream px-4 text-sm outline-none focus:ring-2 focus:ring-burgundy" placeholder="Nour" />
              </label>
              <div className="grid gap-1.5 text-sm font-semibold">
                Rating
                <div role="radiogroup" aria-label="Star rating" className="flex gap-1">
                  {[1, 2, 3, 4, 5].map(n => (
                    <button key={n} type="button" role="radio" aria-checked={form.rating === n} aria-label={`${n} star${n === 1 ? "" : "s"}`} onClick={() => setForm(f => ({ ...f, rating: n }))} className="grid h-11 w-11 place-items-center rounded-full hover:bg-cream">
                      <Star className={`h-6 w-6 ${n <= form.rating ? "fill-burgundy text-burgundy" : "text-olive/40"}`} aria-hidden="true" />
                    </button>
                  ))}
                </div>
              </div>
              <label className="grid gap-1.5 text-sm font-semibold">
                Your experience (optional)
                <textarea value={form.body} onChange={e => setForm(f => ({ ...f, body: e.target.value }))} rows={3} maxLength={2000} className="rounded-xl border border-olive/30 bg-cream px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-burgundy" placeholder="Texture, wear, delivery…" />
              </label>
              <button type="button" onClick={send} disabled={submit.isPending} className="btn-ink">
                {submit.isPending ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : null} Send for moderation
              </button>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

function Stars({ value }: { value: number }) {
  return (
    <span className="inline-flex" aria-hidden="true">
      {[1, 2, 3, 4, 5].map(n => (
        <Star key={n} className={`h-4 w-4 ${n <= value ? "fill-burgundy text-burgundy" : "text-olive/30"}`} />
      ))}
    </span>
  );
}
