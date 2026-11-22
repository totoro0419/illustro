# Illustro｜C01〜C10 完成状況監査報告（STEP 1）

> **更新 2026-11-22：前回「未確認」104件はコード調査によるA/B/C判定に置換済み。以下の「11/22更新結果」が現時点の優先記録です。元の本文で「未確認104」とする箇所は11/22調査着手前の履歴としてのみ読むこと。アプリでの操作や新テスト実行は行っていません。**

## 2026-11-22 更新結果｜104機能の実装有無を全件照合

**調査対象の最新HEAD：** `49474fd56b36d91425e5df81f9c135c0424aecb4`。前回CSVの未確認104 IDを抽出し、GitHub上の描画UI/設定/呼出処理/Core/保存/既存テストを追跡した。証拠原本は [104件のコード調査JSON](C01-C10-104-CODE-EVIDENCE.json) と [更新された155件台帳](C01-C10-FEATURE-INVENTORY.csv)。

**結論：104件 = A（実装あり）91件 + B（一部実装）12件 + C（未実装）1件。未処理0・取得不能0。** 104 IDが元の未確認104 IDと完全に一致すること、根拠に示したファイル145種が基準HEADのGitHubファイルツリーに存在することを確認した。**ファイルの存在だけでAにせず、UIから処理・履歴/保存への経路を読んで判定**した。関連テストはコード・テストファイルの存在を調査した証拠であり、今回新たに実行した結果ではない。

| チャンク | 元の未確認 | A 実装あり | B 一部実装 | C 未実装 |
|---|---:|---:|---:|---:|
| C02 | 1 | 0 | 1 | 0 |
| C03 | 21 | 19 | 2 | 0 |
| C04 | 16 | 13 | 2 | 1 |
| C05 | 13 | 12 | 1 | 0 |
| C06 | 13 | 9 | 4 | 0 |
| C07 | 11 | 10 | 1 | 0 |
| C08 | 17 | 17 | 0 | 0 |
| C09 | 8 | 8 | 0 | 0 |
| C10 | 4 | 3 | 1 | 0 |
| **合計** | **104** | **91** | **12** | **1** |

**全155件の最新状態：** A実装あり91件、B一部実装12件、C未実装1件、前回の一部完成34件、前回の実装充足候補16件、以前からの品質問題あり1件。前回の51件については本104件監査だけを理由に無断で再分類していない。実装有無のAと、製品としての実機完成/画質合格を区別する。

**Cと判定した機能はCOL-011だけ：知覚的な色選択・色域マスク。** `color/model.ts` はRGB/HSV/HSLの選択を扱い、`color/orbit.ts` もHSVの色相環を描く。両者と `color/panel.ts`、`color/harmony.ts` のUI・状態更新・保存経路に、必要な知覚的L/C/Hでの選択、色域マスク編集/保存、色域内候補表示がない。既存の一般色相環で代用できないためC。対照的に他の12件は既存処理があるためBとして不足箇所だけを実装する。

**Bの12件：** PIX-001（1px・整数・アンチエイリアスOFF）、CAN-010（キャンバス外の内容保持）、SAV-008（バックアップ・版移行・旧形式）、DEV-005（能力差・低負荷・端末間移送）、UI-003（コンテキスト操作・対象帯）、REF-006（資料保存・不足・権利メモ）、CAN-005（トリミング・キャンバス拡張）、CAN-006（画像サイズ変更）、CLP-003（文書間の編集データ移送）、SEL-007（境界移動と内容移動）、PIX-002（画素を守る変形と出力）、VEC-003（線幅・筆風・ベクター消去）。一部実装の詳細と修正箇所は[更新実装計画](C01-C10-IMPLEMENTATION-PLAN.md)の先頭に列挙。

旧M01〜M10の操作PASS **752件は全件維持**。過去の操作PASSは旧コード・旧UIでの検査であり、今回の後発機能を無条件に証明しない。PR #105の現行UIを前提とし、基準未統合の#104/#106の差分は現コードの実装実績に加算しない。

### 104機能の個別照合結果
表の経路表記は「参照ファイル：コード行と処理」の形式。各機能には詳細台帳に処理・UI・保存/Undo・関連テスト・欠落能力の列がある。Aは静的な実装有無であってAndroidの実機操作合格ではない。

| 機能ID | チャンク | 判定 | 確認した機能 | 不足（あれば） | 処理・UIの根拠 |
|---|---|---|---|---|---|
| PIX-001 | C02 | B | 拡大時の画素表示切替、細いブラシの入力は存在 | 描画用の1px整数位置固定とアンチエイリアスOFFを独立操作する専用設定が確認できない | `packages/brush-rt/src/renderer.mjs:415 canvas.style.imageRendering` / `apps/editor/src/main.ts:3075 displayBrushCursor` |
| CAN-010 | C03 | B | Crop・作品サイズ変更と過去版の保存がある | Crop後の領域外の元画素を通常編集で保持・再表示する専用経路が不明確 | `packages/core/src/transaction.ts:geometry operations` / `apps/editor/src/main.ts:1987 openGeometry` |
| HIS-002 | C03 | A | 履歴一覧・プレビュー比較・過去版の復元がUIから接続 | 主要要件の未接続・未実装は静的確認で発見せず | `apps/editor/src/ui/artworkHistoryView.ts:43 historyComparisonPreview` / `apps/editor/src/main.ts:2269 openArtworkHistory` |
| HIS-003 | C03 | A | 名前とメモを付けて独立版として保持し後から呼び出せる | 主要要件の未接続・未実装は静的確認で発見せず | `packages/core/src/transaction.ts:577 pinRevision` / `apps/editor/src/main.ts:2049 saveNamedArtworkSnapshot` |
| HIS-004 | C03 | A | 別案分岐・比較・復元と通常Undoに接続 | 主要要件の未接続・未実装は静的確認で発見せず | `packages/core/src/transaction.ts:586 restoreRevision` / `apps/editor/src/main.ts:2024 restoreArtworkHistory` |
| HIS-005 | C03 | A | 範囲選択・フェザーを考慮した過去版の部分復元/履歴ブラシ | 主要要件の未接続・未実装は静的確認で発見せず | `apps/editor/src/historyBrush.ts:restoreHistoryPixels` / `apps/editor/src/main.ts:2082 copyHistoricalLayer` |
| HIS-006 | C03 | A | 履歴保持上限の設定・縮小プレビューの制限と不要な候補の整理 | 主要要件の未接続・未実装は静的確認で発見せず | `packages/core/src/coreDocument.ts:38 setHistoryUndoLimit` / `apps/editor/src/main.ts:2210 setHistoryUndoLimit` |
| LAY-004 | C03 | A | クリッピング・透明部分ロックのUI切替→Core更新が存在 | 主要要件の未接続・未実装は静的確認で発見せず | `packages/core/src/transaction.ts:883 setLayerClipping` / `apps/editor/src/main.ts:1533 layerClipping.onclick` |
| LAY-005 | C03 | A | ピクセル/パス/選択範囲マスクの作成・直接編集・適用 | 主要要件の未接続・未実装は静的確認で発見せず | `packages/core/src/transaction.ts:873 setVectorLayerMask` / `apps/editor/src/main.ts:488 pixelMaskAdd` |
| LAY-006 | C03 | A | 複製・結合・統合コピーとUndo単位のCore操作 | 主要要件の未接続・未実装は静的確認で発見せず | `apps/editor/src/main.ts:368 createLayerFromPixels` / `apps/editor/src/ui/shell.ts:133 duplicateLayer/merge` |
| LAY-008 | C03 | A | 全体/内容/位置ロックのそれぞれの操作・編集ガード | 主要要件の未接続・未実装は静的確認で発見せず | `packages/core/src/transaction.ts:896 setLayerContentLocked` / `apps/editor/src/main.ts:1545 layerContentLock.onclick` |
| LAY-009 | C03 | A | Soloは一時表示で元のレイヤー内容を変更せず戻せる | 主要要件の未接続・未実装は静的確認で発見せず | `apps/editor/src/brushSurface.ts:setLayerCompPreview` / `apps/editor/src/main.ts:1459 layerSoloToggle.onclick` |
| LAY-010 | C03 | A | 作品の位置から層候補を取得し選択する操作が接続 | 主要要件の未接続・未実装は静的確認で発見せず | `apps/editor/src/brushSurface.ts:setLayerPick` / `apps/editor/src/main.ts:713 pickLayerOnCanvas` |
| LAY-011 | C03 | A | 表示案の保存・比較・適用・更新・削除と保存形式が存在 | 主要要件の未接続・未実装は静的確認で発見せず | `packages/core/src/transaction.ts:594 saveLayerComp` / `apps/editor/src/main.ts:1447 layerCompApply.onclick` |
| LAY-012 | C03 | A | 白背景/空層/非描画対象に対し描画可能な層を保護し誤描画を防止 | 主要要件の未接続・未実装は静的確認で発見せず | `apps/editor/src/brushSurface.ts:804 nonexistent white raster` / `apps/editor/src/main.ts:2615 drawing controls` |
| NDE-001 | C03 | A | 合成モードと色空間の変更・プレビュー・確定が接続 | 主要要件の未接続・未実装は静的確認で発見せず | `packages/core/src/layerBlend.ts:3 LAYER_BLEND_MODES` / `apps/editor/src/ui/layerBlendDialog.ts:13 openLayerBlendDialog` |
| NDE-002 | C03 | A | 階調条件に応じた合成詳細の入力とレイヤー保存に接続 | 主要要件の未接続・未実装は静的確認で発見せず | `packages/core/src/layerBlend.ts:9 LayerTone` / `apps/editor/src/ui/layerBlendDialog.ts:37 tonePanel.open` |
| SAV-004 | C03 | A | 保存中・保護待ち・失敗を可視化し、保護記録を順番に確定 | 主要要件の未接続・未実装は静的確認で発見せず | `apps/editor/src/persistence/coordinator.ts:212 drain` / `apps/editor/src/main.ts:1391 saveState` |
| SAV-005 | C03 | A | 保護済みの復元候補選択・プレビュー・復旧を接続 | 主要要件の未接続・未実装は静的確認で発見せず | `apps/editor/src/persistence/coordinator.ts:122 listRecoveryCandidates` / `apps/editor/src/ui/homeShell.ts:393 recovery candidates` |
| SAV-006 | C03 | A | 容量、同ID別起動の世代検査、外部保存の変更検知、失敗案内を実装 | 主要要件の未接続・未実装は静的確認で発見せず | `apps/editor/src/persistence/workLibrary.ts:55 publishWork` / `apps/editor/src/main.ts:289 retryWorkSave` |
| SAV-007 | C03 | A | Service Workerによる必要ファイルの保護・ログイン不要のローカル編集・保存が実装 | 主要要件の未接続・未実装は静的確認で発見せず | `apps/editor/public/sw.js:51 fetch` / `apps/editor/src/main.ts:3650 serviceWorker.register` |
| SAV-008 | C03 | B | 旧筆跡移行・旧原本の比較・バックアップ作品保存がある | 異なる全旧形式・外部依存の互換と複数作品のバックアップ一括復元は未充足または証拠不足 | `apps/editor/src/persistence/openLegacy.ts:21 convertLegacyStrokeFile` / `apps/editor/src/main.ts:3215 legacySourcePreview` |
| COL-003 | C04 | A | 作品/資料、参照対象、面積、透明度の採色設定と描画色への反映がある | 主要要件の未接続・未実装は静的確認で発見せず | `apps/editor/src/color/eyedropperSettings.ts:85 apply controls` / `apps/editor/src/main.ts:1850 installColorPanel / 1919 activateEyedropper` |
| COL-004 | C04 | A | 色パレット作成/編集/順序/色の削除/交換・JSON読込/書出と保存が接続 | 主要要件の未接続・未実装は静的確認で発見せず | `apps/editor/src/color/model.ts:147 selectPalette` / `apps/editor/src/color/panel.ts:67-71 palette creation, reorder, import/export` |
| COL-005 | C04 | A | 配色候補・明暗比・グレー/色覚比較の表示は作品の画素を変更しない | 主要要件の未接続・未実装は静的確認で発見せず | `apps/editor/src/color/harmony.ts:45 harmonyColors` / `apps/editor/src/color/harmony.ts:53 installHarmonyTools` |
| COL-011 | C04 | C | HSV/HSL/RGB色の選択と色相環は存在する | 必要能力の知覚的L/C/H空間の選択・色域マスクの編集/保存/色域内表示がcolor/model.ts、orbit.ts、panel.ts、harmony.ts、および現行UIに存在しない。既存の色相環を同等機能と取り違えない | `apps/editor/src/color/model.ts:16 rgbToHsv / 27 rgbToHsl` / `apps/editor/src/color/panel.ts:11 colorPickerMode classic/orbit` |
| DEV-004 | C04 | A | 回転/幅変更時の表示再構築、パネル位置、タッチ/キーボードの適応が実装 | 主要要件の未接続・未実装は静的確認で発見せず | `apps/editor/src/ui/shellBehavior.ts:263 window resize` / `apps/editor/src/ui/shellBehavior.ts:24 compact/touch matchMedia` |
| DEV-005 | C04 | B | 端末別入力、空き容量検出、Native作品と設定の移送入口はある | 実入力の取得可否・実測負荷を機能別に説明する統合画面が見当たらず、能力差の提示は限定的 | `apps/editor/src/ui/inputDeviceProfiles.ts:16 installInputDeviceProfiles` / `apps/editor/src/ui/workspaceProfiles.ts:240 bundleExport` |
| GST-002 | C04 | A | 実際に押したキーの割当・衝突案内、保持/切替/単発と解除の操作が接続 | 主要要件の未接続・未実装は静的確認で発見せず | `apps/editor/src/ui/shortcutSettings.ts:139 captureKey` / `apps/editor/src/main.ts:3779 installShortcutSettings` |
| GST-005 | C04 | A | キー/作業場設定の書出・取込・変更差分と未対応割当を保持 | 主要要件の未接続・未実装は静的確認で発見せず | `apps/editor/src/ui/shortcutSettings.ts:185 parse imported` / `apps/editor/src/ui/workspaceProfiles.ts:255 bundleFile import` |
| INP-008 | C04 | A | 入力欄/IME合成中のショートカット抑制と文字入力中の候補更新抑制が接続 | 主要要件の未接続・未実装は静的確認で発見せず | `apps/editor/src/ui/shortcutSettings.ts:60 isText` / `apps/editor/src/artwork/textPanel.ts:173 compositionstart` |
| UI-002 | C04 | A | Box折畳、順序変更、分離したパネルの移動/リサイズ/位置保存がある | 主要要件の未接続・未実装は静的確認で発見せず | `apps/editor/src/ui/floatingPanels.ts:85 dragButton` / `apps/editor/src/ui/shellBehavior.ts:168 togglePanel` |
| UI-003 | C04 | B | ツール・保存状態と設定への近接表示が存在 | 描画先/塗り参照元/選択/未確定状態を常時同じ安定した対象帯にまとめる統合入口が不足 | `apps/editor/src/main.ts:1391 saveState` / `apps/editor/src/ui/workspaceDetails.ts:21 show` |
| UI-004 | C04 | A | 6個の固定スロット・グループ/名称編集・保持キー/ペンボタンとUndo/Redo、個人設定の保存がある | 主要要件の未接続・未実装は静的確認で発見せず | `apps/editor/src/ui/commandPalette.ts:319 renderQuick` / `apps/editor/src/main.ts:3747 installCommandPalette` |
| UI-005 | C04 | A | 機能・レイヤー・筆名等の横断検索から操作実行、非表示層も検索可能 | 主要要件の未接続・未実装は静的確認で発見せず | `apps/editor/src/ui/commandPalette.ts:163 dynamicCommands` / `apps/editor/src/main.ts:3747 installCommandPalette` |
| UI-006 | C04 | A | 作業場設定の保存/復元/左右反転、設定束ねて移送するUIが存在 | 主要要件の未接続・未実装は静的確認で発見せず | `apps/editor/src/ui/workspaceProfiles.ts:120 snapshot` / `apps/editor/src/main.ts:3776 installWorkspaceProfiles` |
| UI-007 | C04 | A | 集中表示、全画面、Escapeで戻す、Quick Controllerへの入口がある | 主要要件の未接続・未実装は静的確認で発見せず | `apps/editor/src/ui/focusMode.ts:2 installFocusMode` / `apps/editor/src/main.ts:3710 installFocusMode` |
| UI-008 | C04 | A | ホーム・機能紹介・設定・ヘルプから編集入口へ到達可能 | 主要要件の未接続・未実装は静的確認で発見せず | `apps/editor/src/ui/homeShell.ts:123 installHomeShell` / `apps/editor/src/ui/help.ts:15 installEditorHelp` |
| AST-001 | C05 | A | 素材の種類ごとに保存先と適用処理を分ける一覧・取込が接続 | 主要要件の未接続・未実装は静的確認で発見せず | `apps/editor/src/assets/library.ts:5 ASSET_KINDS` / `apps/editor/src/assets/assetPanel.ts:34 installAssetPanel` |
| AST-002 | C05 | A | 検索/タグ/フォルダー/最近使った/お気に入りが実際の素材DBに反映 | 主要要件の未接続・未実装は静的確認で発見せず | `apps/editor/src/assets/library.ts:63 listAssets` / `apps/editor/src/assets/assetPanel.ts:42 query search` |
| AST-003 | C05 | A | 個別素材とセットの入出力、インポートの安全性確認・途中再開 | 主要要件の未接続・未実装は静的確認で発見せず | `apps/editor/src/assets/packs.ts:29 exportAssetPack` / `apps/editor/src/assets/assetPanel.ts:55 add/import pack` |
| AST-004 | C05 | A | 版更新・複製・削除/復元・同名素材の取り込み分岐がDBに反映 | 主要要件の未接続・未実装は静的確認で発見せず | `apps/editor/src/assets/library.ts:178 createAssetVersion` / `apps/editor/src/assets/assetPanel.ts:146 新版を保存` |
| AST-005 | C05 | A | 端末内素材庫と任意の素材セット書出/取込が成立 | 主要要件の未接続・未実装は静的確認で発見せず | `apps/editor/src/assets/packs.ts:6 PackManifest` / `apps/editor/src/assets/assetPanel.ts:56 素材セットを読み込む` |
| CAN-007 | C05 | A | 作品ごとに切替前の保護処理を待ち、一覧から別作品を開く/前の作業に戻る | 主要要件の未接続・未実装は静的確認で発見せず | `apps/editor/src/main.ts:3538 openWork` / `apps/editor/src/ui/homeShell.ts:231 open.onclick` |
| IO-001 | C05 | A | 画像ファイルを作品に開く/貼付/配置/資料へ振り分け、元作品編集に接続 | 主要要件の未接続・未実装は静的確認で発見せず | `apps/editor/src/assets/linkedImages.ts:91 decodeLinkedImage` / `apps/editor/src/main.ts:4737 installImageDropRouting` |
| REF-001 | C05 | A | 複数資料の重ね合わせ、グループ化と切替・表示が保存に接続 | 主要要件の未接続・未実装は静的確認で発見せず | `apps/editor/src/assets/referenceBoardStore.ts:3 BoardItem group` / `apps/editor/src/assets/referenceBoard.ts:77 groupRow` |
| REF-002 | C05 | A | 資料の位置・拡縮・回転/固定を直接編集して再読込に保持 | 主要要件の未接続・未実装は静的確認で発見せず | `apps/editor/src/assets/referenceBoard.ts:599 pinned guard` / `apps/editor/src/assets/referenceBoard.ts:481 pin button` |
| REF-003 | C05 | A | 資料の反転、グレー、一時非表示・復帰を資料のメタデータに保持 | 主要要件の未接続・未実装は静的確認で発見せず | `apps/editor/src/assets/referenceBoard.ts:577 grayscale filter` / `apps/editor/src/assets/referenceBoard.ts:586 グレー` |
| REF-004 | C05 | A | 資料座標を逆変換して色を拾い、選択された資料から描画色を取得 | 主要要件の未接続・未実装は静的確認で発見せず | `apps/editor/src/assets/referenceDirectSample.ts:12 referencePixelAtScreen` / `apps/editor/src/assets/referenceBoard.ts:487 sample button` |
| REF-005 | C05 | A | 資料の全体と細部を併記するNavigatorを資料選択へ接続 | 主要要件の未接続・未実装は静的確認で発見せず | `apps/editor/src/assets/referenceBoard.ts:424 drawNavigator` / `apps/editor/src/assets/referenceBoard.ts:64 navFull/navDetail` |
| REF-006 | C05 | B | 作品内に資料を埋込/外部参照し、欠損を表示・元データを保護する処理がある | 資料の権利・出典メモを利用者が入力/修正するUIが見当たらない。BoardItem.notesは保存構造にあるがreferenceBoard.tsで編集に接続されていない | `apps/editor/src/assets/referenceBoard.ts:262 exportLayout / 268 NATIVE_TYPE` / `apps/editor/src/assets/referenceBoard.ts:83 embedded/linked` |
| CAN-005 | C06 | B | Crop・キャンバス拡張・基準点選択は描画/Undo/保存へ接続 | 正式仕様で既定とする外側画素保持/完全切除の別コマンドがない。main.ts:2503 はcropCanvasで外の画素を直接落とす。Crop後に保存・履歴整理しても外側を再編集する機能はない | `apps/editor/src/canvasGeometry.ts:19 cropCanvas / 11 changeCanvasBounds` / `apps/editor/src/main.ts:1987 openGeometry / 2000 cropStart` |
| CAN-006 | C06 | B | 任意サイズと補間方式を指定し1回の画像Resize/Undoを実行できる | 比率ロック標準・変更前後の画質比較/結果寸法プレビュー・DPIだけの変更と連動説明が現行geometryDialogで不足 | `apps/editor/src/canvasGeometry.ts:45 resizeImagePixels` / `apps/editor/src/main.ts:1987 openGeometry / 2501 geometryFilter` |
| CLP-001 | C06 | A | 選択/層/グループのコピー・切取・貼付が内部Clipboardから実際の対象層へ到達。切取はコピー成功後のみ変更 | 主要要件の未接続・未実装は静的確認で発見せず | `apps/editor/src/selection/clipboard.ts:107 copy / 219 cut` / `apps/editor/src/selection/clipboardPanel.ts:41 c06CopySelection / 46 c06CutSelection` |
| CLP-002 | C06 | A | 合成コピー/同位置貼付と原位置の情報保持、UI/資料の作品表示への混入回避が実装 | 主要要件の未接続・未実装は静的確認で発見せず | `apps/editor/src/selection/clipboard.ts:107 copy merged` / `apps/editor/src/selection/clipboardPanel.ts:44 c06CopyMerged / 48 c06PasteInPlace` |
| CLP-003 | C06 | B | 別作品に層・グループ・文字・パス・Mask・変形データを編集可能なままコピー可能 | 異なる作品色空間の色差や必要素材を含むポータブル移送/不足素材の解決は実装が限定的。フォントIDは通知するが元作品の依存素材データをまとめて移送しない | `apps/editor/src/selection/clipboard.ts:304 editable layers / 326 begin` / `apps/editor/src/selection/clipboardPanel.ts:42 c06CopyLayer / 43 c06CopyGroup` |
| CLP-004 | C06 | A | OSクリップボードと画像ドロップの経路・権限拒否時の説明、貼付/素材/資料の用途選択がある | 主要要件の未接続・未実装は静的確認で発見せず | `apps/editor/src/selection/clipboard.ts:369 writeSystemClipboard / 374 readSystemClipboard` / `apps/editor/src/selection/clipboardPanel.ts:55 c06SystemCopy / 200 paste event` |
| SEL-002 | C06 | A | 色/明度/線画/レイヤーαから対象を作り、参照層・許容値・連続条件を設定して範囲マスクを確定 | 主要要件の未接続・未実装は静的確認で発見せず | `apps/editor/src/selection/autoSelect.ts:8 selectFromPixels` / `apps/editor/src/selection/panel.ts:389 autoSource / 416 pickAutomatic` |
| SEL-003 | C06 | A | 幅指定の境界/ぼかし/拡縮をプレビュー・比較・取消し後に選択マスクへ反映 | 主要要件の未接続・未実装は静的確認で発見せず | `apps/editor/src/selection/mask.ts:122 featherMask / 147 growOrShrink` / `apps/editor/src/selection/panel.ts:540 feather / 554 grow / 555 shrink` |
| SEL-004 | C06 | A | 全選択・解除・直前再選択・反転をUndo/Redo対応の現在選択範囲に反映 | 主要要件の未接続・未実装は静的確認で発見せず | `apps/editor/src/selection/mask.ts:63 invertSelection / 66 fullSelection` / `apps/editor/src/selection/panel.ts:478 all / 479 clear / 480 reselect` |
| SEL-005 | C06 | A | 線画参照の領域と現レイヤー画素の透明度から範囲マスクを生成し加算/除外に使用 | 主要要件の未接続・未実装は静的確認で発見せず | `apps/editor/src/selection/autoSelect.ts:8 selectFromPixels` / `apps/editor/src/selection/panel.ts:403 alpha / 404 autoInk` |
| SEL-006 | C06 | A | 名前付き選択と現在選択を分離保存、複合モードで読み込み・上書き、Native保存でも復元 | 主要要件の未接続・未実装は静的確認で発見せず | `apps/editor/src/selection/store.ts:32 saveNamedSelection / 68 loadNamedSelection` / `apps/editor/src/selection/panel.ts:615 save / 617 load / 687 loadCurrent` |
| SEL-007 | C06 | B | 枠のみの平行移動と画素内容の平行移動を別UI・別操作で実行 | 選択境界そのものの拡縮・回転を濃度Maskを守って直接変形する操作がない。TRN側の画素変形で代用せず専用境界変形を追加 | `apps/editor/src/selection/mask.ts:76 translateSelection` / `apps/editor/src/selection/panel.ts:484 境界だけ移動 / 491 movePixels` |
| SEL-008 | C06 | A | 縁/濃度の半透明表示は画面合成で操作でき、非表示にしても選択制限が維持される。PNGへは含めない | 主要要件の未接続・未実装は静的確認で発見せず | `apps/editor/src/selection/overlay.ts:39 render selection alpha` / `apps/editor/src/selection/panel.ts:62 showSelection / 63 onchange` |
| NDE-003 | C07 | A | 元の絵を保護した変形・効果を再編集/無効化/削除/マスクし、明示的に焼き込みができる | 主要要件の未接続・未実装は静的確認で発見せず | `packages/core/src/layerDeformation.ts:40 validateLayerDeformation` / `apps/editor/src/transform/panel.ts:567 toggleEffect / 570 removeEffect` |
| NDE-004 | C07 | A | 画像リンク・埋込・同一元の複製・不足元の保持と再指定/独立化がUIから選べる | 主要要件の未接続・未実装は静的確認で発見せず | `packages/core/src/layerImageLink.ts:9 validateLayerImageLink` / `apps/editor/src/transform/imageLinkPanel.ts:58 link/embed / 60 instance` |
| NDE-005 | C07 | A | グループ通過/隔離を処理順とマスク・クリッピングの説明付きで比較し構造を一Undoで変更 | 主要要件の未接続・未実装は静的確認で発見せず | `packages/core/src/layerGroups.ts:9 compositing mode` / `apps/editor/src/main.ts:857 editGroupStructure / 866 mode` |
| PIX-002 | C07 | B | 最近傍補間の明示・ドット絵向け提案と低画質化の注意がある | 整数倍・端数位置/回転に対して画素を守る専用の条件チェック/強制しない警告と、ピクセル用途の作品出力UIは不足 | `apps/editor/src/canvasGeometry.ts:45 resizeImagePixels / 51 nearest` / `apps/editor/src/transform/panel.ts:139 interpolation mode / 140 artworkKind` |
| TRN-002 | C07 | A | 四隅/消失点/傾斜で変形を直接操作、退化はinverseTransformで拒否し編集可能な元を保持 | 主要要件の未接続・未実装は静的確認で発見せず | `apps/editor/src/transform/panel.ts:134 modes free/projective/skew` / `apps/editor/src/transform/panel.ts:274 refreshHandles / 553 vanishing` |
| TRN-003 | C07 | A | メッシュ・ケージの固定点/追加/削除/分割と直接操作、元画像と制御点を再編集可能に保存 | 主要要件の未接続・未実装は静的確認で発見せず | `apps/editor/src/transform/mesh.ts:11 gridMesh / 20 cageMesh` / `apps/editor/src/transform/panel.ts:206 mesh points / 311 refreshHandles` |
| TRN-004 | C07 | A | 押す/膨張/収縮/回す/戻す、圧力反映の半径・強さ、保護範囲と一筆Undo/全体Undoがある | 主要要件の未接続・未実装は静的確認で発見せず | `apps/editor/src/transform/liquify.ts:7 makeLiquifyStroke / 24 liquifyMapping` / `apps/editor/src/transform/panel.ts:523 brushMode / 541 setCanvasEditGesture` |
| TRN-005 | C07 | A | 定規/画素/他の層への吸着、一時解除と吸着先の表示、整列・等間隔をUndo一単位で適用 | 主要要件の未接続・未実装は静的確認で発見せず | `apps/editor/src/transform/layout.ts:alignLayers` / `apps/editor/src/transform/panel.ts:75 snapPixels / 81 skipSnap` |
| TRN-006 | C07 | A | 元状態から都度変形を再評価し複数試行で画素劣化を重ねず、用途別の補間と画素保護を選択 | 主要要件の未接続・未実装は静的確認で発見せず | `apps/editor/src/transform/interpolationAdvice.ts:9 recommendInterpolation` / `apps/editor/src/transform/panel.ts:139 interpolation / 594 change` |
| TRN-007 | C07 | A | ハンドル調整はセッション内Undo/Redo、取消で原本に復帰、適用は全体履歴一操作 | 主要要件の未接続・未実装は静的確認で発見せず | `apps/editor/src/transform/panel.ts:609 undo.push(prior)` / `apps/editor/src/transform/panel.ts:752 back / forward / apply / cancel` |
| TRN-008 | C07 | A | 元画素の再編集/非破壊変形の再編集/明示焼込/上層追加の各経路とUndo・Native保持が存在 | 主要要件の未接続・未実装は静的確認で発見せず | `packages/core/src/layerDeformation.ts:33 LayerDeformation` / `apps/editor/src/transform/panel.ts:439 openOriginal / 564 bakeButton` |
| FIL-002 | C08 | A | 隙間補完の候補・塗り残しを表示し、元線を変更せず補完幅/角/範囲を調整して塗る | 主要要件の未接続・未実装は静的確認で発見せず | `apps/editor/src/fill/pixels.ts:79 fillBoundaries / 267 unpaintedFillEdges` / `apps/editor/src/fill/panel.ts:95 gap / 96 edge / 101 diagnostic` |
| FIL-003 | C08 | A | 参照層現在/複数/合成/ベクター、特定層除外、塗り先の独立指定と版固定がある | 主要要件の未接続・未実装は静的確認で発見せず | `apps/editor/src/fill/reference.ts:14 readFillReference` / `apps/editor/src/fill/panel.ts:84 reference / 90 destination / 535 exclude` |
| FIL-004 | C08 | A | ドラッグ中の通過領域候補を集約・重複除外し、一ドラッグ一回の塗り適用/Undoを提供 | 主要要件の未接続・未実装は静的確認で発見せず | `apps/editor/src/fill/pixels.ts:284 fillMask / 333 contiguous` / `apps/editor/src/fill/panel.ts:393 onCanvas / 457 update complete` |
| FIL-005 | C08 | A | 囲み全体/囲み内の閉領域を選び、色・透明消去・対象の濃さ条件を変えて一操作で反映 | 主要要件の未接続・未実装は静的確認で発見せず | `apps/editor/src/fill/pixels.ts:292 lasso / 295 lasso-closed` / `apps/editor/src/fill/panel.ts:83 method / 542 startFill` |
| FIL-006 | C08 | A | 線をなぞって接触した閉領域を候補表示、領域番号の加算・除外を選んで確定 | 主要要件の未接続・未実装は静的確認で発見せず | `apps/editor/src/fill/pixels.ts:308 method line` / `apps/editor/src/fill/panel.ts:103 trace / 542 startFill` |
| FIL-007 | C08 | A | 保存した線画領域版に基づく独立彩色、境界修正を優先、元線変更時に既存塗りを勝手に再彩色しない | 主要要件の未接続・未実装は静的確認で発見せず | `apps/editor/src/fill/pixels.ts:218 buildRegions` / `apps/editor/src/fill/panel.ts:600 confirmGraph / 611 use saved` |
| FIL-008 | C08 | A | 色・透明の指示を独立保存し候補を作成、指示の移動/局所取消、焼込と区別して保存 | 主要要件の未接続・未実装は静的確認で発見せず | `apps/editor/src/fill/pixels.ts:419 paintColorHints` / `apps/editor/src/fill/panel.ts:625 addHint / 637 changeHintColor / 683 removeHint` |
| FIL-009 | C08 | A | 直後の塗りを元候補から再計算し新編集無しの場合だけ同一履歴へ置換する | 主要要件の未接続・未実装は静的確認で発見せず | `apps/editor/src/fill/panel.ts:563 adjustPaint` / `apps/editor/src/fill/panel.ts:544 applyPaint / 565 refreshCandidate` |
| FIL-010 | C08 | A | 現在レイヤー/上新規/下新規/色名レイヤーを選び、透明消去の対象条件と一Undoを保持 | 主要要件の未接続・未実装は静的確認で発見せず | `apps/editor/src/main.ts:4477 addRasterSnapshotAbove` / `apps/editor/src/fill/panel.ts:90 destination / 115 erase` |
| LIN-001 | C08 | A | 元Raster/複数参照から線画領域用の非描画レイヤーを作成・版と手修正を保存し元線を保護 | 主要要件の未接続・未実装は静的確認で発見せず | `apps/editor/src/fill/pixels.ts:218 buildRegions` / `apps/editor/src/fill/panel.ts:585 analyze / 600 confirmGraph` |
| LIN-002 | C08 | A | 境界/外側/穴/隣接・補完候補を別表示し、保存した区分を再呼出 | 主要要件の未接続・未実装は静的確認で発見せず | `apps/editor/src/fill/pixels.ts:35 regionTopology` / `apps/editor/src/fill/panel.ts:92 view / 816 inspect` |
| LIN-003 | C08 | A | 接続/切断/統合の手動修正と候補拒否が元線画を破壊せず版に残る | 主要要件の未接続・未実装は静的確認で発見せず | `apps/editor/src/fill/changedRegions.ts:7 updateChangedRegions` / `apps/editor/src/fill/panel.ts:715 境界線を足す / 716 切る / 776 接続採用` |
| LIN-004 | C08 | A | 同じ保存済み線画領域を塗り・選択範囲作成の両方に利用し、成果物を分離 | 主要要件の未接続・未実装は静的確認で発見せず | `apps/editor/src/fill/panel.ts:543 領域を選択範囲にする` / `apps/editor/src/fill/panel.ts:542 塗る / 543 選択する` |
| LIN-005 | C08 | A | 生成元の変更を警告し手修正を維持しながら新旧解析を比較、変更版を明示採用。元の彩色は維持 | 主要要件の未接続・未実装は静的確認で発見せず | `apps/editor/src/fill/changedRegions.ts:7 updateChangedRegions` / `apps/editor/src/fill/panel.ts:585 解析・更新 / 794 前回比較` |
| LIN-006 | C08 | A | 端点/途中/交差/近接の候補を提示して接続可否を選び、判定内容を手修正に保存 | 主要要件の未接続・未実装は静的確認で発見せず | `apps/editor/src/fill/pixels.ts:450 suggestLocalGaps / 529 sharedBoundary` / `apps/editor/src/fill/panel.ts:766 nextGap / 776 acceptGap / 780 rejectGap` |
| LIN-007 | C08 | A | 未解析/処理中/候補/要レビュー/確定済み/参照元更新の状態を示し、使えない区分での確定を制限 | 主要要件の未接続・未実装は静的確認で発見せず | `packages/core/src/lineRegions.ts:10 review state` / `apps/editor/src/fill/panel.ts:211 pending / 213 reviewed` |
| LIN-008 | C08 | A | ベクターのパスと線幅の見た目を区別・比較して領域へ利用、元パスと線画領域版を保持 | 主要要件の未接続・未実装は静的確認で発見せず | `apps/editor/src/fill/reference.ts:14 readFillReference` / `apps/editor/src/fill/panel.ts:84 vector / vector-visible / 586 vectorCompare` |
| GRA-002 | C09 | A | 色/透明度/中間位置をドラッグや数値で追加・削除・反転/繰返し、編集可能な停止点を作品に保存 | 主要要件の未接続・未実装は静的確認で発見せず | `packages/core/src/editableArtwork.ts:19 GradientStop midpoint` / `apps/editor/src/artwork/shapeGradient.ts:615 redrawStops / 683 position / 686 opacity / 687 midpoint` |
| GRA-003 | C09 | A | 範囲マスク・形状追従を前後比較して適用、あとからグラデーションの方向や停止点を再編集 | 主要要件の未接続・未実装は静的確認で発見せず | `packages/core/src/editableArtwork.ts:20 EditableGradient follow` / `apps/editor/src/artwork/shapeGradient.ts:413 boundary / 416 follow preview / 783 edit layer` |
| GRA-004 | C09 | A | 階調の色置換、色停止点と段階数、ディザ切替、中央の原寸比較、非破壊の調整層として再編集 | 主要要件の未接続・未実装は静的確認で発見せず | `apps/editor/src/artwork/gradientMap.ts:87 validateGradientMap` / `apps/editor/src/artwork/gradientMap.ts:45 installGradientMapPanel / 60 dither` |
| GUI-002 | C09 | A | 一点/二点/三点透視・等角/格子と画面外消失点の座標、ガイド位置のUndo/保存 | 主要要件の未接続・未実装は静的確認で発見せず | `apps/editor/src/artwork/ruler.ts:6 kinds perspective1/2/3` / `apps/editor/src/artwork/ruler.ts:37 axis / 38 coordinates / 82 pick` |
| GUI-003 | C09 | A | 中心・角度・分割数を設定し仮線コピー/Undoを共有。Shiftを押しながら一筆だけ解除できる | 主要要件の未接続・未実装は静的確認で発見せず | `apps/editor/src/strokeSymmetry.ts:8 normalizeSymmetry` / `apps/editor/src/artwork/symmetryPanel.ts:9 mirror/radial/kaleidoscope / 20 axis placement` |
| GUI-005 | C09 | A | ペン保持時に形状補正候補、直線/楕円/矩形を比較・訂正・適用/取消・元筆跡へ復元 | 主要要件の未接続・未実装は静的確認で発見せず | `apps/editor/src/artwork/strokeCorrection.ts:13 correctionSuggestedShape` / `apps/editor/src/artwork/strokeCorrection.ts:64 enabled/hold / 104 apply / 107 cancel` |
| GUI-006 | C09 | A | 定規の吸着先名、優先度/範囲/強さ・可視/ロック、一筆のみ吸着解除と保存可能な設定がある | 主要要件の未接続・未実装は静的確認で発見せず | `apps/editor/src/artwork/guidedPath.ts:7 snapArtworkPathToGuide` / `apps/editor/src/artwork/ruler.ts:29 visible / 30 preferred / 35 strength / 36 range` |
| GUI-007 | C09 | A | 定規セットと図形を素材として登録し、他作品の寸法比/元座標を選んでプレビュー・適用/取消 | 主要要件の未接続・未実装は静的確認で発見せず | `apps/editor/src/artwork/presets.ts:13 parsePreset / 25 place` / `apps/editor/src/artwork/presets.ts:131 register guides / 133 placement preview` |
| VEC-003 | C10 | B | ベクターの線種と基本幅、線/区間/交点までの消去、筆圧による線の表現を実装 | 線の途中の任意点で線幅を直接編集する操作・消去範囲の確定前の画面プレビューが現行UIから不足 | `packages/core/src/editableArtwork.ts:18 ArtPoint pressure / 32 pressure lineStyle` / `apps/editor/src/artwork/vectorPanel.ts:256 erase segment / 313 eraseBetweenIntersections` |
| VEC-004 | C10 | A | 許容幅を指定した簡略化・平滑化、和差交差排他、元図形と結果の連動・編集/Undo/保存を実装 | 主要要件の未接続・未実装は静的確認で発見せず | `apps/editor/src/artwork/pathOperations.ts:12 simplifyPath / 27 smoothPath / 216 combineShapes` / `apps/editor/src/artwork/vectorPanel.ts:296 simplify / 335 boolean` |
| VEC-006 | C10 | A | フォントの端末/素材庫取込、書体の選択・欠落レイヤー通知・輪郭化対応の診断と編集正本の保持 | 主要要件の未接続・未実装は静的確認で発見せず | `apps/editor/src/artwork/fonts.ts:16 importFont / 89 fontOutlineCapability` / `apps/editor/src/artwork/textPanel.ts:59 refreshFonts / 235 import font` |
| VEC-007 | C10 | A | 文字輪郭化/画像化の元文字と結果比較・失う編集性の説明・Undoによる元へ復帰が実装 | 主要要件の未接続・未実装は静的確認で発見せず | `apps/editor/src/artwork/fonts.ts:220 outlineText` / `apps/editor/src/artwork/textPanel.ts:240 outline / 254 rasterize` |

### 調査の限界
- 実機/ブラウザの操作・画質比較・GPU性能の実測は今回の禁止事項であり、A判定を利用者の操作感までのPASSとはしない。
- テストファイルの存在や従来の自動試験成功は新規実行証拠ではない。13件の不足/欠落は必要な修正を追加した後、関連する分岐と保存/Undoを自動検査する。
- 既存の17+18機能（C01/C02旧35件）および前回「実装充足候補」16件・「一部完成」34件・品質問題1件の検証状況は維持し、今回104件の調査結果と混同しない。
- 機能単位の実装有無についてA/B/Cの判定を確定した。将来新しいコード・不具合証拠が出たときの訂正は可能だが、現時点で104件を「未確認」に戻さない。

---

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
