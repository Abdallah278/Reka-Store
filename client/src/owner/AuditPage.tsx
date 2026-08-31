import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { RefreshCw } from "lucide-react";
import { ErrorPanel, LoadingPanel, formatDate } from "./ui";

const LABELS: Record<string, string> = {
  "product.create": "Created product",
  "product.update": "Updated product",
  "product.delete": "Deleted product",
  "product.publish": "Published product",
  "product.unpublish": "Unpublished product",
  "product.soldout": "Marked sold out",
  "product.available": "Marked available",
  "settings.update": "Updated store settings",
  "image.upload": "Uploaded image",
};

export default function AuditPage() {
  const audit = trpc.owner.audit.useQuery({ limit: 200 });
  if (audit.isLoading) return <LoadingPanel label="Loading audit history…" />;
  if (audit.error) return <ErrorPanel retry={() => audit.refetch()} />;
  const rows = audit.data ?? [];

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="eyebrow text-burgundy">Security</p>
          <h1 className="mt-2 font-display text-4xl font-semibold sm:text-5xl">Audit history</h1>
          <p className="mt-2 text-sm text-olive">Every product and settings change, recorded server-side in UTC. Secrets, tokens and image data are never stored here.</p>
        </div>
        <Button variant="outline" className="min-h-11 rounded-full" onClick={() => audit.refetch()}><RefreshCw className="h-4 w-4" /> Refresh</Button>
      </div>

      {rows.length === 0 ? (
        <p className="rounded-[1.5rem] bg-cream p-8 text-center text-sm text-olive">No changes recorded yet. Actions you take in this console will appear here.</p>
      ) : (
        <div className="overflow-x-auto rounded-[1.5rem] bg-cream ring-1 ring-ink/10">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="bg-canvas/60 text-xs uppercase tracking-[.16em] text-olive">
              <tr>
                <th className="px-4 py-3 font-semibold">When (UTC)</th>
                <th className="px-4 py-3 font-semibold">Action</th>
                <th className="px-4 py-3 font-semibold">Target</th>
                <th className="px-4 py-3 font-semibold">Details</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(row => {
                let meta: Record<string, unknown> = {};
                try {
                  meta = row.metadata ? JSON.parse(row.metadata) : {};
                } catch {}
                const details = Object.entries(meta)
                  .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(", ") : String(v)}`)
                  .join(" · ");
                return (
                  <tr key={row.id} className="border-t border-ink/10 align-top">
                    <td className="whitespace-nowrap px-4 py-3 text-olive">{formatDate(row.createdAt)}</td>
                    <td className="px-4 py-3 font-semibold">{LABELS[row.action] ?? row.action}</td>
                    <td className="px-4 py-3">
                      <span className="rounded-full bg-canvas px-2 py-0.5 text-xs font-semibold">{row.targetType}</span> <span className="text-olive">#{row.targetId ?? "—"}</span>
                    </td>
                    <td className="px-4 py-3 text-olive">{details || "—"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
