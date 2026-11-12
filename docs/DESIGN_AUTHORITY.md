# Illustro — 正式設計の優先順位（アーカイブ版へ移行）

2026-11-12以降の新規設計・追加機能の基準は、アーカイブ版の最終設計文書群です。現行の旧設計を優先して新規仕様を作らないでください。

## 新しい正本

1. 製品理念: [PRODUCT_VISION.md](PRODUCT_VISION.md)
2. 機能の最終範囲（247件のうち236件が対象・限定対象）: [FINAL_PRODUCT_SCOPE.json](product-planning/FINAL_PRODUCT_SCOPE.json)
3. 製品の完成像: [FINAL_PRODUCT_SPEC.md](product-planning/FINAL_PRODUCT_SPEC.md)
4. 機能詳細: [features.json](product-planning/features.json)、[features/](product-planning/features/)、[REQUIREMENT_TRACEABILITY.md](product-planning/REQUIREMENT_TRACEABILITY.md)
5. 性能・軽さの設計: [UNIFIED_SYSTEM_DESIGN.md](performance-research/UNIFIED_SYSTEM_DESIGN.md)
6. 画面・操作の全体設計: [PRODUCT_ARCHITECTURE.md](product-architecture/PRODUCT_ARCHITECTURE.md)
7. システム詳細・機能間の連携: [SYSTEM_CONTRACTS.md](detailed-design/SYSTEM_CONTRACTS.md)、[NUMERIC_CONTRACTS_V1.json](detailed-design/NUMERIC_CONTRACTS_V1.json)
8. 設計の最終審査と未実施項目: [FINAL_DESIGN_AUDIT.md](detailed-design/FINAL_DESIGN_AUDIT.md)、[STAGE4_HANDOFF.md](detailed-design/STAGE4_HANDOFF.md)
9. 今後の区切り: [C01_C17_ROADMAP.md](roadmap/C01_C17_ROADMAP.md)

## 設計の出所

- 元リポジトリ: https://github.com/totoro0419/illustro-illustro_next_archive
- 参照ブランチ: implementation/stage4-c03-layers-history-persistence
- 取り込み元HEAD: ab1b2bea55d117e833edccf88ebc816a775afbe1
- 対象: アーカイブ版 docs/ 配下の全ファイル（画像・検証記録を含む）
- 同一ファイル確認: [ARCHIVE_IMPORT_MANIFEST.json](migration/ARCHIVE_IMPORT_MANIFEST.json)

## 過去の実装成果との関係

- 正式開発は現行リポジトリ totoro0419/illustro を継続。アーカイブのアプリ実装は移植しない。
- M01〜M10は合格済み。最終製品HEADは 4722710c623d8ed31722bc9d50cd645110f5716e、受入後の統合開始基準は d890e7cc9579305138bb4ea0513e7e4d6602db0f。
- 旧 docs/IMPLEMENTATION_CHECKLIST.md は受入履歴として保持し、旧M11の準備PR #67も勝手に破棄しない。
- 本設計の採用により実装済みコードが自動的に新仕様へ一致するわけではない。差分を確認し、機能単位で実装・検証する。
- 未解決の「描画直後の指入力停止」は、M10の合格対象外。修正済みと扱わない。
- 旧 docs/PRODUCT_SPEC.md や docs/FEATURE_SPEC.md、旧 architecture/UI正本は、履歴・既存コードの検証資料として保管するが、将来機能の設計上の優先権はない。
- すでに合格したコードや保存形式を新設計だけを理由に壊さない。変更時は旧作品の互換性と回帰を調べ、ユーザーの承認を得る。
- アーカイブ版の歴史的な「現在は第1段階」等の記述より、この移行記録とM10進捗を優先する。現在は第4段階の製品実装。
- 仕様の衝突時は、アーカイブ版の設計を目標にしつつ、現行の合格済み機能を保護する移行計画を作る。矛盾を隠して黙って旧実装へ戻さない。

## 開発方針

優先順位は「直感的操作 → 使いやすさ・軽さ・体感応答性 → 多機能」。他の主要ペイントアプリの公式仕様は必ず調査し、実機評価なしに動作合格としない。
