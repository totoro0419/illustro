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
    pathToFileURL(
      resolve(
        process.env.BRUSH_PACED_HTML ??
          "prototypes/brush-lab/illustro-brush-lab.html",
      ),
    ).href,
  );
  const cases = [];
  const seconds = Number(process.env.BRUSH_PACED_SECONDS ?? 3);
  const sizes = (process.env.BRUSH_PACED_SIZES ?? "512,1024")
    .split(",")
    .map(Number);
  for (const size of sizes)
    for (const id of (
      process.env.BRUSH_PACED_IDS ?? "clean-ink,rough-pencil"
    ).split(","))
      for (const hz of (process.env.BRUSH_PACED_HZ ?? "120,240")
        .split(",")
        .map(Number)) {
        const r = await page.evaluate(
          async ({ id, hz, size, seconds }) => {
            const l = window.__brushLab;
            l.reset();
            l.load({
              ...l.presets.find((p) => p.id === id),
              size,
              stabilization: 0.5,
            });
            if (l.state().preset.size !== size)
              throw new Error("brush diameter was clamped");
            const g = document.getElementById("draw").getContext("webgl2");
            l.begin();
            for (let i = 0; i < 12; i++) {
              l.accept({ x: 100 + i * 6, y: 240, t: 1 + i * 4, pressure: 0.7 });
              l.present();
            }
            l.finish();
            await l.settled();
            l.reset();
            l.begin();
            g.bindFramebuffer(g.FRAMEBUFFER, null);
            g.readPixels(
              0,
              0,
              1,
              1,
              g.RGBA,
              g.UNSIGNED_BYTE,
              new Uint8Array(4),
            );
            const pending = [],
              ages = [],
              oldestAges = [],
              handlers = [];
            const phases = [[], [], []];
            let peak = 0,
              maxLiveDabs = 0,
              completed = 0,
              submittedFrames = 0,
              lastCompletedInput = 0;
            function probe(oldest, latest, t, refinement = false) {
              if (refinement) return;
              const fence = g.fenceSync(g.SYNC_GPU_COMMANDS_COMPLETE, 0);
              if (!fence) throw new Error("fence unavailable");
              g.flush();
              pending.push({ at: latest, oldest, fence, t });
              submittedFrames++;
              peak = Math.max(peak, pending.length);
            }
            function poll() {
              while (pending.length) {
                const q = pending[0],
                  s = g.clientWaitSync(q.fence, 0, 0);
                if (s === g.TIMEOUT_EXPIRED) break;
                if (s === g.WAIT_FAILED) throw new Error("fence failed");
                const now = performance.now();
                ages.push(now - q.at);
                phases[
                  Math.min(2, Math.floor((q.t - 1) / ((seconds * 1000) / 3)))
                ].push(now - q.at);
                oldestAges.push(now - q.oldest);
                lastCompletedInput = q.t;
                g.deleteSync(q.fence);
                pending.shift();
                completed++;
              }
            }
            const hooked = !!l.observePresentation;
            if (hooked) l.observePresentation(probe);
            const firstPresentation = l.state().presentations,
              firstAccepted = l.state().telemetry.accepted,
              start = performance.now();
            let accepted = 0,
              contactImmediate = false;
            for (let i = 0; i < hz * seconds; i++) {
              const due = start + (i * 1000) / hz;
              await new Promise((r) =>
                setTimeout(r, Math.max(0, due - performance.now())),
              );
              poll();
              const at = performance.now(),
                t = 1 + (i * 1000) / hz;
              l.accept({
                x: 384 + 250 * Math.sin((i * Math.PI) / 64),
                y: 256 + 140 * Math.sin((i * Math.PI) / 32),
                t,
                pressure: 0.7,
              });
              l.present(false);
              if (i === 0)
                contactImmediate = l.state().presentations > firstPresentation;
              if (!hooked) probe(at, at, t);
              handlers.push(performance.now() - at);
              accepted++;
              maxLiveDabs = Math.max(
                maxLiveDabs,
                l.state().pipeline?.lastLiveDabs ?? 0,
              );
            }
            const sent = performance.now() - start;
            while (pending.length || l.state().livePending) {
              await new Promise((r) => setTimeout(r, 1));
              poll();
              if (performance.now() - start > seconds * 1000 + 60000)
                throw new Error("GPU queue did not drain");
            }
            const elapsed = performance.now() - start;
            if (hooked) l.observePresentation(undefined);
            if (g.getError() !== g.NO_ERROR) throw new Error("GL error");
            const visible = l.visibleBytes(),
              reference = l.previewReferenceBytes();
            let sum = 0,
              over2 = 0;
            for (let i = 0; i < visible.length; i++) {
              const d = Math.abs(visible[i] - reference[i]);
              sum += d;
              if (d > 2) over2++;
            }
            ages.sort((a, b) => a - b);
            oldestAges.sort((a, b) => a - b);
            handlers.sort((a, b) => a - b);
            const phaseP95Ms = phases.map((a) => {
              a.sort((a, b) => a - b);
              return a[Math.floor(a.length * 0.95)] ?? 0;
            });
            const r = {
              id,
              size,
              hz,
              seconds,
              maxLiveDabs,
              phaseP95Ms,
              ageGrowthMs: phaseP95Ms[2] - phaseP95Ms[0],
              accepted,
              acceptedByEngine: l.state().telemetry.accepted - firstAccepted,
              submittedFrames,
              completedFrames: completed,
              contactImmediate,
              latestInputCompleted:
                Math.abs(
                  lastCompletedInput - (1 + ((hz * seconds - 1) * 1000) / hz),
                ) < 1e-6,
              submittedDurationMs: sent,
              completedDurationMs: elapsed,
              queuePeak: peak,
              completionAgeP95Ms: ages[Math.floor(ages.length * 0.95)],
              completionAgeMaxMs: ages.at(-1),
              oldestUnpresentedInputAgeP95Ms:
                oldestAges[Math.floor(oldestAges.length * 0.95)],
              oldestUnpresentedInputAgeMaxMs: oldestAges.at(-1),
              inputHandlerP95Ms: handlers[Math.floor(handlers.length * 0.95)],
              previewMeanChannelError: sum / visible.length,
              previewChannelsOver2: over2,
              pipeline: l.state().pipeline ?? null,
            };
            l.finish();
            await l.settled();
            return {
              ...r,
              canonicalReplayExact: l.replayEqual(),
              canonicalGeometrySamples: l.bundle().records.at(-1).geometry
                .length,
              errors: l.state().telemetry.errors,
            };
          },
          { id, hz, size, seconds },
        );
        assert.equal(r.accepted, r.acceptedByEngine);
        assert.equal(r.completedFrames, r.submittedFrames);
        assert.equal(r.contactImmediate, true);
        assert.equal(r.latestInputCompleted, true);
        assert.equal(r.canonicalGeometrySamples, r.accepted);
        assert.equal(r.canonicalReplayExact, true);
        assert.ok(
          r.previewMeanChannelError < 0.001 && r.previewChannelsOver2 <= 32,
          JSON.stringify(r),
        );
        assert.equal(r.errors.length, 0);
        if (r.pipeline?.paced) {
          assert.ok(r.queuePeak <= 3, "live frames must not accumulate");
          assert.ok(
            r.maxLiveDabs <= r.pipeline.liveDabBudget,
            "live work must remain bounded",
          );
          assert.ok(
            r.ageGrowthMs <= 50,
            "tip age must not accumulate with stroke duration: " +
              JSON.stringify(r),
          );
          assert.ok(
            r.completionAgeP95Ms <= 100,
            "completed latest-tip age p95 exceeds 100ms in software test: " +
              JSON.stringify(r),
          );
        }
        cases.push(r);
        console.log(JSON.stringify(r));
      }
  writeFileSync(
    process.env.BRUSH_PACED_OUT ?? "docs/brush/evidence/paced-thick-v3.json",
    JSON.stringify(
      {
        scope:
          "Headless Chromium / SwiftShader. Paced 120/240 inputs per second, 512/1024px, three seconds per continuous stroke after warmup; phase p95 measures cumulative latest-tip age growth; production present(false). One test fence per ACTUAL display including delayed latest-input presentations. Ages include input handling, GPU work, polling/event-loop and test instrumentation; oldest pending input age is also measured. No physical pen-to-photon claim. Input geometry and canonical replay must remain exact. Production uses zero-timeout completion queries, never a blocking wait/readback.",
        cases,
      },
      null,
      2,
    ),
  );
} finally {
  await browser.close();
}
