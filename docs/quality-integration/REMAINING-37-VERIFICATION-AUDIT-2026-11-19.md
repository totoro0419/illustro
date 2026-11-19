# Illustro｜残37件の詳細コード検査・受入試験仕様（2026-11-19）

**検査対象:** `totoro0419/illustro` / `quality/C03-C10-integration`  **基準ソース:** `ffdc51c8ddfb38bff6288a3b6e39e149ffb9f170`  
**対象原本:** [37件の実装指示書](https://github.com/totoro0419/illustro/blob/quality/C03-C10-integration/docs/quality-integration/REMAINING-37-EXECUTION-PLAN-2026-11-19.md) / [129件台帳](https://github.com/totoro0419/illustro/blob/quality/C03-C10-integration/docs/quality-integration/PROGRESS-129.md) / [Issue #92](https://github.com/totoro0419/illustro/issues/92)

## 検査の性格と現時点の結論

- **実施:** 37件の元記録と対応ソースの主処理を照合。代表的な既存テストの実際の検査項目を精読。基準ブランチのGitHub Actionsの結果を確認。
- **未実施:** 本書の追加受入試験の実装・実行、Androidタブレットの操作、4Kでの時間とメモリの実測、すべての分岐にわたる独立監査。実行前の設計と観察を「テスト合格」と表記しない。
- **是正すべき認識:** C09-007の角丸/多角形は既存。C10-013の適応曲線分割は既存。C08-007の半透明境界処理は既存。C10-001の同一レイヤー追加は手動で既存。これらを未実装と誤認して二重実装しない。
- **検査重点:** 一部IDは動作そのものの未実装ではなく、例外経路・大画像性能・レイヤー合成・実機での画素差が未確認という性格。テストで問題が出なければ、無用な書換えを行わずコード上の解決認定を検討する。
- **重要な設計条件:** C06-002のGPU部分取得は既存のタイル保存/Undoの整合性を優先。C07-003の特殊レイヤー一括変形とC10-006の自動リンク演算はデータ設計を確認してから変更。C09-011の最終4K書出しに必要な全画素処理まで無条件禁止しない。C10-009の端末フォントは取得できない字形を勝手に再現したことにしない。

## 検査区分

- **確認済み:** ソースからその処理/条件の存在・不在を確認できる（品質試験の合格を意味しない）
- **部分確認:** 関連機能の存在は確認したが、実際の全条件の挙動は未測定
- **テスト不足:** 既存テストの観点にない主要な操作・異常条件・性能測定を指す
- **受入条件:** 開発担当が新規テスト・必要な実機試験で示すべき結果。目標値を根拠なく決めず、同一環境の基準版と測定値を並記する

## 37件のコード証拠・再現テスト・合格条件


### C03（1件）

#### C03-007｜P1/性能

**コード:** [`ui/artworkHistoryView.ts:20-43`](https://github.com/totoro0419/illustro/blob/ffdc51c8ddfb38bff6288a3b6e39e149ffb9f170/apps/editor/src/ui/artworkHistoryView.ts#L20-L43) ／ **既存テスト:** [`ui/artworkHistoryView.quality.test.ts`](https://github.com/totoro0419/illustro/blob/ffdc51c8ddfb38bff6288a3b6e39e149ffb9f170/apps/editor/src/ui/artworkHistoryView.quality.test.ts)

- **コード検査:** 確認済み：タイル縮小が失敗すると `renderFrozenArtwork(frozen)` で原寸全画素を取得。既存テストは画像寸法だけ。
- **追加する再現検査:** 4000×4000作品・100履歴でタイル表示が成功する場合と失敗する場合を強制。縮小結果の一致・一時配列の大きさ・再描画回数・キャンセルを記録。
- **合格条件:** 正確な縮小画像を返し、同一履歴を並列に要求しても重複計算なし。タイル非対応時の原寸復元は安全な互換経路として残せるが、負荷を数値で報告。


### C04（1件）

#### C04-002｜P1/整合

**コード:** [`ui/commandPalette.ts:464-489`](https://github.com/totoro0419/illustro/blob/ffdc51c8ddfb38bff6288a3b6e39e149ffb9f170/apps/editor/src/ui/commandPalette.ts#L464-L489) ／ **既存テスト:** [`ui/c04Quality.test.ts`](https://github.com/totoro0419/illustro/blob/ffdc51c8ddfb38bff6288a3b6e39e149ffb9f170/apps/editor/src/ui/c04Quality.test.ts)

- **コード検査:** 確認済み：`invokeAsync` は Promise 以外のDOMクリックを完了未確認として返す。マクロ側は未完了の途中ステップで停止する。
- **追加する再現検査:** 保存→新規レイヤー→Undo、非同期失敗、途中で作品を閉じる、同じコマンド連打を再現。クリック後に意図的な非同期遅延を挿入。
- **合格条件:** 各操作が完了した後だけ次へ進む。確認不能な操作は処理中/未確認表示で誤った成功を表示しない。


### C05（1件）

#### C05-020｜P2/仕様要確認

**コード:** [`assets/brushMaterial.ts:45-65`](https://github.com/totoro0419/illustro/blob/ffdc51c8ddfb38bff6288a3b6e39e149ffb9f170/apps/editor/src/assets/brushMaterial.ts#L45-L65) ／ **既存テスト:** [`assets/brushMaterial.test.ts`](https://github.com/totoro0419/illustro/blob/ffdc51c8ddfb38bff6288a3b6e39e149ffb9f170/apps/editor/src/assets/brushMaterial.test.ts)

- **コード検査:** 確認済み：質感素材の適用時に既存の質感強度を0にし、サイズなどを固定値で置換する。素材振分は形式別に実装済み。
- **追加する再現検査:** 同じブラシに紙質・模様・先端を順に適用。強度、拡大率、回転、保存後の再読込、旧プリセットの比較を実施。
- **合格条件:** 意図しない設定消失を防ぎ、素材ごとに使用方法・サイズ/濃さなどを選べる。既存プリセット/Undoに後方互換性。


### C06（4件）

#### C06-001｜P1/表示

**コード:** [`brushSurface.ts:905-960`](https://github.com/totoro0419/illustro/blob/ffdc51c8ddfb38bff6288a3b6e39e149ffb9f170/apps/editor/src/brushSurface.ts#L905-L960) ／ **既存テスト:** [`strokeSelection.test.ts`](https://github.com/totoro0419/illustro/blob/ffdc51c8ddfb38bff6288a3b6e39e149ffb9f170/apps/editor/src/strokeSelection.test.ts)

- **コード検査:** 部分確認：選択マスクは開始時のセッションに渡るが、仮線の全合成モードが確定側と一致することは未検証。
- **追加する再現検査:** 矩形/自由選択の境界を跨ぐ通常筆・消しゴム・乗算/背面描画を描く。筆圧0.2/1、半透明レイヤーと取消を含める。
- **合格条件:** 選択外の画素が変わらない。操作中表示と確定表示を同じ座標・色の参照画像で比較。

#### C06-002｜P1/作品保護

**コード:** [`selection/tileCapture.ts:80-166`](https://github.com/totoro0419/illustro/blob/ffdc51c8ddfb38bff6288a3b6e39e149ffb9f170/apps/editor/src/selection/tileCapture.ts#L80-L166) ／ **既存テスト:** [`selection/tileCapture.test.ts`](https://github.com/totoro0419/illustro/blob/ffdc51c8ddfb38bff6288a3b6e39e149ffb9f170/apps/editor/src/selection/tileCapture.test.ts)

- **コード検査:** 確認済み：`brushSurface.ts:1041-1085` が選択内の更新で従来の既存タイル全取得を呼ぶ。無操作判定の最適化は実装済み。
- **追加する再現検査:** 4Kに1000タイル相当の既存描画を置き、1タイルだけ選択内で描く。GPU読み出しタイル数/転送バイト/時間を測定。
- **合格条件:** 変更のない旧タイルを消失させず部分更新し、保存→再読込→Undo/RedoのRGBAが従来経路と一致。

#### C06-007｜P1/描画

**コード:** [`selection/brushPreview.ts:7-94`](https://github.com/totoro0419/illustro/blob/ffdc51c8ddfb38bff6288a3b6e39e149ffb9f170/apps/editor/src/selection/brushPreview.ts#L7-L94) ／ **既存テスト:** [`selection/liveBrushPreview.test.ts`](https://github.com/totoro0419/illustro/blob/ffdc51c8ddfb38bff6288a3b6e39e149ffb9f170/apps/editor/src/selection/liveBrushPreview.test.ts)

- **コード検査:** 確認済み：長い入力では直近384点のリクエストキーを保持し、Workerなし経路の原寸一致は未検証。
- **追加する再現検査:** Worker有/無で700〜2000点の筆跡、同時入力補正で45点前の移動、筆圧とサイズ変更を再現。
- **合格条件:** 最終マスクの全ピクセルが確定結果に一致するか、不一致範囲を数値化。古い仮線が残らない。

#### C06-015｜P1/性能

**コード:** [`selection/clipboard.ts:106-195`](https://github.com/totoro0419/illustro/blob/ffdc51c8ddfb38bff6288a3b6e39e149ffb9f170/apps/editor/src/selection/clipboard.ts#L106-L195) ／ **既存テスト:** [`selection/clipboardSparse.test.ts`](https://github.com/totoro0419/illustro/blob/ffdc51c8ddfb38bff6288a3b6e39e149ffb9f170/apps/editor/src/selection/clipboardSparse.test.ts)

- **コード検査:** 確認済み：通常の小範囲コピーは局所読出しを用いるが、合成と特殊グループは `renderFrozenArtwork` や全レイヤー取得へ進む。
- **追加する再現検査:** 4000×4000で12×12選択、通常レイヤー/特殊レイヤー/グループ/合成コピーを比較。メモリ転送量と貼り付け後のRGBAを計測。
- **合格条件:** コピーの内容・レイヤー構造・履歴は正しく、範囲が小さい場合の全画面配列割当は改善対象の経路で発生しない。


### C07（6件）

#### C07-001｜P1/描画構造

**コード:** [`transform/previewReplacement.ts:11-48`](https://github.com/totoro0419/illustro/blob/ffdc51c8ddfb38bff6288a3b6e39e149ffb9f170/apps/editor/src/transform/previewReplacement.ts#L11-L48) ／ **既存テスト:** [`transform/previewReplacement.test.ts`](https://github.com/totoro0419/illustro/blob/ffdc51c8ddfb38bff6288a3b6e39e149ffb9f170/apps/editor/src/transform/previewReplacement.test.ts)

- **コード検査:** 確認済み：DOMオーバーレイを全レイヤーの上に出すため、上位可視レイヤー/特殊合成では置換を拒否して近似表示に戻る。
- **追加する再現検査:** 下層を変形し上層に乗算・クリッピング・マスク・グループを組合せ。ドラッグ中/停止後/確定後を比較。
- **合格条件:** レイヤー内の正しい位置に仮表示を合成し、編集後表示と見た目が一致。旧作品とUndo/Redoも保持。

#### C07-002｜P1/描画

**コード:** [`transform/originalStrokePreview.ts:7-15`](https://github.com/totoro0419/illustro/blob/ffdc51c8ddfb38bff6288a3b6e39e149ffb9f170/apps/editor/src/transform/originalStrokePreview.ts#L7-L15) ／ **既存テスト:** [`transform/originalStrokePreview.test.ts`](https://github.com/totoro0419/illustro/blob/ffdc51c8ddfb38bff6288a3b6e39e149ffb9f170/apps/editor/src/transform/originalStrokePreview.test.ts)

- **コード検査:** 部分確認：元画像への描画をWorkerで行うが、縮小中の仮筆跡が原寸描画と一致する試験は不足。
- **追加する再現検査:** 原寸4000px・縮小0.25倍で筆圧・回転・入り抜きのある長線を描き、停止・取消・再編集。
- **合格条件:** 縮小参照画像と確定した原寸画像の面積平均を比較。先行入力の古い結果が残らない。

#### C07-003｜P1/設計ゲート

**コード:** [`transform/groupTransform.ts:13-85`](https://github.com/totoro0419/illustro/blob/ffdc51c8ddfb38bff6288a3b6e39e149ffb9f170/apps/editor/src/transform/groupTransform.ts#L13-L85) ／ **既存テスト:** [`transform/groupTransform.test.ts`](https://github.com/totoro0419/illustro/blob/ffdc51c8ddfb38bff6288a3b6e39e149ffb9f170/apps/editor/src/transform/groupTransform.test.ts)

- **コード検査:** 確認済み：一括計算は `mode:'affine'` のみ。非アフィン・特殊レイヤー等の要件は構造拡張が必要。
- **追加する再現検査:** ラスター2枚+マスク+編集可能な図形を一括で移動/回転/非アフィン変形。キャンセル・保存復元・Undoを含む。
- **合格条件:** 同じ変換の座標/描画順序を保持。非対応操作は明確に拒否し、破壊的に画像へ固定しない。

#### C07-004｜P1/表示

**コード:** [`transform/postPaintPreview.ts:9-43`](https://github.com/totoro0419/illustro/blob/ffdc51c8ddfb38bff6288a3b6e39e149ffb9f170/apps/editor/src/transform/postPaintPreview.ts#L9-L43) ／ **既存テスト:** [`transform/postPaintPreview.test.ts`](https://github.com/totoro0419/illustro/blob/ffdc51c8ddfb38bff6288a3b6e39e149ffb9f170/apps/editor/src/transform/postPaintPreview.test.ts)

- **コード検査:** 部分確認：後描き筆跡はWorkerで合成するが、ドラッグ中の280px近似と最終結果は別経路。
- **追加する再現検査:** 変形→その上に描画→再変形を4K/半透明/複雑合成で繰返す。すばやいハンドル操作中も比較。
- **合格条件:** 後描き線が途中で消えず、停止後/確定後との重ね順が一致。

#### C07-007｜P2/実機

**コード:** [`transform/panel.ts:663-751`](https://github.com/totoro0419/illustro/blob/ffdc51c8ddfb38bff6288a3b6e39e149ffb9f170/apps/editor/src/transform/panel.ts#L663-L751) ／ **既存テスト:** [`transform/previewQuality.test.ts`](https://github.com/totoro0419/illustro/blob/ffdc51c8ddfb38bff6288a3b6e39e149ffb9f170/apps/editor/src/transform/previewQuality.test.ts)

- **コード検査:** 確認済み：ハンドル移動中は280px、停止後に最大768px程度の表示へ更新する。実機追従は不明。
- **追加する再現検査:** Androidで20秒間回転/拡縮を反復。ペン・指・低倍率/高倍率・取消で入力遅延と古い結果表示を計測。
- **合格条件:** 画面が固まらず最新操作が見える。応答性は同一端末の基準版とp50/p95を比較して判定。

#### C07-014｜P2/精度

**コード:** [`transform/geometry.ts:86-140`](https://github.com/totoro0419/illustro/blob/ffdc51c8ddfb38bff6288a3b6e39e149ffb9f170/apps/editor/src/transform/geometry.ts#L86-L140) ／ **既存テスト:** [`transform/areaSampling.test.ts`](https://github.com/totoro0419/illustro/blob/ffdc51c8ddfb38bff6288a3b6e39e149ffb9f170/apps/editor/src/transform/areaSampling.test.ts)

- **コード検査:** 部分確認：面積積分・曲率分割は実装済み。限界の歪みでの誤差保証は未検証。
- **追加する再現検査:** 1px格子/斜線を64分の1まで縮小、強く曲げたメッシュと回転を実施。参照高精度の画素と比較。
- **合格条件:** 間引き・色変化の誤差を明示。分割限界の場合に無言で粗い近似へ落ちない。4K負荷を別に実測。


### C08（6件）

#### C08-001｜P2/精度

**コード:** [`fill/pixels.ts:110-198`](https://github.com/totoro0419/illustro/blob/ffdc51c8ddfb38bff6288a3b6e39e149ffb9f170/apps/editor/src/fill/pixels.ts#L110-L198) ／ **既存テスト:** [`fill/pixels.test.ts`](https://github.com/totoro0419/illustro/blob/ffdc51c8ddfb38bff6288a3b6e39e149ffb9f170/apps/editor/src/fill/pixels.test.ts)

- **コード検査:** 確認済み：自動補完は向かい合う毛先と周囲の空白を確認する。交差/並行等の単体テストは既存。
- **追加する再現検査:** 毛先が交差・平行・T字・近接輪郭の線画を固定画像で用意。自動橋の一覧と参照答を照合。
- **合格条件:** 誤った自動橋を作らず、曖昧な場合は未補完候補として扱う。正しい補完候補を消さないことも確認。

#### C08-003｜P1/表示

**コード:** [`fill/liveRegionPreview.ts:24-185`](https://github.com/totoro0419/illustro/blob/ffdc51c8ddfb38bff6288a3b6e39e149ffb9f170/apps/editor/src/fill/liveRegionPreview.ts#L24-L185) ／ **既存テスト:** [`fill/liveRegionPreview.test.ts`](https://github.com/totoro0419/illustro/blob/ffdc51c8ddfb38bff6288a3b6e39e149ffb9f170/apps/editor/src/fill/liveRegionPreview.test.ts)

- **コード検査:** 確認済み：縮小仮表示は各出力画素で最大4か所の領域IDを調べる。面積平均/原寸一致は未検証。
- **追加する再現検査:** 複雑な線画をペンで囲み/なぞり、途中点の差替え・薄い境界・内外領域・速度を検査。確定用 `fillMask` と照合。
- **合格条件:** 少なくともユーザーが見る候補領域の欠けを防ぎ、原寸での結果との差分をテストで固定。囲い中も仮表示あり。

#### C08-007｜P2/精度

**コード:** [`fill/pixels.ts:241-263`](https://github.com/totoro0419/illustro/blob/ffdc51c8ddfb38bff6288a3b6e39e149ffb9f170/apps/editor/src/fill/pixels.ts#L241-L263) ／ **既存テスト:** [`fill/pixels.test.ts`](https://github.com/totoro0419/illustro/blob/ffdc51c8ddfb38bff6288a3b6e39e149ffb9f170/apps/editor/src/fill/pixels.test.ts)

- **コード検査:** 確認済み：`roundedEdge` に半透明の境界処理が既にあり、未実装扱いは誤り。現テストは滑らかな境界が生じることを確認。
- **追加する再現検査:** 水平/45度/曲線輪郭を3〜5倍に拡大し、角の増減・周辺インク汚染・1px/2px幅を基準画像と比較。
- **合格条件:** 平滑化ONで過度な太りや色にじみがなく、OFFで元のマスクが保たれる。

#### C08-011｜P1/性能

**コード:** [`fill/worker.ts:18-75`](https://github.com/totoro0419/illustro/blob/ffdc51c8ddfb38bff6288a3b6e39e149ffb9f170/apps/editor/src/fill/worker.ts#L18-L75) ／ **既存テスト:** [`fill/liveWorker.test.ts`](https://github.com/totoro0419/illustro/blob/ffdc51c8ddfb38bff6288a3b6e39e149ffb9f170/apps/editor/src/fill/liveWorker.test.ts)

- **コード検査:** 確認済み：Workerは再利用しているが、塗りや領域作成で出力マスク/全画素バッファを確保する経路が残る。
- **追加する再現検査:** 4Kで色/領域を20回連続変更、同じ参照画像と違う参照画像を混ぜる。転送バイト/割当数/処理時間を測定。
- **合格条件:** 基準版と画素一致、余計な4K複製とフリーズが減る。中断後の古い結果が適用されない。

#### C08-014｜P2/精度

**コード:** [`fill/pixels.ts:450-529`](https://github.com/totoro0419/illustro/blob/ffdc51c8ddfb38bff6288a3b6e39e149ffb9f170/apps/editor/src/fill/pixels.ts#L450-L529) ／ **既存テスト:** [`fill/pixels.test.ts`](https://github.com/totoro0419/illustro/blob/ffdc51c8ddfb38bff6288a3b6e39e149ffb9f170/apps/editor/src/fill/pixels.test.ts)

- **コード検査:** 部分確認：局所候補チェックと既存候補重複防止あり。複雑線画での誤候補率は未測定。
- **追加する再現検査:** 近接毛先/円形の交差/細線/埋め済み隙間を含む20枚以上の人工線画を生成。候補の採用/取消で比較。
- **合格条件:** 明らかな誤接続候補は抑制、正しい候補は失われない。候補の取捨が既存作品の元線を破壊しない。

#### C08-015｜P2/性能

**コード:** [`fill/incrementalBoundary.ts:21-135`](https://github.com/totoro0419/illustro/blob/ffdc51c8ddfb38bff6288a3b6e39e149ffb9f170/apps/editor/src/fill/incrementalBoundary.ts#L21-L135) ／ **既存テスト:** [`fill/incrementalBoundary.test.ts`](https://github.com/totoro0419/illustro/blob/ffdc51c8ddfb38bff6288a3b6e39e149ffb9f170/apps/editor/src/fill/incrementalBoundary.test.ts)

- **コード検査:** 確認済み：領域の分裂・結合を伴う変更では `null` を返して全解析へ戻る。安全性は実装済み、局所高速化が不足。
- **追加する再現検査:** 開口/閉口・最後の線消去・分断/結合など100件の線画変更を全解析と比較。領域IDは対応関係で正規化。
- **合格条件:** 同じ塗り領域と内外判定。高速経路が無理なら正しい全解析へ戻し、誤った高速結果を返さない。


### C09（10件）

#### C09-004｜P1/精度

**コード:** [`artwork/shapeGradient.ts:150-282`](https://github.com/totoro0419/illustro/blob/ffdc51c8ddfb38bff6288a3b6e39e149ffb9f170/apps/editor/src/artwork/shapeGradient.ts#L150-L282) ／ **既存テスト:** [`artwork/shapeGradient.quality.test.ts`](https://github.com/totoro0419/illustro/blob/ffdc51c8ddfb38bff6288a3b6e39e149ffb9f170/apps/editor/src/artwork/shapeGradient.quality.test.ts)

- **コード検査:** 確認済み：密集マスクで100万画素以上の参照に達すると点サンプルへ戻る上限あり。既存テストがその動作を確認。
- **追加する再現検査:** 可視領域に0.5px細線・129タイル・100万超密集マスク・反転を作り縮小参照画像と比較。
- **合格条件:** 細線の消失・誤透明化がない。高負荷時は上限を守りつつどの領域が近似か分かる。

#### C09-005｜P1/操作

**コード:** [`artwork/shapeGradient.ts:490-533`](https://github.com/totoro0419/illustro/blob/ffdc51c8ddfb38bff6288a3b6e39e149ffb9f170/apps/editor/src/artwork/shapeGradient.ts#L490-L533) ／ **既存テスト:** [`artwork/shapeGradient.quality.test.ts`](https://github.com/totoro0419/illustro/blob/ffdc51c8ddfb38bff6288a3b6e39e149ffb9f170/apps/editor/src/artwork/shapeGradient.quality.test.ts)

- **コード検査:** 確認済み：ドラッグ中にWorker画像を更新し、Worker非対応で縮小256pxまでの経路あり。複雑合成での一致は未検証。
- **追加する再現検査:** 編集点を100回連続で移動。Worker停止/非対応、マスク、拡大4倍で仮表示と保存結果を比較。
- **合格条件:** 最新入力だけが表示され、描画障害時も編集の取消と復元が可能。保存値と編集座標が一致。

#### C09-006｜P1/描画

**コード:** [`brushSurface.ts:81-132`](https://github.com/totoro0419/illustro/blob/ffdc51c8ddfb38bff6288a3b6e39e149ffb9f170/apps/editor/src/brushSurface.ts#L81-L132) ／ **既存テスト:** [`artwork/strokeCorrection.quality.test.ts`](https://github.com/totoro0419/illustro/blob/ffdc51c8ddfb38bff6288a3b6e39e149ffb9f170/apps/editor/src/artwork/strokeCorrection.quality.test.ts)

- **コード検査:** 確認済み：保持中の補正候補は点線SVGで表示する。ブラシの入り抜き/質感とは別描画。
- **追加する再現検査:** 筆圧変化・鉛筆・消しゴム・透明選択を含むペン保持を試す。候補表示前/中/離した後の比較。
- **合格条件:** 候補は元作品を壊さず、最終筆跡の形・太さが確認できる。未対応ブラシモードは明示する。

#### C09-007｜P1/機能

**コード:** [`artwork/shapeGradient.ts:379-414`](https://github.com/totoro0419/illustro/blob/ffdc51c8ddfb38bff6288a3b6e39e149ffb9f170/apps/editor/src/artwork/shapeGradient.ts#L379-L414) ／ **既存テスト:** [`artwork/shapeGradient.quality.test.ts`](https://github.com/totoro0419/illustro/blob/ffdc51c8ddfb38bff6288a3b6e39e149ffb9f170/apps/editor/src/artwork/shapeGradient.quality.test.ts)

- **コード検査:** 確認済み：角丸長方形・多角形は既存。出力先が図形レイヤー固定で、Rasterを選ぶUIは見当たらない。
- **追加する再現検査:** 角丸/多角形/楕円/直線をRasterとVectorへ出力する選択操作を試す。ラスタ出力はピクセル編集、ベクターは点編集。
- **合格条件:** 各出力先の保存結果とUndoが正しい。既存の図形種を重複実装しない。

#### C09-010｜P1/描画

**コード:** [`symmetryStrokePreview.ts:7-16`](https://github.com/totoro0419/illustro/blob/ffdc51c8ddfb38bff6288a3b6e39e149ffb9f170/apps/editor/src/symmetryStrokePreview.ts#L7-L16) ／ **既存テスト:** [`symmetryStrokePreview.test.ts`](https://github.com/totoro0419/illustro/blob/ffdc51c8ddfb38bff6288a3b6e39e149ffb9f170/apps/editor/src/symmetryStrokePreview.test.ts)

- **コード検査:** 確認済み：現在のコピー線は点列を対称変換する幾何表示で、確定ブラシの画素合成と同じではない。
- **追加する再現検査:** ミラー/放射/回転対称、筆圧変化/色混合/消しゴムでブラシを動かし、コピー線の仮像と確定像を比較。
- **合格条件:** 本線と対称線が同時に追従し、確定時の欠け/ちらつき/色ずれを抑制。

#### C09-011｜P1/性能

**コード:** [`artwork/render.ts:81-131`](https://github.com/totoro0419/illustro/blob/ffdc51c8ddfb38bff6288a3b6e39e149ffb9f170/apps/editor/src/artwork/render.ts#L81-L131) ／ **既存テスト:** [`artwork/workerQueuePolicy.test.ts`](https://github.com/totoro0419/illustro/blob/ffdc51c8ddfb38bff6288a3b6e39e149ffb9f170/apps/editor/src/artwork/workerQueuePolicy.test.ts)

- **コード検査:** 確認済み：`gradientPixels` は出力サイズ分のRGBAを確保する。最終4K書出しに必要な全画素配列と操作中の不要全再計算は区別すべき。
- **追加する再現検査:** 4Kで100×100だけの変更→プレビュー更新→保存→書出し。割当サイズ・時間・変更タイルを測定し旧結果と比較。
- **合格条件:** 操作中は変更領域中心に再計算。保存/書出しの最終画像は必要な全画素生成を認め、画像・Undoが正しい。

#### C09-013｜P2/精度

**コード:** [`artwork/render.ts:81-131`](https://github.com/totoro0419/illustro/blob/ffdc51c8ddfb38bff6288a3b6e39e149ffb9f170/apps/editor/src/artwork/render.ts#L81-L131) ／ **既存テスト:** [`artwork/shapeGradient.quality.test.ts`](https://github.com/totoro0419/illustro/blob/ffdc51c8ddfb38bff6288a3b6e39e149ffb9f170/apps/editor/src/artwork/shapeGradient.quality.test.ts)

- **コード検査:** 部分確認：グラデーション用Worker描画と縮小表示は存在。複雑な形状追従時の原画素一致は未検証。
- **追加する再現検査:** 非凸形状・穴・半透明マスク・複数停止点・反転/繰返しを含む4K参照画像と縮小版を比較。
- **合格条件:** 同一パラメータで範囲/色/透明度が一致し、違いがある場合は許容誤差を測って表示。

#### C09-014｜P2/機能

**コード:** [`artwork/gradientMap.ts:21-37`](https://github.com/totoro0419/illustro/blob/ffdc51c8ddfb38bff6288a3b6e39e149ffb9f170/apps/editor/src/artwork/gradientMap.ts#L21-L37) ／ **既存テスト:** [`artwork/gradientMapExactCrop.test.ts`](https://github.com/totoro0419/illustro/blob/ffdc51c8ddfb38bff6288a3b6e39e149ffb9f170/apps/editor/src/artwork/gradientMapExactCrop.test.ts)

- **コード検査:** 確認済み：`extractGradientMapCrop` は中心128pxのみを切り出す。端やユーザー指定位置の操作は未実装。
- **追加する再現検査:** 左上(0,0)、右下(3999,3999)、中央、選択位置などから128×128を切出し、座標/元RGBAを確認。
- **合格条件:** 四隅では作品外を読まず、任意位置の1:1比較ができる。マップ確定の作品画素は変わらない。

#### C09-015｜P2/UI

**コード:** [`artwork/shapeGradient.ts:490-620`](https://github.com/totoro0419/illustro/blob/ffdc51c8ddfb38bff6288a3b6e39e149ffb9f170/apps/editor/src/artwork/shapeGradient.ts#L490-L620) ／ **既存テスト:** [`artwork/shapeGradient.quality.test.ts`](https://github.com/totoro0419/illustro/blob/ffdc51c8ddfb38bff6288a3b6e39e149ffb9f170/apps/editor/src/artwork/shapeGradient.quality.test.ts)

- **コード検査:** 確認済み：図形/グラデーションのハンドルはあるが、定規パネルは別実装。共通操作/中断が不足。
- **追加する再現検査:** 定規→図形→グラデーションを切替え、同じドラッグ/解除/取消を試す。UI焦点/ヒット判定/筆圧・タッチを比較。
- **合格条件:** 種類を変えても操作が一致し、別ツールの古いハンドルや仮表示が残らない。

#### C09-016｜P2/操作

**コード:** [`strokeGuide.ts:25-100`](https://github.com/totoro0419/illustro/blob/ffdc51c8ddfb38bff6288a3b6e39e149ffb9f170/apps/editor/src/strokeGuide.ts#L25-L100) ／ **既存テスト:** [`strokeGuide.quality.test.ts`](https://github.com/totoro0419/illustro/blob/ffdc51c8ddfb38bff6288a3b6e39e149ffb9f170/apps/editor/src/strokeGuide.quality.test.ts)

- **コード検査:** 確認済み：定規へのスナップ関数があり、通常ブラシとベジェ制御点の一部で利用される。全図形経路は未検証。
- **追加する再現検査:** 長方形・楕円・多角形・ベジェ・グラデーション始終点を、吸着ON/OFFと倍率25〜400%で動かす。
- **合格条件:** 吸着位置が表示/確定で一致。解除操作・グリッド/透視補助も入力モードを超えて一貫する。


### C10（8件）

#### C10-001｜P1/機能

**コード:** [`artwork/vectorPanel.ts:153-181`](https://github.com/totoro0419/illustro/blob/ffdc51c8ddfb38bff6288a3b6e39e149ffb9f170/apps/editor/src/artwork/vectorPanel.ts#L153-L181) ／ **既存テスト:** [`artwork/pathOperations.c10.test.ts`](https://github.com/totoro0419/illustro/blob/ffdc51c8ddfb38bff6288a3b6e39e149ffb9f170/apps/editor/src/artwork/pathOperations.c10.test.ts)

- **コード検査:** 確認済み：手動の「選んだレイヤーに線を追加」はある。通常の「新しいベクター線を描く」は別の候補として作る。
- **追加する再現検査:** 同じレイヤーへ連続10筆/Undo/Redoを試す。色/太さが異なる線、閉じたパス、未保存の状態も混ぜる。
- **合格条件:** 互換な線を意図通り同一レイヤーに追加でき、見えない接続線や意図しない上書きなし。

#### C10-002｜P2/実機

**コード:** [`artwork/vectorPanel.ts:91-136`](https://github.com/totoro0419/illustro/blob/ffdc51c8ddfb38bff6288a3b6e39e149ffb9f170/apps/editor/src/artwork/vectorPanel.ts#L91-L136) ／ **既存テスト:** [`artwork/vectorPointDrag.test.ts`](https://github.com/totoro0419/illustro/blob/ffdc51c8ddfb38bff6288a3b6e39e149ffb9f170/apps/editor/src/artwork/vectorPointDrag.test.ts)

- **コード検査:** 確認済み：点/曲線ハンドルを直接移動する処理とWorker仮表示は既存。原寸と複雑合成の一致/実機操作は未検証。
- **追加する再現検査:** 4000pxで20点+4制御ハンドルを連続ドラッグ。Worker遅延/失敗・マスク・Undo/取消を含める。
- **合格条件:** 操作と確定で点座標一致。キャンセル後に古い仮表示が出ず、位置/太さが破綻しない。

#### C10-006｜P1/設計ゲート

**コード:** [`artwork/vectorPanel.ts:318-344`](https://github.com/totoro0419/illustro/blob/ffdc51c8ddfb38bff6288a3b6e39e149ffb9f170/apps/editor/src/artwork/vectorPanel.ts#L318-L344) ／ **既存テスト:** [`artwork/pathOperations.c10.test.ts`](https://github.com/totoro0419/illustro/blob/ffdc51c8ddfb38bff6288a3b6e39e149ffb9f170/apps/editor/src/artwork/pathOperations.c10.test.ts)

- **コード検査:** 確認済み：演算元の形は保存されるが、元を直した後は「演算を更新」ボタンが必要。別レイヤーとの自動依存関係は現仕様にない。
- **追加する再現検査:** 和/差/交差/XORの元図形を変更、Undo、元レイヤー削除、保存復元、旧ファイル読込を再現。
- **合格条件:** どのデータを「元」と見なすか決めたうえで安全に自動再計算。循環参照・元消失時は作品を壊さない。

#### C10-009｜P1/互換

**コード:** [`artwork/fonts.ts:138-199`](https://github.com/totoro0419/illustro/blob/ffdc51c8ddfb38bff6288a3b6e39e149ffb9f170/apps/editor/src/artwork/fonts.ts#L138-L199) ／ **既存テスト:** [`artwork/textStyles.boldItalic.test.ts`](https://github.com/totoro0419/illustro/blob/ffdc51c8ddfb38bff6288a3b6e39e149ffb9f170/apps/editor/src/artwork/textStyles.boldItalic.test.ts)

- **コード検査:** 確認済み：読み込んだ書体の文字輪郭は対応。端末システム書体や合成太字/斜体の同一形状を抽出できることは未保証。
- **追加する再現検査:** 1行中に3フォント/2色/太字・斜体を混ぜる。文字表示と輪郭化を並べてRGBA差を測る。
- **合格条件:** 取得可能な書体では外観一致。取得不能な端末書体は無言で代用せず、利用可能な書体の選択/ラスタ保持を案内。

#### C10-010｜P2/文字

**コード:** [`artwork/verticalGlyph.ts:4-17`](https://github.com/totoro0419/illustro/blob/ffdc51c8ddfb38bff6288a3b6e39e149ffb9f170/apps/editor/src/artwork/verticalGlyph.ts#L4-L17) ／ **既存テスト:** [`artwork/verticalGlyph.test.ts`](https://github.com/totoro0419/illustro/blob/ffdc51c8ddfb38bff6288a3b6e39e149ffb9f170/apps/editor/src/artwork/verticalGlyph.test.ts)

- **コード検査:** 確認済み：句読点・小文字の座標補正は文字種固定。フォント固有の縦組み指標を参照する仕組みは未確認。
- **追加する再現検査:** 縦書きの「きょう、１２時。ABC（予定）」等を2以上のフォントで画面表示/輪郭化。
- **合格条件:** 句読点、小書き仮名、長音符と欧文の向き・位置がフォントの縦組み規則と整合。

#### C10-011｜P1/性能

**コード:** [`artwork/run.ts:85-116`](https://github.com/totoro0419/illustro/blob/ffdc51c8ddfb38bff6288a3b6e39e149ffb9f170/apps/editor/src/artwork/run.ts#L85-L116) ／ **既存テスト:** [`artwork/workerQueuePolicy.test.ts`](https://github.com/totoro0419/illustro/blob/ffdc51c8ddfb38bff6288a3b6e39e149ffb9f170/apps/editor/src/artwork/workerQueuePolicy.test.ts)

- **コード検査:** 確認済み：Worker不可または対応書体なしで `renderArtwork` を画面側から同期実行する。
- **追加する再現検査:** OffscreenCanvas/Workerを無効にし、4K作品に長文文字レイヤーを置いて連続編集。操作入力p95/描画時間/中断可否を測定。
- **合格条件:** 画面が極端に停止しない。文字フォント代替や不正な途中適用なし。必要なら文字だけ区画生成/再利用。

#### C10-013｜P2/精度検査先行

**コード:** [`artwork/pathOperations.ts:140-212`](https://github.com/totoro0419/illustro/blob/ffdc51c8ddfb38bff6288a3b6e39e149ffb9f170/apps/editor/src/artwork/pathOperations.ts#L140-L212) ／ **既存テスト:** [`artwork/pathOperations.c10.test.ts`](https://github.com/totoro0419/illustro/blob/ffdc51c8ddfb38bff6288a3b6e39e149ffb9f170/apps/editor/src/artwork/pathOperations.c10.test.ts)

- **コード検査:** 確認済み：ベジェ曲線は適応分割を実装、楕円も許容誤差と点数超過で失敗を返す。旧計画の「適応分割を新規実装」は不適切。
- **追加する再現検査:** 非常に大きい曲率/薄い重複線/穴の図形演算を基準画素と比較。8192点上限や数値異常を入力。
- **合格条件:** 精度不足を黙殺せず、計算不能でも元データ不変。精度/失敗率の比較で追加修正が必要か判定。

#### C10-015｜P2/UI

**コード:** [`artwork/vectorPanel.ts:190-233`](https://github.com/totoro0419/illustro/blob/ffdc51c8ddfb38bff6288a3b6e39e149ffb9f170/apps/editor/src/artwork/vectorPanel.ts#L190-L233) ／ **既存テスト:** [`artwork/vectorPointDrag.test.ts`](https://github.com/totoro0419/illustro/blob/ffdc51c8ddfb38bff6288a3b6e39e149ffb9f170/apps/editor/src/artwork/vectorPointDrag.test.ts)

- **コード検査:** 確認済み：点・曲線ハンドルのキャンバスドラッグは存在。線幅の直接ハンドル編集は見当たらない。
- **追加する再現検査:** 同一線の点・ハンドル・線幅をキャンバスで編集、Undo/Redo・スナップ・Worker失敗・操作取消を再現。
- **合格条件:** 全操作で編集点と見た目が一致、線幅も直接変更できる。保存/再読込に反映。


## これまでの指示書からの訂正（実装者必読）

1. **C03-007:** 「どんなブラウザーでも一切4K再生成しない」は既存の画像取得手段によっては成立しない。まずタイル互換経路の有無を確認し、無理に全取得経路を消して履歴サムネイルを壊さない。
2. **C07-003 / C10-006:** 画面上の選択やデータ参照だけを付け足しても自動追従は成立しない。旧形式の読み込み・循環参照・保存時の安定性を含めたデータ構造の設計が先。
3. **C08-007:** 滑らかにする処理は既存。画質比較なしに「未実装だから追加」と判断しない。
4. **C08-015:** 領域の分断・結合は高速な局所計算が難しい。既存の全解析への安全な切替えは正しい。速さのために不正なラベルを返してはいけない。
5. **C09-007:** 角丸や多角形は既存。ラスタ出力は画素編集、ベクター出力は点編集可能という違いを守る。「両方ともベクター編集可能」を完了条件にしない。
6. **C09-011:** 最終4K画像やエクスポートでの全画素生成を全面禁止しない。操作中に不要な再計算をしないことが狙い。
7. **C10-001:** 同じ層へ「手動追加」は実装済み。通常の自由線描画とどう結びつけるかを確認する。
8. **C10-013:** 適応的な曲線分割は実装済み。さらに違う分割アルゴリズムを作る前に極端な曲線での画質差・失敗処理を検証する。

## 検査を実行する手順とログ（開発セッション向け）

### 1. まず問題IDごとに参照像を用意
- **入力固定:** キャンバス大きさ（最小/通常/4000×4000）、描画点列、筆圧、レイヤー合成と透明度、選択/マスク、乱数種、編集操作を保存する。
- **比較対象:** 修正前ブランチの同じ入力を「基準結果」、実装修正後の結果を「新結果」にする。画素が一致すべき機能はRGBAを完全比較。縮小プレビューは原寸の正しい縮小結果と比較し、差分画像・最大差・差分画素数を記録。
- **合成/Undo:** 保存→閉じる→開く→Undo→Redoで、内容が失われないか。操作がキャンセルされた場合は履歴や保存データを変えない。
- **障害:** Worker停止/非対応、画面非表示、入力中断、キャンセル、NaN/Infinity、選択が空、巨大な座標、旧バージョンデータ。
- **性能:** 同一端末・同一データで改修前後のp50/p95入力遅延、描画時間、GPU読戻し数、転送バイト、最大同時バッファ量を計測する。測定値と端末条件を残し、数値目標は基準確認後に定める。

### 2. 実行コマンド（統合ブランチを取得できる開発環境で）

```bash
npm ci --ignore-scripts --no-audit --no-fund
npm run brush:build
npm run core:check
npm run brush:regression
npm --workspace @illustro/editor exec -- vitest run
npm run editor:build
```

上記は `.github/workflows/quality-c03-c10-integration.yml` にあるテスト・検査に対応。**CI成功は既存テストの合格**であり、今回の新しい37件の受入試験まで実施したという意味ではない。既知の `npm run prep:check` のエラーはCIで注意扱いなので「全検査無条件合格」と記載しない。

### 3. 個別問題の終了判定記録

`問題ID / 基準コミット / 修正コミット / 作成または更新したテスト / 入力fixture / 実測結果 / 画素比較の差分 / 保存・Undo確認 / 自動CI / 実機確認の要否 / 残る問題` を残す。

- **コード解決:** 該当の不足条件が解消し、テスト成功かつ既存データ保護を確認。独立実機承認は必要なら別管理する。
- **部分対応:** 主要不足や測定での問題が残る。小修正をしただけで「解決」にしない。
- **未検証:** 実測や比較がないため判断できない。問題が残ることの立証と、まだ試していないことを混同しない。
- **仕様確認待ち:** ユーザーが決める必要のある動作要件（例:異なる書式のベクターを自動追記する条件、図形演算の元レイヤーと結果の関係）が未確定。勝手な既存仕様破壊をしない。

## 完了までの作業順

**ステップ1:** 自動テストで実装不足がすぐ確定できる C04-002・C06-002・C07-001・C09-014・C10-001・C10-011 を対象に、再現テスト作成→修正→CI→状態更新を繰り返す。  
**ステップ2:** 複雑な描画の共通原因（C06-001/007・C07-002/004・C08-003・C09-004/005/013・C10-002/015）を一組で直す。  
**ステップ3:** 設計変更が必要な C07-003・C10-006・C10-009 は保存互換とデータ保護条件を明確にしてから実装。  
**ステップ4:** 実機/画質の受入試験（C07-007/014・C08-001/007/014・C09-010・C10-010/013など）を実施し、問題がなければ無意味な再設計をせず解決認定する。  
**ステップ5:** 修正記録のある残り92件についても、既存テストの網羅性と最新コードを独立して照合。未確認を合格扱いしない。

`main`へマージしない。PR #75をDraft維持。PR #73の原調査を変更しない。
