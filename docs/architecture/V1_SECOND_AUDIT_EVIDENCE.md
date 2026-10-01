# Architecture V1 — Second Audit Evidence

> Date: 2026-09-28
> Status: **SECOND PASS COMPLETE**
> GitHub Actions run: `36335428192`
> Tested commit: `0245189a80ddad3957cfa6774bfdd7fa2cca403c`
> Conclusion: **success**

## Why a second audit was required

The first green CI run was intentionally not treated as final evidence.

A manual cross-gate review after the first PASS found four hidden defects that the first tests did not expose:

1. stale Raster transaction could transfer blocks before stale-head rejection, leaving orphan canonical blocks
2. `SparseTileSurface.consumeDirty()` cleared the same object returned to the caller, destroying the dirty rectangle snapshot
3. Graphics capability probing reused one Canvas for multiple context types, causing a false WebGL2 negative
4. a torn OPFS journal tail was detected but not truncated before later append, so future valid records could become unreachable by the scanner

All four were corrected before the second pass.

## Second-pass regression additions

Added assertions for:

- stale Raster seal creates no orphan blocks and does not change head
- consumed dirty rect remains available while the live tile dirty state is cleared
- GPU backend loss changes only derived backend generation; Canonical Raster remains unchanged
- pinned canonical cache data survives an aggressive budget shrink
- Undo restores prior canonical block identity
- journal scanner never resynchronizes past corruption
- browser Graphics probe and selected WebGL2 backend agree
- first Stroke causes no new advanced-module resource request
- OPFS torn tail is truncated on reopen
- journal append resumes after repair using sequences 8, 9

## Second CI result

### Static / unit

- TypeScript strict typecheck: **PASS**
- Vitest: **29 tests / 12 files PASS**
- Vite production build: **PASS**

### Served Chromium

- Playwright: **4 / 4 PASS**
- Startup first-stroke path: **PASS**
- Graphics backend fallback path: **PASS**
- module Worker input path: **PASS**
- OPFS SyncAccessHandle recovery path: **PASS**

## Gate 1 — Canonical Raster Sealing: PASS

Measured workload:

- revisions: 48
- changed tiles: 192
- tile payload: 262,144 bytes (256 × 256 × RGBA8)
- canonical read bytes: 5,242,880
- working allocated bytes: 50,331,648
- ownership-transferred bytes: 50,331,648
- canonical blocks: 192
- canonical bytes: 50,331,648
- avoidable second full-tile seal copy: **0 by invariant/test**

Second audit additionally confirms stale transactions are rejected **before** block ownership transfer.

Decision:

- Published canonical tile blocks are immutable.
- Active edit tiles are mutable working buffers.
- Existing canonical content is copied only when first opened for edit.
- New tiles allocate directly as working buffers.
- Seal transfers ownership to canonical storage.
- Stale transaction rejection occurs before ownership transfer/publication.

## Gate 2 — GPU / Compatibility Backend: PASS

Second-pass served Chromium result:

- `navigator.gpu`: present
- WebGPU adapter: unavailable on the GitHub-hosted runner
- WebGL2 availability probe: **true**
- Canvas2D availability: **true**
- selected backend: **WebGL2**
- actual WebGL2 readback: `64,128,191,255`
- WebGPU → WebGL2 fallback: **PASS**
- GPU-derived-state invalidation test: **PASS**
- Canonical Raster unchanged by backend loss: **PASS**

The CI runner did not expose a WebGPU adapter, so actual WebGPU hardware execution is not claimed.

Architecture V1 therefore does not make WebGPU availability a correctness dependency. WebGPU remains first-choice when runtime smoke succeeds; WebGL2/Canvas2D keep the same document semantics.

## Gate 3 — Sparse Tile / Dirty Rect / Cache: PASS

Aggregate deterministic brush-workload totals:

| Tile | Tile touches | Sparse allocated bytes | Dirty upload bytes |
|---:|---:|---:|---:|
| 128 | 22,700 | 186,712,064 | 124,964,088 |
| 256 | 14,330 | 284,164,096 | 142,409,888 |
| 512 | 11,364 | 472,907,776 | 171,439,460 |

128 → 256:

- tile touches: **-36.87%**
- sparse allocation: **+52.19%**
- dirty upload: **+13.96%**

256 → 512:

- tile touches: **-20.70%**
- sparse allocation: **+66.42%**
- dirty upload: **+20.38%**

Decision:

- **256** = normal-profile initial logical tile size
- **128** = memory-constrained profile candidate
- **512** = not the universal/default logical tile size
- tile size is runtime implementation detail, not file-format semantics
- dirty processing granularity may be smaller than logical tile size

Cache result:

- budget: 8 MiB
- used: 8 MiB
- pinned canonical entry retained
- budget shrink adversarial test preserves pinned canonical data

## Gate 4 — OPFS Recovery: PASS

Second-pass served Chromium:

Initial journal:

- backend: **opfs-sync-access**
- size: 8,416 bytes
- frames: 8
- sequences: 0–7
- invalid tail: 0

After injected torn tail:

- tail: 11 bytes
- complete frames still visible: 8
- issue: `truncated-frame`

After reload:

- invalid tail repaired by truncating to valid prefix
- repaired size: 8,416 bytes
- frame count: 8
- tail: 0
- recorded repair: 11 bytes / `truncated-frame`

After repair and append:

- backend: **opfs-sync-access**
- one durability batch
- frame count: 10
- final sequences: 8, 9
- tail: 0
- issue: null

This validates recovery framing, valid-prefix repair and resumed append in a served browser.

It does **not** claim a physical sudden-power-loss durability guarantee.

## Gate 5 — Startup / First Stroke: PASS

Second-pass served Chromium proxy:

- boot → module: ~5.0 ms
- boot → canvas ready: ~8.3 ms
- first stroke → next RAF proxy: ~6.2 ms

Before and immediately after first stroke:

- benchmark core loaded: false
- extended benchmark loaded: false
- graphics diagnostics loaded: false
- WASM benchmark loaded: false
- Persistence Worker loaded: false
- resource request list unchanged across first stroke

Decision:

First Draw critical path does not require Persistence, Lineart Layer analysis, advanced GPU diagnostics, WASM benchmarks or other advanced modules.

Absolute production startup targets remain a later real-application measurement, not a CI-number lock.

## Promotion conclusion

All five V1 promotion gates passed, then underwent a second independent audit, four hidden issues were corrected, adversarial tests were added, and the complete suite passed again.

**Architecture V1 may now be confirmed for Core implementation.**
