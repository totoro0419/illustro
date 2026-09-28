# Core Vertical Slice 001 — Redesign Principles Re-audit

> Date: 2026-09-28
> Status: **Foundation retained provisionally / follow-up design constraints recorded**
> Scope: `packages/core` Vertical Slice 001 vs current Illustro redesign doctrine

## 1. Conclusion

Slice 001は現時点で撤回を必要とする重大矛盾は確認できない。

ただし、これはBrush/Renderer/Persistence/RegionのProduction設計が完成したことを意味しない。

Slice 001は以下の低位Infrastructureとしてのみ扱う。

- Document identity
- immutable published root
- sparse Raster manifest
- mutable transaction scratch
- canonical block ownership
- Revision root switching
- typed command envelopeの最小形

後続Subsystemがこの基盤へ合わせるのではなく、上位設計から要求される意味を満たすようSlice 001側を変更してよい。

## 2. Compatible with current doctrine

### Canonical State / Cache separation

Canonical Raster blockとActive mutable working stateを分離しており、GPU CacheをArtwork authorityにしていない。

**Compatible.**

### Tile / Partial / Bounded foundation

Blank huge canvasはTile未確保、変更TileだけをCanonical化する。

**Compatible as a foundation.**

256はArchitecture V1のruntime standard profileであり、portable file semanticsとして固定していないため、Legacy値の盲目的継承ではない。

### Undo / History separation foundation

Revision Root切替をUndo/Redo基盤にしている。

Save/Recovery完了状態と同一化していない。

**Compatible.**

### Offline First

Core Document操作自体にNetwork dependencyがない。

**Compatible.**

### Typed/versioned operation direction

Commandはtyped/versionedになっている。

**Directionally compatible**, but Brush/Fill/Region等のsemantic record設計は未実装。

## 3. Design constraints before Brush implementation

### 3.1 Low-level pixel APIs are not the Brush Engine

`setPixel` / `editTile` はRaster mutation primitiveとしてのみ残す。

Brush Engineをこれらの単純呼び出し列として設計確定してはならない。

Brush Production design must first define:

Input
→ Normalization
→ Reconstruction
→ Dynamics
→ Coverage generation
→ Tip/Texture
→ Color/Mixing
→ Compositing
→ Raster transaction

### 3.2 Current Command record is insufficient for Brush semantics

現在の `raster.tiles` operationは変更Tile数のSummaryであり、以下を表現しない。

- reconstructed path
- generated coverage/dab semantics
- dynamics inputs
- resource versions
- deterministic random seed
- source/canvas dependencies
- algorithm version

これはSlice 001の範囲では問題ないが、Brush implementation前に次を決める必要がある。

Candidate A:
- semantic Stroke record + canonical/materialized Raster representation

Candidate B:
- strict canonical Raster delta as durable truth + optional semantic Stroke record

Candidate C:
- bounded hybrid

Raw Pointer Eventだけを将来Brush Engineで再実行すればよい、という設計にはしない。

### 3.3 Preview / Commit identity

Realtime working resultとcommit後結果の意味を同じBrush Pipelineから得られる契約が必要。

Slice 001はこの契約をまだ持たない。

## 4. Persistence / Recovery issue to revisit

Current internal `RecoveryState` is only a placeholder.

Protected stateを単純なRevision ID最大値だけで最終設計してはならない。

Production Persistenceでは少なくとも:

- commit/order identity
- dependency closure
- required block/resource set
- durable acknowledgement

を考慮する。

Legacy資料にも同様の警告があるが、具体packet形式は継承しない。

## 5. Region / Shared Resolver implications

Slice 001はRegionを実装していないため直接衝突しない。

ただし後続で:

- Selection coverage
- Flood Fill query/result
- Lineart Region topology
- Persistent Region assignment

をLayer/Rasterだけへ押し込めない。

Shared Region ResolverとPersistent Region Entityは別責務として追加可能な構造を維持する。

## 6. Signed / overscan coordinate question

Current Raster mutation APIはDocument内の非負Tile/Pixelへ限定している。

現行Product requirementsではCanvas外Artwork/overscan編集をCore必須として確定していないため、**現時点では不具合とは判定しない**。

ただし将来:

- canvas外保持
- crop外Artwork
- transform overscan
- effect halo persistence

等をCanonical semanticsとして採用する場合、この制約は再設計対象。

過去資料のsigned Tile座標を理由だけに今変更しない。

## 7. PiP / Quick Controller implications

Slice 001はVisual UIを含まないため直接衝突しない。

重要なのは後続Core APIが:

- Command Search
- Quick Controller
- detached/context UI

から同じsemantic Commandを呼べること。

UI入口ごとに別Artwork operationを作らない。

## 8. Changes permitted later

Slice 001はCompatibility freezeしない。

後続設計のため必要なら以下を変更してよい。

- Command operation schema
- Persistence handoff
- Raster representation
- Tile profile
- coordinate model
- transaction dependency metadata
- history materialization strategy

User-facing file compatibilityが発生するまでは、内部API互換性を優先しない。

## 9. Decision

**Retain Slice 001 as provisional Production foundation.**

Do not proceed to Brush/Renderer/Persistence Production implementation solely because Slice 001 exists.

Next step is design completion/re-audit under:

- `PRODUCT_SPEC.md`
- `REDESIGN_PRINCIPLES.md`
- `CREATION_PROXIMITY_PRINCIPLES.md`
- `DESIGN_COMPLETION_GATE.md`
- Legacy Reference Policy
