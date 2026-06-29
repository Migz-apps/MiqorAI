import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { fileURLToPath } from "url";

// Default to root-hosted deployments like Vercel.
// Set VITE_BASE=/MiqorAI/ explicitly when building for GitHub Pages.
const repoBase = process.env.VITE_BASE ?? "/";

export default defineConfig(({ mode }) => ({
  base: mode === "production" ? repoBase : "/",
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
