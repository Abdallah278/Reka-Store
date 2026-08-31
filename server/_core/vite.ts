import express, { type Express } from "express";
import fs from "fs";
import { type Server } from "http";
import { nanoid } from "nanoid";
import path from "path";
import { createServer as createViteServer } from "vite";
import viteConfig from "../../vite.config";
import { resolveApp } from "./security";

const CLIENT_DIR = path.resolve(import.meta.dirname, "../..", "client");

/**
 * Development: one Vite server, two HTML entries. The owner console is served
 * for /manage/* (or the ADMIN_HOSTNAME host) and the storefront for everything
 * else. Routing only — authorization lives in the tRPC layer.
 */
export async function setupVite(app: Express, server: Server) {
  // vite.config.ts exports a config FUNCTION — resolve it before spreading,
  // otherwise Vite silently loses its root/aliases and every /src/* module
  // request falls through to the HTML catch-all.
  const resolvedConfig = typeof viteConfig === "function" ? await viteConfig({ command: "serve", mode: "development" }) : viteConfig;
  const vite = await createViteServer({
    ...resolvedConfig,
    configFile: false,
    server: { middlewareMode: true, hmr: { server }, allowedHosts: true as const },
    appType: "custom",
  });

  app.use(vite.middlewares);
  app.use("*", async (req, res, next) => {
    const url = req.originalUrl;
    try {
      const target = resolveApp(req);
      if (target === "blocked") {
        res.status(404).type("text/plain").end("Not found");
        return;
      }
      const file = target === "console" ? "admin.html" : "index.html";
      const entry = target === "console" ? "/src/admin-main.tsx" : "/src/main.tsx";
      let template = await fs.promises.readFile(path.resolve(CLIENT_DIR, file), "utf-8");
      template = template.replace(`src="${entry}"`, `src="${entry}?v=${nanoid()}"`);
      const page = await vite.transformIndexHtml(url, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (e) {
      vite.ssrFixStacktrace(e as Error);
      next(e);
    }
  });
}

/**
 * Production: two separate bundles.
 *   dist/public  -> storefront
 *   dist/admin   -> owner console
 * The console bundle is only ever served to requests resolved as "console",
 * so the public hostname never exposes owner assets or markup.
 */
export function serveStatic(app: Express) {
  const base = process.env.NODE_ENV === "development" ? path.resolve(import.meta.dirname, "../..", "dist") : path.resolve(import.meta.dirname);
  const publicDir = path.resolve(base, "public");
  const adminDir = path.resolve(base, "admin");

  for (const dir of [publicDir, adminDir]) {
    if (!fs.existsSync(dir)) console.error(`Could not find the build directory: ${dir}, make sure to build the client first`);
  }

  const publicStatic = express.static(publicDir, { index: false, fallthrough: true });
  const adminStatic = express.static(adminDir, { index: false, fallthrough: true });

  app.use((req, res, next) => {
    const target = resolveApp(req);
    if (target === "blocked") {
      res.status(404).type("text/plain").end("Not found");
      return;
    }
    if (target === "console") {
      // Strip the /manage prefix in single-host mode so hashed assets resolve.
      if (req.path.startsWith("/manage/")) req.url = req.url.replace(/^\/manage/, "");
      return adminStatic(req, res, next);
    }
    return publicStatic(req, res, next);
  });

  app.use("*", (req, res) => {
    const target = resolveApp(req);
    if (target === "blocked") {
      res.status(404).type("text/plain").end("Not found");
      return;
    }
    res.setHeader("Cache-Control", "no-store");
    res.sendFile(target === "console" ? path.resolve(adminDir, "admin.html") : path.resolve(publicDir, "index.html"));
  });
}
