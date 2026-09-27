# Architecture Integration Validation

> Date: 2026-09-27  
> Scope: ADR-0001〜ADR-0009の相互整合性検査  
> Result: **Architecture Baseline v0.2 is internally coherent enough to enter performance-focused prototyping.**  
> Important: 性能値は未実測。Prototype/Benchmark Gateを通るまで「性能達成済み」とはしない。

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

## 6. Raster / Tile / History integration — PASS with benchmark gate

Raster Revisionは:

- sparse tile manifest
- sealed tile
- bounded mutation record

を許容。

Undoはroot switch。

Materialization/GCはbackground。

矛盾なし。

未確定:
- logical tile size
- record compaction/materialization threshold
- compression

すべて実測対象。

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

## 13. WebGPU compatibility — PASS by fallback design

WebGPUをPrimaryにするが必須唯一Backendにしない。

Document semanticsはRenderer backendから独立。

ただしCompatibility backendで要求性能を満たせるかは未実測。

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

## 19. Current high-risk unknowns

優先Prototype順:

### P0 — before real editor implementation

1. **Realtime placement — initial decision measured:** Main-thread input/stroke coordination is the default; full Realtime Worker remains an optional measured path
2. coalesced pointermove vs pointerrawupdate when/if raw path is introduced
3. TypeScript vs Rust/WASM kernel placement and boundary overhead for representative heavy kernels
4. sparse tile representation + logical tile size + dirty-subrect strategy
5. canonical raster sealing strategy
6. OPFS journal batching/flush throughput and failure behavior
7. startup → first canvas / first stroke module-loading path

### P1 — before advanced painting

7. Brush dynamics evaluator + random reproducibility
8. high-radius brush / smudge dependencies
9. ICC engine accuracy/performance
10. effect tile halo/dirty graph
11. Region topology incremental repair

### P2 — before native-format freeze

12. .illustro container encoding
13. compression/hash
14. forward compatibility
15. PSD mapping/loss report

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

## 21. Acceptance gates for prototype phase

Architecture v0.2を実装Architecture v1へ昇格する条件:

- no correctness failure in revision/undo fault tests
- GPU loss does not lose protected artwork
- partial write never becomes valid current generation
- input sample duplication/loss rules validated
- cache eviction does not alter canonical output
- deterministic committed random fixtures pass
- Region ambiguity is preserved rather than silently forced
- ICC alpha invariants pass
- memory reaches bounded steady behavior under synthetic long session
- inactive feature idle-cost is near zero for Region/Wet/Soft Proof/advanced codecs
- startup/first-stroke does not wait for unused advanced modules
- worker/WASM placement is supported by measured benefit, not architecture preference
- at least one representative real-device profile supports the initial realtime placement decision
- full PC/Tablet/Smartphone latency/frame/memory validation is required before those environments are declared Supported, not before Core implementation

数値thresholdは測定データと製品UX要件から別途決定する。

## 22. Final result

現段階では:

- **機能設計とArchitectureに重大な責務矛盾は見つからない**
- **実装可能な構造へ落とせている**
- **性能達成は未確認**
- **数値・Algorithm細部はPrototypeで決めるべき状態**

したがって次の工程はUI生成ではなく、まずP0 Architecture Prototypeを実装して実測することが最も合理的。
