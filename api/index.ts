import "dotenv/config";
// The server is pre-bundled into _app.mjs by `npm run build:api` — Vercel's
// per-file TS transpilation keeps extensionless relative imports, which Node's
// ESM loader can't resolve at runtime, so the function must not import
// ../server/* directly.
import { createApp } from "./_app.mjs";

/**
 * Vercel serverless entry: the whole API (tRPC + security middleware) runs as
 * ONE function. Static frontends (dist/public + the console merged under
 * /manage) are served by Vercel's CDN via vercel.json rewrites; only /api/*
 * reaches this function. No long-lived process is assumed anywhere.
 */
const app = createApp();

export default app;
