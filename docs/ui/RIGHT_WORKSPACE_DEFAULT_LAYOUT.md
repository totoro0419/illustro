# Illustro Right Workspace — Default Layout & Collapse Specification

> Status: **DESIGN BASELINE / USER REVIEW PENDING**
> Date: 2026-09-29
> Scope: PC / tablet Right Workspace default order, expansion state and collapsed summaries
> Parent: [Right Workspace — Box Taxonomy V2](RIGHT_WORKSPACE_BOX_TAXONOMY.md)
> General UI research: [RIGHT_WORKSPACE_GENERAL_UI_RESEARCH.md](RIGHT_WORKSPACE_GENERAL_UI_RESEARCH.md)

## 1. Baseline principle

All 12 semantic Boxes are present in the Right Workspace.

The default does **not** reduce capability by hiding Boxes.

Information density is controlled by:

- expand / collapse;
- independent vertical scrolling of the Box stack;
- detaching a Box when the user wants it closer to the Canvas;
- resizing where the Box type permits.

The fixed five-button bottom strip is outside the scrollable Box stack.

## 2. Default vertical order

Top -> bottom:

1. **Layers & Compositing**
2. **Color**
3. **Brush**
4. **Properties / Inspector**
5. **Reference**
6. **Assets**
7. **Effects & Adjustments**
8. **Navigator & View**
9. **History & Progress**
10. **Automation**
11. **Document**
12. **Workspace**

Then, outside the scroll region:

13. **Fixed bottom command strip**

Rationale:

- Layers / Color / Brush are the three persistent painting workspaces with the highest ordinary creation frequency.
- Inspector stays immediately after the creation trio because it is the main destination for tool/entity detail.
- Reference and Assets are creation-support resources.
- Effects is a deeper editing system and follows direct creation resources.
- Navigator/History/Automation are observation and workflow systems.
- Document/Workspace are deeper structural/application controls and stay at the bottom.

The user may reorder Boxes. The order is Workspace-persistent.

## 3. Default expansion state

### Expanded by default

1. **Layers & Compositing**
2. **Color**
3. **Brush**

### Collapsed by default

4. Properties / Inspector
5. Reference
6. Assets
7. Effects & Adjustments
8. Navigator & View
9. History & Progress
10. Automation
11. Document
12. Workspace

This is the initial/default Workspace only.

After the user changes expansion state, the user's state persists as Workspace state.

A Workspace Preset may intentionally store a different expansion pattern.

## 4. Why Inspector is collapsed by default

Inspector is important but context-dependent.

High-frequency lightweight parameters remain eligible for Context Surface near the Canvas.

Inspector expands when the user explicitly:

- opens it;
- invokes a detailed property from Left/Search;
- restores a Workspace Preset in which it is expanded.

Tool/selection changes alone do **not** auto-expand a collapsed Inspector.

When already expanded and unlocked, it follows the current context.

This avoids constant vertical churn while still making deep settings one explicit action away.

## 5. Right stack scrolling

The Box stack has its own vertical scroll region.

Rules:

- the Canvas does not move when the Right stack scrolls;
- the five-button bottom strip remains fixed;
- Box order is unchanged by scroll position;
- expanding a Box may push later Boxes below the viewport;
- the system does not auto-collapse another Box merely to make room;
- a Left/Search deep-link expands the target Box if needed and scrolls it into view;
- opening one Box never silently closes another Box.

This is deliberately **not** a single-open accordion.

## 6. Collapse contract

Collapse reduces information, but does not erase identity or important state.

Every collapsed Box retains:

- icon;
- title;
- expansion affordance;
- state/attention marker when relevant;
- a compact summary defined below.

A collapsed Box remains a valid Left/Search destination.

If a deep-link targets a control inside a collapsed Box:

1. expand the Box;
2. scroll/reveal it;
3. reveal the target section;
4. do not collapse unrelated Boxes.

## 7. Collapsed summary by Box

### R1 — Layers & Compositing

Collapsed summary:

- active layer thumbnail/icon;
- active layer name;
- compact visibility/lock warning if relevant;
- selected-layer count when multi-select is active.

Do not place the entire layer tree in the header.

### R2 — Color

Collapsed summary:

- current primary color swatch;
- optional compact color value representation appropriate to the active color model;
- gamut/proof warning marker when relevant.

The current color remains identifiable without opening the Box.

### R3 — Brush

Collapsed summary:

- current Brush preset icon/thumbnail;
- preset name;
- current size;
- optional stabilization/wet-state marker only when materially relevant.

Do not place full Brush dynamics in the header.

### R4 — Properties / Inspector

Collapsed summary:

- current context owner/type, e.g. `Smart Fill`, `Text`, `Layer: Hair`, `Reference 2`;
- Lock Context marker when locked.

When no editable context exists, show an explicit neutral empty-context summary rather than stale properties.

### R5 — Reference

Collapsed summary:

- active/reference count;
- active reference name or thumbnail if available;
- temporary-hide/pin marker when relevant.

### R6 — Assets

Collapsed summary:

- current asset category;
- last/current collection name;
- active search/filter marker if one remains applied.

### R7 — Effects & Adjustments

Collapsed summary:

- effect/adjustment count on the current target;
- enabled/disabled state marker;
- currently selected effect name when useful.

### R8 — Navigator & View

Collapsed summary:

- current zoom percentage;
- optional view-state markers for Soft Proof / Grayscale / Gamut Warning when enabled.

### R9 — History & Progress

Collapsed summary:

- current subsection label (History / Snapshot / Timelapse / Work Time);
- active recording/export/progress marker when relevant;
- Work Time may show current-session elapsed time if enabled by the user.

Do not expose a constantly changing verbose history string in the header.

### R10 — Automation

Collapsed summary:

- current macro/recording state;
- recording indicator when Action Recording is active.

When idle, title + neutral state is sufficient.

### R11 — Document

Collapsed summary:

- canvas dimensions;
- compact document color/profile marker;
- save/recovery warning only when relevant.

Normal save status remains governed by the global document/app shell and should not be duplicated noisily here.

### R12 — Workspace

Collapsed summary:

- active Workspace Preset name;
- modified-layout marker when the current arrangement differs from the saved preset.

## 8. Default Box expansion sizes

Exact pixels are visual-validation work.

Semantic sizing rules:

### Layers & Compositing

Default expanded size should expose enough layer rows to support ordinary painting without immediately requiring internal scrolling.

The layer list itself may scroll independently inside the Box.

### Color

Default expanded size should show the primary picker/model controls plus recent/palette access without opening another surface.

### Brush

Default expanded size should show current preset selection plus high-frequency Brush basics.

Deep engine/dynamics sections may scroll/collapse within the Box.

### Other Boxes

When manually expanded, each Box uses a sensible remembered size.

Do not automatically expand to consume the entire Right Workspace unless the user explicitly requests a maximized/special surface.

## 9. Fixed bottom command strip

The bottom strip remains visible regardless of Box scroll/expansion state.

Left -> right:

1. **Layer Page**
2. **Undo**
3. **Redo**
4. **Horizontal Flip**
5. **Vertical Flip**

It is compact and icon-led, with accessible names and non-hover identification paths.

The strip is not part of magnetic reorder.

Its five semantic actions are fixed in this baseline.

## 10. Layer Page relation

Layer Page is opened from the first fixed-bottom button.

It is not the same container as Layers & Compositing Box.

It uses the same Layer model and semantic commands.

Default behavior when Layer Page opens:

- current layer selection is preserved;
- current layer search/filter state is preserved where compatible;
- Layers Box state remains unchanged behind it;
- closing Layer Page returns to the same Right Workspace expansion/scroll state;
- Layer Page actions appear immediately in the normal shared layer state/history.

Layer Page is the expanded management surface for cases where the compact Layers Box is insufficient.

## 11. Expansion interaction

### Header activation

The dedicated collapse/expand affordance changes Box expansion state.

The Box title itself may focus/select the Box but must not ambiguously execute unrelated content actions.

### From Left/Search

A route to the Box itself:

- scroll/focus/reveal the Box;
- if collapsed and the request semantically requires content, expand it.

A route to a specific property:

- expand;
- reveal exact section;
- identify target.

### Detached Box

A detached Box keeps its expanded/collapsed state.

Collapsing a detached Box reduces it to its compact detached header form rather than re-docking it.

## 12. PC / tablet default

The logical order and default expansion profile are the same on PC and tablet:

- Layers expanded
- Color expanded
- Brush expanded
- all remaining Boxes collapsed

Tablet may use:

- larger hit targets;
- narrower/wider adaptive Box cards;
- overlay-oriented projection if Canvas preservation requires it.

It does **not** silently change logical Box order.

If available height is insufficient, the Right stack scrolls rather than auto-collapsing user-expanded Boxes.

## 13. Persistence

Workspace-persistent:

- Box order;
- expanded/collapsed state;
- Box size;
- dock/detach state;
- detached position;
- Workspace preset association;
- stack scroll restoration where useful and non-confusing.

Session/transient:

- hover/pressed states;
- temporary reveal highlight;
- temporary drag preview.

Not Artwork History:

- any Box expansion/collapse/reorder/detach operation;
- Right stack scroll position;
- Layer Page open/closed state.

## 14. Performance

Collapsed Boxes should perform near-zero recurring work except minimal state necessary for their compact summary.

Examples:

- collapsed Reference does not continuously redraw large previews unless needed;
- collapsed Assets does not decode full thumbnail grids;
- collapsed History does not render long history lists;
- collapsed Brush does not render deep dynamics controls.

Header summaries are metadata-level and update incrementally.

## 15. Baseline decision

The Right Workspace default is now:

```
[Layers & Compositing]  EXPANDED
[Color]                 EXPANDED
[Brush]                 EXPANDED
[Properties / Inspector] collapsed
[Reference]              collapsed
[Assets]                 collapsed
[Effects & Adjustments]  collapsed
[Navigator & View]       collapsed
[History & Progress]     collapsed
[Automation]             collapsed
[Document]               collapsed
[Workspace]              collapsed
────────────────────────────────
[Layer Page][Undo][Redo][H Flip][V Flip]  FIXED
```

This baseline may be changed by the user and by explicit Workspace Presets, but never by implicit usage-frequency reordering or automatic accordion behavior.
