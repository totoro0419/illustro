# Requirement Traceability Matrix

> Status: **Current traceability baseline**  
> Date: 2026-09-27  
> Goal: FEATURE_SPECの各主要領域が、どのInteraction Spec / Architecture Decisionで具体化されているか追跡する。

| FEATURE_SPEC area | Interaction / detailed spec | Architecture / policy | Current readiness |
|---|---|---|---|
| Document / Canvas | document-lifecycle.md; canvas-navigation.md | ADR-0001; ADR-0002 | A- |
| Input | INTERACTION_MODEL; brush-eraser.md | ADR-0004; ADR-0010 | A- / prototype numeric details pending |
| Brush Engine | brush-eraser.md | ADR-0004; PERFORMANCE_POLICY | A- |
| Dynamic Wet Media | backlog §1 | ADR-0002/0004 principles | C / P1 |
| Lineart Region | region-linked-coloring.md | ADR-0005 | A- |
| Lineart-linked Coloring | region-linked-coloring.md | ADR-0005; ADR-0003 | A- |
| Fill / Coloring | smart-fill.md | ADR-0005; ADR-0007 | A- |
| Color / Color Management | color-eyedropper.md | ADR-0006 | A- |
| Layers | layers.md | ADR-0001; ADR-0003 | A- |
| Vector | backlog §2 | ADR-0001; ADR-0007 | C / P1 |
| Text | backlog §3 | ADR-0001 | C / P1 |
| Selection | selection-transform.md | ADR-0007 | A- |
| Transform / Liquify / Warp | selection-transform.md | ADR-0007 | A- |
| Guides / Rulers / Shapes / Gradients | backlog §4 | FEATURE_SPEC baseline | C / P1 |
| Blend / Non-destructive | backlog §5 | ADR-0006; ADR-0007 | B- / P1 |
| Adjustments / Filters | backlog §6 | ADR-0007; ADR-0002 | B- / P1 |
| Healing / Patch / Clone | backlog §7 | FEATURE_SPEC baseline | C / P1 |
| Reference Workspace | reference-workspace.md | ADR-0001; ADR-0010 | A- |
| History / Snapshot / Layer Comp / Timelapse | history-snapshot-layer-comp.md | ADR-0003 | A- |
| Work Time | backlog §11 | FEATURE_SPEC baseline | C / P2 |
| Macro / Automation | backlog §8 | ADR-0003 command model | C / P1 |
| Quick Menu / Search | quick-menu-command-search.md | INTERACTION_MODEL | A- |
| Keyboard Shortcut | keyboard-shortcuts.md | Input/device policies | A |
| Workspace / Device Adaptation | INTERACTION_MODEL; backlog §13 | ADR-0010 | B+ / visual UI pending |
| Accessibility | INTERACTION_MODEL; backlog §14 | FEATURE_SPEC; ADR-0010 | B+ / per-feature QA pending |
| Asset Library | backlog §9 | PERFORMANCE_POLICY | C / P1 |
| Navigator / Multi-view | backlog §10 | ADR-0002 principles | C / P2 |
| Clipboard / Cross-document | clipboard.md | ADR-0001/0003 semantics | A- |
| Localization / i18n | LOCALIZATION_POLICY.md | Command stable-ID policies | A- |
| File Format / Persistence | document-lifecycle.md; save-recovery.md | ADR-0008 | A- |
| Autosave / Recovery / Offline | save-recovery.md | ADR-0008; ADR-0010 | A- |
| Performance | INTERACTION_MODEL §23 | PERFORMANCE_POLICY; audit | Policy A / benchmarks pending |
| AI Policy | product/feature policy | Offline/performance policy | A policy / feature UX later |
| Extension Policy | intentionally deferred | ADR-0009 boundaries | Future |
| Collaboration | intentionally deferred | ADR-0009 future boundary | Future |

## Readiness definitions

### A

主要なユーザー挙動が定義済み。UI visual designへ進める。

### A-

InteractionはUI設計可能。Exact visual layout、benchmark依存数値、minor default icon/gesture等が残る。

### B

主要方針はあるが、feature-specific final UIを作る前に追加Interaction decisionが必要。

### C

機能能力は定義されているが、Interaction Specが不足。

## Current conclusion

**Core painting interaction set is now largely A/A-.**

ただし、Full product UIを一度に完成設計するにはP1のVector/Text/Guides/Adjustments/Macro/Assets等が未詳細。

したがって:

- Core shell / core painting UI: interaction design ready
- Advanced feature final UI: not all ready
- Architecture prototype: ready, numerical performance unverified
- Full production implementation: not yet ready
