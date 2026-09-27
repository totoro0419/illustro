# ADR-0004: Input / Stroke Reconstruction / Brush Engine

## Status

**Accepted for prototype**

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

優先経路:

1. `pointerrawupdate` が適切に利用可能ならraw/coalesced入力として利用
2. それ以外は `pointermove.getCoalescedEvents()`
3. coalescedが得られない場合は親PointerEvent

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

### 5. Input transport

Primary:
- batched transferable buffers

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

## External specification check

2026-05のPointer Events Level 3 advancement proposalでは:

- altitudeAngle
- azimuthAngle
- pointerrawupdate
- coalesced events
- predicted events

がLevel 3の主な追加要素として列挙されている。

API capability detectionを行い、未対応Browserでfallbackする。

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
