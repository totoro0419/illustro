# Illustro

Illustro は、**一枚絵を完成させる制作体験**に特化し、直感的操作・使いやすさ・高応答性・制作効率・高機能性を両立することを目標とするペイントアプリです。

> **「機能が多いアプリ」ではなく、「必要な瞬間に必要な機能が、最短操作で、即座に、自然に使えるアプリ」。**

## Current status

**仕様策定フェーズです。**

現時点では製品思想と機能要求を確定している段階で、本体実装はまだ開始していません。

UIも、内部能力とデータモデルが矛盾しないところまで設計を詰めた後、専用UI生成Skillを使用して設計します。

## Specification hierarchy

仕様の優先順位は次の通りです。

1. [Product Specification](docs/PRODUCT_SPEC.md) — 製品定義・絶対優先順位・設計思想
2. [Feature Specification](docs/FEATURE_SPEC.md) — 実装/UI設計で使う機能要求
3. [Feature Catalog](docs/FEATURE_CATALOG.md) — 全機能・調査対象のマスター一覧
4. `docs/features/*.md` — 個別機能の詳細仕様（今後作成）
5. UI / Architecture / Implementation specifications — 今後作成

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

Core architecture phases 1–9 are documented in [Architecture Overview](docs/architecture/ARCHITECTURE_OVERVIEW.md), with the complete ADR index in [docs/architecture/README.md](docs/architecture/README.md). The integrated consistency review is in [Architecture Integration Validation](docs/architecture/INTEGRATION_VALIDATION.md).

Architecture v0.2 is accepted for **prototyping**, not yet performance-validated. Runtime/backend/language/thread placement remains benchmark-driven.

## Development gate

本実装へ進む前に、少なくとも以下を詳細設計します。

1. Document / Layer Data Model
2. Tile Canvas / Render Pipeline
3. Undo / Command / Snapshot Model
4. Brush Engine / Dynamics
5. Lineart Region System
6. Color Pipeline
7. Selection / Transform
8. `.illustro` Native Format
9. Input / Device Abstraction
10. Autosave / Recovery

将来的な絵チャ・Realtime共同描画は、Core Illustro完成後のFuture Scopeです。
