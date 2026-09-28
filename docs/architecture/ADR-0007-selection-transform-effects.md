# ADR-0007: Selection / Transform / Effects

## Status

**Accepted for prototype**

## Architecture V2 supersession note

This ADR remains design history/detail. Where it conflicts with the current V2 contracts, [Shared Region Resolver V2](REGION_RESOLVER_V2.md) and [Architecture V2](ARCHITECTURE_V2.md) are authoritative.

## Date

2026-09-27

## Problem

Selection、Transform、Liquify、Mask、Adjustment、Live Filterを非破壊・Tile-aware・Regionと非混同の形で統合する。

## Independent analysis

Selectionを一時的なmarching antsだけにすると:

- saved selection
- feather
- region conversion
- transform masking
- adjustment masking

が一貫しない。

EffectをLayerごとの手書き分岐で実装するとdirty propagationが破綻する。

## Decision

## 1. Selection model

Selectionは0..1 coverageを持つSparse Coverage Surface。

Active Selection:
- editing state
- Undo対象
- Project save対象

Saved Selection:
- named Selection Mask entity

Binary/AA/Featherを同じcoverageで表現。

Region IDとは別。

## 2. Selection operations

Source:

- rectangle/ellipse
- polygon/freehand
- layer alpha
- luminance/color range
- Region
- existing mask

Boolean:

- replace
- add
- subtract
- intersect
- invert

Morphology:

- expand
- contract
- feather

## 3. Frozen selection dependency

Stroke/Fill/Effect Commitは、その操作が使用したSelection revisionを参照する。

後からActive Selectionを変更して過去Commandの意味を変えない。

## 4. Transform

Transformを2種類に分ける。

### A. Non-destructive Transform Node

- layer/group/object transform
- matrix / perspective/warp parameter
- editable

### B. Bake Transform

- source rasterをresample
- new canonical raster tilesを生成
- CommandとしてUndo可能

Canvas drag中PreviewはDerived。

## 5. Resampling

Raster resampling algorithmはversioned。

候補:

- nearest
- bilinear
- bicubic family
- Lanczos-family
- pixel-art optimized

exact kernels/parametersはImage quality/performance test後に固定する。

## 6. Warp / Liquify

Warp:
- editable control mesh/fieldをCanonical parameterとして保持可能

Liquify:
- ordered displacement representationまたはequivalent modifierを第一候補
- dragごとにRasterを繰り返しresampleして品質劣化させる方式を標準にしない

Bake時に一度resampleする。

## 6.1 Effect cost policy

非破壊であることを理由に、毎frame最初からEffect chainを再評価してはならない。

- effect output tileはinput revision + parameter generationでcacheする
- expensive nodeはderived checkpoint/materialized cacheを持てる
- parameter drag中は必要viewportだけ再評価する
- non-visible branchは評価しない
- disabled effectはnear-zero recurring costを目標にする
- userが望む場合は明示Bake/Applyで計算量を下げられる

Cacheは再生成可能で、編集可能なEffect parameterをCanonicalとして維持する。

## 7. Effect graph

Effectの内部Interface:

```text
EffectNode
- type/version
- parameters
- input dependencies
- mask
- blend/opacity
- spatial footprint / halo
- evaluation domain
```

Layer Effect Stackはordered。

Adjustment Layerはscope compositeを入力とする。

## 8. Local vs global effects

Local:
- tile + haloで評価可能
- blur, sharpen等

Global/semi-global:
- histogram/curve summary
- global displacement map
- LUT compilation等

global analysis stageとtile apply stageを分けられるInterfaceを持つ。

## 9. Dirty propagation

parameter/source変更から:

- direct output tile
- halo-expanded neighbors
- downstream composite

をinvalidate。

Canvas全体invalidateをdefaultにしない。Parameter変更でも実際のdependency/footprintとvisible demandを使う。

## 10. Effect canonicality

Non-destructive Effect:
- source + parametersがCanonical
- rendered pixelはDerived

Destructive Apply:
- output raster bytesがCanonicalになるため、reference/sealing evaluatorで固定

## 11. Blend If

Blend If相当はEffect/Compositing condition nodeとして扱う。

- source/self channel/tone range
- smooth transition
- Canvas visualization

UIは後で設計するが、内部ではversioned parameterとして保存する。

## 12. Selection + Region integration

Region→Selectionは可能。

Selection→Region identity変換は自動同一視しない。

Selectionは境界Topologyやlineageを持たないため。

## Legacy reference review

過去資料もSelection CoverageとRegion Topologyを分離し、Transform/Liquifyを累積resampleから離す方向だった。

上位知見を採用。

継承しない:

- fixed coverage quantization
- fixed feather kernel
- fixed warp solver iterations
- specific resampler parameters
- effect scheduling constants

## Validation

- feather + transform
- saved selection undo
- region→selection
- 16k canvas local blur
- adjustment over 1000 layers
- nested masks/effects
- warp repeated edit without quality loss
- liquify preview→commit
- effect parameter drag latency
