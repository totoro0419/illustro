# Repository / legacy audit

## 基点と継承

main: `bdc7135b51033982d90ea5dad104bb04fc107df2`。PR #8のチェックポイント `dad1be006a77777487a4adba65bed36f53c261bf` から再開。PR #5 Region/Connectivity、#6 UI、#7 Raster Regionは別の作業として保持し、mainへマージしない。

接続切れ前のBrush実装ファイルはチェックポイントから完全復元できなかった。再開後に読めた作業途中の型付き・packed実装を孤立したworktreeへ移し、入力/補正/被覆境界/プリセット/描画スケジューラ/Core adapter/ラボを修正し、今回のソースを改めて検証した。並行して変更される元workspaceのブランチは上書きしない。旧253件等の数値は今回の実装の証拠に使わない。

参照した資料はArchitecture V1、ADR-0004、Performance Policy、Brush/Eraser interaction、Legacy Reference Policy、過去 `prototypes/v2-validation/src/brush.js` と `device/brush-core.js`、Philox実装。古いRegion実装一式を現行Coreへ取り込んでいない。

## 採用したもの

| 原則 | 今回の実装と検証 |
|---|---|
| One Euro候補4/4/1 | 補正0.5時に維持。0は完全OFF、筆圧の補正は独立。合成ジッタと小ループの変形を測定 |
| 安定prefix / 可変tail | 256コマンドページを実際にsinkへ所有権付き配信。8192コマンドtail。previewはcanonical状態を復元 |
| 決定論的乱数 | Philox4x32-10、独立stream、既知vectorとBigInt独立参照1000例 |
| canonical入力 | coalescedを親入力の代わりに採用。予測入力拒否。同一時刻・同一値の重複除去。センサーのみの変化は保持 |
| 座標の確定 | 受信時にdocument座標へ変換。viewGenerationは診断Sampleに保持。Recordは確定document座標 |
| semantic replay | 復元geometry・固定Preset/埋込み画像・seed/algorithm version・生成コマンドを保存 |
| Core ownership | transactionでtileを編集し、同じrevisionにstroke JSONを記録。Undo/Redoは既存root切替 |

旧コードのページ数カウンターだけでは実保存や総メモリ上限を証明できない。今回のsink deliveryは直接テストしているが、履歴や受信側が全ページを保持すれば総量は増える。公開CPUラボも履歴を保持し、上限を明示して失敗を表示する。

## 修正した欠陥

回転したrect/bristle/mask先端が旧radius+1境界で欠ける問題を修正。40px角先端の45度回転で中心から約26pxの画素を含める回帰と、全画素独立走査で7先端・極小サイズ・aspect・角度を検証した。補正OFF、mouse pressure fallback、異常JSON拒否、壊れたimportの原画保持、保持エアブラシの末尾位置、巨大dabの分割も検証した。

## 履歴と証拠の境界

旧Xiaomi計測と過去の人の感想は歴史資料。今回のChromiumのCDP penは合成入力で、`isTrusted`も物理ペンの証明にならない。現在の実機Android・発熱・物理input-to-display・人の描画評価はUNVERIFIED。

Core変更はhistory/transaction/commitのsemantic operation追加のみ。P0の既存29テストとbuildを確認。GPU/選択範囲/製品保存/クラッシュ復旧を通した統合は未検証。
