import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { Check, Loader2, Star, X } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { ErrorPanel, LoadingPanel, formatDate } from "./ui";

const TABS = ["pending", "approved", "rejected"] as const;

export default function ReviewsPage() {
  const utils = trpc.useUtils();
  const reviews = trpc.owner.reviews.useQuery();
  const products = trpc.owner.products.useQuery();
  const [tab, setTab] = useState<(typeof TABS)[number]>("pending");

  const moderate = trpc.owner.moderateReview.useMutation({
    onSuccess: (_, vars) => {
      toast.success(vars.status === "approved" ? "Review approved — it is now public" : "Review rejected");
      utils.owner.reviews.invalidate();
      utils.owner.audit.invalidate();
    },
    onError: e => toast.error(e.message || "Could not moderate review"),
  });

  const productName = useMemo(() => {
    const map = new Map<number, string>();
    for (const p of products.data ?? []) map.set(p.id, p.name);
    return (id: number) => map.get(id) ?? `Product #${id}`;
  }, [products.data]);

  if (reviews.isLoading) return <LoadingPanel label="Loading reviews…" />;
  if (reviews.error) return <ErrorPanel retry={() => reviews.refetch()} />;

  const all = reviews.data ?? [];
  const rows = all.filter(r => r.status === tab);

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <div>
        <p className="eyebrow text-burgundy">Moderation</p>
        <h1 className="mt-2 font-display text-4xl font-semibold sm:text-5xl">Customer reviews</h1>
        <p className="mt-2 text-sm text-olive">
          Only approved reviews ever appear on the storefront. Nothing is seeded or invented — if there are no approved reviews, customers see “No reviews yet”.
        </p>
      </div>

      <div role="tablist" aria-label="Review status" className="flex gap-2">
        {TABS.map(t => {
          const count = all.filter(r => r.status === t).length;
          return (
            <button key={t} type="button" role="tab" aria-selected={tab === t} onClick={() => setTab(t)} className={`min-h-11 rounded-full px-5 text-sm font-semibold capitalize transition ${tab === t ? "bg-ink text-canvas" : "border border-olive/30 bg-cream hover:border-burgundy"}`}>
              {t} ({count})
            </button>
          );
        })}
      </div>

      {rows.length === 0 ? (
        <div className="rounded-[1.75rem] border border-dashed border-olive/40 bg-cream p-10 text-center">
          <h2 className="font-display text-2xl">No {tab} reviews</h2>
          <p className="mt-2 text-sm text-olive">{tab === "pending" ? "New customer reviews appear here for you to check first." : `Nothing has been ${tab} yet.`}</p>
        </div>
      ) : (
        <ul className="grid gap-3">
          {rows.map(r => (
            <li key={r.id} className="rounded-[1.25rem] bg-cream p-5 ring-1 ring-ink/10">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-semibold">{r.customerName} <span className="font-normal text-olive">on {productName(r.productId)}</span></p>
                  <p className="mt-0.5 flex items-center gap-2 text-xs text-olive">
                    <span className="inline-flex" aria-label={`${r.rating} out of 5 stars`}>
                      {[1, 2, 3, 4, 5].map(n => <Star key={n} className={`h-3.5 w-3.5 ${n <= r.rating ? "fill-burgundy text-burgundy" : "text-olive/30"}`} aria-hidden="true" />)}
                    </span>
                    {formatDate(r.createdAt)}
                  </p>
                </div>
                {tab === "pending" ? (
                  <div className="flex gap-2">
                    <Button className="min-h-11 rounded-full" disabled={moderate.isPending} onClick={() => moderate.mutate({ id: r.id, status: "approved" })}>
                      {moderate.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />} Approve
                    </Button>
                    <Button variant="outline" className="min-h-11 rounded-full text-burgundy hover:bg-burgundy/10" disabled={moderate.isPending} onClick={() => moderate.mutate({ id: r.id, status: "rejected" })}>
                      <X className="h-4 w-4" /> Reject
                    </Button>
                  </div>
                ) : (
                  <span className={`rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-[.14em] ${r.status === "approved" ? "bg-olive text-canvas" : "bg-burgundy/15 text-burgundy"}`}>{r.status}</span>
                )}
              </div>
              {r.body && <p className="mt-3 text-sm leading-7 text-ink/85">{r.body}</p>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
