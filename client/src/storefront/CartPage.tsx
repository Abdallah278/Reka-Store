import { formatPrice } from "@shared/whatsapp";
import { ArrowRight, Minus, Plus, ShoppingBag, Trash2 } from "lucide-react";
import { useEffect } from "react";
import { Link } from "wouter";
import { MAX_QTY, resolveCart, useCart } from "./cart";
import { ProductImage } from "./components";
import type { PublicProduct, PublicSettings } from "./types";

export default function CartPage({ settings, products, loading }: { settings: PublicSettings; products: PublicProduct[]; loading: boolean }) {
  const cart = useCart();
  const { items, subtotal, blocked } = resolveCart(cart.lines, products);
  const deliveryFee = Math.max(0, settings.deliveryFee ?? 0);

  useEffect(() => {
    document.title = `Your order — ${settings.storeName}`;
    window.scrollTo({ top: 0, behavior: "auto" });
  }, [settings.storeName]);

  if (!loading && cart.lines.length === 0) {
    return (
      <div className="container pt-28 pb-16 text-center">
        <span className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-cream ring-1 ring-ink/10">
          <ShoppingBag className="h-7 w-7 text-burgundy" aria-hidden="true" />
        </span>
        <h1 className="mt-6 font-display text-5xl font-medium">Your order is empty</h1>
        <p className="mx-auto mt-4 max-w-sm text-sm leading-7 text-olive">Wander through the departments and add the pieces you'd like — then we'll confirm everything on WhatsApp.</p>
        <Link href="/" className="btn-ink mt-7">Explore departments</Link>
      </div>
    );
  }

  return (
    <div className="container pt-24 pb-14 sm:pt-26">
      <p className="eyebrow text-burgundy">Request order</p>
      <h1 className="mt-2 font-display text-[clamp(2.6rem,6vw,4.5rem)] font-medium leading-none tracking-tight">Your order</h1>
      <p className="mt-3 max-w-lg text-sm leading-7 text-olive">
        Nothing is paid here. You'll share delivery details next, then send the order on WhatsApp — we confirm availability and send transfer instructions in chat.
      </p>

      <div className="mt-10 grid gap-10 lg:grid-cols-[1.15fr_.85fr]">
        <ul className="grid gap-4" aria-label="Order items">
          {loading && items.length === 0
            ? [0, 1].map(i => <li key={i} className="h-28 animate-pulse rounded-[1.5rem] bg-clay/30" />)
            : items.map(({ product, quantity, lineTotal }) => (
                <li key={product.id} className={`flex gap-4 rounded-[1.5rem] bg-cream p-3 ring-1 ${product.isSoldOut ? "ring-burgundy/40" : "ring-ink/10"} sm:p-4`}>
                  <Link href={`/product/${product.slug}`} className="h-24 w-24 shrink-0 overflow-hidden rounded-xl bg-clay sm:h-28 sm:w-28" aria-label={`Open ${product.name}`}>
                    <ProductImage product={product} />
                  </Link>
                  <div className="flex min-w-0 flex-1 flex-col">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h2 className="truncate font-semibold"><Link href={`/product/${product.slug}`} className="hover:text-burgundy">{product.name}</Link></h2>
                        <p className="text-xs text-olive">{formatPrice(product.price)} each</p>
                        {product.isSoldOut && <p role="status" className="mt-1 text-xs font-bold uppercase tracking-[.14em] text-burgundy">Now sold out — remove to continue</p>}
                      </div>
                      <p className="shrink-0 font-semibold">{formatPrice(lineTotal)}</p>
                    </div>
                    <div className="mt-auto flex items-center justify-between pt-3">
                      <div className="flex items-center gap-1 rounded-full bg-canvas p-1 ring-1 ring-ink/10" role="group" aria-label={`Quantity for ${product.name}`}>
                        <button type="button" onClick={() => cart.setQuantity(product.id, quantity - 1)} aria-label="Decrease quantity" className="grid h-9 w-9 place-items-center rounded-full hover:bg-cream">
                          <Minus className="h-4 w-4" />
                        </button>
                        <span className="min-w-8 text-center text-sm font-bold" aria-live="polite">{quantity}</span>
                        <button type="button" onClick={() => cart.setQuantity(product.id, quantity + 1)} disabled={quantity >= MAX_QTY || product.isSoldOut} aria-label="Increase quantity" className="grid h-9 w-9 place-items-center rounded-full hover:bg-cream disabled:opacity-40">
                          <Plus className="h-4 w-4" />
                        </button>
                      </div>
                      <button type="button" onClick={() => cart.remove(product.id)} aria-label={`Remove ${product.name}`} className="inline-flex min-h-9 items-center gap-1.5 rounded-full px-3 text-xs font-semibold text-burgundy hover:bg-burgundy/10">
                        <Trash2 className="h-4 w-4" aria-hidden="true" /> Remove
                      </button>
                    </div>
                  </div>
                </li>
              ))}
        </ul>

        <aside className="h-fit rounded-[1.75rem] bg-ink p-6 text-canvas sm:p-8" aria-label="Order summary">
          <h2 className="font-display text-3xl font-semibold">Summary</h2>
          <dl className="mt-5 grid gap-3 text-sm">
            <div className="flex justify-between">
              <dt className="text-canvas/70">Subtotal</dt>
              <dd className="font-semibold">{formatPrice(subtotal)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-canvas/70">Delivery</dt>
              <dd className="font-semibold">{deliveryFee > 0 ? formatPrice(deliveryFee) : "Confirmed on WhatsApp"}</dd>
            </div>
            <div className="flex justify-between border-t border-canvas/15 pt-3 text-base">
              <dt className="font-semibold">Total</dt>
              <dd className="font-display text-2xl font-semibold">{formatPrice(subtotal + deliveryFee)}</dd>
            </div>
          </dl>
          {blocked.length > 0 ? (
            <p role="alert" className="mt-5 rounded-2xl bg-burgundy/20 p-4 text-sm leading-6">
              {blocked.length === 1 ? "One piece" : `${blocked.length} pieces`} in your order sold out while you were browsing. Remove {blocked.length === 1 ? "it" : "them"} to continue.
            </p>
          ) : (
            <Link href="/checkout" className={`mt-6 inline-flex min-h-13 w-full items-center justify-center gap-2 rounded-full bg-canvas px-6 text-sm font-bold text-ink transition-transform hover:-translate-y-0.5 ${items.length === 0 ? "pointer-events-none opacity-50" : ""}`} aria-disabled={items.length === 0}>
              Delivery details <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          )}
          <p className="mt-4 text-center text-xs leading-6 text-canvas/60">No payment on this site — final confirmation and payment instructions happen on WhatsApp.</p>
        </aside>
      </div>
    </div>
  );
}
