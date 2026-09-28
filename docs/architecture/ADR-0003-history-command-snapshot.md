# ADR-0003: Command / Undo / Redo / Snapshot / Timelapse

## Status

**Accepted — Architecture V1 technical baseline / Production continuation gated**

Production continuation is governed by [`DESIGN_COMPLETION_GATE.md`](../DESIGN_COMPLETION_GATE.md); this ADR status is not implementation authorization.

## Date

2026-09-27

## Problem

試行錯誤を高速に行えるUndoを中心に、Snapshot、Layer Comp、Macro、Timelapse、Autosave/Recoveryを混同せず統合する。

## Independent analysis

Inverse CommandだけのUndoは、Raster destructive operation、Region reconciliation、complex effect graphで逆演算が難しい。

毎回full snapshotはMemory/Storageが過大。

したがってRevision graphを主体とし、Commandは意味記録・Macro/Timelapse/diagnosticとして保持する。

## Decision

### 1. Transaction

Active interaction中はmutable/coalesced stateを許容し、sample/parameter updateごとにHistory transactionを増やさない。

Userが「一回のUndo」と認識する操作単位をTransactionとする。

例:

- one stroke
- one fill gesture
- layer reorder batch
- transform commit
- parameter drag (coalesced)
- macro execution（必要に応じsubstepsも保持）

### 2. Revision

Transaction commitで新Revision Rootを生成する。

```text
Revision
- revisionId
- parent(s)
- transactionId
- documentRootRef
- timestamp metadata
- author/actor metadata (future)
```

通常Local editはsingle parent。

将来mergeを可能にするため型として複数parentを妨げないが、今Realtime collaborationを実装しない。

### 3. Undo / Redo

Undo:
- current head → parent revision

Redo:
- remembered forward childへ移動

Undo後に新Edit:
- 新Branchを生成
- 旧Branchは即破棄せず、Retention policyに従う

UIで通常Redoが消えたように見せても内部GCとは分ける。

### 4. Command records

Commandは次を持つ。

- versioned command kind
- target stable IDs
- typed parameters
- source/resource refs
- deterministic/random semantic data where needed
- result/dirty summary

Raw pointer eventsをBrush resultの唯一の再構築源にしない。

### 5. Raster history

Raster mutationは:

- base tile blocks
- bounded mutation records
- periodic/background materialization

で保持可能。

Replay dependency costをcountだけでなくbytes/work/dependencyでBoundする。

Threshold数値はBenchmarkで決める。

### 6. Snapshot

Snapshot:
- user-defined name
- pinned Revision reference
- optional preview/notes

Snapshot自身はDocument copyではない。

必要なBlockをGCから保護する。

### 7. Layer Comp

Layer CompはRevisionではなくLayer state preset。

基本対象:

- visibility
- opacity
- blend
- optional transform/effect enable state

Artwork content versionとは分ける。

### 8. Macro

Macroは再利用可能Command template sequence。

Historyの過去Command列をそのままPointerとして保存せず、versioned macro definitionへ変換する。

### 9. Timelapse

TimelapseはHistory retentionと別Policyを持つ。

入力:

- semantic production events
- periodic composite checkpoints
- optional stroke metadata

UI event録画ではない。

History GCでTimelapse必要データを誤削除しない。

### 9.1 Hot / cold history

Recent Undoに必要なmetadata/tilesだけをRAM hot setとして維持し、Cold historyはOPFS等のlocal working storeへspill可能にする。

Undo depthを増やすために全History payloadをRAMへ保持しない。

History metadataも、UI表示に不要な詳細を常時materializeしない。

### 10. Retention / GC

固定「1000 undo」等をArchitectureで決めない。

Retentionは:

- memory budget
- storage budget
- pinned Snapshot
- current branch
- recent alternate branches
- recovery
- in-flight export/save
- timelapse policy

から決定する。

Resource pressure時はユーザー保護Stateを優先し、Cache→cold historyのRAM copy→policy上prunable historyの順に削減する。

### 11. History vs Recovery

History:
- creative navigation

Recovery:
- crash後にdurable stateを再構成

Undo可能だからRecovery済み、ではない。

Recovery保護点はPersistence workerのdurable acknowledgementで管理する。

## Legacy reference review

過去資料にもEntity/Revision/Transactionの分離、root-switch Undo、bounded materializationがあった。

上位原則は採用。

継承しない:

- recent 1000/200等の固定保持数
- fixed fragment thresholds
- specific persistent tree
- specific GC implementation

## Risks

- long-running brush transaction
- giant macro
- branching history storage
- resource version lifetimes
- effect parameter drag producing too many transactions

## Validation plan

- 100k transactions synthetic
- long stroke streaming
- undo across destructive fill/filter
- branch after undo
- snapshot pin + GC
- timelapse after history prune
- crash between logical commit and durable protection


## V1 implementation note

Production Vertical Slice 001 implements one Revision per committed user Transaction, root-switch Undo/Redo, alternate Revision retention after Undo + branch, and a parentIds[] shape that does not preclude future merge. Snapshot/Layer Comp/Macro/Timelapse and hot/cold History spilling remain unimplemented.
