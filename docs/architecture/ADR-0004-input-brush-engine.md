# ADR-0004: Input / Stroke Reconstruction / Brush Engine

## Status

**Accepted for prototype**

## Architecture V2 supersession note

This ADR remains design history/detail. Where it conflicts with the current V2 contracts, [Brush ↔ Raster ↔ Renderer V2](BRUSH_RENDER_CONTRACT_V2.md) are authoritative.

## Date

2026-09-27

## Problem

Mouse/Touch/Stylusから高頻度入力を受け、低遅延かつ再現可能なStrokeへ変換し、Brush Dynamics、Random、Tip/Texture、Wet Mediaへ渡す。

## Independent analysis

直接pointermoveをBrushへ渡すだけでは次の問題がある。

- event frequencyがDevice/Browserに依存
- coalesced sampleの重複取得
- predicted sample混入
- pressure/tilt欠損
- view transform変更との競合
- stabilizationでRealtimeとfinalが変わる
- long strokeでraw sample保持が増え続ける

したがってInput Transport、Normalization、Stroke Reconstruction、Brush Sampling、Commit Semanticsを分離する。

## Decision

### 1. Platform Input Adapter

Main ThreadでPointer Eventsを受ける。

Input sourceは**性能Profileにより選択**する。

Default候補:

1. `pointermove.getCoalescedEvents()`
2. coalescedが得られない場合は親PointerEvent

`pointerrawupdate` は、高frequency入力が実際に必要で、かつCPU/Event-loop costを含めてinput-to-present改善が実測できたDevice/Profileだけで有効化するFast Pathとする。

Pointer Events Level 3自身もraw listenerが性能へ悪影響を与え得ると注意しているため、「利用可能なら常にraw」を禁止する。

同じ物理区間を複数event sourceから二重取り込みしない。

### 2. Predicted events

`getPredictedEvents()` 等による予測Sampleは**Canonical Strokeへ入れない**。

用途候補:

- cursor/ring overlay
- ephemeral stroke-tail visualization

予測が外れた結果を後からArtwork修正として見せる方式は原則避ける。

### 3. Normalized Sample

内部Sample:

```text
NormalizedSample
- sequence
- monotonicTime
- documentPosition
- devicePosition(optional)
- pressure
- tiltX / tiltY or altitude/azimuth
- twist/barrelRotation(optional)
- buttons
- pointerType
- contact state
- viewGeneration
- calibrationGeneration
- validity flags
```

wall-clockをStroke physicsへ使用しない。

### 4. Coordinate capture

Event受信時点のView Transform generationを記録し、Document coordinateへ変換する。

Pan/Zoom/Rotateと同時に描画しても、後で現在Viewを使って過去Sampleを再解釈しない。

### 4.1 Packed hot-path representation

Normalized SampleをJS object配列として大量生成することを標準にしない。

Hot PathはTypedArray/packed struct等の連続Bufferを候補とし、GC pressureとcopy量を測定する。

Sample propertyが利用されないDeviceでは不要field処理を省けるProfileを許容する。

### 5. Input transport

Primary候補:
- small bounded batched transferable buffers

Optional fast path:
- SharedArrayBuffer ring when cross-origin isolated

SABを必須条件にしない。

Down/Up/Cancel/buttons変化をbatch compressionで失わない。

### 6. Stroke Reconstruction

Pipeline:

```text
normalized samples
→ validity/calibration
→ stabilizer
→ path reconstruction
→ stable prefix + mutable tail
→ brush-distance/time sampler
→ generated stroke semantics
```

RealtimeとCommitで別Algorithmを使わない。

Tailは新sampleで更新可能だが、一度stableとしてemitしたprefixを毎frame全再計算しない。

具体Spline/FilterはBrush/Tool profileごとに比較検証する。

### 7. Dab placement

Dabはraw eventごとに一個とはしない。

spacing mode:

- arc-length
- time/exposure
- mixed rule（airbrush/wet等）

Sampling phaseをStroke recordで再現できるよう保持する。

### 8. Brush Dynamics

共通Mapping graph:

```text
Input source
→ normalize
→ optional curve
→ scale/range/invert
→ combine
→ target parameter
```

Input:
- pressure
- tilt
- azimuth/twist
- speed
- direction
- distance
- elapsed time
- random
- stroke phase

Target:
- size
- opacity
- flow
- spacing
- rotation
- scatter
- shape
- texture
- color
- wet/mix
- particles

### 9. Random

Committed strokeに使うRandomは再現可能にする。

Architecture requirement:

- stroke/semantic seed
- independent named streams
- counter/index based access or同等のorder-independent方式
- algorithm version

Thread数、Tile順、GPU workgroup順、cancelled preview回数でRandom結果を変えない。

**具体PRNGは未確定**。候補を統計品質、速度、WASM/WGSL実装容易性、cross-platform一致性でBenchmarkする。

### 10. Brush tip / texture

Brush definitionはResource ID/HashでTip/Grain/Paper等を参照する。

Runtime decoded textureはCache。

Stroke commitは使用Resource versionを固定する。

Resourceを後で編集して過去Stroke/Recoveryの意味が変わらない。

### 11. Canonical stroke semantics

Raw inputだけを再生して将来のBrush Engineで結果を作り直すことに依存しない。

Commit Recordは少なくとも:

- brush definition version
- normalized/reconstructed geometry or generated dab semantics
- dynamics result needed for replay
- random seed/stream version
- color semantics
- resource refs
- source dependencies for mixing
- selection/constraint snapshot reference
- algorithm version

Raw sampleはoptional diagnostic/re-edit sourceとして保持可能。

### 12. Long strokes

Raw sample/DabをStroke終了まで全てRAMに保持しない。

stable pages/chunksへstreamし、active RAMはbounded tailとworking setにする。

## Device interaction adaptation

### Pen + Touch

Penが観測された環境ではDefault drawing pointerをPenとする。

Pen active中のTouchはDefaultでPan/Zoom/Rotate等のGestureへ割り当て、Finger Drawingは明示設定で切替可能にする。

Touch contact sizeだけからPalmを確定するような強いheuristicを標準にしない。

### Mouse + Touch / Trackpad

Touch-enabled PCやTablet + Trackpadでは入力種類を排他的にせず、pointerTypeと実際のevent capabilityで処理する。

### touch-action / pointer capture

Canvas direct-manipulation領域はPointer Eventsのtouch-action semanticsを利用し、Browser viewport gestureとIllustro gestureの所有権を事前に明示する。

Stroke/drag中はPointer Captureを利用し、pointerがCanvas bounds外へ出てもinteraction continuityを維持する。

### Missing sensors

Pressure/Tilt/Azimuth等が利用できない場合、Brush Dynamicsは固定値/代替inputへfall backする。

unsupported fieldのdefault numeric valueを実Hardware measurementとして扱わない。

## External specification check

Pointer Events Level 3は2026-06-30にW3C Recommendationとなり、

- altitudeAngle
- azimuthAngle
- pointerrawupdate
- coalesced events
- predicted events

がLevel 3の追加要素として標準化されている。

ただし `pointerrawupdate` はhigh-frequency event処理自体がページ性能へ影響し得る。API capability detectionだけでなく**実行Profile**で選択する。

## Legacy reference review

過去資料でもauthoritative stream、predicted非Canonical、stable prefix/mutable tail、semantic seedを重視していた。

採用したのは上位原則。

継承しない:

- specific spline coefficients
- fixed quantization
- fixed seed/PRNG
- fixed tail length
- fixed batch size
- fixed worker ownership

## Validation plan

Input fixture:
- mouse
- 60/120/240Hz touch
- multiple stylus devices
- pressure-only changes
- identical positions with sensor changes
- cancel/lost capture
- simultaneous pan/zoom gesture
- long stroke

Measure:
- event→worker
- worker→GPU
- input→present
- sample duplication/drop
- canonical replay equivalence
- RAM growth


## Brush Engine First principle

Brush Engineは「Tipを一定間隔でStampする補助機能」ではなく、Illustroの描き味・応答性・表現力・再現性を決める中核Subsystemとして扱う。

Canonical conceptual pipeline:

```text
Input
→ Normalization
→ Stroke Reconstruction
→ Dynamics
→ Dab / Continuous Coverage Generation
→ Tip / Texture Evaluation
→ Color / Mixing
→ Coverage / Compositing
→ Canvas
```

設計上の優先事項:

- Pen入力を失わない
- PreviewとCommitで別意味にしない
- deterministic/reproducibleなCommitted Stroke
- Zoom / Tile境界で描き味を変えない
- fast/slow双方のStrokeで破綻しない
- large Canvasで性能崩壊しない
- Proceduralを優先候補とするがAsset排除を目的化しない
- advanced dynamicsがinactiveな時はnear-zero recurring cost

この原則は [Creation-Proximity Design Principles](../CREATION_PROXIMITY_PRINCIPLES.md) を継承する。

