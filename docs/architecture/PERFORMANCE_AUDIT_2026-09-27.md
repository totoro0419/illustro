> Classification: OBSOLETE / historical evidence; valid technical principles may be reused. Current authority: `docs/IMPLEMENTATION_BASELINE.md` and `docs/CANONICAL_INDEX.json`. Old stop/PASS/candidate declarations below apply to their recorded version only.

# Architecture Precision Audit — 2026-09-27

> Scope: 現在のIllustro仕様・Architecture成果物の精密検査  
> Audit priority: **実行時の軽量性 > 内部構造の美しさ**（正確性・データ安全性・製品要求を壊さない範囲）  
> Result: **重大な設計破綻は未検出。ただし過剰固定・常時コスト化リスクを11件検出し、Architecture v0.2へ修正した。**  
> Performance status: **未実測。軽量性達成を宣言しない。**

## 1. 検査対象

- PRODUCT_SPEC
- FEATURE_SPEC
- FEATURE_CATALOG
- LEGACY_REFERENCE_POLICY
- ARCHITECTURE_OVERVIEW
- ADR-0001〜0009
- INTEGRATION_VALIDATION
- 過去Algorithm Reviewの関連箇所
- 2026-09時点のPointer Events / WebGPU / OPFS / SharedArrayBuffer一次・公式資料

## 2. Findings

### P-AUDIT-001 — Rust/WASM範囲の過剰固定

**問題**

Canonical data structuresまでRust/WASM baselineとすると、JS↔WASM boundary、startup、memory ownershipが逆に重くなる可能性がある。

**修正**

WASMを全面BaselineからCPU-heavy/correctness-critical kernel候補へ変更。

Command orchestrationや軽量metadataはTypeScriptを許容。

**状態: FIXED**

### P-AUDIT-002 — Dedicated Realtime Workerの過剰固定

**問題**

Main→Worker message schedulingがinput latencyを増やすDeviceがあり得る。

**修正**

Realtime Roleとphysical Workerを分離。

Main-thread GPU submission / Worker compute等をProfileごとに選択可能にした。

**状態: FIXED**

### P-AUDIT-003 — Web-first product lock

**問題**

PWA候補を最終Runtimeとして早期固定すると、Native/Hybridの方が軽いPlatformでもArchitecture選択を歪める。

**修正**

Web/PWAはArchitecture Prototype baselineへ格下げ。

最終Runtimeは実測比較で決める。

**状態: FIXED**

### P-AUDIT-004 — pointerrawupdateの無条件優先

**問題**

Pointer Events Level 3はpointerrawupdate listener自体がperformanceへ悪影響を与え得ると注意している。

**修正**

coalesced pointermoveをDefault候補、pointerrawupdateを測定済みFast Pathへ変更。

**状態: FIXED**

### P-AUDIT-005 — Immutable設計のHot Path侵入

**問題**

Immutable Revisionの思想をStroke途中まで適用するとallocation/copyが増える。

**修正**

Published Revisionのみimmutable。

Active transactionはbounded mutable scratchを許容。

**状態: FIXED**

### P-AUDIT-006 — Region解析の常時追従

**問題**

全Lineart Stroke後にTopology更新を開始すると、独自機能が通常描画を重くする。

**修正**

Regionはpay-for-use。

Source editではdirty markを基本とし、Region-dependent feature demandまたはbudgeted backgroundで解析。

**状態: FIXED**

### P-AUDIT-007 — ICC汎用経路の常時利用

**問題**

Color-managed設計を「すべて汎用ICC evaluatorへ通す」と解釈すると高コスト。

**修正**

common-profile fast path、transform cache、lazy ICC compile、Soft Proof OFF時zero-work方針を追加。

**状態: FIXED**

### P-AUDIT-008 — Non-destructive Effectの再評価コスト

**問題**

Effect Graphが正しくても、深いStackを毎Frame再評価すれば重い。

**修正**

input revision + parameter generation keyed cache、derived checkpoint、visible-demand evaluationを明文化。

**状態: FIXED**

### P-AUDIT-009 — Deep HistoryのRAM肥大

**問題**

深いUndoと全History RAM常駐を混同する余地があった。

**修正**

Hot recent history / Cold storage-backed historyを分離。

**状態: FIXED**

### P-AUDIT-010 — Persistence hash/write amplification

**問題**

Immutable Block Storeをcontent-addressed/dedup前提にするとStrokeごとのhash/writeが増える可能性。

**修正**

allocated block ID + lightweight integrityを許容。

重いhash/dedupは必要性が実測された場合のみ。

flushもPersistence Workerでbatch。

**状態: FIXED**

### P-AUDIT-011 — Feature-rich startup cost

**問題**

Region/ICC/codec/filters等を起動時loadすると、高機能であること自体がstartup penaltyになる。

**修正**

First Draw Critical Pathを定義し、高度Moduleをlazy-load対象へ追加。

**状態: FIXED**

## 3. Existing strengths retained

修正不要と判断した上位構造:

- Canonical StateとDerived Cacheの分離
- Undo / Save / Recoveryの責務分離
- SelectionとRegionの概念分離
- Sparse Tile / partial update
- GPU-only Canonical stateを避ける
- reproducible committed random
- ambiguous Regionを強制確定しない
- OPFS working storeとportable .illustroの分離
- partial writeをvalid generationと扱わない

これらは軽量性とも矛盾しない。

## 4. Current unresolved performance risks

### Critical prototype items

1. Main-thread vs Worker input/render placement
2. TypeScript vs WASM kernel placement
3. coalesced pointermove vs pointerrawupdate
4. logical Tile Size
5. active stroke dirty-subrect strategy
6. GPU→Canonical sealing
7. WebGPU pipeline/dispatch cost
8. OPFS journal batching/flush
9. Region incremental topology cost
10. ICC fast/general path crossover
11. Effect cache memory vs recomputation
12. hot/cold history crossover

## 5. Must-not-assume list

以下を現時点で事実として扱ってはならない。

- Workerの方がMain Threadより必ず速い
- WASMの方がTypeScriptより必ず速い
- WebGPUの方がすべてのBrush/Filterで速い
- 256px Tileが最適
- content hashing/dedupが得
- Regionを毎Stroke更新しても十分軽い
- deep UndoをRAMに保持できる
- general ICC overheadが無視できる
- PWAがNativeより十分軽い

## 6. New performance gates

Architecture prototypeでは平均FPSだけでなく以下を測る。

- app start → canvas usable
- app start → first visible stroke
- pointer event → visible pixel
- p50 / p95 / p99 frame time
- GC pause / long task
- bytes copied per stroke
- CPU working set
- GPU memory estimate/proxy
- peak RAM
- steady-state RAM in long session
- OPFS bytes written per edit minute
- battery/thermal trend where measurable
- module load/compile time
- idle background CPU

## 7. Conclusion

旧Architecture Baselineは概念整合性は高かったが、**内部構造を綺麗に統一する方向へ寄りすぎる箇所があった。**

v0.2では、Semantic correctnessを保ちながら:

- lazy
- adaptive
- mutable-in-active / immutable-on-publish
- hot/cold separation
- fast path + general fallback
- role ≠ physical worker
- language ≠ architecture

へ修正した。

これにより「高機能なのに、使っていない機能の代金を通常描画で払わない」方向へ改善した。

ただし実アプリはまだ存在しないため、**軽量であること自体は未検証**。次のPrototypeで実測して初めて判定する。
