# Illustro｜元の37問題に対する現行コードの再検査（2026-11-19）

## 対象・事実の範囲
- **原指摘の一次資料:** [Draft PR #73 のC03〜C10](https://github.com/totoro0419/illustro/pull/73/files)（コミット `b463bb156bfb28cd49f41d403990966e5a7c304e`）
- **照合先:** `quality/C03-C10-integration`、コード基準 `9b726852bcad78ab3e1985cc07249339d8520ae6`
- **追加検査:** 元の各問題タイトル・A/B/C分類と、現在の処理入口および関連する既存テストを実際に再照合。これにより、古い[37件指示書](https://github.com/totoro0419/illustro/blob/quality/C03-C10-integration/docs/quality-integration/REMAINING-37-EXECUTION-PLAN-2026-11-19.md)と[37件検査案](https://github.com/totoro0419/illustro/blob/quality/C03-C10-integration/docs/quality-integration/REMAINING-37-VERIFICATION-AUDIT-2026-11-19.md)に含まれる元IDからの逸脱を判定。
- **検証限界:** 直接実施したのはGitHub上のソース・テスト内容の検査。GitHub Actionsの既存テストの実行成功は別途確認。新しい37件の受入試験を独立実行したことやAndroid実機合格を意味しない。現在のコードに対応機能があっても、不具合ゼロの意味での「完全解決」ではない。

## 重要な結論

**これまでの「37件はすべてコード未完成」というまとめは厳密でない。** 元の37件は「元分類A（コード欠陥報告）21件、B（検証待ちの懸念）11件、C（設計改善案）5件」。現在の進捗表が全てを「部分対応」に残しているのは記録上の状態で、現在の主要機能の欠落が37件あることを証明していない。

今回の静的照合では、**主要実装あり 21件、明確な機能・経路不足 4件、性能/画質の実測を要する 7件、元から任意の改善提案 5件**に分離した。これらはコードと資料に基づく再整理であり、Android/画質/性能の正式PASS件数ではない。

特に **C06-015（貼り付け）**、**C10-009（文字一部の書式）** は以前の指示書で問題の対象を別機能へずらしてしまっていた。**C09-014（中央の原寸比較）**、**C10-013（適応曲線分割）** 等には元の懸念に直接対応する既存コードがあり、二重実装は避ける。

## 一覧（原指摘そのものと照合した37件）

表の「主要実装あり」は元問題に該当する処理が存在することの確認であり、実機PASSの意味ではない。Bは確証のない懸念、Cは採否を検討する改善案として扱う。

| 問題ID | 原分類 | 原指摘 | 現状判定 | 参照コード | コードの確認事実・次の検査 |
|---|---|---|---|---|---|
| C03-007 | B/P2 | 履歴の小さなプレビューに大きな画像を生成する | 実測必要 | [apps/editor/src/ui/artworkHistoryView.ts:20–43](https://github.com/totoro0419/illustro/blob/9b726852bcad78ab3e1985cc07249339d8520ae6/apps/editor/src/ui/artworkHistoryView.ts#L20-L43) | タイル縮小に失敗した場合、原寸画像を再生成する分岐が実在。**次:** タイル利用不能を強制し、4Kの一時メモリ・応答時間・縮小画質を測定。通常経路との差を記録 |
| C04-002 | A/P1 | マクロが終了する前に成功したと表示する | 主要実装あり | [apps/editor/src/ui/simpleMacros.ts:44–63](https://github.com/totoro0419/illustro/blob/9b726852bcad78ab3e1985cc07249339d8520ae6/apps/editor/src/ui/simpleMacros.ts#L44-L63) | 未完了コマンドの次段を停止し、未確認を成功と表示しない。`ui/commandPalette.ts:473-490` で実行済みか区別。**次:** 保存→Undo→やり直しを含むマクロの非同期完了待ちを追加検査。元指摘の早期成功表示と、新しい「途中で止まる」使い勝手問題を分離 |
| C05-020 | C/P2 | 素材種別ごとの実際の利用方法を統一できる | 改善提案 | [apps/editor/src/assets/materialUseRouting.ts:2–28](https://github.com/totoro0419/illustro/blob/9b726852bcad78ab3e1985cc07249339d8520ae6/apps/editor/src/assets/materialUseRouting.ts#L2-L28) | 素材形式別の適用先は既存。元のC分類は任意のUI改善案であり、未実装バグではない。**次:** 実際に紙質・先端・模様などの素材を使って、期待する操作が何回必要か比較。採用判断後に改修 |
| C06-001 | A/P1 | 選択中のブラシの仮表示に選択範囲が反映されない経路 | 実測必要 | [apps/editor/src/brushSurface.ts:917–935](https://github.com/totoro0419/illustro/blob/9b726852bcad78ab3e1985cc07249339d8520ae6/apps/editor/src/brushSurface.ts#L917-L935) | `session.begin` に選択マスクを渡す経路はあるが、全筆種の仮表示との一致は未確認。**次:** 通常筆・特殊合成・消しゴムで選択境界を跨ぎ、仮線/確定画素を一致検査 |
| C06-002 | A/P1 | 選択中の一筆が通常の描画より大きな処理を要求する | 不足確認 | [apps/editor/src/selection/tileCapture.ts:80–165](https://github.com/totoro0419/illustro/blob/9b726852bcad78ab3e1985cc07249339d8520ae6/apps/editor/src/selection/tileCapture.ts#L80-L165) | 無操作の消しゴムを早期除外する改善はあるが、描画が変わる場合に既存全タイルを取得する設計が残る。**次:** 4Kの1タイル更新と多数既存タイルで読戻し量・結果・保存/Undoを比較。差分更新を設計して検証 |
| C06-007 | A/P1 | 選択ブラシで描いている途中の形が仮表示されない | 主要実装あり | [apps/editor/src/selection/liveBrushPreview.ts:6–90](https://github.com/totoro0419/illustro/blob/9b726852bcad78ab3e1985cc07249339d8520ae6/apps/editor/src/selection/liveBrushPreview.ts#L6-L90) | 選択ブラシの描画中プレビュー処理と長筆跡テストが存在。元の「仮表示なし」は現状の全経路には当てはまらない。**次:** Worker失敗時や長い筆跡で仮表示が出るか、確定結果と一致するか検査 |
| C06-015 | B/P2 | 小さい選択範囲の貼り付けにも作品全体の画素配列を確保する懸念 | 主要実装あり | [apps/editor/src/selection/clipboard.ts:255–346](https://github.com/totoro0419/illustro/blob/9b726852bcad78ab3e1985cc07249339d8520ae6/apps/editor/src/selection/clipboard.ts#L255-L346) | 元の懸念対象は「貼り付け」。現行貼付は `forEachPastedTile` で交差タイルだけ生成し、全4K新規配列を避ける。先の計画にあった「コピーの全画素処理」は別件。**次:** 12×12画像を4000×4000へ貼り付け、生成タイル数と最大割当を計測。合成コピーの高速化は別問題として記録 |
| C07-001 | A/P1 | 変形結果が制作キャンバス上でなく小さな別プレビューに表示される | 主要実装あり | [apps/editor/src/transform/panel.ts:663–742](https://github.com/totoro0419/illustro/blob/9b726852bcad78ab3e1985cc07249339d8520ae6/apps/editor/src/transform/panel.ts#L663-L742) | 変形候補を制作キャンバス上に表示するコードが既存。複雑合成は操作停止約220ms後に画面全体を正確合成する分岐がある。**次:** ハンドル連続ドラッグ中/停止後/確定後の表示を比較。遅延中の近似表示と元指摘「別画面しかない」を混同しない |
| C07-002 | A/P1 | 変形前の元画像を編集する画面が小さな専用キャンバスに限定される | 主要実装あり | [apps/editor/src/transform/panel.ts:439–459](https://github.com/totoro0419/illustro/blob/9b726852bcad78ab3e1985cc07249339d8520ae6/apps/editor/src/transform/panel.ts#L439-L459) | 「元の絵に描く」で主キャンバスの編集ジェスチャーへ接続する。専用小キャンバスに限定という元指摘はコード上解消。**次:** 原寸でペン筆跡を編集、キャンセル・再変形・保存を検査 |
| C07-003 | A/P1 | 複数のレイヤー・グループを一括して変形できない | 主要実装あり | [apps/editor/src/main.ts:3932–3979](https://github.com/totoro0419/illustro/blob/9b726852bcad78ab3e1985cc07249339d8520ae6/apps/editor/src/main.ts#L3932-L3979) | 通常の複数レイヤーには一括変形実装あり。特殊レイヤーや非アフィンの一括変形は明示的に拒否。**次:** 通常2〜3枚＋グループで保存/Undo確認。非対応レイヤー追加は仕様拡張として別の合格条件を定義 |
| C07-004 | A/P1 | 変形後に描いた筆がセッション中の変形プレビューに反映されない | 主要実装あり | [apps/editor/src/transform/postPaintPreview.ts:9–43](https://github.com/totoro0419/illustro/blob/9b726852bcad78ab3e1985cc07249339d8520ae6/apps/editor/src/transform/postPaintPreview.ts#L9-L43) | 変形後の追加筆跡をWorkerで合成する関数あり。元指摘の単純な「反映しない」は全面的には当てはまらない。**次:** 高速ドラッグと複雑マスク・合成で順序不一致/取りこぼしがあるか画素比較 |
| C07-007 | A/P2 | 変形の回転・拡縮をキャンバス上の直接ハンドルで操作できない | 主要実装あり | [apps/editor/src/transform/panel.ts:275–317](https://github.com/totoro0419/illustro/blob/9b726852bcad78ab3e1985cc07249339d8520ae6/apps/editor/src/transform/panel.ts#L275-L317) | キャンバス上の回転・拡縮を直接編集点で操作する実装がある。**次:** Androidタッチ/ペンでハンドルのヒット判定・追従・取消を実機確認 |
| C07-014 | B/P2 | 縮小用の画素平均が固定分割で画質が変わる可能性 | 実測必要 | [apps/editor/src/transform/geometry.ts:86–140](https://github.com/totoro0419/illustro/blob/9b726852bcad78ab3e1985cc07249339d8520ae6/apps/editor/src/transform/geometry.ts#L86-L140) | 面積平均の実装があるが強い歪み/巨大縮小で精度が十分か未測定のB分類。**次:** 参照高精度縮小画像と比較し差分画素/最大差を数値で評価。誤差の根拠がなければ改修断定不可 |
| C08-001 | A/P1 | 隙間補完が線端を確認せず近接する黒い画素を接続し細い通路もふさぐ | 主要実装あり | [apps/editor/src/fill/pixels.ts:110–198](https://github.com/totoro0419/illustro/blob/9b726852bcad78ab3e1985cc07249339d8520ae6/apps/editor/src/fill/pixels.ts#L110-L198) | 線端の向き・橋の通路チェック・接続候補上限を追加した現行コードが存在。平行線等の既存試験あり。**次:** 交差/平行/T字/細い通路で実画像検査し、誤接続がある場合だけ修正 |
| C08-003 | A/P1 | ドラッグ塗りで操作中に塗る領域が逐次仮表示されない | 主要実装あり | [apps/editor/src/fill/panel.ts:392–454](https://github.com/totoro0419/illustro/blob/9b726852bcad78ab3e1985cc07249339d8520ae6/apps/editor/src/fill/panel.ts#L392-L454) | ドラッグ中の塗り候補を `renderLiveRegionPreview` や `live-fill` で表示する経路がある。**次:** 線画領域/色塗りそれぞれの途中表示と確定マスクの比較、途中取消を検査 |
| C08-007 | A/P2 | 塗りの境界マスクが二値的で滑らかな輪郭になりにくい | 主要実装あり | [apps/editor/src/fill/pixels.ts:241–263](https://github.com/totoro0419/illustro/blob/9b726852bcad78ab3e1985cc07249339d8520ae6/apps/editor/src/fill/pixels.ts#L241-L263) | `roundedEdge` の半透明境界があり、平滑化ONでのテストも存在。元指摘の一律二値処理という理解は古い。**次:** 曲線・細線の拡大基準画像比較。平滑化OFFが二値なのは設定上の意図と区別 |
| C08-011 | B/P1 | 塗り候補の再計算ごとに新しいWorkerと画像の複製が必要になる懸念 | 主要実装あり | [apps/editor/src/fill/run.ts:10–68](https://github.com/totoro0419/illustro/blob/9b726852bcad78ab3e1985cc07249339d8520ae6/apps/editor/src/fill/run.ts#L10-L68) | 塗り候補ごとに必ず新Workerを作るのではなく、単一Workerを再利用し、アイドル時に終了する。**次:** 4Kの候補変更でWorker生成回数、再利用率、画素転送量を計測。Worker再利用済み部分の再実装禁止 |
| C08-014 | B/P2 | 隙間候補の点数付けが毛先や交差部を誤接続する可能性 | 実測必要 | [apps/editor/src/fill/pixels.ts:450–529](https://github.com/totoro0419/illustro/blob/9b726852bcad78ab3e1985cc07249339d8520ae6/apps/editor/src/fill/pixels.ts#L450-L529) | 隙間候補の誤接続は元分類B、静的推測段階。安全チェックは増えている。**次:** 向かい合う端点・交差部・同じ場所の複数候補の正解データを作って誤候補率を実測 |
| C08-015 | C/P2 | 線画の変更部分だけ再解析する構造改善案 | 改善提案 | [apps/editor/src/fill/changedRegions.ts:7–85](https://github.com/totoro0419/illustro/blob/9b726852bcad78ab3e1985cc07249339d8520ae6/apps/editor/src/fill/changedRegions.ts#L7-L85) | 変更部分の領域解析は既存。元分類Cで任意の性能改善案。**次:** 全解析に戻る特殊ケースのみ性能と正しさを測定。安全なフォールバックを無理に消さない |
| C09-004 | A/P1 | 選択範囲内の図形プレビューに確定時のマスクが反映されない | 主要実装あり | [apps/editor/src/artwork/shapeGradient.ts:180–282](https://github.com/totoro0419/illustro/blob/9b726852bcad78ab3e1985cc07249339d8520ae6/apps/editor/src/artwork/shapeGradient.ts#L180-L282) | 図形の仮表示にも選択マスクを反映するコードと多数の品質テストが存在。**次:** 密集100万画素超など上限時の縮小表示と確定画像の差を測定 |
| C09-005 | A/P1 | 図形やグラデーションの編集点を制作キャンバス上で直接操作できない | 主要実装あり | [apps/editor/src/artwork/shapeGradient.ts:565–605](https://github.com/totoro0419/illustro/blob/9b726852bcad78ab3e1985cc07249339d8520ae6/apps/editor/src/artwork/shapeGradient.ts#L565-L605) | 図形/グラデーションの編集点をキャンバスで移動できる。Worker縮小仮表示と保存座標の一致は別の検査項目。**次:** ペン/タッチのドラッグ→取消→保存の動作を確認。未実装扱いして新UIを重複生成しない |
| C09-006 | A/P1 | ペン保持中に整えた図形が仮表示されず、離してから補正候補が出る | 主要実装あり | [apps/editor/src/brushSurface.ts:81–129](https://github.com/totoro0419/illustro/blob/9b726852bcad78ab3e1985cc07249339d8520ae6/apps/editor/src/brushSurface.ts#L81-L129) | ペン保持中に補正候補をSVG輪郭で仮表示する処理が存在。**次:** 候補が見えるか実機で確認。元指摘の仮表示なしと、ブラシ質感再現の高度化を別問題にする |
| C09-007 | A/P2 | 角丸長方形・多角形・RasterとVector出力先の選択などが不足 | 不足確認 | [apps/editor/src/artwork/shapeGradient.ts:379–414](https://github.com/totoro0419/illustro/blob/9b726852bcad78ab3e1985cc07249339d8520ae6/apps/editor/src/artwork/shapeGradient.ts#L379-L414) | 角丸長方形・多角形は実装済み。Raster/Vectorの出力先を選ぶUIは同じパネルに確認できない。**次:** 保存形式の切替と画素・パスそれぞれの再編集/Undoを検証。既存図形種の再実装は不要 |
| C09-010 | B/P1 | 対称描画のコピー線がペンを離してから生成され描画中に見えない懸念 | 主要実装あり | [apps/editor/src/brushSurface.ts:449–482](https://github.com/totoro0419/illustro/blob/9b726852bcad78ab3e1985cc07249339d8520ae6/apps/editor/src/brushSurface.ts#L449-L482) | 筆を動かすたびに対称コピーのSVG線を更新。元のB指摘「筆を離すまで何も見えない」の懸念を直接解消。**次:** 実機でコピー線表示、確定した本物のブラシ跡との外観差/ちらつきを確認（完全な筆質プレビューは追加改善） |
| C09-011 | B/P1 | 図形とグラデーション確定時に作品全サイズの画素を生成し負荷が高い懸念 | 実測必要 | [apps/editor/src/artwork/render.ts:81–130](https://github.com/totoro0419/illustro/blob/9b726852bcad78ab3e1985cc07249339d8520ae6/apps/editor/src/artwork/render.ts#L81-L130) | 最終レンダリングでは出力サイズのRGBA配列を生成。元分類Bの負荷懸念は実測なし。**次:** 4K図形のドラッグ/確定の処理時間・メモリを個別計測。必要な最終画像生成と不要な再描画を区別 |
| C09-013 | B/P2 | 形状追従グラデーションの縮小プレビューと確定後の外観が一致するか未検証 | 実測必要 | [apps/editor/src/artwork/render.ts:81–130](https://github.com/totoro0419/illustro/blob/9b726852bcad78ab3e1985cc07249339d8520ae6/apps/editor/src/artwork/render.ts#L81-L130) | 形状追従グラデーションは実装済み。縮小プレビューと確定の画質差は元分類Bで未実測。**次:** 穴/細い形状/半透明を含む4K画像の比較結果を出す。合格なら再設計しない |
| C09-014 | B/P2 | グラデーションマップの比較画像が最大320px程度で原寸の色の段差を確認できるか未検証 | 主要実装あり | [apps/editor/src/artwork/gradientMap.ts:21–37](https://github.com/totoro0419/illustro/blob/9b726852bcad78ab3e1985cc07249339d8520ae6/apps/editor/src/artwork/gradientMap.ts#L21-L37) | 作品中央の128×128原寸画素比較を追加済み。元分類Bの『320px表示では原寸確認できないかも』への直接対応が存在。**次:** 元RGBAの1:1保持を確認。任意位置での検査UIは追加の使いやすさ改善であり、元の指摘の必須条件ではない |
| C09-015 | C/P2 | 制作キャンバス上の定規・図形・グラデーション共通編集ハンドルの設計案 | 改善提案 | [apps/editor/src/artwork/shapeGradient.ts:565–605](https://github.com/totoro0419/illustro/blob/9b726852bcad78ab3e1985cc07249339d8520ae6/apps/editor/src/artwork/shapeGradient.ts#L565-L605) | 定規・図形・グラデーション編集点の共通化は元分類Cの設計提案。図形の直接編集は既存。**次:** 操作統一による誤操作・入力遅延の実測から採否判断。必須修正と混ぜない |
| C09-016 | C/P2 | 通常ブラシ・図形・グラデーションの共通吸着基盤への再設計案 | 改善提案 | [apps/editor/src/strokeGuide.ts:25–100](https://github.com/totoro0419/illustro/blob/9b726852bcad78ab3e1985cc07249339d8520ae6/apps/editor/src/strokeGuide.ts#L25-L100) | 吸着判定の共通化は元分類Cの改善仮説。既存の定規吸着機能はある。**次:** 吸着の誤動作や不一致を再現できた場合のみ共通化改修を優先 |
| C10-001 | A/P1 | 自由ベクター線の一筆ごとに新規レイヤーを作り、同じ層に複数パスを保持できない | 主要実装あり | [apps/editor/src/artwork/vectorPanel.ts:155–179](https://github.com/totoro0419/illustro/blob/9b726852bcad78ab3e1985cc07249339d8520ae6/apps/editor/src/artwork/vectorPanel.ts#L155-L179) | 既存のベクターレイヤーへ複数筆を追加できるボタンと `appendPathStroke` がある。デフォルト新規候補とは別操作。**次:** 10筆連続/別色/閉曲線/Undoを検査。自動追加の設計は元指摘『不可能』と区別 |
| C10-002 | A/P1 | ベジェ曲線の制御ハンドルをキャンバスでドラッグできず数値編集が中心 | 主要実装あり | [apps/editor/src/artwork/vectorPanel.ts:186–218](https://github.com/totoro0419/illustro/blob/9b726852bcad78ab3e1985cc07249339d8520ae6/apps/editor/src/artwork/vectorPanel.ts#L186-L218) | 点・曲線ハンドルをキャンバスで直接ドラッグする経路がある。**次:** タッチ/ペン実機、Workerキャンセル、レイヤー合成下で直接操作を検査 |
| C10-006 | A/P2 | 図形演算の結果が元の形と連動しないため後から非破壊で編集できない | 不足確認 | [apps/editor/src/artwork/vectorPanel.ts:318–344](https://github.com/totoro0419/illustro/blob/9b726852bcad78ab3e1985cc07249339d8520ae6/apps/editor/src/artwork/vectorPanel.ts#L318-L344) | 演算元のデータを結果へ埋め込むが、編集後は「元の形から演算を更新」が必要。元レイヤーへの自動リンクはない。**次:** 元図形編集→演算結果更新、旧作品/削除/Undoの保存整合を検査。自動追従を入れるなら循環参照を防ぐ |
| C10-009 | A/P2 | 文字の一部分だけを選択して別の書式を設定できない | 主要実装あり | [apps/editor/src/artwork/textPanel.ts:163–200](https://github.com/totoro0419/illustro/blob/9b726852bcad78ab3e1985cc07249339d8520ae6/apps/editor/src/artwork/textPanel.ts#L163-L200) | 元の指摘『選択文字のみ別書式不可』は現行コードと一致しない。選択範囲の色・大きさ・フォント・太字・斜体を編集し、`textStyles.test.ts` に保存/Unicodeテストが存在。**次:** 実際の日本語・絵文字混在文を部分選択→編集→保存・再読込。前の指示書が要求した文字輪郭化の課題はこのIDとは無関係 |
| C10-010 | A/P2 | 日本語の縦書きで句読点・小書き仮名の調整が簡略化されている | 不足確認 | [apps/editor/src/artwork/verticalGlyph.ts:4–16](https://github.com/totoro0419/illustro/blob/9b726852bcad78ab3e1985cc07249339d8520ae6/apps/editor/src/artwork/verticalGlyph.ts#L4-L16) | 句読点・小書き・欧文の縦書き位置は文字別の固定補正。字体ごとの縦組み情報の扱いに不足。**次:** 句読点・長音・小仮名・縦中横を複数フォントと照合。現方式のズレを特定 |
| C10-011 | B/P1 | 文字の全画素生成を画面側で同期実行するため大作品で応答低下する懸念 | 実測必要 | [apps/editor/src/artwork/run.ts:85–116](https://github.com/totoro0419/illustro/blob/9b726852bcad78ab3e1985cc07249339d8520ae6/apps/editor/src/artwork/run.ts#L85-L116) | Worker/OffscreenCanvas不可の文字は画面側で同期描画。大作品での遅延は元分類Bで未計測。**次:** 非対応環境を作り、4K長文の入力反応・時間を基準版と比較。実害なしなら無用な複雑化をしない |
| C10-013 | B/P2 | ベクター曲線を図形演算時に有限個の折れ線へ分割することで曲線精度が落ちる懸念 | 主要実装あり | [apps/editor/src/artwork/pathOperations.ts:140–191](https://github.com/totoro0419/illustro/blob/9b726852bcad78ab3e1985cc07249339d8520ae6/apps/editor/src/artwork/pathOperations.ts#L140-L191) | 曲線分割は誤差評価で追加分割する方式。精度上限ではエラーを返し、黙って粗くしない。**次:** 高曲率/細い穴の参照計算と比較。元のB指摘『固定点数で精度を黙って落とす』への改善は実装済み |
| C10-015 | C/P2 | 線を直接選択し点・ハンドル・線幅を操作する共通UIの設計案 | 改善提案 | [apps/editor/src/artwork/vectorPanel.ts:186–233](https://github.com/totoro0419/illustro/blob/9b726852bcad78ab3e1985cc07249339d8520ae6/apps/editor/src/artwork/vectorPanel.ts#L186-L233) | 直接ハンドル編集は既存。線幅まで共通のキャンバス操作にする案は元分類CのUI提案。**次:** 利用者の操作性と実機の遅延比較で採否を判断。必須バグとは分離 |

## 修正の優先順位（元の問題を超えて作り直さない）

1. **不足確認（4件）:** C06-002 / C09-007 / C10-006 / C10-010。ソース上に不足経路が確認できる。対策は旧作品・Undoと安全な合成を維持して実装し、受入テストで検証。
2. **実測必要（7件）:** 元のB分類は推測をバグとみなさない。C03-007 / C06-001 / C07-014 / C08-014 / C09-011 / C09-013 / C10-011 は再現入力と時間/画素比較を確保してから改修判断。
3. **主要実装あり（21件）:** 原指摘の入口が現在ある。既存テストで確定できるものは結果を再確認し、実機/例外経路が必要なものは「コード上の対応あり・実機未確認」として追跡。C06-015は「貼り付け」の既存疎タイル処理、C10-009は部分書式を検査する。**別の改善要求を元問題の残件に付け足さない。**
4. **改善提案（5件）:** 元分類Cを必須不具合とみなさず、操作性・安全性・処理時間に実利がある場合に優先順位を決める。採用しなくても「バグ放置」と断定しない。

## 実行済みの技術的検証

- GitHubの現行コードを再読し、元PRの37個のID・元の問題文・元分類と照合した。
- 最新コミット `9b726852bcad78ab3e1985cc07249339d8520ae6` のGitHub Actions **Core CI / C03-C10 quality integration checks: completed/success** を確認。ただし両ワークフローの既存スイート合格が、37件の実機/画質の完全合格を証明するわけではない。
- **環境制約:** このチャットの実行環境から `github.com` のGitクローンはDNS解決不可。個別の新規テストをローカル実行したと主張しない。ソース/元指摘/既存テストはGitHub連携を通して直接取得し検査した。

## 以前の2文書との関係

この文書を元問題の範囲・採否判定についての**優先参照**とする。既存の「37件実装指示書」は元IDを越えた追加機能提案を含む場合がある。既存の「37件詳細検査書」も一部IDで元問題を誤読しているため、実装担当は必ずこの再検査の問題文と分類を先に確認する。

未解決の修正案が37行あることと、未実装のバグが37個存在することを混同しない。Issue #92 の既存ステータスは、各IDの受入結果が独立確認できるまで無断変更しない。Draft PR #75を維持し、`main` を変更しない。
