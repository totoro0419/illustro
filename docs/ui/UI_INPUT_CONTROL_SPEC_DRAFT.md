# Illustro Input Control UI — Candidate Draft

> Date: 2026-09-30
> Status: **CANDIDATE / USER VISUAL & INTERACTION REVIEW PENDING**
> Scope: PC baseline input-control grammar, UI Gate E design work
> Production implementation: **LOCKED**
> Theme baseline: **Aurora visual direction approved by user immediately before this phase**

## 1. Goal

Define a small, reusable set of input controls that can express Illustro's large parameter surface without making every Box invent its own interaction pattern.

Priority:

1. immediate comprehension;
2. fast repeated adjustment while drawing;
3. exact value entry when needed;
4. pointer / pen / touch / keyboard alternatives;
5. consistent behavior across Brush / Color / Effects / Transform / Workspace settings.

The design must not make drag, wheel, hover, long-press, or color-only state the only required path.

## 2. Existing product requirements used

The current Illustro specification requires:

- Brush Size / Opacity to have fast access;
- Pressure / Tilt / Azimuth and other modulation sources;
- Size / Opacity / Flow / Spacing / Rotation / Scatter / HSV etc. as modulatable properties;
- a shared Mapping UI using Curve / Range / Invert;
- Color Picker / Eyedropper / History / Palette;
- practical RGB and HSV/HSL family controls;
- Context UI that shows Brush Size / Opacity close to the Canvas while Brush is active;
- non-color-only state indication.

## 3. Core input grammar

### 3.1 Continuous scalar: Slider + exact numeric field

Use for:

- Brush Size
- Opacity
- Flow
- Stabilization
- Hardness
- Effect strength
- Threshold / tolerance
- numeric Transform properties where direct manipulation is not sufficient

An Illustro scalar control consists of:

1. stable text label;
2. slider track;
3. visible thumb;
4. exact numeric input;
5. visible unit when applicable.

Rules:

- Slider is the fast path, not the only path.
- Numeric input supports exact values and keyboard entry.
- Slider and numeric field remain bidirectionally synchronized.
- Drag produces continuous preview.
- Pointer-up / Enter forms the semantic commit boundary for systems that need one.
- Invalid typed values are constrained or rejected with visible feedback; they must not silently become unrelated values.
- A disabled scalar remains visible when discoverability matters and provides an availability reason.

### 3.2 Large-range continuous scalar

Brush Size may span a much larger useful range than Opacity.

Candidate behavior:

- use a nonlinear slider mapping so low values have substantially finer physical control;
- always pair it with an exact numeric field;
- keep the stored/document value independent from the slider-position mapping.

The lab currently uses a demonstration range and power curve only to evaluate interaction. **The current 0.5–500 px review range and curve are not product limits/tokens.** Final mapping requires brush-device testing.

### 3.3 Small exclusive choice: Segmented control

Use when there are a small number of mutually exclusive choices that benefit from being visible together.

Examples:

- simple mode variants;
- small interpolation-mode subsets;
- local view modes.

Selected state must use geometry/background/border/indicator in addition to hue.

Do not use Segmented controls for long enumerations.

### 3.4 Long enumeration: Select / anchored popover

Use for long lists such as:

- Blend modes;
- color-space choices;
- interpolation algorithms;
- modulation input source;
- modulation target property.

Do not compress long enumerations into tiny segmented buttons.

### 3.5 Boolean state: Switch

Use only for a persistent or immediately applied boolean state.

Examples:

- Alpha Lock / Lock Transparency;
- Invert mapping;
- feature enable/disable.

Do not represent an ordinary one-shot command as a switch.

### 3.6 Angle: Dial visualization + exact value path

Use for:

- Brush tip rotation;
- texture rotation;
- transform angle;
- directional effects.

The dial gives spatial meaning, but an exact numeric field and/or linear slider remain available so rotary dragging is never mandatory.

### 3.7 Two-dimensional continuous value

Use a 2D plane when the parameter is genuinely two-dimensional, e.g. Saturation/Value.

Rules:

- provide exact alternative fields where precision matters;
- do not invent a 2D pad just because two sliders visually fit in a square;
- pointer/touch movement previews continuously.

## 4. Brush input candidate

The 344 px Brush panel prototype contains:

- live footprint preview;
- Size — nonlinear slider candidate + px field;
- Opacity — linear 0–100% style control;
- Flow — linear 0–100% style control;
- Stabilize — scalar control;
- Hardness — scalar control.

The same scalar grammar should be reused in the near-Canvas Brush Context Surface for Size / Opacity, with the full Brush Box remaining the detailed destination.

## 5. Color input candidate

### 5.1 Default visual selector

Candidate default combines:

- outer Hue ring;
- inner Saturation/Value square;
- Current / Previous swatches.

The visual selector is a fast spatial path, not the only color-entry path.

### 5.2 Exact models

The same current color can be edited through:

- HSV numeric controls;
- RGB numeric controls;
- HEX input.

All are views onto the same underlying color state. Switching the UI model must never create a second unsynchronized color value.

HSL remains required by product specification and should be added in a later color-system pass after the panel-density decision; the first lab keeps the visible comparison to HSV / RGB / HEX so the base interaction can be judged without overloading the 344 px panel.

### 5.3 History and Palette

History and Palette recall the same foreground-color semantic state.

They are not separate color-selection systems.

History is optimized for recent reuse. Palette is persistent organization.

### 5.4 Color-management boundary

The visual picker does not define the document's canonical storage representation.

UI values, display transform, document working space, ICC profile, wide gamut and high bit depth remain separate Color Pipeline concerns.

## 6. Dynamics Mapping candidate

Shared Mapping UI for Brush parameters:

1. Input source selector — Pressure / Tilt / Azimuth / Speed / Distance / Random etc.;
2. Affects selector — Size / Opacity / Flow / Spacing / Rotation / Scatter / HSV etc.;
3. response curve editor;
4. output min/max range;
5. Invert switch.

This matches the existing requirement that Curve / Range / Invert use a common interaction model instead of each Brush property inventing a custom dynamics editor.

The curve point is draggable but also keyboard-adjustable in the lab. Production curve editing will need multi-point creation/deletion, reset, presets, and touch/pen validation before it can be canonical.

## 7. Interaction transaction model

Recommended general rule:

- pointer-down / key adjustment begins edit;
- live interaction updates preview continuously;
- pointer-up / Enter / focus commit ends the edit transaction where a transaction boundary is relevant;
- Escape restores the pre-edit value where cancel semantics are appropriate;
- dragging a slider must not create hundreds of independent history entries.

Brush-setting changes and UI preferences should use their own setting/preset history semantics rather than being confused with Artwork History.

## 8. External interaction evidence

Used as interaction evidence only; Illustro does not copy their visual styling.

### Procreate

Official Color documentation separates Disc, Classic, Value and Palettes. The Disc uses a hue ring; Classic provides a square selector with H/S/B sliders; Value provides precise H/S/B, RGB and hexadecimal entry; color history and palettes provide reuse paths.

References:

- https://help.procreate.com/procreate/handbook/colors
- https://help.procreate.com/procreate/handbook/colors/colors-interface
- https://help.procreate.com/procreate/handbook/colors/colors-value

### Krita

Official documentation shows that its Advanced Color Selector is configurable and that its Specific Color Selector can expose model-specific sliders and HSV-family controls alongside exact color-space values.

References:

- https://docs.krita.org/en/reference_manual/dockers/advanced_color_selector.html
- https://docs.krita.org/en/reference_manual/dockers/specific_color_selector.html

Illustro's candidate differs by trying to keep a single compact 344 px Color destination with synchronized spatial and exact entry paths.

## 9. Prototype verification

The standalone lab was rendered with Chromium at 1440×900.

Verified:

- viewport stays exactly 1440×900 with no page overflow;
- all four review cards are 344 px wide;
- Brush Size exact entry updates slider/preview;
- Opacity slider updates exact numeric value;
- HSV exact input updates current color;
- RGB exact input updates the same current color;
- HEX input updates the same current color;
- switching HSV → RGB → HEX → HSV preserves synchronized values;
- Dynamics curve point is keyboard-adjustable;
- Angle exact value updates both slider and dial visualization;
- output Range min/max inputs fit the 344 px panel;
- 1024×768 adaptive smoke check has no forced horizontal viewport overflow;
- zero JavaScript runtime exceptions during the checks.

This is **not** a full accessibility/runtime PASS. Touch/stylus behavior, text scaling, localization stress, assistive-technology semantics, production history integration, and application performance remain UNVERIFIED.

## 10. User review questions

Please judge in plain terms:

- Is Brush Size fast enough to change repeatedly?
- Is exact numeric entry easy to find without making the UI feel busy?
- Is the Color wheel + SV square easy to understand?
- Should HSV/RGB/HEX stay in one panel like this, or does it feel too dense?
- Is the Pressure curve understandable at a glance?
- Are any controls too small or visually weak?
- Does the UI still feel like the approved Aurora direction without the controls becoming decorative?

No input-control pattern is canonical until user review.

## Supersession note

The semantic input-method selection phase has now been completed in [UI_INPUT_CONTROL_STANDARD.md](UI_INPUT_CONTROL_STANDARD.md).

This document remains as the historical first interactive-lab draft. Where this draft and the new standard differ, **UI_INPUT_CONTROL_STANDARD.md is authoritative for input-method semantics**. Exact engine-dependent ranges, increments, nonlinear mappings, device metrics and production runtime validation remain pending.
