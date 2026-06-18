import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vite.dev/config/
// Served from a project subpath on GitHub Pages when built with `--mode pages`
// (https://magland.github.io/numbl-figure-viewer/); local dev/build stays root.
export default defineConfig(({ mode }) => ({
  base: mode === "pages" ? "/numbl-figure-viewer/" : "/",
  plugins: [react()],
  // numbl is a linked (file:) dependency, so force a single React instance and
  // let Vite descend into the linked package to resolve its imports.
  resolve: { dedupe: ["react", "react-dom"] },
  optimizeDeps: { exclude: ["numbl"] },
}));
