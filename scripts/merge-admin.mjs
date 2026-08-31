/**
 * Vercel packaging: merge the owner-console build (dist/admin, built with
 * base /manage/) into dist/public/manage so a single Vercel project serves
 * both apps (single-host mode). Real host separation = deploy a second
 * Vercel project for the console — see docs/DEPLOYMENT.md.
 */
import fs from "node:fs";
import path from "node:path";

const src = "dist/admin";
const dest = "dist/public/manage";

if (!fs.existsSync(src)) {
  console.error(`merge-admin: ${src} not found — run the admin build first`);
  process.exit(1);
}
fs.rmSync(dest, { recursive: true, force: true });
fs.cpSync(src, dest, { recursive: true });
fs.renameSync(path.join(dest, "admin.html"), path.join(dest, "index.html"));
console.log(`merge-admin: console merged into ${dest}`);
