import { jsxLocPlugin } from "@builder.io/vite-plugin-jsx-loc";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import path from "node:path";
import { defineConfig } from "vite";

export default defineConfig(({ command }) => ({
  // jsxLocPlugin stamps every element with a data-loc="file:line"
  // attribute for the dev click-to-source overlay. It was running for
  // production builds too, which shipped ~26k source paths in the client
  // bundle: the whole source tree is disclosed to anyone reading the
  // page, and a stray attribute was being resolved as a relative href
  // (deploy logs show requests for
  // /climate-energy/client/src/components/layout/Footer.tsx:41).
  plugins:
    command === "serve"
      ? [react(), tailwindcss(), jsxLocPlugin()]
      : [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "client", "src"),
      "@shared": path.resolve(import.meta.dirname, "shared"),
      "@assets": path.resolve(import.meta.dirname, "attached_assets"),
    },
  },
  envDir: path.resolve(import.meta.dirname),
  root: path.resolve(import.meta.dirname, "client"),
  publicDir: path.resolve(import.meta.dirname, "client", "public"),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true,
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom'],
          'vendor-trpc': ['@trpc/client', '@trpc/react-query', '@tanstack/react-query'],
          'vendor-ui': ['@radix-ui/react-dialog', '@radix-ui/react-select', '@radix-ui/react-tabs', '@radix-ui/react-dropdown-menu'],
          'vendor-editor': ['@tiptap/react', '@tiptap/starter-kit'],
          'vendor-charts': ['recharts'],
          'vendor-motion': ['framer-motion'],
        },
      },
    },
  },
  server: {
    host: true,
    allowedHosts: [
      "localhost",
      "127.0.0.1",
    ],
    fs: {
      strict: true,
      deny: ["**/.*"],
    },
  },
}));
