import { whatsappChatUrl } from "@shared/whatsapp";
import { DEPARTMENT_LIST } from "@shared/departments";
import { Instagram, Menu, MessageCircle, ShoppingBag, X } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import { useCart } from "./cart";
import type { PublicSettings } from "./types";

/* ------------------------------------------------------------------ */
/* Global navigation                                                   */
/* ------------------------------------------------------------------ */

export function Nav({ settings }: { settings: PublicSettings }) {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [location] = useLocation();
  const cart = useCart();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Close the mobile menu on navigation.
  useEffect(() => setOpen(false), [location]);

  const links = [
    { href: "/", label: "Home" },
    ...DEPARTMENT_LIST.map(dept => ({ href: `/${dept.slug}`, label: dept.shortName })),
  ];

  return (
    <header className="fixed inset-x-0 top-0 z-50 px-3 pt-3 sm:px-5 sm:pt-4">
      <div className={`mx-auto flex max-w-[1320px] items-center justify-between gap-2 rounded-full px-3 py-2 transition-[background-color,box-shadow] duration-300 sm:px-4 ${scrolled || open ? "bg-cream/90 shadow-[0_18px_40px_-24px_rgba(49,14,16,.5)] ring-1 ring-ink/10 backdrop-blur-xl" : "bg-cream/60 ring-1 ring-ink/5 backdrop-blur-md"}`}>
        <Link href="/" className="flex items-center gap-2.5 sm:gap-3" aria-label={`${settings.storeName} home`}>
          {settings.logoUrl ? (
            <img src={settings.logoUrl} alt="" className="h-10 w-10 rounded-full object-cover ring-1 ring-ink/10" />
          ) : (
            <span className="grid h-10 w-10 place-items-center rounded-full bg-ink font-display text-xl font-semibold text-canvas">R</span>
          )}
          <span className="font-display text-xl font-semibold tracking-tight sm:text-2xl">{settings.storeName}</span>
        </Link>

        <nav aria-label="Departments" className="hidden items-center gap-1 text-sm font-semibold lg:flex">
          {links.map(l => {
            const active = location === l.href;
            return (
              <Link key={l.href} href={l.href} aria-current={active ? "page" : undefined} className={`rounded-full px-3.5 py-2 transition-colors ${active ? "bg-ink text-canvas" : "hover:text-burgundy"}`}>
                {l.label}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-1.5">
          <a href={whatsappChatUrl(settings.whatsappNumber, `Hi ${settings.storeName}, I have a question.`)} target="_blank" rel="noopener noreferrer" aria-label="Chat on WhatsApp" className="hidden h-11 w-11 place-items-center rounded-full border border-ink/20 text-ink transition-colors hover:bg-burgundy hover:text-canvas sm:grid">
            <MessageCircle className="h-5 w-5" aria-hidden="true" />
          </a>
          <Link href="/cart" aria-label={`Open cart, ${cart.count} item${cart.count === 1 ? "" : "s"}`} className="relative grid h-11 w-11 place-items-center rounded-full bg-ink text-canvas transition-colors hover:bg-burgundy">
            <ShoppingBag className="h-5 w-5" aria-hidden="true" />
            {cart.count > 0 && (
              <span className="absolute -right-1 -top-1 grid min-h-5 min-w-5 place-items-center rounded-full bg-burgundy px-1 text-[11px] font-bold text-canvas ring-2 ring-cream" aria-hidden="true">
                {cart.count > 99 ? "99+" : cart.count}
              </span>
            )}
          </Link>
          <button type="button" aria-expanded={open} aria-controls="mobile-menu" onClick={() => setOpen(v => !v)} className="grid h-11 w-11 place-items-center rounded-full border border-ink/20 text-ink lg:hidden">
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            <span className="sr-only">{open ? "Close menu" : "Open menu"}</span>
          </button>
        </div>
      </div>

      {open && (
        <div id="mobile-menu" className="mx-auto mt-2 max-w-[1320px] rounded-[1.5rem] bg-cream p-3 shadow-[0_24px_50px_-24px_rgba(49,14,16,.5)] ring-1 ring-ink/10 lg:hidden">
          <nav aria-label="Mobile" className="grid gap-1">
            {links.map(l => (
              <Link key={l.href} href={l.href} className={`rounded-2xl px-4 py-3 text-base font-semibold ${location === l.href ? "bg-ink text-canvas" : "hover:bg-canvas"}`}>
                {l.label}
              </Link>
            ))}
            <Link href="/cart" className="rounded-2xl px-4 py-3 text-base font-semibold hover:bg-canvas">
              Cart {cart.count > 0 ? `(${cart.count})` : ""}
            </Link>
            <a href={whatsappChatUrl(settings.whatsappNumber)} target="_blank" rel="noopener noreferrer" className="btn-wa mt-2">
              <MessageCircle className="h-4 w-4" aria-hidden="true" /> Ask on WhatsApp
            </a>
          </nav>
        </div>
      )}
    </header>
  );
}

/* ------------------------------------------------------------------ */
/* Footer                                                              */
/* ------------------------------------------------------------------ */

export function Footer({ settings }: { settings: PublicSettings }) {
  return (
    <footer id="contact" className="scroll-mt-24 border-t border-ink/10 bg-canvas">
      <div className="container flex flex-col justify-between gap-8 py-12 md:flex-row md:items-start">
        <div>
          <p className="font-display text-4xl font-semibold">{settings.storeName}</p>
          <p className="mt-2 max-w-sm text-sm leading-7 text-olive">
            A women's beauty edit across five departments. Prices in EGP. Orders are confirmed on WhatsApp and payment instructions are sent manually — no online payment happens on this site.
          </p>
        </div>
        <nav aria-label="Departments" className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm font-semibold sm:grid-cols-3">
          {DEPARTMENT_LIST.map(dept => (
            <Link key={dept.slug} href={`/${dept.slug}`} className="inline-flex min-h-10 items-center hover:text-burgundy">
              {dept.name}
            </Link>
          ))}
          <Link href="/cart" className="inline-flex min-h-10 items-center hover:text-burgundy">Cart</Link>
        </nav>
        <nav aria-label="Contact" className="flex flex-wrap items-center gap-5 text-sm font-semibold">
          <a href={whatsappChatUrl(settings.whatsappNumber)} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center gap-2 hover:text-burgundy">
            <MessageCircle className="h-4 w-4" aria-hidden="true" /> WhatsApp
          </a>
          {settings.instagramUrl && (
            <a href={settings.instagramUrl} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center gap-2 hover:text-burgundy">
              <Instagram className="h-4 w-4" aria-hidden="true" /> Instagram
            </a>
          )}
        </nav>
      </div>
      <div className="container border-t border-ink/10 py-5 text-xs text-olive">
        © {new Date().getFullYear()} {settings.storeName}. Illustrations are original brand artwork.
      </div>
    </footer>
  );
}
