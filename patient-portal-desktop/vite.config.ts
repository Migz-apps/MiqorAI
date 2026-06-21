import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { fileURLToPath } from "url";

// GitHub Pages project site: https://<user>.github.io/<repo>/
const repoBase = process.env.VITE_BASE ?? "/MiqorAI/";

export default defineConfig(({ mode }) => ({
  base: mode === "production" ? repoBase : "/",
  server: {
    host: "::",
    port: 5173,
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
