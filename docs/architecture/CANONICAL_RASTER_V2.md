# Illustro Canonical Raster Contract V2

> Status: **DESIGN COMPLETE — Architecture V2 baseline**
> Date: 2026-09-28
> Scope: canonical raster coordinates, pixels, tiles, sparse semantics, materialization and GPU boundary
> Production effect: specification only; Slice 001 code is not modified by this document.

## 1. Design decision summary

V2 adopts:

- signed sparse Raster space that may retain artwork outside the visible canvas frame;
- a fixed **256 × 256 canonical logical tile grid** for V2 Raster addressing;
- device/runtime-specific subrect/microtile/atlas subdivision beneath that grid;
- per-Raster-Surface sample precision: UNORM8, UNORM16 or FLOAT32;
- straight/unassociated alpha in canonical storage with hidden RGB preservation;
- premultiplied working representation where useful for rendering/compositing;
- immutable published Raster values plus bounded semantic mutation/materialization;
- no persistent halo;
- no full-canvas allocation for sparse artwork.

This resolves the V1/Section-9 Tile ambiguity: **256 is the V2 canonical addressing unit, while execution granularity remains adaptive.** The user's pixel result does not semantically depend on tile boundaries.

## 2. Coordinate model

### 2.1 Document coordinates

Canonical document geometry:

- +X right;
- +Y down;
- pixel cell `(x,y)` occupies `[x,x+1) × [y,y+1)`;
- pixel center is `(x+0.5, y+0.5)`;
- geometric transforms use binary64-capable semantics at the CPU/reference boundary;
- View coordinates are never baked into Artwork coordinates.

### 2.2 Canvas frame vs Raster domain

The Document has a canvas/export frame.

By default it is:

```text
[0, width) × [0, height)
```

Raster Layer content is **not clipped from canonical storage merely because it lies outside this frame**.

Signed outside-canvas Raster is retained for:

- non-destructive Move/Transform;
- crop/resize workflows;
- transform overscan;
- effect/filter support regions when explicitly materialized;
- future reveal of previously off-canvas artwork.

Export and normal Canvas display clip to the active canvas frame unless an explicit operation says otherwise.

Destructive Trim/Clear/Crop operations may discard outside content only as an explicit user-semantic operation.

### 2.3 Tile coordinates

V2 canonical logical tile size:

```text
TILE_SIZE_V2 = 256 document pixels
```

Tile coordinates are signed 32-bit integers:

```text
tx, ty : i32
localX, localY : u8 range 0..255
```

Mapping uses mathematical floor division:

```text
tx = floor(x / 256)
localX = x - tx * 256
```

and equivalently for Y.

This keeps negative coordinates unambiguous.

The representable grid is far beyond practical document dimensions while remaining exactly representable in JavaScript Number arithmetic when converted to pixel origins.

## 3. Why 256 is fixed at the canonical layer

Architecture V1 benchmark evidence found 256 a useful standard compromise.

V2 additionally fixes it as the logical address grid because changing logical tile size dynamically would otherwise complicate:

- Revision identity;
- branch sharing;
- recovery references;
- background materialization;
- cross-device reopen;
- deterministic tile-boundary tests.

This does **not** mean every job allocates or processes a full 256 tile.

The following remain adaptive:

- dirty subrect;
- row runs;
- brush binning cells;
- GPU microtiles;
- texture atlas pages;
- upload batches;
- physical persistence subblocks;
- filter workgroups.

A future Architecture version may migrate the logical grid, but that is an explicit representation migration, not a device-specific runtime toggle.

V1's “128 memory-constrained logical profile” is therefore superseded at the canonical-addressing layer. 128-sized processing/subdivision remains allowed beneath the 256 grid.

## 4. Raster Surface descriptor

Every editable Raster Surface has an immutable descriptor:

```text
RasterSurfaceDescriptor
- surfaceId
- rasterSchemaVersion
- tileGridVersion = tile256.v2
- channelModel = RGBA
- sampleEncoding
- alphaMode = straight
- workingColorSpaceRef
- sparseDefault
```

### 4.1 Supported V2 sample encodings

V2 supports:

- `rgba.unorm8.v1`
- `rgba.unorm16.v1`
- `rgba.float32.v1`

One Raster Surface uses one sample encoding at a time.

**Mixed sample encodings inside one Raster Surface are not part of V2.**

Rationale:

- simpler cross-tile evaluation;
- fewer seam/quantization edge cases;
- simpler renderer upload paths;
- simpler file/recovery descriptors;
- still allows different layers/surfaces to use different precision when required.

Precision conversion of a Surface is an explicit asynchronous document operation.

### 4.2 Default precision policy

The semantic architecture does not make every document high precision by force.

A new document may select a Raster precision profile.

The product/UI default is a UI/product decision and is not fixed here.

The core requirement is that the schema is not locked to 8-bit sRGB.

## 5. Color/alpha semantics

### 5.1 Canonical alpha

Canonical Raster stores **straight/unassociated alpha**.

Canonical hidden RGB is meaningful content even when alpha is zero.

This is consistent with the need to avoid irreversible alpha round-trips and with PNG's non-premultiplied alpha model.

### 5.2 Transparent pixels

Rules:

- a newly absent/default color tile is transparent black;
- alpha-only erase changes alpha while preserving existing hidden RGB;
- explicit Clear sets pixels to the operation-defined clear value, normally transparent black;
- ICC/profile conversion transforms hidden straight RGB as well as visible RGB;
- no implicit `alpha < epsilon → 0` rule is allowed in canonical semantics.

### 5.3 Working representation

Realtime/GPU working representation may use premultiplied linear-light color where appropriate.

That working representation is Derived/Active state.

It must not erase canonical hidden RGB.

Premultiply/unpremultiply conversion at alpha zero cannot reconstruct hidden RGB; therefore operations that need hidden color must access canonical straight data or an equivalent preserved side representation.

## 6. Numeric rules

Canonical Raster parameters reject NaN/Infinity.

For UNORM encodings:

- values map to exact integer code values;
- quantization uses a versioned deterministic rounding rule;
- V2 baseline rounding is nearest, ties-to-even.

FLOAT32:

- preserves finite IEEE 754 binary32 values according to the operation's versioned arithmetic contract;
- color channels may exceed 0..1 for HDR/high-range workflows where the working color descriptor permits it;
- alpha remains semantically clamped to 0..1 unless a future schema explicitly defines otherwise.

UNORM16 is not silently converted to binary16/F16 as canonical storage.

## 7. Sparse model

A Raster Surface is a sparse map from logical tile coordinate to logical tile value.

Absent tiles use the Surface's `sparseDefault`.

For ordinary color Raster:

```text
sparseDefault = RGBA(0,0,0,0)
```

For other coverage owners, different defaults are legal, e.g. Selection=0 or a white Mask=1.

No physical block is allocated for a default tile.

Uniform/inverted coverage should use default+exceptions rather than materializing the full canvas.

## 8. Logical tile value

A published tile value may be represented by:

1. a strict immutable materialized block;
2. a strict base block plus bounded versioned semantic mutation fragments;
3. another representation proven strictly equivalent by the V2 reference evaluator.

The Revision's user-visible meaning is the logical tile value, not a GPU texture or a particular compressed byte location.

### 8.1 Bounded dependency rule

Unmaterialized mutation chains must be bounded by a cost certificate that can cover at least:

- ordered dependency depth;
- referenced semantic bytes;
- unique source blocks/values;
- estimated strict-evaluator work;
- temporary memory upper bound.

Exact admission limits are Runtime Profile calibration values.

An implementation may not accept an unbounded chain and hope to compact it later.

## 9. Immutable block model

Strict Raster materialization produces immutable payloads.

Each immutable block has:

- stable `BlockId`;
- descriptor;
- bounds within one canonical tile;
- bytes;
- optional/async `ContentDigest`;
- integrity metadata in persistence.

A logical 256 tile may be physically split into row/plane/subblocks for memory/storage reasons.

Physical subblocks do not change tile coordinates or pixel semantics.

This allows constrained devices to avoid requiring one large contiguous allocation for every logical tile.

## 10. Working mutation

Active Brush/Transform/Fill work may use:

- mutable working buffer;
- dirty rect/runs;
- GPU working resource;
- CPU staging;
- semantic mutation accumulator.

Rules:

- existing canonical bytes are never mutated in place;
- first write may create a working copy or another equivalent working representation;
- repeated dabs do not full-copy the logical tile;
- commit does not require a second avoidable full-tile copy;
- cancellation discards working state without changing published Raster values.

## 11. Dirty / halo

Dirty state is tile + local affected bounds/runs.

No full-canvas dirty bitmap is required.

Kernel support/halo is temporary input demand.

Persistent canonical tiles do not store a permanent halo.

Dirty bounds must include old and new influence bounds for operations whose footprint moves or changes.

## 12. Materialization and Revision identity

Background strict materialization may replace an internal representation only when it is verified to represent the same logical value.

Such representation replacement:

- does not create a user Undo step;
- does not change `RevisionId`;
- does not alter semantic operation history;
- may update internal representation/materialization indexes;
- must be crash-safe relative to the older representation.

## 13. Renderer boundary

Renderer/GPU resources are Derived state.

GPU device/backend loss invalidates those resources only.

Visible content must be reconstructible from:

- current Revision Root;
- strict materialized blocks;
- bounded semantic records/dependencies.

WebGPU/WebGL2/CPU backend selection must not change the logical Raster result.

## 14. Selection/Mask coverage primitive

Selection/Mask may reuse Raster spatial infrastructure but does not become a color Raster Layer.

V2 common coverage scalar:

```text
Coverage16 = UNORM16
```

Feature-specific schemas may use default+exceptions and sparse tiles.

Region identity remains separate from Selection coverage.

## 15. Import/export rule

Imported original file/resource bytes may be retained separately where required for fidelity/round-trip.

Editable Raster is converted into an explicit Illustro Raster Surface descriptor.

Export converts from fixed Revision semantics; it does not define the document's internal canonical precision.

## 16. Slice 001 consequence

Slice 001 must later change in Production code:

- `Uint8Array RGBA8` is no longer the sole Raster format;
- negative tile coordinates must be legal;
- edits must not be rejected solely because a Layer pixel lies outside the canvas frame;
- `tileSize` is no longer a freely variable canonical grid parameter in V2;
- tile/block descriptors must carry format and signed bounds;
- current `BlockId:number` becomes a runtime handle or is replaced by a stable Block identity.

The sparse/immutable ownership principles remain valid.

## 17. Verification gates

Before Production Raster realignment:

- signed-coordinate mapping fixtures around -257..257;
- tile-edge brush equivalence fixtures;
- absent-tile sparse behavior;
- hidden-RGB alpha erase/restore round-trip;
- UNORM8 and UNORM16 all-code-value pack/unpack tests;
- FLOAT32 finite-value policy tests;
- no permanent halo;
- no full-tile copy per dab;
- representation compaction preserves strict pixel hash/result;
- outside-canvas transform content survives until explicit destructive trim;
- device/backend loss leaves canonical Raster unchanged.

## 18. External evidence

- W3C PNG Third Edition: PNG color samples are stored non-premultiplied/unassociated with alpha.
- ICC.1:2022: current ICC v4 architecture/profile specification.
- W3C WebGPU: a lost GPU device invalidates resources owned by that device, supporting the rule that GPU state must be reconstructible Derived state.

