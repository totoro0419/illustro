# Illustro｜第2ラウンド：残作業のみを7群へ再編（2026-11-22）

> **ドラフトの新しい実装・検証計画**。正式仕様や現在動く製品コードは変更しない。「機能名がある」「コードファイルがある」「自動検査のジョブが成功した」だけで製品機能全体を完成扱いにしない。

## 1. 第2ラウンドの目的

旧C01〜C17の開発群を単に続けるのではなく、**正式247機能のうち今の製品に必要な236件**について、既存で確認できた実装部分を保護したまま、**未完成・不足・完成確認が足りない部分だけを第2ラウンドに割り当てる**。

- 正式正本：[DESIGN_AUTHORITY](../DESIGN_AUTHORITY.md)、[採否表](../product-planning/FINAL_PRODUCT_SCOPE.json)、[247件の個別仕様](../product-planning/features.json)
- コードの照合基準：`quality/C03-C10-integration` / `49474fd56b36d91425e5df81f9c135c0424aecb4`。ベースが進んだときは影響する項目だけ再照合。
- 旧155件の根拠：[PR #107](https://github.com/totoro0419/illustro/pull/107) の監査資料。全247件の元割当：[PR #108](https://github.com/totoro0419/illustro/pull/108)。
- **全247件のIDを管理**：必須236、保留10、対象外1。後者11件は再投入しない。
- JSON詳細台帳：[ROUND2-REMAINING-7-GROUPS.json](ROUND2-REMAINING-7-GROUPS.json) に全ID、細かな仕様、残条件、根拠、旧品質指摘を保存。

## 2. すでにあるものと残りを分離

| 区分 | 件数 | 第2ラウンドでの扱い |
|---|---:|---|
| **既存実装を確認したため再実装しない枠** | **91** | 旧Aの91件。関連する処理・UI・テストの存在は旧監査で確認。**正式な完成認定ではない**。製品としての不足が判明すれば、その不足だけ追加 |
| **一部実装・未実装・不具合の指摘あり** | **48** | 旧部分完成34、旧品質問題1、今回一部実装12、未実装1。現行コードで差を確かめ、残りだけ修正 |
| **実装充足候補** | **16** | 「完成」かもしれないが旧判定を引き継いだだけ。コードと実行検査で完成を確認したものは作業から除外 |
| **現行コードでの実装状況が未照合** | **81** | C11以降を中心に、既存処理を探索。**未実装と決めつけず**不足のみ追加 |
| **第2ラウンドの残作業候補** | **145** | 確定不足と要判定を分け、7群に配分 |
| 必須対象外 | 11 | 保留10・対象外1。別管理 |

**注意：145件は「未実装145件」ではない。** 今回の作業で未達を確認したら実装し、実装が足りていると証明できればそのIDの残作業は解消。旧A91件も最終的な製品受入試験からは除外しない。

**既に終わった操作検査の保存**：827操作のうち752 PASSという歴史的な実操作の記録は保持し、対応する操作だけの証拠に使う。今回155+αの全機能PASSとはみなさない。現在の`49474fd`については[統合CI](https://github.com/totoro0419/illustro/actions/runs/44916171470)成功の記録があるが、これは全機能の操作合格ではない。

## 3. 第2ラウンドの7群

| 新群 | 残作業候補 | 目的・主要範囲 |
|---|---:|---|
| **R2-01** | **33** | 基本描画・入力・レイヤー・履歴・保存 |
| **R2-02** | **20** | 塗りつぶし・線画認識・カラー操作・UI |
| **R2-03** | **8** | 選択・コピー・切り抜き・変形・非破壊合成 |
| **R2-04** | **10** | 作品・素材・資料・定規・図形・ベクター・文字 |
| **R2-05** | **18** | 混色・水彩風・ごみ取り・修復・ぼかし |
| **R2-06** | **43** | 色調/階調・特殊効果・色管理・各種入出力 |
| **R2-07** | **13** | 制作記録・自動化・AI補助・全体受入 |

**合計 145件。** それ以外に旧品質指摘129件を、元の識別番号のまま横断的に確認する（145件とは重複計上しない）。第7群は既存実装91件を含む全236機能の最終ゲートを担当する。

## 4. 全145件の残作業候補と実装・確認の方針

### R2-01｜基本描画・入力・レイヤー・履歴・保存（33件）

描く→編集→戻す→保存の基盤を維持し、不足だけ補修。対象の元C群：C01・C02・C03。

| ID・機能 | 現在分かっている状態 | 今回実施する不足部分・確認 |
|---|---|---|
| CAN-001 新規作品 | 旧調査で一部完成 | sRGB以外の対応プロファイル、色管理全体、物理端末の作成性能 |
| CAN-002 表示移動・拡縮・回転 | 旧調査で一部完成 | 実機で描画中・離筆直後・保存中の反応と座標確認 |
| CAN-003 Fit・100%・表示反転 | 旧調査で一部完成 | 端末・解像度をまたぐ座標、反転表示を含む書出しの網羅試験 |
| CAN-004 高倍率・ピクセル確認 | 旧調査で一部完成 | 6400%が現行上限。極端な倍率や端末横断の画素位置検証、反復表示時のグリッド |
| CAN-008 シームレス反復描画 | 旧調査で一部完成 | 反復数指定、元タイル境界と表示設定の復元、境界重複の網羅 |
| CAN-009 文書属性・テンプレート | 旧調査で一部完成 | ガイド等を選んで含める操作、背景が編集された作品の作成時設定を復元する仕組み |
| INP-001 入力役割の切替 | 旧調査で一部完成 | 入力状態の案内、対応端末で役割の切替と衝突を確認 |
| INP-002 筆圧・傾き・方位・回転 | 旧調査で一部完成 | 機器別の未取得表示、全体の筆圧校正、物理センサー・折返し検証 |
| INP-003 ペンボタン・後端消しゴム | 旧調査で一部完成 | 実入力を捕捉して単発/保持/切替を割当、機器の対応状態、物理ペン確認 |
| INP-004 手のひら・誤接触対策 | 旧調査で一部完成 | 実機で手のひらと意図した指操作を比較、抑止状態の案内。離筆直後の入力停止は原因未確定 |
| INP-005 割込み・接続喪失 | 旧調査で一部完成 | 受理部分の救出、回復記録、物理切断 |
| INP-006 カーソル・接地点表示 | 旧調査で一部完成 | 傾き・先端形状・太さの実寸と表示の照合、最小径の設定 |
| INP-007 高頻度入力の忠実性 | 旧調査で一部完成 | 時系列と筆圧の診断UI、実機高頻度入力から最終画素までの独立測定 |
| BRU-001 基本ブラシと消しゴム | 旧調査で一部完成 | 全基本筆の正式数値と筆跡、入り抜きの既定値、端末別比較 |
| BRU-002 サイズ・不透明度・流量 | 旧調査で一部完成 | 数値境界・連動設定・全端末と各描画方式での実画素比較。最新スライダー仕様のPR #106は未統合 |
| BRU-003 筆圧・速度・位置補正 | 既知の品質問題 | 速い曲線のカクつきと低速補正の弱さ、補正前後・仮線と本線の整合 |
| BRU-004 プリセット検索・履歴・お気に入り | 旧調査で一部完成 | 描いた線に保持されたブラシ情報からの取得、正式タグと履歴状態の網羅 |
| BRU-005 ブラシ編集・試し描き | 旧調査で一部完成 | 全粒子・変形設定と、本番筆と同じ全設定での試筆を確認 |
| BRU-006 入力からの変調 | 旧調査で一部完成 | 始終端の変調、詳細カーブ、硬さ・混色・水・顔料などの出力と全組み合わせ |
| BRU-007 テクスチャ・紙質ブラシ | 旧調査で一部完成 | 複数素材と保存依存の網羅、端末・描画方式をまたぐ比較 |
| BRU-008 強制入り抜き | 旧調査で一部完成 | 各長さ単位・不透明度・形と短線/長線の実機比較 |
| BRU-009 連続描画・重ね塗り・合成 | 旧調査で一部完成 | 背面描画・Alpha関連、重ね塗りと一筆内蓄積の全モード |
| BRU-010 定規・選択との併用 | 旧調査で一部完成 | ガイドと選択の範囲・濃さを描画と消去に作用させ、履歴・再現まで接続 |
| BRU-011 ブラシ版と結果の再現 | 旧調査で一部完成 | 外部素材・版の欠落・互換状態、端末を越える完全再現 |
| BRU-012 一時消しゴム・前ツール復帰 | 旧調査で一部完成 | 実機で接地中のボタン操作 |
| LAY-001 追加・選択・描画対象固定 | 実装充足候補・要検証 | 完成候補を現行コードとテストで確認。満たせば再実装しない |
| LAY-002 表示・不透明度・合成 | 実装充足候補・要検証 | 完成候補を現行コードとテストで確認。満たせば再実装しない |
| LAY-003 グループ・並替・複数選択 | 実装充足候補・要検証 | 完成候補を現行コードとテストで確認。満たせば再実装しない |
| LAY-007 名前・タグ・検索・フィルター | 実装充足候補・要検証 | 完成候補を現行コードとテストで確認。満たせば再実装しない |
| HIS-001 Undo・Redo | 旧調査で一部完成 | 対象名・履歴範囲の提示と、その他の操作単位の網羅 |
| SAV-003 ネイティブ保存・Save As | 旧調査で一部完成 | 保存時点に対する以後のすべての履歴操作の分離、全種依存と外部端末・ファイル競合の実機確認。旧T673/T674は現行main.tsにID衝突選択分岐が存在 |
| SAV-008 バックアップ・版移行・旧形式 | 一部実装・不足確認 | 異なる全旧形式・外部依存の互換と複数作品のバックアップ一括復元は未充足または証拠不足 |
| PIX-001 1px・整数・アンチエイリアスOFF | 一部実装・不足確認 | 描画用の1px整数位置固定とアンチエイリアスOFFを独立操作する専用設定が確認できない |

**旧品質指摘：13件。** C03-001、C03-002、C03-003、C03-004、C03-005、C03-006、C03-007、C03-008、C03-009、C03-010、C03-011、C03-012、C03-013。過去に修正済みの項目はそのソースとテストを照合し、未解決部分だけ扱う。

**利用者が報告した体験上の問題（現HEADで再確認）：** 手ぶれ補正が速い曲線の角つきを抑えられず、遅い線でも効果が弱い／太いエアブラシを含む描画途中の仮線追従が重い。筆種をまたいで快適性／鉛筆・細ペン確定時の一瞬のチラつき、ペンの入り抜きの凸凹／加算発光：白色を入れた結果が期待どおり白になるかの合成精度。

### R2-02｜塗りつぶし・線画認識・カラー操作・UI（20件）

通常塗りの直感性・正確性を最優先。カラー・操作入口も統合。対象の元C群：C04・C08。

| ID・機能 | 現在分かっている状態 | 今回実施する不足部分・確認 |
|---|---|---|
| COL-001 色相環・HSV・RGB・HSL | 旧調査で一部完成 | 作品色空間と不透明度の全操作、タッチ条件でのブラウザー再現確認 |
| COL-002 色履歴・前色・背景色 | 実装充足候補・要検証 | 完成候補を現行コードとテストで確認。満たせば再実装しない |
| COL-009 色温度・全体色調 | 現行コードで未照合 | 現行コードの処理/入口/保存を調査し未達のみ実装 |
| COL-011 知覚的な色選択・色域マスク | 不足をコードで確認 | 必要能力の知覚的L/C/H空間の選択・色域マスクの編集/保存/色域内表示がcolor/model.ts、orbit.ts、panel.ts、harmony.ts、および現行UIに存在しない。既存の色相環を同等機能と取り違えない |
| FIL-001 通常塗りつぶし | 実装充足候補・要検証 | 完成候補を現行コードとテストで確認。満たせば再実装しない |
| UI-001 明色Auroraの制作画面 | 旧調査で一部完成 | 正式配色と既存承認配色の差、操作入口とレイアウト全体の照合 |
| UI-003 コンテキスト操作・対象帯 | 一部実装・不足確認 | 描画先/塗り参照元/選択/未確定状態を常時同じ安定した対象帯にまとめる統合入口が不足 |
| GST-001 既定ジェスチャーと代替 | 旧調査で一部完成 | 二指Undo/三指Redoの候補・誤認識比較、全ジェスチャー設定 |
| GST-003 指・ペン・マウス割当 | 旧調査で一部完成 | 実入力の捕捉、文脈と競合、単発/保持/切替の割当と初期値復帰 |
| GST-004 一時ツールと戻り先 | 旧調査で一部完成 | 全割当の共通管理、実機で解放/切断・前の対象への復帰 |
| DEV-001 PC操作 | 旧調査で一部完成 | トラックパッド・高DPI外部画面・複数機器同時操作・密度設定 |
| DEV-002 タブレット操作 | 旧調査で一部完成 | 実機で片手・分割・キーボード着脱、確定操作が隠れないこと |
| DEV-003 スマートフォン操作 | 旧調査で一部完成 | 親指で主要機能に到達できること、下部シート・対象と確定の同時表示の網羅 |
| DEV-005 能力差・低負荷・端末間移送 | 一部実装・不足確認 | 実入力の取得可否・実測負荷を機能別に説明する統合画面が見当たらず、能力差の提示は限定的 |
| A11-001 文字・UI・コントラスト拡大 | 現行コードで未照合 | 現行コードの処理/入口/保存を調査し未達のみ実装 |
| A11-002 単指・非ドラッグ代替 | 現行コードで未照合 | 現行コードの処理/入口/保存を調査し未達のみ実装 |
| A11-003 キーボード・支援技術 | 現行コードで未照合 | 現行コードの処理/入口/保存を調査し未達のみ実装 |
| A11-004 色説明・グレー・補正 | 現行コードで未照合 | 現行コードの処理/入口/保存を調査し未達のみ実装 |
| A11-005 動き・音・振動 | 現行コードで未照合 | 現行コードの処理/入口/保存を調査し未達のみ実装 |
| A11-006 日本語・翻訳・単位 | 現行コードで未照合 | 現行コードの処理/入口/保存を調査し未達のみ実装 |

**旧品質指摘：31件。** C04-001、C04-002、C04-003、C04-004、C04-005、C04-006、C04-007、C04-008、C04-009、C04-010、C04-011、C04-012、C04-013、C04-014、C04-015、C08-001、C08-002、C08-003、C08-004、C08-005、C08-006、C08-007、C08-008、C08-009、C08-010、C08-011、C08-012、C08-013、C08-014、C08-015、C08-016。過去に修正済みの項目はそのソースとテストを照合し、未解決部分だけ扱う。

**利用者が報告した体験上の問題（現HEADで再確認）：** 通常塗りつぶしの操作・結果が十分に使えるか。選択→候補→適用の余分な操作と正しい塗り・保存／スライダー項目名左上、数値右上、タップで直接数値入力、設定保存と同期／色・選択・塗りの画面で情報を減らし過ぎず操作の優先度と導線を整理。

**必須の最優先検査：** FIL-001 は、タップ/ドラッグから正しい塗り→取消→Undo→保存復元まで成立させる。ボタンを複数押すだけで「完成」にしない。

### R2-03｜選択・コピー・切り抜き・変形・非破壊合成（8件）

範囲保持と画素編集を安全に接続。対象の元C群：C06・C07。

| ID・機能 | 現在分かっている状態 | 今回実施する不足部分・確認 |
|---|---|---|
| CAN-005 トリミング・キャンバス拡張 | 一部実装・不足確認 | 正式仕様で既定とする外側画素保持/完全切除の別コマンドがない。main.ts:2503 はcropCanvasで外の画素を直接落とす。Crop後に保存・履歴整理しても外側を再編集する機能はない |
| CAN-006 画像サイズ変更 | 一部実装・不足確認 | 比率ロック標準・変更前後の画質比較/結果寸法プレビュー・DPIだけの変更と連動説明が現行geometryDialogで不足 |
| CAN-010 キャンバス外の内容保持 | 一部実装・不足確認 | Crop後の領域外の元画素を通常編集で保持・再表示する専用経路が不明確 |
| SEL-001 矩形・楕円・投げ縄・多角形 | 実装充足候補・要検証 | 完成候補を現行コードとテストで確認。満たせば再実装しない |
| SEL-007 境界移動と内容移動 | 一部実装・不足確認 | 選択境界そのものの拡縮・回転を濃度Maskを守って直接変形する操作がない。TRN側の画素変形で代用せず専用境界変形を追加 |
| TRN-001 移動・拡縮・回転・反転 | 実装充足候補・要検証 | 完成候補を現行コードとテストで確認。満たせば再実装しない |
| CLP-003 文書間の編集データ移送 | 一部実装・不足確認 | 異なる作品色空間の色差や必要素材を含むポータブル移送/不足素材の解決は実装が限定的。フォントIDは通知するが元作品の依存素材データをまとめて移送しない |
| PIX-002 画素を守る変形と出力 | 一部実装・不足確認 | 整数倍・端数位置/回転に対して画素を守る専用の条件チェック/強制しない警告と、ピクセル用途の作品出力UIは不足 |

**旧品質指摘：33件。** C06-001、C06-002、C06-003、C06-004、C06-005、C06-006、C06-007、C06-008、C06-009、C06-010、C06-011、C06-012、C06-013、C06-014、C06-015、C06-016、C06-017、C07-001、C07-002、C07-003、C07-004、C07-005、C07-006、C07-007、C07-008、C07-009、C07-010、C07-011、C07-012、C07-013、C07-014、C07-015、C07-016。過去に修正済みの項目はそのソースとテストを照合し、未解決部分だけ扱う。

### R2-04｜作品・素材・資料・定規・図形・ベクター・文字（10件）

作品制作を支える編集道具・素材・文字を完成。対象の元C群：C05・C09・C10。

| ID・機能 | 現在分かっている状態 | 今回実施する不足部分・確認 |
|---|---|---|
| VEC-001 自由描線・パス・図形 | 実装充足候補・要検証 | 完成候補を現行コードとテストで確認。満たせば再実装しない |
| VEC-002 オブジェクト・点・ハンドル編集 | 実装充足候補・要検証 | 完成候補を現行コードとテストで確認。満たせば再実装しない |
| VEC-003 線幅・筆風・ベクター消去 | 一部実装・不足確認 | 線の途中の任意点で線幅を直接編集する操作・消去範囲の確定前の画面プレビューが現行UIから不足 |
| VEC-005 文字・縦横書き・IME | 実装充足候補・要検証 | 完成候補を現行コードとテストで確認。満たせば再実装しない |
| GUI-001 直線・平行・円・楕円定規 | 実装充足候補・要検証 | 完成候補を現行コードとテストで確認。満たせば再実装しない |
| GUI-004 図形・ベジェ・折線 | 実装充足候補・要検証 | 完成候補を現行コードとテストで確認。満たせば再実装しない |
| GRA-001 線形・放射・反射・角度 | 実装充足候補・要検証 | 完成候補を現行コードとテストで確認。満たせば再実装しない |
| REF-006 資料保存・不足・権利メモ | 一部実装・不足確認 | 資料の権利・出典メモを利用者が入力/修正するUIが見当たらない。BoardItem.notesは保存構造にあるがreferenceBoard.tsで編集に接続されていない |
| SAV-001 作品一覧・検索・整理 | 実装充足候補・要検証 | 完成候補を現行コードとテストで確認。満たせば再実装しない |
| SAV-002 複製・削除・ゴミ箱 | 実装充足候補・要検証 | 完成候補を現行コードとテストで確認。満たせば再実装しない |

**旧品質指摘：52件。** C05-001、C05-002、C05-003、C05-004、C05-005、C05-006、C05-007、C05-008、C05-009、C05-010、C05-011、C05-012、C05-013、C05-014、C05-015、C05-016、C05-017、C05-018、C05-019、C05-020、C09-001、C09-002、C09-003、C09-004、C09-005、C09-006、C09-007、C09-008、C09-009、C09-010、C09-011、C09-012、C09-013、C09-014、C09-015、C09-016、C10-001、C10-002、C10-003、C10-004、C10-005、C10-006、C10-007、C10-008、C10-009、C10-010、C10-011、C10-012、C10-013、C10-014、C10-015、C10-016。過去に修正済みの項目はそのソースとテストを照合し、未解決部分だけ扱う。

**利用者が報告した体験上の問題（現HEADで再確認）：** レイヤー操作のボタン過多・直感性不足、プレビューを全レイヤーに適切に表示。

### R2-05｜混色・水彩風・ごみ取り・修復・ぼかし（18件）

画材表現と、点ごみ/不要線/汚れの修復を完成。対象の元C群：C11・C13。

| ID・機能 | 現在分かっている状態 | 今回実施する不足部分・確認 |
|---|---|---|
| WET-001 ぼかし・引きずり・混色 | 現行コードで未照合 | 現行コードの処理/入口/保存を調査し未達のみ実装 |
| WET-002 水彩・顔料・にじみ | 現行コードで未照合 | 現行コードの処理/入口/保存を調査し未達のみ実装（限定採用の範囲のみ） |
| WET-005 紙・吸収・質感編集 | 現行コードで未照合 | 現行コードの処理/入口/保存を調査し未達のみ実装（限定採用の範囲のみ） |
| WET-006 混色・試し描きパッド | 現行コードで未照合 | 現行コードの処理/入口/保存を調査し未達のみ実装 |
| WET-007 厚塗り・油彩・乾式媒体 | 現行コードで未照合 | 現行コードの処理/入口/保存を調査し未達のみ実装 |
| FX-003 ぼかし | 現行コードで未照合 | 現行コードの処理/入口/保存を調査し未達のみ実装 |
| FX-004 鮮鋭化・ノイズ・掃除 | 現行コードで未照合 | 現行コードの処理/入口/保存を調査し未達のみ実装 |
| FX-007 修復・パッチ・クローン | 現行コードで未照合 | 現行コードの処理/入口/保存を調査し未達のみ実装 |
| FX-116 ガウスぼかし | 現行コードで未照合 | 現行コードの処理/入口/保存を調査し未達のみ実装 |
| FX-117 ボックスぼかし | 現行コードで未照合 | 現行コードの処理/入口/保存を調査し未達のみ実装 |
| FX-118 移動ぼかし | 現行コードで未照合 | 現行コードの処理/入口/保存を調査し未達のみ実装 |
| FX-119 放射ぼかし | 現行コードで未照合 | 現行コードの処理/入口/保存を調査し未達のみ実装 |
| FX-120 レンズ・深度ぼかし | 現行コードで未照合 | 現行コードの処理/入口/保存を調査し未達のみ実装 |
| FX-121 シャープ | 現行コードで未照合 | 現行コードの処理/入口/保存を調査し未達のみ実装 |
| FX-122 アンシャープマスク | 現行コードで未照合 | 現行コードの処理/入口/保存を調査し未達のみ実装 |
| FX-123 High Pass | 現行コードで未照合 | 現行コードの処理/入口/保存を調査し未達のみ実装 |
| FX-124 ノイズ | 現行コードで未照合 | 現行コードの処理/入口/保存を調査し未達のみ実装 |
| FX-125 Median・ごみ取り | 現行コードで未照合 | 現行コードの処理/入口/保存を調査し未達のみ実装 |

**旧品質指摘：0件。** 元129件の単独担当なし。過去に修正済みの項目はそのソースとテストを照合し、未解決部分だけ扱う。

**ゴミ取りの細目：** FX-125 はMedianの強さ・点ゴミの大きさ/閾値・選択範囲/マスク・細線保護・前後比較・再編集、FX-007 はHealing/Patch/Cloneの3操作・参照元・ソース点・一筆Undo・保存をそれぞれ検査する。

### R2-06｜色調/階調・特殊効果・色管理・各種入出力（43件）

個別の効果を正確に適用し、再編集・保存・互換性を保持。対象の元C群：C12・C14・C15。

| ID・機能 | 現在分かっている状態 | 今回実施する不足部分・確認 |
|---|---|---|
| COL-006 ICC保持・色変換 | 現行コードで未照合 | 現行コードの処理/入口/保存を調査し未達のみ実装 |
| COL-007 広色域・高精度・HDR | 現行コードで未照合 | 現行コードの処理/入口/保存を調査し未達のみ実装 |
| COL-008 Soft Proof・色域警告 | 現行コードで未照合 | 現行コードの処理/入口/保存を調査し未達のみ実装 |
| FX-001 色調整レイヤー | 現行コードで未照合 | 現行コードの処理/入口/保存を調査し未達のみ実装 |
| FX-002 高度色調整 | 現行コードで未照合 | 現行コードの処理/入口/保存を調査し未達のみ実装 |
| FX-005 変位・オフセット・モザイク | 現行コードで未照合 | 現行コードの処理/入口/保存を調査し未達のみ実装 |
| FX-006 網点・線画抽出・縁・発光 | 現行コードで未照合 | 現行コードの処理/入口/保存を調査し未達のみ実装 |
| FX-008 フィルター順序・マスク・強度 | 現行コードで未照合 | 現行コードの処理/入口/保存を調査し未達のみ実装 |
| FX-009 明示的な焼込み | 現行コードで未照合 | 現行コードの処理/入口/保存を調査し未達のみ実装 |
| IO-002 PNG・JPEG・WebP | 現行コードで未照合 | 現行コードの処理/入口/保存を調査し未達のみ実装 |
| IO-003 PSD・PSB互換 | 現行コードで未照合 | 現行コードの処理/入口/保存を調査し未達のみ実装 |
| IO-004 ORA・TIFF | 現行コードで未照合 | 現行コードの処理/入口/保存を調査し未達のみ実装 |
| IO-005 SVG | 現行コードで未照合 | 現行コードの処理/入口/保存を調査し未達のみ実装 |
| IO-006 EXR・AVIF・HEIF | 現行コードで未照合 | 現行コードの処理/入口/保存を調査し未達のみ実装 |
| IO-007 出力色・メタデータ | 現行コードで未照合 | 現行コードの処理/入口/保存を調査し未達のみ実装 |
| IO-008 レイヤー・選択範囲・一括出力 | 現行コードで未照合 | 現行コードの処理/入口/保存を調査し未達のみ実装 |
| IO-009 印刷向け確認 | 現行コードで未照合 | 現行コードの処理/入口/保存を調査し未達のみ実装 |
| FX-101 明るさ・コントラスト | 現行コードで未照合 | 現行コードの処理/入口/保存を調査し未達のみ実装 |
| FX-102 レベル | 現行コードで未照合 | 現行コードの処理/入口/保存を調査し未達のみ実装 |
| FX-103 トーンカーブ | 現行コードで未照合 | 現行コードの処理/入口/保存を調査し未達のみ実装 |
| FX-104 露出 | 現行コードで未照合 | 現行コードの処理/入口/保存を調査し未達のみ実装 |
| FX-105 色相・彩度・明度 | 現行コードで未照合 | 現行コードの処理/入口/保存を調査し未達のみ実装 |
| FX-106 自然な彩度 | 現行コードで未照合 | 現行コードの処理/入口/保存を調査し未達のみ実装 |
| FX-107 カラーバランス | 現行コードで未照合 | 現行コードの処理/入口/保存を調査し未達のみ実装 |
| FX-108 色温度・Tint | 現行コードで未照合 | 現行コードの処理/入口/保存を調査し未達のみ実装 |
| FX-109 白黒 | 現行コードで未照合 | 現行コードの処理/入口/保存を調査し未達のみ実装 |
| FX-110 チャンネルミキサー | 現行コードで未照合 | 現行コードの処理/入口/保存を調査し未達のみ実装 |
| FX-111 選択色補正 | 現行コードで未照合 | 現行コードの処理/入口/保存を調査し未達のみ実装 |
| FX-112 反転 | 現行コードで未照合 | 現行コードの処理/入口/保存を調査し未達のみ実装 |
| FX-113 階調化 | 現行コードで未照合 | 現行コードの処理/入口/保存を調査し未達のみ実装 |
| FX-114 二値化 | 現行コードで未照合 | 現行コードの処理/入口/保存を調査し未達のみ実装 |
| FX-115 LUT | 現行コードで未照合 | 現行コードの処理/入口/保存を調査し未達のみ実装 |
| FX-126 モザイク | 現行コードで未照合 | 現行コードの処理/入口/保存を調査し未達のみ実装 |
| FX-127 オフセット | 現行コードで未照合 | 現行コードの処理/入口/保存を調査し未達のみ実装 |
| FX-128 変位 | 現行コードで未照合 | 現行コードの処理/入口/保存を調査し未達のみ実装 |
| FX-129 網点・スクリーントーン | 現行コードで未照合 | 現行コードの処理/入口/保存を調査し未達のみ実装 |
| FX-130 輪郭検出・線画抽出 | 現行コードで未照合 | 現行コードの処理/入口/保存を調査し未達のみ実装 |
| FX-131 線画色変更 | 現行コードで未照合 | 現行コードの処理/入口/保存を調査し未達のみ実装 |
| FX-132 内外の縁取 | 現行コードで未照合 | 現行コードの処理/入口/保存を調査し未達のみ実装 |
| FX-133 内外の影 | 現行コードで未照合 | 現行コードの処理/入口/保存を調査し未達のみ実装 |
| FX-134 内外光彩 | 現行コードで未照合 | 現行コードの処理/入口/保存を調査し未達のみ実装 |
| FX-135 色・グラデ・模様Overlay | 現行コードで未照合 | 現行コードの処理/入口/保存を調査し未達のみ実装 |
| FX-136 ベベル・エンボス | 現行コードで未照合 | 現行コードの処理/入口/保存を調査し未達のみ実装 |

**旧品質指摘：0件。** 元129件の単独担当なし。過去に修正済みの項目はそのソースとテストを照合し、未解決部分だけ扱う。

### R2-07｜制作記録・自動化・AI補助・全体受入（13件）

新たな制作補助と全体の性能/操作/互換/実機品質を検証。対象の元C群：C16。

| ID・機能 | 現在分かっている状態 | 今回実施する不足部分・確認 |
|---|---|---|
| AUT-001 記録・編集・再生 | 現行コードで未照合 | 現行コードの処理/入口/保存を調査し未達のみ実装 |
| AUT-002 実行時パラメータ・対象指定 | 現行コードで未照合 | 現行コードの処理/入口/保存を調査し未達のみ実装 |
| AUT-003 実行比較・失敗・取消 | 現行コードで未照合 | 現行コードの処理/入口/保存を調査し未達のみ実装 |
| AUT-004 バッチ出力 | 現行コードで未照合 | 現行コードの処理/入口/保存を調査し未達のみ実装 |
| AUT-005 高速入口・共有 | 現行コードで未照合 | 現行コードの処理/入口/保存を調査し未達のみ実装 |
| REC-001 Timelapse記録と再生 | 現行コードで未照合 | 現行コードの処理/入口/保存を調査し未達のみ実装 |
| REC-002 動画の範囲・速度・解像度 | 現行コードで未照合 | 現行コードの処理/入口/保存を調査し未達のみ実装 |
| REC-003 記録の除外・機密資料 | 現行コードで未照合 | 現行コードの処理/入口/保存を調査し未達のみ実装 |
| REC-004 実作業時間 | 現行コードで未照合 | 現行コードの処理/入口/保存を調査し未達のみ実装 |
| AI-001 選択・領域の補助 | 現行コードで未照合 | 現行コードの処理/入口/保存を調査し未達のみ実装 |
| AI-002 色・陰影の候補 | 現行コードで未照合 | 現行コードの処理/入口/保存を調査し未達のみ実装 |
| AI-003 整理・修復の候補 | 現行コードで未照合 | 現行コードの処理/入口/保存を調査し未達のみ実装 |
| AI-004 送信・費用・生成の境界 | 現行コードで未照合 | 現行コードの処理/入口/保存を調査し未達のみ実装 |

**旧品質指摘：0件。** 元129件の単独担当なし。過去に修正済みの項目はそのソースとテストを照合し、未解決部分だけ扱う。

## 5. 再実装対象から外した91件（既存コード保護・最終受入は別）

下記は**前回「主要な実装が存在する」と確認された91件**であり、*完全に完成したと独立認定された91件*ではない。第2ラウンドで機能を一から作り直さないために分けている。実動作や正式仕様に不足が出れば、その不足分だけ新群へ追加する。

| 旧ID | 機能名 | 関連コード・テスト根拠 |
|---|---|---|
| CAN-007 | 複数作品・文書切替 | apps/editor/src/main.ts:3538 openWork / apps/editor/src/persistence/workLibrary.test.ts |
| INP-008 | キーボードとIMEの調停 | apps/editor/src/ui/shortcutSettings.ts:60 isText / apps/editor/src/artwork/textStyles.test.ts |
| COL-003 | 作品・資料スポイト | apps/editor/src/color/eyedropperSettings.ts:85 apply controls / apps/editor/src/color/eyedropperSettings.test.ts |
| COL-004 | パレット編集・交換 | apps/editor/src/color/model.ts:147 selectPalette / apps/editor/src/color/artworkPalette.test.ts |
| COL-005 | 調和・明度・色覚支援 | apps/editor/src/color/harmony.ts:45 harmonyColors / apps/editor/src/color/harmonyProof.test.ts |
| FIL-002 | 隙間補完・塗り残し修正 | apps/editor/src/fill/pixels.ts:79 fillBoundaries / 267 unpaintedFillEdges / apps/editor/src/fill/incrementalBoundary.test.ts |
| FIL-003 | 参照元・塗り先の明示 | apps/editor/src/fill/reference.ts:14 readFillReference / apps/editor/src/fill/referenceSelection.test.ts |
| FIL-004 | 連続・ドラッグ塗り | apps/editor/src/fill/pixels.ts:284 fillMask / 333 contiguous / apps/editor/src/fill/liveRegionPreview.test.ts |
| FIL-005 | 囲って塗る・消す | apps/editor/src/fill/pixels.ts:292 lasso / 295 lasso-closed / apps/editor/src/fill/pixels.test.ts |
| FIL-006 | なぞって領域指定 | apps/editor/src/fill/pixels.ts:308 method line / apps/editor/src/fill/liveRegionPreview.test.ts |
| FIL-007 | 線画領域基準の塗り・再配色 | apps/editor/src/fill/pixels.ts:218 buildRegions / apps/editor/src/fill/fillChange.test.ts |
| FIL-008 | 色指示による面の補助 | apps/editor/src/fill/pixels.ts:419 paintColorHints / apps/editor/src/fill/colorHintPlacement.test.ts |
| FIL-009 | 塗り結果のその場修正 | apps/editor/src/fill/panel.ts:563 adjustPaint / apps/editor/src/fill/fillChange.test.ts |
| FIL-010 | 透明塗り・下地・自動彩色レイヤー | apps/editor/src/main.ts:4477 addRasterSnapshotAbove / apps/editor/src/fill/pixels.test.ts |
| LIN-001 | ラスター線画から領域用レイヤー生成 | apps/editor/src/fill/pixels.ts:218 buildRegions / apps/editor/src/fill/changedRegions.test.ts |
| LIN-002 | 境界・接続・閉領域・穴の表示 | apps/editor/src/fill/pixels.ts:35 regionTopology / apps/editor/src/fill/detailPreview.test.ts |
| LIN-003 | 手動の接続・分割・統合 | apps/editor/src/fill/changedRegions.ts:7 updateChangedRegions / apps/editor/src/fill/manualChangeEffect.test.ts |
| LIN-004 | 塗り・選択の共通参照 | apps/editor/src/fill/panel.ts:543 領域を選択範囲にする / apps/editor/src/fill/referenceSelection.test.ts |
| LIN-005 | 元線画変更後の比較更新 | apps/editor/src/fill/changedRegions.ts:7 updateChangedRegions / apps/editor/src/fill/changedRegions.test.ts |
| LIN-006 | 隙間候補・毛先・顎の補助 | apps/editor/src/fill/pixels.ts:450 suggestLocalGaps / 529 sharedBoundary / apps/editor/src/fill/incrementalBoundary.test.ts |
| LIN-007 | 未解決・低信頼・無効の扱い | packages/core/src/lineRegions.ts:10 review state / apps/editor/src/fill/fillChange.test.ts |
| LIN-008 | ベクター線画の領域利用 | apps/editor/src/fill/reference.ts:14 readFillReference / apps/editor/src/fill/referenceSelection.test.ts |
| LAY-004 | クリッピング・不透明度ロック | packages/core/src/transaction.ts:883 setLayerClipping / apps/editor/src/eraserIntegration.test.ts |
| LAY-005 | ピクセル・ベクターマスク | packages/core/src/transaction.ts:873 setVectorLayerMask / apps/editor/src/artwork/c03UiGuards.test.ts |
| LAY-006 | 複製・結合・統合コピー | apps/editor/src/main.ts:368 createLayerFromPixels / packages/core/src/layerAdd.test.ts |
| LAY-008 | 位置・内容・全体ロック | packages/core/src/transaction.ts:896 setLayerContentLocked / apps/editor/src/layerSelection.test.ts |
| LAY-009 | Solo・一時表示検査 | apps/editor/src/brushSurface.ts:setLayerCompPreview / apps/editor/src/ui/c04Quality.test.ts |
| LAY-010 | キャンバスから層選択 | apps/editor/src/brushSurface.ts:setLayerPick / apps/editor/src/layerSelection.test.ts |
| LAY-011 | レイヤーカンプ | packages/core/src/transaction.ts:594 saveLayerComp / packages/core/src/persistence.test.ts |
| LAY-012 | 空・非描画対象での開始 | apps/editor/src/brushSurface.ts:804 nonexistent white raster / packages/core/src/layerAdd.test.ts |
| SEL-002 | 色域・明度・自動選択 | apps/editor/src/selection/autoSelect.ts:8 selectFromPixels / apps/editor/src/selection/quality.test.ts |
| SEL-003 | 拡張・縮小・ぼかし・境界 | apps/editor/src/selection/mask.ts:122 featherMask / 147 growOrShrink / apps/editor/src/selection/quality.test.ts |
| SEL-004 | 全選択・解除・再選択・反転 | apps/editor/src/selection/mask.ts:63 invertSelection / 66 fullSelection / apps/editor/src/selection/quality.test.ts |
| SEL-005 | 線画領域・層内容から選択 | apps/editor/src/selection/autoSelect.ts:8 selectFromPixels / apps/editor/src/selection/quality.test.ts |
| SEL-006 | 保存選択・選択マスク | apps/editor/src/selection/store.ts:32 saveNamedSelection / 68 loadNamedSelection / apps/editor/src/selection/nativeCompression.test.ts |
| SEL-008 | 選択の表示・抑制 | apps/editor/src/selection/overlay.ts:39 render selection alpha / apps/editor/src/selection/quality.test.ts |
| TRN-002 | 自由・パース・傾斜 | apps/editor/src/transform/panel.ts:134 modes free/projective/skew / apps/editor/src/transform/c07Quality.test.ts |
| TRN-003 | メッシュ・ケージ・ワープ | apps/editor/src/transform/mesh.ts:11 gridMesh / 20 cageMesh / apps/editor/src/transform/warpArea.test.ts |
| TRN-004 | ゆがみ・液状化 | apps/editor/src/transform/liquify.ts:7 makeLiquifyStroke / 24 liquifyMapping / apps/editor/src/transform/warpArea.test.ts |
| TRN-005 | スナップ・整列・分布 | apps/editor/src/transform/layout.ts:alignLayers / apps/editor/src/transform/c07Quality.test.ts |
| TRN-006 | 補間・連続調整 | apps/editor/src/transform/interpolationAdvice.ts:9 recommendInterpolation / apps/editor/src/transform/interpolationAdvice.test.ts |
| TRN-007 | セッション内Undoと全体Undo | apps/editor/src/transform/panel.ts:609 undo.push(prior) / apps/editor/src/transform/workerSession.test.ts |
| TRN-008 | 非破壊変形と描画 | packages/core/src/layerDeformation.ts:33 LayerDeformation / packages/core/src/persistence.test.ts |
| VEC-004 | 簡略化・平滑化・ブーリアン | apps/editor/src/artwork/pathOperations.ts:12 simplifyPath / 27 smoothPath / 216 combineSha / apps/editor/src/artwork/linkedBooleans.test.ts |
| VEC-006 | フォント取込・不足解決 | apps/editor/src/artwork/fonts.ts:16 importFont / 89 fontOutlineCapability / apps/editor/src/artwork/textFontAssets.test.ts |
| VEC-007 | 文字のパス化・Raster化 | apps/editor/src/artwork/fonts.ts:220 outlineText / apps/editor/src/artwork/textFontAssets.test.ts |
| GUI-002 | 2D・等角・透視ガイド | apps/editor/src/artwork/ruler.ts:6 kinds perspective1/2/3 / apps/editor/src/artwork/guidedPath.test.ts |
| GUI-003 | 対称・放射・万華鏡 | apps/editor/src/strokeSymmetry.ts:8 normalizeSymmetry / apps/editor/src/symmetryStrokePreview.test.ts |
| GUI-005 | 描いた後の形状補正 | apps/editor/src/artwork/strokeCorrection.ts:13 correctionSuggestedShape / apps/editor/src/artwork/strokeCorrection.quality.test.ts |
| GUI-006 | 吸着表示・一時解除・範囲 | apps/editor/src/artwork/guidedPath.ts:7 snapArtworkPathToGuide / apps/editor/src/strokeGuide.quality.test.ts |
| GUI-007 | ガイド・図形プリセット | apps/editor/src/artwork/presets.ts:13 parsePreset / 25 place / apps/editor/src/artwork/shapeGradient.quality.test.ts |
| GRA-002 | 停止点・透明度・中間点 | packages/core/src/editableArtwork.ts:19 GradientStop midpoint / apps/editor/src/artwork/gradientSpread.test.ts |
| GRA-003 | 再編集・マスク・形状追従 | packages/core/src/editableArtwork.ts:20 EditableGradient follow / apps/editor/src/artwork/shapeGradient.quality.test.ts |
| GRA-004 | グラデーションマップ・階調 | apps/editor/src/artwork/gradientMap.ts:87 validateGradientMap / apps/editor/src/artwork/gradientMapExactCrop.test.ts |
| NDE-001 | 合成モードと比較 | packages/core/src/layerBlend.ts:3 LAYER_BLEND_MODES / apps/editor/src/artwork/alphaBands.test.ts |
| NDE-002 | 階調依存合成 | packages/core/src/layerBlend.ts:9 LayerTone / packages/core/src/gradientOptions.test.ts |
| NDE-003 | 編集可能な効果・変形 | packages/core/src/layerDeformation.ts:40 validateLayerDeformation / packages/core/src/layerDeformation.test.ts |
| NDE-004 | リンク・埋込・インスタンス | packages/core/src/layerImageLink.ts:9 validateLayerImageLink / apps/editor/src/assets/linkedImages.test.ts |
| NDE-005 | 安全な構造変換 | packages/core/src/layerGroups.ts:9 compositing mode / packages/core/src/layerGroupPacking.test.ts |
| REF-001 | 複数資料・グループ | apps/editor/src/assets/referenceBoardStore.ts:3 BoardItem group / apps/editor/src/assets/referenceBoardStore.test.ts |
| REF-002 | 移動・拡縮・回転・ピン | apps/editor/src/assets/referenceBoard.ts:599 pinned guard / apps/editor/src/assets/referenceFrameKey.test.ts |
| REF-003 | 反転・グレー・一時非表示 | apps/editor/src/assets/referenceBoard.ts:577 grayscale filter / apps/editor/src/assets/referenceBoardStore.test.ts |
| REF-004 | 資料採色と色の出典 | apps/editor/src/assets/referenceDirectSample.ts:12 referencePixelAtScreen / apps/editor/src/assets/referenceDirectSample.test.ts |
| REF-005 | Navigator・全体/細部別ビュー | apps/editor/src/assets/referenceBoard.ts:424 drawNavigator / apps/editor/src/assets/referenceFrameKey.test.ts |
| HIS-002 | 履歴一覧・比較 | apps/editor/src/ui/artworkHistoryView.ts:43 historyComparisonPreview / apps/editor/src/ui/artworkHistoryView.quality.test.ts |
| HIS-003 | 名前付きSnapshot | packages/core/src/transaction.ts:577 pinRevision / packages/core/src/persistence.test.ts |
| HIS-004 | 分岐・比較・復帰 | packages/core/src/transaction.ts:586 restoreRevision / packages/core/src/documentBranch.test.ts |
| HIS-005 | 部分復元・履歴ブラシ | apps/editor/src/historyBrush.ts:restoreHistoryPixels / apps/editor/src/historyBrush.test.ts |
| HIS-006 | 履歴の容量・保持範囲 | packages/core/src/coreDocument.ts:38 setHistoryUndoLimit / apps/editor/src/ui/historyThumbnailCache.test.ts |
| SAV-004 | 自動保護・保存状態 | apps/editor/src/persistence/coordinator.ts:212 drain / apps/editor/src/persistence/contiguousProtection.test.ts |
| SAV-005 | クラッシュ・背景終了復元 | apps/editor/src/persistence/coordinator.ts:122 listRecoveryCandidates / packages/core/src/recovery.test.ts |
| SAV-006 | 容量不足・外部変更・複数起動 | apps/editor/src/persistence/workLibrary.ts:55 publishWork / apps/editor/src/persistence/workLibrary.test.ts |
| SAV-007 | Offline・ログイン不要制作 | apps/editor/public/sw.js:51 fetch / apps/editor/src/persistence/portablePreview.test.ts |
| IO-001 | 画像を開く・配置する | apps/editor/src/assets/linkedImages.ts:91 decodeLinkedImage / apps/editor/src/selection/dropImport.test.ts |
| AST-001 | 素材種別の管理 | apps/editor/src/assets/library.ts:5 ASSET_KINDS / apps/editor/src/assets/brushMaterial.test.ts |
| AST-002 | 検索・タグ・お気に入り | apps/editor/src/assets/library.ts:63 listAssets / apps/editor/src/assets/materialUseRouting.test.ts |
| AST-003 | 取込・書出・束ね | apps/editor/src/assets/packs.ts:29 exportAssetPack / apps/editor/src/assets/packs.quality.test.ts |
| AST-004 | 同名・上書き・削除・版 | apps/editor/src/assets/library.ts:178 createAssetVersion / apps/editor/src/assets/assetImportRecovery.test.ts |
| AST-005 | ローカル素材と任意の配布 | apps/editor/src/assets/packs.ts:6 PackManifest / apps/editor/src/assets/packResume.test.ts |
| UI-002 | パネルの折畳・並替・持出 | apps/editor/src/ui/floatingPanels.ts:85 dragButton / apps/editor/src/ui/c04Quality.test.ts |
| UI-004 | Quick Controller | apps/editor/src/ui/commandPalette.ts:319 renderQuick / apps/editor/src/ui/c04Quality.test.ts |
| UI-005 | 横断コマンド検索 | apps/editor/src/ui/commandPalette.ts:163 dynamicCommands / apps/editor/src/ui/layerCommands.test.ts |
| UI-006 | Workspace保存・復元・左右反転 | apps/editor/src/ui/workspaceProfiles.ts:120 snapshot / apps/editor/src/ui/c04Quality.test.ts |
| UI-007 | Focus・全画面・一時UI | apps/editor/src/ui/focusMode.ts:2 installFocusMode / apps/editor/src/ui/c04Quality.test.ts |
| UI-008 | ホーム・情報・ヘルプ | apps/editor/src/ui/homeShell.ts:123 installHomeShell / apps/editor/src/ui/c04Quality.test.ts |
| GST-002 | 実キー登録・衝突検知 | apps/editor/src/ui/shortcutSettings.ts:139 captureKey / apps/editor/src/ui/c04Quality.test.ts |
| GST-005 | 登録設定の移行 | apps/editor/src/ui/shortcutSettings.ts:185 parse imported / apps/editor/src/ui/c04Quality.test.ts |
| DEV-004 | 回転・リサイズ・キーボード | apps/editor/src/ui/shellBehavior.ts:263 window resize / apps/editor/src/ui/c04Quality.test.ts |
| CLP-001 | コピー・切取・貼付 | apps/editor/src/selection/clipboard.ts:107 copy / 219 cut / apps/editor/src/selection/clipboardSparse.test.ts |
| CLP-002 | 統合コピー・同位置貼付 | apps/editor/src/selection/clipboard.ts:107 copy merged / apps/editor/src/selection/pasteTiles.test.ts |
| CLP-004 | システム共有・ドロップ | apps/editor/src/selection/clipboard.ts:369 writeSystemClipboard / 374 readSystemClipboard / apps/editor/src/selection/dropImport.test.ts |

## 6. 本ラウンドには含めない正式保留・対象外11件

| ID | 名称 | 理由 |
|---|---|---|
| WET-003 | 濡れの可視化・加水・乾燥 | 濡れの可視化・加水・乾燥の専用物理状態操作を現行必須から除外 |
| WET-004 | 拡散の停止・再開 | 時間進行する拡散の停止・再開を現行必須から除外 |
| COL-010 | CMYK編集と出力 | ネイティブCMYK編集は保留。ICC/CMYK soft proofと対応形式への出力変換は別機能として維持。 |
| VEC-008 | パス上文字・高度組版 | パス上文字/ルビ/縦中横/OpenType等の高度組版は保留。基本的な横縦書き/IME/点文字/枠文字は維持。 |
| AUT-006 | スクリプトと外部アクセス | 任意コード/外部アクセスは保留。既存マクロ操作は維持。 |
| EXT-001 | 拡張機能 | プラグイン/拡張公開APIは将来検討。 |
| EXT-002 | 共同描画・絵チャ | リアルタイム共同描画は本体の必須範囲外の将来候補。 |
| EXT-003 | 3D資料・ポーズ・照明 | 専用3Dポーズ/照明は将来検討。通常の資料表示は維持。 |
| EXT-004 | アニメ・漫画・DTP一式 | 動画編集/漫画ページ管理/DTP一式は対象外。一枚絵用の網点/文字など個別機能は維持。 |
| EXT-005 | 自由キャンバスと遠隔操作 | 無限キャンバス/遠隔コントローラーは将来比較。通常の一枚絵キャンバスは維持。 |
| PIX-003 | 固定パレット・Indexed候補 | Indexed文書/固定パレット特有の編集モードは将来比較。通常Pixelアート機能は維持。 |

## 7. 各群の実施手順と終了条件

1. 開始時に対象ブランチの**最新コミット**を記録し、正式な機能詳細（`features.json` と対応する `features/*.md`）・現在のコード・動く操作入口を照合する。
2. 機能名ではなく、**固有の設定値・モード・作用先・途中表示・確定/取消・Undo/Redo・Native保存/再読込・エラー条件・軽さ**ごとに「既に成立／不足／証拠不足」を分ける。既に成立した部分は保護して触らない。
3. `KNOWN_PARTIAL / KNOWN_ABSENT / LEGACY_PARTIAL / KNOWN_DEFECT` は元の不足記録を**最新コードで再確認**。既に修正済みの箇所を重複実装しない。
4. `LEGACY_CANDIDATE / UNASSESSED` は、最初から「未実装」と決めつけず、操作の最後までコードとテストで追跡する。満たすなら残作業から**完成根拠付きで外す**。不足した箇所だけ実装。
5. 影響する自動テストを新規作成・実行し、修正に関係する旧操作PASSを回帰確認。エラー・保存・データ破損・外部素材欠損なども試す。
6. **129件の過去品質指摘**と今回の利用者報告を同じ群で照合する。IDは別管理とし、修正済みの報告と未検証を区別する。
7. 各群ごとに「完成認定した細目、修正した細目、なお失敗する細目、実機でしか判定できない項目、コードとテストの根拠、コミット/PR」を記録。実機なしでもコード/自動検査を終えた部分は閉じる一方、端末操作を未実施なのに実機合格とは書かない。

**第2ラウンド終了の条件：** 対象236機能の現行仕様について、実装不足がなく、操作・データ・履歴・保存が必要な範囲で裏付けられ、保留11機能の範囲を勝手に拡張していないこと。ユーザーが実機で確かめる項目は別途明示する。第2ラウンドの計画作成自体を実装完成と混同しない。

### 元ファイルを壊さない方針

元のC01〜C17計画、PR #107 / #108、`quality/C03-C10-integration` の製品コード、正本の採否・固有仕様を変更せず、Round 2専用文書として記録する。共有`main.ts`や保存・描画基盤への変更は重複を調整し、事故を防ぐ。**対象は未完成部分であって、現行の既存機能をすべて置き換えることではない。**
