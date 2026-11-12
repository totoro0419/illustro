> Classification: OBSOLETE / historical evidence; valid technical principles may be reused. Current authority: `docs/IMPLEMENTATION_BASELINE.md` and `docs/CANONICAL_INDEX.json`. Old stop/PASS/candidate declarations below apply to their recorded version only.

# Illustro Redesign Principles

> Status: **Canonical redesign doctrine**
> Date: 2026-09-28
> Priority: PRODUCT_SPEC > this document > FEATURE_SPEC / Architecture / Interaction / UI / Implementation
> Purpose: 過去Illustroの再実装ではなく、現在要求から新Illustroを再設計する際の判断原則を固定する。

## 1. Redesign rule

Illustroは基本的に新しく設計・実装し直す。

過去のコード、UI、数値、内部構造、実装方式を、そのまま継承すること自体を目的にしない。

継承候補にするのは:

- 解決すべき問題の捉え方
- 制作効率を高める設計思想
- 正確性・再現性・データ安全性の知見
- 性能上の失敗回避策
- 現在要求でも有効なAlgorithm原則

採用理由は「以前決めたから」ではなく、現在の要求・証拠・比較から改めて導く。

## 2. Mandatory decision order

重要設計は原則として次の順序で決める。

1. 現在の要求を確認
2. 問題を定義
3. 過去案を見ずに独立して候補を設計
4. 指定Legacy資料を確認
5. 過去案の理由・利点・欠点を分析
6. 現在の主要競合アプリの解決法を調査
7. 候補を比較
8. 現在でも優れた部分だけ採用
9. 必要ならPrototype / Benchmark / User test
10. 新Illustroの仕様・ADRとして決定

Legacy資料や競合製品は答えではなく、比較・見落とし防止・改善材料。

## 3. Canvas First / Direct Manipulation

制作時間の中心はCanvas。

高頻度操作では:

- 視線移動
- Pen/Pointer移動
- 操作Step
- Canvas占有
- Context切替

を減らす。

直接操作、Context UI、Quick操作、Gesture、Search、Workspace、Progressive Disclosureを優先し、機能削減で簡単に見せない。

## 4. Creation Proximity

共通原則:

> ユーザーが機能へ移動するのではなく、必要な機能・情報・処理能力が制作中のユーザーへ近づく。

この思想をPiP / Detachable Workspace、Brush Engine First、Quick Controllerへ適用する。

詳細は `CREATION_PROXIMITY_PRINCIPLES.md`。

## 5. PiP / Detachable Workspace

PiPはPicture-in-Pictureの意味に限定しない。

本質:

> Workspaceの一部を、一時的にCanvas中心の作業空間へ昇格させる。

対象候補:

- Inspector block
- Reference
- Layer関連
- Color
- Brush settings
- Contextual controls

候補方式:

- Dock / Detach / Redock
- Floating block
- Canvas-anchored overlay
- Popover
- Split View
- temporary pin

採用判断:

- Canvas離脱時間
- 移動距離
- Step数
- Canvas占有
- 誤操作率
- Pen/Touch適合性
- Device適合性

「PiP」という名前や過去Layoutは固定しない。

## 6. Brush Engine First

Brush Engineは中核Subsystem。

Conceptual pipeline:

Input
→ Normalization
→ Stroke Reconstruction
→ Dynamics
→ Dab / Continuous Coverage
→ Tip / Texture
→ Color / Mixing
→ Coverage / Compositing
→ Canvas

Brush結果が必要に応じて扱える入力/状態:

- position
- pressure
- tilt
- azimuth / twist
- velocity
- direction
- time
- stroke history
- tip
- texture / grain
- spacing
- rotation
- scatter
- flow
- opacity
- density
- accumulation
- mixing
- wetness
- canvas state

Quality:

- low perceived latency
- input sampleを性能都合で無断破棄しない
- committed resultの再現性
- Zoom/Tile境界非依存
- fast/slow stroke双方の安定性
- PreviewとCommitの意味的一致
- large Canvasでbounded work
- inactive advanced dynamicsはnear-zero cost

Procedural化は手段。Assetが優れる場合はAssetを使う。

## 7. Quick Controller / Spatial Command Surface

過去の六角形6ボタンは候補であり仕様ではない。

本質:

> 高頻度CommandをVisual SearchではなくSpatial Memory / Muscle Memoryで扱えること。

候補:

- Hex
- Radial
- Pie
- Arc
- Edge Controller
- Floating Toolbar
- Gesture
- Hybrid

評価:

- time-to-command
- travel distance
- error rate
- Canvas occlusion
- Pen/Touch compatibility
- handedness
- customization
- muscle memory formation

User-pinned slotはContextで予測不能に並べ替えない。

## 8. Lineart / Region as a core differentiator

Region問題を一段のFlood Fillへ縮約しない。

重要な分解:

Lineart Evidence
→ Boundary
→ Topology
→ Region
→ Stable Region Identity
→ Persistent Assignment / Fill

SelectionとRegionは別概念。

Lineart修正後も、可能な範囲で同じ制作上のRegionを追跡する。

## 9. Shared Region Resolver

Fill、Selection、Constraint、Lineart関連が、それぞれ似ているが微妙に異なる領域判定を持ち、結果が食い違うことを避ける。

共通化すべきなのは「機能UI」ではなく、必要に応じて:

- source snapshot semantics
- boundary policy
- connectivity
- tolerance/color predicate
- finite query domain
- gap/boundary correction
- incremental connectivity
- unresolved state

等のResolver基盤。

SelectionはResolver結果をCoverageへfreezeできるが、Persistent Region Entityと同一化しない。

## 10. Confidence / Ambiguity

自動処理が曖昧な場合、もっともらしい結果を無理にCurrentとして確定しない。

正式状態候補:

- Current / Resolved
- Updating / Pending
- Low Confidence
- Ambiguous
- Unresolved
- Rejected / Suppressed
- Retired / Orphan where applicable

User hint、manual correction、pin、retry等を設計可能にする。

古い異なるgenerationの結果をsilent fallbackとして正常値に見せない。

## 11. Live Preview / Non-destructive

Transform、Filter、Adjustment、Gradient等は可能な限りLive Preview。

RealtimeとApply後で別意味のAlgorithmを使わない。

非破壊化が妥当な処理は:

- re-edit
- bypass
- reorder where meaningful
- mask
- compare

を検討する。

## 12. Undo / History / Save / Recovery separation

以下を別責務として扱う。

- Undo / Redo
- History
- Snapshot
- Autosave
- Crash Recovery
- Durable Save

内部Primitive共有は可能だが、状態名・成功条件・User promiseを混同しない。

## 13. Canonical State / Cache separation

GPU Texture、Preview Tile、Composite Cache等をArtworkの唯一の正本にしない。

Canonical Artwork semanticsから再構築可能なDerived stateとして扱う。

GPU lossやCache evictionでArtworkを失わない。

## 14. Tile / Partial Update / Bounded Work

Canvas全体、Stroke全体、History全体を毎回処理しない。

候補:

- Sparse Tile
- dirty subrect
- incremental graph
- bounded active tail
- chunk/page streaming
- cache
- background scheduling

Hot PathをStroke長、History長、Canvas全体面積へ無制限に比例させない。

具体Tile Size等は現在のBenchmark/Architectureで決め、Legacy固定値を理由にしない。

## 15. Offline First

通常の描画・編集・保存はNetworkなしで成立させる。

Cloud / Server / CollaborationはOptional capability。

Server ACKをlocal artwork safetyの唯一条件にしない。

## 16. Device-specific UI

Desktop / Tablet / Smartphoneで同じUIを単純拡大縮小しない。

- PC: Mouse / Keyboard / Pen / Hover
- Tablet: Pen + Touch
- Phone: Canvas占有、片手到達、Touch-only completion

機能の意味は共通、入口・配置・Densityは適応可能。

## 17. Existing application research

対象例:

- CLIP STUDIO PAINT
- Procreate
- ibisPaint
- Krita
- Photoshop
- Affinity
- その他優れた制作ソフト

既存方式が優れているなら、独自性だけを理由に劣る方式を発明しない。

研究対象:

- workflow
- Brush
- Panel / Workspace
- Shortcut / Gesture
- Selection
- Transform
- Layer
- Color
- Fill
- non-destructive editing
- device adaptation

他社ソースコード、Asset、Icon、Brand表現を複製するのではなく、機能原理・操作原理・設計Patternを分析して再実装する。

## 18. Legacy reference

指定資料:

`ILLUSTRO_SECTION9_ALGORITHM_REVIEW_DRAFT(2).txt`

Reference only。Source of Truthではない。

現在でも有用と確認できる上位知見候補:

- RealtimeとFinalの意味的一致
- Input sampleを性能都合だけでsilent dropしない
- deterministic Random/Noise
- CanonicalとGPU cacheの分離
- bounded replay / bounded active work
- SelectionとRegionの分離
- Shared Region Resolver
- Ambiguous/Unresolved state
- Partial WriteをValid Recoveryとして扱わない
- long-session bounded growth
- typed/versioned semantic records

無条件継承禁止:

- 固定閾値
- 固定Weight
- 固定Tile Size
- 固定Worker topology
- 固定PRNG
- 固定Recovery packet
- 固定checkpoint interval
- 過去Hardware由来の性能値
- 旧UI/内部API

## 19. Design before implementation

Architecture baselineが実装可能でも、Illustro全体の設計完了とは限らない。

Subsystem実装へ進む前に、そのSubsystemについて少なくとも:

- problem
- user-facing semantics
- interaction contract
- data/canonical semantics
- failure/ambiguity behavior
- performance contract
- device behavior
- compatibility with Creation Proximity
- Legacy comparison
- competitor comparison where useful
- acceptance criteria

を確認する。

Visual UIはユーザーと共同設計し、専用UI Design Skillを使う。

## 20. Adoption test

新機能・新方式は最低限次で再評価する。

- 本当に制作速度が上がるか
- 本当に直感的か
- Canvasへの集中を守るか
- 誤操作を増やさないか
- Runtime costが妥当か
- Undo/Recovery/data safetyと整合するか
- より単純で優れた既存解決法がないか

独特さ、実装可能性、過去採用だけを採用理由にしない。
