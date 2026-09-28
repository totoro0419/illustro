# Core Vertical Slice 001 — Document / Raster / History

> Date: 2026-09-28  
> Status: **Implemented and second-pass verified on `core/vslice-001`**  
> Scope: Production Core code. Visual UI is intentionally excluded.

## Purpose

Architecture V1をPrototypeからProduction codeへ初めて移すVertical Slice。

一つのRaster編集が次を通過することを対象とする。

Document → Active Transaction → Sparse Tile → Canonical Block → Revision → Undo/Redo → Persistence handoff metadata

## Implemented

- root npm workspace
- private `@illustro/core` package
- opaque Document / Layer / Transaction / Revision / Block IDs
- paged copy-on-write metadata table
- immutable published Document Root
- initial Raster Layer
- sparse Raster Surface Manifest
- 256 logical-pixel default Tile
- mutable active Raster Working Set
- batched ArrayBuffer ownership transfer into Canonical Tile Store
- stale Transaction rejection before Canonical adoption
- Pixel / Tile edit entry points
- Layer rename / visibility edit in the same user Transaction
- one Revision per committed user Transaction
- Undo / Redo by Revision root switching
- alternate Revision retention after Undo + branch
- multi-parent-compatible `parentIds[]` Revision shape
- Persistence handoff containing Revision / Transaction / changed Block identities; it is not itself a durability acknowledgement
- internal monotonic protected-Revision primitive reserved for the future Persistence acknowledgement path
- package public-entry restriction and internal capability token

## Sparse behavior verified

A 32768 × 32768 blank Document starts with zero Canonical Raster blocks.

Editing one pixel allocates and seals one 256 × 256 RGBA8 Tile only:

- blocks before edit: 0
- blocks after edit: 1
- Canonical Raster bytes: 262,144
- full-canvas bitmap allocation: none

## First CI pass

Core CI run `36375723365`:

- strict TypeScript: PASS
- Vitest: 7 tests / 7 files PASS

The first green run was not treated as final.

## Second audit corrections

The source was reviewed again after first PASS.

Corrections:

1. **Ownership transfer batch**
   - multi-Tile commit now transfers all Tile ArrayBuffers as one structured-clone batch
   - Canonical Store insertion happens after successful batch transfer
   - avoids a half-detached Active Transaction from per-Tile transfer failure

2. **Input coordinate validation**
   - Raster pixel/tile coordinates now require safe integers
   - fractional coordinates cannot silently write a non-index property on TypedArray

3. **Revision parent representation**
   - single `parent` field changed to `parentIds[]`
   - normal local edit still has one parent
   - future merge is not blocked by the V1 type shape

4. **Canonical ownership boundary**
   - Store / History are no longer part of the package root API
   - package exports only the public Core entrypoint
   - internal state access requires an unexported capability token
   - published metadata pages hide their backing Map references

5. **Metadata no-op**
   - setting an already-current Layer name/visibility does not create a Revision

## Post-audit verification

Additional corrections after the first re-audit:

6. **Typed Command records**
   - Command is versioned
   - operations use a discriminated union instead of encoded strings
   - published Command/Revision metadata is frozen

7. **Recovery semantics boundary**
   - caller-facing `protect()` was removed
   - only the future Persistence acknowledgement path may advance protected Revision state
   - the commit result is named a Persistence handoff, not a completed Recovery packet

8. **Published state hardening**
   - Document Root, Raster Manifest and paged metadata state are frozen or runtime-private where appropriate
   - Active Transaction scratch state is hidden behind the internal capability

Final Core CI run `36376962511`:

- strict TypeScript: PASS
- Vitest: **8 tests / 8 files PASS**
- result: **success**

## What this slice does not claim

Not implemented yet:

- production Brush sample reconstruction / dab generation
- actual Canvas renderer / WebGPU / WebGL2 backend
- dirty-subrect render upload path
- production OPFS Persistence Worker integration
- Autosave / crash recovery end-to-end
- Group / Vector / Text / Mask / Effect Layer kinds
- Snapshot / Layer Comp / Macro / Timelapse
- hot/cold History spilling and GC
- portable `.illustro` encoding
- Region / ICC / Wet Media

The P0 prototype remains evidence for the unimplemented runtime subsystems; it is not imported as Production Core.

## Result

Vertical Slice 001 is sufficient to establish the Production Core foundation for Raster editing without introducing Product UI.

Next implementation slice should connect normalized Brush Stroke semantics to this Transaction/Raster path while preserving the same Canonical/Revision invariants.
