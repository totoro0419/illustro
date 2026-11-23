# Illustro R2｜実機検査計画（2026-11-23）

## 今回の目的
**ユーザーが実際に使える品質か**を確認する。コードの存在、画面の表示、過去の合格記録だけでは「使える」と判定しない。

- 実装対象：[PR #110](https://github.com/totoro0419/illustro/pull/110)（Draft／`implementation/round2-seven-groups`）
- 公開対象：[Illustro R2プレビュー](https://totoro0419.github.io/illustro/r2-preview/)
- [公開コミットの表示](https://totoro0419.github.io/illustro/r2-preview/release.json)：2026-11-23時点、GitHub `gh-pages`上では`c0afe578ddf385e970f2c192049aad41ce1e756d`。R2実装ブランチの`f4e8e796`との間にある変更は検査結果のMarkdown 2件のみ。ブラウザーでの起動は検査開始時に確認する。
- [R2実装の記録](../roadmap/ROUND2-IMPLEMENTATION-STATUS.md)：143件がコード上で完成との記録。既存保護91件と合わせた234件の**実機合格はまだ証明されていない**。
- R2の正式な対象と利用者決定：[7群の計画・247ID台帳](https://github.com/totoro0419/illustro/blob/planning/round2-seven-groups-2026-11-22/docs/roadmap/ROUND2-REMAINING-7-GROUPS.json)。R2の対象外は`COL-007`・`AI-004`、従来対象外・保留は11件。**今回の検査対象は234件**。
- [各機能の結果表（234行）](01-RESULTS.csv) はすべて未検査で初期化。[既知の問題・新規不具合の記録先](02-DEFECTS.md) は別管理。

## 初回の起動と検査用作品
1. 実際の端末・OS・ブラウザー・入力手段を記録する。使用しない端末・使えないペン機能を試したと扱わない。
2. R2 URLを開き、ホーム→新しい作品→白背景1200×900（使えなければ標準サイズ）→Gペンで1本→Undo→Redo→アプリ内保存→マイ作品から再開。途中で失敗したら起動障害なのか機能の問題なのかを切り分ける。
3. テスト用作品Aに「線画」「色」「試験」の3レイヤー、閉じた四角・少し開いた四角・細線・点ごみ・赤青緑・グラデーションを用意。必要時だけ作品Bを用意する。
4. 実作品を破壊しない。削除・復元・上書き・変形は検査用作品の複製だけで実行する。

## 操作台本（234の異なる機能ID）
| 順 | 具体的な操作と期待結果 | 件数 |
|---|---|---:|
| 1 | [01-CANVAS-SAVE-FAST.md](steps/01-CANVAS-SAVE-FAST.md) | 18 |
| 2 | [02-BRUSH-INPUT-FAST.md](steps/02-BRUSH-INPUT-FAST.md) | 27 |
| 3 | [03-COLOR-FILL-FAST.md](steps/03-COLOR-FILL-FAST.md) | 27 |
| 4 | [04-LAYER-BLEND-FAST.md](steps/04-LAYER-BLEND-FAST.md) | 17 |
| 5 | [05-SELECTION-TRANSFORM-FAST.md](steps/05-SELECTION-TRANSFORM-FAST.md) | 20 |
| 6 | [06-VECTOR-GUIDE-FAST.md](steps/06-VECTOR-GUIDE-FAST.md) | 18 |
| 7 | [07A-FX-ADJUST-FAST.md](steps/07A-FX-ADJUST-FAST.md) | 24 |
| 8 | [07B-FX-DETAIL-FAST.md](steps/07B-FX-DETAIL-FAST.md) | 13 |
| 9 | [07C-FX-STYLE-FAST.md](steps/07C-FX-STYLE-FAST.md) | 8 |
| 10 | [08-IMPORT-ASSETS-FAST.md](steps/08-IMPORT-ASSETS-FAST.md) | 20 |
| 11 | [09-HISTORY-AUTOMATION-FAST.md](steps/09-HISTORY-AUTOMATION-FAST.md) | 18 |
| 12 | [10-UI-DEVICE-FAST.md](steps/10-UI-DEVICE-FAST.md) | 24 |
| **計** | | **234** |

各章は**実操作手順、期待結果、操作性・画質・保存・取消・不合格基準**を含む。もとはWindows用の操作台本なので、Androidではタップ・ペン・指操作へ読み替える。PC専用の機能をAndroid上で無理に合格・不合格にせず、未検査理由を記録する。

## Androidタブレットの重点確認
- 指とペンの役割、指描きの切替、ピンチ・回転・表示移動、離筆直後の指の反応、手のひらの誤接触。
- 対応するペン機器の場合のみ、筆圧・傾き・ボタン・ホバー等の実入力を確認。センサー未対応なら「機器非対応」と記録。
- 手ぶれ補正の速い曲線／遅い直線、太いエアブラシ描画中の追従、鉛筆・細ペン確定時のちらつき、入り抜きの滑らかさ。
- サイドバー、詳細設定、スライダーの数値タップ入力、操作ボタンの大きさ、横向き画面、画面キーボードで重要な操作が隠れないか。
- 高解像度（例4000×4000）・複数レイヤー・処理中の表示操作・保存・再読込、オフラインと外部ファイル。
- Windowsのキーボード操作・読み上げ機能など別端末が必要なものは、実機確認範囲から分離する。

## 判定と記録
- **使える**：実際に必要な操作を行い、期待動作・品質・操作性を確認。
- **使いづらい**：利用できるが表示・操作が分かりにくい、線質・速度が不十分。
- **使えない**：入口がない、操作が成立しない、必要な処理が動かない。
- **未検査**：未着手・端末非対応・検査環境の都合。理由を書く。「使える」には算入しない。

同じ画面と検査作品を使い回し、共通保存・Undoを毎件無駄に繰り返さない。機能固有の取消条件は省かない。入口が見つからない場合は該当パネルと検索を各1回確認し、その後の結果を記録。各章終了でCSVを保存し、中断したら最後のIDと次のIDを記録する。

結果には機能ID、端末・ブラウザー、公開版コミット、実操作と観察、期待との差、日時、関連不具合を残す。旧827操作の合格は**今回の実機234機能の合格として流用しない**。

## 全章終了後
[過去の問題29項目と機能組み合わせ12シナリオ](steps/11-HISTORIC-COMPOSITE-AND-FINAL.md)を確認。すでに同一条件で操作した項目は記録を再利用し、重複を省く。実機で未検査の機能は明記し、検査できた件数だけ報告する。

この段階ではアプリの修正・通常版への統合・公開変更はしない。見つけた問題を別の修正工程へ渡し、影響する項目を再検査する。
