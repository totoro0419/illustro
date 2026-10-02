import { chromium } from "@playwright/test";
import { createServer } from "vite";
import { writeFile, readFile } from "node:fs/promises";
const server = await createServer({
  root: process.cwd() + "/prototypes/brush-lab",
  server: { host: "127.0.0.1", port: 5190, strictPort: true },
});
await server.listen();
const browser = await chromium.launch({
  headless: true,
  ...(process.env.BRUSH_CHROMIUM
    ? { executablePath: process.env.BRUSH_CHROMIUM }
    : {}),
  args: ["--no-sandbox", "--disable-dev-shm-usage"],
});
let evidence;
try {
  const page = await browser.newPage({
      viewport: { width: 1024, height: 768 },
    }),
    errors = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  await page.goto("http://127.0.0.1:5190");
  await page.waitForFunction(() => window.brushLab);
  await page.locator("details").last().locator("summary").click();
  const before = await page.evaluate(() => ({
    heap: performance.memory?.usedJSHeapSize,
    time: performance.now(),
  }));
  await page.locator("#sustain").click();
  await page.waitForFunction(
    () =>
      document
        .querySelector("#status")
        .textContent.includes("3分間の自動入力を終了"),
    null,
    { timeout: 210000 },
  );
  const after = await page.evaluate(() => ({
    heap: performance.memory?.usedJSHeapSize,
    time: performance.now(),
    history: window.brushLab.getHistory(),
    errors: window.brushLab.getErrors(),
  }));
  const download = page.waitForEvent("download");
  await page.locator("#metrics").click();
  const file = await download;
  const report = JSON.parse(await readFile(await file.path(), "utf8"));
  evidence = {
    date: new Date().toISOString(),
    status: errors.length === 0 && report.errors.length === 0 ? "PASS" : "FAIL",
    scope:
      "Real three-minute browser timer with synthetic samples; not a physical stylus/thermal test",
    browser: await browser.version(),
    before,
    after,
    elapsedMs: after.time - before.time,
    report,
    errors,
  };
  if (evidence.status === "FAIL") process.exitCode = 1;
  console.log(
    JSON.stringify({
      status: evidence.status,
      elapsedMs: evidence.elapsedMs,
      report,
    }),
  );
} finally {
  if (evidence)
    await writeFile(
      "docs/brush/evidence/current-sustained-browser.json",
      JSON.stringify(evidence, null, 2),
    );
  await browser.close();
  await server.close();
}
