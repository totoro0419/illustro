import { createRequire } from "node:module";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { writeFileSync, mkdirSync } from "node:fs";
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
const checks = [],
  errors = [];
async function check(name, fn) {
  try {
    const observed = await fn();
    checks.push({ name, status: "PASS", observed });
    console.log("PASS", name, JSON.stringify(observed));
  } catch (e) {
    checks.push({ name, status: "FAIL", error: String(e) });
    console.log("FAIL", name, String(e));
  }
}
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
page.on("pageerror", (e) => errors.push(String(e)));
await page.goto(
  pathToFileURL(resolve("prototypes/brush-lab/illustro-brush-lab.html")).href,
);
await page.waitForFunction(() => window.__brushLab);
await check(
  "visible GPU canvas receives input directly without a transparent DOM overlay",
  async () => {
    const r = await page.evaluate(() => {
      const c = document.getElementById("draw"),
        b = c.getBoundingClientRect();
      return {
        top: document.elementFromPoint(
          b.left + b.width / 2,
          b.top + b.height / 2,
        )?.id,
        context: !!c.getContext("webgl2"),
        diagnosticsHidden: document.getElementById("diagnostics").hidden,
        desynchronized: window.__brushLab.state().desynchronized,
      };
    });
    assert.equal(r.top, "draw");
    assert.equal(r.context, true);
    assert.equal(r.diagnosticsHidden, true);
    return r;
  },
);
await check(
  "GPU active; no reference completion required for first point or latest corrected endpoint",
  async () => {
    const result = await page.evaluate(() => {
      const l = window.__brushLab;
      l.reset();
      l.load({
        ...l.presets[0],
        size: 20,
        grain: 0,
        flow: 1,
        stabilization: 0,
        taperStart: 0,
        taperEnd: 0,
      });
      l.begin();
      l.accept({ x: 90, y: 90, t: 1, pressure: 1 });
      l.present();
      const first = l.visibleBytes()[(90 * 768 + 90) * 4 + 3];
      l.accept({ x: 300, y: 90, t: 2, pressure: 1 });
      l.present();
      const latest = l.visibleBytes()[(90 * 768 + 300) * 4 + 3];
      l.finish();
      const pending = l.state().release;
      l.begin();
      l.accept({ x: 90, y: 180, t: 3, pressure: 1 });
      l.present();
      const next = l.visibleBytes()[(180 * 768 + 90) * 4 + 3];
      l.finish();
      return {
        renderer: l.state().renderer,
        first,
        latest,
        pending,
        next,
        records: l.state().records,
      };
    });
    assert.equal(result.renderer, "webgl2");
    assert.equal(result.first, 255);
    assert.equal(result.latest, 255);
    assert.equal(result.pending, true);
    assert.equal(result.next, 255);
    assert.equal(result.records, 2);
    await page.evaluate(() => window.__brushLab.settled());
    assert.equal(
      await page.evaluate(() => window.__brushLab.replayEqual()),
      true,
    );
    return result;
  },
);
await check(
  "continuous preview reaches the latest corrected point with correction OFF, medium and strong",
  async () => {
    const results = [];
    for (const stabilization of [0, 0.5, 1]) {
      const result = await page.evaluate((stabilization) => {
        const l = window.__brushLab;
        l.reset();
        l.load({
          ...l.presets[0],
          size: 32,
          grain: 0,
          flow: 1,
          taperEnd: 0,
          taperStart: 0,
          stabilization,
        });
        l.begin();
        let misses = 0;
        for (let i = 0; i < 100; i++) {
          l.accept({
            x: 60 + i * 6,
            y: 240 + 65 * Math.sin(i / 6),
            t: 10 + i * 4,
            pressure: 1,
          });
          l.present();
          const p = l.state().corrected,
            a = l.visibleBytes();
          if (!a[(Math.floor(p.y) * 768 + Math.floor(p.x)) * 4 + 3]) misses++;
        }
        const presentations = l.state().presentations;
        l.finish();
        return { stabilization, checked: 100, misses, presentations };
      }, stabilization);
      assert.equal(result.misses, 0);
      await page.evaluate(() => window.__brushLab.settled());
      results.push(result);
    }
    return results;
  },
);
await check(
  "partial preview restores old mutable ink across reversals and overlaps",
  async () => {
    const cases = await page.evaluate(() => {
      const l = window.__brushLab,
        results = [];
      for (const variableOpacity of [false, true]) {
        l.reset();
        l.load({
          ...l.presets.find((p) => p.id === "clean-ink"),
          size: 36,
          taperEnd: 96,
          stabilization: 0.5,
          ...(variableOpacity
            ? {
                mappings: [
                  {
                    source: "pressure",
                    target: "opacity",
                    min: 0.1,
                    max: 1,
                    curve: [
                      [0, 0],
                      [1, 1],
                    ],
                    mode: "multiply",
                  },
                ],
              }
            : {}),
        });
        l.begin();
        let over2 = 0,
          max = 0;
        for (let i = 0; i < 80; i++) {
          l.accept({
            x: 140 + 210 * Math.sin(i / 13),
            y: 240 + 100 * Math.sin(i / 7),
            t: 1 + i * 4,
            pressure: 0.2 + (0.7 * (i % 17)) / 17,
          });
          l.present();
          if (i % 10 === 9) {
            const visible = l.visibleBytes(),
              reference = l.previewReferenceBytes();
            for (let c = 0; c < visible.length; c++) {
              const d = Math.abs(visible[c] - reference[c]);
              max = Math.max(max, d);
              if (d > 2) over2++;
            }
          }
        }
        l.abort();
        results.push({
          variableOpacity,
          snapshots: 8,
          maxChannelError: max,
          channelsOver2: over2,
        });
      }
      return results;
    });
    for (const c of cases) assert.equal(c.channelsOver2, 0);
    return cases;
  },
);
await check(
  "native contact and every native motion submit visible ink before returning from the event",
  async () => {
    await page.evaluate(() => {
      const l = window.__brushLab;
      l.reset();
      l.load({
        ...l.presets[0],
        size: 128,
        grain: 0,
        flow: 1,
        stabilization: 0,
        taperStart: 0,
        taperEnd: 12,
      });
      window.__nativeProbe = [];
      window.__nativeTimingStart = l.state().telemetry.receiveToRAF.length;
      for (const type of ["pointerdown", "pointermove", "pointerup"])
        document.addEventListener(type, (e) => {
          if (e.target.id === "draw" && (type !== "pointermove" || e.buttons)) {
            window.__nativeProbe.push({
              type,
              time: performance.now(),
              presentations: l.state().presentations,
            });
            if (type === "pointerdown") {
              const rect = e.target.getBoundingClientRect(),
                x = Math.floor(((e.clientX - rect.left) * 768) / rect.width),
                y = Math.floor(((e.clientY - rect.top) * 512) / rect.height);
              window.__firstNativeAlpha =
                l.visibleBytes()[(y * 768 + x) * 4 + 3];
            }
          }
        });
    });
    const box = await page.locator("#draw").boundingBox();
    await page.mouse.move(box.x + box.width * 0.1, box.y + box.height * 0.4);
    await page.mouse.down();
    for (let i = 1; i <= 80; i++) {
      await page.mouse.move(
        box.x + box.width * (0.1 + (0.8 * i) / 80),
        box.y + box.height * (0.4 + 0.1 * Math.sin(i / 9)),
      );
      await new Promise((r) => setTimeout(r, 5));
    }
    await page.mouse.up();
    await page.evaluate(() => window.__brushLab.settled());
    const result = await page.evaluate(() => {
      const p = window.__nativeProbe;
      return {
        events: p.length,
        firstAlpha: window.__firstNativeAlpha,
        everyMovePresented: p.every(
          (e, i) => i === 0 || e.presentations > p[i - 1].presentations,
        ),
        submissionP95Ms: [
          ...window.__brushLab
            .state()
            .telemetry.receiveToRAF.slice(window.__nativeTimingStart),
        ]
          .sort((a, b) => a - b)
          .at(
            Math.floor(
              (window.__brushLab.state().telemetry.receiveToRAF.length -
                window.__nativeTimingStart) *
                0.95,
            ),
          ),
        errors: window.__brushLab.state().telemetry.errors,
        inputSource: window.__brushLab.state().inputSource,
        nativeGeometry: window.__brushLab.bundle().records.at(-1).geometry
          .length,
      };
    });
    assert.equal(result.firstAlpha, 255);
    assert.equal(result.everyMovePresented, true);
    assert.equal(result.errors.length, 0);
    return result;
  },
);
await check(
  "56 presets: GPU final visible ink compared with exact CPU reference, then exact worker replay",
  async () => {
    const results = [];
    for (let index = 0; index < 56; index++) {
      const result = await page.evaluate((index) => {
        const l = window.__brushLab;
        l.reset();
        const p = l.presets[index];
        l.load(p);
        l.begin();
        for (let i = 0; i < 40; i++)
          l.accept({
            x: 100 + i * 6,
            y: 210 + 40 * Math.sin(i / 8),
            t: 100 + i * 8,
            pressure: 0.3 + 0.6 * Math.sin((i / 39) * Math.PI),
            tilt: 0.25,
            azimuth: 0.7,
            twist: 0.5,
            pointerType: "pen",
          });
        l.finish();
        const live = l.visibleBytes(),
          reference = l.referenceBytes();
        let max = 0,
          total = 0,
          large = 0,
          painted = 0;
        for (let i = 0; i < live.length; i++) {
          const d = Math.abs(live[i] - reference[i]);
          max = Math.max(max, d);
          total += d;
          if (d > 2) large++;
          if (reference[i]) painted++;
        }
        return {
          id: p.id,
          maxChannelError: max,
          meanChannelError: total / live.length,
          channelsOver2: large,
          painted,
        };
      }, index);
      await page.evaluate(() => window.__brushLab.settled());
      assert.equal(
        await page.evaluate(() => window.__brushLab.replayEqual()),
        true,
      );
      results.push(result);
    }
    // Float presentation is evaluated separately from strict, byte-identical persistence.
    for (const r of results) {
      assert.ok(r.meanChannelError < 0.15, JSON.stringify(r));
      assert.ok(r.channelsOver2 <= 16, JSON.stringify(r));
    }
    return results;
  },
);
await check(
  "custom image tips, image grain, dual tips and all blend modes over existing artwork",
  async () => {
    const results = [];
    for (const blend of ["normal", "multiply", "screen", "erase"]) {
      await page.evaluate(async () => {
        const l = window.__brushLab;
        l.reset();
        l.load({
          ...l.presets[0],
          size: 80,
          grain: 0,
          flow: 1,
          taperEnd: 0,
          stabilization: 0,
          color: [0.8, 0.5, 0.2],
        });
        l.begin();
        l.accept({ x: 200, y: 200, t: 1, pressure: 1 });
        l.accept({ x: 260, y: 220, t: 10, pressure: 1 });
        l.finish();
        await l.settled();
      });
      const r = await page.evaluate((blend) => {
        const l = window.__brushLab;
        l.load({
          ...l.presets[0],
          size: 48,
          tip: "mask",
          mask: { width: 3, height: 2, alpha: [1, 0.2, 0, 0.3, 1, 0.7] },
          dual: "ellipse",
          dualAspect: 0.7,
          grain: 0.6,
          grainKind: "image",
          texture: { width: 2, height: 2, alpha: [1, 0.1, 0.3, 0.8] },
          grainScale: 8,
          grainRotation: 0.5,
          rotation: 0.6,
          follow: false,
          taperEnd: 8,
          stabilization: 0.7,
          blend,
          color: [0.2, 0.6, 0.9],
        });
        l.begin();
        for (let i = 0; i < 30; i++) {
          l.accept({
            x: 180 + i * 4,
            y: 205 + 10 * Math.sin(i / 5),
            t: 30 + i * 4,
            pressure: 0.7,
          });
          l.present();
        }
        l.finish();
        const a = l.visibleBytes(),
          b = l.referenceBytes();
        let max = 0,
          large = 0;
        for (let i = 0; i < a.length; i++) {
          const d = Math.abs(a[i] - b[i]);
          max = Math.max(max, d);
          if (d > 2) large++;
        }
        return { blend, maxChannelError: max, channelsOver2: large };
      }, blend);
      await page.evaluate(() => window.__brushLab.settled());
      assert.equal(
        await page.evaluate(() => window.__brushLab.replayEqual()),
        true,
      );
      assert.ok(r.channelsOver2 <= 16, JSON.stringify(r));
      results.push(r);
    }
    return results;
  },
);
await check(
  "context loss restores completed artwork and cancels only the active stroke",
  async () => {
    const r = await page.evaluate(() => {
      const l = window.__brushLab,
        before = l.state().records;
      l.begin();
      l.accept({ x: 50, y: 50, t: 300, pressure: 1 });
      l.present();
      document
        .getElementById("draw")
        .dispatchEvent(new Event("webglcontextlost", { cancelable: true }));
      return {
        before,
        after: l.state().records,
        active: l.state().active,
        renderer: l.state().renderer,
        replay: l.replayEqual(),
      };
    });
    assert.equal(r.after, r.before);
    assert.equal(r.active, false);
    assert.equal(r.renderer, "cpu");
    assert.equal(r.replay, true);
    return r;
  },
);
const cpu = await browser.newPage();
await cpu.addInitScript(() => {
  const original = HTMLCanvasElement.prototype.getContext;
  HTMLCanvasElement.prototype.getContext = function (kind, ...args) {
    return kind === "webgl2" ? null : original.call(this, kind, ...args);
  };
});
await cpu.goto(
  pathToFileURL(resolve("prototypes/brush-lab/illustro-brush-lab.html")).href,
);
await cpu.waitForFunction(() => window.__brushLab);
await check(
  "CPU fallback draws contact and endpoint synchronously, with exact reference alpha",
  async () => {
    const r = await cpu.evaluate(() => {
      const l = window.__brushLab;
      l.load({
        ...l.presets[0],
        size: 16,
        grain: 0,
        flow: 1,
        stabilization: 0,
        taperEnd: 0,
      });
      l.begin();
      l.accept({ x: 100, y: 100, t: 1, pressure: 1 });
      l.present();
      const first = l.visibleBytes()[(100 * 768 + 100) * 4 + 3];
      l.accept({ x: 160, y: 100, t: 2, pressure: 1 });
      l.present();
      const end = l.visibleBytes()[(100 * 768 + 160) * 4 + 3];
      l.finish();
      const live = l.visibleBytes(),
        ref = l.referenceBytes();
      return {
        renderer: l.state().renderer,
        first,
        end,
        exact: live.every((v, i) => v === ref[i]),
        maxAlphaError: live.reduce(
          (m, v, i) => (i % 4 === 3 ? Math.max(m, Math.abs(v - ref[i])) : m),
          0,
        ),
        maxColorError: live.reduce(
          (m, v, i) => Math.max(m, Math.abs(v - ref[i])),
          0,
        ),
      };
    });
    assert.equal(r.renderer, "cpu");
    assert.equal(r.first, 255);
    assert.equal(r.end, 255);
    assert.equal(r.maxAlphaError, 0);
    await cpu.evaluate(() => window.__brushLab.settled());
    return r;
  },
);
await browser.close();
mkdirSync("docs/brush/evidence", { recursive: true });
writeFileSync(
  "docs/brush/evidence/latency-check.json",
  JSON.stringify(
    {
      checks,
      errors,
      limitations: [
        "Synthetic desktop Chromium. Input-time submission and sampled pixels, not hardware pen-to-photon latency.",
        "Software GPU timing is not representative of physical GPUs.",
      ],
    },
    null,
    2,
  ),
);
assert.equal(
  checks.filter((c) => c.status === "FAIL").length + errors.length,
  0,
);
