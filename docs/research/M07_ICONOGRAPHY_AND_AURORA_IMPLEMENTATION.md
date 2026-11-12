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


## 2026-10-10 follow-up: distinguish logo design from toolbar icon design

User subsequently identified the **Smudge / Blend** and **Eyedropper** icons as having broken shapes and demanded actual study of polished logo construction, not arbitrary hand-drawn SVG.

### Research expanded: actual graphic-design process, not just icon API size
- [Adobe: Flat logo design](https://www.adobe.com/creativecloud/design/discover/flat-logo-design.html): begin with research and a few quick silhouettes, test **in black and white** before color, keep recognizable shapes and eliminate unnecessary detail. Do not use a gradient to mask a weak silhouette.
- [Adobe: Minimalist logo design](https://www.adobe.com/uk/creativecloud/design/discover/minimalist-logo-design.html): produce several iterations; prioritize proportion, negative space, and consistent recognizable results from small to large sizes.
- [IBM Design Language: Designing UI icons](https://www.ibm.com/design/language/iconography/ui-icons/design/): the square grid controls proportions, positioning, angles and corners; align intentionally rather than scatter arbitrary Bézier control points. Optical tuning is valid when strict grid fitting harms legibility.
- [IBM Design Language: UI icon usage](https://www.ibm.com/design/language/iconography/ui-icons/usage/): 16, 20, 24, 32 are design inspection sizes; consistent visual weight and optical centering matter, **44px** is a button target, not the glyph size.
- [Apple Human Interface Guidelines: SF Symbols](https://developer.apple.com/design/human-interface-guidelines/sf-symbols): prioritize simple, recognizable, directly relevant symbols; consistent visual weight and alignment.
- [Adobe Photoshop: Eyedropper](https://helpx.adobe.com/photoshop/using/tool-techniques/eyedropper-tool.html): tool conveys color sampling, so its recognizable pipette anatomy takes priority over ornamental stroke details.

**Crucial distinction:** A *brand logo* must create distinctive brand recognition; a *toolbar icon* must immediately communicate a known action and avoid semantic ambiguity. The logo-design workflow of research → silhouette sketches → simplification → optical balance → small-size test transfers to toolbar symbols, but its pressure for uniqueness must **not** override well-known painting-tool metaphors.

### Defect diagnosis and construction decisions
| Item | Rejected prior concept | New motif | Reason |
|---|---|---|---|
| Smudge / Blend | Three unrelated curved strokes with a nearby chevron; reads as accidental scratches or a directional arrow rather than an actual tool. | A single connected, forward-extending index finger with simplified hand contour. | Painting apps conventionally communicate smudging through direct finger manipulation. The silhouette is legible before the two minor finger joints are noticed. |
| Eyedropper | Several incomplete/disjoint-looking diagonals making a pen-like or broken impression. | Rounded rubber bulb, continuous diagonal pipette barrel/collar, pointy color-sampling tip. | Shows an actual dropper rather than a generic pen, with connected contour and visible terminal. |

The new geometry was **not selected solely from SVG source inspection**. We first generated **three finger alternatives and eight pipette alternatives**, rendered each at **16, 20, 24, 48 and 88 CSS pixels**, and visually compared silhouette, contour continuity and tiny-scale clutter. The selected designs then underwent 16/20/23/24px raster checks using CairoSVG + Pillow + connected-component labeling: **one connected ink component, no touches to the SVG viewBox edges at every size** for each icon. These checks confirm raster continuity/clipping only. They do not establish subjective elegance or intuitive comprehension.

### Review gate added for every future icon change
1. Choose a real-world motif and confirm what operation it should explain. Put the proposed meaning in one sentence.
2. Draw 3+ black-and-white silhouette alternatives *before* adding polished curves and strokes.
3. Compare with the family's fixed optical size, padding and stroke. Detect accidental double contours, disconnected segments, overdrawn nodes and small blurred details.
4. Actually rasterize icons at **16px, 20px, 24px**, not just edit `path d` or trust CI compiling. Review on light/dark and enabled/disabled surfaces.
5. Compare icons next to one another so their visual weights and strokes are consistent; require shape-based distinguishability between Brush, Smudge, Eraser and Eyedropper.
6. Confirm operation and QA regressions with public M07; ask for **user visual review**. No subjective PASS claim solely from component checks.

**Scope limitation:** This follow-up surgically fixes the two reported pictograms rather than randomly redrawing already functional icons. A holistic full-icon silhouette review remains a valid design review task. M07 still awaits explicit user acceptance; do not silently advance to M08.


## Follow-up correction: Smudge hand metaphor rejected by user (2026-10-10)

**New explicit user feedback:** The previous Smudge symbol is an inappropriate expression. The user did not specify its exact interpretation, so do not invent one. The icon resembles a hand gesture; this design is now **REJECTED**, regardless of the previous SVG connectivity or test results.

**Reference research for the intended action:**
- [CLIP STUDIO official support](https://support.clip-studio.com/ja-jp/faq/articles/20200058) confirms blur, color mix and fingertip-style tools are categorized under the `色混ぜ` (Blend) tool group. This confirms the *function*; it does **not** require copying a finger pictogram.
- [Krita official Color Smudge manual](https://docs.krita.org/en/reference_manual/brushes/brush_engines/color_smudge_engine.html) documents color smear and smooth blending as combined/dragged paint, giving a non-human *result-based* motif.
- [Adobe Photoshop official Smudge guide](https://helpx.adobe.com/photoshop/desktop/apply-painting-techniques/fill-objects-selections-layers/smudge-image-areas.html) describes dragging pigment and softening color transitions. Its "finger through wet paint" simile is **not** an icon requirement.

**Result-based replacement:** Two curving paint strokes softly merge in the center; a lighter third stroke demonstrates their shared color trail. A single-color original SVG with no hand, fingers, people, directional arrows, offensive gesture, or Unicode symbol. This encodes **what happens to color**, rather than **what a user's body is doing**.

**Visual selection evidence:** We locally rasterized **eight separate original, non-human concept candidates** at 16, 24, 40 and 72 px (paint smear / dual strokes / interweaving ribbons / soft blend). Several resembled a fork, a fish or a wind icon and were rejected. Chosen concept: `B-2colors`, three controlled curves. Exact test sheet: `/mnt/data/icon_smudge_candidate_comparison.png` in the interactive session (not a committed design asset).

**Future icon constraint:** Do not use a hand/finger graphic for `smudge`, including when adapting competing applications' common symbols. User feedback overrides historical design preferences. Use meaningful non-human silhouettes and screen-size visual review. Code-level SVG validity and screenshot appearance do not constitute subjective icon approval.

The previous section's finger design is retained only as **historical evidence of an erroneous revision**; it is **no longer the current or recommended design**. M07 remains USER REVIEW REQUIRED.
