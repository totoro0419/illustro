> Classification: OBSOLETE / historical evidence; valid technical principles may be reused. Current authority: `docs/IMPLEMENTATION_BASELINE.md` and `docs/CANONICAL_INDEX.json`. Old stop/PASS/candidate declarations below apply to their recorded version only.

# Architecture Decision Record Template

> File naming: `ADR-XXXX-short-title.md`

## Status

Proposed / Accepted / Rejected / Superseded

## Date

YYYY-MM-DD

## Problem

今回解決する設計問題を、実装方式を含めずに記述する。

## Current requirements

関連する `PRODUCT_SPEC.md` / `FEATURE_SPEC.md` の要求を列挙する。

## Constraints

現在のPlatform、Runtime、Performance、Memory、Offline、Device等の制約。

## Candidate approaches

### Option A

### Option B

### Option C

## Independent analysis

過去Illustro資料を読む前に行った分析を記録する。

- 利点
- 欠点
- Failure modes
- Complexity
- Performance characteristics
- Maintainability
- UX implications

## Legacy reference review

関連する場合のみ `ILLUSTRO_SECTION9_ALGORITHM_REVIEW_DRAFT(2).txt` を確認する。

### Relevant findings

過去資料の関連知見を要約する。

### Why the old design chose that approach

過去判断の理由を可能な限り特定する。

### Assumptions that still hold

### Assumptions that no longer hold

### Reusable higher-level lessons

### Details explicitly NOT inherited

固定値、特定Algorithm、Worker構成、Tile Size、GPU Pipeline等、無条件継承しない項目を書く。

## Current external evidence

必要に応じて最新の公式仕様・一次資料・論文等。

## Prototype / benchmark evidence

実測が必要な場合に条件と結果を記録する。

- Hardware
- OS
- Runtime
- Canvas size
- Pixel format
- Layer count
- Brush size
- Sample count
- Measurement method
- Results
- Variance / worst case

未実測の場合は **未実測** と明記する。

## Decision

現在の新Illustroとして採用する方式。

## Rationale

なぜ現在の条件で最も妥当か。

「過去と同じだったから」は理由にしない。

## Rejected alternatives

不採用理由。

## Canonical vs cache/state classification

この設計が扱うデータについて明記する。

- Canonical persistent state
- Derived state
- Cache
- Preview-only state
- Recoverable temporary state

## Determinism / reproducibility

Random、GPU、並列実行、再計算等が関係する場合に記述する。

## Undo / Save / Recovery impact

それぞれへの影響を分離して記述する。

## Performance cost contract

必ず記録する。

- activation condition
- inactive recurring CPU/GPU cost
- startup / module-load cost
- hot-path additions
- allocations / GC pressure
- buffer copies / serialization
- Main↔Worker hops
- JS↔WASM boundary cost
- CPU working set
- GPU residency
- storage write amplification
- background jobs
- invalidation granularity
- mobile/thermal implications
- lazy-load / fallback plan

「抽象化が綺麗」「一つの経路に統一できる」は性能上の採用理由にしない。

## Performance risks

推測と実測を分ける。

Hot Pathへ新しい処理を追加する場合は、追加前後を同一Benchmarkで比較する。

## Open risks

## Validation plan

何をもって設計をPASSとするか。

## Supersession

後に置き換えられた場合のADR番号。
