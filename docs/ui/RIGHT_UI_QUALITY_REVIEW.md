> Classification: EXPERIMENTAL / supporting historical UI detail. Current authority: `docs/IMPLEMENTATION_BASELINE.md` and `docs/CANONICAL_INDEX.json`. Old stop/PASS/candidate declarations below apply to their recorded version only.

# Illustro Right UI — Quality Review

> Status: **DESIGN REVIEW COMPLETE / RUNTIME UNVERIFIED**
> Date: 2026-09-29
> Canonical: [Right UI — Canonical Specification](RIGHT_UI_SPEC.md)
> Feature ownership: [Right UI Feature Coverage](RIGHT_UI_FEATURE_COVERAGE.md)

## 1. Method

This review applies the project's **UI Implementation Quality plugin** guidance.

Applied priorities:

1. task correctness;
2. task reachability;
3. accessibility;
4. state clarity;
5. recoverability;
6. predictability;
7. adaptive input/layout;
8. performance;
9. visual coherence;
10. aesthetic polish.

The design intentionally does not claim runtime PASS from documentation alone.

## 2. Official external evidence reviewed

### Apple Human Interface Guidelines

- Panels / Inspector:
  https://developer.apple.com/design/human-interface-guidelines/panels
- Layout / progressive disclosure:
  https://developer.apple.com/design/human-interface-guidelines/layout
- Split views:
  https://developer.apple.com/design/human-interface-guidelines/split-views
- Buttons / hit regions:
  https://developer.apple.com/design/human-interface-guidelines/buttons
- Designing for iPadOS:
  https://developer.apple.com/design/human-interface-guidelines/designing-for-ipados
- Motion:
  https://developer.apple.com/design/human-interface-guidelines/motion

Applied:
- Canvas remains primary.
- Inspector follows selected context.
- progressive disclosure uses collapse without removing capability.
- mixed touch/pen/pointer/keyboard input is expected.
- touch/pen profile uses 44-class effective targets.
- motion is brief, cancelable and nonessential.

### Microsoft Fluent 2

- Accordion:
  https://fluent2.microsoft.design/components/web/react/core/accordion/usage
- Drawer:
  https://fluent2.microsoft.design/components/web/react/core/drawer/usage
- Layout:
  https://fluent2.microsoft.design/layout

Applied:
- collapsed content is used for density management, but required current-task information remains visible.
- inline vs overlay Right UI is chosen based on Canvas preservation.
- spacing/proximity establishes semantic grouping.

### IBM Carbon Design System

- Accordion usage:
  https://carbondesignsystem.com/components/accordion/usage/
- Accordion accessibility:
  https://carbondesignsystem.com/components/accordion/accessibility/

Applied:
- collapse state is explicit.
- headers are concise.
- multiple expanded sections are allowed.
- keyboard semantics must match visible disclosure state.

### Adobe Photoshop

- Dock / undock:
  https://helpx.adobe.com/photoshop/desktop/get-started/learn-the-basics/dock-undock-panels.html
- Move panels:
  https://helpx.adobe.com/photoshop/desktop/get-started/learn-the-basics/move-panels.html
- Collapse / expand:
  https://helpx.adobe.com/photoshop/desktop/get-started/learn-the-basics/collapse-expand-icons.html

Applied:
- visible drop-zone preview.
- floating/docking model.
- Esc cancel.
- Layout Lock for stylus safety.
- collapse as density control.

### JetBrains IDE

- Arrange tool windows:
  https://www.jetbrains.com/help/idea/manipulating-the-tool-windows.html
- Layouts:
  https://www.jetbrains.com/help/idea/tool-window-layouts.html

Applied:
- non-drag Move/Resize alternatives.
- remembered layout.
- recoverable default layout.
- persistent tool-window sizes/positions.

### W3C WCAG 2.2

- Dragging Movements:
  https://www.w3.org/WAI/WCAG22/Understanding/dragging-movements
- Target Size (Minimum):
  https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum
- Focus Appearance:
  https://www.w3.org/WAI/WCAG22/Understanding/focus-appearance
- Focus Not Obscured:
  https://www.w3.org/WAI/WCAG22/Understanding/focus-not-obscured-minimum

Applied:
- no drag-only function.
- pointer targets meet/exceed scoped minimums.
- focus is visible and not hidden by fixed chrome.
- keyboard focus order stays meaningful.

### ibisPaint

- Layer Window Details:
  https://ibispaint.com/lecture/index.jsp?no=156

Applied:
- expanded Layer Page centered on the layer tree.
- direct visibility/reorder/group operations.
- Blend/Opacity/Clipping/Alpha Lock near layer management.
- floating PC/tablet Layer Page.
- same Layer model as compact Layers Box.

## 3. UI Implementation Quality review

### Primary task flow — DESIGN PASS

Painting remains possible without manipulating Right UI.

High-frequency creation state is available in:
- Layers;
- Color;
- Brush;
- Context Surface / Quick Controller where specified.

Deep operations remain one explicit route away.

### Task reachability — DESIGN PASS

Existing Left coverage items routed to Right/Settings: 78.

Audit result:
- owned: 78
- unowned: 0

Global Settings are deliberately separated from Right Boxes instead of becoming a miscellaneous Workspace panel.

### State clarity — DESIGN PASS

Required visual/programmatic states are specified:
- expanded/collapsed;
- focused;
- selected;
- disabled;
- warning/error;
- loading;
- detached;
- layout locked;
- Inspector locked;
- recording;
- Layer Page active;
- Undo/Redo availability;
- view-flip states.

No important state is color-only.

### Recoverability — DESIGN PASS

Specified:
- Esc cancels drag.
- invalid drops restore origin.
- Reset Location.
- Reset Size.
- Reset Workspace Layout.
- detached placeholders preserve discoverability.
- viewport changes clamp detached surfaces back into visible area.

### Predictability — DESIGN PASS

- Box identity never changes with location.
- one Box opening does not auto-close another.
- no usage-frequency reordering.
- magnetic behavior previews before commit.
- repeated Left/Search invocation uses reveal/focus semantics.
- Layer Page and Layers Box share one model.

### Progressive disclosure — DESIGN PASS

All 12 Boxes remain represented.

Collapse reduces information density without removing feature ownership.

Default expanded:
- Layers
- Color
- Brush

All others retain informative summaries.

### Input adaptation — DESIGN PASS

Separate pointer and touch/pen density profiles are defined.

Input mode is not inferred only from viewport width.

Drag has click/tap alternatives.

Hover/right-click/long-press are not required routes.

### Accessibility — DESIGN-CONSTRAINED

Design contracts exist for:
- accessible names;
- expanded state;
- focus visibility;
- non-color state;
- adequate target areas;
- non-drag alternatives;
- no obscured focus;
- reduced motion.

Actual DOM/native semantics and assistive-technology behavior remain runtime-unverified.

### Responsive/adaptive behavior — DESIGN PASS

Inline/overlay rule is explicit and Canvas-preserving.

Right width and Layer Page width clamp.

Viewport/display changes preserve order/state and restore off-screen detached surfaces.

### Localization/text scaling — DESIGN PASS

- short stable Box titles;
- summary truncation preserves accessible full value;
- Japanese/English supported;
- controls reflow before clipping;
- ordinary forms avoid horizontal scroll.

Runtime stress testing remains pending.

### Loading/empty/error/disabled — DESIGN PASS

All classes have defined behavior.

One Box failure does not blank the full workspace.

Empty collection Boxes provide a next action.

Disabled controls remain explainable.

### Performance — DESIGN-CONSTRAINED

Contracts prohibit:
- document-wide scans from UI open/collapse;
- all-asset preload;
- synchronous all-thumbnail generation;
- heavyweight rerender during drag.

Virtualization/lazy rendering is required for large collections.

Measured frame behavior remains runtime-unverified.

### Visual coherence — DESIGN PASS AT STRUCTURAL LEVEL

Fixed:
- compact Box grammar;
- stable title/summary placement;
- collapse-first density;
- fixed bottom command strip;
- Canvas priority;
- shared geometry tokens.

Deferred by product decision:
- color/theme;
- final icon artwork;
- final font family;
- pixel polish.

## 4. Numeric-token authority

Project values in RIGHT_UI_SPEC.md are **Illustro design tokens**, not claimed universal standards.

External standards/guidelines informed them only within scope:

- WCAG 2.2 web minimum target: 24 CSS px, subject to criterion exceptions.
- Apple general hit-region guidance: 44×44pt.
- Carbon accordion example header: 40px.

Illustro therefore uses:
- pointer Box header visible height 40px;
- touch/pen Box header visible height 40px by default;
- pointer ordinary effective targets 32px+;
- touch/pen primary effective targets 44px+ through hit areas/spacing rather than wholesale visual enlargement.

The tablet projection intentionally preserves the desktop visual grammar unless a concrete touch constraint requires a visible change.

These values still require runtime usability validation.

## 5. Remaining verification gates

The following are **UNVERIFIED**, not PASS:

- rendered visual balance;
- actual pointer/pen/touch hit testing;
- keyboard/assistive technology behavior;
- text scaling/localization stress;
- intermediate resize behavior;
- drag threshold/magnetic activation tuning;
- large layer/asset/history performance;
- focus behavior with detached Boxes and Layer Page;
- reduced-motion runtime behavior;
- regression against Left UI / Context Surface / Quick Controller.

## 6. Review result

**Right UI design review: PASS at design/specification level.**

**Runtime/visual verification: UNVERIFIED.**

Do not promote the overall Gate E to PASS until the required visual prototype and runtime validation gates are executed.
