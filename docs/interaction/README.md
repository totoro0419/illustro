# Illustro Interaction Specifications

> Purpose: ユーザーが実際にどう操作するかを、Visual UI生成前に固定する。

## Source hierarchy

1. ../PRODUCT_SPEC.md
2. ../FEATURE_SPEC.md
3. INTERACTION_MODEL.md
4. docs/features/*.md の個別Interaction Spec
5. Visual UI specification / generated design

Visual UIはInteraction Specを勝手に変更してはならない。

## Audit

- [Initial Gap Audit](INTERACTION_GAP_AUDIT_2026-09-27.md) — P0詳細化前の監査
- [Post-remediation Precision Audit](INTERACTION_REAUDIT_2026-09-27.md) — P0詳細化・矛盾修正後
- [Requirement Traceability](REQUIREMENT_TRACEABILITY.md)
- [Remaining Backlog](REMAINING_INTERACTION_BACKLOG.md)

## Canonical common model

- [Interaction Model](INTERACTION_MODEL.md)
- [Localization Policy](LOCALIZATION_POLICY.md)

## P0 detailed interaction specs

- [Document Lifecycle](../features/document-lifecycle.md)
- [Canvas / Navigation](../features/canvas-navigation.md)
- [Brush / Eraser](../features/brush-eraser.md)
- [Layers](../features/layers.md)
- [Color / Eyedropper](../features/color-eyedropper.md)
- [Smart Fill](../features/smart-fill.md)
- [Selection / Transform](../features/selection-transform.md)
- [Lineart Region / Linked Coloring](../features/region-linked-coloring.md)
- [Reference Workspace](../features/reference-workspace.md)
- [History / Snapshot / Layer Comp](../features/history-snapshot-layer-comp.md)
- [Quick Menu / Command Search](../features/quick-menu-command-search.md)
- [Keyboard Shortcuts](../features/keyboard-shortcuts.md)
- [Save / Autosave / Recovery](../features/save-recovery.md)
- [Clipboard](../features/clipboard.md)

## Current gate

Core painting interaction is sufficiently specified to enter **dedicated UI design/prototyping**.

This does not mean the full product UI is ready.

Advanced areas still requiring interaction detail are tracked in REMAINING_INTERACTION_BACKLOG.md.
