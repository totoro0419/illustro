# ADR-0001: Document / Layer Data Model

## Status

**Accepted — Architecture V1 technical baseline / Production continuation gated**

Production continuation is governed by [`DESIGN_COMPLETION_GATE.md`](../DESIGN_COMPLETION_GATE.md); this ADR status is not implementation authorization.

## Date

2026-09-27

## Problem

Raster、Vector、Text、Mask、Effect、Region、Snapshot等を、巨大Canvasと深いUndoを維持しながら一つのDocumentとして安全に扱うCanonical Modelを定義する。

## Current requirements

- 大量Layerでも軽い
- 非破壊編集
- RegionをDocument概念として保持
- Undo / Snapshot / Timelapse対応
- Color Profile保持
- Offline / Recovery
- 将来共同編集を不必要に阻害しない
- GPU CacheをCanonical Stateにしない

## Independent analysis

Mutableな巨大Document objectを一つ持ち、各Commandがin-place mutationする方式は以下の問題がある。

- Undoのためのdeep copyまたは複雑なinverse処理が必要
- Save中のSnapshot固定が難しい
- Recoveryとのraceが増える
- background render/region jobが変更中Stateを参照しやすい
- Snapshot/branchを後から追加しにくい

一方、全編集でDocument全体をimmutable copyする方式も大量Layer/Tileで非現実的。

したがって、**stable entity identity + immutable published revision + copy-on-write / structural sharing** をBaselineとする。

ただし、Active Strokeやparameter dragの途中までpersistent immutable nodeを量産しない。**公開前のActive Transactionはbounded mutable scratch stateを持ってよい。** Transaction commit時に変更ページ/Tile/metadataだけをfreeze/publishする。

Pure functional data structureを使うこと自体を目標にしない。実測で単純なarena + copy-on-write pageの方が軽ければそちらを採用する。

## Decision

### 1. Stable Entity ID

Document内の長寿命Entityはopaqueな128-bit級Stable IDを持つ。

対象:

- Layer
- Mask
- Vector object
- Text entity
- Region
- Guide
- Reference
- Effect instance
- Selection mask
- Asset reference

ID生成アルゴリズム自体はCodec/APIから隠し、versioning可能にする。

Runtime object addressや配列indexをIdentityにしない。

### 2. Immutable Published Revision Root

Commitされた編集は新しいRevision Rootを生成する。Stroke中のpreview/sample更新ごとには生成しない。

Revision Rootは以下を参照する。

- document metadata
- ordered layer tree
- entity map
- raster surface manifests
- region sets
- guide/reference state
- active editing-state metadata where persistence/undo対象
- resource table

変更されていないSubtree/Blockは共有する。

具体的Persistent Tree実装（HAMT/RRB等）はPrototype比較後に決める。

小Document/小metadata更新でPersistent Treeのalloc/copy overheadが不利なら、page arena + generation + copy-on-write table等を許容する。

### 3. Layer Node model

共通Node:

```text
LayerNode
- entityId
- kind
- name
- visible
- opacity
- blendMode
- locks
- transform
- clipping/inherit-alpha metadata
- masks[]
- effects[]
- colorTag
- metadata
- payloadRef
```

kind:

- Raster
- Vector
- Group
- Text
- Adjustment
- Filter
- Fill/Generator（将来）
- External/Linked（Investigate）

Reference Workspace itemはArtwork Layer treeへ混ぜない。

### 4. Raster payload

Raster LayerはSparse Surface Manifestを参照する。

ManifestはTile座標→canonical block/materialization recipeを引く。

Tile SizeはこのADRで固定しない。

### 5. Vector payload

Path / Anchor / Handle / Stroke StyleをCanonicalに保持する。

Vectorのrasterized tileはDerived Cache。

### 6. Text payload

Unicode text、font identity/fallback情報、layout/styleをCanonicalに保持。

rasterized glyph resultはDerived。

### 7. Mask

Maskは適用対象への明示参照を持つ。

Raster maskとVector maskを区別する。

Selectionとの内部Coverage primitive共有は許可するが、Entity semanticsは別。

### 8. Effects

Layer effectsはordered effect stackとしてCanonical parameterを保持する。

Rendered effect tilesはDerived。

Adjustment Layerはscope内の下位compositeを入力とする特殊Layerとして扱う。

### 9. Region

RegionはRaster pixel layerの副産物としてのみ保持しない。

RegionSet / Topology generation / Region Identity / assignmentsを独立Document entityとして保持する。

Source layer revisionへのdependencyを持つ。

### 10. Reference Workspace

Reference画像はDocument artwork compositeに含めない。

Reference itemはtransform/display options/resource referenceを持ち、必要に応じDocumentに保存する。

### 11. Editing state

以下はArtwork pixelではないがProject editing stateとして保存可能。

- active selection
- guides
- layer selection
- view presets
- workspace-linked metadata

View center/zoom等はDocument保存とWorkspace保存の責務を分ける。

## Active transaction fast path

Active transactionでは:

- dirty entity/table pageだけmutable scratchへcopy
- rasterはworking tile/subrectへ書く
- parameter dragはintermediate revisionを作らずcoalesce可能
- commit時に一度だけpublished revisionを作る

Hot Pathで「immutableであること」自体のために短命Nodeを大量生成しない。

## Canonical vs derived

Canonical:

- structure
- entity IDs
- raster canonical content/records
- vector/text
- effect params
- region data
- color profile

Derived:

- layer thumbnails
- composite tiles
- GPU resources
- vector rasterization cache
- region spatial index

## Undo / Save / Recovery impact

Undo:
- Revision Root switchを基本とする。

Save:
- 特定Revision Rootを固定してsnapshot exportする。

Recovery:
- Root + dependency closureがdurableになった地点を保護点とする。

## Legacy reference review

過去資料もStable Entity、Immutable Revision、structural sharing、Canonical/Cache分離を重視していた。

現在でも上位原則は妥当。

ただし以下は継承しない。

- HAMT/B-tree/RRBの固定採用
- 特定Hash
- 固定retention数
- 固定block構造

## Rejected alternatives

### Mutable object graph + inverse command only

複雑な非破壊EffectやRegion topologyでinverse correctnessが脆弱。

### Full-document snapshots per edit

Memory / write amplificationが大きすぎる。

## Open risks

- persistent data structureのJS/WASM境界コスト
- very large entity map
- revision metadata GC
- font/resource lifetime

## Validation plan

Prototypeで以下を測る。

- 10k / 100k Layer metadata operation
- sparse tile manifest update
- revision creation latency
- branch/snapshot memory amplification
- save snapshot consistency


## V1 implementation note

Production Vertical Slice 001 implements the Raster subset of this model: stable IDs, paged copy-on-write metadata, immutable published Document Root, sparse Raster Surface Manifest, and mutable Active Transaction working state. Vector/Text/Mask/Effect/Region entities remain planned and are not claimed as implemented by this slice.
