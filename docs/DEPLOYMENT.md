# Reka Store — Deployment (Supabase + Vercel)

The store runs as two frontends and one API on a Supabase backend:

- **Public storefront** — static build (`dist/public`), served by Vercel's CDN.
- **Private owner console** — static build (`dist/admin`), merged under `/manage` (single-host mode) or deployed as its own Vercel project for real host separation.
- **API** — the Express + tRPC app as a single Vercel serverless function (`api/index.ts`). Authorization for every private read/mutation happens here, never in the frontends.
- **Supabase** — Auth (owner sign-in), PostgreSQL (drizzle), Storage (product images).

## 1. Supabase project setup

1. Create a project at supabase.com.
2. **Database**: run the migration against it:
   ```bash
   DATABASE_URL="<pooled connection string>" npm run db:push
   ```
   Migrations live in `drizzle/` (PostgreSQL). The previous MySQL migrations are kept for reference in `drizzle-mysql-legacy/` and must not be run.
3. **Storage**: create a **public** bucket named `product-images` (or set `SUPABASE_STORAGE_BUCKET`). No public write policies are needed — uploads go through the server with the service role key, behind `ownerProcedure` + full image validation.
4. **Auth → Providers**: enable Email. Create the owner account from **Dashboard → Authentication → Users → Add user** (email + password typed in the dashboard — never in code or chat).
5. **Auth → URL Configuration**: set Site URL to your production URL (e.g. `https://rekastore.com`). Add `http://localhost:3000` to Additional Redirect URLs for local development. (Password sign-in itself needs no redirect; this matters if you later enable OAuth providers or magic links.)

## 2. Owner allowlist

1. After creating the owner user, copy its **User UID** (UUID) from Dashboard → Authentication → Users.
2. Set `OWNER_SUPABASE_USER_IDS=<that uuid>` (comma-separate multiple owners).
3. The server grants the `admin` role ONLY to allowlisted ids (`server/db.ts → upsertUser`), and `ownerProcedure` re-checks session → allowlist → DB role → admin host → CSRF → rate limit on every call. Client-supplied roles/metadata are never trusted. Empty allowlist = fail closed.

## 3. Vercel setup (single project — recommended start)

1. Import the repo into Vercel. `vercel.json` already sets:
   - `buildCommand: npm run build:vercel` (storefront + console + merge under `/manage`),
   - `outputDirectory: dist/public`,
   - rewrites: `/api/*` → serverless function, `/manage/*` → console SPA, everything else → storefront SPA,
   - `noindex` + `no-store` headers on `/manage/*`.
2. Add the environment variables from `.env.example` (Production + Preview + Development as appropriate). `SUPABASE_SERVICE_ROLE_KEY`, `DATABASE_URL`, `OWNER_SUPABASE_USER_IDS`, `UPSTASH_*` are **server-side only** — never prefix them with `VITE_`.
3. Deploy. The console is at `https://<domain>/manage` (unlinked, noindexed; security lives in the API, not the URL).

### Optional: real host separation (manage.rekastore.com)

Create a **second** Vercel project from the same repo:
- Build command: `vite build --config vite.admin.config.ts && node scripts/merge-admin.mjs && cp -r dist/public/manage/* dist/public/ || true` — or simpler: keep the same build and assign the domain `manage.rekastore.com` to the same project, then set `ADMIN_HOSTNAME=manage.rekastore.com` and `PUBLIC_HOSTNAME=rekastore.com`. With `ADMIN_HOSTNAME` set, the API refuses owner procedures on any other host and `/manage` 404s on the public host.
- Add both domains to `CORS_ALLOWLIST` if the console calls the API cross-origin.

## 4. Rate limiting in production

Vercel runs many instances; in-memory limits don't protect you. Create a free Upstash Redis database and set `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN`. Order, review and owner-mutation limits are then shared across all instances (fixed-window INCR+EXPIRE, no extra npm deps). Without them the app still works but logs a production warning.

## 5. Local development

```bash
cp .env.example .env   # fill VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY,
                       # SUPABASE_SERVICE_ROLE_KEY, DATABASE_URL, OWNER_SUPABASE_USER_IDS
npm run dev            # http://localhost:3000  ·  console: /manage
```

Sign-in posts credentials directly from the browser to Supabase (supabase-js); they never touch this codebase's server or logs.

## 6. Checks

```bash
npm run check   # TypeScript
npm test        # Vitest (mocked DB + mocked Supabase — no network)
npm run build   # storefront + console + node server bundle
npm run build:vercel  # storefront + console merged for Vercel
```
