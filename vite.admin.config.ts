import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import path from "node:path";
import { defineConfig } from "vite";

/**
 * Production build for the PRIVATE OWNER CONSOLE.
 * Output: dist/admin (served only on ADMIN_HOSTNAME, or under /manage in
 * single-host mode). Assets are emitted under /manage/ so the same bundle
 * works in both modes — the server strips the prefix when routing.
 */
export default defineConfig({
  plugins: [react(), tailwindcss()],
  base: "/manage/",
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "client", "src"),
      "@shared": path.resolve(import.meta.dirname, "shared"),
      "@assets": path.resolve(import.meta.dirname, "attached_assets"),
    },
  },
  envDir: path.resolve(import.meta.dirname),
  root: path.resolve(import.meta.dirname, "client"),
  publicDir: false,
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/admin"),
    emptyOutDir: true,
    rollupOptions: { input: path.resolve(import.meta.dirname, "client", "admin.html") },
  },
});
