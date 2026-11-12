> Classification: EXPERIMENTAL / supporting historical UI detail. Current authority: `docs/IMPLEMENTATION_BASELINE.md` and `docs/CANONICAL_INDEX.json`. Old stop/PASS/candidate declarations below apply to their recorded version only.


# Right Workspace — General UI Research and Applied Principles

> Status: **SUPPORTING RESEARCH / APPLIED TO CANONICAL RIGHT_UI_SPEC**
> Date: 2026-09-29
> Scope: General-purpose professional UI research applied to Illustro
> Canonical authority: [Right UI — Canonical Specification](RIGHT_UI_SPEC.md)
> Related: RIGHT_WORKSPACE_BOX_TAXONOMY.md

## 1. Why research outside paint applications

The right side is not only a painting-app problem. It is also an inspector, a dockable workspace, a property editor, an auxiliary side pane, and a persistent professional-tool layout.

Therefore the design should use evidence from broader productivity and creative software patterns.

## 2. Evidence and applied conclusions

### Apple — Panel / Inspector

Apple's HIG describes a panel as supplementary controls or information related to the active window or current selection, and specifically describes inspector behavior that updates with the selected item.

Applied to Illustro:

- Properties / Inspector follows the current Tool, selection, or entity by default.
- It may be locked to its current target when the user needs stable comparison/editing.
- Inspector content shows a clear context target/path.
- Context changes do not silently open a closed Inspector.

Source:
- https://developer.apple.com/design/human-interface-guidelines/panels

### VS Code — movable auxiliary views

VS Code separates the main editor from auxiliary sidebars/panels, lets users move views, persists layout, and provides reset-to-default actions.

Applied to Illustro:

- Canvas remains the primary content region.
- Right Boxes are auxiliary and movable without changing feature semantics.
- Layout persists as Workspace state.
- Every moved Box has Reset Location.
- The entire workspace has Reset Workspace Layout.
- Box movement has a keyboard-accessible command path, not drag-only.
- Box header actions stay sparse; low-frequency actions live under More.
- For Illustro's current design, normal density reduction uses collapse rather than removing Boxes from the Right Workspace.

Sources:
- https://code.visualstudio.com/docs/editing/getting-started/userinterface
- https://code.visualstudio.com/docs/configure/custom-layout
- https://code.visualstudio.com/api/ux-guidelines/views

### Blender — task workspaces / Properties context / pinning

Blender divides professional work into task-specific Workspaces and purpose-specific Areas. Its Properties editor shows a context path, can search properties, and can pin the current context instead of following selection.

Applied to Illustro:

- Right Boxes have one recognizable work purpose.
- Workspace Presets may choose different default Box arrangements without changing semantic IDs.
- Inspector shows the current context owner.
- Inspector supports Follow Context by default and Lock Context when requested.
- Inspector has local property search/filter.
- Magnetic drag operations show a visible destination preview and can be cancelled before commit.

Sources:
- https://docs.blender.org/manual/en/latest/interface/window_system/workspaces.html
- https://docs.blender.org/manual/ja/5.1/editors/properties_editor.html
- https://docs.blender.org/manual/en/5.2/interface/window_system/areas.html

### Windows — adaptive supplemental pane

Windows SplitView supports supplemental panes that can be inline or overlay depending on available space. NavigationView similarly adapts presentation while preserving navigation meaning.

Applied to Illustro:

- PC may use an inline right dock.
- Tablet may project the same Boxes as a more overlay-oriented magnetic workspace when preserving Canvas width matters more.
- Semantic Box identity/order does not change merely because projection changes.
- Adaptation uses available space plus input capability, not a device-name test.

Sources:
- https://learn.microsoft.com/en-us/windows/apps/develop/ui/controls/split-view
- https://learn.microsoft.com/en-us/windows/apps/design/controls/navigationview

### W3C — focus, target size, predictable changes

WCAG requires logical focus order and discourages unexpected context changes on focus; WCAG 2.2 also defines pointer-target constraints.

Applied to Illustro:

- Keyboard focus order follows logical/visual Box order.
- Moving focus onto a Box/header does not activate another tool or change the document.
- Deep-linking from Left/Search reveals the target predictably; pointer invocation must not unexpectedly steal keyboard focus.
- Header controls and resize handles need adequate effective hit area/spacing.
- Drag is never the only way to move/reorder a Box.

Sources:
- https://www.w3.org/WAI/WCAG21/Understanding/focus-order
- https://www.w3.org/WAI/WCAG21/Understanding/on-focus
- https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum

## 3. Applied architectural principles

### G1 — Main content dominance

Canvas is always the main content surface. Right Boxes must not collectively become the visual center of the application.

### G2 — One Box, one work purpose

A Box may contain tabs/sections, but they must serve one coherent job. Do not create miscellaneous Boxes.

### G3 — Stable identity, flexible location

Moving, detaching, or collapsing a Box changes presentation only. It never changes command identity, document semantics, shortcut meaning, or Left/Search destination identity.

### G4 — Inspector absorbs context-specific detail

Do not create separate permanent Boxes for Fill Settings, Transform Settings, Text Settings, Guide Settings, and similar contextual property groups.

Use one context-following Properties / Inspector.

### G5 — Inspector can be locked

Default:
- Follow Context.

Optional:
- Lock Context.

Lock prevents the Inspector from changing when Canvas selection/tool changes. This is Workspace state, not artwork state.

### G6 — Semantic Box vs parameter editor

For complex systems:

- the owning Box manages list, stack, library, or structural state;
- Inspector edits the selected item's detailed parameters.

Examples:

- Layers Box selects a layer -> Inspector can show selected layer/object properties.
- Effects Box selects an adjustment/filter -> Inspector shows that effect's parameters.
- Reference Box selects a reference -> Inspector shows its object properties.

Brush remains an exception because brush configuration is a deep, persistent creation workflow deserving its own dedicated Box.

### G7 — No arbitrary semantic merging

Magnetic docking allows physical grouping/reordering, but does not merge unrelated Boxes into one semantic Box.

Baseline:
- vertical stack;
- collapse;
- detach;
- re-dock;
- reorder.

Do not add arbitrary user-created tab groups until a concrete need is validated.

### G8 — Drag must preview and be reversible

Dragging a Box header:

- shows insertion/snap preview;
- does not commit until release;
- Escape cancels;
- invalid drop returns to origin;
- keyboard Move Box offers the same result without drag.

### G9 — Restore is mandatory

Every Box:
- Reset Location.

Workspace:
- Reset Workspace Layout.

A flexible UI without recovery is too fragile.

### G10 — Open/focus, not toggle-close

Invoking a Box from Left/Search:

- closed -> open;
- open -> focus/reveal;
- detached -> bring forward;
- off-screen -> restore to safe visible position.

Repeated invocation does not close the Box.

### G11 — Header actions stay sparse

Baseline header:

- title;
- context indicator when relevant;
- collapse/expand;
- detach/re-dock;
- More.

Lower-frequency operations such as Reset Location, Lock Context, and advanced Box options stay under More unless testing proves they need promotion.

### G12 — Global settings are not normal Inspector content

Application-global settings such as language, accessibility defaults, global input mapping, global shortcut editor, and extension management should not occupy an ordinary painting-workspace Box by default.

They use a dedicated Settings surface reachable from Left/Search/top-level app controls.

The Right Workspace may contain a lightweight Workspace Box for layout, preset, mirroring, and reset functions.

### G13 — Context changes must be predictable

Changing selected layer/tool/reference may update an open Inspector, but:

- the Inspector target/path changes explicitly;
- a locked Inspector does not follow;
- no closed Box auto-opens solely because context changed;
- no Box steals keyboard focus merely because Canvas selection changed.

### G14 — Density adapts, semantics do not

PC/tablet may use different target size, Box width, inline/overlay projection, and simultaneously expanded count.

They retain the same semantic Box registry and IDs.

### G15 — Collapsed/inactive Boxes should be cheap

Collapsed or detached-inactive Boxes should have near-zero recurring work. Expensive preview/list data uses lazy loading and virtualization.

## 4. Resulting changes to the Right Box taxonomy

### Keep independent

- Layers & Compositing
- Color
- Brush
- Properties / Inspector
- Effects & Adjustments
- Reference
- Assets
- History & Progress
- Automation
- Navigator & View
- Document

### Change

Workspace & Input becomes **Workspace**.

The ordinary Right Box contains only workspace-local functions:

- Box layout;
- Workspace Presets;
- save/load workspace;
- mirror side;
- reset layout;
- Left UI layout entry;
- Quick Controller layout/profile entry.

All semantic Right Boxes remain represented in the Right Workspace. Collapse/expand is the primary information-density control.

Application-global input, accessibility, language, shortcut, and extension settings move to a dedicated Settings surface.

### Inspector enhancement

Add:

- context target/path;
- Follow Context;
- Lock Context;
- local property search/filter.

### Effects enhancement

Effects & Adjustments owns effect/adjustment creation, stack/order, enable/disable, mask/blend/opacity summary.

Detailed parameters of the selected effect are shown primarily in Inspector, avoiding duplicate parameter editors.

### Layers enhancement

Layers owns the layer tree and structural/compositing commands.

General selected-layer/object properties may surface in Inspector instead of adding more controls to the Layers header.

## 5. Validation status

Research application: **DONE**

Right taxonomy after this research was incorporated into the canonical `RIGHT_UI_SPEC.md`; this document is supporting evidence only.

Not yet validated:

- actual visual density;
- magnetic snap thresholds;
- minimum/maximum widths;
- default expanded Box set/order;
- tablet overlay/inline switching threshold;
- measured keyboard/pen/touch behavior.
