import path from "path";
import { defineConfig } from "vitest/config";

// Kept apart from vite.config.ts so tests do not boot the TanStack Start plugin.
export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
  },
  resolve: {
    alias: { "@": path.resolve(__dirname, "./src") },
  },
});
