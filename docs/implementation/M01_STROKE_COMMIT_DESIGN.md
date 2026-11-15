# M01 Stroke Commit — Production Design

> Date: 2026-10-05
> Branch: `milestone/M01-stroke-commit`
> Base: `integration/production-prep-2026-10-05@cb95bd22ed073f7292a7f1991dda6cb6cd296b45`
> Scope: M01 only.

## 1. Goal

When the user releases the pen, the final Brush Foundation `StrokeRecord` becomes formal Document meaning on the drawing target Raster Layer.

A stroke is not “saved because it is visible.” Visibility remains Derived/Preview state. Formal authority is the V2 combination of:

- captured base Revision;
- versioned brush semantic operation;
- exact target Layer/Surface identity;
- required algorithm/resource/source references;
- Raster logical values for only the touched canonical tiles.

## 2. Existing Brush Foundation boundary

The frozen Brush Foundation already provides:

- final `StrokeRecord` from `RealtimeSession.end()`;
- actual/predicted separation;
- final commands and replay-relevant semantic data;
- realtime WebGPU/WebGL2 rendering;
- 128px runtime processing tiles.

M01 does not change those sources.

The public renderer also exposes a whole-canvas `read()`, but M01 deliberately does not use it because a full Canvas readback per stroke violates the Production performance contract and framebuffer bytes are not semantic authority.

## 3. Target capture

At pointer-down, the Editor obtains a `DrawingTarget` containing:

- Document ID;
- Layer ID;
- Raster Surface ID;
- base Revision ID;
- canvas dimensions.

This is held for the active stroke. At commit, all identities and the base Revision must still match.

The current UI has only Layer 1, but the boundary is identity-based so M02 can later select a different Raster Layer without changing stroke semantics.

## 4. Pen-up commit path

```text
pointer-down
  -> capture DrawingTarget
  -> Brush Foundation realtime session

actual input
  -> Brush Foundation preview/confirmed rendering

pointer-up
  -> RealtimeSession.end()
  -> final StrokeRecord
  -> validate canonical-only input
  -> calculate affected 256px canonical tile footprints
  -> begin one Core Transaction at captured base Revision
  -> append one brush.stroke SemanticOperation
  -> attach bounded semantic Raster mutation refs to touched logical tiles
  -> atomically publish one new immutable Root + one Revision
```

The dirty-footprint pass scans final commands once. It does not replay the whole stroke, read the Canvas, recompose all Layers, or serialize the Document.

## 5. 128px Brush execution vs 256px canonical Raster

These units remain deliberately separate:

- Brush Foundation runtime execution: 128px/adaptive backend work, unchanged;
- Core canonical logical Raster grid: fixed 256×256, signed coordinates.

M01 maps command influence bounds to the canonical 256 grid. It does not change Brush Foundation to 256px.

Each affected tile stores local dirty bounds and the command indices relevant to that tile. This is a hint/dependency index, not a replacement for the authoritative BrushStrokeOperation.

## 6. Strict materialization

Architecture V2 explicitly allows a published logical Raster tile to be represented by:

1. strict immutable materialized bytes; or
2. a strict base value plus a bounded, versioned semantic mutation chain.

M01 uses (2) for Brush strokes.

Reason:

- the frozen Brush public strict CPU evaluator is whole-origin/full-rectangle oriented;
- forcing a full Canvas CPU/GPU readback or replay on every pen-up would violate M01 performance requirements;
- strict materialization is allowed to run asynchronously after logical Commit.

Therefore M01 publishes the formal semantic stroke and its dirty Raster logical mutations at pen-up. Future strict materialization consumes those bounded dependencies without creating another user Revision.

M01 does not implement Save/Recovery or a background materializer product service; it only leaves the V2 logical handoff/dependency boundary correct for those later milestones.

## 7. Atomicity / publication point

The publication point is `RevisionHistory.publish()` after:

- stale base check;
- all validation/admission checks;
- all prospective immutable block ownership preparation;
- complete construction of the new Root and SemanticOperation set.

A successful M01 stroke publishes together:

- one immutable Document Root;
- one immutable Revision;
- one `brush.stroke` SemanticOperation;
- Raster logical mutation references on only touched tiles;
- one V2 logical Persistence handoff with WriterEpoch/CommitSequence.

If validation, target checks, admission, or ownership preparation fails, the old head remains current and no new Revision is visible.

Direct strict-byte edits still use prepared immutable block batches and roll them back if publication fails.

## 8. Stale / cancel / failure behavior

### Cancel

`pointercancel` calls Brush Session cancel and does not invoke `DocumentPort.commitStroke()`.

### Stale target

If the current Document head differs from the base Revision captured at pointer-down, commit is rejected before formal publication.

Layer and Surface IDs are also rechecked.

### Locked/invalid Layer

The target is rejected; no alternate Layer is silently created.

### Commit failure after the realtime line became visible

The Editor removes the failed realtime stroke from the session and reports that the line was not kept. It does not leave a visible line pretending to be formal artwork.

## 9. Core V2 minimum realignment included in M01

M01 replaces V1-shaped production assumptions required by `CORE_SLICE_001_FINAL_DISPOSITION.md`:

- durable Revision/Block IDs are UUID identities;
- runtime handle type is distinct;
- Raster Surface Descriptor carries sample encoding;
- canonical tile size is fixed at 256;
- signed tile coordinates use floor mapping;
- Raster API is not RGBA8-only;
- V2 SemanticOperation envelope is used;
- V2 logical Persistence handoff uses WriterEpoch + CommitSequence;
- max-Revision recovery ordering is removed/replaced by contiguous CommitSequence tracking.

The retained existing properties remain:

- sparse allocation;
- immutable published roots/bytes;
- ownership transfer;
- stale transaction rejection;
- one Transaction -> one Revision;
- no-op -> no Revision;
- root-switch History and branch retention.

## 10. Performance rules

The normal M01 pen-up path performs:

- O(number of final brush commands + number of touched canonical tiles) footprint bookkeeping;
- no full Canvas readback;
- no full Layer copy;
- no full Document serialization;
- no forced whole-stroke strict replay;
- no change to Brush GPU scheduling.

Actual input collection remains higher priority because formal Document work begins only after the frozen realtime session returns its final StrokeRecord.

## 11. M01 scope exclusions

Not implemented:

- Layer add/select UI (M02);
- product Undo/Redo UI (M03);
- Eraser product milestone completion (M04; existing frozen eraser preview remains);
- Save/Recovery/Reload/Export;
- Selection/Transform/Fill/Region/Effects/Liquify;
- final Color/Brush/Layer UI;
- final Motion/Quick Controller/Compact/Aurora polish.

## 12. Acceptance state

Automated tests can prove structural correctness and browser integration, but they cannot certify drawing feel on the user's actual pen/tablet.

Final M01 branch state therefore becomes `👤 ユーザー確認待ち`, not ✅, until the user explicitly approves the QA build.
