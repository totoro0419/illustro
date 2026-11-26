# Illustro

一枚絵の制作体験を磨くペイントアプリです。優先するのは **直感的な操作 → 使いやすさ・軽さ・体感応答性 → 多機能性** です。

## 現在地（2026-11-23）

現在の開発対象は**第二ラウンド（R2）**です。実装は[Draft PR #110](https://github.com/totoro0419/illustro/pull/110)で管理中で、`main`へは未統合です。

- [R2公開プレビュー](https://totoro0419.github.io/illustro/r2-preview/)（ブラウザーでの起動は実機検査で確認）
- [R2実装状況](docs/roadmap/ROUND2-IMPLEMENTATION-STATUS.md)：143機能がコード上で実装済みとの記録。端末での受入確認とは別。
- [234機能の実機検査計画](docs/device-audit/00-TEST-PLAN.md)：R2の143機能＋既存保護91機能
- [234機能の検査結果表](docs/device-audit/01-RESULTS.csv)：初期値はすべて未検査
- [不具合と既知問題の台帳](docs/device-audit/02-DEFECTS.md)

過去のM01〜M10・C01〜C17のロードマップや旧検査は履歴として扱い、現在のR2の合格・不合格に自動反映しません。旧C01〜C17ロードマップはGit履歴で参照できます。

## 設計と仕様

- [正式資料の優先関係](docs/DESIGN_AUTHORITY.md)
- [製品仕様](docs/product-planning/FINAL_PRODUCT_SPEC.md)
- [正式247機能の採否](docs/product-planning/FINAL_PRODUCT_SCOPE.json)
- [機能の詳細](docs/product-planning/FEATURE_MASTER_CATALOG.md)
- [操作・画面](docs/product-architecture/PRODUCT_ARCHITECTURE.md)
- [軽量化・処理方式](docs/performance-research/UNIFIED_SYSTEM_DESIGN.md)
- [詳細な仕組み](docs/detailed-design/SYSTEM_CONTRACTS.md)
- [旧M01〜M10の受入記録](docs/IMPLEMENTATION_CHECKLIST.md)

## 開発

Node 24。依存導入後、描画エンジンとEditorを実行します。

```sh
npm ci
npm run brush:build
npm run editor:dev
```

製品仕様・コード実装・自動試験・実機受入はそれぞれ異なります。特に実機で確認していない機能は合格としません。
