import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { ASSIGNABLE_DEPARTMENTS, DEPARTMENTS, type AssignableDepartment } from "@shared/departments";
import { formatPrice } from "@shared/whatsapp";
import type { inferRouterOutputs } from "@trpc/server";
import { ArrowDown, ArrowUp, Eye, EyeOff, ImagePlus, Loader2, Pencil, Plus, Search, Trash2, X } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import type { AppRouter } from "../../../server/routers";
import { precheckFile, toDataUrl } from "./upload";
import { ErrorPanel, LoadingPanel, formatDate } from "./ui";

type OwnerProduct = inferRouterOutputs<AppRouter>["owner"]["products"][number];
type FormImage = { url: string; key: string };
type Form = {
  name: string;
  description: string;
  price: string;
  originalPrice: string;
  offerEndsAt: string;
  department: AssignableDepartment;
  brand: string;
  sku: string;
  variantLabel: string;
  productNotes: string;
  categoryId: number | null;
  isSoldOut: boolean;
  isPublished: boolean;
  /** Empty string = stock not tracked. */
  stockQuantity: string;
  images: FormImage[];
};

const emptyForm: Form = { name: "", description: "", price: "", originalPrice: "", offerEndsAt: "", department: "makeup", brand: "", sku: "", variantLabel: "", productNotes: "", categoryId: null, isSoldOut: false, isPublished: true, stockQuantity: "", images: [] };

const toDateInput = (value: Date | string | null | undefined) => {
  if (!value) return "";
  const d = typeof value === "string" ? new Date(value) : value;
  return Number.isNaN(d.getTime()) ? "" : d.toISOString().slice(0, 10);
};

export default function ProductsPage() {
  const utils = trpc.useUtils();
  const products = trpc.owner.products.useQuery();
  const categories = trpc.owner.categories.useQuery();
  const [editing, setEditing] = useState<OwnerProduct | null | "new">(null);
  const [pendingDelete, setPendingDelete] = useState<OwnerProduct | null>(null);
  const [filter, setFilter] = useState("");

  const invalidate = () => {
    utils.owner.products.invalidate();
    utils.owner.audit.invalidate();
  };

  const setState = trpc.owner.setProductState.useMutation({
    onSuccess: (_, vars) => {
      toast.success(vars.isPublished !== undefined ? (vars.isPublished ? "Product published" : "Product unpublished") : vars.isSoldOut ? "Marked as sold out" : "Marked as available");
      invalidate();
    },
    onError: e => toast.error(e.message || "Could not update product"),
  });
  const remove = trpc.owner.deleteProduct.useMutation({
    onSuccess: () => {
      toast.success("Product deleted");
      setPendingDelete(null);
      invalidate();
    },
    onError: e => toast.error(e.message || "Could not delete product"),
  });

  const rows = useMemo(() => {
    const q = filter.trim().toLowerCase();
    return (products.data ?? []).filter(p => !q || p.name.toLowerCase().includes(q) || p.categoryName.toLowerCase().includes(q));
  }, [products.data, filter]);

  if (products.isLoading || categories.isLoading) return <LoadingPanel label="Loading products…" />;
  if (products.error || categories.error) return <ErrorPanel retry={() => { products.refetch(); categories.refetch(); }} />;

  const all = products.data ?? [];
  const stats = { total: all.length, published: all.filter(p => p.isPublished).length, soldOut: all.filter(p => p.isSoldOut).length };

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <p className="eyebrow text-burgundy">Catalogue</p>
          <h1 className="mt-2 font-display text-4xl font-semibold sm:text-5xl">Products</h1>
          <p className="mt-2 text-sm text-olive">{stats.total} total · {stats.published} published · {stats.soldOut} sold out</p>
        </div>
        <Button size="lg" onClick={() => setEditing("new")} className="min-h-12 rounded-full px-6">
          <Plus className="h-4 w-4" /> New product
        </Button>
      </div>

      <label className="flex max-w-md items-center gap-3 rounded-full border border-olive/30 bg-cream px-4">
        <Search className="h-4 w-4 text-olive" aria-hidden="true" />
        <span className="sr-only">Filter products</span>
        <input value={filter} onChange={e => setFilter(e.target.value)} placeholder="Filter by name or category" className="min-h-12 w-full bg-transparent text-sm outline-none" />
      </label>

      {all.length === 0 ? (
        <div className="rounded-[1.75rem] border border-dashed border-olive/40 bg-cream p-12 text-center">
          <h2 className="font-display text-3xl">No products yet</h2>
          <p className="mt-2 text-sm text-olive">Add your first piece — it appears on the public storefront as soon as it is published.</p>
          <Button className="mt-6 rounded-full" onClick={() => setEditing("new")}><Plus className="h-4 w-4" /> Add product</Button>
        </div>
      ) : rows.length === 0 ? (
        <p className="rounded-2xl bg-cream p-6 text-sm text-olive">No products match “{filter}”.</p>
      ) : (
        <ul className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {rows.map(p => (
            <li key={p.id} className="flex flex-col overflow-hidden rounded-[1.5rem] bg-cream ring-1 ring-ink/10">
              <div className="relative aspect-[4/3] bg-clay/40">
                {p.images[0] ? <img src={p.images[0].imageUrl} alt={p.name} loading="lazy" className="h-full w-full object-cover" /> : <div className="grid h-full place-items-center text-sm text-olive">No image</div>}
                <div className="absolute left-3 top-3 flex gap-2">
                  <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-[.16em] ${p.isPublished ? "bg-olive text-canvas" : "bg-ink/80 text-canvas"}`}>{p.isPublished ? "Published" : "Draft"}</span>
                  {p.isSoldOut ? <span className="rounded-full bg-burgundy px-2.5 py-1 text-[11px] font-bold uppercase tracking-[.16em] text-canvas">Sold out</span> : null}
                </div>
              </div>
              <div className="flex flex-1 flex-col p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h2 className="truncate font-semibold">{p.name}</h2>
                    <p className="text-xs text-olive">
                      {(DEPARTMENTS as Record<string, { shortName: string }>)[p.department]?.shortName ?? p.department} · {p.categoryName} · {p.images.length} image{p.images.length === 1 ? "" : "s"}
                      {p.stockQuantity != null && (
                        <span className={p.stockQuantity <= 5 ? " font-bold text-burgundy" : ""}> · {p.stockQuantity} in stock</span>
                      )}
                    </p>
                  </div>
                  <p className="shrink-0 text-right font-semibold">
                    {formatPrice(p.price)}
                    {p.originalPrice != null && <span className="block text-xs font-normal text-olive line-through">{formatPrice(p.originalPrice)}</span>}
                  </p>
                </div>
                <p className="mt-2 text-xs text-olive">Updated {formatDate(p.updatedAt)}</p>
                <div className="mt-4 grid grid-cols-2 gap-2">
                  <label className="flex min-h-11 items-center justify-between rounded-xl bg-canvas px-3 text-xs font-semibold">
                    Published
                    <Switch checked={Boolean(p.isPublished)} disabled={setState.isPending} onCheckedChange={v => setState.mutate({ id: p.id, isPublished: v })} aria-label={`${p.isPublished ? "Unpublish" : "Publish"} ${p.name}`} />
                  </label>
                  <label className="flex min-h-11 items-center justify-between rounded-xl bg-canvas px-3 text-xs font-semibold">
                    Sold out
                    <Switch checked={Boolean(p.isSoldOut)} disabled={setState.isPending} onCheckedChange={v => setState.mutate({ id: p.id, isSoldOut: v })} aria-label={`Mark ${p.name} as ${p.isSoldOut ? "available" : "sold out"}`} />
                  </label>
                </div>
                <div className="mt-3 flex gap-2">
                  <Button variant="outline" className="min-h-11 flex-1 rounded-full" onClick={() => setEditing(p)}><Pencil className="h-4 w-4" /> Edit</Button>
                  <Button variant="outline" className="min-h-11 rounded-full text-burgundy hover:bg-burgundy/10" onClick={() => setPendingDelete(p)} aria-label={`Delete ${p.name}`}><Trash2 className="h-4 w-4" /></Button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      <ProductDialog key={editing === "new" ? "new" : editing?.id ?? "closed"} product={editing === "new" ? null : editing} open={editing !== null} onClose={() => setEditing(null)} categories={categories.data ?? []} onSaved={invalidate} />

      <AlertDialog open={Boolean(pendingDelete)} onOpenChange={o => !o && setPendingDelete(null)}>
        <AlertDialogContent className="rounded-[1.5rem]">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-display text-3xl">Delete “{pendingDelete?.name}”?</AlertDialogTitle>
            <AlertDialogDescription>This removes the product and its image references from the store permanently. This cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="min-h-11 rounded-full">Keep it</AlertDialogCancel>
            <AlertDialogAction className="min-h-11 rounded-full bg-burgundy text-canvas hover:bg-ink" disabled={remove.isPending} onClick={() => pendingDelete && remove.mutate({ id: pendingDelete.id })}>
              {remove.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />} Delete product
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function ProductDialog({ product, open, onClose, categories, onSaved }: { product: OwnerProduct | null; open: boolean; onClose: () => void; categories: { id: number; name: string }[]; onSaved: () => void }) {
  const [form, setForm] = useState<Form>(() =>
    product
      ? {
          name: product.name,
          description: product.description ?? "",
          price: String(product.price),
          originalPrice: product.originalPrice != null ? String(product.originalPrice) : "",
          offerEndsAt: toDateInput(product.offerEndsAt),
          department: (ASSIGNABLE_DEPARTMENTS as readonly string[]).includes(product.department) ? (product.department as AssignableDepartment) : "makeup",
          brand: product.brand ?? "",
          sku: product.sku ?? "",
          variantLabel: product.variantLabel ?? "",
          productNotes: product.productNotes ?? "",
          categoryId: product.categoryId ?? null,
          isSoldOut: Boolean(product.isSoldOut),
          isPublished: Boolean(product.isPublished),
          stockQuantity: product.stockQuantity != null ? String(product.stockQuantity) : "",
          images: product.images.map(i => ({ url: i.imageUrl, key: i.storageKey })),
        }
      : emptyForm
  );
  const [uploading, setUploading] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const upload = trpc.owner.uploadImage.useMutation();
  const create = trpc.owner.createProduct.useMutation();
  const update = trpc.owner.updateProduct.useMutation();
  const saving = create.isPending || update.isPending;

  const field = <K extends keyof Form>(key: K, value: Form[K]) => setForm(f => ({ ...f, [key]: value }));

  const addFiles = async (files: FileList | null) => {
    if (!files?.length) return;
    const room = 8 - form.images.length;
    const list = Array.from(files).slice(0, room);
    if (files.length > room) toast.warning(`Only ${room} more image${room === 1 ? "" : "s"} can be added (max 8).`);
    setUploading(true);
    try {
      for (const file of list) {
        const problem = precheckFile(file);
        if (problem) {
          toast.error(problem);
          continue;
        }
        const dataUrl = await toDataUrl(file);
        const result = await upload.mutateAsync({ dataUrl, filename: file.name, mimeType: file.type, scope: "products" });
        setForm(f => ({ ...f, images: [...f.images, { url: result.url, key: result.key }] }));
      }
      toast.success("Image uploaded");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const move = (i: number, dir: -1 | 1) =>
    setForm(f => {
      const next = [...f.images];
      const j = i + dir;
      if (j < 0 || j >= next.length) return f;
      [next[i], next[j]] = [next[j], next[i]];
      return { ...f, images: next };
    });

  const submit = async () => {
    const problems: string[] = [];
    if (form.name.trim().length < 2) problems.push("Product name needs at least 2 characters.");
    const price = Number(form.price);
    if (!Number.isInteger(price) || price < 0) problems.push("Price must be a whole number of EGP.");
    const originalPrice = form.originalPrice.trim() ? Number(form.originalPrice) : null;
    if (originalPrice !== null && (!Number.isInteger(originalPrice) || originalPrice <= price)) {
      problems.push("Original price must be a whole number HIGHER than the sale price — discounts must be genuine.");
    }
    if (form.offerEndsAt && originalPrice === null) problems.push("An offer end date needs an original price — otherwise there is no real offer.");
    const stockQuantity = form.stockQuantity.trim() ? Number(form.stockQuantity) : null;
    if (stockQuantity !== null && (!Number.isInteger(stockQuantity) || stockQuantity < 0)) problems.push("Stock must be a whole number of units (leave empty to not track stock).");
    setErrors(problems);
    if (problems.length) return;
    const payload = {
      name: form.name.trim(),
      description: form.description.trim() || undefined,
      price,
      originalPrice,
      offerEndsAt: form.offerEndsAt ? new Date(`${form.offerEndsAt}T23:59:59`) : null,
      department: form.department,
      brand: form.brand.trim() || null,
      sku: form.sku.trim() || null,
      variantLabel: form.variantLabel.trim() || null,
      productNotes: form.productNotes.trim() || null,
      categoryId: form.categoryId,
      isSoldOut: form.isSoldOut,
      isPublished: form.isPublished,
      stockQuantity,
      images: form.images,
    };
    try {
      if (product) await update.mutateAsync({ ...payload, id: product.id });
      else await create.mutateAsync(payload);
      toast.success(product ? "Product updated" : "Product created");
      onSaved();
      onClose();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not save product");
    }
  };

  return (
    <Dialog open={open} onOpenChange={o => !o && !saving && onClose()}>
      <DialogContent className="max-h-[92dvh] w-[calc(100vw-1rem)] max-w-2xl overflow-y-auto rounded-[1.5rem] bg-cream p-0 sm:w-full">
        <div className="p-5 sm:p-7">
          <DialogHeader className="text-left">
            <DialogTitle className="font-display text-3xl">{product ? "Edit product" : "New product"}</DialogTitle>
            <DialogDescription>{product ? `Last updated ${formatDate(product.updatedAt)}` : "Fill in the details, upload up to 8 images, then save."}</DialogDescription>
          </DialogHeader>

          {errors.length > 0 && (
            <ul role="alert" className="mt-4 space-y-1 rounded-xl bg-burgundy/10 p-3 text-sm text-burgundy">
              {errors.map(e => <li key={e}>{e}</li>)}
            </ul>
          )}

          <div className="mt-5 grid gap-5">
            <div className="grid gap-2">
              <Label htmlFor="p-name">Product name</Label>
              <Input id="p-name" className="min-h-12" value={form.name} onChange={e => field("name", e.target.value)} placeholder="e.g. Velvet Lip Tint" maxLength={160} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="p-desc">Description</Label>
              <Textarea id="p-desc" rows={4} value={form.description} onChange={e => field("description", e.target.value)} placeholder="Texture, finish, who it suits…" maxLength={4000} />
            </div>
            <div className="grid gap-5 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="p-dept">Department</Label>
                <select id="p-dept" className="min-h-12 rounded-md border border-input bg-transparent px-3 text-sm" value={form.department} onChange={e => field("department", e.target.value as AssignableDepartment)}>
                  {ASSIGNABLE_DEPARTMENTS.map(slug => <option key={slug} value={slug}>{DEPARTMENTS[slug].name}</option>)}
                </select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="p-cat">Category</Label>
                <select id="p-cat" className="min-h-12 rounded-md border border-input bg-transparent px-3 text-sm" value={form.categoryId ?? ""} onChange={e => field("categoryId", e.target.value ? Number(e.target.value) : null)}>
                  <option value="">Uncategorised</option>
                  {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
            </div>
            <div className="grid gap-5 sm:grid-cols-3">
              <div className="grid gap-2">
                <Label htmlFor="p-price">Price (EGP)</Label>
                <Input id="p-price" className="min-h-12" inputMode="numeric" value={form.price} onChange={e => field("price", e.target.value.replace(/[^\d]/g, ""))} placeholder="350" />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="p-orig">Original price (EGP, optional)</Label>
                <Input id="p-orig" className="min-h-12" inputMode="numeric" value={form.originalPrice} onChange={e => field("originalPrice", e.target.value.replace(/[^\d]/g, ""))} placeholder="e.g. 450" />
                <p className="text-xs text-olive">Only for a genuine discount — puts the piece in Offers.</p>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="p-offer-end">Offer ends (optional)</Label>
                <Input id="p-offer-end" type="date" className="min-h-12" value={form.offerEndsAt} onChange={e => field("offerEndsAt", e.target.value)} />
              </div>
            </div>
            <div className="grid gap-5 sm:grid-cols-3">
              <div className="grid gap-2">
                <Label htmlFor="p-brand">Brand (optional)</Label>
                <Input id="p-brand" className="min-h-12" value={form.brand} onChange={e => field("brand", e.target.value)} maxLength={120} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="p-sku">SKU (optional)</Label>
                <Input id="p-sku" className="min-h-12" value={form.sku} onChange={e => field("sku", e.target.value)} maxLength={64} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="p-variant">Shade / size / variant (optional)</Label>
                <Input id="p-variant" className="min-h-12" value={form.variantLabel} onChange={e => field("variantLabel", e.target.value)} maxLength={160} placeholder="e.g. Shade 03 Warm Rose · 50ml" />
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="p-notes">Ingredients / fragrance notes (optional)</Label>
              <Textarea id="p-notes" rows={3} value={form.productNotes} onChange={e => field("productNotes", e.target.value)} maxLength={4000} placeholder="Key ingredients, fragrance notes, how to use…" />
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <label className="flex min-h-12 items-center justify-between rounded-xl bg-canvas px-4 text-sm font-semibold">
                <span className="flex items-center gap-2">{form.isPublished ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />} Published on storefront</span>
                <Switch checked={form.isPublished} onCheckedChange={v => field("isPublished", v)} />
              </label>
              <label className="flex min-h-12 items-center justify-between rounded-xl bg-canvas px-4 text-sm font-semibold">
                Sold out
                <Switch checked={form.isSoldOut} onCheckedChange={v => field("isSoldOut", v)} />
              </label>
              <div className="grid gap-1">
                <Label htmlFor="p-stock">Stock (units)</Label>
                <Input id="p-stock" className="min-h-12" inputMode="numeric" value={form.stockQuantity} onChange={e => field("stockQuantity", e.target.value.replace(/[^\d]/g, ""))} placeholder="Empty = not tracked" />
              </div>
            </div>
            {form.stockQuantity.trim() === "0" && <p className="text-xs text-burgundy">Stock 0 shows the product as sold out on the storefront.</p>}

            <div className="grid gap-2">
              <div className="flex items-center justify-between">
                <Label>Images ({form.images.length}/8)</Label>
                <span className="text-xs text-olive">PNG, JPEG, WebP or GIF · up to 5 MB each · first image is the cover</span>
              </div>
              <ul className="grid grid-cols-3 gap-3 sm:grid-cols-4">
                {form.images.map((img, i) => (
                  <li key={img.key} className="group relative aspect-square overflow-hidden rounded-xl bg-clay/40 ring-1 ring-ink/10">
                    <img src={img.url} alt={`Product image ${i + 1}`} className="h-full w-full object-cover" />
                    {i === 0 && <span className="absolute left-1.5 top-1.5 rounded-full bg-ink px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-canvas">Cover</span>}
                    <div className="absolute inset-x-1 bottom-1 flex justify-between gap-1">
                      <button type="button" aria-label="Move image earlier" disabled={i === 0} onClick={() => move(i, -1)} className="grid h-8 w-8 place-items-center rounded-full bg-cream/95 text-ink disabled:opacity-40"><ArrowUp className="h-3.5 w-3.5" /></button>
                      <button type="button" aria-label="Remove image" onClick={() => setForm(f => ({ ...f, images: f.images.filter((_, j) => j !== i) }))} className="grid h-8 w-8 place-items-center rounded-full bg-burgundy text-canvas"><X className="h-3.5 w-3.5" /></button>
                      <button type="button" aria-label="Move image later" disabled={i === form.images.length - 1} onClick={() => move(i, 1)} className="grid h-8 w-8 place-items-center rounded-full bg-cream/95 text-ink disabled:opacity-40"><ArrowDown className="h-3.5 w-3.5" /></button>
                    </div>
                  </li>
                ))}
                {form.images.length < 8 && (
                  <li>
                    <label className="flex aspect-square cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-olive/40 text-xs font-semibold text-olive hover:border-burgundy hover:text-burgundy focus-within:ring-2 focus-within:ring-burgundy">
                      {uploading ? <Loader2 className="h-5 w-5 animate-spin" /> : <ImagePlus className="h-5 w-5" />}
                      {uploading ? "Uploading…" : "Add images"}
                      <input type="file" accept="image/png,image/jpeg,image/webp,image/gif" multiple className="sr-only" disabled={uploading} onChange={e => { addFiles(e.target.files); e.target.value = ""; }} />
                    </label>
                  </li>
                )}
              </ul>
            </div>
          </div>

          <div className="mt-7 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <Button variant="outline" className="min-h-12 rounded-full" onClick={onClose} disabled={saving}>Cancel</Button>
            <Button className="min-h-12 rounded-full px-6" onClick={submit} disabled={saving || uploading}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null} {product ? "Save changes" : "Create product"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
