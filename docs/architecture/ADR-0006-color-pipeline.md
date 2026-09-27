# ADR-0006: Color Pipeline / ICC / Blend Domain

## Status

**Accepted for prototype**

## Date

2026-09-27

## Problem

sRGBだけに固定せず、Wide Gamut、高bit-depth、Soft Proof、HDR-ready、Blend/Filterを扱えるColor Managed Pipelineを定義する。

## Independent analysis

Browser CanvasのColor Managementへ作品の意味を委ねると:

- Browser差
- Canvas API feature差
- GPU backend差
- hidden RGB/alpha
- export ICC

を一貫制御しにくい。

よってIllustro自身がDocument Color Space / pixel encoding / transformsを明示的に管理する。

## Decision

### 1. Document color descriptor

Documentは少なくとも:

```text
ColorDescriptor
- model
- profileId / embedded ICC
- sample format
- transfer characteristics
- alpha semantics
```

を持つ。

### 2. Canonical alpha

Canonical raster storageは**straight-alpha capable**とする。

理由:

- fully transparent pixelのRGBを保持できる
- external file roundtripでpremultiply lossを避ける
- color conversionとalphaを分離可能

GPU compositing cacheはpremultiplied representationを使用してよい。

### 3. Pixel precision

Required design targets:

- UNORM8
- UNORM16

Architecture-supported / prototype:

- float16
- float32

初期実装範囲はBenchmark/UX需要で段階化できるが、schemaを8bit sRGBへ固定しない。

### 4. Working color space

Documentは一つのprimary working profileを持つ。

Imported raster:
- assign/convert policyを明示
- tagged sourceはprofileを読む
- untagged sourceのdefault assumptionは設定/format policyで定義

Source original profile metadataをresource provenanceとして保持可能にする。

### 5. ICC engine

ICC transformはBrowser display conversionへ依存せず、Engine側で管理する。

Candidate:
- LittleCMS系WASM
- skcms系
- custom limited pathは不可（一般ICC互換性不足）

実装Libraryは性能/精度/License/sizeで比較する。

Transform/LUTはDerived Cache。

### 6. Artwork composite

Conceptual pipeline:

```text
source decode/convert
→ document working domain
→ layer/effect/blend evaluation
→ document composite
→ optional soft proof
→ display transform
→ presentation
```

Display transformは一回だけ適用。

### 7. Blend domain

Blend Modeごとに定義Domainをversioned specificationで固定する。

「全部linear」「全部encoded」を一律適用しない。

Mode familyごとの参照式/compatibility targetを定義する。

PSD interoperabilityではAdobe互換期待とIllustro native semanticsを区別する。

### 8. Linear-light

Blur/lighting/mixing等、意味上linear計算が必要なoperatorはlinearized working valuesを利用できる。

それをDocument profile conversionと混同しない。

### 9. Soft Proof

Soft ProofはView transform。

Canonical Artworkを変更しない。

Parameters:

- proof profile
- rendering intent
- black point compensation
- paper/ink simulation where supported
- gamut warning

### 10. HDR

Architecture:

- scene/display-referred distinctionを将来表現可能
- float working path
- display tone mapping adapter
- EXR interchange candidate

初期ReleaseでHDR UI/monitor supportを必須にしない。

### 11. Canvas/browser output

Canvas2D/ImageDataにDisplay P3/float16機能が存在しても、互換性差があるためCanonical storageとして依存しない。

Presentation adapterが利用可能なsurface color capabilityを検出する。

### 12. Color pick

Eyedropperのdomainを明示する。

候補:

- document composite value
- layer source value
- displayed/proofed value

Defaultは「Artworkとしてのdocument value」を中心とし、Proof samplingは明示Optionにする。

## Alpha invariants

- ICC conversionでalpha値を変更しない
- premultiply/unpremultiplyをlossy canonical roundtripにしない
- hidden RGB policyをformat/documentで明示
- compositing boundaryだけpremultipliedへ変換可能

## Legacy reference review

過去資料もColor conversionとAlpha分離、Soft ProofをView transform、GPU displayとの二重encoding回避を重視していた。

上位原則を採用。

継承しない:

- specific typed-plane format
- specific ICC PCS→OKLab path
- specific tolerance targets
- specific LUT/grid
- F32 promotion rules

## Validation

Golden tests:

- sRGB
- Display P3
- Gray ICC
- custom ICC matrix/TRC
- LUT profile
- transparent colored pixels
- alpha-only erasure
- wide-gamut gradients
- soft proof
- roundtrip PNG/TIFF/ORA
- float path

比較:
- trusted ICC reference implementation
- ΔE metrics
- alpha exactness
- hidden RGB preservation
