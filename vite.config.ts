// vite.config.ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath, URL } from "node:url";

// Try to load vite-tsconfig-paths if available
let tsconfigPaths: any = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  tsconfigPaths = require("vite-tsconfig-paths").default;
} catch {
  console.warn("vite-tsconfig-paths not installed, falling back to manual alias");
}

// Netlify-friendly config
export default defineConfig({
  plugins: [
    react(),
    tsconfigPaths ? tsconfigPaths() : undefined, // only use if installed
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
});
