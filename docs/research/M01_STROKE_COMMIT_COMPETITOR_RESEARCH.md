# M01 Stroke Commit — Competitor Research

> Date: 2026-10-05
> Scope: M01「一筆を選択Layerへ正式確定」
> Source policy: official manuals/help pages first. Publicly undocumented internal implementations are marked unknown.

## Conclusion

The common user-facing pattern across major painting applications is that painting acts on a currently selected/editable drawing target, while locked or otherwise non-editable targets prevent normal painting. Undo documentation also treats completed drawing strokes as normal edit actions.

Illustro M01 adopts that user experience, but implements it using Illustro's own published Architecture V2 contracts:

- capture the active Raster Layer target when a stroke begins;
- commit only the final canonical StrokeRecord after pen-up;
- one stroke = one Document Transaction = one Revision;
- reject stale/locked/invalid targets instead of silently redirecting the stroke;
- never expose Preview/temporary rendering as artwork authority;
- do not create a new layer automatically in M01.

The competitors' private transaction, GPU, tile, framebuffer, or persistence implementations are not publicly documented by the sources below. No claim is made about those internals.

## ibisPaint

Official sources:

- Undo and Eraser: https://ibispaint.com/lecture/index.jsp?lang=en&no=08
- Gestures / cancel drawing / undo and redo: https://ibispaint.com/lecture/index.jsp?lang=en&no=151
- Layer alpha lock example: https://ibispaint.com/lecture/index.jsp?lang=ja&no=31

Observed public behavior:

- A just-drawn line can be undone as an action; ten drawn lines can be undone ten times.
- An in-progress brush/eraser/finger drawing can be cancelled by gesture.
- Layer state constrains where painting changes can occur.

Adopt for Illustro:

- completed stroke is one user operation;
- cancelled stroke must not become a completed Document revision.

Unknown from public documentation:

- exact internal transaction boundaries;
- preview framebuffer ownership;
- GPU queue/tile architecture;
- strict raster materialization strategy.

## CLIP STUDIO PAINT

Official sources:

- Using layers: https://help.clip-studio.com/en-us/manual_en/180_layers/Using_layers.htm
- Other layer settings: https://help.clip-studio.com/en-us/manual_en/180_layers/Other_layer_settings.htm
- Tablet Studio Mode: https://help.clip-studio.com/en-us/manual_en/090_tablet/Using_Studio_Mode.htm

Observed public behavior:

- the Layer palette identifies an active/current editing layer;
- raster layers are a basic drawing/painting target;
- a locked layer cannot be drawn on or edited;
- tablet Studio Mode uses the same current-layer concept.

Adopt for Illustro:

- drawing target is an explicit Layer identity rather than “whatever is visible”;
- lock is checked as a drawing precondition;
- PC/Tablet share the same document semantics.

Unknown:

- whether the target identity is internally captured on pointer-down or resolved later;
- private raster/preview implementation.

## Procreate

Official sources:

- Organize layers: https://help.procreate.com/procreate/handbook/5.4/layers/layers-organize
- Layer options: https://help.procreate.com/procreate/handbook/layers/layers-options
- Layer lock documentation: https://help.procreate.com/procreate/handbook/5.0/layers/layers-mask
- Gestures: https://help.procreate.com/procreate/handbook/interface-gestures/gestures

Observed public behavior:

- exactly one Primary layer is active at a time for drawing/painting;
- painting affects the Primary layer;
- locked layers are protected from editing.

Adopt for Illustro:

- one explicit primary drawing target at stroke start;
- target validity/lock is checked rather than silently mutating another layer.

Unknown:

- internal stroke commit/raster cache implementation.

## Krita

Official sources:

- Freehand Brush Tool: https://docs.krita.org/en/reference_manual/tools/freehand_brush.html
- Layers docker: https://docs.krita.org/en/reference_manual/dockers/layers.html
- Basic Concepts: https://docs.krita.org/en/user_manual/getting_started/basic_concepts.html

Observed public behavior:

- Freehand Brush paints on Paint Layers;
- Paint Layers are raster layers used for painting;
- locking a layer prevents modification.

Adopt for Illustro:

- M01 formal target is a Raster Layer;
- non-drawable/locked targets fail without changing artwork.

Unknown:

- private transaction/revision implementation.

## Adobe Photoshop

Official source:

- Paint with Brush or Pencil tools: https://helpx.adobe.com/photoshop/desktop/apply-painting-techniques/brushes-presets/paint-with-brush-or-pencil-tool.html

Observed public behavior:

- Brush/Pencil applies painting strokes to the image;
- Photoshop 25.0+ automatically creates a new transparent layer when painting on certain non-raster layer types (Smart Object, text, shape, adjustment).

Adopt:

- ordinary painting should feel direct; the user should not need to understand Preview finalization.

Not adopted in M01:

- automatic creation of a new transparent layer for a non-raster target.

Reason:

- this would implement hidden Layer creation/selection behavior before M02;
- Illustro M01 deliberately rejects an invalid target and leaves the Document unchanged.

Unknown:

- exact private GPU/transaction/raster commit mechanism.

## Affinity Photo

Official source:

- Erasing: https://affinity.help/photo2ipad/en-US.lproj/pages/Painting/erasing.html

Observed public behavior:

- for pixel-layer erasing, the documented flow begins by selecting a pixel layer and then dragging the brush stroke;
- behavior on vector layers may create/use a mask depending on the operation/assistant policy.

Adopt:

- pixel/raster painting operations use an explicit pixel/raster target.

Not adopted in M01:

- automatic structural conversion/mask creation for other layer types.

Reason:

- structural Layer/Mask behavior belongs to later milestones.

Unknown:

- private transaction/revision/materialization architecture.

## Cross-application decision for M01

| Question | M01 decision |
|---|---|
| Which Layer receives a stroke? | The captured selected Raster Layer target. M01 currently has Layer 1 only, but the target carries stable Layer/Surface IDs for M02. |
| Locked/non-drawable target | Do not commit the stroke. Keep Document unchanged. |
| Completed stroke unit | One stroke = one user Transaction = one Revision. |
| Cancel | No formal Document commit. |
| Preview | Never treated as artwork authority and not exposed as a user concept. |
| Layer changes during a stroke | Captured base Revision/Layer/Surface identity must still match; otherwise reject as stale. |
| PC/Tablet semantics | Same Document semantics. Input UI differs later, not the commit contract. |
| Auto-create a new layer | Not in M01. |
| Competitor private implementation copied? | No. It is not public; Illustro follows its own V2 contracts instead of guessing. |

## Sources checked on 2026-10-05

All sources above are vendor-owned official documentation/help pages. Their public UI behavior informed the M01 user experience. None is evidence for undocumented internal GPU, storage, transaction, or tile algorithms.
