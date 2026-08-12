import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

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

  if (
    id.includes("/@radix-ui/") ||
    id.includes("/cmdk/") ||
    id.includes("/vaul/") ||
    id.includes("/embla-carousel-react/") ||
    id.includes("/input-otp/") ||
    id.includes("/sonner/")
  ) {
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
    id.includes("/date-fns/") ||
    id.includes("/lucide-react/")
  ) {
    return "data-viz";
  }

  return "vendor";
}

export default defineConfig({
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
    port: 8082,
    hmr: {
      overlay: false,
    },
    proxy: {
      "/api": {
        target: "http://localhost:3000",
        changeOrigin: true,
      },
    },
  },
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
    dedupe: ["react", "react-dom", "react/jsx-runtime", "react/jsx-dev-runtime", "@tanstack/react-query", "@tanstack/query-core"],
  },
});
