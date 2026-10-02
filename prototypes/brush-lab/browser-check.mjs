import { createRequire } from "node:module";
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import assert from "node:assert/strict";
const req = createRequire(
  process.env.BRUSH_BROWSER_PACKAGE_ROOT
    ? resolve(process.env.BRUSH_BROWSER_PACKAGE_ROOT, "package.json")
    : import.meta.url,
);
const { chromium } = req("playwright-core");
const browser = await chromium.launch({
  headless: true,
  ...(process.env.BRUSH_CHROMIUM_PATH
    ? { executablePath: process.env.BRUSH_CHROMIUM_PATH }
    : {}),
  args: [
    "--no-sandbox",
    "--disable-dev-shm-usage",
    "--disable-gpu",
    "--no-zygote",
  ],
});
const target = pathToFileURL(
    resolve("prototypes/brush-lab/illustro-brush-lab.html"),
  ).href,
  out = resolve("docs/brush/evidence");
mkdirSync(out, { recursive: true });
const checks = [],
  errors = [],
  network = [];
const start = Date.now();
async function check(name, fn) {
  try {
    const observed = await fn();
    checks.push({ name, status: "PASS", observed: observed ?? null });
    console.log("PASS " + name);
  } catch (e) {
    checks.push({ name, status: "FAIL", error: String(e) });
    console.log("FAIL " + name + " " + String(e));
  }
}
const context = await browser.newContext({
    viewport: { width: 1280, height: 900 },
  }),
  page = await context.newPage();
page.on("pageerror", (e) => errors.push(String(e)));
page.on("request", (r) => {
  if (/^https?:/.test(r.url())) network.push(r.url());
});
const state = () => page.evaluate(() => window.__brushLab.state());
const wait = () =>
  page.waitForFunction(
    () =>
      !window.__brushLab.state().active && !window.__brushLab.state().release,
    { timeout: 30000 },
  );
await check(
  "offline initialization, 56 brushes, no HTTP dependency",
  async () => {
    await page.goto(target);
    await page.waitForFunction(() => !!window.__brushLab);
    assert.equal(await page.locator("#brush option").count(), 56);
    assert.equal(network.length, 0);
  },
);
await check("actual mouse capture and final raster replay", async () => {
  const b = await page.locator("#draw").boundingBox();
  await page.mouse.move(b.x + 100, b.y + 180);
  await page.mouse.down();
  for (let i = 0; i < 20; i++)
    await page.mouse.move(b.x + 100 + i * 18, b.y + 180 + Math.sin(i / 4) * 30);
  await page.mouse.up();
  await wait();
  assert.equal((await state()).records, 1);
  assert.equal(
    await page.evaluate(() => window.__brushLab.replayEqual()),
    true,
  );
});
await check("undo then redo preserve canvas bytes", async () => {
  const before = await page.evaluate(() =>
    window.__brushLab.bytes().reduce((n, x) => n + x, 0),
  );
  await page.locator("#undo").click();
  assert.equal((await state()).records, 0);
  await page.locator("#redo").click();
  assert.equal((await state()).records, 1);
  assert.equal(
    await page.evaluate(() =>
      window.__brushLab.bytes().reduce((n, x) => n + x, 0),
    ),
    before,
  );
});
await check(
  "synthetic CDP pen pressure and tilt, not hardware evidence",
  async () => {
    const b = await page.locator("#draw").boundingBox(),
      cdp = await context.newCDPSession(page);
    await cdp.send("Input.dispatchMouseEvent", {
      type: "mousePressed",
      x: b.x + 90,
      y: b.y + 70,
      button: "left",
      buttons: 1,
      clickCount: 1,
      pointerType: "pen",
      force: 0.1,
      tiltX: 20,
      tiltY: 10,
    });
    for (let i = 0; i < 15; i++)
      await cdp.send("Input.dispatchMouseEvent", {
        type: "mouseMoved",
        x: b.x + 90 + i * 20,
        y: b.y + 70 + i * 4,
        button: "left",
        buttons: 1,
        pointerType: "pen",
        force: 0.1 + i * 0.05,
        tiltX: 20,
        tiltY: 10,
      });
    await cdp.send("Input.dispatchMouseEvent", {
      type: "mouseReleased",
      x: b.x + 370,
      y: b.y + 126,
      button: "left",
      buttons: 0,
      pointerType: "pen",
      force: 0,
    });
    await wait();
    const r = await page.evaluate(() =>
      window.__brushLab.bundle().records.at(-1),
    );
    assert.ok(r.geometry.some((p) => p.valid & 2));
    assert.ok(
      Math.max(...r.geometry.map((p) => p.p)) -
        Math.min(...r.geometry.map((p) => p.p)) >
        0.2,
    );
    assert.equal(
      await page.evaluate(() => window.__brushLab.replayEqual()),
      true,
    );
  },
);
await check("cancel discards unpublished artwork", async () => {
  const count = (await state()).records,
    b = await page.locator("#draw").boundingBox();
  await page.mouse.move(b.x + 50, b.y + 50);
  await page.mouse.down();
  await page.mouse.move(b.x + 160, b.y + 90);
  await page.keyboard.press("Escape");
  await page.mouse.up();
  assert.equal((await state()).records, count);
  assert.equal((await state()).active, false);
});
await check("JSON save/import and reload restoration", async () => {
  await page.waitForTimeout(600);
  const before = (await state()).records;
  await page.reload();
  await page.waitForFunction(() => !!window.__brushLab);
  assert.equal((await state()).records, before);
  assert.equal(
    await page.evaluate(() => window.__brushLab.replayEqual()),
    true,
  );
  const file = await page.evaluate(() =>
    JSON.stringify(window.__brushLab.bundle()),
  );
  await page
    .locator("#file")
    .setInputFiles({
      name: "stroke.json",
      mimeType: "application/json",
      buffer: Buffer.from(file),
    });
  await page.waitForFunction(() =>
    document.querySelector("#status").textContent.includes("開きました"),
  );
  assert.equal((await state()).records, before);
});
await check("corrupt imports retain current artwork", async () => {
  const before = (await state()).records;
  await page
    .locator("#file")
    .setInputFiles({
      name: "invalid.json",
      mimeType: "application/json",
      buffer: Buffer.from('{"version":99}'),
    });
  await page.waitForFunction(() =>
    document.querySelector("#status").textContent.includes("保持"),
  );
  assert.equal((await state()).records, before);
});
await check("search, no-result state and native controls", async () => {
  await page.locator("#search").fill("髪");
  assert.ok((await page.locator("#brush option").count()) < 56);
  await page.locator("#search").fill("no_such_brush");
  assert.equal(await page.locator("#brush").textContent(), "見つかりません");
  await page.locator("#search").fill("");
  await page.locator("#sizeNumber").fill("16");
  await page.locator("#opacityNumber").fill("0.65");
  await page.locator("#flowNumber").fill("0.7");
  await page.locator("#stabilizationNumber").fill("0.85");
  assert.equal((await state()).preset.size, 16);
});
await check("invalid custom preset rejected with visible error", async () => {
  await page
    .locator("details")
    .filter({ hasText: "ペンの全設定を編集" })
    .locator("summary")
    .click();
  await page.locator("#presetJson").fill('{"version":99}');
  await page.locator("#applyPreset").click();
  assert.ok((await page.locator("#jsonError").textContent()).length > 0);
});
await check("comparison canvases and point toggles", async () => {
  await page.locator("#compare").check();
  await page.locator("#raw").check();
  await page.locator("#processed").check();
  assert.equal(await page.locator("#compareArea").isVisible(), true);
  await page.locator("#raw").uncheck();
  await page.locator("#processed").uncheck();
});
await check("all eight synthetic stroke shapes replay exactly", async () => {
  await page.evaluate(() => window.__brushLab.reset());
  for (const shape of [
    "line",
    "curve",
    "circle",
    "s",
    "zigzag",
    "small-loop",
    "long",
    "dot",
  ]) {
    await page.evaluate((s) => window.__brushLab.pattern(s), shape);
    assert.equal(
      await page.evaluate(() => window.__brushLab.replayEqual()),
      true,
    );
  }
  return { shapes: 8 };
});
await check(
  "held airbrush gains color without fabricated input geometry",
  async () => {
    await page.locator("#brush").selectOption("fine-air");
    await page.locator("#draw").scrollIntoViewIfNeeded();
    const before = (await state()).records;
    const b = await page.locator("#draw").boundingBox();
    await page.mouse.move(b.x + 150, b.y + 150);
    await page.mouse.down();
    await page.waitForTimeout(250);
    await page.mouse.up();
    await wait();
    assert.equal((await state()).records, before + 1);
    const r = await page.evaluate(() =>
      window.__brushLab.bundle().records.at(-1),
    );
    assert.ok(r.commands.flat().length / 16 > r.geometry.length);
    assert.equal(
      await page.evaluate(() => window.__brushLab.replayEqual()),
      true,
    );
  },
);
await check("320px, phone/tablet/desktop and text-resize layout", async () => {
  for (const width of [320, 390, 720, 1024, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    assert.ok(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth + 1,
      ),
      String(width),
    );
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.addStyleTag({
    content:
      "html{font-size:30px!important}input,select,button{font-size:inherit!important}",
  });
  assert.ok(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth + 1,
    ),
  );
});
await check(
  "touch, high DPI and CPU-throttle software mobile profile",
  async () => {
    const mobile = await browser.newContext({
        viewport: { width: 390, height: 844 },
        deviceScaleFactor: 2.75,
        hasTouch: true,
        isMobile: true,
      }),
      m = await mobile.newPage(),
      cdp = await mobile.newCDPSession(m);
    await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 });
    await m.goto(target);
    await m.waitForFunction(() => !!window.__brushLab);
    await m.locator("#draw").scrollIntoViewIfNeeded();
    const b = await m.locator("#draw").boundingBox();
    await m.touchscreen.tap(b.x + 80, b.y + 70);
    await m.waitForFunction(() => window.__brushLab.state().records === 1);
    assert.equal(await m.evaluate(() => window.__brushLab.replayEqual()), true);
    await m.screenshot({ path: out + "/browser-mobile.png", fullPage: true });
    await mobile.close();
    return {
      width: 390,
      height: 844,
      dpr: 2.75,
      cpuThrottle: 4,
      physicalAndroid: false,
    };
  },
);
await check("keyboard reaches controls and focus is visible", async () => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.locator("#search").focus();
  await page.keyboard.press("Tab");
  assert.equal(await page.evaluate(() => document.activeElement.id), "brush");
  await page.keyboard.press("Tab");
  assert.equal(await page.evaluate(() => document.activeElement.id), "size");
  assert.ok(
    await page
      .locator("#size")
      .evaluate((e) => getComputedStyle(e).outlineStyle !== "none"),
  );
});
await check("three-minute scheduled 240Hz input run", async () => {
  const runPage = await context.newPage();
  await runPage.goto(target);
  await runPage.waitForFunction(() => !!window.__brushLab);
  await runPage.evaluate(() => window.__brushLab.reset());
  const duration = +(process.env.BRUSH_SUSTAINED_MS ?? 180000);
  const start = Date.now();
  await runPage.evaluate((d) => window.__brushLab.sustained(d), duration);
  const result = await runPage.evaluate(() => window.__brushLab.state());
  assert.ok(Date.now() - start >= duration);
  assert.equal(result.telemetry.errors.length, 0);
  writeFileSync(
    out + "/browser-sustained.json",
    JSON.stringify(
      {
        scope:
          "scheduled software input; not physical pen, thermal or display certification",
        durationMs: Date.now() - start,
        ...result,
      },
      null,
      2,
    ),
  );
  await runPage.close();
  return {
    durationMs: Date.now() - start,
    accepted: result.telemetry.accepted,
    strokes: result.records,
  };
});
// Fresh inspection state removes text-resize and expected-invalid-preset UI from screenshots.
await page.reload();
await page.waitForFunction(() => !!window.__brushLab);
await page.evaluate(() => window.__brushLab.reset());
await page.locator("#brush").selectOption("clean-ink");
await page.evaluate(() => window.__brushLab.pattern("curve"));
// Optional inspection-only font injection. It is not shipped and is excluded from timing evidence.
if (process.env.BRUSH_INSPECTION_FONT_ROOT) {
  const font = process.env.BRUSH_INSPECTION_FONT_ROOT;
  let css = readFileSync(resolve(font, "400.css"), "utf8");
  css = css.replace(
    /src: url\(\.\/files\/([^)]*\.woff2)\)[^;]*;/g,
    (_, name) =>
      `src:url(data:font/woff2;base64,${readFileSync(resolve(font, "files", name)).toString("base64")}) format('woff2');`,
  );
  await page.addStyleTag({
    content:
      css +
      'html,input,button,select,textarea,pre,#metrics{font-family:"Noto Sans JP",sans-serif!important}',
  });
  await page.evaluate(() => document.fonts.ready);
}
await page.screenshot({ path: out + "/browser-desktop.png", fullPage: true });
await check("no browser script errors or HTTP requests", async () => {
  assert.deepEqual(errors, []);
  assert.deepEqual(network, []);
});
const report = {
  version: 1,
  measuredAt: new Date().toISOString(),
  browser: browser.version(),
  durationMs: Date.now() - start,
  checks,
  errors,
  network,
  physicalDeviceStatus: "UNVERIFIED",
  humanDrawingQuality: "UNVERIFIED",
};
writeFileSync(out + "/browser-checks.json", JSON.stringify(report, null, 2));
await browser.close();
if (checks.some((c) => c.status === "FAIL")) process.exitCode = 1;
