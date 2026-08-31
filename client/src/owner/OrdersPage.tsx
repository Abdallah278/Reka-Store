import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { DEPARTMENTS, isDepartmentSlug } from "@shared/departments";
import { ORDER_STATUSES, ORDER_STATUS_LABELS, ORDER_TRANSITIONS, isOrderStatus, type OrderStatus } from "@shared/orders";
import { formatPrice } from "@shared/whatsapp";
import type { inferRouterOutputs } from "@trpc/server";
import { BadgeCheck, HandCoins, Loader2, Search } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import type { AppRouter } from "../../../server/routers";
import { ErrorPanel, LoadingPanel, formatDate } from "./ui";

type OwnerOrder = inferRouterOutputs<AppRouter>["owner"]["orders"][number];

const STATUS_TONES: Record<OrderStatus, string> = {
  pending_contact: "bg-canvas text-ink",
  contacted: "bg-clay/40 text-ink",
  awaiting_transfer: "bg-canvas text-burgundy ring-1 ring-burgundy/40",
  transfer_claimed: "bg-burgundy/15 text-burgundy",
  paid: "bg-olive text-canvas",
  approved: "bg-olive text-canvas",
  preparing: "bg-ink text-canvas",
  shipped: "bg-ink text-canvas",
  completed: "bg-olive/20 text-olive",
  rejected: "bg-burgundy text-canvas",
  cancelled: "bg-ink/10 text-ink/60",
};

function StatusBadge({ status }: { status: string }) {
  const known = isOrderStatus(status);
  return (
    <span className={`inline-flex rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-[.14em] ${known ? STATUS_TONES[status] : "bg-canvas"}`}>
      {known ? ORDER_STATUS_LABELS[status] : status}
    </span>
  );
}

export default function OrdersPage() {
  const orders = trpc.owner.orders.useQuery();
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [deptFilter, setDeptFilter] = useState<string>("all");
  const [query, setQuery] = useState("");
  const [openId, setOpenId] = useState<number | null>(null);

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (orders.data ?? []).filter(o => {
      if (statusFilter !== "all" && o.status !== statusFilter) return false;
      if (deptFilter !== "all" && !o.items.some(i => i.department === deptFilter)) return false;
      if (q && !`${o.reference} ${o.customerName} ${o.phone} ${o.city}`.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [orders.data, statusFilter, deptFilter, query]);

  if (orders.isLoading) return <LoadingPanel label="Loading orders…" />;
  if (orders.error) return <ErrorPanel retry={() => orders.refetch()} />;

  const all = orders.data ?? [];
  const active = all.filter(o => !["completed", "rejected", "cancelled"].includes(o.status)).length;

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <div>
        <p className="eyebrow text-burgundy">Operations</p>
        <h1 className="mt-2 font-display text-4xl font-semibold sm:text-5xl">Orders</h1>
        <p className="mt-2 text-sm text-olive">{all.length} total · {active} active. Payment is only ever confirmed here, manually — never automatically.</p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <label className="flex min-w-[220px] flex-1 items-center gap-3 rounded-full border border-olive/30 bg-cream px-4 sm:max-w-md">
          <Search className="h-4 w-4 text-olive" aria-hidden="true" />
          <span className="sr-only">Search orders</span>
          <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Reference, name, phone, city…" className="min-h-12 w-full bg-transparent text-sm outline-none" />
        </label>
        <label className="grid gap-1 text-xs font-semibold">
          <span className="sr-only">Filter by status</span>
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="min-h-12 rounded-full border border-olive/30 bg-cream px-4 text-sm">
            <option value="all">All statuses</option>
            {ORDER_STATUSES.map(s => <option key={s} value={s}>{ORDER_STATUS_LABELS[s]}</option>)}
          </select>
        </label>
        <label className="grid gap-1 text-xs font-semibold">
          <span className="sr-only">Filter by department</span>
          <select value={deptFilter} onChange={e => setDeptFilter(e.target.value)} className="min-h-12 rounded-full border border-olive/30 bg-cream px-4 text-sm">
            <option value="all">All departments</option>
            {Object.values(DEPARTMENTS).filter(d => d.slug !== "offers").map(d => <option key={d.slug} value={d.slug}>{d.name}</option>)}
          </select>
        </label>
      </div>

      {all.length === 0 ? (
        <div className="rounded-[1.75rem] border border-dashed border-olive/40 bg-cream p-12 text-center">
          <h2 className="font-display text-3xl">No orders yet</h2>
          <p className="mt-2 text-sm text-olive">Customer order requests will appear here the moment they're placed — before the WhatsApp message is even sent.</p>
        </div>
      ) : rows.length === 0 ? (
        <p className="rounded-2xl bg-cream p-6 text-sm text-olive">No orders match the current filters.</p>
      ) : (
        <ul className="grid gap-3">
          {rows.map(o => (
            <li key={o.id}>
              <button type="button" onClick={() => setOpenId(o.id)} className="grid w-full grid-cols-2 items-center gap-3 rounded-[1.25rem] bg-cream p-4 text-left ring-1 ring-ink/10 transition hover:ring-burgundy/50 sm:grid-cols-[110px_1fr_auto_auto_auto] sm:gap-5" aria-label={`Open order ${o.reference}`}>
                <span className="font-mono text-sm font-bold">{o.reference}</span>
                <span className="min-w-0">
                  <span className="block truncate font-semibold">{o.customerName}</span>
                  <span className="block truncate text-xs text-olive">{o.city} · {o.items.length} item{o.items.length === 1 ? "" : "s"}</span>
                </span>
                <span className="text-sm font-semibold">{formatPrice(o.total)}</span>
                <StatusBadge status={o.status} />
                <span className="text-xs text-olive">{formatDate(o.createdAt)}</span>
              </button>
            </li>
          ))}
        </ul>
      )}

      <OrderDetail id={openId} onClose={() => setOpenId(null)} onChanged={() => orders.refetch()} />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Order detail: items, customer, status workflow, notes, history      */
/* ------------------------------------------------------------------ */

function OrderDetail({ id, onClose, onChanged }: { id: number | null; onClose: () => void; onChanged: () => void }) {
  const utils = trpc.useUtils();
  const order = trpc.owner.order.useQuery({ id: id ?? 0 }, { enabled: id !== null });
  const [note, setNote] = useState("");
  const [ownerNotes, setOwnerNotes] = useState<string | null>(null);

  const invalidate = () => {
    utils.owner.order.invalidate();
    utils.owner.audit.invalidate();
    onChanged();
  };

  const updateStatus = trpc.owner.updateOrderStatus.useMutation({
    onSuccess: (_, vars) => {
      toast.success(`Order moved to ${ORDER_STATUS_LABELS[vars.status]}`);
      setNote("");
      invalidate();
    },
    onError: e => toast.error(e.message || "Could not update the order"),
  });
  const saveNotes = trpc.owner.setOrderNotes.useMutation({
    onSuccess: () => {
      toast.success("Private notes saved");
      invalidate();
    },
    onError: e => toast.error(e.message || "Could not save notes"),
  });

  const o = order.data;
  const current: OrderStatus | null = o && isOrderStatus(o.status) ? o.status : null;
  const nextStatuses = current ? ORDER_TRANSITIONS[current] : [];

  return (
    <Dialog open={id !== null} onOpenChange={open => !open && onClose()}>
      <DialogContent className="max-h-[92dvh] w-[calc(100vw-1rem)] max-w-3xl overflow-y-auto rounded-[1.5rem] bg-cream p-0 sm:w-full">
        <div className="p-5 sm:p-7">
          {order.isLoading || !o ? (
            order.error ? <ErrorPanel retry={() => order.refetch()} /> : <LoadingPanel label="Loading order…" />
          ) : (
            <>
              <DialogHeader className="text-left">
                <div className="flex flex-wrap items-center gap-3">
                  <DialogTitle className="font-mono text-2xl font-bold">{o.reference}</DialogTitle>
                  <StatusBadge status={o.status} />
                </div>
                <DialogDescription>Placed {formatDate(o.createdAt)} · last change {formatDate(o.updatedAt)}</DialogDescription>
              </DialogHeader>

              <div className="mt-5 grid gap-5 md:grid-cols-2">
                <section className="rounded-2xl bg-canvas/60 p-4 ring-1 ring-ink/10" aria-label="Customer">
                  <h3 className="eyebrow text-olive">Customer & delivery</h3>
                  <dl className="mt-3 grid gap-1.5 text-sm">
                    <div><dt className="inline font-semibold">Name: </dt><dd className="inline">{o.customerName}</dd></div>
                    <div><dt className="inline font-semibold">Phone: </dt><dd className="inline">{o.phone}</dd></div>
                    {o.whatsapp && <div><dt className="inline font-semibold">WhatsApp: </dt><dd className="inline">{o.whatsapp}</dd></div>}
                    <div><dt className="inline font-semibold">City: </dt><dd className="inline">{o.city}</dd></div>
                    <div><dt className="inline font-semibold">Address: </dt><dd className="inline">{o.address}</dd></div>
                    {o.building && <div><dt className="inline font-semibold">Building: </dt><dd className="inline">{o.building}</dd></div>}
                    {o.deliveryNotes && <div><dt className="inline font-semibold">Notes: </dt><dd className="inline">{o.deliveryNotes}</dd></div>}
                  </dl>
                </section>

                <section className="rounded-2xl bg-canvas/60 p-4 ring-1 ring-ink/10" aria-label="Items">
                  <h3 className="eyebrow text-olive">Items (price snapshot)</h3>
                  <ul className="mt-3 grid gap-2 text-sm">
                    {o.items.map(item => (
                      <li key={item.id} className="flex justify-between gap-3">
                        <span className="min-w-0">
                          <span className="block truncate font-semibold">{item.name}</span>
                          <span className="text-xs text-olive">{isDepartmentSlug(item.department) ? DEPARTMENTS[item.department].shortName : item.department} · × {item.quantity} @ {formatPrice(item.unitPrice)}</span>
                        </span>
                        <span className="shrink-0 font-semibold">{formatPrice(item.lineTotal)}</span>
                      </li>
                    ))}
                  </ul>
                  <dl className="mt-3 grid gap-1 border-t border-ink/10 pt-3 text-sm">
                    <div className="flex justify-between"><dt className="text-olive">Subtotal</dt><dd className="font-semibold">{formatPrice(o.subtotal)}</dd></div>
                    <div className="flex justify-between"><dt className="text-olive">Delivery</dt><dd className="font-semibold">{o.deliveryFee > 0 ? formatPrice(o.deliveryFee) : "—"}</dd></div>
                    <div className="flex justify-between text-base"><dt className="font-semibold">Total</dt><dd className="font-display text-xl font-bold">{formatPrice(o.total)}</dd></div>
                  </dl>
                </section>
              </div>

              {/* Status workflow */}
              <section className="mt-5 rounded-2xl bg-canvas/60 p-4 ring-1 ring-ink/10" aria-label="Update status">
                <h3 className="eyebrow text-olive">Move the order forward</h3>
                {nextStatuses.length === 0 ? (
                  <p className="mt-3 text-sm text-olive">This order is in a final state and can't be changed.</p>
                ) : (
                  <>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {nextStatuses.map(s => (
                        <Button
                          key={s}
                          variant={s === "paid" || s === "transfer_claimed" ? "default" : "outline"}
                          className={`min-h-11 rounded-full ${s === "rejected" || s === "cancelled" ? "text-burgundy hover:bg-burgundy/10" : ""}`}
                          disabled={updateStatus.isPending}
                          onClick={() => updateStatus.mutate({ id: o.id, status: s, note: note.trim() || undefined })}
                        >
                          {updateStatus.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : s === "paid" ? <HandCoins className="h-4 w-4" /> : s === "transfer_claimed" ? <BadgeCheck className="h-4 w-4" /> : null}
                          {ORDER_STATUS_LABELS[s]}
                        </Button>
                      ))}
                    </div>
                    <input value={note} onChange={e => setNote(e.target.value)} maxLength={1000} placeholder="Optional note for the status history…" className="mt-3 min-h-11 w-full rounded-xl border border-olive/30 bg-cream px-4 text-sm outline-none focus:ring-2 focus:ring-burgundy" />
                    <p className="mt-2 text-xs text-olive">Marking “Transfer claimed” or “Paid” is a deliberate manual action and is written to the audit log.</p>
                  </>
                )}
              </section>

              {/* Private notes */}
              <section className="mt-5 rounded-2xl bg-canvas/60 p-4 ring-1 ring-ink/10" aria-label="Private notes">
                <h3 className="eyebrow text-olive">Private notes (never shown to the customer)</h3>
                <Textarea rows={3} value={ownerNotes ?? o.ownerNotes ?? ""} onChange={e => setOwnerNotes(e.target.value)} maxLength={4000} className="mt-3 bg-cream" placeholder="Transfer screenshots checked, delivery courier, etc." />
                <Button className="mt-3 min-h-11 rounded-full" disabled={saveNotes.isPending || ownerNotes === null} onClick={() => ownerNotes !== null && saveNotes.mutate({ id: o.id, notes: ownerNotes })}>
                  {saveNotes.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Save notes
                </Button>
              </section>

              {/* History */}
              <section className="mt-5" aria-label="Status history">
                <h3 className="eyebrow text-olive">Status history</h3>
                <ol className="mt-3 grid gap-2 text-sm">
                  {o.history.map(h => (
                    <li key={h.id} className="flex flex-wrap items-center gap-2 rounded-xl bg-canvas/60 px-3 py-2 ring-1 ring-ink/10">
                      <StatusBadge status={h.toStatus} />
                      <span className="text-xs text-olive">
                        {h.fromStatus ? `from ${isOrderStatus(h.fromStatus) ? ORDER_STATUS_LABELS[h.fromStatus] : h.fromStatus} · ` : ""}
                        {h.actor === "customer" ? "by customer" : "by owner"} · {formatDate(h.createdAt)}
                      </span>
                      {h.note && <span className="w-full text-xs text-ink/80">“{h.note}”</span>}
                    </li>
                  ))}
                </ol>
              </section>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
