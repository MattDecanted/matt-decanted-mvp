// vite.config.ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath, URL } from "node:url";

export default defineConfig(async () => {
  // Try to load vite-tsconfig-paths if present; ignore if not installed
  let tsconfigPathsPlugin: any = null;
  try {
    const mod = await import("vite-tsconfig-paths");
    tsconfigPathsPlugin = mod.default();
  } catch {
    console.warn("[vite] vite-tsconfig-paths not installed – continuing without it");
  }

  return {
    plugins: [react(), tsconfigPathsPlugin].filter(Boolean),
    resolve: {
      alias: {
        "@": fileURLToPath(new URL("./src", import.meta.url)),
      },
    },
    build: {
      sourcemap: true, // helpful for the “Something went wrong” page in prod
    },
    define: {
      __BUILD_TIME__: JSON.stringify(new Date().toISOString()),
    },
  };
});
