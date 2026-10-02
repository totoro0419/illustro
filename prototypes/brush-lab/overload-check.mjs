import { createRequire } from "node:module";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
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
  const cases = [];
  for (const size of [512, 1024]) {
    const r = await page.evaluate(async (size) => {
      const l = window.__brushLab,
        g = document.getElementById("draw").getContext("webgl2");
      l.reset();
      l.load({
        ...l.presets.find((p) => p.id === "clean-ink"),
        size,
        stabilization: 0,
        pressureSmoothing: 0,
        taperStart: 0,
        taperEnd: 0,
        flow: 1,
        grain: 0,
      });
      l.begin();
      l.accept({ x: 100, y: 100, t: 1, pressure: 0.2 });
      l.present();
      g.bindFramebuffer(g.FRAMEBUFFER, null);
      g.readPixels(0, 0, 1, 1, g.RGBA, g.UNSIGNED_BYTE, new Uint8Array(4));
      let peakDabs = 0;
      for (let i = 0; i < 80; i++) {
        l.accept({ x: i % 2 ? 350 : 100, y: 100, t: 5 + i * 4, pressure: 0.2 });
        l.present(false);
        peakDabs = Math.max(peakDabs, l.state().pipeline.lastLiveDabs);
      }
      l.accept({ x: 700, y: 450, t: 400, pressure: 0.2 });
      l.present(false);
      const debtAtEnd = l.state().pipeline.pendingCommitDabs;
      const tip = await new Promise((resolve, reject) => {
        const timer = setTimeout(
          () => reject(new Error("latest tip not presented")),
          10000,
        );
        l.observePresentation((oldest, latest, t, refinement) => {
          if (t !== 400 || refinement) return;
          const state = l.state(),
            point = state.corrected;
          // Test-only completion/readback proves actual ink at the latest endpoint while debt remains.
          const bytes = l.visibleBytes();
          clearTimeout(timer);
          l.observePresentation(undefined);
          resolve({
            alpha:
              bytes[(Math.floor(point.y) * 768 + Math.floor(point.x)) * 4 + 3],
            point,
            pendingCommitDabs: state.pipeline.pendingCommitDabs,
            liveDabs: state.pipeline.lastLiveDabs,
          });
        });
        // The latest input could already have been submitted synchronously.
        if (!l.state().livePending) {
          clearTimeout(timer);
          reject(new Error("burst failed to exercise backpressure"));
        }
      });
      let releaseDabs = 0,
        blockingQueries = 0;
      const instanced = g.drawArraysInstanced.bind(g),
        wait = g.clientWaitSync.bind(g),
        read = g.readPixels.bind(g),
        finish = g.finish.bind(g);
      g.drawArraysInstanced = (...a) => {
        releaseDabs += a[3];
        return instanced(...a);
      };
      g.clientWaitSync = (...a) => {
        if (a[2] !== 0) blockingQueries++;
        return wait(...a);
      };
      g.readPixels = (...a) => {
        blockingQueries++;
        return read(...a);
      };
      g.finish = (...a) => {
        blockingQueries++;
        return finish(...a);
      };
      const before = l.state().pipeline.provisionalCommits;
      l.finish();
      g.drawArraysInstanced = instanced;
      g.clientWaitSync = wait;
      g.readPixels = read;
      g.finish = finish;
      const provisional = l.state().pipeline.provisionalCommits - before;
      await l.settled();
      return {
        size,
        accepted: 82,
        debtAtEnd,
        peakDabs,
        tip,
        releaseDabs,
        blockingQueries,
        provisional,
        liveDabBudget: l.state().pipeline.liveDabBudget,
        canonicalGeometrySamples: l.bundle().records.at(-1).geometry.length,
        canonicalReplayExact: l.replayEqual(),
        errors: l.state().telemetry.errors,
        glError: g.getError(),
      };
    }, size);
    assert.ok(r.debtAtEnd > r.liveDabBudget);
    assert.ok(r.tip.pendingCommitDabs > 0);
    assert.ok(
      r.tip.alpha > 0,
      "actual latest endpoint ink must exist before historical debt drains",
    );
    assert.ok(
      r.peakDabs <= r.liveDabBudget && r.tip.liveDabs <= r.liveDabBudget,
    );
    assert.ok(
      r.releaseDabs <= r.liveDabBudget,
      "release must not flood the GPU",
    );
    assert.equal(r.blockingQueries, 0);
    assert.equal(r.provisional, 1);
    assert.equal(r.canonicalGeometrySamples, r.accepted);
    assert.equal(r.canonicalReplayExact, true);
    assert.equal(r.errors.length, 0);
    assert.equal(r.glError, 0);
    cases.push(r);
    console.log(JSON.stringify(r));
  }
  writeFileSync(
    "docs/brush/evidence/overload-tip-v3.json",
    JSON.stringify(
      {
        scope:
          "Adversarial burst, 512/1024px. Actual pixel at latest corrected endpoint checked with test-only readback while commit debt remains. Production display capped at one in-flight frame and two dabs; release retains bounded provisional ink and canonical worker replaces it. All geometry/replay exact. This is not physical pen-to-photon evidence.",
        cases,
      },
      null,
      2,
    ),
  );
} finally {
  await browser.close();
}
