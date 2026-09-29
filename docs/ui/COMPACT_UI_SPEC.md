# Illustro Compact / Smartphone UI — Candidate Specification

> Status: **CANDIDATE / USER CO-DESIGN IN PROGRESS**
> Date: 2026-09-29
> Scope: Smartphone / Compact projection
> Parent: [UI Gate E](UI_GATE_E.md)
> Related:
> - [Left UI — Canonical Specification](LEFT_UI_SPEC.md)
> - [Right UI — Canonical Specification](RIGHT_UI_SPEC.md)
> - [Expanded / Medium Visual Review Record](UI_GATE_E_VISUAL_REVIEW_2026-09-29.md)

## 1. Core direction

Compact is **not** a scaled PC/tablet shell.

It uses an ibisPaint-inspired interaction pattern:

- Canvas occupies nearly the full screen;
- a stable bottom Main Toolbar exposes high-frequency destinations;
- detailed work opens in temporary pages/sheets;
- Tool selection is explicit and discoverable;
- Color / Properties / Layers are one-tap destinations.

Illustro adds one major system:

> **Workspace Pages** — the 12 semantic Right Boxes projected as ordered swipeable pages.

The 12 page IDs are the same semantic IDs as the Right UI. Compact changes projection, not capability identity.

## 2. Main Toolbar

Baseline structure follows the ibisPaint idea of a small stable command row, while preserving Illustro semantics.

Candidate left -> right:

1. **Brush / Eraser**
2. **Tools / All Features**
3. **Properties**
4. **Color**
5. **Focus**
6. **Layers**
7. **Workspace Pages**

Notes:

- this is interaction inspiration, not a visual copy of ibisPaint;
- Home/document navigation remains in the compact document strip rather than consuming a drawing-tool slot;
- the exact Undo/Redo compact projection remains to be visually co-designed; gesture/Quick Controller may accelerate it but cannot be the only route.

## 3. Workspace Pages

Each canonical Right Box becomes one Compact page:

1. Layers
2. Color
3. Brush
4. Inspector
5. Reference
6. Assets
7. Effects
8. Navigator
9. History
10. Automation
11. Document
12. Workspace

Default order matches PC/tablet semantic order for learnability.

Compact stores its own page order as Compact Workspace state. Reordering Compact pages does **not** silently reorder PC/tablet Boxes.

## 4. Opening a page

A Workspace Page opens as an anchored sheet above the bottom Main Toolbar.

Default goals:

- Canvas remains visible;
- the page is non-modal;
- drawing can resume immediately after dismissing it;
- page content gets enough vertical space for real controls rather than miniaturization.

Pages may support:

- normal height;
- expanded / near-full height;
- dismissed.

Exact pixel heights are visual-prototype work.

Dedicated toolbar routes:

- Properties -> Inspector page
- Color -> Color page
- Layers -> Layers page

Workspace Pages button:
- closed -> opens last-used Workspace Page;
- open -> opens Page Overview / page navigator.

Left/Search semantic deep links map to the corresponding Compact page.

## 5. Horizontal page switching

When a Workspace Page is open, **horizontal swipe switches to the previous/next page in the user's Compact page order**.

Gesture conflict rule:

Horizontal paging is recognized only when the gesture does **not** begin on a control that owns horizontal dragging.

Paging must not steal gestures from:

- sliders;
- color fields;
- horizontally scrolling asset/preset rows;
- reorder handles;
- text fields;
- transform controls;
- other direct manipulation widgets.

The page header and noninteractive page background are guaranteed swipe regions.

A sufficiently clear horizontal-intent threshold distinguishes page switching from vertical scrolling.

No page switch begins from the Canvas outside the Workspace Page.

## 6. Page position / navigation

Do **not** use 12 equal page dots.

Normal page header shows:

- page icon;
- page title;
- compact position, e.g. `3 / 12`;
- Page Overview button;
- PiP button when eligible;
- close/dismiss.

Optional adjacent-page edge hints may be used visually.

Direct navigation is always available through Page Overview; users are not forced to swipe through many pages.

## 7. Page Overview

Page Overview is the direct-jump and organization surface.

Opening it shows an ordered **PDF-like page filmstrip / organizer**.

Baseline:

- horizontal filmstrip positioned at the lower part of the Workspace Page;
- each Workspace Page appears as a compact card;
- card contains icon + short label + order number;
- current page is clearly marked without color alone;
- filmstrip scrolls horizontally;
- tapping a card jumps directly to that page.

Cards use semantic miniature previews, not expensive live screenshots of the UI.

For 12 pages, the filmstrip is preferable to 12 tiny dots because every page remains identifiable by name/icon.

## 8. Reorder mode

Reordering is explicit.

Entry:

- Page Overview -> **Edit Order**

In Edit Order:

- each page card exposes a visible reorder handle;
- drag card horizontally;
- insertion marker shows exact destination before release;
- edge auto-scroll lets the user move a page across the 12-page list;
- invalid/cancel returns to the original position;
- Done commits;
- Cancel restores the entry snapshot;
- Reset restores canonical default order.

Reorder never occurs from ordinary page swiping.

### Non-drag alternative

Dragging cannot be the only reorder path.

Selected page card also provides:

- Move Earlier
- Move Later
- Move to Start
- Move to End
- Move To...

This follows the same accessibility/recoverability rule as desktop Box movement.

## 9. Why filmstrip instead of a permanent tab row

A permanent 12-item tab row would:

- consume Canvas height;
- create tiny targets;
- overload the user with all advanced pages at once;
- conflict with the ibisPaint-style compact toolbar.

Therefore:

- normal mode = one current page + swipe;
- direct jump/reorder = explicit Page Overview filmstrip.

## 10. PiP on smartphone

Compact does **not** use drag-to-detach as the primary PiP entry.

PiP is activated with an explicit **PiP button in the page header**.

This matches the user's preferred mental model:

> PiP is a deliberate presentation switch, not a hidden tear-off gesture.

Eligible baseline pages:

- Layers — compact subset
- Color
- Brush
- Inspector
- Reference
- Navigator

Not PiP by default:

- Assets
- Effects
- History
- Automation
- Document
- Workspace

The latter need more structured/full sheet space.

## 11. Compact PiP behavior

Baseline allows **one Compact PiP at a time**.

Reason:
- multiple floating panels on a smartphone rapidly destroy Canvas dominance.

PiP button:

- anchored page -> PiP
- same page PiP -> dock back
- fixed Page destination remains discoverable through Workspace Pages

The PiP can be repositioned after creation using its move handle.

PiP creation itself is button-driven.

Opening another eligible page as PiP returns the prior PiP to its anchored page state before showing the new one.

No artwork state changes.

## 12. PiP content reduction

PiP shows a compact working subset, not the whole page squeezed into a tiny rectangle.

Examples:

### Layers PiP
- active layer
- nearby layer rows
- visibility
- quick add
- open full Layers page

### Color PiP
- current color
- compact picker
- recent colors

### Brush PiP
- current preset
- size
- opacity
- stabilization
- open full Brush page

### Inspector PiP
- current context
- highest-frequency properties
- open full Inspector page

### Reference PiP
- active reference
- visibility
- select/reference controls

### Navigator PiP
- preview
- zoom
- current viewport

The same semantic state is shared with the full page.

## 13. Layers page

Layers remains a privileged Compact page.

Opening from the Main Toolbar goes directly to Layers, not through Workspace Page navigation.

It uses the same Layer model as desktop/tablet.

High-priority content:

- active layer
- Blend / Opacity
- layer tree/list
- visibility
- group hierarchy
- add / special-add
- mask
- merge/delete
- search/filter when invoked

Layer row reorder continues to use a dedicated row reorder handle.

Workspace Page reorder and Layer reorder must have visually different modes/handles.

## 14. Gesture hierarchy

Priority when a Workspace Page is open:

1. active control direct manipulation
2. Layer/page-card reorder handle drag
3. vertical content scroll
4. horizontal Workspace Page swipe from eligible region
5. sheet vertical resize/dismiss gesture

This priority prevents a color slider or layer reorder from accidentally switching the entire Workspace Page.

## 15. Persistence

Compact Workspace state:

- page order
- last-used page
- PiP eligibility preferences if later customizable
- current PiP position/size
- current page preferred sheet height
- toolbar customization if later enabled

It does not enter Artwork History.

Compact page order is independent of desktop Right Box order unless the user explicitly chooses a future synchronization option.

## 16. Performance

Workspace paging must not instantiate all 12 heavy pages simultaneously.

Keep:

- current page fully active;
- adjacent page shells/preload metadata only;
- distant pages lazy.

Page Overview card thumbnails are semantic/lightweight, not live rendered panel screenshots.

Swipe animation must not trigger document-wide work.

## 17. Accessibility / input

- page switching has direct Page Overview alternative;
- reorder has non-drag alternatives;
- no essential operation is long-press-only;
- no essential operation is swipe-only;
- page title and position are accessible;
- page cards expose order and current state programmatically;
- PiP button has explicit state: Make PiP / Dock Back;
- active page/PiP state does not rely on color alone.

## 18. Source-backed rationale

Official behavior used as evidence:

- ibisPaint Main Toolbar places Brush/Eraser, Tool Select, Properties, Color, Full Screen, Layer and Back in a compact persistent toolbar.
- ibisPaint Layer Window uses explicit reorder handles; its Floating Layer Window is officially a tablet/PC feature.
- Apple Page Controls describe horizontal ordered-page navigation but advise against relying on large counts of page indicators; more than roughly ten peers benefit from another overview arrangement.
- Adobe Acrobat uses page thumbnails and explicit insertion positions for page organization.

Illustro therefore combines:

- ibisPaint-like compact direct access;
- swipeable ordered Workspace Pages;
- explicit PDF-like Page Overview for direct jump/reorder;
- button-driven Compact PiP;
- Illustro semantic IDs / Canvas-first / progressive-disclosure rules.

## 19. User-review questions

Before marking Compact semantic layout complete, visually test:

1. Does the ibis-like bottom toolbar feel sufficiently direct?
2. Does horizontal page swipe feel natural without fighting sliders/lists?
3. Is the Page Overview filmstrip faster to understand than a grid?
4. Is one Compact PiP enough?
5. Which pages should be PiP-eligible?
6. Does Layers deserve a slightly different opening height from other pages?
7. Where should the visible Undo/Redo route live in Compact?

## 20. Current status

The architecture above is the **recommended Compact candidate**.

Not yet locked:

- exact toolbar button allocation;
- Undo/Redo visible placement;
- exact sheet heights;
- exact Page Overview filmstrip size;
- exact PiP geometry;
- final PiP eligibility set;
- portrait/landscape visual composition.

Those should be decided through the next Compact HTML visual prototype and user review.
