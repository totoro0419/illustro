> **2026-10-30 現行製品仕様：** [FINAL_PRODUCT_SPEC.md](FINAL_PRODUCT_SPEC.md)／[247機能の採用・保留・対象外](FEATURE_SCOPE_FINAL_247.json)。完成対象236件・保留10件・対象外1件。色、非破壊変形、変形用仮画像、水彩簡素化の製品意味を確定した。以下の2026-10-27「案・未承認」表記は当時の資料状態であり、現行の採否は確定版に従う。実機性能や各細目のユーザー個別承認は未検証。

# Illustro 製品構想案の案内

調査・策定日：2026-10-27（JST）。状態：**製品仕様案・重要6方針はユーザー承認済み／その他未承認・未検証**。実装・性能達成を示さない。

[文書案内](README.md) · [判断台帳](DECISION_REGISTER.md) · [品質要件](QUALITY_REQUIREMENTS.md)


既存の上位文書は変更していない。本フォルダーは2026-10-27の製品構想案。重要6方針の承認記録は判断台帳にあり、それ以外の機能詳細は提案または検証待ち。まず要約と判断台帳を読み、機能と操作へ進む。

| 文書 | 内容 |
|---|---|
| [PRODUCT_PLANNING_SUMMARY.md](PRODUCT_PLANNING_SUMMARY.md) | 要約・重要改善・承認事項 |
| [PRODUCT_VISION.md](PRODUCT_VISION.md) | 完成時の体験・優先順位・対象用途 |
| [LEGACY_REQUIREMENTS.md](LEGACY_REQUIREMENTS.md) | 旧知見・ユーザー要求・矛盾 |
| [COMPETITOR_RESEARCH.md](COMPETITOR_RESEARCH.md) | 公式調査・機能/操作比較・導入判断 |
| [FEATURE_MASTER_CATALOG.md](FEATURE_MASTER_CATALOG.md) | 30分野247機能候補 |
| [EXPERIENCE_INNOVATION.md](EXPERIENCE_INNOVATION.md) | 制作フロー分析と25改善案、全20旧案の再評価 |
| [PRODUCT_INTERACTION_SPEC.md](PRODUCT_INTERACTION_SPEC.md) | 共通契約・30分野の操作・端末・失敗時 |
| [DECISION_REGISTER.md](DECISION_REGISTER.md) | 16判断の再評価、重要6テーマのユーザー承認記録 |
| [PRODUCT_AUDIT.md](PRODUCT_AUDIT.md) | 修正した矛盾・12項目審査・未検証 |
| [QUALITY_REQUIREMENTS.md](QUALITY_REQUIREMENTS.md) | 22品質要求と20受入シナリオ |
| [RESEARCH_SOURCES.md](RESEARCH_SOURCES.md) | 41公式出典の確認箇所と制限 |
| [LEGACY_SOURCE_LEDGER.md](LEGACY_SOURCE_LEDGER.md) | 34旧資料の読了範囲・固定HEAD/ハッシュ |
| [LEGACY_CATALOG_CROSSWALK.md](LEGACY_CATALOG_CROSSWALK.md) | 旧324項目全件の状態と新検討先 |
| [LEGACY_REQUIREMENT_CROSSWALK.md](LEGACY_REQUIREMENT_CROSSWALK.md) | 現旧要求218ID全件の再検討先 |
| [REQUIREMENT_TRACEABILITY.md](REQUIREMENT_TRACEABILITY.md) | 新247項目→操作/品質/判断 |
| [validation_results.json](validation_results.json) | 実ファイルによる構造検査の記録 |

データ版：[features.json](features.json)、[legacy_catalog.json](legacy_catalog.json)、[legacy_requirements.json](legacy_requirements.json)。これらは資料の検査・検索用であり、内部実装スキーマの確定ではない。

## 証拠と状態

旧参照HEAD `bdc7135b51033982d90ea5dad104bb04fc107df2`、新開始点`1f0ad19663198c3259165230ac96cba867951d41`。調査日はJSTで統一。上位要求と2026-10-27に承認された6方針を除き、個別仕様は提案または検証待ち。性能/実機/利用者テストの合格表示をしていない。

## 7工程の対応

旧調査→LEGACY群、競合→COMPETITOR/SOURCES、候補統合→CATALOG、改善→EXPERIENCE、詳細→INTERACTION/DECISION、再審査→AUDIT/validation、最終文書→本フォルダーとSUMMARY。実装順序・アルゴリズム・システム構成の採用は本案の対象外。

## 今回の個別仕様補強

[全247機能の個別仕様索引](REQUIREMENT_TRACEABILITY.md) · [12処理の非待機契約](NONBLOCKING_OPERATION_CONTRACTS.md) · [修正審査](PRODUCT_AUDIT.md)。本文とfeatures.jsonのdetailを同期する。最新の構造検査はvalidation_results.jsonで日時とファイルhashを確認する。

## 承認状況の読み方

ユーザーは2026-10-27（JST）に、Workが最後に承認を求めた6件（DEC-01/02/07/10/14/16）を許可した。[承認記録と確定範囲](DECISION_REGISTER.md#ユーザー承認済みの重要6判断)を参照。DEC-02は比較方針の承認であり、継続/休止の最終選定は実機検証後。`validation_results.json`は承認前に実施した文書検査の記録であり、承認後の検証を証明するものではない。
