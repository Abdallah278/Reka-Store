import { QueryClient } from "@tanstack/react-query";
import { httpBatchLink, TRPCClientError } from "@trpc/client";
import superjson from "superjson";
import { getAccessToken } from "./supabase";
import { trpc } from "./trpc";

/**
 * Shared transport for both apps. Identity travels as a Supabase access token
 * in the Authorization header (verified server-side on every call); the
 * custom x-reka-csrf header turns every mutation into a non-simple request so
 * cross-site forgery is blocked by CORS preflight + the server Origin check.
 * No tokens are ever written by this module — supabase-js owns the session.
 */
export function createTrpcClient() {
  return trpc.createClient({
    links: [
      httpBatchLink({
        url: "/api/trpc",
        transformer: superjson,
        async headers() {
          const headers: Record<string, string> = { "x-reka-csrf": "1" };
          const token = await getAccessToken();
          if (token) headers.Authorization = `Bearer ${token}`;
          return headers;
        },
        fetch(input, init) {
          return globalThis.fetch(input, { ...(init ?? {}), credentials: "include" });
        },
      }),
    ],
  });
}

export function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: 1, refetchOnWindowFocus: false, staleTime: 30_000 },
    },
  });
}

export const errorCode = (error: unknown): string | undefined =>
  error instanceof TRPCClientError ? (error.data?.code as string | undefined) : undefined;
