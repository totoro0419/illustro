# Color / Eyedropper Interaction Specification

> Status: **Accepted P0 interaction specification**

## Entry

Color controlはBrush/Fill等のContextから1 actionで開ける。

Current foreground colorを常時識別可能にする。

## Default color UI

Primary:
- hue/value-saturation style direct picker or equivalent intuitive 2D+1D control
- numeric/model controlsはadvanced/precision path

Exact visual modelはUI設計で決める。

## Changing color

Picker drag:
- live preview current color
- pointer release commits Workspace current color

Current drawing color change自体はArtwork Undoへ入れない。

## Eyedropper

Canvas Eyedropper:
- direct tool
- temporary hold shortcut/pen button
- touch long press is candidate but gesture conflict/perceived latencyをPrototypeで検証

Reference Eyedropper:
- same color acquisition semantics
- ReferenceをCanvas layerへimport不要

## Sampling domain

Default:
- visible document composite before display-only overlays
- Soft Proof sampling is explicit option
- hidden UI/selection outlineをsampleしない

Layer-only/source samplingはadvanced option。

## Temporary Eyedropper

Hold begins temporary mode.
Pointer move updates preview/sample indicator.
Release:
- commit sampled color
- return previous tool

Cancel restores previous current color if sample was not committed.

## Color history

Recent colors:
- new committed colorを追加
- exact duplicate suppression
- bounded list
- document or workspace scopeはUser setting候補

## Palette

Tap/click swatch = current color.
Edit/reorder requires explicit palette edit mode to avoid accidental modification while painting.

## Harmony / Smart Color Assist

Suggestions are non-destructive candidates.

Selecting suggestion changes current color or targeted Region preview according to context.

AI/algorithm suggestionをsilent applyしない。

## Gamut / profile

Out-of-gamut warning is visualization only.

Choosing displayed proofed pixel and choosing document value are separate semantics.

## Device

PC:
- hover info/numeric precision
Tablet:
- pen/touch direct
Phone:
- compact picker with large hit areas
- no tiny numeric controls as only path

## Persistence

Current color: Workspace/session.
Palette: Asset Library/local settings.
Applied artwork pixels: Document.

## Performance

- common color-space conversion cached
- picker drag no general ICC recompile
- color history update O(1)/bounded
- inactive harmony analysis zero recurring cost

## Acceptance

- temporary eyedropper returns prior tool
- soft-proof overlay does not silently alter sampled document color
- reference sampling works without import
- touch-only color selection practical
