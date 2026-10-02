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
try {
  const page = await browser.newPage();
  await page.goto(
    pathToFileURL(resolve("prototypes/brush-lab/illustro-brush-lab.html")).href,
  );
  const evidence = await page.evaluate(async () => {
    const l = window.__brushLab;
    if (l.state().renderer !== "webgl2")
      throw new Error(l.state().rendererFailure || "GPU unavailable");
    const cases = [],
      variants = [
        ...[128, 512, 1024].map((size) => ({ id: "rough-pencil", size })),
        { id: "rough-pencil", size: 512, grainRotation: 0.37 },
        {
          id: "rough-pencil",
          size: 512,
          grainKind: "hatch",
          grainScale: 3.4,
          grainRotation: 0.63,
        },
        {
          id: "rough-pencil",
          size: 512,
          grainKind: "image",
          grainScale: 11,
          texture: { width: 2, height: 2, alpha: [0.1, 0.4, 0.7, 1] },
        },
        { id: "rough-pencil", size: 512, flow: 0.003 },
        {
          id: "rough-pencil",
          size: 512,
          mappings: [
            {
              source: "pressure",
              target: "opacity",
              min: 0.1,
              max: 1,
              mode: "multiply",
              fallback: 1,
              curve: [
                [0, 0],
                [1, 1],
              ],
            },
          ],
        },
        { id: "clean-ink", size: 512 },
        { id: "clean-ink", size: 1024 },
        { id: "rough-soft", size: 512 },
        { id: "felt", size: 512 },
        { id: "confetti", size: 512 },
      ];
    for (const variant of variants) {
      l.reset();
      l.load({ ...l.presets.find((p) => p.id === variant.id), ...variant });
      if (l.state().preset.size !== variant.size)
        throw new Error("brush diameter was clamped");
      l.begin();
      const snapshots = [],
        g = document.getElementById("draw").getContext("webgl2");
      for (let i = 0; i < 12; i++) {
        l.accept({
          x: 120 + (i < 6 ? i : 11 - i) * 70,
          y: 230 + 55 * Math.sin(i),
          t: 1 + i * 4,
          pressure: 0.25 + (i % 4) * 0.2,
        });
        l.present();
        if ([0, 5, 11].includes(i)) {
          const v = l.visibleBytes(),
            r = l.previewReferenceBytes();
          let max = 0,
            over2 = 0,
            sum = 0;
          for (let j = 0; j < v.length; j++) {
            const d = Math.abs(v[j] - r[j]);
            max = Math.max(max, d);
            sum += d;
            if (d > 2) over2++;
          }
          snapshots.push({
            input: i + 1,
            maxChannelError: max,
            channelsOver2: over2,
            meanChannelError: sum / v.length,
          });
        }
      }
      if (g.getError() !== g.NO_ERROR)
        throw new Error("GL error: " + JSON.stringify(variant));
      l.finish();
      await l.settled();
      cases.push({ variant, snapshots, canonicalReplayExact: l.replayEqual() });
    }
    l.reset();
    l.load({ ...l.presets.find((p) => p.id === "rough-pencil"), size: 512 });
    const g = document.getElementById("draw").getContext("webgl2"),
      methods = [
        "clear",
        "drawArrays",
        "drawArraysInstanced",
        "blitFramebuffer",
        "copyTexSubImage2D",
        "readPixels",
        "finish",
        "clientWaitSync",
      ],
      counts = {},
      originals = {};
    for (const name of methods) {
      originals[name] = g[name];
      g[name] = function (...a) {
        counts[name] = (counts[name] ?? 0) + 1;
        if (name === "drawArraysInstanced") counts.instances = a[3];
        return originals[name].apply(this, a);
      };
    }
    l.begin();
    const contactPreparation = { ...counts };
    for (const name of methods) counts[name] = 0;
    l.accept({ x: 384, y: 256, t: 1, pressure: 0.7 });
    l.present();
    const firstContact = { ...counts };
    l.abort();
    for (const name of methods) g[name] = originals[name];
    l.reset();
    l.load({ ...l.presets.find((p) => p.id === "rough-pencil"), size: 512 });
    l.begin();
    for (let i = 0; i < 40; i++) {
      l.accept({ x: 150 + i * 5, y: 200, t: 1 + i * 4, pressure: 0.7 });
      l.present(false);
    }
    const wasPending = l.state().livePending;
    l.abort();
    await new Promise((r) => setTimeout(r, 40));
    const cancelledVisible = l.visibleBytes();
    const cancellation = {
      wasPending,
      active: l.state().active,
      livePending: l.state().livePending,
      paintedAfterCancel: cancelledVisible.some(
        (v, i) => i % 4 === 3 && v !== 0,
      ),
    };
    l.reset();
    for (const [x, color] of [
      [100, [0.8, 0.1, 0.2]],
      [650, [0.1, 0.2, 0.8]],
    ]) {
      l.load({
        ...l.presets.find((p) => p.id === "clean-ink"),
        size: 64,
        color,
        stabilization: 0,
      });
      l.begin();
      l.accept({ x, y: 256, t: 1, pressure: 1 });
      l.present();
      l.finish();
    }
    const visible = l.visibleBytes();
    await l.settled();
    const reference = l.bytes();
    let max = 0;
    for (let i = 0; i < visible.length; i++)
      max = Math.max(max, Math.abs(visible[i] - reference[i]));
    return {
      cases,
      cancellation,
      contactPreparation,
      firstContact,
      regionCommitMaxChannelError: max,
      errors: l.state().telemetry.errors,
    };
  });
  for (const c of evidence.cases) {
    assert.equal(c.canonicalReplayExact, true);
    for (const s of c.snapshots) {
      assert.ok(s.meanChannelError < 0.001, JSON.stringify(c));
      assert.ok(s.channelsOver2 <= 32, JSON.stringify(c));
    }
  }
  assert.equal(evidence.contactPreparation.clear ?? 0, 0);
  assert.equal(evidence.contactPreparation.drawArrays ?? 0, 0);
  assert.equal(evidence.firstContact.drawArrays, 1);
  for (const name of [
    "blitFramebuffer",
    "copyTexSubImage2D",
    "readPixels",
    "finish",
    "clientWaitSync",
  ])
    assert.equal(
      evidence.firstContact[name] ?? 0,
      0,
      "contact must not copy/wait/read back: " + name,
    );
  assert.ok(evidence.regionCommitMaxChannelError <= 2);
  assert.equal(evidence.errors.length, 0);
  assert.equal(evidence.cancellation.wasPending, true);
  assert.equal(evidence.cancellation.active, false);
  assert.equal(evidence.cancellation.livePending, false);
  assert.equal(evidence.cancellation.paintedAfterCancel, false);
  writeFileSync(
    "docs/brush/evidence/thick-check-v3.json",
    JSON.stringify(
      {
        scope:
          "Headless Chromium / SwiftShader. Independent CPU active-preview and canonical worker replay. Float boundary errors explicitly counted; no physical pen-to-photon claim.",
        ...evidence,
      },
      null,
      2,
    ),
  );
  console.log(
    "PASS 13 thick variants, 39 independent previews, exact replay, contact without copy/readback/wait, cancellation and region commit",
  );
} finally {
  await browser.close();
}
