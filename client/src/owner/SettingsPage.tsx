import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { ImagePlus, Loader2, Save, X } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { precheckFile, toDataUrl } from "./upload";
import { ErrorPanel, LoadingPanel, formatDate } from "./ui";

type Form = { storeName: string; logoUrl: string | null; whatsappNumber: string; primaryColor: string; accentColor: string; heroTitle: string; heroSubtitle: string; heroImageUrl: string | null; instagramUrl: string; deliveryFee: string };

const PALETTE = ["#310E10", "#74070E", "#45462A", "#947268", "#F4E382"];

export default function SettingsPage() {
  const utils = trpc.useUtils();
  const settings = trpc.owner.settings.useQuery();
  const [form, setForm] = useState<Form | null>(null);
  const [uploading, setUploading] = useState<"logo" | "hero" | null>(null);
  const upload = trpc.owner.uploadImage.useMutation();
  const save = trpc.owner.saveSettings.useMutation({
    onSuccess: () => {
      toast.success("Store settings saved — the public storefront is updated");
      utils.owner.settings.invalidate();
      utils.owner.audit.invalidate();
    },
    onError: e => toast.error(e.message || "Could not save settings"),
  });

  useEffect(() => {
    if (settings.data && !form) {
      const s = settings.data;
      setForm({ storeName: s.storeName, logoUrl: s.logoUrl, whatsappNumber: s.whatsappNumber, primaryColor: s.primaryColor, accentColor: s.accentColor, heroTitle: s.heroTitle, heroSubtitle: s.heroSubtitle ?? "", heroImageUrl: s.heroImageUrl, instagramUrl: s.instagramUrl ?? "", deliveryFee: String(s.deliveryFee ?? 0) });
    }
  }, [settings.data, form]);

  if (settings.isLoading || !form) return settings.error ? <ErrorPanel retry={() => settings.refetch()} /> : <LoadingPanel label="Loading settings…" />;

  const field = <K extends keyof Form>(key: K, value: Form[K]) => setForm(f => (f ? { ...f, [key]: value } : f));

  const pick = async (kind: "logo" | "hero", file: File | undefined) => {
    if (!file) return;
    const problem = precheckFile(file);
    if (problem) return toast.error(problem);
    setUploading(kind);
    try {
      const result = await upload.mutateAsync({ dataUrl: await toDataUrl(file), filename: file.name, mimeType: file.type, scope: "brand" });
      field(kind === "logo" ? "logoUrl" : "heroImageUrl", result.url);
      toast.success(kind === "logo" ? "Logo uploaded — save to apply" : "Banner uploaded — save to apply");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploading(null);
    }
  };

  const submit = () => {
    if (!/^#[0-9A-Fa-f]{6}$/.test(form.primaryColor) || !/^#[0-9A-Fa-f]{6}$/.test(form.accentColor)) return toast.error("Colours must be #RRGGBB.");
    if (form.whatsappNumber.replace(/\D/g, "").length < 8) return toast.error("Enter a valid WhatsApp number with country code.");
    const deliveryFee = form.deliveryFee.trim() === "" ? 0 : Number(form.deliveryFee);
    if (!Number.isInteger(deliveryFee) || deliveryFee < 0) return toast.error("Delivery fee must be a whole number of EGP (0 = confirmed in chat).");
    save.mutate({ ...form, deliveryFee, instagramUrl: form.instagramUrl.trim() || null });
  };

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <div>
        <p className="eyebrow text-burgundy">Brand controls</p>
        <h1 className="mt-2 font-display text-4xl font-semibold sm:text-5xl">Store settings</h1>
        <p className="mt-2 text-sm text-olive">Changes go live on the public storefront when you save. Last saved {formatDate(settings.data?.updatedAt)}.</p>
      </div>

      <section className="grid gap-5 rounded-[1.75rem] bg-cream p-5 ring-1 ring-ink/10 sm:p-7" aria-labelledby="identity">
        <h2 id="identity" className="font-display text-2xl font-semibold">Identity & contact</h2>
        <div className="grid gap-5 sm:grid-cols-2">
          <div className="grid gap-2">
            <Label htmlFor="s-name">Store name</Label>
            <Input id="s-name" className="min-h-12" value={form.storeName} onChange={e => field("storeName", e.target.value)} maxLength={120} />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="s-wa">WhatsApp number (with country code)</Label>
            <Input id="s-wa" className="min-h-12" inputMode="tel" value={form.whatsappNumber} onChange={e => field("whatsappNumber", e.target.value)} placeholder="2010xxxxxxxx" />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="s-ig">Instagram profile URL (optional)</Label>
            <Input id="s-ig" className="min-h-12" value={form.instagramUrl} onChange={e => field("instagramUrl", e.target.value)} placeholder="https://instagram.com/rekastore" />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="s-fee">Delivery fee (EGP)</Label>
            <Input id="s-fee" className="min-h-12" inputMode="numeric" value={form.deliveryFee} onChange={e => field("deliveryFee", e.target.value.replace(/[^\d]/g, ""))} placeholder="0" />
            <p className="text-xs text-olive">Added to every order total. Leave 0 to tell customers delivery is confirmed in the WhatsApp chat.</p>
          </div>
        </div>
        <div className="grid gap-2">
          <Label>Logo</Label>
          <div className="flex flex-wrap items-center gap-4">
            {form.logoUrl ? <img src={form.logoUrl} alt="Current logo" className="h-16 w-16 rounded-full object-cover ring-1 ring-ink/10" /> : <div className="grid h-16 w-16 place-items-center rounded-full bg-ink font-display text-2xl text-canvas">R</div>}
            <label className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-full border border-ink/30 px-4 text-sm font-semibold hover:bg-canvas focus-within:ring-2 focus-within:ring-burgundy">
              {uploading === "logo" ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4" />} Upload logo
              <input type="file" accept="image/png,image/jpeg,image/webp,image/gif" className="sr-only" disabled={uploading !== null} onChange={e => { pick("logo", e.target.files?.[0]); e.target.value = ""; }} />
            </label>
            {form.logoUrl && (
              <Button variant="ghost" className="min-h-11 rounded-full text-burgundy" onClick={() => field("logoUrl", null)}><X className="h-4 w-4" /> Remove</Button>
            )}
          </div>
        </div>
      </section>

      <section className="grid gap-5 rounded-[1.75rem] bg-cream p-5 ring-1 ring-ink/10 sm:p-7" aria-labelledby="homepage">
        <h2 id="homepage" className="font-display text-2xl font-semibold">Homepage</h2>
        <div className="grid gap-2">
          <Label htmlFor="s-title">Headline</Label>
          <Input id="s-title" className="min-h-12" value={form.heroTitle} onChange={e => field("heroTitle", e.target.value)} maxLength={180} />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="s-sub">Supporting copy</Label>
          <Textarea id="s-sub" rows={3} value={form.heroSubtitle} onChange={e => field("heroSubtitle", e.target.value)} maxLength={500} />
        </div>
        <div className="grid gap-2">
          <Label>Hero / banner image</Label>
          <div className="flex flex-wrap items-center gap-4">
            <div className="aspect-[4/5] w-32 overflow-hidden rounded-2xl bg-clay/40 ring-1 ring-ink/10">
              {form.heroImageUrl ? <img src={form.heroImageUrl} alt="Current hero banner" className="h-full w-full object-cover" /> : <div className="grid h-full place-items-center p-2 text-center text-xs text-olive">Brand illustration shown until you upload</div>}
            </div>
            <div className="flex flex-col gap-2">
              <label className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-full border border-ink/30 px-4 text-sm font-semibold hover:bg-canvas focus-within:ring-2 focus-within:ring-burgundy">
                {uploading === "hero" ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4" />} Upload banner
                <input type="file" accept="image/png,image/jpeg,image/webp,image/gif" className="sr-only" disabled={uploading !== null} onChange={e => { pick("hero", e.target.files?.[0]); e.target.value = ""; }} />
              </label>
              {form.heroImageUrl && <Button variant="ghost" className="min-h-11 rounded-full text-burgundy" onClick={() => field("heroImageUrl", null)}><X className="h-4 w-4" /> Remove</Button>}
              <p className="max-w-xs text-xs text-olive">Portrait crop (4:5) works best. Warm light, cream/clay backgrounds and burgundy accents match the brand.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-5 rounded-[1.75rem] bg-cream p-5 ring-1 ring-ink/10 sm:p-7" aria-labelledby="colours">
        <h2 id="colours" className="font-display text-2xl font-semibold">Colours</h2>
        <div className="grid gap-5 sm:grid-cols-2">
          {(["primaryColor", "accentColor"] as const).map(key => (
            <div key={key} className="grid gap-2">
              <Label htmlFor={`s-${key}`}>{key === "primaryColor" ? "Primary (ink — buttons, headings, footer)" : "Accent (burgundy — badges, WhatsApp, highlights)"}</Label>
              <div className="flex gap-2">
                <input id={`s-${key}`} type="color" value={form[key]} onChange={e => field(key, e.target.value.toUpperCase())} className="h-12 w-14 cursor-pointer rounded-md border border-input bg-transparent p-1" aria-label={`${key} picker`} />
                <Input className="min-h-12 font-mono" value={form[key]} onChange={e => field(key, e.target.value)} maxLength={7} />
              </div>
              <div className="flex gap-2" aria-label="Brand palette">
                {PALETTE.map(c => (
                  <button key={c} type="button" title={c} aria-label={`Use ${c}`} onClick={() => field(key, c)} className="h-8 w-8 rounded-full ring-1 ring-ink/20" style={{ background: c }} />
                ))}
              </div>
            </div>
          ))}
        </div>
        <div className="rounded-2xl p-4 text-sm" style={{ background: "#F4E382", color: form.primaryColor }}>
          Preview — <span className="font-display text-2xl font-semibold">Headline</span> <span className="ml-2 rounded-full px-3 py-1 text-xs font-bold text-[#F4E382]" style={{ background: form.accentColor }}>Accent</span>
        </div>
      </section>

      <div className="sticky bottom-4 flex justify-end">
        <Button size="lg" className="min-h-12 rounded-full px-8 shadow-lg" onClick={submit} disabled={save.isPending || uploading !== null}>
          {save.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Save store settings
        </Button>
      </div>
    </div>
  );
}
