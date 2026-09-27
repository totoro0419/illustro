# ADR-0009: Integrated Runtime / Ownership / Scheduling

## Status

**Accepted as Architecture Baseline v0.1**

## Date

2026-09-27

## Problem

ADR-0001〜0008を一つの実行Architectureとして統合し、UI thread、WASM、GPU、Worker、PersistenceのOwnershipとFailure境界を定義する。

## Current requirements

- 体感0ラグ
- Offline First
- Web/PWA候補
- 巨大Canvas
- 深いUndo
- Data loss防止
- GPU活用
- PC/Tablet/Smartphone
- Canonical StateとCacheの分離
- 過去Worker構成の無条件継承禁止

## Independent analysis

単一Main Thread architectureは描画、DOM、compression、Region、saveが競合する。

逆に機能ごとに大量Workerを固定すると:

- mobileでmemory増加
- scheduler overhead
- shared ownership複雑化
- device能力差へ適応しにくい

よって「固定Worker topology」ではなく、**Role-based ownership + adaptive execution lanes**を採用する。

## Decision

## 0. Physical placement is adaptive

以下のRoleは責務境界であり、**物理Worker境界ではない。**

Main↔Worker messaging、OffscreenCanvas、WebGPU Worker実装の性能は端末/Browserで異なるため、startup/profile benchmarkまたはknown-good capability profileで配置を選べるようにする。

候補:

- Main: UI + render submission / Worker: compute
- Main: UI only / Realtime Worker: input processing + render
- low-core mobile: Realtime + utilityを一つへ統合

内部システムを綺麗に分離するためだけにWorker hopを増やさない。

## 1. Main UI role

Main Threadの責務:

- DOM/UI
- accessibility tree
- Pointer Event capture
- keyboard/gesture dispatch
- platform dialogs
- command intent generation
- lightweight UI projection

禁止/回避:

- full-canvas raster
- ICC compilation
- large compression
- Region global solve
- huge hash scan
- blocking file I/O

Main Threadをauthoritative ownerにする必要はないが、**物理thread配置よりownership contractを優先する。** Worker hopが遅いProfileでは一部Realtime stateをMain側へ置く実装を許容する。

## 2. Realtime Engine role

Primary owner:

- current logical revision head
- command ordering
- active interaction state
- normalized input consumption
- stroke reconstruction
- brush semantic generation
- render demand
- GPU/compat presentation
- lightweight dirty scheduling

Implementation candidates:

- Dedicated Worker + OffscreenCanvas/WebGPU
- Main-thread GPU submission + Worker CPU kernels
- hybrid profile

Rust/WASMはCPU-heavy kernel候補であり、Realtime coordinator全体をWASMへ固定しない。

WebGPU不可の場合はcompatibility backendへ切替。

## 3. Persistence role

Persistence workerは:

- immutable block writes
- journal
- generation activation
- recovery validation
- compression/encoding pipeline coordination
- OPFS access

を所有する。

Realtime Engineとはimmutable packet/referenceで連携する。

Persistenceが遅い場合でも無制限queueを許さずbackpressureを返す。

## 4. Compute role

Region、strict raster sealing、ICC transform compile、large filter、codec等を実行するbounded pool。

Worker数は以下からRuntimeで決定:

- hardwareConcurrency
- memory/device profile
- active foreground workload
- backend capabilities

固定N workersをArchitecture contractにしない。

小さい端末ではsingle utility workerへ統合可能。

## 5. Canonical ordering

Canonical Command sequenceはRealtime Engine coordinatorが一意に順序付ける。

Compute job完了順やGPU dispatch完了順でDocument orderを決めない。

Background resultは:

- input revision/generation
- dependency IDs
- job generation token

を持ち、stale resultを判定する。

## 6. Messaging

Default:

- structured clone / Transferable ArrayBuffer
- immutable message schema
- versioned protocol

Optional:

- SharedArrayBuffer for high-frequency ring/large shared buffers under cross-origin isolation

SABなしでも正しく動作する。

## 7. Job classes

Semantic role:

### Realtime
input intake / stroke / active manipulation / present

### Required Visible
今見えている正しいframeに必要

### Commit
revision publication / canonical transaction closure

### Recovery Safety
durable protectionに必要

### Catch-up
derived composite/materialization/cache

### Analysis
Region/background/effect summaries

### Maintenance
GC / compaction / asset indexing

### Export
explicit output jobs

Priority番号やdeadline定数はRuntime Profile/Benchmarkで決める。

## 8. Backpressure

各Queueは最低限:

- count
- bytes
- estimated work
- temporary memory

をbudget対象にする。

### Drop/replace可能

- stale hover
- obsolete transform preview
- superseded parameter preview
- rebuildable cache job

### Drop禁止

- accepted canonical command
- pointer down/up/cancel relevant to accepted interaction
- revision commit
- durability acknowledgement
- explicit save/export snapshot identity

Overloadでsilent quality degradationしない。

持続不能な状態では安全境界で新しい編集受付を止め、storage/resource issueを明示する。

## 9. GPU scheduling

GPU queueは一般に投入後の任意preemptionを期待しない。

Background computeは小さなdispatch/jobへ分割し、Realtime presentationを長時間占有しない。

Pipeline/Bind Group/Resource cacheは再利用可能なDerived state。

## 10. Device loss

GPU device loss:

- GPU cacheを破棄
- Canonical current revisionとworking command recordsは維持
- backend再初期化
- visible tiles再生成

GPU-only artwork stateを持たないため作品を失わない。

## 11. Worker crash

Realtime worker crash:
- last durable Recovery watermarkから復旧
- protected後のunprotected interaction loss可能性を正直に表示

Persistence worker crash:
- active generation/journal validationから再開
- partial generationをcurrentにしない

Utility worker crash:
- immutable inputからjob再実行

## 12. Memory ownership

Memory accountを少なくとも分類する。

- canonical metadata
- canonical raster/block working set
- active stroke tail
- GPU cache
- decoded assets
- render/effect temporary
- region analysis
- persistence buffers
- export buffers

「総Memoryのみ」では原因を追えないためcategory telemetryを持つ。

## 13. Cache eviction order

基本順:

1. stale/rebuildable preview
2. cold GPU/composite cache
3. decoded resources
4. non-pinned derived summaries
5. policy上prunable history

Current artwork canonical blocks、recovery closure、pinned snapshotをCache pressureで捨てない。

## 14. Technology baseline

### UI
TypeScript + component UI frameworkを採用予定。具体frameworkはUI設計開始時に決める。

### Canonical/algorithm kernels

Rust → WebAssemblyは**有力候補**であり、全面Baselineではない。

WASMへ置く候補:

- Region / computational geometry
- raster/reference kernels
- ICC/codec
- heavy selection/fill kernels

TypeScriptへ残す候補:

- command orchestration
- lightweight metadata
- UI projection
- platform integration

採用基準はstartup、memory、copy量、call overhead、throughputの実測値。

内部実装言語の統一より実行コストを優先する。

### GPU
WebGPU/WGSL primary。

### Persistence
OPFS working store + portable .illustro container。

## 14.1 Lazy module loading

Startup bundleは最初のCanvas/Brush/Undo/Saveに不要なModuleを可能な限り分離する。

lazy-load候補:

- Region analysis
- general ICC engine
- Wet Media
- PSD/TIFF/EXR codecs
- advanced filters
- compatibility backend not currently selected
- future collaboration

First Drawがこれらのcompile/loadを待たない構成を優先する。

## 15. WebGPU fallback

WebGPU availabilityをstartup capability profileで確認。

Tier concept:

### Tier A
WebGPU + measured preferred render placement + fast paths

### Tier B
WebGL2/compositor + WASM CPU algorithms

### Tier C
CPU/WASM compatibility path

すべてDocument semanticsは共通。

Performance targetを満たすSupported Device範囲はBenchmark後に明示する。

## 16. Cross-origin isolation

SAB/WASM shared-memory fast pathを利用するProduction deploymentではCOOP/COEP等のcross-origin isolationが必要。

これはAsset/CDN/plugin strategyへ影響する。

初期Architectureでは:

- SAB optional
- external resourcesはCORS/CORP compatibilityを確認
- offline asset cacheと整合

とする。

## 17. Offline

Core editing pathはnetwork requestを必要としない。

Service Worker / application shell:
- static app assets
- fonts/resources as licensed/allowed
- versioned runtime

User artwork:
- OPFS / user native file

Cloud同期/CollaborationはCore dependencyにしない。

## 18. Collaboration future boundary

将来共同編集へ備え、以下を避ける。

- array index identity
- wall-clock only ordering
- mutable global singleton IDs
- commandがlocal object pointerを永続参照

ただしCRDT/OT/replication protocolを現段階でCoreへ導入しない。

## 19. Legacy reference review

過去資料にもRealtime/GPU worker、Persistence worker、utility pool等の案があった。

今回、責務分離の合理性は独立評価でも成立したため採用。

ただし以下は不採用:

- fixed worker topology as mandatory
- fixed priority lane numbers
- fixed deadline values
- fixed queue sizes
- fixed GPU submission budget

## 20. External platform constraints

- SharedArrayBuffer fast pathはcross-origin isolationが必要。
- OffscreenCanvasはWorker利用可能。
- GPUCanvasContextもWorker利用可能な実装があるがWebGPU自体はBaselineではない。
- OPFS SyncAccessHandleはDedicated Worker限定。

これらをcapability adapterで吸収する。

## 21. Decision summary

新IllustroのRuntimeは:

> **UI/Platform role + authoritative Realtime semantics + isolated Persistence responsibility + adaptive bounded compute + GPU derived presentation**

を基本形とする。

Worker数やGPU pathは環境依存、作品の意味は環境非依存を目標にする。
