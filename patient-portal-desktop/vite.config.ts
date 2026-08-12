import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { fileURLToPath } from "url";

// Default to root-hosted deployments like Vercel.
// Set VITE_BASE=/MiqorAI/ explicitly when building for GitHub Pages.
const repoBase = process.env.VITE_BASE ?? "/";

function vendorChunkName(id: string): string | undefined {
  if (!id.includes("node_modules")) return undefined;

  if (
    id.includes("/react/") ||
    id.includes("/react-dom/") ||
    id.includes("/react-router") ||
    id.includes("/scheduler/") ||
    id.includes("/@tanstack/")
  ) {
    return "framework";
  }

  if (id.includes("/@radix-ui/") || id.includes("/cmdk/") || id.includes("/vaul/")) {
    return "ui";
  }

  if (
    id.includes("/react-hook-form/") ||
    id.includes("/@hookform/") ||
    id.includes("/zod/")
  ) {
    return "forms";
  }

  if (
    id.includes("/recharts/") ||
    id.includes("/qrcode.react/") ||
    id.includes("/date-fns/") ||
    id.includes("/lucide-react/")
  ) {
    return "data-viz";
  }

  return "vendor";
}

export default defineConfig(({ mode }) => ({
  base: mode === "production" ? repoBase : "/",
  build: {
    chunkSizeWarningLimit: 700,
    rollupOptions: {
      output: {
        manualChunks: vendorChunkName,
      },
    },
  },
  server: {
    host: "::",
    port: 5173,
    strictPort: true,
    proxy: {
      "/api": {
        target: "http://localhost:3000",
        changeOrigin: true,
      },
    },
  },
  plugins: [
    react(),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
}));
