> Classification: OBSOLETE / historical evidence; valid technical principles may be reused. Current authority: `docs/IMPLEMENTATION_BASELINE.md` and `docs/CANONICAL_INDEX.json`. Old stop/PASS/candidate declarations below apply to their recorded version only.

# Illustro Architecture Overview

> Status: **Architecture V1 — Confirmed for Core implementation**  
> Date: 2026-09-28  
> Scope: 新Illustroのコアアーキテクチャ。UIの視覚設計ではなく、Document / Render / History / Brush / Region / Color / Persistenceを統合する内部構造。  
> Canonical V1 decisions: [ARCHITECTURE_V1.md](ARCHITECTURE_V1.md)  
> Important: V1で確定したBaselineと、実装中に測定して決めるRuntime calibration値を区別する。

## 1. Architecture goals

新Illustroは次を同時に満たす必要がある。

1. Canvas First / Direct Manipulationを妨げない低遅延
2. 巨大Canvas・大量Layerでも局所更新できる
3. Undo / Snapshot / Timelapse / Autosave / Recoveryを混同しない
4. Raster / Vector / Text / Lineart Layer / Effectを非破壊に保持できる
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

Web APIへCore semanticsを直接埋め込まず、Native hostを選んでもDocument/Brush/Lineart Layer/Historyの意味を再設計しない構造にする。

### 2.2 Language / module placement

**言語境界自体をArchitectureの目的にしない。**

Baseline policy:

- **TypeScript**: UI、DOM、Platform adapter、Command orchestration、軽量metadata処理
- **Rust → WebAssembly候補**: Computational geometry、Lineart Layer analysis、codec、reference raster、ICC等、実測で利益があるCPU-heavy / correctness-critical kernel
- **WGSL**: WebGPU fast path

Canonical data structureのすべてをWASMへ入れることは要求しない。JS↔WASM copy/serializationやstartup costが利益を上回る場合はTypeScript側へ置く。

WASM利用時も境界は粗粒度にし、Buffer ownershipを明確化する。Lineart Layer analysis、PSD、advanced ICC等の大きなModuleは可能な限りlazy-loadする。

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
- Lineart Layer area-partition data and manual corrections（exact representation TBD）
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
- Lineart Layer structure edit

### C. Derived State

Canonical Stateから再計算可能だが、ユーザーが見る結果へ必要。

例:

- composited layer tile
- Lineart Layer derived analysis cache/index
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
│ V1 default: Main; full Realtime Worker is optional fast path │
└─────────────┬──────────────────────┬─────────────────────────┘
              │                      │
        immutable jobs         persistence packets
              ▼                      ▼
┌──────────────────────┐   ┌──────────────────────────────────┐
│ Bounded Compute Pool │   │ Persistence Worker               │
│ Lineart analysis / strict CPU  │   │ OPFS / journal / block store     │
│ ICC / filter / codec │   │ save/export snapshot             │
└──────────────────────┘   └──────────────────────────────────┘
              │                      │
              └──────────┬───────────┘
                         ▼
              Immutable Revision / Block Store
```

これは**論理的な役割分離**であり、物理Thread/Worker配置ではない。

V1ではPointer intake / active Stroke coordination / lightweight render submissionをMain Thread defaultとする。Full Realtime Workerは実測で明確な利点が出るProfileだけに限定する。PersistenceはDedicated Worker、Lineart analysis/codec/heavy filter等はbounded utility Worker lanesへ分離する。

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

線画レイヤー生成・再解析は通常Stroke commitの必須同期処理にしない。元Raster編集後の追従方式は未決定であり、旧Topology更新方式を前提にしない。

## 8. Data flow: Lineart Layer

> **Design reset:** 旧 Evidence → Boundary → Topology → Stable Identity → Persistent Fill の具体設計は現在のArchitecture決定ではない。

現在確定している完成目標だけを示す。

```text
Raster lineart layer
  ↓ explicit "create Lineart Layer"
lineart extraction / connection inference
  ↓
editable, thickness-free area-partition structure
  ↓ user correction of wrong connections / partitions
confirmed Lineart Layer structure
  ↓
Area-based Fill / Selection
```

未決定:
- extraction algorithm
- exact connection rules
- internal graph/region representation
- identity lifetime
- source-raster edit tracking
- incremental update strategy
- gap handling and thresholds

通常Brushの描画経路へこの未確定解析を常駐させない、という性能方針だけは維持する。


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

- Entity / Lineart Layer structure decision
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
- Lineart Layerの抽出・接続・領域表現は設計リセット済みとしてゼロから決める
- Undo/Recovery/Persistenceを分離する
- unbounded replay/history/cacheを避ける
- 線画レイヤーの自動判定結果をユーザー修正より優先しない

継承していない具体事項:

- Tile Size
- numerical thresholds
- matching weights
- fixed retention counts
- Worker構成
- GPU evaluator details
- specific persistence encoding
- fixed queue/deadline values

## 16. V1 resolved decisions and deferred calibration

### Resolved before Core implementation

- Realtime default placement: Main Thread
- Persistence: Dedicated Worker
- sparse logical Raster
- standard logical Tile profile: 256
- memory-constrained Tile candidate: 128
- 512 is not the universal default
- local dirty-subrect propagation
- Canonical Raster ownership-transfer sealing
- WebGPU → WebGL2 → Canvas2D compatibility order
- OPFS framed/batched Recovery with torn-tail repair
- first-draw lazy-module boundary
- TypeScript as default implementation language

### Deferred without blocking Core implementation

- exact per-device cache budgets
- worker pool count
- queue deadlines
- recovery batch timing/size calibration
- heavy-kernel TS/WASM split
- pointerrawupdate crossover if introduced
- ICC implementation
- brush / Lineart Layer extraction numerical constants
- portable .illustro physical encoding

These are Runtime/Profile or feature-specific calibration decisions, not missing Core architecture.

## 17. Phase status

1. Document / Layer Data Model — **Designed**
2. Tile Canvas / Render Pipeline — **Designed**
3. Command / Undo / Snapshot — **Designed**
4. Input / Brush Engine — **Designed**
5. Lineart Layer — **Design reset / not designed**
6. Color Pipeline — **Designed**
7. Selection / Transform / Effects — **Designed**
8. Native Format / Autosave / Recovery — **Designed**
9. Integrated architecture validation — **V1 promotion PASS after second audit**
10. Device Capability Adaptation (PC / Tablet / Smartphone) — **Design PASS; full Support regression deferred until implementation exists**

詳細は各ADRを参照。


## 18. V1 verification

Architecture V1 promotion evidence:

- First PASS: GitHub Actions run `36334997832`
- First-pass suite: 24 tests / 11 files + 4 served-browser tests
- Second audit found and corrected 4 hidden issues
- Second PASS: GitHub Actions run `36335428192`
- Second-pass suite: 29 tests / 12 files + 4 served-browser tests
- strict TypeScript: PASS
- Vite production build: PASS

Core implementation may begin under [Architecture V1](ARCHITECTURE_V1.md).
