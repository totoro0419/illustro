# 原典・照合・衝突の扱い

## 1. 基準版

| 資料 | 読んだ版 | 使用する内容 |
|---|---|---|
| [PR #1](https://github.com/totoro0419/illustro/pull/1) | `92daaf5ac23a015a834141f7d08275d903711404` | 製品原仕様247 ID、目的・個別パラメータ・操作・品質・過去の判断 |
| [PR #3](https://github.com/totoro0419/illustro/pull/3) | `7864be87360f94f6ce45e4c8aecd685a2325aa72` | `UNIFIED_SYSTEM_DESIGN.md`、全件研究対応、R01–R14、責務・版・依存・公開・保存 |
| [PR #5](https://github.com/totoro0419/illustro/pull/5) | `5baae5f0680f2a1a16247cbceef2fc0ccd4e5468` | `FINAL_PRODUCT_SCOPE.json`、`FINAL_PRODUCT_SPEC.md`の現行範囲とD01/02/03/05 |
| [PR #6](https://github.com/totoro0419/illustro/pull/6) | `a89d4642e2c763563ad3a70790d7e0f9ce9516d3` | Labソース・README・`HISTORY_PERF_FIX.md`・Handoff/History検査。今回の新ブランチの基点 |
| 旧リポジトリ既定資料 | `bdc7135b51033982d90ea5dad104bb04fc107df2` | README、仕様階層、interaction、architecture、legacy reference policy |
| [旧UI実装](https://github.com/totoro0419/illustro_old/tree/e04d3e29ab162d487d0c774524323bf49c684a4d/apps/editor/src/ui) | `e04d3e29ab162d487d0c774524323bf49c684a4d`（M09） | 実装済みRail、12 Box、固定5操作、Layer Page、幅変更・コンパクト化・Aurora色。停止中の最新実験を旧UIの唯一の正解にしない |

新旧のREADMEと開発手順、旧UIに関係する仕様と実装を読んだ。対象checkout内で `AGENTS.md` は見つからなかった。旧の「PASS」「実装停止」「専用UI生成」等は当時の工程記録で、新リポジトリに対する今回の設計・プロトタイプ許可を無効にする指示として移植しない。

旧UIを実機起動した／未閲覧の画像を確認した、とは記録しない。今回のレイアウト継承は旧のソース実装と仕様の直接確認が根拠。試作の風景図は導線を見るための新規SVGサンプルであり、旧UI画像の再現ではない。

## 2. 確認した14方針

`R01_USER_DIRECTION`、`R02_USER_DIRECTION`、`R03_DESIGN_DECISION`、`R04_USER_IDEA`、`R05_DESIGN_DIRECTION`〜`R14_DESIGN_DIRECTION`と`feature_integration.json`を参照。台帳のresearch配列で各機能へ接続する。ユーザー承認済の方向・AI推奨・性能未実証を混同せず、R10/11の製品意味に限ってPR #5の後続決定を優先する。

| 方針 | 本設計への接続 |
|---|---|
| R01/02 | Input/Viewと正式Jobを分離、受理筆FIFO、同世代で仮寄与を置換 |
| R03 | Brushの意味的入力共有、特性別評価器。経路選択は未検証 |
| R04 | 原線・仮境界・作者判断・塗り/選択を分離 |
| R05/06 | 入出力域、依存付きdirty、同値な合成区間、資源予約 |
| R07/08 | 不変root、差分履歴、固定保存境界、用途別pin、通常全面再演禁止 |
| R09 | 固定Rail/Workspace/Quickと必要時Context、同じactionへ複数入口 |
| R10/11 | 色/α/精度契約、変形原本＋後段描画＋独立仮画像 |
| R12 | 高度水彩の非必須化。通常混色・簡易水彩・紙目を保持 |
| R13/14 | 形式能力と版固定の出力、宣言だけの入口、需要時起動 |

## 3. 実機研究の証拠範囲

PR #6の報告を読み、ユーザー提供の `illustro-history-2026-10-30T14-44-01-770Z.json` の先頭状態・interaction集計・8自動テスト・limitationsも直接読んで照合した。

- raw summaryで `touchEventsDuringWork=790`、`pointerCancels=0`、最大JS受付差63.30000019073486ms、最大rAF間隔55.60000000000218msを確認。
- 最終Revision12/5筆、saveVerified=true、sameAsReference=true、saved/display/reference hash一致を確認。
- 記録された8件のpassed=true、人工待機2000ms、単一448×320 CPU処理、GPU/Worker/複数層/Native実装なしというlimitationsを確認。
- **今回、生イベント全954件の再集計やAndroid実機の再試験はしていない**。p95/p99等の再集計値は既存報告の値であり、このPRの独立再測定とはしない。キャッシュされた集計の値と実際の全イベント分布は別の証拠段階。
- `history.html`の状態照会と同期更新の構造を参照。CPU Labの修正例から、製品ではStatusSnapshot読み取りが全画素評価を誘発しない責任境界を定めた。

生イベント・UA・端末に結び付き得る情報は本PRへ転載しない。PR #6の原記録も変更しない。

## 4. 衝突・解決・未閉鎖

| ID | 衝突・注意 | 今回の扱い |
|---|---|---|
| C01 | 古いWET欄は濡れ場・乾燥・拡散を要求する | PR #5優先。WET-002/005の現在の表示/設定/保持、通常WETのContext契約を補正。原仕様の記録を保持 |
| C02 | PR #3ではD01/02/03/05が承認待ちと書かれる | PR #5で製品意味が決定済み。再承認待ちへ戻さない。技術方式/性能は引き続き未閉鎖 |
| C03 | 全247アクセスと保留/対象外の実行禁止 | 全件を説明含む台帳へ保持。現行236件は実行導線、11件は範囲説明と関連機能導線 |
| C04 | 独立CPU Labでは古い計算を全破棄する経路もある | 製品ではSaveFence等の用途を参照して保持。単一stale flagをそのまま製品化しない |
| C05 | 旧UI資料の六角形/ドーナツ等の比較案 | 固定条件はQuickの入口と意味。形を確定済みと扱わず、格子の操作試作を提供 |
| C06 | 旧仕様の各px値・旧コードのTile幅 | 試作のUI調整値以外は自動採用しない。製品の最適値は実測で選ぶ |
| C07 | 元カテゴリがCAN/REF等でも通常の入口はView/資料別 | 特定IDを対応するPanelへ配置。ID/カテゴリ自体は変更しない |
| C08 | 一IDにcopy/cut/paste、add/select等の異なる副作用 | action単位で責務とUndoを分離。機能分類のkindだけで全actionを作品Undoへ入れない |

スコープを無断に追加・削除する未解決の変更提案はない。UI細部と技術採用の未決定は [VALIDATION_AND_DECISIONS.md](VALIDATION_AND_DECISIONS.md) に残す。
