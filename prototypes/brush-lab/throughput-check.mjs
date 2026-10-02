import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";
import { resolve } from "node:path";
import { writeFileSync } from "node:fs";
import assert from "node:assert/strict";
const { chromium } = createRequire(import.meta.url)("playwright-core");
const browser = await chromium.launch({
  headless: true,
  ...(process.env.BRUSH_CHROMIUM_PATH
    ? { executablePath: process.env.BRUSH_CHROMIUM_PATH }
    : {}),
  args: [
    "--no-sandbox",
    "--disable-dev-shm-usage",
    "--use-gl=angle",
    "--use-angle=swiftshader",
    "--enable-unsafe-swiftshader",
  ],
});
const page = await browser.newPage();
await page.addInitScript(() => {
  const reset = () => ({
    copies: 0,
    copyPixels: 0,
    draws: 0,
    blits: 0,
    blitPixels: 0,
    screenPixels: 0,
  });
  window.__resetGPUWork = reset;
  window.__gpuWork = reset();
  const states = new WeakMap();
  for (const name of [
    "bindFramebuffer",
    "enable",
    "disable",
    "scissor",
    "blitFramebuffer",
    "copyTexSubImage2D",
    "drawArrays",
    "drawArraysInstanced",
  ]) {
    const original = WebGL2RenderingContext.prototype[name];
    WebGL2RenderingContext.prototype[name] = function (...a) {
      let s = states.get(this);
      if (!s) {
        s = {
          destination: null,
          scissor: false,
          rect: [0, 0, this.canvas.width, this.canvas.height],
        };
        states.set(this, s);
      }
      const w = window.__gpuWork;
      if (
        name === "bindFramebuffer" &&
        (a[0] === this.FRAMEBUFFER || a[0] === this.DRAW_FRAMEBUFFER)
      )
        s.destination = a[1];
      if (name === "enable" && a[0] === this.SCISSOR_TEST) s.scissor = true;
      if (name === "disable" && a[0] === this.SCISSOR_TEST) s.scissor = false;
      if (name === "scissor") s.rect = a;
      if (name === "blitFramebuffer") {
        w.blits++;
        w.blitPixels += Math.abs((a[2] - a[0]) * (a[3] - a[1]));
      }
      if (name === "copyTexSubImage2D") {
        w.copies++;
        w.copyPixels += a[6] * a[7];
      }
      if (name === "drawArrays" || name === "drawArraysInstanced") {
        w.draws++;
        if (!s.destination)
          w.screenPixels += s.scissor
            ? s.rect[2] * s.rect[3]
            : this.canvas.width * this.canvas.height;
      }
      return original.apply(this, a);
    };
  }
});
await page.goto(
  pathToFileURL(
    resolve(
      process.env.BRUSH_THROUGHPUT_HTML ??
        "prototypes/brush-lab/illustro-brush-lab.html",
    ),
  ).href,
);
await page.waitForFunction(() => window.__brushLab);
const cases = [];
for (const id of ["clean-ink", "rough-pencil"])
  for (const size of [16, 128, 512, 1024]) {
    const r = await page.evaluate(
      async ({ id, size }) => {
        const l = window.__brushLab;
        l.reset();
        l.load({
          ...l.presets.find((p) => p.id === id),
          size,
          stabilization: 0.5,
        });
        const g = (
          document.getElementById("live") ?? document.getElementById("draw")
        ).getContext("webgl2");
        l.begin();
        g.finish();
        g.readPixels(0, 0, 1, 1, g.RGBA, g.UNSIGNED_BYTE, new Uint8Array(4));
        window.__gpuWork = window.__resetGPUWork();
        const start = performance.now();
        let cpu = 0,
          tipGap = 0;
        for (let i = 0; i < 100; i++) {
          const x = 80 + i * 6,
            y = 240 + 40 * Math.sin(i / 12),
            a = performance.now();
          l.accept({ x, y, t: 1 + (i * 1000) / 240, pressure: 0.7 });
          l.present();
          cpu += performance.now() - a;
          const q = l.state().corrected;
          tipGap = Math.max(tipGap, Math.hypot(q.x - x, q.y - y));
        }
        const sent = performance.now() - start;
        g.finish();
        g.readPixels(0, 0, 1, 1, g.RGBA, g.UNSIGNED_BYTE, new Uint8Array(4));
        const complete = performance.now() - start,
          work = { ...window.__gpuWork };
        l.finish();
        await l.settled();
        return {
          id,
          size,
          cpuHandlerTotalMs: cpu,
          submittedMs: sent,
          gpuCompletedMs: complete,
          gpuWaitAfterSubmissionMs: complete - sent,
          rawToCorrectedMaxPx: tipGap,
          ...work,
          floatBlend: !!g.getExtension("EXT_float_blend"),
          desynchronized: g.getContextAttributes().desynchronized,
        };
      },
      { id, size },
    );
    cases.push(r);
    console.log(JSON.stringify(r));
  }
const long = [];
for (const size of [16, 128, 512]) {
  const r = await page.evaluate(async (size) => {
    const l = window.__brushLab;
    l.reset();
    l.load({
      ...l.presets.find((p) => p.id === "rough-pencil"),
      size,
      stabilization: 0.5,
    });
    const g = (
      document.getElementById("live") ?? document.getElementById("draw")
    ).getContext("webgl2");
    l.begin();
    const windows = [];
    let times = [];
    for (let i = 0; i < 4096; i++) {
      if (i === 256 || i === 3968) {
        g.finish();
        g.readPixels(0, 0, 1, 1, g.RGBA, g.UNSIGNED_BYTE, new Uint8Array(4));
        window.__gpuWork = window.__resetGPUWork();
        times = [];
      }
      const start = performance.now();
      l.accept({
        x: 384 + 250 * Math.sin((i * Math.PI) / 64),
        y: 256 + 140 * Math.sin((i * Math.PI) / 32),
        t: 1 + (i * 1000) / 240,
        pressure: 0.7,
      });
      l.present();
      if ((i >= 256 && i < 384) || i >= 3968)
        times.push(performance.now() - start);
      if (i === 383 || i === 4095) {
        const waitStart = performance.now();
        g.finish();
        g.readPixels(0, 0, 1, 1, g.RGBA, g.UNSIGNED_BYTE, new Uint8Array(4));
        const wait = performance.now() - waitStart,
          s = times.toSorted((a, b) => a - b);
        windows.push({
          inputs: 128,
          endingInput: i + 1,
          handlerP95Ms: s[Math.floor(s.length * 0.95)],
          handlerTotalMs: times.reduce((a, b) => a + b, 0),
          GPUWaitMs: wait,
          ...window.__gpuWork,
        });
      }
    }
    l.finish();
    await l.settled();
    return { size, totalInputs: 4096, windows };
  }, size);
  long.push(r);
  console.log(JSON.stringify(r));
}
await browser.close();
if (process.env.BRUSH_THROUGHPUT_VERIFY === "1") {
  for (const c of cases) {
    assert.equal(c.copies, 0, "common ink must not copy framebuffer per dab");
    if (c.size === 16)
      assert.ok(
        c.blitPixels < 100 * 768 * 512 * 0.15,
        "thin stroke must avoid full-canvas copies",
      );
  }
  for (const c of long) {
    const [early, late] = c.windows;
    assert.ok(
      late.draws <= early.draws * 1.2,
      "long stroke must not replay old brush commands",
    );
    assert.ok(
      late.blitPixels <= early.blitPixels * 1.2,
      "long stroke must not process an expanding history",
    );
  }
}
writeFileSync(
  process.env.BRUSH_THROUGHPUT_OUT ??
    "docs/brush/evidence/throughput-after-v2.json",
  JSON.stringify(
    {
      scope:
        "Headless Chromium / SwiftShader. Input handler time plus explicit finish/one-pixel readback completion barriers at measurement boundaries; not pen-to-photon. 4096 inputs in one stroke, repeated 128-input path, compared after warmup and at end. Instrumented pixel area is submitted work, not hardware GPU duration.",
      cases,
      long,
    },
    null,
    2,
  ),
);
