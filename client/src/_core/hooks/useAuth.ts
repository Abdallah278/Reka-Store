import { getSupabase, tryGetSupabase } from "@/lib/supabase";
import { trpc } from "@/lib/trpc";
import { errorCode } from "@/lib/trpcClient";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

/**
 * Session state for the OWNER CONSOLE (Supabase Auth).
 *
 * Credentials are sent by the browser DIRECTLY to Supabase via supabase-js —
 * they never reach the Reka backend and are never stored or logged here.
 * The server only ever returns `{ name, isOwner }`; `isOwner` is recomputed
 * server-side (allowlist + DB role) on every private call, so nothing in this
 * hook is a security decision — it only drives which screen to show.
 */
export function useAuth() {
  const utils = trpc.useUtils();
  const meQuery = trpc.auth.me.useQuery(undefined, { retry: false, refetchOnWindowFocus: true, refetchInterval: 60_000 });
  const [expired, setExpired] = useState(false);
  const wasAuthenticated = useRef(false);

  useEffect(() => {
    if (meQuery.data) {
      wasAuthenticated.current = true;
      setExpired(false);
    } else if (meQuery.isSuccess && meQuery.data === null && wasAuthenticated.current) {
      // We were signed in earlier in this tab and now the server says no
      // session: it expired or was revoked elsewhere.
      setExpired(true);
    }
  }, [meQuery.data, meQuery.isSuccess]);

  // Re-check identity whenever the Supabase session changes (sign-in,
  // sign-out in another tab, token refresh).
  useEffect(() => {
    const supabase = tryGetSupabase();
    if (!supabase) return;
    let unmounted = false;
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      // supabase-js holds its internal auth lock while it runs this callback.
      // Invalidating here refetches auth.me, whose transport awaits
      // getSession() — which needs that same lock → deadlock, and the console
      // hangs on "Checking your session…" forever. Defer past the callback.
      setTimeout(() => {
        if (!unmounted) utils.auth.me.invalidate();
      }, 0);
    });
    return () => {
      unmounted = true;
      subscription.unsubscribe();
    };
  }, [utils]);

  const logoutMutation = trpc.auth.logout.useMutation();

  /** Email + password sign-in. Throws a user-presentable Error on failure. */
  const signIn = useCallback(
    async (email: string, password: string) => {
      const supabase = getSupabase(); // throws a clear config error when env is missing
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw new Error(error.message || "Sign-in failed. Check your email and password.");
      setExpired(false);
      await utils.auth.me.invalidate();
    },
    [utils]
  );

  const logout = useCallback(async () => {
    try {
      // Server-side revocation first: outstanding tokens die immediately.
      await logoutMutation.mutateAsync();
    } catch (error) {
      if (errorCode(error) !== "UNAUTHORIZED") throw error;
    } finally {
      try {
        await tryGetSupabase()?.auth.signOut();
      } catch {
        /* already signed out */
      }
      wasAuthenticated.current = false;
      setExpired(false);
      utils.auth.me.setData(undefined, null);
      await utils.invalidate();
    }
  }, [logoutMutation, utils]);

  /** Call when any private query/mutation returns UNAUTHORIZED. */
  const markExpired = useCallback(() => {
    if (wasAuthenticated.current) setExpired(true);
    utils.auth.me.setData(undefined, null);
  }, [utils]);

  return useMemo(
    () => ({
      user: meQuery.data ?? null,
      isAuthenticated: Boolean(meQuery.data),
      isOwner: Boolean(meQuery.data?.isOwner),
      loading: meQuery.isLoading || logoutMutation.isPending,
      error: meQuery.error ?? null,
      expired,
      refresh: () => meQuery.refetch(),
      signIn,
      logout,
      markExpired,
    }),
    [meQuery.data, meQuery.error, meQuery.isLoading, logoutMutation.isPending, expired, signIn, logout, markExpired, meQuery]
  );
}
