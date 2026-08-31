import { whatsappChatUrl } from "@shared/whatsapp";
import { ArrowRight, ArrowUpRight, MessageCircle, ShieldCheck, Sparkles, Truck } from "lucide-react";
import { Link } from "wouter";
import { HandsArt, PortraitArt } from "./art/BeautyArt";
import { PerfumeBottleArt } from "./art/DeptArt";
import { discountPercent, PriceTag, ProductCard, ProductImage, SectionHead } from "./components";
import { DEPT_VISUALS, DEPARTMENT_LIST } from "./departments";
import { useReveal, useScrollProgress, useTilt } from "./motion";
import type { PublicProduct, PublicSettings } from "./types";

export default function Home({ settings, products, loading }: { settings: PublicSettings; products: PublicProduct[]; loading: boolean }) {
  const offers = products.filter(p => p.originalPrice && !p.isSoldOut);
  const featured = products.filter(p => !p.isSoldOut).slice(0, 4);
  return (
    <>
      <Hero settings={settings} featured={products.slice(0, 3)} />
      <Manifesto />
      <Gateways products={products} />
      <Featured products={featured} loading={loading} />
      {offers.length > 0 && <OffersTeaser offers={offers.slice(0, 3)} />}
      <HowItWorks settings={settings} />
      <Closing settings={settings} />
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Hero — cinematic layered composition                                */
/* ------------------------------------------------------------------ */

function Hero({ settings, featured }: { settings: PublicSettings; featured: PublicProduct[] }) {
  const scene = useTilt<HTMLDivElement>(6);
  const feature = featured.find(p => !p.isSoldOut) ?? featured[0];
  return (
    <section className="relative overflow-hidden pt-28 sm:pt-32 lg:pt-36">
      <div aria-hidden="true" className="pointer-events-none absolute -left-24 top-24 h-72 w-72 rounded-full bg-cream/70 blur-2xl" />
      <div aria-hidden="true" className="pointer-events-none absolute right-[-10%] top-[20%] h-[28rem] w-[28rem] rounded-full bg-clay/30 blur-3xl anim-drift" />
      <div aria-hidden="true" className="pointer-events-none absolute bottom-[-6rem] left-[30%] h-64 w-64 rounded-full bg-burgundy/15 blur-3xl" />

      <div className="container grid items-center gap-12 pb-16 lg:grid-cols-[1fr_1.05fr] lg:gap-8 lg:pb-24">
        <div className="relative z-10 max-w-2xl">
          <p className="eyebrow inline-flex items-center gap-2 rounded-full border border-burgundy/30 bg-cream/50 px-4 py-2 text-burgundy">
            <Sparkles className="h-3.5 w-3.5" aria-hidden="true" /> five departments · one point of view
          </p>
          <h1 className="mt-7 font-display text-[clamp(3.2rem,10vw,8.2rem)] font-medium leading-[.9] tracking-[-0.02em]">
            {settings.heroTitle}
          </h1>
          <p className="mt-7 max-w-md text-lg leading-8 text-olive">{settings.heroSubtitle}</p>
          <div className="mt-9 flex flex-wrap gap-3">
            <a href="#departments" className="btn-ink">
              Choose your ritual <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </a>
            <Link href="/offers" className="btn-outline">
              Browse offers
            </Link>
          </div>
          <dl className="mt-12 grid max-w-md grid-cols-3 gap-4 border-t border-ink/15 pt-6 text-sm">
            {[
              ["Korean → Perfume", "Five departments"],
              ["Prices in EGP", "No surprises"],
              ["Order on WhatsApp", "Confirmed in chat"],
            ].map(([a, b]) => (
              <div key={a}>
                <dt className="font-semibold">{a}</dt>
                <dd className="text-olive">{b}</dd>
              </div>
            ))}
          </dl>
        </div>

        {/* layered 3D composition */}
        <div ref={scene} className="scene relative mx-auto aspect-[4/5] w-full max-w-[560px] sm:aspect-[5/5] lg:aspect-[4/5]">
          <div className="plane absolute inset-x-[6%] top-[4%] bottom-[10%] overflow-hidden rounded-[2.2rem] bg-clay shadow-[0_50px_80px_-40px_rgba(49,14,16,.6)] ring-1 ring-ink/10" data-depth="0.6">
            <div className="brand-tone relative h-full w-full">
              {settings.heroImageUrl ? (
                <img src={settings.heroImageUrl} alt={`${settings.storeName} — featured beauty portrait`} className="h-full w-full object-cover" loading="eager" fetchPriority="high" />
              ) : (
                <PortraitArt title="Illustrated portrait of a woman applying burgundy lipstick, lit warm on a golden canvas" className="h-full w-full" />
              )}
            </div>
          </div>
          <figure className="plane absolute -left-1 bottom-[2%] w-[42%] overflow-hidden rounded-[1.5rem] bg-canvas p-2 shadow-[0_30px_60px_-30px_rgba(49,14,16,.65)] ring-1 ring-ink/10" data-depth="1.4">
            <div className="aspect-[4/5] overflow-hidden rounded-[1.1rem]">
              <PerfumeBottleArt title="Illustration of a woman's perfume bottle in amber glass" className="h-full w-full" />
            </div>
            <figcaption className="px-2 pb-1 pt-2 text-xs font-semibold">Perfume edit</figcaption>
          </figure>
          <div className="plane absolute right-[-2%] top-[8%] h-[26%] w-[26%] overflow-hidden rounded-full ring-4 ring-canvas shadow-[0_24px_40px_-20px_rgba(49,14,16,.6)] anim-float" data-depth="1.8">
            <HandsArt title="Illustration of a hand applying a skincare serum" className="h-full w-full" />
          </div>
          {feature ? (
            <Link href={`/product/${feature.slug}`} className="plane panel absolute right-[2%] bottom-[-3%] flex w-[54%] items-center gap-3 p-3 text-left sm:w-[48%]" data-depth="1.1" aria-label={`Open ${feature.name}`}>
              <span className="h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-clay">
                <ProductImage product={feature} eager />
              </span>
              <span className="min-w-0">
                <span className="block truncate text-sm font-semibold">{feature.name}</span>
                <span className="block text-xs text-olive">{feature.isSoldOut ? "Sold out" : <PriceTag product={feature} />}</span>
              </span>
              <ArrowUpRight className="ml-auto h-4 w-4 shrink-0 text-burgundy" aria-hidden="true" />
            </Link>
          ) : (
            <div className="plane panel absolute right-[2%] bottom-[-3%] w-[48%] p-3" data-depth="1.1">
              <p className="text-xs font-semibold uppercase tracking-[.2em] text-burgundy">New edit</p>
              <p className="font-display text-xl">Arriving soon</p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Manifesto marquee                                                   */
/* ------------------------------------------------------------------ */

const WORDS = ["Korean skincare", "French skincare", "Makeup", "Perfumes", "Honest offers", "Real prices"];

function Manifesto() {
  const [ref, progress] = useScrollProgress<HTMLElement>();
  const clip = 100 - Math.round(Math.min(1, progress * 1.6) * 100);
  return (
    <section ref={ref} className="relative overflow-hidden bg-ink text-canvas">
      <div className="border-y border-canvas/10 py-3" aria-hidden="true">
        <div className="marquee gap-10 text-sm font-semibold uppercase tracking-[.3em] text-canvas/70">
          {[...WORDS, ...WORDS].map((w, i) => (
            <span key={i} className="flex items-center gap-10">
              {w} <span className="h-1.5 w-1.5 rounded-full bg-burgundy" />
            </span>
          ))}
        </div>
      </div>
      <div className="container grid items-center gap-10 py-20 lg:grid-cols-[1.2fr_.8fr] lg:py-28">
        <div>
          <p className="eyebrow text-canvas/60">Manifesto</p>
          <h2 className="mt-5 font-display text-[clamp(2.4rem,6vw,5.5rem)] font-medium leading-[.98] tracking-tight">
            Beauty that fits the <em className="not-italic" style={{ color: "#F4E382" }}>morning you already have.</em>
          </h2>
          <p className="mt-6 max-w-lg text-base leading-8 text-canvas/75">
            Reka Store is a small, deliberate edit across five departments — skincare from Seoul and Paris, colour, fragrance and honest offers. No noise, no pressure: build your order, then simply send it.
          </p>
        </div>
        <div className="relative mx-auto aspect-[4/5] w-full max-w-sm">
          <div className="absolute inset-0 overflow-hidden rounded-[2rem] ring-1 ring-canvas/15" style={{ clipPath: `inset(${clip}% 0 0 0 round 2rem)`, transition: "clip-path 120ms linear" }}>
            <HandsArt title="Illustration of a hand holding a serum bottle in warm light" className="h-full w-full" />
          </div>
          <div aria-hidden="true" className="absolute -bottom-4 -left-4 h-24 w-24 rounded-full bg-burgundy/80 blur-md" />
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Five department gateways                                            */
/* ------------------------------------------------------------------ */

function Gateways({ products }: { products: PublicProduct[] }) {
  const ref = useReveal<HTMLElement>();
  const counts = new Map<string, number>();
  for (const p of products) {
    const key = p.originalPrice ? "offers" : p.department;
    counts.set(key, (counts.get(key) ?? 0) + 1);
    if (p.originalPrice) counts.set(p.department, (counts.get(p.department) ?? 0) + 1);
  }
  return (
    <section id="departments" ref={ref} className="container scroll-mt-24 py-20 lg:py-28" aria-labelledby="departments-title">
      <div className="reveal flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <SectionHead eyebrow="Choose your ritual" title="Five departments, five moods" id="departments-title" />
        <p className="max-w-sm text-sm leading-7 text-olive">Each department is its own room — its own light, colour and pace. Step into the one closest to today.</p>
      </div>
      <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-6">
        {DEPARTMENT_LIST.map((dept, i) => {
          const visual = DEPT_VISUALS[dept.slug];
          const Art = visual.hero;
          const count = counts.get(dept.slug) ?? 0;
          const span = i < 2 ? "lg:col-span-3" : "lg:col-span-2";
          return (
            <Link
              key={dept.slug}
              href={`/${dept.slug}`}
              className={`reveal group relative block overflow-hidden rounded-[1.75rem] text-left ring-1 ring-ink/10 transition-transform duration-300 hover:-translate-y-1.5 focus-visible:-translate-y-1.5 ${span} ${i % 2 ? "lg:translate-y-6" : ""}`}
              style={{ transitionDelay: `${i * 70}ms` }}
              aria-label={`Enter ${dept.name}`}
            >
              <div className="relative aspect-[4/5] sm:aspect-[5/4]" style={visual.heroStyle}>
                <div className="absolute inset-[8%] overflow-hidden rounded-[1.4rem] opacity-90 transition-transform duration-500 group-hover:scale-[1.03]">
                  <Art title={`${dept.name} — department illustration`} className="h-full w-full" />
                </div>
              </div>
              <div className="absolute inset-x-0 bottom-0 flex items-end justify-between bg-gradient-to-t from-ink/90 via-ink/45 to-transparent p-5 text-canvas">
                <div>
                  <p className="eyebrow text-canvas/70">{String(i + 1).padStart(2, "0")}</p>
                  <p className="font-display text-3xl font-semibold">{dept.name}</p>
                  <p className="text-xs text-canvas/75">{count ? `${count} piece${count === 1 ? "" : "s"}` : dept.tagline}</p>
                </div>
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-canvas text-ink">
                  <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
                </span>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Featured collection                                                 */
/* ------------------------------------------------------------------ */

function Featured({ products, loading }: { products: PublicProduct[]; loading: boolean }) {
  const ref = useReveal<HTMLElement>();
  if (!loading && products.length === 0) return null;
  return (
    <section ref={ref} className="bg-cream/60 py-20 lg:py-28" aria-labelledby="featured-title">
      <div className="container">
        <div className="reveal flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <SectionHead eyebrow="This week" title="The featured edit" id="featured-title" />
          <Link href="/makeup" className="btn-outline">Browse departments</Link>
        </div>
        {loading ? (
          <div className="mt-10 grid gap-x-5 gap-y-10 sm:grid-cols-2 lg:grid-cols-4" aria-busy="true" aria-label="Loading products">
            {[0, 1, 2, 3].map(i => (
              <div key={i} className="animate-pulse">
                <div className="aspect-[4/5] rounded-[1.5rem] bg-clay/40" />
                <div className="mt-4 h-4 w-2/3 rounded bg-clay/40" />
                <div className="mt-2 h-3 w-1/3 rounded bg-clay/30" />
              </div>
            ))}
          </div>
        ) : (
          <ul className="mt-10 grid gap-x-5 gap-y-10 sm:grid-cols-2 lg:grid-cols-4" aria-label={`${products.length} featured products`}>
            {products.map((p, i) => (
              <li key={p.id} className="reveal" style={{ transitionDelay: `${i * 60}ms` }}>
                <ProductCard product={p} eager={i < 4} showDepartment />
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Offers teaser                                                       */
/* ------------------------------------------------------------------ */

function OffersTeaser({ offers }: { offers: PublicProduct[] }) {
  const ref = useReveal<HTMLElement>();
  return (
    <section ref={ref} className="container py-20 lg:py-24" aria-labelledby="offers-teaser-title">
      <div className="reveal relative overflow-hidden rounded-[2.5rem] bg-ink px-6 py-12 text-canvas sm:px-10 lg:px-16 lg:py-16">
        <div aria-hidden="true" className="absolute -right-16 -top-16 h-72 w-72 rounded-full bg-burgundy/50 blur-3xl" />
        <div className="relative grid items-center gap-10 lg:grid-cols-[.9fr_1.1fr]">
          <div>
            <p className="eyebrow text-canvas/60">Honest offers</p>
            <h2 id="offers-teaser-title" className="mt-3 font-display text-[clamp(2.2rem,5vw,4rem)] font-medium leading-[1.02] tracking-tight">
              Real pieces, really reduced.
            </h2>
            <p className="mt-4 max-w-md text-sm leading-7 text-canvas/75">Every strikethrough is a genuine previous price. When an offer has an end date, it's a real one.</p>
            <Link href="/offers" className="mt-7 inline-flex min-h-12 items-center gap-2 rounded-full bg-canvas px-7 text-sm font-semibold text-ink transition-transform hover:-translate-y-0.5">
              Enter the offers room <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>
          <ul className="grid gap-3 sm:grid-cols-3" aria-label="Current offers">
            {offers.map(p => (
              <li key={p.id}>
                <Link href={`/product/${p.slug}`} className="group block overflow-hidden rounded-[1.25rem] bg-canvas/5 ring-1 ring-canvas/15 transition-colors hover:bg-canvas/10">
                  <div className="relative aspect-square overflow-hidden">
                    <ProductImage product={p} className="transition-transform duration-500 group-hover:scale-[1.05]" />
                    <span className="absolute left-2 top-2 rounded-full bg-canvas px-2.5 py-1 text-[11px] font-bold text-ink">−{discountPercent(p)}%</span>
                  </div>
                  <div className="p-3">
                    <p className="truncate text-sm font-semibold">{p.name}</p>
                    <PriceTag product={p} className="text-sm text-canvas [&_s]:text-canvas/50" />
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* How ordering works (trust / clarity)                                */
/* ------------------------------------------------------------------ */

function HowItWorks({ settings }: { settings: PublicSettings }) {
  const ref = useReveal<HTMLElement>();
  const steps = [
    { icon: ShieldCheck, title: "Build your order", text: "Add pieces to your cart and share your delivery details. Nothing is charged on this site." },
    { icon: MessageCircle, title: "Confirm on WhatsApp", text: "Your order opens as a ready message — press send and we confirm availability in chat." },
    { icon: Truck, title: "Transfer, then delivery", text: "We send payment-transfer instructions manually. Once received, your order ships." },
  ];
  return (
    <section ref={ref} className="container py-20 lg:py-24" aria-labelledby="how-title">
      <div className="reveal">
        <SectionHead eyebrow="How it works" title="Ordering is a conversation" text="There is no online payment here — by design. Every order is confirmed personally on WhatsApp." id="how-title" />
      </div>
      <ol className="mt-10 grid gap-4 md:grid-cols-3">
        {steps.map((s, i) => (
          <li key={s.title} className="reveal rounded-[1.75rem] bg-cream p-7 ring-1 ring-ink/10" style={{ transitionDelay: `${i * 80}ms` }}>
            <div className="flex items-center justify-between">
              <span className="grid h-12 w-12 place-items-center rounded-full bg-ink text-canvas">
                <s.icon className="h-5 w-5" aria-hidden="true" />
              </span>
              <span className="font-display text-4xl text-clay">0{i + 1}</span>
            </div>
            <h3 className="mt-5 font-display text-2xl font-semibold">{s.title}</h3>
            <p className="mt-2 text-sm leading-7 text-olive">{s.text}</p>
          </li>
        ))}
      </ol>
      <p className="mt-6 text-center text-xs text-olive">
        Questions first? <a className="font-semibold text-burgundy underline-offset-2 hover:underline" href={whatsappChatUrl(settings.whatsappNumber, `Hi ${settings.storeName}, I have a question before ordering.`)} target="_blank" rel="noopener noreferrer">Message us on WhatsApp</a>.
      </p>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Closing                                                             */
/* ------------------------------------------------------------------ */

function Closing({ settings }: { settings: PublicSettings }) {
  const ref = useReveal<HTMLElement>();
  return (
    <section ref={ref} className="container pb-20 lg:pb-28">
      <div className="reveal relative overflow-hidden rounded-[2.5rem] bg-ink px-6 py-16 text-canvas sm:px-12 lg:px-20 lg:py-24">
        <div aria-hidden="true" className="absolute -right-10 -top-10 h-64 w-64 rounded-full bg-burgundy/60 blur-3xl" />
        <div aria-hidden="true" className="absolute -bottom-16 left-1/3 h-56 w-56 rounded-full bg-clay/40 blur-3xl" />
        <div className="relative grid items-center gap-10 lg:grid-cols-[1fr_.6fr]">
          <div>
            <p className="eyebrow text-canvas/60">Say hello</p>
            <h2 className="mt-4 font-display text-[clamp(2.6rem,6vw,5.5rem)] font-medium leading-[.95] tracking-tight">Tell us what you're looking for. We'll point you to the right room.</h2>
            <div className="mt-8 flex flex-wrap gap-3">
              <a href={whatsappChatUrl(settings.whatsappNumber, `Hi ${settings.storeName}, I'd like some help choosing.`)} target="_blank" rel="noopener noreferrer" className="btn-wa">
                <MessageCircle className="h-4 w-4" aria-hidden="true" /> Chat on WhatsApp
              </a>
              <a href="#departments" className="btn-outline border-canvas/40 text-canvas hover:bg-canvas/10">
                Back to departments
              </a>
            </div>
          </div>
          <div className="mx-auto h-56 w-56 overflow-hidden rounded-full ring-4 ring-canvas/20 anim-float-slow sm:h-72 sm:w-72">
            <PerfumeBottleArt title="Amber perfume bottle illustration" className="h-full w-full" />
          </div>
        </div>
      </div>
    </section>
  );
}
