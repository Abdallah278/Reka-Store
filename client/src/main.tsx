import { QueryClientProvider } from "@tanstack/react-query";
import { createRoot } from "react-dom/client";
import { trpc } from "@/lib/trpc";
import { createQueryClient, createTrpcClient } from "@/lib/trpcClient";
import StorefrontApp from "./storefront/App";
import "./index.css";

// PUBLIC STOREFRONT ENTRY. This bundle must never import anything from
// ./owner — enforced by server/__tests__/app.separation.test.ts.
const queryClient = createQueryClient();
const trpcClient = createTrpcClient();

createRoot(document.getElementById("root")!).render(
  <trpc.Provider client={trpcClient} queryClient={queryClient}>
    <QueryClientProvider client={queryClient}>
      <StorefrontApp />
    </QueryClientProvider>
  </trpc.Provider>
);
