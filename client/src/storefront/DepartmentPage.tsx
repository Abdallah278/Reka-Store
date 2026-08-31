import { whatsappChatUrl } from "@shared/whatsapp";
import { ArrowDown, MessageCircle, RefreshCw, Sparkles } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { DEPARTMENTS, type DepartmentSlug } from "@shared/departments";
import { EmptyCollection, ProductCard, SectionHead } from "./components";
import { DEPT_VISUALS } from "./departments";
import { useReveal, useScrollProgress } from "./motion";
import type { PublicProduct, PublicSettings } from "./types";

type Props = {
  slug: DepartmentSlug;
  settings: PublicSettings;
  products: PublicProduct[];
  loading: boolean;
  error: boolean;
  retry: () => void;
};

/**
 * Department page engine. Each of the five departments renders through this
 * with its own colour identity, artwork, motion class, categories, ritual and
 * editorial content — a genuinely distinct page per route.
 */
export default function DepartmentPage({ slug, settings, products, loading, error, retry }: Props) {
  const dept = DEPARTMENTS[slug];
  const visual = DEPT_VISUALS[slug];
  const isOffers = slug === "offers";

  const deptProducts = useMemo(
    () => (isOffers ? products.filter(p => p.originalPrice != null) : products.filter(p => p.department === slug)),
    [products, slug, isOffers]
  );

  const [category, setCategory] = useState("All");
  useEffect(() => setCategory("All"), [slug]);
  useEffect(() => {
    document.title = `${dept.name} — ${settings.storeName}`;
    window.scrollTo({ top: 0, behavior: "auto" });
  }, [slug, dept.name, settings.storeName]);

  const chips = useMemo(() => {
    const present = new Set(deptProducts.map(p => p.categoryName));
    const configured = dept.categories.filter(c => present.has(c));
    const extra = Array.from(present).filter(c => !dept.categories.includes(c) && c !== "Uncategorised");
    return ["All", ...configured, ...extra];
  }, [deptProducts, dept.categories]);

  const filtered = category === "All" ? deptProducts : deptProducts.filter(p => p.categoryName === category);
  const dark = visual.dark;

  return (
    <div style={{ ["--dept" as string]: dept.color }}>
      <DeptHero slug={slug} settings={settings} count={deptProducts.length} />
      {slug === "perfumes" && <ScrollBottle />}

      {/* Collection */}
      <section id="collection" className={`scroll-mt-24 py-12 lg:py-16 ${isOffers ? "bg-ink" : ""}`} aria-labelledby="collection-title">
        <div className="container">
          <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
            <SectionHead
              eyebrow={isOffers ? "Active offers" : "The collection"}
              title={isOffers ? "On offer right now" : `The ${dept.shortName.toLowerCase()} edit`}
              tone={isOffers ? "dark" : "light"}
              id="collection-title"
            />
            {chips.length > 1 && (
              <div role="group" aria-label="Filter by category" className="no-scrollbar flex gap-2 overflow-x-auto pb-1">
                {chips.map(name => (
                  <button
                    key={name}
                    type="button"
                    aria-pressed={category === name}
                    onClick={() => setCategory(name)}
                    className={`min-h-11 shrink-0 rounded-full px-5 text-sm font-semibold transition ${
                      category === name
                        ? isOffers ? "bg-canvas text-ink" : "bg-ink text-canvas"
                        : isOffers ? "border border-canvas/30 text-canvas/85 hover:border-canvas" : "border border-olive/30 bg-canvas/50 hover:border-burgundy"
                    }`}
                  >
                    {name}
                  </button>
                ))}
              </div>
            )}
          </div>

          {error ? (
            <div role="alert" className={`mt-10 rounded-[1.5rem] border p-8 text-center ${isOffers ? "border-canvas/25 text-canvas" : "border-burgundy/30 bg-burgundy/10"}`}>
              <p className="font-display text-3xl">We couldn't load this department.</p>
              <p className={`mt-2 text-sm ${isOffers ? "text-canvas/70" : "text-olive"}`}>Check your connection and try again.</p>
              <button type="button" onClick={retry} className={`mt-5 inline-flex min-h-12 items-center gap-2 rounded-full px-6 text-sm font-semibold ${isOffers ? "bg-canvas text-ink" : "bg-ink text-canvas"}`}>
                <RefreshCw className="h-4 w-4" aria-hidden="true" /> Try again
              </button>
            </div>
          ) : loading ? (
            <div className="mt-10 grid gap-x-5 gap-y-10 sm:grid-cols-2 lg:grid-cols-4" aria-busy="true" aria-label="Loading products">
              {[0, 1, 2, 3].map(i => (
                <div key={i} className="animate-pulse">
                  <div className={`aspect-[4/5] rounded-[1.5rem] ${isOffers ? "bg-canvas/10" : "bg-clay/40"}`} />
                  <div className={`mt-4 h-4 w-2/3 rounded ${isOffers ? "bg-canvas/10" : "bg-clay/40"}`} />
                </div>
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <EmptyCollection
              tone={isOffers ? "dark" : "light"}
              note={
                isOffers
                  ? "No offers are running at the moment — and we won't invent one. Check back soon or browse the departments at full price."
                  : deptProducts.length
                    ? "Nothing in this category yet. Try another chip."
                    : `The ${dept.name} edit is being curated. Ask us on WhatsApp and we'll tell you what's coming.`
              }
            />
          ) : (
            <ul className="mt-10 grid gap-x-5 gap-y-10 sm:grid-cols-2 lg:grid-cols-4" aria-label={`${filtered.length} products`}>
              {filtered.map((p, i) => (
                <li key={p.id} className="anim-rise" style={{ animationDelay: `${Math.min(i, 8) * 70}ms` }}>
                  <ProductCard product={p} eager={i < 4} tone={isOffers ? "dark" : "light"} showDepartment={isOffers} />
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      <Ritual slug={slug} />
      <Editorial slug={slug} />

      {/* CTA */}
      <section className="container pb-14 lg:pb-20">
        <div className="relative overflow-hidden rounded-[2.5rem] px-6 py-14 text-canvas sm:px-12" style={visual.heroStyle}>
          <div aria-hidden="true" className="absolute -right-12 -top-12 h-56 w-56 rounded-full bg-canvas/10 blur-2xl" />
          <div className={`relative flex flex-col items-start gap-6 md:flex-row md:items-center md:justify-between ${dark ? "" : "text-ink"}`}>
            <div>
              <p className={`eyebrow ${dark ? "text-canvas/70" : "text-ink/60"}`}>{dept.name}</p>
              <h2 className="mt-2 font-display text-[clamp(2rem,4.5vw,3.5rem)] font-medium leading-tight tracking-tight">Not sure where to start? Just ask.</h2>
            </div>
            <a
              href={whatsappChatUrl(settings.whatsappNumber, `Hi ${settings.storeName}, I'd love a ${dept.name} recommendation.`)}
              target="_blank"
              rel="noopener noreferrer"
              className={`inline-flex min-h-12 shrink-0 items-center gap-2 rounded-full px-7 text-sm font-semibold transition-transform hover:-translate-y-0.5 ${dark ? "bg-canvas text-ink" : "bg-ink text-canvas"}`}
            >
              <MessageCircle className="h-4 w-4" aria-hidden="true" /> Ask on WhatsApp
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Hero                                                                */
/* ------------------------------------------------------------------ */

function DeptHero({ slug, settings, count }: { slug: DepartmentSlug; settings: PublicSettings; count: number }) {
  const dept = DEPARTMENTS[slug];
  const visual = DEPT_VISUALS[slug];
  const Art = visual.hero;
  const Motif = visual.motif;
  const dark = visual.dark;
  return (
    <section className="px-3 pt-24 sm:px-5 sm:pt-28" aria-labelledby="dept-title">
      <div className="relative mx-auto max-w-[1320px] overflow-hidden rounded-[2.5rem] ring-1 ring-ink/10" style={visual.heroStyle}>
        <div aria-hidden="true" className="pointer-events-none absolute -left-20 bottom-0 h-72 w-72 rounded-full bg-canvas/10 blur-3xl anim-ripple" />
        <div className={`relative grid items-center gap-8 px-6 py-12 sm:px-10 lg:grid-cols-[1.05fr_.95fr] lg:px-16 lg:py-20 ${dark ? "text-canvas" : "text-ink"}`}>
          <div>
            <p className={`eyebrow inline-flex items-center gap-2 rounded-full border px-4 py-2 ${dark ? "border-canvas/30 text-canvas/85" : "border-ink/25 text-ink/75"}`}>
              <Sparkles className="h-3.5 w-3.5" aria-hidden="true" /> {visual.eyebrow}
            </p>
            <h1 id="dept-title" className="mt-5 font-display text-[clamp(2.4rem,6vw,4.6rem)] font-medium leading-[.94] tracking-[-0.02em]">
              {dept.name}
            </h1>
            <p className={`mt-3 font-display text-2xl italic ${dark ? "text-canvas/80" : "text-ink/70"}`}>{dept.tagline}</p>
            <p className={`mt-5 max-w-md text-base leading-8 ${dark ? "text-canvas/75" : "text-ink/70"}`}>{dept.intro}</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <a href="#collection" className={`inline-flex min-h-12 items-center gap-2 rounded-full px-7 text-sm font-semibold transition-transform hover:-translate-y-0.5 ${dark ? "bg-canvas text-ink" : "bg-ink text-canvas"}`}>
                Browse {count ? `${count} piece${count === 1 ? "" : "s"}` : "the edit"} <ArrowDown className="h-4 w-4" aria-hidden="true" />
              </a>
              <a
                href={whatsappChatUrl(settings.whatsappNumber, `Hi ${settings.storeName}, tell me about ${dept.name}.`)}
                target="_blank"
                rel="noopener noreferrer"
                className={`inline-flex min-h-12 items-center gap-2 rounded-full border px-7 text-sm font-semibold ${dark ? "border-canvas/40 hover:bg-canvas/10" : "border-ink/40 hover:bg-ink/5"}`}
              >
                <MessageCircle className="h-4 w-4" aria-hidden="true" /> WhatsApp
              </a>
            </div>
            {dept.categories.length > 0 && (
              <ul className="mt-9 flex flex-wrap gap-2" aria-label={`${dept.name} categories`}>
                {dept.categories.map(c => (
                  <li key={c} className={`rounded-full border px-4 py-2 text-xs font-semibold uppercase tracking-[.14em] ${dark ? "border-canvas/25 text-canvas/80" : "border-ink/25 text-ink/70"}`}>
                    {c}
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div className="relative mx-auto w-full max-w-[440px]">
            <div className={`relative aspect-[4/5] overflow-hidden rounded-[2rem] shadow-[0_50px_90px_-40px_rgba(49,14,16,.7)] ring-1 ${dark ? "ring-canvas/20" : "ring-ink/15"} ${slug === "french-skincare" ? "anim-sheen" : ""}`}>
              <div className={`h-full w-full ${visual.motifAnim}`}>
                <Art title={`${dept.name} — hero illustration`} className="h-full w-full" />
              </div>
            </div>
            <div className={`absolute -bottom-6 -left-4 hidden w-[42%] overflow-hidden rounded-[1.4rem] p-1.5 shadow-[0_30px_50px_-25px_rgba(49,14,16,.7)] ring-1 sm:block ${dark ? "bg-canvas ring-ink/10" : "bg-ink ring-canvas/20"}`}>
              <div className="aspect-square overflow-hidden rounded-[1.1rem]">
                <Motif title={`${dept.name} — texture illustration`} className="h-full w-full" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Perfume scroll bottle — moves through the viewport as you scroll    */
/* ------------------------------------------------------------------ */

function ScrollBottle() {
  const [ref, progress] = useScrollProgress<HTMLDivElement>();
  const y = (progress - 0.5) * 260;
  const rotate = (progress - 0.5) * 40;
  const notes = [
    { label: "Top", note: "Bergamot · pink pepper", at: 0.25 },
    { label: "Heart", note: "Rose · orris · clay musk", at: 0.5 },
    { label: "Base", note: "Amber · cedar · deep ink", at: 0.75 },
  ];
  return (
    <div ref={ref} aria-hidden="true" className="pointer-events-none relative mx-auto hidden h-40 max-w-[1320px] lg:block">
      <div
        className="absolute left-1/2 top-1/2 w-40 -translate-x-1/2 -translate-y-1/2 opacity-90 drop-shadow-[0_30px_40px_rgba(49,14,16,.4)]"
        style={{ transform: `translate(-50%,-50%) translateY(${y.toFixed(0)}px) rotate(${rotate.toFixed(1)}deg)`, transition: "transform 90ms linear" }}
      >
        <svg viewBox="0 0 160 220" className="w-full">
          <polygon points="40,70 120,70 140,110 140,190 20,190 20,110" fill="#947268" />
          <polygon points="40,70 80,70 80,190 20,190 20,110" fill="#F4E3B2" opacity=".3" />
          <rect x="58" y="38" width="44" height="34" rx="6" fill="#310E10" />
          <rect x="68" y="14" width="24" height="28" rx="8" fill="#F4E3B2" />
        </svg>
      </div>
      {notes.map((n, i) => (
        <div
          key={n.label}
          className="absolute top-1/2 -translate-y-1/2 text-xs"
          style={{ left: `${12 + i * 32}%`, opacity: Math.max(0, 1 - Math.abs(progress - n.at) * 4) }}
        >
          <p className="eyebrow text-burgundy">{n.label} notes</p>
          <p className="mt-1 font-display text-xl text-ink">{n.note}</p>
        </div>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Ritual + editorial                                                  */
/* ------------------------------------------------------------------ */

function Ritual({ slug }: { slug: DepartmentSlug }) {
  const visual = DEPT_VISUALS[slug];
  const ref = useReveal<HTMLElement>();
  return (
    <section ref={ref} className="container py-12 lg:py-16" aria-labelledby="ritual-title">
      <div className="reveal">
        <SectionHead eyebrow={DEPARTMENTS[slug].name} title={visual.ritualTitle} id="ritual-title" />
      </div>
      <ol className="mt-10 grid gap-4 md:grid-cols-3">
        {visual.ritual.map((r, i) => (
          <li key={r.step} className="reveal rounded-[1.75rem] bg-cream p-7 ring-1 ring-ink/10" style={{ transitionDelay: `${i * 80}ms` }}>
            <span className="font-display text-5xl" style={{ color: "var(--dept)" }}>{r.step}</span>
            <h3 className="mt-4 font-display text-2xl font-semibold">{r.title}</h3>
            <p className="mt-2 text-sm leading-7 text-olive">{r.text}</p>
          </li>
        ))}
      </ol>
      <p className="mt-4 text-xs text-olive">General care notes only — not medical advice.</p>
    </section>
  );
}

function Editorial({ slug }: { slug: DepartmentSlug }) {
  const visual = DEPT_VISUALS[slug];
  const ref = useReveal<HTMLElement>();
  return (
    <section ref={ref} className="container pb-4" aria-label={`${DEPARTMENTS[slug].name} editorial`}>
      <div className="grid gap-5 md:grid-cols-2">
        {visual.editorial.map((e, i) => (
          <article key={e.title} className="reveal group relative overflow-hidden rounded-[1.75rem] ring-1 ring-ink/10" style={{ transitionDelay: `${i * 90}ms` }}>
            <div className="brand-tone relative aspect-[16/10]">
              <e.art title={`${e.title} — editorial illustration`} className="h-full w-full transition-transform duration-500 group-hover:scale-[1.03]" />
            </div>
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-ink/90 via-ink/50 to-transparent p-6 text-canvas">
              <p className="eyebrow text-canvas/70">{e.eyebrow}</p>
              <h3 className="mt-1 font-display text-3xl font-semibold">{e.title}</h3>
              <p className="mt-1 max-w-md text-sm leading-6 text-canvas/85">{e.text}</p>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
