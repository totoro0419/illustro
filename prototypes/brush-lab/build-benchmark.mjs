import { build } from "vite";
await build({
  build: {
    ssr: "packages/brush/src/benchmark.mts",
    outDir: "benchmark-dist",
    emptyOutDir: true,
    rollupOptions: { output: { entryFileNames: "benchmark.mjs" } },
  },
});
