# ADR-0005: Lineart Region System / Persistent Fill

## Status

**Accepted for prototype**

## Architecture V2 supersession note

This ADR remains design history/detail. Where it conflicts with the current V2 contracts, [Shared Region Resolver V2](REGION_RESOLVER_V2.md) are authoritative.

## Date

2026-09-27

## Problem

線画から塗りに利用可能なRegionを構築し、線画編集後もPersistent Fillを可能な範囲で追従させる。

Pixel Flood Fill結果へ単純IDを付けるだけでは、線画変更、split/merge、gap、曖昧境界に耐えない。

## Independent analysis

問題を一段で解くのではなく、以下へ分解する必要がある。

1. Evidence — 何を線/障害物とみなすか
2. Boundary — 塗り境界として採用する線
3. Gap — 不完全線画をどう補助するか
4. Topology — 閉領域の構造
5. Region — faceへ付く制作上の領域
6. Stable Identity — 編集前後の対応
7. Assignment — 色/スタイル等のPersistent情報

Selectionとは別概念。

## Decision

### 0. Activation / pay-for-use

Lineart Region Systemは**通常描画の同期Hot Pathへ常駐させない。**

- Regionを使っていないDocumentではTopology stateを作成しなくてよい
- Region Sourceとして指定されたLayerだけを監視する
- Lineart Stroke commit時はまずdirty generation/boundsを記録する
- Topology更新はRegion Fill、Persistent Fill、Region Selection等が必要とした時、またはbudget内のbackground jobとして行う
- 通常Brush Strokeのpresent/commitをRegion解析完了待ちにしない
- 連続編集中はdirty更新をcoalesceし、中間generationを全て解析しない

Persistent Fillを有効にしたDocumentでは追従更新を優先するが、それでもcurrent stroke latencyより優先しない。必要なら「Updating」状態を明示する。

### 1. Evidence sources

SourceごとにEvidence adapterを持つ。

候補:

- Raster alpha
- Raster luminance/color contrast
- Vector centerline
- Vector outline
- manual boundary
- suppression/exclusion

Layer visibilityとRegion boundary participationを分離可能にする。

### 2. Evidence metadata

Evidenceは少なくとも:

- source entity/revision
- spatial geometry/field
- confidence
- provenance
- orientation/width where available
- generation

を持つ。

### 3. Boundary model

Evidenceから即「確定線」にせず、Boundary stateを持つ。

- accepted
- candidate
- unresolved
- rejected/suppressed
- manual

Manual user decisionをauto再計算で無断上書きしない。

### 4. Gap handling

Gap Closeはsource rasterを描き換えない。

Virtual Boundary/Bridgeとして扱う。

候補生成には:

- endpoint distance
- tangent compatibility
- obstacle crossing
- local evidence
- competing candidate
- hints

等を使う。

**固定Weight/閾値はここで決めない。**

自動確定できない競合はUnresolvedとして残す。

### 5. Topology

Accepted BoundaryからPlanar Topologyを構築する。

Representation baseline:
- planar embedded graph
- half-edge/DCEL系のface traversalが第一候補

ただし実装Library/構造はPrototypeで比較する。

face:
- outer loop
- holes
- adjacency
- boundary provenance

を取得可能にする。

### 5.1 Evidence cache policy

Raster Evidence生成結果はDerived Cache。

Source LayerがRegion機能に参加していない場合はEvidence cacheを保持しない。

Zoom表示用のLine rendering cacheとRegion evidence cacheを無理に共通化して、どちらかのHot Pathを重くしない。

### 6. Incremental update

全Document topologyを毎Stroke再構築しない。**原則として毎StrokeにTopology solver自体を起動しない。**

dirty evidence bounds + gap influence radius + dependent connected componentを更新対象とする。

遠方Region merge等が起こり得る場合はconnected componentをUpdatingにし、古い一部だけをCurrentとして混ぜない。

### 7. Region identity

Region IDはstable opaque ID。

matching inputs候補:

- overlap
- centroid/shape
- boundary provenance
- adjacency
- explicit hint
- transform lineage

固定Weighted Scoreだけを唯一の根拠にしない。

先にstructural evidenceを使う。

### 8. Split / Merge semantics

Split:
- old regionはlineage parent
- childrenへ明示lineage
- ID継承は「一番大きい子へ常に渡す」等の暗黙規則にしない

Merge:
- new regionへ複数parent lineage

明らかな同相transform:
- identity維持可能

曖昧:
- Ambiguous

### 9. Region states

- Current
- Updating
- Ambiguous
- Retired/Orphan

Ambiguousを正常CurrentとしてPersistent Fillへ流さない。

### 10. Persistent Fill

Fill AssignmentはRegion IDへ結びつく。

Assignment:

- absolute color/style
- relative color definition
- source/reference
- user metadata

Split/Merge時:

- meaningfully compatibleなassignmentのみ自動継承
- conflictはConflictとして表示
- silent overwriteしない

### 11. User override

UI/APIとして将来提供:

- connect boundary
- remove/suppress boundary
- merge/split region
- pin identity
- resolve ambiguous match
- re-run local analysis

### 12. Versioning

Evidence/Topology/Matching algorithmはversioned。

Document load時に勝手に最新Algorithmで全Region identityを再計算して過去assignmentを変えない。

Migrationは明示処理。

## Selection separation

Selection:
- editing coverage/mask
- arbitrary soft values
- short/medium lifetime

Region:
- topology identity
- lineart-derived
- lineage
- persistent assignment

Coverage representation共有は可能だが、同じEntityにしない。

## Legacy reference review

過去資料のEvidence→Boundary→Topology→Stable Identity分解、Ambiguous state、Gapをvirtual boundaryとして扱う点は現在案とも一致し採用。

継承しない:

- alpha histogram条件
- threshold .5
- gap score formula
- .82/.60 thresholds
- matching weights
- .78/.12 thresholds
- exact ID generation formula

これらはDataset/FixtureとUX error costを用いて再評価する。

## Validation corpus

- clean closed lineart
- anti-aliased line
- textured pencil
- thick ink
- colored line
- bright line on dark background
- tiny intentional gap
- accidental gap
- crossing lines
- T junction
- close parallel strokes
- split face
- merge faces
- affine transform
- liquify/warp
- layer visibility changes
- vector+raster mixed lineart

Metrics:

- false bridge
- missed bridge
- topology correctness
- identity preservation
- ambiguous rate
- user correction effort
- incremental update latency
