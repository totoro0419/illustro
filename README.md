# Illustro

Illustro は、**一枚絵を完成させる制作体験**に特化し、直感的操作・使いやすさ・高応答性・制作効率・高機能性を両立することを目標とするペイントアプリです。

> **「機能が多いアプリ」ではなく、「必要な瞬間に必要な機能が、最短操作で、即座に、自然に使えるアプリ」。**

## Current status

**Core Architecture V2のCross-cutting設計は完了し、ユーザーレビュー可能な状態です。Production CoreはSlice 001まで実装済みですが、後続Production実装は明示許可まで停止しています。**

Architecture V1の実現可能性検証を土台に、Identity / Raster / Brush-Renderer / Persistence-Recovery / Region ResolverをArchitecture V2へ統合しました。V1の5つのArchitecture GateとSecond Auditは引き続き技術Evidenceとして保持します。

Production Coreの最初のVertical Slice（Document / Sparse Raster / Revision / Undo/Redo）は実装・検証済みです。Slice 001は [Final V2 Disposition](docs/implementation/CORE_SLICE_001_FINAL_DISPOSITION.md) によりRetain/Modify/Replace判定済みです。現在は [Design Completion Gate](docs/DESIGN_COMPLETION_GATE.md) に従い、Brush/Region benchmarkまたはUI共同設計へ進めますが、Production実装は保留です。

Visual UIはユーザーと共同で設計し、UI生成を行う場合は専用UI Design Skillを使用します。V2完了判定は [Design Completion Re-evaluation](docs/DESIGN_COMPLETION_REEVALUATION_2026-09-28.md) に記録しています。

## Specification hierarchy

仕様の優先順位は次の通りです。

1. [Product Specification](docs/PRODUCT_SPEC.md) — 製品定義・絶対優先順位・設計思想
2. [Feature Specification](docs/FEATURE_SPEC.md) — 実装/UI設計で使う機能要求
3. [Feature Catalog](docs/FEATURE_CATALOG.md) — 全機能・調査対象のマスター一覧
4. `docs/features/*.md` — 個別機能の詳細Interaction仕様
5. [Architecture V2](docs/architecture/ARCHITECTURE_V2.md) — 現在のCore semantic design baseline
6. [Architecture V1](docs/architecture/ARCHITECTURE_V1.md) — Prototype/feasibility evidence baseline
7. UI / Implementation specifications — 該当Gate後に具体化

過去Illustro資料の扱いは [Legacy Reference Policy](docs/LEGACY_REFERENCE_POLICY.md) に従います。
重要なArchitecture判断は [ADR Template](docs/architecture/ADR_TEMPLATE.md) を使って記録します。

下位仕様は上位仕様を具体化できますが、無断で矛盾してはなりません。

## Research

競合製品の機能や操作体系を、可能な限り公式一次資料から確認しています。

- [Competitor Matrix — Pass 1](docs/research/COMPETITOR_MATRIX.md)
- [Competitor Research — Pass 2](docs/research/COMPETITOR_PASS2.md)

調査対象には Clip Studio Paint、Procreate、ibisPaint、Krita、Adobe Photoshop、Affinity Photo 等を含みます。

既存アプリと異なること自体は目的にしません。優れた既存方式は積極的に研究し、一枚絵制作向けに再設計します。

## Core differentiators

- Lineart Region System
- Lineart-linked Coloring
- Smart Color Assist
- Advanced Smart Fill
- Procedural Brush System
- Dynamic Wet Media
- Reference Workspace / Reference Eyedropper
- Snapshot / Layer Comps
- History-based Timelapse
- Work Time
- Auto Actions / Macros
- Quick Menu / Direct Manipulation
- Device-adaptive UI
- 高度な非破壊編集を直感的に扱うUI

## Architecture

Current semantic design baseline is **Architecture V2 — Design Complete for Review**: [Architecture V2](docs/architecture/ARCHITECTURE_V2.md). Architecture V1 remains prototype/feasibility evidence and is not standing implementation permission. The architecture index is [docs/architecture/README.md](docs/architecture/README.md).

V1 promotion required five pre-implementation gates, a first PASS, an independent second audit, corrective fixes, and a second PASS. Evidence is in [V1 Second Audit Evidence](docs/architecture/V1_SECOND_AUDIT_EVIDENCE.md).

Runtime lightness rules are defined in [Performance-First Policy](docs/architecture/PERFORMANCE_POLICY.md), with the current audit in [Performance Audit 2026-09-27](docs/architecture/PERFORMANCE_AUDIT_2026-09-27.md).

PC / Tablet / Smartphone adaptation is defined in [ADR-0010](docs/architecture/ADR-0010-device-capability-adaptation.md), with [Device Compatibility Audit](docs/architecture/DEVICE_COMPATIBILITY_AUDIT_2026-09-27.md) and [Device Test Matrix](docs/architecture/DEVICE_TEST_MATRIX.md).

## Interaction Specifications

Core user interaction is defined in [Interaction Specifications](docs/interaction/README.md). The current post-remediation audit is [Interaction Precision Re-audit](docs/interaction/INTERACTION_REAUDIT_2026-09-27.md), with remaining advanced-feature decisions tracked in [Remaining Interaction Backlog](docs/interaction/REMAINING_INTERACTION_BACKLOG.md).

The core painting workflow is interaction-ready for dedicated UI design. Advanced-feature final UI remains gated by its interaction backlog.

## Specification Audit

The current comprehensive specification audit is [Specification Precision Audit 2026-09-27](docs/SPECIFICATION_AUDIT_2026-09-27.md).

## P0 Architecture Prototype

The first performance/architecture harness is in [`prototypes/p0-architecture`](prototypes/p0-architecture/PROTOTYPE.md). Current verified results and limitations are recorded in [P0 Architecture Prototype — Initial Harness](docs/prototypes/P0_ARCHITECTURE_PROTOTYPE.md).

## Development gate

**Cross-cutting Core V2 design gate: COMPLETE. Production authorization: LOCKED.**

Architecture V1 has verified baselines for:

1. Canonical Raster sealing
2. GPU / compatibility backend fallback
3. Sparse Tile / dirty rect / cache policy
4. OPFS Recovery
5. Startup / First Stroke lazy loading
6. measured initial Main-vs-Worker realtime placement

Second PASS:

- GitHub Actions run: \`36335428192\`
- strict TypeScript: PASS
- Vitest: 29 tests / 12 files PASS
- Vite production build: PASS
- served Chromium: 4 / 4 PASS

The next allowed phases are **Brush/Region benchmark prototypes and UI co-design** according to their gates. Production Core implementation does not resume until the user explicitly authorizes a scope.

Visual UI design proceeds separately with the user and uses the dedicated UI Design Skill.

Future realtime collaboration remains out of Core scope until the single-illustration editor is mature.
