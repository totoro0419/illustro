# Illustro Brush ↔ Raster ↔ Renderer Contract V2

> Status: **SEMANTIC DESIGN COMPLETE — reference + browser + representative Tablet Pen + perceptual PASS / sustained+thermal evidence remains**
> Date: 2026-09-28
> Scope: input normalization, stroke semantics, deterministic Brush execution, realtime preview, Raster commit and Renderer boundary
> Production effect: specification only. Brush Production implementation remains prohibited until the benchmark gate in section 17 passes and the user authorizes implementation.

## 1. Core decision

Brush is a first-class engine pipeline, not a series of `setPixel` or stamp calls.

V2 pipeline:

```text
Platform Input
→ Actual/Predicted separation
→ Normalization + receive-time coordinate capture
→ Stroke Reconstruction
→ Dynamics
→ Coverage / Dab / Continuous deposition generation
→ Tip / Texture
→ Color / Mixing
→ Coverage / Compositing
→ Realtime Derived presentation
→ Semantic Transaction
→ Strict Raster materialization
```

The same semantic stroke drives preview and final evaluation.

Raw Pointer Events are not durable artwork meaning.

## 2. Platform input boundary

The Platform Adapter may consume:

- pointer events;
- `pointerrawupdate` where available;
- coalesced actual events;
- predicted events;
- platform-specific stylus metadata through an adapter.

Pointer Events Level 3 explicitly provides raw, coalesced and predicted input mechanisms.

### 2.1 Actual vs predicted

**Actual/coalesced samples** may enter canonical stroke reconstruction.

**Predicted samples are Preview-only.**

Predicted input:

- may reduce perceived latency;
- may alter the mutable visual tail;
- must be discarded/replaced when actual input arrives;
- must never advance canonical PRNG/dab indexes;
- must never become durable semantic input by itself.

## 3. Normalized sample schema

V2 normalized actual sample:

```text
NormalizedSample
- sourceSequence:u64
- timeUs:u64
- documentX:f64
- documentY:f64
- pressure: normalized scalar + validity
- altitude / tilt: value + validity
- azimuth: value + validity
- pointer/tool class
- buttons/tool-state flags
- viewGeneration
- source flags
```

Velocity and direction are derived from the normalized/reconstructed sequence and are not trusted as platform truth.

Unavailable sensors use explicit invalid/fallback state, not fabricated zero values.

## 4. Receive-time coordinate capture

Every actual input sample is associated with the View Transform generation active when the platform event was received.

Platform coordinates are converted to Document coordinates before asynchronous processing can observe a later View transform.

Pan/zoom/rotate during an active stroke must not reinterpret earlier samples.

View state itself is not baked into Artwork geometry.

## 5. Canonical stroke quantization

V2 Stroke semantic serialization uses versioned quantization after normalization/reconstruction boundaries.

Initial V2 contract:

- document position quantum: **1 / 65536 pixel** relative to a signed logical tile origin;
- pressure/normalized sensors: **UNORM16** where a normalized scalar is appropriate;
- angle quantum: **1 / 65536 turn**;
- time: integer microseconds;
- rounding: nearest, ties-to-even;
- NaN/Infinity rejected.

Original binary64 geometry may be kept for active editing/diagnostics, but the durable semantic record uses the declared quantized contract.

These are semantic encoding constants, not device-tuned values.

## 6. Reconstruction contract

Stroke Reconstruction is a versioned algorithm family with explicit:

- causal realtime stabilization;
- optional bounded post-fit/reconstruction;
- path interpolation;
- sensor interpolation;
- terminal/release handling;
- stable-prefix / mutable-tail partition.

The default stabilizer coefficients are **benchmark calibration values** and are not fixed in this document.

However the implementation may not invent a different algorithm during Production coding: the benchmark phase must select and version the default algorithm before Brush Production begins.

### 6.1 Stable Prefix / Mutable Tail

A stroke is partitioned into:

- **Stable Prefix** — future accepted input can no longer change its reconstructed geometry/semantic ordering;
- **Mutable Tail** — bounded recent portion still affected by lookahead/reconstruction/prediction.

Stable does not mean pixels can never receive later deposits; it means the semantic path segment itself is closed.

Release must only finalize the bounded tail. It must not replay the whole stroke from the beginning.

## 7. Semantic Stroke Record

One Brush operation stores a versioned semantic record, not a raw event log.

```text
BrushStrokeOperation
- OperationKey
- strokeSchemaVersion
- reconstructionAlgorithmVersion
- dynamicsAlgorithmVersion
- coverage/depositAlgorithmVersion
- blend/mixingAlgorithmVersion
- PRNGAlgorithmVersion
- brushDefinitionRef + digest
- tip/texture/resource refs + digests
- semanticSeed
- stable reconstructed sample/path pages
- sensor curves/values required by mappings
- selection snapshot ref
- source Raster/value snapshot refs
- color semantics
- spacing/exposure state
- stable-prefix checkpoints
- output Raster Surface / action mode
```

The durable record is post-platform-normalization and post-stroke-reconstruction semantic data.

Raw actual events may optionally be kept for diagnostics/re-edit tooling, but are not required for exact normal replay.

Generated dab lists may be cached/materialized, but are not the only authoritative representation.

## 8. Brush Dynamics

Brush mappings are versioned and target explicit properties.

Supported modulation sources must include the Feature Spec set, including when available:

- pressure;
- tilt/altitude;
- azimuth;
- speed;
- direction;
- time;
- path distance;
- random;
- stroke history/state;
- brush/material state.

Properties such as Size, Opacity, Flow, Density, Rotation, Scatter and texture phase are distinct semantic targets.

One property must not be silently substituted for another to simplify implementation.

Mapping composition order is versioned and deterministic.

## 9. Deterministic random

V2 adopts **Philox4x32-10** as the Brush counter-based PRNG family.

Reason:

- counter-based generation is independent of thread scheduling;
- practical CPU/GPU parallelization;
- no mutable sequential RNG state needs to be shared across Tile/workgroup order;
- published Random123 material defines the 10-round Philox4x32 family.

V2 rule:

```text
key      = semanticSeed
counter  = stable semantic index + stream namespace
```

Independent stream namespaces are used for:

- position scatter;
- rotation;
- size jitter;
- opacity/flow jitter;
- texture phase;
- particle count;
- future module-specific random channels.

Adding a new random channel must not renumber existing streams.

A module/resource with its own stable identity derives a stream namespace deterministically from that stable identity and a declared channel ID.

Cancelled preview evaluations and GPU workgroup/tile order must not change canonical random results.

## 10. Coverage / spacing / deposition

The Brush Engine supports both:

- discrete dab placement;
- continuous/time exposure models.

Spacing is measured in Document space and is independent of Zoom and Tile boundaries.

Time-based Airbrush/Wet behavior is explicit and does not arise accidentally from repeated low-speed pointer events.

`Opacity`, `Flow`, `Density` and `Accumulation` remain distinct.

Coverage evaluation owns antialiasing semantics.

Tile edges use half-open ownership so a footprint is not double-evaluated at boundaries.

## 11. Tip / texture / resources

Brush definitions reference immutable/versioned resources.

A committed stroke must be insulated from later edits to:

- Brush preset;
- tip image/procedure;
- grain/paper texture;
- curve;
- color/material resource.

The semantic record therefore captures stable Resource refs/digests and algorithm versions.

A missing required resource on reopen is an unresolved/compatibility error, not an invitation to silently substitute a different resource.

## 12. Mixing / Smudge / Wet dependency

Mixing operations may depend on existing Canvas state.

The semantic record must capture or reference the exact source snapshot/value dependencies it read.

For stateful mixing it may additionally require checkpointed:

- reservoir color/state;
- paint load;
- water/material state;
- ordered source dependencies;
- prefix accumulator.

Mixing must not implicitly read “whatever pixels happen to be current” on replay.

A reduced first Brush implementation may explicitly defer advanced Wet Media, but the dependency fields remain in the architecture.

## 13. Long-stroke boundedness

Accepted actual input must not be silently dropped to protect performance.

Stable stroke pages are sealed incrementally.

The mutable tail has independent budgets for:

- sample bytes;
- reconstruction work;
- generated coverage work;
- affected tile footprint;
- mixing/source dependencies;
- temporary memory.

Each stable page carries enough checkpoint state to continue without replaying the stroke from its start, including as applicable:

- cumulative distance;
- spacing phase;
- next semantic/random index;
- filter/reconstruction state;
- orientation;
- PRNG namespace/index;
- mixing reservoir/load;
- source dependency refs.

If the system cannot preserve correctness within resource limits, lower-priority background work is shed first.

If required foreground capacity is still unavailable, the engine must surface an explicit resource/admission failure. It may not:

- drop actual accepted samples;
- disable taper/texture/mixing silently;
- shorten stabilization secretly;
- change random streams;
- lower canonical precision without an explicit operation.

## 14. Preview / Commit identity

### 14.1 Semantic authority

Canonical authority is:

```text
base Revision + BrushStrokeOperation + required resource/source versions
```

not the framebuffer bytes.

### 14.2 Realtime preview

Realtime rendering may use a backend-optimized evaluator.

It must consume the same semantic stroke state.

Predicted samples may only affect the preview tail.

### 14.3 Strict materialization

The strict evaluator produces Canonical Raster materialization according to the Raster Surface encoding and versioned Brush algorithms.

Commit publishes the semantic Revision without requiring:

- full-stroke GPU readback;
- full-canvas materialization;
- whole-stroke replay;
- Persistence flush.

Strict materialization proceeds asynchronously under bounded dependency rules.

### 14.4 Preview mismatch

A preview may have bounded numerical error, but:

- it must not alter semantic operation data;
- strict pixels are the authority for Save/Export and canonical Region/Selection operations;
- backend choice must not cause different semantic random/dab ordering;
- a mismatch beyond the certified preview tolerance is a diagnostic/compatibility failure.

Exact tolerance numbers are benchmark outputs, not implementation guesses.

## 15. Renderer contract

Renderer consumes immutable Revision demand + active preview state.

Responsibilities:

- visible-tile demand;
- Raster/vector/text/effect evaluation;
- dirty propagation;
- retained composite tiles/mips;
- display color transform;
- Canvas overlays separately from artwork.

GPU resources are Derived.

Backend priority may remain WebGPU → WebGL2 → CPU/Canvas compatibility, but all backends share document semantics.

WebGPU device loss invalidates GPU-owned resources; it must not invalidate the Revision or Brush semantic record.

## 16. Scheduling priorities

Logical priority order:

1. actual input intake / active manipulation;
2. visible correct presentation;
3. logical Transaction commit;
4. Recovery safety work needed to close dependencies;
5. strict materialization needed to bound replay;
6. background analysis/Region;
7. maintenance/cache;
8. export/background optional work.

Exact scheduler numbers/deadlines are runtime calibration.

## 17. Brush Production benchmark gate

Brush Production implementation cannot begin until a prototype/reference harness verifies the selected default reconstruction algorithm and performance profile.

### Mandatory corpus

- very fast straight/curved strokes;
- very slow strokes;
- stationary pressure/time changes;
- pressure ramp up/down;
- tilt/azimuth changes;
- repeated micro-movements;
- long stroke crossing many tiles;
- identical stroke at multiple Zoom levels;
- stroke exactly on/near Tile boundaries;
- high Scatter/Rotation/Texture random usage;
- Airbrush/time exposure;
- Smudge/Mix source dependency;
- abrupt Pen Up;
- pointer prediction replacement;
- memory pressure/backpressure;
- GPU backend loss/recreate;
- reopen/replay.

### Required pass properties

- accepted actual sample loss: **0**;
- repeated strict reference replay of the same semantic record: identical canonical result;
- tile/workgroup/thread traversal order does not change random semantics;
- Zoom does not change canonical stroke geometry/result;
- crossing a canonical Tile boundary introduces no seam/double-deposit artifact;
- release cost is bounded by Tail/dependency work rather than total stroke history;
- predicted samples never survive as canonical semantics;
- Preview→strict replacement stays within a measured certified tolerance;
- peak memory/work queues remain bounded under the selected supported profile.

### Values to calibrate in the prototype

- stabilization coefficients;
- post-fit/lookahead window;
- mutable-tail budgets;
- materialization admission limits;
- preview error tolerance;
- target latency/frame budgets by supported device profile.

These values become versioned Runtime/Brush Profile data after measurement.

## 18. External basis

- W3C Pointer Events Level 3: raw/coalesced/predicted input facilities.
- Salmon et al., “Parallel Random Numbers: As Easy as 1, 2, 3”: counter-based PRNG design and Philox.
- W3C WebGPU: device-owned GPU objects become unusable on device loss, reinforcing GPU-as-Derived state.
- Current Procreate/Krita/CSP/ibisPaint official documentation confirms deep Brush dynamics/sensor/texture systems; Illustro does not copy their UI or code.



## 19. Validation evidence — 2026-09-28

The non-Production reference harness in `prototypes/v2-validation` was executed against this contract.

Reference result:

- semantic/unit suite: **23/23 PASS** across Brush + Region validation;
- selected reconstruction candidate: `one-euro.v1`, `minCutoff=4`, `beta=4`, `dCutoff=1`;
- Philox4x32-10 known-answer vector: PASS;
- strict reopen/replay mismatches: 0;
- normal and reversed Tile traversal mismatches: 0;
- predicted input excluded from canonical semantics: PASS;
- Preview strict conformance threshold candidate: `1/4096` normalized coverage; measured generated-corpus max `0.000023780`;
- 100,000 accepted samples: 0 sample loss; release work 160 samples with page=256 / mutable tail=16;
- reference materialization comparison profile: watermark 24 / hard 32 fragments under a 4 ms reference-machine p95 comparison target.

These numbers are recorded in [Brush V2 Reference Benchmark](../benchmarks/BRUSH_V2_BENCHMARK_2026-09-28.md).

### Gate interpretation

The algorithmic/reference portion of Gate B **passes**.

The overall Production Gate B remains **CONDITIONAL**, because the actual V2 Brush hot path has not yet been measured on representative target hardware for latency, sustained memory/thermal behavior and perceptual stabilizer response.

Existing Xiaomi tablet input→RAF measurements predate this full Brush pipeline and must not be numerically combined with the Node reference benchmark.

The reference numeric profile above is a candidate/conformance profile, not a cross-device Product guarantee.


## 20. Target-device validation evidence — 2026-09-29

A browser-executable V2 streaming path now exists in `prototypes/v2-validation/device`.

GitHub Actions run `36494680697` produced:

    accepted actual synthetic samples = 100000
    release work                      = 160
    max pending pages                 = 8
    browser batch p95                 = 0.100 ms
    browser batch max                 = 5.100 ms

The automated browser runtime subgate therefore **passes** for boundedness/execution.

The manual harness intentionally refuses completion unless it observes:

- at least 3 strokes;
- at least 500 `pointerType=pen` samples;
- pressure range >= 0.15.

A genuine representative Tablet Pen record was later supplied by the user through the same V2 device harness:

```text
trusted pen samples      = 5727
accepted actual samples  = 5727
pressure range           = 0.660115
tilt observed            = yes
max pending pages        = 8
backpressure events      = 16
max release work         = 181 samples
pipeline p95             = 1.000 ms
receive→next RAF p95     = 17.800 ms
frame intervals >25 ms   = 0
session duration         = 34.499 s
```

The representative Tablet physical-Pen subgate therefore **passes**.

### Gate interpretation

> **Gate B remains CONDITIONAL / NOT CLOSED.**

The user reported no noticeable tracking delay, hitching, or excessive stabilization during the physical Pen run with the selected One Euro `4/4/1` profile, so the perceptual subgate passes. The remaining evidence is sustained multi-minute runtime/thermal behavior. Desktop/Smartphone remain separate supported-device profile certifications.

See [Brush V2 Device Validation](../benchmarks/BRUSH_DEVICE_VALIDATION_2026-09-29.md).
