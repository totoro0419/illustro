# Architecture V1 — First PASS Evidence

> Date: 2026-09-28
> Status: **FIRST PASS ONLY — second audit required before V1 confirmation**
> GitHub Actions run: `36334997832`
> Tested commit: `8bb9148ef6332dfcf532655ff45adc6d9b9012ed`
> Conclusion: **success**

## CI summary

- TypeScript strict typecheck: PASS
- Vitest: **24 tests / 11 files PASS**
- Vite production build: PASS
- Playwright served Chromium: **4 / 4 PASS**

## Gate 1 — Canonical Raster Sealing: FIRST PASS

Representative RGBA tile payload:

- logical tile payload: 256 × 256 × 4 = 262,144 bytes
- revisions: 48
- changed tiles: 192
- working allocated bytes: 50,331,648
- transferred bytes: 50,331,648
- canonical read/copy bytes: 5,242,880
- avoidable seal copy bytes: 0 by invariant/test
- canonical blocks: 192
- canonical bytes: 50,331,648

Interpretation:

- sealing cost is proportional to changed tiles, not full logical canvas
- most touched tiles in this workload were new, so canonical read copy was far below total working bytes
- seal moves ArrayBuffer ownership instead of making a second full-tile copy

## Gate 2 — GPU/Fallback: FIRST PASS

Served Chromium probe:

- `navigator.gpu`: present
- WebGPU adapter: unavailable on GitHub-hosted runner
- WebGPU command path: therefore not executed on this runner
- WebGL2 compatibility smoke: PASS
- actual WebGL2 readback: `64,128,191,255`
- backend selection: WebGL2
- Canvas2D fallback available
- device-loss state machine unit tests: PASS

This satisfies the predeclared Gate on hardware without a WebGPU adapter: a real compatibility GPU path is executed, while WebGPU remains the first attempted path.

## Gate 3 — Sparse Tile / Cache: FIRST PASS

Deterministic brush-like workloads were run for logical tile sizes 128 / 256 / 512.

Key observations:

- 128 uses the least resident tile memory and dirty-upload area
- 256 materially reduces tile-touch count, especially for medium/large brushes, at moderate memory cost
- 512 further reduces touches but has substantially higher sparse allocation and dirty upload cost
- derived cache stayed exactly within its 8 MiB budget
- pinned canonical entry remained resident

Current implication:

- 512 is not justified as the universal default
- 128 and 256 remain the practical V1 profile candidates
- exact runtime profile choice is not file semantics

## Gate 4 — OPFS Recovery: FIRST PASS

Served Chromium:

- backend asserted: **opfs-sync-access**
- initial complete frames: 8
- journal size: 8,416 bytes
- reload: 8 frames preserved
- tail before fault: 0
- injected torn tail: 11 bytes
- recovered complete frames after torn append: 8
- scanner issue: `truncated-frame`
- incomplete frame accepted: no

Unit torn-write sweep remains green.

## Gate 5 — Startup / First Stroke: FIRST PASS

Served Chromium proxy:

- boot → module: ~3.1 ms
- boot → canvas-ready: ~5.2 ms
- first stroke → next RAF proxy: ~0.2 ms

Before first stroke and after first stroke:

- benchmark core loaded: false
- benchmark extended loaded: false
- graphics diagnostics loaded: false
- WASM benchmark loaded: false
- persistence worker loaded: false

Thus the first stroke does not require advanced diagnostic/persistence modules.

These are CI scheduling measurements, not device scan-out latency targets.

## First-pass decision

All five predeclared gates produced a green first pass.

Per the promotion rule, **Architecture V1 is not yet confirmed**.

Next:

1. inspect cross-gate assumptions and hidden failure modes
2. add adversarial regression tests
3. correct any issue found
4. run CI again
5. only then promote Architecture v1
