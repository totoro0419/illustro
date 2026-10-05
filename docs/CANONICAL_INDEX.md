# 正本・試作・古い資料の一覧

唯一の開始入口は [IMPLEMENTATION_BASELINE](IMPLEMENTATION_BASELINE.md)。文書の優先関係をそこで固定する。機械検査用の [全ファイル分類](CANONICAL_INDEX.json) は一つのpathを一つの分類に割り当てる。

| 分類 | 意味 |
|---|---|
| CANONICAL | 現在の本番仕様。分野ごとの唯一のownerを下に示す |
| ACCEPTED PROTOTYPE | 採用予定の試作。製品統合/全実機合格とは異なる |
| EXPERIMENTAL | 研究・比較・検査証拠・未接続骨格。正本を上書きしない |
| OBSOLETE | 古い仕様/全体停止/成功宣言。証拠は残し本番の根拠にしない |
| FUTURE | 今回の必須範囲外、未調査・将来検討 |

| 分野 | 唯一の入口 |
|---|---|
| product | [PRODUCT_SPEC.md](PRODUCT_SPEC.md) |
| implementation | [IMPLEMENTATION_BASELINE.md](IMPLEMENTATION_BASELINE.md) |
| features | [FEATURE_SPEC.md](FEATURE_SPEC.md) |
| families | [FEATURE_SYSTEM_INTEGRATION_2026-10-04.md](FEATURE_SYSTEM_INTEGRATION_2026-10-04.md) |
| architecture | [ARCHITECTURE_V2.md](architecture/ARCHITECTURE_V2.md) |
| leftUI | [LEFT_UI_SPEC.md](ui/LEFT_UI_SPEC.md) |
| rightUI | [RIGHT_UI_SPEC.md](ui/RIGHT_UI_SPEC.md) |
| layerPage | [RIGHT_LAYER_PAGE_SPEC.md](ui/RIGHT_LAYER_PAGE_SPEC.md) |
| compactUI | [COMPACT_IMPLEMENTATION_BASELINE.md](ui/COMPACT_IMPLEMENTATION_BASELINE.md) |
| numericInput | [UI_INPUT_CONTROL_STANDARD.md](ui/UI_INPUT_CONTROL_STANDARD.md) |
| workspaceCustomization | [WORKSPACE_VISUAL_CUSTOMIZATION_SPEC.md](ui/WORKSPACE_VISUAL_CUSTOMIZATION_SPEC.md) |
| brushAdoption | [ADOPTION_BASELINE.md](brush-foundation/ADOPTION_BASELINE.md) |
| regionAdoption | [REGION_ADOPTION.md](architecture/REGION_ADOPTION.md) |
| performance | [FEATURE_PERFORMANCE_RESOLUTION_2026-10-04.md](architecture/FEATURE_PERFORMANCE_RESOLUTION_2026-10-04.md) |

V2のIdentity/Raster/Brush/Persistence/Region契約はArchitectureから参照する。旧UI詳細やHTML比較は補助証拠。Compact候補、旧HANDOFF_STATE、旧Architecture V1、旧ADRの停止やPASSを現在へ引き継がない。Core/Brush旧実装の有効部分は再利用するが旧保存schemaを製品で固定しない。

固定BrushとRaster Labはsource-lockで検査。全PRの役割は [PR_DISPOSITION](production-prep/PR_DISPOSITION.md)。カタログ内のInvestigateは採用確定ではなく、[FUTURE](FUTURE.md)も開始を止めない。
