# M07 original iconography and Aurora visual recovery
Date: 2026-10-10. Scope: **M07 visual-quality repair only**.

## Actual user feedback / reason for the repair
1. User rejected the Unicode/emoji-like symbol substitutions in M07 as unattractive; every primary icon must have a recognizable motif and coherent construction, not arbitrary character glyphs.
2. User could not find the QA checklist: it must be discoverable and expanded on the first visit.
3. User reports that Aurora was ignored: inspect the accepted Aurora **hue-narrowing** result rather than assuming flat orange/yellow = Aurora.

## Primary design-system research (official sources)
| Official | Method learned | Application to Illustro | Not copied |
|---|---|---|---|
| [Google Material Symbols](https://developers.google.com/fonts/docs/material_symbols) | Icon size should be optically tuned; weight/fill/optical size are deliberate parameters. Default 24px. | Shared 24×24 SVG viewBox; consistent 1.8 visual stroke; base size 23px tool / 22px action / 16px secondary, adjusted optically. | No Material icon-font dependency, remote network or verbatim copied path data. |
| [Apple SF Symbols](https://developer.apple.com/design/human-interface-guidelines/sf-symbols) / [custom symbols](https://developer.apple.com/documentation/technologyoverviews/custom-sf-symbols) | Convey function through recognizable object/action silhouettes; compatible outlined variants; custom SVG geometry. | Brush head, real eraser, pipette, stacking sheets, rotational undo and mirror with central axis. | No proprietary SF Symbol paths or OS-specific APIs. |
| [IBM Carbon icon guidance](https://www.carbondesignsystem.com/building-blocks/foundations/icons/guidelines) / [contributing](https://v10.carbondesignsystem.com/guidelines/icons/contribute/) | Consistent artboard, breathing room, grid alignment and legibility at supported sizes; interaction target differs from visual icon size. | 24×24 box with ≥2-unit breathing room; 40/44px button target separate from pictogram; icon color inherits current text while **background/outline** expresses state. | No copied Carbon SVG; exact IBM 32px grid is not imposed on Illustro's 24px family. |
| [Microsoft Fluent 2 iconography](https://fluent2.microsoft.design/iconography) | Clear, consistent forms, restrained details and predictable stroke language. | A shared rounded, lightly outlined grammar; avoid emoji, unrelated font weight and mismatched stroke ends. | No external icon library or Fluent product branding. |

## Motif construction process
1. Identify the **object or action** users already understand. Brush = tuft at tip; Eraser = diagonal body; Layer = stacked sheets; Horizontal/Vertical Flip = object mirrored across a visible axis, not generic arrows.
2. Reduce to one recognizable silhouette plus at most one secondary mark; no gratuitous decoration. Distinguish Eraser, Smudge, Fill, Move, Transform *by geometry*, not by arbitrary hue.
3. Construct each using the same 24-unit square, 1.8 visual stroke, rounded joins/caps, at least 2-unit outer padding. Use optical weight adjustment on intricate designs rather than adding detail.
4. Check at 16, 20, 23 and 24 rendered CSS px on low/high DPI, selected/normal/disabled/focus, and in light/dim environments. Ensure every button has an actual accessible name independent of visual art.
5. Keep a stable semantic ID -> one pictogram mapping. Do not load a font or fetch an icon CDN; our SVG drawings render offline with the Editor. Never fallback silently to unicode glyphs.

All original vector paths are in \`apps/editor/src/ui/icons.ts\`. Their appearance is intentionally independent of screen fonts and browser platform.

## Aurora is NOT the prior flat warm/yellow M07 shell
**Authoritative approval evidence**: \`docs/ui/UI_THEME_CANDIDATES_2026-09-30.md\`, particularly §10 “Aurora hue-range correction” and §11 “Aurora visual-direction approval”. It records explicit user acceptance of a blue -> periwinkle -> violet with a small violet-pink edge visual direction.

- Approved candidate flow: \`#5EA8FF → #708FFF → #8B7CFF → #C681DE\`.
- Approved shell base: \`#F7F9FC\`, surround \`#E9EEF5\`, white panel body.
- The user specifically rejected a *wide rainbow* Aurora. Warm orange and mint were removed from the main visible flow. Do not introduce a five-hue rainbow to “fix” a flat theme.
- Apply flowing color **locally** to interaction/brand/selected tool/primary Box top edge, active sliders, Layer Page active state—not to every panel/body/Canvas.
- Keep content more important than UI: one small asymmetric pair of low-opacity blue/violet ambient blooms behind the Canvas; neutral white Boxes and compact shadows.
- Selection needs outline/background change **as well as color**, and disabled states remain explicit.
- M39 owns final polish and animation, not M07. This repair corrects the foundation instead of pretending the final visual is approved.

Current M07 visual stylesheet: \`apps/editor/src/ui/aurora.css\` overrides outdated M07 orange/earthy values without changing canonical geometry or artwork renderer.

## QA discoverability
\`/qa/m07/\` must initially show a clearly labeled “実機確認 12項目” card. User can collapse it to a recognizable button to draw without permanent obstruction, reopen whenever needed, and reach problem selection/copy. The checklist must not require navigating the Right Box stack.

## Not yet evidenced solely by source code
Passing builds and browser smoke does **not** prove subjective pictogram recognizability, rendered optical quality, physical stylus hit-target behavior or feel compared to M06. User device/visual review remains required. No unilateral M07 acceptance.
