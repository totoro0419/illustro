# Illustro 製品仕様確定版 — 静的監査記録

日付：2026-10-30 JST  
対象：[FINAL_PRODUCT_SPEC.md](FINAL_PRODUCT_SPEC.md)・[FEATURE_SCOPE_FINAL_247.json](FEATURE_SCOPE_FINAL_247.json)。本監査はGitHubの保存済みファイルをコネクタから読み出し、別手順のJavaScriptで比較したもの。アプリ・実機・競合アプリの再実測は行っていない。

## 独立に照合した事項

| 照合 | 結果 |
|---|---|
| PR #1の `features.json` と確定版のID集合 | 247/247一致、欠落・重複なし |
| 元の名称・分野・採否・仕様参照 | 247件で一致 |
| 分野数 | 30 |
| 正式完成対象 | 236 |
| 保留 | 10 |
| 対象外 | 1 |
| WETの上書き対象 | WET-002/003/004/005の4件だけ |
| D01/D02/D03/D05の追跡 | 製品仕様・状態台帳に記録 |
| 現行仕様への入口 | root README、製品README、統合設計、未決定台帳に追加 |
| 独立静的検査 | **15/15項目一致**。GitHubコネクタを通じた再読と比較 |

**件数詳細**：adopted 186、adopted_refinement 48、adopted_simplified 1、adopted_partial 1、deferred 8、deferred_advanced 2、out_of_scope 1。

## 合格が意味しないこと

- 機能236件の実装完了/利用可能/全端末対応
- R01/R02/R11等の負荷・入力追従・画質・保存の実機合格
- PSD等の完全互換、全GPU/CPUの出力同値
- 247機能の詳細をユーザーが一つずつ個別承認した事実
- 最適化方式の性能優越

## 検証の再現

現在の製品スコープ向け静的検査は `python docs/product-planning/validate_final_product_scope.py`。

このPythonスクリプトは**GitHubへ保存したが本監査では実行していない**。上の15項目は別のJavaScript照合による実際の結果であり、PythonのCI/PASSを意味しない。

旧 `docs/performance-research/validate_integration.py` は、**PR #3作成時に製品原本が未変更であること**を確認するための歴史的検査であり、今回の意図的な製品資料の更新後にそのまま全PASSすることは求めない。新仕様の照合は本ファイルと新検査器を優先する。

## 残る技術関門

[OPEN_DECISIONS.md](../performance-research/OPEN_DECISIONS.md)のD04/D06〜D18に従い、ブラシ方式、座標・色の数値契約、変形プレビューの速度、保存耐久性、入出力互換、キャッシュ・GPU/CPU競合、ユーザー操作体験を技術検証で閉じる。製品仕様の変更が必要になる反例は明示的に提案し、無断縮小しない。

## 引渡し状態

**製品仕様の決定を次工程へ渡せる状態（設計採用）**。技術詳細・性能・品質については条件付き。mainへの取り込みはPRレビュー後。
