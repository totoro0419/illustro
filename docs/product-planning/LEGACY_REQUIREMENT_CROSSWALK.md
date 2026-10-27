# 218旧要求の意味的対応検査

改訂：2026-10-27。旧SHA `bdc7135b51033982d90ea5dad104bb04fc107df2`。旧採用状態の自動承継なし。全行を能力/制御/保存の具体記述と対照した。リンク存在の検査と意味対応は別であり、以下は文書上の対照、動作保証ではない。複合項目は一部保留を理由とともに示す。

[個別機能](FEATURE_MASTER_CATALOG.md) · [補完条項](REQUIREMENT_TRACEABILITY.md#補完条項) · [審査](PRODUCT_AUDIT.md)

## FR-CANVAS-001 — 基本描画面

- 旧出典：[docs/FEATURE_SPEC.md:23](https://github.com/totoro0419/illustro_old/blob/bdc7135b51033982d90ea5dad104bb04fc107df2/docs/FEATURE_SPEC.md#L23)
- 要求内容：IllustroはRaster描画可能なCanvasを持たなければならない。
- 判定：**ほかの機能に統合した**。要求「基本描画面」を、下記の制御/対象/保存条件として扱う。旧Required等の採用状態は引継がず、新案の推奨状態で保持。
- 対応能力 [CAN-001](features/CAN.md#can-001)：幅高さ・px/mm・DPI・背景・ICC。標準は直前の安全な新規条件を表示、未選択時はsRGB。作成前は作品履歴なし。作成後は選択済みRaster1枚、属性を保存
- 対応能力 [BRU-001](features/BRU.md#bru-001)：丸/Gペン/鉛筆/マーカー/エアブラシ/硬軟消し。汎用筆は強制入り抜きOFF。一筆一Undo、消しは透明度を減らし背景色で塗らない
- 検証範囲：仕様本文の能力対応を確認。実装/実機未検証。

## FR-CANVAS-002 — View Transform

- 旧出典：[docs/FEATURE_SPEC.md:27](https://github.com/totoro0419/illustro_old/blob/bdc7135b51033982d90ea5dad104bb04fc107df2/docs/FEATURE_SPEC.md#L27)
- 要求内容：Canvas Viewは少なくとも以下を即時操作できなければならない。 /  / - Pan / - Zoom / - Rotate / - Horizontal Flip / - Fit to Screen / - 100% / actual-pixel相当表示
- 判定：**ほかの機能に統合した**。要求「View Transform」を、下記の制御/対象/保存条件として扱う。旧Required等の採用状態は引継がず、新案の推奨状態で保持。
- 対応能力 [CAN-002](features/CAN.md#can-002)：倍率・角度・移動量、回転吸着ON/OFF。ペンと指の役割を表示。表示移動は作品Undo外、文書ごとの表示位置を復帰
- 対応能力 [CAN-003](features/CAN.md#can-003)：Fit・100%・水平/垂直反転・回転0。既定は反転なし。絵を反転せず表示だけ変更、Undo対象外
- 検証範囲：仕様本文の能力対応を確認。実装/実機未検証。

## FR-CANVAS-003 — High Zoom

- 旧出典：[docs/FEATURE_SPEC.md:38](https://github.com/totoro0419/illustro_old/blob/bdc7135b51033982d90ea5dad104bb04fc107df2/docs/FEATURE_SPEC.md#L38)
- 要求内容：最大Zoomは **64000%を目標値**とし、高倍率でも座標の飛び・線のズレ・選択境界の破綻を起こさない設計にしなければならない。
- 判定：**再検討のため保留した**。候補能力を残し、具体的な範囲/方式/実機結果が必要な部分だけ未決として分離した。正式採用には読み替えない。
- 対応能力 [CAN-004](features/CAN.md#can-004)：倍率入力・グリッド閾値・格子色。64000%は目標で達成値ではない。表示設定として保存、グリッド自体は作品外
- 検証範囲：仕様本文の能力対応を確認。実装/実機未検証。

## FR-CANVAS-004 — Canvas Resize / Image Resize

- 旧出典：[docs/FEATURE_SPEC.md:42](https://github.com/totoro0419/illustro_old/blob/bdc7135b51033982d90ea5dad104bb04fc107df2/docs/FEATURE_SPEC.md#L42)
- 要求内容：Canvas ResizeとImage Resizeは別操作として提供しなければならない。 /  / Image Resizeでは補間方式を選択可能にする。最終アルゴリズム一覧は個別仕様で決定する。
- 判定：**ほかの機能に統合した**。要求「Canvas Resize / Image Resize」を、下記の制御/対象/保存条件として扱う。旧Required等の採用状態は引継がず、新案の推奨状態で保持。
- 対応能力 [CAN-005](features/CAN.md#can-005)：枠比率・幅高さ・基準点・外側保持。標準は保持。一回の適用で一Undo。外側保持と完全切除を別コマンド、保持分もNative保存
- 対応能力 [CAN-006](features/CAN.md#can-006)：幅高さ・比率ロック・DPI・補間用途。標準は比率ロック。適用一Undo。連続試行は元から評価。原本サイズはUndo/Snapshotで戻す
- 検証範囲：仕様本文の能力対応を確認。実装/実機未検証。

## FR-CANVAS-005 — Crop

- 旧出典：[docs/FEATURE_SPEC.md:48](https://github.com/totoro0419/illustro_old/blob/bdc7135b51033982d90ea5dad104bb04fc107df2/docs/FEATURE_SPEC.md#L48)
- 要求内容：CropはCanvas上の直接操作を基本とし、必要に応じて数値指定も可能にする。
- 判定：**改善して引き継いだ**。要求「Crop」を、下記の制御/対象/保存条件として扱う。旧Required等の採用状態は引継がず、新案の推奨状態で保持。
- 対応能力 [CAN-005](features/CAN.md#can-005)：枠比率・幅高さ・基準点・外側保持。標準は保持。一回の適用で一Undo。外側保持と完全切除を別コマンド、保持分もNative保存
- 検証範囲：仕様本文の能力対応を確認。実装/実機未検証。

## FR-CANVAS-006 — Multiple Documents

- 旧出典：[docs/FEATURE_SPEC.md:52](https://github.com/totoro0419/illustro_old/blob/bdc7135b51033982d90ea5dad104bb04fc107df2/docs/FEATURE_SPEC.md#L52)
- 要求内容：複数Documentを同時に開ける構造を持たなければならない。
- 判定：**改善して引き継いだ**。要求「Multiple Documents」を、下記の制御/対象/保存条件として扱う。旧Required等の採用状態は引継がず、新案の推奨状態で保持。
- 対応能力 [CAN-007](features/CAN.md#can-007)：文書タブ・保存状態・保留編集数。標準は現在文書を維持。文書ごと履歴分離。切替自体はUndo外。未確定セッションはRecoveryに別記録
- 検証範囲：仕様本文の能力対応を確認。実装/実機未検証。

## FR-CANVAS-007 — Seamless Tile

- 旧出典：[docs/FEATURE_SPEC.md:56](https://github.com/totoro0419/illustro_old/blob/bdc7135b51033982d90ea5dad104bb04fc107df2/docs/FEATURE_SPEC.md#L56)
- 要求内容：Seamless Tile Drawingでは上下左右に反復表示し、境界を越える描画を反対側へリアルタイム反映しなければならない。
- 判定：**改善して引き継いだ**。要求「Seamless Tile」を、下記の制御/対象/保存条件として扱う。旧Required等の採用状態は引継がず、新案の推奨状態で保持。
- 対応能力 [CAN-008](features/CAN.md#can-008)：反復ON/OFF・原タイル枠・繰返し数。反復筆全体が一筆一Undo。保存は一タイル、反復プレビューは表示設定
- 検証範囲：仕様本文の能力対応を確認。実装/実機未検証。

## QR-CANVAS-001 — Large Canvas Scaling

- 旧出典：[docs/FEATURE_SPEC.md:60](https://github.com/totoro0419/illustro_old/blob/bdc7135b51033982d90ea5dad104bb04fc107df2/docs/FEATURE_SPEC.md#L60)
- 要求内容：Canvas Size増加に対して、毎操作で全画像を処理する設計を避けなければならない。 /  / Tile-based方式を第一候補として検証する。
- 判定：**ほかの機能に統合した**。旧文の内部方式は選定を保留し、利用者に見える能力/失敗時保持は下記具体契約へ引継ぐ。旧方式名の不採用を能力削除とはしない。
- 対応能力 [QR-08](QUALITY_REQUIREMENTS.md)：性能の達成値は未検証、内部方式は次段階。
- 対応能力 [QR-20](QUALITY_REQUIREMENTS.md)：性能の達成値は未検証、内部方式は次段階。
- 検証範囲：仕様本文の能力対応を確認。実装/実機未検証。

## FR-INPUT-001 — 対応入力

- 旧出典：[docs/FEATURE_SPEC.md:70](https://github.com/totoro0419/illustro_old/blob/bdc7135b51033982d90ea5dad104bb04fc107df2/docs/FEATURE_SPEC.md#L70)
- 要求内容：以下をサポートする。 /  / - Mouse / - Keyboard / - Touch / - Stylus
- 判定：**ほかの機能に統合した**。要求「対応入力」を、下記の制御/対象/保存条件として扱う。旧Required等の採用状態は引継がず、新案の推奨状態で保持。
- 対応能力 [INP-001](features/INP.md#inp-001)：入力別の描画/表示・指描きON/OFF。既定はペン描画と指ナビ。入力役割は個人設定。途中筆の役割を変えず作品Undo外
- 対応能力 [DEV-001](features/DEV.md#dev-001)：マウス/ペン/Trackpad/Keyboard・密度・複数パネル。文書の意味は他端末と同一、配置のみ個人設定
- 検証範囲：仕様本文の能力対応を確認。実装/実機未検証。

## FR-INPUT-002 — Stylus Data

- 旧出典：[docs/FEATURE_SPEC.md:79](https://github.com/totoro0419/illustro_old/blob/bdc7135b51033982d90ea5dad104bb04fc107df2/docs/FEATURE_SPEC.md#L79)
- 要求内容：Platform/Deviceが提供する場合、以下を利用できなければならない。 /  / - Pressure / - Tilt / - Azimuth / - Barrel rotation where available / - Eraser / - Barrel button
- 判定：**ほかの機能に統合した**。要求「Stylus Data」を、下記の制御/対象/保存条件として扱う。旧Required等の採用状態は引継がず、新案の推奨状態で保持。
- 対応能力 [INP-002](features/INP.md#inp-002)：全体筆圧曲線・最小最大・傾き/方位/軸回転の対応状況。曲線は個人校正、ブラシ変調はプリセット。既存画素/Redo不変
- 対応能力 [INP-003](features/INP.md#inp-003)：ボタン単発/保持/切替、後端の筆種・サイズ独立/連動。個人割当保存、ボタン押下自体で絵のUndoを増やさない
- 検証範囲：仕様本文の能力対応を確認。実装/実機未検証。

## FR-INPUT-003 — Input Normalization

- 旧出典：[docs/FEATURE_SPEC.md:90](https://github.com/totoro0419/illustro_old/blob/bdc7135b51033982d90ea5dad104bb04fc107df2/docs/FEATURE_SPEC.md#L90)
- 要求内容：Device固有入力をBrush Engineが直接依存する形にせず、内部で正規化された入力イベントへ変換する。
- 判定：**改善して引き継いだ**。入力装置差を筆の結果へ無断混入しない能力をINP-007へ保持。正規化イベントの内部形式は確定しない。
- 対応能力 [INP-007](features/INP.md#inp-007)：診断用入力波形・筆圧履歴の任意表示。採用入力に基づく確定結果/Redoの同一性を契約、保存方式は未定
- 検証範囲：仕様本文の能力対応を確認。実装/実機未検証。

## FR-INPUT-004 — Global Input Assistance

- 旧出典：[docs/FEATURE_SPEC.md:94](https://github.com/totoro0419/illustro_old/blob/bdc7135b51033982d90ea5dad104bb04fc107df2/docs/FEATURE_SPEC.md#L94)
- 要求内容：Stroke StabilizationはBrushごとの設定に加え、必要な利用者向けにGlobal設定も提供する。
- 判定：**ほかの機能に統合した**。要求「Global Input Assistance」を、下記の制御/対象/保存条件として扱う。旧Required等の採用状態は引継がず、新案の推奨状態で保持。
- 対応能力 [BRU-003](features/BRU.md#bru-003)：補正OFF/軽い/強い・強度・速度依存・筆圧平滑・全体/筆別。補正はプリセット+全体上書き表示、既存筆は変えない
- 対応能力 [A11-003](features/A11.md#a11-003)：フォーカス順・対象/状態/値・ラベル。支援設定は個人、焦点をモーダル内に迷子にしない
- 検証範囲：仕様本文の能力対応を確認。実装/実機未検証。

## QR-INPUT-001 — Latency

- 旧出典：[docs/FEATURE_SPEC.md:98](https://github.com/totoro0419/illustro_old/blob/bdc7135b51033982d90ea5dad104bb04fc107df2/docs/FEATURE_SPEC.md#L98)
- 要求内容：Pointer入力から可視Stroke更新までの遅延を最重要性能指標として扱う。 /  / 平均FPSのみを性能評価基準にしてはならない。
- 判定：**ほかの機能に統合した**。要求「Latency」を、下記の制御/対象/保存条件として扱う。旧Required等の採用状態は引継がず、新案の推奨状態で保持。
- 対応能力 [QR-02](QUALITY_REQUIREMENTS.md)：性能の達成値は未検証、内部方式は次段階。
- 対応能力 [QR-03](QUALITY_REQUIREMENTS.md)：性能の達成値は未検証、内部方式は次段階。
- 検証範囲：仕様本文の能力対応を確認。実装/実機未検証。

## FR-BRUSH-001 — Procedural Brush

- 旧出典：[docs/FEATURE_SPEC.md:108](https://github.com/totoro0419/illustro_old/blob/bdc7135b51033982d90ea5dad104bb04fc107df2/docs/FEATURE_SPEC.md#L108)
- 要求内容：BrushはRaster Stampのみでなく、複数Parameterを動的に組み合わせて定義可能でなければならない。
- 判定：**改善して引き継いだ**。要求「Procedural Brush」を、下記の制御/対象/保存条件として扱う。旧Required等の採用状態は引継がず、新案の推奨状態で保持。
- 対応能力 [BRU-005](features/BRU.md#bru-005)：形/硬さ/間隔/散布/回転/粒子/形状変形、元筆との差。ブラシの硬さと形状変形は独立制御。取消は作品を変えず筆編集を戻す。元プリセットを無断上書きしない
- 検証範囲：仕様本文の能力対応を確認。実装/実機未検証。

## FR-BRUSH-002 — Modulation Sources

- 旧出典：[docs/FEATURE_SPEC.md:112](https://github.com/totoro0419/illustro_old/blob/bdc7135b51033982d90ea5dad104bb04fc107df2/docs/FEATURE_SPEC.md#L112)
- 要求内容：Brush Parameterは少なくとも以下を変調入力として利用できる構造にする。 /  / - Pressure / - Tilt / - Azimuth / barrel rotation / - Speed / - Direction / - Stroke distance / - Time / - Stroke start/end phase / - Random / - Custom curve
- 判定：**改善して引き継いだ**。始終端/軸回転/乱数/Custom CurveもBRU-006設定に明記し、Pressureだけの縮小を修正した。
- 対応能力 [BRU-006](features/BRU.md#bru-006)：入力:圧/傾き/方位/軸回転/速度/方向/距離/時間/始終端/乱数/カーブ。出力:径/不透明度/流量/間隔/回転/散布/形変形/HSV/硬さ/質感/混色/水/顔料/粒子。対応表と乱数条件をプリセットへ。Redoで乱数を引き直さない
- 検証範囲：仕様本文の能力対応を確認。実装/実機未検証。

## FR-BRUSH-003 — Modulatable Properties

- 旧出典：[docs/FEATURE_SPEC.md:127](https://github.com/totoro0419/illustro_old/blob/bdc7135b51033982d90ea5dad104bb04fc107df2/docs/FEATURE_SPEC.md#L127)
- 要求内容：少なくとも以下を共通変調対象として設計する。 /  / - Size / - Opacity / - Flow / - Spacing / - Rotation / - Scatter / - Shape deformation / - Texture scale/strength/rotation / - Hue/Saturation/Value / - Edge hardness / - Mix/Pull / - Wetness / - Pigment-related values / - Noise/particle values
- 判定：**改善して引き継いだ**。形状変形/Hardness/Mix/Pull/Wet/Pigment/粒子までBRU-006入出力一覧へ追加した。
- 対応能力 [BRU-006](features/BRU.md#bru-006)：入力:圧/傾き/方位/軸回転/速度/方向/距離/時間/始終端/乱数/カーブ。出力:径/不透明度/流量/間隔/回転/散布/形変形/HSV/硬さ/質感/混色/水/顔料/粒子。対応表と乱数条件をプリセットへ。Redoで乱数を引き直さない
- 検証範囲：仕様本文の能力対応を確認。実装/実機未検証。

## FR-BRUSH-004 — Mapping UI

- 旧出典：[docs/FEATURE_SPEC.md:146](https://github.com/totoro0419/illustro_old/blob/bdc7135b51033982d90ea5dad104bb04fc107df2/docs/FEATURE_SPEC.md#L146)
- 要求内容：入力値→ParameterのMappingはCurve、Range、Invert等を共通方式で設定可能にする。
- 判定：**改善して引き継いだ**。要求「Mapping UI」を、下記の制御/対象/保存条件として扱う。旧Required等の採用状態は引継がず、新案の推奨状態で保持。
- 対応能力 [BRU-006](features/BRU.md#bru-006)：入力:圧/傾き/方位/軸回転/速度/方向/距離/時間/始終端/乱数/カーブ。出力:径/不透明度/流量/間隔/回転/散布/形変形/HSV/硬さ/質感/混色/水/顔料/粒子。対応表と乱数条件をプリセットへ。Redoで乱数を引き直さない
- 検証範囲：仕様本文の能力対応を確認。実装/実機未検証。

## FR-BRUSH-005 — Texture

- 旧出典：[docs/FEATURE_SPEC.md:150](https://github.com/totoro0419/illustro_old/blob/bdc7135b51033982d90ea5dad104bb04fc107df2/docs/FEATURE_SPEC.md#L150)
- 要求内容：Procedural方式はRaster Textureを排除しない。 /  / Brush Tip、Grain、Paper Texture等を組み合わせられる。
- 判定：**改善して引き継いだ**。要求「Texture」を、下記の制御/対象/保存条件として扱う。旧Required等の採用状態は引継がず、新案の推奨状態で保持。
- 対応能力 [BRU-007](features/BRU.md#bru-007)：先端画像/生成形・紙目の倍率/角度/深さ/固定先。依存画像を筆と保存。元画像更新は既存筆へ勝手に反映しない
- 検証範囲：仕様本文の能力対応を確認。実装/実機未検証。

## FR-BRUSH-006 — Stabilization

- 旧出典：[docs/FEATURE_SPEC.md:156](https://github.com/totoro0419/illustro_old/blob/bdc7135b51033982d90ea5dad104bb04fc107df2/docs/FEATURE_SPEC.md#L156)
- 要求内容：以下を実現できる設計とする。 /  / - simple smoothing / - moving-average系Stabilization / - advanced motion filtering系処理 / - pressure smoothing / - response curve /  / 正確なアルゴリズムはPrototypeで比較する。
- 判定：**改善して引き継いだ**。補正OFF/軽量/強い/速度依存/筆圧平滑と試筆は保持。移動平均等のアルゴリズム名を確定採用しない。
- 対応能力 [BRU-003](features/BRU.md#bru-003)：補正OFF/軽い/強い・強度・速度依存・筆圧平滑・全体/筆別。補正はプリセット+全体上書き表示、既存筆は変えない
- 検証範囲：仕様本文の能力対応を確認。実装/実機未検証。

## FR-BRUSH-007 — Smudge / Mix

- 旧出典：[docs/FEATURE_SPEC.md:168](https://github.com/totoro0419/illustro_old/blob/bdc7135b51033982d90ea5dad104bb04fc107df2/docs/FEATURE_SPEC.md#L168)
- 要求内容：既存Pixelを引きずるSmudgeと、Pigmentを追加しながら混色するPaint Mixingを区別して扱える構造にする。
- 判定：**改善して引き継いだ**。要求「Smudge / Mix」を、下記の制御/対象/保存条件として扱う。旧Required等の採用状態は引継がず、新案の推奨状態で保持。
- 対応能力 [WET-001](features/WET.md#wet-001)：ぼかし/引きずり/色追加混色・径/強さ/色量・参照元。一筆一Undo。参照合成を使っても出力層を分離
- 検証範囲：仕様本文の能力対応を確認。実装/実機未検証。

## FR-BRUSH-008 — Eraser

- 旧出典：[docs/FEATURE_SPEC.md:172](https://github.com/totoro0419/illustro_old/blob/bdc7135b51033982d90ea5dad104bb04fc107df2/docs/FEATURE_SPEC.md#L172)
- 要求内容：EraserはBrush Engineの能力を可能な限り再利用し、専用機能不足を避ける。
- 判定：**ほかの機能に統合した**。要求「Eraser」を、下記の制御/対象/保存条件として扱う。旧Required等の採用状態は引継がず、新案の推奨状態で保持。
- 対応能力 [BRU-001](features/BRU.md#bru-001)：丸/Gペン/鉛筆/マーカー/エアブラシ/硬軟消し。汎用筆は強制入り抜きOFF。一筆一Undo、消しは透明度を減らし背景色で塗らない
- 対応能力 [BRU-012](features/BRU.md#bru-012)：保持消し/独立消し・径の連動/独立。消去筆は一Undo、戻り先は筆名と対象を保持
- 検証範囲：仕様本文の能力対応を確認。実装/実機未検証。

## QR-BRUSH-001 — Brush Switch

- 旧出典：[docs/FEATURE_SPEC.md:176](https://github.com/totoro0419/illustro_old/blob/bdc7135b51033982d90ea5dad104bb04fc107df2/docs/FEATURE_SPEC.md#L176)
- 要求内容：Brush切替によって制作の流れを阻害する待ち時間を発生させないことを目標とする。
- 判定：**ほかの機能に統合した**。要求「Brush Switch」を、下記の制御/対象/保存条件として扱う。旧Required等の採用状態は引継がず、新案の推奨状態で保持。
- 対応能力 [BRU-004](features/BRU.md#bru-004)：用途タグ・お気に入り・最近・名前検索・リセット。設定中の筆は変更印、複製保存/元へ戻す。履歴を作品Undoと分離
- 対応能力 [QR-03](QUALITY_REQUIREMENTS.md)：性能の達成値は未検証、内部方式は次段階。
- 検証範囲：仕様本文の能力対応を確認。実装/実機未検証。

## FR-WET-001 — Stateful Media

- 旧出典：[docs/FEATURE_SPEC.md:184](https://github.com/totoro0419/illustro_old/blob/bdc7135b51033982d90ea5dad104bb04fc107df2/docs/FEATURE_SPEC.md#L184)
- 要求内容：Wet Mediaは単なるStamp表現ではなく、必要に応じてCanvas側の内部状態を参照・更新できる。
- 判定：**改善して引き継いだ**。要求「Stateful Media」を、下記の制御/対象/保存条件として扱う。旧Required等の採用状態は引継がず、新案の推奨状態で保持。
- 対応能力 [WET-002](features/WET.md#wet-002)：水量/顔料量/拡散/エッジ/粒状感、既定は再現性のある筆プリセット。見た目と再開に必要な状態をNative保持。停止時点をUndoで再現
- 検証範囲：仕様本文の能力対応を確認。実装/実機未検証。

## DR-WET-001 — Candidate State

- 旧出典：[docs/FEATURE_SPEC.md:188](https://github.com/totoro0419/illustro_old/blob/bdc7135b51033982d90ea5dad104bb04fc107df2/docs/FEATURE_SPEC.md#L188)
- 要求内容：少なくとも以下を表現可能なモデルを検証する。 /  / - Wetness / - Pigment / - Flow / - Absorption / - Dryness
- 判定：**ほかの機能に統合した**。旧文の内部方式は選定を保留し、利用者に見える能力/失敗時保持は下記具体契約へ引継ぐ。旧方式名の不採用を能力削除とはしない。
- 対応能力 [WET-002](features/WET.md#wet-002)：水量/顔料量/拡散/エッジ/粒状感、既定は再現性のある筆プリセット。見た目と再開に必要な状態をNative保持。停止時点をUndoで再現
- 対応能力 [WET-005](features/WET.md#wet-005)：紙の尺度/吸収/粒状感・新筆のみ/既存へ再適用。紙版と適用範囲を保持。再適用は一Undo、元絵保持
- 検証範囲：仕様本文の能力対応を確認。実装/実機未検証。

## FR-WET-002 — Simulation Goal

- 旧出典：[docs/FEATURE_SPEC.md:198](https://github.com/totoro0419/illustro_old/blob/bdc7135b51033982d90ea5dad104bb04fc107df2/docs/FEATURE_SPEC.md#L198)
- 要求内容：完全物理再現ではなく、以下の優先順位で最適化する。 /  / 1. イラストとして望ましい見た目 / 2. 操作の予測可能性 / 3. 速度 / 4. 物理的妥当性
- 判定：**改善して引き継いだ**。要求「Simulation Goal」を、下記の制御/対象/保存条件として扱う。旧Required等の採用状態は引継がず、新案の推奨状態で保持。
- 対応能力 [WET-002](features/WET.md#wet-002)：水量/顔料量/拡散/エッジ/粒状感、既定は再現性のある筆プリセット。見た目と再開に必要な状態をNative保持。停止時点をUndoで再現
- 検証範囲：仕様本文の能力対応を確認。実装/実機未検証。

## FR-WET-003 — Determinism

- 旧出典：[docs/FEATURE_SPEC.md:207](https://github.com/totoro0419/illustro_old/blob/bdc7135b51033982d90ea5dad104bb04fc107df2/docs/FEATURE_SPEC.md#L207)
- 要求内容：Undo/Redo、Timelapse、保存/再開のため、同一State/Commandから再現可能な挙動を可能な限り維持する。
- 判定：**ほかの機能に統合した**。要求「Determinism」を、下記の制御/対象/保存条件として扱う。旧Required等の採用状態は引継がず、新案の推奨状態で保持。
- 対応能力 [WET-004](features/WET.md#wet-004)：拡散停止/再開・非アクティブ時停止。背景化/文書切替/履歴比較は自動停止、復帰時は明示再開
- 対応能力 [BRU-011](features/BRU.md#bru-011)：筆の版・依存資源・互換状態。既存画素/Redo/Timelapseに必要な依存をNativeで保持
- 検証範囲：仕様本文の能力対応を確認。実装/実機未検証。

## DR-LINEART-001 — Dedicated structural layer

- 旧出典：[docs/FEATURE_SPEC.md:217](https://github.com/totoro0419/illustro_old/blob/bdc7135b51033982d90ea5dad104bb04fc107df2/docs/FEATURE_SPEC.md#L217)
- 要求内容：線画レイヤーは通常のRaster Layerとは別種の専用レイヤーとして扱う。 /  / 通常のストローク中心Raster線画から、ユーザーが「複製する」感覚で線画レイヤーを生成できることを基本操作とする。
- 判定：**改善して引き継いだ**。要求「Dedicated structural layer」を、下記の制御/対象/保存条件として扱う。旧Required等の採用状態は引継がず、新案の推奨状態で保持。
- 対応能力 [LIN-001](features/LIN.md#lin-001)：生成元Raster/選択層群・処理範囲・候補設定。生成一Undo、専用の領域分けデータと生成元版をNative保存
- 検証範囲：仕様本文の能力対応を確認。実装/実機未検証。

## DR-LINEART-002 — Region partition is the canonical purpose

- 旧出典：[docs/FEATURE_SPEC.md:223](https://github.com/totoro0419/illustro_old/blob/bdc7135b51033982d90ea5dad104bb04fc107df2/docs/FEATURE_SPEC.md#L223)
- 要求内容：線画レイヤーの主データは描画線そのものではなく、**領域分けの構造データ**である。 /  / 内部の境界は描画上の太さを持つ線として定義しない。表示上の見せ方とは分離し、「ここを越えると別の領域になる」という境界・接続・分割情報を表す。
- 判定：**改善して引き継いだ**。太さのない意味的境界・接続・区分を保持。永続Region ID等の破棄済設計は採用しない。
- 対応能力 [LIN-002](features/LIN.md#lin-002)：境界/接続/閉領域/穴/外側/隣接の表示切替。表示のみはUndo外、区分データと対応版は保存
- 検証範囲：仕様本文の能力対応を確認。実装/実機未検証。

## FR-LINEART-001 — Generate from raster lineart

- 旧出典：[docs/FEATURE_SPEC.md:229](https://github.com/totoro0419/illustro_old/blob/bdc7135b51033982d90ea5dad104bb04fc107df2/docs/FEATURE_SPEC.md#L229)
- 要求内容：ストローク中心のRaster線画を入力として線画レイヤーを生成できる。 /  / 生成処理は元Rasterを破壊してはならない。
- 判定：**改善して引き継いだ**。要求「Generate from raster lineart」を、下記の制御/対象/保存条件として扱う。旧Required等の採用状態は引継がず、新案の推奨状態で保持。
- 対応能力 [LIN-001](features/LIN.md#lin-001)：生成元Raster/選択層群・処理範囲・候補設定。生成一Undo、専用の領域分けデータと生成元版をNative保存
- 検証範囲：仕様本文の能力対応を確認。実装/実機未検証。

## FR-LINEART-002 — Editable correction

- 旧出典：[docs/FEATURE_SPEC.md:235](https://github.com/totoro0419/illustro_old/blob/bdc7135b51033982d90ea5dad104bb04fc107df2/docs/FEATURE_SPEC.md#L235)
- 要求内容：自動抽出した接続や領域分けに誤りがある場合、線画レイヤーを選択中にユーザーが修正できなければならない。 /  / 必要な最終操作体系はUI設計とアルゴリズム設計で確定する。
- 判定：**改善して引き継いだ**。要求「Editable correction」を、下記の制御/対象/保存条件として扱う。旧Required等の採用状態は引継がず、新案の推奨状態で保持。
- 対応能力 [LIN-003](features/LIN.md#lin-003)：境界追加/切断・接続許可/拒否・領域統合。一手修正一Undo、手修正を再生成より優先しNative保存
- 検証範囲：仕様本文の能力対応を確認。実装/実機未検証。

## FR-LINEART-003 — Area-based consumers

- 旧出典：[docs/FEATURE_SPEC.md:241](https://github.com/totoro0419/illustro_old/blob/bdc7135b51033982d90ea5dad104bb04fc107df2/docs/FEATURE_SPEC.md#L241)
- 要求内容：線画レイヤーで定義した領域分けを、少なくともFillとSelectionの基準として利用可能にする。 /  / 色差や現在のピクセル色だけに依存せず、線画レイヤー上の領域を直接対象にできることを要求する。
- 判定：**改善して引き継いだ**。要求「Area-based consumers」を、下記の制御/対象/保存条件として扱う。旧Required等の採用状態は引継がず、新案の推奨状態で保持。
- 対応能力 [LIN-004](features/LIN.md#lin-004)：確認済み区分版・塗り/選択の利用先。塗り先と選択マスクは別成果物、区分変更で既存結果は不変
- 検証範囲：仕様本文の能力対応を確認。実装/実機未検証。

## FR-LINEART-004 — Separation from rendered stroke width

- 旧出典：[docs/FEATURE_SPEC.md:247](https://github.com/totoro0419/illustro_old/blob/bdc7135b51033982d90ea5dad104bb04fc107df2/docs/FEATURE_SPEC.md#L247)
- 要求内容：元線画のブラシ太さ・アンチエイリアス・表示上の線幅と、線画レイヤー上の領域境界の意味を分離する。 /  / 線画レイヤーの境界を「太さ付きRaster線」として正本化してはならない。
- 判定：**改善して引き継いだ**。要求「Separation from rendered stroke width」を、下記の制御/対象/保存条件として扱う。旧Required等の採用状態は引継がず、新案の推奨状態で保持。
- 対応能力 [LIN-002](features/LIN.md#lin-002)：境界/接続/閉領域/穴/外側/隣接の表示切替。表示のみはUndo外、区分データと対応版は保存
- 検証範囲：仕様本文の能力対応を確認。実装/実機未検証。

## FR-LINEART-005 — Algorithm status

- 旧出典：[docs/FEATURE_SPEC.md:253](https://github.com/totoro0419/illustro_old/blob/bdc7135b51033982d90ea5dad104bb04fc107df2/docs/FEATURE_SPEC.md#L253)
- 要求内容：以下は**未設計**であり、旧成果物を根拠に確定扱いしてはならない。 /  / - Raster線画から境界・接続を抽出する具体アルゴリズム / - 端点同士、端点と線途中、交差、近接、隙間の判定規則 / - 内部データ構造 / - 領域IDの有無と寿命 / - 隣接情報の保持方式 / - 元Raster編集後の自動追従・再生成・独立保持の方針 / - gap補完の方針 / - exact thresholds / weights / confidence model /  / 接続判定は最終目的ではなく、**編集可能な正しい領域分けデータを生成するための一工程**として設計する。
- 判定：**再検討のため保留した**。抽出判定/ID/閾値は未設計として保持。製品動作の更新案はDEC-01で比較済み、承認待ち。
- 対応能力 [LIN-001](features/LIN.md#lin-001)：生成元Raster/選択層群・処理範囲・候補設定。生成一Undo、専用の領域分けデータと生成元版をNative保存
- 対応能力 [LIN-005](features/LIN.md#lin-005)：旧区分/新候補・差分だけ/全体・手修正の保護。更新一Undo、元の塗りは保持。失われる手修正は個別解決
- 対応能力 [LIN-006](features/LIN.md#lin-006)：端点対端点/線途中/交差/近接・候補強さ。採否を修正として保存し次更新でも無断上書きしない
- 検証範囲：仕様本文の能力対応を確認。実装/実機未検証。

## FR-LINEARTCOLOR-001 — Area reference

- 旧出典：[docs/FEATURE_SPEC.md:270](https://github.com/totoro0419/illustro_old/blob/bdc7135b51033982d90ea5dad104bb04fc107df2/docs/FEATURE_SPEC.md#L270)
- 要求内容：Fillは参照基準として線画レイヤーを選択でき、クリック位置が属する線画レイヤー上の領域を対象にできる。
- 判定：**改善して引き継いだ**。要求「Area reference」を、下記の制御/対象/保存条件として扱う。旧Required等の採用状態は引継がず、新案の推奨状態で保持。
- 対応能力 [FIL-007](features/FIL.md#fil-007)：参照線画版・対象領域・色/透明・境界被覆。塗りは独立出力、元線変更で自動再配色しない。追従型はDEC-01
- 検証範囲：仕様本文の能力対応を確認。実装/実機未検証。

## FR-LINEARTCOLOR-002 — Manual structure takes precedence

- 旧出典：[docs/FEATURE_SPEC.md:274](https://github.com/totoro0419/illustro_old/blob/bdc7135b51033982d90ea5dad104bb04fc107df2/docs/FEATURE_SPEC.md#L274)
- 要求内容：ユーザーが線画レイヤー上で修正した接続・領域分けは、自動判定結果より優先されなければならない。 /  / 自動再解析がユーザー修正を無断で上書きする設計は禁止する。
- 判定：**ほかの機能に統合した**。要求「Manual structure takes precedence」を、下記の制御/対象/保存条件として扱う。旧Required等の採用状態は引継がず、新案の推奨状態で保持。
- 対応能力 [LIN-003](features/LIN.md#lin-003)：境界追加/切断・接続許可/拒否・領域統合。一手修正一Undo、手修正を再生成より優先しNative保存
- 対応能力 [LIN-005](features/LIN.md#lin-005)：旧区分/新候補・差分だけ/全体・手修正の保護。更新一Undo、元の塗りは保持。失われる手修正は個別解決
- 検証範囲：仕様本文の能力対応を確認。実装/実機未検証。

## FR-LINEARTCOLOR-003 — Source-edit behavior is open

- 旧出典：[docs/FEATURE_SPEC.md:280](https://github.com/totoro0419/illustro_old/blob/bdc7135b51033982d90ea5dad104bb04fc107df2/docs/FEATURE_SPEC.md#L280)
- 要求内容：元Raster線画を生成後に編集した場合の挙動は未決定とする。 /  / 自動追従、明示再生成、差分更新、独立保持のいずれも現時点では確定しない。
- 判定：**再検討のため保留した**。旧来の未決状態を自動確定としない。独立区分+差分採用を推奨、追従型を比較対象に残す。
- 対応能力 [LIN-005](features/LIN.md#lin-005)：旧区分/新候補・差分だけ/全体・手修正の保護。更新一Undo、元の塗りは保持。失われる手修正は個別解決
- 検証範囲：仕様本文の能力対応を確認。実装/実機未検証。

## FR-FILL-001 — Flood Fill

- 旧出典：[docs/FEATURE_SPEC.md:289](https://github.com/totoro0419/illustro_old/blob/bdc7135b51033982d90ea5dad104bb04fc107df2/docs/FEATURE_SPEC.md#L289)
- 要求内容：通常のColor Tolerance型Flood Fillを提供する。
- 判定：**改善して引き継いだ**。要求「Flood Fill」を、下記の制御/対象/保存条件として扱う。旧Required等の採用状態は引継がず、新案の推奨状態で保持。
- 対応能力 [FIL-001](features/FIL.md#fil-001)：色差/透明度許容・連続/全体・不透明度。初回は指定参照層、なければ現在層。一塗り一Undo、選択濃度/マスク/アルファロックを尊重、出力層固定
- 検証範囲：仕様本文の能力対応を確認。実装/実機未検証。

## FR-FILL-002 — Reference Source

- 旧出典：[docs/FEATURE_SPEC.md:293](https://github.com/totoro0419/illustro_old/blob/bdc7135b51033982d90ea5dad104bb04fc107df2/docs/FEATURE_SPEC.md#L293)
- 要求内容：Fillは以下を参照元として選択できる設計にする。 /  / - current layer / - selected layers / - reference-designated layers / - visible composite / - Lineart Layer area model
- 判定：**改善して引き継いだ**。要求「Reference Source」を、下記の制御/対象/保存条件として扱う。旧Required等の採用状態は引継がず、新案の推奨状態で保持。
- 対応能力 [FIL-003](features/FIL.md#fil-003)：現在/複数選択/指定参照/表示合成/線画区分、除外層。筆開始時の参照版を固定、複数参照は再読込でも維持
- 検証範囲：仕様本文の能力対応を確認。実装/実機未検証。

## FR-FILL-003 — Gap Closing

- 旧出典：[docs/FEATURE_SPEC.md:303](https://github.com/totoro0419/illustro_old/blob/bdc7135b51033982d90ea5dad104bb04fc107df2/docs/FEATURE_SPEC.md#L303)
- 要求内容：Gap ClosingとToleranceを提供する。
- 判定：**改善して引き継いだ**。要求「Gap Closing」を、下記の制御/対象/保存条件として扱う。旧Required等の採用状態は引継がず、新案の推奨状態で保持。
- 対応能力 [FIL-002](features/FIL.md#fil-002)：隙間幅・許容・拡張/縮小px・角の扱い・塗り残し検査。元線と独立した塗り結果、直後修正はFIL-009
- 検証範囲：仕様本文の能力対応を確認。実装/実機未検証。

## FR-FILL-004 — Boundary Expansion

- 旧出典：[docs/FEATURE_SPEC.md:307](https://github.com/totoro0419/illustro_old/blob/bdc7135b51033982d90ea5dad104bb04fc107df2/docs/FEATURE_SPEC.md#L307)
- 要求内容：Fill結果のExpand/Contractを設定可能にする。
- 判定：**改善して引き継いだ**。要求「Boundary Expansion」を、下記の制御/対象/保存条件として扱う。旧Required等の採用状態は引継がず、新案の推奨状態で保持。
- 対応能力 [FIL-002](features/FIL.md#fil-002)：隙間幅・許容・拡張/縮小px・角の扱い・塗り残し検査。元線と独立した塗り結果、直後修正はFIL-009
- 検証範囲：仕様本文の能力対応を確認。実装/実機未検証。

## FR-FILL-005 — Unified Smart Fill

- 旧出典：[docs/FEATURE_SPEC.md:311](https://github.com/totoro0419/illustro_old/blob/bdc7135b51033982d90ea5dad104bb04fc107df2/docs/FEATURE_SPEC.md#L311)
- 要求内容：以下をバラバラな独立アプリ機能として散在させず、一貫したFill Familyとして設計する。 /  / - Lineart Layer Area Fill / - Enclose and Fill / - Trace and Fill / - Drag Fill / - Continuous Fill
- 判定：**ほかの機能に統合した**。要求「Unified Smart Fill」を、下記の制御/対象/保存条件として扱う。旧Required等の採用状態は引継がず、新案の推奨状態で保持。
- 対応能力 [FIL-004](features/FIL.md#fil-004)：ドラッグ軌跡・同領域重複除外・追加/除外。一ドラッグ一Undo。透明色での連続消去も同じ対象規則
- 対応能力 [FIL-005](features/FIL.md#fil-005)：閉領域のみ/囲い全体・透明/色の対象条件・塗り/消し。一囲い一Undo、囲い自体を新選択に変える場合は明示
- 対応能力 [FIL-006](features/FIL.md#fil-006)：軌跡幅・接触領域・追加/除外。一候補集合一Undo。選択作成へ転用しても同じ区分版
- 対応能力 [FIL-007](features/FIL.md#fil-007)：参照線画版・対象領域・色/透明・境界被覆。塗りは独立出力、元線変更で自動再配色しない。追従型はDEC-01
- 検証範囲：仕様本文の能力対応を確認。実装/実機未検証。

## FR-COLORASSIST-001 — Smart Color Assist

- 旧出典：[docs/FEATURE_SPEC.md:321](https://github.com/totoro0419/illustro_old/blob/bdc7135b51033982d90ea5dad104bb04fc107df2/docs/FEATURE_SPEC.md#L321)
- 要求内容：Smart Color Assistはユーザーの既存Artwork/Lineart Layer area/Paletteを入力とする補助機能として動作する。
- 判定：**ほかの機能に統合した**。要求「Smart Color Assist」を、下記の制御/対象/保存条件として扱う。旧Required等の採用状態は引継がず、新案の推奨状態で保持。
- 対応能力 [AI-002](features/AI.md#ai-002)：既存絵/資料/パレット・候補数/対象・強度。別層/分岐へ採用、一Undo
- 対応能力 [FIL-008](features/FIL.md#fil-008)：指示色/透明指示・対象範囲・更新・出力/指示表示。指示線と出力を分離しNative保存、通常の絵へ焼かない
- 検証範囲：仕様本文の能力対応を確認。実装/実機未検証。

## FR-COLORASSIST-002 — Deterministic-first

- 旧出典：[docs/FEATURE_SPEC.md:325](https://github.com/totoro0419/illustro_old/blob/bdc7135b51033982d90ea5dad104bb04fc107df2/docs/FEATURE_SPEC.md#L325)
- 要求内容：可能な処理は、AI推論を必須にせず決定的アルゴリズムで成立させる。
- 判定：**ほかの機能に統合した**。要求「Deterministic-first」を、下記の制御/対象/保存条件として扱う。旧Required等の採用状態は引継がず、新案の推奨状態で保持。
- 対応能力 [AI-004](features/AI.md#ai-004)：送信先/範囲/費用/保存/学習条件・外部送信既定OFF。同意記録と結果出典を保持、基本制作は独立
- 対応能力 [FIL-008](features/FIL.md#fil-008)：指示色/透明指示・対象範囲・更新・出力/指示表示。指示線と出力を分離しNative保存、通常の絵へ焼かない
- 検証範囲：仕様本文の能力対応を確認。実装/実機未検証。

## FR-COLOR-001 — Picker

- 旧出典：[docs/FEATURE_SPEC.md:333](https://github.com/totoro0419/illustro_old/blob/bdc7135b51033982d90ea5dad104bb04fc107df2/docs/FEATURE_SPEC.md#L333)
- 要求内容：Color Picker / Eyedropper / History / Paletteを提供する。
- 判定：**ほかの機能に統合した**。要求「Picker」を、下記の制御/対象/保存条件として扱う。旧Required等の採用状態は引継がず、新案の推奨状態で保持。
- 対応能力 [COL-001](features/COL.md#col-001)：色相環/HSV/HSL/RGB/Hex・不透明度、作品色空間。色変更は作品Undo外、パレット登録で作品色として保存
- 対応能力 [COL-003](features/COL.md#col-003)：合成/現在層/指定層/資料・点/平均サンプル径・透明の扱い。一時スポイト解除で元筆。作品は変更せず出典を表示
- 対応能力 [COL-004](features/COL.md#col-004)：名前/タグ/フォルダー・色順・取込形式。パレット版を保存、作品内/個人共通を区別
- 検証範囲：仕様本文の能力対応を確認。実装/実機未検証。

## FR-COLOR-002 — Multiple Models

- 旧出典：[docs/FEATURE_SPEC.md:337](https://github.com/totoro0419/illustro_old/blob/bdc7135b51033982d90ea5dad104bb04fc107df2/docs/FEATURE_SPEC.md#L337)
- 要求内容：少なくともRGB系とHSV/HSL系の実用的なColor Controlを提供する。
- 判定：**改善して引き継いだ**。要求「Multiple Models」を、下記の制御/対象/保存条件として扱う。旧Required等の採用状態は引継がず、新案の推奨状態で保持。
- 対応能力 [COL-001](features/COL.md#col-001)：色相環/HSV/HSL/RGB/Hex・不透明度、作品色空間。色変更は作品Undo外、パレット登録で作品色として保存
- 検証範囲：仕様本文の能力対応を確認。実装/実機未検証。

## DR-COLOR-001 — ICC

- 旧出典：[docs/FEATURE_SPEC.md:341](https://github.com/totoro0419/illustro_old/blob/bdc7135b51033982d90ea5dad104bb04fc107df2/docs/FEATURE_SPEC.md#L341)
- 要求内容：Native DocumentはICC Profileまたは同等のColor Space識別情報を保持できなければならない。
- 判定：**改善して引き継いだ**。要求「ICC」を、下記の制御/対象/保存条件として扱う。旧Required等の採用状態は引継がず、新案の推奨状態で保持。
- 対応能力 [COL-006](features/COL.md#col-006)：埋込ICC/仮定色空間・割当/変換・変換先。原ICCと変換履歴を保持、変換適用は一Undo
- 検証範囲：仕様本文の能力対応を確認。実装/実機未検証。

## FR-COLOR-003 — Color Conversion

- 旧出典：[docs/FEATURE_SPEC.md:345](https://github.com/totoro0419/illustro_old/blob/bdc7135b51033982d90ea5dad104bb04fc107df2/docs/FEATURE_SPEC.md#L345)
- 要求内容：Profile ConversionとDisplay Transformを行える構造にする。
- 判定：**改善して引き継いだ**。要求「Color Conversion」を、下記の制御/対象/保存条件として扱う。旧Required等の採用状態は引継がず、新案の推奨状態で保持。
- 対応能力 [COL-006](features/COL.md#col-006)：埋込ICC/仮定色空間・割当/変換・変換先。原ICCと変換履歴を保持、変換適用は一Undo
- 検証範囲：仕様本文の能力対応を確認。実装/実機未検証。

## DR-COLOR-002 — Precision

- 旧出典：[docs/FEATURE_SPEC.md:349](https://github.com/totoro0419/illustro_old/blob/bdc7135b51033982d90ea5dad104bb04fc107df2/docs/FEATURE_SPEC.md#L349)
- 要求内容：内部Document/Tile表現は、8-bit sRGBのみへ固定して将来の高精度化を不可能にしてはならない。 /  / 少なくとも以下を設計対象とする。 /  / - 8-bit integer / - 16-bit integer / - 16-bit float / - 32-bit float（検証対象）
- 判定：**改善して引き継いだ**。8整数/16整数/16float/32floatを区別。32floatは比較待ちだがデータを無言降格しない要求を保持。
- 対応能力 [COL-007](features/COL.md#col-007)：sRGB/P3・8整数/16整数/16float・32float候補、線形光の扱い。精度変更一Undo、旧精度復帰には原状態が必要。HDRは比較検証待ち
- 検証範囲：仕様本文の能力対応を確認。実装/実機未検証。

## FR-COLOR-004 — Wide Gamut

- 旧出典：[docs/FEATURE_SPEC.md:360](https://github.com/totoro0419/illustro_old/blob/bdc7135b51033982d90ea5dad104bb04fc107df2/docs/FEATURE_SPEC.md#L360)
- 要求内容：Display P3等のWide Gamutを扱えるColor Pipelineを目標とする。
- 判定：**改善して引き継いだ**。要求「Wide Gamut」を、下記の制御/対象/保存条件として扱う。旧Required等の採用状態は引継がず、新案の推奨状態で保持。
- 対応能力 [COL-007](features/COL.md#col-007)：sRGB/P3・8整数/16整数/16float・32float候補、線形光の扱い。精度変更一Undo、旧精度復帰には原状態が必要。HDRは比較検証待ち
- 検証範囲：仕様本文の能力対応を確認。実装/実機未検証。

## FR-COLOR-005 — Linear Processing

- 旧出典：[docs/FEATURE_SPEC.md:364](https://github.com/totoro0419/illustro_old/blob/bdc7135b51033982d90ea5dad104bb04fc107df2/docs/FEATURE_SPEC.md#L364)
- 要求内容：Filter/Blend等で必要な場合、Linear-light計算を選択・内部利用できる設計にする。
- 判定：**改善して引き継いだ**。要求「Linear Processing」を、下記の制御/対象/保存条件として扱う。旧Required等の採用状態は引継がず、新案の推奨状態で保持。
- 対応能力 [COL-007](features/COL.md#col-007)：sRGB/P3・8整数/16整数/16float・32float候補、線形光の扱い。精度変更一Undo、旧精度復帰には原状態が必要。HDRは比較検証待ち
- 検証範囲：仕様本文の能力対応を確認。実装/実機未検証。

## FR-COLOR-006 — HDR-ready

- 旧出典：[docs/FEATURE_SPEC.md:368](https://github.com/totoro0419/illustro_old/blob/bdc7135b51033982d90ea5dad104bb04fc107df2/docs/FEATURE_SPEC.md#L368)
- 要求内容：初期ReleaseでHDR Authoring UIを完備しない場合でも、Document/Render architectureで将来実装を不必要に塞がない。
- 判定：**再検討のため保留した**。HDRは将来能力として残し、内部Architectureの事前決定はしない。
- 対応能力 [COL-007](features/COL.md#col-007)：sRGB/P3・8整数/16整数/16float・32float候補、線形光の扱い。精度変更一Undo、旧精度復帰には原状態が必要。HDRは比較検証待ち
- 検証範囲：仕様本文の能力対応を確認。実装/実機未検証。

## FR-COLOR-007 — Soft Proof

- 旧出典：[docs/FEATURE_SPEC.md:372](https://github.com/totoro0419/illustro_old/blob/bdc7135b51033982d90ea5dad104bb04fc107df2/docs/FEATURE_SPEC.md#L372)
- 要求内容：指定した出力ICC Profile等を用いて、最終出力の色域・色変化をCanvas上でPreviewできるSoft Proofを提供する。
- 判定：**改善して引き継いだ**。要求「Soft Proof」を、下記の制御/対象/保存条件として扱う。旧Required等の採用状態は引継がず、新案の推奨状態で保持。
- 対応能力 [COL-008](features/COL.md#col-008)：出力ICC・Intent・黒点補正・色域警告。表示のみで元色/通常採色不変。出力変換は別コマンド
- 検証範囲：仕様本文の能力対応を確認。実装/実機未検証。

## FR-COLOR-008 — Gamut Warning

- 旧出典：[docs/FEATURE_SPEC.md:376](https://github.com/totoro0419/illustro_old/blob/bdc7135b51033982d90ea5dad104bb04fc107df2/docs/FEATURE_SPEC.md#L376)
- 要求内容：Soft Proof時に、出力先で再現できない色をOut-of-Gamut Warningとして可視化できる。 /  / Soft ProofはDocument View単位でON/OFFできる設計を優先し、元Pixelを変更してはならない。
- 判定：**改善して引き継いだ**。要求「Gamut Warning」を、下記の制御/対象/保存条件として扱う。旧Required等の採用状態は引継がず、新案の推奨状態で保持。
- 対応能力 [COL-008](features/COL.md#col-008)：出力ICC・Intent・黒点補正・色域警告。表示のみで元色/通常採色不変。出力変換は別コマンド
- 検証範囲：仕様本文の能力対応を確認。実装/実機未検証。

## FR-LAYER-001 — Layer Types

- 旧出典：[docs/FEATURE_SPEC.md:386](https://github.com/totoro0419/illustro_old/blob/bdc7135b51033982d90ea5dad104bb04fc107df2/docs/FEATURE_SPEC.md#L386)
- 要求内容：最終製品では少なくとも次を扱う。 /  / - Raster / - Vector / - Group / - Mask / - Adjustment / - Filter / - Text /  / ReferenceはArtwork Layerとは意味を分離して管理できる。
- 判定：**ほかの機能に統合した**。要求「Layer Types」を、下記の制御/対象/保存条件として扱う。旧Required等の採用状態は引継がず、新案の推奨状態で保持。
- 対応能力 [LAY-001](features/LAY.md#lay-001)：種別・挿入位置・選択層・描画対象サムネイル。層追加一Undo。筆中の対象変更は次筆から
- 対応能力 [VEC-001](features/VEC.md#vec-001)：自由線/開閉パス・塗り/線・ベジェ/図形。パスとして保存、一パス一Undo、マスクもパス参照可能
- 対応能力 [LAY-005](features/LAY.md#lay-005)：画素/ベクターマスク・白黒/濃度・リンク・反転/無効/適用。マスク筆一Undo。適用は破壊変換、無効化は元保持、全てNative保存
- 対応能力 [FX-001](features/FX.md#fx-001)：調整種別・全体/クリップ先・初期マスク。作成一Undo、元画素保持、個別調整欄を再度開ける
- 対応能力 [FX-008](features/FX.md#fx-008)：有効/無効・並替・不透明度・合成・効果マスク。一並替一Undo、順序/各マスクを保存
- 対応能力 [VEC-005](features/VEC.md#vec-005)：点/枠文字・縦横・font/style/size/整列/字間/行間/基線/色。文字としてNative保存、変換確定を区切りにUndo、Raster化は別
- 対応能力 [REF-001](features/REF.md#ref-001)：複数画像・グループ・前面表示・作品内/個人セット。Always-on-topはアプリ内資料の前面表示、OS全体最前面は利用環境ごと未確認。配置と資料集合をNativeへ保存、資料編集は名前付きUndo
- 検証範囲：仕様本文の能力対応を確認。実装/実機未検証。

## FR-LAYER-002 — Multi-select

- 旧出典：[docs/FEATURE_SPEC.md:400](https://github.com/totoro0419/illustro_old/blob/bdc7135b51033982d90ea5dad104bb04fc107df2/docs/FEATURE_SPEC.md#L400)
- 要求内容：複数Layerを選択し、Move/Transform/Visibility等の適切なCommandをまとめて適用できる。
- 判定：**改善して引き継いだ**。要求「Multi-select」を、下記の制御/対象/保存条件として扱う。旧Required等の採用状態は引継がず、新案の推奨状態で保持。
- 対応能力 [LAY-003](features/LAY.md#lay-003)：複数選択・親子/折畳・移動先・挿入位置。グループ化/移動一操作一Undo、複数対象を一括保持
- 検証範囲：仕様本文の能力対応を確認。実装/実機未検証。

## FR-LAYER-003 — Organization

- 旧出典：[docs/FEATURE_SPEC.md:404](https://github.com/totoro0419/illustro_old/blob/bdc7135b51033982d90ea5dad104bb04fc107df2/docs/FEATURE_SPEC.md#L404)
- 要求内容：以下を持つ。 /  / - Reorder / - Search / - Filter / - Color Tag / - Lock types / - Solo/Isolate / - Collapse / - Duplicate / - Merge / - Merge Visible / - Flatten Copy
- 判定：**ほかの機能に統合した**。要求「Organization」を、下記の制御/対象/保存条件として扱う。旧Required等の採用状態は引継がず、新案の推奨状態で保持。
- 対応能力 [LAY-003](features/LAY.md#lay-003)：複数選択・親子/折畳・移動先・挿入位置。グループ化/移動一操作一Undo、複数対象を一括保持
- 対応能力 [LAY-006](features/LAY.md#lay-006)：複製/下へ結合/選択結合/可視結合/統合コピー。結合一Undo。統合コピーは新層作成し原本不変
- 対応能力 [LAY-007](features/LAY.md#lay-007)：名前・色タグ・種別・検索・フィルター。名称/タグは作品へ保存、一確定一Undo。検索表示はUndo外
- 対応能力 [LAY-008](features/LAY.md#lay-008)：位置/画素内容/全体ロック。ロック設定は作品に保存、一操作一Undo
- 対応能力 [LAY-009](features/LAY.md#lay-009)：Solo/Isolate・戻る。一時検査はUndo外、解除で正確復帰。通常目変更とは区別
- 検証範囲：仕様本文の能力対応を確認。実装/実機未検証。

## FR-LAYER-004 — Alpha Lock / Clipping

- 旧出典：[docs/FEATURE_SPEC.md:420](https://github.com/totoro0419/illustro_old/blob/bdc7135b51033982d90ea5dad104bb04fc107df2/docs/FEATURE_SPEC.md#L420)
- 要求内容：Alpha Lock / Lock Transparencyを高頻度彩色機能として提供する。 /  / Clipping / Alpha Inheritance相当の機能も提供し、状態はLayer UIで即時認識・切替可能にする。
- 判定：**改善して引き継いだ**。要求「Alpha Lock / Clipping」を、下記の制御/対象/保存条件として扱う。旧Required等の採用状態は引継がず、新案の推奨状態で保持。
- 対応能力 [LAY-004](features/LAY.md#lay-004)：クリップ元・クリップON/OFF・透明度ロック。設定変更一Undo。クリップは下層の見える形、Alpha Lockは現在層の既存α保持
- 検証範囲：仕様本文の能力対応を確認。実装/実機未検証。

## FR-LAYER-005 — Layer Style

- 旧出典：[docs/FEATURE_SPEC.md:426](https://github.com/totoro0419/illustro_old/blob/bdc7135b51033982d90ea5dad104bb04fc107df2/docs/FEATURE_SPEC.md#L426)
- 要求内容：Layerへ非破壊Effectを適用できるLayer Styleを提供する。 /  / 対象候補: /  / - Stroke / - Drop Shadow / - Inner Shadow / - Outer Glow / - Inner Glow / - Color Overlay / - Gradient Overlay / - Pattern Overlay / - Bevel / Emboss /  / Effectは展開・非表示・再編集可能にする。
- 判定：**ほかの機能に統合した**。要求「Layer Style」を、下記の制御/対象/保存条件として扱う。旧Required等の採用状態は引継がず、新案の推奨状態で保持。
- 対応能力 [FX-132](features/FX.md#fx-132)：内/中央/外・幅px・色/Gradient/Pattern・角/結合。対象αに基づくStyle、元形状と分離し再編集。設定/入力版/Mask/順序をNative保存。適用一Undo、再度開いて同じ制御を編集。取消は今回の設定だけ戻す
- 対応能力 [FX-133](features/FX.md#fx-133)：内/外・光角/距離px・Spread/Blur・色/不透明度・共有光源。Styleとして保持、共有光源の影響対象を表示。設定/入力版/Mask/順序をNative保存。適用一Undo、再度開いて同じ制御を編集。取消は今回の設定だけ戻す
- 対応能力 [FX-134](features/FX.md#fx-134)：内/外・色・広がり/ぼけ・輪郭Curve・合成・強度。Styleを保存、加算等の合成を明示。設定/入力版/Mask/順序をNative保存。適用一Undo、再度開いて同じ制御を編集。取消は今回の設定だけ戻す
- 対応能力 [FX-135](features/FX.md#fx-135)：単色/Gradient/Pattern・不透明度/合成・模様倍率/角度/原点・形連動。Overlay種別ごとのデータ/依存を保持。設定/入力版/Mask/順序をNative保存。適用一Undo、再度開いて同じ制御を編集。取消は今回の設定だけ戻す
- 対応能力 [FX-136](features/FX.md#fx-136)：内/外Bevel/Emboss・深さ/向き/Size/Softness・光角/高度・Highlight/Shadow。元形状からのStyle、光源と輪郭設定を保存。設定/入力版/Mask/順序をNative保存。適用一Undo、再度開いて同じ制御を編集。取消は今回の設定だけ戻す
- 検証範囲：仕様本文の能力対応を確認。実装/実機未検証。

## FR-LAYER-006 — Direct Canvas Selection

- 旧出典：[docs/FEATURE_SPEC.md:444](https://github.com/totoro0419/illustro_old/blob/bdc7135b51033982d90ea5dad104bb04fc107df2/docs/FEATURE_SPEC.md#L444)
- 要求内容：Canvas上の描画内容から対応Layerを高速に選択する方法を提供する。
- 判定：**改善して引き継いだ**。要求「Direct Canvas Selection」を、下記の制御/対象/保存条件として扱う。旧Required等の採用状態は引継がず、新案の推奨状態で保持。
- 対応能力 [LAY-010](features/LAY.md#lay-010)：見える対象/ロック含有・透明度判定・候補巡回。選択変更は作品Undo外。描画先は確定選択後だけ変化
- 検証範囲：仕様本文の能力対応を確認。実装/実機未検証。

## QR-LAYER-001 — Large Layer Count

- 旧出典：[docs/FEATURE_SPEC.md:448](https://github.com/totoro0419/illustro_old/blob/bdc7135b51033982d90ea5dad104bb04fc107df2/docs/FEATURE_SPEC.md#L448)
- 要求内容：Layer Panelは大量Layerで全Itemを常時重くRenderする実装を避ける。 /  / Virtualization等を使用してUI応答性を維持する。
- 判定：**ほかの機能に統合した**。旧文の内部方式は選定を保留し、利用者に見える能力/失敗時保持は下記具体契約へ引継ぐ。旧方式名の不採用を能力削除とはしない。
- 対応能力 [LAY-007](features/LAY.md#lay-007)：名前・色タグ・種別・検索・フィルター。名称/タグは作品へ保存、一確定一Undo。検索表示はUndo外
- 対応能力 [QR-09](QUALITY_REQUIREMENTS.md)：性能の達成値は未検証、内部方式は次段階。
- 検証範囲：仕様本文の能力対応を確認。実装/実機未検証。

## FR-VECTOR-001 — Path Model

- 旧出典：[docs/FEATURE_SPEC.md:458](https://github.com/totoro0419/illustro_old/blob/bdc7135b51033982d90ea5dad104bb04fc107df2/docs/FEATURE_SPEC.md#L458)
- 要求内容：Vector Layerは少なくとも以下を持つ。 /  / - Path / - Anchor Point / - Bezier Handle / - Open/Closed Path / - Fill / - Stroke
- 判定：**改善して引き継いだ**。要求「Path Model」を、下記の制御/対象/保存条件として扱う。旧Required等の採用状態は引継がず、新案の推奨状態で保持。
- 対応能力 [VEC-001](features/VEC.md#vec-001)：自由線/開閉パス・塗り/線・ベジェ/図形。パスとして保存、一パス一Undo、マスクもパス参照可能
- 検証範囲：仕様本文の能力対応を確認。実装/実機未検証。

## FR-VECTOR-002 — Edit

- 旧出典：[docs/FEATURE_SPEC.md:469](https://github.com/totoro0419/illustro_old/blob/bdc7135b51033982d90ea5dad104bb04fc107df2/docs/FEATURE_SPEC.md#L469)
- 要求内容：NodeのAdd/Delete/Convert、Path Transform、Smooth/Simplifyを提供する。
- 判定：**ほかの機能に統合した**。要求「Edit」を、下記の制御/対象/保存条件として扱う。旧Required等の採用状態は引継がず、新案の推奨状態で保持。
- 対応能力 [VEC-002](features/VEC.md#vec-002)：物体/点選択・角/滑らか・点追加削除・分割接続。一ドラッグ一Undo、パス位相を保持
- 対応能力 [VEC-004](features/VEC.md#vec-004)：簡略化許容量・平滑量・和/差/交差/排他・元形状保持。元形状を残すライブ操作を推奨、焼込は別。適用一Undo
- 検証範囲：仕様本文の能力対応を確認。実装/実機未検証。

## FR-VECTOR-003 — Boolean

- 旧出典：[docs/FEATURE_SPEC.md:473](https://github.com/totoro0419/illustro_old/blob/bdc7135b51033982d90ea5dad104bb04fc107df2/docs/FEATURE_SPEC.md#L473)
- 要求内容：実用的なPath Boolean Operationを提供する。
- 判定：**改善して引き継いだ**。要求「Boolean」を、下記の制御/対象/保存条件として扱う。旧Required等の採用状態は引継がず、新案の推奨状態で保持。
- 対応能力 [VEC-004](features/VEC.md#vec-004)：簡略化許容量・平滑量・和/差/交差/排他・元形状保持。元形状を残すライブ操作を推奨、焼込は別。適用一Undo
- 検証範囲：仕様本文の能力対応を確認。実装/実機未検証。

## FR-VECTOR-004 — Illustration-oriented Stroke

- 旧出典：[docs/FEATURE_SPEC.md:477](https://github.com/totoro0419/illustro_old/blob/bdc7135b51033982d90ea5dad104bb04fc107df2/docs/FEATURE_SPEC.md#L477)
- 要求内容：一枚絵のLineart用途に適したStroke Width編集、可変幅、Vector Eraser等を提供する。
- 判定：**改善して引き継いだ**。要求「Illustration-oriented Stroke」を、下記の制御/対象/保存条件として扱う。旧Required等の採用状態は引継がず、新案の推奨状態で保持。
- 対応能力 [VEC-003](features/VEC.md#vec-003)：全線/接触部分/交点まで・線幅点・筆風先端。パス/可変幅を保存、消去一筆一Undo
- 検証範囲：仕様本文の能力対応を確認。実装/実機未検証。

## FR-VECTOR-005 — Rasterize

- 旧出典：[docs/FEATURE_SPEC.md:481](https://github.com/totoro0419/illustro_old/blob/bdc7135b51033982d90ea5dad104bb04fc107df2/docs/FEATURE_SPEC.md#L481)
- 要求内容：Vectorを明示的にRasterizeできる。
- 判定：**改善して引き継いだ**。要求「Rasterize」を、下記の制御/対象/保存条件として扱う。旧Required等の採用状態は引継がず、新案の推奨状態で保持。
- 対応能力 [VEC-007](features/VEC.md#vec-007)：パス化/画素化・元文字を残すコピー。一変換一Undoで元文字/書式を復元。複製変換推奨
- 検証範囲：仕様本文の能力対応を確認。実装/実機未検証。

## FR-VECTOR-006 — Region Integration

- 旧出典：[docs/FEATURE_SPEC.md:485](https://github.com/totoro0419/illustro_old/blob/bdc7135b51033982d90ea5dad104bb04fc107df2/docs/FEATURE_SPEC.md#L485)
- 要求内容：Vector Lineartを線画レイヤー生成元として利用する方式は未設計であり、別途検討する。
- 判定：**再検討のため保留した**。候補能力を残し、具体的な範囲/方式/実機結果が必要な部分だけ未決として分離した。正式採用には読み替えない。
- 対応能力 [LIN-008](features/LIN.md#lin-008)：見た目基準/パス基準候補・線幅と閉路の差。元パス保持、区分と生成元版を保存
- 検証範囲：仕様本文の能力対応を確認。実装/実機未検証。

## FR-TEXT-001 — Editable Text

- 旧出典：[docs/FEATURE_SPEC.md:493](https://github.com/totoro0419/illustro_old/blob/bdc7135b51033982d90ea5dad104bb04fc107df2/docs/FEATURE_SPEC.md#L493)
- 要求内容：TextはRaster化するまで編集可能なText Entityとして保持する。
- 判定：**改善して引き継いだ**。要求「Editable Text」を、下記の制御/対象/保存条件として扱う。旧Required等の採用状態は引継がず、新案の推奨状態で保持。
- 対応能力 [VEC-005](features/VEC.md#vec-005)：点/枠文字・縦横・font/style/size/整列/字間/行間/基線/色。文字としてNative保存、変換確定を区切りにUndo、Raster化は別
- 検証範囲：仕様本文の能力対応を確認。実装/実機未検証。

## FR-TEXT-002 — Japanese Support

- 旧出典：[docs/FEATURE_SPEC.md:497](https://github.com/totoro0419/illustro_old/blob/bdc7135b51033982d90ea5dad104bb04fc107df2/docs/FEATURE_SPEC.md#L497)
- 要求内容：Horizontal/Vertical TextをRequiredとする。
- 判定：**改善して引き継いだ**。要求「Japanese Support」を、下記の制御/対象/保存条件として扱う。旧Required等の採用状態は引継がず、新案の推奨状態で保持。
- 対応能力 [VEC-005](features/VEC.md#vec-005)：点/枠文字・縦横・font/style/size/整列/字間/行間/基線/色。文字としてNative保存、変換確定を区切りにUndo、Raster化は別
- 検証範囲：仕様本文の能力対応を確認。実装/実機未検証。

## FR-TEXT-003 — Typography Basics

- 旧出典：[docs/FEATURE_SPEC.md:501](https://github.com/totoro0419/illustro_old/blob/bdc7135b51033982d90ea5dad104bb04fc107df2/docs/FEATURE_SPEC.md#L501)
- 要求内容：少なくとも以下を提供する。 /  / - Font family / - style/weight / - size / - alignment / - tracking/letter spacing / - line height / - baseline / - color
- 判定：**改善して引き継いだ**。要求「Typography Basics」を、下記の制御/対象/保存条件として扱う。旧Required等の採用状態は引継がず、新案の推奨状態で保持。
- 対応能力 [VEC-005](features/VEC.md#vec-005)：点/枠文字・縦横・font/style/size/整列/字間/行間/基線/色。文字としてNative保存、変換確定を区切りにUndo、Raster化は別
- 検証範囲：仕様本文の能力対応を確認。実装/実機未検証。

## FR-TEXT-004 — Font Import

- 旧出典：[docs/FEATURE_SPEC.md:514](https://github.com/totoro0419/illustro_old/blob/bdc7135b51033982d90ea5dad104bb04fc107df2/docs/FEATURE_SPEC.md#L514)
- 要求内容：Platformが許す場合、local font importを提供する。
- 判定：**改善して引き継いだ**。要求「Font Import」を、下記の制御/対象/保存条件として扱う。旧Required等の採用状態は引継がず、新案の推奨状態で保持。
- 対応能力 [VEC-006](features/VEC.md#vec-006)：font取込・不足一覧・代替候補・使用箇所。元フォント名/文字/外観を保持。埋込は許諾範囲、置換一Undo
- 検証範囲：仕様本文の能力対応を確認。実装/実機未検証。

## FR-TEXT-005 — Missing Font

- 旧出典：[docs/FEATURE_SPEC.md:518](https://github.com/totoro0419/illustro_old/blob/bdc7135b51033982d90ea5dad104bb04fc107df2/docs/FEATURE_SPEC.md#L518)
- 要求内容：Fontが存在しない場合、無言で別Fontへ置換せず、missing/substitution状態を認識可能にする。
- 判定：**改善して引き継いだ**。要求「Missing Font」を、下記の制御/対象/保存条件として扱う。旧Required等の採用状態は引継がず、新案の推奨状態で保持。
- 対応能力 [VEC-006](features/VEC.md#vec-006)：font取込・不足一覧・代替候補・使用箇所。元フォント名/文字/外観を保持。埋込は許諾範囲、置換一Undo
- 検証範囲：仕様本文の能力対応を確認。実装/実機未検証。

## FR-TEXT-006 — Convert

- 旧出典：[docs/FEATURE_SPEC.md:522](https://github.com/totoro0419/illustro_old/blob/bdc7135b51033982d90ea5dad104bb04fc107df2/docs/FEATURE_SPEC.md#L522)
- 要求内容：TextをVector Pathへ変換する機能を提供する。
- 判定：**改善して引き継いだ**。要求「Convert」を、下記の制御/対象/保存条件として扱う。旧Required等の採用状態は引継がず、新案の推奨状態で保持。
- 対応能力 [VEC-007](features/VEC.md#vec-007)：パス化/画素化・元文字を残すコピー。一変換一Undoで元文字/書式を復元。複製変換推奨
- 検証範囲：仕様本文の能力対応を確認。実装/実機未検証。

## FR-SELECT-001 — Basic Modes

- 旧出典：[docs/FEATURE_SPEC.md:530](https://github.com/totoro0419/illustro_old/blob/bdc7135b51033982d90ea5dad104bb04fc107df2/docs/FEATURE_SPEC.md#L530)
- 要求内容：以下を提供する。 /  / - Rectangle / - Ellipse / - Freehand / - Polygon / - Color/Similarity / - Luminance/Color Range / - Lineart Layer area-based / - Layer-content
- 判定：**ほかの機能に統合した**。要求「Basic Modes」を、下記の制御/対象/保存条件として扱う。旧Required等の採用状態は引継がず、新案の推奨状態で保持。
- 対応能力 [SEL-001](features/SEL.md#sel-001)：矩形/楕円/自由/多角形・置換/加算/減算/交差、既定置換。選択筆/消し選択は径/硬さ/濃度、筆で選択Maskを加減し一筆一Undo。一作成一Undo、濃度付き現在範囲を保存
- 対応能力 [SEL-002](features/SEL.md#sel-002)：色差/明度範囲・連続/全体・参照層・許容。磁気投げ縄は参照層/吸着幅/固定点追加/直前点取消、候補境界を確認して閉じる。適用一Undo、参照は作成時点を固定
- 対応能力 [SEL-005](features/SEL.md#sel-005)：線画区分版/層α・置換/加減算。選択は作成時のコピーで元更新へ勝手に追従しない
- 検証範囲：仕様本文の能力対応を確認。実装/実機未検証。

## FR-SELECT-002 — Boolean Operations

- 旧出典：[docs/FEATURE_SPEC.md:543](https://github.com/totoro0419/illustro_old/blob/bdc7135b51033982d90ea5dad104bb04fc107df2/docs/FEATURE_SPEC.md#L543)
- 要求内容：Add/Subtract/Intersect/Invertを提供する。
- 判定：**ほかの機能に統合した**。要求「Boolean Operations」を、下記の制御/対象/保存条件として扱う。旧Required等の採用状態は引継がず、新案の推奨状態で保持。
- 対応能力 [SEL-001](features/SEL.md#sel-001)：矩形/楕円/自由/多角形・置換/加算/減算/交差、既定置換。選択筆/消し選択は径/硬さ/濃度、筆で選択Maskを加減し一筆一Undo。一作成一Undo、濃度付き現在範囲を保存
- 対応能力 [SEL-004](features/SEL.md#sel-004)：全選択/解除/再選択/反転。解除は画素削除ではなくUndo/再選択可能。ツール切替で保持
- 検証範囲：仕様本文の能力対応を確認。実装/実機未検証。

## FR-SELECT-003 — Edge

- 旧出典：[docs/FEATURE_SPEC.md:547](https://github.com/totoro0419/illustro_old/blob/bdc7135b51033982d90ea5dad104bb04fc107df2/docs/FEATURE_SPEC.md#L547)
- 要求内容：Feather、Expand、Contractを提供する。
- 判定：**改善して引き継いだ**。要求「Edge」を、下記の制御/対象/保存条件として扱う。旧Required等の採用状態は引継がず、新案の推奨状態で保持。
- 対応能力 [SEL-003](features/SEL.md#sel-003)：拡張/縮小px・フェザー半径・境界帯幅。一調整一Undo、元選択から毎回再評価
- 検証範囲：仕様本文の能力対応を確認。実装/実機未検証。

## FR-SELECT-004 — Saved Selection

- 旧出典：[docs/FEATURE_SPEC.md:551](https://github.com/totoro0419/illustro_old/blob/bdc7135b51033982d90ea5dad104bb04fc107df2/docs/FEATURE_SPEC.md#L551)
- 要求内容：Selectionを一時表示だけでなく、Selection Mask等として保存・再利用可能にする。
- 判定：**改善して引き継いだ**。要求「Saved Selection」を、下記の制御/対象/保存条件として扱う。旧Required等の採用状態は引継がず、新案の推奨状態で保持。
- 対応能力 [SEL-006](features/SEL.md#sel-006)：名前・選択マスク・読込時の置換/加算/減算/交差。現在範囲と保存範囲を独立保持、更新は明示、一更新一Undo
- 検証範囲：仕様本文の能力対応を確認。実装/実機未検証。

## FR-SELECT-005 — Select All / Deselect / Reselect

- 旧出典：[docs/FEATURE_SPEC.md:555](https://github.com/totoro0419/illustro_old/blob/bdc7135b51033982d90ea5dad104bb04fc107df2/docs/FEATURE_SPEC.md#L555)
- 要求内容：Select All、Deselect、直前SelectionのReselectをCommandとして提供する。 /  / DeselectはSelection削除ではなくActive Selection解除として扱い、Undo/Reselect可能な履歴を保持できる。
- 判定：**改善して引き継いだ**。要求「Select All / Deselect / Reselect」を、下記の制御/対象/保存条件として扱う。旧Required等の採用状態は引継がず、新案の推奨状態で保持。
- 対応能力 [SEL-004](features/SEL.md#sel-004)：全選択/解除/再選択/反転。解除は画素削除ではなくUndo/再選択可能。ツール切替で保持
- 検証範囲：仕様本文の能力対応を確認。実装/実機未検証。

## DR-SELECT-001 — Grayscale

- 旧出典：[docs/FEATURE_SPEC.md:561](https://github.com/totoro0419/illustro_old/blob/bdc7135b51033982d90ea5dad104bb04fc107df2/docs/FEATURE_SPEC.md#L561)
- 要求内容：Selectionはbinaryだけでなく濃度を持つMaskとして表現可能にする。
- 判定：**ほかの機能に統合した**。要求「Grayscale」を、下記の制御/対象/保存条件として扱う。旧Required等の採用状態は引継がず、新案の推奨状態で保持。
- 対応能力 [SEL-001](features/SEL.md#sel-001)：矩形/楕円/自由/多角形・置換/加算/減算/交差、既定置換。選択筆/消し選択は径/硬さ/濃度、筆で選択Maskを加減し一筆一Undo。一作成一Undo、濃度付き現在範囲を保存
- 対応能力 [SEL-003](features/SEL.md#sel-003)：拡張/縮小px・フェザー半径・境界帯幅。一調整一Undo、元選択から毎回再評価
- 検証範囲：仕様本文の能力対応を確認。実装/実機未検証。

## FR-TRANSFORM-001 — Basic

- 旧出典：[docs/FEATURE_SPEC.md:569](https://github.com/totoro0419/illustro_old/blob/bdc7135b51033982d90ea5dad104bb04fc107df2/docs/FEATURE_SPEC.md#L569)
- 要求内容：Move/Scale/Rotate/Flipを提供する。
- 判定：**改善して引き継いだ**。要求「Basic」を、下記の制御/対象/保存条件として扱う。旧Required等の採用状態は引継がず、新案の推奨状態で保持。
- 対応能力 [TRN-001](features/TRN.md#trn-001)：支点・位置px・角度・縦横比ロック・反転。選択内容/層/複数層の対象を固定、一セッション一Undo
- 検証範囲：仕様本文の能力対応を確認。実装/実機未検証。

## FR-TRANSFORM-002 — Advanced

- 旧出典：[docs/FEATURE_SPEC.md:573](https://github.com/totoro0419/illustro_old/blob/bdc7135b51033982d90ea5dad104bb04fc107df2/docs/FEATURE_SPEC.md#L573)
- 要求内容：Perspective、Distort、Warpを提供する。
- 判定：**ほかの機能に統合した**。要求「Advanced」を、下記の制御/対象/保存条件として扱う。旧Required等の採用状態は引継がず、新案の推奨状態で保持。
- 対応能力 [TRN-002](features/TRN.md#trn-002)：自由/パース/傾斜・四隅・消失方向。元内容を保持し再編集、焼込は明示。選択マスクの関係も固定
- 対応能力 [TRN-003](features/TRN.md#trn-003)：メッシュ分割・固定点/可動点・ケージ・点追加削除。制御点/元内容/保護域を保存、一セッション一Undo
- 検証範囲：仕様本文の能力対応を確認。実装/実機未検証。

## FR-TRANSFORM-003 — Liquify

- 旧出典：[docs/FEATURE_SPEC.md:577](https://github.com/totoro0419/illustro_old/blob/bdc7135b51033982d90ea5dad104bb04fc107df2/docs/FEATURE_SPEC.md#L577)
- 要求内容：Liquifyを提供する。
- 判定：**改善して引き継いだ**。要求「Liquify」を、下記の制御/対象/保存条件として扱う。旧Required等の採用状態は引継がず、新案の推奨状態で保持。
- 対応能力 [TRN-004](features/TRN.md#trn-004)：押す/膨張/収縮/回転/復元・径/強さ/筆圧・保護マスク。筆ごとのセッション内Undo、全体適用は一Undo、変位状態を保存
- 検証範囲：仕様本文の能力対応を確認。実装/実機未検証。

## FR-TRANSFORM-004 — Interpolation

- 旧出典：[docs/FEATURE_SPEC.md:581](https://github.com/totoro0419/illustro_old/blob/bdc7135b51033982d90ea5dad104bb04fc107df2/docs/FEATURE_SPEC.md#L581)
- 要求内容：Raster Transformでは補間方式を選択可能にする。
- 判定：**改善して引き継いだ**。要求「Interpolation」を、下記の制御/対象/保存条件として扱う。旧Required等の採用状態は引継がず、新案の推奨状態で保持。
- 対応能力 [TRN-006](features/TRN.md#trn-006)：補間用途・整数整列・最近傍/滑らか候補。毎ドラッグの劣化を重ねず、一適用のみ。方式選定は未定
- 検証範囲：仕様本文の能力対応を確認。実装/実機未検証。

## IR-TRANSFORM-001 — Direct Manipulation

- 旧出典：[docs/FEATURE_SPEC.md:585](https://github.com/totoro0419/illustro_old/blob/bdc7135b51033982d90ea5dad104bb04fc107df2/docs/FEATURE_SPEC.md#L585)
- 要求内容：Canvas上Handle/Dragを主要操作とし、数値入力は補助手段とする。
- 判定：**改善して引き継いだ**。要求「Direct Manipulation」を、下記の制御/対象/保存条件として扱う。旧Required等の採用状態は引継がず、新案の推奨状態で保持。
- 対応能力 [TRN-001](features/TRN.md#trn-001)：支点・位置px・角度・縦横比ロック・反転。選択内容/層/複数層の対象を固定、一セッション一Undo
- 検証範囲：仕様本文の能力対応を確認。実装/実機未検証。

## FR-TRANSFORM-005 — Non-destructive

- 旧出典：[docs/FEATURE_SPEC.md:589](https://github.com/totoro0419/illustro_old/blob/bdc7135b51033982d90ea5dad104bb04fc107df2/docs/FEATURE_SPEC.md#L589)
- 要求内容：可能なTransformは非破壊状態として保持できる方式を検討・優先する。
- 判定：**改善して引き継いだ**。要求「Non-destructive」を、下記の制御/対象/保存条件として扱う。旧Required等の採用状態は引継がず、新案の推奨状態で保持。
- 対応能力 [TRN-008](features/TRN.md#trn-008)：元内容編集/変形再編集/焼込/上へ新層。元内容と変形をNative保持、直接不可なら無断Raster化しない
- 検証範囲：仕様本文の能力対応を確認。実装/実機未検証。

## FR-GUIDE-001 — Guide Types

- 旧出典：[docs/FEATURE_SPEC.md:597](https://github.com/totoro0419/illustro_old/blob/bdc7135b51033982d90ea5dad104bb04fc107df2/docs/FEATURE_SPEC.md#L597)
- 要求内容：少なくとも次を提供する。 /  / - Straight / Parallel / - 2D Grid / - Isometric / - Perspective 1/2/3 point / - Symmetry / Mirror / - Radial Symmetry
- 判定：**ほかの機能に統合した**。要求「Guide Types」を、下記の制御/対象/保存条件として扱う。旧Required等の採用状態は引継がず、新案の推奨状態で保持。
- 対応能力 [GUI-001](features/GUI.md#gui-001)：直線/平行/円/楕円・中心/角/径・ロック。ガイド配置一Undo、表示のみUndo外。複数と設定を保存
- 対応能力 [GUI-002](features/GUI.md#gui-002)：2D/等角/透視1点2点3点・間隔/角/消失点。ガイドを作品へ保存、一編集一Undo
- 対応能力 [GUI-003](features/GUI.md#gui-003)：軸数・中心・回転・鏡映/放射・一時解除。一筆の反映全体一Undo、軸配置を保存
- 検証範囲：仕様本文の能力対応を確認。実装/実機未検証。

## FR-GUIDE-002 — Canvas Editing

- 旧出典：[docs/FEATURE_SPEC.md:608](https://github.com/totoro0419/illustro_old/blob/bdc7135b51033982d90ea5dad104bb04fc107df2/docs/FEATURE_SPEC.md#L608)
- 要求内容：GuideはCanvas上Handleで直接編集可能にする。
- 判定：**ほかの機能に統合した**。要求「Canvas Editing」を、下記の制御/対象/保存条件として扱う。旧Required等の採用状態は引継がず、新案の推奨状態で保持。
- 対応能力 [GUI-001](features/GUI.md#gui-001)：直線/平行/円/楕円・中心/角/径・ロック。ガイド配置一Undo、表示のみUndo外。複数と設定を保存
- 対応能力 [GUI-002](features/GUI.md#gui-002)：2D/等角/透視1点2点3点・間隔/角/消失点。ガイドを作品へ保存、一編集一Undo
- 検証範囲：仕様本文の能力対応を確認。実装/実機未検証。

## FR-GUIDE-003 — Snapping

- 旧出典：[docs/FEATURE_SPEC.md:612](https://github.com/totoro0419/illustro_old/blob/bdc7135b51033982d90ea5dad104bb04fc107df2/docs/FEATURE_SPEC.md#L612)
- 要求内容：対応Drawing ToolはGuideへSnapできる。
- 判定：**改善して引き継いだ**。要求「Snapping」を、下記の制御/対象/保存条件として扱う。旧Required等の採用状態は引継がず、新案の推奨状態で保持。
- 対応能力 [GUI-006](features/GUI.md#gui-006)：対象ガイド・吸着強度・範囲・可視/ロック。設定はガイドに保存、吸着解除は次接触から
- 検証範囲：仕様本文の能力対応を確認。実装/実機未検証。

## FR-SHAPE-001 — Shapes

- 旧出典：[docs/FEATURE_SPEC.md:616](https://github.com/totoro0419/illustro_old/blob/bdc7135b51033982d90ea5dad104bb04fc107df2/docs/FEATURE_SPEC.md#L616)
- 要求内容：Line、Rectangle、Ellipse、Polygonを提供する。
- 判定：**改善して引き継いだ**。要求「Shapes」を、下記の制御/対象/保存条件として扱う。旧Required等の採用状態は引継がず、新案の推奨状態で保持。
- 対応能力 [GUI-004](features/GUI.md#gui-004)：直線/矩形/角丸/楕円/多角形/ベジェ/折線・線/塗り・比率。Raster/Vectorの出力先を明示、一図形一Undo
- 検証範囲：仕様本文の能力対応を確認。実装/実機未検証。

## FR-SHAPE-002 — Post-stroke Correction

- 旧出典：[docs/FEATURE_SPEC.md:620](https://github.com/totoro0419/illustro_old/blob/bdc7135b51033982d90ea5dad104bb04fc107df2/docs/FEATURE_SPEC.md#L620)
- 要求内容：Freehandで描いたShapeを保持操作等で幾何形状へ補正する高速操作を提供する方向で設計する。
- 判定：**改善して引き継いだ**。要求「Post-stroke Correction」を、下記の制御/対象/保存条件として扱う。旧Required等の採用状態は引継がず、新案の推奨状態で保持。
- 対応能力 [GUI-005](features/GUI.md#gui-005)：保持で補正ON/OFF・候補形・待ち時間。補正採用まで同一筆Undo、形状編集は元候補を保持
- 検証範囲：仕様本文の能力対応を確認。実装/実機未検証。

## FR-GRADIENT-001 — Gradient Types

- 旧出典：[docs/FEATURE_SPEC.md:624](https://github.com/totoro0419/illustro_old/blob/bdc7135b51033982d90ea5dad104bb04fc107df2/docs/FEATURE_SPEC.md#L624)
- 要求内容：少なくとも以下を提供する。 /  / - Linear / - Radial / - Reflected/Bilinear /  / Shape-aware方式は追加検討。
- 判定：**ほかの機能に統合した**。要求「Gradient Types」を、下記の制御/対象/保存条件として扱う。旧Required等の採用状態は引継がず、新案の推奨状態で保持。
- 対応能力 [GRA-001](features/GRA.md#gra-001)：線形/放射/反射/角度・中心/半径/角・繰返し。編集可能塗り層として保持、Raster直接適用は別入口
- 対応能力 [GRA-003](features/GRA.md#gra-003)：塗り層/マスク・形状追従候補・範囲。形状とグラデ設定を保存し再編集、元選択は作成時固定
- 検証範囲：仕様本文の能力対応を確認。実装/実機未検証。

## FR-GRADIENT-002 — Editable

- 旧出典：[docs/FEATURE_SPEC.md:634](https://github.com/totoro0419/illustro_old/blob/bdc7135b51033982d90ea5dad104bb04fc107df2/docs/FEATURE_SPEC.md#L634)
- 要求内容：Gradient Stop、位置、向き等を作成後に変更できる非破壊表現を提供する。
- 判定：**ほかの機能に統合した**。要求「Editable」を、下記の制御/対象/保存条件として扱う。旧Required等の採用状態は引継がず、新案の推奨状態で保持。
- 対応能力 [GRA-002](features/GRA.md#gra-002)：色停止点/α停止点・位置/中間点・反転/反復。停止点全体を保存、編集セッション一Undo
- 対応能力 [GRA-003](features/GRA.md#gra-003)：塗り層/マスク・形状追従候補・範囲。形状とグラデ設定を保存し再編集、元選択は作成時固定
- 検証範囲：仕様本文の能力対応を確認。実装/実機未検証。

## FR-BLEND-001 — Core Blend Modes

- 旧出典：[docs/FEATURE_SPEC.md:642](https://github.com/totoro0419/illustro_old/blob/bdc7135b51033982d90ea5dad104bb04fc107df2/docs/FEATURE_SPEC.md#L642)
- 要求内容：少なくとも次の系統を提供する。 /  / - Normal / Dissolve / - Darken / Multiply / Burn系 / - Lighten / Screen / Dodge系 / - Overlay / Soft Light / Hard Light系 / - Vivid/Linear/Pin/Hard Mix系 / - Difference / Exclusion / - Subtract / Divide / - Hue / Saturation / Color / Luminosity
- 判定：**改善して引き継いだ**。Dissolve/Vivid/Linear/Pin/HardMix/Subtract/Divideを含む全系統をNDE-001へ明記した。
- 対応能力 [NDE-001](features/NDE.md#nde-001)：Normal/Dissolve、暗く/明るく、Multiply/Screen/Burn/Dodge、Overlay/Soft/Hard/Vivid/Linear/Pin/HardMix、Difference/Exclusion/Subtract/Divide、Hue/Saturation/Color/Luminosity。合成名と強度を層に保存、一選択一Undo
- 検証範囲：仕様本文の能力対応を確認。実装/実機未検証。

## FR-BLEND-002 — Painting Modes

- 旧出典：[docs/FEATURE_SPEC.md:655](https://github.com/totoro0419/illustro_old/blob/bdc7135b51033982d90ea5dad104bb04fc107df2/docs/FEATURE_SPEC.md#L655)
- 要求内容：Erase/Behind/Alpha関連等、Paintingに有用なModeをBrush側でも利用できる設計にする。
- 判定：**改善して引き継いだ**。要求「Painting Modes」を、下記の制御/対象/保存条件として扱う。旧Required等の採用状態は引継がず、新案の推奨状態で保持。
- 対応能力 [BRU-009](features/BRU.md#bru-009)：一筆内蓄積/次筆蓄積・流量/不透明度・Erase/Behind/Alpha関連。一筆内の重複と別筆を区別、Redoと確定像一致
- 検証範囲：仕様本文の能力対応を確認。実装/実機未検証。

## FR-BLEND-003 — Preview

- 旧出典：[docs/FEATURE_SPEC.md:659](https://github.com/totoro0419/illustro_old/blob/bdc7135b51033982d90ea5dad104bb04fc107df2/docs/FEATURE_SPEC.md#L659)
- 要求内容：Blend Modeを選択するときCanvas上Live Previewを提供する。
- 判定：**改善して引き継いだ**。要求「Preview」を、下記の制御/対象/保存条件として扱う。旧Required等の採用状態は引継がず、新案の推奨状態で保持。
- 対応能力 [NDE-001](features/NDE.md#nde-001)：Normal/Dissolve、暗く/明るく、Multiply/Screen/Burn/Dodge、Overlay/Soft/Hard/Vivid/Linear/Pin/HardMix、Difference/Exclusion/Subtract/Divide、Hue/Saturation/Color/Luminosity。合成名と強度を層に保存、一選択一Undo
- 検証範囲：仕様本文の能力対応を確認。実装/実機未検証。

## FR-BLENDIF-001 — Blend If Equivalent

- 旧出典：[docs/FEATURE_SPEC.md:663](https://github.com/totoro0419/illustro_old/blob/bdc7135b51033982d90ea5dad104bb04fc107df2/docs/FEATURE_SPEC.md#L663)
- 要求内容：Layer自身または下地のTone/Channel Rangeに応じて合成を制御できる。 /  / UIはTone Rangeと結果の関係を視覚的に理解できる方式を優先する。
- 判定：**改善して引き継いだ**。要求「Blend If Equivalent」を、下記の制御/対象/保存条件として扱う。旧Required等の採用状態は引継がず、新案の推奨状態で保持。
- 対応能力 [NDE-002](features/NDE.md#nde-002)：自層/下地・輝度/RGB成分・上下境界と滑らかさ。範囲・チャンネル・滑らかさを保存、一セッション一Undo
- 検証範囲：仕様本文の能力対応を確認。実装/実機未検証。

## FR-ADJ-001 — Adjustment Layer

- 旧出典：[docs/FEATURE_SPEC.md:673](https://github.com/totoro0419/illustro_old/blob/bdc7135b51033982d90ea5dad104bb04fc107df2/docs/FEATURE_SPEC.md#L673)
- 要求内容：AdjustmentをLayerとして非破壊保持できる。
- 判定：**改善して引き継いだ**。要求「Adjustment Layer」を、下記の制御/対象/保存条件として扱う。旧Required等の採用状態は引継がず、新案の推奨状態で保持。
- 対応能力 [FX-001](features/FX.md#fx-001)：調整種別・全体/クリップ先・初期マスク。作成一Undo、元画素保持、個別調整欄を再度開ける
- 検証範囲：仕様本文の能力対応を確認。実装/実機未検証。

## FR-ADJ-002 — Core Adjustments

- 旧出典：[docs/FEATURE_SPEC.md:677](https://github.com/totoro0419/illustro_old/blob/bdc7135b51033982d90ea5dad104bb04fc107df2/docs/FEATURE_SPEC.md#L677)
- 要求内容：少なくとも以下を対象とする。 /  / - Brightness/Contrast / - Levels / - Curves / - Exposure / - Hue/Saturation/Lightness / - Vibrance / - Color Balance / - Temperature/Tint / - Black & White / - Channel Mixer / - Selective Color / - Invert / - Posterize / - Threshold / - Gradient Map / - LUT/Color Lookup
- 判定：**ほかの機能に統合した**。要求「Core Adjustments」を、下記の制御/対象/保存条件として扱う。旧Required等の採用状態は引継がず、新案の推奨状態で保持。
- 対応能力 [FX-101](features/FX.md#fx-101)：明るさ/コントラスト・輝度のみ/色成分、初期0/0。色/輝度を調整、αは保持。設定/入力版/Mask/順序をNative保存。適用一Undo、再度開いて同じ制御を編集。取消は今回の設定だけ戻す
- 対応能力 [FX-102](features/FX.md#fx-102)：入力黒/中間/白・出力黒白・RGB/各成分、初期は全域。色チャンネル単位、選択からの初期マスク。設定/入力版/Mask/順序をNative保存。適用一Undo、再度開いて同じ制御を編集。取消は今回の設定だけ戻す
- 対応能力 [FX-103](features/FX.md#fx-103)：RGB/各成分・制御点の入力出力・点追加削除・初期対角。入出力対応を保存、α調整は別モードとしてのみ許可。設定/入力版/Mask/順序をNative保存。適用一Undo、再度開いて同じ制御を編集。取消は今回の設定だけ戻す
- 対応能力 [FX-104](features/FX.md#fx-104)：露出EV/Offset/Gamma、初期0/0/1。色管理された作業空間の露出、α不変。設定/入力版/Mask/順序をNative保存。適用一Undo、再度開いて同じ制御を編集。取消は今回の設定だけ戻す
- 対応能力 [FX-105](features/FX.md#fx-105)：Hue角/Saturation/Lightness・全体/色域・Colorize、初期移動0。対象色域を保存、マスクと併用。設定/入力版/Mask/順序をNative保存。適用一Undo、再度開いて同じ制御を編集。取消は今回の設定だけ戻す
- 対応能力 [FX-106](features/FX.md#fx-106)：Vibrance/Saturation、初期0。低彩度優先の調整、α不変。設定/入力版/Mask/順序をNative保存。適用一Undo、再度開いて同じ制御を編集。取消は今回の設定だけ戻す
- 対応能力 [FX-107](features/FX.md#fx-107)：Shadows/Midtones/Highlights・補色3軸・輝度維持。各階調域と滑らかな重複を保存。設定/入力版/Mask/順序をNative保存。適用一Undo、再度開いて同じ制御を編集。取消は今回の設定だけ戻す
- 対応能力 [FX-108](features/FX.md#fx-108)：Temperature/Tint・相対暖寒/基準白、初期中立。色空間と基準白を保持、α不変。設定/入力版/Mask/順序をNative保存。適用一Undo、再度開いて同じ制御を編集。取消は今回の設定だけ戻す
- 対応能力 [FX-109](features/FX.md#fx-109)：赤/黄/緑/シアン/青/マゼンタの寄与・Tint任意。色から灰色への寄与を保存、薄いα保持。設定/入力版/Mask/順序をNative保存。適用一Undo、再度開いて同じ制御を編集。取消は今回の設定だけ戻す
- 対応能力 [FX-110](features/FX.md#fx-110)：出力R/G/B毎の入力R/G/B係数+定数・Monochrome。係数と作業空間を保持、αは通常不変。設定/入力版/Mask/順序をNative保存。適用一Undo、再度開いて同じ制御を編集。取消は今回の設定だけ戻す
- 対応能力 [FX-111](features/FX.md#fx-111)：対象色/中立/白/黒・成分補正量・相対/絶対。RGB作業での選択色補正とCMYKNativeを区別。設定/入力版/Mask/順序をNative保存。適用一Undo、再度開いて同じ制御を編集。取消は今回の設定だけ戻す
- 対応能力 [FX-112](features/FX.md#fx-112)：RGB/輝度・α反転は別で初期OFF。単純効果だが対象/強度/Maskを保持。設定/入力版/Mask/順序をNative保存。適用一Undo、再度開いて同じ制御を編集。取消は今回の設定だけ戻す
- 対応能力 [FX-113](features/FX.md#fx-113)：段階数・成分/輝度・ディザ、初期は見本候補4段。段階数とディザ条件を保存。設定/入力版/Mask/順序をNative保存。適用一Undo、再度開いて同じ制御を編集。取消は今回の設定だけ戻す
- 対応能力 [FX-114](features/FX.md#fx-114)：閾値・入力輝度/成分・二値の色、初期中央。αは保持、選択をマスクへ固定。設定/入力版/Mask/順序をNative保存。適用一Undo、再度開いて同じ制御を編集。取消は今回の設定だけ戻す
- 対応能力 [FX-115](features/FX.md#fx-115)：LUT資源/強度・入力色空間/出力空間・補間候補。LUT版/必要データと色空間をNativeへ埋込。設定/入力版/Mask/順序をNative保存。適用一Undo、再度開いて同じ制御を編集。取消は今回の設定だけ戻す
- 対応能力 [GRA-004](features/GRA.md#gra-004)：明度→色停止点・階調数・ディザON/OFF。調整レイヤーとして保持、停止点をパレット再利用
- 検証範囲：仕様本文の能力対応を確認。実装/実機未検証。

## FR-FILTER-001 — Live Filter

- 旧出典：[docs/FEATURE_SPEC.md:698](https://github.com/totoro0419/illustro_old/blob/bdc7135b51033982d90ea5dad104bb04fc107df2/docs/FEATURE_SPEC.md#L698)
- 要求内容：Filterを再編集可能な非破壊状態として保持できる。
- 判定：**改善して引き継いだ**。要求「Live Filter」を、下記の制御/対象/保存条件として扱う。旧Required等の採用状態は引継がず、新案の推奨状態で保持。
- 対応能力 [FX-008](features/FX.md#fx-008)：有効/無効・並替・不透明度・合成・効果マスク。一並替一Undo、順序/各マスクを保存
- 検証範囲：仕様本文の能力対応を確認。実装/実機未検証。

## FR-FILTER-002 — Core Filters

- 旧出典：[docs/FEATURE_SPEC.md:702](https://github.com/totoro0419/illustro_old/blob/bdc7135b51033982d90ea5dad104bb04fc107df2/docs/FEATURE_SPEC.md#L702)
- 要求内容：少なくとも以下を対象とする。 /  / - Gaussian Blur / - Motion Blur / - Radial Blur / - Sharpen / - Unsharp Mask / - High Pass / - Noise / - Median系cleanup / - Pixelate/Mosaic / - Offset / - Displacement / - Halftone/Screentone-oriented effect
- 判定：**ほかの機能に統合した**。要求「Core Filters」を、下記の制御/対象/保存条件として扱う。旧Required等の採用状態は引継がず、新案の推奨状態で保持。
- 対応能力 [FX-116](features/FX.md#fx-116)：半径px・縁処理/α保護、初期半径0。画素層/Groupを入力に平滑化、出力Maskと入力の読み範囲を区別。設定/入力版/Mask/順序をNative保存。適用一Undo、再度開いて同じ制御を編集。取消は今回の設定だけ戻す
- 対応能力 [FX-118](features/FX.md#fx-118)：角度/距離px・中心/片方向・α保護。方向/距離/境界条件を保存、Maskで作用域制限。設定/入力版/Mask/順序をNative保存。適用一Undo、再度開いて同じ制御を編集。取消は今回の設定だけ戻す
- 対応能力 [FX-119](features/FX.md#fx-119)：中心X/Y・回転/Zoom・量・保護域。中心は文書座標、設定保存し再編集。設定/入力版/Mask/順序をNative保存。適用一Undo、再度開いて同じ制御を編集。取消は今回の設定だけ戻す
- 対応能力 [FX-121](features/FX.md#fx-121)：強さ・微細領域/縁保護、初期0。色/輝度作用を明示し元保持。設定/入力版/Mask/順序をNative保存。適用一Undo、再度開いて同じ制御を編集。取消は今回の設定だけ戻す
- 対応能力 [FX-122](features/FX.md#fx-122)：Amount/Radius/Threshold・輝度のみ、初期量0。半径/閾値を保存、α不変。設定/入力版/Mask/順序をNative保存。適用一Undo、再度開いて同じ制御を編集。取消は今回の設定だけ戻す
- 対応能力 [FX-123](features/FX.md#fx-123)：半径・中立値・単独/合成表示。HighPass出力と合成設定を分離保持。設定/入力版/Mask/順序をNative保存。適用一Undo、再度開いて同じ制御を編集。取消は今回の設定だけ戻す
- 対応能力 [FX-124](features/FX.md#fx-124)：量・単色/色・分布・粒径・乱数条件。同一条件で同じ粒を再現、Mask範囲だけへ出力。設定/入力版/Mask/順序をNative保存。適用一Undo、再度開いて同じ制御を編集。取消は今回の設定だけ戻す
- 対応能力 [FX-125](features/FX.md#fx-125)：Median半径・ごみサイズ/閾値・局所Mask。Medianと検出ごみ除去を別選択、出力を再編集。設定/入力版/Mask/順序をNative保存。適用一Undo、再度開いて同じ制御を編集。取消は今回の設定だけ戻す
- 対応能力 [FX-126](features/FX.md#fx-126)：横縦ブロックpx・連動・格子原点・代表色。格子原点/寸法を保存、出力Maskを独立。設定/入力版/Mask/順序をNative保存。適用一Undo、再度開いて同じ制御を編集。取消は今回の設定だけ戻す
- 対応能力 [FX-127](features/FX.md#fx-127)：X/Y移動px・巻戻し/透明/端延長・半幅ボタン。整数値なら画素の可逆移動、外側処理を保存。設定/入力版/Mask/順序をNative保存。適用一Undo、再度開いて同じ制御を編集。取消は今回の設定だけ戻す
- 対応能力 [FX-128](features/FX.md#fx-128)：変位元/版・X/Y強さ・基準値・座標Fit/原寸・縁。依存Mapと変位設定を保持、循環参照は拒否。設定/入力版/Mask/順序をNative保存。適用一Undo、再度開いて同じ制御を編集。取消は今回の設定だけ戻す
- 対応能力 [FX-129](features/FX.md#fx-129)：線数lpi/間隔px・角度・点形・密度・基準DPI・AA。網点設定と元濃度を保持、モノクロ出力と通常表示を分離。設定/入力版/Mask/順序をNative保存。適用一Undo、再度開いて同じ制御を編集。取消は今回の設定だけ戻す
- 検証範囲：仕様本文の能力対応を確認。実装/実機未検証。

## FR-FILTER-003 — Composition

- 旧出典：[docs/FEATURE_SPEC.md:719](https://github.com/totoro0419/illustro_old/blob/bdc7135b51033982d90ea5dad104bb04fc107df2/docs/FEATURE_SPEC.md#L719)
- 要求内容：Live Filterは必要に応じてMask、Opacity、Blend Mode、Reorderを利用できる。
- 判定：**改善して引き継いだ**。要求「Composition」を、下記の制御/対象/保存条件として扱う。旧Required等の採用状態は引継がず、新案の推奨状態で保持。
- 対応能力 [FX-008](features/FX.md#fx-008)：有効/無効・並替・不透明度・合成・効果マスク。一並替一Undo、順序/各マスクを保存
- 検証範囲：仕様本文の能力対応を確認。実装/実機未検証。

## FR-FILTER-004 — Destructive Apply

- 旧出典：[docs/FEATURE_SPEC.md:723](https://github.com/totoro0419/illustro_old/blob/bdc7135b51033982d90ea5dad104bb04fc107df2/docs/FEATURE_SPEC.md#L723)
- 要求内容：高速・単純な用途向けに、明示的な破壊適用Commandも提供できる。
- 判定：**改善して引き継いだ**。要求「Destructive Apply」を、下記の制御/対象/保存条件として扱う。旧Required等の採用状態は引継がず、新案の推奨状態で保持。
- 対応能力 [FX-009](features/FX.md#fx-009)：現在へ焼込/複製して焼込・解像度/色深度。焼込一Undo、原本保持コピーを標準推奨
- 検証範囲：仕様本文の能力対応を確認。実装/実機未検証。

## FR-REPAIR-001 — Healing

- 旧出典：[docs/FEATURE_SPEC.md:731](https://github.com/totoro0419/illustro_old/blob/bdc7135b51033982d90ea5dad104bb04fc107df2/docs/FEATURE_SPEC.md#L731)
- 要求内容：周囲のTexture/Colorを利用した修復Brushを提供する。
- 判定：**改善して引き継いだ**。要求「Healing」を、下記の制御/対象/保存条件として扱う。旧Required等の採用状態は引継がず、新案の推奨状態で保持。
- 対応能力 [FX-007](features/FX.md#fx-007)：修復/パッチ/クローン・源点/整列・参照層・径/境界なじみ。新しい修復層を選べ、一筆/一パッチ一Undo、元は保持
- 検証範囲：仕様本文の能力対応を確認。実装/実機未検証。

## FR-REPAIR-002 — Patch

- 旧出典：[docs/FEATURE_SPEC.md:735](https://github.com/totoro0419/illustro_old/blob/bdc7135b51033982d90ea5dad104bb04fc107df2/docs/FEATURE_SPEC.md#L735)
- 要求内容：選択領域を別領域から修復するPatch Workflowを提供する。
- 判定：**改善して引き継いだ**。要求「Patch」を、下記の制御/対象/保存条件として扱う。旧Required等の採用状態は引継がず、新案の推奨状態で保持。
- 対応能力 [FX-007](features/FX.md#fx-007)：修復/パッチ/クローン・源点/整列・参照層・径/境界なじみ。新しい修復層を選べ、一筆/一パッチ一Undo、元は保持
- 検証範囲：仕様本文の能力対応を確認。実装/実機未検証。

## FR-REPAIR-003 — Clone

- 旧出典：[docs/FEATURE_SPEC.md:739](https://github.com/totoro0419/illustro_old/blob/bdc7135b51033982d90ea5dad104bb04fc107df2/docs/FEATURE_SPEC.md#L739)
- 要求内容：Source Pointを指定して描画するCloneを提供する。
- 判定：**改善して引き継いだ**。要求「Clone」を、下記の制御/対象/保存条件として扱う。旧Required等の採用状態は引継がず、新案の推奨状態で保持。
- 対応能力 [FX-007](features/FX.md#fx-007)：修復/パッチ/クローン・源点/整列・参照層・径/境界なじみ。新しい修復層を選べ、一筆/一パッチ一Undo、元は保持
- 検証範囲：仕様本文の能力対応を確認。実装/実機未検証。

## IR-REPAIR-001 — Illustration-oriented

- 旧出典：[docs/FEATURE_SPEC.md:743](https://github.com/totoro0419/illustro_old/blob/bdc7135b51033982d90ea5dad104bb04fc107df2/docs/FEATURE_SPEC.md#L743)
- 要求内容：写真編集Dialog中心ではなく、Canvas上でSource/Targetを確認できる直接操作を優先する。
- 判定：**改善して引き継いだ**。要求「Illustration-oriented」を、下記の制御/対象/保存条件として扱う。旧Required等の採用状態は引継がず、新案の推奨状態で保持。
- 対応能力 [FX-007](features/FX.md#fx-007)：修復/パッチ/クローン・源点/整列・参照層・径/境界なじみ。新しい修復層を選べ、一筆/一パッチ一Undo、元は保持
- 検証範囲：仕様本文の能力対応を確認。実装/実機未検証。

## FR-REF-001 — Independent References

- 旧出典：[docs/FEATURE_SPEC.md:751](https://github.com/totoro0419/illustro_old/blob/bdc7135b51033982d90ea5dad104bb04fc107df2/docs/FEATURE_SPEC.md#L751)
- 要求内容：ReferenceはArtwork Layerとは独立して管理可能にする。
- 判定：**改善して引き継いだ**。要求「Independent References」を、下記の制御/対象/保存条件として扱う。旧Required等の採用状態は引継がず、新案の推奨状態で保持。
- 対応能力 [REF-001](features/REF.md#ref-001)：複数画像・グループ・前面表示・作品内/個人セット。Always-on-topはアプリ内資料の前面表示、OS全体最前面は利用環境ごと未確認。配置と資料集合をNativeへ保存、資料編集は名前付きUndo
- 検証範囲：仕様本文の能力対応を確認。実装/実機未検証。

## FR-REF-002 — Multiple

- 旧出典：[docs/FEATURE_SPEC.md:755](https://github.com/totoro0419/illustro_old/blob/bdc7135b51033982d90ea5dad104bb04fc107df2/docs/FEATURE_SPEC.md#L755)
- 要求内容：複数Referenceを同時表示可能にする。
- 判定：**改善して引き継いだ**。要求「Multiple」を、下記の制御/対象/保存条件として扱う。旧Required等の採用状態は引継がず、新案の推奨状態で保持。
- 対応能力 [REF-001](features/REF.md#ref-001)：複数画像・グループ・前面表示・作品内/個人セット。Always-on-topはアプリ内資料の前面表示、OS全体最前面は利用環境ごと未確認。配置と資料集合をNativeへ保存、資料編集は名前付きUndo
- 検証範囲：仕様本文の能力対応を確認。実装/実機未検証。

## FR-REF-003 — Manipulation

- 旧出典：[docs/FEATURE_SPEC.md:759](https://github.com/totoro0419/illustro_old/blob/bdc7135b51033982d90ea5dad104bb04fc107df2/docs/FEATURE_SPEC.md#L759)
- 要求内容：Referenceごとに以下を提供する。 /  / - Move / - Scale / - Rotate / - Flip / - Grayscale / - Pin / - Hide / - Always-on-top相当
- 判定：**ほかの機能に統合した**。Always-on-topはアプリ内前面表示としてREF-001に明記。OS全体の最前面は環境依存の検証が残る。
- 対応能力 [REF-002](features/REF.md#ref-002)：枠移動/画像内Pan・倍率/角度・ピン。配置は作品保存、ピンは資料設定、一操作一Undo
- 対応能力 [REF-003](features/REF.md#ref-003)：水平/垂直反転・グレー・一時非表示。一時検査はSession表示で作品Undo外、元画像不変
- 検証範囲：仕様本文の能力対応を確認。実装/実機未検証。

## FR-REF-004 — Groups

- 旧出典：[docs/FEATURE_SPEC.md:772](https://github.com/totoro0419/illustro_old/blob/bdc7135b51033982d90ea5dad104bb04fc107df2/docs/FEATURE_SPEC.md#L772)
- 要求内容：Reference Groupを作成可能にする。
- 判定：**改善して引き継いだ**。要求「Groups」を、下記の制御/対象/保存条件として扱う。旧Required等の採用状態は引継がず、新案の推奨状態で保持。
- 対応能力 [REF-001](features/REF.md#ref-001)：複数画像・グループ・前面表示・作品内/個人セット。Always-on-topはアプリ内資料の前面表示、OS全体最前面は利用環境ごと未確認。配置と資料集合をNativeへ保存、資料編集は名前付きUndo
- 検証範囲：仕様本文の能力対応を確認。実装/実機未検証。

## FR-REF-005 — Eyedropper

- 旧出典：[docs/FEATURE_SPEC.md:776](https://github.com/totoro0419/illustro_old/blob/bdc7135b51033982d90ea5dad104bb04fc107df2/docs/FEATURE_SPEC.md#L776)
- 要求内容：Reference上から直接Color Pickできる。
- 判定：**改善して引き継いだ**。要求「Eyedropper」を、下記の制御/対象/保存条件として扱う。旧Required等の採用状態は引継がず、新案の推奨状態で保持。
- 対応能力 [REF-004](features/REF.md#ref-004)：元色/表示色・点/平均・資料ICC。作品色空間へ解釈し色履歴に記録、資料原画像不変
- 検証範囲：仕様本文の能力対応を確認。実装/実機未検証。

## DR-REF-001 — Persistence

- 旧出典：[docs/FEATURE_SPEC.md:780](https://github.com/totoro0419/illustro_old/blob/bdc7135b51033982d90ea5dad104bb04fc107df2/docs/FEATURE_SPEC.md#L780)
- 要求内容：DocumentまたはWorkspaceにReference状態を保存できる。
- 判定：**改善して引き継いだ**。要求「Persistence」を、下記の制御/対象/保存条件として扱う。旧Required等の採用状態は引継がず、新案の推奨状態で保持。
- 対応能力 [REF-006](features/REF.md#ref-006)：埋込/リンク・出典URL/作者/利用メモ・再指定。リンク/埋込と出典を保存、通常画像へは含めない
- 検証範囲：仕様本文の能力対応を確認。実装/実機未検証。

## DR-HISTORY-001 — Command History

- 旧出典：[docs/FEATURE_SPEC.md:788](https://github.com/totoro0419/illustro_old/blob/bdc7135b51033982d90ea5dad104bb04fc107df2/docs/FEATURE_SPEC.md#L788)
- 要求内容：Undo/Redoは可能な範囲で意味のあるCommand単位で管理する。
- 判定：**改善して引き継いだ**。要求「Command History」を、下記の制御/対象/保存条件として扱う。旧Required等の採用状態は引継がず、新案の推奨状態で保持。
- 対応能力 [HIS-001](features/HIS.md#his-001)：Undo/Redo・対象名・履歴範囲。一筆/一塗り/一ドラッグ単位、採用済データは同一結果へRedo
- 検証範囲：仕様本文の能力対応を確認。実装/実機未検証。

## FR-HISTORY-001 — Deep Undo

- 旧出典：[docs/FEATURE_SPEC.md:792](https://github.com/totoro0419/illustro_old/blob/bdc7135b51033982d90ea5dad104bb04fc107df2/docs/FEATURE_SPEC.md#L792)
- 要求内容：長い作業でも実用的なUndo Depthを維持する。
- 判定：**ほかの機能に統合した**。要求「Deep Undo」を、下記の制御/対象/保存条件として扱う。旧Required等の採用状態は引継がず、新案の推奨状態で保持。
- 対応能力 [HIS-001](features/HIS.md#his-001)：Undo/Redo・対象名・履歴範囲。一筆/一塗り/一ドラッグ単位、採用済データは同一結果へRedo
- 対応能力 [HIS-006](features/HIS.md#his-006)：通常Undo保持範囲・Snapshot固定・容量。固定Snapshotと復元原本は通常キャッシュと区別
- 検証範囲：仕様本文の能力対応を確認。実装/実機未検証。

## FR-SNAPSHOT-001 — Snapshot

- 旧出典：[docs/FEATURE_SPEC.md:796](https://github.com/totoro0419/illustro_old/blob/bdc7135b51033982d90ea5dad104bb04fc107df2/docs/FEATURE_SPEC.md#L796)
- 要求内容：ユーザーが名前付きCheckpointを保存できる。
- 判定：**改善して引き継いだ**。要求「Snapshot」を、下記の制御/対象/保存条件として扱う。旧Required等の採用状態は引継がず、新案の推奨状態で保持。
- 対応能力 [HIS-003](features/HIS.md#his-003)：名前・メモ・縮小像・固定時点。編集可能な全状態を保持、名前付きは容量整理で無断削除しない
- 検証範囲：仕様本文の能力対応を確認。実装/実機未検証。

## FR-SNAPSHOT-002 — Compare

- 旧出典：[docs/FEATURE_SPEC.md:800](https://github.com/totoro0419/illustro_old/blob/bdc7135b51033982d90ea5dad104bb04fc107df2/docs/FEATURE_SPEC.md#L800)
- 要求内容：Snapshot間またはCurrentとの比較を容易にする。
- 判定：**ほかの機能に統合した**。要求「Compare」を、下記の制御/対象/保存条件として扱う。旧Required等の採用状態は引継がず、新案の推奨状態で保持。
- 対応能力 [HIS-002](features/HIS.md#his-002)：時点/対象/比較・復元。比較はUndo外、復元は元現在を保護して一操作
- 対応能力 [HIS-003](features/HIS.md#his-003)：名前・メモ・縮小像・固定時点。編集可能な全状態を保持、名前付きは容量整理で無断削除しない
- 検証範囲：仕様本文の能力対応を確認。実装/実機未検証。

## FR-SNAPSHOT-003 — Branch

- 旧出典：[docs/FEATURE_SPEC.md:804](https://github.com/totoro0419/illustro_old/blob/bdc7135b51033982d90ea5dad104bb04fc107df2/docs/FEATURE_SPEC.md#L804)
- 要求内容：Snapshotから分岐制作できる構造を検討する。
- 判定：**改善して引き継いだ**。要求「Branch」を、下記の制御/対象/保存条件として扱う。旧Required等の採用状態は引継がず、新案の推奨状態で保持。
- 対応能力 [HIS-004](features/HIS.md#his-004)：分岐名・比較元・復帰先。元経路を保持し新分岐を保存、単純Undoと区別
- 検証範囲：仕様本文の能力対応を確認。実装/実機未検証。

## FR-LAYERCOMP-001 — Layer Comp

- 旧出典：[docs/FEATURE_SPEC.md:808](https://github.com/totoro0419/illustro_old/blob/bdc7135b51033982d90ea5dad104bb04fc107df2/docs/FEATURE_SPEC.md#L808)
- 要求内容：LayerのVisibility/Opacity/Blend Mode等の状態セットを保存・復元できる。
- 判定：**改善して引き継いだ**。要求「Layer Comp」を、下記の制御/対象/保存条件として扱う。旧Required等の採用状態は引継がず、新案の推奨状態で保持。
- 対応能力 [LAY-011](features/LAY.md#lay-011)：表示/不透明度/合成・保存する属性。カンプは画素Snapshotと別保存、適用一Undo
- 検証範囲：仕様本文の能力対応を確認。実装/実機未検証。

## FR-TIMELAPSE-001 — History-based

- 旧出典：[docs/FEATURE_SPEC.md:812](https://github.com/totoro0419/illustro_old/blob/bdc7135b51033982d90ea5dad104bb04fc107df2/docs/FEATURE_SPEC.md#L812)
- 要求内容：Timelapseは可能な限りDocument変更履歴を利用し、UIを映さない。
- 判定：**改善して引き継いだ**。要求「History-based」を、下記の制御/対象/保存条件として扱う。旧Required等の採用状態は引継がず、新案の推奨状態で保持。
- 対応能力 [REC-001](features/REC.md#rec-001)：記録ON/OFF・区間・UI除外・再生。作品変化を記録しUIを含めない、記録依存を保存
- 検証範囲：仕様本文の能力対応を確認。実装/実機未検証。

## FR-TIMELAPSE-002 — Export

- 旧出典：[docs/FEATURE_SPEC.md:816](https://github.com/totoro0419/illustro_old/blob/bdc7135b51033982d90ea5dad104bb04fc107df2/docs/FEATURE_SPEC.md#L816)
- 要求内容：高解像度出力とFrame pacing調整を提供する。
- 判定：**改善して引き継いだ**。要求「Export」を、下記の制御/対象/保存条件として扱う。旧Required等の採用状態は引継がず、新案の推奨状態で保持。
- 対応能力 [REC-002](features/REC.md#rec-002)：区間/速度/停止圧縮/解像度/Frame pacing/最終静止/透かし。作品Undo外、出力時点固定、設定を保存
- 検証範囲：仕様本文の能力対応を確認。実装/実機未検証。

## CONCEPT-HISTORY-001 — Separation

- 旧出典：[docs/FEATURE_SPEC.md:820](https://github.com/totoro0419/illustro_old/blob/bdc7135b51033982d90ea5dad104bb04fc107df2/docs/FEATURE_SPEC.md#L820)
- 要求内容：以下はユーザー向け概念として区別する。 /  / - Undo History / - Snapshot / - Layer Comp / - Macro / - Timelapse /  / 内部Primitiveの共有は許容する。
- 判定：**ほかの機能に統合した**。要求「Separation」を、下記の制御/対象/保存条件として扱う。旧Required等の採用状態は引継がず、新案の推奨状態で保持。
- 対応能力 [HIS-001](features/HIS.md#his-001)：Undo/Redo・対象名・履歴範囲。一筆/一塗り/一ドラッグ単位、採用済データは同一結果へRedo
- 対応能力 [HIS-003](features/HIS.md#his-003)：名前・メモ・縮小像・固定時点。編集可能な全状態を保持、名前付きは容量整理で無断削除しない
- 対応能力 [LAY-011](features/LAY.md#lay-011)：表示/不透明度/合成・保存する属性。カンプは画素Snapshotと別保存、適用一Undo
- 対応能力 [AUT-001](features/AUT.md#aut-001)：記録開始/停止・コマンド順/有効無効・パラメータ。マクロ定義は素材保存、記録操作は作品変更と区別
- 対応能力 [REC-001](features/REC.md#rec-001)：記録ON/OFF・区間・UI除外・再生。作品変化を記録しUIを含めない、記録依存を保存
- 検証範囲：仕様本文の能力対応を確認。実装/実機未検証。

## FR-WORKTIME-001 — Active Time

- 旧出典：[docs/FEATURE_SPEC.md:836](https://github.com/totoro0419/illustro_old/blob/bdc7135b51033982d90ea5dad104bb04fc107df2/docs/FEATURE_SPEC.md#L836)
- 要求内容：Documentを開いている時間ではなく、実際の編集活動を基準に時間を計測する。
- 判定：**改善して引き継いだ**。要求「Active Time」を、下記の制御/対象/保存条件として扱う。旧Required等の採用状態は引継がず、新案の推奨状態で保持。
- 対応能力 [REC-004](features/REC.md#rec-004)：Session/Today/Total/Average・Idle除外・停止/手動補正。Offline集計、外部送信不要、補正履歴を保持
- 検証範囲：仕様本文の能力対応を確認。実装/実機未検証。

## FR-WORKTIME-002 — Idle

- 旧出典：[docs/FEATURE_SPEC.md:840](https://github.com/totoro0419/illustro_old/blob/bdc7135b51033982d90ea5dad104bb04fc107df2/docs/FEATURE_SPEC.md#L840)
- 要求内容：長時間入力・編集がない期間は自動除外する。
- 判定：**改善して引き継いだ**。要求「Idle」を、下記の制御/対象/保存条件として扱う。旧Required等の採用状態は引継がず、新案の推奨状態で保持。
- 対応能力 [REC-004](features/REC.md#rec-004)：Session/Today/Total/Average・Idle除外・停止/手動補正。Offline集計、外部送信不要、補正履歴を保持
- 検証範囲：仕様本文の能力対応を確認。実装/実機未検証。

## FR-WORKTIME-003 — Views

- 旧出典：[docs/FEATURE_SPEC.md:844](https://github.com/totoro0419/illustro_old/blob/bdc7135b51033982d90ea5dad104bb04fc107df2/docs/FEATURE_SPEC.md#L844)
- 要求内容：少なくとも次を表示可能にする。 /  / - Session / - Today / - Total / - Average
- 判定：**改善して引き継いだ**。要求「Views」を、下記の制御/対象/保存条件として扱う。旧Required等の採用状態は引継がず、新案の推奨状態で保持。
- 対応能力 [REC-004](features/REC.md#rec-004)：Session/Today/Total/Average・Idle除外・停止/手動補正。Offline集計、外部送信不要、補正履歴を保持
- 検証範囲：仕様本文の能力対応を確認。実装/実機未検証。

## FR-WORKTIME-004 — Privacy

- 旧出典：[docs/FEATURE_SPEC.md:853](https://github.com/totoro0419/illustro_old/blob/bdc7135b51033982d90ea5dad104bb04fc107df2/docs/FEATURE_SPEC.md#L853)
- 要求内容：Work TimeはOfflineで成立し、外部Server送信を必須にしない。
- 判定：**改善して引き継いだ**。要求「Privacy」を、下記の制御/対象/保存条件として扱う。旧Required等の採用状態は引継がず、新案の推奨状態で保持。
- 対応能力 [REC-004](features/REC.md#rec-004)：Session/Today/Total/Average・Idle除外・停止/手動補正。Offline集計、外部送信不要、補正履歴を保持
- 検証範囲：仕様本文の能力対応を確認。実装/実機未検証。

## FR-MACRO-001 — Record

- 旧出典：[docs/FEATURE_SPEC.md:861](https://github.com/totoro0419/illustro_old/blob/bdc7135b51033982d90ea5dad104bb04fc107df2/docs/FEATURE_SPEC.md#L861)
- 要求内容：複数Commandを記録し再生できる。
- 判定：**改善して引き継いだ**。要求「Record」を、下記の制御/対象/保存条件として扱う。旧Required等の採用状態は引継がず、新案の推奨状態で保持。
- 対応能力 [AUT-001](features/AUT.md#aut-001)：記録開始/停止・コマンド順/有効無効・パラメータ。マクロ定義は素材保存、記録操作は作品変更と区別
- 検証範囲：仕様本文の能力対応を確認。実装/実機未検証。

## FR-MACRO-002 — Edit

- 旧出典：[docs/FEATURE_SPEC.md:865](https://github.com/totoro0419/illustro_old/blob/bdc7135b51033982d90ea5dad104bb04fc107df2/docs/FEATURE_SPEC.md#L865)
- 要求内容：記録済みMacroからCommandの有効/無効、順序変更等を可能にする。
- 判定：**改善して引き継いだ**。要求「Edit」を、下記の制御/対象/保存条件として扱う。旧Required等の採用状態は引継がず、新案の推奨状態で保持。
- 対応能力 [AUT-001](features/AUT.md#aut-001)：記録開始/停止・コマンド順/有効無効・パラメータ。マクロ定義は素材保存、記録操作は作品変更と区別
- 検証範囲：仕様本文の能力対応を確認。実装/実機未検証。

## FR-MACRO-003 — Parameterization

- 旧出典：[docs/FEATURE_SPEC.md:869](https://github.com/totoro0419/illustro_old/blob/bdc7135b51033982d90ea5dad104bb04fc107df2/docs/FEATURE_SPEC.md#L869)
- 要求内容：適切なCommand Parameterを実行時入力・Preset化できる方式を検討する。
- 判定：**改善して引き継いだ**。要求「Parameterization」を、下記の制御/対象/保存条件として扱う。旧Required等の採用状態は引継がず、新案の推奨状態で保持。
- 対応能力 [AUT-002](features/AUT.md#aut-002)：現在対象/指定対象・実行時入力/既定値。参照は意味的対象として保存、層番号の偶然一致に依存しない
- 検証範囲：仕様本文の能力対応を確認。実装/実機未検証。

## FR-MACRO-004 — Access

- 旧出典：[docs/FEATURE_SPEC.md:873](https://github.com/totoro0419/illustro_old/blob/bdc7135b51033982d90ea5dad104bb04fc107df2/docs/FEATURE_SPEC.md#L873)
- 要求内容：Macroは以下から起動できる。 /  / - Macro Panel / - Shortcut / - Quick Menu / - Command Search
- 判定：**改善して引き継いだ**。要求「Access」を、下記の制御/対象/保存条件として扱う。旧Required等の採用状態は引継がず、新案の推奨状態で保持。
- 対応能力 [AUT-005](features/AUT.md#aut-005)：マクロパネル/検索/キー/Quick Controller・依存。パックに必要依存を含める、受信後は実行前確認
- 検証範囲：仕様本文の能力対応を確認。実装/実機未検証。

## FR-QUICK-001 — Customization

- 旧出典：[docs/FEATURE_SPEC.md:886](https://github.com/totoro0419/illustro_old/blob/bdc7135b51033982d90ea5dad104bb04fc107df2/docs/FEATURE_SPEC.md#L886)
- 要求内容：Quick Menuへ少なくとも以下を登録可能にする。 /  / - Tool / - Command / - Brush / - Color / - Macro / - Layer Action / - Canvas Action
- 判定：**改善して引き継いだ**。要求「Customization」を、下記の制御/対象/保存条件として扱う。旧Required等の採用状態は引継がず、新案の推奨状態で保持。
- 対応能力 [UI-004](features/UI.md#ui-004)：明示トリガー・固定スロット・登録種別/ラベル/アイコン/キー/グループ。登録は個人設定、ツール/コマンド/筆/色/マクロ/層/Canvas操作を保持
- 検証範囲：仕様本文の能力対応を確認。実装/実機未検証。

## FR-QUICK-002 — Item Metadata

- 旧出典：[docs/FEATURE_SPEC.md:898](https://github.com/totoro0419/illustro_old/blob/bdc7135b51033982d90ea5dad104bb04fc107df2/docs/FEATURE_SPEC.md#L898)
- 要求内容：ItemはIcon、Label、Shortcut、Group等を持てる。
- 判定：**改善して引き継いだ**。要求「Item Metadata」を、下記の制御/対象/保存条件として扱う。旧Required等の採用状態は引継がず、新案の推奨状態で保持。
- 対応能力 [UI-004](features/UI.md#ui-004)：明示トリガー・固定スロット・登録種別/ラベル/アイコン/キー/グループ。登録は個人設定、ツール/コマンド/筆/色/マクロ/層/Canvas操作を保持
- 検証範囲：仕様本文の能力対応を確認。実装/実機未検証。

## FR-QUICK-003 — Context

- 旧出典：[docs/FEATURE_SPEC.md:902](https://github.com/totoro0419/illustro_old/blob/bdc7135b51033982d90ea5dad104bb04fc107df2/docs/FEATURE_SPEC.md#L902)
- 要求内容：ユーザーの固定Customizationを尊重しながら、Contextに応じた候補表示・Profile切替を検討する。
- 判定：**改善して引き継いだ**。要求「Context」を、下記の制御/対象/保存条件として扱う。旧Required等の採用状態は引継がず、新案の推奨状態で保持。
- 対応能力 [UI-004](features/UI.md#ui-004)：明示トリガー・固定スロット・登録種別/ラベル/アイコン/キー/グループ。登録は個人設定、ツール/コマンド/筆/色/マクロ/層/Canvas操作を保持
- 検証範囲：仕様本文の能力対応を確認。実装/実機未検証。

## FR-SEARCH-001 — Command Search

- 旧出典：[docs/FEATURE_SPEC.md:906](https://github.com/totoro0419/illustro_old/blob/bdc7135b51033982d90ea5dad104bb04fc107df2/docs/FEATURE_SPEC.md#L906)
- 要求内容：Tool/Command/Panel/Brush/Macro/Setting等を横断検索できる。
- 判定：**改善して引き継いだ**。要求「Command Search」を、下記の制御/対象/保存条件として扱う。旧Required等の採用状態は引継がず、新案の推奨状態で保持。
- 対応能力 [UI-005](features/UI.md#ui-005)：機能/ツール/筆/層/設定/マクロ・日本語別名。検索履歴は個人、機能IDは表示言語と独立
- 検証範囲：仕様本文の能力対応を確認。実装/実機未検証。

## FR-SEARCH-002 — Add from Search

- 旧出典：[docs/FEATURE_SPEC.md:910](https://github.com/totoro0419/illustro_old/blob/bdc7135b51033982d90ea5dad104bb04fc107df2/docs/FEATURE_SPEC.md#L910)
- 要求内容：検索結果からQuick Menu/Toolbar等へ追加できる操作を検討する。
- 判定：**改善して引き継いだ**。要求「Add from Search」を、下記の制御/対象/保存条件として扱う。旧Required等の採用状態は引継がず、新案の推奨状態で保持。
- 対応能力 [UI-005](features/UI.md#ui-005)：機能/ツール/筆/層/設定/マクロ・日本語別名。検索履歴は個人、機能IDは表示言語と独立
- 検証範囲：仕様本文の能力対応を確認。実装/実機未検証。

## FR-SHORTCUT-001 — Press-to-bind

- 旧出典：[docs/FEATURE_SPEC.md:914](https://github.com/totoro0419/illustro_old/blob/bdc7135b51033982d90ea5dad104bb04fc107df2/docs/FEATURE_SPEC.md#L914)
- 要求内容：Keyboard Shortcutの追加は、キー名を文字列入力・リスト選択する方式をPrimaryにしない。 /  / 対象Commandの「ショートカットを追加」を実行するとCapture Modeへ入り、**ユーザーが実際に押したキー組み合わせをShortcutとして登録する方式**を標準とする。 /  / 例: /  / Commandを選択 → ショートカットを追加 → Capture Mode → 実際に `Ctrl + Shift + K` を押す → 候補表示 → 確定。
- 判定：**改善して引き継いだ**。要求「Press-to-bind」を、下記の制御/対象/保存条件として扱う。旧Required等の採用状態は引継がず、新案の推奨状態で保持。
- 対応能力 [GST-002](features/GST.md#gst-002)：修飾/論理キー/物理キー/表示名・複数割当・衝突/予約。修飾単体は既定で割当対象外。高度許可は比較検証待ち。Default/Userを分離、解除はCommand削除ではない。修飾単体は既定対象外
- 検証範囲：仕様本文の能力対応を確認。実装/実機未検証。

## FR-SHORTCUT-002 — Live capture display

- 旧出典：[docs/FEATURE_SPEC.md:924](https://github.com/totoro0419/illustro_old/blob/bdc7135b51033982d90ea5dad104bb04fc107df2/docs/FEATURE_SPEC.md#L924)
- 要求内容：Capture Mode中は、現在認識しているキー・Modifierをリアルタイム表示する。 /  / 少なくとも次を区別する。 /  / - Ctrl / - Shift / - Alt / Option / - Meta / Command / - main key
- 判定：**改善して引き継いだ**。要求「Live capture display」を、下記の制御/対象/保存条件として扱う。旧Required等の採用状態は引継がず、新案の推奨状態で保持。
- 対応能力 [GST-002](features/GST.md#gst-002)：修飾/論理キー/物理キー/表示名・複数割当・衝突/予約。修飾単体は既定で割当対象外。高度許可は比較検証待ち。Default/Userを分離、解除はCommand削除ではない。修飾単体は既定対象外
- 検証範囲：仕様本文の能力対応を確認。実装/実機未検証。

## FR-SHORTCUT-003 — Conflict detection

- 旧出典：[docs/FEATURE_SPEC.md:936](https://github.com/totoro0419/illustro_old/blob/bdc7135b51033982d90ea5dad104bb04fc107df2/docs/FEATURE_SPEC.md#L936)
- 要求内容：入力されたShortcutが既存Bindingと衝突する場合、確定前に衝突先を表示する。 /  / ユーザーは少なくとも次を選択できる。 /  / - 既存Bindingを置換 / - 新規登録をキャンセル / - 別のShortcutを入力 /  / Silent overrideは禁止する。
- 判定：**改善して引き継いだ**。要求「Conflict detection」を、下記の制御/対象/保存条件として扱う。旧Required等の採用状態は引継がず、新案の推奨状態で保持。
- 対応能力 [GST-002](features/GST.md#gst-002)：修飾/論理キー/物理キー/表示名・複数割当・衝突/予約。修飾単体は既定で割当対象外。高度許可は比較検証待ち。Default/Userを分離、解除はCommand削除ではない。修飾単体は既定対象外
- 検証範囲：仕様本文の能力対応を確認。実装/実機未検証。

## FR-SHORTCUT-004 — Multiple bindings

- 旧出典：[docs/FEATURE_SPEC.md:948](https://github.com/totoro0419/illustro_old/blob/bdc7135b51033982d90ea5dad104bb04fc107df2/docs/FEATURE_SPEC.md#L948)
- 要求内容：一つのCommandへ複数Shortcutを登録可能にする。 /  / Default ShortcutとUser Shortcutを区別して保持できる構造にする。
- 判定：**改善して引き継いだ**。要求「Multiple bindings」を、下記の制御/対象/保存条件として扱う。旧Required等の採用状態は引継がず、新案の推奨状態で保持。
- 対応能力 [GST-002](features/GST.md#gst-002)：修飾/論理キー/物理キー/表示名・複数割当・衝突/予約。修飾単体は既定で割当対象外。高度許可は比較検証待ち。Default/Userを分離、解除はCommand削除ではない。修飾単体は既定対象外
- 検証範囲：仕様本文の能力対応を確認。実装/実機未検証。

## FR-SHORTCUT-005 — Remove / cancel

- 旧出典：[docs/FEATURE_SPEC.md:954](https://github.com/totoro0419/illustro_old/blob/bdc7135b51033982d90ea5dad104bb04fc107df2/docs/FEATURE_SPEC.md#L954)
- 要求内容：- Capture Modeは `Esc` 等でキャンセル可能にする。 / - 既存Shortcutは明示操作で解除可能にする。 / - Shortcut解除とCommand削除を混同しない。
- 判定：**改善して引き継いだ**。要求「Remove / cancel」を、下記の制御/対象/保存条件として扱う。旧Required等の採用状態は引継がず、新案の推奨状態で保持。
- 対応能力 [GST-002](features/GST.md#gst-002)：修飾/論理キー/物理キー/表示名・複数割当・衝突/予約。修飾単体は既定で割当対象外。高度許可は比較検証待ち。Default/Userを分離、解除はCommand削除ではない。修飾単体は既定対象外
- 検証範囲：仕様本文の能力対応を確認。実装/実機未検証。

## FR-SHORTCUT-006 — Reserved shortcut warning

- 旧出典：[docs/FEATURE_SPEC.md:960](https://github.com/totoro0419/illustro_old/blob/bdc7135b51033982d90ea5dad104bb04fc107df2/docs/FEATURE_SPEC.md#L960)
- 要求内容：OS / Browser / Runtimeが優先して取得する可能性のあるShortcutは、登録時に警告する。 /  / Runtime上確実に受け取れない組み合わせを「使用可能」と誤表示しない。
- 判定：**改善して引き継いだ**。要求「Reserved shortcut warning」を、下記の制御/対象/保存条件として扱う。旧Required等の採用状態は引継がず、新案の推奨状態で保持。
- 対応能力 [GST-002](features/GST.md#gst-002)：修飾/論理キー/物理キー/表示名・複数割当・衝突/予約。修飾単体は既定で割当対象外。高度許可は比較検証待ち。Default/Userを分離、解除はCommand削除ではない。修飾単体は既定対象外
- 検証範囲：仕様本文の能力対応を確認。実装/実機未検証。

## FR-SHORTCUT-007 — Event-derived binding

- 旧出典：[docs/FEATURE_SPEC.md:966](https://github.com/totoro0419/illustro_old/blob/bdc7135b51033982d90ea5dad104bb04fc107df2/docs/FEATURE_SPEC.md#L966)
- 要求内容：Shortcut Captureでは実Keyboard EventからBinding情報を取得する。 /  / 単なる表示文字列だけを保存せず、少なくとも以下を区別して保持できる設計とする。 /  / - normalized modifiers / - logical key / - physical key code / - display label /  / Keyboard Layout差を考慮し、保存データをUI表示文字列そのものへ依存させない。
- 判定：**ほかの機能に統合した**。論理キー/物理キー/表示名/修飾を区別して移行、実装の保存方式は未定。
- 対応能力 [GST-002](features/GST.md#gst-002)：修飾/論理キー/物理キー/表示名・複数割当・衝突/予約。修飾単体は既定で割当対象外。高度許可は比較検証待ち。Default/Userを分離、解除はCommand削除ではない。修飾単体は既定対象外
- 対応能力 [GST-005](features/GST.md#gst-005)：論理/物理優先・利き手・対応不能一覧。未対応の元割当も消さず保存
- 検証範囲：仕様本文の能力対応を確認。実装/実機未検証。

## FR-SHORTCUT-008 — Modifier-only policy

- 旧出典：[docs/FEATURE_SPEC.md:979](https://github.com/totoro0419/illustro_old/blob/bdc7135b51033982d90ea5dad104bb04fc107df2/docs/FEATURE_SPEC.md#L979)
- 要求内容：Modifier単体のShortcutは誤操作・OS競合が大きいためDefaultでは割当対象外とする。 /  / 高度設定として許可するかは、Input/UI Prototypeで再評価する。
- 判定：**改善して引き継いだ**。修飾単体を既定で禁止、許可の高度設定は比較待ちとGST-002へ補った。
- 対応能力 [GST-002](features/GST.md#gst-002)：修飾/論理キー/物理キー/表示名・複数割当・衝突/予約。修飾単体は既定で割当対象外。高度許可は比較検証待ち。Default/Userを分離、解除はCommand削除ではない。修飾単体は既定対象外
- 検証範囲：仕様本文の能力対応を確認。実装/実機未検証。

## FR-SHORTCUT-009 — Immediate discoverability

- 旧出典：[docs/FEATURE_SPEC.md:985](https://github.com/totoro0419/illustro_old/blob/bdc7135b51033982d90ea5dad104bb04fc107df2/docs/FEATURE_SPEC.md#L985)
- 要求内容：Shortcut編集画面だけでなく、Command Search、Quick Menu、Menu/Tooltip等から現在のShortcutを確認できる設計にする。
- 判定：**ほかの機能に統合した**。要求「Immediate discoverability」を、下記の制御/対象/保存条件として扱う。旧Required等の採用状態は引継がず、新案の推奨状態で保持。
- 対応能力 [UI-005](features/UI.md#ui-005)：機能/ツール/筆/層/設定/マクロ・日本語別名。検索履歴は個人、機能IDは表示言語と独立
- 対応能力 [GST-002](features/GST.md#gst-002)：修飾/論理キー/物理キー/表示名・複数割当・衝突/予約。修飾単体は既定で割当対象外。高度許可は比較検証待ち。Default/Userを分離、解除はCommand削除ではない。修飾単体は既定対象外
- 検証範囲：仕様本文の能力対応を確認。実装/実機未検証。

## FR-SHORTCUT-010 — Touch-device equivalence

- 旧出典：[docs/FEATURE_SPEC.md:989](https://github.com/totoro0419/illustro_old/blob/bdc7135b51033982d90ea5dad104bb04fc107df2/docs/FEATURE_SPEC.md#L989)
- 要求内容：Physical KeyboardがないTablet/Smartphoneでも同じCommandへ到達可能でなければならない。 /  / Keyboard Shortcutは高速アクセス手段であり、Command唯一の入口にしてはならない。
- 判定：**ほかの機能に統合した**。要求「Touch-device equivalence」を、下記の制御/対象/保存条件として扱う。旧Required等の採用状態は引継がず、新案の推奨状態で保持。
- 対応能力 [DEV-003](features/DEV.md#dev-003)：下部シート・指描き・対象帯・精密数値。全能力へ検索/分野一覧から到達、データ意味を削らない
- 対応能力 [GST-002](features/GST.md#gst-002)：修飾/論理キー/物理キー/表示名・複数割当・衝突/予約。修飾単体は既定で割当対象外。高度許可は比較検証待ち。Default/Userを分離、解除はCommand削除ではない。修飾単体は既定対象外
- 検証範囲：仕様本文の能力対応を確認。実装/実機未検証。

## FR-WORKSPACE-001 — Desktop Panels

- 旧出典：[docs/FEATURE_SPEC.md:999](https://github.com/totoro0419/illustro_old/blob/bdc7135b51033982d90ea5dad104bb04fc107df2/docs/FEATURE_SPEC.md#L999)
- 要求内容：PCではDock/Undock/Floating/Resize/Reorder/Hideを提供する。
- 判定：**改善して引き継いだ**。要求「Desktop Panels」を、下記の制御/対象/保存条件として扱う。旧Required等の採用状態は引継がず、新案の推奨状態で保持。
- 対応能力 [UI-002](features/UI.md#ui-002)：折畳/並替/持出/Float/Dock/幅高さ・閉じる。配置変更はWorkspace保存、作品Undo外
- 検証範囲：仕様本文の能力対応を確認。実装/実機未検証。

## FR-WORKSPACE-002 — Save / Load

- 旧出典：[docs/FEATURE_SPEC.md:1003](https://github.com/totoro0419/illustro_old/blob/bdc7135b51033982d90ea5dad104bb04fc107df2/docs/FEATURE_SPEC.md#L1003)
- 要求内容：Workspaceを保存・復元できる。
- 判定：**改善して引き継いだ**。要求「Save / Load」を、下記の制御/対象/保存条件として扱う。旧Required等の採用状態は引継がず、新案の推奨状態で保持。
- 対応能力 [UI-006](features/UI.md#ui-006)：配置/密度/利き手・Toolbar編集・Drawing/Painting/Coloring/Photo/Pixel/Minimal。左右反転はパネル/Popup/Quick Controllerまで、個人設定保存
- 検証範囲：仕様本文の能力対応を確認。実装/実機未検証。

## FR-WORKSPACE-003 — Presets

- 旧出典：[docs/FEATURE_SPEC.md:1007](https://github.com/totoro0419/illustro_old/blob/bdc7135b51033982d90ea5dad104bb04fc107df2/docs/FEATURE_SPEC.md#L1007)
- 要求内容：Drawing/Painting/Coloring/Photo Editing/Pixel Art/Minimal等のPresetを提供する方向で設計する。
- 判定：**改善して引き継いだ**。要求「Presets」を、下記の制御/対象/保存条件として扱う。旧Required等の採用状態は引継がず、新案の推奨状態で保持。
- 対応能力 [UI-006](features/UI.md#ui-006)：配置/密度/利き手・Toolbar編集・Drawing/Painting/Coloring/Photo/Pixel/Minimal。左右反転はパネル/Popup/Quick Controllerまで、個人設定保存
- 検証範囲：仕様本文の能力対応を確認。実装/実機未検証。

## FR-WORKSPACE-004 — Canvas Focus Mode

- 旧出典：[docs/FEATURE_SPEC.md:1011](https://github.com/totoro0419/illustro_old/blob/bdc7135b51033982d90ea5dad104bb04fc107df2/docs/FEATURE_SPEC.md#L1011)
- 要求内容：Panel/Toolbar等の非必須UIを一操作で一時的に隠し、Canvas面積を最大化するFocus/Canvas-only Modeを提供する。 /  / - selected Toolを維持する / - Artwork stateを変更しない / - Undo Historyへ入れない / - keyboardなし端末でも解除可能 / - storage/recovery/error等の重大状態を完全に不可視化しない
- 判定：**改善して引き継いだ**。要求「Canvas Focus Mode」を、下記の制御/対象/保存条件として扱う。旧Required等の採用状態は引継がず、新案の推奨状態で保持。
- 対応能力 [UI-007](features/UI.md#ui-007)：Focus/全画面/一時UI・解除。選択/ツール/対象保持、作品Undo外
- 検証範囲：仕様本文の能力対応を確認。実装/実機未検証。

## FR-DEVICE-001 — Adaptive UI

- 旧出典：[docs/FEATURE_SPEC.md:1021](https://github.com/totoro0419/illustro_old/blob/bdc7135b51033982d90ea5dad104bb04fc107df2/docs/FEATURE_SPEC.md#L1021)
- 要求内容：Desktop/Tablet/Smartphoneで、同一UIを単純Scaleして使い回してはならない。
- 判定：**ほかの機能に統合した**。要求「Adaptive UI」を、下記の制御/対象/保存条件として扱う。旧Required等の採用状態は引継がず、新案の推奨状態で保持。
- 対応能力 [DEV-001](features/DEV.md#dev-001)：マウス/ペン/Trackpad/Keyboard・密度・複数パネル。文書の意味は他端末と同一、配置のみ個人設定
- 対応能力 [DEV-002](features/DEV.md#dev-002)：ペン描画/指ナビ・片手到達・分割画面。外部Keyboard着脱で文書状態不変
- 対応能力 [DEV-003](features/DEV.md#dev-003)：下部シート・指描き・対象帯・精密数値。全能力へ検索/分野一覧から到達、データ意味を削らない
- 検証範囲：仕様本文の能力対応を確認。実装/実機未検証。

## FR-DEVICE-002 — Capability Preservation

- 旧出典：[docs/FEATURE_SPEC.md:1025](https://github.com/totoro0419/illustro_old/blob/bdc7135b51033982d90ea5dad104bb04fc107df2/docs/FEATURE_SPEC.md#L1025)
- 要求内容：画面サイズを理由として高度機能そのものを削除することを原則としない。 /  / アクセス方法を再設計する。
- 判定：**改善して引き継いだ**。要求「Capability Preservation」を、下記の制御/対象/保存条件として扱う。旧Required等の採用状態は引継がず、新案の推奨状態で保持。
- 対応能力 [DEV-005](features/DEV.md#dev-005)：実入力/画面/保存余裕/実測負荷・機能差。Nativeの能力を削らず未対応部分の外観/データ保持
- 検証範囲：仕様本文の能力対応を確認。実装/実機未検証。

## FR-DEVICE-003 — Left/Right

- 旧出典：[docs/FEATURE_SPEC.md:1031](https://github.com/totoro0419/illustro_old/blob/bdc7135b51033982d90ea5dad104bb04fc107df2/docs/FEATURE_SPEC.md#L1031)
- 要求内容：Left/Right LayoutをToolbarだけでなくPanel/Popup/Quick Menu/主要操作位置まで考慮する。
- 判定：**改善して引き継いだ**。要求「Left/Right」を、下記の制御/対象/保存条件として扱う。旧Required等の採用状態は引継がず、新案の推奨状態で保持。
- 対応能力 [UI-006](features/UI.md#ui-006)：配置/密度/利き手・Toolbar編集・Drawing/Painting/Coloring/Photo/Pixel/Minimal。左右反転はパネル/Popup/Quick Controllerまで、個人設定保存
- 検証範囲：仕様本文の能力対応を確認。実装/実機未検証。

## FR-DEVICE-004 — Capability-driven Adaptation

- 旧出典：[docs/FEATURE_SPEC.md:1035](https://github.com/totoro0419/illustro_old/blob/bdc7135b51033982d90ea5dad104bb04fc107df2/docs/FEATURE_SPEC.md#L1035)
- 要求内容：PC / Tablet / Smartphoneという端末分類だけでRenderer、入力方式、Worker数、機能可否を決めてはならない。 /  / Viewport、Pointer、Hover、Keyboard、GPU、Storage等をRuntime Capabilityとして検出し、実際の環境へ適応する。 /  / User-Agent文字列を主要な機能分岐根拠にしない。
- 判定：**改善して引き継いだ**。旧文の内部方式は選定を保留し、利用者に見える能力/失敗時保持は下記具体契約へ引継ぐ。旧方式名の不採用を能力削除とはしない。
- 対応能力 [DEV-005](features/DEV.md#dev-005)：実入力/画面/保存余裕/実測負荷・機能差。Nativeの能力を削らず未対応部分の外観/データ保持
- 検証範囲：仕様本文の能力対応を確認。実装/実機未検証。

## FR-DEVICE-005 — Core Fallback Independence

- 旧出典：[docs/FEATURE_SPEC.md:1043](https://github.com/totoro0419/illustro_old/blob/bdc7135b51033982d90ea5dad104bb04fc107df2/docs/FEATURE_SPEC.md#L1043)
- 要求内容：以下はCore paintingの必須条件にしない。 /  / - WebGPU / - SharedArrayBuffer / - Stylus / - Pressure / Tilt / - Hover / - Physical Keyboard / - Direct File System Picker / - PWA install /  / 利用できない場合もCore Normal Operationが成立しなければならない。
- 判定：**改善して引き継いだ**。旧文の内部方式は選定を保留し、利用者に見える能力/失敗時保持は下記具体契約へ引継ぐ。旧方式名の不採用を能力削除とはしない。
- 対応能力 [DEV-005](features/DEV.md#dev-005)：実入力/画面/保存余裕/実測負荷・機能差。Nativeの能力を削らず未対応部分の外観/データ保持
- 検証範囲：仕様本文の能力対応を確認。実装/実機未検証。

## FR-DEVICE-006 — Core Normal Operation

- 旧出典：[docs/FEATURE_SPEC.md:1058](https://github.com/totoro0419/illustro_old/blob/bdc7135b51033982d90ea5dad104bb04fc107df2/docs/FEATURE_SPEC.md#L1058)
- 要求内容：PC / Tablet / Smartphoneで少なくとも以下が同じDocument semanticsで成立することを必須とする。 /  / - Document create/open / - Raster Brush / Eraser / - Color Pick / Change / - Layer / Group / Clipping / - Undo / Redo / - Pan / Zoom / Rotate / - Basic Selection / Transform / - Reference viewing / - Autosave / Recovery / - portable .illustro export/import / - PNG / JPEG / WebP export
- 判定：**ほかの機能に統合した**。要求「Core Normal Operation」を、下記の制御/対象/保存条件として扱う。旧Required等の採用状態は引継がず、新案の推奨状態で保持。
- 対応能力 [DEV-001](features/DEV.md#dev-001)：マウス/ペン/Trackpad/Keyboard・密度・複数パネル。文書の意味は他端末と同一、配置のみ個人設定
- 対応能力 [DEV-002](features/DEV.md#dev-002)：ペン描画/指ナビ・片手到達・分割画面。外部Keyboard着脱で文書状態不変
- 対応能力 [DEV-003](features/DEV.md#dev-003)：下部シート・指描き・対象帯・精密数値。全能力へ検索/分野一覧から到達、データ意味を削らない
- 検証範囲：仕様本文の能力対応を確認。実装/実機未検証。

## FR-DEVICE-007 — Input Arbitration

- 旧出典：[docs/FEATURE_SPEC.md:1074](https://github.com/totoro0419/illustro_old/blob/bdc7135b51033982d90ea5dad104bb04fc107df2/docs/FEATURE_SPEC.md#L1074)
- 要求内容：Pen / Touch / Mouseが同時に存在する環境を前提とする。 /  / DefaultではPenをDrawing、TouchをCanvas Gestureへ割り当て、Finger Drawingは設定可能にする。 /  / Sensor値がHardware/Browserから提供されない場合に、default値を実測Sensor値として扱ってはならない。
- 判定：**ほかの機能に統合した**。要求「Input Arbitration」を、下記の制御/対象/保存条件として扱う。旧Required等の採用状態は引継がず、新案の推奨状態で保持。
- 対応能力 [INP-001](features/INP.md#inp-001)：入力別の描画/表示・指描きON/OFF。既定はペン描画と指ナビ。入力役割は個人設定。途中筆の役割を変えず作品Undo外
- 対応能力 [INP-002](features/INP.md#inp-002)：全体筆圧曲線・最小最大・傾き/方位/軸回転の対応状況。曲線は個人校正、ブラシ変調はプリセット。既存画素/Redo不変
- 検証範囲：仕様本文の能力対応を確認。実装/実機未検証。

## FR-DEVICE-008 — Mobile Viewport Adaptation

- 旧出典：[docs/FEATURE_SPEC.md:1082](https://github.com/totoro0419/illustro_old/blob/bdc7135b51033982d90ea5dad104bb04fc107df2/docs/FEATURE_SPEC.md#L1082)
- 要求内容：Smartphone / Tabletでは以下を動的に扱う。 /  / - safe area / - Visual Viewport / - software keyboard / - orientation / - split view / window resize / - browser chromeによるviewport変化 /  / 重要UIがnotch、home indicator、software keyboard等の背後に隠れないようにする。
- 判定：**改善して引き継いだ**。要求「Mobile Viewport Adaptation」を、下記の制御/対象/保存条件として扱う。旧Required等の採用状態は引継がず、新案の推奨状態で保持。
- 対応能力 [DEV-004](features/DEV.md#dev-004)：Safe area・表示中心・Keyboard・Split view。レイアウトだけ変更、作品Undo外
- 検証範囲：仕様本文の能力対応を確認。実装/実機未検証。

## FR-DEVICE-009 — Mobile Lifecycle Recovery

- 旧出典：[docs/FEATURE_SPEC.md:1095](https://github.com/totoro0419/illustro_old/blob/bdc7135b51033982d90ea5dad104bb04fc107df2/docs/FEATURE_SPEC.md#L1095)
- 要求内容：MobileではBackground化後のprocess termination / tab discardを通常のFailure Modeとして扱う。 /  / beforeunload / unload完了をData Safety条件にしてはならない。 /  / 通常編集時からRecovery Journalを進め、visibility hiddenを追加flushの契機として利用する。
- 判定：**改善して引き継いだ**。背景終了を通常故障として保護し、終了イベント完了へ依存しない能力を保持。Journal/flushの方式は次段階。
- 対応能力 [SAV-005](features/SAV.md#sav-005)：復元候補/正常保存/未保護部分・比較/別名救出。正常原本を上書きせず復元コピー、保留セッションは別表示
- 検証範囲：仕様本文の能力対応を確認。実装/実機未検証。

## FR-DEVICE-010 — Dynamic Resource Budget

- 旧出典：[docs/FEATURE_SPEC.md:1103](https://github.com/totoro0419/illustro_old/blob/bdc7135b51033982d90ea5dad104bb04fc107df2/docs/FEATURE_SPEC.md#L1103)
- 要求内容：Memory、GPU Cache、Worker数、Background Job量をPC/Tablet/Smartphoneごとの固定値だけで決めない。 /  / Runtime capabilityと実測負荷から調整可能にする。 /  / navigator.deviceMemory等のoptional/coarsened情報はhintとしてのみ利用する。
- 判定：**改善して引き継いだ**。旧文の内部方式は選定を保留し、利用者に見える能力/失敗時保持は下記具体契約へ引継ぐ。旧方式名の不採用を能力削除とはしない。
- 対応能力 [DEV-005](features/DEV.md#dev-005)：実入力/画面/保存余裕/実測負荷・機能差。Nativeの能力を削らず未対応部分の外観/データ保持
- 検証範囲：仕様本文の能力対応を確認。実装/実機未検証。

## FR-A11Y-001 — Scalable UI

- 旧出典：[docs/FEATURE_SPEC.md:1115](https://github.com/totoro0419/illustro_old/blob/bdc7135b51033982d90ea5dad104bb04fc107df2/docs/FEATURE_SPEC.md#L1115)
- 要求内容：UI/Text Sizeを拡大可能にする。
- 判定：**改善して引き継いだ**。要求「Scalable UI」を、下記の制御/対象/保存条件として扱う。旧Required等の採用状態は引継がず、新案の推奨状態で保持。
- 対応能力 [A11-001](features/A11.md#a11-001)：UI/Text倍率・高Contrast・状態記号。個人設定、作品不変
- 検証範囲：仕様本文の能力対応を確認。実装/実機未検証。

## FR-A11Y-002 — Single-pointer Alternative

- 旧出典：[docs/FEATURE_SPEC.md:1119](https://github.com/totoro0419/illustro_old/blob/bdc7135b51033982d90ea5dad104bb04fc107df2/docs/FEATURE_SPEC.md#L1119)
- 要求内容：Multi-touchでしか実行できない主要操作を作らず、代替UIを持たせる。
- 判定：**改善して引き継いだ**。要求「Single-pointer Alternative」を、下記の制御/対象/保存条件として扱う。旧Required等の採用状態は引継がず、新案の推奨状態で保持。
- 対応能力 [A11-002](features/A11.md#a11-002)：表示倍率/角度・並替/移動先・ボタン標的サイズ。同一Commandを呼び端末で意味を変えない
- 検証範囲：仕様本文の能力対応を確認。実装/実機未検証。

## FR-A11Y-003 — Non-color-only State

- 旧出典：[docs/FEATURE_SPEC.md:1123](https://github.com/totoro0419/illustro_old/blob/bdc7135b51033982d90ea5dad104bb04fc107df2/docs/FEATURE_SPEC.md#L1123)
- 要求内容：状態・警告・選択を色だけで伝えない。
- 判定：**改善して引き継いだ**。要求「Non-color-only State」を、下記の制御/対象/保存条件として扱う。旧Required等の採用状態は引継がず、新案の推奨状態で保持。
- 対応能力 [A11-001](features/A11.md#a11-001)：UI/Text倍率・高Contrast・状態記号。個人設定、作品不変
- 検証範囲：仕様本文の能力対応を確認。実装/実機未検証。

## FR-A11Y-004 — Color Assistance

- 旧出典：[docs/FEATURE_SPEC.md:1127](https://github.com/totoro0419/illustro_old/blob/bdc7135b51033982d90ea5dad104bb04fc107df2/docs/FEATURE_SPEC.md#L1127)
- 要求内容：Color Name/Description等、色覚を補助する機能を提供する方向で設計する。
- 判定：**改善して引き継いだ**。要求「Color Assistance」を、下記の制御/対象/保存条件として扱う。旧Required等の採用状態は引継がず、新案の推奨状態で保持。
- 対応能力 [A11-004](features/A11.md#a11-004)：色名/数値・グレー/色覚表示・補正。補助は表示設定、元作品は不変
- 検証範囲：仕様本文の能力対応を確認。実装/実機未検証。

## FR-A11Y-005 — Reduced Motion

- 旧出典：[docs/FEATURE_SPEC.md:1131](https://github.com/totoro0419/illustro_old/blob/bdc7135b51033982d90ea5dad104bb04fc107df2/docs/FEATURE_SPEC.md#L1131)
- 要求内容：不要なAnimationを減らす設定を持つ。
- 判定：**改善して引き継いだ**。要求「Reduced Motion」を、下記の制御/対象/保存条件として扱う。旧Required等の採用状態は引継がず、新案の推奨状態で保持。
- 対応能力 [A11-005](features/A11.md#a11-005)：Reduced Motion・音/振動の個別ON/OFF。個人設定として保存
- 検証範囲：仕様本文の能力対応を確認。実装/実機未検証。

## FR-A11Y-006 — Stabilization

- 旧出典：[docs/FEATURE_SPEC.md:1135](https://github.com/totoro0419/illustro_old/blob/bdc7135b51033982d90ea5dad104bb04fc107df2/docs/FEATURE_SPEC.md#L1135)
- 要求内容：Global Motion Filtering/Stabilizationを利用可能にする。
- 判定：**改善して引き継いだ**。要求「Stabilization」を、下記の制御/対象/保存条件として扱う。旧Required等の採用状態は引継がず、新案の推奨状態で保持。
- 対応能力 [BRU-003](features/BRU.md#bru-003)：補正OFF/軽い/強い・強度・速度依存・筆圧平滑・全体/筆別。補正はプリセット+全体上書き表示、既存筆は変えない
- 検証範囲：仕様本文の能力対応を確認。実装/実機未検証。

## FR-A11Y-007 — Targets

- 旧出典：[docs/FEATURE_SPEC.md:1139](https://github.com/totoro0419/illustro_old/blob/bdc7135b51033982d90ea5dad104bb04fc107df2/docs/FEATURE_SPEC.md#L1139)
- 要求内容：Touch Deviceでは十分なHit Targetを保証するDesign Tokenを定義する。
- 判定：**改善して引き継いだ**。十分な標的を具体化する44論理px案をA11-002へ追加、標準策定/実機確認は未完了。
- 対応能力 [A11-002](features/A11.md#a11-002)：表示倍率/角度・並替/移動先・ボタン標的サイズ。同一Commandを呼び端末で意味を変えない
- 検証範囲：仕様本文の能力対応を確認。実装/実機未検証。

## FR-A11Y-008 — Keyboard

- 旧出典：[docs/FEATURE_SPEC.md:1143](https://github.com/totoro0419/illustro_old/blob/bdc7135b51033982d90ea5dad104bb04fc107df2/docs/FEATURE_SPEC.md#L1143)
- 要求内容：描画そのものを除く主要Commandは、PCでKeyboardから到達可能にすることを目標とする。
- 判定：**改善して引き継いだ**。要求「Keyboard」を、下記の制御/対象/保存条件として扱う。旧Required等の採用状態は引継がず、新案の推奨状態で保持。
- 対応能力 [A11-003](features/A11.md#a11-003)：フォーカス順・対象/状態/値・ラベル。支援設定は個人、焦点をモーダル内に迷子にしない
- 検証範囲：仕様本文の能力対応を確認。実装/実機未検証。

## FR-ASSET-001 — Asset Types

- 旧出典：[docs/FEATURE_SPEC.md:1151](https://github.com/totoro0419/illustro_old/blob/bdc7135b51033982d90ea5dad104bb04fc107df2/docs/FEATURE_SPEC.md#L1151)
- 要求内容：少なくとも次を管理できる。 /  / - Brush / - Brush tip / - Texture / - Paper / - Pattern / - Gradient / - Palette / - Macro / - Workspace / - Reference Set / - Shape
- 判定：**改善して引き継いだ**。要求「Asset Types」を、下記の制御/対象/保存条件として扱う。旧Required等の採用状態は引継がず、新案の推奨状態で保持。
- 対応能力 [AST-001](features/AST.md#ast-001)：筆/先端/紙/質感/模様/グラデ/色/マクロ/Workspace/資料/図形の種別。資源の版と依存を管理、作品使用分は保持
- 検証範囲：仕様本文の能力対応を確認。実装/実機未検証。

## FR-ASSET-002 — Organization

- 旧出典：[docs/FEATURE_SPEC.md:1167](https://github.com/totoro0419/illustro_old/blob/bdc7135b51033982d90ea5dad104bb04fc107df2/docs/FEATURE_SPEC.md#L1167)
- 要求内容：Folder/Collection/Tag/Search/Favorite/Recentを提供する。
- 判定：**改善して引き継いだ**。要求「Organization」を、下記の制御/対象/保存条件として扱う。旧Required等の採用状態は引継がず、新案の推奨状態で保持。
- 対応能力 [AST-002](features/AST.md#ast-002)：フォルダー/Collection/タグ/用途/最近/お気に入り。整理は個人素材庫、作品の描画Undoと分離
- 検証範囲：仕様本文の能力対応を確認。実装/実機未検証。

## FR-ASSET-003 — Import / Export

- 旧出典：[docs/FEATURE_SPEC.md:1171](https://github.com/totoro0419/illustro_old/blob/bdc7135b51033982d90ea5dad104bb04fc107df2/docs/FEATURE_SPEC.md#L1171)
- 要求内容：AssetをImport/Exportできる。
- 判定：**改善して引き継いだ**。要求「Import / Export」を、下記の制御/対象/保存条件として扱う。旧Required等の採用状態は引継がず、新案の推奨状態で保持。
- 対応能力 [AST-003](features/AST.md#ast-003)：パック形式・依存・ライセンス・含有項目。新規IDで追加、明示置換のみ元更新
- 検証範囲：仕様本文の能力対応を確認。実装/実機未検証。

## FR-ASSET-004 — Local-first

- 旧出典：[docs/FEATURE_SPEC.md:1175](https://github.com/totoro0419/illustro_old/blob/bdc7135b51033982d90ea5dad104bb04fc107df2/docs/FEATURE_SPEC.md#L1175)
- 要求内容：Cloud接続なしでAsset Libraryが成立する。
- 判定：**改善して引き継いだ**。要求「Local-first」を、下記の制御/対象/保存条件として扱う。旧Required等の採用状態は引継がず、新案の推奨状態で保持。
- 対応能力 [AST-005](features/AST.md#ast-005)：ローカル庫・任意配布元・接続状態。取得済素材をオフライン保存
- 検証範囲：仕様本文の能力対応を確認。実装/実機未検証。

## FR-NAV-001 — Navigator

- 旧出典：[docs/FEATURE_SPEC.md:1183](https://github.com/totoro0419/illustro_old/blob/bdc7135b51033982d90ea5dad104bb04fc107df2/docs/FEATURE_SPEC.md#L1183)
- 要求内容：Artwork ThumbnailとCurrent Viewportを表示するNavigatorを提供する。
- 判定：**改善して引き継いだ**。要求「Navigator」を、下記の制御/対象/保存条件として扱う。旧Required等の採用状態は引継がず、新案の推奨状態で保持。
- 対応能力 [REF-005](features/REF.md#ref-005)：Navigator倍率/表示枠・独立ビューの倍率/反転/明度。編集状態は共有、表示状態はビュー別。表示操作Undo外
- 検証範囲：仕様本文の能力対応を確認。実装/実機未検証。

## FR-NAV-002 — Direct Navigation

- 旧出典：[docs/FEATURE_SPEC.md:1187](https://github.com/totoro0419/illustro_old/blob/bdc7135b51033982d90ea5dad104bb04fc107df2/docs/FEATURE_SPEC.md#L1187)
- 要求内容：NavigatorからPan/Zoomできる。
- 判定：**改善して引き継いだ**。要求「Direct Navigation」を、下記の制御/対象/保存条件として扱う。旧Required等の採用状態は引継がず、新案の推奨状態で保持。
- 対応能力 [REF-005](features/REF.md#ref-005)：Navigator倍率/表示枠・独立ビューの倍率/反転/明度。編集状態は共有、表示状態はビュー別。表示操作Undo外
- 検証範囲：仕様本文の能力対応を確認。実装/実機未検証。

## FR-NAV-003 — Workspace

- 旧出典：[docs/FEATURE_SPEC.md:1191](https://github.com/totoro0419/illustro_old/blob/bdc7135b51033982d90ea5dad104bb04fc107df2/docs/FEATURE_SPEC.md#L1191)
- 要求内容：NavigatorはDock/Float/Hide可能にする。
- 判定：**ほかの機能に統合した**。要求「Workspace」を、下記の制御/対象/保存条件として扱う。旧Required等の採用状態は引継がず、新案の推奨状態で保持。
- 対応能力 [REF-005](features/REF.md#ref-005)：Navigator倍率/表示枠・独立ビューの倍率/反転/明度。編集状態は共有、表示状態はビュー別。表示操作Undo外
- 対応能力 [UI-002](features/UI.md#ui-002)：折畳/並替/持出/Float/Dock/幅高さ・閉じる。配置変更はWorkspace保存、作品Undo外
- 検証範囲：仕様本文の能力対応を確認。実装/実機未検証。

## FR-NAV-004 — Multi-view

- 旧出典：[docs/FEATURE_SPEC.md:1195](https://github.com/totoro0419/illustro_old/blob/bdc7135b51033982d90ea5dad104bb04fc107df2/docs/FEATURE_SPEC.md#L1195)
- 要求内容：同一Documentを複数Viewで表示する機能をInvestigateする。
- 判定：**改善して引き継いだ**。要求「Multi-view」を、下記の制御/対象/保存条件として扱う。旧Required等の採用状態は引継がず、新案の推奨状態で保持。
- 対応能力 [REF-005](features/REF.md#ref-005)：Navigator倍率/表示枠・独立ビューの倍率/反転/明度。編集状態は共有、表示状態はビュー別。表示操作Undo外
- 検証範囲：仕様本文の能力対応を確認。実装/実機未検証。

## FR-CLIP-001 — Internal Clipboard

- 旧出典：[docs/FEATURE_SPEC.md:1203](https://github.com/totoro0419/illustro_old/blob/bdc7135b51033982d90ea5dad104bb04fc107df2/docs/FEATURE_SPEC.md#L1203)
- 要求内容：Illustro内部Clipboardを持ち、System Clipboardの可否に依存せずCopy/Cut/Pasteを成立させる。
- 判定：**改善して引き継いだ**。要求「Internal Clipboard」を、下記の制御/対象/保存条件として扱う。旧Required等の採用状態は引継がず、新案の推奨状態で保持。
- 対応能力 [CLP-001](features/CLP.md#clp-001)：Copy/Cut/Paste・範囲/層/物体・内部Clipboard。Cutは内部コピー成功後のみ元削除、一操作一Undo
- 検証範囲：仕様本文の能力対応を確認。実装/実機未検証。

## FR-CLIP-002 — Copy / Cut / Paste

- 旧出典：[docs/FEATURE_SPEC.md:1207](https://github.com/totoro0419/illustro_old/blob/bdc7135b51033982d90ea5dad104bb04fc107df2/docs/FEATURE_SPEC.md#L1207)
- 要求内容：少なくとも以下を提供する。 /  / - Copy / - Cut / - Paste / - Copy Merged / - Paste in Place /  / Selectionがある場合はSelection範囲を尊重する。
- 判定：**ほかの機能に統合した**。要求「Copy / Cut / Paste」を、下記の制御/対象/保存条件として扱う。旧Required等の採用状態は引継がず、新案の推奨状態で保持。
- 対応能力 [CLP-001](features/CLP.md#clp-001)：Copy/Cut/Paste・範囲/層/物体・内部Clipboard。Cutは内部コピー成功後のみ元削除、一操作一Undo
- 対応能力 [CLP-002](features/CLP.md#clp-002)：Copy Merged/Paste in Place・可視範囲。元作品保持、貼付一Undo。UI/資料/Proofは統合対象外
- 検証範囲：仕様本文の能力対応を確認。実装/実機未検証。

## FR-CLIP-003 — Native Payload

- 旧出典：[docs/FEATURE_SPEC.md:1219](https://github.com/totoro0419/illustro_old/blob/bdc7135b51033982d90ea5dad104bb04fc107df2/docs/FEATURE_SPEC.md#L1219)
- 要求内容：Illustro内Document間では、可能な対象についてRaster化せずNative Layer/Object情報を保持できるClipboard payloadを優先する。 /  / Copy Merged等は明示的にRaster結果を作る。
- 判定：**改善して引き継いだ**。要求「Native Payload」を、下記の制御/対象/保存条件として扱う。旧Required等の採用状態は引継がず、新案の推奨状態で保持。
- 対応能力 [CLP-003](features/CLP.md#clp-003)：Native層/文字/パス/Mask/依存・色空間。対象をRaster化せず保持できる範囲で転送、一貼付一Undo
- 検証範囲：仕様本文の能力対応を確認。実装/実機未検証。

## FR-CLIP-004 — System Clipboard Bridge

- 旧出典：[docs/FEATURE_SPEC.md:1225](https://github.com/totoro0419/illustro_old/blob/bdc7135b51033982d90ea5dad104bb04fc107df2/docs/FEATURE_SPEC.md#L1225)
- 要求内容：Browser/OSが許す場合、画像等をSystem Clipboardと交換可能にする。 /  / System Clipboard API/permissionをCore Copy/Pasteの必須条件にしない。
- 判定：**改善して引き継いだ**。要求「System Clipboard Bridge」を、下記の制御/対象/保存条件として扱う。旧Required等の採用状態は引継がず、新案の推奨状態で保持。
- 対応能力 [CLP-004](features/CLP.md#clp-004)：OS共有/Clipboard/DragDrop・開く/置く/資料/素材。取込成功後に作品変更、原外部画像不変
- 検証範囲：仕様本文の能力対応を確認。実装/実機未検証。

## FR-CLIP-005 — Paste Destination

- 旧出典：[docs/FEATURE_SPEC.md:1231](https://github.com/totoro0419/illustro_old/blob/bdc7135b51033982d90ea5dad104bb04fc107df2/docs/FEATURE_SPEC.md#L1231)
- 要求内容：PasteはDefaultでactive layer/group contextの直上へ新しいLayer/Objectとして追加する。 /  / Paste in PlaceはIllustro内部Clipboardでsource document coordinatesが分かる場合、その位置関係を保持する。
- 判定：**改善して引き継いだ**。選択層/Group直上の新対象と、内部元座標の同位置貼付をCLP-001/002で具体化した。
- 対応能力 [CLP-001](features/CLP.md#clp-001)：Copy/Cut/Paste・範囲/層/物体・内部Clipboard。Cutは内部コピー成功後のみ元削除、一操作一Undo
- 検証範囲：仕様本文の能力対応を確認。実装/実機未検証。

## FR-CLIP-006 — Cross-device Access

- 旧出典：[docs/FEATURE_SPEC.md:1237](https://github.com/totoro0419/illustro_old/blob/bdc7135b51033982d90ea5dad104bb04fc107df2/docs/FEATURE_SPEC.md#L1237)
- 要求内容：KeyboardのないTablet/SmartphoneでもCopy/Cut/PasteへUIから到達可能にする。
- 判定：**ほかの機能に統合した**。要求「Cross-device Access」を、下記の制御/対象/保存条件として扱う。旧Required等の採用状態は引継がず、新案の推奨状態で保持。
- 対応能力 [DEV-003](features/DEV.md#dev-003)：下部シート・指描き・対象帯・精密数値。全能力へ検索/分野一覧から到達、データ意味を削らない
- 対応能力 [CLP-001](features/CLP.md#clp-001)：Copy/Cut/Paste・範囲/層/物体・内部Clipboard。Cutは内部コピー成功後のみ元削除、一操作一Undo
- 検証範囲：仕様本文の能力対応を確認。実装/実機未検証。

## FR-I18N-001 — Localizable UI

- 旧出典：[docs/FEATURE_SPEC.md:1243](https://github.com/totoro0419/illustro_old/blob/bdc7135b51033982d90ea5dad104bb04fc107df2/docs/FEATURE_SPEC.md#L1243)
- 要求内容：UI文字列を実装コードへ散在させず、localization可能なresourceとして管理する。
- 判定：**改善して引き継いだ**。旧文の内部方式は選定を保留し、利用者に見える能力/失敗時保持は下記具体契約へ引継ぐ。旧方式名の不採用を能力削除とはしない。
- 対応能力 [A11-006](features/A11.md#a11-006)：UI言語・CJK/IME・数値/単位/日時・翻訳長。Command/Macro/Shortcutの同一性は翻訳文字列と独立
- 検証範囲：仕様本文の能力対応を確認。実装/実機未検証。

## FR-I18N-002 — Japanese Layout Support

- 旧出典：[docs/FEATURE_SPEC.md:1247](https://github.com/totoro0419/illustro_old/blob/bdc7135b51033982d90ea5dad104bb04fc107df2/docs/FEATURE_SPEC.md#L1247)
- 要求内容：日本語UI文字列、CJK font fallback、IME入力、長い翻訳文字列でも主要UIが破綻しないLayoutを前提にする。
- 判定：**ほかの機能に統合した**。要求「Japanese Layout Support」を、下記の制御/対象/保存条件として扱う。旧Required等の採用状態は引継がず、新案の推奨状態で保持。
- 対応能力 [A11-006](features/A11.md#a11-006)：UI言語・CJK/IME・数値/単位/日時・翻訳長。Command/Macro/Shortcutの同一性は翻訳文字列と独立
- 対応能力 [INP-008](features/INP.md#inp-008)：IME変換中/確定・数値編集中・キー捕捉の優先。テキスト編集セッションでUndo、IME途中候補は作品確定状態と区別
- 検証範囲：仕様本文の能力対応を確認。実装/実機未検証。

## FR-I18N-003 — Locale-independent Identity

- 旧出典：[docs/FEATURE_SPEC.md:1251](https://github.com/totoro0419/illustro_old/blob/bdc7135b51033982d90ea5dad104bb04fc107df2/docs/FEATURE_SPEC.md#L1251)
- 要求内容：Command ID、Shortcut binding、File schema、Macro等の内部Identityへlocalized display stringを使用してはならない。
- 判定：**改善して引き継いだ**。要求「Locale-independent Identity」を、下記の制御/対象/保存条件として扱う。旧Required等の採用状態は引継がず、新案の推奨状態で保持。
- 対応能力 [A11-006](features/A11.md#a11-006)：UI言語・CJK/IME・数値/単位/日時・翻訳長。Command/Macro/Shortcutの同一性は翻訳文字列と独立
- 検証範囲：仕様本文の能力対応を確認。実装/実機未検証。

## FR-I18N-004 — Formatting

- 旧出典：[docs/FEATURE_SPEC.md:1255](https://github.com/totoro0419/illustro_old/blob/bdc7135b51033982d90ea5dad104bb04fc107df2/docs/FEATURE_SPEC.md#L1255)
- 要求内容：数値、単位、日時等はLocaleに応じた表示を可能にするが、Document canonical numeric valuesとは分離する。 /  / 初期出荷Locale一覧はUI/Product phaseで確定する。
- 判定：**改善して引き継いだ**。要求「Formatting」を、下記の制御/対象/保存条件として扱う。旧Required等の採用状態は引継がず、新案の推奨状態で保持。
- 対応能力 [A11-006](features/A11.md#a11-006)：UI言語・CJK/IME・数値/単位/日時・翻訳長。Command/Macro/Shortcutの同一性は翻訳文字列と独立
- 検証範囲：仕様本文の能力対応を確認。実装/実機未検証。

## DR-FILE-001 — Native Format

- 旧出典：[docs/FEATURE_SPEC.md:1263](https://github.com/totoro0419/illustro_old/blob/bdc7135b51033982d90ea5dad104bb04fc107df2/docs/FEATURE_SPEC.md#L1263)
- 要求内容：Native Formatは **.illustro** とする。
- 判定：**改善して引き継いだ**。要求「Native Format」を、下記の制御/対象/保存条件として扱う。旧Required等の採用状態は引継がず、新案の推奨状態で保持。
- 対応能力 [SAV-003](features/SAV.md#sav-003)：Save/Save As・Native保存先・依存含有・保存時点。要求時点までの受理済編集を含める。未完の接地筆/プレビューは別保留記録
- 検証範囲：仕様本文の能力対応を確認。実装/実機未検証。

## DR-FILE-002 — Native Data

- 旧出典：[docs/FEATURE_SPEC.md:1267](https://github.com/totoro0419/illustro_old/blob/bdc7135b51033982d90ea5dad104bb04fc107df2/docs/FEATURE_SPEC.md#L1267)
- 要求内容：.illustroは少なくとも以下を保存可能にする。 /  / - Canvas / - Layer tree / - Masks / - Vector / - Text / - Brush/document-specific brush data / - Lineart Layer area data / - References / - Snapshot / - Layer Comp / - Timelapse/history-related data / - Workspace/document metadata / - Color profile / - Recovery/version metadata
- 判定：**改善して引き継いだ**。元の全保存項目を補完条項SC-01へ列挙。通常保存と持出し保留セッションの境界をNB-09で定義。
- 対応能力 [SAV-003](features/SAV.md#sav-003)：Save/Save As・Native保存先・依存含有・保存時点。要求時点までの受理済編集を含める。未完の接地筆/プレビューは別保留記録
- 検証範囲：仕様本文の能力対応を確認。実装/実機未検証。

## FR-FILE-001 — Standard Export

- 旧出典：[docs/FEATURE_SPEC.md:1286](https://github.com/totoro0419/illustro_old/blob/bdc7135b51033982d90ea5dad104bb04fc107df2/docs/FEATURE_SPEC.md#L1286)
- 要求内容：PNG/JPEG/WebPをRequiredとする。
- 判定：**改善して引き継いだ**。要求「Standard Export」を、下記の制御/対象/保存条件として扱う。旧Required等の採用状態は引継がず、新案の推奨状態で保持。
- 対応能力 [IO-002](features/IO.md#io-002)：PNGα/JPEG背景と品質/WebP可逆/非可逆・寸法/ICC/範囲/名前。固定時点からコピー出力、作品Undo外、プリセット保存
- 検証範囲：仕様本文の能力対応を確認。実装/実機未検証。

## FR-FILE-002 — OpenRaster

- 旧出典：[docs/FEATURE_SPEC.md:1290](https://github.com/totoro0419/illustro_old/blob/bdc7135b51033982d90ea5dad104bb04fc107df2/docs/FEATURE_SPEC.md#L1290)
- 要求内容：OpenRaster (.ora)をLayer交換形式としてRequiredとする。
- 判定：**改善して引き継いだ**。要求「OpenRaster」を、下記の制御/対象/保存条件として扱う。旧Required等の採用状態は引継がず、新案の推奨状態で保持。
- 対応能力 [IO-004](features/IO.md#io-004)：ORA層構造、TIFF色深度/圧縮/ICC/α/層対応。Nativeを保ち交換コピー、対応しない層は損失表示
- 検証範囲：仕様本文の能力対応を確認。実装/実機未検証。

## FR-FILE-003 — TIFF

- 旧出典：[docs/FEATURE_SPEC.md:1294](https://github.com/totoro0419/illustro_old/blob/bdc7135b51033982d90ea5dad104bb04fc107df2/docs/FEATURE_SPEC.md#L1294)
- 要求内容：TIFFを高品質Raster交換形式としてRequiredとする。
- 判定：**改善して引き継いだ**。要求「TIFF」を、下記の制御/対象/保存条件として扱う。旧Required等の採用状態は引継がず、新案の推奨状態で保持。
- 対応能力 [IO-004](features/IO.md#io-004)：ORA層構造、TIFF色深度/圧縮/ICC/α/層対応。Nativeを保ち交換コピー、対応しない層は損失表示
- 検証範囲：仕様本文の能力対応を確認。実装/実機未検証。

## FR-FILE-004 — PSD

- 旧出典：[docs/FEATURE_SPEC.md:1298](https://github.com/totoro0419/illustro_old/blob/bdc7135b51033982d90ea5dad104bb04fc107df2/docs/FEATURE_SPEC.md#L1298)
- 要求内容：PSD Import/ExportはHigh-priority Investigate。 /  / 「完全互換」を前提にせず、Feature-by-feature互換性を管理する。
- 判定：**改善して引き継いだ**。要求「PSD」を、下記の制御/対象/保存条件として扱う。旧Required等の採用状態は引継がず、新案の推奨状態で保持。
- 対応能力 [IO-003](features/IO.md#io-003)：機能別読込/書込・外観/再編集・PSD/PSB。元Native保持、レイヤー/文字/効果ごとの保持状況をレポート
- 検証範囲：仕様本文の能力対応を確認。実装/実機未検証。

## CR-PSD-001 — Loss Reporting

- 旧出典：[docs/FEATURE_SPEC.md:1304](https://github.com/totoro0419/illustro_old/blob/bdc7135b51033982d90ea5dad104bb04fc107df2/docs/FEATURE_SPEC.md#L1304)
- 要求内容：PSD Import/Exportで情報損失が発生する場合、可能な限りユーザーへ明示する。
- 判定：**改善して引き継いだ**。要求「Loss Reporting」を、下記の制御/対象/保存条件として扱う。旧Required等の採用状態は引継がず、新案の推奨状態で保持。
- 対応能力 [IO-003](features/IO.md#io-003)：機能別読込/書込・外観/再編集・PSD/PSB。元Native保持、レイヤー/文字/効果ごとの保持状況をレポート
- 検証範囲：仕様本文の能力対応を確認。実装/実機未検証。

## CR-PSD-002 — Round Trip

- 旧出典：[docs/FEATURE_SPEC.md:1308](https://github.com/totoro0419/illustro_old/blob/bdc7135b51033982d90ea5dad104bb04fc107df2/docs/FEATURE_SPEC.md#L1308)
- 要求内容：PSD対応を実装する場合はRound-trip Test Suiteを持つ。
- 判定：**改善して引き継いだ**。要求「Round Trip」を、下記の制御/対象/保存条件として扱う。旧Required等の採用状態は引継がず、新案の推奨状態で保持。
- 対応能力 [IO-003](features/IO.md#io-003)：機能別読込/書込・外観/再編集・PSD/PSB。元Native保持、レイヤー/文字/効果ごとの保持状況をレポート
- 検証範囲：仕様本文の能力対応を確認。実装/実機未検証。

## FR-FILE-005 — SVG / EXR

- 旧出典：[docs/FEATURE_SPEC.md:1312](https://github.com/totoro0419/illustro_old/blob/bdc7135b51033982d90ea5dad104bb04fc107df2/docs/FEATURE_SPEC.md#L1312)
- 要求内容：SVGとOpenEXRをそれぞれVector/HDR Interchange候補として検証する。
- 判定：**再検討のため保留した**。候補能力を残し、具体的な範囲/方式/実機結果が必要な部分だけ未決として分離した。正式採用には読み替えない。
- 対応能力 [IO-005](features/IO.md#io-005)：SVGパス/文字/可変幅/筆風外観・外観優先/編集優先。元パス/文字保持、SVGコピー
- 対応能力 [IO-006](features/IO.md#io-006)：EXR精度/チャンネル、AVIF/HEIF圧縮/α/HDR・端末対応。原データ保持、色調マッピングは書出しコピー
- 検証範囲：仕様本文の能力対応を確認。実装/実機未検証。

## FR-SAVE-001 — Autosave

- 旧出典：[docs/FEATURE_SPEC.md:1320](https://github.com/totoro0419/illustro_old/blob/bdc7135b51033982d90ea5dad104bb04fc107df2/docs/FEATURE_SPEC.md#L1320)
- 要求内容：制作中の定期・イベント駆動保存を提供する。
- 判定：**改善して引き継いだ**。要求「Autosave」を、下記の制御/対象/保存条件として扱う。旧Required等の採用状態は引継がず、新案の推奨状態で保持。
- 対応能力 [SAV-004](features/SAV.md#sav-004)：自動保護ON・最後の保護時点・持出し保存時点。自動保護はUndoと別、取消不能な保存履歴で筆履歴を埋めない
- 検証範囲：仕様本文の能力対応を確認。実装/実機未検証。

## FR-SAVE-002 — Incremental Save

- 旧出典：[docs/FEATURE_SPEC.md:1324](https://github.com/totoro0419/illustro_old/blob/bdc7135b51033982d90ea5dad104bb04fc107df2/docs/FEATURE_SPEC.md#L1324)
- 要求内容：Document全体を書き直さず変更分を安全に永続化できる方式を優先する。
- 判定：**改善して引き継いだ**。旧文の内部方式は選定を保留し、利用者に見える能力/失敗時保持は下記具体契約へ引継ぐ。旧方式名の不採用を能力削除とはしない。
- 対応能力 [SAV-004](features/SAV.md#sav-004)：自動保護ON・最後の保護時点・持出し保存時点。自動保護はUndoと別、取消不能な保存履歴で筆履歴を埋めない
- 検証範囲：仕様本文の能力対応を確認。実装/実機未検証。

## FR-SAVE-003 — Crash Recovery

- 旧出典：[docs/FEATURE_SPEC.md:1328](https://github.com/totoro0419/illustro_old/blob/bdc7135b51033982d90ea5dad104bb04fc107df2/docs/FEATURE_SPEC.md#L1328)
- 要求内容：Crash後に最後の安全な状態へ復旧できる。
- 判定：**改善して引き継いだ**。要求「Crash Recovery」を、下記の制御/対象/保存条件として扱う。旧Required等の採用状態は引継がず、新案の推奨状態で保持。
- 対応能力 [SAV-005](features/SAV.md#sav-005)：復元候補/正常保存/未保護部分・比較/別名救出。正常原本を上書きせず復元コピー、保留セッションは別表示
- 検証範囲：仕様本文の能力対応を確認。実装/実機未検証。

## FR-SAVE-004 — Recovery Snapshot

- 旧出典：[docs/FEATURE_SPEC.md:1332](https://github.com/totoro0419/illustro_old/blob/bdc7135b51033982d90ea5dad104bb04fc107df2/docs/FEATURE_SPEC.md#L1332)
- 要求内容：通常Saveと独立したRecovery Stateを保持する。
- 判定：**改善して引き継いだ**。要求「Recovery Snapshot」を、下記の制御/対象/保存条件として扱う。旧Required等の採用状態は引継がず、新案の推奨状態で保持。
- 対応能力 [SAV-005](features/SAV.md#sav-005)：復元候補/正常保存/未保護部分・比較/別名救出。正常原本を上書きせず復元コピー、保留セッションは別表示
- 検証範囲：仕様本文の能力対応を確認。実装/実機未検証。

## QR-SAVE-001 — Non-blocking

- 旧出典：[docs/FEATURE_SPEC.md:1336](https://github.com/totoro0419/illustro_old/blob/bdc7135b51033982d90ea5dad104bb04fc107df2/docs/FEATURE_SPEC.md#L1336)
- 要求内容：保存処理でStroke/Inputを長時間Blockしてはならない。
- 判定：**ほかの機能に統合した**。要求「Non-blocking」を、下記の制御/対象/保存条件として扱う。旧Required等の採用状態は引継がず、新案の推奨状態で保持。
- 対応能力 [SAV-003](features/SAV.md#sav-003)：Save/Save As・Native保存先・依存含有・保存時点。要求時点までの受理済編集を含める。未完の接地筆/プレビューは別保留記録
- 対応能力 [QR-01](QUALITY_REQUIREMENTS.md)：性能の達成値は未検証、内部方式は次段階。
- 検証範囲：仕様本文の能力対応を確認。実装/実機未検証。

## FR-OFFLINE-001 — Offline Core

- 旧出典：[docs/FEATURE_SPEC.md:1340](https://github.com/totoro0419/illustro_old/blob/bdc7135b51033982d90ea5dad104bb04fc107df2/docs/FEATURE_SPEC.md#L1340)
- 要求内容：以下はInternetなしで成立しなければならない。 /  / - Draw / - Edit / - Save / - Layer / - Brush / - Undo/Redo / - Reference / - Filter / - Macro / - Asset Library
- 判定：**改善して引き継いだ**。要求「Offline Core」を、下記の制御/対象/保存条件として扱う。旧Required等の採用状態は引継がず、新案の推奨状態で保持。
- 対応能力 [SAV-007](features/SAV.md#sav-007)：接続/ログイン不要の通常制作・所持素材。同一Native形式で持出し、接続で履歴意味を変えない
- 検証範囲：仕様本文の能力対応を確認。実装/実機未検証。

## FR-OFFLINE-002 — Login

- 旧出典：[docs/FEATURE_SPEC.md:1355](https://github.com/totoro0419/illustro_old/blob/bdc7135b51033982d90ea5dad104bb04fc107df2/docs/FEATURE_SPEC.md#L1355)
- 要求内容：通常のLocal制作でLoginを必須にしない。
- 判定：**改善して引き継いだ**。要求「Login」を、下記の制御/対象/保存条件として扱う。旧Required等の採用状態は引継がず、新案の推奨状態で保持。
- 対応能力 [SAV-007](features/SAV.md#sav-007)：接続/ログイン不要の通常制作・所持素材。同一Native形式で持出し、接続で履歴意味を変えない
- 検証範囲：仕様本文の能力対応を確認。実装/実機未検証。

## QR-PERF-001 — Perceived Zero Lag

- 旧出典：[docs/FEATURE_SPEC.md:1363](https://github.com/totoro0419/illustro_old/blob/bdc7135b51033982d90ea5dad104bb04fc107df2/docs/FEATURE_SPEC.md#L1363)
- 要求内容：「体感0ラグ」を目標とする。
- 判定：**ほかの機能に統合した**。要求「Perceived Zero Lag」を、下記の制御/対象/保存条件として扱う。旧Required等の採用状態は引継がず、新案の推奨状態で保持。
- 対応能力 [QR-01](QUALITY_REQUIREMENTS.md)：性能の達成値は未検証、内部方式は次段階。
- 対応能力 [QR-03](QUALITY_REQUIREMENTS.md)：性能の達成値は未検証、内部方式は次段階。
- 対応能力 [QR-08](QUALITY_REQUIREMENTS.md)：性能の達成値は未検証、内部方式は次段階。
- 対応能力 [QR-19](QUALITY_REQUIREMENTS.md)：性能の達成値は未検証、内部方式は次段階。
- 対応能力 [QR-20](QUALITY_REQUIREMENTS.md)：性能の達成値は未検証、内部方式は次段階。
- 検証範囲：仕様本文の能力対応を確認。実装/実機未検証。

## QR-PERF-002 — Metrics

- 旧出典：[docs/FEATURE_SPEC.md:1367](https://github.com/totoro0419/illustro_old/blob/bdc7135b51033982d90ea5dad104bb04fc107df2/docs/FEATURE_SPEC.md#L1367)
- 要求内容：少なくとも以下を継続計測対象とする。 /  / - Input latency / - frame time / - worst frame / - memory usage / - canvas-size scaling / - layer-count scaling / - Undo latency / - brush-switch latency / - save interruption
- 判定：**ほかの機能に統合した**。要求「Metrics」を、下記の制御/対象/保存条件として扱う。旧Required等の採用状態は引継がず、新案の推奨状態で保持。
- 対応能力 [QR-01](QUALITY_REQUIREMENTS.md)：性能の達成値は未検証、内部方式は次段階。
- 対応能力 [QR-03](QUALITY_REQUIREMENTS.md)：性能の達成値は未検証、内部方式は次段階。
- 対応能力 [QR-08](QUALITY_REQUIREMENTS.md)：性能の達成値は未検証、内部方式は次段階。
- 対応能力 [QR-19](QUALITY_REQUIREMENTS.md)：性能の達成値は未検証、内部方式は次段階。
- 対応能力 [QR-20](QUALITY_REQUIREMENTS.md)：性能の達成値は未検証、内部方式は次段階。
- 検証範囲：仕様本文の能力対応を確認。実装/実機未検証。

## QR-PERF-003 — Partial Update

- 旧出典：[docs/FEATURE_SPEC.md:1381](https://github.com/totoro0419/illustro_old/blob/bdc7135b51033982d90ea5dad104bb04fc107df2/docs/FEATURE_SPEC.md#L1381)
- 要求内容：変更範囲のみを更新できるArchitectureを優先する。
- 判定：**ほかの機能に統合した**。旧文の内部方式は選定を保留し、利用者に見える能力/失敗時保持は下記具体契約へ引継ぐ。旧方式名の不採用を能力削除とはしない。
- 対応能力 [QR-01](QUALITY_REQUIREMENTS.md)：性能の達成値は未検証、内部方式は次段階。
- 対応能力 [QR-03](QUALITY_REQUIREMENTS.md)：性能の達成値は未検証、内部方式は次段階。
- 対応能力 [QR-08](QUALITY_REQUIREMENTS.md)：性能の達成値は未検証、内部方式は次段階。
- 対応能力 [QR-19](QUALITY_REQUIREMENTS.md)：性能の達成値は未検証、内部方式は次段階。
- 対応能力 [QR-20](QUALITY_REQUIREMENTS.md)：性能の達成値は未検証、内部方式は次段階。
- 検証範囲：仕様本文の能力対応を確認。実装/実機未検証。

## QR-PERF-004 — GPU

- 旧出典：[docs/FEATURE_SPEC.md:1385](https://github.com/totoro0419/illustro_old/blob/bdc7135b51033982d90ea5dad104bb04fc107df2/docs/FEATURE_SPEC.md#L1385)
- 要求内容：GPUが有効な環境ではBrush/Filter/Transform/Blend/Preview等へ積極利用する。
- 判定：**ほかの機能に統合した**。旧文の内部方式は選定を保留し、利用者に見える能力/失敗時保持は下記具体契約へ引継ぐ。旧方式名の不採用を能力削除とはしない。
- 対応能力 [QR-01](QUALITY_REQUIREMENTS.md)：性能の達成値は未検証、内部方式は次段階。
- 対応能力 [QR-03](QUALITY_REQUIREMENTS.md)：性能の達成値は未検証、内部方式は次段階。
- 対応能力 [QR-08](QUALITY_REQUIREMENTS.md)：性能の達成値は未検証、内部方式は次段階。
- 対応能力 [QR-19](QUALITY_REQUIREMENTS.md)：性能の達成値は未検証、内部方式は次段階。
- 対応能力 [QR-20](QUALITY_REQUIREMENTS.md)：性能の達成値は未検証、内部方式は次段階。
- 検証範囲：仕様本文の能力対応を確認。実装/実機未検証。

## QR-PERF-005 — Fallback

- 旧出典：[docs/FEATURE_SPEC.md:1389](https://github.com/totoro0419/illustro_old/blob/bdc7135b51033982d90ea5dad104bb04fc107df2/docs/FEATURE_SPEC.md#L1389)
- 要求内容：GPU Feature差によって基本編集不能にならないFallback戦略を持つ。
- 判定：**ほかの機能に統合した**。要求「Fallback」を、下記の制御/対象/保存条件として扱う。旧Required等の採用状態は引継がず、新案の推奨状態で保持。
- 対応能力 [QR-01](QUALITY_REQUIREMENTS.md)：性能の達成値は未検証、内部方式は次段階。
- 対応能力 [QR-03](QUALITY_REQUIREMENTS.md)：性能の達成値は未検証、内部方式は次段階。
- 対応能力 [QR-08](QUALITY_REQUIREMENTS.md)：性能の達成値は未検証、内部方式は次段階。
- 対応能力 [QR-19](QUALITY_REQUIREMENTS.md)：性能の達成値は未検証、内部方式は次段階。
- 対応能力 [QR-20](QUALITY_REQUIREMENTS.md)：性能の達成値は未検証、内部方式は次段階。
- 検証範囲：仕様本文の能力対応を確認。実装/実機未検証。

## QR-PERF-006 — Zero-cost inactive features

- 旧出典：[docs/FEATURE_SPEC.md:1393](https://github.com/totoro0419/illustro_old/blob/bdc7135b51033982d90ea5dad104bb04fc107df2/docs/FEATURE_SPEC.md#L1393)
- 要求内容：使用していない高度機能が、通常描画の恒常的なCPU/GPU処理を発生させてはならない。 /  / 例: /  / - 線画レイヤー解析は線画レイヤー機能を使用しないDocumentでは常時実行しない / - Soft Proof OFF時はProof変換を実行しない / - Wet Media未使用時はWet stateを確保しない / - PSD/EXR等のCodecは必要になるまでロードしない / - Timelapse用の高コストな動画生成処理は制作Hot Pathで行わない
- 判定：**ほかの機能に統合した**。未使用の領域/湿式/Proof/Codec/動画の恒常負荷を避ける結果要求をQR-19へ保持。実装方式は指定しない。
- 対応能力 [QR-01](QUALITY_REQUIREMENTS.md)：性能の達成値は未検証、内部方式は次段階。
- 対応能力 [QR-03](QUALITY_REQUIREMENTS.md)：性能の達成値は未検証、内部方式は次段階。
- 対応能力 [QR-08](QUALITY_REQUIREMENTS.md)：性能の達成値は未検証、内部方式は次段階。
- 対応能力 [QR-19](QUALITY_REQUIREMENTS.md)：性能の達成値は未検証、内部方式は次段階。
- 対応能力 [QR-20](QUALITY_REQUIREMENTS.md)：性能の達成値は未検証、内部方式は次段階。
- 検証範囲：仕様本文の能力対応を確認。実装/実機未検証。

## QR-PERF-007 — Startup / First Draw

- 旧出典：[docs/FEATURE_SPEC.md:1405](https://github.com/totoro0419/illustro_old/blob/bdc7135b51033982d90ea5dad104bb04fc107df2/docs/FEATURE_SPEC.md#L1405)
- 要求内容：アプリ起動から最初のStrokeまでに、通常描画へ不要な高度Moduleの初期化完了を待たせてはならない。 /  / Module/Shader/Codec/Assetは可能な限り遅延ロード・遅延Compileする。
- 判定：**ほかの機能に統合した**。要求「Startup / First Draw」を、下記の制御/対象/保存条件として扱う。旧Required等の採用状態は引継がず、新案の推奨状態で保持。
- 対応能力 [QR-01](QUALITY_REQUIREMENTS.md)：性能の達成値は未検証、内部方式は次段階。
- 対応能力 [QR-03](QUALITY_REQUIREMENTS.md)：性能の達成値は未検証、内部方式は次段階。
- 対応能力 [QR-08](QUALITY_REQUIREMENTS.md)：性能の達成値は未検証、内部方式は次段階。
- 対応能力 [QR-19](QUALITY_REQUIREMENTS.md)：性能の達成値は未検証、内部方式は次段階。
- 対応能力 [QR-20](QUALITY_REQUIREMENTS.md)：性能の達成値は未検証、内部方式は次段階。
- 検証範囲：仕様本文の能力対応を確認。実装/実機未検証。

## QR-PERF-008 — Copy / Allocation Budget

- 旧出典：[docs/FEATURE_SPEC.md:1411](https://github.com/totoro0419/illustro_old/blob/bdc7135b51033982d90ea5dad104bb04fc107df2/docs/FEATURE_SPEC.md#L1411)
- 要求内容：Hot Pathでは大きなBufferの不要なCopy、短命Objectの大量生成、全Tile/全Layerの複製を避ける。 /  / JS↔WASM↔Worker↔GPU間の境界は、抽象化の統一性より**実測されたCopy/Serialization cost**を優先して配置する。
- 判定：**ほかの機能に統合した**。旧文の内部方式は選定を保留し、利用者に見える能力/失敗時保持は下記具体契約へ引継ぐ。旧方式名の不採用を能力削除とはしない。
- 対応能力 [QR-01](QUALITY_REQUIREMENTS.md)：性能の達成値は未検証、内部方式は次段階。
- 対応能力 [QR-03](QUALITY_REQUIREMENTS.md)：性能の達成値は未検証、内部方式は次段階。
- 対応能力 [QR-08](QUALITY_REQUIREMENTS.md)：性能の達成値は未検証、内部方式は次段階。
- 対応能力 [QR-19](QUALITY_REQUIREMENTS.md)：性能の達成値は未検証、内部方式は次段階。
- 対応能力 [QR-20](QUALITY_REQUIREMENTS.md)：性能の達成値は未検証、内部方式は次段階。
- 検証範囲：仕様本文の能力対応を確認。実装/実機未検証。

## QR-PERF-009 — Background Work Budget

- 旧出典：[docs/FEATURE_SPEC.md:1417](https://github.com/totoro0419/illustro_old/blob/bdc7135b51033982d90ea5dad104bb04fc107df2/docs/FEATURE_SPEC.md#L1417)
- 要求内容：Background解析・Materialization・Cache生成はForegroundのInput/Present予算を侵食しない。 /  / Idleであることだけを理由に無制限のBackground処理を開始せず、CPU/GPU/Memory/Thermal budgetを持つ。
- 判定：**ほかの機能に統合した**。旧文の内部方式は選定を保留し、利用者に見える能力/失敗時保持は下記具体契約へ引継ぐ。旧方式名の不採用を能力削除とはしない。
- 対応能力 [QR-01](QUALITY_REQUIREMENTS.md)：性能の達成値は未検証、内部方式は次段階。
- 対応能力 [QR-03](QUALITY_REQUIREMENTS.md)：性能の達成値は未検証、内部方式は次段階。
- 対応能力 [QR-08](QUALITY_REQUIREMENTS.md)：性能の達成値は未検証、内部方式は次段階。
- 対応能力 [QR-19](QUALITY_REQUIREMENTS.md)：性能の達成値は未検証、内部方式は次段階。
- 対応能力 [QR-20](QUALITY_REQUIREMENTS.md)：性能の達成値は未検証、内部方式は次段階。
- 検証範囲：仕様本文の能力対応を確認。実装/実機未検証。

## QR-PERF-010 — Adaptive architecture

- 旧出典：[docs/FEATURE_SPEC.md:1423](https://github.com/totoro0419/illustro_old/blob/bdc7135b51033982d90ea5dad104bb04fc107df2/docs/FEATURE_SPEC.md#L1423)
- 要求内容：Thread/Worker/WASM/GPUの配置は一つの理想構造へ固定せず、Target deviceで最も軽い構成を選択できるようにする。 /  / 同じSemantic contractを保つ限り、DesktopとMobileで物理実行構成が異なることを許容する。
- 判定：**ほかの機能に統合した**。旧文の内部方式は選定を保留し、利用者に見える能力/失敗時保持は下記具体契約へ引継ぐ。旧方式名の不採用を能力削除とはしない。
- 対応能力 [QR-01](QUALITY_REQUIREMENTS.md)：性能の達成値は未検証、内部方式は次段階。
- 対応能力 [QR-03](QUALITY_REQUIREMENTS.md)：性能の達成値は未検証、内部方式は次段階。
- 対応能力 [QR-08](QUALITY_REQUIREMENTS.md)：性能の達成値は未検証、内部方式は次段階。
- 対応能力 [QR-19](QUALITY_REQUIREMENTS.md)：性能の達成値は未検証、内部方式は次段階。
- 対応能力 [QR-20](QUALITY_REQUIREMENTS.md)：性能の達成値は未検証、内部方式は次段階。
- 検証範囲：仕様本文の能力対応を確認。実装/実機未検証。

## FR-AI-001 — Author-first

- 旧出典：[docs/FEATURE_SPEC.md:1433](https://github.com/totoro0419/illustro_old/blob/bdc7135b51033982d90ea5dad104bb04fc107df2/docs/FEATURE_SPEC.md#L1433)
- 要求内容：AIがArtwork完成を主体的に代行することをIllustroの中心価値にしない。
- 判定：**改善して引き継いだ**。要求「Author-first」を、下記の制御/対象/保存条件として扱う。旧Required等の採用状態は引継がず、新案の推奨状態で保持。
- 対応能力 [AI-004](features/AI.md#ai-004)：送信先/範囲/費用/保存/学習条件・外部送信既定OFF。同意記録と結果出典を保持、基本制作は独立
- 検証範囲：仕様本文の能力対応を確認。実装/実機未検証。

## FR-AI-002 — Assistive Only

- 旧出典：[docs/FEATURE_SPEC.md:1437](https://github.com/totoro0419/illustro_old/blob/bdc7135b51033982d90ea5dad104bb04fc107df2/docs/FEATURE_SPEC.md#L1437)
- 要求内容：AI利用候補はColor/Region/Selection/Organization/Repair等の補助を中心とする。
- 判定：**ほかの機能に統合した**。要求「Assistive Only」を、下記の制御/対象/保存条件として扱う。旧Required等の採用状態は引継がず、新案の推奨状態で保持。
- 対応能力 [AI-001](features/AI.md#ai-001)：入力範囲・候補・追加/減算・手修正。採用を一Undo、結果と手修正を保存
- 対応能力 [AI-002](features/AI.md#ai-002)：既存絵/資料/パレット・候補数/対象・強度。別層/分岐へ採用、一Undo
- 対応能力 [AI-003](features/AI.md#ai-003)：修復候補/名称/整理対象・見た目維持。一採用集合一Undo、元順序と名称を保持
- 検証範囲：仕様本文の能力対応を確認。実装/実機未検証。

## FR-AI-003 — Deterministic Alternative

- 旧出典：[docs/FEATURE_SPEC.md:1441](https://github.com/totoro0419/illustro_old/blob/bdc7135b51033982d90ea5dad104bb04fc107df2/docs/FEATURE_SPEC.md#L1441)
- 要求内容：可能な機能はAIなしでも成立するAlgorithmを優先する。
- 判定：**改善して引き継いだ**。要求「Deterministic Alternative」を、下記の制御/対象/保存条件として扱う。旧Required等の採用状態は引継がず、新案の推奨状態で保持。
- 対応能力 [AI-004](features/AI.md#ai-004)：送信先/範囲/費用/保存/学習条件・外部送信既定OFF。同意記録と結果出典を保持、基本制作は独立
- 検証範囲：仕様本文の能力対応を確認。実装/実機未検証。

## FR-AI-004 — Offline / Privacy

- 旧出典：[docs/FEATURE_SPEC.md:1445](https://github.com/totoro0419/illustro_old/blob/bdc7135b51033982d90ea5dad104bb04fc107df2/docs/FEATURE_SPEC.md#L1445)
- 要求内容：AI FeatureがなくてもCore Painting Workflowは完全に成立しなければならない。
- 判定：**ほかの機能に統合した**。要求「Offline / Privacy」を、下記の制御/対象/保存条件として扱う。旧Required等の採用状態は引継がず、新案の推奨状態で保持。
- 対応能力 [SAV-007](features/SAV.md#sav-007)：接続/ログイン不要の通常制作・所持素材。同一Native形式で持出し、接続で履歴意味を変えない
- 対応能力 [AI-004](features/AI.md#ai-004)：送信先/範囲/費用/保存/学習条件・外部送信既定OFF。同意記録と結果出典を保持、基本制作は独立
- 検証範囲：仕様本文の能力対応を確認。実装/実機未検証。

## FUT-EXT-001 — Plugin API

- 旧出典：[docs/FEATURE_SPEC.md:1453](https://github.com/totoro0419/illustro_old/blob/bdc7135b51033982d90ea5dad104bb04fc107df2/docs/FEATURE_SPEC.md#L1453)
- 要求内容：Plugin/Extension APIは本体完成前の必須機能にしない。
- 判定：**再検討のため保留した**。候補能力を残し、具体的な範囲/方式/実機結果が必要な部分だけ未決として分離した。正式採用には読み替えない。
- 対応能力 [EXT-001](features/EXT.md#ext-001)：Command/筆/効果/入出力/Panelの拡張候補。拡張不在でも保存済外観/データ保持を要求
- 検証範囲：仕様本文の能力対応を確認。実装/実機未検証。

## DR-EXT-001 — Internal Boundaries

- 旧出典：[docs/FEATURE_SPEC.md:1457](https://github.com/totoro0419/illustro_old/blob/bdc7135b51033982d90ea5dad104bb04fc107df2/docs/FEATURE_SPEC.md#L1457)
- 要求内容：将来のExtensionを不必要に妨げないよう、Command/Document/Render/Import-Export等の内部Module Boundaryを明確にする。
- 判定：**改善して引き継いだ**。旧文の内部方式は選定を保留し、利用者に見える能力/失敗時保持は下記具体契約へ引継ぐ。旧方式名の不採用を能力削除とはしない。
- 対応能力 [EXT-001](features/EXT.md#ext-001)：Command/筆/効果/入出力/Panelの拡張候補。拡張不在でも保存済外観/データ保持を要求
- 検証範囲：仕様本文の能力対応を確認。実装/実機未検証。

## FUT-EXT-002 — Potential Extension Points

- 旧出典：[docs/FEATURE_SPEC.md:1461](https://github.com/totoro0419/illustro_old/blob/bdc7135b51033982d90ea5dad104bb04fc107df2/docs/FEATURE_SPEC.md#L1461)
- 要求内容：将来候補: /  / - Commands / - import/export codec / - filters / - brush modules / - panels / - automation functions /  / 任意コードの無制限実行を前提としない。
- 判定：**再検討のため保留した**。候補能力を残し、具体的な範囲/方式/実機結果が必要な部分だけ未決として分離した。正式採用には読み替えない。
- 対応能力 [EXT-001](features/EXT.md#ext-001)：Command/筆/効果/入出力/Panelの拡張候補。拡張不在でも保存済外観/データ保持を要求
- 検証範囲：仕様本文の能力対応を確認。実装/実機未検証。

## FUT-COLLAB-001 — 旧将来要件

- 旧出典：[docs/FEATURE_SPEC.md:1478](https://github.com/totoro0419/illustro_old/blob/bdc7135b51033982d90ea5dad104bb04fc107df2/docs/FEATURE_SPEC.md#L1478)
- 要求内容：絵チャ・Realtime共同描画は、Core Illustro完成後のFuture Scopeとする。
- 判定：**再検討のため保留した**。候補能力を残し、具体的な範囲/方式/実機結果が必要な部分だけ未決として分離した。正式採用には読み替えない。
- 対応能力 [EXT-002](features/EXT.md#ext-002)：共同編集/絵チャ・参加/権限/競合候補。共同Undo/所有/保存競合は別仕様が必要
- 検証範囲：仕様本文の能力対応を確認。実装/実機未検証。

## DR-COLLAB-001 — 旧将来要件

- 旧出典：[docs/FEATURE_SPEC.md:1482](https://github.com/totoro0419/illustro_old/blob/bdc7135b51033982d90ea5dad104bb04fc107df2/docs/FEATURE_SPEC.md#L1482)
- 要求内容：現段階でRealtime Collaboration向けの複雑性をCore設計へ持ち込まない。 /  / ただし、Document ID、Command、Entity identity等について、将来の共同編集を不必要に不可能にする制約は避ける。
- 判定：**改善して引き継いだ**。旧文の内部方式は選定を保留し、利用者に見える能力/失敗時保持は下記具体契約へ引継ぐ。旧方式名の不採用を能力削除とはしない。
- 対応能力 [EXT-002](features/EXT.md#ext-002)：共同編集/絵チャ・参加/権限/競合候補。共同Undo/所有/保存競合は別仕様が必要
- 検証範囲：仕様本文の能力対応を確認。実装/実機未検証。
