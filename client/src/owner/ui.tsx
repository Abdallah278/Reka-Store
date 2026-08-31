import { Button } from "@/components/ui/button";
import { AlertTriangle, Clock, Loader2, LockKeyhole, RefreshCw, ShieldOff } from "lucide-react";
import { useState, type ReactNode } from "react";

/**
 * Supabase email + password sign-in form with visible loading and error
 * states. The password goes from this form DIRECTLY to Supabase Auth via the
 * official SDK — it never touches the Reka backend, is never stored, and is
 * cleared from state after every attempt. Owner status is still decided
 * exclusively on the server (allowlist + DB role) after sign-in.
 */
function SignInForm({ signIn, cta }: { signIn: (email: string, password: string) => Promise<void>; cta: string }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      setError("Enter your email and password.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await signIn(email.trim(), password);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign-in failed. Please try again.");
    } finally {
      setPassword("");
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="grid w-full max-w-xs gap-3 text-left" noValidate>
      <label className="grid gap-1.5 text-sm font-semibold">
        Email
        <input
          type="email"
          autoComplete="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          className="min-h-12 rounded-xl border border-olive/30 bg-canvas/60 px-4 text-sm outline-none focus:ring-2 focus:ring-burgundy"
          disabled={busy}
        />
      </label>
      <label className="grid gap-1.5 text-sm font-semibold">
        Password
        <input
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          className="min-h-12 rounded-xl border border-olive/30 bg-canvas/60 px-4 text-sm outline-none focus:ring-2 focus:ring-burgundy"
          disabled={busy}
        />
      </label>
      <Button type="submit" size="lg" disabled={busy} className="rounded-full px-8">
        {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : null}
        {busy ? "Signing in…" : cta}
      </Button>
      {error && (
        <p role="alert" className="rounded-2xl bg-burgundy/10 px-4 py-3 text-sm leading-6 text-burgundy">
          {error}
        </p>
      )}
      <p className="text-center text-xs leading-5 text-olive">Verified by Supabase Auth. Your password is sent only to Supabase — never to this site's server.</p>
    </form>
  );
}

export function StatePanel({ icon, title, text, action, tone = "neutral" }: { icon: ReactNode; title: string; text: string; action?: ReactNode; tone?: "neutral" | "danger" }) {
  return (
    <div role={tone === "danger" ? "alert" : "status"} className={`mx-auto max-w-lg rounded-[1.75rem] p-8 text-center ring-1 ${tone === "danger" ? "bg-burgundy/10 ring-burgundy/30" : "bg-cream ring-ink/10"}`}>
      <div className={`mx-auto grid h-12 w-12 place-items-center rounded-full ${tone === "danger" ? "bg-burgundy text-canvas" : "bg-ink text-canvas"}`}>{icon}</div>
      <h2 className="mt-4 font-display text-3xl font-semibold">{title}</h2>
      <p className="mt-2 text-sm leading-7 text-olive">{text}</p>
      {action && <div className="mt-6 flex flex-wrap justify-center gap-3">{action}</div>}
    </div>
  );
}

export const LoadingPanel = ({ label = "Loading…" }: { label?: string }) => (
  <div role="status" aria-live="polite" className="flex min-h-[40vh] items-center justify-center gap-3 text-olive">
    <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" /> {label}
  </div>
);

export const ErrorPanel = ({ retry, text = "Something went wrong while loading your store data." }: { retry: () => void; text?: string }) => (
  <StatePanel tone="danger" icon={<AlertTriangle className="h-6 w-6" />} title="Unable to load" text={text} action={<Button onClick={retry} className="rounded-full"><RefreshCw className="h-4 w-4" /> Try again</Button>} />
);

export const SignInPanel = ({ signIn }: { signIn: (email: string, password: string) => Promise<void> }) => (
  <StatePanel icon={<LockKeyhole className="h-6 w-6" />} title="Owner sign-in" text="This console is reserved for the Reka Store owner. Sign in with the owner account to continue. No store data is shown until the server verifies your identity." action={<SignInForm signIn={signIn} cta="Sign in" />} />
);

export const ForbiddenPanel = ({ logout, name }: { logout: () => void; name?: string }) => (
  <StatePanel tone="danger" icon={<ShieldOff className="h-6 w-6" />} title="Access denied" text={`${name ? `${name}, this` : "This"} account is not the store owner. Nothing here is available to you. If you are the owner, sign out and sign in with the authorised account.`} action={<Button variant="outline" onClick={logout} className="rounded-full">Sign out</Button>} />
);

export const ExpiredPanel = ({ signIn }: { signIn: (email: string, password: string) => Promise<void> }) => (
  <StatePanel icon={<Clock className="h-6 w-6" />} title="Session expired" text="For your security you were signed out. Sign in again to continue managing the store — unsaved changes were not applied." action={<SignInForm signIn={signIn} cta="Sign in again" />} />
);

export const formatDate = (value: Date | string | null | undefined) => {
  if (!value) return "—";
  const d = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(d.getTime()) || d.getTime() === 0) return "—";
  return new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeStyle: "short", timeZone: "UTC" }).format(d) + " UTC";
};
