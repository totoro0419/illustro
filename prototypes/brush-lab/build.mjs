import { build } from "vite";
import { readFile, writeFile, readdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
const root = fileURLToPath(new URL(".", import.meta.url));
await build({
  root,
  base: "./",
  build: { outDir: "dist", minify: true, emptyOutDir: true },
});
const js = (await readdir(root + "dist/assets")).find((n) => n.endsWith(".js"));
let html = await readFile(root + "dist/index.html", "utf8"),
  script = await readFile(root + "dist/assets/" + js, "utf8");
html = html.replace(
  /<script type="module"[^>]*src="[^"]+"[^>]*><\/script>/,
  () =>
    '<script type="module">' +
    script.replaceAll("</script", "<\\/script") +
    "</script>",
);
await writeFile(root + "illustro-brush-lab.html", html);
console.log("Built offline HTML");
