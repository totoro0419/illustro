# Illustro Performance-First Policy

> Status: **Canonical engineering policy**  
> Date: 2026-09-27  
> Applies to: architecture, feature design, implementation, review, benchmark, UI runtime behavior

## 1. Priority

Illustroでは、正確性・データ安全性・要求されたユーザー体験を満たす範囲で、**内部システムの美しさより実行時の軽さを優先する。**

「綺麗な共通化」「全機能を同じ経路へ通す」「すべてを一つの言語/Worker/Graphで統一する」ことは、それ自体では採用理由にならない。

## 2. Pay-for-use

高度機能は、使っていない時に通常描画へ恒常的なコストを課してはならない。

原則:

- inactive feature: near-zero recurring CPU/GPU cost
- inactive feature: minimal memory residency
- inactive module: lazy load/compile where practical
- background analysis: bounded and preemptible/coalescible where practical

対象例:

- Lineart Region analysis
- Dynamic Wet Media
- general ICC profile transforms
- Soft Proof
- PSD/TIFF/EXR codecs
- advanced filters
- timelapse encoding
- future collaboration

## 3. Hot-path protection

次をHot Pathとみなす。

- pointer intake
- stroke reconstruction
- dab generation
- current visible tile update
- present
- brush switch
- color pick
- undo/redo
- pan/zoom/rotate
- layer visibility/switch

Hot Pathへ次を持ち込まない。

- full-document scans
- whole-history scans
- general-purpose serialization
- large compression
- global Region solve
- codec initialization
- general ICC compilation
- unnecessary cryptographic/content hashing
- per-sample persistent-tree allocation
- avoidable Main↔Worker↔WASM buffer copies

## 4. Published immutable, active mutable

Published Revisionはimmutableでよい。

しかしActive Stroke、parameter drag、transform drag等はbounded mutable scratch stateを使用可能とする。

Pure immutable implementationを維持するためだけに短命Object/Nodeを大量生成してはならない。

## 5. Copy budget

大量Bufferについて、各境界で以下を把握する。

- JS → Worker
- JS → WASM
- WASM → JS
- CPU → GPU
- GPU → CPU
- Persistence staging

「API上簡単だからcopyする」を認めない。

可能ならtransfer、shared view、persistent buffer、subrange updateを使用する。

ただしzero-copyという言葉自体を目標にせず、総latency/memoryが最小の方式を実測で選ぶ。

## 6. Allocation / GC

Realtime pathでObject-per-sample、Object-per-pixel、Object-per-dab等の大量短命allocationを避ける。

候補:

- packed TypedArray
- reusable arena
- pool
- bump allocation
- SoA/AoSのBenchmark比較

GC pauseをWorst Frame指標へ含める。

## 7. Thread / Worker policy

Role separationとphysical thread separationを混同しない。

Worker hopは無料ではない。

以下を実測する。

- message latency
- serialization/copy
- scheduling delay
- OffscreenCanvas behavior
- GPU submission latency
- mobile core pressure

Main/Worker配置はDevice/Profileごとに異なってよい。

## 8. WASM policy

WASMは目的ではなく手段。

採用条件:

- measurable throughput/latency benefit
- memory/layout benefit
- correctness/library benefit
- native reuse value

不採用/回避条件:

- startup compile costが大きい
- small-call overheadが支配的
- buffer copyが増える
- TS/JIT pathで十分速い

Region/codec/ICC等はlazy module化を優先する。

## 9. GPU policy

GPUは大量並列処理へ積極利用するが、GPUへ載せること自体を目的にしない。

避ける:

- tiny jobの大量dispatch
- huge non-preemptible background dispatch
- unnecessary readback
- GPU-only canonical artwork state
- inactive feature用resident textures

Shader/pipelineは必要時compileし、可能ならcacheする。

## 10. Region policy

Region Systemは通常Stroke Hot Pathをblockしない。

Source edit:

1. dirty bounds/generationを記録
2. foreground drawingを完了
3. Region-dependent operationが必要なら要求
4. background budgetがあればcoalesced update

Persistent Fill利用中でも、解析が追いつかない場合はUpdating状態を明示し、Stroke latencyを犠牲にしない。

## 11. Color policy

Color-managedであることと、毎Pixelで汎用ICC変換することを混同しない。

- common profile fast path
- transform/LUT cache
- brush color conversion cache
- soft proof only when enabled
- resource/tile lazy conversion

を使用する。

## 12. Effect policy

Non-destructive Effectは毎Frame全再計算しない。

- tile cache
- dependency generation
- viewport demand
- derived checkpoint
- materialized cache

を利用する。

明示Bake/Applyも性能上有効な選択肢として残す。

## 13. History policy

Deep Undoを全RAM保持と同義にしない。

- hot recent history: RAM
- cold history: local working storage
- pinned snapshot: protected
- derived cache: evictable

を分離する。

## 14. Persistence policy

各Strokeで同期flushしない。

Logical commitとdurable protectionを分け、Persistence Workerでbounded batchingする。

Recovery SLAとwrite amplificationを実測してcadenceを決める。

Hot Pathで全Blockのcontent hash/dedupを必須にしない。

## 15. Startup policy

First Drawまでに必要なものだけをCritical Pathへ入れる。

Startupで原則不要:

- PSD codec
- EXR codec
- Region solver
- Wet Media simulator
- Soft Proof engine
- advanced filter library
- unused fallback renderer

First Draw / First Brush responseを独立KPIとして測る。

## 16. Mobile policy

Desktopで問題ない構造でもMobileで不適格なら全体Baselineとはしない。

測る:

- memory high-water
- battery/thermal throttling
- background worker competition
- GPU resource pressure
- storage write cost

低Core/低Memory端末ではRole統合を許容する。

## 17. Performance evidence hierarchy

性能判断の優先順位:

1. target-device実測
2. reproducible benchmark
3. browser/OS/GPU profiler
4. algorithmic complexity analysis
5. vendor documentation
6.推測

推測値を保証値へ昇格させない。

## 18. Feature cost contract

新機能は最低限次を記録する。

- activation condition
- inactive recurring cost
- startup/module cost
- hot-path additions
- CPU cost
- GPU cost
- memory residency
- copy/serialization
- storage/write amplification
- invalidation granularity
- background jobs
- degradation/fallback behavior

このCost Contractが書けない機能は、Core architectureへ統合しない。

## 19. Acceptance

「Architectureが綺麗」はPASS条件ではない。

PASS条件は、要求された結果を正しく保ちつつ、対象端末で測定したlatency/frame/memory/storage/thermalが許容範囲に入ること。
