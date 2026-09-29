# Illustro Right UI — Layer Page Specification

> Status: **SUPPORTING DETAIL / CANONICALIZED**
> Date: 2026-09-29
> Scope: Supporting Layer Page detail
> Canonical authority: [Right UI — Canonical Specification](RIGHT_UI_SPEC.md)
> Related:
> - [Right Workspace — Box Taxonomy V2](RIGHT_WORKSPACE_BOX_TAXONOMY.md)
> - [Right Workspace — Default Layout & Collapse](RIGHT_WORKSPACE_DEFAULT_LAYOUT.md)
> - [Right Workspace — Box Interaction Specification](RIGHT_WORKSPACE_INTERACTION_SPEC.md)

## 1. Reference model

The Layer Page takes strong interaction inspiration from ibisPaint's Layer Window:

- one expanded layer-management surface;
- layer list is the visual center;
- visibility and order are manipulated directly in the list;
- layer-level controls such as opacity, blend, clipping and alpha-related operations remain close to the layer list;
- add/special-layer/command actions are consolidated into the same surface;
- tablet/PC can support a floating form.

Illustro does not copy ibisPaint's exact layout, icons or visual styling.

Official reference:
- https://ibispaint.com/lecture/index.jsp?lang=en&no=156

## 2. Role

Layer Page is **not a second Layer system**.

It is the expanded presentation of the same Layer model and semantic commands used by the compact Layers & Compositing Box.

> **Layers Box = compact persistent presentation**
>
> **Layer Page = expanded high-density presentation**

No Layer command may exist only because Layer Page exists unless explicitly added to the shared Layer feature model.

## 3. Opening / closing

Open:
- fixed right-bottom Layer Page button.

Default opening behavior:
- Layer Page expands from the right side;
- it temporarily takes priority over the normal Right Box stack;
- Canvas remains visible on the left;
- current layer selection is preserved;
- current layer search/filter state is preserved where compatible;
- no document/canvas state changes merely from opening it.

Close:
- explicit close/back control;
- the same fixed Layer Page button may close/toggle the page when it is already open;
- Escape closes it on keyboard-capable environments when no deeper modal/editor consumes Escape first.

Closing returns to the previous Right Workspace:
- same Box order;
- same expanded/collapsed states;
- same Right-stack scroll position where practical.

Opening/closing Layer Page is Workspace/UI state, not Artwork History.

## 4. Geometry

### PC / large tablet

Layer Page appears as a **wide right-side overlay/page**, larger than the normal Layers Box.

It may cover part of the Canvas, but does not replace the entire app.

It does not push the Canvas into a permanently smaller layout merely because the page is open.

### Optional floating form

On PC/tablet, Layer Page may be detached/floated in the same spirit as ibisPaint's Floating Layer Window.

Floating is a presentation state only. The same Layer model and commands remain active.

### Compact/smartphone

Not specified here. Do not derive smartphone geometry merely by scaling this page.

## 5. Internal structure

Layer Page has four structural areas:

1. Header
2. Layer tools / filters
3. Layer tree/list — largest region
4. Selected-layer properties + layer action strip

The Layer tree/list receives the largest area.

## 6. Header

Header contains:
- Layers title;
- selected-count when multi-selection is active;
- Search;
- Filter;
- More;
- close/back.

Do not overload the header with all layer commands.

## 7. Layer list row

Each layer/folder row supports the shared Layer model.

Baseline row information:
- thumbnail/type icon;
- layer/folder name;
- visibility control;
- selected state;
- hierarchy/indentation;
- clipping/mask relationship indicator;
- lock-state indicator;
- color tag where used;
- drag/reorder handle/area;
- disclosure for Groups/Folders.

Additional status may appear when relevant:
- Adjustment/Filter identity;
- Vector/Text type;
- missing font/error warning;
- mask thumbnail;
- multi-selection state.

Do not place every property permanently in each row.

## 8. Layer list direct manipulation

### Selection
- click/tap selects;
- supported modifier/range operations enable multi-select;
- selection synchronizes immediately with Layers Box and Canvas-direct layer selection.

### Reorder
- direct vertical drag;
- insertion preview before commit;
- invalid drop restores origin;
- non-drag Move commands remain available.

### Groups
- expand/collapse inline;
- dropping into/out of Group uses clear nesting preview.

### Visibility
- direct row control;
- shared semantic visibility command.

### Lock
Lock state is visible in row. Detailed lock type editing may open selected-layer controls/Inspector rather than expanding row chrome excessively.

## 9. Selected-layer properties

A compact property region remains adjacent to the layer list.

Includes high-frequency layer properties:
- Opacity;
- Blend Mode;
- Clipping;
- Alpha Lock / Lock Transparency;
- selected lock summary;
- color tag;
- other high-frequency layer-state controls justified by the Layer model.

This follows the useful ibisPaint pattern of keeping Blend/Opacity/Clipping close to the Layer Window while allowing Illustro's deeper settings to remain in Inspector.

Advanced or type-specific properties deep-link to Inspector.

Examples:
- Text typography -> Inspector;
- Vector node/stroke details -> Inspector;
- Adjustment/Filter detailed parameters -> Inspector;
- Layer Style details -> Effects/Inspector.

## 10. Layer action strip

A compact action area contains high-frequency structural commands.

Baseline:
- Add Layer;
- Add Special Layer / Add Layer Type;
- Add Group;
- Duplicate;
- Delete;
- Merge / Merge Down;
- Mask-related add action;
- More commands.

Exact glyph/order is visual-prototype work.

The action strip must not require long-press/right-click for essential commands.

## 11. Add Layer flow

Add Layer:
- immediate creation of the default Raster Layer.

Add Special Layer / Type opens the complete creation palette:
- Raster Layer;
- Vector Layer;
- Group;
- Mask;
- Vector Mask when supported;
- Adjustment Layer;
- Filter Layer;
- Text Layer;
- other canonical Layer types.

This keeps the most common add operation one action away while retaining full capability.

## 12. Command menu

Lower-frequency layer commands live in More/Command menu.

Examples:
- Rename;
- Rasterize;
- Merge Visible;
- Flatten Copy;
- select from layer content;
- export selected layer/folder where supported;
- Layer Comp-related operations;
- structural conversion actions.

The menu invokes the same semantic commands used by Left/Search/context routes.

## 13. Layers Box synchronization

Layer Page and Layers Box share, in real time:
- selected layer(s);
- layer order;
- hierarchy;
- visibility;
- locks;
- clipping;
- masks;
- blend/opacity;
- names/tags;
- search/filter where compatible;
- active layer-state warnings.

Example:
1. Layer Page selects Hair Shadow.
2. Close Layer Page.
3. Layers Box immediately shows Hair Shadow as the active layer.

There is no sync delay and no apply step.

## 14. Relationship with Inspector

Layer Page does not absorb every specialized property.

> Layer Page owns **layer management**.
>
> Inspector owns **deep properties of the selected layer/entity**.

Selecting a layer updates an open/unlocked Inspector.

Inspector never needs a duplicate Layer tree.

## 15. Relationship with Effects

Adjustment Layers, Filter Layers and Layer Styles appear in Layer Page as structural layer/effect entities/status.

Detailed effect-stack management remains in Effects & Adjustments.

Detailed selected-effect parameters remain primarily in Inspector.

## 16. Search / filter

Layer Page provides local layer search/filter.

Search candidates:
- layer/folder name;
- type;
- tag;
- selected property/status where useful.

Filter candidates include:
- Raster;
- Vector;
- Text;
- Group;
- Mask;
- Adjustment;
- Filter;
- visible/hidden;
- locked/unlocked;
- tag.

Exact query grammar is a later Layer feature detail, but the local search/filter surface is fixed.

## 17. Large-document behavior

Layer Page is designed for very large layer counts.

Requirements:
- virtualized layer rows;
- lazy thumbnails;
- stable scroll position;
- search/filter must not rebuild unrelated artwork;
- reorder must preserve stable IDs;
- expanding Groups must not cause document-wide work;
- opening Layer Page must not synchronously generate all thumbnails.

## 18. Floating Layer Page

When detached/floating:
- it keeps the same layer tree and controls;
- position/size are Workspace-persistent;
- it can be resized;
- it can re-dock to the right;
- it does not become a second Layers instance.

If the normal Layers Box is visible at the same time, both are synchronized views of the same model.

## 19. Keyboard / touch / pen

- layer rows are keyboard navigable;
- reorder has a non-drag command path;
- visibility/lock are direct controls with sufficient effective target area;
- no essential function is hover-only;
- no essential function is right-click-only;
- tablet targets increase without changing semantic layout.

## 20. Baseline completion

The Layer Page interaction model is now fixed as:
- ibisPaint-like expanded Layer Window concept;
- right-side expanded overlay/page;
- layer list dominant;
- layer controls and high-frequency properties kept close to list;
- same capability/model as Layers Box;
- Add Layer fast path + complete special-layer creation;
- local search/filter;
- optional floating PC/tablet form;
- synchronized with Layers Box, Inspector and Effects;
- large-layer-count virtualization/lazy behavior.

Remaining work is visual/runtime validation:
- exact width;
- exact action placement;
- exact iconography;
- exact row density;
- final animation;
- floating-window visual chrome;
- tablet visual projection.