# Illustro 第二ラウンド 機能別の実装状況

## 2026-11-22 利用者決定：R2完成条件の変更（最優先）

[計画PR #109の更新計画](https://github.com/totoro0419/illustro/blob/planning/round2-seven-groups-2026-11-22/docs/roadmap/ROUND2-REMAINING-7-GROUPS.md) と [機械向け条件表](https://github.com/totoro0419/illustro/blob/planning/round2-seven-groups-2026-11-22/docs/roadmap/ROUND2-REMAINING-7-GROUPS.json) が現在のR2実装・完成判定の基準である。

- **旧145件のうち143件が今回の実装対象。** COL-007（HDR・広色域・高精度ネイティブ編集）とAI-004（外部AI/API連携）は利用者の明示的判断で不要とし、R2未完成数から除外。コードや既存機能は削除しない。
- 水彩WET-002は、自然な混色・にじみ・濃淡・粒状感・水量/顔料量調整を伴う**軽量な近似**を完成条件とする。乾燥・加水・持続水分物理は不要。WET-005は筆の紙質に限定、WET-007は既存の厚塗り風・油彩風の外観のみ保持。
- IO-003はPSD/PSB基本交換のみを完成条件とし、高度な全要素の完全互換を要求しない。IO-006は既存のEXR・AVIF対応とHEIF入力を保護し、HEIF出力とHDR保持編集は不要。
- CAN-001等の関連機能にもP3/HDR内部編集を要求しない。既存のICC・色確認・端末内AI補助、他の入出力を削除しない。
- **計数**：正式247 ID＝既存実装保護91＋今回実装143＋今回不要2＋従来対象外11。製品の元の247件仕様を改ざんせず、R2での利用者決定として管理する。
- 後述の「完成86・部分実装57・外部条件未達2」は上記判断以前の実装評価のスナップショット。現在のR2対象は143件だが、その143件の最新完成判定は実装後に更新する。未検査を完成扱いしない。

対象は [計画PR #109](https://github.com/totoro0419/illustro/pull/109) の145件。実装は [Draft PR #110](https://github.com/totoro0419/illustro/pull/110) に集約しています。
正式仕様は `docs/DESIGN_AUTHORITY.md` と `docs/product-planning` の製品採否表・個別仕様、および [第2ラウンド計画ブランチ](https://github.com/totoro0419/illustro/tree/planning/round2-seven-groups-2026-11-22/docs/roadmap) を使用しました。
基準は `quality/C03-C10-integration` の `49474fd5`。今回は作業ブランチの `d244127b` から再開し、#111・#112のパネル変更を維持しました。保護対象91件、保留・対象外11件、過去の品質指摘129件とユーザー報告8件の割り当ては正式計画を参照してください。

「完成」は現在のコードで、主要な個別仕様に必要な操作・処理・保存がつながっている項目です。端末上での受入合格は別に確認します。制約や不足がある項目には、確認できた実装と残る条件を記載しています。以前の追加・補強65件、個別判定保留80件は、今回の完成数に足していません。

| 群 | 対象 | 完成 | 部分実装 | 未実装 | 外部条件などで実装不可 |
|---|---:|---:|---:|---:|---:|
| R2-01 | 33 | 17 | 16 | 0 | 0 |
| R2-02 | 20 | 7 | 13 | 0 | 0 |
| R2-03 | 8 | 6 | 2 | 0 | 0 |
| R2-04 | 10 | 9 | 1 | 0 | 0 |
| R2-05 | 18 | 14 | 4 | 0 | 0 |
| R2-06 | 43 | 30 | 12 | 0 | 1 |
| R2-07 | 13 | 3 | 9 | 0 | 1 |
| **合計** | **145** | **86** | **57** | **0** | **2** |

## 基本検査と残る実機確認

- エディターの型検査と本番ビルドが成功。今回の変更に関係する自動テスト49件が通過。OpenEXRはFFmpegのHALF／ZIPファイルの読込と、IllustroのFLOAT出力の確認も実施。Little CMSの色変換と出力色確認で半透明の値を保つことを確認。
- 既存の広範囲テストは前回の結果を参照。実機では混色・水彩と修復パッチの筆操作、保存し直した作品の復元、他のペイントアプリとの入出力、印刷プロファイル別の見え方と入力機器の挙動が残る。
- 専用プレビューは [R2プレビュー](https://totoro0419.github.io/illustro/r2-preview/) と [公開履歴](https://github.com/totoro0419/illustro/actions/workflows/r2-preview.yml)。通常の公開版とR2の作品・素材・選択・一時保存を分離している。
- 統合時の共有エントリー `main.ts` の変更にはリポジトリのレビューが必要。Draft PRは正式版に統合していない。

## R2-01

| ID | 機能 | 実装状況 | 現在の根拠・残件 |
|---|---|---|---|
| `CAN-001` | 新規作品 | 部分実装 | documentSetup.ts、main.tsの新規作品画面。幅・高さ・単位・DPI・背景を指定して描画レイヤーを選択。色はsRGBのみ。 |
| `CAN-002` | 表示移動・拡縮・回転 | 部分実装 | canvasView.ts、brushSurface.tsの描画表示変換・操作入力。描画中、確定直後、保存中をまたぐ実機応答と途中線の一致は未確認。 |
| `CAN-003` | Fit・100%・表示反転 | 完成 | canvasView.ts、main.tsのFit・実画素・回転解除・左右上下の表示反転。作品の書出しは画面の変換を使わない。 |
| `CAN-004` | 高倍率・ピクセル確認 | 部分実装 | canvasView.tsの最近傍表示とmain.tsのグリッド・座標・閾値設定。ズーム上限6400%。それ以上の採否と端末ごとの実画素表示は未確認。 |
| `CAN-008` | シームレス反復描画 | 部分実装 | canvasView.tsとbrushSurface.tsのシームレス描画、表示状態の保存。繰り返し数を指定する操作と各境界の再現試験が残る。 |
| `CAN-009` | 文書属性・テンプレート | 部分実装 | documentSetup.tsの寸法・DPI・背景テンプレートとmain.tsの作品情報。ガイドや色設定を選んでテンプレートに含める操作が残る。 |
| `INP-001` | 入力役割の切替 | 完成 | ui/inputDeviceProfiles.ts、brushSurface.tsの既定入力、指描画への切替と指ナビ、マウス描画。入力量の実機判定は別途。 |
| `INP-002` | 筆圧・傾き・方位・回転 | 部分実装 | brushSurface.ts、brush-rtの入力取得・有効値判定・筆圧補正。機器ごとのセンサー取得状態の詳しい表示と校正が残る。 |
| `INP-003` | ペンボタン・後端消しゴム | 部分実装 | stylusButtons.ts、ui/inputDeviceProfiles.tsで消去ボタン・後端を使える。機器のボタンを単発・保持・切替それぞれに割り当てる操作が残る。 |
| `INP-004` | 手のひら・誤接触対策 | 部分実装 | brushSurface.tsでペン使用時の誤接触を抑止。意図した指操作との判別と状態表示を端末で確認する必要がある。 |
| `INP-005` | 割込み・接続喪失 | 部分実装 | brushSurface.tsで入力中断を検出し、進行中の一筆を取消・通知。途中の線の救出を選ぶ機能と切断試験は残る。 |
| `INP-006` | カーソル・接地点表示 | 部分実装 | brushSurface.ts、ui/brushSizeControl.tsで描画位置・筆の直径を表示。傾き・先端画像を反映した接触領域を表示できていない。 |
| `INP-007` | 高頻度入力の忠実性 | 部分実装 | brushSurface.tsのまとめて届く入力の取り込み、計測と入力履歴。一般画面からの高頻度入力の診断と物理ペン試験が残る。 |
| `BRU-001` | 基本ブラシと消しゴム | 完成 | brushStarterPresets.ts、brush-rtの基準筆とブラシ一覧。Gペン・丸・鉛筆・マーカー・エアブラシ・硬軟消しを選んで描画できる。 |
| `BRU-002` | サイズ・不透明度・流量 | 完成 | main.ts、ui/brushSizeControl.tsと共通スライダー。サイズ・不透明度・流量の数値変更、筆ごとの範囲、筆幅表示。 |
| `BRU-003` | 筆圧・速度・位置補正 | 部分実装 | brushSurface.ts、brushDynamicsEditor.tsとbrush-rtの共通／筆別補正、筆圧・速度・補正なし。#104の速い曲線・低速時の修正結果は未統合で実機再判定が残る。 |
| `BRU-004` | プリセット検索・履歴・お気に入り | 完成 | brushCatalog.ts、brushPresets.ts、main.tsの「作品から筆を取り出す」。履歴に保存された設定から取り出し、画素からの推測はしない。 |
| `BRU-005` | ブラシ編集・試し描き | 部分実装 | brushAdvancedEditor.ts、brushDynamicsEditor.tsの形・散布・粒子などと試し描き。全媒体と同じ条件で比較できる共通試し描きは残る。 |
| `BRU-006` | 入力からの変調 | 部分実装 | brushDynamicsEditor.ts、brush-rtの動的変調とカーブ。水・顔料や湿度は同じ筆の入力変調に接続されていない。 |
| `BRU-007` | テクスチャ・紙質ブラシ | 完成 | assets/brushMaterial.ts、brushAdvancedEditor.tsとbrush-rtの素材先端・紙・粒子・拡縮回転・保存。 |
| `BRU-008` | 強制入り抜き | 完成 | brushDynamicsEditor.ts、brush-rtの長さに基づく入り抜き、始点・終点別、ON/OFF。短線と長線の見え方は実機未確認。 |
| `BRU-009` | 連続描画・重ね塗り・合成 | 部分実装 | brush-rtの蓄積と筆の重ね描き、消去、流量・不透明度。背面に描く独立モードが欠ける。 |
| `BRU-010` | 定規・選択との併用 | 完成 | brushSurface.tsとstrokeGuide.tsが定規と選択マスクを筆／消しゴムに接続。選択付きストロークの復元はCoreのselectedStrokeTiles.test.tsに検査あり。 |
| `BRU-011` | ブラシ版と結果の再現 | 完成 | brushSurface.tsの線記録に筆の版・素材を含め、保存と再生で使用。異機種の画素比較は未実施。 |
| `BRU-012` | 一時消しゴム・前ツール復帰 | 完成 | stylusButtons.ts、main.tsの消去ボタンと一時消去／復帰。独立の消しゴム設定を維持。接地中の対応機器での操作は未確認。 |
| `LAY-001` | 追加・選択・描画対象固定 | 完成 | main.tsとCoreのaddRasterLayerAbove、brushSurface.tsの一筆の対象固定。Core layerAdd.test.tsで挿入位置を検査。 |
| `LAY-002` | 表示・不透明度・合成 | 完成 | main.ts、ui/layerBlendDialog.tsで目・不透明度・合成の比較と取消。合成はCoreのレイヤー設定に保存。 |
| `LAY-003` | グループ・並替・複数選択 | 完成 | ui/layerReorder.tsとmain.tsのグループ内移動、並替、複数選択、単指用の移動操作。親子関係の検証はCore。 |
| `LAY-007` | 名前・タグ・検索・フィルター | 完成 | main.tsのインライン改名、色と種別と名前による絞込、絞込中の並替制御。 |
| `HIS-001` | Undo・Redo | 完成 | historyNavigation.ts、main.tsのUndo/Redoキューと項目名。通常操作はCoreのリビジョン単位。 |
| `SAV-003` | ネイティブ保存・Save As | 完成 | persistence/portable.ts、main.tsの固定時点保存・別名コピー。選択、フォント、資料の付属データと効果設定を保存。端末の外部ファイル競合は実機未確認。 |
| `SAV-008` | バックアップ・版移行・旧形式 | 部分実装 | persistence/openLegacy.tsとmain.tsの別媒体用ファイル、複数ファイル復元、旧形式移行。全旧形式の外部依存と移行結果の網羅は未確認。 |
| `PIX-001` | 1px・整数・アンチエイリアスOFF | 完成 | pixelStroke.ts、main.tsの1pxペンと消しゴムと画素グリッド。通常の筆補正と独立。 |

## R2-02

| ID | 機能 | 実装状況 | 現在の根拠・残件 |
|---|---|---|---|
| `COL-001` | 色相環・HSV・RGB・HSL | 完成 | color/panel.ts・model.tsの色相環、HSV/RGB/HSL、色コード・不透明度の往復。色空間自体はsRGB。 |
| `COL-002` | 色履歴・前色・背景色 | 完成 | color/model.tsの現在色・前色・背景色・重複を除く履歴と作品の色一覧の保存。 |
| `COL-009` | 色温度・全体色調 | 部分実装 | effects/rasterSettings.ts、rasterPanel.tsの色温度と色かぶり、選択範囲・設定保持。全レイヤーに追随する専用の調整層が残る。 |
| `COL-011` | 知覚的な色選択・色域マスク | 完成 | color/gamutPicker.ts等のOKLCH値、色域表示、パレット別の範囲マスクと保存。 |
| `FIL-001` | 通常塗りつぶし | 完成 | fill/panel.ts・pixels.tsとmain.tsの直接塗り。色差・透過・隣接を使い、結果を一回の履歴に保存。 |
| `UI-001` | 明色Auroraの制作画面 | 完成 | ui/aurora.css、ui/shell.tsの明色制作画面、左ツール・中央絵・右の幅調整、色確認背景。端末の見え方は別途。 |
| `UI-003` | コンテキスト操作・対象帯 | 部分実装 | main.ts、fill/panel.ts、wet/panel.tsに参照元・描画先・選択などの表示。全操作の未確定状態を同じ帯に集約する機能が残る。 |
| `GST-001` | 既定ジェスチャーと代替 | 完成 | ui/gestureShortcuts.ts、canvasView.tsと画面ボタンでピンチ、二指Undo・三指Redo（任意）、代替操作。誤認識の実機判定は未実施。 |
| `GST-003` | 指・ペン・マウス割当 | 部分実装 | ui/inputDeviceProfiles.ts・shortcutSettings.tsで入力確認と役割・キー設定。全デバイスのボタンごとの文脈別割当は不足。 |
| `GST-004` | 一時ツールと戻り先 | 部分実装 | main.ts、stylusButtons.tsに一時採色・消去、panViewで移動。任意のボタンで保持する移動と共通の割当設定が残る。 |
| `DEV-001` | PC操作 | 部分実装 | ui/floatingPanels.ts、shortcutSettings.ts、入力プロファイルでPC操作。密度設定、高DPIモニターやタッチパッドの独立確認が残る。 |
| `DEV-002` | タブレット操作 | 部分実装 | ui/shell.ts、aurora.css、brushSurface.tsでペンと指を分ける。片手到達、画面分割、外部キーの着脱は端末未確認。 |
| `DEV-003` | スマートフォン操作 | 部分実装 | ui/shell.ts・aurora.cssの狭い画面表示と指描画。全ツールで下段に対象・確定を揃える状態と親指操作の確認が残る。 |
| `DEV-005` | 能力差・低負荷・端末間移送 | 部分実装 | ui/inputDeviceProfiles.ts・persistenceの入力検出・ローカル保存とファイル移送。機能別の負荷表示とAPI能力表が残る。 |
| `A11-001` | 文字・UI・コントラスト拡大 | 部分実装 | ui/accessibility.ts・cssで文字拡大と高コントラスト。全ダイアログの最大倍率と確定／取消が見えることは未確認。 |
| `A11-002` | 単指・非ドラッグ代替 | 完成 | main.tsとui/floatingPanels.ts、layerReorder.tsの表示ボタン、数値変形、移動先選択。ドラッグ操作に代替入口あり。 |
| `A11-003` | キーボード・支援技術 | 部分実装 | ui/commandPalette.ts、appDialogs.tsほかフォーカス・読み上げ・ショートカット。全パネルの代替操作と支援技術の確認が残る。 |
| `A11-004` | 色説明・グレー・補正 | 部分実装 | ui/accessibility.tsのグレー確認、color/panel.tsの値表示。色覚ごとの補正表示は未実装。 |
| `A11-005` | 動き・音・振動 | 部分実装 | ui/accessibility.ts・cssで動きを低減。音・振動設定を個別に制御するUIが残る。 |
| `A11-006` | 日本語・翻訳・単位 | 部分実装 | uiの日本語表示、textPanel.tsのIME処理、documentSetup.tsの単位。言語切替や翻訳は未実装。 |

## R2-03

| ID | 機能 | 実装状況 | 現在の根拠・残件 |
|---|---|---|---|
| `CAN-005` | トリミング・キャンバス拡張 | 完成 | main.ts、canvasGeometry.ts、Core geometryの枠・比率・基準点、外側保持と完全切除の明示、復元。履歴をまたぐ制約はCAN-010参照。 |
| `CAN-006` | 画像サイズ変更 | 完成 | main.ts、canvasGeometry.tsの比率固定、補間、原寸比較とDPI単独変更。文字・効果の画像リサイズ後については実機未確認。 |
| `CAN-010` | キャンバス外の内容保持 | 部分実装 | main.tsとCoreの切り抜き外側の復元。切り抜き後の描画を残せるが、最後のサイズ操作が切り抜きの場合に限る。 |
| `SEL-001` | 矩形・楕円・投げ縄・多角形 | 完成 | selection/panel.ts、mask.tsの矩形・楕円・投げ縄・多角形と置換・加減算・共通範囲。基本マスク検査あり。 |
| `SEL-007` | 境界移動と内容移動 | 完成 | selection/panel.ts、transform/panel.tsとmain.tsの「境界だけ」と「選択中の画像」の別対象。境界には選択マスクの濃度を使う。 |
| `TRN-001` | 移動・拡縮・回転・反転 | 完成 | transform/panel.ts・geometry.tsの移動・拡縮・回転・反転、支点と数値・ハンドル。保存と取り消しに接続。 |
| `CLP-003` | 文書間の編集データ移送 | 部分実装 | selection/clipboard.tsの文書間レイヤー・文字・パス・マスク。外部フォント等の依存素材を同梱する移送に未対応。 |
| `PIX-002` | 画素を守る変形と出力 | 完成 | transform/panel.tsの最近傍と整数位置・倍率・回転の警告、basicExport.tsの整数倍出力。結果適用を強制しない。 |

## R2-04

| ID | 機能 | 実装状況 | 現在の根拠・残件 |
|---|---|---|---|
| `VEC-001` | 自由描線・パス・図形 | 完成 | artwork/vectorPanel.ts、shapeGradient.ts、Core editableArtwork.tsの自由筆・ベジェ・形状、開閉と線・塗りの編集。 |
| `VEC-002` | オブジェクト・点・ハンドル編集 | 完成 | artwork/vectorPanel.ts・pathOperations.tsの対象と点の選択、曲線、追加・削除、分割・接続。 |
| `VEC-003` | 線幅・筆風・ベクター消去 | 部分実装 | artwork/vectorPanel.tsの既存の点の幅・筆圧、全線・部分・交点消去。任意位置への幅点の追加と消去範囲の確定前表示が残る。 |
| `VEC-005` | 文字・縦横書き・IME | 完成 | artwork/textPanel.ts・textStyles.ts・Coreの文字レイヤー、縦横、IME、枠と配置、行字間・フォント。複雑な字体の実機確認は別途。 |
| `GUI-001` | 直線・平行・円・楕円定規 | 完成 | artwork/ruler.ts、guidedPath.ts、Coreガイド保存の直線・平行・円・楕円、複数と位置ロック。 |
| `GUI-004` | 図形・ベジェ・折線 | 完成 | artwork/shapeGradient.tsの直線・矩形・角丸・楕円・多角形・ベジェ、線と塗り、角度と位置決め。 |
| `GRA-001` | 線形・放射・反射・角度 | 完成 | artwork/shapeGradient.tsとmain.tsの線形・放射・反射・角度、原点と終点のハンドル、マスク・レイヤー保存。 |
| `REF-006` | 資料保存・不足・権利メモ | 完成 | assets/referenceBoard.ts・referenceBoardStore.tsの出典・利用メモ・不足時の再指定、作品保存。参考画像は通常画像出力から独立。 |
| `SAV-001` | 作品一覧・検索・整理 | 完成 | ui/homeShell.ts・persistence/workLibrary.tsのサムネイル、作品名・タグ・フォルダー・順序、エラー表示。 |
| `SAV-002` | 複製・削除・ゴミ箱 | 完成 | ui/homeShell.ts・persistence/workLibrary.tsの複製、ゴミ箱、復元、対象を確認して完全削除。 |

## R2-05

| ID | 機能 | 実装状況 | 現在の根拠・残件 |
|---|---|---|---|
| `WET-001` | ぼかし・引きずり・混色 | 部分実装 | wet/panel.ts・paint.ts・edit.tsの既存色を引く、ぼかす、顔料を足す各筆。離筆で画素を確定、画素での途中プレビューは未実装。 |
| `WET-002` | 水彩・顔料・にじみ | 部分実装 | wet/paint.tsの顔料・エッジ・粒状感・にじみ。一筆で見た目を保存。湿り気の状態保存、乾燥・加水、既存画素への再編集は未実装。 |
| `WET-005` | 紙・吸収・質感編集 | 部分実装 | wet/panel.ts・paint.tsで新しい筆の紙目、吸収、かすれを変更。既存の絵に紙を当て直す比較機能は未実装。 |
| `WET-006` | 混色・試し描きパッド | 完成 | wet/pad.tsの作品から独立した試筆・混色・採色・Undo、寸法と紙背景、端末への自動保存と復元。 |
| `WET-007` | 厚塗り・油彩・乾式媒体 | 部分実装 | wet/paint.tsの厚塗り風の明暗、パステル風のかすれ・混色。立体的な顔料の厚さや光の向きは保持しない。 |
| `FX-003` | ぼかし | 完成 | effects/rasterPanel.ts・rasterFilters.tsの5種類のぼかし、焦点帯／深度画像、選択・前後比較・強さ・設定保存。 |
| `FX-004` | 鮮鋭化・ノイズ・掃除 | 完成 | effects/rasterFilters.tsの鮮鋭化、アンシャープ、High Pass、ノイズ、メディアンと孤立点処理。選択・設定を保存。 |
| `FX-007` | 修復・パッチ・クローン | 完成 | wet/panel.ts・paint.ts・edit.tsのクローン・修復・パッチ、採取点と整列、参照・出力層、自由形の選択を透過込みで移す。 |
| `FX-116` | ガウスぼかし | 完成 | effects/rasterFilters.tsのガウス重みと透明度維持。共通の比較・範囲・強さ・保存済み設定の再編集に接続。 |
| `FX-117` | ボックスぼかし | 完成 | effects/rasterFilters.tsの縦横半径・連動・箱型平滑化。透明度と選択範囲を保持できる。 |
| `FX-118` | 移動ぼかし | 完成 | effects/rasterFilters.tsの方向・距離・片方向と元透明度の指定。 |
| `FX-119` | 放射ぼかし | 完成 | effects/rasterFilters.tsの中心・量・回転／ズーム・中心保護。 |
| `FX-120` | レンズ・深度ぼかし | 完成 | effects/rasterFilters.ts・imageEffectResources.tsの焦点帯／深度画像、焦点位置と幅、絞り形状。参照画像を設定に保持。 |
| `FX-121` | シャープ | 完成 | effects/rasterFilters.tsの強度・細かさ・輪郭保護。 |
| `FX-122` | アンシャープマスク | 完成 | effects/rasterFilters.tsのアンシャープの半径・しきい・強さ・輝度のみ。 |
| `FX-123` | High Pass | 完成 | effects/rasterFilters.tsの高周波抽出・中間値・元絵への重ね。 |
| `FX-124` | ノイズ | 完成 | effects/rasterFilters.tsの単色／色付きの量・粒度・模様番号。 |
| `FX-125` | Median・ごみ取り | 完成 | effects/rasterFilters.tsのメディアン、孤立点限定、半径と色差・選択範囲。実画で細線・まつ毛が残るかは別途。 |

## R2-06

| ID | 機能 | 実装状況 | 現在の根拠・残件 |
|---|---|---|---|
| `COL-006` | ICC保持・色変換 | 部分実装 | export/icc.tsと交換ファイルの読込で、RGB PSD/PSB・TIFFのICCからsRGBへ変換、または画素値のまま割当。原ICCは作品にも保存。PNG/JPEG等の原プロファイル保持と全色空間の割当が残る。 |
| `COL-007` | 広色域・高精度・HDR | 外部条件などで実装不可 | Canvas、合成、Core、保存がsRGB・8ビット前提。OpenEXRを線形浮動小数点ファイルとして交換できるが、P3や16ビット・HDRの値を保持して編集するには処理系全体の拡張が必要。 |
| `COL-008` | Soft Proof・色域警告 | 完成 | export/icc.ts・exchangePanel.tsで出力先ICCによる色の比較、補正方法、黒点補正、範囲外を強調する表示。元画像・採色・書出しは変化しない。 |
| `FX-001` | 色調整レイヤー | 部分実装 | ui/layerBlendDialog.tsの色調とグラデーションマップ、effects/rasterPanel.tsの再編集可能なレイヤーフィルター。全調整項目のライブ調整層は残る。 |
| `FX-002` | 高度色調整 | 完成 | effects/rasterSettings.ts、rasterFilters.tsの高度色調整と.cube、artwork/gradientMap.tsのグラデーションマップ。対象・範囲と保存に接続。 |
| `FX-005` | 変位・オフセット・モザイク | 完成 | effects/rasterFilters.ts・imageEffectResources.tsの変位画像、モザイク、端の循環／透明／複製。再編集用の参照画像を保持。 |
| `FX-006` | 網点・線画抽出・縁・発光 | 完成 | effects/rasterPanel.ts・rasterFilters.tsの網点、輪郭、線色、縁、光、影。設定を比較して適用、保存。 |
| `FX-008` | フィルター順序・マスク・強度 | 部分実装 | effects/rasterPanel.ts・rasterFilters.tsのオン／オフ、順序、段階ごとの強さ・前後比較。個々のマスク、合成、層の下でドラッグする操作が残る。 |
| `FX-009` | 明示的な焼込み | 部分実装 | effects/rasterPanel.ts・main.tsの確認後の画素固定と原本保持の非表示コピー。一部の親子合成を統合する外観維持と精度選択が残る。 |
| `IO-002` | PNG・JPEG・WebP | 部分実装 | export/basicExport.tsと書出し画面のPNG/JPEG/WebP、範囲、透明、白背景、品質、PNGのDPI。WebPの可逆指定、ICC、原寸圧縮比較と名前付きプリセットが不足。 |
| `IO-003` | PSD・PSB互換 | 部分実装 | export/psdExchange.ts・exchangeDocument.tsのPSD/PSB往復、警告、合成画像とレイヤー。マスク、文字、グループの外観・再編集、色管理、外部アプリ互換試験が残る。 |
| `IO-004` | ORA・TIFF | 部分実装 | export/oraExchange.ts・tiff.tsのORA/TIFF入出力、透明・解像度。TIFFはRGBの非圧縮／PackBits読み込み、非圧縮8ビット書出し。高度な圧縮、レイヤーマスクが残る。 |
| `IO-005` | SVG | 部分実装 | export/exchange.tsの通常パス出力と、文字・可変幅・特殊合成の画像出力または統合、警告。SVG編集用の文字保持・詳細な外観差分が残る。 |
| `IO-006` | EXR・AVIF・HEIF | 部分実装 | export/exr.tsのOpenEXR（非圧縮／ZIPS／ZIP入力、非圧縮FLOAT出力）、AVIF入出力、対応ブラウザーでのHEIF入力。EXR出力は元のSDR範囲。HDRを保つ編集・HEIF出力は未実装。 |
| `IO-007` | 出力色・メタデータ | 部分実装 | export/basicExport.tsと書出し画面のPNGのICC・DPI・作者・権利情報。ICCによる印刷色確認は別操作。他の出力形式での任意ICCと情報の選択、プリセットが残る。 |
| `IO-008` | レイヤー・選択範囲・一括出力 | 部分実装 | export/basicExport.ts、batchExport.tsで固定時点から選択層・選択範囲・表示中の絵・作品一括。対象層を複数別ファイルへ出す指定と設定別の一覧が不足。 |
| `IO-009` | 印刷向け確認 | 完成 | export/exchangePanel.tsでDPIと仕上がり寸法、塗り足し線、紙の色、透明部分、出力ICCと色域を確認。画面での確認と画像の書出しを分離。 |
| `FX-101` | 明るさ・コントラスト | 完成 | effects/rasterFilters.tsの明るさ／コントラスト、明るさのみ。共通のマスク・強さ・比較・履歴と設定保持に接続。 |
| `FX-102` | レベル | 完成 | effects/rasterFilters.tsの入出力黒白点・ガンマ・RGB成分別。 |
| `FX-103` | トーンカーブ | 部分実装 | effects/rasterFilters.tsの暗・中・明の3点の数値カーブ。曲線を見ながら任意の点を追加・移動する画面は未実装。 |
| `FX-104` | 露出 | 完成 | effects/rasterFilters.tsの露出、黒の位置、ガンマ。 |
| `FX-105` | 色相・彩度・明度 | 完成 | effects/rasterFilters.tsの色相・彩度・明度・単一色相への統一。 |
| `FX-106` | 自然な彩度 | 完成 | effects/rasterFilters.tsの低彩度色を重点調整する自然な彩度と全体の彩度。 |
| `FX-107` | カラーバランス | 完成 | effects/rasterFilters.tsの暗中明別の色バランスと明るさ保持。 |
| `FX-108` | 色温度・Tint | 完成 | effects/rasterFilters.tsの色温度とマゼンタ・緑を調整。 |
| `FX-109` | 白黒 | 完成 | effects/rasterFilters.tsの白黒化、6色の明度と色付け。 |
| `FX-110` | チャンネルミキサー | 完成 | effects/rasterFilters.tsのRGB成分の混合と成分の加算、白黒。 |
| `FX-111` | 選択色補正 | 完成 | effects/rasterFilters.tsの対象色とC/M/Y/K、絶対値補正。 |
| `FX-112` | 反転 | 完成 | effects/rasterFilters.tsの色・明るさ・透明度の反転。 |
| `FX-113` | 階調化 | 完成 | effects/rasterFilters.tsの階調数、明るさのみ、格子ディザ。 |
| `FX-114` | 二値化 | 完成 | effects/rasterFilters.tsの明るさ・チャンネルのしきいと両側の色。 |
| `FX-115` | LUT | 完成 | effects/imageEffectResources.tsの1D/3D .cube、補間、選択範囲と透明度、参照表の保存と再編集。対応は1D 4096、3D 33段階まで。 |
| `FX-126` | モザイク | 完成 | effects/rasterFilters.tsのモザイク幅・高さ・オフセット・平均色／中心色。 |
| `FX-127` | オフセット | 完成 | effects/rasterFilters.tsのオフセットと循環・透明・端保持、半分移動。 |
| `FX-128` | 変位 | 完成 | effects/imageEffectResources.tsの赤・緑チャンネルに従う変位、範囲・強さ・端の処理、参照画素を保存。参照は最大256pxに縮小。 |
| `FX-129` | 網点・スクリーントーン | 完成 | effects/rasterFilters.tsの網点間隔・角度・色・透過、選択範囲で比較。 |
| `FX-130` | 輪郭検出・線画抽出 | 完成 | effects/rasterFilters.tsの輪郭検出としきい・強度、元絵との比較。 |
| `FX-131` | 線画色変更 | 完成 | effects/rasterFilters.tsの線の色変更、透明度保持と明度指定。 |
| `FX-132` | 内外の縁取 | 完成 | effects/rasterFilters.tsの幅・色・内外・濃さ。 |
| `FX-133` | 内外の影 | 完成 | effects/rasterFilters.tsの影の方向・距離・ぼけ・内外・透明度。 |
| `FX-134` | 内外光彩 | 完成 | effects/rasterFilters.tsの光彩の色・範囲・内外・透明度。 |
| `FX-135` | 色・グラデ・模様Overlay | 完成 | effects/rasterFilters.tsの単色・傾斜したグラデーション・縞、元の透明度の維持。 |
| `FX-136` | ベベル・エンボス | 完成 | effects/rasterFilters.tsのエンボス方位・距離・深さ・元色。影響範囲と比較を保存できる。 |

## R2-07

| ID | 機能 | 実装状況 | 現在の根拠・残件 |
|---|---|---|---|
| `AUT-001` | 記録・編集・再生 | 部分実装 | ui/simpleMacros.tsの記録開始・停止、順序・無効化・再生。独自パラメータを含む描画／変形の記録は未対応。登録可能な操作だけ候補に出す。 |
| `AUT-002` | 実行時パラメータ・対象指定 | 部分実装 | ui/simpleMacros.tsとmain.tsでレイヤーを選び、名前・不透明度を実行時入力。同じ仕組みで対象がない場合に停止。描画・変形などの実行時パラメータは残る。 |
| `AUT-003` | 実行比較・失敗・取消 | 部分実装 | ui/simpleMacros.tsとmain.tsで事前に手順を確認し、対応するレイヤー操作は失敗時に未反映。一回で取り消せる。表示や履歴を混ぜた手順の全体取消は残る。 |
| `AUT-004` | バッチ出力 | 部分実装 | export/batchExport.tsの作品一括から複数形式のコピーと処理結果。既存ファイルへの個別上書き選択や設定セットの保存は未実装。 |
| `AUT-005` | 高速入口・共有 | 部分実装 | ui/simpleMacros.ts・commandPalette.ts・assets/library.tsの機能検索、Quick、JSON、素材登録。マクロ専用キー割当と不足依存の事前一覧が残る。 |
| `REC-001` | Timelapse記録と再生 | 完成 | recording/timeline.tsの記録開始・停止、確定時点から作品だけを再生。使用できない時点はエラーを表示。 |
| `REC-002` | 動画の範囲・速度・解像度 | 部分実装 | recording/timeline.tsの区間・速度・解像度・最後の静止・WebM。休止時間の自動圧縮と透かしが残る。 |
| `REC-003` | 記録の除外・機密資料 | 部分実装 | recording/timeline.tsの画面UI・資料を含めない再生、履歴の表示対象と記録停止。既存の記録からの個別除外・削除が残る。 |
| `REC-004` | 実作業時間 | 完成 | recording/workTime.tsの今回・今日・累計・平均、入力間隔による集計、手動開始停止と訂正。 |
| `AI-001` | 選択・領域の補助 | 完成 | assist/exampleSelection.tsの残す例・外す例から学ぶ色分布モデル、候補表示、追加・減算、選択の履歴・保存。手動の似た色選択も併存。絵の意味の認識は行わない。 |
| `AI-002` | 色・陰影の候補 | 部分実装 | assist/referencePalette.tsの資料画像から学習した色の抽出と、現在の絵やパレットを使った2種類の比較と別レイヤーへの採用。任意の候補数や物体形状・光源の推定は未実装。 |
| `AI-003` | 整理・修復の候補 | 部分実装 | assist/analyze.ts・panel.tsの透明部分に囲まれた点と初期レイヤー名の候補、選択して一括採用。背景のある画像のごみ・層の整理提案は未実装。 |
| `AI-004` | 送信・費用・生成の境界 | 外部条件などで実装不可 | 正式計画で外部モデル/APIが未選定。現在の補助は端末内で動く。送信先・費用・保存条件・同意を実地に確認できる連携は未達。 |
