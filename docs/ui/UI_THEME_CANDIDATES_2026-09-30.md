# Illustro UI Theme Candidates — Gradient Grammar Recovery Pass

> Date: 2026-09-30
> Status: **CANDIDATE / USER VISUAL REVIEW PENDING**
> Scope: UI Gate E / Expanded PC theme comparison at 1440×900
> Production implementation: **LOCKED**
> Canonical theme: **NOT DECIDED**

## 1. Purpose of this pass

This pass corrects the previous theme comparison where the instruction “use fewer cross-hue gradients” was interpreted too strongly and the Aurora visual identity became overly flat.

The theme model for this pass is:

> Keep ordinary panels, Box bodies, Canvas surround, ordinary buttons, ordinary borders and ordinary text mostly solid. Use theme gradients deliberately on semantic highlights where light/flow communicates the current or active state.

The intended result for Aurora is “a bright white UI where aurora light appears at the place the user is interacting with.”

The specifically named older artifacts (`illustro_pc_color_theme_compare.html`, `illustro_theme_compare_sheet.png`, `illustro_theme_aurora.html`, old Aurora PC screenshot) were searched in the currently available Project/Library file surfaces but were not retrievable by those names in this session. Therefore this document does **not** claim that those exact bytes were inspected. The recovery uses the user-supplied prior Aurora palette/placement rules as the visual reference and preserves the approved current PC geometry.

## 2. Shared Visual Grammar

Theme-dependent gradient/light expression is allowed on:

- Illustro brand mark;
- selected Tool indicator;
- top edge of the three expanded primary Boxes (Layers / Color / Brush);
- active portions of sliders;
- selected Layer inset marker;
- Brush preview rim;
- current Layer Page indicator;
- Quick Controller ring;
- focus/special-state glow where it does not reduce contrast.

Normally solid:

- Panel / Surface bodies;
- Box bodies;
- Canvas surround;
- ordinary buttons;
- ordinary borders;
- text;
- normal Layer rows;
- disabled state.

Selection remains identifiable by geometry/border/background in addition to hue.

## 3. Theme order

1. Aurora
2. Halo
3. Bloom
4. Cosmo
5. Simple
6. Mono

Mono remains last by product decision.

## 4. Candidate semantic tokens

| Theme | Base shell | Accent flow | Character |
|---|---|---|---|
| **Aurora** | `#F7F9FC` / surround `#E9EEF5` / panel `#FFFFFF` | `#5EA8FF → #8B7CFF → #EF7CC8 → #FFB365 → #62D5BD` | Full Illustro signature flow. Multi-hue gradient is clearly visible on semantic highlights, not panel bodies. |
| **Halo** | `#F8FCFE` / surround `#EBF5F9` / panel `#FFFFFF` | `#63D9FF → #7EC4FF → #92A7FF → #C4B8FF` | Cyan/sky/pale-violet luminous halo; narrower hue range and more airy glow than Aurora. |
| **Bloom** | `#FFF9FC` / surround `#F6EEF4` / panel `#FFFFFF` | `#F29BCB → #D993E8 → #B19CFF → #FFAE9D → #FFBE8A` | Warm creative flow using pink/lavender/apricot; avoids toy-like full-surface color. |
| **Cosmo** | `#F5F7FC` / surround `#E7EBF5` / panel `#FCFDFF` | `#4D7CFF → #5A69F2 → #655DE8 → #8C72E8` | Sharper blue/indigo/violet depth while remaining a light Illustro theme. |
| **Simple** | `#F7F9FC` / surround `#EEF3F8` / panel `#FFFFFF` | mostly solid `#6FA8FF`; only brand has a very small two-step blue shift | Long-session practical theme. Gradient use is intentionally minimal. |
| **Mono** | `#F7F8F9` / surround `#ECEFF2` / panel `#FFFFFF` | `#252C33 → #626C76 → #B8BFC6` | Chromatic accents removed; state uses luminance, borders, geometry and grayscale flow. |

## 5. Expanded PC geometry preserved

The comparison uses the previously approved Expanded composition without theme-specific layout changes:

- viewport: **1440×900**;
- Left Rail: Brush / Eraser / Smudge Blend / Eyedropper / Smart Fill / Selection / Transform / Move / fixed All Features;
- Right Workspace width: **344 px**;
- Right Box order: Layers / Color / Brush / Inspector / Reference / Assets / Effects / Navigator / History / Automation / Document / Workspace;
- default expanded Boxes: **Layers / Color / Brush**;
- fixed bottom strip: Layer Page / Undo / Redo / Horizontal Flip / Vertical Flip;
- Brush Context Surface and Quick Controller position/size unchanged;
- Quick Controller geometry remains 112×112 footprint, 100 px outer ring, 44 px center hole, 28 px buttons, six centers at radius 36 px on the flat-top regular-hexagon arrangement.

## 6. Runtime / regression verification performed

The revised comparison HTML was rendered through Chromium at **1440×900** for all six themes.

Verified in this artifact:

- no viewport overflow at 1440×900 for all six themes;
- exact 12-Box order preserved;
- only Layers / Color / Brush expanded by default;
- exact Left default Tool order preserved;
- five fixed bottom commands preserved;
- Right Workspace remains 344 px;
- bounding geometry of shell / Left Rail / Canvas workspace / Right Workspace / Context Surface / Quick Controller / bottom strip / all 12 Boxes is unchanged from the immediately preceding comparison HTML;
- Quick Controller button/ring containment invariant preserved;
- zero JavaScript runtime exceptions during verification;
- Aurora gradient is actually present in computed styles for brand mark, selected Tool indicator, expanded Box edge, Context slider, Right sliders, Brush preview rim, Quick Controller ring, and Layer Page indicator.

Text hierarchy check in the candidate tokens:

- primary text vs panel surface is well above 4.5:1 in all six candidates;
- muted text vs panel surface is at least 4.5:1 in all six candidates;
- focus outline colors have at least 3:1 contrast against the normal panel surface in all six candidates;
- lower-contrast `faint` tokens are kept for nonessential decoration; readable Box summaries/range labels/More controls use the higher-contrast muted token in this comparison.

This is still **not** a full accessibility or production runtime PASS. Keyboard semantics, text scaling, assistive-technology behavior, production theme switching and application runtime remain outside this design-only artifact.

## 7. Superdesign / authoring method

The Superdesign CLI preflight timed out in the available shell. Per the Superdesign skill's `design-with-your-model.md` fallback, the comparison was directly authored as literal standalone HTML while preserving the existing Gate E structure, then rendered and verified in Chromium.

## 8. User review pending

Review these visually before any canonical decision:

- Is the gradient visibly present again, especially in Aurora?
- Does Aurora recover the intended “light flows where you interact” identity?
- Do the six themes feel clearly different while remaining the same Illustro UI?
- Does the UI remain bright and light?
- Does the themed chrome stay subordinate to the artwork?
- Does any theme feel tiring for long work?
- Are Simple and Mono clearly more restrained than Aurora / Halo / Bloom / Cosmo?

No theme is final/canonical until the user explicitly approves it.
