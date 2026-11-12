# M07 quality finishing audit — evidence log (2026-10-10)

## Scope and source of truth
- Branch: `milestone/M07-pc-tablet-ui-shell`.
- Initial verified branch/PR HEAD: `91d044a46083d4878ac9110ab0747c94bb166248` (prior M07 workflow `38031069070` concluded success, **not a current quality acceptance**).
- Source baseline: `docs/IMPLEMENTATION_BASELINE.md`, `docs/CANONICAL_INDEX.md`, current M01–M47 checklist, canonical Left/Right UI specification, accepted Aurora narrowed hue direction (§10–11 in `UI_THEME_CANDIDATES_2026-09-30.md`).
- Not in scope: favicon, app/PWA icon, brand mark redraw, M08+ drawing features, old M01–M06 accepted QA pages.
- IMPORTANT: local vector rendering is not a screenshot of the deployed browser. Automated Chromium is not a physical Android tablet; the user alone accepts M07.

## Official source references considered
| Published first-party reference | UI behavior learned | M07 decision |
|---|---|---|
| [ibisPaint toolbar/tools](https://ibispaint.com/lecture/index.jsp?no=4) | Direct brush/eraser, tool panel, color and layer affordances | Keep existing left-to-right workflow and visible labels; avoid invented pictograms. |
| [Clip Studio](https://help.clip-studio.com/) | Tool/Palette distinction, customizable docked UI | Keep Right Boxes and Layer Page; do not merge actions into arbitrary floating toolbars. |
| [Procreate handbook](https://help.procreate.com/procreate/handbook/interface-gestures/interface) | Streamlined interface minimizes UI competing with artwork | Keep Canvas brighter and calmer than control chrome. |
| [Krita manual](https://docs.krita.org/) | Toolbox and dockers separate tools from setting areas | Preserve the Left/Right functional split. |
| [Photoshop toolbar](https://helpx.adobe.com/photoshop/desktop/get-started/set-up-toolbars-panels/customize-the-toolbar.html) | Frequently used commands visible; others grouped | Keep All Features for less frequent functions; do not relocate accepted commands. |
| [Affinity help](https://affinity.help/) | Studio panels and tools are distinct | Keep controls anchored to the corresponding panel; avoid unexpected overlays. |
| [IBM UI icon construction](https://www.ibm.com/design/language/iconography/ui-icons/design/) | Optical alignment on intentional grids | Keep shared 24-unit artboard, unified cap/join; inspect rendered small sizes. |
| [Material Symbols](https://developers.google.com/fonts/docs/material_symbols) | Optical size matters separately from button target | Keep glyph area separate from tap rectangle. |

These references support design comparisons, **not** claims about proprietary internal renderer architecture.

## Confirmed implementation issues
| Severity | Code-based evidence | Change |
|---|---|---|
| Medium | Former `smudge` comprised only free-floating undulating paths, explicitly rejected as an unclear symbol. | Replace with two overlapping pigment spots and a central mixing boundary; no hand/finger. Still requires human recognizability validation. |
| Medium | Former `brush` end of handle and bristle tip could read as a generic diagonal pencil. | Clarify elongated handle, ferrule, and organic paint tip. |
| Medium | `eyedropper` had disconnected-looking bulb/shaft/joints. | Simplified continuous dropper profile and collar; distinguish from brush through round top. |
| Medium | Smart Fill had an extra sparkle competing with recognizable bucket/drop. | Simplify to paint bucket + drop, preserving established motif. |
| Medium | `transform` corner handles used `fill="var(--a-surface,#fff)"`, which made shape depend on control background state. | Use background-independent outlined square handles. |
| Low | Selection marquee/cursor visual junction read too cramped. | Rebalance the outer rectangle and cursor within 24-unit viewbox. |
| High (potential; code confirmed) | `hideWorkspace` activated `close(true)` for **every input mode**, automatically moving keyboard focus even after touch. | Only return keyboard focus when `event.detail===0`; preserve keyboard accessibility and avoid touch halo. |
| Low | QA sheet positioning declared in multiple places, with dead folded-sheet rules even though the folded panel is hidden. | Consolidate active QA position and remove obsolete placement declarations. Preserve topbar QA reopen. |

## Icon audit disposition
- Reviewed **all** semantic identifiers in `apps/editor/src/ui/icons.ts`; six primary tool motifs revised: `brush`, `smudge`, `eyedropper`, `smartFill`, `selection`, `transform`.
- Existing familiar motifs intentionally retained for `eraser`, `move`, `all`, `workspace`, `layers`, `undo`, `redo`, `flipH`, `flipV`, `home`, `save`, `plus`, `open`, `recover`, `export`, `copy`, `close`, `back`, `down`, `more`, `color`, `shape`, `guide`, `effects`, `reference`, `history`, `document`, `settings`, `zoom`, `info` (unchanged to avoid churn without an observed defect).
- Preview compared all six revised icons plus Eraser, Workspace, Flip H/V and All Features at **16, 20, 24, 32px** in anti-aliased PNG; this is an SVG source-level visual inspection, not a proof of end-user recognition.
- User-facing icon comparison generated as a separate PNG artifact in the work session; not copied into the repository's runtime or PWA assets.

## Interaction regression and protection
- Added M07 automated Chromium scenario for Tablet: scroll to Workspace's own Hide action, physically dispatch touch tap, check dock closes **without focusing the header toggle**, reopen, activate same action with Enter, and check keyboard focus **does** return.
- Existing M07 automated workflows already include PC, Tablet, Compact, both WebGL2/WebGPU, touch, pointer, typechecking and M01–M06 unit + browser regressions. **This document alone does not establish that the new CI run passed**.
- Canvas graphics and brush/raster core were intentionally **not modified**.
- QA M01–M06 artifacts remain out of modification scope.

## Unverified / external acceptance required
- Pixel-accurate production screenshots before/after for all 8 requested display sizes have **not been taken in this tool session**; the CI screenshot capture is a separate automated-browser output and must not be misreported as independently visually reviewed.
- Physical Android touch feedback, perceived GPU/brush performance, loading behavior on the user's exact device, and subjective readability of Smudge/Brush require user device assessment.
- Until the exact latest commit's GitHub Actions and public QA build are confirmed, verification remains **pending**.
- Scores that depend on unperformed browser/physical visual inspection must be marked **not verified**, not assigned invented values.
- M07 remains DRAFT; final acceptance is exclusively user's decision.
