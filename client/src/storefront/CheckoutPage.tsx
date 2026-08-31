import { trpc } from "@/lib/trpc";
import { formatPrice } from "@shared/whatsapp";
import { Loader2, Lock, MessageCircle } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Link, useLocation } from "wouter";
import { resolveCart, useCart } from "./cart";
import type { PublicProduct, PublicSettings } from "./types";

type Form = {
  customerName: string;
  phone: string;
  whatsapp: string;
  city: string;
  address: string;
  building: string;
  deliveryNotes: string;
  consent: boolean;
};

const empty: Form = { customerName: "", phone: "", whatsapp: "", city: "", address: "", building: "", deliveryNotes: "", consent: false };

/** Stashes the handoff for the confirmation page (same browser session only). */
export const LAST_ORDER_KEY = "reka-last-order";

export default function CheckoutPage({ settings, products, loading }: { settings: PublicSettings; products: PublicProduct[]; loading: boolean }) {
  const cart = useCart();
  const [, navigate] = useLocation();
  const { items, subtotal, blocked } = resolveCart(cart.lines, products);
  const deliveryFee = Math.max(0, settings.deliveryFee ?? 0);
  const [form, setForm] = useState<Form>(empty);
  const [errors, setErrors] = useState<Partial<Record<keyof Form, string>>>({});
  const createOrder = trpc.storefront.createOrder.useMutation();

  useEffect(() => {
    document.title = `Checkout — ${settings.storeName}`;
    window.scrollTo({ top: 0, behavior: "auto" });
  }, [settings.storeName]);

  // Guard: nothing to check out.
  useEffect(() => {
    if (!loading && cart.lines.length === 0 && !createOrder.isSuccess) navigate("/cart");
  }, [loading, cart.lines.length, createOrder.isSuccess, navigate]);

  const field = <K extends keyof Form>(key: K, value: Form[K]) => {
    setForm(f => ({ ...f, [key]: value }));
    setErrors(e => ({ ...e, [key]: undefined }));
  };

  const validate = (): boolean => {
    const next: Partial<Record<keyof Form, string>> = {};
    if (form.customerName.trim().length < 2) next.customerName = "Please enter your full name.";
    if (!/^\+?[0-9 ()-]{8,32}$/.test(form.phone.trim())) next.phone = "Enter a valid mobile number (digits, e.g. 010xxxxxxxx).";
    if (form.whatsapp.trim() && !/^\+?[0-9 ()-]{8,32}$/.test(form.whatsapp.trim())) next.whatsapp = "Enter a valid WhatsApp number, or leave empty.";
    if (form.city.trim().length < 2) next.city = "Please enter your city or governorate.";
    if (form.address.trim().length < 8) next.address = "Please enter the full delivery address.";
    if (!form.consent) next.consent = "We need your OK to contact you on WhatsApp about this order.";
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const submit = async () => {
    if (!validate()) {
      toast.error("Please fix the highlighted fields.");
      return;
    }
    if (blocked.length > 0) {
      toast.error("A product in your order is sold out — please remove it first.");
      navigate("/cart");
      return;
    }
    try {
      // 1. The order is created SERVER-SIDE first (prices recalculated there).
      const result = await createOrder.mutateAsync({
        customerName: form.customerName.trim(),
        phone: form.phone.trim(),
        whatsapp: form.whatsapp.trim() || null,
        city: form.city.trim(),
        address: form.address.trim(),
        building: form.building.trim() || null,
        deliveryNotes: form.deliveryNotes.trim() || null,
        consent: true,
        items: cart.lines.map(l => ({ productId: l.productId, quantity: l.quantity })),
      });
      // 2. Stash the handoff for the confirmation page (WhatsApp fallback).
      try {
        sessionStorage.setItem(LAST_ORDER_KEY, JSON.stringify({ reference: result.reference, message: result.message, whatsappUrl: result.whatsappUrl, total: result.total }));
      } catch { /* ignore */ }
      cart.clear();
      // 3. Open WhatsApp with the complete, URL-encoded message ready to send.
      window.open(result.whatsappUrl, "_blank", "noopener");
      // 4. Land on the order page — reference survives even if WhatsApp was blocked.
      navigate(`/order/${result.reference}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not create your order. Please try again.");
    }
  };

  const err = (key: keyof Form) =>
    errors[key] ? (
      <p id={`err-${key}`} role="alert" className="text-xs font-semibold text-burgundy">
        {errors[key]}
      </p>
    ) : null;

  const inputCls = (key: keyof Form) =>
    `min-h-12 w-full rounded-xl border bg-cream px-4 text-sm outline-none focus:ring-2 focus:ring-burgundy ${errors[key] ? "border-burgundy" : "border-olive/30"}`;

  return (
    <div className="container pt-28 pb-20 sm:pt-32">
      <p className="eyebrow text-burgundy">Almost there</p>
      <h1 className="mt-2 font-display text-[clamp(2.6rem,6vw,4.5rem)] font-medium leading-none tracking-tight">Delivery details</h1>
      <p className="mt-3 max-w-lg text-sm leading-7 text-olive">
        This is an order request — no payment happens here. Your order opens as a ready WhatsApp message; we confirm availability and send transfer instructions in chat.
      </p>

      <div className="mt-10 grid gap-10 lg:grid-cols-[1.1fr_.9fr]">
        <form className="grid gap-5" onSubmit={e => { e.preventDefault(); submit(); }} noValidate>
          <div className="grid gap-5 sm:grid-cols-2">
            <div className="grid gap-1.5">
              <label htmlFor="co-name" className="text-sm font-semibold">Full name</label>
              <input id="co-name" autoComplete="name" value={form.customerName} onChange={e => field("customerName", e.target.value)} maxLength={120} className={inputCls("customerName")} aria-invalid={Boolean(errors.customerName)} aria-describedby={errors.customerName ? "err-customerName" : undefined} />
              {err("customerName")}
            </div>
            <div className="grid gap-1.5">
              <label htmlFor="co-phone" className="text-sm font-semibold">Mobile number</label>
              <input id="co-phone" type="tel" inputMode="tel" autoComplete="tel" value={form.phone} onChange={e => field("phone", e.target.value)} maxLength={32} placeholder="010xxxxxxxx" className={inputCls("phone")} aria-invalid={Boolean(errors.phone)} aria-describedby={errors.phone ? "err-phone" : undefined} />
              {err("phone")}
            </div>
            <div className="grid gap-1.5">
              <label htmlFor="co-wa" className="text-sm font-semibold">WhatsApp number <span className="font-normal text-olive">(if different)</span></label>
              <input id="co-wa" type="tel" inputMode="tel" value={form.whatsapp} onChange={e => field("whatsapp", e.target.value)} maxLength={32} className={inputCls("whatsapp")} aria-invalid={Boolean(errors.whatsapp)} aria-describedby={errors.whatsapp ? "err-whatsapp" : undefined} />
              {err("whatsapp")}
            </div>
            <div className="grid gap-1.5">
              <label htmlFor="co-city" className="text-sm font-semibold">Governorate / city</label>
              <input id="co-city" autoComplete="address-level1" value={form.city} onChange={e => field("city", e.target.value)} maxLength={80} placeholder="Cairo, Giza, Alexandria…" className={inputCls("city")} aria-invalid={Boolean(errors.city)} aria-describedby={errors.city ? "err-city" : undefined} />
              {err("city")}
            </div>
          </div>
          <div className="grid gap-1.5">
            <label htmlFor="co-address" className="text-sm font-semibold">Full delivery address</label>
            <textarea id="co-address" autoComplete="street-address" rows={3} value={form.address} onChange={e => field("address", e.target.value)} maxLength={1000} placeholder="Street, area, nearest landmark…" className={`${inputCls("address")} py-3`} aria-invalid={Boolean(errors.address)} aria-describedby={errors.address ? "err-address" : undefined} />
            {err("address")}
          </div>
          <div className="grid gap-5 sm:grid-cols-2">
            <div className="grid gap-1.5">
              <label htmlFor="co-building" className="text-sm font-semibold">Building / floor / apartment <span className="font-normal text-olive">(optional)</span></label>
              <input id="co-building" value={form.building} onChange={e => field("building", e.target.value)} maxLength={160} className={inputCls("building")} />
            </div>
            <div className="grid gap-1.5">
              <label htmlFor="co-notes" className="text-sm font-semibold">Delivery notes <span className="font-normal text-olive">(optional)</span></label>
              <input id="co-notes" value={form.deliveryNotes} onChange={e => field("deliveryNotes", e.target.value)} maxLength={1000} placeholder="Call before arriving…" className={inputCls("deliveryNotes")} />
            </div>
          </div>
          <label className={`flex items-start gap-3 rounded-2xl p-4 text-sm leading-6 ring-1 ${errors.consent ? "bg-burgundy/10 ring-burgundy/40" : "bg-cream ring-ink/10"}`}>
            <input type="checkbox" checked={form.consent} onChange={e => field("consent", e.target.checked)} className="mt-1 h-5 w-5 accent-[#74070E]" aria-describedby={errors.consent ? "err-consent" : undefined} />
            <span>
              I agree to be contacted on WhatsApp about this order.
              {err("consent")}
            </span>
          </label>

          <button type="submit" disabled={createOrder.isPending || loading} className="btn-wa min-h-14 text-base">
            {createOrder.isPending ? <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" /> : <MessageCircle className="h-5 w-5" aria-hidden="true" />}
            {createOrder.isPending ? "Saving your order…" : "Send order via WhatsApp"}
          </button>
          <p className="flex items-center justify-center gap-1.5 text-center text-xs text-olive">
            <Lock className="h-3.5 w-3.5" aria-hidden="true" /> No card numbers, no passwords — we only collect delivery details.
          </p>
        </form>

        <aside className="h-fit rounded-[1.75rem] bg-cream p-6 ring-1 ring-ink/10 sm:p-8" aria-label="Order summary">
          <h2 className="font-display text-3xl font-semibold">Your order</h2>
          <ul className="mt-5 grid gap-3 text-sm">
            {items.map(({ product, quantity, lineTotal }) => (
              <li key={product.id} className="flex justify-between gap-3">
                <span className="min-w-0 truncate">{product.name} <span className="text-olive">× {quantity}</span></span>
                <span className="shrink-0 font-semibold">{formatPrice(lineTotal)}</span>
              </li>
            ))}
          </ul>
          <dl className="mt-5 grid gap-2 border-t border-ink/10 pt-4 text-sm">
            <div className="flex justify-between"><dt className="text-olive">Subtotal</dt><dd className="font-semibold">{formatPrice(subtotal)}</dd></div>
            <div className="flex justify-between"><dt className="text-olive">Delivery</dt><dd className="font-semibold">{deliveryFee > 0 ? formatPrice(deliveryFee) : "Confirmed in chat"}</dd></div>
            <div className="flex justify-between pt-1 text-base"><dt className="font-semibold">Total</dt><dd className="font-display text-2xl font-semibold">{formatPrice(subtotal + deliveryFee)}</dd></div>
          </dl>
          <p className="mt-4 text-xs leading-6 text-olive">Final prices are re-checked when the order is saved. Payment is confirmed manually by {settings.storeName} after you receive transfer instructions.</p>
          <Link href="/cart" className="mt-4 inline-flex min-h-11 items-center text-sm font-semibold text-burgundy hover:underline">← Edit order</Link>
        </aside>
      </div>
    </div>
  );
}
