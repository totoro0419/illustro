# 全247機能の独立監査台帳

監査日：2026-10-31 UTC。対象：`fc14afdde2d25ee61e2f05e4d89a387ab5ca3c04`（PR #7）。原仕様のID・名称・分野を保持し、現行スコープはPR #5を優先した。

**247/247件、30/30分野。欠落0・重複0・名称/採否不一致0。通常234、限定2、保留10、対象外1。** PCのID検索→詳細表示は247件を実操作し、236件の試行入口と11件の説明限定を照合した。Phoneは30分野代表30件であり、残る217件をPhone実操作済みとは扱わない。

この一覧の「設計記載あり」は合格ではない。個別の目的・操作・保持・異常系を原仕様/現行台帳と照合し、各行に独自の反例/追加試験を付けた。反例の案は実際に不具合が起きたとの主張ではない。確定指摘にはAUD番号を付け、観測と設計欠落を[問題一覧](findings.md)で分離する。

## 12監査軸と証拠の読み方

各IDの12軸の全文、固有パラメータ、正本/派生物、関連ID、現行Undo/保存条件は[機械可読台帳](evidence/2026-10-31/feature-audit.json)に収録。原仕様の能力を単純な文字数/項目存在だけで合格にしていない。

|軸|確認したもの|判定限界|
|---|---|---|
|C01 目的|原仕様purpose/capability/制作場面|目的達成率は未測定|
|C02 操作|直接操作・固有制御・現行範囲|generic試行欄は固有UIの実証ではない|
|C03 導線|主/補助/PC検索DOM・Phone代表|全入口/全端末の実行等価性は未証明|
|C04 発見|検索索引と主要操作語反例|初見参加者の探索試験なし|
|C05 手数|宣言手順と直接入口反例|視線・ペン移動は実測なし|
|C06 競合|関連機能・行固有の反例|全組合せ試験ではない|
|C07 状態|分野状態契約/所有先|失敗出口等の不足を別指摘|
|C08 履歴/保存|現行保持条件/正本/派生|模擬操作ID固定はNative耐久証明ではない|
|C09 性能|研究対応・T01–T08|製品構成の数値達成なし|
|C10 異常/境界|固有失敗条件と追加試験|実行した反例のみ確認済み|
|C11 比較|原仕様の出典ID、限定公式操作比較|247件の同条件競合実測は未実施|
|C12 実現/検証|残る判断と試験ゲート|未実装自体を欠陥としない|

[全件DOM記録](evidence/2026-10-31/browser/routes-desktop.json) · [Phone代表記録](evidence/2026-10-31/browser/routes-phone.json) · [独立照合結果](evidence/2026-10-31/static-results.json)。各行の仕様リンクは監査対象ブランチ内の原典。状態/Undo/性能を含む12軸は上記JSONの同じIDで追跡できる。

## CAN — キャンバス・文書（10件）

|正式ID・名称 / 仕様|現行範囲・操作入口|判定・指摘|個別の反例・追加検証（未実施を含む）|
|---|---|---|---|
|[CAN-001 新規作品](../product-planning/features/CAN.md#can-001)|対象 / ホーム「新規」。検索DOM到達|要是正/要判断。[AUD-005](findings.md#aud-005)|文書がないHomeから新規作成するIntentを型で表せるか。DPI変更とpx変更を別試験にする。|
|[CAN-002 表示移動・拡縮・回転](../product-planning/features/CAN.md#can-002)|対象 / Workspace「表示」→キャンバス・文書→表示移動・拡縮・回転。検索DOM到達|要是正/要判断。[AUD-010](findings.md#aud-010) / [AUD-011](findings.md#aud-011)|表示姿勢の基準時刻と指の重心を固定した拡縮で、接地点が飛ばないか。|
|[CAN-003 Fit・100%・表示反転](../product-planning/features/CAN.md#can-003)|対象 / 表示帯／右下固定「表示反転」。検索DOM到達|要是正/要判断。[AUD-008](findings.md#aud-008)|左右反転検索でWorkspace左右反転だけが出る。表示反転と作品反転の候補を分ける。|
|[CAN-004 高倍率・ピクセル確認](../product-planning/features/CAN.md#can-004)|対象 / Workspace「表示」→キャンバス・文書→高倍率・ピクセル確認。検索DOM到達|設計記載あり・品質未判定。個別欠陥未確認|原画がCanvas外へ出たCropをUndoし、外側内容と保存結果を照合する。|
|[CAN-005 トリミング・キャンバス拡張](../product-planning/features/CAN.md#can-005)|対象 / Workspace「作品」→キャンバス・文書→トリミング・キャンバス拡張。検索DOM到達|設計記載あり・品質未判定。個別欠陥未確認|DPIだけ変更した後、整数pxの寸法が不意に変わらないことを検査する。|
|[CAN-006 画像サイズ変更](../product-planning/features/CAN.md#can-006)|対象 / Workspace「作品」→キャンバス・文書→画像サイズ変更。検索DOM到達|設計記載あり・品質未判定。個別欠陥未確認|Crop後に非破壊変形を再編集して外側を戻す反例を用意する。|
|[CAN-007 複数作品・文書切替](../product-planning/features/CAN.md#can-007)|対象 / Workspace「作品」→キャンバス・文書→複数作品・文書切替。検索DOM到達|設計記載あり・品質未判定。個別欠陥未確認|Aでpending→Bへ切替→A完了の帰属と、Aの保留Session復帰を検査する。|
|[CAN-008 シームレス反復描画](../product-planning/features/CAN.md#can-008)|対象 / Workspace「表示」→キャンバス・文書→シームレス反復描画。検索DOM到達|設計記載あり・品質未判定。個別欠陥未確認|繰返し表示の境界を跨ぐ一筆を一Undoへまとめ、複写を二重合成しない。|
|[CAN-009 文書属性・テンプレート](../product-planning/features/CAN.md#can-009)|対象 / Workspace「作品」→キャンバス・文書→文書属性・テンプレート。検索DOM到達|設計記載あり・品質未判定。個別欠陥未確認|テンプレート個人保存と作品メタデータ変更の履歴所有を分ける。|
|[CAN-010 キャンバス外の内容保持](../product-planning/features/CAN.md#can-010)|対象 / Workspace「作品」→キャンバス・文書→キャンバス外の内容保持。検索DOM到達|設計記載あり・品質未判定。個別欠陥未確認|未読込タイルを空白と誤認して上書きしないことを境界条件にする。|

## INP — 入力・ペン（8件）

|正式ID・名称 / 仕様|現行範囲・操作入口|判定・指摘|個別の反例・追加検証（未実施を含む）|
|---|---|---|---|
|[INP-001 入力役割の切替](../product-planning/features/INP.md#inp-001)|対象 / Workspace「Workspace」→入力・ペン→入力役割の切替。検索DOM到達|要是正/要判断。[AUD-014](findings.md#aud-014)|筆圧0、coalesced末尾と親イベント重複を同一入力列で照合する。|
|[INP-002 筆圧・傾き・方位・回転](../product-planning/features/INP.md#inp-002)|対象 / Workspace「Workspace」→入力・ペン→筆圧・傾き・方位・回転。検索DOM到達|設計記載あり・品質未判定。個別欠陥未確認|傾き非対応から対応ペンへ持替えても筆の意味が途中で変わらないか。|
|[INP-003 ペンボタン・後端消しゴム](../product-planning/features/INP.md#inp-003)|対象 / Workspace「Workspace」→入力・ペン→ペンボタン・後端消しゴム。検索DOM到達|設計記載あり・品質未判定。個別欠陥未確認|ペン後端を離した時の前ツール復帰先と接地中設定固定を検査する。|
|[INP-004 手のひら・誤接触対策](../product-planning/features/INP.md#inp-004)|対象 / Workspace「Workspace」→入力・ペン→手のひら・誤接触対策。検索DOM到達|要是正/要判断。[AUD-011](findings.md#aud-011)|接地中ナビの継続/一時休止は未決。片方を黙って既定として承認しない。|
|[INP-005 割込み・接続喪失](../product-planning/features/INP.md#inp-005)|対象 / Workspace「Workspace」→入力・ペン→割込み・接続喪失。検索DOM到達|要是正/要判断。[AUD-014](findings.md#aud-014)|pointercancelで全取消する候補と、保留原入力救出を画面上で区別できるか。|
|[INP-006 カーソル・接地点表示](../product-planning/features/INP.md#inp-006)|対象 / Workspace「Workspace」→入力・ペン→カーソル・接地点表示。検索DOM到達|設計記載あり・品質未判定。個別欠陥未確認|OS配送時刻とJS処理時刻を混同せず、複数入力装置を同時に扱えるか。|
|[INP-007 高頻度入力の忠実性](../product-planning/features/INP.md#inp-007)|対象 / Workspace「Workspace」→入力・ペン→高頻度入力の忠実性。検索DOM到達|設計記載あり・品質未判定。個別欠陥未確認|100%表示とDPR変更を跨ぐ座標/筆径の再現を比較する。|
|[INP-008 キーボードとIMEの調停](../product-planning/features/INP.md#inp-008)|対象 / Workspace「Workspace」→入力・ペン→キーボードとIMEの調停。検索DOM到達|設計記載あり・品質未判定。個別欠陥未確認|設定を読み込んだ際の機器不存在を成功割当に見せない。|

## BRU — ブラシ・消しゴム（12件）

|正式ID・名称 / 仕様|現行範囲・操作入口|判定・指摘|個別の反例・追加検証（未実施を含む）|
|---|---|---|---|
|[BRU-001 基本ブラシと消しゴム](../product-planning/features/BRU.md#bru-001)|対象 / 左ツール「ブラシ」／「消しゴム」。検索DOM到達|要是正/要判断。[AUD-006](findings.md#aud-006)|消しゴムの後段ペイントは透明RGBA追加では成立しない。演算契約を先に閉じる。|
|[BRU-002 サイズ・不透明度・流量](../product-planning/features/BRU.md#bru-002)|対象 / 対象帯の太さ／不透明度。検索DOM到達|設計記載あり・品質未判定。個別欠陥未確認|接地後に太さ/不透明度を変えた時、現在筆と次筆を分離する。|
|[BRU-003 筆圧・速度・位置補正](../product-planning/features/BRU.md#bru-003)|対象 / Workspace「ブラシ」→ブラシ・消しゴム→筆圧・速度・位置補正。検索DOM到達|設計記載あり・品質未判定。個別欠陥未確認|補正遅延と先端追従を分け、急停止/筆圧0への遷移を比較する。|
|[BRU-004 プリセット検索・履歴・お気に入り](../product-planning/features/BRU.md#bru-004)|対象 / Workspace「ブラシ」→ブラシ・消しゴム→プリセット検索・履歴・お気に入り。検索DOM到達|設計記載あり・品質未判定。個別欠陥未確認|検索/履歴/お気に入りから選んだ同じ筆版が同一結果を生むか。|
|[BRU-005 ブラシ編集・試し描き](../product-planning/features/BRU.md#bru-005)|対象 / Workspace「ブラシ」→ブラシ・消しゴム→ブラシ編集・試し描き。検索DOM到達|要是正/要判断。[AUD-016](findings.md#aud-016)|試筆Undoを作品Undoに流さず、設定取消だけが元筆へ戻るか。|
|[BRU-006 入力からの変調](../product-planning/features/BRU.md#bru-006)|対象 / Workspace「ブラシ」→ブラシ・消しゴム→入力からの変調。検索DOM到達|設計記載あり・品質未判定。個別欠陥未確認|速度/傾き変調の単位、非対応センサーのfallbackを契約化する。|
|[BRU-007 テクスチャ・紙質ブラシ](../product-planning/features/BRU.md#bru-007)|対象 / Workspace「ブラシ」→ブラシ・消しゴム→テクスチャ・紙質ブラシ。検索DOM到達|設計記載あり・品質未判定。個別欠陥未確認|紙目をDocument/筆/画面のどの空間に固定するか、ズーム中に確認する。|
|[BRU-008 強制入り抜き](../product-planning/features/BRU.md#bru-008)|対象 / Workspace「ブラシ」→ブラシ・消しゴム→強制入り抜き。検索DOM到達|要是正/要判断。[AUD-010](findings.md#aud-010)|終点未確定の入り抜き近似と離筆後の形変化の許容を測る。|
|[BRU-009 連続描画・重ね塗り・合成](../product-planning/features/BRU.md#bru-009)|対象 / Workspace「ブラシ」→ブラシ・消しゴム→連続描画・重ね塗り・合成。検索DOM到達|要是正/要判断。[AUD-012](findings.md#aud-012) / [AUD-014](findings.md#aud-014)|Aの上へBを描くflowと非蓄積筆で、FIFOでも下地待ちが飢餓にならないか。|
|[BRU-010 定規・選択との併用](../product-planning/features/BRU.md#bru-010)|対象 / Workspace「ブラシ」→ブラシ・消しゴム→定規・選択との併用。検索DOM到達|設計記載あり・品質未判定。個別欠陥未確認|対称/選択/定規が重なる時の被覆と順序を一つの参照画像で検査する。|
|[BRU-011 ブラシ版と結果の再現](../product-planning/features/BRU.md#bru-011)|対象 / Workspace「ブラシ」→ブラシ・消しゴム→ブラシ版と結果の再現。検索DOM到達|設計記載あり・品質未判定。個別欠陥未確認|素材更新/削除後のRedoが旧筆版を使うことを確認する。|
|[BRU-012 一時消しゴム・前ツール復帰](../product-planning/features/BRU.md#bru-012)|対象 / 左ツール「消しゴム」。検索DOM到達|設計記載あり・品質未判定。個別欠陥未確認|固定消しゴムへの切替と一時消しゴムの保持/復帰を同じactionへ混同しない。|

## WET — 混色・画材（7件）

|正式ID・名称 / 仕様|現行範囲・操作入口|判定・指摘|個別の反例・追加検証（未実施を含む）|
|---|---|---|---|
|[WET-001 ぼかし・引きずり・混色](../product-planning/features/WET.md#wet-001)|対象 / 左ツール「混色」。検索DOM到達|要是正/要判断。[AUD-006](findings.md#aud-006)|混色は変形後のどの下地版を読み、旧変形再編集で再混色するのかを決める。|
|[WET-002 水彩・顔料・にじみ](../product-planning/features/WET.md#wet-002)|限定 / Workspace「ブラシ」→混色・画材→水彩・顔料・にじみ。検索DOM到達|設計記載あり・品質未判定。個別欠陥未確認|限定は時間拡散なしの簡易表現。元の水分場要求を現行必須へ戻さない。|
|[WET-003 濡れの可視化・加水・乾燥](../product-planning/features/WET.md#wet-003)|保留 / 全機能→混色・画材→濡れの可視化・加水・乾燥の範囲説明。検索DOM到達（説明のみ）|範囲境界確認・処理評価対象外。個別欠陥未確認|保留説明までの到達のみ。局所加水を実行可能と表示しない。|
|[WET-004 拡散の停止・再開](../product-planning/features/WET.md#wet-004)|保留 / 全機能→混色・画材→拡散の停止・再開の範囲説明。検索DOM到達（説明のみ）|範囲境界確認・処理評価対象外。個別欠陥未確認|保留説明までの到達のみ。停止/再開solverを通常筆の依存にしない。|
|[WET-005 紙・吸収・質感編集](../product-planning/features/WET.md#wet-005)|限定 / Workspace「ブラシ」→混色・画材→紙・吸収・質感編集。検索DOM到達|設計記載あり・品質未判定。個別欠陥未確認|次筆の紙選択と既存画素への再適用を別action/Undoにする。|
|[WET-006 混色・試し描きパッド](../product-planning/features/WET.md#wet-006)|対象 / Workspace「資料」→混色・画材→混色・試し描きパッド。検索DOM到達|要是正/要判断。[AUD-016](findings.md#aud-016)|パッド専用Undoが候補内/作品Undoと競合する時の作用先を明示する。|
|[WET-007 厚塗り・油彩・乾式媒体](../product-planning/features/WET.md#wet-007)|対象 / Workspace「ブラシ」→混色・画材→厚塗り・油彩・乾式媒体。検索DOM到達|設計記載あり・品質未判定。個別欠陥未確認|厚み感の静的効果と時間進行する油彩シミュレーションを区別する。|

## COL — 色・色管理（11件）

|正式ID・名称 / 仕様|現行範囲・操作入口|判定・指摘|個別の反例・追加検証（未実施を含む）|
|---|---|---|---|
|[COL-001 色相環・HSV・RGB・HSL](../product-planning/features/COL.md#col-001)|対象 / 対象帯の現在色。検索DOM到達|要是正/要判断。[AUD-003](findings.md#aud-003) / [AUD-004](findings.md#aud-004) / [AUD-018](findings.md#aud-018)|色設定を開いただけで作品Undoが無効になるプロトタイプの所有問題を検査する。|
|[COL-002 色履歴・前色・背景色](../product-planning/features/COL.md#col-002)|対象 / Workspace「色」→色・色管理→色履歴・前色・背景色。検索DOM到達|設計記載あり・品質未判定。個別欠陥未確認|色履歴は筆の開始色と一致し、取消採色を履歴成功に入れないか。|
|[COL-003 作品・資料スポイト](../product-planning/features/COL.md#col-003)|対象 / 左ツール「スポイト」。検索DOM到達|設計記載あり・品質未判定。個別欠陥未確認|表示合成/現在層/元色/Proofの出典と一時ツール復帰を別々に試す。|
|[COL-004 パレット編集・交換](../product-planning/features/COL.md#col-004)|対象 / Workspace「色」→色・色管理→パレット編集・交換。検索DOM到達|設計記載あり・品質未判定。個別欠陥未確認|調和候補の採用と作品への色調整を混同しないか。|
|[COL-005 調和・明度・色覚支援](../product-planning/features/COL.md#col-005)|対象 / Workspace「色」→色・色管理→調和・明度・色覚支援。検索DOM到達|設計記載あり・品質未判定。個別欠陥未確認|Palette編集の個人履歴と作品配色のTransactionを分離する。|
|[COL-006 ICC保持・色変換](../product-planning/features/COL.md#col-006)|対象 / Workspace「色」→色・色管理→ICC保持・色変換。検索DOM到達|設計記載あり・品質未判定。個別欠陥未確認|ICC assignは値保持、convertは外観保持の別オラクルを作る。|
|[COL-007 広色域・高精度・HDR](../product-planning/features/COL.md#col-007)|対象 / Workspace「色」→色・色管理→広色域・高精度・HDR。検索DOM到達|設計記載あり・品質未判定。個別欠陥未確認|16Uと16Fを無条件置換しない。量子化と負値/範囲外規則を閉じる。|
|[COL-008 Soft Proof・色域警告](../product-planning/features/COL.md#col-008)|対象 / Workspace「色」→色・色管理→Soft Proof・色域警告。検索DOM到達|設計記載あり・品質未判定。個別欠陥未確認|Proof中採色と通常出力が表示変換を焼き込まないことを検査する。|
|[COL-009 色温度・全体色調](../product-planning/features/COL.md#col-009)|対象 / Workspace「効果」→色・色管理→色温度・全体色調。検索DOM到達|設計記載あり・品質未判定。個別欠陥未確認|背景色変更と透明チェック表示を別所有にする。|
|[COL-010 CMYK編集と出力](../product-planning/features/COL.md#col-010)|保留 / 全機能→色・色管理→CMYK編集と出力の範囲説明。検索DOM到達（説明のみ）|範囲境界確認・処理評価対象外。個別欠陥未確認|Native CMYK保留のまま、Proof/出力変換への関連入口を維持する。|
|[COL-011 知覚的な色選択・色域マスク](../product-planning/features/COL.md#col-011)|対象 / Workspace「色」→色・色管理→知覚的な色選択・色域マスク。検索DOM到達|設計記載あり・品質未判定。個別欠陥未確認|グレー補助や色名表示が作品値を書換えないか。|

## FIL — 塗りつぶし（10件）

|正式ID・名称 / 仕様|現行範囲・操作入口|判定・指摘|個別の反例・追加検証（未実施を含む）|
|---|---|---|---|
|[FIL-001 通常塗りつぶし](../product-planning/features/FIL.md#fil-001)|対象 / 左ツール「塗り」。検索DOM到達|要是正/要判断。[AUD-015](findings.md#aud-015)|線画参照→色層出力の二対象を固定し、直後の筆と調整合流を検査する。|
|[FIL-002 隙間補完・塗り残し修正](../product-planning/features/FIL.md#fil-002)|対象 / Workspace「プロパティ」→塗りつぶし→隙間補完・塗り残し修正。検索DOM到達|設計記載あり・品質未判定。個別欠陥未確認|狭い穴と意図した開口を同時に含む絵で、補完が外側を閉じないか。|
|[FIL-003 参照元・塗り先の明示](../product-planning/features/FIL.md#fil-003)|対象 / Workspace「プロパティ」→塗りつぶし→参照元・塗り先の明示。検索DOM到達|設計記載あり・品質未判定。個別欠陥未確認|参照層削除後に別の同名層へ無言で移行しない。|
|[FIL-004 連続・ドラッグ塗り](../product-planning/features/FIL.md#fil-004)|対象 / Workspace「プロパティ」→塗りつぶし→連続・ドラッグ塗り。検索DOM到達|設計記載あり・品質未判定。個別欠陥未確認|高速ドラッグで離れた小領域を跨ぎ、一ジェスチャー一Undoとする。|
|[FIL-005 囲って塗る・消す](../product-planning/features/FIL.md#fil-005)|対象 / Workspace「プロパティ」→塗りつぶし→囲って塗る・消す。検索DOM到達|設計記載あり・品質未判定。個別欠陥未確認|囲い外の開口を含む例で、外側への漏れを事前表示できるか。|
|[FIL-006 なぞって領域指定](../product-planning/features/FIL.md#fil-006)|対象 / Workspace「プロパティ」→塗りつぶし→なぞって領域指定。検索DOM到達|設計記載あり・品質未判定。個別欠陥未確認|一本の線を跨ぐなぞりで候補集合の曖昧さを局所解決できるか。|
|[FIL-007 線画領域基準の塗り・再配色](../product-planning/features/FIL.md#fil-007)|対象 / Workspace「プロパティ」→塗りつぶし→線画領域基準の塗り・再配色。検索DOM到達|設計記載あり・品質未判定。個別欠陥未確認|元線更新で既存の色が別面へ移らないことを検査する。|
|[FIL-008 色指示による面の補助](../product-planning/features/FIL.md#fil-008)|対象 / Workspace「プロパティ」→塗りつぶし→色指示による面の補助。検索DOM到達|設計記載あり・品質未判定。個別欠陥未確認|色指示の記録を原画やTimelapse公開像へ混入させない。|
|[FIL-009 塗り結果のその場修正](../product-planning/features/FIL.md#fil-009)|対象 / Workspace「プロパティ」→塗りつぶし→塗り結果のその場修正。検索DOM到達|設計記載あり・品質未判定。個別欠陥未確認|Fill→別層筆→直後調整で、過去Transaction書換えによる筆消失を防ぐ。|
|[FIL-010 透明塗り・下地・自動彩色レイヤー](../product-planning/features/FIL.md#fil-010)|対象 / Workspace「プロパティ」→塗りつぶし→透明塗り・下地・自動彩色レイヤー。検索DOM到達|設計記載あり・品質未判定。個別欠陥未確認|新規彩色層と塗りの一括Undoで、手動追加層まで消さない。|

## LIN — 線画・領域（8件）

|正式ID・名称 / 仕様|現行範囲・操作入口|判定・指摘|個別の反例・追加検証（未実施を含む）|
|---|---|---|---|
|[LIN-001 ラスター線画から領域用レイヤー生成](../product-planning/features/LIN.md#lin-001)|対象 / Workspace「プロパティ」→線画・領域→ラスター線画から領域用レイヤー生成。検索DOM到達|設計記載あり・品質未判定。個別欠陥未確認|原線/仮境界/作者判断/確定区分の四状態を生成失敗時にも保持する。|
|[LIN-002 境界・接続・閉領域・穴の表示](../product-planning/features/LIN.md#lin-002)|対象 / Workspace「プロパティ」→線画・領域→境界・接続・閉領域・穴の表示。検索DOM到達|設計記載あり・品質未判定。個別欠陥未確認|境界検査表示を保存画素へ焼かず、生成元の版を表示する。|
|[LIN-003 手動の接続・分割・統合](../product-planning/features/LIN.md#lin-003)|対象 / Workspace「プロパティ」→線画・領域→手動の接続・分割・統合。検索DOM到達|設計記載あり・品質未判定。個別欠陥未確認|手動の接続拒否を再生成で無断上書きしないか。|
|[LIN-004 塗り・選択の共通参照](../product-planning/features/LIN.md#lin-004)|対象 / Workspace「プロパティ」→線画・領域→塗り・選択の共通参照。検索DOM到達|設計記載あり・品質未判定。個別欠陥未確認|同一版同一点のFillとSelectionが同じ面を指すか。|
|[LIN-005 元線画変更後の比較更新](../product-planning/features/LIN.md#lin-005)|対象 / Workspace「プロパティ」→線画・領域→元線画変更後の比較更新。検索DOM到達|設計記載あり・品質未判定。個別欠陥未確認|一画素の線変更で遠方の面が結合する例を差分範囲試験にする。|
|[LIN-006 隙間候補・毛先・顎の補助](../product-planning/features/LIN.md#lin-006)|対象 / Workspace「プロパティ」→線画・領域→隙間候補・毛先・顎の補助。検索DOM到達|設計記載あり・品質未判定。個別欠陥未確認|毛先と顎の接線候補が競合した時、スコアだけで正解を断定しない。|
|[LIN-007 未解決・低信頼・無効の扱い](../product-planning/features/LIN.md#lin-007)|対象 / Workspace「プロパティ」→線画・領域→未解決・低信頼・無効の扱い。検索DOM到達|設計記載あり・品質未判定。個別欠陥未確認|無効区分の操作だけを止め、通常筆/ナビは続けられるか。|
|[LIN-008 ベクター線画の領域利用](../product-planning/features/LIN.md#lin-008)|対象 / Workspace「プロパティ」→線画・領域→ベクター線画の領域利用。検索DOM到達|設計記載あり・品質未判定。個別欠陥未確認|ベクター筆風外観と幾何境界の差を明示し、同じ区分へ無理に正規化しない。|

## LAY — レイヤー・合成（12件）

|正式ID・名称 / 仕様|現行範囲・操作入口|判定・指摘|個別の反例・追加検証（未実施を含む）|
|---|---|---|---|
|[LAY-001 追加・選択・描画対象固定](../product-planning/features/LAY.md#lay-001)|対象 / レイヤー欄「＋」／行選択。検索DOM到達|要是正/要判断。[AUD-001](findings.md#aud-001) / [AUD-002](findings.md#aud-002) / [AUD-004](findings.md#aud-004) / [AUD-013](findings.md#aud-013)|追加→Undoしても4層が残る。選択と構造変更を別状態所有にする。|
|[LAY-002 表示・不透明度・合成](../product-planning/features/LAY.md#lay-002)|対象 / Workspace「レイヤー」→レイヤー・合成→表示・不透明度・合成。検索DOM到達|要是正/要判断。[AUD-002](findings.md#aud-002) / [AUD-008](findings.md#aud-008) / [AUD-013](findings.md#aud-013)|目をOFF→別層選択でONに戻る。DOMだけの可視状態を正本にしない。|
|[LAY-003 グループ・並替・複数選択](../product-planning/features/LAY.md#lay-003)|対象 / Workspace「レイヤー」→レイヤー・合成→グループ・並替・複数選択。検索DOM到達|設計記載あり・品質未判定。個別欠陥未確認|クリップ/通過Group内の複数層移動を非ドラッグ代替と比較する。|
|[LAY-004 クリッピング・不透明度ロック](../product-planning/features/LAY.md#lay-004)|対象 / Workspace「レイヤー」→レイヤー・合成→クリッピング・不透明度ロック。検索DOM到達|要是正/要判断。[AUD-008](findings.md#aud-008) / [AUD-010](findings.md#aud-010)|ClipとAlpha Lockは作用先が異なるため一つの曖昧な適用へ潰さない。|
|[LAY-005 ピクセル・ベクターマスク](../product-planning/features/LAY.md#lay-005)|対象 / Workspace「レイヤー」→レイヤー・合成→ピクセル・ベクターマスク。検索DOM到達|要是正/要判断。[AUD-006](findings.md#aud-006) / [AUD-010](findings.md#aud-010)|Maskを選んだ後の筆/変形/保存で内容とのcomponent識別を検査する。|
|[LAY-006 複製・結合・統合コピー](../product-planning/features/LAY.md#lay-006)|対象 / Workspace「レイヤー」→レイヤー・合成→複製・結合・統合コピー。検索DOM到達|設計記載あり・品質未判定。個別欠陥未確認|通過Groupを結合した時の外観差を拒否/統合コピーへ案内する。|
|[LAY-007 名前・タグ・検索・フィルター](../product-planning/features/LAY.md#lay-007)|対象 / Workspace「レイヤー」→レイヤー・合成→名前・タグ・検索・フィルター。検索DOM到達|設計記載あり・品質未判定。個別欠陥未確認|検索中に層が隠れた状態から名前変更をUndoし、原順序を守る。|
|[LAY-008 位置・内容・全体ロック](../product-planning/features/LAY.md#lay-008)|対象 / Workspace「レイヤー」→レイヤー・合成→位置・内容・全体ロック。検索DOM到達|設計記載あり・品質未判定。個別欠陥未確認|ロック対象で描き始める前に不能理由を出し、勝手に別層へ送らない。|
|[LAY-009 Solo・一時表示検査](../product-planning/features/LAY.md#lay-009)|対象 / Workspace「レイヤー」→レイヤー・合成→Solo・一時表示検査。検索DOM到達|設計記載あり・品質未判定。個別欠陥未確認|Solo状態の書出しを通常の可視属性変更と混同しない。|
|[LAY-010 キャンバスから層選択](../product-planning/features/LAY.md#lay-010)|対象 / 左ツール「移動・層選択」。検索DOM到達|設計記載あり・品質未判定。個別欠陥未確認|半透明の重なりから候補選択し、タップを誤って筆にしない。|
|[LAY-011 レイヤーカンプ](../product-planning/features/LAY.md#lay-011)|対象 / Workspace「レイヤー」→レイヤー・合成→レイヤーカンプ。検索DOM到達|設計記載あり・品質未判定。個別欠陥未確認|削除済層を参照するカンプ適用の部分欠落を一覧で示せるか。|
|[LAY-012 空・非描画対象での開始](../product-planning/features/LAY.md#lay-012)|対象 / Workspace「レイヤー」→レイヤー・合成→空・非描画対象での開始。検索DOM到達|設計記載あり・品質未判定。個別欠陥未確認|初筆に伴う自動層だけをUndoし、既存手動層は残す。|

## SEL — 選択範囲（8件）

|正式ID・名称 / 仕様|現行範囲・操作入口|判定・指摘|個別の反例・追加検証（未実施を含む）|
|---|---|---|---|
|[SEL-001 矩形・楕円・投げ縄・多角形](../product-planning/features/SEL.md#sel-001)|対象 / 左ツール「選択」。検索DOM到達|要是正/要判断。[AUD-007](findings.md#aud-007)|既存の半透明選択へ加算途中に取消し、元Maskを完全復帰する。|
|[SEL-002 色域・明度・自動選択](../product-planning/features/SEL.md#sel-002)|対象 / Workspace「プロパティ」→選択範囲→色域・明度・自動選択。検索DOM到達|設計記載あり・品質未判定。個別欠陥未確認|透明画素と白画素を区別し、自動選択の参照版を固定する。|
|[SEL-003 拡張・縮小・ぼかし・境界](../product-planning/features/SEL.md#sel-003)|対象 / Workspace「プロパティ」→選択範囲→拡張・縮小・ぼかし・境界。検索DOM到達|設計記載あり・品質未判定。個別欠陥未確認|ぼかし→縮小→Undoで濃度を二値化せず原選択へ戻るか。|
|[SEL-004 全選択・解除・再選択・反転](../product-planning/features/SEL.md#sel-004)|対象 / Workspace「プロパティ」→選択範囲→全選択・解除・再選択・反転。検索DOM到達|設計記載あり・品質未判定。個別欠陥未確認|解除と画素削除を区別し、再選択がCrop後にどの座標を使うか。|
|[SEL-005 線画領域・層内容から選択](../product-planning/features/SEL.md#sel-005)|対象 / Workspace「プロパティ」→選択範囲→線画領域・層内容から選択。検索DOM到達|設計記載あり・品質未判定。個別欠陥未確認|線画区分を更新しても既存選択の形が追従しないことを検査する。|
|[SEL-006 保存選択・選択マスク](../product-planning/features/SEL.md#sel-006)|対象 / Workspace「プロパティ」→選択範囲→保存選択・選択マスク。検索DOM到達|設計記載あり・品質未判定。個別欠陥未確認|保存選択と現在選択の同名上書きを一つのUndoへ混ぜない。|
|[SEL-007 境界移動と内容移動](../product-planning/features/SEL.md#sel-007)|対象 / Workspace「プロパティ」→選択範囲→境界移動と内容移動。検索DOM到達|設計記載あり・品質未判定。個別欠陥未確認|境界移動と内容移動を同じTransformボタンに見せない。|
|[SEL-008 選択の表示・抑制](../product-planning/features/SEL.md#sel-008)|対象 / Workspace「プロパティ」→選択範囲→選択の表示・抑制。検索DOM到達|設計記載あり・品質未判定。個別欠陥未確認|境界非表示でも選択制限中だと分かるか。|

## TRN — 変形（8件）

|正式ID・名称 / 仕様|現行範囲・操作入口|判定・指摘|個別の反例・追加検証（未実施を含む）|
|---|---|---|---|
|[TRN-001 移動・拡縮・回転・反転](../product-planning/features/TRN.md#trn-001)|対象 / 左ツール「変形」。検索DOM到達|要是正/要判断。[AUD-007](findings.md#aud-007)|別層Cを受理した後でも作品Undoを使える入口が必要。現行UIはSessionが占有する。|
|[TRN-002 自由・パース・傾斜](../product-planning/features/TRN.md#trn-002)|対象 / Workspace「プロパティ」→変形→自由・パース・傾斜。検索DOM到達|設計記載あり・品質未判定。個別欠陥未確認|四隅が自己交差/退化する候補を保存前に拒否できるか。|
|[TRN-003 メッシュ・ケージ・ワープ](../product-planning/features/TRN.md#trn-003)|対象 / Workspace「プロパティ」→変形→メッシュ・ケージ・ワープ。検索DOM到達|設計記載あり・品質未判定。個別欠陥未確認|折返しWarpを逆写像で原本へ描き戻さない。後段演算の意味を定義する。|
|[TRN-004 ゆがみ・液状化](../product-planning/features/TRN.md#trn-004)|対象 / Workspace「プロパティ」→変形→ゆがみ・液状化。検索DOM到達|設計記載あり・品質未判定。個別欠陥未確認|内部筆UndoとSession全取消を区別し、独立Cは残す。|
|[TRN-005 スナップ・整列・分布](../product-planning/features/TRN.md#trn-005)|対象 / Workspace「プロパティ」→変形→スナップ・整列・分布。検索DOM到達|設計記載あり・品質未判定。個別欠陥未確認|画面外の基準物へ吸着する場合、急な対象飛びを防げるか。|
|[TRN-006 補間・連続調整](../product-planning/features/TRN.md#trn-006)|対象 / Workspace「プロパティ」→変形→補間・連続調整。検索DOM到達|設計記載あり・品質未判定。個別欠陥未確認|再ドラッグで補間を重ねず、Pixel時の整数条件を確認する。|
|[TRN-007 セッション内Undoと全体Undo](../product-planning/features/TRN.md#trn-007)|対象 / Workspace「プロパティ」→変形→セッション内Undoと全体Undo。検索DOM到達|要是正/要判断。[AUD-003](findings.md#aud-003) / [AUD-016](findings.md#aud-016)|候補が未変更でも作品履歴がある時、全体Undoへ明示的に切替できるか。|
|[TRN-008 非破壊変形と描画](../product-planning/features/TRN.md#trn-008)|対象 / Workspace「プロパティ」→変形→非破壊変形と描画。検索DOM到達|要是正/要判断。[AUD-006](findings.md#aud-006)|旧変形再編集後に消去/混色の後段結果をどう保持するかが未具体化。|

## VEC — ベクター・文字（8件）

|正式ID・名称 / 仕様|現行範囲・操作入口|判定・指摘|個別の反例・追加検証（未実施を含む）|
|---|---|---|---|
|[VEC-001 自由描線・パス・図形](../product-planning/features/VEC.md#vec-001)|対象 / Workspace「プロパティ」→ベクター・文字→自由描線・パス・図形。検索DOM到達|設計記載あり・品質未判定。個別欠陥未確認|非ゼロ/偶奇の塗り規則とMaskパスを同じDocument内で検査する。|
|[VEC-002 オブジェクト・点・ハンドル編集](../product-planning/features/VEC.md#vec-002)|対象 / Workspace「プロパティ」→ベクター・文字→オブジェクト・点・ハンドル編集。検索DOM到達|設計記載あり・品質未判定。個別欠陥未確認|密な点の候補巡回をペン/単指/キーボードで同じ対象に解決する。|
|[VEC-003 線幅・筆風・ベクター消去](../product-planning/features/VEC.md#vec-003)|対象 / Workspace「プロパティ」→ベクター・文字→線幅・筆風・ベクター消去。検索DOM到達|設計記載あり・品質未判定。個別欠陥未確認|交点消去で交点がない場合の全消しを事前予告できるか。|
|[VEC-004 簡略化・平滑化・ブーリアン](../product-planning/features/VEC.md#vec-004)|対象 / Workspace「プロパティ」→ベクター・文字→簡略化・平滑化・ブーリアン。検索DOM到達|設計記載あり・品質未判定。個別欠陥未確認|Boolean後の空結果と細い穴消失を取消可能にする。|
|[VEC-005 文字・縦横書き・IME](../product-planning/features/VEC.md#vec-005)|対象 / Workspace「プロパティ」→ベクター・文字→文字・縦横書き・IME。検索DOM到達|設計記載あり・品質未判定。個別欠陥未確認|IME未確定文字中のUndoが作品Undoも同時に動かないか。|
|[VEC-006 フォント取込・不足解決](../product-planning/features/VEC.md#vec-006)|対象 / Workspace「プロパティ」→ベクター・文字→フォント取込・不足解決。検索DOM到達|設計記載あり・品質未判定。個別欠陥未確認|不足フォントで保存済外観を保持し、代替決定を勝手に保存しない。|
|[VEC-007 文字のパス化・Raster化](../product-planning/features/VEC.md#vec-007)|対象 / Workspace「プロパティ」→ベクター・文字→文字のパス化・Raster化。検索DOM到達|設計記載あり・品質未判定。個別欠陥未確認|文字Raster化のUndoで元文字/書式/フォント参照を復元する。|
|[VEC-008 パス上文字・高度組版](../product-planning/features/VEC.md#vec-008)|保留 / 全機能→ベクター・文字→パス上文字・高度組版の範囲説明。検索DOM到達（説明のみ）|範囲境界確認・処理評価対象外。個別欠陥未確認|高度組版保留でも基本文字とフォント取込へ到達できる。|

## GUI — 定規・図形（7件）

|正式ID・名称 / 仕様|現行範囲・操作入口|判定・指摘|個別の反例・追加検証（未実施を含む）|
|---|---|---|---|
|[GUI-001 直線・平行・円・楕円定規](../product-planning/features/GUI.md#gui-001)|対象 / Workspace「プロパティ」→定規・図形→直線・平行・円・楕円定規。検索DOM到達|設計記載あり・品質未判定。個別欠陥未確認|定規を非表示にした時の吸着有効状態と書出し除外を検査する。|
|[GUI-002 2D・等角・透視ガイド](../product-planning/features/GUI.md#gui-002)|対象 / Workspace「プロパティ」→定規・図形→2D・等角・透視ガイド。検索DOM到達|設計記載あり・品質未判定。個別欠陥未確認|消失点が画面外でも数値/移動先から再編集できるか。|
|[GUI-003 対称・放射・万華鏡](../product-planning/features/GUI.md#gui-003)|対象 / Workspace「プロパティ」→定規・図形→対称・放射・万華鏡。検索DOM到達|設計記載あり・品質未判定。個別欠陥未確認|対称筆が重なる中心でflow/Smudgeの作用順を定義する。|
|[GUI-004 図形・ベジェ・折線](../product-planning/features/GUI.md#gui-004)|対象 / Workspace「プロパティ」→定規・図形→図形・ベジェ・折線。検索DOM到達|設計記載あり・品質未判定。個別欠陥未確認|図形出力のRaster/Vectorを開始時に固定する。|
|[GUI-005 描いた後の形状補正](../product-planning/features/GUI.md#gui-005)|対象 / Workspace「プロパティ」→定規・図形→描いた後の形状補正。検索DOM到達|設計記載あり・品質未判定。個別欠陥未確認|長筆の保持で誤発火する形状補正と一筆Undoの境界を比較する。|
|[GUI-006 吸着表示・一時解除・範囲](../product-planning/features/GUI.md#gui-006)|対象 / Workspace「プロパティ」→定規・図形→吸着表示・一時解除・範囲。検索DOM到達|設計記載あり・品質未判定。個別欠陥未確認|複数定規とスナップ候補が競合する時の優先と一時解除を検査する。|
|[GUI-007 ガイド・図形プリセット](../product-planning/features/GUI.md#gui-007)|対象 / Workspace「プロパティ」→定規・図形→ガイド・図形プリセット。検索DOM到達|設計記載あり・品質未判定。個別欠陥未確認|画面外の消失点を含むプリセットを端末間で移す。|

## GRA — グラデーション（4件）

|正式ID・名称 / 仕様|現行範囲・操作入口|判定・指摘|個別の反例・追加検証（未実施を含む）|
|---|---|---|---|
|[GRA-001 線形・放射・反射・角度](../product-planning/features/GRA.md#gra-001)|対象 / Workspace「プロパティ」→グラデーション→線形・放射・反射・角度。検索DOM到達|設計記載あり・品質未判定。個別欠陥未確認|編集可能塗りとRaster直接適用を別actionとして公開する。|
|[GRA-002 停止点・透明度・中間点](../product-planning/features/GRA.md#gra-002)|対象 / Workspace「プロパティ」→グラデーション→停止点・透明度・中間点。検索DOM到達|設計記載あり・品質未判定。個別欠陥未確認|同位置停止点の順序と透明色のRGB値を保存/Redoで照合する。|
|[GRA-003 再編集・マスク・形状追従](../product-planning/features/GRA.md#gra-003)|対象 / Workspace「プロパティ」→グラデーション→再編集・マスク・形状追従。検索DOM到達|設計記載あり・品質未判定。個別欠陥未確認|穴を含む分裂形状の追従と、作成時Selection固定を検査する。|
|[GRA-004 グラデーションマップ・階調](../product-planning/features/GRA.md#gra-004)|対象 / Workspace「効果」→グラデーション→グラデーションマップ・階調。検索DOM到達|設計記載あり・品質未判定。個別欠陥未確認|同じseed/条件のディザがZoom/Save/Redoで変わらないか。|

## FX — 補正・フィルター（45件）

|正式ID・名称 / 仕様|現行範囲・操作入口|判定・指摘|個別の反例・追加検証（未実施を含む）|
|---|---|---|---|
|[FX-001 色調整レイヤー](../product-planning/features/FX.md#fx-001)|対象 / Workspace「効果」→補正・フィルター→色調整レイヤー。検索DOM到達|設計記載あり・品質未判定。個別欠陥未確認|作成時Selectionを効果Maskへ固定し、後の選択変更から独立させる。|
|[FX-002 高度色調整](../product-planning/features/FX.md#fx-002)|対象 / Workspace「効果」→補正・フィルター→高度色調整。検索DOM到達|設計記載あり・品質未判定。個別欠陥未確認|カテゴリ親と個別36効果の二重登録を同じactionへ解決する。|
|[FX-003 ぼかし](../product-planning/features/FX.md#fx-003)|対象 / Workspace「効果」→補正・フィルター→ぼかし。検索DOM到達|設計記載あり・品質未判定。個別欠陥未確認|出力Maskの外から読むhaloと、出力を切るMaskを区別する。|
|[FX-004 鮮鋭化・ノイズ・掃除](../product-planning/features/FX.md#fx-004)|対象 / Workspace「効果」→補正・フィルター→鮮鋭化・ノイズ・掃除。検索DOM到達|設計記載あり・品質未判定。個別欠陥未確認|ノイズseedと細線保護を100%表示で評価する。|
|[FX-005 変位・オフセット・モザイク](../product-planning/features/FX.md#fx-005)|対象 / Workspace「効果」→補正・フィルター→変位・オフセット・モザイク。検索DOM到達|設計記載あり・品質未判定。個別欠陥未確認|反復/透明端/遠方Mapを含むdirty範囲を定義する。|
|[FX-006 網点・線画抽出・縁・発光](../product-planning/features/FX.md#fx-006)|対象 / Workspace「効果」→補正・フィルター→網点・線画抽出・縁・発光。検索DOM到達|設計記載あり・品質未判定。個別欠陥未確認|Canvas外へ伸びる縁/光の保存と出力範囲を検査する。|
|[FX-007 修復・パッチ・クローン](../product-planning/features/FX.md#fx-007)|対象 / Workspace「効果」→補正・フィルター→修復・パッチ・クローン。検索DOM到達|設計記載あり・品質未判定。個別欠陥未確認|クローン元が自分を読む循環依存を受付前に拒否できるか。|
|[FX-008 フィルター順序・マスク・強度](../product-planning/features/FX.md#fx-008)|対象 / Workspace「効果」→補正・フィルター→フィルター順序・マスク・強度。検索DOM到達|設計記載あり・品質未判定。個別欠陥未確認|効果並替でMask適用順と色/αの丸め順が変わることを参照比較する。|
|[FX-009 明示的な焼込み](../product-planning/features/FX.md#fx-009)|対象 / Workspace「効果」→補正・フィルター→明示的な焼込み。検索DOM到達|設計記載あり・品質未判定。個別欠陥未確認|焼込で通過Groupの見た目が変わる場合、統合コピーを提案する。|
|[FX-101 明るさ・コントラスト](../product-planning/features/FX.md#fx-101)|対象 / Workspace「効果」→補正・フィルター→明るさ・コントラスト。検索DOM到達|設計記載あり・品質未判定。個別欠陥未確認|黒白クリップ端の警告と恒等値を8U/16U/16Fで比較する。|
|[FX-102 レベル](../product-planning/features/FX.md#fx-102)|対象 / Workspace「効果」→補正・フィルター→レベル。検索DOM到達|設計記載あり・品質未判定。個別欠陥未確認|黒白点逆転/一致時の拒否と5ハンドルの単指代替を検査する。|
|[FX-103 トーンカーブ](../product-planning/features/FX.md#fx-103)|対象 / Workspace「効果」→補正・フィルター→トーンカーブ。検索DOM到達|設計記載あり・品質未判定。個別欠陥未確認|重複点/急曲線/画像上ドラッグの対応明度を一貫させる。|
|[FX-104 露出](../product-planning/features/FX.md#fx-104)|対象 / Workspace「効果」→補正・フィルター→露出。検索DOM到達|設計記載あり・品質未判定。個別欠陥未確認|負EV/範囲外値を無言クランプせず、明るさ調整と区別する。|
|[FX-105 色相・彩度・明度](../product-planning/features/FX.md#fx-105)|対象 / Workspace「効果」→補正・フィルター→色相・彩度・明度。検索DOM到達|設計記載あり・品質未判定。個別欠陥未確認|色相0/360を跨ぐ色域帯が連続し、透明端を壊さない。|
|[FX-106 自然な彩度](../product-planning/features/FX.md#fx-106)|対象 / Workspace「効果」→補正・フィルター→自然な彩度。検索DOM到達|設計記載あり・品質未判定。個別欠陥未確認|肌保護を保証せず、低彩度優先の具体的な基準画像を作る。|
|[FX-107 カラーバランス](../product-planning/features/FX.md#fx-107)|対象 / Workspace「効果」→補正・フィルター→カラーバランス。検索DOM到達|設計記載あり・品質未判定。個別欠陥未確認|明中暗の帯境界で不連続を生じない参照式が未確定。|
|[FX-108 色温度・Tint](../product-planning/features/FX.md#fx-108)|対象 / Workspace「効果」→補正・フィルター→色温度・Tint。検索DOM到達|設計記載あり・品質未判定。個別欠陥未確認|Kelvin表示を実撮影値と誤認させず、基準白採取を提供する。|
|[FX-109 白黒](../product-planning/features/FX.md#fx-109)|対象 / Workspace「効果」→補正・フィルター→白黒。検索DOM到達|設計記載あり・品質未判定。個別欠陥未確認|無彩色/Tint OFFの中立性と画像上の色帯選択を検査する。|
|[FX-110 チャンネルミキサー](../product-planning/features/FX.md#fx-110)|対象 / Workspace「効果」→補正・フィルター→チャンネルミキサー。検索DOM到達|設計記載あり・品質未判定。個別欠陥未確認|負係数/100%超の行列を強制正規化しない仕様を検査する。|
|[FX-111 選択色補正](../product-planning/features/FX.md#fx-111)|対象 / Workspace「効果」→補正・フィルター→選択色補正。検索DOM到達|設計記載あり・品質未判定。個別欠陥未確認|RGB選択色補正をNative CMYKとして表示しない。|
|[FX-112 反転](../product-planning/features/FX.md#fx-112)|対象 / Workspace「効果」→補正・フィルター→反転。検索DOM到達|設計記載あり・品質未判定。個別欠陥未確認|二回反転で元値へ戻ることを各精度の丸め規則で照合する。|
|[FX-113 階調化](../product-planning/features/FX.md#fx-113)|対象 / Workspace「効果」→補正・フィルター→階調化。検索DOM到達|設計記載あり・品質未判定。個別欠陥未確認|段数が全色数か成分数かを表示し、Indexedと混同しない。|
|[FX-114 二値化](../product-planning/features/FX.md#fx-114)|対象 / Workspace「効果」→補正・フィルター→二値化。検索DOM到達|設計記載あり・品質未判定。個別欠陥未確認|閾値一致画素を白黒どちらにするかをオラクルへ含める。|
|[FX-115 LUT](../product-planning/features/FX.md#fx-115)|対象 / Workspace「効果」→補正・フィルター→LUT。検索DOM到達|設計記載あり・品質未判定。個別欠陥未確認|LUTの入力色空間/範囲/版を保存し、欠落時を成功にしない。|
|[FX-116 ガウスぼかし](../product-planning/features/FX.md#fx-116)|対象 / Workspace「効果」→補正・フィルター→ガウスぼかし。検索DOM到達|設計記載あり・品質未判定。個別欠陥未確認|Gaussian打切り半径とα境界の正解、タイルhaloを定義する。|
|[FX-117 ボックスぼかし](../product-planning/features/FX.md#fx-117)|対象 / Workspace「効果」→補正・フィルター→ボックスぼかし。検索DOM到達|設計記載あり・品質未判定。個別欠陥未確認|偶数/奇数窓と端規則で1pxずれを生じないか。|
|[FX-118 移動ぼかし](../product-planning/features/FX.md#fx-118)|対象 / Workspace「効果」→補正・フィルター→移動ぼかし。検索DOM到達|設計記載あり・品質未判定。個別欠陥未確認|方向の符号と起点を固定し、90/180度の対称性を比較する。|
|[FX-119 放射ぼかし](../product-planning/features/FX.md#fx-119)|対象 / Workspace「効果」→補正・フィルター→放射ぼかし。検索DOM到達|設計記載あり・品質未判定。個別欠陥未確認|中心が文書座標でナビに追従し、遠方入力依存を切らない。|
|[FX-120 レンズ・深度ぼかし](../product-planning/features/FX.md#fx-120)|対象 / Workspace「効果」→補正・フィルター→レンズ・深度ぼかし。検索DOM到達|設計記載あり・品質未判定。個別欠陥未確認|深度Map不足と前後輪郭の色漏れを通常ぼかしと別評価する。|
|[FX-121 シャープ](../product-planning/features/FX.md#fx-121)|対象 / Workspace「効果」→補正・フィルター→シャープ。検索DOM到達|設計記載あり・品質未判定。個別欠陥未確認|100%のハロー比較を可能にし、超解像の能力と混同しない。|
|[FX-122 アンシャープマスク](../product-planning/features/FX.md#fx-122)|対象 / Workspace「効果」→補正・フィルター→アンシャープマスク。検索DOM到達|設計記載あり・品質未判定。個別欠陥未確認|半径/閾値/強度の作用を分離し、平坦部ノイズを評価する。|
|[FX-123 High Pass](../product-planning/features/FX.md#fx-123)|対象 / Workspace「効果」→補正・フィルター→High Pass。検索DOM到達|設計記載あり・品質未判定。個別欠陥未確認|中立値と合成モードの自動変更を避け、元の層設定を守る。|
|[FX-124 ノイズ](../product-planning/features/FX.md#fx-124)|対象 / Workspace「効果」→補正・フィルター→ノイズ。検索DOM到達|設計記載あり・品質未判定。個別欠陥未確認|seed固定でZoom/再描画/Redoの粒が同一か。|
|[FX-125 Median・ごみ取り](../product-planning/features/FX.md#fx-125)|対象 / Workspace「効果」→補正・フィルター→Median・ごみ取り。検索DOM到達|設計記載あり・品質未判定。個別欠陥未確認|局所取消で保護ハイライトを復元し、全効果を巻戻さない。|
|[FX-126 モザイク](../product-planning/features/FX.md#fx-126)|対象 / Workspace「効果」→補正・フィルター→モザイク。検索DOM到達|設計記載あり・品質未判定。個別欠陥未確認|格子原点がCrop/Tile境界でずれず、端数ブロックを定義する。|
|[FX-127 オフセット](../product-planning/features/FX.md#fx-127)|対象 / Workspace「効果」→補正・フィルター→オフセット。検索DOM到達|設計記載あり・品質未判定。個別欠陥未確認|幅超/負値のwrapと透明モードを別条件で検査する。|
|[FX-128 変位](../product-planning/features/FX.md#fx-128)|対象 / Workspace「効果」→補正・フィルター→変位。検索DOM到達|設計記載あり・品質未判定。個別欠陥未確認|Map更新の採用は比較後。循環参照の検出方法を検証する。|
|[FX-129 網点・スクリーントーン](../product-planning/features/FX.md#fx-129)|対象 / Workspace「効果」→補正・フィルター→網点・スクリーントーン。検索DOM到達|設計記載あり・品質未判定。個別欠陥未確認|lpi/DPI/pxの単位と回転時モアレを実出力で比較する。|
|[FX-130 輪郭検出・線画抽出](../product-planning/features/FX.md#fx-130)|対象 / Workspace「効果」→補正・フィルター→輪郭検出・線画抽出。検索DOM到達|設計記載あり・品質未判定。個別欠陥未確認|抽出線を確定区分と誤認せず、手修正と別に保存する。|
|[FX-131 線画色変更](../product-planning/features/FX.md#fx-131)|対象 / Workspace「効果」→補正・フィルター→線画色変更。検索DOM到達|設計記載あり・品質未判定。個別欠陥未確認|半透明線のαを保持し、白背景除去を別操作にする。|
|[FX-132 内外の縁取](../product-planning/features/FX.md#fx-132)|対象 / Workspace「効果」→補正・フィルター→内外の縁取。検索DOM到達|設計記載あり・品質未判定。個別欠陥未確認|細い穴/鋭角/Canvas外への内外縁を参照画像で照合する。|
|[FX-133 内外の影](../product-planning/features/FX.md#fx-133)|対象 / Workspace「効果」→補正・フィルター→内外の影。検索DOM到達|設計記載あり・品質未判定。個別欠陥未確認|共有光源を選んだ層だけが連動し、全層失効を避ける。|
|[FX-134 内外光彩](../product-planning/features/FX.md#fx-134)|対象 / Workspace「効果」→補正・フィルター→内外光彩。検索DOM到達|設計記載あり・品質未判定。個別欠陥未確認|SDR白飛びとHDR候補の能力を分け、元α保持を検査する。|
|[FX-135 色・グラデ・模様Overlay](../product-planning/features/FX.md#fx-135)|対象 / Workspace「効果」→補正・フィルター→色・グラデ・模様Overlay。検索DOM到達|設計記載あり・品質未判定。個別欠陥未確認|形変更時の模様座標/継目と透明グラデ端を固定する。|
|[FX-136 ベベル・エンボス](../product-planning/features/FX.md#fx-136)|対象 / Workspace「効果」→補正・フィルター→ベベル・エンボス。検索DOM到達|設計記載あり・品質未判定。個別欠陥未確認|小文字/鋭角の潰れと光源の文書座標を直接比較する。|

## NDE — 非破壊編集（5件）

|正式ID・名称 / 仕様|現行範囲・操作入口|判定・指摘|個別の反例・追加検証（未実施を含む）|
|---|---|---|---|
|[NDE-001 合成モードと比較](../product-planning/features/NDE.md#nde-001)|対象 / Workspace「レイヤー」→非破壊編集→合成モードと比較。検索DOM到達|設計記載あり・品質未判定。個別欠陥未確認|上側Multiplyを二枚RGBAへ単純集約しない参照合成試験が必要。|
|[NDE-002 階調依存合成](../product-planning/features/NDE.md#nde-002)|対象 / Workspace「レイヤー」→非破壊編集→階調依存合成。検索DOM到達|設計記載あり・品質未判定。個別欠陥未確認|階調依存Blendが編集層を読む場合のキャッシュ失効を検査する。|
|[NDE-003 編集可能な効果・変形](../product-planning/features/NDE.md#nde-003)|対象 / Workspace「レイヤー」→非破壊編集→編集可能な効果・変形。検索DOM到達|要是正/要判断。[AUD-006](findings.md#aud-006)|Undo可能と非破壊再編集可能を別能力として確認する。|
|[NDE-004 リンク・埋込・インスタンス](../product-planning/features/NDE.md#nde-004)|対象 / Workspace「レイヤー」→非破壊編集→リンク・埋込・インスタンス。検索DOM到達|設計記載あり・品質未判定。個別欠陥未確認|リンク元変更を自動反映せず、保存済外観と旧版を保持する。|
|[NDE-005 安全な構造変換](../product-planning/features/NDE.md#nde-005)|対象 / Workspace「レイヤー」→非破壊編集→安全な構造変換。検索DOM到達|設計記載あり・品質未判定。個別欠陥未確認|clip/Mask/Groupの構造変更で外観を保てない場合を明示する。|

## REF — 資料・全体表示（6件）

|正式ID・名称 / 仕様|現行範囲・操作入口|判定・指摘|個別の反例・追加検証（未実施を含む）|
|---|---|---|---|
|[REF-001 複数資料・グループ](../product-planning/features/REF.md#ref-001)|対象 / 資料欄「追加」。検索DOM到達|要是正/要判断。[AUD-016](findings.md#aud-016)|資料追加の読込失敗が作品編集を止めず、資料専用履歴へ帰属するか。|
|[REF-002 移動・拡縮・回転・ピン](../product-planning/features/REF.md#ref-002)|対象 / Workspace「資料」→資料・全体表示→移動・拡縮・回転・ピン。検索DOM到達|要是正/要判断。[AUD-016](findings.md#aud-016)|資料の一ドラッグUndoとCanvas表示移動Undo外の作用先を区別する。|
|[REF-003 反転・グレー・一時非表示](../product-planning/features/REF.md#ref-003)|対象 / Workspace「資料」→資料・全体表示→反転・グレー・一時非表示。検索DOM到達|設計記載あり・品質未判定。個別欠陥未確認|グレー検査中も通常採色は元色から行うか。|
|[REF-004 資料採色と色の出典](../product-planning/features/REF.md#ref-004)|対象 / Workspace「資料」→資料・全体表示→資料採色と色の出典。検索DOM到達|設計記載あり・品質未判定。個別欠陥未確認|資料ICC→作品色変換と一時採色後のツール復帰を検査する。|
|[REF-005 Navigator・全体/細部別ビュー](../product-planning/features/REF.md#ref-005)|対象 / Workspace「表示」→資料・全体表示→Navigator・全体/細部別ビュー。検索DOM到達|設計記載あり・品質未判定。個別欠陥未確認|別ビューの古い正式像を最新と表示せず、Viewごとの姿勢を保つ。|
|[REF-006 資料保存・不足・権利メモ](../product-planning/features/REF.md#ref-006)|対象 / Workspace「資料」→資料・全体表示→資料保存・不足・権利メモ。検索DOM到達|設計記載あり・品質未判定。個別欠陥未確認|埋込/リンク不足時に出典メモと原画像の依存を保持する。|

## HIS — 履歴・別案（6件）

|正式ID・名称 / 仕様|現行範囲・操作入口|判定・指摘|個別の反例・追加検証（未実施を含む）|
|---|---|---|---|
|[HIS-001 Undo・Redo](../product-planning/features/HIS.md#his-001)|対象 / 右下固定「Undo／Redo」。検索DOM到達|要是正/要判断。[AUD-001](findings.md#aud-001) / [AUD-002](findings.md#aud-002) / [AUD-003](findings.md#aud-003) / [AUD-012](findings.md#aud-012) / [AUD-013](findings.md#aud-013) / [AUD-015](findings.md#aud-015) / [AUD-016](findings.md#aud-016)|検索Undoが新編集を追加する反例をDOMとモデルで再現した。|
|[HIS-002 履歴一覧・比較](../product-planning/features/HIS.md#his-002)|対象 / Workspace「履歴」→履歴・別案→履歴一覧・比較。検索DOM到達|設計記載あり・品質未判定。個別欠陥未確認|履歴比較中の描画で元案を保護し、復元と単純カーソル移動を区別する。|
|[HIS-003 名前付きSnapshot](../product-planning/features/HIS.md#his-003)|対象 / Workspace「履歴」→履歴・別案→名前付きSnapshot。検索DOM到達|設計記載あり・品質未判定。個別欠陥未確認|pendingを含むSnapshotが完了する前に復元可能と表示しない。|
|[HIS-004 分岐・比較・復帰](../product-planning/features/HIS.md#his-004)|対象 / Workspace「履歴」→履歴・別案→分岐・比較・復帰。検索DOM到達|設計記載あり・品質未判定。個別欠陥未確認|新枝でRedoが消えても固定案/pinがGCされないことを検査する。|
|[HIS-005 部分復元・履歴ブラシ](../product-planning/features/HIS.md#his-005)|対象 / Workspace「履歴」→履歴・別案→部分復元・履歴ブラシ。検索DOM到達|設計記載あり・品質未判定。個別欠陥未確認|旧変形前の部分復元を現座標へ勝手に対応させない。|
|[HIS-006 履歴の容量・保持範囲](../product-planning/features/HIS.md#his-006)|対象 / Workspace「履歴」→履歴・別案→履歴の容量・保持範囲。検索DOM到達|設計記載あり・品質未判定。個別欠陥未確認|Cold履歴読込が資源不足の時、保存pinを解放して戻れるふりをしない。|

## SAV — 作品管理・保存（8件）

|正式ID・名称 / 仕様|現行範囲・操作入口|判定・指摘|個別の反例・追加検証（未実施を含む）|
|---|---|---|---|
|[SAV-001 作品一覧・検索・整理](../product-planning/features/SAV.md#sav-001)|対象 / Workspace「作品」→作品管理・保存→作品一覧・検索・整理。検索DOM到達|要是正/要判断。[AUD-005](findings.md#aud-005)|文書なしの作品検索/整理をdocument必須Intentから切り離す。|
|[SAV-002 複製・削除・ゴミ箱](../product-planning/features/SAV.md#sav-002)|対象 / Workspace「作品」→作品管理・保存→複製・削除・ゴミ箱。検索DOM到達|要是正/要判断。[AUD-005](findings.md#aud-005)|ゴミ箱復元と作品Undoを分け、完全削除は別能力にする。|
|[SAV-003 ネイティブ保存・Save As](../product-planning/features/SAV.md#sav-003)|対象 / 上部「保存」。検索DOM到達|要是正/要判断。[AUD-002](findings.md#aud-002) / [AUD-015](findings.md#aud-015)|Save(A)→Undo(A)→Cのモデルは固定集合を保持した。実ストレージは未検証。|
|[SAV-004 自動保護・保存状態](../product-planning/features/SAV.md#sav-004)|対象 / 上部の保存状態。検索DOM到達|要是正/要判断。[AUD-012](findings.md#aud-012)|端末内保護とファイル保存を別時点表示し、自動保護最大遅れを測る。|
|[SAV-005 クラッシュ・背景終了復元](../product-planning/features/SAV.md#sav-005)|対象 / Workspace「作品」→作品管理・保存→クラッシュ・背景終了復元。検索DOM到達|設計記載あり・品質未判定。個別欠陥未確認|OS終了イベントに依存せず、最後の永続差分だけ復元できるか。|
|[SAV-006 容量不足・外部変更・複数起動](../product-planning/features/SAV.md#sav-006)|対象 / Workspace「作品」→作品管理・保存→容量不足・外部変更・複数起動。検索DOM到達|要是正/要判断。[AUD-014](findings.md#aud-014) / [AUD-015](findings.md#aud-015)|並行保存先世代/容量不足/外部書換えをコピー救出へ接続する。|
|[SAV-007 Offline・ログイン不要制作](../product-planning/features/SAV.md#sav-007)|対象 / Workspace「作品」→作品管理・保存→Offline・ログイン不要制作。検索DOM到達|設計記載あり・品質未判定。個別欠陥未確認|Offlineで不足する外部資料だけを局所通知し、基本保存は継続する。|
|[SAV-008 バックアップ・版移行・旧形式](../product-planning/features/SAV.md#sav-008)|対象 / Workspace「作品」→作品管理・保存→バックアップ・版移行・旧形式。検索DOM到達|設計記載あり・品質未判定。個別欠陥未確認|形式移行は旧原本を保持し、再読込検査後にのみ成功とする。|

## IO — 読み込み・書き出し（9件）

|正式ID・名称 / 仕様|現行範囲・操作入口|判定・指摘|個別の反例・追加検証（未実施を含む）|
|---|---|---|---|
|[IO-001 画像を開く・配置する](../product-planning/features/IO.md#io-001)|対象 / Workspace「作品」→読み込み・書き出し→画像を開く・配置する。検索DOM到達|設計記載あり・品質未判定。個別欠陥未確認|開く/配置/資料追加の異なる所有先と巨大画像の段階読込を分ける。|
|[IO-002 PNG・JPEG・WebP](../product-planning/features/IO.md#io-002)|対象 / 上部「書き出し」。検索DOM到達|要是正/要判断。[AUD-008](findings.md#aud-008)|透明JPEGの背景、PNG/WebPのICCを出力プレビューで明示する。|
|[IO-003 PSD・PSB互換](../product-planning/features/IO.md#io-003)|対象 / Workspace「作品」→読み込み・書き出し→PSD・PSB互換。検索DOM到達|設計記載あり・品質未判定。個別欠陥未確認|PSD往復で外観と再編集性を別採点する。実際の保持能力は未確定。|
|[IO-004 ORA・TIFF](../product-planning/features/IO.md#io-004)|対象 / Workspace「作品」→読み込み・書き出し→ORA・TIFF。検索DOM到達|設計記載あり・品質未判定。個別欠陥未確認|ORA/TIFFの層/精度/ICC保持を要素別に試し、形式名だけで完全互換と言わない。|
|[IO-005 SVG](../product-planning/features/IO.md#io-005)|対象 / Workspace「作品」→読み込み・書き出し→SVG。検索DOM到達|設計記載あり・品質未判定。個別欠陥未確認|SVGの外部資源やフォント不足を省略成功にせず損失一覧へ出す。|
|[IO-006 EXR・AVIF・HEIF](../product-planning/features/IO.md#io-006)|対象 / Workspace「作品」→読み込み・書き出し→EXR・AVIF・HEIF。検索DOM到達|設計記載あり・品質未判定。個別欠陥未確認|コーデック未対応端末でAVIF/HEIF等を正常出力と表示しない。|
|[IO-007 出力色・メタデータ](../product-planning/features/IO.md#io-007)|対象 / Workspace「作品」→読み込み・書き出し→出力色・メタデータ。検索DOM到達|設計記載あり・品質未判定。個別欠陥未確認|ICC埋込削除と色変換の違いを出力条件へ固定する。|
|[IO-008 レイヤー・選択範囲・一括出力](../product-planning/features/IO.md#io-008)|対象 / Workspace「作品」→読み込み・書き出し→レイヤー・選択範囲・一括出力。検索DOM到達|設計記載あり・品質未判定。個別欠陥未確認|一括出力中の後続編集を混ぜず、部分失敗と同名上書きを個別記録する。|
|[IO-009 印刷向け確認](../product-planning/features/IO.md#io-009)|対象 / Workspace「作品」→読み込み・書き出し→印刷向け確認。検索DOM到達|設計記載あり・品質未判定。個別欠陥未確認|Proofは色一致保証ではない。Native CMYK保留でも入稿確認は残す。|

## AST — 素材管理（5件）

|正式ID・名称 / 仕様|現行範囲・操作入口|判定・指摘|個別の反例・追加検証（未実施を含む）|
|---|---|---|---|
|[AST-001 素材種別の管理](../product-planning/features/AST.md#ast-001)|対象 / Workspace「素材」→素材管理→素材種別の管理。検索DOM到達|設計記載あり・品質未判定。個別欠陥未確認|同じ名前で異なる素材種別を誤置換しない。|
|[AST-002 検索・タグ・お気に入り](../product-planning/features/AST.md#ast-002)|対象 / Workspace「素材」→素材管理→検索・タグ・お気に入り。検索DOM到達|要是正/要判断。[AUD-005](findings.md#aud-005)|未取得と検索ゼロを区別し、絞込解除へ到達できるか。|
|[AST-003 取込・書出・束ね](../product-planning/features/AST.md#ast-003)|対象 / Workspace「素材」→素材管理→取込・書出・束ね。検索DOM到達|設計記載あり・品質未判定。個別欠陥未確認|パックに任意コードを含む場合、通常素材取込として自動実行しない。|
|[AST-004 同名・上書き・削除・版](../product-planning/features/AST.md#ast-004)|対象 / Workspace「素材」→素材管理→同名・上書き・削除・版。検索DOM到達|設計記載あり・品質未判定。個別欠陥未確認|削除素材を参照する旧筆/Redo/記録の版を寿命規則で保護する。|
|[AST-005 ローカル素材と任意の配布](../product-planning/features/AST.md#ast-005)|対象 / Workspace「素材」→素材管理→ローカル素材と任意の配布。検索DOM到達|設計記載あり・品質未判定。個別欠陥未確認|ログイン切れで取得済みの手元筆を使えなくしない。|

## AUT — 自動化（6件）

|正式ID・名称 / 仕様|現行範囲・操作入口|判定・指摘|個別の反例・追加検証（未実施を含む）|
|---|---|---|---|
|[AUT-001 記録・編集・再生](../product-planning/features/AUT.md#aut-001)|対象 / Workspace「自動化」→自動化→記録・編集・再生。検索DOM到達|設計記載あり・品質未判定。個別欠陥未確認|非記録操作を省略せず、意味的action列の未対応を事前表示する。|
|[AUT-002 実行時パラメータ・対象指定](../product-planning/features/AUT.md#aut-002)|対象 / Workspace「自動化」→自動化→実行時パラメータ・対象指定。検索DOM到達|設計記載あり・品質未判定。個別欠陥未確認|層番号ではなく意味的対象を解決し、欠落時は別層へ適用しない。|
|[AUT-003 実行比較・失敗・取消](../product-planning/features/AUT.md#aut-003)|対象 / Workspace「自動化」→自動化→実行比較・失敗・取消。検索DOM到達|要是正/要判断。[AUD-015](findings.md#aud-015)|マクロ途中失敗で依存Bと独立Cを分け、一実行取消の範囲を説明する。|
|[AUT-004 バッチ出力](../product-planning/features/AUT.md#aut-004)|対象 / Workspace「自動化」→自動化→バッチ出力。検索DOM到達|設計記載あり・品質未判定。個別欠陥未確認|複数作品バッチの一件失敗で原本を変えず、再試行先を固定する。|
|[AUT-005 高速入口・共有](../product-planning/features/AUT.md#aut-005)|対象 / Workspace「自動化」→自動化→高速入口・共有。検索DOM到達|設計記載あり・品質未判定。個別欠陥未確認|検索からQuickへ登録する具体的な編集/解除フローは試作で検証できない。|
|[AUT-006 スクリプトと外部アクセス](../product-planning/features/AUT.md#aut-006)|保留 / 全機能→自動化→スクリプトと外部アクセスの範囲説明。検索DOM到達（説明のみ）|範囲境界確認・処理評価対象外。個別欠陥未確認|保留。外部副作用のUndo不能性を、作品内マクロUndoと混同しない。|

## UI — 画面・Workspace（8件）

|正式ID・名称 / 仕様|現行範囲・操作入口|判定・指摘|個別の反例・追加検証（未実施を含む）|
|---|---|---|---|
|[UI-001 明色Auroraの制作画面](../product-planning/features/UI.md#ui-001)|対象 / Workspace「Workspace」→画面・Workspace→明色Auroraの制作画面。検索DOM到達|要是正/要判断。[AUD-018](findings.md#aud-018)|旧Rail/12Box/固定5操作の構造継承をソースで確認。色/密度の使いやすさは未実測。|
|[UI-002 パネルの折畳・並替・持出](../product-planning/features/UI.md#ui-002)|対象 / Workspace「Workspace」→画面・Workspace→パネルの折畳・並替・持出。検索DOM到達|要是正/要判断。[AUD-007](findings.md#aud-007) / [AUD-017](findings.md#aud-017)|幅変更と閉開は操作できた。持出/並替は契約のみで端末別検証は未実施。|
|[UI-003 コンテキスト操作・対象帯](../product-planning/features/UI.md#ui-003)|対象 / Workspace「Workspace」→画面・Workspace→コンテキスト操作・対象帯。検索DOM到達|要是正/要判断。[AUD-003](findings.md#aud-003) / [AUD-007](findings.md#aud-007)|現在対象/Session対象が異なる時の表示とUndo範囲を一致させる。|
|[UI-004 Quick Controller](../product-planning/features/UI.md#ui-004)|対象 / Canvas近傍「Quick」。検索DOM到達|要是正/要判断。[AUD-004](findings.md#aud-004) / [AUD-012](findings.md#aud-012)|Focus時Quickの色/層が隠れたWorkspaceへ送られ、制作を中断する。|
|[UI-005 横断コマンド検索](../product-planning/features/UI.md#ui-005)|対象 / 上部「機能検索」。検索DOM到達|要是正/要判断。[AUD-001](findings.md#aud-001) / [AUD-008](findings.md#aud-008) / [AUD-009](findings.md#aud-009) / [AUD-010](findings.md#aud-010) / [AUD-013](findings.md#aud-013)|左右反転/乗算/透明PNGの目的語検索が機能を十分発見できない。|
|[UI-006 Workspace保存・復元・左右反転](../product-planning/features/UI.md#ui-006)|対象 / Workspace「Workspace」→画面・Workspace→Workspace保存・復元・左右反転。検索DOM到達|要是正/要判断。[AUD-005](findings.md#aud-005) / [AUD-017](findings.md#aud-017)|Workspaceの左右反転とCanvas左右反転を検索上で分ける。|
|[UI-007 Focus・全画面・一時UI](../product-planning/features/UI.md#ui-007)|対象 / 上部「Focus」。検索DOM到達|要是正/要判断。[AUD-004](findings.md#aud-004)|Focus中の必要機能へ一時表示する規則がshowPanelに反映されていない。|
|[UI-008 ホーム・情報・ヘルプ](../product-planning/features/UI.md#ui-008)|対象 / 上部「ホーム」。検索DOM到達|要是正/要判断。[AUD-005](findings.md#aud-005) / [AUD-009](findings.md#aud-009)|Home→新規→最初の筆は詳細画面までで、空文書の実操作は未検証。|

## GST — ジェスチャー・キー（5件）

|正式ID・名称 / 仕様|現行範囲・操作入口|判定・指摘|個別の反例・追加検証（未実施を含む）|
|---|---|---|---|
|[GST-001 既定ジェスチャーと代替](../product-planning/features/GST.md#gst-001)|対象 / Workspace「Workspace」→ジェスチャー・キー→既定ジェスチャーと代替。検索DOM到達|要是正/要判断。[AUD-011](findings.md#aud-011)|二指接触で筆/選択を取消すかは未閉鎖。通常ボタンの代替を保持する。|
|[GST-002 実キー登録・衝突検知](../product-planning/features/GST.md#gst-002)|対象 / Workspace「Workspace」→ジェスチャー・キー→実キー登録・衝突検知。検索DOM到達|要是正/要判断。[AUD-005](findings.md#aud-005)|IME/OS取得不能キーの検知と登録成功表示を実機で確認する。|
|[GST-003 指・ペン・マウス割当](../product-planning/features/GST.md#gst-003)|対象 / Workspace「Workspace」→ジェスチャー・キー→指・ペン・マウス割当。検索DOM到達|設計記載あり・品質未判定。個別欠陥未確認|ペンなし端末へ移した割当が指描画を不能にしない。|
|[GST-004 一時ツールと戻り先](../product-planning/features/GST.md#gst-004)|対象 / Workspace「Workspace」→ジェスチャー・キー→一時ツールと戻り先。検索DOM到達|設計記載あり・品質未判定。個別欠陥未確認|保持ツール終了後の戻り先を、検索で常用切替した場合と分ける。|
|[GST-005 登録設定の移行](../product-planning/features/GST.md#gst-005)|対象 / Workspace「Workspace」→ジェスチャー・キー→登録設定の移行。検索DOM到達|設計記載あり・品質未判定。個別欠陥未確認|異なるキー配列への移行で未対応の元割当を保持する。|

## DEV — 端末・環境（5件）

|正式ID・名称 / 仕様|現行範囲・操作入口|判定・指摘|個別の反例・追加検証（未実施を含む）|
|---|---|---|---|
|[DEV-001 PC操作](../product-planning/features/DEV.md#dev-001)|対象 / Workspace「Workspace」→端末・環境→PC操作。検索DOM到達|設計記載あり・品質未判定。個別欠陥未確認|マウス/ペン/外部画面DPR変更を跨いだ入力と表示の座標を検査する。|
|[DEV-002 タブレット操作](../product-planning/features/DEV.md#dev-002)|対象 / Workspace「Workspace」→端末・環境→タブレット操作。検索DOM到達|要是正/要判断。[AUD-011](findings.md#aud-011) / [AUD-017](findings.md#aud-017) / [AUD-018](findings.md#aud-018) / [AUD-019](findings.md#aud-019)|ペン+指の物理同時入力は今回未実施。CSS枠での表示確認とは区別する。|
|[DEV-003 スマートフォン操作](../product-planning/features/DEV.md#dev-003)|対象 / Workspace「Workspace」→端末・環境→スマートフォン操作。検索DOM到達|要是正/要判断。[AUD-007](findings.md#aud-007) / [AUD-019](findings.md#aud-019)|390px枠で到達を検査。247処理本体のスマホ完遂は未検証。|
|[DEV-004 回転・リサイズ・キーボード](../product-planning/features/DEV.md#dev-004)|対象 / Workspace「Workspace」→端末・環境→回転・リサイズ・キーボード。検索DOM到達|要是正/要判断。[AUD-007](findings.md#aud-007) / [AUD-017](findings.md#aud-017) / [AUD-019](findings.md#aud-019)|中間幅/横持ち/仮想キーボードで対象と適用取消が同時可視か。|
|[DEV-005 能力差・低負荷・端末間移送](../product-planning/features/DEV.md#dev-005)|対象 / Workspace「Workspace」→端末・環境→能力差・低負荷・端末間移送。検索DOM到達|要是正/要判断。[AUD-014](findings.md#aud-014)|低能力時にデータ意味を削らず、重い処理の前に不能理由を説明する。|

## REC — 記録・作業時間（4件）

|正式ID・名称 / 仕様|現行範囲・操作入口|判定・指摘|個別の反例・追加検証（未実施を含む）|
|---|---|---|---|
|[REC-001 Timelapse記録と再生](../product-planning/features/REC.md#rec-001)|対象 / Workspace「履歴」→記録・作業時間→Timelapse記録と再生。検索DOM到達|設計記載あり・品質未判定。個別欠陥未確認|OFF時に記録Jobを起動せず、ON時は履歴GCと別の保持根を作る。|
|[REC-002 動画の範囲・速度・解像度](../product-planning/features/REC.md#rec-002)|対象 / Workspace「作品」→記録・作業時間→動画の範囲・速度・解像度。検索DOM到達|設計記載あり・品質未判定。個別欠陥未確認|動画書出し時点/速度/解像度を固定し、高解像で色や筆順を変えない。|
|[REC-003 記録の除外・機密資料](../product-planning/features/REC.md#rec-003)|対象 / Workspace「履歴」→記録・作業時間→記録の除外・機密資料。検索DOM到達|設計記載あり・品質未判定。個別欠陥未確認|記録停止と過去記録削除を別操作にし、資料は既定除外する。|
|[REC-004 実作業時間](../product-planning/features/REC.md#rec-004)|対象 / Workspace「履歴」→記録・作業時間→実作業時間。検索DOM到達|設計記載あり・品質未判定。個別欠陥未確認|Idle閾値と手動補正を公開し、開いているだけの時間を含めない。|

## A11 — 操作支援・言語（6件）

|正式ID・名称 / 仕様|現行範囲・操作入口|判定・指摘|個別の反例・追加検証（未実施を含む）|
|---|---|---|---|
|[A11-001 文字・UI・コントラスト拡大](../product-planning/features/A11.md#a11-001)|対象 / Workspace「Workspace」→操作支援・言語→文字・UI・コントラスト拡大。検索DOM到達|設計記載あり・品質未判定。個別欠陥未確認|200%文字拡大時の主要ボタン切れを検査。CSS表示枠だけで準拠を宣言しない。|
|[A11-002 単指・非ドラッグ代替](../product-planning/features/A11.md#a11-002)|対象 / Workspace「Workspace」→操作支援・言語→単指・非ドラッグ代替。検索DOM到達|要是正/要判断。[AUD-019](findings.md#aud-019)|主要Touch標的の44px推奨と等価代替を個別測定する。|
|[A11-003 キーボード・支援技術](../product-planning/features/A11.md#a11-003)|対象 / Workspace「Workspace」→操作支援・言語→キーボード・支援技術。検索DOM到達|要是正/要判断。[AUD-009](findings.md#aud-009)|詳細を閉じると焦点復帰せず、Escapeも通常詳細を閉じない反例がある。|
|[A11-004 色説明・グレー・補正](../product-planning/features/A11.md#a11-004)|対象 / Workspace「Workspace」→操作支援・言語→色説明・グレー・補正。検索DOM到達|設計記載あり・品質未判定。個別欠陥未確認|色名は近似、グレー補助はViewのみとして保存画素と分離する。|
|[A11-005 動き・音・振動](../product-planning/features/A11.md#a11-005)|対象 / Workspace「Workspace」→操作支援・言語→動き・音・振動。検索DOM到達|設計記載あり・品質未判定。個別欠陥未確認|進捗アニメOFFでも処理中/失敗/保存済が文字で識別できるか。|
|[A11-006 日本語・翻訳・単位](../product-planning/features/A11.md#a11-006)|対象 / Workspace「Workspace」→操作支援・言語→日本語・翻訳・単位。検索DOM到達|設計記載あり・品質未判定。個別欠陥未確認|日英長文、IME、px/mm/DPIの往復でaction同一性を保つ。|

## AI — 制作補助（4件）

|正式ID・名称 / 仕様|現行範囲・操作入口|判定・指摘|個別の反例・追加検証（未実施を含む）|
|---|---|---|---|
|[AI-001 選択・領域の補助](../product-planning/features/AI.md#ai-001)|対象 / Workspace「プロパティ」→制作補助→選択・領域の補助。検索DOM到達|設計記載あり・品質未判定。個別欠陥未確認|採用結果と手修正を保存し、モデル不在でも手動選択は継続する。|
|[AI-002 色・陰影の候補](../product-planning/features/AI.md#ai-002)|対象 / Workspace「プロパティ」→制作補助→色・陰影の候補。検索DOM到達|設計記載あり・品質未判定。個別欠陥未確認|外部生成を使わず配色する通常導線を残す。|
|[AI-003 整理・修復の候補](../product-planning/features/AI.md#ai-003)|対象 / Workspace「プロパティ」→制作補助→整理・修復の候補。検索DOM到達|設計記載あり・品質未判定。個別欠陥未確認|層整理候補が合成順を無断変更しない境界を要求する。|
|[AI-004 送信・費用・生成の境界](../product-planning/features/AI.md#ai-004)|対象 / Workspace「プロパティ」→制作補助→送信・費用・生成の境界。検索DOM到達|設計記載あり・品質未判定。個別欠陥未確認|送信取消は送信撤回ではない。費用/送信対象/結果出典を分ける。|

## EXT — 将来候補・対象外（5件）

|正式ID・名称 / 仕様|現行範囲・操作入口|判定・指摘|個別の反例・追加検証（未実施を含む）|
|---|---|---|---|
|[EXT-001 拡張機能](../product-planning/features/EXT.md#ext-001)|保留 / 全機能→将来候補・対象外→拡張機能の範囲説明。検索DOM到達（説明のみ）|範囲境界確認・処理評価対象外。個別欠陥未確認|保留。拡張不在のNativeで保存済外観/元データを保持する。|
|[EXT-002 共同描画・絵チャ](../product-planning/features/EXT.md#ext-002)|保留 / 全機能→将来候補・対象外→共同描画・絵チャの範囲説明。検索DOM到達（説明のみ）|範囲境界確認・処理評価対象外。個別欠陥未確認|保留。共同Undoと保存競合を現行単独履歴へ無理に組み込まない。|
|[EXT-003 3D資料・ポーズ・照明](../product-planning/features/EXT.md#ext-003)|保留 / 全機能→将来候補・対象外→3D資料・ポーズ・照明の範囲説明。検索DOM到達（説明のみ）|範囲境界確認・処理評価対象外。個別欠陥未確認|保留。3D資料の権利/容量を一枚絵の通常起動負荷にしない。|
|[EXT-004 アニメ・漫画・DTP一式](../product-planning/features/EXT.md#ext-004)|対象外 / 全機能→将来候補・対象外→アニメ・漫画・DTP一式の範囲説明。検索DOM到達（説明のみ）|範囲境界確認・処理評価対象外。個別欠陥未確認|対象外は用途一式。文字/網点等の交差機能まで削除しない。|
|[EXT-005 自由キャンバスと遠隔操作](../product-planning/features/EXT.md#ext-005)|保留 / 全機能→将来候補・対象外→自由キャンバスと遠隔操作の範囲説明。検索DOM到達（説明のみ）|範囲境界確認・処理評価対象外。個別欠陥未確認|保留。接続喪失時の遠隔入力役割と有限文書への移行は未検証。|

## CLP — コピー・貼り付け（4件）

|正式ID・名称 / 仕様|現行範囲・操作入口|判定・指摘|個別の反例・追加検証（未実施を含む）|
|---|---|---|---|
|[CLP-001 コピー・切取・貼付](../product-planning/features/CLP.md#clp-001)|対象 / Workspace「作品」→コピー・貼り付け→コピー・切取・貼付。検索DOM到達|要是正/要判断。[AUD-001](findings.md#aud-001)|OS Clipboard拒否でも内部Copy成功後だけCutし、Pasteは別Transactionにする。|
|[CLP-002 統合コピー・同位置貼付](../product-planning/features/CLP.md#clp-002)|対象 / Workspace「作品」→コピー・貼り付け→統合コピー・同位置貼付。検索DOM到達|設計記載あり・品質未判定。個別欠陥未確認|同位置貼付の元座標とICCを保持し、Proof/資料を統合像へ含めない。|
|[CLP-003 文書間の編集データ移送](../product-planning/features/CLP.md#clp-003)|対象 / Workspace「作品」→コピー・貼り付け→文書間の編集データ移送。検索DOM到達|設計記載あり・品質未判定。個別欠陥未確認|複数文書間でMask/パスのIDを再割当し、元文書参照を誤共有しない。|
|[CLP-004 システム共有・ドロップ](../product-planning/features/CLP.md#clp-004)|対象 / Workspace「作品」→コピー・貼り付け→システム共有・ドロップ。検索DOM到達|設計記載あり・品質未判定。個別欠陥未確認|Drop先が資料か作品かを明示し、権限拒否で原状態を守る。|

## PIX — ピクセル制作（3件）

|正式ID・名称 / 仕様|現行範囲・操作入口|判定・指摘|個別の反例・追加検証（未実施を含む）|
|---|---|---|---|
|[PIX-001 1px・整数・アンチエイリアスOFF](../product-planning/features/PIX.md#pix-001)|対象 / Workspace「プロパティ」→ピクセル制作→1px・整数・アンチエイリアスOFF。検索DOM到達|設計記載あり・品質未判定。個別欠陥未確認|表示Zoom中でも1pxの整数被覆とAA OFFを保持する。|
|[PIX-002 画素を守る変形と出力](../product-planning/features/PIX.md#pix-002)|対象 / Workspace「プロパティ」→ピクセル制作→画素を守る変形と出力。検索DOM到達|設計記載あり・品質未判定。個別欠陥未確認|整数移動/90度回転の可逆性と、非整数拡大の明示確認を検査する。|
|[PIX-003 固定パレット・Indexed候補](../product-planning/features/PIX.md#pix-003)|保留 / 全機能→ピクセル制作→固定パレット・Indexed候補の範囲説明。検索DOM到達（説明のみ）|範囲境界確認・処理評価対象外。個別欠陥未確認|保留。固定PaletteとIndexed文書の採否を一括して実行可にしない。|
