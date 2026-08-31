import "dotenv/config";
import { createApp } from "../server/app";

/**
 * Vercel serverless entry: the whole API (tRPC + security middleware) runs as
 * ONE function. Static frontends (dist/public + the console merged under
 * /manage) are served by Vercel's CDN via vercel.json rewrites; only /api/*
 * reaches this function. No long-lived process is assumed anywhere.
 */
const app = createApp();

export default app;
