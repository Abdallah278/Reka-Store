import "dotenv/config";
import { createServer } from "http";
import net from "net";
import { createApp } from "../app";
import { ENV } from "./env";
import { serveStatic, setupVite } from "./vite";

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise(resolve => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}

async function findAvailablePort(startPort: number = 3000): Promise<number> {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) return port;
  }
  throw new Error(`No available port found starting from ${startPort}`);
}

async function startServer() {
  const app = createApp();
  const server = createServer(app);

  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const preferredPort = parseInt(process.env.PORT || "3000");
  const port = await findAvailablePort(preferredPort);
  if (port !== preferredPort) console.log(`Port ${preferredPort} is busy, using port ${port} instead`);

  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`);
    if (ENV.adminHostname) console.log(`Owner console is served on https://${ENV.adminHostname}/`);
    else console.log(`Owner console (single-host mode) is served under /manage`);
    if (!ENV.supabaseUrl || !ENV.supabaseAnonKey) console.warn("[Auth] SUPABASE_URL / SUPABASE_ANON_KEY not configured — sign-in will not work.");
    if (ENV.ownerOpenIds.length === 0) console.warn("[Security] No OWNER_SUPABASE_USER_IDS configured — all owner procedures will be denied.");
  });
}

startServer().catch(console.error);
