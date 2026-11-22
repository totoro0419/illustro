# Illustro｜C01〜C10 完成状況監査報告（STEP 1）
**調査日：2026-11-22 JST。基準：`quality/C03-C10-integration`、HEAD `49474fd56b36d91425e5df81f9c135c0424aecb4`。** GitHubの公開ソースと資料だけを調査。実機/ブラウザ操作・アプリ本体修正・新たな自動テスト実行はしていない。

## 1. 結果と重要な限界
正式な `FINAL_PRODUCT_SCOPE.json` の247 IDから、C01/C02の旧35件を維持し、ロードマップに示されたC03〜C10の分野と現在の機能内容に従って**監査上155機能をC01〜C10に割当て**た。残り92件はC11以降・他の開発段階・保留/対象外のため今回の分母から除いた（末尾のID一覧参照）。PIX-001は旧35件に含まれないが描画精度の重要能力としてC02へ追加割当て。

**この155件は監査で設定した対象範囲であり、以前から確定していた正式チャンク別機能数と同一とは断定しない。** C15のICC/高度色管理等、C16のMacro/記録等、C11の水彩高度機能をC01〜C10の未実装に混入させない。ただし現時点で存在するC04マクロの「途中で成功扱いする」ような品質問題は、C04の共通操作への影響として追跡する。

**全155機能の状態別件数：一部完成 34件、不具合・品質問題あり 1件、未確認 104件、実装充足候補 16件。最終完成認定0件。** 「未確認」はコード不在を証明したのではなく、正式仕様の全能力・現行UI経路・Undo/保存まで一連の根拠が足りない状態。「実装充足候補」は主要コード/入口や既存テストの根拠があるが端末品質を含む最終完成ではない。コードファイルの場所だけでは機能完成としない。

| チャンク | 対象ID | 実装充足候補 | 一部完成 | 品質問題の根拠あり | 未確認 |
|---|---:|---:|---:|---:|---:|
| C01 | 17 | 0 | 17 | 0 | 0 |
| C02 | 19 | 0 | 17 | 1 | 1 |
| C03 | 25 | 4 | 0 | 0 | 21 |
| C04 | 17 | 1 | 0 | 0 | 16 |
| C05 | 15 | 2 | 0 | 0 | 13 |
| C06 | 14 | 1 | 0 | 0 | 13 |
| C07 | 12 | 1 | 0 | 0 | 11 |
| C08 | 18 | 1 | 0 | 0 | 17 |
| C09 | 11 | 3 | 0 | 0 | 8 |
| C10 | 7 | 3 | 0 | 0 | 4 |
| **合計** | **155** | **16** | **34** | **1** | **104** |

仕様・対応コード・現在の入口・証拠と残点を1 IDずつ記録した正本：[C01-C10-FEATURE-INVENTORY.csv](C01-C10-FEATURE-INVENTORY.csv)。旧C01/C02 35件は[既存の台帳](https://github.com/totoro0419/illustro/blob/49474fd56b36d91425e5df81f9c135c0424aecb4/docs/c01-c02/FEATURE_AUDIT.md)を引継ぎ、旧「一部完成」から最新コードで解消している可能性を残した。**この調査は多数の機能でコード分岐の独立完全照合が残るため、全155件の詳細監査を完了した証明ではない。** 必要な確認・修正はSTEP2の作業単位へ割当てる。

## 2. 仕様の優先関係
1. 最新のユーザー要望（2026-11-21の12群UI改善、実機での手ぶれ補正と塗りの品質指摘、11-22のスライダー配置と直接入力、作品保護、直感操作・軽量性優先）。
2. [製品スコープ台帳](https://github.com/totoro0419/illustro/blob/49474fd56b36d91425e5df81f9c135c0424aecb4/docs/product-planning/FINAL_PRODUCT_SCOPE.json)・[製品仕様](https://github.com/totoro0419/illustro/blob/49474fd56b36d91425e5df81f9c135c0424aecb4/docs/product-planning/FINAL_PRODUCT_SPEC.md) の採否およびD01/D02/D03/D05決定。製品の完成形に含むこととC01〜C10で必須にすることは別。
3. `docs/product-planning/features/` の個別仕様、`FEATURE_DELIVERY_GATE.md` の入口/操作/保存/最終品質の検査条件。
4. [C01〜C17ロードマップ](https://github.com/totoro0419/illustro/blob/49474fd56b36d91425e5df81f9c135c0424aecb4/docs/roadmap/C01_C17_ROADMAP.md) は分野の境界の参考。11-12の当時の未実装記述を現在の欠落と同一視しない。
5. 旧M操作PASS、129品質指摘、古い37件指示書は変更履歴/証拠として利用。後続の実装・優先仕様を上書きさせない。

最新のUI：PR [#105](https://github.com/totoro0419/illustro/pull/105) は2026-11-21に `49474fd56b36d91425e5df81f9c135c0424aecb4` に統合済み。後続の [#106](https://github.com/totoro0419/illustro/pull/106)（スライダー統一）は**未統合**。[#104](https://github.com/totoro0419/illustro/pull/104)（補正再設計）も**未統合**。#102/#103はPR自体は開いているが、#105に関連変更が一部取り込まれているので、PR丸ごとの再マージをしない。

## 3. 旧827操作のPASSは752件をそのまま引継ぎ
| 原CSVの状態 | 件数 | 現在の扱い |
|---|---:|---|
| **PASS** | **752** | 全件有効な過去の操作実績として保持。今回再実行せず、取り消さない |
| FAIL | 2 | T052（ブラシ不透明度の数値変更）、T673（同じ作品IDの読込案内） |
| 入口なし | 2 | T225（色履歴消去）、T674（別作品として複製） |
| 環境未確認 | 41 | 物理ペン/指の入力等、実機ならではの項目 |
| BLOCKED | 5 | JSONファイルの再読込、比較曲線の前提不足 |
| NOT_RUN | 25 | T803〜T827。静的な処理経路は確認済みだが、実操作は未実行 |
| 合計 | **827** | 827件の履歴と今回の機能単位の完成は別 |

[旧827件のCSV原本](https://github.com/totoro0419/illustro/blob/49474fd56b36d91425e5df81f9c135c0424aecb4/docs/quality/UI-FIRST-827-RESULTS.csv)と[残71件の静的レビュー](https://github.com/totoro0419/illustro/blob/49474fd56b36d91425e5df81f9c135c0424aecb4/docs/quality/UI-FIRST-827-STATIC-REVIEW.md)を確認。原CSVのPASSを書き換えていない。元CSVには正式機能ID列がないため、各機能へ任意に「PASS何件」と配分することは避けた。変更したコード/最新UIが影響するT番号のみ担当が紐付け、必要範囲だけ回帰する。

旧T225は基準HEADの `apps/editor/src/color/panel.ts` に「履歴を消去」の入口と処理が現存。旧T673/T674は `apps/editor/src/main.ts` に「同じ識別番号」の確認と「別作品として複製」の選択肢が現存。**旧FAILと入口なしを現行の未実装と見なさず、PR #105後の実動作の再証明課題として扱う。**

## 4. 129件の品質調査：古い「37件残」をそのまま未完成としない
[129件の進捗記録](https://github.com/totoro0419/illustro/blob/49474fd56b36d91425e5df81f9c135c0424aecb4/docs/quality-integration/PROGRESS-129.md)に **129 ID** を確認。原調査区分はP1 55件、P2 74件。C03=13、C04=15、C05=20、C06=17、C07=16、C08=16、C09=16、C10=16。これら129件は「機能ID」ではなく個別の品質指摘であり、155件の機能数に加算しない。

- 11/18の91件「修正記録あり」/37件「部分対応」/1件「証拠未確認」は**古い集計**。
- 進捗ファイルの後続記録には、11/19に C06-002（選択中の一筆の部分GPU取得）、C09-007（図形出力形式）、C10-006（図形演算の元形状自動追従）、C10-010（日本語縦書き）が**コード上修正済み**であることが明記されている。現在の一覧表で92記録・33部分対応・4修正済みに分かれるが、33件を「現在もコード不足が確認された数」とみなさない。
- [11/19の37件再照合](https://github.com/totoro0419/illustro/blob/49474fd56b36d91425e5df81f9c135c0424aecb4/docs/quality-integration/SOURCE-RECHECK-37-2026-11-19.md)は、その時点で **主要実装あり21件・実測必要7件・改善提案5件・不足確認4件**。不足確認4件は後続でコード修正の記録がある。旧37件指示書の行番号と「実装すべき」という断定は、最新ソースで改めて照合すること。
- 塗りの操作中プレビュー、塗りの半透明境界、図形の角丸・多角形、同じベクター層への複数線、文字の部分書式、ベクターの曲線分割には既存処理が確認されている。別機能へ指摘内容をすり替えて修正しない。
- 全129件がAndroid上で解決したという独立した完了記録はない。元指摘が現在も再現するか、新しい要求の不足か、任意の改善案かを機能別に区別する。

### 129件追跡用の原問題照合
「後続扱い」は11/19の確定した記録を先に適用する。関連PRや修正記録だけで実機PASSとはしない。

| 課題ID | 原分類 | 元問題 | 進捗記録 | 後続扱い | 対応PR |
|---|---|---|---|---|---|
| [C03-001](https://github.com/totoro0419/illustro/blob/b463bb156bfb28cd49f41d403990966e5a7c304e/docs/quality-audit/C03.md#c03-001) | A/P1 | 変形済みレイヤーを複製できない | 修正記録あり・個別完了未認定 | 旧修正記録を引継ぎ・独立した全解決未認定 | #76 |
| [C03-002](https://github.com/totoro0419/illustro/blob/b463bb156bfb28cd49f41d403990966e5a7c304e/docs/quality-audit/C03.md#c03-002) | A/P1 | 自由形状の選択範囲からマスクを作れない条件がある | 修正記録あり・個別完了未認定 | 旧修正記録を引継ぎ・独立した全解決未認定 | #76 |
| [C03-003](https://github.com/totoro0419/illustro/blob/b463bb156bfb28cd49f41d403990966e5a7c304e/docs/quality-audit/C03.md#c03-003) | A/P1 | 履歴ブラシが自由形状の選択範囲を考慮しない | 修正記録あり・個別完了未認定 | 旧修正記録を引継ぎ・独立した全解決未認定 | #76 |
| [C03-004](https://github.com/totoro0419/illustro/blob/b463bb156bfb28cd49f41d403990966e5a7c304e/docs/quality-audit/C03.md#c03-004) | A/P1 | 保存の成功表示が実際の保存確認を意味しない場合がある | 修正記録あり・個別完了未認定 | 旧修正記録を引継ぎ・独立した全解決未認定 | #76 |
| [C03-005](https://github.com/totoro0419/illustro/blob/b463bb156bfb28cd49f41d403990966e5a7c304e/docs/quality-audit/C03.md#c03-005) | A/P2 | 復元候補に古い作品名が表示される条件 | 修正記録あり・個別完了未認定 | 旧修正記録を引継ぎ・独立した全解決未認定 | #76 |
| [C03-006](https://github.com/totoro0419/illustro/blob/b463bb156bfb28cd49f41d403990966e5a7c304e/docs/quality-audit/C03.md#c03-006) | A/P2 | マスク適用ボタンが使用可能でも処理が拒否される | 修正記録あり・個別完了未認定 | 旧修正記録を引継ぎ・独立した全解決未認定 | #76 |
| [C03-007](https://github.com/totoro0419/illustro/blob/b463bb156bfb28cd49f41d403990966e5a7c304e/docs/quality-audit/C03.md#c03-007) | B/P2 | 履歴の小さなプレビューに大きな画像を生成する | 部分対応・コード残件あり | 実測必要（11/19再照合、最新版の独立PASSとは別） | #76 |
| [C03-008](https://github.com/totoro0419/illustro/blob/b463bb156bfb28cd49f41d403990966e5a7c304e/docs/quality-audit/C03.md#c03-008) | B/P1 | 終了直前の自動保護は完了が保証されない | 修正記録あり・個別完了未認定 | 旧修正記録を引継ぎ・独立した全解決未認定 | #76 |
| [C03-009](https://github.com/totoro0419/illustro/blob/b463bb156bfb28cd49f41d403990966e5a7c304e/docs/quality-audit/C03.md#c03-009) | B/P2 | 大きな作品の保存時にデータ複製・全内容照合・読戻しの負担が懸念される | 修正記録あり・個別完了未認定 | 旧修正記録を引継ぎ・独立した全解決未認定 | #76 |
| [C03-010](https://github.com/totoro0419/illustro/blob/b463bb156bfb28cd49f41d403990966e5a7c304e/docs/quality-audit/C03.md#c03-010) | B/P2 | 旧形式移行の検証が描線数中心で見た目の一致を証明していない | 修正記録あり・個別完了未認定 | 旧修正記録を引継ぎ・独立した全解決未認定 | #76 |
| [C03-011](https://github.com/totoro0419/illustro/blob/b463bb156bfb28cd49f41d403990966e5a7c304e/docs/quality-audit/C03.md#c03-011) | C/P2 | 離れたレイヤーをまとめてグループ化する操作が複雑 | 修正記録あり・個別完了未認定 | 旧修正記録を引継ぎ・独立した全解決未認定 | #76 |
| [C03-012](https://github.com/totoro0419/illustro/blob/b463bb156bfb28cd49f41d403990966e5a7c304e/docs/quality-audit/C03.md#c03-012) | C/P2 | 履歴比較の確認画面が制作の流れを中断する | 修正記録あり・個別完了未認定 | 旧修正記録を引継ぎ・独立した全解決未認定 | #76 |
| [C03-013](https://github.com/totoro0419/illustro/blob/b463bb156bfb28cd49f41d403990966e5a7c304e/docs/quality-audit/C03.md#c03-013) | C/P2 | レイヤー一覧の全面再構築を減らす余地がある | 修正記録あり・個別完了未認定 | 旧修正記録を引継ぎ・独立した全解決未認定 | #76 |
| [C04-001](https://github.com/totoro0419/illustro/blob/b463bb156bfb28cd49f41d403990966e5a7c304e/docs/quality-audit/C04.md#c04-001) | A/P1 | 一時ツールを戻す操作が状況によって一致しない | 修正記録あり・個別完了未認定 | 旧修正記録を引継ぎ・独立した全解決未認定 | #97 |
| [C04-002](https://github.com/totoro0419/illustro/blob/b463bb156bfb28cd49f41d403990966e5a7c304e/docs/quality-audit/C04.md#c04-002) | A/P1 | マクロが終了する前に成功したと表示する | 部分対応・コード残件あり | 主要実装あり（11/19再照合、最新版の独立PASSとは別） | #97 |
| [C04-003](https://github.com/totoro0419/illustro/blob/b463bb156bfb28cd49f41d403990966e5a7c304e/docs/quality-audit/C04.md#c04-003) | A/P1 | コマンド検索で非表示レイヤーが候補から欠落する | 修正記録あり・個別完了未認定 | 旧修正記録を引継ぎ・独立した全解決未認定 | #97 |
| [C04-004](https://github.com/totoro0419/illustro/blob/b463bb156bfb28cd49f41d403990966e5a7c304e/docs/quality-audit/C04.md#c04-004) | A/P1 | 作品固有のパレットが作品データへ保存されない | 修正記録あり・個別完了未認定 | 旧修正記録を引継ぎ・独立した全解決未認定 | #83 |
| [C04-005](https://github.com/totoro0419/illustro/blob/b463bb156bfb28cd49f41d403990966e5a7c304e/docs/quality-audit/C04.md#c04-005) | A/P1 | スポイトのGPU画像読取が繰り返され操作遅延の懸念 | 修正記録あり・個別完了未認定 | 旧修正記録を引継ぎ・独立した全解決未認定 | #83 |
| [C04-006](https://github.com/totoro0419/illustro/blob/b463bb156bfb28cd49f41d403990966e5a7c304e/docs/quality-audit/C04.md#c04-006) | A/P2 | 採色元表示と選択範囲の扱いが一致しない | 修正記録あり・個別完了未認定 | 旧修正記録を引継ぎ・独立した全解決未認定 | #83 |
| [C04-007](https://github.com/totoro0419/illustro/blob/b463bb156bfb28cd49f41d403990966e5a7c304e/docs/quality-audit/C04.md#c04-007) | A/P2 | Quick Controllerの枠が満杯の場合に確認なく置換する | 修正記録あり・個別完了未認定 | 旧修正記録を引継ぎ・独立した全解決未認定 | #97 |
| [C04-008](https://github.com/totoro0419/illustro/blob/b463bb156bfb28cd49f41d403990966e5a7c304e/docs/quality-audit/C04.md#c04-008) | A/P2 | Workspace保存に失敗しても成功表示する場合がある | 修正記録あり・個別完了未認定 | 旧修正記録を引継ぎ・独立した全解決未認定 | #97 |
| [C04-009](https://github.com/totoro0419/illustro/blob/b463bb156bfb28cd49f41d403990966e5a7c304e/docs/quality-audit/C04.md#c04-009) | B/P2 | ショートカット設定保存に失敗しても読込成功と表示する場合がある | 修正記録あり・個別完了未認定 | 旧修正記録を引継ぎ・独立した全解決未認定 | #97 |
| [C04-010](https://github.com/totoro0419/illustro/blob/b463bb156bfb28cd49f41d403990966e5a7c304e/docs/quality-audit/C04.md#c04-010) | B/P2 | 色を変更する途中で色一覧を繰り返し走査する可能性 | 修正記録あり・個別完了未認定 | 旧修正記録を引継ぎ・独立した全解決未認定 | #83 |
| [C04-011](https://github.com/totoro0419/illustro/blob/b463bb156bfb28cd49f41d403990966e5a7c304e/docs/quality-audit/C04.md#c04-011) | B/P2 | Quick操作の必要手数を削減できる | 修正記録あり・個別完了未認定 | 旧修正記録を引継ぎ・独立した全解決未認定 | #97 |
| [C04-012](https://github.com/totoro0419/illustro/blob/b463bb156bfb28cd49f41d403990966e5a7c304e/docs/quality-audit/C04.md#c04-012) | C/P2 | Workspace設定とショートカット設定の分離・整合を改善できる | 修正記録あり・個別完了未認定 | 旧修正記録を引継ぎ・独立した全解決未認定 | #97 |
| [C04-013](https://github.com/totoro0419/illustro/blob/b463bb156bfb28cd49f41d403990966e5a7c304e/docs/quality-audit/C04.md#c04-013) | C/P2 | 色覚補助・白黒フィルターが補助UIにも作用する表示を見直す | 修正記録あり・個別完了未認定 | 旧修正記録を引継ぎ・独立した全解決未認定 | #83 |
| [C04-014](https://github.com/totoro0419/illustro/blob/b463bb156bfb28cd49f41d403990966e5a7c304e/docs/quality-audit/C04.md#c04-014) | C/P2 | Focus中にQuick Controllerが隠れて操作性を損なう | 修正記録あり・個別完了未認定 | 旧修正記録を引継ぎ・独立した全解決未認定 | #97 |
| [C04-015](https://github.com/totoro0419/illustro/blob/b463bb156bfb28cd49f41d403990966e5a7c304e/docs/quality-audit/C04.md#c04-015) | C/P2 | 正式に指定した色と実際のCSS配色に相違がある可能性 | 修正記録あり・個別完了未認定 | 旧修正記録を引継ぎ・独立した全解決未認定 | #97 |
| [C05-001](https://github.com/totoro0419/illustro/blob/b463bb156bfb28cd49f41d403990966e5a7c304e/docs/quality-audit/C05.md#c05-001) | A/P1 | 参考資料の問題が作品ファイル全体の保存失敗につながる | 修正記録あり・個別完了未認定 | 旧修正記録を引継ぎ・独立した全解決未認定 | #82 |
| [C05-002](https://github.com/totoro0419/illustro/blob/b463bb156bfb28cd49f41d403990966e5a7c304e/docs/quality-audit/C05.md#c05-002) | A/P1 | 資料の配置変更が作品切替時に保存されず失われる可能性 | 修正記録あり・個別完了未認定 | 旧修正記録を引継ぎ・独立した全解決未認定 | #82 |
| [C05-003](https://github.com/totoro0419/illustro/blob/b463bb156bfb28cd49f41d403990966e5a7c304e/docs/quality-audit/C05.md#c05-003) | A/P1 | 作品を複製しても参考資料を引き継げない経路がある | 修正記録あり・個別完了未認定 | 旧修正記録を引継ぎ・独立した全解決未認定 | #82 |
| [C05-004](https://github.com/totoro0419/illustro/blob/b463bb156bfb28cd49f41d403990966e5a7c304e/docs/quality-audit/C05.md#c05-004) | A/P1 | 作品ファイルからの参考資料復元が読み込み途中に終了する可能性 | 修正記録あり・個別完了未認定 | 旧修正記録を引継ぎ・独立した全解決未認定 | #82 |
| [C05-005](https://github.com/totoro0419/illustro/blob/b463bb156bfb28cd49f41d403990966e5a7c304e/docs/quality-audit/C05.md#c05-005) | A/P1 | 資料の保存情報が不正な場合に空の資料として扱う | 修正記録あり・個別完了未認定 | 旧修正記録を引継ぎ・独立した全解決未認定 | #82 |
| [C05-006](https://github.com/totoro0419/illustro/blob/b463bb156bfb28cd49f41d403990966e5a7c304e/docs/quality-audit/C05.md#c05-006) | A/P1 | 素材パックの持ち運びで版のつながりが失われる | 修正記録あり・個別完了未認定 | 旧修正記録を引継ぎ・独立した全解決未認定 | #77 |
| [C05-007](https://github.com/totoro0419/illustro/blob/b463bb156bfb28cd49f41d403990966e5a7c304e/docs/quality-audit/C05.md#c05-007) | A/P2 | 素材の非表示・ゴミ箱表示では検索条件が無視される | 修正記録あり・個別完了未認定 | 旧修正記録を引継ぎ・独立した全解決未認定 | #77 |
| [C05-008](https://github.com/totoro0419/illustro/blob/b463bb156bfb28cd49f41d403990966e5a7c304e/docs/quality-audit/C05.md#c05-008) | A/P2 | お気に入り変更でも素材の版番号が増える | 修正記録あり・個別完了未認定 | 旧修正記録を引継ぎ・独立した全解決未認定 | #77 |
| [C05-009](https://github.com/totoro0419/illustro/blob/b463bb156bfb28cd49f41d403990966e5a7c304e/docs/quality-audit/C05.md#c05-009) | A/P2 | 一時的な資料表示が保存とUndoの対象になる | 修正記録あり・個別完了未認定 | 旧修正記録を引継ぎ・独立した全解決未認定 | #82 |
| [C05-010](https://github.com/totoro0419/illustro/blob/b463bb156bfb28cd49f41d403990966e5a7c304e/docs/quality-audit/C05.md#c05-010) | A/P1 | 作品ファイル内の参考資料より端末に残る古い配置が優先される | 修正記録あり・個別完了未認定 | 旧修正記録を引継ぎ・独立した全解決未認定 | #82 |
| [C05-011](https://github.com/totoro0419/illustro/blob/b463bb156bfb28cd49f41d403990966e5a7c304e/docs/quality-audit/C05.md#c05-011) | A/P2 | 素材を削除するときの依存関係の確認が不足 | 修正記録あり・個別完了未認定 | 旧修正記録を引継ぎ・独立した全解決未認定 | #77 |
| [C05-012](https://github.com/totoro0419/illustro/blob/b463bb156bfb28cd49f41d403990966e5a7c304e/docs/quality-audit/C05.md#c05-012) | A/P2 | 作品一覧で複数作品をまとめて操作できない | 修正記録あり・個別完了未認定 | 旧修正記録を引継ぎ・独立した全解決未認定 | #82 |
| [C05-013](https://github.com/totoro0419/illustro/blob/b463bb156bfb28cd49f41d403990966e5a7c304e/docs/quality-audit/C05.md#c05-013) | A/P2 | 参考資料の埋め込みと外部参照を選べる入口がない | 修正記録あり・個別完了未認定 | 旧修正記録を引継ぎ・独立した全解決未認定 | #82 |
| [C05-014](https://github.com/totoro0419/illustro/blob/b463bb156bfb28cd49f41d403990966e5a7c304e/docs/quality-audit/C05.md#c05-014) | A/P2 | 資料の縮小画像を使用する採色で細部の色が正確に拾えない場合がある | 修正記録あり・個別完了未認定 | 旧修正記録を引継ぎ・独立した全解決未認定 | #82 |
| [C05-015](https://github.com/totoro0419/illustro/blob/b463bb156bfb28cd49f41d403990966e5a7c304e/docs/quality-audit/C05.md#c05-015) | A/P2 | 素材パックの一部読み込み失敗への回復操作が不足 | 修正記録あり・個別完了未認定 | 旧修正記録を引継ぎ・独立した全解決未認定 | #77 |
| [C05-016](https://github.com/totoro0419/illustro/blob/b463bb156bfb28cd49f41d403990966e5a7c304e/docs/quality-audit/C05.md#c05-016) | A/P2 | 画面サイズ変更後に参考資料が画面外に残る条件がある | 修正記録あり・個別完了未認定 | 旧修正記録を引継ぎ・独立した全解決未認定 | #82 |
| [C05-017](https://github.com/totoro0419/illustro/blob/b463bb156bfb28cd49f41d403990966e5a7c304e/docs/quality-audit/C05.md#c05-017) | B/P2 | 素材一覧の取得方式が大量素材に不利な可能性 | 修正記録あり・個別完了未認定 | 旧修正記録を引継ぎ・独立した全解決未認定 | #77 |
| [C05-018](https://github.com/totoro0419/illustro/blob/b463bb156bfb28cd49f41d403990966e5a7c304e/docs/quality-audit/C05.md#c05-018) | B/P2 | 参考資料の変更時に全ウィンドウを再構築し負荷が増える可能性 | 修正記録あり・個別完了未認定 | 旧修正記録を引継ぎ・独立した全解決未認定 | #82 |
| [C05-019](https://github.com/totoro0419/illustro/blob/b463bb156bfb28cd49f41d403990966e5a7c304e/docs/quality-audit/C05.md#c05-019) | C/P2 | 参考資料上の直接採色と全体表示の切替を改善できる | 修正記録あり・個別完了未認定 | 旧修正記録を引継ぎ・独立した全解決未認定 | #82 |
| [C05-020](https://github.com/totoro0419/illustro/blob/b463bb156bfb28cd49f41d403990966e5a7c304e/docs/quality-audit/C05.md#c05-020) | C/P2 | 素材種別ごとの実際の利用方法を統一できる | 部分対応・コード残件あり | 改善提案（11/19再照合、最新版の独立PASSとは別） | #77 |
| [C06-001](https://github.com/totoro0419/illustro/blob/b463bb156bfb28cd49f41d403990966e5a7c304e/docs/quality-audit/C06.md#c06-001) | A/P1 | 選択中のブラシの仮表示に選択範囲が反映されない経路 | 部分対応・コード残件あり | 実測必要（11/19再照合、最新版の独立PASSとは別） | #90 |
| [C06-002](https://github.com/totoro0419/illustro/blob/b463bb156bfb28cd49f41d403990966e5a7c304e/docs/quality-audit/C06.md#c06-002) | A/P1 | 選択中の一筆が通常の描画より大きな処理を要求する | コード上の不足を修正済み | **11/19コード修正記録あり**・現行端末確認は別 | #90 |
| [C06-003](https://github.com/totoro0419/illustro/blob/b463bb156bfb28cd49f41d403990966e5a7c304e/docs/quality-audit/C06.md#c06-003) | A/P1 | 選択がない状態で減算・交差を使うと新しい選択範囲ができる | 修正記録あり・個別完了未認定 | 旧修正記録を引継ぎ・独立した全解決未認定 | #90 |
| [C06-004](https://github.com/totoro0419/illustro/blob/b463bb156bfb28cd49f41d403990966e5a7c304e/docs/quality-audit/C06.md#c06-004) | A/P2 | 複雑な選択範囲でも四角い外枠が表示される | 修正記録あり・個別完了未認定 | 旧修正記録を引継ぎ・独立した全解決未認定 | #90 |
| [C06-005](https://github.com/totoro0419/illustro/blob/b463bb156bfb28cd49f41d403990966e5a7c304e/docs/quality-audit/C06.md#c06-005) | A/P1 | Ctrl+Vが端末の画像貼り付けと連動していない | 修正記録あり・個別完了未認定 | 旧修正記録を引継ぎ・独立した全解決未認定 | #90 |
| [C06-006](https://github.com/totoro0419/illustro/blob/b463bb156bfb28cd49f41d403990966e5a7c304e/docs/quality-audit/C06.md#c06-006) | A/P1 | 保存選択範囲の件数と作品ファイルの容量制限が矛盾する | 修正記録あり・個別完了未認定 | 旧修正記録を引継ぎ・独立した全解決未認定 | #90 |
| [C06-007](https://github.com/totoro0419/illustro/blob/b463bb156bfb28cd49f41d403990966e5a7c304e/docs/quality-audit/C06.md#c06-007) | A/P1 | 選択ブラシで描いている途中の形が仮表示されない | 部分対応・コード残件あり | 主要実装あり（11/19再照合、最新版の独立PASSとは別） | #90 |
| [C06-008](https://github.com/totoro0419/illustro/blob/b463bb156bfb28cd49f41d403990966e5a7c304e/docs/quality-audit/C06.md#c06-008) | A/P1 | 選択した絵を作品外へ移動すると外にはみ出した画素が失われる | 修正記録あり・個別完了未認定 | 旧修正記録を引継ぎ・独立した全解決未認定 | #90 |
| [C06-009](https://github.com/totoro0419/illustro/blob/b463bb156bfb28cd49f41d403990966e5a7c304e/docs/quality-audit/C06.md#c06-009) | A/P2 | 名前付き選択範囲の既存項目への上書き保存とサムネイルがない | 修正記録あり・個別完了未認定 | 旧修正記録を引継ぎ・独立した全解決未認定 | #90 |
| [C06-010](https://github.com/totoro0419/illustro/blob/b463bb156bfb28cd49f41d403990966e5a7c304e/docs/quality-audit/C06.md#c06-010) | A/P2 | 磁気投げ縄が実装されていない | 修正記録あり・個別完了未認定 | 旧修正記録を引継ぎ・独立した全解決未認定 | #90 |
| [C06-011](https://github.com/totoro0419/illustro/blob/b463bb156bfb28cd49f41d403990966e5a7c304e/docs/quality-audit/C06.md#c06-011) | A/P2 | 選択範囲の拡張・縮小・ぼかしで元の範囲との比較と適用前取消が不足 | 修正記録あり・個別完了未認定 | 旧修正記録を引継ぎ・独立した全解決未認定 | #90 |
| [C06-012](https://github.com/totoro0419/illustro/blob/b463bb156bfb28cd49f41d403990966e5a7c304e/docs/quality-audit/C06.md#c06-012) | A/P2 | 選択マスクの640画素表示では原画の1画素幅の細部を表示できない条件 | 修正記録あり・個別完了未認定 | 旧修正記録を引継ぎ・独立した全解決未認定 | #90 |
| [C06-013](https://github.com/totoro0419/illustro/blob/b463bb156bfb28cd49f41d403990966e5a7c304e/docs/quality-audit/C06.md#c06-013) | B/P1 | 四角い選択から選択マスクへの非同期変換完了前に描画を開始する競合の疑い | 修正記録あり・個別完了未認定 | 旧修正記録を引継ぎ・独立した全解決未認定 | #90 |
| [C06-014](https://github.com/totoro0419/illustro/blob/b463bb156bfb28cd49f41d403990966e5a7c304e/docs/quality-audit/C06.md#c06-014) | B/P1 | 画像ドラッグを拒否した場合にブラウザー標準のファイルドロップがページ移動を起こす疑い | 修正記録あり・個別完了未認定 | 旧修正記録を引継ぎ・独立した全解決未認定 | #90 |
| [C06-015](https://github.com/totoro0419/illustro/blob/b463bb156bfb28cd49f41d403990966e5a7c304e/docs/quality-audit/C06.md#c06-015) | B/P2 | 小さい選択範囲の貼り付けにも作品全体の画素配列を確保する懸念 | 部分対応・コード残件あり | 主要実装あり（11/19再照合、最新版の独立PASSとは別） | #90 |
| [C06-016](https://github.com/totoro0419/illustro/blob/b463bb156bfb28cd49f41d403990966e5a7c304e/docs/quality-audit/C06.md#c06-016) | C/P2 | 選択範囲の近くにコピー・切取・反転・ぼかしの操作を一時表示する案 | 修正記録あり・個別完了未認定 | 旧修正記録を引継ぎ・独立した全解決未認定 | #90 |
| [C06-017](https://github.com/totoro0419/illustro/blob/b463bb156bfb28cd49f41d403990966e5a7c304e/docs/quality-audit/C06.md#c06-017) | C/P2 | 貼り付け画像を半透明の仮表示で動かし位置確認後に確定する案 | 修正記録あり・個別完了未認定 | 旧修正記録を引継ぎ・独立した全解決未認定 | #90 |
| [C07-001](https://github.com/totoro0419/illustro/blob/b463bb156bfb28cd49f41d403990966e5a7c304e/docs/quality-audit/C07.md#c07-001) | A/P1 | 変形結果が制作キャンバス上でなく小さな別プレビューに表示される | 部分対応・コード残件あり | 主要実装あり（11/19再照合、最新版の独立PASSとは別） | #86 |
| [C07-002](https://github.com/totoro0419/illustro/blob/b463bb156bfb28cd49f41d403990966e5a7c304e/docs/quality-audit/C07.md#c07-002) | A/P1 | 変形前の元画像を編集する画面が小さな専用キャンバスに限定される | 部分対応・コード残件あり | 主要実装あり（11/19再照合、最新版の独立PASSとは別） | #86 |
| [C07-003](https://github.com/totoro0419/illustro/blob/b463bb156bfb28cd49f41d403990966e5a7c304e/docs/quality-audit/C07.md#c07-003) | A/P1 | 複数のレイヤー・グループを一括して変形できない | 部分対応・コード残件あり | 主要実装あり（11/19再照合、最新版の独立PASSとは別） | #86 |
| [C07-004](https://github.com/totoro0419/illustro/blob/b463bb156bfb28cd49f41d403990966e5a7c304e/docs/quality-audit/C07.md#c07-004) | A/P1 | 変形後に描いた筆がセッション中の変形プレビューに反映されない | 部分対応・コード残件あり | 主要実装あり（11/19再照合、最新版の独立PASSとは別） | #86 |
| [C07-005](https://github.com/totoro0419/illustro/blob/b463bb156bfb28cd49f41d403990966e5a7c304e/docs/quality-audit/C07.md#c07-005) | A/P1 | 一般的なファイル選択で外部参照を登録すると後から更新できない | 修正記録あり・個別完了未認定 | 旧修正記録を引継ぎ・独立した全解決未認定 | #86 |
| [C07-006](https://github.com/totoro0419/illustro/blob/b463bb156bfb28cd49f41d403990966e5a7c304e/docs/quality-audit/C07.md#c07-006) | A/P1 | リンク画像の再選択時に元の古い参照ハンドルが残る条件 | 修正記録あり・個別完了未認定 | 旧修正記録を引継ぎ・独立した全解決未認定 | #86 |
| [C07-007](https://github.com/totoro0419/illustro/blob/b463bb156bfb28cd49f41d403990966e5a7c304e/docs/quality-audit/C07.md#c07-007) | A/P2 | 変形の回転・拡縮をキャンバス上の直接ハンドルで操作できない | 部分対応・コード残件あり | 主要実装あり（11/19再照合、最新版の独立PASSとは別） | #86 |
| [C07-008](https://github.com/totoro0419/illustro/blob/b463bb156bfb28cd49f41d403990966e5a7c304e/docs/quality-audit/C07.md#c07-008) | A/P2 | 縦横比を固定したまま拡縮する操作がない | 修正記録あり・個別完了未認定 | 旧修正記録を引継ぎ・独立した全解決未認定 | #86 |
| [C07-009](https://github.com/totoro0419/illustro/blob/b463bb156bfb28cd49f41d403990966e5a7c304e/docs/quality-audit/C07.md#c07-009) | A/P2 | 元画像編集セッションのUndoが直近一筆に限定される | 修正記録あり・個別完了未認定 | 旧修正記録を引継ぎ・独立した全解決未認定 | #86 |
| [C07-010](https://github.com/totoro0419/illustro/blob/b463bb156bfb28cd49f41d403990966e5a7c304e/docs/quality-audit/C07.md#c07-010) | A/P2 | メッシュ変形でマスク位置の対応付けが不正確になり得る | 修正記録あり・個別完了未認定 | 旧修正記録を引継ぎ・独立した全解決未認定 | #86 |
| [C07-011](https://github.com/totoro0419/illustro/blob/b463bb156bfb28cd49f41d403990966e5a7c304e/docs/quality-audit/C07.md#c07-011) | B/P1 | プレビューごとにWorkerを生成し全画素を渡すため高解像度で遅延する懸念 | 修正記録あり・個別完了未認定 | 旧修正記録を引継ぎ・独立した全解決未認定 | #86 |
| [C07-012](https://github.com/totoro0419/illustro/blob/b463bb156bfb28cd49f41d403990966e5a7c304e/docs/quality-audit/C07.md#c07-012) | B/P2 | メッシュ格子分割の変更で固定した点の状態が失われる可能性 | 修正記録あり・個別完了未認定 | 旧修正記録を引継ぎ・独立した全解決未認定 | #86 |
| [C07-013](https://github.com/totoro0419/illustro/blob/b463bb156bfb28cd49f41d403990966e5a7c304e/docs/quality-audit/C07.md#c07-013) | B/P2 | 変形セッション内のUndo記録が増え続ける懸念 | 修正記録あり・個別完了未認定 | 旧修正記録を引継ぎ・独立した全解決未認定 | #86 |
| [C07-014](https://github.com/totoro0419/illustro/blob/b463bb156bfb28cd49f41d403990966e5a7c304e/docs/quality-audit/C07.md#c07-014) | B/P2 | 縮小用の画素平均が固定分割で画質が変わる可能性 | 部分対応・コード残件あり | 実測必要（11/19再照合、最新版の独立PASSとは別） | #86 |
| [C07-015](https://github.com/totoro0419/illustro/blob/b463bb156bfb28cd49f41d403990966e5a7c304e/docs/quality-audit/C07.md#c07-015) | C/P2 | イラストの種類別に画素補間方法をおすすめする案 | 修正記録あり・個別完了未認定 | 旧修正記録を引継ぎ・独立した全解決未認定 | #86 |
| [C07-016](https://github.com/totoro0419/illustro/blob/b463bb156bfb28cd49f41d403990966e5a7c304e/docs/quality-audit/C07.md#c07-016) | C/P2 | レイヤー一覧から変形・リンク・マスク状態を理解できる案 | 修正記録あり・個別完了未認定 | 旧修正記録を引継ぎ・独立した全解決未認定 | #86 |
| [C08-001](https://github.com/totoro0419/illustro/blob/b463bb156bfb28cd49f41d403990966e5a7c304e/docs/quality-audit/C08.md#c08-001) | A/P1 | 隙間補完が線端を確認せず近接する黒い画素を接続し細い通路もふさぐ | 部分対応・コード残件あり | 主要実装あり（11/19再照合、最新版の独立PASSとは別） | #81 |
| [C08-002](https://github.com/totoro0419/illustro/blob/b463bb156bfb28cd49f41d403990966e5a7c304e/docs/quality-audit/C08.md#c08-002) | A/P1 | 透明画素だけ塗る条件が塗り先ではなく参照画像の透明度を見る | 修正記録あり・個別完了未認定 | 旧修正記録を引継ぎ・独立した全解決未認定 | #81 |
| [C08-003](https://github.com/totoro0419/illustro/blob/b463bb156bfb28cd49f41d403990966e5a7c304e/docs/quality-audit/C08.md#c08-003) | A/P1 | ドラッグ塗りで操作中に塗る領域が逐次仮表示されない | 部分対応・コード残件あり | 主要実装あり（11/19再照合、最新版の独立PASSとは別） | #81 |
| [C08-004](https://github.com/totoro0419/illustro/blob/b463bb156bfb28cd49f41d403990966e5a7c304e/docs/quality-audit/C08.md#c08-004) | A/P1 | 線画領域を最大420px程度に縮めるため細部の確認が難しい | 修正記録あり・個別完了未認定 | 旧修正記録を引継ぎ・独立した全解決未認定 | #81 |
| [C08-005](https://github.com/totoro0419/illustro/blob/b463bb156bfb28cd49f41d403990966e5a7c304e/docs/quality-audit/C08.md#c08-005) | A/P1 | 明色の線画が暗さに基づく境界判定で認識されない | 修正記録あり・個別完了未認定 | 旧修正記録を引継ぎ・独立した全解決未認定 | #81 |
| [C08-006](https://github.com/totoro0419/illustro/blob/b463bb156bfb28cd49f41d403990966e5a7c304e/docs/quality-audit/C08.md#c08-006) | A/P2 | 色の違いと透明度の許容値が共通で独立調整できない | 修正記録あり・個別完了未認定 | 旧修正記録を引継ぎ・独立した全解決未認定 | #81 |
| [C08-007](https://github.com/totoro0419/illustro/blob/b463bb156bfb28cd49f41d403990966e5a7c304e/docs/quality-audit/C08.md#c08-007) | A/P2 | 塗りの境界マスクが二値的で滑らかな輪郭になりにくい | 部分対応・コード残件あり | 主要実装あり（11/19再照合、最新版の独立PASSとは別） | #81 |
| [C08-008](https://github.com/totoro0419/illustro/blob/b463bb156bfb28cd49f41d403990966e5a7c304e/docs/quality-audit/C08.md#c08-008) | A/P2 | 元の色と塗り替える色を別々に指定できない | 修正記録あり・個別完了未認定 | 旧修正記録を引継ぎ・独立した全解決未認定 | #81 |
| [C08-009](https://github.com/totoro0419/illustro/blob/b463bb156bfb28cd49f41d403990966e5a7c304e/docs/quality-audit/C08.md#c08-009) | A/P2 | 統合表示から特定レイヤーのみ除外して塗り参照に使えない | 修正記録あり・個別完了未認定 | 旧修正記録を引継ぎ・独立した全解決未認定 | #81 |
| [C08-010](https://github.com/totoro0419/illustro/blob/b463bb156bfb28cd49f41d403990966e5a7c304e/docs/quality-audit/C08.md#c08-010) | A/P2 | 保存した色指示線の位置や色を直接再編集する入口がない | 修正記録あり・個別完了未認定 | 旧修正記録を引継ぎ・独立した全解決未認定 | #81 |
| [C08-011](https://github.com/totoro0419/illustro/blob/b463bb156bfb28cd49f41d403990966e5a7c304e/docs/quality-audit/C08.md#c08-011) | B/P1 | 塗り候補の再計算ごとに新しいWorkerと画像の複製が必要になる懸念 | 部分対応・コード残件あり | 主要実装あり（11/19再照合、最新版の独立PASSとは別） | #81 |
| [C08-012](https://github.com/totoro0419/illustro/blob/b463bb156bfb28cd49f41d403990966e5a7c304e/docs/quality-audit/C08.md#c08-012) | B/P1 | 塗り計算を途中で中断できず処理停止時の復帰が難しい懸念 | 修正記録あり・個別完了未認定 | 旧修正記録を引継ぎ・独立した全解決未認定 | #81 |
| [C08-013](https://github.com/totoro0419/illustro/blob/b463bb156bfb28cd49f41d403990966e5a7c304e/docs/quality-audit/C08.md#c08-013) | B/P2 | 複雑な線で閉領域の穴と外側の分類が正しいか未検証 | 修正記録あり・個別完了未認定 | 旧修正記録を引継ぎ・独立した全解決未認定 | #81 |
| [C08-014](https://github.com/totoro0419/illustro/blob/b463bb156bfb28cd49f41d403990966e5a7c304e/docs/quality-audit/C08.md#c08-014) | B/P2 | 隙間候補の点数付けが毛先や交差部を誤接続する可能性 | 部分対応・コード残件あり | 実測必要（11/19再照合、最新版の独立PASSとは別） | #81 |
| [C08-015](https://github.com/totoro0419/illustro/blob/b463bb156bfb28cd49f41d403990966e5a7c304e/docs/quality-audit/C08.md#c08-015) | C/P2 | 線画の変更部分だけ再解析する構造改善案 | 部分対応・コード残件あり | 改善提案（11/19再照合、最新版の独立PASSとは別） | #81 |
| [C08-016](https://github.com/totoro0419/illustro/blob/b463bb156bfb28cd49f41d403990966e5a7c304e/docs/quality-audit/C08.md#c08-016) | C/P2 | 通常塗りと高度な線画管理を分けるUI設計案 | 修正記録あり・個別完了未認定 | 旧修正記録を引継ぎ・独立した全解決未認定 | #81 |
| [C09-001](https://github.com/totoro0419/illustro/blob/b463bb156bfb28cd49f41d403990966e5a7c304e/docs/quality-audit/C09.md#c09-001) | A/P1 | 二点・三点透視定規で描きたい消失点方向を自動選択できない | 修正記録あり・個別完了未認定 | 旧修正記録を引継ぎ・独立した全解決未認定 | #89 |
| [C09-002](https://github.com/totoro0419/illustro/blob/b463bb156bfb28cd49f41d403990966e5a7c304e/docs/quality-audit/C09.md#c09-002) | A/P1 | 透視定規の候補距離が0になりやすくほかの定規を押しのける | 修正記録あり・個別完了未認定 | 旧修正記録を引継ぎ・独立した全解決未認定 | #89 |
| [C09-003](https://github.com/totoro0419/illustro/blob/b463bb156bfb28cd49f41d403990966e5a7c304e/docs/quality-audit/C09.md#c09-003) | A/P1 | 図形の位置指定にブラシ用の定規吸着が適用されない | 修正記録あり・個別完了未認定 | 旧修正記録を引継ぎ・独立した全解決未認定 | #89 |
| [C09-004](https://github.com/totoro0419/illustro/blob/b463bb156bfb28cd49f41d403990966e5a7c304e/docs/quality-audit/C09.md#c09-004) | A/P1 | 選択範囲内の図形プレビューに確定時のマスクが反映されない | 部分対応・コード残件あり | 主要実装あり（11/19再照合、最新版の独立PASSとは別） | #89 |
| [C09-005](https://github.com/totoro0419/illustro/blob/b463bb156bfb28cd49f41d403990966e5a7c304e/docs/quality-audit/C09.md#c09-005) | A/P1 | 図形やグラデーションの編集点を制作キャンバス上で直接操作できない | 部分対応・コード残件あり | 主要実装あり（11/19再照合、最新版の独立PASSとは別） | #89 |
| [C09-006](https://github.com/totoro0419/illustro/blob/b463bb156bfb28cd49f41d403990966e5a7c304e/docs/quality-audit/C09.md#c09-006) | A/P1 | ペン保持中に整えた図形が仮表示されず、離してから補正候補が出る | 部分対応・コード残件あり | 主要実装あり（11/19再照合、最新版の独立PASSとは別） | #89 |
| [C09-007](https://github.com/totoro0419/illustro/blob/b463bb156bfb28cd49f41d403990966e5a7c304e/docs/quality-audit/C09.md#c09-007) | A/P2 | 角丸長方形・多角形・RasterとVector出力先の選択などが不足 | コード上の不足を修正済み | **11/19コード修正記録あり**・現行端末確認は別 | #89 |
| [C09-008](https://github.com/totoro0419/illustro/blob/b463bb156bfb28cd49f41d403990966e5a7c304e/docs/quality-audit/C09.md#c09-008) | A/P2 | グラデーションの反転・繰り返し・楕円状放射が不足 | 修正記録あり・個別完了未認定 | 旧修正記録を引継ぎ・独立した全解決未認定 | #89 |
| [C09-009](https://github.com/totoro0419/illustro/blob/b463bb156bfb28cd49f41d403990966e5a7c304e/docs/quality-audit/C09.md#c09-009) | A/P2 | グラデーションの色停止点を色帯上でドラッグ調整できない | 修正記録あり・個別完了未認定 | 旧修正記録を引継ぎ・独立した全解決未認定 | #89 |
| [C09-010](https://github.com/totoro0419/illustro/blob/b463bb156bfb28cd49f41d403990966e5a7c304e/docs/quality-audit/C09.md#c09-010) | B/P1 | 対称描画のコピー線がペンを離してから生成され描画中に見えない懸念 | 部分対応・コード残件あり | 主要実装あり（11/19再照合、最新版の独立PASSとは別） | #89 |
| [C09-011](https://github.com/totoro0419/illustro/blob/b463bb156bfb28cd49f41d403990966e5a7c304e/docs/quality-audit/C09.md#c09-011) | B/P1 | 図形とグラデーション確定時に作品全サイズの画素を生成し負荷が高い懸念 | 部分対応・コード残件あり | 実測必要（11/19再照合、最新版の独立PASSとは別） | #89 |
| [C09-012](https://github.com/totoro0419/illustro/blob/b463bb156bfb28cd49f41d403990966e5a7c304e/docs/quality-audit/C09.md#c09-012) | B/P2 | グラデーション調整のたびに新Workerを生成し古い計算を取消できない懸念 | 修正記録あり・個別完了未認定 | 旧修正記録を引継ぎ・独立した全解決未認定 | #89 |
| [C09-013](https://github.com/totoro0419/illustro/blob/b463bb156bfb28cd49f41d403990966e5a7c304e/docs/quality-audit/C09.md#c09-013) | B/P2 | 形状追従グラデーションの縮小プレビューと確定後の外観が一致するか未検証 | 部分対応・コード残件あり | 実測必要（11/19再照合、最新版の独立PASSとは別） | #89 |
| [C09-014](https://github.com/totoro0419/illustro/blob/b463bb156bfb28cd49f41d403990966e5a7c304e/docs/quality-audit/C09.md#c09-014) | B/P2 | グラデーションマップの比較画像が最大320px程度で原寸の色の段差を確認できるか未検証 | 部分対応・コード残件あり | 主要実装あり（11/19再照合、最新版の独立PASSとは別） | #89 |
| [C09-015](https://github.com/totoro0419/illustro/blob/b463bb156bfb28cd49f41d403990966e5a7c304e/docs/quality-audit/C09.md#c09-015) | C/P2 | 制作キャンバス上の定規・図形・グラデーション共通編集ハンドルの設計案 | 部分対応・コード残件あり | 改善提案（11/19再照合、最新版の独立PASSとは別） | #89 |
| [C09-016](https://github.com/totoro0419/illustro/blob/b463bb156bfb28cd49f41d403990966e5a7c304e/docs/quality-audit/C09.md#c09-016) | C/P2 | 通常ブラシ・図形・グラデーションの共通吸着基盤への再設計案 | 部分対応・コード残件あり | 改善提案（11/19再照合、最新版の独立PASSとは別） | #89 |
| [C10-001](https://github.com/totoro0419/illustro/blob/b463bb156bfb28cd49f41d403990966e5a7c304e/docs/quality-audit/C10.md#c10-001) | A/P1 | 自由ベクター線の一筆ごとに新規レイヤーを作り、同じ層に複数パスを保持できない | 部分対応・コード残件あり | 主要実装あり（11/19再照合、最新版の独立PASSとは別） | #88 |
| [C10-002](https://github.com/totoro0419/illustro/blob/b463bb156bfb28cd49f41d403990966e5a7c304e/docs/quality-audit/C10.md#c10-002) | A/P1 | ベジェ曲線の制御ハンドルをキャンバスでドラッグできず数値編集が中心 | 部分対応・コード残件あり | 主要実装あり（11/19再照合、最新版の独立PASSとは別） | #88 |
| [C10-003](https://github.com/totoro0419/illustro/blob/b463bb156bfb28cd49f41d403990966e5a7c304e/docs/quality-audit/C10.md#c10-003) | A/P1 | 文字の輪郭化後も元文字レイヤーが表示され重なって外観が変わる | 修正記録あり・個別完了未認定 | 旧修正記録を引継ぎ・独立した全解決未認定 | #84 |
| [C10-004](https://github.com/totoro0419/illustro/blob/b463bb156bfb28cd49f41d403990966e5a7c304e/docs/quality-audit/C10.md#c10-004) | A/P1 | 文字枠の幅・高さと枠に応じた自動改行がない | 修正記録あり・個別完了未認定 | 旧修正記録を引継ぎ・独立した全解決未認定 | #84 |
| [C10-005](https://github.com/totoro0419/illustro/blob/b463bb156bfb28cd49f41d403990966e5a7c304e/docs/quality-audit/C10.md#c10-005) | A/P1 | 図形演算を別レイヤーに追加しても元の図形が見えたままで結果を隠す | 修正記録あり・個別完了未認定 | 旧修正記録を引継ぎ・独立した全解決未認定 | #88 |
| [C10-006](https://github.com/totoro0419/illustro/blob/b463bb156bfb28cd49f41d403990966e5a7c304e/docs/quality-audit/C10.md#c10-006) | A/P2 | 図形演算の結果が元の形と連動しないため後から非破壊で編集できない | コード上の不足を修正済み | **11/19コード修正記録あり**・現行端末確認は別 | #88 |
| [C10-007](https://github.com/totoro0419/illustro/blob/b463bb156bfb28cd49f41d403990966e5a7c304e/docs/quality-audit/C10.md#c10-007) | A/P2 | 離れた2本のベクター線も接続候補として直線でつなぎ誤結合する条件 | 修正記録あり・個別完了未認定 | 旧修正記録を引継ぎ・独立した全解決未認定 | #88 |
| [C10-008](https://github.com/totoro0419/illustro/blob/b463bb156bfb28cd49f41d403990966e5a7c304e/docs/quality-audit/C10.md#c10-008) | A/P2 | 線全体を触れるだけで消すベクター消しゴムがない | 修正記録あり・個別完了未認定 | 旧修正記録を引継ぎ・独立した全解決未認定 | #88 |
| [C10-009](https://github.com/totoro0419/illustro/blob/b463bb156bfb28cd49f41d403990966e5a7c304e/docs/quality-audit/C10.md#c10-009) | A/P2 | 文字の一部分だけを選択して別の書式を設定できない | 部分対応・コード残件あり | 主要実装あり（11/19再照合、最新版の独立PASSとは別） | #84 |
| [C10-010](https://github.com/totoro0419/illustro/blob/b463bb156bfb28cd49f41d403990966e5a7c304e/docs/quality-audit/C10.md#c10-010) | A/P2 | 日本語の縦書きで句読点・小書き仮名の調整が簡略化されている | コード上の不足を修正済み | **11/19コード修正記録あり**・現行端末確認は別 | #84 |
| [C10-011](https://github.com/totoro0419/illustro/blob/b463bb156bfb28cd49f41d403990966e5a7c304e/docs/quality-audit/C10.md#c10-011) | B/P1 | 文字の全画素生成を画面側で同期実行するため大作品で応答低下する懸念 | 部分対応・コード残件あり | 実測必要（11/19再照合、最新版の独立PASSとは別） | #84 |
| [C10-012](https://github.com/totoro0419/illustro/blob/b463bb156bfb28cd49f41d403990966e5a7c304e/docs/quality-audit/C10.md#c10-012) | B/P1 | 通常表示と輪郭化で別々の文字配置計算を用い外観の一致が未検証 | 修正記録あり・個別完了未認定 | 旧修正記録を引継ぎ・独立した全解決未認定 | #84 |
| [C10-013](https://github.com/totoro0419/illustro/blob/b463bb156bfb28cd49f41d403990966e5a7c304e/docs/quality-audit/C10.md#c10-013) | B/P2 | ベクター曲線を図形演算時に有限個の折れ線へ分割することで曲線精度が落ちる懸念 | 部分対応・コード残件あり | 主要実装あり（11/19再照合、最新版の独立PASSとは別） | #88 |
| [C10-014](https://github.com/totoro0419/illustro/blob/b463bb156bfb28cd49f41d403990966e5a7c304e/docs/quality-audit/C10.md#c10-014) | B/P2 | 取り込めるフォントでも輪郭化に使えない形式がある可能性 | 修正記録あり・個別完了未認定 | 旧修正記録を引継ぎ・独立した全解決未認定 | #84 |
| [C10-015](https://github.com/totoro0419/illustro/blob/b463bb156bfb28cd49f41d403990966e5a7c304e/docs/quality-audit/C10.md#c10-015) | C/P2 | 線を直接選択し点・ハンドル・線幅を操作する共通UIの設計案 | 部分対応・コード残件あり | 改善提案（11/19再照合、最新版の独立PASSとは別） | #88 |
| [C10-016](https://github.com/totoro0419/illustro/blob/b463bb156bfb28cd49f41d403990966e5a7c304e/docs/quality-audit/C10.md#c10-016) | C/P2 | ベクター・文字の表示を編集した領域だけ再計算する設計案 | 修正記録あり・個別完了未認定 | 旧修正記録を引継ぎ・独立した全解決未認定 | #84 |

## 5. 実装の重点と実機未確認事項
**まず作品の消失防止・保存復元・作品ID衝突・レイヤー整合を守る。** 次にブラシ補正・太い筆跡中の表示遅延、塗り/選択/変形/図形の操作入口と確定結果、タブレットUIの数値入力と設定復元を優先。塗りに関しては `fill/panel.ts` で参照元・塗り先・除外対象・ドラッグ中候補の処理を確認済みだが、機能群の全能力の完成・表示一致・実機速度は未検証。必要な修正を本計画のK20/K21で検証してから判断する。

実機へ引継ぐのは①実物のペン/指の同時操作と手ぶれ補正の体感、②太いエアブラシなど描画中の追従・ちらつき、③4K・多数層での塗り/履歴/変形性能、④レイヤーの選択と編集・プレビューの直感性、⑤保存失敗/復旧時の誤案内。ブラウザ/実機検査を行わない本作業だけで、これらをPASSにはできない。

## 6. C01〜C10の監査分母に入れなかった92件
保留・除外・後発機能を勝手に復活させないため、現在採否も含めて全て列挙する。

| 分野 | 件数 | 対象外ID（最終製品台帳での状態） |
|---|---:|---|
| WET | 7 | WET-001、WET-002（included_limited）、WET-003（deferred）、WET-004（deferred）、WET-005（included_limited）、WET-006、WET-007 |
| COL | 5 | COL-006、COL-007、COL-008、COL-009、COL-010（deferred） |
| VEC | 1 | VEC-008（deferred） |
| FX | 45 | FX-001、FX-002、FX-003、FX-004、FX-005、FX-006、FX-007、FX-008、FX-009、FX-101、FX-102、FX-103、FX-104、FX-105、FX-106、FX-107、FX-108、FX-109、FX-110、FX-111、FX-112、FX-113、FX-114、FX-115、FX-116、FX-117、FX-118、FX-119、FX-120、FX-121、FX-122、FX-123、FX-124、FX-125、FX-126、FX-127、FX-128、FX-129、FX-130、FX-131、FX-132、FX-133、FX-134、FX-135、FX-136 |
| IO | 8 | IO-002、IO-003、IO-004、IO-005、IO-006、IO-007、IO-008、IO-009 |
| AUT | 6 | AUT-001、AUT-002、AUT-003、AUT-004、AUT-005、AUT-006（deferred） |
| REC | 4 | REC-001、REC-002、REC-003、REC-004 |
| A11 | 6 | A11-001、A11-002、A11-003、A11-004、A11-005、A11-006 |
| AI | 4 | AI-001、AI-002、AI-003、AI-004 |
| EXT | 5 | EXT-001（deferred）、EXT-002（deferred）、EXT-003（deferred）、EXT-004（excluded_suite）、EXT-005（deferred） |
| PIX | 1 | PIX-003（deferred） |

## 7. 未確定のまま残ること
コードファイルの存在/一部処理を調べただけでは、全機能のF0〜F5（説明可能な仕様、実装、UI到達性、操作工程、保存連携、端末品質）がすべて成立したことにならない。台帳の未確認104件について、実際の処理の全分岐とUI接続の精読・対象テストが残る。これを誤って「未実装」と断定せず、[STEP2実装計画](C01-C10-IMPLEMENTATION-PLAN.md)の担当と完成条件に割り付ける。今回の成果物は**現行の証拠に基づく全件分類と実行計画**であり、「全機能の完成検証済み」ではない。
