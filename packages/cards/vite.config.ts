import { defineConfig } from "vite";
import { viteSingleFile } from "vite-plugin-singlefile";

export default defineConfig({
  plugins: [viteSingleFile()],
  build: {
    cssMinify: true,
    minify: true,
    rollupOptions: {
      input: { itinerary: "itinerary/index.html" },
    },
    outDir: "dist",
    emptyOutDir: true,
  },
});
