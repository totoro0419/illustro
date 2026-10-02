import { build } from "vite";
await build({
  build: {
    ssr: "prototypes/brush-lab/atlas.mts",
    outDir: "benchmark-dist/atlas",
    emptyOutDir: true,
    rollupOptions: { output: { entryFileNames: "atlas.mjs" } },
  },
});
await import("../../benchmark-dist/atlas/atlas.mjs");
