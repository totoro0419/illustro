# Illustro Architecture Overview

> Status: **Architecture Baseline v0.2 — Performance-first, accepted for prototyping**  
> Date: 2026-09-27  
> Scope: 新Illustroのコアアーキテクチャ。UIの視覚設計ではなく、Document / Render / History / Brush / Region / Color / Persistenceを統合する内部構造。  
> Important: 数値定数・Tile Size・Worker数・Cache容量・性能保証値は、Benchmark前には固定しない。

## 1. Architecture goals

新Illustroは次を同時に満たす必要がある。

1. Canvas First / Direct Manipulationを妨げない低遅延
2. 巨大Canvas・大量Layerでも局所更新できる
3. Undo / Snapshot / Timelapse / Autosave / Recoveryを混同しない
4. Raster / Vector / Text / Region / Effectを非破壊に保持できる
5. GPUを積極利用しつつ、作品のCanonical StateをGPU固有挙動へ依存させない
6. Offline First
7. PC / Tablet / Smartphoneへ適応可能
8. PWAとして成立可能
9. 将来Native wrapperや共同編集へ拡張可能だが、今それらを中心に複雑化しない
10. 過去Illustroとの内部互換性を設計制約にしない

## 1.1 Performance-first execution rules

Architectureの概念的な美しさより、実行時の軽さを優先する。

- **Inactive feature = near-zero recurring cost** を原則とする。
- 高度Moduleは必要になるまでload/compile/allocateしない。
- Published revisionはimmutableでも、active interactionまでpure immutableにしない。
- JS / WASM / Worker / GPU境界は固定思想ではなく実測costで決める。
- 小さなDocumentや単純操作へ、大規模Document用の重い仕組みを常時課さない。
- Background workはForeground latency、battery、thermal、memory budgetを超えて実行しない。
- 同じSemantic correctnessを満たすなら、抽象化が多少重複してもHot Pathが軽い案を選ぶ。

## 2. Runtime baseline

### 2.1 Prototype runtime baseline

最初のArchitecture Prototypeは **Web/PWA-capable runtime** で実施する。

ただし、これは最終製品RuntimeのLOCKではない。

Web prototypeを先に使う理由:

- PC / Tablet / Smartphoneで同じ実験を展開しやすい
- Pointer Events / Touch / Stylusを早期検証できる
- Offline / OPFS / PWA候補を検証できる
- WebGPUをGPU prototypeに利用できる

ただし最終Runtimeは、Web/PWA、Native shell、Hybridの実測比較で決める。

比較項目:

- input-to-present latency
- sustained frame time / thermal behavior
- memory
- startup / bundle
- stylus capability
- GPU feature/driver stability
- color management
- file I/O / recovery
- battery
- platform distribution/maintenance cost

Web APIへCore semanticsを直接埋め込まず、Native hostを選んでもDocument/Brush/Region/Historyの意味を再設計しない構造にする。

### 2.2 Language / module placement

**言語境界自体をArchitectureの目的にしない。**

Baseline policy:

- **TypeScript**: UI、DOM、Platform adapter、Command orchestration、軽量metadata処理
- **Rust → WebAssembly候補**: Computational geometry、Region、codec、reference raster、ICC等、実測で利益があるCPU-heavy / correctness-critical kernel
- **WGSL**: WebGPU fast path

Canonical data structureのすべてをWASMへ入れることは要求しない。JS↔WASM copy/serializationやstartup costが利益を上回る場合はTypeScript側へ置く。

WASM利用時も境界は粗粒度にし、Buffer ownershipを明確化する。Region、PSD、advanced ICC等の大きなModuleは可能な限りlazy-loadする。

Rustは有力実装候補だが、**性能測定前の無条件採用範囲は固定しない。**

## 3. Canonical state model

IllustroはStateを次の5種類へ明示的に分類する。

### A. Canonical Persistent State

作品の意味そのもの。

例:

- Document metadata
- Layer tree
- Raster canonical tiles / bounded mutation records
- Vector paths
- Text content/style
- Masks
- Effect parameters
- Region topology/identity/assignments
- Color profile
- Guides
- References metadata
- Layer Comps
- Snapshot references

### B. Canonical Transaction Records

作品を変更した意味のある操作記録。

例:

- generated brush stroke semantics
- fill result/query record
- transform command
- structural layer edit
- effect parameter edit
- region identity decision

### C. Derived State

Canonical Stateから再計算可能だが、ユーザーが見る結果へ必要。

例:

- composited layer tile
- Region spatial index
- effect dependency summary
- mip pyramid

### D. Cache

消えても作品を失わない高速化データ。

例:

- GPU textures
- decoded brush texture
- ICC LUT cache
- render pipeline cache
- viewport tile cache

### E. Preview-only State

Commit前の一時表示。

例:

- predicted pointer cursor
- transform drag preview
- provisional stroke tail

Preview-only stateをSave/Exportの正解として扱わない。

## 4. Top-level component model

```text
┌──────────────────────────────────────────────────────────────┐
│ UI / Platform Adapter (TypeScript, Main Thread)             │
│ DOM / Commands / Panels / Pointer capture / Accessibility   │
└──────────────────────────┬───────────────────────────────────┘
                           │ normalized input + commands
                           ▼
┌──────────────────────────────────────────────────────────────┐
│ Realtime Engine Role                                        │
│ Stroke/Brush/View + Render orchestration                     │
│ physical placement: Main or Worker, selected by profile      │
└─────────────┬──────────────────────┬─────────────────────────┘
              │                      │
        immutable jobs         persistence packets
              ▼                      ▼
┌──────────────────────┐   ┌──────────────────────────────────┐
│ Bounded Compute Pool │   │ Persistence Worker               │
│ Region / strict CPU  │   │ OPFS / journal / block store     │
│ ICC / filter / codec │   │ save/export snapshot             │
└──────────────────────┘   └──────────────────────────────────┘
              │                      │
              └──────────┬───────────┘
                         ▼
              Immutable Revision / Block Store
```

これは**論理的な役割分離**であり、物理Thread/Worker配置ではない。

Realtime EngineをDedicated Workerへ置くかMain Threadへ一部残すかも実測対象とする。Worker message latencyやbrowser compatibilityが不利な端末では、render submissionをMain Threadに置き、heavy computeだけWorkerへ逃がす構成を許容する。

利用可能CPU、Memory、cross-origin isolation、Platform制約に応じてCompute Pool数は変える。必要ならRoleを統合し、逆にDesktopでは分離する。

## 5. Renderer backend policy

### Primary

- WebGPU

### Compatibility

- WebGL2またはCPU/WASM compositingをPlatform capabilityに応じて選択
- 高度FilterがGPU非対応でもCPU/WASMで同じDocument semanticsを維持する

Fallbackで機能そのものを削るのではなく、性能差として扱うことを基本とする。

ただしTarget Deviceで要求性能を満たせない場合は、Supported Device Profileを明示する。

## 6. Data flow: brush stroke

```text
Pointer Events
  ↓
Platform Input Adapter
  ↓
Normalized Samples
  ↓
Stabilizer / Stroke Reconstruction
  ↓
Generated Stroke Semantics / Dabs
  ├─→ GPU working tiles → immediate presentation
  └─→ Canonical transaction record
          ↓
     strict/background sealing
          ↓
   canonical raster blocks + new revision
          ↓
 persistence/recovery protection
```

Raw eventsのみを作品の唯一の意味として保存しない。

## 7. Data flow: render

```text
Document Revision
  ↓
Layer/effect dependency graph
  ↓
Visible tile demand
  ↓
Dirty propagation
  ↓
Source tile/effect evaluation
  ↓
composite in document working domain
  ↓
optional soft proof
  ↓
display transform
  ↓
presentation surface
```

## 7.1 Inactive-feature policy

通常のRaster描画中に以下を自動常駐させない。

- Region topology analysis
- general ICC LUT compilation
- Wet Media state
- PSD/EXR codecs
- expensive global filters
- Timelapse video encoding

必要なTool/Document featureが有効になった時点でlazy initializeする。

Region source editは原則としてdirty generationを記録するだけで、通常Stroke commitをTopology再構築待ちにしない。

## 8. Data flow: Lineart Region

```text
Source Layers
  ↓
Evidence extraction
  ↓
Boundary model
  ↓
Gap hypotheses / manual corrections
  ↓
Planar topology
  ↓
Regions
  ↓
Stable identity reconciliation
  ↓
Persistent color/selection assistance
```

Selection Maskとは別Subsystemとする。

## 9. Persistence model

制作中:

- OPFSを高速なLocal Working Storeとして優先
- immutable blocks
- append-style recovery journal
- verified generation manifest

ユーザー可視Native File:

- `.illustro` 単一Container
- 明示Save/Exportは固定Revision snapshotから非同期生成
- PlatformがFile System Accessを提供する場合は直接Saveを利用可能
- 非対応Platformではimport/export方式を用いる

OPFSだけを唯一のユーザーファイルとしない。OPFSはOrigin storageであり、ユーザーが明示的に保持するProject fileとは役割を分ける。

## 10. Revision / History

- Entity ID: stable identity
- Revision: immutable document root
- Transaction: Undo grouping
- Snapshot: named/pinned revision
- Layer Comp: layer-state preset
- Macro: reusable command sequence
- Timelapse: independent production-history projection

これらを同一ID/同一概念へ統合しない。

## 11. Scheduling principle

固定Priority数値ではなくRoleで分類する。

1. Realtime input/present
2. Required visible work
3. Canonical commit/sealing
4. Recovery protection
5. Visible catch-up/cache
6. Background analysis/materialization
7. Export/maintenance

Queueは件数だけでなくbytes / estimated work / memory reservationでBoundする。

低優先Jobが巨大なnon-preemptible GPU dispatchを投げないようJobを分割する。

## 12. Determinism policy

### Must be reproducible

- Entity/Region identity decision
- command ordering
- generated stroke semantic record
- random sequence used by committed stroke
- Undo result
- persisted raster bytes once sealed
- file/recovery dependency closure

### May have bounded presentation variation

- GPU preview floating-point result
- intermediate antialias preview
- display conversion imposed by device/browser

Presentation variationがCanonical dataへ逆流してはならない。

## 13. Cross-origin isolation

SharedArrayBuffer / shared-memory fast pathは**optional optimization**とする。

Cross-origin isolationを利用可能なDeploymentではRing Buffer等に利用できる。

利用できない場合でもpostMessage + transferable bufferによって機能が成立しなければならない。

## 14. Current external platform facts

2026-09時点:

- Pointer Events Level 3は2026-06-30にW3C Recommendationとなり、pointerrawupdate、coalesced/predicted events、azimuth/altitudeを含む。ただし仕様自体がpointerrawupdate listenerの性能影響を警告しているため、raw pathを常時最優先にはしない。
- WebGPUはW3C Candidate Recommendation Draftであり、全対象Browserで無条件利用できる前提にはしない。
- OffscreenCanvasはWorkerで利用可能。
- OPFSはWorkerから利用でき、Dedicated Worker内のSyncAccessHandleによるin-place accessが可能。
- SharedArrayBufferはsecure context + cross-origin isolationが必要。
- Canvas/ImageDataのDisplay P3/float16機能は存在するが、互換性差があるためIllustro Canonical color pipelineの根拠にはしない。

## 15. Legacy reference review

`ILLUSTRO_SECTION9_ALGORITHM_REVIEW_DRAFT(2).txt` を、現在案を作った後に関連箇所だけ確認した。

再利用した上位知見:

- RealtimeとFinalで意味を変えない
- Canonical stateとGPU working/cacheを分ける
- Randomを再現可能にする
- RegionをEvidence→Boundary→Topology→Identityへ分解する
- Undo/Recovery/Persistenceを分離する
- unbounded replay/history/cacheを避ける
- ambiguous Regionを正常値として強制確定しない

継承していない具体事項:

- Tile Size
- numerical thresholds
- matching weights
- fixed retention counts
- Worker構成
- GPU evaluator details
- specific persistence encoding
- fixed queue/deadline values

## 16. Architecture gates before implementation

以下はPrototypeで実測してから数値確定する。

- logical tile size
- GPU microtile/workgroup
- input transport batch size
- materialization threshold / active transaction strategy
- cache budgets
- history/checkpoint threshold
- recovery journal cadence
- compression block size
- worker pool size
- Main-thread vs Worker realtime placement
- JS/TypeScript vs WASM kernel placement
- pointermove/coalesced vs pointerrawupdate crossover
- WebGPU vs compatibility backend crossover
- ICC transform/LUT strategy
- float/integer canonical raster trade-off

## 17. Phase status

1. Document / Layer Data Model — **Designed**
2. Tile Canvas / Render Pipeline — **Designed**
3. Command / Undo / Snapshot — **Designed**
4. Input / Brush Engine — **Designed**
5. Lineart Region System — **Designed**
6. Color Pipeline — **Designed**
7. Selection / Transform / Effects — **Designed**
8. Native Format / Autosave / Recovery — **Designed**
9. Integrated architecture validation — **Designed / validation recorded**
10. Device Capability Adaptation (PC / Tablet / Smartphone) — **Design PASS / runtime unverified**

詳細は各ADRを参照。
