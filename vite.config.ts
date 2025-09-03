// vite.config.ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tsconfigPaths from "vite-tsconfig-paths";

// Simple, Netlify-friendly config
export default defineConfig({
  plugins: [
    react(),
    // Reads "paths" from tsconfig and makes them work in Vite
    tsconfigPaths(),
  ],
  resolve: {
    // Also keep a hard alias for convenience
    alias: {
      "@": "/src",
    },
  },
});
