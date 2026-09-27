# Architecture Integration Validation

> Date: 2026-09-28  
> Scope: ADR-0001〜0010 + P0 Architecture Prototype + V1 promotion gateの統合検証  
> Result: **Architecture V1 confirmed for Core implementation after a second audit.**  
> Important: V1はCore実装開始のArchitecture Gateを満たしたことを意味する。最終製品性能・全端末Support・Visual UI完成を意味しない。

## 1. Validation method

次を照合した。

- PRODUCT_SPEC
- FEATURE_SPEC
- FEATURE_CATALOG
- ADR-0001〜0009
- 過去資料参照Policy
- `ILLUSTRO_SECTION9_ALGORITHM_REVIEW_DRAFT(2).txt` の関連箇所
- 2026-09時点のWeb platform一次/公式資料

検証観点:

1. Canonical ownership
2. Undo/Save/Recovery responsibility
3. GPU/CPU consistency
4. Region/Selection separation
5. color/alpha correctness
6. long-session boundedness
7. offline persistence
8. device fallback
9. future collaboration boundary
10. UI requirementsとの矛盾

## 1.1 Performance-first re-audit — PASS WITH CORRECTIONS

旧Architecture Baselineは責務整合性は高かったが、軽量性より内部統一を優先しかねない箇所があった。

v0.2で以下を修正した。

- Rust/WASM全面Baseline → measured hot-kernel placement
- Dedicated Realtime Worker寄り → physical placement adaptive
- Web-first product lock → WebはPrototype baseline
- pointerrawupdate優先 → measured fast path
- active pure-immutable risk → mutable active transaction
- Region常時更新risk → lazy/demand-driven
- general ICC常時path risk → common fast path + lazy general fallback
- effect chain repeated evaluation → derived checkpoint/cache
- deep history RAM residency → hot/cold separation
- block hashing/flush overhead → optional hash + bounded batching
- advanced feature startup cost → lazy modules

詳細: `PERFORMANCE_AUDIT_2026-09-27.md` / `PERFORMANCE_POLICY.md`

## 1.2 V1 promotion — PASS after second audit

Predeclared promotion criteria: [V1_PROMOTION_GATE.md](V1_PROMOTION_GATE.md)

### First PASS

- GitHub Actions run: `36334997832`
- strict TypeScript: PASS
- Vitest: 24 tests / 11 files PASS
- Vite production build: PASS
- served Chromium: 4 / 4 PASS

### Independent second audit

First PASS後に次のhidden issueを検出した。

1. stale Raster transactionがreject前にorphan blockを作る可能性
2. dirty rect snapshotがconsume時に破壊される問題
3. Canvas context lockによるGraphics probe/fallback誤判定
4. torn Recovery tailをtruncateせず次のappendへ進む問題

すべて修正し、cross-gate adversarial testsを追加した。

### Second PASS

- GitHub Actions run: `36335428192`
- strict TypeScript: PASS
- Vitest: 29 tests / 12 files PASS
- Vite production build: PASS
- served Chromium: 4 / 4 PASS
- OPFS SyncAccessHandle actual backend: PASS
- torn tail repair + resumed append: PASS
- first-stroke lazy-load invariant: PASS
- WebGL2 actual draw/readback fallback: PASS

詳細: [V1 Second Audit Evidence](V1_SECOND_AUDIT_EVIDENCE.md)

## 2. Canonical State consistency — PASS

全ADRで次へ統一。

Canonical:

- Document structure
- stable entity identity
- committed raster valuesまたはbounded deterministic records
- vector/text
- region identity/topology decisions
- effect parameters
- color metadata
- command/revision roots

Non-canonical:

- GPU textures
- composite tile cache
- mip
- thumbnails
- decoded asset cache
- provisional pointer prediction

GPU Cache lossでArtwork lossしない。

## 3. Realtime vs final semantics — PASS with prototype requirement

Input/BrushとRenderで:

- same semantic stroke algorithm
- predicted input非Canonical
- GPU previewはDerived
- destructive raster canonical resultはsealing pathで固定

へ統一。

未確定:
- strict/reference materializerのexact numeric policy

Prototype必須。

## 4. Undo / History / Snapshot / Save / Recovery — PASS

明確に分離。

- Undo = Revision navigation
- History = Revision/Transaction graph
- Snapshot = pinned named Revision
- Layer Comp = layer state preset
- Save = portable project snapshot
- Autosave = working-store persistence
- Recovery = durable crash protection
- Timelapse = production history projection

同一概念への混同なし。

## 5. Selection vs Region — PASS

Selection:
- grayscale coverage
- arbitrary editing mask
- saved/active

Region:
- lineart topology
- stable identity
- lineage/assignments

Region→Selectionは可能。

SelectionをStable Regionとして自動採用しない。

## 6. Raster / Tile / History integration — PASS for V1

Raster Revisionは:

- sparse tile manifest
- sealed tile
- bounded mutation record

を許容。

Undoはroot switch。

Materialization/GCはbackground。

矛盾なし。

V1 resolved:
- standard logical Tile profile: 256
- memory-constrained candidate: 128
- 512 is not the universal default
- local dirty subrect
- ownership-transfer Canonical Raster sealing

Still deferred:
- record compaction/materialization threshold
- compression
- device-specific 128↔256 switch threshold

## 7. Brush / Random / History integration — PASS

Committed Brushは:

- versioned brush definition
- generated semantic record
- resource version
- reproducible random state

を保持する。

Thread/Tile/GPU orderingによるRandom変化を禁止。

具体PRNG未決定はArchitecture矛盾ではなくPrototype項目。

## 8. Region / History / Persistent Fill — PASS

Topology updateとRegion identity decisionはTransactionに含められる。

Persistent FillはRegion assignment。

Ambiguous/Conflictを明示Stateとして保持できる。

Undoで新Matcherを再実行せず、当時のdecisionを復元可能な設計。

## 9. Color / Render / Export — PASS with implementation research

Canonical color descriptorとdisplay transformを分離。

Pipeline:

```text
source → document working → composite → proof(optional) → display
```

Exportはdisplay/proof結果を無断焼き込みしない。

AlphaはICC conversionと分離。

未確定:
- ICC engine
- exact working representations
- blend compatibility formulas

## 10. Effects / Tile integration — PASS

Effectはfootprint/haloを持つNode。

Local effectはtile+halo。

Global effectはsummary/analysis stageを分離。

全Canvas再評価を必須としないInterfaceになっている。

## 11. Persistence / History — PASS

Persistenceは特定Revision snapshotとdependency closureを保存。

UI/Realtime headがSave途中に進んでも混在しない。

Partial writeをactive generationへしない。

## 12. Offline First — PASS

Core editingにnetwork dependencyなし。

OPFS:
- working store

.illustro:
- portable project

Cloud:
- optional future

へ分離。

## 13. GPU backend compatibility — PASS for V1

WebGPUをPrimary候補にするが必須唯一Backendにしない。

V1 selection order:
- WebGPU
- WebGL2
- Canvas2D / CPU compatibility

GitHub-hosted ChromiumではWebGPU adapterが利用できなかったためWebGPU hardware execution自体は未確認。一方WebGL2 actual draw/readbackとCanvas2D fallbackはserved-browser testでPASSした。

Document semanticsはRenderer backendから独立。

## 14. Cross-origin isolation dependency — PASS

SharedArrayBufferはoptional fast path。

非crossOriginIsolatedでもTransferable Bufferで機能成立。

したがってDeployment header失敗で作品編集不能になるArchitectureではない。

## 15. Long-session growth — PASS conceptually

無制限増加を許さない対象:

- raw stroke tail
- mutation replay
- GPU cache
- decoded assets
- temp filters
- history
- journal queue

具体Budget未決定。

Budget不足時にaccepted canonical commandをsilent dropしない。

## 16. Future collaboration — PASS

現在CRDT等は導入しない。

一方:

- stable IDs
- immutable revisions
- versioned commands
- deterministic semantics

により将来移行を不必要に妨げない。

## 17. UI compatibility — PASS

Architectureは以下を強制しない。

- fixed panel layout
- desktop-only interaction
- modal settings flow

Command/Context/Direct ManipulationをUIから呼べるAPI境界を持てる。

したがってDesktop/Tablet/Smartphone別UIを後から設計可能。

## 18. Legacy-reference contamination check — PASS

過去資料から上位知見は利用したが、以下を現行確定値として流用していない。

- Tile 256
- microtile size
- fixed matcher weights
- fixed gap thresholds
- fixed history retention counts
- fixed materialization count
- fixed worker count/topology
- fixed recovery time
- fixed CBOR encoding
- fixed PRNG

## 19. Current implementation-time unknowns

### Resolved before Core implementation

- Realtime placement initial default: Main Thread
- sparse Tile baseline: 256 standard / 128 constrained candidate
- Canonical Raster sealing ownership strategy
- OPFS Recovery framing / repair / resumed append
- Startup / First Stroke lazy-module boundary
- GPU backend fallback semantics

### Deferred without blocking Core implementation

- pointerrawupdate crossover if introduced
- representative heavy-kernel TypeScript vs WASM split
- exact device cache budgets
- brush dynamics constants
- ICC engine accuracy/performance
- effect halo/dirty graph tuning
- Region incremental repair thresholds
- portable .illustro physical encoding
- PSD mapping/loss report

These remain tracked decisions, but are no longer reasons to delay Core Editor implementation.

## 20. Prototype benchmark profiles

数値Targetはまだ保証しない。

実装前のArchitecture placement判断では、代表的な実Stylus端末で十分な根拠を得る。

Current evidence:
- Xiaomi tablet + Xiaomi pen
- Main/Worker双方をGitHub Pagesのserved harnessで実測
- User perception: meaningful differenceなし
- scheduling proxy: Main pathが低overhead

全Device classでの実機測定は、Core implementation後のSupport/Regression phaseで実施する。

Workloads:

- small ink brush
- large textured brush
- high-frequency stylus
- 4K / 8K / large sparse canvas
- 100 / 1000+ layers
- blur/effect stack
- flood fill
- Region update
- Undo spam
- continuous 1h synthetic edit
- save/export while painting
- storage pressure

## 21. V1 acceptance result

Architecture V1 promotion gate: **PASS after second audit**.

Evidence:

- [V1 Promotion Gate](V1_PROMOTION_GATE.md)
- [V1 First PASS Evidence](V1_FIRST_PASS_EVIDENCE.md)
- [V1 Second Audit Evidence](V1_SECOND_AUDIT_EVIDENCE.md)

Important remaining validation placement:

- PC / Tablet / Smartphone full compatibility = after Core implementation, before Support claims
- actual WebGPU hardware path = when a representative runtime exposes a usable adapter
- heavy-kernel WASM = when representative Production-like kernels exist
- final product performance SLA = on actual application and target devices

## 22. Final result

現段階では:

- **Architecture V1はCore implementation開始可能**
- **5つのpre-implementation GateはPASS**
- **一度目のPASS後に独立再監査を行い、4件修正後に再PASS**
- **Visual UIは別レーンでユーザーと共同設計する**
- **最終製品性能・WebGPU全端末動作・全端末Supportは未証明**

次工程はArchitecture再設計ではなく、V1 invariantを守ったCore Editor実装。
