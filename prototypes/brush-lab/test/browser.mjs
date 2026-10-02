import { chromium } from "@playwright/test";
import { createServer } from "vite";
import { writeFile, readFile } from "node:fs/promises";
const server = await createServer({
  root: process.cwd() + "/prototypes/brush-lab",
  server: { host: "127.0.0.1", port: 5188, strictPort: true },
});
await server.listen();
const launch = {
  headless: true,
  ...(process.env.BRUSH_CHROMIUM
    ? { executablePath: process.env.BRUSH_CHROMIUM }
    : {}),
  args: ["--no-sandbox", "--disable-dev-shm-usage"],
};
const browser = await chromium.launch(launch);
const results = [],
  errors = [];
let page;
async function check(name, fn) {
  try {
    await fn();
    results.push({ name, status: "PASS" });
  } catch (e) {
    results.push({ name, status: "FAIL", error: String(e) });
  }
}
function assert(v, msg) {
  if (!v) throw new Error(msg);
}
const inspectionFont = process.env.BRUSH_FONT_CSS
  ? await readFile(process.env.BRUSH_FONT_CSS, "utf8")
  : "";
async function font(p) {
  if (inspectionFont) {
    await p.addStyleTag({ content: inspectionFont });
    await p.evaluate(() => document.fonts.ready);
  }
}
async function ready() {
  await page.waitForFunction(() => window.brushLab !== undefined);
  await font(page);
}
async function idle() {
  await page.waitForFunction(() => !window.brushLab.getActive(), {
    timeout: 30000,
  });
}
async function image() {
  return page.evaluate(() => window.brushLab.getImage());
}
async function pattern() {
  await page.locator("#test").click();
  await idle();
}
try {
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
  });
  page = await context.newPage();
  page.on("pageerror", (e) => errors.push(String(e)));
  await page.goto(process.env.BRUSH_LAB_URL ?? "http://127.0.0.1:5188");
  await ready();
  await check(
    "loads 56 pens, meaningful controls, no error overlay",
    async () => {
      assert(
        (await page.locator("#brush option").count()) === 56,
        "missing pens",
      );
      assert(await page.locator("h1").innerText(), "blank");
      assert(
        (await page.locator("vite-error-overlay").count()) === 0,
        "Vite error overlay",
      );
    },
  );
  await check(
    "test draw -> record -> strict replay -> exact image",
    async () => {
      await pattern();
      const a = await image();
      assert(
        a.some((v) => v !== 0),
        "blank drawing",
      );
      await page.locator("details").last().locator("summary").click();
      await page.locator("#replay").click();
      await page.waitForFunction(() =>
        document
          .querySelector("#status")
          .textContent.includes("再描画しました"),
      );
      assert(
        JSON.stringify(a) === JSON.stringify(await image()),
        "replay pixel mismatch",
      );
    },
  );
  await check("Undo/Redo exact image; reset reversible", async () => {
    const a = await image();
    await page.locator("#undo").click();
    await page.locator("#redo").click();
    assert(
      JSON.stringify(a) === JSON.stringify(await image()),
      "redo mismatch",
    );
    await page.locator("#reset").click();
    assert(
      (await image()).every((x) => x === 0),
      "not cleared",
    );
    await page.locator("#undo").click();
    assert(
      JSON.stringify(a) === JSON.stringify(await image()),
      "clear undo mismatch",
    );
  });
  await check("mouse captured outside surface and finalized", async () => {
    const b = await page.locator("#canvas").boundingBox();
    await page.mouse.move(b.x + 80, b.y + 80);
    await page.mouse.down();
    await page.mouse.move(b.x + 240, b.y + 140, { steps: 15 });
    await page.mouse.move(b.x + b.width + 20, b.y + 180);
    await page.mouse.up();
    await idle();
    assert(
      (await page.evaluate(() => window.brushLab.getRecord())).geometry.some(
        (p) => p.pointerType === "mouse",
      ) || (await page.locator("#status").innerText()) === "線を確定しました。",
      "not finalized",
    );
  });
  await check("cancel/lost capture leaves no recorded stroke", async () => {
    const n = await page.evaluate(() => window.brushLab.getHistory()),
      b = await page.locator("#canvas").boundingBox();
    await page.mouse.move(b.x + 60, b.y + 60);
    await page.mouse.down();
    await page.dispatchEvent("#canvas", "pointercancel", {
      pointerId: 1,
      pointerType: "mouse",
    });
    await page.mouse.up();
    await idle();
    assert(
      (await page.evaluate(() => window.brushLab.getHistory())) === n,
      "cancel committed",
    );
  });
  await check(
    "synthetic pressure/tilt/twist affect recorded data",
    async () => {
      const b = await page.locator("#canvas").boundingBox(),
        cdp = await context.newCDPSession(page);
      await cdp.send("Input.dispatchMouseEvent", {
        type: "mousePressed",
        x: b.x + 60,
        y: b.y + 60,
        button: "left",
        buttons: 1,
        clickCount: 1,
        pointerType: "pen",
        force: 0.1,
        tiltX: 20,
        tiltY: 10,
        twist: 30,
      });
      for (let i = 0; i < 20; i++)
        await cdp.send("Input.dispatchMouseEvent", {
          type: "mouseMoved",
          x: b.x + 60 + i * 8,
          y: b.y + 60 + i * 2,
          button: "left",
          buttons: 1,
          pointerType: "pen",
          force: 0.1 + i * 0.04,
          tiltX: 20,
          tiltY: 10,
          twist: 30,
        });
      await cdp.send("Input.dispatchMouseEvent", {
        type: "mouseReleased",
        x: b.x + 212,
        y: b.y + 98,
        button: "left",
        buttons: 0,
        clickCount: 1,
        pointerType: "pen",
        force: 0,
      });
      await idle();
      const r = await page.evaluate(() => window.brushLab.getRecord());
      assert(
        Math.max(...r.geometry.map((p) => p.p)) > r.geometry[0].p,
        "pressure unchanged",
      );
      assert(
        r.geometry.some((p) => p.valid & 2),
        "tilt missing",
      );
      await cdp.detach();
    },
  );
  await check("search no-result and recovery", async () => {
    await page.locator("#search").fill("不存在abcdefgh");
    assert((await page.locator("#brush option").count()) === 0, "not filtered");
    await page.locator("#search").fill("");
    assert(
      (await page.locator("#brush option").count()) === 56,
      "filter not recoverable",
    );
  });
  await check(
    "corrupt stroke import shows error and preserves pixels",
    async () => {
      const before = await image();
      await page.locator("#file").setInputFiles({
        name: "bad.json",
        mimeType: "application/json",
        buffer: Buffer.from('{"version":99}'),
      });
      await page.waitForFunction(() =>
        document.querySelector("#status").textContent.includes("unsupported"),
      );
      assert(
        JSON.stringify(before) === JSON.stringify(await image()),
        "import changed image",
      );
    },
  );
  await check("custom preset validation rejects malformed curve", async () => {
    await page.locator("aside details").last().locator("summary").click();
    await page.locator("#edit").click();
    const text = await page.locator("#presetJson").inputValue(),
      p = JSON.parse(text);
    p.mappings = [
      {
        source: "pressure",
        target: "size",
        min: 0,
        max: 1,
        mode: "multiply",
        curve: [
          [1, 1],
          [0, 0],
        ],
      },
    ];
    await page.locator("#presetJson").fill(JSON.stringify(p));
    await page.locator("#apply").click();
    assert(
      (await page.locator("#status").innerText()).includes("curve"),
      "malformed curve accepted",
    );
  });
  await check(
    "keyboard settings, focus and input numeric invalid recovery",
    async () => {
      await page.locator("#size").focus();
      await page.keyboard.press("ControlOrMeta+A");
      await page.keyboard.type("20");
      await page.keyboard.press("Tab");
      assert(
        (await page.locator("#size").inputValue()) === "20",
        "keyboard number",
      );
      await page.locator("#size").fill("-5");
      await page.locator("#size").dispatchEvent("change");
      assert(
        Number(await page.locator("#size").inputValue()) >= 0.1,
        "invalid size retained",
      );
    },
  );
  await check("mobile touch high DPI and 4x CPU workflow", async () => {
    const mobile = await browser.newContext({
      viewport: { width: 390, height: 844 },
      deviceScaleFactor: 2.75,
      hasTouch: true,
      isMobile: true,
    });
    const p = await mobile.newPage();
    p.on("pageerror", (e) => errors.push(String(e)));
    await p.goto(process.env.BRUSH_LAB_URL ?? "http://127.0.0.1:5188");
    await p.waitForFunction(() => window.brushLab);
    await font(p);
    const cdp = await mobile.newCDPSession(p);
    await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 });
    assert(
      await p.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
      "horizontal overflow",
    );
    const b = await p.locator("#canvas").boundingBox();
    await p.touchscreen.tap(b.x + 80, b.y + 50);
    await p.waitForFunction(() => !window.brushLab.getActive());
    assert(
      (await p.evaluate(() => window.brushLab.getRecord())) !== undefined,
      "touch dot not committed",
    );
    await p.locator("#mobileBrush").selectOption("silk");
    await p.locator("#mobileSize").fill("22");
    await p.locator("#mobileSize").dispatchEvent("change");
    assert(
      (await p.locator("#size").inputValue()) === "22",
      "mobile size not shared",
    );
    await p.screenshot({
      path: "docs/brush/evidence/current-mobile.png",
      fullPage: true,
    });
    await mobile.close();
  });
  await check(
    "320/760/1024/1440 reflow, text 200%, portrait/landscape",
    async () => {
      for (const [w, h] of [
        [320, 800],
        [760, 900],
        [1024, 768],
        [1440, 900],
        [844, 390],
      ]) {
        await page.setViewportSize({ width: w, height: h });
        assert(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth,
          ),
          "overflow " + w,
        );
      }
      await page.addStyleTag({ content: "body{font-size:200%}" });
      await page.setViewportSize({ width: 390, height: 844 });
      assert(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
        "text scale overflow",
      );
    },
  );
  await check(
    "offline single HTML loads without external requests and draws",
    async () => {
      const p = await context.newPage();
      let requests = 0;
      p.on("request", (r) => {
        if (r.url().startsWith("http")) requests++;
      });
      await p.goto(
        "file://" +
          process.cwd() +
          "/prototypes/brush-lab/illustro-brush-lab.html",
      );
      await p.waitForFunction(() => window.brushLab);
      await font(p);
      await p.locator("#test").click();
      await p.waitForFunction(() => !window.brushLab.getActive());
      assert(
        (await p.evaluate(() => window.brushLab.getRecord())) !== undefined,
        "offline draw",
      );
      assert(requests === 0, "external request");
      await p.screenshot({
        path: "docs/brush/evidence/current-desktop.png",
        fullPage: true,
      });
      await p.close();
    },
  );
  await check("no uncaught page errors", async () =>
    assert(errors.length === 0, JSON.stringify(errors)),
  );
  await context.close();
} finally {
  await writeFile(
    "docs/brush/evidence/current-browser-results.json",
    JSON.stringify(
      {
        date: new Date().toISOString(),
        chromium: await browser.version(),
        scope:
          "Headless software browser; synthetic pen and emulated mobile are not physical device certification",
        results,
        errors,
      },
      null,
      2,
    ),
  );
  await browser.close();
  await server.close();
}
console.log(JSON.stringify(results));
if (results.some((r) => r.status === "FAIL")) process.exitCode = 1;
