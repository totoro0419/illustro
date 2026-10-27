# 共通・根本問題と優先順位

P0は入力喪失・誤結果・保存/復元破壊を防ぐ研究、P1は制作全体の品質/手数を大きく左右する研究、P2は用途限定/将来枠を含む個別項目。P0を安易な低速化防止へ置き換えない。R順の番号は実装順ではない。

スコアは悪影響/頻度/横断性/重大事故/改善効果/革新余地/検証可能性の7軸、各1〜5の**研究者による暫定判断**。発生率の実測ではない。合計だけで採否を自動決定せず、重大損失を先に扱う。頻度は最も不確かで実利用者調査後に更新。

| 研究 | 優先 | 7軸スコア | 対応機能数 | 判断理由 |
|---|---|---|---|---|
| [R01 入力・表示・文書座標の時間を揃える](#r01) | P0 | 5/5/5/5/5/4/4 | 30 | 毎筆のナビを左右する。入力未配送・アプリ拒否・描画待ちを分けないと改善先を誤る。発生頻度は制作フローからの判断で実測値ではない。 |
| [R02 受理した編集の順序・局所取消・固定時点](#r02) | P0 | 5/5/5/5/5/5/5 | 51 | 入力を受けても順序/対象/取消が違えば作品を壊す。E01で限定モデルを比較済。性能より先に成立条件を閉じる。 |
| [R03 筆の意味を保ち必要な画素作用だけ実行](#r03) | P0 | 5/5/4/5/5/5/4 | 21 | 筆品質と毎筆の応答を同時に左右する。書先や混色の条件を無視した高速化は採れない。 |
| [R04 線画の位相と人の修正意図を再利用](#r04) | P1 | 5/4/4/5/5/5/4 | 25 | 全体の制作に必須ではないが重点差別化能力。局所修正の全体影響と手修正保持が成立しなければ使えない。頻度は用途で変わる。 |
| [R05 合成・効果の必要入力範囲と依存を求める](#r05) | P1 | 5/4/5/5/5/4/5 | 75 | 多くの効果/層/採色に横断。読み範囲を省き過ぎる誤りと再計算過多を同時に減らせる。E04は有限1Dのみ。 |
| [R06 全作業を通したメモリ・転送・電池の予算](#r06) | P0 | 5/5/5/5/5/4/4 | 39 | 全体で資源を使い切れば入力/保護も成立しない。性能上限は未知。E02/E05は予算の必要性を示すモデル。 |
| [R07 保存した範囲の真実性と壊れない更新](#r07) | P0 | 5/5/5/5/5/4/5 | 23 | 頻度は高く失敗時損失は重大。通常の成功経路だけで判定しない。OS/媒体の保証は未検証。 |
| [R08 履歴・分岐・素材の版と寿命](#r08) | P0 | 5/5/5/5/5/4/5 | 57 | 派生cacheと唯一の作品データを取り違えると整理や素材削除で壊れる。再演だけの保証を検証する。 |
| [R09 意図を保つ直接操作と固定入口](#r09) | P1 | 5/5/5/4/5/5/3 | 94 | 探索/誤対象/モード混乱は演算を速めても残る。実利用者評価なしに直感性を確定しない。 |
| [R10 色・α・精度を全機能で揃える](#r10) | P0 | 5/5/5/5/5/3/5 | 72 | 無言の降格/二重変換は保存後戻せない。高精度を保ったまま予算を調整する必要がある。 |
| [R11 座標・原本・編集対象を保つ変形と文字](#r11) | P1 | 5/4/5/5/5/4/4 | 65 | ナビ/変形/組版の座標系が混ざると品質と直感性が壊れる。逆写像の成立条件を比較する。 |
| [R12 湿式媒体の進行を操作可能な状態へ](#r12) | P1 | 5/3/4/5/5/5/3 | 8 | 用途は限定的だが水彩の順序/停止/再現性は通常筆と異なる。未使用のラフへ負荷を広げない。 |
| [R13 入出力の能力・依存・失敗を局所化](#r13) | P1 | 5/4/5/5/4/3/5 | 37 | 表形式の対応可否だけでは外観/編集性損失を判定できない。Cutと版移行はデータ損失に直結。 |
| [R14 高度機能の未使用負荷と長時間の蓄積](#r14) | P1 | 4/5/5/4/5/5/4 | 28 | 宣言/実行/常駐を混ぜると247機能が日常操作の負担になる。初回利用待ちへの負荷移転も比較する。 |

## 原因関係と研究上の依存

R01の独立表示はR02の正しい状態境界とR06の実行余裕があって初めて成立する。R03/R05/R12はR02へ本当の読書き依存を返す。R04の位相結果はR08へ手修正を含む版として保持する。R07はR02の保存境界とR08の到達資源を固定する。R10の色契約とR11の座標は全評価へ渡す。R09はこれらを作者に過剰な状態語を覚えさせず操作へ接続する。R13/R14は重い/任意の仕事を通常制作から隔離する。

重要な前提の反証：Workerを分けただけではGPU/転送/帯域を分けたことにならない。別層でも下地を読む効果は独立ではない。局所編集でも領域の接続は全域へ変わる。cache再利用と正本保持は同義ではない。

<a id="r01"></a>
## R01 — 入力・表示・文書座標の時間を揃える

毎筆のナビを左右する。入力未配送・アプリ拒否・描画待ちを分けないと改善先を誤る。発生頻度は制作フローからの判断で実測値ではない。

品質：QR-01, QR-02, QR-03, QR-04, QR-14。非待機：NB-01, NB-05, NB-12。外部根拠：S01, S02, S03（[出典](SOURCES.md)）。

[自由発案カード](USER_RESEARCH_CARDS.md#r01) · [AI別案](AI_INDEPENDENT_PROPOSALS.md#r01) · [試験](VALIDATION_PLAN.md) · [判断](DECISIONS.md)

**全対応機能**：[CAN-002 表示移動・拡縮・回転](features/CAN.md#can-002)、[CAN-003 Fit・100%・表示反転](features/CAN.md#can-003)、[CAN-004 高倍率・ピクセル確認](features/CAN.md#can-004)、[INP-001 入力役割の切替](features/INP.md#inp-001)、[INP-002 筆圧・傾き・方位・回転](features/INP.md#inp-002)、[INP-003 ペンボタン・後端消しゴム](features/INP.md#inp-003)、[INP-004 手のひら・誤接触対策](features/INP.md#inp-004)、[INP-005 割込み・接続喪失](features/INP.md#inp-005)、[INP-006 カーソル・接地点表示](features/INP.md#inp-006)、[INP-007 高頻度入力の忠実性](features/INP.md#inp-007)、[BRU-003 筆圧・速度・位置補正](features/BRU.md#bru-003)、[BRU-010 定規・選択との併用](features/BRU.md#bru-010)、[BRU-012 一時消しゴム・前ツール復帰](features/BRU.md#bru-012)、[FIL-004 連続・ドラッグ塗り](features/FIL.md#fil-004)、[FIL-006 なぞって領域指定](features/FIL.md#fil-006)、[TRN-001 移動・拡縮・回転・反転](features/TRN.md#trn-001)、[GUI-002 2D・等角・透視ガイド](features/GUI.md#gui-002)、[REF-002 移動・拡縮・回転・ピン](features/REF.md#ref-002)、[REF-005 Navigator・全体/細部別ビュー](features/REF.md#ref-005)、[UI-002 パネルの折畳・並替・持出](features/UI.md#ui-002)、[UI-004 Quick Controller](features/UI.md#ui-004)、[UI-007 Focus・全画面・一時UI](features/UI.md#ui-007)、[GST-001 既定ジェスチャーと代替](features/GST.md#gst-001)、[GST-002 実キー登録・衝突検知](features/GST.md#gst-002)、[GST-003 指・ペン・マウス割当](features/GST.md#gst-003)、[DEV-001 PC操作](features/DEV.md#dev-001)、[DEV-002 タブレット操作](features/DEV.md#dev-002)、[DEV-004 回転・リサイズ・キーボード](features/DEV.md#dev-004)、[A11-002 単指・非ドラッグ代替](features/A11.md#a11-002)、[EXT-005 自由キャンバスと遠隔操作](features/EXT.md#ext-005)。

<a id="r02"></a>
## R02 — 受理した編集の順序・局所取消・固定時点

入力を受けても順序/対象/取消が違えば作品を壊す。E01で限定モデルを比較済。性能より先に成立条件を閉じる。

品質：QR-05, QR-06, QR-07, QR-10, QR-22。非待機：NB-01, NB-02, NB-03, NB-04, NB-05, NB-06, NB-07, NB-08, NB-09, NB-10, NB-11, NB-12。外部根拠：S08, S09（[出典](SOURCES.md)）。

[自由発案カード](USER_RESEARCH_CARDS.md#r02) · [AI別案](AI_INDEPENDENT_PROPOSALS.md#r02) · [試験](VALIDATION_PLAN.md) · [判断](DECISIONS.md)

**全対応機能**：[CAN-002 表示移動・拡縮・回転](features/CAN.md#can-002)、[CAN-007 複数作品・文書切替](features/CAN.md#can-007)、[INP-005 割込み・接続喪失](features/INP.md#inp-005)、[INP-007 高頻度入力の忠実性](features/INP.md#inp-007)、[BRU-008 強制入り抜き](features/BRU.md#bru-008)、[BRU-009 連続描画・重ね塗り・合成](features/BRU.md#bru-009)、[WET-001 ぼかし・引きずり・混色](features/WET.md#wet-001)、[WET-003 濡れの可視化・加水・乾燥](features/WET.md#wet-003)、[FIL-001 通常塗りつぶし](features/FIL.md#fil-001)、[FIL-003 参照元・塗り先の明示](features/FIL.md#fil-003)、[FIL-004 連続・ドラッグ塗り](features/FIL.md#fil-004)、[FIL-007 線画領域基準の塗り・再配色](features/FIL.md#fil-007)、[FIL-009 塗り結果のその場修正](features/FIL.md#fil-009)、[FIL-010 透明塗り・下地・自動彩色レイヤー](features/FIL.md#fil-010)、[LIN-001 ラスター線画から領域用レイヤー生成](features/LIN.md#lin-001)、[LIN-003 手動の接続・分割・統合](features/LIN.md#lin-003)、[LIN-005 元線画変更後の比較更新](features/LIN.md#lin-005)、[LIN-007 未解決・低信頼・無効の扱い](features/LIN.md#lin-007)、[LAY-001 追加・選択・描画対象固定](features/LAY.md#lay-001)、[LAY-003 グループ・並替・複数選択](features/LAY.md#lay-003)、[LAY-004 クリッピング・不透明度ロック](features/LAY.md#lay-004)、[LAY-006 複製・結合・統合コピー](features/LAY.md#lay-006)、[LAY-008 位置・内容・全体ロック](features/LAY.md#lay-008)、[LAY-011 レイヤーカンプ](features/LAY.md#lay-011)、[LAY-012 空・非描画対象での開始](features/LAY.md#lay-012)、[SEL-001 矩形・楕円・投げ縄・多角形](features/SEL.md#sel-001)、[TRN-001 移動・拡縮・回転・反転](features/TRN.md#trn-001)、[TRN-004 ゆがみ・液状化](features/TRN.md#trn-004)、[TRN-007 セッション内Undoと全体Undo](features/TRN.md#trn-007)、[GUI-003 対称・放射・万華鏡](features/GUI.md#gui-003)、[FX-007 修復・パッチ・クローン](features/FX.md#fx-007)、[FX-008 フィルター順序・マスク・強度](features/FX.md#fx-008)、[NDE-004 リンク・埋込・インスタンス](features/NDE.md#nde-004)、[NDE-005 安全な構造変換](features/NDE.md#nde-005)、[HIS-001 Undo・Redo](features/HIS.md#his-001)、[HIS-003 名前付きSnapshot](features/HIS.md#his-003)、[HIS-005 部分復元・履歴ブラシ](features/HIS.md#his-005)、[SAV-003 ネイティブ保存・Save As](features/SAV.md#sav-003)、[SAV-006 容量不足・外部変更・複数起動](features/SAV.md#sav-006)、[AUT-001 記録・編集・再生](features/AUT.md#aut-001)、[AUT-002 実行時パラメータ・対象指定](features/AUT.md#aut-002)、[AUT-003 実行比較・失敗・取消](features/AUT.md#aut-003)、[AUT-006 スクリプトと外部アクセス](features/AUT.md#aut-006)、[UI-003 コンテキスト操作・対象帯](features/UI.md#ui-003)、[GST-004 一時ツールと戻り先](features/GST.md#gst-004)、[A11-003 キーボード・支援技術](features/A11.md#a11-003)、[AI-001 選択・領域の補助](features/AI.md#ai-001)、[AI-003 整理・修復の候補](features/AI.md#ai-003)、[EXT-002 共同描画・絵チャ](features/EXT.md#ext-002)、[CLP-001 コピー・切取・貼付](features/CLP.md#clp-001)、[FX-133 内外の影](features/FX.md#fx-133)。

<a id="r03"></a>
## R03 — 筆の意味を保ち必要な画素作用だけ実行

筆品質と毎筆の応答を同時に左右する。書先や混色の条件を無視した高速化は採れない。

品質：QR-02, QR-03, QR-04, QR-10, QR-19。非待機：NB-01。外部根拠：S02, S03, S07, S15（[出典](SOURCES.md)）。

[自由発案カード](USER_RESEARCH_CARDS.md#r03) · [AI別案](AI_INDEPENDENT_PROPOSALS.md#r03) · [試験](VALIDATION_PLAN.md) · [判断](DECISIONS.md)

**全対応機能**：[CAN-008 シームレス反復描画](features/CAN.md#can-008)、[INP-002 筆圧・傾き・方位・回転](features/INP.md#inp-002)、[INP-006 カーソル・接地点表示](features/INP.md#inp-006)、[INP-007 高頻度入力の忠実性](features/INP.md#inp-007)、[BRU-001 基本ブラシと消しゴム](features/BRU.md#bru-001)、[BRU-002 サイズ・不透明度・流量](features/BRU.md#bru-002)、[BRU-003 筆圧・速度・位置補正](features/BRU.md#bru-003)、[BRU-005 ブラシ編集・試し描き](features/BRU.md#bru-005)、[BRU-006 入力からの変調](features/BRU.md#bru-006)、[BRU-007 テクスチャ・紙質ブラシ](features/BRU.md#bru-007)、[BRU-008 強制入り抜き](features/BRU.md#bru-008)、[BRU-009 連続描画・重ね塗り・合成](features/BRU.md#bru-009)、[BRU-010 定規・選択との併用](features/BRU.md#bru-010)、[BRU-011 ブラシ版と結果の再現](features/BRU.md#bru-011)、[WET-001 ぼかし・引きずり・混色](features/WET.md#wet-001)、[VEC-001 自由描線・パス・図形](features/VEC.md#vec-001)、[GUI-001 直線・平行・円・楕円定規](features/GUI.md#gui-001)、[GUI-003 対称・放射・万華鏡](features/GUI.md#gui-003)、[GUI-005 描いた後の形状補正](features/GUI.md#gui-005)、[GUI-006 吸着表示・一時解除・範囲](features/GUI.md#gui-006)、[PIX-001 1px・整数・アンチエイリアスOFF](features/PIX.md#pix-001)。

<a id="r04"></a>
## R04 — 線画の位相と人の修正意図を再利用

全体の制作に必須ではないが重点差別化能力。局所修正の全体影響と手修正保持が成立しなければ使えない。頻度は用途で変わる。

品質：QR-04, QR-06, QR-10, QR-12, QR-18, QR-22。非待機：NB-02, NB-03。外部根拠：S04, S05, S11, S13（[出典](SOURCES.md)）。

[自由発案カード](USER_RESEARCH_CARDS.md#r04) · [AI別案](AI_INDEPENDENT_PROPOSALS.md#r04) · [試験](VALIDATION_PLAN.md) · [判断](DECISIONS.md)

**全対応機能**：[FIL-001 通常塗りつぶし](features/FIL.md#fil-001)、[FIL-002 隙間補完・塗り残し修正](features/FIL.md#fil-002)、[FIL-003 参照元・塗り先の明示](features/FIL.md#fil-003)、[FIL-004 連続・ドラッグ塗り](features/FIL.md#fil-004)、[FIL-005 囲って塗る・消す](features/FIL.md#fil-005)、[FIL-006 なぞって領域指定](features/FIL.md#fil-006)、[FIL-007 線画領域基準の塗り・再配色](features/FIL.md#fil-007)、[FIL-008 色指示による面の補助](features/FIL.md#fil-008)、[FIL-009 塗り結果のその場修正](features/FIL.md#fil-009)、[LIN-001 ラスター線画から領域用レイヤー生成](features/LIN.md#lin-001)、[LIN-002 境界・接続・閉領域・穴の表示](features/LIN.md#lin-002)、[LIN-003 手動の接続・分割・統合](features/LIN.md#lin-003)、[LIN-004 塗り・選択の共通参照](features/LIN.md#lin-004)、[LIN-005 元線画変更後の比較更新](features/LIN.md#lin-005)、[LIN-006 隙間候補・毛先・顎の補助](features/LIN.md#lin-006)、[LIN-007 未解決・低信頼・無効の扱い](features/LIN.md#lin-007)、[LIN-008 ベクター線画の領域利用](features/LIN.md#lin-008)、[SEL-002 色域・明度・自動選択](features/SEL.md#sel-002)、[SEL-005 線画領域・層内容から選択](features/SEL.md#sel-005)、[VEC-003 線幅・筆風・ベクター消去](features/VEC.md#vec-003)、[VEC-004 簡略化・平滑化・ブーリアン](features/VEC.md#vec-004)、[GRA-003 再編集・マスク・形状追従](features/GRA.md#gra-003)、[AI-001 選択・領域の補助](features/AI.md#ai-001)、[FX-130 輪郭検出・線画抽出](features/FX.md#fx-130)、[FX-132 内外の縁取](features/FX.md#fx-132)。

<a id="r05"></a>
## R05 — 合成・効果の必要入力範囲と依存を求める

多くの効果/層/採色に横断。読み範囲を省き過ぎる誤りと再計算過多を同時に減らせる。E04は有限1Dのみ。

品質：QR-01, QR-04, QR-06, QR-08, QR-11, QR-19。非待機：NB-04, NB-06, NB-10。外部根拠：S06, S10, S12, S14, S21（[出典](SOURCES.md)）。

[自由発案カード](USER_RESEARCH_CARDS.md#r05) · [AI別案](AI_INDEPENDENT_PROPOSALS.md#r05) · [試験](VALIDATION_PLAN.md) · [判断](DECISIONS.md)

**全対応機能**：[CAN-006 画像サイズ変更](features/CAN.md#can-006)、[WET-005 紙・吸収・質感編集](features/WET.md#wet-005)、[COL-003 作品・資料スポイト](features/COL.md#col-003)、[COL-007 広色域・高精度・HDR](features/COL.md#col-007)、[COL-008 Soft Proof・色域警告](features/COL.md#col-008)、[COL-009 色温度・全体色調](features/COL.md#col-009)、[FIL-002 隙間補完・塗り残し修正](features/FIL.md#fil-002)、[FIL-008 色指示による面の補助](features/FIL.md#fil-008)、[LIN-002 境界・接続・閉領域・穴の表示](features/LIN.md#lin-002)、[LAY-002 表示・不透明度・合成](features/LAY.md#lay-002)、[LAY-003 グループ・並替・複数選択](features/LAY.md#lay-003)、[LAY-004 クリッピング・不透明度ロック](features/LAY.md#lay-004)、[LAY-005 ピクセル・ベクターマスク](features/LAY.md#lay-005)、[LAY-006 複製・結合・統合コピー](features/LAY.md#lay-006)、[LAY-009 Solo・一時表示検査](features/LAY.md#lay-009)、[LAY-010 キャンバスから層選択](features/LAY.md#lay-010)、[SEL-002 色域・明度・自動選択](features/SEL.md#sel-002)、[SEL-003 拡張・縮小・ぼかし・境界](features/SEL.md#sel-003)、[SEL-008 選択の表示・抑制](features/SEL.md#sel-008)、[TRN-002 自由・パース・傾斜](features/TRN.md#trn-002)、[TRN-004 ゆがみ・液状化](features/TRN.md#trn-004)、[TRN-008 非破壊変形と描画](features/TRN.md#trn-008)、[GRA-001 線形・放射・反射・角度](features/GRA.md#gra-001)、[GRA-003 再編集・マスク・形状追従](features/GRA.md#gra-003)、[GRA-004 グラデーションマップ・階調](features/GRA.md#gra-004)、[FX-001 色調整レイヤー](features/FX.md#fx-001)、[FX-002 高度色調整](features/FX.md#fx-002)、[FX-003 ぼかし](features/FX.md#fx-003)、[FX-004 鮮鋭化・ノイズ・掃除](features/FX.md#fx-004)、[FX-005 変位・オフセット・モザイク](features/FX.md#fx-005)、[FX-006 網点・線画抽出・縁・発光](features/FX.md#fx-006)、[FX-007 修復・パッチ・クローン](features/FX.md#fx-007)、[FX-008 フィルター順序・マスク・強度](features/FX.md#fx-008)、[FX-009 明示的な焼込み](features/FX.md#fx-009)、[NDE-001 合成モードと比較](features/NDE.md#nde-001)、[NDE-002 階調依存合成](features/NDE.md#nde-002)、[NDE-003 編集可能な効果・変形](features/NDE.md#nde-003)、[NDE-005 安全な構造変換](features/NDE.md#nde-005)、[REF-004 資料採色と色の出典](features/REF.md#ref-004)、[REF-005 Navigator・全体/細部別ビュー](features/REF.md#ref-005)、[HIS-002 履歴一覧・比較](features/HIS.md#his-002)、[FX-101 明るさ・コントラスト](features/FX.md#fx-101)、[FX-102 レベル](features/FX.md#fx-102)、[FX-103 トーンカーブ](features/FX.md#fx-103)、[FX-104 露出](features/FX.md#fx-104)、[FX-105 色相・彩度・明度](features/FX.md#fx-105)、[FX-107 カラーバランス](features/FX.md#fx-107)、[FX-108 色温度・Tint](features/FX.md#fx-108)、[FX-109 白黒](features/FX.md#fx-109)、[FX-110 チャンネルミキサー](features/FX.md#fx-110)、[FX-111 選択色補正](features/FX.md#fx-111)、[FX-112 反転](features/FX.md#fx-112)、[FX-113 階調化](features/FX.md#fx-113)、[FX-114 二値化](features/FX.md#fx-114)、[FX-116 ガウスぼかし](features/FX.md#fx-116)、[FX-117 ボックスぼかし](features/FX.md#fx-117)、[FX-118 移動ぼかし](features/FX.md#fx-118)、[FX-119 放射ぼかし](features/FX.md#fx-119)、[FX-120 レンズ・深度ぼかし](features/FX.md#fx-120)、[FX-121 シャープ](features/FX.md#fx-121)、[FX-122 アンシャープマスク](features/FX.md#fx-122)、[FX-123 High Pass](features/FX.md#fx-123)、[FX-124 ノイズ](features/FX.md#fx-124)、[FX-125 Median・ごみ取り](features/FX.md#fx-125)、[FX-126 モザイク](features/FX.md#fx-126)、[FX-127 オフセット](features/FX.md#fx-127)、[FX-128 変位](features/FX.md#fx-128)、[FX-129 網点・スクリーントーン](features/FX.md#fx-129)、[FX-130 輪郭検出・線画抽出](features/FX.md#fx-130)、[FX-131 線画色変更](features/FX.md#fx-131)、[FX-132 内外の縁取](features/FX.md#fx-132)、[FX-133 内外の影](features/FX.md#fx-133)、[FX-134 内外光彩](features/FX.md#fx-134)、[FX-135 色・グラデ・模様Overlay](features/FX.md#fx-135)、[FX-136 ベベル・エンボス](features/FX.md#fx-136)。

<a id="r06"></a>
## R06 — 全作業を通したメモリ・転送・電池の予算

全体で資源を使い切れば入力/保護も成立しない。性能上限は未知。E02/E05は予算の必要性を示すモデル。

品質：QR-01, QR-03, QR-08, QR-09, QR-14, QR-19。非待機：NB-01, NB-06, NB-09, NB-11, NB-12。外部根拠：S03, S15（[出典](SOURCES.md)）。

[自由発案カード](USER_RESEARCH_CARDS.md#r06) · [AI別案](AI_INDEPENDENT_PROPOSALS.md#r06) · [試験](VALIDATION_PLAN.md) · [判断](DECISIONS.md)

**全対応機能**：[CAN-001 新規作品](features/CAN.md#can-001)、[CAN-005 トリミング・キャンバス拡張](features/CAN.md#can-005)、[CAN-007 複数作品・文書切替](features/CAN.md#can-007)、[CAN-010 キャンバス外の内容保持](features/CAN.md#can-010)、[BRU-001 基本ブラシと消しゴム](features/BRU.md#bru-001)、[BRU-005 ブラシ編集・試し描き](features/BRU.md#bru-005)、[WET-002 水彩・顔料・にじみ](features/WET.md#wet-002)、[COL-007 広色域・高精度・HDR](features/COL.md#col-007)、[FIL-001 通常塗りつぶし](features/FIL.md#fil-001)、[LIN-001 ラスター線画から領域用レイヤー生成](features/LIN.md#lin-001)、[LAY-001 追加・選択・描画対象固定](features/LAY.md#lay-001)、[LAY-007 名前・タグ・検索・フィルター](features/LAY.md#lay-007)、[SEL-006 保存選択・選択マスク](features/SEL.md#sel-006)、[TRN-003 メッシュ・ケージ・ワープ](features/TRN.md#trn-003)、[VEC-004 簡略化・平滑化・ブーリアン](features/VEC.md#vec-004)、[FX-003 ぼかし](features/FX.md#fx-003)、[REF-001 複数資料・グループ](features/REF.md#ref-001)、[REF-005 Navigator・全体/細部別ビュー](features/REF.md#ref-005)、[HIS-001 Undo・Redo](features/HIS.md#his-001)、[HIS-004 分岐・比較・復帰](features/HIS.md#his-004)、[HIS-006 履歴の容量・保持範囲](features/HIS.md#his-006)、[SAV-001 作品一覧・検索・整理](features/SAV.md#sav-001)、[SAV-002 複製・削除・ゴミ箱](features/SAV.md#sav-002)、[SAV-004 自動保護・保存状態](features/SAV.md#sav-004)、[SAV-006 容量不足・外部変更・複数起動](features/SAV.md#sav-006)、[IO-001 画像を開く・配置する](features/IO.md#io-001)、[IO-008 レイヤー・選択範囲・一括出力](features/IO.md#io-008)、[AST-002 検索・タグ・お気に入り](features/AST.md#ast-002)、[AUT-003 実行比較・失敗・取消](features/AUT.md#aut-003)、[AUT-004 バッチ出力](features/AUT.md#aut-004)、[UI-001 明色Auroraの制作画面](features/UI.md#ui-001)、[DEV-002 タブレット操作](features/DEV.md#dev-002)、[DEV-005 能力差・低負荷・端末間移送](features/DEV.md#dev-005)、[REC-001 Timelapse記録と再生](features/REC.md#rec-001)、[REC-002 動画の範囲・速度・解像度](features/REC.md#rec-002)、[EXT-001 拡張機能](features/EXT.md#ext-001)、[EXT-003 3D資料・ポーズ・照明](features/EXT.md#ext-003)、[FX-116 ガウスぼかし](features/FX.md#fx-116)、[FX-119 放射ぼかし](features/FX.md#fx-119)。

<a id="r07"></a>
## R07 — 保存した範囲の真実性と壊れない更新

頻度は高く失敗時損失は重大。通常の成功経路だけで判定しない。OS/媒体の保証は未検証。

品質：QR-06, QR-07, QR-10, QR-17, QR-18, QR-22。非待機：NB-08, NB-09, NB-10, NB-12。外部根拠：S08, S09（[出典](SOURCES.md)）。

[自由発案カード](USER_RESEARCH_CARDS.md#r07) · [AI別案](AI_INDEPENDENT_PROPOSALS.md#r07) · [試験](VALIDATION_PLAN.md) · [判断](DECISIONS.md)

**全対応機能**：[CAN-007 複数作品・文書切替](features/CAN.md#can-007)、[CAN-010 キャンバス外の内容保持](features/CAN.md#can-010)、[INP-005 割込み・接続喪失](features/INP.md#inp-005)、[WET-004 拡散の停止・再開](features/WET.md#wet-004)、[REF-006 資料保存・不足・権利メモ](features/REF.md#ref-006)、[HIS-003 名前付きSnapshot](features/HIS.md#his-003)、[HIS-006 履歴の容量・保持範囲](features/HIS.md#his-006)、[SAV-001 作品一覧・検索・整理](features/SAV.md#sav-001)、[SAV-002 複製・削除・ゴミ箱](features/SAV.md#sav-002)、[SAV-003 ネイティブ保存・Save As](features/SAV.md#sav-003)、[SAV-004 自動保護・保存状態](features/SAV.md#sav-004)、[SAV-005 クラッシュ・背景終了復元](features/SAV.md#sav-005)、[SAV-006 容量不足・外部変更・複数起動](features/SAV.md#sav-006)、[SAV-007 Offline・ログイン不要制作](features/SAV.md#sav-007)、[SAV-008 バックアップ・版移行・旧形式](features/SAV.md#sav-008)、[IO-002 PNG・JPEG・WebP](features/IO.md#io-002)、[IO-008 レイヤー・選択範囲・一括出力](features/IO.md#io-008)、[AST-004 同名・上書き・削除・版](features/AST.md#ast-004)、[AUT-003 実行比較・失敗・取消](features/AUT.md#aut-003)、[AUT-004 バッチ出力](features/AUT.md#aut-004)、[UI-008 ホーム・情報・ヘルプ](features/UI.md#ui-008)、[AI-004 送信・費用・生成の境界](features/AI.md#ai-004)、[CLP-001 コピー・切取・貼付](features/CLP.md#clp-001)。

<a id="r08"></a>
## R08 — 履歴・分岐・素材の版と寿命

派生cacheと唯一の作品データを取り違えると整理や素材削除で壊れる。再演だけの保証を検証する。

品質：QR-05, QR-06, QR-07, QR-08, QR-10, QR-22。非待機：NB-07, NB-08, NB-09。外部根拠：S07, S08, S15（[出典](SOURCES.md)）。

[自由発案カード](USER_RESEARCH_CARDS.md#r08) · [AI別案](AI_INDEPENDENT_PROPOSALS.md#r08) · [試験](VALIDATION_PLAN.md) · [判断](DECISIONS.md)

**全対応機能**：[CAN-009 文書属性・テンプレート](features/CAN.md#can-009)、[BRU-004 プリセット検索・履歴・お気に入り](features/BRU.md#bru-004)、[BRU-006 入力からの変調](features/BRU.md#bru-006)、[BRU-007 テクスチャ・紙質ブラシ](features/BRU.md#bru-007)、[BRU-011 ブラシ版と結果の再現](features/BRU.md#bru-011)、[WET-002 水彩・顔料・にじみ](features/WET.md#wet-002)、[WET-005 紙・吸収・質感編集](features/WET.md#wet-005)、[COL-004 パレット編集・交換](features/COL.md#col-004)、[LIN-003 手動の接続・分割・統合](features/LIN.md#lin-003)、[LIN-005 元線画変更後の比較更新](features/LIN.md#lin-005)、[LAY-005 ピクセル・ベクターマスク](features/LAY.md#lay-005)、[LAY-006 複製・結合・統合コピー](features/LAY.md#lay-006)、[LAY-011 レイヤーカンプ](features/LAY.md#lay-011)、[SEL-004 全選択・解除・再選択・反転](features/SEL.md#sel-004)、[SEL-006 保存選択・選択マスク](features/SEL.md#sel-006)、[TRN-007 セッション内Undoと全体Undo](features/TRN.md#trn-007)、[VEC-005 文字・縦横書き・IME](features/VEC.md#vec-005)、[VEC-006 フォント取込・不足解決](features/VEC.md#vec-006)、[VEC-007 文字のパス化・Raster化](features/VEC.md#vec-007)、[GUI-007 ガイド・図形プリセット](features/GUI.md#gui-007)、[GRA-004 グラデーションマップ・階調](features/GRA.md#gra-004)、[FX-005 変位・オフセット・モザイク](features/FX.md#fx-005)、[FX-009 明示的な焼込み](features/FX.md#fx-009)、[NDE-003 編集可能な効果・変形](features/NDE.md#nde-003)、[NDE-004 リンク・埋込・インスタンス](features/NDE.md#nde-004)、[REF-006 資料保存・不足・権利メモ](features/REF.md#ref-006)、[HIS-001 Undo・Redo](features/HIS.md#his-001)、[HIS-002 履歴一覧・比較](features/HIS.md#his-002)、[HIS-003 名前付きSnapshot](features/HIS.md#his-003)、[HIS-004 分岐・比較・復帰](features/HIS.md#his-004)、[HIS-005 部分復元・履歴ブラシ](features/HIS.md#his-005)、[HIS-006 履歴の容量・保持範囲](features/HIS.md#his-006)、[SAV-002 複製・削除・ゴミ箱](features/SAV.md#sav-002)、[SAV-003 ネイティブ保存・Save As](features/SAV.md#sav-003)、[SAV-005 クラッシュ・背景終了復元](features/SAV.md#sav-005)、[SAV-008 バックアップ・版移行・旧形式](features/SAV.md#sav-008)、[IO-003 PSD・PSB互換](features/IO.md#io-003)、[IO-005 SVG](features/IO.md#io-005)、[AST-001 素材種別の管理](features/AST.md#ast-001)、[AST-003 取込・書出・束ね](features/AST.md#ast-003)、[AST-004 同名・上書き・削除・版](features/AST.md#ast-004)、[AUT-005 高速入口・共有](features/AUT.md#aut-005)、[GST-005 登録設定の移行](features/GST.md#gst-005)、[REC-001 Timelapse記録と再生](features/REC.md#rec-001)、[REC-003 記録の除外・機密資料](features/REC.md#rec-003)、[A11-006 日本語・翻訳・単位](features/A11.md#a11-006)、[AI-002 色・陰影の候補](features/AI.md#ai-002)、[EXT-001 拡張機能](features/EXT.md#ext-001)、[EXT-002 共同描画・絵チャ](features/EXT.md#ext-002)、[CLP-003 文書間の編集データ移送](features/CLP.md#clp-003)、[PIX-003 固定パレット・Indexed候補](features/PIX.md#pix-003)、[FX-113 階調化](features/FX.md#fx-113)、[FX-115 LUT](features/FX.md#fx-115)、[FX-120 レンズ・深度ぼかし](features/FX.md#fx-120)、[FX-124 ノイズ](features/FX.md#fx-124)、[FX-128 変位](features/FX.md#fx-128)、[FX-135 色・グラデ・模様Overlay](features/FX.md#fx-135)。

<a id="r09"></a>
## R09 — 意図を保つ直接操作と固定入口

探索/誤対象/モード混乱は演算を速めても残る。実利用者評価なしに直感性を確定しない。

品質：QR-12, QR-13, QR-14, QR-15, QR-16, QR-18, QR-21。非待機：NB-05, NB-06, NB-07, NB-11。外部根拠：S05, S06, S16, S19（[出典](SOURCES.md)）。

[自由発案カード](USER_RESEARCH_CARDS.md#r09) · [AI別案](AI_INDEPENDENT_PROPOSALS.md#r09) · [試験](VALIDATION_PLAN.md) · [判断](DECISIONS.md)

**全対応機能**：[CAN-001 新規作品](features/CAN.md#can-001)、[INP-001 入力役割の切替](features/INP.md#inp-001)、[INP-003 ペンボタン・後端消しゴム](features/INP.md#inp-003)、[INP-004 手のひら・誤接触対策](features/INP.md#inp-004)、[INP-008 キーボードとIMEの調停](features/INP.md#inp-008)、[BRU-002 サイズ・不透明度・流量](features/BRU.md#bru-002)、[BRU-004 プリセット検索・履歴・お気に入り](features/BRU.md#bru-004)、[BRU-005 ブラシ編集・試し描き](features/BRU.md#bru-005)、[BRU-012 一時消しゴム・前ツール復帰](features/BRU.md#bru-012)、[WET-006 混色・試し描きパッド](features/WET.md#wet-006)、[COL-001 色相環・HSV・RGB・HSL](features/COL.md#col-001)、[COL-002 色履歴・前色・背景色](features/COL.md#col-002)、[COL-003 作品・資料スポイト](features/COL.md#col-003)、[COL-004 パレット編集・交換](features/COL.md#col-004)、[COL-005 調和・明度・色覚支援](features/COL.md#col-005)、[COL-009 色温度・全体色調](features/COL.md#col-009)、[COL-011 知覚的な色選択・色域マスク](features/COL.md#col-011)、[FIL-003 参照元・塗り先の明示](features/FIL.md#fil-003)、[FIL-005 囲って塗る・消す](features/FIL.md#fil-005)、[FIL-006 なぞって領域指定](features/FIL.md#fil-006)、[FIL-009 塗り結果のその場修正](features/FIL.md#fil-009)、[FIL-010 透明塗り・下地・自動彩色レイヤー](features/FIL.md#fil-010)、[LIN-002 境界・接続・閉領域・穴の表示](features/LIN.md#lin-002)、[LIN-006 隙間候補・毛先・顎の補助](features/LIN.md#lin-006)、[LIN-007 未解決・低信頼・無効の扱い](features/LIN.md#lin-007)、[LAY-001 追加・選択・描画対象固定](features/LAY.md#lay-001)、[LAY-002 表示・不透明度・合成](features/LAY.md#lay-002)、[LAY-003 グループ・並替・複数選択](features/LAY.md#lay-003)、[LAY-005 ピクセル・ベクターマスク](features/LAY.md#lay-005)、[LAY-007 名前・タグ・検索・フィルター](features/LAY.md#lay-007)、[LAY-008 位置・内容・全体ロック](features/LAY.md#lay-008)、[LAY-009 Solo・一時表示検査](features/LAY.md#lay-009)、[LAY-010 キャンバスから層選択](features/LAY.md#lay-010)、[LAY-011 レイヤーカンプ](features/LAY.md#lay-011)、[LAY-012 空・非描画対象での開始](features/LAY.md#lay-012)、[SEL-001 矩形・楕円・投げ縄・多角形](features/SEL.md#sel-001)、[SEL-007 境界移動と内容移動](features/SEL.md#sel-007)、[SEL-008 選択の表示・抑制](features/SEL.md#sel-008)、[TRN-005 スナップ・整列・分布](features/TRN.md#trn-005)、[TRN-007 セッション内Undoと全体Undo](features/TRN.md#trn-007)、[TRN-008 非破壊変形と描画](features/TRN.md#trn-008)、[VEC-002 オブジェクト・点・ハンドル編集](features/VEC.md#vec-002)、[VEC-005 文字・縦横書き・IME](features/VEC.md#vec-005)、[GUI-001 直線・平行・円・楕円定規](features/GUI.md#gui-001)、[GUI-004 図形・ベジェ・折線](features/GUI.md#gui-004)、[GUI-005 描いた後の形状補正](features/GUI.md#gui-005)、[GUI-006 吸着表示・一時解除・範囲](features/GUI.md#gui-006)、[GRA-002 停止点・透明度・中間点](features/GRA.md#gra-002)、[FX-001 色調整レイヤー](features/FX.md#fx-001)、[NDE-002 階調依存合成](features/NDE.md#nde-002)、[REF-001 複数資料・グループ](features/REF.md#ref-001)、[REF-002 移動・拡縮・回転・ピン](features/REF.md#ref-002)、[REF-003 反転・グレー・一時非表示](features/REF.md#ref-003)、[HIS-002 履歴一覧・比較](features/HIS.md#his-002)、[HIS-004 分岐・比較・復帰](features/HIS.md#his-004)、[SAV-001 作品一覧・検索・整理](features/SAV.md#sav-001)、[AST-001 素材種別の管理](features/AST.md#ast-001)、[AST-002 検索・タグ・お気に入り](features/AST.md#ast-002)、[AUT-001 記録・編集・再生](features/AUT.md#aut-001)、[AUT-002 実行時パラメータ・対象指定](features/AUT.md#aut-002)、[AUT-005 高速入口・共有](features/AUT.md#aut-005)、[UI-001 明色Auroraの制作画面](features/UI.md#ui-001)、[UI-002 パネルの折畳・並替・持出](features/UI.md#ui-002)、[UI-003 コンテキスト操作・対象帯](features/UI.md#ui-003)、[UI-004 Quick Controller](features/UI.md#ui-004)、[UI-005 横断コマンド検索](features/UI.md#ui-005)、[UI-006 Workspace保存・復元・左右反転](features/UI.md#ui-006)、[UI-007 Focus・全画面・一時UI](features/UI.md#ui-007)、[UI-008 ホーム・情報・ヘルプ](features/UI.md#ui-008)、[GST-001 既定ジェスチャーと代替](features/GST.md#gst-001)、[GST-002 実キー登録・衝突検知](features/GST.md#gst-002)、[GST-003 指・ペン・マウス割当](features/GST.md#gst-003)、[GST-004 一時ツールと戻り先](features/GST.md#gst-004)、[GST-005 登録設定の移行](features/GST.md#gst-005)、[DEV-001 PC操作](features/DEV.md#dev-001)、[DEV-002 タブレット操作](features/DEV.md#dev-002)、[DEV-003 スマートフォン操作](features/DEV.md#dev-003)、[DEV-004 回転・リサイズ・キーボード](features/DEV.md#dev-004)、[REC-004 実作業時間](features/REC.md#rec-004)、[A11-001 文字・UI・コントラスト拡大](features/A11.md#a11-001)、[A11-002 単指・非ドラッグ代替](features/A11.md#a11-002)、[A11-003 キーボード・支援技術](features/A11.md#a11-003)、[A11-004 色説明・グレー・補正](features/A11.md#a11-004)、[A11-005 動き・音・振動](features/A11.md#a11-005)、[A11-006 日本語・翻訳・単位](features/A11.md#a11-006)、[AI-003 整理・修復の候補](features/AI.md#ai-003)、[EXT-004 アニメ・漫画・DTP一式](features/EXT.md#ext-004)、[CLP-004 システム共有・ドロップ](features/CLP.md#clp-004)、[FX-102 レベル](features/FX.md#fx-102)、[FX-103 トーンカーブ](features/FX.md#fx-103)、[FX-106 自然な彩度](features/FX.md#fx-106)、[FX-111 選択色補正](features/FX.md#fx-111)、[FX-125 Median・ごみ取り](features/FX.md#fx-125)、[FX-130 輪郭検出・線画抽出](features/FX.md#fx-130)。

<a id="r10"></a>
## R10 — 色・α・精度を全機能で揃える

無言の降格/二重変換は保存後戻せない。高精度を保ったまま予算を調整する必要がある。

品質：QR-02, QR-04, QR-10, QR-11, QR-14。非待機：NB-01, NB-04, NB-10。外部根拠：S07, S10, S12（[出典](SOURCES.md)）。

[自由発案カード](USER_RESEARCH_CARDS.md#r10) · [AI別案](AI_INDEPENDENT_PROPOSALS.md#r10) · [試験](VALIDATION_PLAN.md) · [判断](DECISIONS.md)

**全対応機能**：[CAN-003 Fit・100%・表示反転](features/CAN.md#can-003)、[BRU-007 テクスチャ・紙質ブラシ](features/BRU.md#bru-007)、[BRU-009 連続描画・重ね塗り・合成](features/BRU.md#bru-009)、[WET-006 混色・試し描きパッド](features/WET.md#wet-006)、[WET-007 厚塗り・油彩・乾式媒体](features/WET.md#wet-007)、[COL-001 色相環・HSV・RGB・HSL](features/COL.md#col-001)、[COL-002 色履歴・前色・背景色](features/COL.md#col-002)、[COL-003 作品・資料スポイト](features/COL.md#col-003)、[COL-005 調和・明度・色覚支援](features/COL.md#col-005)、[COL-006 ICC保持・色変換](features/COL.md#col-006)、[COL-007 広色域・高精度・HDR](features/COL.md#col-007)、[COL-008 Soft Proof・色域警告](features/COL.md#col-008)、[COL-009 色温度・全体色調](features/COL.md#col-009)、[COL-010 CMYK編集と出力](features/COL.md#col-010)、[COL-011 知覚的な色選択・色域マスク](features/COL.md#col-011)、[LAY-004 クリッピング・不透明度ロック](features/LAY.md#lay-004)、[TRN-006 補間・連続調整](features/TRN.md#trn-006)、[GRA-001 線形・放射・反射・角度](features/GRA.md#gra-001)、[GRA-002 停止点・透明度・中間点](features/GRA.md#gra-002)、[GRA-004 グラデーションマップ・階調](features/GRA.md#gra-004)、[FX-001 色調整レイヤー](features/FX.md#fx-001)、[FX-002 高度色調整](features/FX.md#fx-002)、[FX-003 ぼかし](features/FX.md#fx-003)、[FX-004 鮮鋭化・ノイズ・掃除](features/FX.md#fx-004)、[FX-006 網点・線画抽出・縁・発光](features/FX.md#fx-006)、[NDE-001 合成モードと比較](features/NDE.md#nde-001)、[NDE-002 階調依存合成](features/NDE.md#nde-002)、[NDE-005 安全な構造変換](features/NDE.md#nde-005)、[REF-003 反転・グレー・一時非表示](features/REF.md#ref-003)、[REF-004 資料採色と色の出典](features/REF.md#ref-004)、[IO-001 画像を開く・配置する](features/IO.md#io-001)、[IO-002 PNG・JPEG・WebP](features/IO.md#io-002)、[IO-003 PSD・PSB互換](features/IO.md#io-003)、[IO-004 ORA・TIFF](features/IO.md#io-004)、[IO-006 EXR・AVIF・HEIF](features/IO.md#io-006)、[IO-007 出力色・メタデータ](features/IO.md#io-007)、[IO-009 印刷向け確認](features/IO.md#io-009)、[DEV-005 能力差・低負荷・端末間移送](features/DEV.md#dev-005)、[A11-004 色説明・グレー・補正](features/A11.md#a11-004)、[AI-002 色・陰影の候補](features/AI.md#ai-002)、[CLP-002 統合コピー・同位置貼付](features/CLP.md#clp-002)、[PIX-001 1px・整数・アンチエイリアスOFF](features/PIX.md#pix-001)、[PIX-003 固定パレット・Indexed候補](features/PIX.md#pix-003)、[FX-101 明るさ・コントラスト](features/FX.md#fx-101)、[FX-102 レベル](features/FX.md#fx-102)、[FX-103 トーンカーブ](features/FX.md#fx-103)、[FX-104 露出](features/FX.md#fx-104)、[FX-105 色相・彩度・明度](features/FX.md#fx-105)、[FX-106 自然な彩度](features/FX.md#fx-106)、[FX-107 カラーバランス](features/FX.md#fx-107)、[FX-108 色温度・Tint](features/FX.md#fx-108)、[FX-109 白黒](features/FX.md#fx-109)、[FX-110 チャンネルミキサー](features/FX.md#fx-110)、[FX-111 選択色補正](features/FX.md#fx-111)、[FX-112 反転](features/FX.md#fx-112)、[FX-113 階調化](features/FX.md#fx-113)、[FX-114 二値化](features/FX.md#fx-114)、[FX-115 LUT](features/FX.md#fx-115)、[FX-116 ガウスぼかし](features/FX.md#fx-116)、[FX-117 ボックスぼかし](features/FX.md#fx-117)、[FX-118 移動ぼかし](features/FX.md#fx-118)、[FX-120 レンズ・深度ぼかし](features/FX.md#fx-120)、[FX-121 シャープ](features/FX.md#fx-121)、[FX-122 アンシャープマスク](features/FX.md#fx-122)、[FX-123 High Pass](features/FX.md#fx-123)、[FX-124 ノイズ](features/FX.md#fx-124)、[FX-126 モザイク](features/FX.md#fx-126)、[FX-129 網点・スクリーントーン](features/FX.md#fx-129)、[FX-131 線画色変更](features/FX.md#fx-131)、[FX-132 内外の縁取](features/FX.md#fx-132)、[FX-134 内外光彩](features/FX.md#fx-134)、[FX-136 ベベル・エンボス](features/FX.md#fx-136)。

<a id="r11"></a>
## R11 — 座標・原本・編集対象を保つ変形と文字

ナビ/変形/組版の座標系が混ざると品質と直感性が壊れる。逆写像の成立条件を比較する。

品質：QR-02, QR-04, QR-10, QR-12, QR-14, QR-16。非待機：NB-05, NB-06, NB-10。外部根拠：S01, S06, S11（[出典](SOURCES.md)）。

[自由発案カード](USER_RESEARCH_CARDS.md#r11) · [AI別案](AI_INDEPENDENT_PROPOSALS.md#r11) · [試験](VALIDATION_PLAN.md) · [判断](DECISIONS.md)

**全対応機能**：[CAN-004 高倍率・ピクセル確認](features/CAN.md#can-004)、[CAN-005 トリミング・キャンバス拡張](features/CAN.md#can-005)、[CAN-006 画像サイズ変更](features/CAN.md#can-006)、[CAN-008 シームレス反復描画](features/CAN.md#can-008)、[CAN-010 キャンバス外の内容保持](features/CAN.md#can-010)、[INP-008 キーボードとIMEの調停](features/INP.md#inp-008)、[BRU-010 定規・選択との併用](features/BRU.md#bru-010)、[LIN-004 塗り・選択の共通参照](features/LIN.md#lin-004)、[LIN-008 ベクター線画の領域利用](features/LIN.md#lin-008)、[SEL-001 矩形・楕円・投げ縄・多角形](features/SEL.md#sel-001)、[SEL-002 色域・明度・自動選択](features/SEL.md#sel-002)、[SEL-003 拡張・縮小・ぼかし・境界](features/SEL.md#sel-003)、[SEL-004 全選択・解除・再選択・反転](features/SEL.md#sel-004)、[SEL-005 線画領域・層内容から選択](features/SEL.md#sel-005)、[SEL-006 保存選択・選択マスク](features/SEL.md#sel-006)、[SEL-007 境界移動と内容移動](features/SEL.md#sel-007)、[TRN-001 移動・拡縮・回転・反転](features/TRN.md#trn-001)、[TRN-002 自由・パース・傾斜](features/TRN.md#trn-002)、[TRN-003 メッシュ・ケージ・ワープ](features/TRN.md#trn-003)、[TRN-004 ゆがみ・液状化](features/TRN.md#trn-004)、[TRN-005 スナップ・整列・分布](features/TRN.md#trn-005)、[TRN-006 補間・連続調整](features/TRN.md#trn-006)、[TRN-008 非破壊変形と描画](features/TRN.md#trn-008)、[VEC-001 自由描線・パス・図形](features/VEC.md#vec-001)、[VEC-002 オブジェクト・点・ハンドル編集](features/VEC.md#vec-002)、[VEC-003 線幅・筆風・ベクター消去](features/VEC.md#vec-003)、[VEC-004 簡略化・平滑化・ブーリアン](features/VEC.md#vec-004)、[VEC-005 文字・縦横書き・IME](features/VEC.md#vec-005)、[VEC-006 フォント取込・不足解決](features/VEC.md#vec-006)、[VEC-007 文字のパス化・Raster化](features/VEC.md#vec-007)、[VEC-008 パス上文字・高度組版](features/VEC.md#vec-008)、[GUI-001 直線・平行・円・楕円定規](features/GUI.md#gui-001)、[GUI-002 2D・等角・透視ガイド](features/GUI.md#gui-002)、[GUI-004 図形・ベジェ・折線](features/GUI.md#gui-004)、[GUI-006 吸着表示・一時解除・範囲](features/GUI.md#gui-006)、[GUI-007 ガイド・図形プリセット](features/GUI.md#gui-007)、[GRA-001 線形・放射・反射・角度](features/GRA.md#gra-001)、[GRA-003 再編集・マスク・形状追従](features/GRA.md#gra-003)、[FX-005 変位・オフセット・モザイク](features/FX.md#fx-005)、[FX-006 網点・線画抽出・縁・発光](features/FX.md#fx-006)、[FX-007 修復・パッチ・クローン](features/FX.md#fx-007)、[NDE-003 編集可能な効果・変形](features/NDE.md#nde-003)、[HIS-005 部分復元・履歴ブラシ](features/HIS.md#his-005)、[IO-005 SVG](features/IO.md#io-005)、[IO-009 印刷向け確認](features/IO.md#io-009)、[UI-006 Workspace保存・復元・左右反転](features/UI.md#ui-006)、[DEV-001 PC操作](features/DEV.md#dev-001)、[DEV-003 スマートフォン操作](features/DEV.md#dev-003)、[DEV-004 回転・リサイズ・キーボード](features/DEV.md#dev-004)、[A11-001 文字・UI・コントラスト拡大](features/A11.md#a11-001)、[A11-006 日本語・翻訳・単位](features/A11.md#a11-006)、[EXT-005 自由キャンバスと遠隔操作](features/EXT.md#ext-005)、[CLP-002 統合コピー・同位置貼付](features/CLP.md#clp-002)、[CLP-003 文書間の編集データ移送](features/CLP.md#clp-003)、[PIX-001 1px・整数・アンチエイリアスOFF](features/PIX.md#pix-001)、[PIX-002 画素を守る変形と出力](features/PIX.md#pix-002)、[FX-118 移動ぼかし](features/FX.md#fx-118)、[FX-119 放射ぼかし](features/FX.md#fx-119)、[FX-126 モザイク](features/FX.md#fx-126)、[FX-127 オフセット](features/FX.md#fx-127)、[FX-128 変位](features/FX.md#fx-128)、[FX-129 網点・スクリーントーン](features/FX.md#fx-129)、[FX-133 内外の影](features/FX.md#fx-133)、[FX-135 色・グラデ・模様Overlay](features/FX.md#fx-135)、[FX-136 ベベル・エンボス](features/FX.md#fx-136)。

<a id="r12"></a>
## R12 — 湿式媒体の進行を操作可能な状態へ

用途は限定的だが水彩の順序/停止/再現性は通常筆と異なる。未使用のラフへ負荷を広げない。

品質：QR-02, QR-04, QR-05, QR-08, QR-10, QR-19。非待機：NB-01, NB-08, NB-09。外部根拠：S07, S17（[出典](SOURCES.md)）。

[自由発案カード](USER_RESEARCH_CARDS.md#r12) · [AI別案](AI_INDEPENDENT_PROPOSALS.md#r12) · [試験](VALIDATION_PLAN.md) · [判断](DECISIONS.md)

**全対応機能**：[WET-001 ぼかし・引きずり・混色](features/WET.md#wet-001)、[WET-002 水彩・顔料・にじみ](features/WET.md#wet-002)、[WET-003 濡れの可視化・加水・乾燥](features/WET.md#wet-003)、[WET-004 拡散の停止・再開](features/WET.md#wet-004)、[WET-005 紙・吸収・質感編集](features/WET.md#wet-005)、[WET-006 混色・試し描きパッド](features/WET.md#wet-006)、[WET-007 厚塗り・油彩・乾式媒体](features/WET.md#wet-007)、[GUI-003 対称・放射・万華鏡](features/GUI.md#gui-003)。

<a id="r13"></a>
## R13 — 入出力の能力・依存・失敗を局所化

表形式の対応可否だけでは外観/編集性損失を判定できない。Cutと版移行はデータ損失に直結。

品質：QR-07, QR-10, QR-11, QR-17, QR-18, QR-22。非待機：NB-09, NB-10, NB-11。外部根拠：S09, S10, S18（[出典](SOURCES.md)）。

[自由発案カード](USER_RESEARCH_CARDS.md#r13) · [AI別案](AI_INDEPENDENT_PROPOSALS.md#r13) · [試験](VALIDATION_PLAN.md) · [判断](DECISIONS.md)

**全対応機能**：[CAN-009 文書属性・テンプレート](features/CAN.md#can-009)、[BRU-011 ブラシ版と結果の再現](features/BRU.md#bru-011)、[COL-006 ICC保持・色変換](features/COL.md#col-006)、[COL-010 CMYK編集と出力](features/COL.md#col-010)、[LAY-009 Solo・一時表示検査](features/LAY.md#lay-009)、[VEC-006 フォント取込・不足解決](features/VEC.md#vec-006)、[VEC-007 文字のパス化・Raster化](features/VEC.md#vec-007)、[GUI-007 ガイド・図形プリセット](features/GUI.md#gui-007)、[FX-009 明示的な焼込み](features/FX.md#fx-009)、[NDE-004 リンク・埋込・インスタンス](features/NDE.md#nde-004)、[REF-001 複数資料・グループ](features/REF.md#ref-001)、[REF-006 資料保存・不足・権利メモ](features/REF.md#ref-006)、[SAV-007 Offline・ログイン不要制作](features/SAV.md#sav-007)、[SAV-008 バックアップ・版移行・旧形式](features/SAV.md#sav-008)、[IO-001 画像を開く・配置する](features/IO.md#io-001)、[IO-002 PNG・JPEG・WebP](features/IO.md#io-002)、[IO-003 PSD・PSB互換](features/IO.md#io-003)、[IO-004 ORA・TIFF](features/IO.md#io-004)、[IO-005 SVG](features/IO.md#io-005)、[IO-006 EXR・AVIF・HEIF](features/IO.md#io-006)、[IO-007 出力色・メタデータ](features/IO.md#io-007)、[IO-008 レイヤー・選択範囲・一括出力](features/IO.md#io-008)、[IO-009 印刷向け確認](features/IO.md#io-009)、[AST-003 取込・書出・束ね](features/AST.md#ast-003)、[AST-005 ローカル素材と任意の配布](features/AST.md#ast-005)、[AUT-004 バッチ出力](features/AUT.md#aut-004)、[AUT-006 スクリプトと外部アクセス](features/AUT.md#aut-006)、[REC-002 動画の範囲・速度・解像度](features/REC.md#rec-002)、[REC-003 記録の除外・機密資料](features/REC.md#rec-003)、[AI-004 送信・費用・生成の境界](features/AI.md#ai-004)、[EXT-003 3D資料・ポーズ・照明](features/EXT.md#ext-003)、[CLP-001 コピー・切取・貼付](features/CLP.md#clp-001)、[CLP-002 統合コピー・同位置貼付](features/CLP.md#clp-002)、[CLP-003 文書間の編集データ移送](features/CLP.md#clp-003)、[CLP-004 システム共有・ドロップ](features/CLP.md#clp-004)、[PIX-002 画素を守る変形と出力](features/PIX.md#pix-002)、[FX-115 LUT](features/FX.md#fx-115)。

<a id="r14"></a>
## R14 — 高度機能の未使用負荷と長時間の蓄積

宣言/実行/常駐を混ぜると247機能が日常操作の負担になる。初回利用待ちへの負荷移転も比較する。

品質：QR-08, QR-13, QR-17, QR-18, QR-19, QR-20。非待機：NB-03, NB-04, NB-10, NB-11。外部根拠：S13, S14, S17（[出典](SOURCES.md)）。

[自由発案カード](USER_RESEARCH_CARDS.md#r14) · [AI別案](AI_INDEPENDENT_PROPOSALS.md#r14) · [試験](VALIDATION_PLAN.md) · [判断](DECISIONS.md)

**全対応機能**：[BRU-004 プリセット検索・履歴・お気に入り](features/BRU.md#bru-004)、[FIL-008 色指示による面の補助](features/FIL.md#fil-008)、[VEC-008 パス上文字・高度組版](features/VEC.md#vec-008)、[SAV-007 Offline・ログイン不要制作](features/SAV.md#sav-007)、[IO-006 EXR・AVIF・HEIF](features/IO.md#io-006)、[AST-001 素材種別の管理](features/AST.md#ast-001)、[AST-002 検索・タグ・お気に入り](features/AST.md#ast-002)、[AST-005 ローカル素材と任意の配布](features/AST.md#ast-005)、[AUT-001 記録・編集・再生](features/AUT.md#aut-001)、[AUT-005 高速入口・共有](features/AUT.md#aut-005)、[AUT-006 スクリプトと外部アクセス](features/AUT.md#aut-006)、[UI-005 横断コマンド検索](features/UI.md#ui-005)、[DEV-005 能力差・低負荷・端末間移送](features/DEV.md#dev-005)、[REC-001 Timelapse記録と再生](features/REC.md#rec-001)、[REC-002 動画の範囲・速度・解像度](features/REC.md#rec-002)、[REC-003 記録の除外・機密資料](features/REC.md#rec-003)、[REC-004 実作業時間](features/REC.md#rec-004)、[A11-005 動き・音・振動](features/A11.md#a11-005)、[AI-001 選択・領域の補助](features/AI.md#ai-001)、[AI-002 色・陰影の候補](features/AI.md#ai-002)、[AI-003 整理・修復の候補](features/AI.md#ai-003)、[AI-004 送信・費用・生成の境界](features/AI.md#ai-004)、[EXT-001 拡張機能](features/EXT.md#ext-001)、[EXT-002 共同描画・絵チャ](features/EXT.md#ext-002)、[EXT-003 3D資料・ポーズ・照明](features/EXT.md#ext-003)、[EXT-004 アニメ・漫画・DTP一式](features/EXT.md#ext-004)、[EXT-005 自由キャンバスと遠隔操作](features/EXT.md#ext-005)、[PIX-003 固定パレット・Indexed候補](features/PIX.md#pix-003)。
