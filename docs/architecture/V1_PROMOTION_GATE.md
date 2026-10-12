> Classification: OBSOLETE / historical evidence; valid technical principles may be reused. Current authority: `docs/IMPLEMENTATION_BASELINE.md` and `docs/CANONICAL_INDEX.json`. Old stop/PASS/candidate declarations below apply to their recorded version only.

# Architecture V1 Promotion Gate

> Date: 2026-09-28
> Status: **Acceptance criteria fixed before implementation**
> Scope: UIを除くCore Editor本実装開始前のArchitecture Gate

## Gate 1 — Canonical Raster Sealing

PASS requires:

- active edit modifies mutable working bytes, not published canonical blocks
- only changed tiles are sealed
- sealing transfers/owns the working tile without an avoidable second full-tile copy
- stale transactions cannot publish
- cancel changes no canonical state
- Undo/Redo restores prior canonical tile identities/content
- repeated realistic stroke workload stays bounded by changed-tile count rather than full-canvas size
- measured copy/seal byte counters are exposed

V1 does not require a GPU-only canonical representation.

## Gate 2 — GPU Render Path / Fallback

PASS requires:

- runtime backend selection attempts WebGPU first
- WebGPU smoke path performs actual command submission when a device is available
- compatibility GPU path (WebGL2) performs an actual draw/readback smoke test
- Canvas2D remains final compatibility fallback
- backend selection does not change document semantics
- device-loss/error path can invalidate GPU-derived state and fall back without losing canonical artwork
- automated served-browser test verifies at least one real GPU/compatibility backend and fallback state-machine semantics

WebGPU availability on GitHub-hosted CI hardware is not itself a PASS requirement; a machine without a WebGPU adapter must still PASS through a measured compatibility backend.

## Gate 3 — Sparse Tile / Dirty Rect / Cache

PASS requires:

- sparse allocation proportional to touched tiles
- deterministic brush-like workloads covering fine, medium, large and long strokes
- dirty subrect remains bounded to touched local area
- derived cache obeys a byte budget
- cache pressure never evicts pinned canonical/protected entries
- candidate logical tile sizes are compared with measured touches/memory/dirty coverage
- V1 may choose an initial runtime default, but tile size is not file-format semantics and can be profile-tuned later

## Gate 4 — OPFS Recovery

PASS requires in a served secure browser context:

- Persistence Worker reports the actual backend used
- CI must assert `opfs-sync-access`, not silently accept memory fallback
- complete framed records survive page close/reopen in the same browser context
- scanner rejects/ignores an incomplete tail
- reset/inspect are deterministic for tests
- journal write acknowledgements occur only after the containing batch durability attempt
- unit torn-write fault injection remains green

This validates browser/API behavior, not physical power-loss guarantees.

## Gate 5 — Startup / First Stroke

PASS requires:

- canvas becomes usable without loading Lineart Layer analysis, general ICC, codecs, Wet Media, advanced filter, benchmark/GPU diagnostic modules
- Persistence Worker is lazy before first persistence use
- startup and first-stroke proxy timings are measured in served Chromium
- first stroke works before any advanced module is requested
- automated test verifies advanced-module lazy flags are false before first stroke
- no production architectural decision depends on a single CI timing threshold

CI timing is recorded as evidence; semantic PASS is based primarily on critical-path composition and successful first-stroke execution.

## Promotion rule

Architecture v1 may be promoted only after all five gates PASS in GitHub Actions and the evidence is recorded.

After first PASS:

1. perform a second source/spec consistency audit
2. add adversarial/regression checks for cross-gate assumptions
3. run GitHub Actions again
4. only then mark Architecture v1 as confirmed for Core implementation

## Non-blocking after V1

- exact heavy-kernel TypeScript/WASM split
- final device-specific cache budgets
- final logical tile size per runtime profile
- full PC/Tablet/Smartphone Support matrix
- UI layout/design
- advanced-feature interaction backlog

These are resolved when representative production workloads/features exist or before support claims.
