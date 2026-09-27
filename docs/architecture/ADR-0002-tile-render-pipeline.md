# ADR-0002: Tile Canvas / Render Pipeline

## Status

**Accepted — Architecture V1**

## Date

2026-09-27

## Problem

巨大Canvas、低遅延Stroke、非破壊Effect、64000% Zoom、大量Layerを同時に扱うRaster/Render architectureを決める。

## Independent analysis

単一巨大BitmapはCanvas Sizeに比例して更新/転送/保存コストが増える。

全Layerを毎frame全合成する方式も大量Layerで破綻する。

一方でTileを細かくしすぎるとMetadata、dispatch、seam処理が増える。

したがって**Sparse logical tiling + dirty dependency propagation + GPU derived cache**を採用し、Tile Sizeは実測で決める。小Brushの局所更新と大Filterのhalo処理を別subdivisionで扱い、単一Tile Sizeへ全処理粒度を強制しない。

## Decision

### 1. Logical Sparse Tiles

**1 dabごとに論理Tile全体をcopyしてはならない。** Active strokeではGPU working tile、dirty subrect、CPU staging/delta等を使い、commit/materialization時に必要な単位だけ固定する。

Raster SurfaceをDocument pixel座標のSparse Tile gridで管理する。

- empty/default tileは物理Blockを持たない
- dirty subrectを追跡
- tile border/haloが必要なfilterはdependencyとして要求
- logical tile sizeはRuntime Profileの実装詳細とし、Document identity / portable file semanticsを変えない

V1 standard profileは**256**。Memory-constrained profile候補として**128**を許容する。**512はUniversal Defaultにしない**。

### 2. Canonical raster representation

Commit直後から必ず全Tile bytesが完成している必要はない。

Canonical revisionは以下の組合せを許す。

- sealed materialized tile blocks
- bounded deterministic mutation/operation records
- source dependency closure

ただしreplay dependencyはBoundし、永遠にStroke先頭から再生する構造を禁止する。

### 3. GPU working state

GPU texture/atlasはDerived Cache。

GPU textureだけに存在する作品StateをCommit済みCanonicalとみなさない。

Realtime strokeはGPU working tileへ即時反映してよいが、同時にCanonical transaction semanticsを保持する。

### 3.1 Pay-for-use rendering

非表示Layer、無効Effect、未使用Region/Wet Media等はrender dependency graphへ常時参加させない。

高度Backend/Shaderは必要になるまでcompile/loadしない。Compatibility backendもstartup bundleへ必ず同梱・初期化するのではなく、capability failure時にlazy-load可能な構成を優先する。

### 4. Render graph

Render demandはViewportから逆引きする。

```text
viewport tile demand
→ document composite tiles
→ layer/effect tiles
→ source raster/vector/text
```

各Nodeは:

- input revision/dependency
- output tile key
- footprint/halo
- dirty generation

を持つ。

### 5. Dirty propagation

変更されたEntity / Tile / parameterから影響範囲だけinvalidateする。

Adjustment Layer等の広域作用もViewport demand単位でlazy evaluationする。

### 6. Mip / zoom

Zoom-outではderived mip pyramid/overview tilesを利用する。

Zoom-inでは元Raster pixelを補間して表示し、64000%で座標精度が崩れないようGPUへ大きなglobal float座標をそのまま渡さず、view/tile-local originを使う。

Pixel grid overlayはUI Derived。

### 7. Compositing

Canonical layer valuesはDocument working color modelで解釈。

GPU working representationはpremultiplied alphaを基本候補とする。

Canonical storageはhidden RGB保持のためstraight-alpha capableとする。

exact formatはColor ADRで決定。

### 8. Backend interface

```text
RenderBackend
- WebGPU primary
- Compatibility compositor (WebGL2 and/or CPU/WASM)
```

Backend差でDocument semanticsを変えない。

### 9. Realtime vs final

Realtime表示のために:

- lower resolution
-別Algorithm
-勝手なsample drop

を行い、Finalで別結果へ置換する方式を標準にしない。

許容するのは同じsemantic operationのDerived preview誤差。

### 10. Effect evaluation

Local filter:
- tile + halo

Global filter:
- explicit global dependency/summary stageを持つ

巨大一括JobをRealtime queueへ投入しない。

## GPU / Canonical boundary

GPU resultをCanonical bytesへ直接sealできるのは、定義したreference semanticsへ適合すると検証できる場合。

それ以外はCanonical recordを保持し、必要になった時またはreplay costがbudgetへ近づいた時だけbackground reference evaluatorでmaterializeする。

**全commit直後にstrict materializationを走らせる設計にはしない。**

すべてのEffectでbit-identical CPU/GPUを要求するのではなく、

- editable effect parameterがCanonicalな場合: render outputはDerived
- raster destructive resultがCanonicalになる場合: sealing pathで固定bytesを生成

と区別する。

## Legacy reference review

過去資料はLogical Tile、GPU cacheとCanonicalの分離、Replay chain boundを重視していた。

これらは採用。

不採用/再検討:

- 256×256固定
- microtile 32/64
- specific strict evaluator
- specific atlas packing
- fixed fragment count/byte thresholds

## External platform check

WebGPUは2026-09時点でもCandidate Recommendation Draftであり、Target Browser全てで無条件利用できる前提にしない。

OffscreenCanvas/GPUCanvasContextはWorker利用可能だが、V1のRealtime defaultはMain Thread上のinput/stroke coordination + lightweight render submissionとする。Full Realtime Workerは実測上有利なProfileだけのoptional fast path。

## Validation plan

Benchmark matrix:

- tile size candidates
- brush radius small/medium/huge
- 4K/8K/16K+ canvas
- sparse vs dense
- 1/100/1000+ layers
- blur halos
- zoom/pan churn
- GPU memory pressure
- WebGPU vs compatibility

測定:

- input-to-present
- frame p50/p95/p99
- tile upload bytes
- dispatch count
- working-set memory
- cache hit rate


## V1 promotion addendum

Architecture V1で次を確定した。

### Logical Tile

- standard profile: **256 × 256**
- memory-constrained candidate: **128 × 128**
- 512: Universal Default不採用
- Tile Sizeはportable .illustro semanticsではない

Deterministic fine/medium/large/long Brush workloadで128/256/512を比較し、256をtouch overheadとMemory/dirty uploadの折衷点として採用した。

### Dirty update

`consumeDirty()`はlive Tileのdirty stateをclearしつつ、Jobへ渡すdirty rectangle snapshotを保持する。

### Canonical sealing

- active tile = mutable working buffer
- published block = immutable
- existing Tileはfirst edit時にworking bufferへ1回copy
- seal時はownership transfer
- avoidable second full-tile copyは禁止
- stale transactionはownership transfer / store insertion前にreject

Second-pass representative workload:

- 48 revisions
- 192 changed tiles
- 256×256 RGBA8 payload
- working/transferred bytes: 50,331,648
- canonical read bytes: 5,242,880
- avoidable second seal copy: 0 by invariant/test

### Backend

V1 runtime selection:

1. WebGPU smoke success
2. WebGL2 actual draw/readback
3. Canvas2D/CPU compatibility

GPU state remains Derived. Device loss must not mutate Canonical Raster.

Evidence: [Architecture V1](ARCHITECTURE_V1.md) / [Second Audit](V1_SECOND_AUDIT_EVIDENCE.md)
