import { fileURLToPath } from "node:url";
process.chdir(fileURLToPath(new URL("../../../", import.meta.url)));
import { build } from "esbuild";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
const path = join(tmpdir(), "illustro-brush-benchmark.cjs");
await build({
  entryPoints: ["packages/brush/test/benchmark.ts"],
  bundle: true,
  platform: "node",
  format: "cjs",
  outfile: path,
});
const r = spawnSync(process.execPath, ["--expose-gc", path], {
  stdio: "inherit",
});
process.exitCode = r.status ?? 1;
