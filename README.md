# Illustro

一枚絵の制作体験を磨くペイントアプリです。最優先は直感的な操作、次に使いやすさ・体感応答性、次に多機能性。

## 現在地（2026-11-12）

M01〜M10の正式製品機能はユーザー合格済み。現在は17チャンク方式へ移行しており、直近の開発対象は **C03の残り（レイヤー完成系、旧M11）** です。

- [新しい設計書の優先関係](docs/DESIGN_AUTHORITY.md) — アーカイブ版の設計に切替
- [現在地と全17チャンク](docs/roadmap/C01_C17_ROADMAP.md)
- [製品仕様](docs/product-planning/FINAL_PRODUCT_SPEC.md)
- [機能の採否（247件）](docs/product-planning/FINAL_PRODUCT_SCOPE.json)
- [軽量化・処理方式の設計](docs/performance-research/UNIFIED_SYSTEM_DESIGN.md)
- [UI・操作の設計](docs/product-architecture/PRODUCT_ARCHITECTURE.md)
- [詳細システム設計](docs/detailed-design/SYSTEM_CONTRACTS.md)
- [従来のM01〜M10の合格履歴](docs/IMPLEMENTATION_CHECKLIST.md)

アーカイブ元: https://github.com/totoro0419/illustro-illustro_next_archive / ブランチ: implementation/stage4-c03-layers-history-persistence / HEAD: ab1b2bea55d117e833edccf88ebc816a775afbe1

**重要:** 設計書の切替は実装済みコードの置換や完成を意味しません。旧版の合格済みコード、作品、QA公開、PR履歴は保持します。既存コードと新しい設計の食い違いは、機能ごとに調べて解消します。

## 開発

Node 24。依存導入後、BrushとEditorを実行します。

    npm ci
    npm run brush:build
    npm run editor:dev

M01〜M10の動作実績は旧実装基準を含む現行の試験・受入記録を参照します。
