import { build } from "esbuild";
import { readFile, writeFile } from "node:fs/promises";
const result = await build({
  entryPoints: ["prototypes/brush-lab/src/main.ts"],
  bundle: true,
  write: false,
  format: "iife",
  target: "es2022",
  minify: true,
});
const html = await readFile("prototypes/brush-lab/index.html", "utf8"),
  js = result.outputFiles[0].text.replaceAll("</script", "<\\/script");
await writeFile(
  "prototypes/brush-lab/illustro-brush-lab.html",
  html.replace(
    '<script type="module" src="/src/main.ts"></script>',
    `<script>${js}</script>`,
  ),
);
console.log("Built self-contained offline brush lab.");
