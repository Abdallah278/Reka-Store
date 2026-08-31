import { QueryClientProvider } from "@tanstack/react-query";
import { createRoot } from "react-dom/client";
import { trpc } from "@/lib/trpc";
import { createQueryClient, createTrpcClient } from "@/lib/trpcClient";
import OwnerApp from "./owner/App";
import "./index.css";

// PRIVATE OWNER CONSOLE ENTRY. Served only on ADMIN_HOSTNAME (or /manage in
// single-host mode). Nothing here is a security boundary — every read and
// mutation is re-authorised by ownerProcedure on the server.
const queryClient = createQueryClient();
const trpcClient = createTrpcClient();

createRoot(document.getElementById("root")!).render(
  <trpc.Provider client={trpcClient} queryClient={queryClient}>
    <QueryClientProvider client={queryClient}>
      <OwnerApp />
    </QueryClientProvider>
  </trpc.Provider>
);
