# Illustro — 第③段階 詳細設計の入口（2026-10-31）

**現時点の判定：NOT COMPLETE。監査19件中13件をStage③範囲で閉鎖、6件（P1=1/P2=4/P3=1）が残る。** このブランチではPR #8の監査を引き継いで設計修正・操作試作・根拠付き検査を追加した。第④段階の本格実装は開始しない。元の正式スコープを変更しない（30分野247機能、通常234・限定2・保留10・対象外1）。

## 必読順序・設計資料の優先順位

1. [製品理念](../PRODUCT_VISION.md) と [確定製品仕様](../product-planning/FINAL_PRODUCT_SPEC.md) および [現行採否JSON](../product-planning/FINAL_PRODUCT_SCOPE.json) — **機能と製品意味の最上位**。PR #4の代替分岐を現行#5より優先させない。
2. [第②段階の14方針と統合基本設計](../performance-research/UNIFIED_SYSTEM_DESIGN.md) — 設計原理、方式比較は [候補](../performance-research/CANDIDATE_DESIGN.md)。
3. [第③段階の既存アーキテクチャ](../product-architecture/PRODUCT_ARCHITECTURE.md)・[型案](../product-architecture/contracts.d.ts)・[操作フロー](../product-architecture/FLOWS_AND_STATES.md)。
4. [Stage③の補強したシステム契約](SYSTEM_CONTRACTS.md) と [変形後の描画・消去・混色](TRANSFORM_POSTPAINT_SEMANTICS.md)、[技術方式の比較・採否](TECHNICAL_DECISIONS.md)。
5. [247機能の詳細設計対応表](FEATURE_CONTRACT_CROSSWALK_247.json)（既存ソースからの機械集成。各機能の受入テストは**草案**であり、実行済の認定ではない）。
6. [UI/UXレビュー](UI_UX_REVIEW.md) と [操作できる単体HTML](../../qa/ui-prototype/index.html)（保存、画像処理は試作/模擬）。
7. [元の19指摘](../audits/findings.md) → [修正・検証台帳](AUDIT_REMEDIATION.md)／[JSON](AUDIT_REMEDIATION.json)。
8. [第④段階の試験とゲート](STAGE4_HANDOFF.md) → [今回の最終監査と根拠](FINAL_DESIGN_AUDIT.md)。

**優先関係のルール**：PR #5の製品能力は変えない。PR #8の反例は履歴を保持。今回の新しい型と演算意味の案は、より旧い抽象型の曖昧さを補うが、未検証の技術採用を確定しない。原典と衝突する場合、差分・意図・検証の有無を再監査し、無断で既定仕様を書換えない。

## リポジトリの位置づけ

設計PRの積み上げは #1 → #2 → #3 → #5 → #6 → #7 → #8 → **本作業PR**。#4は#5とは別の製品仕様確定案であり、この枝の直接親ではない。main は最新設計の正本ではない。ブランチは #8 HEAD 050574f6436d9116775ccee2e069c439e1631182 をベースにする。

## 実施できる検査

- Node: node qa/ui-prototype/tests.cjs （既存12のモデル試験）
- Node: node qa/ui-prototype/stage3-tests.cjs （追加12のモデル反例）
- Node: node tools/verify_stage3_design.cjs （元スコープ/247行/19指摘の一対一検査）
- TS: npx tsc --noEmit --strict --target ES2022 --lib es2022,dom docs/detailed-design/contracts-type-tests.ts
- Chromium: npm install --no-save playwright@1.56.1 && npx playwright install chromium && node qa/ui-prototype/stage3-browser-tests.cjs
- Python: python tools/build_ui_prototype.py && git diff --exit-code -- qa/ui-prototype/index.html

CIは .github/workflows/stage3-design-checks.yml。ブラウザーのviewport模擬は実機確認の代替ではない。GPU/Native/OPFS/ICCの形式的な実証はこの試作に存在しない。CIの結論と完成判定は [FINAL_DESIGN_AUDIT.md](FINAL_DESIGN_AUDIT.md) で必ず分離する。

## 今回の限定実験と再現

- `python experiments/stage3-reference/run_reference.py`：30のCPU参照。手計算画素/α、順序・失敗・保存モデル。
- `python experiments/stage3-reference/icc_probe.py`：実Little CMSによる限定ICC比較（liblcms2が必要）。
- `node qa/ui-prototype/final-browser-tests.cjs`：入口/8フロー/端末幅/文字/重心/焦点の追加回帰。
- `node qa/ui-prototype/catalog-browser-tests.cjs`：全247×4開始状態の既知ID実DOM詳細導線。製品機能の実装証明ではない。

[golden画素](../../experiments/stage3-reference/evidence/golden-pixels.json)・[参照図](../../experiments/stage3-reference/evidence/golden.svg)・[実行結果](../../experiments/stage3-reference/evidence/reference-results.json)。最終の採否と未閉鎖条件は[最終統合監査](FINAL_DESIGN_AUDIT.md)を読む。旧文書の「全件未閉鎖」「GPU必須でStage③閉鎖不可」は今回のユーザー指示と本台帳の範囲区分で更新した。
