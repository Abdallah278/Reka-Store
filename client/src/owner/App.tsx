import { useAuth } from "@/_core/hooks/useAuth";
import ErrorBoundary from "@/components/ErrorBoundary";
import { Toaster } from "@/components/ui/sonner";
import { errorCode } from "@/lib/trpcClient";
import { useQueryClient } from "@tanstack/react-query";
import { History, LogOut, Package, Settings2, ShieldCheck, ShoppingBag, Star } from "lucide-react";
import { useEffect, type ReactNode } from "react";
import { Link, Route, Router, Switch, useLocation } from "wouter";
import AuditPage from "./AuditPage";
import OrdersPage from "./OrdersPage";
import ProductsPage from "./ProductsPage";
import ReviewsPage from "./ReviewsPage";
import SettingsPage from "./SettingsPage";
import { ExpiredPanel, ForbiddenPanel, LoadingPanel, SignInPanel } from "./ui";

/** Single-host mode serves the console under /manage; on its own hostname it lives at /. */
const BASE = typeof window !== "undefined" && window.location.pathname.startsWith("/manage") ? "/manage" : "";

const NAV = [
  { href: "/", label: "Orders", icon: ShoppingBag },
  { href: "/products", label: "Products", icon: Package },
  { href: "/reviews", label: "Reviews", icon: Star },
  { href: "/settings", label: "Store settings", icon: Settings2 },
  { href: "/audit", label: "Audit history", icon: History },
];

export default function OwnerApp() {
  return (
    <ErrorBoundary>
      <Router base={BASE}>
        <Gate />
      </Router>
      <Toaster position="top-right" />
    </ErrorBoundary>
  );
}

/**
 * UI gate only. The real check is `ownerProcedure` on the server: even if this
 * component were bypassed, every owner query/mutation would still be refused.
 */
function Gate() {
  const auth = useAuth();
  const queryClient = useQueryClient();

  // Any UNAUTHORIZED from a private call means the session ended: show the
  // expired state instead of silently failing.
  useEffect(() => {
    const unsubQ = queryClient.getQueryCache().subscribe(e => {
      if (e.type === "updated" && e.action.type === "error" && errorCode(e.query.state.error) === "UNAUTHORIZED") auth.markExpired();
    });
    const unsubM = queryClient.getMutationCache().subscribe(e => {
      if (e.type === "updated" && e.action.type === "error" && errorCode(e.mutation.state.error) === "UNAUTHORIZED") auth.markExpired();
    });
    return () => {
      unsubQ();
      unsubM();
    };
  }, [queryClient, auth]);

  if (auth.loading) return <Shell minimal><LoadingPanel label="Checking your session…" /></Shell>;
  if (auth.expired) return <Shell minimal><ExpiredPanel signIn={auth.signIn} /></Shell>;
  if (!auth.isAuthenticated) return <Shell minimal><SignInPanel signIn={auth.signIn} /></Shell>;
  if (!auth.isOwner) return <Shell minimal><ForbiddenPanel logout={auth.logout} name={auth.user?.name} /></Shell>;

  return (
    <Shell name={auth.user?.name} logout={auth.logout}>
      <Switch>
        <Route path="/" component={OrdersPage} />
        <Route path="/products" component={ProductsPage} />
        <Route path="/reviews" component={ReviewsPage} />
        <Route path="/settings" component={SettingsPage} />
        <Route path="/audit" component={AuditPage} />
        <Route>
          <div className="p-8 text-olive">Page not found. <Link href="/" className="underline">Back to orders</Link></div>
        </Route>
      </Switch>
    </Shell>
  );
}

function Shell({ children, minimal = false, name, logout }: { children: ReactNode; minimal?: boolean; name?: string; logout?: () => void }) {
  const [location] = useLocation();
  return (
    <div dir="ltr" className="min-h-screen bg-canvas text-ink lg:grid lg:grid-cols-[272px_1fr]">
      <aside className="flex flex-col bg-ink text-canvas lg:min-h-screen">
        <div className="flex items-center gap-3 px-5 py-5 lg:py-6">
          <span className="grid h-10 w-10 place-items-center rounded-full bg-canvas font-display text-xl font-semibold text-ink">R</span>
          <div className="min-w-0">
            <p className="font-display text-xl font-semibold leading-tight">Reka Store</p>
            <p className="flex items-center gap-1 text-[11px] uppercase tracking-[.2em] text-canvas/60">
              <ShieldCheck className="h-3 w-3" aria-hidden="true" /> Owner console
            </p>
          </div>
        </div>
        {!minimal && (
          <>
            <nav aria-label="Console" className="no-scrollbar flex gap-1 overflow-x-auto px-3 pb-3 lg:flex-col lg:px-3">
              {NAV.map(item => {
                const active = location === item.href;
                return (
                  <Link key={item.href} href={item.href} aria-current={active ? "page" : undefined} className={`flex min-h-12 shrink-0 items-center gap-3 rounded-2xl px-4 text-sm font-semibold transition ${active ? "bg-canvas text-ink" : "text-canvas/80 hover:bg-canvas/10 hover:text-canvas"}`}>
                    <item.icon className="h-4 w-4" aria-hidden="true" /> {item.label}
                  </Link>
                );
              })}
            </nav>
            <div className="mt-auto hidden border-t border-canvas/10 p-4 lg:block">
              <p className="truncate text-sm font-semibold">{name || "Owner"}</p>
              <p className="text-xs text-canvas/60">Verified store owner</p>
              <button type="button" onClick={logout} className="mt-3 flex min-h-11 w-full items-center justify-center gap-2 rounded-full border border-canvas/30 text-sm font-semibold hover:bg-canvas/10">
                <LogOut className="h-4 w-4" aria-hidden="true" /> Sign out
              </button>
            </div>
          </>
        )}
      </aside>
      <div className="flex min-h-screen flex-col">
        {!minimal && (
          <header className="flex items-center justify-between gap-3 border-b border-ink/10 bg-cream/70 px-4 py-3 backdrop-blur lg:hidden">
            <p className="truncate text-sm font-semibold">{name || "Owner"}</p>
            <button type="button" onClick={logout} className="inline-flex min-h-11 items-center gap-2 rounded-full border border-ink/30 px-4 text-sm font-semibold">
              <LogOut className="h-4 w-4" aria-hidden="true" /> Sign out
            </button>
          </header>
        )}
        <main className="flex-1 px-4 py-6 sm:px-6 lg:px-10 lg:py-10">{children}</main>
        <footer className="px-4 py-4 text-xs text-olive sm:px-6 lg:px-10">Private console · not indexed · every change is verified server-side and recorded in the audit history.</footer>
      </div>
    </div>
  );
}
