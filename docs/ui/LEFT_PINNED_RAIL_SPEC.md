# Illustro Left UI — Pinned Rail Specification

> Status: **DESIGN BASELINE / USER REVIEW PENDING**
> Date: 2026-09-29
> Scope: PC / tablet Left UI rail behavior
> Parent: [Left UI Access Architecture](LEFT_UI_ACCESS_ARCHITECTURE.md)
> Coverage: [Left UI Access Coverage](LEFT_UI_ACCESS_COVERAGE.md)

## 1. Purpose

Pinned Railは、Illustroの全機能一覧そのものではない。

役割は:

> **ユーザーが繰り返し使う入口を、位置記憶できる形でCanvas左端へ固定すること。**

全機能の到達性は非削除の `All Features` 入口が保証する。

したがって:

- **Pinned Rail = speed / spatial memory**
- **All Features = completeness / discovery**

を分離する。

これはPhotoshopのToolbar + Extra Tools、CLIP STUDIO PAINTのTool/Sub Tool再構成、Procreateの高頻度機能の限定露出、ibisPaintのMain Toolbar + Tool Select分離から得た知見を、IllustroのCanvas-first設計へ合わせて再構成したもの。

## 2. Rail anatomy

Left UIは上から下へ次の3 zoneに分ける。

```
┌──────────┐
│          │
│ PINS     │  ← user-defined, reorderable
│          │
│          │
├──────────┤
│ OVERFLOW │  ← needed only when pins do not fit
├──────────┤
│   ALL    │  ← always visible, non-removable
└──────────┘
```

### 2.1 Pinned Zone

- user-defined items only
- order is explicit and persistent
- no frequency-based auto sorting
- no context-based implicit reordering
- no automatic promotion/demotion except geometric overflow caused by insufficient height
- current active tool is visually distinguishable without color alone

### 2.2 Overflow entry

Pinned items no longer fitting the available vertical space remain in the same logical order but are projected into an anchored overflow palette.

Rules:

- appears only when necessary
- sits immediately above All Features
- never replaces All Features
- never changes underlying pin order
- viewport shrink may move the tail of the ordered Pin list into overflow
- viewport expansion restores those items to the Rail in the same order
- user activity/frequency never changes which items are first

This avoids a scrollable Rail whose positions drift while drawing.

### 2.3 All Features entry

All Features is the permanent root navigation.

Rules:

- always visible
- always the lowest fixed Rail entry
- cannot be removed
- cannot be reordered
- cannot be replaced by a user Pin
- opens the All Features palette
- is excluded from Artwork History
- is available by keyboard navigation as well as pointer/pen/touch

The final icon artwork is not locked, but the semantic direction is **catalog/grid**, not a bare ellipsis. An ellipsis is too ambiguous for the only guaranteed path to all capabilities.

## 3. What can be pinned

Eligible Pin types:

| Type | Example | Activation |
|---|---|---|
| Tool Family | Selection | Activate last-used mode |
| Individual Tool/Mode | Region Selection | Activate directly |
| Command | Canvas Flip | Execute command |
| Toggle | Guide visibility | Change state |
| Workspace/PiP opener | Layers | Open/focus corresponding block |
| Category shortcut | Selection & Transform | Open that category directly |
| Dynamic preset | specific Brush preset | Activate parent Tool + preset |
| Custom Stack | user's painting group | Open stack palette |

Not everything in `FEATURE_CATALOG.md` is pinnable. Internal engine properties, automatic recovery mechanisms and Future features do not receive fake Pin targets.

## 4. Category shortcuts are pinnable

All 12 Left UI categories may be pinned.

A Category Pin:

- does not activate a Canvas tool;
- opens the corresponding category directly, bypassing the All Features category home;
- uses the same category content and search index as All Features;
- may be reordered like any other Pin.

This gives expert users one-tap access to a domain such as Layers/Compositing or Fill/Color/Region without making those domains permanently expanded.

## 5. Tool Family behavior

A Tool Family is semantic, not merely a visual folder.

Example:

```
Selection
├ Rectangle
├ Ellipse
├ Freehand
├ Polygon
├ Similar Color
└ Region
```

Behavior:

1. tap/click inactive Family → activate its last-used Mode;
2. tap/click the already-active Family → open its Mode chooser;
3. explicit chooser access also exists from All Features;
4. secondary click or pen-hold may be an accelerator, never the only route;
5. choosing a Mode updates the Family's remembered last-used Mode;
6. user may pin a Mode separately without removing it from its Family.

This follows the useful part of Procreate's selected-tool re-tap behavior while preserving a fully discoverable route for touch and keyboard.

## 6. Custom Stack behavior

A **Custom Stack** is organizational and may contain heterogeneous Pin-capable entries.

Example:

```
Coloring
├ Smart Fill
├ Region Selection
├ Layers
├ Color
└ Canvas Flip
```

Rules:

- one nesting level only;
- Stack inside Stack is prohibited;
- tapping a Stack always opens its anchored palette;
- a Stack does not execute the last-used child automatically;
- child order is user-defined and stable;
- items may appear both directly on the Rail and inside a Stack if the user wants;
- Stack creation/editing occurs in explicit customization mode.

Reason:

A heterogeneous Stack may mix Tool, Command and Workspace actions. Auto-executing its last-used child would make one icon's behavior unpredictable.

## 7. Overflow behavior

### 7.1 Why Rail scrolling is not the default

A vertically scrolling Rail makes the screen position of Pins unstable and creates accidental scroll/select conflicts around pen use.

Therefore the default Rail itself does **not** scroll.

### 7.2 Logical Pin order

Pinned items form one ordered sequence:

```
P1, P2, P3, ... Pn
```

The viewport determines how many fit before the fixed bottom zone.

If only `k` fit:

```
Rail:     P1 ... Pk
Overflow: P(k+1) ... Pn
```

No reorder has occurred.

### 7.3 Pinning while full

When a new item is pinned with no visible slot remaining:

- it is appended at its chosen logical position;
- if that position falls outside visible capacity, it appears in Overflow;
- the UI gives explicit feedback that the Pin was added;
- it does not silently evict another Pin.

The user can then enter customization mode and move it.

## 8. Customization mode

Rail reordering is performed in an explicit mode to reduce accidental workspace modification while drawing.

Entry routes:

- All Features → Customize Left UI — primary route
- optional context-click / pen-hold accelerator
- keyboard-accessible command

In customization mode:

- Pin targets become clearly draggable/reorderable;
- add/remove controls become visible;
- Stack creation becomes available;
- Category shortcuts can be added;
- Reset to default is available;
- Apply/Done and Cancel semantics are explicit if edits are staged;
- no Rail-edit operation enters Artwork History.

Normal drawing mode does not treat arbitrary Rail drag as reorder.

## 9. Panel / PiP Pin semantics

A Workspace/PiP Pin such as Layers, Color or Brush Settings has **open/focus** semantics, not implicit toggle semantics.

Activation:

1. block closed → open in its remembered/default magnetic location;
2. docked and open → focus it;
3. detached and open → bring/focus that instance;
4. do not create duplicate instances unless that Workspace type explicitly supports multiple instances.

A second Rail activation does **not** close the panel by default.

Closing/collapsing remains an explicit action on the Workspace/PiP itself.

This avoids a single icon having ambiguous “open vs close vs focus” behavior.

## 10. Command and Toggle Pins

### Command Pin

Examples:

- Undo
- Redo
- Canvas Flip
- Merge Visible

Rules:

- execute immediately when safe;
- show visible feedback for success/failure where needed;
- preview-bearing commands open their preview/context instead of silently committing;
- destructive commands retain their normal confirmation/recoverability contract.

### Toggle Pin

Examples:

- Guide visibility
- Alpha Lock
- Focus Mode

Rules:

- current state is represented by more than hue alone;
- activation changes the same semantic state as every other UI surface;
- unavailable/disabled states remain explainable.

## 11. All Features palette

All Features opens one anchored overlay adjacent to the Rail.

It does not use a cascade of nested floating menus.

### Home

```
Search all features
────────────────────
CREATE
  Drawing
  Fill / Color / Region
  Selection / Transform
  Vector / Text / Shape
  Guides / Rulers

STRUCTURE / EDIT
  Layers / Compositing
  Adjust / Filter / Retouch
  Reference / Assets
  History / Automation

CANVAS / APP
  Canvas / View
  Document / Edit / Output
  Workspace / Settings
```

### Category view

Category selection replaces the palette body rather than spawning another floating menu.

Header retains:

- category name
- Back to All Features
- Search

Groups expand inline inside the category.

Navigation depth stays shallow:

```
All Features → Category → item
                         ↳ inline Family Mode
```

Do not create a deep sequence of separate submenus.

## 12. Selection behavior from All Features

When an item is selected:

### Tool / Mode

- activate Tool/Mode;
- update relevant Context Surface;
- close All Features palette;
- do not automatically force-open a deep settings PiP.

### Workspace / Setting

- open/focus corresponding right PiP;
- close All Features palette;
- keep Canvas state unchanged.

### Immediate Command

- execute command;
- close palette unless the command itself opens a preview/confirmation flow.

### Category Pin / customization action

- remain in navigation/customization as appropriate.

## 13. Search integration

Search is part of All Features, not a separate inventory.

It uses the same semantic index as global Command/Tool Search.

Searchable objects:

- Tool Families
- individual Modes
- Commands
- Categories
- Workspace/PiP blocks
- Settings
- Brush/Shape presets
- Macros
- Assets

Selecting a result uses the same destination rules as browsing.

No duplicate “search-only command semantics” are created.

## 14. PC projection

PC behavior:

- narrow persistent vertical Rail;
- pointer/pen optimized density;
- hover tooltip may supplement icon recognition;
- category/family/overflow palettes anchor to the Rail;
- keyboard focus can traverse Pins and fixed entries;
- context click is an accelerator, never required.

Exact dimensions are deferred to visual prototyping and platform/input overlays.

## 15. Tablet projection

Tablet preserves the same information architecture and Pin order.

Differences:

- touch/pen target sizes expand according to input capability;
- no hover dependency;
- anchored palettes may become wider card/drawer projections;
- long-press may accelerate chooser/customization but is never the sole path;
- Canvas remains visible as much as practical;
- left/right UI mirroring remains supported for handedness.

Do not infer tablet solely from viewport width.

## 16. Workspace persistence

Workspace-persistent:

- Pin IDs
- Pin order
- Custom Stack definitions/order
- category Pins
- dynamic preset Pins
- Left UI side/mirroring as defined by workspace preference

Not document-persistent:

- Rail layout
- All Features open/closed state
- Overflow open/closed state

All Features entry itself is invariant and is not stored as a user Pin.

## 17. Default profile relationship

The default Rail will be selected later.

This specification intentionally does **not** decide:

- which tools ship visible by default;
- exact visible Pin count;
- exact icon artwork;
- exact spacing/size.

However, any default must satisfy:

- All Features is always visible;
- high-frequency creation tasks do not require opening All Features repeatedly;
- advanced capability remains discoverable;
- no default auto-reorders based on usage.

## 18. UIimprove review

Applied UI quality checks:

### Task reachability

PASS at design level:
- every user-facing catalog capability has a Left UI route through Pin, category or search;
- internal/automatic systems are explicitly excluded rather than pretending to be actions.

### Discoverability

PASS at design level:
- All Features cannot disappear;
- mode chooser has an explicit route;
- hover/right-click/long-press are accelerators only.

### Predictability / spatial memory

PASS at design level:
- no usage-frequency reorder;
- overflow preserves order;
- heterogeneous Stack does not auto-run last action.

### Recoverability

PASS at design level:
- preview/destructive commands keep their existing commit/recovery contract;
- Rail customization is not Artwork History.

### Accessibility / input

DESIGN-CONSTRAINED, runtime unverified:
- icon entries require accessible names;
- selection/toggle state cannot rely on color only;
- keyboard/touch/pen paths are specified;
- concrete target sizing and focus behavior require platform/runtime validation.

### Runtime / visual quality

UNVERIFIED:
- no rendered prototype or runtime implementation has been tested from this specification yet.

## 19. External evidence

Official references used as interaction evidence:

- Photoshop Customize Toolbar:
  https://helpx.adobe.com/photoshop/desktop/get-started/set-up-toolbars-panels/customize-the-toolbar.html
- CLIP STUDIO PAINT Tool palette:
  https://help.clip-studio.com/en-us/manual_en/150_tools/The_Tool_palette.htm
- CLIP STUDIO PAINT customization:
  https://help.clip-studio.com/en-us/manual_en/150_tools/Customizing_the_Tool_and_Sub_Tool_palettes.htm
- Procreate Paint / Smudge / Erase:
  https://help.procreate.com/procreate/handbook/brushes/paint-smudge-erase
- Procreate Selection interface:
  https://help.procreate.com/procreate/handbook/selections/selections-interface
- Krita Tools:
  https://docs.krita.org/en/reference_manual/tools.html
- ibisPaint Tool Select:
  https://ibispaint.com/lecture/index.jsp?no=4

These are evidence, not visual templates to copy.
