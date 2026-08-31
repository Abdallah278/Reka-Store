import { trpc } from "@/lib/trpc";
import { PUBLIC_STATUS_COPY, ORDER_STATUS_LABELS, isOrderStatus } from "@shared/orders";
import { whatsappChatUrl } from "@shared/whatsapp";
import { Check, Copy, MessageCircle, PackageCheck, RefreshCw } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Link } from "wouter";
import { LAST_ORDER_KEY } from "./CheckoutPage";
import type { PublicSettings } from "./types";

type Stash = { reference: string; message: string; whatsappUrl: string; total: number } | null;

function readStash(reference: string): Stash {
  try {
    const raw = sessionStorage.getItem(LAST_ORDER_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed?.reference === reference ? parsed : null;
  } catch {
    return null;
  }
}

/**
 * Public order page. Shows ONLY reference + status + guidance — never customer
 * data. If this browser just placed the order, the WhatsApp handoff is offered
 * again as a fallback (WhatsApp blocked, tab closed, etc.).
 */
export default function OrderStatusPage({ reference, settings }: { reference: string; settings: PublicSettings }) {
  const normalized = reference.toUpperCase();
  const valid = /^RKS-\d{4,10}$/.test(normalized);
  const statusQuery = trpc.storefront.orderStatus.useQuery({ reference: normalized }, { enabled: valid, retry: 1 });
  const [stash] = useState<Stash>(() => readStash(normalized));
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    document.title = `Order ${normalized} — ${settings.storeName}`;
    window.scrollTo({ top: 0, behavior: "auto" });
  }, [normalized, settings.storeName]);

  const copyMessage = async () => {
    if (!stash) return;
    try {
      await navigator.clipboard.writeText(stash.message);
      setCopied(true);
      toast.success("Order message copied");
      setTimeout(() => setCopied(false), 2500);
    } catch {
      toast.error("Could not copy — long-press the message to copy it manually.");
    }
  };

  const order = statusQuery.data;
  const status = order && isOrderStatus(order.status) ? order.status : null;

  return (
    <div className="container max-w-3xl pt-28 pb-24 sm:pt-32">
      <div className="text-center">
        <span className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-olive/10 text-olive">
          <PackageCheck className="h-7 w-7" aria-hidden="true" />
        </span>
        <p className="eyebrow mt-5 text-burgundy">Order request</p>
        <h1 className="mt-2 font-display text-[clamp(2.4rem,6vw,4rem)] font-medium tracking-tight">{normalized}</h1>

        {!valid ? (
          <p className="mt-4 text-sm text-olive">That doesn't look like a Reka order reference (e.g. RKS-000123).</p>
        ) : statusQuery.isLoading ? (
          <p className="mt-4 text-sm text-olive" aria-live="polite">Checking your order…</p>
        ) : statusQuery.error ? (
          <div role="alert" className="mt-6">
            <p className="text-sm text-olive">We couldn't check this order right now.</p>
            <button type="button" onClick={() => statusQuery.refetch()} className="btn-outline mt-4"><RefreshCw className="h-4 w-4" aria-hidden="true" /> Try again</button>
          </div>
        ) : !order ? (
          <p className="mt-4 text-sm text-olive">We couldn't find an order with this reference. Check the number, or message us on WhatsApp.</p>
        ) : (
          <div className="mt-6" aria-live="polite">
            <span className="inline-flex rounded-full bg-ink px-5 py-2.5 text-sm font-bold uppercase tracking-[.16em] text-canvas">
              {status ? ORDER_STATUS_LABELS[status] : order.status}
            </span>
            <p className="mx-auto mt-4 max-w-md text-sm leading-7 text-olive">
              {status ? PUBLIC_STATUS_COPY[status] : "We have your order on file."}
            </p>
            <p className="mt-1 text-xs text-olive/80">Placed {new Date(order.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}</p>
          </div>
        )}
      </div>

      {stash && (
        <section className="mt-10 rounded-[1.75rem] bg-cream p-6 ring-1 ring-ink/10 sm:p-8" aria-labelledby="handoff-title">
          <h2 id="handoff-title" className="font-display text-2xl font-semibold">Haven't sent it yet?</h2>
          <p className="mt-1 text-sm leading-7 text-olive">Your order is saved either way — but we only see it once you send the WhatsApp message. If WhatsApp didn't open, use the buttons below.</p>
          <div className="mt-5 flex flex-wrap gap-3">
            <a href={stash.whatsappUrl} target="_blank" rel="noopener noreferrer" className="btn-wa">
              <MessageCircle className="h-4 w-4" aria-hidden="true" /> Open WhatsApp again
            </a>
            <button type="button" onClick={copyMessage} className="btn-outline">
              {copied ? <Check className="h-4 w-4" aria-hidden="true" /> : <Copy className="h-4 w-4" aria-hidden="true" />} {copied ? "Copied" : "Copy order message"}
            </button>
          </div>
          <details className="mt-5">
            <summary className="cursor-pointer text-sm font-semibold text-burgundy">Show the message</summary>
            <pre className="mt-3 overflow-x-auto whitespace-pre-wrap rounded-2xl bg-canvas/70 p-4 text-xs leading-6 ring-1 ring-ink/10">{stash.message}</pre>
          </details>
        </section>
      )}

      <div className="mt-10 text-center">
        <p className="text-sm text-olive">Questions about this order?</p>
        <div className="mt-3 flex flex-wrap justify-center gap-3">
          <a href={whatsappChatUrl(settings.whatsappNumber, `Hi ${settings.storeName}, I'm asking about order ${normalized}.`)} target="_blank" rel="noopener noreferrer" className="btn-outline">
            <MessageCircle className="h-4 w-4 text-burgundy" aria-hidden="true" /> WhatsApp us
          </a>
          <Link href="/" className="btn-ink">Keep browsing</Link>
        </div>
      </div>
    </div>
  );
}
