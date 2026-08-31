import { createExpressMiddleware } from "@trpc/server/adapters/express";
import express, { type Express } from "express";
import { createContext } from "./_core/context";
import { ENV } from "./_core/env";
import { corsMiddleware, registerRobots, securityHeaders } from "./_core/security";
import { appRouter } from "./routers";

/**
 * The shared Express application: security headers, CORS, body limits and
 * the tRPC API. No listening, no static serving, no dev tooling — so the
 * exact same app runs:
 *   - locally under server/_core/index.ts (with Vite dev / static serving),
 *   - on Vercel as a single serverless function (api/index.ts).
 *
 * Nothing here keeps in-process state that production correctness depends
 * on: sessions are Supabase JWTs verified per request, and rate limiting
 * uses Upstash when configured (see _core/security.ts).
 */
export function createApp(): Express {
  const app = express();

  // Behind a reverse proxy (Vercel / nginx) trust X-Forwarded-* so client-IP
  // rate-limit keys and host routing are correct.
  app.set("trust proxy", 1);
  app.disable("x-powered-by");

  app.use(securityHeaders);
  app.use(corsMiddleware);

  // Uploads travel as base64 data URLs; the validator enforces the real
  // decoded limit (MAX_UPLOAD_BYTES). Keep the transport cap tight.
  const bodyLimit = `${Math.ceil((ENV.maxUploadBytes * 1.4) / (1024 * 1024)) + 1}mb`;
  app.use(express.json({ limit: bodyLimit }));
  app.use(express.urlencoded({ limit: bodyLimit, extended: true }));

  registerRobots(app);

  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
      onError({ error, path }) {
        if (error.code === "INTERNAL_SERVER_ERROR") console.error(`[tRPC] ${path ?? "?"}:`, error.cause ?? error);
      },
    })
  );

  return app;
}
