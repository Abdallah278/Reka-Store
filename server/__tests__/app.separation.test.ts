import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { resolveApp } from "../_core/security";

const ROOT = path.resolve(import.meta.dirname, "../..");
const CLIENT = path.join(ROOT, "client");
const SRC = path.join(CLIENT, "src");

/** Resolve a relative/aliased import specifier to a file inside client/src. */
function resolveImport(fromFile: string, spec: string): string | null {
  let base: string;
  if (spec.startsWith("@/")) base = path.join(SRC, spec.slice(2));
  else if (spec.startsWith("@shared/")) return null; // shared code has no UI
  else if (spec.startsWith(".")) base = path.resolve(path.dirname(fromFile), spec);
  else return null; // node_modules
  if (!path.resolve(base).startsWith(SRC)) return null; // only follow client/src (type-only server imports are erased)
  const candidates = [base, `${base}.ts`, `${base}.tsx`, path.join(base, "index.ts"), path.join(base, "index.tsx")];
  return candidates.find(c => fs.existsSync(c) && fs.statSync(c).isFile()) ?? null;
}

function importGraph(entry: string): Set<string> {
  const seen = new Set<string>();
  const stack = [entry];
  const re = /(?:import|export)\s[^'"]*?from\s*['"]([^'"]+)['"]|import\(\s*['"]([^'"]+)['"]\s*\)|import\s*['"]([^'"]+)['"]/g;
  while (stack.length) {
    const file = stack.pop()!;
    if (seen.has(file)) continue;
    seen.add(file);
    const source = fs.readFileSync(file, "utf-8");
    for (const m of source.matchAll(re)) {
      const target = resolveImport(file, m[1] ?? m[2] ?? m[3]);
      if (target && !seen.has(target)) stack.push(target);
    }
  }
  return seen;
}

const storefrontGraph = importGraph(path.join(SRC, "main.tsx"));
const consoleGraph = importGraph(path.join(SRC, "admin-main.tsx"));
const rel = (f: string) => path.relative(SRC, f).replace(/\\/g, "/");

describe("public storefront / owner console separation", () => {
  it("the public bundle never imports the owner console", () => {
    const offenders = [...storefrontGraph].map(rel).filter(f => f.startsWith("owner/") || /DashboardLayout|Admin\.tsx/.test(f));
    expect(offenders).toEqual([]);
    expect([...storefrontGraph].map(rel)).toContain("storefront/App.tsx");
  });

  it("the owner console bundle never imports the storefront pages", () => {
    const offenders = [...consoleGraph].map(rel).filter(f => f.startsWith("storefront/"));
    expect(offenders).toEqual([]);
    expect([...consoleGraph].map(rel)).toContain("owner/App.tsx");
  });

  it("the public storefront contains no admin / owner-console link", () => {
    const linkPatterns = [/href=["'`][^"'`]*\/(admin|manage|owner|dashboard)/i, /to=["'`][^"'`]*\/(admin|manage)/i, /Owner dashboard/i, /Owner console/i, /manage\.rekastore/i];
    for (const file of storefrontGraph) {
      const source = fs.readFileSync(file, "utf-8");
      for (const pattern of linkPatterns) {
        expect(pattern.test(source), `${rel(file)} matches ${pattern}`).toBe(false);
      }
    }
  });

  it("the public storefront only calls public API namespaces", () => {
    for (const file of storefrontGraph) {
      const source = fs.readFileSync(file, "utf-8");
      expect(/trpc\.owner\./.test(source), `${rel(file)} calls trpc.owner`).toBe(false);
    }
  });

  it("public index.html does not reference the console entry", () => {
    const html = fs.readFileSync(path.join(CLIENT, "index.html"), "utf-8");
    expect(html).not.toContain("admin-main");
    const adminHtml = fs.readFileSync(path.join(CLIENT, "admin.html"), "utf-8");
    expect(adminHtml).toContain('name="robots"');
    expect(adminHtml).toContain("noindex");
  });
});

describe("request routing between the two apps", () => {
  it("single-host mode: /manage serves the console, everything else the storefront", () => {
    expect(resolveApp({ headers: { host: "localhost:3000" }, path: "/" } as any)).toBe("storefront");
    expect(resolveApp({ headers: { host: "localhost:3000" }, path: "/products" } as any)).toBe("storefront");
    expect(resolveApp({ headers: { host: "localhost:3000" }, path: "/manage" } as any)).toBe("console");
    expect(resolveApp({ headers: { host: "localhost:3000" }, path: "/manage/products" } as any)).toBe("console");
    expect(resolveApp({ headers: { host: "localhost:3000" }, path: "/management" } as any)).toBe("storefront");
  });
});
