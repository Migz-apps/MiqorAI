import path from "path";
import { defineConfig } from "vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import tsconfigPaths from "vite-tsconfig-paths";

function vendorChunkName(id: string): string | undefined {
  if (!id.includes("node_modules")) return undefined;

  if (
    id.includes("/react/") ||
    id.includes("/react-dom/") ||
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
    port: 8083,
    strictPort: true,
    proxy: {
      "/api": {
        target: "http://localhost:3000",
        changeOrigin: true,
      },
    },
  },
  plugins: [
    tsconfigPaths({ projects: ["./tsconfig.json"] }),
    tailwindcss(),
    tanstackStart({
      tsr: {
        srcDirectory: "src",
      },
      server: {
        entry: "server",
      },
    }),
    viteReact(),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
