import ErrorBoundary from "@/components/ErrorBoundary";
import { Toaster } from "@/components/ui/sonner";
import { trpc } from "@/lib/trpc";
import { isDepartmentSlug } from "@shared/departments";
import { useEffect, type CSSProperties } from "react";
import { Link, Route, Switch, useLocation } from "wouter";
import { CartProvider } from "./cart";
import CartPage from "./CartPage";
import CheckoutPage from "./CheckoutPage";
import { Footer, Nav } from "./chrome";
import DepartmentPage from "./DepartmentPage";
import Home from "./Home";
import OrderStatusPage from "./OrderStatusPage";
import ProductPage from "./ProductPage";
import type { PublicSettings } from "./types";

/* ------------------------------------------------------------------ */
/* Defaults (used before settings load / when the API is unavailable)   */
/* ------------------------------------------------------------------ */

const DEFAULTS: PublicSettings = {
  storeName: "Reka Store",
  logoUrl: null,
  whatsappNumber: "201000000000",
  primaryColor: "#310E10",
  accentColor: "#74070E",
  heroTitle: "Beauty, your way",
  heroSubtitle: "Five departments, one point of view — skincare from Seoul and Paris, colour, fragrance and honest offers.",
  heroImageUrl: null,
  instagramUrl: null,
  deliveryFee: 0,
  updatedAt: new Date(0),
};

/* ------------------------------------------------------------------ */
/* App shell: routes for home, five departments, product, cart,        */
/* checkout and public order status                                     */
/* ------------------------------------------------------------------ */

export default function StorefrontApp() {
  const settingsQuery = trpc.storefront.settings.useQuery();
  const productsQuery = trpc.storefront.products.useQuery();

  const settings = settingsQuery.data ?? DEFAULTS;
  const products = productsQuery.data ?? [];
  const loading = productsQuery.isLoading;
  const error = Boolean(productsQuery.error);
  const retry = () => {
    settingsQuery.refetch();
    productsQuery.refetch();
  };

  const theme = {
    "--reka-ink": settings.primaryColor,
    "--reka-burgundy": settings.accentColor,
  } as CSSProperties;

  const [location] = useLocation();
  useEffect(() => {
    if (location === "/") document.title = `${settings.storeName} — ${settings.heroTitle}`;
  }, [location, settings.storeName, settings.heroTitle]);

  const shared = { settings, products, loading, error, retry };

  return (
    <ErrorBoundary>
      <CartProvider>
        <div dir="ltr" style={theme} className="min-h-screen bg-canvas text-ink">
          <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-full focus:bg-ink focus:px-4 focus:py-2 focus:text-canvas">
            Skip to content
          </a>
          <Nav settings={settings} />
          <main id="main">
            <Switch>
              <Route path="/">
                <Home settings={settings} products={products} loading={loading} />
              </Route>
              <Route path="/product/:slug">{params => <ProductPage slug={params.slug} {...shared} />}</Route>
              <Route path="/cart">
                <CartPage settings={settings} products={products} loading={loading} />
              </Route>
              <Route path="/checkout">
                <CheckoutPage settings={settings} products={products} loading={loading} />
              </Route>
              <Route path="/order/:reference">{params => <OrderStatusPage reference={params.reference} settings={settings} />}</Route>
              <Route path="/:department">
                {params =>
                  isDepartmentSlug(params.department) ? (
                    <DepartmentPage slug={params.department} {...shared} />
                  ) : (
                    <NotFound />
                  )
                }
              </Route>
              <Route>
                <NotFound />
              </Route>
            </Switch>
          </main>
          <Footer settings={settings} />
          <Toaster position="bottom-center" />
        </div>
      </CartProvider>
    </ErrorBoundary>
  );
}

function NotFound() {
  useEffect(() => {
    document.title = "Page not found — Reka Store";
  }, []);
  return (
    <div className="container pt-36 pb-24 text-center">
      <p className="eyebrow text-burgundy">404</p>
      <h1 className="mt-3 font-display text-6xl font-medium">This page wandered off.</h1>
      <p className="mx-auto mt-4 max-w-sm text-sm leading-7 text-olive">The five departments are still exactly where you left them.</p>
      <Link href="/" className="btn-ink mt-7">Back to the homepage</Link>
    </div>
  );
}
