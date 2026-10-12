> Classification: OBSOLETE / historical evidence; valid technical principles may be reused. Current authority: `docs/IMPLEMENTATION_BASELINE.md` and `docs/CANONICAL_INDEX.json`. Old stop/PASS/candidate declarations below apply to their recorded version only.

# Interaction Specification Gap Audit — 2026-09-27

> **Lineart Layer reset notice (2026-10-01):** 旧 Lineart Region / Lineart-linked Coloring の評価・バックログは現在の進捗として無効。線画レイヤーとして再設計する。

> Scope: PRODUCT_SPEC / FEATURE_SPEC / FEATURE_CATALOG / Architecture v0.2 / existing feature specs  
> Audit question: **実装者またはUI designerが重要挙動を勝手に決めずに済むか**  
> Result: **Product/Architecture PASS, Interaction specification INCOMPLETE**  
> Scale: A = UI設計可能、B =主要方針あり・詳細不足、C =重要操作未定義

## 1. Executive result

FEATURE_SPECは35章・210個のRequirementを持ち、能力範囲はかなり明確。

一方、ユーザー操作の具体性は均一ではない。

特に不足していた共通項目:

- Entry point
- Default behavior
- Active/provisional state
- Commit/Cancel
- Undo boundary
- Error/conflict
- Tool switching
- Canvas navigation during operation
- Device-specific interaction
- Persistence class
- Long-running behavior

これを補うため `docs/interaction/INTERACTION_MODEL.md` を新設する。

## 2. Feature-by-feature audit

| Area | Grade | Priority | Main gaps before audit | Required action |
|---|---:|---:|---|---|
| Document / Canvas | B | P0 | create/open defaults, crop/resize commit, navigation gestures | detail spec |
| Input | B | P0 | arbitration mostly architecture-only | detail spec/inherit ADR |
| Brush Engine | C | P0 | brush select, size/opacity adjustment, temporary eraser, cancel/undo | detail spec |
| Dynamic Wet Media | C | P1 | wet-state UX, dry action, sampling/mixing interactions | detail spec later |
| Lineart Layer | RESET | P0 | dedicated structural area-partition layer; interaction redesign required | new design |
| Lineart Layer Area Fill | RESET | P0 | use corrected Lineart Layer areas as fill basis; details open | new design |
| Fill / Coloring | C | P0 | tool modes, drag semantics, long fill/cancel, reference source UX | detail spec |
| Color System | B- | P0 | picker model, recent/palette interaction, eyedropper hold behavior | detail spec |
| Layers | C | P0 | selection/reorder/clipping/group gestures, rename, context behavior | detail spec |
| Vector | C | P1 | node selection/edit workflow, tool switching | detail spec later |
| Text | C | P1 | creation/edit/commit/cancel, keyboard focus, missing-font UX | detail spec later |
| Selection | C | P0 | lifecycle, tool modes, deselect, moving selected content | combined detail spec |
| Transform/Liquify/Warp | C | P0 | enter/commit/cancel, mode switching, navigation during transform | combined detail spec |
| Guides/Rulers/Shapes/Gradient | C | P1 | creation/edit/delete/snap UX | detail spec later |
| Blend / Blend If | B- | P1 | mode browsing, preview, Blend If direct manipulation | detail spec later |
| Adjustments / Filters | B- | P1 | add/edit/bake/remove, live preview/cancel | detail spec later |
| Healing/Patch/Clone | C | P1 | source selection and gesture semantics | detail spec later |
| Reference Workspace | C | P0 | add/place/pin/group/hide/pick behavior | detail spec |
| History/Snapshot/Layer Comp/Timelapse | B- | P0 | history UI navigation, snapshot switch/branch confirmation | detail spec |
| Work Time | C | P2 | visibility/defaults/privacy/display UX | later |
| Macro / Automation | C | P1 | record start/stop, unsupported command behavior, rollback | detail spec |
| Quick Menu / Search | B+ | P0 | placement/activation gesture still pending; shortcuts detailed | detail spec |
| Shortcut | A- | P0 | visual layout pending only | ready for UI after common model |
| Workspace / Device adaptation | B | P1 | actual panel behavior/snap zones | later with UI |
| Accessibility | B | P0 | global rules exist; per-feature verification needed | inherit + UI QA |
| Asset Library | C | P1 | add/import/tag/replace/delete/conflict | detail spec later |
| Navigator/Multi-view | C | P2 | create view/sync/close/rotate semantics | later |
| File / Persistence | B | P0 | explicit save states, overwrite, loss reports | detail spec |
| Autosave / Recovery | B | P0 | user-visible recovery choices/status | detail spec |
| Performance | A policy | P0 | numeric targets require prototype | benchmark |
| AI policy | A policy | P2 | no current concrete feature UX | later |
| Extension | future | — | intentionally deferred | no action now |
| Collaboration | future | — | intentionally deferred | no action now |

## 3. Critical finding: architecture-detail ≠ interaction-detail

Input, Lineart Layer, Persistence等はADRが詳細でも、ユーザーから見た挙動は別途必要。

例:

Architecture:
- Lineart Layer state model is not yet designed

Interaction still needed:
- Updatingをどこに表示するか
- Userは描画を続けられるか
- Fill時に線画レイヤーが未生成・編集中の場合の挙動
- 接続・領域分けの誤りをどう直感的に修正するか
- correctionがUndoできるか

したがってADRをInteraction Specの代替にしない。

## 4. Critical finding: default behavior is under-specified

多くの機能で「設定可能」はあるがDefaultがない。

IllustroではDefault qualityが製品価値なので、特に以下はUI設計前にDefaultを固定する必要がある。

- finger drawing
- pen/touch arbitration
- fill reference source
- gap closing default
- selection persistence
- transform auto-commit behavior
- layer new-item placement
- clipping creation behavior
- reference interaction mode
- snapshot restore/branch behavior
- macro failure rollback
- autosave/recovery visibility

## 5. Critical finding: commit/cancel semantics are under-specified

P0:

- Crop
- Transform
- Liquify/Warp
- Gradient
- Lineart Layer correction
- Fill long operation
- adjustment/filter editing
- snapshot branch
- import/color-profile conversion

これらはUI visualより先に確定が必要。

## 6. Critical finding: tool-switching behavior is under-specified

Brush/Fill/Selection/Transform/Text等を跨いだ時:

- active operationをcommitするか
- cancelするか
- preserveするか

が統一されていない。

INTERACTION_MODELのTool Switching ruleを共通規則として採用し、例外のみ個別仕様化する。

## 7. Critical finding: navigation during active tools

Canvas Firstのため、Transform/Selection/Fill/Gradient/Lineart Layer correction中でも可能な限りPan/Zoomを許す必要がある。

TabletではPen Toolを維持したままTouch NavigationできることをDefaultとする。

この規則を共通Interaction Modelへ追加。

## 8. Critical finding: destructive/non-destructive UI distinction

Architectureでは区別できているがInteraction上:

- Live Filter vs Apply
- Transform node vs Bake
- Text editable vs Rasterize
- Vector vs Rasterize

の違いがユーザーへどう提示されるか未定。

P1で個別仕様化。

## 9. Device audit

PC/Tablet/Smartphone capability adaptation自体はADR-0010で十分。

不足はFeature-level mapping。

P0 detailed specsでは必ず各Device入口を記述する。

## 10. UI readiness

### Ready/near-ready after common interaction model

- Keyboard Shortcuts
- device adaptation principles
- performance/status indicators policy

### Not ready for final UI generation

- Brush
- Fill
- Layers
- Selection/Transform
- Lineart Layer
- Reference Workspace
- History/Snapshot
- Save/Recovery
- Quick Menu activation/placement

### Later-stage

- Wet Media
- Vector
- Text
- Guides
- Advanced filters
- Assets
- Multi-view

## 11. Required corrective work

Before full UI generation:

### P0 detailed interaction specs

1. Canvas / Navigation
2. Brush / Eraser
3. Layers
4. Color / Eyedropper
5. Smart Fill
6. Selection / Transform
7. Lineart Layer / Area Fill
8. Reference Workspace
9. History / Snapshot / Layer Comp
10. Quick Menu / Command Search
11. Save / Autosave / Recovery

Keyboard Shortcut spec already exists.

### P1 specs before implementing those advanced features

12. Vector
13. Text
14. Guides / Shape / Gradient
15. Adjustments / Filters / Blend If
16. Healing / Patch / Clone
17. Macro / Automation
18. Asset Library
19. Dynamic Wet Media

## 12. Gate

Full-product UI generation must not begin until P0 interaction specs exist and cross-check cleanly against Architecture.

Individual UI components may be prototyped earlier only when their own interaction spec is at grade A.
