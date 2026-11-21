# Illustro C03〜C10｜残37件の実装指示書（実コード行番号付き）

> **2026-11-19 元調査との再照合による重要訂正**：この旧指示書には C06-015（貼り付け問題をコピーへ変更）、C10-009（選択文字の書式変更を文字輪郭化へ変更）など、元の問題IDとの不一致がありました。現在のコードには元指摘を解消する主要機能が複数存在します。実装の優先順位・元問題の定義・採用可否は、[元問題と現在コードを全37件照合した再検査](https://github.com/totoro0419/illustro/blob/quality/C03-C10-integration/docs/quality-integration/SOURCE-RECHECK-37-2026-11-19.md)を**最優先の参照資料**としてください。「37件すべてが機能未実装」と解釈しないでください。


**基準ソース:** `ffdc51c8ddfb38bff6288a3b6e39e149ffb9f170`（2026-11-19取得） ／ **作業先:** `quality/C03-C10-integration`  
**根拠:** [129件の進捗表](https://github.com/totoro0419/illustro/blob/quality/C03-C10-integration/docs/quality-integration/PROGRESS-129.md)、[Issue #92](https://github.com/totoro0419/illustro/issues/92)、[PR #73](https://github.com/totoro0419/illustro/pull/73)  
**重要:** この文書はソースの処理入口を確認したうえで作成した**修正案・完了試験仕様**。提案した変更自体は未実装・未検証。提示した行番号は上記コミットに固定。以後は関数名を探索して最新差分を確認する。各IDの完了には、案どおり改造したという報告だけでなく、受入テストの成功が必要。Android実機でしか確認できない事項は別に保持する。  
**見落とし防止:** 残る92件は「修正記録あり・個別完了未認定」。37件を終えた後、それらも独立してコード上の残存条件を照合する。

**詳細検査:** [37件すべてのソース照合・既存テストと追加受入試験・注意点](https://github.com/totoro0419/illustro/blob/quality/C03-C10-integration/docs/quality-integration/REMAINING-37-VERIFICATION-AUDIT-2026-11-19.md)（2026-11-19）。この文書の提案は、詳細検査で既存実装の存在を確認した部分を重複実装しないよう訂正済み。

## 開発セッションの割当・実装順

- **タスク①（毎時00分）:** C06 → C07 → C08 → C03/C04/C05。主に選択・変形・線画と安全性を担当
- **タスク②（毎時30分）:** C09 → C10。主に図形・定規・文字・ベクターを担当
- 両タスクとも他方の最新コミットを取得し、共通の `brushSurface.ts`、`artwork/render.ts`、`main.ts`、進捗MDでは同時書込みをしない。必要なら別の独立課題に切替える。
- **一括修正:** 共通原因の3〜8 IDを1組として、コードを変更 → 対象テスト → 型検査・ビルド → コミット → 次の組へ。細かな「部分改善」だけを繰り返さない。未完成なら理由を記録。
- **完了判定:** (1) 指摘された不足分岐がコード上でなくなった、(2) 例示した合格テストが成功、(3) 既存作品の保存形式/Undo/Redoを破壊しない、(4) CI成功。実機承認は別区分。主要機能で端末特有の問題が確認できた場合は未解決へ戻す。

## 37件の変更箇所と合格条件

### C03｜履歴（1件）

| 問題ID | 修正するファイル・基準行 | 具体的にどう変えるか | 解決確認の条件 |
|---|---|---|---|
| C03-007 | [editor/ui/artworkHistoryView.ts:20–43](https://github.com/totoro0419/illustro/blob/ffdc51c8ddfb38bff6288a3b6e39e149ffb9f170/apps/editor/src/ui/artworkHistoryView.ts#L20-L43) | 履歴プレビューで `renderFrozenArtworkTiledPreview` が使えない場合に全4Kを復元する分岐を検査する。タイルが使える環境では縮小直接合成を優先。互換手段がない環境の正確な復元処理は安易に削除せず、メモリ使用量と遅延を計測して改善する。`historyThumbnailCache.ts:11-29` の生成中の重複排除は維持。 | 4000×4000・多数履歴・低機能環境で160×120画像を作る際に全画素配列を常時作らず、元画像と同等の縮小結果を確認。 |

### C04｜マクロ（1件）

| 問題ID | 修正するファイル・基準行 | 具体的にどう変えるか | 解決確認の条件 |
|---|---|---|---|
| C04-002 | [editor/ui/simpleMacros.ts:44–62](https://github.com/totoro0419/illustro/blob/ffdc51c8ddfb38bff6288a3b6e39e149ffb9f170/apps/editor/src/ui/simpleMacros.ts#L44-L62) | `invokeMacroSequence` の `settled=false` を生むコマンドを追跡し、`commandPalette.ts:10-15` の `invokeAsync` が完了まで待てる対象コマンドを追加。完了を検知できないUIクリックは成功表示しない。 | 保存・新規レイヤー作成・Undo等のマクロを続けて実行し、各ステップの完了まで次へ進まない。失敗・取消も正しく表示。 |

### C05｜素材（1件）

| 問題ID | 修正するファイル・基準行 | 具体的にどう変えるか | 解決確認の条件 |
|---|---|---|---|
| C05-020 | [editor/assets/materialUseRouting.ts:2–25](https://github.com/totoro0419/illustro/blob/ffdc51c8ddfb38bff6288a3b6e39e149ffb9f170/apps/editor/src/assets/materialUseRouting.ts#L2-L25) | `materialUseRoute` の素材形式別振分と `assetPanel.ts:122-185` の適用処理を照合し、色・質感・ブラシサイズ等を保持・指定できない素材種別について、必要な設定入力と適用先を追加。非対応データは理由を表示。 | 各素材種別の使用操作が実際の描画設定に反映。保存・再起動後も同じ見た目で、素材を別形式として誤適用しない。 |

### C06｜選択・コピー（4件）

| 問題ID | 修正するファイル・基準行 | 具体的にどう変えるか | 解決確認の条件 |
|---|---|---|---|
| C06-001 | [editor/brushSurface.ts:905–960](https://github.com/totoro0419/illustro/blob/ffdc51c8ddfb38bff6288a3b6e39e149ffb9f170/apps/editor/src/brushSurface.ts#L905-L960) | 選択範囲付き描画の仮線で、現在の透明度マスクを消しゴム・特殊合成・背面描画にも反映。ブラシ計算の実線と同じ合成順序を仮表示に共有し、選択外を描かない。 | 選択の境界を横切るペン・消しゴム・特殊合成で仮線と確定結果を原画素で比較。キャンセル時に仮線が残らない。 |
| C06-002 | [editor/selection/tileCapture.ts:80–165](https://github.com/totoro0419/illustro/blob/ffdc51c8ddfb38bff6288a3b6e39e149ffb9f170/apps/editor/src/selection/tileCapture.ts#L80-L165) | `captureSelectedLayerTiles` が変化する筆跡でも既存タイルをすべて読み出す処理を、変更タイルの取得＋既存タイル参照のままの更新へ段階化。呼出元 `brushSurface.ts:1041-1085` とWorker側で安全な部分更新を扱う。 | 4Kの小筆跡でGPU読戻しタイル数が変更領域にほぼ比例。既存線・透明RGB・マスク・Undo/Redoが全タイル経路と一致。 |
| C06-007 | [editor/selection/brushPreview.ts:7–37](https://github.com/totoro0419/illustro/blob/ffdc51c8ddfb38bff6288a3b6e39e149ffb9f170/apps/editor/src/selection/brushPreview.ts#L7-L37) | `selectionBrushPreviewDabs` に落ちるWorker非対応時の長い線の仮表示を、上限付き区間処理・段階的描画で近似表示から可能な限り確定用の濃さ・重なりへ合わせる。`liveBrushPreview.ts:17-65` と整合。 | Worker停止時も600点以上の線で仮表示が途切れず、筆圧・加算/減算・描画終了の結果一致を検査。 |
| C06-015 | [editor/selection/clipboard.ts:255–346](https://github.com/totoro0419/illustro/blob/9b726852bcad78ab3e1985cc07249339d8520ae6/apps/editor/src/selection/clipboard.ts#L255-L346) | **元指摘は小範囲の「貼り付け」。** 現行コードは `forEachPastedTile` で必要なタイルだけ作るため、まず4Kへの12×12画素貼り付けが全画素確保なしでできているかを検査する。コピーや合成コピーの最適化は**別の課題**にする。 | タイル生成数、転送・割当、貼り付け結果・Undo/Redoを既存テストと照合。問題がなければ新規実装せず元指摘のコード対応ありと判断。 |

### C07｜変形（6件）

| 問題ID | 修正するファイル・基準行 | 具体的にどう変えるか | 解決確認の条件 |
|---|---|---|---|
| C07-001 | [editor/transform/previewReplacement.ts:11–48](https://github.com/totoro0419/illustro/blob/ffdc51c8ddfb38bff6288a3b6e39e149ffb9f170/apps/editor/src/transform/previewReplacement.ts#L11-L48) | 一部の上位レイヤーだけ安全に置換する判定を見直し、`transform/panel.ts:663-742` の編集中プレビューを作品のレイヤー順に合成する描画経路へ接続する。上から重ねるだけの近似を残さない。 | 乗算・クリッピング・複数上位レイヤー・レイヤーマスクを重ね、操作中と確定結果の画素差を検証。 |
| C07-002 | [editor/transform/originalStrokePreview.ts:7–15](https://github.com/totoro0419/illustro/blob/ffdc51c8ddfb38bff6288a3b6e39e149ffb9f170/apps/editor/src/transform/originalStrokePreview.ts#L7-L15) | 縮小した原画像への筆入力をいったん縮小画素へ描くのではなく、原寸座標の元ストロークを保持して部分区画だけ再描画・縮小する。`transform/worker.ts:39-46` の同じ筆設定と乱数種を利用。 | 原寸と縮小表示の筆先位置・濃さ・入り抜きを比較。キャンセル/連続描画で古いWorker応答が表示されない。 |
| C07-003 | [editor/transform/groupTransform.ts:13–85](https://github.com/totoro0419/illustro/blob/ffdc51c8ddfb38bff6288a3b6e39e149ffb9f170/apps/editor/src/transform/groupTransform.ts#L13-L85) | `composeGroupAffine` と `groupTransformPlan` は現在アフィン一括変形のみ。まず特殊レイヤーと非アフィン変形で保持すべきデータ・保存互換・Undoを設計し、非破壊で保証できる範囲から拡張する。特殊レイヤーの編集可能情報は潰さず、共通変形を合成。 | 通常レイヤー＋マスク＋特殊レイヤーの複数選択で変形し、位置関係・表示・保存復元・Undo/Redoが維持される。 |
| C07-004 | [editor/transform/postPaintPreview.ts:9–43](https://github.com/totoro0419/illustro/blob/ffdc51c8ddfb38bff6288a3b6e39e149ffb9f170/apps/editor/src/transform/postPaintPreview.ts#L9-L43) | 後から描いた筆跡を編集中にも正確な合成に追加し、`transform/worker.ts:39-46` と `panel.ts:663-742` の更新順序を固定する。操作中の縮小画像でも後描きが消えないようにする。 | 変形後に描いた線が次の変形をドラッグする間も表示され、停止後・確定後と一致する。 |
| C07-007 | [editor/transform/panel.ts:663–742](https://github.com/totoro0419/illustro/blob/ffdc51c8ddfb38bff6288a3b6e39e149ffb9f170/apps/editor/src/transform/panel.ts#L663-L742) | 直接ハンドルでの回転/拡縮中は軽量近似、停止時だけ原寸の現状を改善。操作中でも最新の合成プレビューが追従するよう、入力の間引き・差分区画レンダリング・中断処理を調整。 | Androidのタッチとペンで直接ハンドルを連続ドラッグでき、取り違え・古い画像・著しい遅延がない。 |
| C07-014 | [editor/transform/geometry.ts:86–140](https://github.com/totoro0419/illustro/blob/ffdc51c8ddfb38bff6288a3b6e39e149ffb9f170/apps/editor/src/transform/geometry.ts#L86-L140) | `sampleAreaBox` と `transformRaster` の強い非アフィン変形で分割上限に達する条件を検出し、誤差上限に従って適応的に追加分割、超過時は品質を黙って低下させず安全に再試行/明示。 | 64倍縮小や大きな歪みを含むテスト画像と参照高精度計算の画素差が許容範囲。4K応答時間・メモリも計測。 |

### C08｜塗り（6件）

| 問題ID | 修正するファイル・基準行 | 具体的にどう変えるか | 解決確認の条件 |
|---|---|---|---|
| C08-001 | [editor/fill/pixels.ts:110–198](https://github.com/totoro0419/illustro/blob/ffdc51c8ddfb38bff6288a3b6e39e149ffb9f170/apps/editor/src/fill/pixels.ts#L110-L198) | `fillBoundaries` の毛先向き・通路チェックを複雑線画テストで検証し、曖昧な交差/細い通路は自動接続しない。誤接続しそうな候補は手動承認へ残す。 | 線端、十字交差、並行線、狭い通路などの正解例で誤接続ゼロ、必要な隙間のみ候補化。 |
| C08-003 | [editor/fill/liveRegionPreview.ts:24–187](https://github.com/totoro0419/illustro/blob/ffdc51c8ddfb38bff6288a3b6e39e149ffb9f170/apps/editor/src/fill/liveRegionPreview.ts#L24-L187) | `addTraceRegions` と `renderLiveRegionPreview` の縮小画像だけの領域推定を、`fill/pixels.ts:284-359` の確定マスクと同じ演算へ連携。囲い塗りの途中表示も追加。 | 線画領域をなぞる/囲む途中の原寸マスクと確定マスクを比較し、選択・除外/追加領域・途中入力補正で一致。 |
| C08-007 | [editor/fill/pixels.ts:241–262](https://github.com/totoro0419/illustro/blob/ffdc51c8ddfb38bff6288a3b6e39e149ffb9f170/apps/editor/src/fill/pixels.ts#L241-L262) | `roundedEdge` と `fillMask:342-360` には既に半透明の境界処理がある。直線・斜線・曲線の参照画像を比較し、不自然な太りや色にじみが確認された箇所だけ改善。元線画と消しゴムの保護条件を守る。 | 直線・曲線・斜め境界の比較で不自然な太り/色にじみがなく、端の半透明画素が滑らか。 |
| C08-011 | [editor/fill/worker.ts:18–75](https://github.com/totoro0419/illustro/blob/ffdc51c8ddfb38bff6288a3b6e39e149ffb9f170/apps/editor/src/fill/worker.ts#L18-L75) | `fill` / `graph` / `live-fill` の入力転送・`fillMask` 結果生成で不要な全画素コピーを整理。大きな候補は共有/再利用する元画像と変更区画のみを扱う経路を追加し、利用不能時は従来処理。 | 4000×4000の繰返し塗りで配列割当・入力転送・画面停止が低減し、同じRGBA結果・取消動作を維持。 |
| C08-014 | [editor/fill/pixels.ts:450–529](https://github.com/totoro0419/illustro/blob/ffdc51c8ddfb38bff6288a3b6e39e149ffb9f170/apps/editor/src/fill/pixels.ts#L450-L529) | `suggestLocalGaps` の候補点数付けと `fillBoundaries` の毛先判定を統一し、分岐部や隣接線の誤候補を排除。候補を「自動適用可/要確認」に分けて根拠表示。 | 実線画サンプルで誤接続しない。補完した場所をユーザーが取り消せ、線画の画素自体は変更しない。 |
| C08-015 | [editor/fill/incrementalBoundary.ts:21–132](https://github.com/totoro0419/illustro/blob/ffdc51c8ddfb38bff6288a3b6e39e149ffb9f170/apps/editor/src/fill/incrementalBoundary.ts#L21-L132) | `tryIncrementalBoundaryAddition` / `Removal` で全解析へ戻る線画の分断・結合ケースを検査する。部分計算で正しい領域判定を保証できるケースだけ高速化し、それ以外の全解析への安全な切替えを保持。`changedRegions.ts:7-85` との領域ID・隣接情報を合わせる。 | 部分変更100パターン以上で、変更部分だけの再計算と全再解析のラベル/境界/外側判定が一致。 |

### C09｜定規・図形（10件）

| 問題ID | 修正するファイル・基準行 | 具体的にどう変えるか | 解決確認の条件 |
|---|---|---|---|
| C09-004 | [editor/artwork/shapeGradient.ts:102–282](https://github.com/totoro0419/illustro/blob/ffdc51c8ddfb38bff6288a3b6e39e149ffb9f170/apps/editor/src/artwork/shapeGradient.ts#L102-L282) | `smallPathPreviewCoverage` / `sparsePixelPreviewCoverage` の画素数上限超過時に点サンプルへ落ちる分岐を、大規模でも細線を保持する領域分割・段階描画に改善。 | 密集マスクと自由形状/選択反転を縮小し、原画素面積平均を基準に境界と細線が欠落しない。 |
| C09-005 | [editor/artwork/shapeGradient.ts:490–533](https://github.com/totoro0419/illustro/blob/ffdc51c8ddfb38bff6288a3b6e39e149ffb9f170/apps/editor/src/artwork/shapeGradient.ts#L490-L533) | `pumpLive` の編集点ドラッグを、Worker故障・複雑なマスクでも表示できる段階的フォールバックへ整備。確定と同じ図形パラメータ/選択を使う。 | ベジェ制御点・グラデーション始終点を動かす間、キャンバス上の仮表示が消えず、確定後の外観と一致。 |
| C09-006 | [editor/brushSurface.ts:81–132](https://github.com/totoro0419/illustro/blob/ffdc51c8ddfb38bff6288a3b6e39e149ffb9f170/apps/editor/src/brushSurface.ts#L81-L132) | `updateCorrectionHoldOutline` の点線SVG仮表示を、`strokeCorrection.ts:13-54` の補正形状＋実ブラシ設定で描く非破壊仮表示へ拡張。現在の線を確定するまでは履歴を変更しない。 | ペン保持中の直線・楕円補正の太さ・筆圧・質感を確認でき、離した後の結果と一致する。 |
| C09-007 | [editor/artwork/shapeGradient.ts:379–414](https://github.com/totoro0419/illustro/blob/ffdc51c8ddfb38bff6288a3b6e39e149ffb9f170/apps/editor/src/artwork/shapeGradient.ts#L379-L414) | 長方形/角丸/多角形は既に選択肢にあるため二重実装しない。実際に不足する出力先（Raster/Vector）の選択・保存処理と各図形への反映を補う。 | 各図形をRaster（画素として編集）またはVector（点を動かして編集）として保存でき、Undo/Redoと旧作品の読込を維持。 |
| C09-010 | [editor/brushSurface.ts:449–482](https://github.com/totoro0419/illustro/blob/9b726852bcad78ab3e1985cc07249339d8520ae6/apps/editor/src/brushSurface.ts#L449-L482) | 元のB指摘は「筆を離すまで対称コピー線が見えない懸念」。現在はペン入力中にコピー線のSVGを更新する経路がある。表示有無をまず確認し、筆圧・質感まで含む本物の仮線は**追加の品質改善**として扱う。 | 描画中のコピー線が見え、消去・確定時に残像がない。高度な質感一致は別途画質検査。 |
| C09-011 | [editor/artwork/render.ts:81–131](https://github.com/totoro0419/illustro/blob/ffdc51c8ddfb38bff6288a3b6e39e149ffb9f170/apps/editor/src/artwork/render.ts#L81-L131) | `gradientPixels` の全出力RGBA確保と画素ループについて、操作中の小さな変更では変更領域・タイル単位の再描画を優先する。最終書出しで必要な全画素の生成は維持。`run.ts:85-117` のWorkerとの連携で不要な全4K再描画を回避。 | 小さなグラデーション更新で全画素再作成せず、レイヤー合成・保存画像・取消結果が従来と完全一致。 |
| C09-013 | [editor/artwork/shapeGradient.ts:490–533](https://github.com/totoro0419/illustro/blob/ffdc51c8ddfb38bff6288a3b6e39e149ffb9f170/apps/editor/src/artwork/shapeGradient.ts#L490-L533) | 形状追従グラデーションの `pumpLive` で用いる縮小経路を、`artwork/render.ts:81-131` の確定用グラデーション・マスク計算と共通化。 | 凸凹形状・境界・半透明の原寸参照画像と縮小プレビューの色・透過率の差を自動比較。 |
| C09-014 | [editor/artwork/gradientMap.ts:21–37](https://github.com/totoro0419/illustro/blob/9b726852bcad78ab3e1985cc07249339d8520ae6/apps/editor/src/artwork/gradientMap.ts#L21-L37) | 元のB指摘は「320px縮小画像では原寸の色差を見られない懸念」。現行コードは中央128×128の**原寸比較**を実装済み。任意の位置での比較機能は追加改善案であり、元問題の必須修正と混同しない。 | 1:1画素を維持した画像で加工前後を確認できること、保存用RGBAを変えないことを確認。 |
| C09-015 | [editor/artwork/shapeGradient.ts:490–620](https://github.com/totoro0419/illustro/blob/ffdc51c8ddfb38bff6288a3b6e39e149ffb9f170/apps/editor/src/artwork/shapeGradient.ts#L490-L620) | 図形とグラデーションの編集点を `ruler.ts:11-179` の定規操作と共通のハンドル操作に統一し、Worker失敗時も仮表示と取消が一貫するようにする。 | 定規・図形・グラデーションで選択/移動/解除/取消が同じ操作。確定値と表示値が一致。 |
| C09-016 | [editor/strokeGuide.ts:25–100](https://github.com/totoro0419/illustro/blob/ffdc51c8ddfb38bff6288a3b6e39e149ffb9f170/apps/editor/src/strokeGuide.ts#L25-L100) | `lockArtworkGuide` / `snapToStraightGuide` の吸着判断を通常ブラシだけでなく図形・グラデーション編集点にも共通利用。Shift等による一時解除・吸着表示を統一。 | 全図形/編集点で吸着・解除・倍率変更時の座標一致と予期しないスナップ無しを検証。 |

### C10｜ベクター・文字（8件）

| 問題ID | 修正するファイル・基準行 | 具体的にどう変えるか | 解決確認の条件 |
|---|---|---|---|
| C10-001 | [editor/artwork/vectorPanel.ts:153–181](https://github.com/totoro0419/illustro/blob/ffdc51c8ddfb38bff6288a3b6e39e149ffb9f170/apps/editor/src/artwork/vectorPanel.ts#L153-L181) | 既存の「選んだレイヤーに線を追加」と `pathOperations.ts:65-79` の機能を、通常の自由ベクター描画からも使えるようにする。互換条件を満たす選択レイヤーには自動追記、別レイヤー作成は明示操作にする。 | 同一ベクターレイヤーへ連続10筆、別色/閉曲線時の安全な分離、Undo/Redo、保存復元を検査。 |
| C10-002 | [editor/artwork/vectorPanel.ts:91–136](https://github.com/totoro0419/illustro/blob/ffdc51c8ddfb38bff6288a3b6e39e149ffb9f170/apps/editor/src/artwork/vectorPanel.ts#L91-L136) | `pumpPointPreview` と `previewPointDrag` を同じ編集点計算で維持しつつ、4Kの画素縮小・レイヤー合成・Worker非対応時の描画まで拡張。 | 点とハンドルの移動中・取消・確定の座標/外観一致。Androidのペン・タッチ操作を別途実機確認。 |
| C10-006 | [editor/artwork/vectorPanel.ts:318–344](https://github.com/totoro0419/illustro/blob/ffdc51c8ddfb38bff6288a3b6e39e149ffb9f170/apps/editor/src/artwork/vectorPanel.ts#L318-L344) | 「演算前の形を直す→再計算」ボタン頼みの更新を、`packages/core/src/editableArtwork.ts:19,98-109` の演算元情報から自動再計算する仕組みに変更。参照循環・元の削除・旧ファイル互換を設計して守る。 | 2つの元図形を編集すると結果が再計算され、保存・Undo/Redo・復元でも関係が保持。 |
| C10-009 | [editor/artwork/textPanel.ts:163–200](https://github.com/totoro0419/illustro/blob/9b726852bcad78ab3e1985cc07249339d8520ae6/apps/editor/src/artwork/textPanel.ts#L163-L200) | **元指摘は選択した文字の一部だけ書式変更できないこと。** 現行コードに選択範囲の色・サイズ・書体・太字・斜体の編集と `textStyles.test.ts` が存在。文字の輪郭化は**別問題**なので、このIDの修正条件から外す。 | 文章の一部だけ書式変更→他の文字不変→保存再読込→Unicode/絵文字境界→Undo/Redoを検査。 |
| C10-010 | [editor/artwork/verticalGlyph.ts:4–17](https://github.com/totoro0419/illustro/blob/ffdc51c8ddfb38bff6288a3b6e39e149ffb9f170/apps/editor/src/artwork/verticalGlyph.ts#L4-L17) | 日本語縦書きの句読点・小書き仮名の位置調整を固定の文字別補正だけでなくフォントが持つ縦組み情報を優先する処理に拡張。`fonts.ts:138-175` と通常表示でも同じ規則を共有。 | 日本語縦書きの句読点・小書き・混在欧文を複数フォントで表示/輪郭化し、位置と向きの一致を検証。 |
| C10-011 | [editor/artwork/run.ts:50–116](https://github.com/totoro0419/illustro/blob/ffdc51c8ddfb38bff6288a3b6e39e149ffb9f170/apps/editor/src/artwork/run.ts#L50-L116) | Worker停止時に `artworkWorkerFallbackAllowed` 経由で画面側に長い文字描画が戻る経路を制御。大きい文字レイヤーは分割描画と処理中の入力譲渡を行い、Workerが復旧可能なら再利用。 | Workerなし/障害時でも大きな文章が操作を長時間止めず、描画・取消・保存が成立。 |
| C10-013 | [editor/artwork/pathOperations.ts:140–234](https://github.com/totoro0419/illustro/blob/ffdc51c8ddfb38bff6288a3b6e39e149ffb9f170/apps/editor/src/artwork/pathOperations.ts#L140-L234) | `sampledPath` には誤差評価による適応分割が既にある。極端な曲線/楕円と点数上限時の画素差・エラー処理を検査し、不足が実証された箇所だけ改善。精度を守れないケースを誤結果で返さず明示し、必要なら曲線を保持する演算経路を追加。 | 細い輪・大曲率曲線の交差/和/差/XORが参照画像と許容誤差内。点数過大や数値異常でも元作品を破壊しない。 |
| C10-015 | [editor/artwork/vectorPanel.ts:186–235](https://github.com/totoro0419/illustro/blob/ffdc51c8ddfb38bff6288a3b6e39e149ffb9f170/apps/editor/src/artwork/vectorPanel.ts#L186-L235) | `setCanvasEditGesture` から点/ハンドル/線幅の直接操作を統一。`vectorPointDrag.ts:6-30` の移動計算と仮表示、キャンセル処理を共通化し、合成レイヤーでも表示整合を取る。 | 線幅・点・ハンドルをキャンバスだけで編集、スナップ・取消・Undoを実行でき、4K操作中も古い表示が残らない。 |

## 実装前後の最低限の確認

1. 対象問題IDの原指摘と最新の進捗記録を読み、すでに実装済みの経路は二重実装しない。上記行番号が古くなったら関数名で追う。
2. 原画素比較が必要な問題は、同一の設定・同一の入力で**操作中表示と確定表示**の両方を比較する。縮小表示は原寸基準を正しい縮小方法で比較。
3. 4K性能は実測なしで「高速化成功」と認定しない。画面停止時間・メモリ使用量・対象タイル数を比較し、低機能環境への戻り経路も調べる。
4. 保存・複製・編集に影響する変更は、新旧の作品データで開く→編集→保存→再読み込み→Undo/Redoを検査する。
5. 各IDに「修正コミット」「合格させたテスト」「未検証条件」「完全解決または部分改善」を記入。37件の完了認定後、残る92件に未確認のコード不足がないか短く確認する。
6. `main` にマージしない。PR #75はDraft維持。PR #73の原調査を変更しない。

## 検証の範囲

上の37件は**現在の進捗台帳で明示されたコード残件**。未確認92件の完全性やAndroid実機での合格は、この文書だけでは証明されない。具体的な修正案は受入テストの合格を条件に採用し、想定と異なるソースが見つかった場合は実装方法だけ修正し、元の問題ID・目的・完了条件は守る。
