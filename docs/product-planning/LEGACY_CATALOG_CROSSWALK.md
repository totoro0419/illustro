# 324旧項目の意味的対応検査

改訂：2026-10-27。旧SHA `bdc7135b51033982d90ea5dad104bb04fc107df2`。旧採用状態の自動承継なし。全行を能力/制御/保存の具体記述と対照した。リンク存在の検査と意味対応は別であり、以下は文書上の対照、動作保証ではない。複合項目は一部保留を理由とともに示す。

[個別機能](FEATURE_MASTER_CATALOG.md) · [補完条項](REQUIREMENT_TRACEABILITY.md#補完条項) · [審査](PRODUCT_AUDIT.md)

## LC-001 — Raster Canvas

- 旧出典：[docs/FEATURE_CATALOG.md:19](https://github.com/totoro0419/illustro_old/blob/bdc7135b51033982d90ea5dad104bb04fc107df2/docs/FEATURE_CATALOG.md#L19)
- 旧内容：Raster Canvas。主描画面（当時状態：Core）
- 判定：**改善して引き継いだ**。「Raster Canvas」の能力は以下の具体制御へ対応。
- 対応能力 [CAN-001](features/CAN.md#can-001)：寸法・単位・DPI・背景・プロファイルを指定し描画レイヤーを1枚選択済みにする。幅高さ・px/mm・DPI・背景・ICC。標準は直前の安全な新規条件を表示、未選択時はsRGB。作成前は作品履歴なし。作成後は選択済みRaster1枚、属性を保存
- 対応能力 [BRU-001](features/BRU.md#bru-001)：Gペン・丸・鉛筆・マーカー・エアブラシ・硬軟消しゴムを品質基準付きで用意。丸/Gペン/鉛筆/マーカー/エアブラシ/硬軟消し。汎用筆は強制入り抜きOFF。一筆一Undo、消しは透明度を減らし背景色で塗らない
- 検証範囲：旧名/注記と新仕様の具体能力を対照。実装検証ではない。

## LC-002 — Tile-based 大規模Canvas

- 旧出典：[docs/FEATURE_CATALOG.md:20](https://github.com/totoro0419/illustro_old/blob/bdc7135b51033982d90ea5dad104bb04fc107df2/docs/FEATURE_CATALOG.md#L20)
- 旧内容：Tile-based 大規模Canvas。大規模キャンバス要件を満たす有力方式（当時状態：Core / Investigate）
- 判定：**再検討のため保留した**。「Tile-based 大規模Canvas」の能力は以下の具体制御へ対応。旧記載は技術候補であり、同じ結果要求を残して方式選定を次段階へ分離。
- 対応能力 [QR-08](QUALITY_REQUIREMENTS.md)：大作品/多数層/入力/表示の継続と負荷を測定し、方式を確定しない。
- 検証範囲：旧名/注記と新仕様の具体能力を対照。実装検証ではない。

## LC-003 — Pan / Zoom / Rotate

- 旧出典：[docs/FEATURE_CATALOG.md:21](https://github.com/totoro0419/illustro_old/blob/bdc7135b51033982d90ea5dad104bb04fc107df2/docs/FEATURE_CATALOG.md#L21)
- 旧内容：Pan / Zoom / Rotate。即応性最重要（当時状態：Core）
- 判定：**改善して引き継いだ**。「Pan / Zoom / Rotate」の能力は以下の具体制御へ対応。
- 対応能力 [CAN-002](features/CAN.md#can-002)：描画中・直後・全処理中にも作品と途中線を一体で動かす。倍率・角度・移動量、回転吸着ON/OFF。ペンと指の役割を表示。表示移動は作品Undo外、文書ごとの表示位置を復帰
- 検証範囲：旧名/注記と新仕様の具体能力を対照。実装検証ではない。

## LC-004 — 最大 64000% Zoom

- 旧出典：[docs/FEATURE_CATALOG.md:22](https://github.com/totoro0419/illustro_old/blob/bdc7135b51033982d90ea5dad104bb04fc107df2/docs/FEATURE_CATALOG.md#L22)
- 旧内容：最大 64000% Zoom。高倍率でも座標精度を維持（当時状態：Required）
- 判定：**再検討のため保留した**。「最大 64000% Zoom」の能力は以下の具体制御へ対応。 候補を削除せず範囲/精度/用途を比較待ち。
- 対応能力 [CAN-004](features/CAN.md#can-004)：旧64000%を再評価候補にし、倍率で座標や境界の意味を変えない。倍率入力・グリッド閾値・格子色。64000%は目標で達成値ではない。表示設定として保存、グリッド自体は作品外
- 検証範囲：旧名/注記と新仕様の具体能力を対照。実装検証ではない。

## LC-005 — Canvas Flip

- 旧出典：[docs/FEATURE_CATALOG.md:23](https://github.com/totoro0419/illustro_old/blob/bdc7135b51033982d90ea5dad104bb04fc107df2/docs/FEATURE_CATALOG.md#L23)
- 旧内容：Canvas Flip。水平/垂直（当時状態：Required）
- 判定：**改善して引き継いだ**。「Canvas Flip」の能力は以下の具体制御へ対応。
- 対応能力 [CAN-003](features/CAN.md#can-003)：回転解除・水平垂直の表示反転を作品編集と区別。Fit・100%・水平/垂直反転・回転0。既定は反転なし。絵を反転せず表示だけ変更、Undo対象外
- 検証範囲：旧名/注記と新仕様の具体能力を対照。実装検証ではない。

## LC-006 — Crop

- 旧出典：[docs/FEATURE_CATALOG.md:24](https://github.com/totoro0419/illustro_old/blob/bdc7135b51033982d90ea5dad104bb04fc107df2/docs/FEATURE_CATALOG.md#L24)
- 旧内容：Crop。詳細操作は未確定（当時状態：Required）
- 判定：**改善して引き継いだ**。「Crop」の能力は以下の具体制御へ対応。
- 対応能力 [CAN-005](features/CAN.md#can-005)：枠・比率・基準点で領域を変更し、外側内容の保持/切除を明示。枠比率・幅高さ・基準点・外側保持。標準は保持。一回の適用で一Undo。外側保持と完全切除を別コマンド、保持分もNative保存
- 検証範囲：旧名/注記と新仕様の具体能力を対照。実装検証ではない。

## LC-007 — Canvas Resize

- 旧出典：[docs/FEATURE_CATALOG.md:25](https://github.com/totoro0419/illustro_old/blob/bdc7135b51033982d90ea5dad104bb04fc107df2/docs/FEATURE_CATALOG.md#L25)
- 旧内容：Canvas Resize。（当時状態：Required）
- 判定：**改善して引き継いだ**。「Canvas Resize」の能力は以下の具体制御へ対応。
- 対応能力 [CAN-005](features/CAN.md#can-005)：枠・比率・基準点で領域を変更し、外側内容の保持/切除を明示。枠比率・幅高さ・基準点・外側保持。標準は保持。一回の適用で一Undo。外側保持と完全切除を別コマンド、保持分もNative保存
- 検証範囲：旧名/注記と新仕様の具体能力を対照。実装検証ではない。

## LC-008 — Image Resize

- 旧出典：[docs/FEATURE_CATALOG.md:26](https://github.com/totoro0419/illustro_old/blob/bdc7135b51033982d90ea5dad104bb04fc107df2/docs/FEATURE_CATALOG.md#L26)
- 旧内容：Image Resize。補間方式は別途仕様化（当時状態：Required）
- 判定：**改善して引き継いだ**。「Image Resize」の能力は以下の具体制御へ対応。
- 対応能力 [CAN-006](features/CAN.md#can-006)：比率・補間・結果寸法を事前確認、DPIのみ変更と区別。幅高さ・比率ロック・DPI・補間用途。標準は比率ロック。適用一Undo。連続試行は元から評価。原本サイズはUndo/Snapshotで戻す
- 検証範囲：旧名/注記と新仕様の具体能力を対照。実装検証ではない。

## LC-009 — Seamless Tile Drawing

- 旧出典：[docs/FEATURE_CATALOG.md:27](https://github.com/totoro0419/illustro_old/blob/bdc7135b51033982d90ea5dad104bb04fc107df2/docs/FEATURE_CATALOG.md#L27)
- 旧内容：Seamless Tile Drawing。上下左右反復をリアルタイム確認（当時状態：Required）
- 判定：**改善して引き継いだ**。「Seamless Tile Drawing」の能力は以下の具体制御へ対応。
- 対応能力 [CAN-008](features/CAN.md#can-008)：端を越えた描画を反復表示し、境界付近のUndoを一致させる。反復ON/OFF・原タイル枠・繰返し数。反復筆全体が一筆一Undo。保存は一タイル、反復プレビューは表示設定
- 検証範囲：旧名/注記と新仕様の具体能力を対照。実装検証ではない。

## LC-010 — 複数Document

- 旧出典：[docs/FEATURE_CATALOG.md:28](https://github.com/totoro0419/illustro_old/blob/bdc7135b51033982d90ea5dad104bb04fc107df2/docs/FEATURE_CATALOG.md#L28)
- 旧内容：複数Document。UX未確定（当時状態：Required）
- 判定：**改善して引き継いだ**。「複数Document」の能力は以下の具体制御へ対応。
- 対応能力 [CAN-007](features/CAN.md#can-007)：各作品の選択・未確定編集・保存状態を取り違えず復帰。文書タブ・保存状態・保留編集数。標準は現在文書を維持。文書ごと履歴分離。切替自体はUndo外。未確定セッションはRecoveryに別記録
- 検証範囲：旧名/注記と新仕様の具体能力を対照。実装検証ではない。

## LC-011 — Document Metadata

- 旧出典：[docs/FEATURE_CATALOG.md:29](https://github.com/totoro0419/illustro_old/blob/bdc7135b51033982d90ea5dad104bb04fc107df2/docs/FEATURE_CATALOG.md#L29)
- 旧内容：Document Metadata。.illustroで保持（当時状態：Required）
- 判定：**改善して引き継いだ**。「Document Metadata」の能力は以下の具体制御へ対応。
- 対応能力 [CAN-009](features/CAN.md#can-009)：タイトル・作者・寸法・色・ガイド等を再利用、個人設定混入を防止。作品名・作者・説明・新規条件・ガイドを含める範囲。メタデータ変更は一確定一Undo。個人のキー/直近履歴は混入しない
- 検証範囲：旧名/注記と新仕様の具体能力を対照。実装検証ではない。

## LC-012 — Brush Tool

- 旧出典：[docs/FEATURE_CATALOG.md:35](https://github.com/totoro0419/illustro_old/blob/bdc7135b51033982d90ea5dad104bb04fc107df2/docs/FEATURE_CATALOG.md#L35)
- 旧内容：Brush Tool。低遅延（当時状態：Core）
- 判定：**改善して引き継いだ**。「Brush Tool」の能力は以下の具体制御へ対応。
- 対応能力 [BRU-001](features/BRU.md#bru-001)：Gペン・丸・鉛筆・マーカー・エアブラシ・硬軟消しゴムを品質基準付きで用意。丸/Gペン/鉛筆/マーカー/エアブラシ/硬軟消し。汎用筆は強制入り抜きOFF。一筆一Undo、消しは透明度を減らし背景色で塗らない
- 検証範囲：旧名/注記と新仕様の具体能力を対照。実装検証ではない。

## LC-013 — Eraser

- 旧出典：[docs/FEATURE_CATALOG.md:36](https://github.com/totoro0419/illustro_old/blob/bdc7135b51033982d90ea5dad104bb04fc107df2/docs/FEATURE_CATALOG.md#L36)
- 旧内容：Eraser。Brush Engineと統一的に扱える設計を優先（当時状態：Core）
- 判定：**改善して引き継いだ**。「Eraser」の能力は以下の具体制御へ対応。
- 対応能力 [BRU-012](features/BRU.md#bru-012)：独立消しゴムと一時保持を両立し、サイズ連動を任意化。保持消し/独立消し・径の連動/独立。消去筆は一Undo、戻り先は筆名と対象を保持
- 検証範囲：旧名/注記と新仕様の具体能力を対照。実装検証ではない。

## LC-014 — Smudge / Blend Tool

- 旧出典：[docs/FEATURE_CATALOG.md:37](https://github.com/totoro0419/illustro_old/blob/bdc7135b51033982d90ea5dad104bb04fc107df2/docs/FEATURE_CATALOG.md#L37)
- 旧内容：Smudge / Blend Tool。詳細方式未確定（当時状態：Required）
- 判定：**改善して引き継いだ**。「Smudge / Blend Tool」の能力は以下の具体制御へ対応。
- 対応能力 [WET-001](features/WET.md#wet-001)：既存色を引く操作と色を加えて混ぜる操作を区別。ぼかし/引きずり/色追加混色・径/強さ/色量・参照元。一筆一Undo。参照合成を使っても出力層を分離
- 検証範囲：旧名/注記と新仕様の具体能力を対照。実装検証ではない。

## LC-015 — Brush Size / Opacity

- 旧出典：[docs/FEATURE_CATALOG.md:38](https://github.com/totoro0419/illustro_old/blob/bdc7135b51033982d90ea5dad104bb04fc107df2/docs/FEATURE_CATALOG.md#L38)
- 旧内容：Brush Size / Opacity。高速アクセス必須（当時状態：Core）
- 判定：**改善して引き継いだ**。「Brush Size / Opacity」の能力は以下の具体制御へ対応。
- 対応能力 [BRU-002](features/BRU.md#bru-002)：スライダーと正確な数値、上限下限、筆幅の視覚比較。サイズpx・不透明度%・流量%、最小最大、連動OFF。設定変更は次筆から。一筆の途中へ遡及しない。最後の筆値を保持
- 検証範囲：旧名/注記と新仕様の具体能力を対照。実装検証ではない。

## LC-016 — Pressure

- 旧出典：[docs/FEATURE_CATALOG.md:39](https://github.com/totoro0419/illustro_old/blob/bdc7135b51033982d90ea5dad104bb04fc107df2/docs/FEATURE_CATALOG.md#L39)
- 旧内容：Pressure。対応端末（当時状態：Core）
- 判定：**改善して引き継いだ**。「Pressure」の能力は以下の具体制御へ対応。
- 対応能力 [INP-002](features/INP.md#inp-002)：取得可能なセンサーを利用、取得不能を実測値と偽らず一定値等を選ぶ。全体筆圧曲線・最小最大・傾き/方位/軸回転の対応状況。曲線は個人校正、ブラシ変調はプリセット。既存画素/Redo不変
- 検証範囲：旧名/注記と新仕様の具体能力を対照。実装検証ではない。

## LC-017 — Tilt

- 旧出典：[docs/FEATURE_CATALOG.md:40](https://github.com/totoro0419/illustro_old/blob/bdc7135b51033982d90ea5dad104bb04fc107df2/docs/FEATURE_CATALOG.md#L40)
- 旧内容：Tilt。対応端末（当時状態：Required）
- 判定：**改善して引き継いだ**。「Tilt」の能力は以下の具体制御へ対応。
- 対応能力 [INP-002](features/INP.md#inp-002)：取得可能なセンサーを利用、取得不能を実測値と偽らず一定値等を選ぶ。全体筆圧曲線・最小最大・傾き/方位/軸回転の対応状況。曲線は個人校正、ブラシ変調はプリセット。既存画素/Redo不変
- 検証範囲：旧名/注記と新仕様の具体能力を対照。実装検証ではない。

## LC-018 — Azimuth

- 旧出典：[docs/FEATURE_CATALOG.md:41](https://github.com/totoro0419/illustro_old/blob/bdc7135b51033982d90ea5dad104bb04fc107df2/docs/FEATURE_CATALOG.md#L41)
- 旧内容：Azimuth。対応端末（当時状態：Required）
- 判定：**改善して引き継いだ**。「Azimuth」の能力は以下の具体制御へ対応。
- 対応能力 [INP-002](features/INP.md#inp-002)：取得可能なセンサーを利用、取得不能を実測値と偽らず一定値等を選ぶ。全体筆圧曲線・最小最大・傾き/方位/軸回転の対応状況。曲線は個人校正、ブラシ変調はプリセット。既存画素/Redo不変
- 検証範囲：旧名/注記と新仕様の具体能力を対照。実装検証ではない。

## LC-019 — Stylus Eraser

- 旧出典：[docs/FEATURE_CATALOG.md:42](https://github.com/totoro0419/illustro_old/blob/bdc7135b51033982d90ea5dad104bb04fc107df2/docs/FEATURE_CATALOG.md#L42)
- 旧内容：Stylus Eraser。対応端末（当時状態：Required）
- 判定：**改善して引き継いだ**。「Stylus Eraser」の能力は以下の具体制御へ対応。
- 対応能力 [INP-003](features/INP.md#inp-003)：対応機器で押す/保持/切替を区別し戻り先を維持。ボタン単発/保持/切替、後端の筆種・サイズ独立/連動。個人割当保存、ボタン押下自体で絵のUndoを増やさない
- 検証範囲：旧名/注記と新仕様の具体能力を対照。実装検証ではない。

## LC-020 — Barrel Button

- 旧出典：[docs/FEATURE_CATALOG.md:43](https://github.com/totoro0419/illustro_old/blob/bdc7135b51033982d90ea5dad104bb04fc107df2/docs/FEATURE_CATALOG.md#L43)
- 旧内容：Barrel Button。対応端末（当時状態：Required）
- 判定：**改善して引き継いだ**。「Barrel Button」の能力は以下の具体制御へ対応。
- 対応能力 [INP-003](features/INP.md#inp-003)：対応機器で押す/保持/切替を区別し戻り先を維持。ボタン単発/保持/切替、後端の筆種・サイズ独立/連動。個人割当保存、ボタン押下自体で絵のUndoを増やさない
- 検証範囲：旧名/注記と新仕様の具体能力を対照。実装検証ではない。

## LC-021 — Stabilization / Smoothing

- 旧出典：[docs/FEATURE_CATALOG.md:44](https://github.com/totoro0419/illustro_old/blob/bdc7135b51033982d90ea5dad104bb04fc107df2/docs/FEATURE_CATALOG.md#L44)
- 旧内容：Stabilization / Smoothing。Global / per-brush の両方を想定。アクセシビリティにも利用（当時状態：Core）
- 判定：**改善して引き継いだ**。「Stabilization / Smoothing」の能力は以下の具体制御へ対応。
- 対応能力 [BRU-003](features/BRU.md#bru-003)：全体/ブラシ別補正、筆圧補正、OFF、反応と補正量の比較。補正OFF/軽い/強い・強度・速度依存・筆圧平滑・全体/筆別。補正はプリセット+全体上書き表示、既存筆は変えない
- 検証範囲：旧名/注記と新仕様の具体能力を対照。実装検証ではない。

## LC-022 — Brush Dynamics 共通変調モデル

- 旧出典：[docs/FEATURE_CATALOG.md:45](https://github.com/totoro0419/illustro_old/blob/bdc7135b51033982d90ea5dad104bb04fc107df2/docs/FEATURE_CATALOG.md#L45)
- 旧内容：Brush Dynamics 共通変調モデル。Pressure/Tilt/Azimuth/Speed/Direction/Distance/Time/Random等を共通入力として扱う（当時状態：Core）
- 判定：**改善して引き継いだ**。「Brush Dynamics 共通変調モデル」の能力は以下の具体制御へ対応。
- 対応能力 [BRU-006](features/BRU.md#bru-006)：筆圧/傾き/速度/方向/距離/時間/乱数からサイズ・色・質感等の範囲・反転・カーブを指定。入力:圧/傾き/方位/軸回転/速度/方向/距離/時間/始終端/乱数/カーブ。出力:径/不透明度/流量/間隔/回転/散布/形変形/HSV/硬さ/質感/混色/水/顔料/粒子。対応表と乱数条件をプリセットへ。Redoで乱数を引き直さない
- 検証範囲：旧名/注記と新仕様の具体能力を対照。実装検証ではない。

## LC-023 — Dynamics Curve / Range / Invert

- 旧出典：[docs/FEATURE_CATALOG.md:46](https://github.com/totoro0419/illustro_old/blob/bdc7135b51033982d90ea5dad104bb04fc107df2/docs/FEATURE_CATALOG.md#L46)
- 旧内容：Dynamics Curve / Range / Invert。入力→Brush Parameterの対応を共通UIで設定（当時状態：Required）
- 判定：**改善して引き継いだ**。「Dynamics Curve / Range / Invert」の能力は以下の具体制御へ対応。
- 対応能力 [BRU-006](features/BRU.md#bru-006)：筆圧/傾き/速度/方向/距離/時間/乱数からサイズ・色・質感等の範囲・反転・カーブを指定。入力:圧/傾き/方位/軸回転/速度/方向/距離/時間/始終端/乱数/カーブ。出力:径/不透明度/流量/間隔/回転/散布/形変形/HSV/硬さ/質感/混色/水/顔料/粒子。対応表と乱数条件をプリセットへ。Redoで乱数を引き直さない
- 検証範囲：旧名/注記と新仕様の具体能力を対照。実装検証ではない。

## LC-024 — Procedural Brush System

- 旧出典：[docs/FEATURE_CATALOG.md:47](https://github.com/totoro0419/illustro_old/blob/bdc7135b51033982d90ea5dad104bb04fc107df2/docs/FEATURE_CATALOG.md#L47)
- 旧内容：Procedural Brush System。Illustroの主要独自機能（当時状態：Core）
- 判定：**改善して引き継いだ**。「Procedural Brush System」の能力は以下の具体制御へ対応。
- 対応能力 [BRU-005](features/BRU.md#bru-005)：形・硬さ・間隔・散布・回転・粒子を変更し作品外で試す。形/硬さ/間隔/散布/回転/粒子/形状変形、元筆との差。ブラシの硬さと形状変形は独立制御。取消は作品を変えず筆編集を戻す。元プリセットを無断上書きしない
- 検証範囲：旧名/注記と新仕様の具体能力を対照。実装検証ではない。

## LC-025 — Texture-based Brush Input

- 旧出典：[docs/FEATURE_CATALOG.md:48](https://github.com/totoro0419/illustro_old/blob/bdc7135b51033982d90ea5dad104bb04fc107df2/docs/FEATURE_CATALOG.md#L48)
- 旧内容：Texture-based Brush Input。Proceduralと併用（当時状態：Required）
- 判定：**改善して引き継いだ**。「Texture-based Brush Input」の能力は以下の具体制御へ対応。
- 対応能力 [BRU-007](features/BRU.md#bru-007)：画像先端と手続き的な形、紙・粒子の拡縮回転・強さを併用。先端画像/生成形・紙目の倍率/角度/深さ/固定先。依存画像を筆と保存。元画像更新は既存筆へ勝手に反映しない
- 検証範囲：旧名/注記と新仕様の具体能力を対照。実装検証ではない。

## LC-026 — Brush Preset

- 旧出典：[docs/FEATURE_CATALOG.md:49](https://github.com/totoro0419/illustro_old/blob/bdc7135b51033982d90ea5dad104bb04fc107df2/docs/FEATURE_CATALOG.md#L49)
- 旧内容：Brush Preset。（当時状態：Required）
- 判定：**改善して引き継いだ**。「Brush Preset」の能力は以下の具体制御へ対応。
- 対応能力 [BRU-004](features/BRU.md#bru-004)：用途名・タグ・最近使用・複製・初期値復帰を提供。描かれた筆からのプリセット取得は情報がある場合だけ提示し、画素だけから同一筆を断定しない。用途タグ・お気に入り・最近・名前検索・リセット。設定中の筆は変更印、複製保存/元へ戻す。履歴を作品Undoと分離
- 検証範囲：旧名/注記と新仕様の具体能力を対照。実装検証ではない。

## LC-027 — Brush検索・整理

- 旧出典：[docs/FEATURE_CATALOG.md:50](https://github.com/totoro0419/illustro_old/blob/bdc7135b51033982d90ea5dad104bb04fc107df2/docs/FEATURE_CATALOG.md#L50)
- 旧内容：Brush検索・整理。（当時状態：Required）
- 判定：**改善して引き継いだ**。「Brush検索・整理」の能力は以下の具体制御へ対応。
- 対応能力 [BRU-004](features/BRU.md#bru-004)：用途名・タグ・最近使用・複製・初期値復帰を提供。描かれた筆からのプリセット取得は情報がある場合だけ提示し、画素だけから同一筆を断定しない。用途タグ・お気に入り・最近・名前検索・リセット。設定中の筆は変更印、複製保存/元へ戻す。履歴を作品Undoと分離
- 検証範囲：旧名/注記と新仕様の具体能力を対照。実装検証ではない。

## LC-028 — ユーザー作成Brush

- 旧出典：[docs/FEATURE_CATALOG.md:51](https://github.com/totoro0419/illustro_old/blob/bdc7135b51033982d90ea5dad104bb04fc107df2/docs/FEATURE_CATALOG.md#L51)
- 旧内容：ユーザー作成Brush。（当時状態：Required）
- 判定：**改善して引き継いだ**。「ユーザー作成Brush」の能力は以下の具体制御へ対応。
- 対応能力 [BRU-005](features/BRU.md#bru-005)：形・硬さ・間隔・散布・回転・粒子を変更し作品外で試す。形/硬さ/間隔/散布/回転/粒子/形状変形、元筆との差。ブラシの硬さと形状変形は独立制御。取消は作品を変えず筆編集を戻す。元プリセットを無断上書きしない
- 検証範囲：旧名/注記と新仕様の具体能力を対照。実装検証ではない。

## LC-029 — Dynamic Wet Media

- 旧出典：[docs/FEATURE_CATALOG.md:52](https://github.com/totoro0419/illustro_old/blob/bdc7135b51033982d90ea5dad104bb04fc107df2/docs/FEATURE_CATALOG.md#L52)
- 旧内容：Dynamic Wet Media。イラスト向け湿式表現（当時状態：Core / Investigate）
- 判定：**改善して引き継いだ**。「Dynamic Wet Media」の能力は以下の具体制御へ対応。
- 対応能力 [WET-002](features/WET.md#wet-002)：濡れた部分との相互作用、にじみ、エッジ、粒状感を再編集・復元できる。水量/顔料量/拡散/エッジ/粒状感、既定は再現性のある筆プリセット。見た目と再開に必要な状態をNative保持。停止時点をUndoで再現
- 検証範囲：旧名/注記と新仕様の具体能力を対照。実装検証ではない。

## LC-030 — Wetness / Pigment等の内部状態

- 旧出典：[docs/FEATURE_CATALOG.md:53](https://github.com/totoro0419/illustro_old/blob/bdc7135b51033982d90ea5dad104bb04fc107df2/docs/FEATURE_CATALOG.md#L53)
- 旧内容：Wetness / Pigment等の内部状態。Wet Media基盤（当時状態：Investigate）
- 判定：**改善して引き継いだ**。「Wetness / Pigment等の内部状態」の能力は以下の具体制御へ対応。
- 対応能力 [WET-002](features/WET.md#wet-002)：濡れた部分との相互作用、にじみ、エッジ、粒状感を再編集・復元できる。水量/顔料量/拡散/エッジ/粒状感、既定は再現性のある筆プリセット。見た目と再開に必要な状態をNative保持。停止時点をUndoで再現
- 検証範囲：旧名/注記と新仕様の具体能力を対照。実装検証ではない。

## LC-031 — 紙質・粒子・質感

- 旧出典：[docs/FEATURE_CATALOG.md:54](https://github.com/totoro0419/illustro_old/blob/bdc7135b51033982d90ea5dad104bb04fc107df2/docs/FEATURE_CATALOG.md#L54)
- 旧内容：紙質・粒子・質感。Brush/Wet Media連携（当時状態：Required / Investigate）
- 判定：**改善して引き継いだ**。「紙質・粒子・質感」の能力は以下の具体制御へ対応。
- 対応能力 [WET-005](features/WET.md#wet-005)：新しい線への紙変更と既存絵への再適用を分けて比較。紙の尺度/吸収/粒状感・新筆のみ/既存へ再適用。紙版と適用範囲を保持。再適用は一Undo、元絵保持
- 検証範囲：旧名/注記と新仕様の具体能力を対照。実装検証ではない。

## LC-032 — 線画レイヤー

- 旧出典：[docs/FEATURE_CATALOG.md:62](https://github.com/totoro0419/illustro_old/blob/bdc7135b51033982d90ea5dad104bb04fc107df2/docs/FEATURE_CATALOG.md#L62)
- 旧内容：線画レイヤー。ラスター線画から生成する専用レイヤー。現時点では完成目標の概念のみ確定（当時状態：Core / Design reset）
- 判定：**改善して引き継いだ**。「線画レイヤー」の能力は以下の具体制御へ対応。
- 対応能力 [LIN-001](features/LIN.md#lin-001)：元線を破壊せず複製感覚で境界・接続・領域を生成する。生成元Raster/選択層群・処理範囲・候補設定。生成一Undo、専用の領域分けデータと生成元版をNative保存
- 検証範囲：旧名/注記と新仕様の具体能力を対照。実装検証ではない。

## LC-033 — Raster線画からの生成

- 旧出典：[docs/FEATURE_CATALOG.md:63](https://github.com/totoro0419/illustro_old/blob/bdc7135b51033982d90ea5dad104bb04fc107df2/docs/FEATURE_CATALOG.md#L63)
- 旧内容：Raster線画からの生成。通常のストローク中心Raster Layerを「複製する」感覚で作成（当時状態：Core）
- 判定：**改善して引き継いだ**。「Raster線画からの生成」の能力は以下の具体制御へ対応。
- 対応能力 [LIN-001](features/LIN.md#lin-001)：元線を破壊せず複製感覚で境界・接続・領域を生成する。生成元Raster/選択層群・処理範囲・候補設定。生成一Undo、専用の領域分けデータと生成元版をNative保存
- 検証範囲：旧名/注記と新仕様の具体能力を対照。実装検証ではない。

## LC-034 — 太さを持たない境界

- 旧出典：[docs/FEATURE_CATALOG.md:64](https://github.com/totoro0419/illustro_old/blob/bdc7135b51033982d90ea5dad104bb04fc107df2/docs/FEATURE_CATALOG.md#L64)
- 旧内容：太さを持たない境界。描画線の太さではなく、領域を分ける境界として保持（当時状態：Core）
- 判定：**改善して引き継いだ**。「太さを持たない境界」の能力は以下の具体制御へ対応。
- 対応能力 [LIN-002](features/LIN.md#lin-002)：線幅を持つ原画と領域境界を別表示し、外側・穴・隣接を確認。境界/接続/閉領域/穴/外側/隣接の表示切替。表示のみはUndo外、区分データと対応版は保存
- 検証範囲：旧名/注記と新仕様の具体能力を対照。実装検証ではない。

## LC-035 — 領域分けデータ

- 旧出典：[docs/FEATURE_CATALOG.md:65](https://github.com/totoro0419/illustro_old/blob/bdc7135b51033982d90ea5dad104bb04fc107df2/docs/FEATURE_CATALOG.md#L65)
- 旧内容：領域分けデータ。線そのものではなく、どの場所がどの領域かを表す構造が主データ（当時状態：Core）
- 判定：**改善して引き継いだ**。「領域分けデータ」の能力は以下の具体制御へ対応。
- 対応能力 [LIN-002](features/LIN.md#lin-002)：線幅を持つ原画と領域境界を別表示し、外側・穴・隣接を確認。境界/接続/閉領域/穴/外側/隣接の表示切替。表示のみはUndo外、区分データと対応版は保存
- 検証範囲：旧名/注記と新仕様の具体能力を対照。実装検証ではない。

## LC-036 — 接続・領域分けの手動修正

- 旧出典：[docs/FEATURE_CATALOG.md:66](https://github.com/totoro0419/illustro_old/blob/bdc7135b51033982d90ea5dad104bb04fc107df2/docs/FEATURE_CATALOG.md#L66)
- 旧内容：接続・領域分けの手動修正。線画レイヤー選択中に自動判定の誤りを直接修正できる（当時状態：Core）
- 判定：**改善して引き継いだ**。「接続・領域分けの手動修正」の能力は以下の具体制御へ対応。
- 対応能力 [LIN-003](features/LIN.md#lin-003)：短い境界追加・切断・接続拒否・領域統合、手動判断を無断上書きしない。境界追加/切断・接続許可/拒否・領域統合。一手修正一Undo、手修正を再生成より優先しNative保存
- 検証範囲：旧名/注記と新仕様の具体能力を対照。実装検証ではない。

## LC-037 — 線画からの自動抽出

- 旧出典：[docs/FEATURE_CATALOG.md:67](https://github.com/totoro0419/illustro_old/blob/bdc7135b51033982d90ea5dad104bb04fc107df2/docs/FEATURE_CATALOG.md#L67)
- 旧内容：線画からの自動抽出。接続判定を含む抽出アルゴリズムは旧成果を破棄し、ゼロから再設計（当時状態：Investigate）
- 判定：**改善して引き継いだ**。「線画からの自動抽出」の能力は以下の具体制御へ対応。
- 対応能力 [LIN-006](features/LIN.md#lin-006)：端点同士だけでなく線途中/交差/近接の候補を提示し、穴と外側を誤統合しない。端点対端点/線途中/交差/近接・候補強さ。採否を修正として保存し次更新でも無断上書きしない
- 検証範囲：旧名/注記と新仕様の具体能力を対照。実装検証ではない。

## LC-038 — 線画レイヤー基準のFill

- 旧出典：[docs/FEATURE_CATALOG.md:68](https://github.com/totoro0419/illustro_old/blob/bdc7135b51033982d90ea5dad104bb04fc107df2/docs/FEATURE_CATALOG.md#L68)
- 旧内容：線画レイヤー基準のFill。色差ではなく線画レイヤー上の領域分けをFill基準として利用（当時状態：Required）
- 判定：**改善して引き継いだ**。「線画レイヤー基準のFill」の能力は以下の具体制御へ対応。
- 対応能力 [LIN-004](features/LIN.md#lin-004)：同じ確認済み区分をFill/Selectionへ利用、見えている版を明示。確認済み区分版・塗り/選択の利用先。塗り先と選択マスクは別成果物、区分変更で既存結果は不変
- 検証範囲：旧名/注記と新仕様の具体能力を対照。実装検証ではない。

## LC-039 — 線画レイヤー基準のSelection

- 旧出典：[docs/FEATURE_CATALOG.md:69](https://github.com/totoro0419/illustro_old/blob/bdc7135b51033982d90ea5dad104bb04fc107df2/docs/FEATURE_CATALOG.md#L69)
- 旧内容：線画レイヤー基準のSelection。領域分けを選択範囲生成へ利用可能にする（当時状態：Required）
- 判定：**改善して引き継いだ**。「線画レイヤー基準のSelection」の能力は以下の具体制御へ対応。
- 対応能力 [LIN-004](features/LIN.md#lin-004)：同じ確認済み区分をFill/Selectionへ利用、見えている版を明示。確認済み区分版・塗り/選択の利用先。塗り先と選択マスクは別成果物、区分変更で既存結果は不変
- 検証範囲：旧名/注記と新仕様の具体能力を対照。実装検証ではない。

## LC-040 — 元Raster編集後の追従

- 旧出典：[docs/FEATURE_CATALOG.md:70](https://github.com/totoro0419/illustro_old/blob/bdc7135b51033982d90ea5dad104bb04fc107df2/docs/FEATURE_CATALOG.md#L70)
- 旧内容：元Raster編集後の追従。自動追従・再生成・独立保持の扱いは未決定（当時状態：Investigate）
- 判定：**再検討のため保留した**。「元Raster編集後の追従」の能力は以下の具体制御へ対応。 候補を削除せず範囲/精度/用途を比較待ち。
- 対応能力 [LIN-005](features/LIN.md#lin-005)：変更通知、更新候補の新旧比較、手修正の保持、曖昧なら人が選ぶ。旧区分/新候補・差分だけ/全体・手修正の保護。更新一Undo、元の塗りは保持。失われる手修正は個別解決
- 検証範囲：旧名/注記と新仕様の具体能力を対照。実装検証ではない。

## LC-041 — Flood Fill

- 旧出典：[docs/FEATURE_CATALOG.md:76](https://github.com/totoro0419/illustro_old/blob/bdc7135b51033982d90ea5dad104bb04fc107df2/docs/FEATURE_CATALOG.md#L76)
- 旧内容：Flood Fill。（当時状態：Core）
- 判定：**改善して引き継いだ**。「Flood Fill」の能力は以下の具体制御へ対応。
- 対応能力 [FIL-001](features/FIL.md#fil-001)：色差/透明度/連続性で領域を選び一回で戻せる。色差/透明度許容・連続/全体・不透明度。初回は指定参照層、なければ現在層。一塗り一Undo、選択濃度/マスク/アルファロックを尊重、出力層固定
- 検証範囲：旧名/注記と新仕様の具体能力を対照。実装検証ではない。

## LC-042 — Gap Closing

- 旧出典：[docs/FEATURE_CATALOG.md:77](https://github.com/totoro0419/illustro_old/blob/bdc7135b51033982d90ea5dad104bb04fc107df2/docs/FEATURE_CATALOG.md#L77)
- 旧内容：Gap Closing。（当時状態：Required）
- 判定：**改善して引き継いだ**。「Gap Closing」の能力は以下の具体制御へ対応。
- 対応能力 [FIL-002](features/FIL.md#fil-002)：補完強さ、拡張縮小、細部の未塗りを分けて調整、元線は描き変えない。隙間幅・許容・拡張/縮小px・角の扱い・塗り残し検査。元線と独立した塗り結果、直後修正はFIL-009
- 検証範囲：旧名/注記と新仕様の具体能力を対照。実装検証ではない。

## LC-043 — Gap Tolerance

- 旧出典：[docs/FEATURE_CATALOG.md:78](https://github.com/totoro0419/illustro_old/blob/bdc7135b51033982d90ea5dad104bb04fc107df2/docs/FEATURE_CATALOG.md#L78)
- 旧内容：Gap Tolerance。（当時状態：Required）
- 判定：**改善して引き継いだ**。「Gap Tolerance」の能力は以下の具体制御へ対応。
- 対応能力 [FIL-002](features/FIL.md#fil-002)：補完強さ、拡張縮小、細部の未塗りを分けて調整、元線は描き変えない。隙間幅・許容・拡張/縮小px・角の扱い・塗り残し検査。元線と独立した塗り結果、直後修正はFIL-009
- 検証範囲：旧名/注記と新仕様の具体能力を対照。実装検証ではない。

## LC-044 — Boundary Expand / Contract

- 旧出典：[docs/FEATURE_CATALOG.md:79](https://github.com/totoro0419/illustro_old/blob/bdc7135b51033982d90ea5dad104bb04fc107df2/docs/FEATURE_CATALOG.md#L79)
- 旧内容：Boundary Expand / Contract。（当時状態：Required）
- 判定：**改善して引き継いだ**。「Boundary Expand / Contract」の能力は以下の具体制御へ対応。
- 対応能力 [FIL-002](features/FIL.md#fil-002)：補完強さ、拡張縮小、細部の未塗りを分けて調整、元線は描き変えない。隙間幅・許容・拡張/縮小px・角の扱い・塗り残し検査。元線と独立した塗り結果、直後修正はFIL-009
- 検証範囲：旧名/注記と新仕様の具体能力を対照。実装検証ではない。

## LC-045 — Multi-layer Reference Fill

- 旧出典：[docs/FEATURE_CATALOG.md:80](https://github.com/totoro0419/illustro_old/blob/bdc7135b51033982d90ea5dad104bb04fc107df2/docs/FEATURE_CATALOG.md#L80)
- 旧内容：Multi-layer Reference Fill。（当時状態：Required）
- 判定：**改善して引き継いだ**。「Multi-layer Reference Fill」の能力は以下の具体制御へ対応。
- 対応能力 [FIL-003](features/FIL.md#fil-003)：現在/指定/複数/表示合成/線画領域と出力先を同時に確認。現在/複数選択/指定参照/表示合成/線画区分、除外層。筆開始時の参照版を固定、複数参照は再読込でも維持
- 検証範囲：旧名/注記と新仕様の具体能力を対照。実装検証ではない。

## LC-046 — Lineart Layer Reference Fill

- 旧出典：[docs/FEATURE_CATALOG.md:81](https://github.com/totoro0419/illustro_old/blob/bdc7135b51033982d90ea5dad104bb04fc107df2/docs/FEATURE_CATALOG.md#L81)
- 旧内容：Lineart Layer Reference Fill。線画レイヤーの領域分けを参照（当時状態：Required）
- 判定：**改善して引き継いだ**。「Lineart Layer Reference Fill」の能力は以下の具体制御へ対応。
- 対応能力 [FIL-007](features/FIL.md#fil-007)：線画レイヤーの境界に従い、手動修正優先、色差塗りへ無言変更しない。参照線画版・対象領域・色/透明・境界被覆。塗りは独立出力、元線変更で自動再配色しない。追従型はDEC-01
- 検証範囲：旧名/注記と新仕様の具体能力を対照。実装検証ではない。

## LC-047 — Color Difference Tolerance

- 旧出典：[docs/FEATURE_CATALOG.md:82](https://github.com/totoro0419/illustro_old/blob/bdc7135b51033982d90ea5dad104bb04fc107df2/docs/FEATURE_CATALOG.md#L82)
- 旧内容：Color Difference Tolerance。（当時状態：Required）
- 判定：**改善して引き継いだ**。「Color Difference Tolerance」の能力は以下の具体制御へ対応。
- 対応能力 [FIL-001](features/FIL.md#fil-001)：色差/透明度/連続性で領域を選び一回で戻せる。色差/透明度許容・連続/全体・不透明度。初回は指定参照層、なければ現在層。一塗り一Undo、選択濃度/マスク/アルファロックを尊重、出力層固定
- 検証範囲：旧名/注記と新仕様の具体能力を対照。実装検証ではない。

## LC-048 — Enclose and Fill

- 旧出典：[docs/FEATURE_CATALOG.md:83](https://github.com/totoro0419/illustro_old/blob/bdc7135b51033982d90ea5dad104bb04fc107df2/docs/FEATURE_CATALOG.md#L83)
- 旧内容：Enclose and Fill。囲って塗る（当時状態：Required）
- 判定：**改善して引き継いだ**。「Enclose and Fill」の能力は以下の具体制御へ対応。
- 対応能力 [FIL-005](features/FIL.md#fil-005)：囲い内の閉領域と囲いそのものを塗る機能を明確に区別。閉領域のみ/囲い全体・透明/色の対象条件・塗り/消し。一囲い一Undo、囲い自体を新選択に変える場合は明示
- 検証範囲：旧名/注記と新仕様の具体能力を対照。実装検証ではない。

## LC-049 — Trace and Fill

- 旧出典：[docs/FEATURE_CATALOG.md:84](https://github.com/totoro0419/illustro_old/blob/bdc7135b51033982d90ea5dad104bb04fc107df2/docs/FEATURE_CATALOG.md#L84)
- 旧内容：Trace and Fill。なぞって塗る（当時状態：Required）
- 判定：**改善して引き継いだ**。「Trace and Fill」の能力は以下の具体制御へ対応。
- 対応能力 [FIL-006](features/FIL.md#fil-006)：軌跡が触れた領域を候補表示し曖昧な範囲を確定前に修正。軌跡幅・接触領域・追加/除外。一候補集合一Undo。選択作成へ転用しても同じ区分版
- 検証範囲：旧名/注記と新仕様の具体能力を対照。実装検証ではない。

## LC-050 — Drag Fill

- 旧出典：[docs/FEATURE_CATALOG.md:85](https://github.com/totoro0419/illustro_old/blob/bdc7135b51033982d90ea5dad104bb04fc107df2/docs/FEATURE_CATALOG.md#L85)
- 旧内容：Drag Fill。（当時状態：Required）
- 判定：**改善して引き継いだ**。「Drag Fill」の能力は以下の具体制御へ対応。
- 対応能力 [FIL-004](features/FIL.md#fil-004)：一筆で横切った領域だけを対象とし重複塗りを防止。ドラッグ軌跡・同領域重複除外・追加/除外。一ドラッグ一Undo。透明色での連続消去も同じ対象規則
- 検証範囲：旧名/注記と新仕様の具体能力を対照。実装検証ではない。

## LC-051 — Continuous Area Fill

- 旧出典：[docs/FEATURE_CATALOG.md:86](https://github.com/totoro0419/illustro_old/blob/bdc7135b51033982d90ea5dad104bb04fc107df2/docs/FEATURE_CATALOG.md#L86)
- 旧内容：Continuous Area Fill。線画レイヤー領域にも対応（当時状態：Required）
- 判定：**改善して引き継いだ**。「Continuous Area Fill」の能力は以下の具体制御へ対応。
- 対応能力 [FIL-004](features/FIL.md#fil-004)：一筆で横切った領域だけを対象とし重複塗りを防止。ドラッグ軌跡・同領域重複除外・追加/除外。一ドラッグ一Undo。透明色での連続消去も同じ対象規則
- 検証範囲：旧名/注記と新仕様の具体能力を対照。実装検証ではない。

## LC-052 — Smart Fill 統合UI

- 旧出典：[docs/FEATURE_CATALOG.md:87](https://github.com/totoro0419/illustro_old/blob/bdc7135b51033982d90ea5dad104bb04fc107df2/docs/FEATURE_CATALOG.md#L87)
- 旧内容：Smart Fill 統合UI。モード分散を避ける（当時状態：Core）
- 判定：**改善して引き継いだ**。「Smart Fill 統合UI」の能力は以下の具体制御へ対応。
- 対応能力 [FIL-009](features/FIL.md#fil-009)：他編集開始前の直近塗りを許容・補完調整で置換し一Undo単位にする。許容・補完・拡張・前後比較、直近塗りの対象名。他編集開始前だけ同じUndoへ統合。開始後は新規編集として記録
- 検証範囲：旧名/注記と新仕様の具体能力を対照。実装検証ではない。

## LC-053 — Smart Color Assist

- 旧出典：[docs/FEATURE_CATALOG.md:88](https://github.com/totoro0419/illustro_old/blob/bdc7135b51033982d90ea5dad104bb04fc107df2/docs/FEATURE_CATALOG.md#L88)
- 旧内容：Smart Color Assist。ユーザー補助。生成AI主体にしない（当時状態：Core）
- 判定：**改善して引き継いだ**。「Smart Color Assist」の能力は以下の具体制御へ対応。
- 対応能力 [AI-002](features/AI.md#ai-002)：既存絵・資料・パレットに基づく案を別候補として比較。既存絵/資料/パレット・候補数/対象・強度。別層/分岐へ採用、一Undo
- 検証範囲：旧名/注記と新仕様の具体能力を対照。実装検証ではない。

## LC-054 — Base Color候補

- 旧出典：[docs/FEATURE_CATALOG.md:89](https://github.com/totoro0419/illustro_old/blob/bdc7135b51033982d90ea5dad104bb04fc107df2/docs/FEATURE_CATALOG.md#L89)
- 旧内容：Base Color候補。決定的アルゴリズム優先（当時状態：Required / Investigate）
- 判定：**改善して引き継いだ**。「Base Color候補」の能力は以下の具体制御へ対応。
- 対応能力 [AI-002](features/AI.md#ai-002)：既存絵・資料・パレットに基づく案を別候補として比較。既存絵/資料/パレット・候補数/対象・強度。別層/分岐へ採用、一Undo
- 検証範囲：旧名/注記と新仕様の具体能力を対照。実装検証ではない。

## LC-055 — Palette候補

- 旧出典：[docs/FEATURE_CATALOG.md:90](https://github.com/totoro0419/illustro_old/blob/bdc7135b51033982d90ea5dad104bb04fc107df2/docs/FEATURE_CATALOG.md#L90)
- 旧内容：Palette候補。（当時状態：Required / Investigate）
- 判定：**改善して引き継いだ**。「Palette候補」の能力は以下の具体制御へ対応。
- 対応能力 [COL-005](features/COL.md#col-005)：色候補・値差・グレー表示を破壊せず比較、候補は自動適用しない。調和方式/基準色/候補数・グレー/色覚プレビュー。補助表示はUndo外、採用配色はパレットや調整として保存
- 検証範囲：旧名/注記と新仕様の具体能力を対照。実装検証ではない。

## LC-056 — 隣接色調和支援

- 旧出典：[docs/FEATURE_CATALOG.md:91](https://github.com/totoro0419/illustro_old/blob/bdc7135b51033982d90ea5dad104bb04fc107df2/docs/FEATURE_CATALOG.md#L91)
- 旧内容：隣接色調和支援。（当時状態：Required / Investigate）
- 判定：**改善して引き継いだ**。「隣接色調和支援」の能力は以下の具体制御へ対応。
- 対応能力 [COL-005](features/COL.md#col-005)：色候補・値差・グレー表示を破壊せず比較、候補は自動適用しない。調和方式/基準色/候補数・グレー/色覚プレビュー。補助表示はUndo外、採用配色はパレットや調整として保存
- 検証範囲：旧名/注記と新仕様の具体能力を対照。実装検証ではない。

## LC-057 — Lineart Layer Area Recolor

- 旧出典：[docs/FEATURE_CATALOG.md:92](https://github.com/totoro0419/illustro_old/blob/bdc7135b51033982d90ea5dad104bb04fc107df2/docs/FEATURE_CATALOG.md#L92)
- 旧内容：Lineart Layer Area Recolor。線画レイヤー領域単位（当時状態：Required）
- 判定：**改善して引き継いだ**。「Lineart Layer Area Recolor」の能力は以下の具体制御へ対応。
- 対応能力 [FIL-007](features/FIL.md#fil-007)：線画レイヤーの境界に従い、手動修正優先、色差塗りへ無言変更しない。参照線画版・対象領域・色/透明・境界被覆。塗りは独立出力、元線変更で自動再配色しない。追従型はDEC-01
- 検証範囲：旧名/注記と新仕様の具体能力を対照。実装検証ではない。

## LC-058 — Shadow / Highlight候補

- 旧出典：[docs/FEATURE_CATALOG.md:93](https://github.com/totoro0419/illustro_old/blob/bdc7135b51033982d90ea5dad104bb04fc107df2/docs/FEATURE_CATALOG.md#L93)
- 旧内容：Shadow / Highlight候補。（当時状態：Investigate）
- 判定：**改善して引き継いだ**。「Shadow / Highlight候補」の能力は以下の具体制御へ対応。
- 対応能力 [AI-002](features/AI.md#ai-002)：既存絵・資料・パレットに基づく案を別候補として比較。既存絵/資料/パレット・候補数/対象・強度。別層/分岐へ採用、一Undo
- 検証範囲：旧名/注記と新仕様の具体能力を対照。実装検証ではない。

## LC-059 — Color Temperature調整

- 旧出典：[docs/FEATURE_CATALOG.md:94](https://github.com/totoro0419/illustro_old/blob/bdc7135b51033982d90ea5dad104bb04fc107df2/docs/FEATURE_CATALOG.md#L94)
- 旧内容：Color Temperature調整。（当時状態：Required）
- 判定：**改善して引き継いだ**。「Color Temperature調整」の能力は以下の具体制御へ対応。
- 対応能力 [COL-009](features/COL.md#col-009)：全体/選択範囲を非破壊補正し、前後比較。色温度/Tint・全体/現在層/選択・強度。調整レイヤーとして再編集。選択は作成時マスクへ固定
- 検証範囲：旧名/注記と新仕様の具体能力を対照。実装検証ではない。

## LC-060 — 全体色調整

- 旧出典：[docs/FEATURE_CATALOG.md:95](https://github.com/totoro0419/illustro_old/blob/bdc7135b51033982d90ea5dad104bb04fc107df2/docs/FEATURE_CATALOG.md#L95)
- 旧内容：全体色調整。（当時状態：Required）
- 判定：**改善して引き継いだ**。「全体色調整」の能力は以下の具体制御へ対応。
- 対応能力 [COL-009](features/COL.md#col-009)：全体/選択範囲を非破壊補正し、前後比較。色温度/Tint・全体/現在層/選択・強度。調整レイヤーとして再編集。選択は作成時マスクへ固定
- 検証範囲：旧名/注記と新仕様の具体能力を対照。実装検証ではない。

## LC-061 — Color Picker

- 旧出典：[docs/FEATURE_CATALOG.md:101](https://github.com/totoro0419/illustro_old/blob/bdc7135b51033982d90ea5dad104bb04fc107df2/docs/FEATURE_CATALOG.md#L101)
- 旧内容：Color Picker。（当時状態：Core）
- 判定：**改善して引き継いだ**。「Color Picker」の能力は以下の具体制御へ対応。
- 対応能力 [COL-001](features/COL.md#col-001)：色相環と彩度明度面、正確な数値・色コードを往復。色相環/HSV/HSL/RGB/Hex・不透明度、作品色空間。色変更は作品Undo外、パレット登録で作品色として保存
- 検証範囲：旧名/注記と新仕様の具体能力を対照。実装検証ではない。

## LC-062 — Canvas Eyedropper

- 旧出典：[docs/FEATURE_CATALOG.md:102](https://github.com/totoro0419/illustro_old/blob/bdc7135b51033982d90ea5dad104bb04fc107df2/docs/FEATURE_CATALOG.md#L102)
- 旧内容：Canvas Eyedropper。（当時状態：Core）
- 判定：**改善して引き継いだ**。「Canvas Eyedropper」の能力は以下の具体制御へ対応。
- 対応能力 [COL-003](features/COL.md#col-003)：作品合成/レイヤー/資料を明示し、輪郭UI・Proof表示を無断採色しない。合成/現在層/指定層/資料・点/平均サンプル径・透明の扱い。一時スポイト解除で元筆。作品は変更せず出典を表示
- 検証範囲：旧名/注記と新仕様の具体能力を対照。実装検証ではない。

## LC-063 — Reference Eyedropper

- 旧出典：[docs/FEATURE_CATALOG.md:103](https://github.com/totoro0419/illustro_old/blob/bdc7135b51033982d90ea5dad104bb04fc107df2/docs/FEATURE_CATALOG.md#L103)
- 旧内容：Reference Eyedropper。Illustro独自の高速資料採色（当時状態：Core）
- 判定：**改善して引き継いだ**。「Reference Eyedropper」の能力は以下の具体制御へ対応。
- 対応能力 [REF-004](features/REF.md#ref-004)：資料の元色を作品空間へ解釈、表示グレーを取る場合は明示。元色/表示色・点/平均・資料ICC。作品色空間へ解釈し色履歴に記録、資料原画像不変
- 検証範囲：旧名/注記と新仕様の具体能力を対照。実装検証ではない。

## LC-064 — Color History

- 旧出典：[docs/FEATURE_CATALOG.md:104](https://github.com/totoro0419/illustro_old/blob/bdc7135b51033982d90ea5dad104bb04fc107df2/docs/FEATURE_CATALOG.md#L104)
- 旧内容：Color History。（当時状態：Required）
- 判定：**改善して引き継いだ**。「Color History」の能力は以下の具体制御へ対応。
- 対応能力 [COL-002](features/COL.md#col-002)：重複を整理、現在/前色を区別、作品固有色は明示パレット保存。現在/前色・背景色・履歴件数・重複整理。履歴は色履歴、背景レイヤー編集のUndoとは別
- 検証範囲：旧名/注記と新仕様の具体能力を対照。実装検証ではない。

## LC-065 — Palette

- 旧出典：[docs/FEATURE_CATALOG.md:105](https://github.com/totoro0419/illustro_old/blob/bdc7135b51033982d90ea5dad104bb04fc107df2/docs/FEATURE_CATALOG.md#L105)
- 旧内容：Palette。（当時状態：Required）
- 判定：**改善して引き継いだ**。「Palette」の能力は以下の具体制御へ対応。
- 対応能力 [COL-004](features/COL.md#col-004)：名前・タグ・並替・取込・書出、描画中の誤削除を防ぐ。名前/タグ/フォルダー・色順・取込形式。パレット版を保存、作品内/個人共通を区別
- 検証範囲：旧名/注記と新仕様の具体能力を対照。実装検証ではない。

## LC-066 — Palette Import / Export

- 旧出典：[docs/FEATURE_CATALOG.md:106](https://github.com/totoro0419/illustro_old/blob/bdc7135b51033982d90ea5dad104bb04fc107df2/docs/FEATURE_CATALOG.md#L106)
- 旧内容：Palette Import / Export。形式未確定（当時状態：Required）
- 判定：**改善して引き継いだ**。「Palette Import / Export」の能力は以下の具体制御へ対応。
- 対応能力 [COL-004](features/COL.md#col-004)：名前・タグ・並替・取込・書出、描画中の誤削除を防ぐ。名前/タグ/フォルダー・色順・取込形式。パレット版を保存、作品内/個人共通を区別
- 検証範囲：旧名/注記と新仕様の具体能力を対照。実装検証ではない。

## LC-067 — HSV/HSL/RGB等のカラーコントロール

- 旧出典：[docs/FEATURE_CATALOG.md:107](https://github.com/totoro0419/illustro_old/blob/bdc7135b51033982d90ea5dad104bb04fc107df2/docs/FEATURE_CATALOG.md#L107)
- 旧内容：HSV/HSL/RGB等のカラーコントロール。最終対応モデル未確定（当時状態：Required）
- 判定：**改善して引き継いだ**。「HSV/HSL/RGB等のカラーコントロール」の能力は以下の具体制御へ対応。
- 対応能力 [COL-001](features/COL.md#col-001)：色相環と彩度明度面、正確な数値・色コードを往復。色相環/HSV/HSL/RGB/Hex・不透明度、作品色空間。色変更は作品Undo外、パレット登録で作品色として保存
- 検証範囲：旧名/注記と新仕様の具体能力を対照。実装検証ではない。

## LC-068 — Color Harmony支援

- 旧出典：[docs/FEATURE_CATALOG.md:108](https://github.com/totoro0419/illustro_old/blob/bdc7135b51033982d90ea5dad104bb04fc107df2/docs/FEATURE_CATALOG.md#L108)
- 旧内容：Color Harmony支援。（当時状態：Required / Investigate）
- 判定：**改善して引き継いだ**。「Color Harmony支援」の能力は以下の具体制御へ対応。
- 対応能力 [COL-005](features/COL.md#col-005)：色候補・値差・グレー表示を破壊せず比較、候補は自動適用しない。調和方式/基準色/候補数・グレー/色覚プレビュー。補助表示はUndo外、採用配色はパレットや調整として保存
- 検証範囲：旧名/注記と新仕様の具体能力を対照。実装検証ではない。

## LC-069 — Grayscale Preview

- 旧出典：[docs/FEATURE_CATALOG.md:109](https://github.com/totoro0419/illustro_old/blob/bdc7135b51033982d90ea5dad104bb04fc107df2/docs/FEATURE_CATALOG.md#L109)
- 旧内容：Grayscale Preview。Referenceにも利用（当時状態：Required）
- 判定：**改善して引き継いだ**。「Grayscale Preview」の能力は以下の具体制御へ対応。
- 対応能力 [COL-005](features/COL.md#col-005)：色候補・値差・グレー表示を破壊せず比較、候補は自動適用しない。調和方式/基準色/候補数・グレー/色覚プレビュー。補助表示はUndo外、採用配色はパレットや調整として保存
- 検証範囲：旧名/注記と新仕様の具体能力を対照。実装検証ではない。

## LC-070 — Color Management / ICC

- 旧出典：[docs/FEATURE_CATALOG.md:110](https://github.com/totoro0419/illustro_old/blob/bdc7135b51033982d90ea5dad104bb04fc107df2/docs/FEATURE_CATALOG.md#L110)
- 旧内容：Color Management / ICC。ドキュメント・合成モデル確定前に仕様化必須（当時状態：Core / Investigate）
- 判定：**改善して引き継いだ**。「Color Management / ICC」の能力は以下の具体制御へ対応。
- 対応能力 [COL-006](features/COL.md#col-006)：入力プロファイル保持、割当と変換の違い、未埋込時の前提を表示。埋込ICC/仮定色空間・割当/変換・変換先。原ICCと変換履歴を保持、変換適用は一Undo
- 検証範囲：旧名/注記と新仕様の具体能力を対照。実装検証ではない。

## LC-071 — Wide Gamut

- 旧出典：[docs/FEATURE_CATALOG.md:111](https://github.com/totoro0419/illustro_old/blob/bdc7135b51033982d90ea5dad104bb04fc107df2/docs/FEATURE_CATALOG.md#L111)
- 旧内容：Wide Gamut。Display P3等を扱えるColor Pipelineを前提にする（当時状態：Core / Investigate）
- 判定：**改善して引き継いだ**。「Wide Gamut」の能力は以下の具体制御へ対応。
- 対応能力 [COL-007](features/COL.md#col-007)：sRGB/P3、8-bit integer・16-bit integer・16-bit float・32-bit float/HDRの候補を区別し対応範囲を宣言。線形光合成も外観比較し、未対応で色/階調を無言切捨てしない。sRGB/P3・8整数/16整数/16float・32float候補、線形光の扱い。精度変更一Undo、旧精度復帰には原状態が必要。HDRは比較検証待ち
- 検証範囲：旧名/注記と新仕様の具体能力を対照。実装検証ではない。

## LC-072 — 8-bit integer

- 旧出典：[docs/FEATURE_CATALOG.md:112](https://github.com/totoro0419/illustro_old/blob/bdc7135b51033982d90ea5dad104bb04fc107df2/docs/FEATURE_CATALOG.md#L112)
- 旧内容：8-bit integer。（当時状態：Required）
- 判定：**改善して引き継いだ**。「8-bit integer」の能力は以下の具体制御へ対応。
- 対応能力 [COL-007](features/COL.md#col-007)：sRGB/P3、8-bit integer・16-bit integer・16-bit float・32-bit float/HDRの候補を区別し対応範囲を宣言。線形光合成も外観比較し、未対応で色/階調を無言切捨てしない。sRGB/P3・8整数/16整数/16float・32float候補、線形光の扱い。精度変更一Undo、旧精度復帰には原状態が必要。HDRは比較検証待ち
- 検証範囲：旧名/注記と新仕様の具体能力を対照。実装検証ではない。

## LC-073 — 16-bit integer

- 旧出典：[docs/FEATURE_CATALOG.md:113](https://github.com/totoro0419/illustro_old/blob/bdc7135b51033982d90ea5dad104bb04fc107df2/docs/FEATURE_CATALOG.md#L113)
- 旧内容：16-bit integer。高精度編集用途（当時状態：Required）
- 判定：**改善して引き継いだ**。「16-bit integer」の能力は以下の具体制御へ対応。
- 対応能力 [COL-007](features/COL.md#col-007)：sRGB/P3、8-bit integer・16-bit integer・16-bit float・32-bit float/HDRの候補を区別し対応範囲を宣言。線形光合成も外観比較し、未対応で色/階調を無言切捨てしない。sRGB/P3・8整数/16整数/16float・32float候補、線形光の扱い。精度変更一Undo、旧精度復帰には原状態が必要。HDRは比較検証待ち
- 検証範囲：旧名/注記と新仕様の具体能力を対照。実装検証ではない。

## LC-074 — 16-bit float

- 旧出典：[docs/FEATURE_CATALOG.md:114](https://github.com/totoro0419/illustro_old/blob/bdc7135b51033982d90ea5dad104bb04fc107df2/docs/FEATURE_CATALOG.md#L114)
- 旧内容：16-bit float。HDR/高精度Filter基盤として検討（当時状態：Required / Investigate）
- 判定：**改善して引き継いだ**。「16-bit float」の能力は以下の具体制御へ対応。 16-bit floatを16-bit integerと区別して採用推奨。32-bit/HDRは別比較枠。
- 対応能力 [COL-007](features/COL.md#col-007)：sRGB/P3、8-bit integer・16-bit integer・16-bit float・32-bit float/HDRの候補を区別し対応範囲を宣言。線形光合成も外観比較し、未対応で色/階調を無言切捨てしない。sRGB/P3・8整数/16整数/16float・32float候補、線形光の扱い。精度変更一Undo、旧精度復帰には原状態が必要。HDRは比較検証待ち
- 検証範囲：旧名/注記と新仕様の具体能力を対照。実装検証ではない。

## LC-075 — 32-bit float

- 旧出典：[docs/FEATURE_CATALOG.md:115](https://github.com/totoro0419/illustro_old/blob/bdc7135b51033982d90ea5dad104bb04fc107df2/docs/FEATURE_CATALOG.md#L115)
- 旧内容：32-bit float。メモリ・性能コストを含め評価（当時状態：Investigate）
- 判定：**再検討のため保留した**。「32-bit float」の能力は以下の具体制御へ対応。 候補を削除せず範囲/精度/用途を比較待ち。
- 対応能力 [COL-007](features/COL.md#col-007)：sRGB/P3、8-bit integer・16-bit integer・16-bit float・32-bit float/HDRの候補を区別し対応範囲を宣言。線形光合成も外観比較し、未対応で色/階調を無言切捨てしない。sRGB/P3・8整数/16整数/16float・32float候補、線形光の扱い。精度変更一Undo、旧精度復帰には原状態が必要。HDRは比較検証待ち
- 検証範囲：旧名/注記と新仕様の具体能力を対照。実装検証ではない。

## LC-076 — Embedded ICC Profile

- 旧出典：[docs/FEATURE_CATALOG.md:116](https://github.com/totoro0419/illustro_old/blob/bdc7135b51033982d90ea5dad104bb04fc107df2/docs/FEATURE_CATALOG.md#L116)
- 旧内容：Embedded ICC Profile。Native documentで保持（当時状態：Required）
- 判定：**改善して引き継いだ**。「Embedded ICC Profile」の能力は以下の具体制御へ対応。
- 対応能力 [COL-006](features/COL.md#col-006)：入力プロファイル保持、割当と変換の違い、未埋込時の前提を表示。埋込ICC/仮定色空間・割当/変換・変換先。原ICCと変換履歴を保持、変換適用は一Undo
- 検証範囲：旧名/注記と新仕様の具体能力を対照。実装検証ではない。

## LC-077 — Profile Conversion / Display Transform

- 旧出典：[docs/FEATURE_CATALOG.md:117](https://github.com/totoro0419/illustro_old/blob/bdc7135b51033982d90ea5dad104bb04fc107df2/docs/FEATURE_CATALOG.md#L117)
- 旧内容：Profile Conversion / Display Transform。（当時状態：Required）
- 判定：**改善して引き継いだ**。「Profile Conversion / Display Transform」の能力は以下の具体制御へ対応。
- 対応能力 [COL-006](features/COL.md#col-006)：入力プロファイル保持、割当と変換の違い、未埋込時の前提を表示。埋込ICC/仮定色空間・割当/変換・変換先。原ICCと変換履歴を保持、変換適用は一Undo
- 検証範囲：旧名/注記と新仕様の具体能力を対照。実装検証ではない。

## LC-078 — Linear-light Processing Path

- 旧出典：[docs/FEATURE_CATALOG.md:118](https://github.com/totoro0419/illustro_old/blob/bdc7135b51033982d90ea5dad104bb04fc107df2/docs/FEATURE_CATALOG.md#L118)
- 旧内容：Linear-light Processing Path。Blend/Filterの一部で利用可能な構造（当時状態：Core / Investigate）
- 判定：**改善して引き継いだ**。「Linear-light Processing Path」の能力は以下の具体制御へ対応。
- 対応能力 [COL-007](features/COL.md#col-007)：sRGB/P3、8-bit integer・16-bit integer・16-bit float・32-bit float/HDRの候補を区別し対応範囲を宣言。線形光合成も外観比較し、未対応で色/階調を無言切捨てしない。sRGB/P3・8整数/16整数/16float・32float候補、線形光の扱い。精度変更一Undo、旧精度復帰には原状態が必要。HDRは比較検証待ち
- 検証範囲：旧名/注記と新仕様の具体能力を対照。実装検証ではない。

## LC-079 — HDR-capable Architecture

- 旧出典：[docs/FEATURE_CATALOG.md:119](https://github.com/totoro0419/illustro_old/blob/bdc7135b51033982d90ea5dad104bb04fc107df2/docs/FEATURE_CATALOG.md#L119)
- 旧内容：HDR-capable Architecture。初期UI実装とは分離しても将来を塞がない（当時状態：Core / Investigate）
- 判定：**再検討のため保留した**。「HDR-capable Architecture」の能力は以下の具体制御へ対応。 候補を削除せず範囲/精度/用途を比較待ち。
- 対応能力 [COL-007](features/COL.md#col-007)：sRGB/P3、8-bit integer・16-bit integer・16-bit float・32-bit float/HDRの候補を区別し対応範囲を宣言。線形光合成も外観比較し、未対応で色/階調を無言切捨てしない。sRGB/P3・8整数/16整数/16float・32float候補、線形光の扱い。精度変更一Undo、旧精度復帰には原状態が必要。HDRは比較検証待ち
- 検証範囲：旧名/注記と新仕様の具体能力を対照。実装検証ではない。

## LC-080 — CMYK Native Editing

- 旧出典：[docs/FEATURE_CATALOG.md:120](https://github.com/totoro0419/illustro_old/blob/bdc7135b51033982d90ea5dad104bb04fc107df2/docs/FEATURE_CATALOG.md#L120)
- 旧内容：CMYK Native Editing。一枚絵制作での必要性とコストを評価（当時状態：Investigate）
- 判定：**再検討のため保留した**。「CMYK Native Editing」の能力は以下の具体制御へ対応。 候補を削除せず範囲/精度/用途を比較待ち。
- 対応能力 [COL-010](features/COL.md#col-010)：ネイティブ編集の要否とProof/変換出力を別判断にする。Proof/CMYK変換出力/Native編集を分離。CMYK対象のプロファイルと元RGBを保持する変換コピーを推奨
- 検証範囲：旧名/注記と新仕様の具体能力を対照。実装検証ではない。

## LC-081 — Soft Proof

- 旧出典：[docs/FEATURE_CATALOG.md:121](https://github.com/totoro0419/illustro_old/blob/bdc7135b51033982d90ea5dad104bb04fc107df2/docs/FEATURE_CATALOG.md#L121)
- 旧内容：Soft Proof。出力ProfileをCanvas上Preview（当時状態：Required）
- 判定：**改善して引き継いだ**。「Soft Proof」の能力は以下の具体制御へ対応。
- 対応能力 [COL-008](features/COL.md#col-008)：出力先の見え方は表示のみ、元色と採色・書出しを混同しない。Rendering Intentと黒点補正は比較結果を説明し対応範囲を示す。出力ICC・Intent・黒点補正・色域警告。表示のみで元色/通常採色不変。出力変換は別コマンド
- 検証範囲：旧名/注記と新仕様の具体能力を対照。実装検証ではない。

## LC-082 — Out-of-Gamut Warning

- 旧出典：[docs/FEATURE_CATALOG.md:122](https://github.com/totoro0419/illustro_old/blob/bdc7135b51033982d90ea5dad104bb04fc107df2/docs/FEATURE_CATALOG.md#L122)
- 旧内容：Out-of-Gamut Warning。色域外を可視化（当時状態：Required）
- 判定：**改善して引き継いだ**。「Out-of-Gamut Warning」の能力は以下の具体制御へ対応。
- 対応能力 [COL-008](features/COL.md#col-008)：出力先の見え方は表示のみ、元色と採色・書出しを混同しない。Rendering Intentと黒点補正は比較結果を説明し対応範囲を示す。出力ICC・Intent・黒点補正・色域警告。表示のみで元色/通常採色不変。出力変換は別コマンド
- 検証範囲：旧名/注記と新仕様の具体能力を対照。実装検証ではない。

## LC-083 — Rendering Intent / Black Point Compensation

- 旧出典：[docs/FEATURE_CATALOG.md:123](https://github.com/totoro0419/illustro_old/blob/bdc7135b51033982d90ea5dad104bb04fc107df2/docs/FEATURE_CATALOG.md#L123)
- 旧内容：Rendering Intent / Black Point Compensation。Color Management詳細仕様で確定（当時状態：Required / Investigate）
- 判定：**改善して引き継いだ**。「Rendering Intent / Black Point Compensation」の能力は以下の具体制御へ対応。
- 対応能力 [COL-008](features/COL.md#col-008)：出力先の見え方は表示のみ、元色と採色・書出しを混同しない。Rendering Intentと黒点補正は比較結果を説明し対応範囲を示す。出力ICC・Intent・黒点補正・色域警告。表示のみで元色/通常採色不変。出力変換は別コマンド
- 検証範囲：旧名/注記と新仕様の具体能力を対照。実装検証ではない。

## LC-084 — Raster Layer

- 旧出典：[docs/FEATURE_CATALOG.md:129](https://github.com/totoro0419/illustro_old/blob/bdc7135b51033982d90ea5dad104bb04fc107df2/docs/FEATURE_CATALOG.md#L129)
- 旧内容：Raster Layer。（当時状態：Core）
- 判定：**改善して引き継いだ**。「Raster Layer」の能力は以下の具体制御へ対応。
- 対応能力 [LAY-001](features/LAY.md#lay-001)：新規は選択層直上、追加後選択、一筆の途中で描画先が勝手に変わらない。種別・挿入位置・選択層・描画対象サムネイル。層追加一Undo。筆中の対象変更は次筆から
- 検証範囲：旧名/注記と新仕様の具体能力を対照。実装検証ではない。

## LC-085 — Vector Layer

- 旧出典：[docs/FEATURE_CATALOG.md:130](https://github.com/totoro0419/illustro_old/blob/bdc7135b51033982d90ea5dad104bb04fc107df2/docs/FEATURE_CATALOG.md#L130)
- 旧内容：Vector Layer。一枚絵の線画・図形・Mask用途に最適化（当時状態：Required）
- 判定：**改善して引き継いだ**。「Vector Layer」の能力は以下の具体制御へ対応。
- 対応能力 [VEC-001](features/VEC.md#vec-001)：開閉パス、ベジェ、塗り/線、手描きベクターを一貫した対象として保持。自由線/開閉パス・塗り/線・ベジェ/図形。パスとして保存、一パス一Undo、マスクもパス参照可能
- 検証範囲：旧名/注記と新仕様の具体能力を対照。実装検証ではない。

## LC-086 — Vector Path / Anchor / Bezier Handle

- 旧出典：[docs/FEATURE_CATALOG.md:131](https://github.com/totoro0419/illustro_old/blob/bdc7135b51033982d90ea5dad104bb04fc107df2/docs/FEATURE_CATALOG.md#L131)
- 旧内容：Vector Path / Anchor / Bezier Handle。Open/Closed Pathを編集可能（当時状態：Required）
- 判定：**改善して引き継いだ**。「Vector Path / Anchor / Bezier Handle」の能力は以下の具体制御へ対応。
- 対応能力 [VEC-002](features/VEC.md#vec-002)：物体選択と点選択を区別、追加/削除/角/曲線/分割/接続。物体/点選択・角/滑らか・点追加削除・分割接続。一ドラッグ一Undo、パス位相を保持
- 検証範囲：旧名/注記と新仕様の具体能力を対照。実装検証ではない。

## LC-087 — Vector Stroke Width / Fill / Stroke

- 旧出典：[docs/FEATURE_CATALOG.md:132](https://github.com/totoro0419/illustro_old/blob/bdc7135b51033982d90ea5dad104bb04fc107df2/docs/FEATURE_CATALOG.md#L132)
- 旧内容：Vector Stroke Width / Fill / Stroke。（当時状態：Required）
- 判定：**改善して引き継いだ**。「Vector Stroke Width / Fill / Stroke」の能力は以下の具体制御へ対応。
- 対応能力 [VEC-003](features/VEC.md#vec-003)：可変幅・全線/部分/交点まで消去、交点の候補を予告。全線/接触部分/交点まで・線幅点・筆風先端。パス/可変幅を保存、消去一筆一Undo
- 検証範囲：旧名/注記と新仕様の具体能力を対照。実装検証ではない。

## LC-088 — Vector Node Add/Delete/Convert

- 旧出典：[docs/FEATURE_CATALOG.md:133](https://github.com/totoro0419/illustro_old/blob/bdc7135b51033982d90ea5dad104bb04fc107df2/docs/FEATURE_CATALOG.md#L133)
- 旧内容：Vector Node Add/Delete/Convert。（当時状態：Required）
- 判定：**改善して引き継いだ**。「Vector Node Add/Delete/Convert」の能力は以下の具体制御へ対応。
- 対応能力 [VEC-002](features/VEC.md#vec-002)：物体選択と点選択を区別、追加/削除/角/曲線/分割/接続。物体/点選択・角/滑らか・点追加削除・分割接続。一ドラッグ一Undo、パス位相を保持
- 検証範囲：旧名/注記と新仕様の具体能力を対照。実装検証ではない。

## LC-089 — Vector Simplify / Smooth

- 旧出典：[docs/FEATURE_CATALOG.md:134](https://github.com/totoro0419/illustro_old/blob/bdc7135b51033982d90ea5dad104bb04fc107df2/docs/FEATURE_CATALOG.md#L134)
- 旧内容：Vector Simplify / Smooth。（当時状態：Required）
- 判定：**改善して引き継いだ**。「Vector Simplify / Smooth」の能力は以下の具体制御へ対応。
- 対応能力 [VEC-004](features/VEC.md#vec-004)：変更前後比較、和/差/交差/排他、元形状を残す選択。簡略化許容量・平滑量・和/差/交差/排他・元形状保持。元形状を残すライブ操作を推奨、焼込は別。適用一Undo
- 検証範囲：旧名/注記と新仕様の具体能力を対照。実装検証ではない。

## LC-090 — Vector Boolean Operation

- 旧出典：[docs/FEATURE_CATALOG.md:135](https://github.com/totoro0419/illustro_old/blob/bdc7135b51033982d90ea5dad104bb04fc107df2/docs/FEATURE_CATALOG.md#L135)
- 旧内容：Vector Boolean Operation。（当時状態：Required）
- 判定：**改善して引き継いだ**。「Vector Boolean Operation」の能力は以下の具体制御へ対応。
- 対応能力 [VEC-004](features/VEC.md#vec-004)：変更前後比較、和/差/交差/排他、元形状を残す選択。簡略化許容量・平滑量・和/差/交差/排他・元形状保持。元形状を残すライブ操作を推奨、焼込は別。適用一Undo
- 検証範囲：旧名/注記と新仕様の具体能力を対照。実装検証ではない。

## LC-091 — Vector Eraser / Line Erase

- 旧出典：[docs/FEATURE_CATALOG.md:136](https://github.com/totoro0419/illustro_old/blob/bdc7135b51033982d90ea5dad104bb04fc107df2/docs/FEATURE_CATALOG.md#L136)
- 旧内容：Vector Eraser / Line Erase。（当時状態：Required）
- 判定：**改善して引き継いだ**。「Vector Eraser / Line Erase」の能力は以下の具体制御へ対応。
- 対応能力 [VEC-003](features/VEC.md#vec-003)：可変幅・全線/部分/交点まで消去、交点の候補を予告。全線/接触部分/交点まで・線幅点・筆風先端。パス/可変幅を保存、消去一筆一Undo
- 検証範囲：旧名/注記と新仕様の具体能力を対照。実装検証ではない。

## LC-092 — Rasterize Vector

- 旧出典：[docs/FEATURE_CATALOG.md:137](https://github.com/totoro0419/illustro_old/blob/bdc7135b51033982d90ea5dad104bb04fc107df2/docs/FEATURE_CATALOG.md#L137)
- 旧内容：Rasterize Vector。（当時状態：Required）
- 判定：**改善して引き継いだ**。「Rasterize Vector」の能力は以下の具体制御へ対応。
- 対応能力 [VEC-007](features/VEC.md#vec-007)：編集性損失を明示し、Undoで元テキスト復元。パス化/画素化・元文字を残すコピー。一変換一Undoで元文字/書式を復元。複製変換推奨
- 検証範囲：旧名/注記と新仕様の具体能力を対照。実装検証ではない。

## LC-093 — Variable-width Vector Stroke

- 旧出典：[docs/FEATURE_CATALOG.md:138](https://github.com/totoro0419/illustro_old/blob/bdc7135b51033982d90ea5dad104bb04fc107df2/docs/FEATURE_CATALOG.md#L138)
- 旧内容：Variable-width Vector Stroke。（当時状態：Required / Investigate）
- 判定：**改善して引き継いだ**。「Variable-width Vector Stroke」の能力は以下の具体制御へ対応。
- 対応能力 [VEC-003](features/VEC.md#vec-003)：可変幅・全線/部分/交点まで消去、交点の候補を予告。全線/接触部分/交点まで・線幅点・筆風先端。パス/可変幅を保存、消去一筆一Undo
- 検証範囲：旧名/注記と新仕様の具体能力を対照。実装検証ではない。

## LC-094 — Brush-like Rendering on Vector Path

- 旧出典：[docs/FEATURE_CATALOG.md:139](https://github.com/totoro0419/illustro_old/blob/bdc7135b51033982d90ea5dad104bb04fc107df2/docs/FEATURE_CATALOG.md#L139)
- 旧内容：Brush-like Rendering on Vector Path。Procedural Brushとの統合を検討（当時状態：Investigate）
- 判定：**改善して引き継いだ**。「Brush-like Rendering on Vector Path」の能力は以下の具体制御へ対応。
- 対応能力 [VEC-003](features/VEC.md#vec-003)：可変幅・全線/部分/交点まで消去、交点の候補を予告。全線/接触部分/交点まで・線幅点・筆風先端。パス/可変幅を保存、消去一筆一Undo
- 検証範囲：旧名/注記と新仕様の具体能力を対照。実装検証ではない。

## LC-095 — Group

- 旧出典：[docs/FEATURE_CATALOG.md:140](https://github.com/totoro0419/illustro_old/blob/bdc7135b51033982d90ea5dad104bb04fc107df2/docs/FEATURE_CATALOG.md#L140)
- 旧内容：Group。（当時状態：Core）
- 判定：**改善して引き継いだ**。「Group」の能力は以下の具体制御へ対応。
- 対応能力 [LAY-003](features/LAY.md#lay-003)：挿入位置・親子関係・禁止先を表示、単指の移動コマンドを併設。複数選択・親子/折畳・移動先・挿入位置。グループ化/移動一操作一Undo、複数対象を一括保持
- 検証範囲：旧名/注記と新仕様の具体能力を対照。実装検証ではない。

## LC-096 — Mask

- 旧出典：[docs/FEATURE_CATALOG.md:141](https://github.com/totoro0419/illustro_old/blob/bdc7135b51033982d90ea5dad104bb04fc107df2/docs/FEATURE_CATALOG.md#L141)
- 旧内容：Mask。（当時状態：Required）
- 判定：**改善して引き継いだ**。「Mask」の能力は以下の具体制御へ対応。
- 対応能力 [LAY-005](features/LAY.md#lay-005)：白/黒/濃度、無効化・反転・適用・リンク、絵とマスクの対象を識別。画素/ベクターマスク・白黒/濃度・リンク・反転/無効/適用。マスク筆一Undo。適用は破壊変換、無効化は元保持、全てNative保存
- 検証範囲：旧名/注記と新仕様の具体能力を対照。実装検証ではない。

## LC-097 — Clipping

- 旧出典：[docs/FEATURE_CATALOG.md:142](https://github.com/totoro0419/illustro_old/blob/bdc7135b51033982d90ea5dad104bb04fc107df2/docs/FEATURE_CATALOG.md#L142)
- 旧内容：Clipping。高頻度操作（当時状態：Core）
- 判定：**改善して引き継いだ**。「Clipping」の能力は以下の具体制御へ対応。
- 対応能力 [LAY-004](features/LAY.md#lay-004)：二つの意味を分け、対象と現在状態を行で直ちに確認。クリップ元・クリップON/OFF・透明度ロック。設定変更一Undo。クリップは下層の見える形、Alpha Lockは現在層の既存α保持
- 検証範囲：旧名/注記と新仕様の具体能力を対照。実装検証ではない。

## LC-098 — Alpha Lock / Lock Transparency

- 旧出典：[docs/FEATURE_CATALOG.md:143](https://github.com/totoro0419/illustro_old/blob/bdc7135b51033982d90ea5dad104bb04fc107df2/docs/FEATURE_CATALOG.md#L143)
- 旧内容：Alpha Lock / Lock Transparency。彩色で高頻度（当時状態：Core）
- 判定：**改善して引き継いだ**。「Alpha Lock / Lock Transparency」の能力は以下の具体制御へ対応。
- 対応能力 [LAY-004](features/LAY.md#lay-004)：二つの意味を分け、対象と現在状態を行で直ちに確認。クリップ元・クリップON/OFF・透明度ロック。設定変更一Undo。クリップは下層の見える形、Alpha Lockは現在層の既存α保持
- 検証範囲：旧名/注記と新仕様の具体能力を対照。実装検証ではない。

## LC-099 — Alpha Inheritance / Clipping-equivalent

- 旧出典：[docs/FEATURE_CATALOG.md:144](https://github.com/totoro0419/illustro_old/blob/bdc7135b51033982d90ea5dad104bb04fc107df2/docs/FEATURE_CATALOG.md#L144)
- 旧内容：Alpha Inheritance / Clipping-equivalent。Group/Clipping設計と整合させる（当時状態：Required）
- 判定：**改善して引き継いだ**。「Alpha Inheritance / Clipping-equivalent」の能力は以下の具体制御へ対応。
- 対応能力 [LAY-004](features/LAY.md#lay-004)：二つの意味を分け、対象と現在状態を行で直ちに確認。クリップ元・クリップON/OFF・透明度ロック。設定変更一Undo。クリップは下層の見える形、Alpha Lockは現在層の既存α保持
- 検証範囲：旧名/注記と新仕様の具体能力を対照。実装検証ではない。

## LC-100 — Persistent Clipping Control

- 旧出典：[docs/FEATURE_CATALOG.md:145](https://github.com/totoro0419/illustro_old/blob/bdc7135b51033982d90ea5dad104bb04fc107df2/docs/FEATURE_CATALOG.md#L145)
- 旧内容：Persistent Clipping Control。レイヤーUI上で即時確認・切替（当時状態：Core）
- 判定：**改善して引き継いだ**。「Persistent Clipping Control」の能力は以下の具体制御へ対応。
- 対応能力 [LAY-004](features/LAY.md#lay-004)：二つの意味を分け、対象と現在状態を行で直ちに確認。クリップ元・クリップON/OFF・透明度ロック。設定変更一Undo。クリップは下層の見える形、Alpha Lockは現在層の既存α保持
- 検証範囲：旧名/注記と新仕様の具体能力を対照。実装検証ではない。

## LC-101 — Adjustment Layer

- 旧出典：[docs/FEATURE_CATALOG.md:146](https://github.com/totoro0419/illustro_old/blob/bdc7135b51033982d90ea5dad104bb04fc107df2/docs/FEATURE_CATALOG.md#L146)
- 旧内容：Adjustment Layer。（当時状態：Required）
- 判定：**改善して引き継いだ**。「Adjustment Layer」の能力は以下の具体制御へ対応。
- 対応能力 [FX-001](features/FX.md#fx-001)：明るさ/コントラスト/レベル/カーブ/露出/色相彩度/自然な彩度/色バランスを再編集。調整種別・全体/クリップ先・初期マスク。作成一Undo、元画素保持、個別調整欄を再度開ける
- 検証範囲：旧名/注記と新仕様の具体能力を対照。実装検証ではない。

## LC-102 — Filter Layer

- 旧出典：[docs/FEATURE_CATALOG.md:147](https://github.com/totoro0419/illustro_old/blob/bdc7135b51033982d90ea5dad104bb04fc107df2/docs/FEATURE_CATALOG.md#L147)
- 旧内容：Filter Layer。（当時状態：Required）
- 判定：**改善して引き継いだ**。「Filter Layer」の能力は以下の具体制御へ対応。
- 対応能力 [FX-008](features/FX.md#fx-008)：有効/無効、並替、不透明度/合成、元との差分比較。有効/無効・並替・不透明度・合成・効果マスク。一並替一Undo、順序/各マスクを保存
- 検証範囲：旧名/注記と新仕様の具体能力を対照。実装検証ではない。

## LC-103 — Layer Style / Layer Effect

- 旧出典：[docs/FEATURE_CATALOG.md:148](https://github.com/totoro0419/illustro_old/blob/bdc7135b51033982d90ea5dad104bb04fc107df2/docs/FEATURE_CATALOG.md#L148)
- 旧内容：Layer Style / Layer Effect。非破壊。Stroke/Shadow/Glow/Overlay等（当時状態：Required）
- 判定：**改善して引き継いだ**。「Layer Style / Layer Effect」の能力は以下の具体制御へ対応。
- 対応能力 [FX-132](features/FX.md#fx-132)：太さと位置を指定。マスク・強度・前後比較・再編集を保持。。内/中央/外・幅px・色/Gradient/Pattern・角/結合。対象αに基づくStyle、元形状と分離し再編集。設定/入力版/Mask/順序をNative保存。適用一Undo、再度開いて同じ制御を編集。取消は今回の設定だけ戻す
- 対応能力 [FX-133](features/FX.md#fx-133)：光源・距離・ぼけを指定。マスク・強度・前後比較・再編集を保持。。内/外・光角/距離px・Spread/Blur・色/不透明度・共有光源。Styleとして保持、共有光源の影響対象を表示。設定/入力版/Mask/順序をNative保存。適用一Undo、再度開いて同じ制御を編集。取消は今回の設定だけ戻す
- 対応能力 [FX-134](features/FX.md#fx-134)：光の色と広がりを指定。マスク・強度・前後比較・再編集を保持。。内/外・色・広がり/ぼけ・輪郭Curve・合成・強度。Styleを保存、加算等の合成を明示。設定/入力版/Mask/順序をNative保存。適用一Undo、再度開いて同じ制御を編集。取消は今回の設定だけ戻す
- 対応能力 [FX-135](features/FX.md#fx-135)：元の形へ塗りを重ねる。マスク・強度・前後比較・再編集を保持。。単色/Gradient/Pattern・不透明度/合成・模様倍率/角度/原点・形連動。Overlay種別ごとのデータ/依存を保持。設定/入力版/Mask/順序をNative保存。適用一Undo、再度開いて同じ制御を編集。取消は今回の設定だけ戻す
- 対応能力 [FX-136](features/FX.md#fx-136)：立体的な縁と光を比較。マスク・強度・前後比較・再編集を保持。。内/外Bevel/Emboss・深さ/向き/Size/Softness・光角/高度・Highlight/Shadow。元形状からのStyle、光源と輪郭設定を保存。設定/入力版/Mask/順序をNative保存。適用一Undo、再度開いて同じ制御を編集。取消は今回の設定だけ戻す
- 検証範囲：旧名/注記と新仕様の具体能力を対照。実装検証ではない。

## LC-104 — Text Layer / Entity

- 旧出典：[docs/FEATURE_CATALOG.md:149](https://github.com/totoro0419/illustro_old/blob/bdc7135b51033982d90ea5dad104bb04fc107df2/docs/FEATURE_CATALOG.md#L149)
- 旧内容：Text Layer / Entity。編集可能なTextを保持（当時状態：Required）
- 判定：**改善して引き継いだ**。「Text Layer / Entity」の能力は以下の具体制御へ対応。
- 対応能力 [VEC-005](features/VEC.md#vec-005)：編集可能な点/枠テキスト、変換中保持、縦横切替、フォント/行間/字間/基線。点/枠文字・縦横・font/style/size/整列/字間/行間/基線/色。文字としてNative保存、変換確定を区切りにUndo、Raster化は別
- 検証範囲：旧名/注記と新仕様の具体能力を対照。実装検証ではない。

## LC-105 — Horizontal / Vertical Text

- 旧出典：[docs/FEATURE_CATALOG.md:150](https://github.com/totoro0419/illustro_old/blob/bdc7135b51033982d90ea5dad104bb04fc107df2/docs/FEATURE_CATALOG.md#L150)
- 旧内容：Horizontal / Vertical Text。日本語用途を考慮（当時状態：Required）
- 判定：**改善して引き継いだ**。「Horizontal / Vertical Text」の能力は以下の具体制御へ対応。
- 対応能力 [VEC-005](features/VEC.md#vec-005)：編集可能な点/枠テキスト、変換中保持、縦横切替、フォント/行間/字間/基線。点/枠文字・縦横・font/style/size/整列/字間/行間/基線/色。文字としてNative保存、変換確定を区切りにUndo、Raster化は別
- 検証範囲：旧名/注記と新仕様の具体能力を対照。実装検証ではない。

## LC-106 — Font Family / Style / Size

- 旧出典：[docs/FEATURE_CATALOG.md:151](https://github.com/totoro0419/illustro_old/blob/bdc7135b51033982d90ea5dad104bb04fc107df2/docs/FEATURE_CATALOG.md#L151)
- 旧内容：Font Family / Style / Size。（当時状態：Required）
- 判定：**改善して引き継いだ**。「Font Family / Style / Size」の能力は以下の具体制御へ対応。
- 対応能力 [VEC-005](features/VEC.md#vec-005)：編集可能な点/枠テキスト、変換中保持、縦横切替、フォント/行間/字間/基線。点/枠文字・縦横・font/style/size/整列/字間/行間/基線/色。文字としてNative保存、変換確定を区切りにUndo、Raster化は別
- 検証範囲：旧名/注記と新仕様の具体能力を対照。実装検証ではない。

## LC-107 — Tracking / Line Height / Baseline

- 旧出典：[docs/FEATURE_CATALOG.md:152](https://github.com/totoro0419/illustro_old/blob/bdc7135b51033982d90ea5dad104bb04fc107df2/docs/FEATURE_CATALOG.md#L152)
- 旧内容：Tracking / Line Height / Baseline。（当時状態：Required）
- 判定：**改善して引き継いだ**。「Tracking / Line Height / Baseline」の能力は以下の具体制御へ対応。
- 対応能力 [VEC-005](features/VEC.md#vec-005)：編集可能な点/枠テキスト、変換中保持、縦横切替、フォント/行間/字間/基線。点/枠文字・縦横・font/style/size/整列/字間/行間/基線/色。文字としてNative保存、変換確定を区切りにUndo、Raster化は別
- 検証範囲：旧名/注記と新仕様の具体能力を対照。実装検証ではない。

## LC-108 — Font Import

- 旧出典：[docs/FEATURE_CATALOG.md:153](https://github.com/totoro0419/illustro_old/blob/bdc7135b51033982d90ea5dad104bb04fc107df2/docs/FEATURE_CATALOG.md#L153)
- 旧内容：Font Import。Platformが許す範囲（当時状態：Required）
- 判定：**改善して引き継いだ**。「Font Import」の能力は以下の具体制御へ対応。
- 対応能力 [VEC-006](features/VEC.md#vec-006)：使用可能フォントの取込、欠落警告、無断代替を避け選択・元保持。font取込・不足一覧・代替候補・使用箇所。元フォント名/文字/外観を保持。埋込は許諾範囲、置換一Undo
- 検証範囲：旧名/注記と新仕様の具体能力を対照。実装検証ではない。

## LC-109 — Missing Font Handling

- 旧出典：[docs/FEATURE_CATALOG.md:154](https://github.com/totoro0419/illustro_old/blob/bdc7135b51033982d90ea5dad104bb04fc107df2/docs/FEATURE_CATALOG.md#L154)
- 旧内容：Missing Font Handling。警告・代替を明示（当時状態：Required）
- 判定：**改善して引き継いだ**。「Missing Font Handling」の能力は以下の具体制御へ対応。
- 対応能力 [VEC-006](features/VEC.md#vec-006)：使用可能フォントの取込、欠落警告、無断代替を避け選択・元保持。font取込・不足一覧・代替候補・使用箇所。元フォント名/文字/外観を保持。埋込は許諾範囲、置換一Undo
- 検証範囲：旧名/注記と新仕様の具体能力を対照。実装検証ではない。

## LC-110 — Text → Vector/Path

- 旧出典：[docs/FEATURE_CATALOG.md:155](https://github.com/totoro0419/illustro_old/blob/bdc7135b51033982d90ea5dad104bb04fc107df2/docs/FEATURE_CATALOG.md#L155)
- 旧内容：Text → Vector/Path。（当時状態：Required）
- 判定：**改善して引き継いだ**。「Text → Vector/Path」の能力は以下の具体制御へ対応。
- 対応能力 [VEC-007](features/VEC.md#vec-007)：編集性損失を明示し、Undoで元テキスト復元。パス化/画素化・元文字を残すコピー。一変換一Undoで元文字/書式を復元。複製変換推奨
- 検証範囲：旧名/注記と新仕様の具体能力を対照。実装検証ではない。

## LC-111 — Text on Path / Area Text

- 旧出典：[docs/FEATURE_CATALOG.md:156](https://github.com/totoro0419/illustro_old/blob/bdc7135b51033982d90ea5dad104bb04fc107df2/docs/FEATURE_CATALOG.md#L156)
- 旧内容：Text on Path / Area Text。DTP化しすぎない範囲で評価（当時状態：Investigate）
- 判定：**再検討のため保留した**。「Text on Path / Area Text」の能力は以下の具体制御へ対応。 候補を削除せず範囲/精度/用途を比較待ち。枠文字は採用推奨、パス上/高度組版を分離して比較。
- 対応能力 [VEC-005](features/VEC.md#vec-005)：編集可能な点/枠テキスト、変換中保持、縦横切替、フォント/行間/字間/基線。点/枠文字・縦横・font/style/size/整列/字間/行間/基線/色。文字としてNative保存、変換確定を区切りにUndo、Raster化は別
- 対応能力 [VEC-008](features/VEC.md#vec-008)：ルビ/縦中横/OpenType/可変軸は範囲を個別承認、DTP全般へ拡散しない。パス上開始位置/方向/オフセット・ルビ/縦中横/OpenType候補。能力別に採否を管理、対応部分は文字と経路を保存
- 検証範囲：旧名/注記と新仕様の具体能力を対照。実装検証ではない。

## LC-112 — Multi-select

- 旧出典：[docs/FEATURE_CATALOG.md:157](https://github.com/totoro0419/illustro_old/blob/bdc7135b51033982d90ea5dad104bb04fc107df2/docs/FEATURE_CATALOG.md#L157)
- 旧内容：Multi-select。（当時状態：Required）
- 判定：**改善して引き継いだ**。「Multi-select」の能力は以下の具体制御へ対応。
- 対応能力 [LAY-003](features/LAY.md#lay-003)：挿入位置・親子関係・禁止先を表示、単指の移動コマンドを併設。複数選択・親子/折畳・移動先・挿入位置。グループ化/移動一操作一Undo、複数対象を一括保持
- 検証範囲：旧名/注記と新仕様の具体能力を対照。実装検証ではない。

## LC-113 — Drag Reorder

- 旧出典：[docs/FEATURE_CATALOG.md:158](https://github.com/totoro0419/illustro_old/blob/bdc7135b51033982d90ea5dad104bb04fc107df2/docs/FEATURE_CATALOG.md#L158)
- 旧内容：Drag Reorder。（当時状態：Core）
- 判定：**改善して引き継いだ**。「Drag Reorder」の能力は以下の具体制御へ対応。
- 対応能力 [LAY-003](features/LAY.md#lay-003)：挿入位置・親子関係・禁止先を表示、単指の移動コマンドを併設。複数選択・親子/折畳・移動先・挿入位置。グループ化/移動一操作一Undo、複数対象を一括保持
- 検証範囲：旧名/注記と新仕様の具体能力を対照。実装検証ではない。

## LC-114 — Search

- 旧出典：[docs/FEATURE_CATALOG.md:159](https://github.com/totoro0419/illustro_old/blob/bdc7135b51033982d90ea5dad104bb04fc107df2/docs/FEATURE_CATALOG.md#L159)
- 旧内容：Search。（当時状態：Required）
- 判定：**改善して引き継いだ**。「Search」の能力は以下の具体制御へ対応。
- 対応能力 [LAY-007](features/LAY.md#lay-007)：インライン改名、種別/色タグ検索、絞込中の並替曖昧さを防ぐ。名前・色タグ・種別・検索・フィルター。名称/タグは作品へ保存、一確定一Undo。検索表示はUndo外
- 検証範囲：旧名/注記と新仕様の具体能力を対照。実装検証ではない。

## LC-115 — Filter

- 旧出典：[docs/FEATURE_CATALOG.md:160](https://github.com/totoro0419/illustro_old/blob/bdc7135b51033982d90ea5dad104bb04fc107df2/docs/FEATURE_CATALOG.md#L160)
- 旧内容：Filter。（当時状態：Required）
- 判定：**改善して引き継いだ**。「Filter」の能力は以下の具体制御へ対応。
- 対応能力 [LAY-007](features/LAY.md#lay-007)：インライン改名、種別/色タグ検索、絞込中の並替曖昧さを防ぐ。名前・色タグ・種別・検索・フィルター。名称/タグは作品へ保存、一確定一Undo。検索表示はUndo外
- 検証範囲：旧名/注記と新仕様の具体能力を対照。実装検証ではない。

## LC-116 — Color Tag

- 旧出典：[docs/FEATURE_CATALOG.md:161](https://github.com/totoro0419/illustro_old/blob/bdc7135b51033982d90ea5dad104bb04fc107df2/docs/FEATURE_CATALOG.md#L161)
- 旧内容：Color Tag。（当時状態：Required）
- 判定：**改善して引き継いだ**。「Color Tag」の能力は以下の具体制御へ対応。
- 対応能力 [LAY-007](features/LAY.md#lay-007)：インライン改名、種別/色タグ検索、絞込中の並替曖昧さを防ぐ。名前・色タグ・種別・検索・フィルター。名称/タグは作品へ保存、一確定一Undo。検索表示はUndo外
- 検証範囲：旧名/注記と新仕様の具体能力を対照。実装検証ではない。

## LC-117 — Lock種別

- 旧出典：[docs/FEATURE_CATALOG.md:162](https://github.com/totoro0419/illustro_old/blob/bdc7135b51033982d90ea5dad104bb04fc107df2/docs/FEATURE_CATALOG.md#L162)
- 旧内容：Lock種別。（当時状態：Required）
- 判定：**改善して引き継いだ**。「Lock種別」の能力は以下の具体制御へ対応。
- 対応能力 [LAY-008](features/LAY.md#lay-008)：何を禁止しているかを表示し、不能時に勝手な別対象へ描かない。位置/画素内容/全体ロック。ロック設定は作品に保存、一操作一Undo
- 検証範囲：旧名/注記と新仕様の具体能力を対照。実装検証ではない。

## LC-118 — Solo / Isolate

- 旧出典：[docs/FEATURE_CATALOG.md:163](https://github.com/totoro0419/illustro_old/blob/bdc7135b51033982d90ea5dad104bb04fc107df2/docs/FEATURE_CATALOG.md#L163)
- 旧内容：Solo / Isolate。（当時状態：Required）
- 判定：**改善して引き継いだ**。「Solo / Isolate」の能力は以下の具体制御へ対応。
- 対応能力 [LAY-009](features/LAY.md#lay-009)：元の可視状態を保ったSolo、表示編集との区別、解除時正確復帰。Solo/Isolate・戻る。一時検査はUndo外、解除で正確復帰。通常目変更とは区別
- 検証範囲：旧名/注記と新仕様の具体能力を対照。実装検証ではない。

## LC-119 — Collapse

- 旧出典：[docs/FEATURE_CATALOG.md:164](https://github.com/totoro0419/illustro_old/blob/bdc7135b51033982d90ea5dad104bb04fc107df2/docs/FEATURE_CATALOG.md#L164)
- 旧内容：Collapse。（当時状態：Required）
- 判定：**改善して引き継いだ**。「Collapse」の能力は以下の具体制御へ対応。
- 対応能力 [LAY-003](features/LAY.md#lay-003)：挿入位置・親子関係・禁止先を表示、単指の移動コマンドを併設。複数選択・親子/折畳・移動先・挿入位置。グループ化/移動一操作一Undo、複数対象を一括保持
- 検証範囲：旧名/注記と新仕様の具体能力を対照。実装検証ではない。

## LC-120 — Duplicate

- 旧出典：[docs/FEATURE_CATALOG.md:165](https://github.com/totoro0419/illustro_old/blob/bdc7135b51033982d90ea5dad104bb04fc107df2/docs/FEATURE_CATALOG.md#L165)
- 旧内容：Duplicate。（当時状態：Required）
- 判定：**改善して引き継いだ**。「Duplicate」の能力は以下の具体制御へ対応。
- 対応能力 [LAY-006](features/LAY.md#lay-006)：複製は元保持、結合で失う編集情報を明示、統合コピーは原本保持。複製/下へ結合/選択結合/可視結合/統合コピー。結合一Undo。統合コピーは新層作成し原本不変
- 検証範囲：旧名/注記と新仕様の具体能力を対照。実装検証ではない。

## LC-121 — Merge

- 旧出典：[docs/FEATURE_CATALOG.md:166](https://github.com/totoro0419/illustro_old/blob/bdc7135b51033982d90ea5dad104bb04fc107df2/docs/FEATURE_CATALOG.md#L166)
- 旧内容：Merge。（当時状態：Required）
- 判定：**改善して引き継いだ**。「Merge」の能力は以下の具体制御へ対応。
- 対応能力 [LAY-006](features/LAY.md#lay-006)：複製は元保持、結合で失う編集情報を明示、統合コピーは原本保持。複製/下へ結合/選択結合/可視結合/統合コピー。結合一Undo。統合コピーは新層作成し原本不変
- 検証範囲：旧名/注記と新仕様の具体能力を対照。実装検証ではない。

## LC-122 — Merge Visible

- 旧出典：[docs/FEATURE_CATALOG.md:167](https://github.com/totoro0419/illustro_old/blob/bdc7135b51033982d90ea5dad104bb04fc107df2/docs/FEATURE_CATALOG.md#L167)
- 旧内容：Merge Visible。（当時状態：Required）
- 判定：**改善して引き継いだ**。「Merge Visible」の能力は以下の具体制御へ対応。
- 対応能力 [LAY-006](features/LAY.md#lay-006)：複製は元保持、結合で失う編集情報を明示、統合コピーは原本保持。複製/下へ結合/選択結合/可視結合/統合コピー。結合一Undo。統合コピーは新層作成し原本不変
- 検証範囲：旧名/注記と新仕様の具体能力を対照。実装検証ではない。

## LC-123 — Flatten Copy

- 旧出典：[docs/FEATURE_CATALOG.md:168](https://github.com/totoro0419/illustro_old/blob/bdc7135b51033982d90ea5dad104bb04fc107df2/docs/FEATURE_CATALOG.md#L168)
- 旧内容：Flatten Copy。（当時状態：Required）
- 判定：**改善して引き継いだ**。「Flatten Copy」の能力は以下の具体制御へ対応。
- 対応能力 [LAY-006](features/LAY.md#lay-006)：複製は元保持、結合で失う編集情報を明示、統合コピーは原本保持。複製/下へ結合/選択結合/可視結合/統合コピー。結合一Undo。統合コピーは新層作成し原本不変
- 検証範囲：旧名/注記と新仕様の具体能力を対照。実装検証ではない。

## LC-124 — Layer Comps

- 旧出典：[docs/FEATURE_CATALOG.md:169](https://github.com/totoro0419/illustro_old/blob/bdc7135b51033982d90ea5dad104bb04fc107df2/docs/FEATURE_CATALOG.md#L169)
- 旧内容：Layer Comps。（当時状態：Core）
- 判定：**改善して引き継いだ**。「Layer Comps」の能力は以下の具体制御へ対応。
- 対応能力 [LAY-011](features/LAY.md#lay-011)：表示/不透明度/合成等の保存範囲を明示、絵そのもののSnapshotと区別。表示/不透明度/合成・保存する属性。カンプは画素Snapshotと別保存、適用一Undo
- 検証範囲：旧名/注記と新仕様の具体能力を対照。実装検証ではない。

## LC-125 — Canvasから直接Layer選択

- 旧出典：[docs/FEATURE_CATALOG.md:170](https://github.com/totoro0419/illustro_old/blob/bdc7135b51033982d90ea5dad104bb04fc107df2/docs/FEATURE_CATALOG.md#L170)
- 旧内容：Canvasから直接Layer選択。大量レイヤー時の高速操作（当時状態：Required）
- 判定：**改善して引き継いだ**。「Canvasから直接Layer選択」の能力は以下の具体制御へ対応。
- 対応能力 [LAY-010](features/LAY.md#lay-010)：重なり候補と選択対象の輪郭を表示、隠れた層の扱いを明示。見える対象/ロック含有・透明度判定・候補巡回。選択変更は作品Undo外。描画先は確定選択後だけ変化
- 検証範囲：旧名/注記と新仕様の具体能力を対照。実装検証ではない。

## LC-126 — 大量レイヤーUI性能

- 旧出典：[docs/FEATURE_CATALOG.md:171](https://github.com/totoro0419/illustro_old/blob/bdc7135b51033982d90ea5dad104bb04fc107df2/docs/FEATURE_CATALOG.md#L171)
- 旧内容：大量レイヤーUI性能。Virtualization等を検討（当時状態：Core）
- 判定：**再検討のため保留した**。「大量レイヤーUI性能」の能力は以下の具体制御へ対応。旧記載は技術候補であり、同じ結果要求を残して方式選定を次段階へ分離。
- 対応能力 [QR-09](QUALITY_REQUIREMENTS.md)：大作品/多数層/入力/表示の継続と負荷を測定し、方式を確定しない。
- 検証範囲：旧名/注記と新仕様の具体能力を対照。実装検証ではない。

## LC-127 — Rectangle / Ellipse Selection

- 旧出典：[docs/FEATURE_CATALOG.md:177](https://github.com/totoro0419/illustro_old/blob/bdc7135b51033982d90ea5dad104bb04fc107df2/docs/FEATURE_CATALOG.md#L177)
- 旧内容：Rectangle / Ellipse Selection。（当時状態：Required）
- 判定：**改善して引き継いだ**。「Rectangle / Ellipse Selection」の能力は以下の具体制御へ対応。
- 対応能力 [SEL-001](features/SEL.md#sel-001)：形を直接指定、Replace/Add/Subtract/Intersectを常時識別。矩形/楕円/自由/多角形・置換/加算/減算/交差、既定置換。選択筆/消し選択は径/硬さ/濃度、筆で選択Maskを加減し一筆一Undo。一作成一Undo、濃度付き現在範囲を保存
- 検証範囲：旧名/注記と新仕様の具体能力を対照。実装検証ではない。

## LC-128 — Freehand Selection

- 旧出典：[docs/FEATURE_CATALOG.md:178](https://github.com/totoro0419/illustro_old/blob/bdc7135b51033982d90ea5dad104bb04fc107df2/docs/FEATURE_CATALOG.md#L178)
- 旧内容：Freehand Selection。（当時状態：Required）
- 判定：**改善して引き継いだ**。「Freehand Selection」の能力は以下の具体制御へ対応。
- 対応能力 [SEL-001](features/SEL.md#sel-001)：形を直接指定、Replace/Add/Subtract/Intersectを常時識別。矩形/楕円/自由/多角形・置換/加算/減算/交差、既定置換。選択筆/消し選択は径/硬さ/濃度、筆で選択Maskを加減し一筆一Undo。一作成一Undo、濃度付き現在範囲を保存
- 検証範囲：旧名/注記と新仕様の具体能力を対照。実装検証ではない。

## LC-129 — Polygonal Selection

- 旧出典：[docs/FEATURE_CATALOG.md:179](https://github.com/totoro0419/illustro_old/blob/bdc7135b51033982d90ea5dad104bb04fc107df2/docs/FEATURE_CATALOG.md#L179)
- 旧内容：Polygonal Selection。（当時状態：Required）
- 判定：**改善して引き継いだ**。「Polygonal Selection」の能力は以下の具体制御へ対応。
- 対応能力 [SEL-001](features/SEL.md#sel-001)：形を直接指定、Replace/Add/Subtract/Intersectを常時識別。矩形/楕円/自由/多角形・置換/加算/減算/交差、既定置換。選択筆/消し選択は径/硬さ/濃度、筆で選択Maskを加減し一筆一Undo。一作成一Undo、濃度付き現在範囲を保存
- 検証範囲：旧名/注記と新仕様の具体能力を対照。実装検証ではない。

## LC-130 — Color / Similarity Selection

- 旧出典：[docs/FEATURE_CATALOG.md:180](https://github.com/totoro0419/illustro_old/blob/bdc7135b51033982d90ea5dad104bb04fc107df2/docs/FEATURE_CATALOG.md#L180)
- 旧内容：Color / Similarity Selection。アルゴリズム未確定（当時状態：Required）
- 判定：**改善して引き継いだ**。「Color / Similarity Selection」の能力は以下の具体制御へ対応。
- 対応能力 [SEL-002](features/SEL.md#sel-002)：許容値、連続/全体、参照層、半透明境界をプレビュー。色差/明度範囲・連続/全体・参照層・許容。磁気投げ縄は参照層/吸着幅/固定点追加/直前点取消、候補境界を確認して閉じる。適用一Undo、参照は作成時点を固定
- 検証範囲：旧名/注記と新仕様の具体能力を対照。実装検証ではない。

## LC-131 — Lineart Layer Area Selection

- 旧出典：[docs/FEATURE_CATALOG.md:181](https://github.com/totoro0419/illustro_old/blob/bdc7135b51033982d90ea5dad104bb04fc107df2/docs/FEATURE_CATALOG.md#L181)
- 旧内容：Lineart Layer Area Selection。線画レイヤーの領域分けを利用（当時状態：Required）
- 判定：**改善して引き継いだ**。「Lineart Layer Area Selection」の能力は以下の具体制御へ対応。
- 対応能力 [SEL-005](features/SEL.md#sel-005)：確認済みの領域区分や透明度から範囲を得る。線画区分版/層α・置換/加減算。選択は作成時のコピーで元更新へ勝手に追従しない
- 検証範囲：旧名/注記と新仕様の具体能力を対照。実装検証ではない。

## LC-132 — Add / Subtract / Intersect

- 旧出典：[docs/FEATURE_CATALOG.md:182](https://github.com/totoro0419/illustro_old/blob/bdc7135b51033982d90ea5dad104bb04fc107df2/docs/FEATURE_CATALOG.md#L182)
- 旧内容：Add / Subtract / Intersect。（当時状態：Required）
- 判定：**改善して引き継いだ**。「Add / Subtract / Intersect」の能力は以下の具体制御へ対応。
- 対応能力 [SEL-001](features/SEL.md#sel-001)：形を直接指定、Replace/Add/Subtract/Intersectを常時識別。矩形/楕円/自由/多角形・置換/加算/減算/交差、既定置換。選択筆/消し選択は径/硬さ/濃度、筆で選択Maskを加減し一筆一Undo。一作成一Undo、濃度付き現在範囲を保存
- 検証範囲：旧名/注記と新仕様の具体能力を対照。実装検証ではない。

## LC-133 — Invert Selection

- 旧出典：[docs/FEATURE_CATALOG.md:183](https://github.com/totoro0419/illustro_old/blob/bdc7135b51033982d90ea5dad104bb04fc107df2/docs/FEATURE_CATALOG.md#L183)
- 旧内容：Invert Selection。（当時状態：Required）
- 判定：**改善して引き継いだ**。「Invert Selection」の能力は以下の具体制御へ対応。
- 対応能力 [SEL-004](features/SEL.md#sel-004)：解除はUndo/再選択可能、ツール切替だけで解除しない。全選択/解除/再選択/反転。解除は画素削除ではなくUndo/再選択可能。ツール切替で保持
- 検証範囲：旧名/注記と新仕様の具体能力を対照。実装検証ではない。

## LC-134 — Feather

- 旧出典：[docs/FEATURE_CATALOG.md:184](https://github.com/totoro0419/illustro_old/blob/bdc7135b51033982d90ea5dad104bb04fc107df2/docs/FEATURE_CATALOG.md#L184)
- 旧内容：Feather。（当時状態：Required）
- 判定：**改善して引き継いだ**。「Feather」の能力は以下の具体制御へ対応。
- 対応能力 [SEL-003](features/SEL.md#sel-003)：濃度付き選択、幅・フェザーの結果確認、数値指定。拡張/縮小px・フェザー半径・境界帯幅。一調整一Undo、元選択から毎回再評価
- 検証範囲：旧名/注記と新仕様の具体能力を対照。実装検証ではない。

## LC-135 — Expand / Contract

- 旧出典：[docs/FEATURE_CATALOG.md:185](https://github.com/totoro0419/illustro_old/blob/bdc7135b51033982d90ea5dad104bb04fc107df2/docs/FEATURE_CATALOG.md#L185)
- 旧内容：Expand / Contract。（当時状態：Required）
- 判定：**改善して引き継いだ**。「Expand / Contract」の能力は以下の具体制御へ対応。
- 対応能力 [SEL-003](features/SEL.md#sel-003)：濃度付き選択、幅・フェザーの結果確認、数値指定。拡張/縮小px・フェザー半径・境界帯幅。一調整一Undo、元選択から毎回再評価
- 検証範囲：旧名/注記と新仕様の具体能力を対照。実装検証ではない。

## LC-136 — Saved Selection / Selection Mask

- 旧出典：[docs/FEATURE_CATALOG.md:186](https://github.com/totoro0419/illustro_old/blob/bdc7135b51033982d90ea5dad104bb04fc107df2/docs/FEATURE_CATALOG.md#L186)
- 旧内容：Saved Selection / Selection Mask。再利用可能なグレースケール選択（当時状態：Required）
- 判定：**改善して引き継いだ**。「Saved Selection / Selection Mask」の能力は以下の具体制御へ対応。
- 対応能力 [SEL-006](features/SEL.md#sel-006)：名前付き範囲と現在範囲を分離、読込時の置換/加減算。名前・選択マスク・読込時の置換/加算/減算/交差。現在範囲と保存範囲を独立保持、更新は明示、一更新一Undo
- 検証範囲：旧名/注記と新仕様の具体能力を対照。実装検証ではない。

## LC-137 — Select from Layer Content

- 旧出典：[docs/FEATURE_CATALOG.md:187](https://github.com/totoro0419/illustro_old/blob/bdc7135b51033982d90ea5dad104bb04fc107df2/docs/FEATURE_CATALOG.md#L187)
- 旧内容：Select from Layer Content。（当時状態：Required）
- 判定：**改善して引き継いだ**。「Select from Layer Content」の能力は以下の具体制御へ対応。
- 対応能力 [SEL-005](features/SEL.md#sel-005)：確認済みの領域区分や透明度から範囲を得る。線画区分版/層α・置換/加減算。選択は作成時のコピーで元更新へ勝手に追従しない
- 検証範囲：旧名/注記と新仕様の具体能力を対照。実装検証ではない。

## LC-138 — Luminance / Color-range Selection

- 旧出典：[docs/FEATURE_CATALOG.md:188](https://github.com/totoro0419/illustro_old/blob/bdc7135b51033982d90ea5dad104bb04fc107df2/docs/FEATURE_CATALOG.md#L188)
- 旧内容：Luminance / Color-range Selection。（当時状態：Required）
- 判定：**改善して引き継いだ**。「Luminance / Color-range Selection」の能力は以下の具体制御へ対応。
- 対応能力 [SEL-002](features/SEL.md#sel-002)：許容値、連続/全体、参照層、半透明境界をプレビュー。色差/明度範囲・連続/全体・参照層・許容。磁気投げ縄は参照層/吸着幅/固定点追加/直前点取消、候補境界を確認して閉じる。適用一Undo、参照は作成時点を固定
- 検証範囲：旧名/注記と新仕様の具体能力を対照。実装検証ではない。

## LC-139 — Move / Scale / Rotate

- 旧出典：[docs/FEATURE_CATALOG.md:189](https://github.com/totoro0419/illustro_old/blob/bdc7135b51033982d90ea5dad104bb04fc107df2/docs/FEATURE_CATALOG.md#L189)
- 旧内容：Move / Scale / Rotate。（当時状態：Core）
- 判定：**改善して引き継いだ**。「Move / Scale / Rotate」の能力は以下の具体制御へ対応。
- 対応能力 [TRN-001](features/TRN.md#trn-001)：対象と支点、縦横比、数値、直接ハンドルを併用。支点・位置px・角度・縦横比ロック・反転。選択内容/層/複数層の対象を固定、一セッション一Undo
- 検証範囲：旧名/注記と新仕様の具体能力を対照。実装検証ではない。

## LC-140 — Flip

- 旧出典：[docs/FEATURE_CATALOG.md:190](https://github.com/totoro0419/illustro_old/blob/bdc7135b51033982d90ea5dad104bb04fc107df2/docs/FEATURE_CATALOG.md#L190)
- 旧内容：Flip。（当時状態：Required）
- 判定：**改善して引き継いだ**。「Flip」の能力は以下の具体制御へ対応。
- 対応能力 [TRN-001](features/TRN.md#trn-001)：対象と支点、縦横比、数値、直接ハンドルを併用。支点・位置px・角度・縦横比ロック・反転。選択内容/層/複数層の対象を固定、一セッション一Undo
- 検証範囲：旧名/注記と新仕様の具体能力を対照。実装検証ではない。

## LC-141 — Free Transform

- 旧出典：[docs/FEATURE_CATALOG.md:191](https://github.com/totoro0419/illustro_old/blob/bdc7135b51033982d90ea5dad104bb04fc107df2/docs/FEATURE_CATALOG.md#L191)
- 旧内容：Free Transform。（当時状態：Required）
- 判定：**改善して引き継いだ**。「Free Transform」の能力は以下の具体制御へ対応。
- 対応能力 [TRN-002](features/TRN.md#trn-002)：角と消失方向を操作、退化した形を無言確定しない。自由/パース/傾斜・四隅・消失方向。元内容を保持し再編集、焼込は明示。選択マスクの関係も固定
- 検証範囲：旧名/注記と新仕様の具体能力を対照。実装検証ではない。

## LC-142 — Perspective / Distort

- 旧出典：[docs/FEATURE_CATALOG.md:192](https://github.com/totoro0419/illustro_old/blob/bdc7135b51033982d90ea5dad104bb04fc107df2/docs/FEATURE_CATALOG.md#L192)
- 旧内容：Perspective / Distort。（当時状態：Required）
- 判定：**改善して引き継いだ**。「Perspective / Distort」の能力は以下の具体制御へ対応。
- 対応能力 [TRN-002](features/TRN.md#trn-002)：角と消失方向を操作、退化した形を無言確定しない。自由/パース/傾斜・四隅・消失方向。元内容を保持し再編集、焼込は明示。選択マスクの関係も固定
- 検証範囲：旧名/注記と新仕様の具体能力を対照。実装検証ではない。

## LC-143 — Warp

- 旧出典：[docs/FEATURE_CATALOG.md:193](https://github.com/totoro0419/illustro_old/blob/bdc7135b51033982d90ea5dad104bb04fc107df2/docs/FEATURE_CATALOG.md#L193)
- 旧内容：Warp。可能な限り非破壊（当時状態：Required）
- 判定：**改善して引き継いだ**。「Warp」の能力は以下の具体制御へ対応。
- 対応能力 [TRN-003](features/TRN.md#trn-003)：固定点と可動点を示し、追加/削除・範囲限定・再編集。メッシュ分割・固定点/可動点・ケージ・点追加削除。制御点/元内容/保護域を保存、一セッション一Undo
- 検証範囲：旧名/注記と新仕様の具体能力を対照。実装検証ではない。

## LC-144 — Liquify

- 旧出典：[docs/FEATURE_CATALOG.md:194](https://github.com/totoro0419/illustro_old/blob/bdc7135b51033982d90ea5dad104bb04fc107df2/docs/FEATURE_CATALOG.md#L194)
- 旧内容：Liquify。可能な限り非破壊（当時状態：Required）
- 判定：**改善して引き継いだ**。「Liquify」の能力は以下の具体制御へ対応。
- 対応能力 [TRN-004](features/TRN.md#trn-004)：押す/膨張/収縮/回転/復元、範囲/強さと保護マスク。押す/膨張/収縮/回転/復元・径/強さ/筆圧・保護マスク。筆ごとのセッション内Undo、全体適用は一Undo、変位状態を保存
- 検証範囲：旧名/注記と新仕様の具体能力を対照。実装検証ではない。

## LC-145 — Transform Interpolation

- 旧出典：[docs/FEATURE_CATALOG.md:195](https://github.com/totoro0419/illustro_old/blob/bdc7135b51033982d90ea5dad104bb04fc107df2/docs/FEATURE_CATALOG.md#L195)
- 旧内容：Transform Interpolation。方式未確定（当時状態：Required）
- 判定：**改善して引き継いだ**。「Transform Interpolation」の能力は以下の具体制御へ対応。
- 対応能力 [TRN-006](features/TRN.md#trn-006)：同一セッション中に元結果から評価、ピクセル用途は整数/最近傍を選ぶ。補間用途・整数整列・最近傍/滑らか候補。毎ドラッグの劣化を重ねず、一適用のみ。方式選定は未定
- 検証範囲：旧名/注記と新仕様の具体能力を対照。実装検証ではない。

## LC-146 — Adjustment Layer

- 旧出典：[docs/FEATURE_CATALOG.md:201](https://github.com/totoro0419/illustro_old/blob/bdc7135b51033982d90ea5dad104bb04fc107df2/docs/FEATURE_CATALOG.md#L201)
- 旧内容：Adjustment Layer。（当時状態：Required）
- 判定：**ほかの機能に統合した**。「Adjustment Layer」の能力は以下の具体制御へ対応。
- 対応能力 [FX-001](features/FX.md#fx-001)：明るさ/コントラスト/レベル/カーブ/露出/色相彩度/自然な彩度/色バランスを再編集。調整種別・全体/クリップ先・初期マスク。作成一Undo、元画素保持、個別調整欄を再度開ける
- 検証範囲：旧名/注記と新仕様の具体能力を対照。実装検証ではない。

## LC-147 — Filter Layer

- 旧出典：[docs/FEATURE_CATALOG.md:202](https://github.com/totoro0419/illustro_old/blob/bdc7135b51033982d90ea5dad104bb04fc107df2/docs/FEATURE_CATALOG.md#L202)
- 旧内容：Filter Layer。（当時状態：Required）
- 判定：**ほかの機能に統合した**。「Filter Layer」の能力は以下の具体制御へ対応。
- 対応能力 [FX-008](features/FX.md#fx-008)：有効/無効、並替、不透明度/合成、元との差分比較。有効/無効・並替・不透明度・合成・効果マスク。一並替一Undo、順序/各マスクを保存
- 検証範囲：旧名/注記と新仕様の具体能力を対照。実装検証ではない。

## LC-148 — Live Blur

- 旧出典：[docs/FEATURE_CATALOG.md:203](https://github.com/totoro0419/illustro_old/blob/bdc7135b51033982d90ea5dad104bb04fc107df2/docs/FEATURE_CATALOG.md#L203)
- 旧内容：Live Blur。（当時状態：Required）
- 判定：**改善して引き継いだ**。「Live Blur」の能力は以下の具体制御へ対応。
- 対応能力 [FX-003](features/FX.md#fx-003)：ガウス/ボックス/移動/放射/レンズ系の範囲・方向・強さを比較。ガウス/ボックス/移動/放射/深度。ライブ効果として保持、原画像は不変
- 検証範囲：旧名/注記と新仕様の具体能力を対照。実装検証ではない。

## LC-149 — Live Color Adjustment

- 旧出典：[docs/FEATURE_CATALOG.md:204](https://github.com/totoro0419/illustro_old/blob/bdc7135b51033982d90ea5dad104bb04fc107df2/docs/FEATURE_CATALOG.md#L204)
- 旧内容：Live Color Adjustment。（当時状態：Required）
- 判定：**改善して引き継いだ**。「Live Color Adjustment」の能力は以下の具体制御へ対応。
- 対応能力 [COL-009](features/COL.md#col-009)：全体/選択範囲を非破壊補正し、前後比較。色温度/Tint・全体/現在層/選択・強度。調整レイヤーとして再編集。選択は作成時マスクへ固定
- 検証範囲：旧名/注記と新仕様の具体能力を対照。実装検証ではない。

## LC-150 — Mask

- 旧出典：[docs/FEATURE_CATALOG.md:205](https://github.com/totoro0419/illustro_old/blob/bdc7135b51033982d90ea5dad104bb04fc107df2/docs/FEATURE_CATALOG.md#L205)
- 旧内容：Mask。（当時状態：Required）
- 判定：**ほかの機能に統合した**。「Mask」の能力は以下の具体制御へ対応。
- 対応能力 [LAY-005](features/LAY.md#lay-005)：白/黒/濃度、無効化・反転・適用・リンク、絵とマスクの対象を識別。画素/ベクターマスク・白黒/濃度・リンク・反転/無効/適用。マスク筆一Undo。適用は破壊変換、無効化は元保持、全てNative保存
- 検証範囲：旧名/注記と新仕様の具体能力を対照。実装検証ではない。

## LC-151 — Vector Mask

- 旧出典：[docs/FEATURE_CATALOG.md:206](https://github.com/totoro0419/illustro_old/blob/bdc7135b51033982d90ea5dad104bb04fc107df2/docs/FEATURE_CATALOG.md#L206)
- 旧内容：Vector Mask。（当時状態：Required / Investigate）
- 判定：**ほかの機能に統合した**。「Vector Mask」の能力は以下の具体制御へ対応。
- 対応能力 [LAY-005](features/LAY.md#lay-005)：白/黒/濃度、無効化・反転・適用・リンク、絵とマスクの対象を識別。画素/ベクターマスク・白黒/濃度・リンク・反転/無効/適用。マスク筆一Undo。適用は破壊変換、無効化は元保持、全てNative保存
- 検証範囲：旧名/注記と新仕様の具体能力を対照。実装検証ではない。

## LC-152 — Clipping Mask

- 旧出典：[docs/FEATURE_CATALOG.md:207](https://github.com/totoro0419/illustro_old/blob/bdc7135b51033982d90ea5dad104bb04fc107df2/docs/FEATURE_CATALOG.md#L207)
- 旧内容：Clipping Mask。（当時状態：Required）
- 判定：**ほかの機能に統合した**。「Clipping Mask」の能力は以下の具体制御へ対応。
- 対応能力 [LAY-004](features/LAY.md#lay-004)：二つの意味を分け、対象と現在状態を行で直ちに確認。クリップ元・クリップON/OFF・透明度ロック。設定変更一Undo。クリップは下層の見える形、Alpha Lockは現在層の既存α保持
- 検証範囲：旧名/注記と新仕様の具体能力を対照。実装検証ではない。

## LC-153 — Blend Mode

- 旧出典：[docs/FEATURE_CATALOG.md:208](https://github.com/totoro0419/illustro_old/blob/bdc7135b51033982d90ea5dad104bb04fc107df2/docs/FEATURE_CATALOG.md#L208)
- 旧内容：Blend Mode。Normal/Multiply/Screen/Overlay/Soft Light/Hard Light/Color Dodge/Burn/Linear Dodge/Burn/Darken/Lighten/Difference/Exclusion/Hue/Saturation/Color/Luminosity等をCore Setとする（当時状態：Core）
- 判定：**改善して引き継いだ**。「Blend Mode」の能力は以下の具体制御へ対応。
- 対応能力 [NDE-001](features/NDE.md#nde-001)：通常/乗算/スクリーン/覆焼/加算/差分/色相等を選択前に比較、選択で確定。Normal/Dissolve、暗く/明るく、Multiply/Screen/Burn/Dodge、Overlay/Soft/Hard/Vivid/Linear/Pin/HardMix、Difference/Exclusion/Subtract/Divide、Hue/Saturation/Color/Luminosity。合成名と強度を層に保存、一選択一Undo
- 検証範囲：旧名/注記と新仕様の具体能力を対照。実装検証ではない。

## LC-154 — Painting Blend Modes

- 旧出典：[docs/FEATURE_CATALOG.md:209](https://github.com/totoro0419/illustro_old/blob/bdc7135b51033982d90ea5dad104bb04fc107df2/docs/FEATURE_CATALOG.md#L209)
- 旧内容：Painting Blend Modes。Erase/Behind/Alpha関連等を描画Engineと統合（当時状態：Required）
- 判定：**改善して引き継いだ**。「Painting Blend Modes」の能力は以下の具体制御へ対応。
- 対応能力 [BRU-009](features/BRU.md#bru-009)：一筆内蓄積・筆を重ねた蓄積、不透明度と流量、消去/背面描画を区別。一筆内蓄積/次筆蓄積・流量/不透明度・Erase/Behind/Alpha関連。一筆内の重複と別筆を区別、Redoと確定像一致
- 検証範囲：旧名/注記と新仕様の具体能力を対照。実装検証ではない。

## LC-155 — Blend Mode Live Preview

- 旧出典：[docs/FEATURE_CATALOG.md:210](https://github.com/totoro0419/illustro_old/blob/bdc7135b51033982d90ea5dad104bb04fc107df2/docs/FEATURE_CATALOG.md#L210)
- 旧内容：Blend Mode Live Preview。Canvas上で即時比較（当時状態：Required）
- 判定：**改善して引き継いだ**。「Blend Mode Live Preview」の能力は以下の具体制御へ対応。
- 対応能力 [NDE-001](features/NDE.md#nde-001)：通常/乗算/スクリーン/覆焼/加算/差分/色相等を選択前に比較、選択で確定。Normal/Dissolve、暗く/明るく、Multiply/Screen/Burn/Dodge、Overlay/Soft/Hard/Vivid/Linear/Pin/HardMix、Difference/Exclusion/Subtract/Divide、Hue/Saturation/Color/Luminosity。合成名と強度を層に保存、一選択一Undo
- 検証範囲：旧名/注記と新仕様の具体能力を対照。実装検証ではない。

## LC-156 — Blend If 相当

- 旧出典：[docs/FEATURE_CATALOG.md:211](https://github.com/totoro0419/illustro_old/blob/bdc7135b51033982d90ea5dad104bb04fc107df2/docs/FEATURE_CATALOG.md#L211)
- 旧内容：Blend If 相当。より視覚的なUIへ再設計（当時状態：Core）
- 判定：**改善して引き継いだ**。「Blend If 相当」の能力は以下の具体制御へ対応。
- 対応能力 [NDE-002](features/NDE.md#nde-002)：自分/下地、チャンネル、範囲と滑らかさ、影響部分の可視化。自層/下地・輝度/RGB成分・上下境界と滑らかさ。範囲・チャンネル・滑らかさを保存、一セッション一Undo
- 検証範囲：旧名/注記と新仕様の具体能力を対照。実装検証ではない。

## LC-157 — Displacement

- 旧出典：[docs/FEATURE_CATALOG.md:212](https://github.com/totoro0419/illustro_old/blob/bdc7135b51033982d90ea5dad104bb04fc107df2/docs/FEATURE_CATALOG.md#L212)
- 旧内容：Displacement。（当時状態：Required / Investigate）
- 判定：**改善して引き継いだ**。「Displacement」の能力は以下の具体制御へ対応。
- 対応能力 [FX-128](features/FX.md#fx-128)：参照画像で位置を変位。マスク・強度・前後比較・再編集を保持。。変位元/版・X/Y強さ・基準値・座標Fit/原寸・縁。依存Mapと変位設定を保持、循環参照は拒否。設定/入力版/Mask/順序をNative保存。適用一Undo、再度開いて同じ制御を編集。取消は今回の設定だけ戻す
- 検証範囲：旧名/注記と新仕様の具体能力を対照。実装検証ではない。

## LC-158 — Healing

- 旧出典：[docs/FEATURE_CATALOG.md:213](https://github.com/totoro0419/illustro_old/blob/bdc7135b51033982d90ea5dad104bb04fc107df2/docs/FEATURE_CATALOG.md#L213)
- 旧内容：Healing。イラスト向けに最適化（当時状態：Required）
- 判定：**改善して引き継いだ**。「Healing」の能力は以下の具体制御へ対応。
- 対応能力 [FX-007](features/FX.md#fx-007)：採取元と適用先、整列/非整列、現在/複数層参照を可視化。修復/パッチ/クローン・源点/整列・参照層・径/境界なじみ。新しい修復層を選べ、一筆/一パッチ一Undo、元は保持
- 検証範囲：旧名/注記と新仕様の具体能力を対照。実装検証ではない。

## LC-159 — Patch

- 旧出典：[docs/FEATURE_CATALOG.md:214](https://github.com/totoro0419/illustro_old/blob/bdc7135b51033982d90ea5dad104bb04fc107df2/docs/FEATURE_CATALOG.md#L214)
- 旧内容：Patch。イラスト向けに最適化（当時状態：Required）
- 判定：**改善して引き継いだ**。「Patch」の能力は以下の具体制御へ対応。
- 対応能力 [FX-007](features/FX.md#fx-007)：採取元と適用先、整列/非整列、現在/複数層参照を可視化。修復/パッチ/クローン・源点/整列・参照層・径/境界なじみ。新しい修復層を選べ、一筆/一パッチ一Undo、元は保持
- 検証範囲：旧名/注記と新仕様の具体能力を対照。実装検証ではない。

## LC-160 — Clone

- 旧出典：[docs/FEATURE_CATALOG.md:215](https://github.com/totoro0419/illustro_old/blob/bdc7135b51033982d90ea5dad104bb04fc107df2/docs/FEATURE_CATALOG.md#L215)
- 旧内容：Clone。直接操作を重視（当時状態：Required）
- 判定：**改善して引き継いだ**。「Clone」の能力は以下の具体制御へ対応。
- 対応能力 [FX-007](features/FX.md#fx-007)：採取元と適用先、整列/非整列、現在/複数層参照を可視化。修復/パッチ/クローン・源点/整列・参照層・径/境界なじみ。新しい修復層を選べ、一筆/一パッチ一Undo、元は保持
- 検証範囲：旧名/注記と新仕様の具体能力を対照。実装検証ではない。

## LC-161 — Core Adjustment Set

- 旧出典：[docs/FEATURE_CATALOG.md:216](https://github.com/totoro0419/illustro_old/blob/bdc7135b51033982d90ea5dad104bb04fc107df2/docs/FEATURE_CATALOG.md#L216)
- 旧内容：Core Adjustment Set。Brightness/Contrast, Levels, Curves, Exposure, Hue/Saturation, Vibrance, Color Balance, Temperature/Tint, B&W, Channel Mixer, Selective Color, Invert, Posterize, Threshold, Gradient Map, LUT等（当時状態：Required）
- 判定：**改善して引き継いだ**。「Core Adjustment Set」の能力は以下の具体制御へ対応。
- 対応能力 [FX-001](features/FX.md#fx-001)：明るさ/コントラスト/レベル/カーブ/露出/色相彩度/自然な彩度/色バランスを再編集。調整種別・全体/クリップ先・初期マスク。作成一Undo、元画素保持、個別調整欄を再度開ける
- 対応能力 [FX-002](features/FX.md#fx-002)：白黒/色温度/チャンネルミキサー/選択色/反転/階調化/二値/Gradient Map/LUT。白黒/色温度/チャンネル/選択色/反転/階調/LUT。効果種類と全パラメータを保持、調整順序はFX-008
- 対応能力 [GRA-004](features/GRA.md#gra-004)：非破壊調整、色段階、出力のバンディング確認と抑制。明度→色停止点・階調数・ディザON/OFF。調整レイヤーとして保持、停止点をパレット再利用
- 検証範囲：旧名/注記と新仕様の具体能力を対照。実装検証ではない。

## LC-162 — Core Live Filter Set

- 旧出典：[docs/FEATURE_CATALOG.md:217](https://github.com/totoro0419/illustro_old/blob/bdc7135b51033982d90ea5dad104bb04fc107df2/docs/FEATURE_CATALOG.md#L217)
- 旧内容：Core Live Filter Set。Gaussian/Motion/Radial Blur, Sharpen, Unsharp Mask, High Pass, Noise, Median系, Pixelate/Mosaic, Offset, Displacement, Halftone等（当時状態：Required）
- 判定：**改善して引き継いだ**。「Core Live Filter Set」の能力は以下の具体制御へ対応。
- 対応能力 [FX-003](features/FX.md#fx-003)：ガウス/ボックス/移動/放射/レンズ系の範囲・方向・強さを比較。ガウス/ボックス/移動/放射/深度。ライブ効果として保持、原画像は不変
- 対応能力 [FX-004](features/FX.md#fx-004)：シャープ/アンシャープ/High Pass/加算ノイズ/Median/ごみ取り。シャープ/アンシャープ/HighPass/Noise/Median。元と効果を分離、ノイズ条件も保存
- 対応能力 [FX-005](features/FX.md#fx-005)：変位元・強さ・タイル/反復境界・ピクセル化を再編集。モザイク/オフセット/変位。変位元の版を保持し再編集
- 対応能力 [FX-129](features/FX.md#fx-129)：密度・線数・角度を指定。マスク・強度・前後比較・再編集を保持。。線数lpi/間隔px・角度・点形・密度・基準DPI・AA。網点設定と元濃度を保持、モノクロ出力と通常表示を分離。設定/入力版/Mask/順序をNative保存。適用一Undo、再度開いて同じ制御を編集。取消は今回の設定だけ戻す
- 検証範囲：旧名/注記と新仕様の具体能力を対照。実装検証ではない。

## LC-163 — Filter Masking / Reorder / Opacity / Blend

- 旧出典：[docs/FEATURE_CATALOG.md:218](https://github.com/totoro0419/illustro_old/blob/bdc7135b51033982d90ea5dad104bb04fc107df2/docs/FEATURE_CATALOG.md#L218)
- 旧内容：Filter Masking / Reorder / Opacity / Blend。非破壊Filterを組み合わせ可能にする（当時状態：Required）
- 判定：**改善して引き継いだ**。「Filter Masking / Reorder / Opacity / Blend」の能力は以下の具体制御へ対応。
- 対応能力 [FX-008](features/FX.md#fx-008)：有効/無効、並替、不透明度/合成、元との差分比較。有効/無効・並替・不透明度・合成・効果マスク。一並替一Undo、順序/各マスクを保存
- 検証範囲：旧名/注記と新仕様の具体能力を対照。実装検証ではない。

## LC-164 — Destructive Apply Command

- 旧出典：[docs/FEATURE_CATALOG.md:219](https://github.com/totoro0419/illustro_old/blob/bdc7135b51033982d90ea5dad104bb04fc107df2/docs/FEATURE_CATALOG.md#L219)
- 旧内容：Destructive Apply Command。明示操作として残す（当時状態：Required）
- 判定：**改善して引き継いだ**。「Destructive Apply Command」の能力は以下の具体制御へ対応。
- 対応能力 [FX-009](features/FX.md#fx-009)：非破壊状態の情報損失を理解して適用、原本保持のコピー案を提示。現在へ焼込/複製して焼込・解像度/色深度。焼込一Undo、原本保持コピーを標準推奨
- 検証範囲：旧名/注記と新仕様の具体能力を対照。実装検証ではない。

## LC-165 — Layer Style: Stroke

- 旧出典：[docs/FEATURE_CATALOG.md:220](https://github.com/totoro0419/illustro_old/blob/bdc7135b51033982d90ea5dad104bb04fc107df2/docs/FEATURE_CATALOG.md#L220)
- 旧内容：Layer Style: Stroke。非破壊（当時状態：Required）
- 判定：**改善して引き継いだ**。「Layer Style: Stroke」の能力は以下の具体制御へ対応。
- 対応能力 [FX-132](features/FX.md#fx-132)：太さと位置を指定。マスク・強度・前後比較・再編集を保持。。内/中央/外・幅px・色/Gradient/Pattern・角/結合。対象αに基づくStyle、元形状と分離し再編集。設定/入力版/Mask/順序をNative保存。適用一Undo、再度開いて同じ制御を編集。取消は今回の設定だけ戻す
- 検証範囲：旧名/注記と新仕様の具体能力を対照。実装検証ではない。

## LC-166 — Layer Style: Drop/Inner Shadow

- 旧出典：[docs/FEATURE_CATALOG.md:221](https://github.com/totoro0419/illustro_old/blob/bdc7135b51033982d90ea5dad104bb04fc107df2/docs/FEATURE_CATALOG.md#L221)
- 旧内容：Layer Style: Drop/Inner Shadow。非破壊（当時状態：Required）
- 判定：**改善して引き継いだ**。「Layer Style: Drop/Inner Shadow」の能力は以下の具体制御へ対応。
- 対応能力 [FX-133](features/FX.md#fx-133)：光源・距離・ぼけを指定。マスク・強度・前後比較・再編集を保持。。内/外・光角/距離px・Spread/Blur・色/不透明度・共有光源。Styleとして保持、共有光源の影響対象を表示。設定/入力版/Mask/順序をNative保存。適用一Undo、再度開いて同じ制御を編集。取消は今回の設定だけ戻す
- 検証範囲：旧名/注記と新仕様の具体能力を対照。実装検証ではない。

## LC-167 — Layer Style: Outer/Inner Glow

- 旧出典：[docs/FEATURE_CATALOG.md:222](https://github.com/totoro0419/illustro_old/blob/bdc7135b51033982d90ea5dad104bb04fc107df2/docs/FEATURE_CATALOG.md#L222)
- 旧内容：Layer Style: Outer/Inner Glow。非破壊（当時状態：Required）
- 判定：**改善して引き継いだ**。「Layer Style: Outer/Inner Glow」の能力は以下の具体制御へ対応。
- 対応能力 [FX-134](features/FX.md#fx-134)：光の色と広がりを指定。マスク・強度・前後比較・再編集を保持。。内/外・色・広がり/ぼけ・輪郭Curve・合成・強度。Styleを保存、加算等の合成を明示。設定/入力版/Mask/順序をNative保存。適用一Undo、再度開いて同じ制御を編集。取消は今回の設定だけ戻す
- 検証範囲：旧名/注記と新仕様の具体能力を対照。実装検証ではない。

## LC-168 — Layer Style: Color/Gradient/Pattern Overlay

- 旧出典：[docs/FEATURE_CATALOG.md:223](https://github.com/totoro0419/illustro_old/blob/bdc7135b51033982d90ea5dad104bb04fc107df2/docs/FEATURE_CATALOG.md#L223)
- 旧内容：Layer Style: Color/Gradient/Pattern Overlay。非破壊（当時状態：Required）
- 判定：**改善して引き継いだ**。「Layer Style: Color/Gradient/Pattern Overlay」の能力は以下の具体制御へ対応。
- 対応能力 [FX-135](features/FX.md#fx-135)：元の形へ塗りを重ねる。マスク・強度・前後比較・再編集を保持。。単色/Gradient/Pattern・不透明度/合成・模様倍率/角度/原点・形連動。Overlay種別ごとのデータ/依存を保持。設定/入力版/Mask/順序をNative保存。適用一Undo、再度開いて同じ制御を編集。取消は今回の設定だけ戻す
- 検証範囲：旧名/注記と新仕様の具体能力を対照。実装検証ではない。

## LC-169 — Layer Style: Bevel/Emboss

- 旧出典：[docs/FEATURE_CATALOG.md:224](https://github.com/totoro0419/illustro_old/blob/bdc7135b51033982d90ea5dad104bb04fc107df2/docs/FEATURE_CATALOG.md#L224)
- 旧内容：Layer Style: Bevel/Emboss。非破壊。優先度は他のIllustration機能より低くてもよい（当時状態：Required）
- 判定：**改善して引き継いだ**。「Layer Style: Bevel/Emboss」の能力は以下の具体制御へ対応。
- 対応能力 [FX-136](features/FX.md#fx-136)：立体的な縁と光を比較。マスク・強度・前後比較・再編集を保持。。内/外Bevel/Emboss・深さ/向き/Size/Softness・光角/高度・Highlight/Shadow。元形状からのStyle、光源と輪郭設定を保存。設定/入力版/Mask/順序をNative保存。適用一Undo、再度開いて同じ制御を編集。取消は今回の設定だけ戻す
- 検証範囲：旧名/注記と新仕様の具体能力を対照。実装検証ではない。

## LC-170 — Reference Workspace

- 旧出典：[docs/FEATURE_CATALOG.md:230](https://github.com/totoro0419/illustro_old/blob/bdc7135b51033982d90ea5dad104bb04fc107df2/docs/FEATURE_CATALOG.md#L230)
- 旧内容：Reference Workspace。（当時状態：Core）
- 判定：**改善して引き継いだ**。「Reference Workspace」の能力は以下の具体制御へ対応。
- 対応能力 [REF-001](features/REF.md#ref-001)：原画と独立した複数画像、グループ・保存・再配置。複数画像・グループ・前面表示・作品内/個人セット。Always-on-topはアプリ内資料の前面表示、OS全体最前面は利用環境ごと未確認。配置と資料集合をNativeへ保存、資料編集は名前付きUndo
- 検証範囲：旧名/注記と新仕様の具体能力を対照。実装検証ではない。

## LC-171 — 複数Reference

- 旧出典：[docs/FEATURE_CATALOG.md:231](https://github.com/totoro0419/illustro_old/blob/bdc7135b51033982d90ea5dad104bb04fc107df2/docs/FEATURE_CATALOG.md#L231)
- 旧内容：複数Reference。（当時状態：Required）
- 判定：**改善して引き継いだ**。「複数Reference」の能力は以下の具体制御へ対応。
- 対応能力 [REF-001](features/REF.md#ref-001)：原画と独立した複数画像、グループ・保存・再配置。複数画像・グループ・前面表示・作品内/個人セット。Always-on-topはアプリ内資料の前面表示、OS全体最前面は利用環境ごと未確認。配置と資料集合をNativeへ保存、資料編集は名前付きUndo
- 検証範囲：旧名/注記と新仕様の具体能力を対照。実装検証ではない。

## LC-172 — 自由配置

- 旧出典：[docs/FEATURE_CATALOG.md:232](https://github.com/totoro0419/illustro_old/blob/bdc7135b51033982d90ea5dad104bb04fc107df2/docs/FEATURE_CATALOG.md#L232)
- 旧内容：自由配置。（当時状態：Required）
- 判定：**改善して引き継いだ**。「自由配置」の能力は以下の具体制御へ対応。
- 対応能力 [REF-002](features/REF.md#ref-002)：資料の枠操作と画像内移動を区別、固定しても採色は可能。枠移動/画像内Pan・倍率/角度・ピン。配置は作品保存、ピンは資料設定、一操作一Undo
- 検証範囲：旧名/注記と新仕様の具体能力を対照。実装検証ではない。

## LC-173 — Pin

- 旧出典：[docs/FEATURE_CATALOG.md:233](https://github.com/totoro0419/illustro_old/blob/bdc7135b51033982d90ea5dad104bb04fc107df2/docs/FEATURE_CATALOG.md#L233)
- 旧内容：Pin。（当時状態：Required）
- 判定：**改善して引き継いだ**。「Pin」の能力は以下の具体制御へ対応。
- 対応能力 [REF-002](features/REF.md#ref-002)：資料の枠操作と画像内移動を区別、固定しても採色は可能。枠移動/画像内Pan・倍率/角度・ピン。配置は作品保存、ピンは資料設定、一操作一Undo
- 検証範囲：旧名/注記と新仕様の具体能力を対照。実装検証ではない。

## LC-174 — Scale / Rotate

- 旧出典：[docs/FEATURE_CATALOG.md:234](https://github.com/totoro0419/illustro_old/blob/bdc7135b51033982d90ea5dad104bb04fc107df2/docs/FEATURE_CATALOG.md#L234)
- 旧内容：Scale / Rotate。（当時状態：Required）
- 判定：**改善して引き継いだ**。「Scale / Rotate」の能力は以下の具体制御へ対応。
- 対応能力 [REF-002](features/REF.md#ref-002)：資料の枠操作と画像内移動を区別、固定しても採色は可能。枠移動/画像内Pan・倍率/角度・ピン。配置は作品保存、ピンは資料設定、一操作一Undo
- 検証範囲：旧名/注記と新仕様の具体能力を対照。実装検証ではない。

## LC-175 — Horizontal Flip

- 旧出典：[docs/FEATURE_CATALOG.md:235](https://github.com/totoro0419/illustro_old/blob/bdc7135b51033982d90ea5dad104bb04fc107df2/docs/FEATURE_CATALOG.md#L235)
- 旧内容：Horizontal Flip。（当時状態：Required）
- 判定：**改善して引き継いだ**。「Horizontal Flip」の能力は以下の具体制御へ対応。
- 対応能力 [REF-003](features/REF.md#ref-003)：表示加工は原画像や通常採色に焼かず、隠した配置を戻す。水平/垂直反転・グレー・一時非表示。一時検査はSession表示で作品Undo外、元画像不変
- 検証範囲：旧名/注記と新仕様の具体能力を対照。実装検証ではない。

## LC-176 — Grayscale

- 旧出典：[docs/FEATURE_CATALOG.md:236](https://github.com/totoro0419/illustro_old/blob/bdc7135b51033982d90ea5dad104bb04fc107df2/docs/FEATURE_CATALOG.md#L236)
- 旧内容：Grayscale。（当時状態：Required）
- 判定：**改善して引き継いだ**。「Grayscale」の能力は以下の具体制御へ対応。
- 対応能力 [REF-003](features/REF.md#ref-003)：表示加工は原画像や通常採色に焼かず、隠した配置を戻す。水平/垂直反転・グレー・一時非表示。一時検査はSession表示で作品Undo外、元画像不変
- 検証範囲：旧名/注記と新仕様の具体能力を対照。実装検証ではない。

## LC-177 — Always on Top

- 旧出典：[docs/FEATURE_CATALOG.md:237](https://github.com/totoro0419/illustro_old/blob/bdc7135b51033982d90ea5dad104bb04fc107df2/docs/FEATURE_CATALOG.md#L237)
- 旧内容：Always on Top。（当時状態：Required）
- 判定：**改善して引き継いだ**。「Always on Top」の能力は以下の具体制御へ対応。
- 対応能力 [REF-001](features/REF.md#ref-001)：原画と独立した複数画像、グループ・保存・再配置。複数画像・グループ・前面表示・作品内/個人セット。Always-on-topはアプリ内資料の前面表示、OS全体最前面は利用環境ごと未確認。配置と資料集合をNativeへ保存、資料編集は名前付きUndo
- 検証範囲：旧名/注記と新仕様の具体能力を対照。実装検証ではない。

## LC-178 — Temporary Hide

- 旧出典：[docs/FEATURE_CATALOG.md:238](https://github.com/totoro0419/illustro_old/blob/bdc7135b51033982d90ea5dad104bb04fc107df2/docs/FEATURE_CATALOG.md#L238)
- 旧内容：Temporary Hide。（当時状態：Required）
- 判定：**改善して引き継いだ**。「Temporary Hide」の能力は以下の具体制御へ対応。
- 対応能力 [REF-003](features/REF.md#ref-003)：表示加工は原画像や通常採色に焼かず、隠した配置を戻す。水平/垂直反転・グレー・一時非表示。一時検査はSession表示で作品Undo外、元画像不変
- 検証範囲：旧名/注記と新仕様の具体能力を対照。実装検証ではない。

## LC-179 — Reference Group

- 旧出典：[docs/FEATURE_CATALOG.md:239](https://github.com/totoro0419/illustro_old/blob/bdc7135b51033982d90ea5dad104bb04fc107df2/docs/FEATURE_CATALOG.md#L239)
- 旧内容：Reference Group。（当時状態：Required）
- 判定：**改善して引き継いだ**。「Reference Group」の能力は以下の具体制御へ対応。
- 対応能力 [REF-001](features/REF.md#ref-001)：原画と独立した複数画像、グループ・保存・再配置。複数画像・グループ・前面表示・作品内/個人セット。Always-on-topはアプリ内資料の前面表示、OS全体最前面は利用環境ごと未確認。配置と資料集合をNativeへ保存、資料編集は名前付きUndo
- 検証範囲：旧名/注記と新仕様の具体能力を対照。実装検証ではない。

## LC-180 — Reference Persistence

- 旧出典：[docs/FEATURE_CATALOG.md:240](https://github.com/totoro0419/illustro_old/blob/bdc7135b51033982d90ea5dad104bb04fc107df2/docs/FEATURE_CATALOG.md#L240)
- 旧内容：Reference Persistence。（当時状態：Required）
- 判定：**改善して引き継いだ**。「Reference Persistence」の能力は以下の具体制御へ対応。
- 対応能力 [REF-006](features/REF.md#ref-006)：埋込/リンク・出典・不足再指定、通常画像書出しには含めない。埋込/リンク・出典URL/作者/利用メモ・再指定。リンク/埋込と出典を保存、通常画像へは含めない
- 検証範囲：旧名/注記と新仕様の具体能力を対照。実装検証ではない。

## LC-181 — Reference Eyedropper

- 旧出典：[docs/FEATURE_CATALOG.md:241](https://github.com/totoro0419/illustro_old/blob/bdc7135b51033982d90ea5dad104bb04fc107df2/docs/FEATURE_CATALOG.md#L241)
- 旧内容：Reference Eyedropper。（当時状態：Core）
- 判定：**ほかの機能に統合した**。「Reference Eyedropper」の能力は以下の具体制御へ対応。
- 対応能力 [REF-004](features/REF.md#ref-004)：資料の元色を作品空間へ解釈、表示グレーを取る場合は明示。元色/表示色・点/平均・資料ICC。作品色空間へ解釈し色履歴に記録、資料原画像不変
- 検証範囲：旧名/注記と新仕様の具体能力を対照。実装検証ではない。

## LC-182 — Undo

- 旧出典：[docs/FEATURE_CATALOG.md:247](https://github.com/totoro0419/illustro_old/blob/bdc7135b51033982d90ea5dad104bb04fc107df2/docs/FEATURE_CATALOG.md#L247)
- 旧内容：Undo。深く・高速・安定（当時状態：Core）
- 判定：**改善して引き継いだ**。「Undo」の能力は以下の具体制御へ対応。
- 対応能力 [HIS-001](features/HIS.md#his-001)：一筆/一塗り/一ドラッグ/一処理の意図単位、対象名と履歴範囲を表示。Undo/Redo・対象名・履歴範囲。一筆/一塗り/一ドラッグ単位、採用済データは同一結果へRedo
- 検証範囲：旧名/注記と新仕様の具体能力を対照。実装検証ではない。

## LC-183 — Redo

- 旧出典：[docs/FEATURE_CATALOG.md:248](https://github.com/totoro0419/illustro_old/blob/bdc7135b51033982d90ea5dad104bb04fc107df2/docs/FEATURE_CATALOG.md#L248)
- 旧内容：Redo。（当時状態：Core）
- 判定：**改善して引き継いだ**。「Redo」の能力は以下の具体制御へ対応。
- 対応能力 [HIS-001](features/HIS.md#his-001)：一筆/一塗り/一ドラッグ/一処理の意図単位、対象名と履歴範囲を表示。Undo/Redo・対象名・履歴範囲。一筆/一塗り/一ドラッグ単位、採用済データは同一結果へRedo
- 検証範囲：旧名/注記と新仕様の具体能力を対照。実装検証ではない。

## LC-184 — Command単位履歴

- 旧出典：[docs/FEATURE_CATALOG.md:249](https://github.com/totoro0419/illustro_old/blob/bdc7135b51033982d90ea5dad104bb04fc107df2/docs/FEATURE_CATALOG.md#L249)
- 旧内容：Command単位履歴。可能な範囲で意味のある履歴（当時状態：Core）
- 判定：**改善して引き継いだ**。「Command単位履歴」の能力は以下の具体制御へ対応。
- 対応能力 [HIS-001](features/HIS.md#his-001)：一筆/一塗り/一ドラッグ/一処理の意図単位、対象名と履歴範囲を表示。Undo/Redo・対象名・履歴範囲。一筆/一塗り/一ドラッグ単位、採用済データは同一結果へRedo
- 検証範囲：旧名/注記と新仕様の具体能力を対照。実装検証ではない。

## LC-185 — Snapshot System

- 旧出典：[docs/FEATURE_CATALOG.md:250](https://github.com/totoro0419/illustro_old/blob/bdc7135b51033982d90ea5dad104bb04fc107df2/docs/FEATURE_CATALOG.md#L250)
- 旧内容：Snapshot System。明示的Checkpoint（当時状態：Core）
- 判定：**改善して引き継いだ**。「Snapshot System」の能力は以下の具体制御へ対応。
- 対応能力 [HIS-003](features/HIS.md#his-003)：名前・メモ・縮小画像、全編集状態を保持し無断削除しない。名前・メモ・縮小像・固定時点。編集可能な全状態を保持、名前付きは容量整理で無断削除しない
- 検証範囲：旧名/注記と新仕様の具体能力を対照。実装検証ではない。

## LC-186 — Snapshot比較

- 旧出典：[docs/FEATURE_CATALOG.md:251](https://github.com/totoro0419/illustro_old/blob/bdc7135b51033982d90ea5dad104bb04fc107df2/docs/FEATURE_CATALOG.md#L251)
- 旧内容：Snapshot比較。（当時状態：Required）
- 判定：**ほかの機能に統合した**。「Snapshot比較」の能力は以下の具体制御へ対応。
- 対応能力 [HIS-003](features/HIS.md#his-003)：名前・メモ・縮小画像、全編集状態を保持し無断削除しない。名前・メモ・縮小像・固定時点。編集可能な全状態を保持、名前付きは容量整理で無断削除しない
- 検証範囲：旧名/注記と新仕様の具体能力を対照。実装検証ではない。

## LC-187 — Snapshot分岐

- 旧出典：[docs/FEATURE_CATALOG.md:252](https://github.com/totoro0419/illustro_old/blob/bdc7135b51033982d90ea5dad104bb04fc107df2/docs/FEATURE_CATALOG.md#L252)
- 旧内容：Snapshot分岐。（当時状態：Required / Investigate）
- 判定：**改善して引き継いだ**。「Snapshot分岐」の能力は以下の具体制御へ対応。
- 対応能力 [HIS-004](features/HIS.md#his-004)：古い状態から編集しても元案を保護、Redo経路の変更を通知。分岐名・比較元・復帰先。元経路を保持し新分岐を保存、単純Undoと区別
- 検証範囲：旧名/注記と新仕様の具体能力を対照。実装検証ではない。

## LC-188 — History Panel

- 旧出典：[docs/FEATURE_CATALOG.md:253](https://github.com/totoro0419/illustro_old/blob/bdc7135b51033982d90ea5dad104bb04fc107df2/docs/FEATURE_CATALOG.md#L253)
- 旧内容：History Panel。UX未確定（当時状態：Required）
- 判定：**改善して引き継いだ**。「History Panel」の能力は以下の具体制御へ対応。
- 対応能力 [HIS-002](features/HIS.md#his-002)：開く/選択だけで作品を変えず、プレビュー→明示復元。時点/対象/比較・復元。比較はUndo外、復元は元現在を保護して一操作
- 検証範囲：旧名/注記と新仕様の具体能力を対照。実装検証ではない。

## LC-189 — 制作履歴ベースTimelapse

- 旧出典：[docs/FEATURE_CATALOG.md:259](https://github.com/totoro0419/illustro_old/blob/bdc7135b51033982d90ea5dad104bb04fc107df2/docs/FEATURE_CATALOG.md#L259)
- 旧内容：制作履歴ベースTimelapse。画面録画より履歴利用を優先（当時状態：Core）
- 判定：**改善して引き継いだ**。「制作履歴ベースTimelapse」の能力は以下の具体制御へ対応。
- 対応能力 [REC-001](features/REC.md#rec-001)：UIを含めず、削除素材/履歴整理で無言破損しない。記録ON/OFF・区間・UI除外・再生。作品変化を記録しUIを含めない、記録依存を保存
- 検証範囲：旧名/注記と新仕様の具体能力を対照。実装検証ではない。

## LC-190 — UIを含めない出力

- 旧出典：[docs/FEATURE_CATALOG.md:260](https://github.com/totoro0419/illustro_old/blob/bdc7135b51033982d90ea5dad104bb04fc107df2/docs/FEATURE_CATALOG.md#L260)
- 旧内容：UIを含めない出力。（当時状態：Required）
- 判定：**改善して引き継いだ**。「UIを含めない出力」の能力は以下の具体制御へ対応。
- 対応能力 [REC-001](features/REC.md#rec-001)：UIを含めず、削除素材/履歴整理で無言破損しない。記録ON/OFF・区間・UI除外・再生。作品変化を記録しUIを含めない、記録依存を保存
- 検証範囲：旧名/注記と新仕様の具体能力を対照。実装検証ではない。

## LC-191 — High-resolution Export

- 旧出典：[docs/FEATURE_CATALOG.md:261](https://github.com/totoro0419/illustro_old/blob/bdc7135b51033982d90ea5dad104bb04fc107df2/docs/FEATURE_CATALOG.md#L261)
- 旧内容：High-resolution Export。（当時状態：Required）
- 判定：**改善して引き継いだ**。「High-resolution Export」の能力は以下の具体制御へ対応。
- 対応能力 [REC-002](features/REC.md#rec-002)：区間/停止時間圧縮/最終静止/解像度/透かしを事前確認。区間/速度/停止圧縮/解像度/Frame pacing/最終静止/透かし。作品Undo外、出力時点固定、設定を保存
- 検証範囲：旧名/注記と新仕様の具体能力を対照。実装検証ではない。

## LC-192 — Frame Pace調整

- 旧出典：[docs/FEATURE_CATALOG.md:262](https://github.com/totoro0419/illustro_old/blob/bdc7135b51033982d90ea5dad104bb04fc107df2/docs/FEATURE_CATALOG.md#L262)
- 旧内容：Frame Pace調整。（当時状態：Required）
- 判定：**改善して引き継いだ**。「Frame Pace調整」の能力は以下の具体制御へ対応。
- 対応能力 [REC-002](features/REC.md#rec-002)：区間/停止時間圧縮/最終静止/解像度/透かしを事前確認。区間/速度/停止圧縮/解像度/Frame pacing/最終静止/透かし。作品Undo外、出力時点固定、設定を保存
- 検証範囲：旧名/注記と新仕様の具体能力を対照。実装検証ではない。

## LC-193 — Work Time

- 旧出典：[docs/FEATURE_CATALOG.md:263](https://github.com/totoro0419/illustro_old/blob/bdc7135b51033982d90ea5dad104bb04fc107df2/docs/FEATURE_CATALOG.md#L263)
- 旧内容：Work Time。実作業時間を測る（当時状態：Core）
- 判定：**改善して引き継いだ**。「Work Time」の能力は以下の具体制御へ対応。
- 対応能力 [REC-004](features/REC.md#rec-004)：Session/Today/Total/Average、手動停止、推定と実測を区別、誤集計補正。Session/Today/Total/Average・Idle除外・停止/手動補正。Offline集計、外部送信不要、補正履歴を保持
- 検証範囲：旧名/注記と新仕様の具体能力を対照。実装検証ではない。

## LC-194 — Session

- 旧出典：[docs/FEATURE_CATALOG.md:264](https://github.com/totoro0419/illustro_old/blob/bdc7135b51033982d90ea5dad104bb04fc107df2/docs/FEATURE_CATALOG.md#L264)
- 旧内容：Session。（当時状態：Required）
- 判定：**改善して引き継いだ**。「Session」の能力は以下の具体制御へ対応。
- 対応能力 [REC-004](features/REC.md#rec-004)：Session/Today/Total/Average、手動停止、推定と実測を区別、誤集計補正。Session/Today/Total/Average・Idle除外・停止/手動補正。Offline集計、外部送信不要、補正履歴を保持
- 検証範囲：旧名/注記と新仕様の具体能力を対照。実装検証ではない。

## LC-195 — Today

- 旧出典：[docs/FEATURE_CATALOG.md:265](https://github.com/totoro0419/illustro_old/blob/bdc7135b51033982d90ea5dad104bb04fc107df2/docs/FEATURE_CATALOG.md#L265)
- 旧内容：Today。（当時状態：Required）
- 判定：**改善して引き継いだ**。「Today」の能力は以下の具体制御へ対応。
- 対応能力 [REC-004](features/REC.md#rec-004)：Session/Today/Total/Average、手動停止、推定と実測を区別、誤集計補正。Session/Today/Total/Average・Idle除外・停止/手動補正。Offline集計、外部送信不要、補正履歴を保持
- 検証範囲：旧名/注記と新仕様の具体能力を対照。実装検証ではない。

## LC-196 — Total

- 旧出典：[docs/FEATURE_CATALOG.md:266](https://github.com/totoro0419/illustro_old/blob/bdc7135b51033982d90ea5dad104bb04fc107df2/docs/FEATURE_CATALOG.md#L266)
- 旧内容：Total。（当時状態：Required）
- 判定：**改善して引き継いだ**。「Total」の能力は以下の具体制御へ対応。
- 対応能力 [REC-004](features/REC.md#rec-004)：Session/Today/Total/Average、手動停止、推定と実測を区別、誤集計補正。Session/Today/Total/Average・Idle除外・停止/手動補正。Offline集計、外部送信不要、補正履歴を保持
- 検証範囲：旧名/注記と新仕様の具体能力を対照。実装検証ではない。

## LC-197 — Average

- 旧出典：[docs/FEATURE_CATALOG.md:267](https://github.com/totoro0419/illustro_old/blob/bdc7135b51033982d90ea5dad104bb04fc107df2/docs/FEATURE_CATALOG.md#L267)
- 旧内容：Average。（当時状態：Required）
- 判定：**改善して引き継いだ**。「Average」の能力は以下の具体制御へ対応。
- 対応能力 [REC-004](features/REC.md#rec-004)：Session/Today/Total/Average、手動停止、推定と実測を区別、誤集計補正。Session/Today/Total/Average・Idle除外・停止/手動補正。Offline集計、外部送信不要、補正履歴を保持
- 検証範囲：旧名/注記と新仕様の具体能力を対照。実装検証ではない。

## LC-198 — Inactivity除外

- 旧出典：[docs/FEATURE_CATALOG.md:268](https://github.com/totoro0419/illustro_old/blob/bdc7135b51033982d90ea5dad104bb04fc107df2/docs/FEATURE_CATALOG.md#L268)
- 旧内容：Inactivity除外。（当時状態：Required）
- 判定：**改善して引き継いだ**。「Inactivity除外」の能力は以下の具体制御へ対応。
- 対応能力 [REC-004](features/REC.md#rec-004)：Session/Today/Total/Average、手動停止、推定と実測を区別、誤集計補正。Session/Today/Total/Average・Idle除外・停止/手動補正。Offline集計、外部送信不要、補正履歴を保持
- 検証範囲：旧名/注記と新仕様の具体能力を対照。実装検証ではない。

## LC-199 — Auto Actions / Macros

- 旧出典：[docs/FEATURE_CATALOG.md:274](https://github.com/totoro0419/illustro_old/blob/bdc7135b51033982d90ea5dad104bb04fc107df2/docs/FEATURE_CATALOG.md#L274)
- 旧内容：Auto Actions / Macros。（当時状態：Core）
- 判定：**改善して引き継いだ**。「Auto Actions / Macros」の能力は以下の具体制御へ対応。
- 対応能力 [AUT-001](features/AUT.md#aut-001)：開始/停止、対象・パラメータ、並替/無効化、記録不可を事前表示。記録開始/停止・コマンド順/有効無効・パラメータ。マクロ定義は素材保存、記録操作は作品変更と区別
- 検証範囲：旧名/注記と新仕様の具体能力を対照。実装検証ではない。

## LC-200 — Action Recording

- 旧出典：[docs/FEATURE_CATALOG.md:275](https://github.com/totoro0419/illustro_old/blob/bdc7135b51033982d90ea5dad104bb04fc107df2/docs/FEATURE_CATALOG.md#L275)
- 旧内容：Action Recording。（当時状態：Required）
- 判定：**改善して引き継いだ**。「Action Recording」の能力は以下の具体制御へ対応。
- 対応能力 [AUT-001](features/AUT.md#aut-001)：開始/停止、対象・パラメータ、並替/無効化、記録不可を事前表示。記録開始/停止・コマンド順/有効無効・パラメータ。マクロ定義は素材保存、記録操作は作品変更と区別
- 検証範囲：旧名/注記と新仕様の具体能力を対照。実装検証ではない。

## LC-201 — Parameterized Action

- 旧出典：[docs/FEATURE_CATALOG.md:276](https://github.com/totoro0419/illustro_old/blob/bdc7135b51033982d90ea5dad104bb04fc107df2/docs/FEATURE_CATALOG.md#L276)
- 旧内容：Parameterized Action。（当時状態：Required / Investigate）
- 判定：**改善して引き継いだ**。「Parameterized Action」の能力は以下の具体制御へ対応。
- 対応能力 [AUT-002](features/AUT.md#aut-002)：特定レイヤー番号へ無言適用せず、現在対象/指定対象を確認。現在対象/指定対象・実行時入力/既定値。参照は意味的対象として保存、層番号の偶然一致に依存しない
- 検証範囲：旧名/注記と新仕様の具体能力を対照。実装検証ではない。

## LC-202 — Macro Preset

- 旧出典：[docs/FEATURE_CATALOG.md:277](https://github.com/totoro0419/illustro_old/blob/bdc7135b51033982d90ea5dad104bb04fc107df2/docs/FEATURE_CATALOG.md#L277)
- 旧内容：Macro Preset。（当時状態：Required）
- 判定：**改善して引き継いだ**。「Macro Preset」の能力は以下の具体制御へ対応。
- 対応能力 [AUT-005](features/AUT.md#aut-005)：Quick Menu/キー/検索/素材登録、依存を確認。マクロパネル/検索/キー/Quick Controller・依存。パックに必要依存を含める、受信後は実行前確認
- 検証範囲：旧名/注記と新仕様の具体能力を対照。実装検証ではない。

## LC-203 — Shortcut Assignment

- 旧出典：[docs/FEATURE_CATALOG.md:278](https://github.com/totoro0419/illustro_old/blob/bdc7135b51033982d90ea5dad104bb04fc107df2/docs/FEATURE_CATALOG.md#L278)
- 旧内容：Shortcut Assignment。（当時状態：Required）
- 判定：**改善して引き継いだ**。「Shortcut Assignment」の能力は以下の具体制御へ対応。
- 対応能力 [AUT-005](features/AUT.md#aut-005)：Quick Menu/キー/検索/素材登録、依存を確認。マクロパネル/検索/キー/Quick Controller・依存。パックに必要依存を含める、受信後は実行前確認
- 検証範囲：旧名/注記と新仕様の具体能力を対照。実装検証ではない。

## LC-204 — Quick Menu登録

- 旧出典：[docs/FEATURE_CATALOG.md:279](https://github.com/totoro0419/illustro_old/blob/bdc7135b51033982d90ea5dad104bb04fc107df2/docs/FEATURE_CATALOG.md#L279)
- 旧内容：Quick Menu登録。（当時状態：Required）
- 判定：**ほかの機能に統合した**。「Quick Menu登録」の能力は以下の具体制御へ対応。
- 対応能力 [AUT-005](features/AUT.md#aut-005)：Quick Menu/キー/検索/素材登録、依存を確認。マクロパネル/検索/キー/Quick Controller・依存。パックに必要依存を含める、受信後は実行前確認
- 検証範囲：旧名/注記と新仕様の具体能力を対照。実装検証ではない。

## LC-205 — Canvas First

- 旧出典：[docs/FEATURE_CATALOG.md:285](https://github.com/totoro0419/illustro_old/blob/bdc7135b51033982d90ea5dad104bb04fc107df2/docs/FEATURE_CATALOG.md#L285)
- 旧内容：Canvas First。上位設計原則（当時状態：Core）
- 判定：**改善して引き継いだ**。「Canvas First」の能力は以下の具体制御へ対応。
- 対応能力 [UI-001](features/UI.md#ui-001)：左ツール・右幅調整Workspace・中央キャンバス、黄橙アクセント、色評価は中立周囲色。明るいAurora・黄橙アクセント・左ツール・右Workspace幅・中央Canvas。配置はWorkspace、作品画素と分離。色評価部は中立の周囲色
- 検証範囲：旧名/注記と新仕様の具体能力を対照。実装検証ではない。

## LC-206 — Direct Manipulation

- 旧出典：[docs/FEATURE_CATALOG.md:286](https://github.com/totoro0419/illustro_old/blob/bdc7135b51033982d90ea5dad104bb04fc107df2/docs/FEATURE_CATALOG.md#L286)
- 旧内容：Direct Manipulation。上位設計原則（当時状態：Core）
- 判定：**改善して引き継いだ**。「Direct Manipulation」の能力は以下の具体制御へ対応。
- 対応能力 [UI-003](features/UI.md#ui-003)：ツール/描画先/参照元/選択/未確定状態を短く表示し操作位置を安定。ツール・描画先・参照元・選択・未確定の対象帯。文書の選択状態を保持、表示密度はWorkspace
- 検証範囲：旧名/注記と新仕様の具体能力を対照。実装検証ではない。

## LC-207 — Context UI

- 旧出典：[docs/FEATURE_CATALOG.md:287](https://github.com/totoro0419/illustro_old/blob/bdc7135b51033982d90ea5dad104bb04fc107df2/docs/FEATURE_CATALOG.md#L287)
- 旧内容：Context UI。（当時状態：Core）
- 判定：**改善して引き継いだ**。「Context UI」の能力は以下の具体制御へ対応。
- 対応能力 [UI-003](features/UI.md#ui-003)：ツール/描画先/参照元/選択/未確定状態を短く表示し操作位置を安定。ツール・描画先・参照元・選択・未確定の対象帯。文書の選択状態を保持、表示密度はWorkspace
- 検証範囲：旧名/注記と新仕様の具体能力を対照。実装検証ではない。

## LC-208 — Quick Menu

- 旧出典：[docs/FEATURE_CATALOG.md:288](https://github.com/totoro0419/illustro_old/blob/bdc7135b51033982d90ea5dad104bb04fc107df2/docs/FEATURE_CATALOG.md#L288)
- 旧内容：Quick Menu。ユーザーカスタマイズ可能（当時状態：Core）
- 判定：**改善して引き継いだ**。「Quick Menu」の能力は以下の具体制御へ対応。
- 対応能力 [UI-004](features/UI.md#ui-004)：表示入口、固定スロット、左右Undo/Redoを優先候補、描画を隠さない。明示トリガー・固定スロット・登録種別/ラベル/アイコン/キー/グループ。登録は個人設定、ツール/コマンド/筆/色/マクロ/層/Canvas操作を保持
- 検証範囲：旧名/注記と新仕様の具体能力を対照。実装検証ではない。

## LC-209 — Command / Tool Search

- 旧出典：[docs/FEATURE_CATALOG.md:289](https://github.com/totoro0419/illustro_old/blob/bdc7135b51033982d90ea5dad104bb04fc107df2/docs/FEATURE_CATALOG.md#L289)
- 旧内容：Command / Tool Search。機能発見性（当時状態：Required）
- 判定：**改善して引き継いだ**。「Command / Tool Search」の能力は以下の具体制御へ対応。
- 対応能力 [UI-005](features/UI.md#ui-005)：ツール/機能/ブラシ/層/設定/マクロ、使えない理由と固定登録。機能/ツール/筆/層/設定/マクロ・日本語別名。検索履歴は個人、機能IDは表示言語と独立
- 検証範囲：旧名/注記と新仕様の具体能力を対照。実装検証ではない。

## LC-210 — Dock Panel

- 旧出典：[docs/FEATURE_CATALOG.md:290](https://github.com/totoro0419/illustro_old/blob/bdc7135b51033982d90ea5dad104bb04fc107df2/docs/FEATURE_CATALOG.md#L290)
- 旧内容：Dock Panel。PC系（当時状態：Required）
- 判定：**改善して引き継いだ**。「Dock Panel」の能力は以下の具体制御へ対応。
- 対応能力 [UI-002](features/UI.md#ui-002)：意味のある単位の移動/拡縮/再Dock、被りすぎを防ぎリセット可能。折畳/並替/持出/Float/Dock/幅高さ・閉じる。配置変更はWorkspace保存、作品Undo外
- 検証範囲：旧名/注記と新仕様の具体能力を対照。実装検証ではない。

## LC-211 — Undock / Floating

- 旧出典：[docs/FEATURE_CATALOG.md:291](https://github.com/totoro0419/illustro_old/blob/bdc7135b51033982d90ea5dad104bb04fc107df2/docs/FEATURE_CATALOG.md#L291)
- 旧内容：Undock / Floating。PC系（当時状態：Required）
- 判定：**改善して引き継いだ**。「Undock / Floating」の能力は以下の具体制御へ対応。
- 対応能力 [UI-002](features/UI.md#ui-002)：意味のある単位の移動/拡縮/再Dock、被りすぎを防ぎリセット可能。折畳/並替/持出/Float/Dock/幅高さ・閉じる。配置変更はWorkspace保存、作品Undo外
- 検証範囲：旧名/注記と新仕様の具体能力を対照。実装検証ではない。

## LC-212 — Panel Resize / Reorder / Hide

- 旧出典：[docs/FEATURE_CATALOG.md:292](https://github.com/totoro0419/illustro_old/blob/bdc7135b51033982d90ea5dad104bb04fc107df2/docs/FEATURE_CATALOG.md#L292)
- 旧内容：Panel Resize / Reorder / Hide。（当時状態：Required）
- 判定：**改善して引き継いだ**。「Panel Resize / Reorder / Hide」の能力は以下の具体制御へ対応。
- 対応能力 [UI-002](features/UI.md#ui-002)：意味のある単位の移動/拡縮/再Dock、被りすぎを防ぎリセット可能。折畳/並替/持出/Float/Dock/幅高さ・閉じる。配置変更はWorkspace保存、作品Undo外
- 検証範囲：旧名/注記と新仕様の具体能力を対照。実装検証ではない。

## LC-213 — Workspace Save / Load

- 旧出典：[docs/FEATURE_CATALOG.md:293](https://github.com/totoro0419/illustro_old/blob/bdc7135b51033982d90ea5dad104bb04fc107df2/docs/FEATURE_CATALOG.md#L293)
- 旧内容：Workspace Save / Load。（当時状態：Required）
- 判定：**改善して引き継いだ**。「Workspace Save / Load」の能力は以下の具体制御へ対応。
- 対応能力 [UI-006](features/UI.md#ui-006)：配置・密度・利き手を保存、表示枠縮小でも主要機能が消えない。配置/密度/利き手・Toolbar編集・Drawing/Painting/Coloring/Photo/Pixel/Minimal。左右反転はパネル/Popup/Quick Controllerまで、個人設定保存
- 検証範囲：旧名/注記と新仕様の具体能力を対照。実装検証ではない。

## LC-214 — Canvas Focus Mode

- 旧出典：[docs/FEATURE_CATALOG.md:294](https://github.com/totoro0419/illustro_old/blob/bdc7135b51033982d90ea5dad104bb04fc107df2/docs/FEATURE_CATALOG.md#L294)
- 旧内容：Canvas Focus Mode。一操作で非必須UIを隠しCanvas面積最大化（当時状態：Core）
- 判定：**改善して引き継いだ**。「Canvas Focus Mode」の能力は以下の具体制御へ対応。
- 対応能力 [UI-007](features/UI.md#ui-007)：ツール/選択/対象を保持、画面内解除口と重大保存エラーを残す。Focus/全画面/一時UI・解除。選択/ツール/対象保持、作品Undo外
- 検証範囲：旧名/注記と新仕様の具体能力を対照。実装検証ではない。

## LC-215 — Workspace Preset

- 旧出典：[docs/FEATURE_CATALOG.md:295](https://github.com/totoro0419/illustro_old/blob/bdc7135b51033982d90ea5dad104bb04fc107df2/docs/FEATURE_CATALOG.md#L295)
- 旧内容：Workspace Preset。Drawing/Painting/Coloring等（当時状態：Required）
- 判定：**改善して引き継いだ**。「Workspace Preset」の能力は以下の具体制御へ対応。
- 対応能力 [UI-006](features/UI.md#ui-006)：配置・密度・利き手を保存、表示枠縮小でも主要機能が消えない。配置/密度/利き手・Toolbar編集・Drawing/Painting/Coloring/Photo/Pixel/Minimal。左右反転はパネル/Popup/Quick Controllerまで、個人設定保存
- 検証範囲：旧名/注記と新仕様の具体能力を対照。実装検証ではない。

## LC-216 — 左右UI反転

- 旧出典：[docs/FEATURE_CATALOG.md:296](https://github.com/totoro0419/illustro_old/blob/bdc7135b51033982d90ea5dad104bb04fc107df2/docs/FEATURE_CATALOG.md#L296)
- 旧内容：左右UI反転。Toolbarだけに限定しない（当時状態：Required）
- 判定：**改善して引き継いだ**。「左右UI反転」の能力は以下の具体制御へ対応。
- 対応能力 [UI-006](features/UI.md#ui-006)：配置・密度・利き手を保存、表示枠縮小でも主要機能が消えない。配置/密度/利き手・Toolbar編集・Drawing/Painting/Coloring/Photo/Pixel/Minimal。左右反転はパネル/Popup/Quick Controllerまで、個人設定保存
- 検証範囲：旧名/注記と新仕様の具体能力を対照。実装検証ではない。

## LC-217 — Keyboard Shortcut

- 旧出典：[docs/FEATURE_CATALOG.md:297](https://github.com/totoro0419/illustro_old/blob/bdc7135b51033982d90ea5dad104bb04fc107df2/docs/FEATURE_CATALOG.md#L297)
- 旧内容：Keyboard Shortcut。PC（当時状態：Core）
- 判定：**改善して引き継いだ**。「Keyboard Shortcut」の能力は以下の具体制御へ対応。
- 対応能力 [GST-002](features/GST.md#gst-002)：実際に押して登録、保持/切替/単発、複数割当、予約キー・競合を説明。修飾/論理キー/物理キー/表示名・複数割当・衝突/予約。修飾単体は既定で割当対象外。高度許可は比較検証待ち。Default/Userを分離、解除はCommand削除ではない。修飾単体は既定対象外
- 検証範囲：旧名/注記と新仕様の具体能力を対照。実装検証ではない。

## LC-218 — Gesture

- 旧出典：[docs/FEATURE_CATALOG.md:298](https://github.com/totoro0419/illustro_old/blob/bdc7135b51033982d90ea5dad104bb04fc107df2/docs/FEATURE_CATALOG.md#L298)
- 旧内容：Gesture。Touch Device（当時状態：Core）
- 判定：**改善して引き継いだ**。「Gesture」の能力は以下の具体制御へ対応。
- 対応能力 [GST-001](features/GST.md#gst-001)：ピンチ表示、Undo/Redo等、誤認識時に線や範囲を勝手に消さない。ピンチ/回転/Pan・二指Undo/三指Redo候補・ON/OFF。ジェスチャー自体はUndo外、呼んだコマンドと同じ意味
- 検証範囲：旧名/注記と新仕様の具体能力を対照。実装検証ではない。

## LC-219 — Hover

- 旧出典：[docs/FEATURE_CATALOG.md:299](https://github.com/totoro0419/illustro_old/blob/bdc7135b51033982d90ea5dad104bb04fc107df2/docs/FEATURE_CATALOG.md#L299)
- 旧内容：Hover。対応環境（当時状態：Required）
- 判定：**改善して引き継いだ**。「Hover」の能力は以下の具体制御へ対応。
- 対応能力 [INP-006](features/INP.md#inp-006)：サイズ・中心・消去領域を表示、Hover不可でもサイズ確認の入口を持つ。輪郭/中心/実寸・高コントラスト・最小表示径。カーソル設定は個人設定、書出し対象外
- 検証範囲：旧名/注記と新仕様の具体能力を対照。実装検証ではない。

## LC-220 — 右クリック / Context Click

- 旧出典：[docs/FEATURE_CATALOG.md:300](https://github.com/totoro0419/illustro_old/blob/bdc7135b51033982d90ea5dad104bb04fc107df2/docs/FEATURE_CATALOG.md#L300)
- 旧内容：右クリック / Context Click。重要機能をここだけに隠さない（当時状態：Required）
- 判定：**改善して引き継いだ**。「右クリック / Context Click」の能力は以下の具体制御へ対応。
- 対応能力 [UI-005](features/UI.md#ui-005)：ツール/機能/ブラシ/層/設定/マクロ、使えない理由と固定登録。機能/ツール/筆/層/設定/マクロ・日本語別名。検索履歴は個人、機能IDは表示言語と独立
- 検証範囲：旧名/注記と新仕様の具体能力を対照。実装検証ではない。

## LC-221 — Custom Toolbar

- 旧出典：[docs/FEATURE_CATALOG.md:301](https://github.com/totoro0419/illustro_old/blob/bdc7135b51033982d90ea5dad104bb04fc107df2/docs/FEATURE_CATALOG.md#L301)
- 旧内容：Custom Toolbar。（当時状態：Required）
- 判定：**改善して引き継いだ**。「Custom Toolbar」の能力は以下の具体制御へ対応。
- 対応能力 [UI-006](features/UI.md#ui-006)：配置・密度・利き手を保存、表示枠縮小でも主要機能が消えない。配置/密度/利き手・Toolbar編集・Drawing/Painting/Coloring/Photo/Pixel/Minimal。左右反転はパネル/Popup/Quick Controllerまで、個人設定保存
- 検証範囲：旧名/注記と新仕様の具体能力を対照。実装検証ではない。

## LC-222 — Custom Shortcut

- 旧出典：[docs/FEATURE_CATALOG.md:302](https://github.com/totoro0419/illustro_old/blob/bdc7135b51033982d90ea5dad104bb04fc107df2/docs/FEATURE_CATALOG.md#L302)
- 旧内容：Custom Shortcut。Press-to-bind方式。実際にキーを押して登録し、衝突検出・複数割当・解除・予約キー警告を行う（当時状態：Required）
- 判定：**改善して引き継いだ**。「Custom Shortcut」の能力は以下の具体制御へ対応。
- 対応能力 [GST-002](features/GST.md#gst-002)：実際に押して登録、保持/切替/単発、複数割当、予約キー・競合を説明。修飾/論理キー/物理キー/表示名・複数割当・衝突/予約。修飾単体は既定で割当対象外。高度許可は比較検証待ち。Default/Userを分離、解除はCommand削除ではない。修飾単体は既定対象外
- 検証範囲：旧名/注記と新仕様の具体能力を対照。実装検証ではない。

## LC-223 — Keyboard Shortcut Capture

- 旧出典：[docs/FEATURE_CATALOG.md:303](https://github.com/totoro0419/illustro_old/blob/bdc7135b51033982d90ea5dad104bb04fc107df2/docs/FEATURE_CATALOG.md#L303)
- 旧内容：Keyboard Shortcut Capture。実Keyboard Eventからmodifier/key/codeを取得。表示文字列だけを保存しない（当時状態：Required）
- 判定：**改善して引き継いだ**。「Keyboard Shortcut Capture」の能力は以下の具体制御へ対応。
- 対応能力 [GST-002](features/GST.md#gst-002)：実際に押して登録、保持/切替/単発、複数割当、予約キー・競合を説明。修飾/論理キー/物理キー/表示名・複数割当・衝突/予約。修飾単体は既定で割当対象外。高度許可は比較検証待ち。Default/Userを分離、解除はCommand削除ではない。修飾単体は既定対象外
- 検証範囲：旧名/注記と新仕様の具体能力を対照。実装検証ではない。

## LC-224 — Custom Gesture

- 旧出典：[docs/FEATURE_CATALOG.md:304](https://github.com/totoro0419/illustro_old/blob/bdc7135b51033982d90ea5dad104bb04fc107df2/docs/FEATURE_CATALOG.md#L304)
- 旧内容：Custom Gesture。（当時状態：Required）
- 判定：**改善して引き継いだ**。「Custom Gesture」の能力は以下の具体制御へ対応。
- 対応能力 [GST-003](features/GST.md#gst-003)：実入力可能な操作だけ登録、使用文脈・OS競合、初期値へ復帰。入力種/文脈・保持/単発/切替・OS競合。個人設定として保存、意味は端末間で維持
- 検証範囲：旧名/注記と新仕様の具体能力を対照。実装検証ではない。

## LC-225 — Scalable UI / Text

- 旧出典：[docs/FEATURE_CATALOG.md:305](https://github.com/totoro0419/illustro_old/blob/bdc7135b51033982d90ea5dad104bb04fc107df2/docs/FEATURE_CATALOG.md#L305)
- 旧内容：Scalable UI / Text。Accessibility（当時状態：Required）
- 判定：**改善して引き継いだ**。「Scalable UI / Text」の能力は以下の具体制御へ対応。
- 対応能力 [A11-001](features/A11.md#a11-001)：表示拡大で確定/取消を隠さず、色以外の状態表示。UI/Text倍率・高Contrast・状態記号。個人設定、作品不変
- 検証範囲：旧名/注記と新仕様の具体能力を対照。実装検証ではない。

## LC-226 — Single-pointer Alternative

- 旧出典：[docs/FEATURE_CATALOG.md:306](https://github.com/totoro0419/illustro_old/blob/bdc7135b51033982d90ea5dad104bb04fc107df2/docs/FEATURE_CATALOG.md#L306)
- 旧内容：Single-pointer Alternative。Multi-touch必須操作に代替手段を用意（当時状態：Required）
- 判定：**改善して引き継いだ**。「Single-pointer Alternative」の能力は以下の具体制御へ対応。
- 対応能力 [A11-002](features/A11.md#a11-002)：拡縮回転/並替/パネル移動へボタン・数値・移動先選択。表示倍率/角度・並替/移動先・ボタン標的サイズ。同一Commandを呼び端末で意味を変えない
- 検証範囲：旧名/注記と新仕様の具体能力を対照。実装検証ではない。

## LC-227 — Color-independent State Indication

- 旧出典：[docs/FEATURE_CATALOG.md:307](https://github.com/totoro0419/illustro_old/blob/bdc7135b51033982d90ea5dad104bb04fc107df2/docs/FEATURE_CATALOG.md#L307)
- 旧内容：Color-independent State Indication。色だけで状態を伝えない（当時状態：Required）
- 判定：**改善して引き継いだ**。「Color-independent State Indication」の能力は以下の具体制御へ対応。
- 対応能力 [A11-001](features/A11.md#a11-001)：表示拡大で確定/取消を隠さず、色以外の状態表示。UI/Text倍率・高Contrast・状態記号。個人設定、作品不変
- 検証範囲：旧名/注記と新仕様の具体能力を対照。実装検証ではない。

## LC-228 — Color Description Assistance

- 旧出典：[docs/FEATURE_CATALOG.md:308](https://github.com/totoro0419/illustro_old/blob/bdc7135b51033982d90ea5dad104bb04fc107df2/docs/FEATURE_CATALOG.md#L308)
- 旧内容：Color Description Assistance。色覚支援（当時状態：Required）
- 判定：**改善して引き継いだ**。「Color Description Assistance」の能力は以下の具体制御へ対応。
- 対応能力 [A11-004](features/A11.md#a11-004)：色名/値・選択表示、全体補正、効果を過剰に強制しない。色名/数値・グレー/色覚表示・補正。補助は表示設定、元作品は不変
- 検証範囲：旧名/注記と新仕様の具体能力を対照。実装検証ではない。

## LC-229 — Reduced Motion

- 旧出典：[docs/FEATURE_CATALOG.md:309](https://github.com/totoro0419/illustro_old/blob/bdc7135b51033982d90ea5dad104bb04fc107df2/docs/FEATURE_CATALOG.md#L309)
- 旧内容：Reduced Motion。Motionを減らす設定（当時状態：Required）
- 判定：**改善して引き継いだ**。「Reduced Motion」の能力は以下の具体制御へ対応。
- 対応能力 [A11-005](features/A11.md#a11-005)：低減Motion、音振動の個別OFF、重要通知を感覚一種類に依存しない。Reduced Motion・音/振動の個別ON/OFF。個人設定として保存
- 検証範囲：旧名/注記と新仕様の具体能力を対照。実装検証ではない。

## LC-230 — Touch Target Policy

- 旧出典：[docs/FEATURE_CATALOG.md:310](https://github.com/totoro0419/illustro_old/blob/bdc7135b51033982d90ea5dad104bb04fc107df2/docs/FEATURE_CATALOG.md#L310)
- 旧内容：Touch Target Policy。Touch環境で十分なHit Areaを確保（当時状態：Required）
- 判定：**改善して引き継いだ**。「Touch Target Policy」の能力は以下の具体制御へ対応。
- 対応能力 [A11-002](features/A11.md#a11-002)：拡縮回転/並替/パネル移動へボタン・数値・移動先選択。表示倍率/角度・並替/移動先・ボタン標的サイズ。同一Commandを呼び端末で意味を変えない
- 検証範囲：旧名/注記と新仕様の具体能力を対照。実装検証ではない。

## LC-231 — Feedback Sound / Haptic

- 旧出典：[docs/FEATURE_CATALOG.md:311](https://github.com/totoro0419/illustro_old/blob/bdc7135b51033982d90ea5dad104bb04fc107df2/docs/FEATURE_CATALOG.md#L311)
- 旧内容：Feedback Sound / Haptic。Platform対応時（当時状態：Required / Investigate）
- 判定：**改善して引き継いだ**。「Feedback Sound / Haptic」の能力は以下の具体制御へ対応。
- 対応能力 [A11-005](features/A11.md#a11-005)：低減Motion、音振動の個別OFF、重要通知を感覚一種類に依存しない。Reduced Motion・音/振動の個別ON/OFF。個人設定として保存
- 検証範囲：旧名/注記と新仕様の具体能力を対照。実装検証ではない。

## LC-232 — Keyboard Navigation for Commands

- 旧出典：[docs/FEATURE_CATALOG.md:312](https://github.com/totoro0419/illustro_old/blob/bdc7135b51033982d90ea5dad104bb04fc107df2/docs/FEATURE_CATALOG.md#L312)
- 旧内容：Keyboard Navigation for Commands。描画以外の主要操作を中心に（当時状態：Required）
- 判定：**改善して引き継いだ**。「Keyboard Navigation for Commands」の能力は以下の具体制御へ対応。
- 対応能力 [A11-003](features/A11.md#a11-003)：対象/状態/値・フォーカス・読み上げ、固有の描線経路以外を操作可能にする。フォーカス順・対象/状態/値・ラベル。支援設定は個人、焦点をモーダル内に迷子にしない
- 検証範囲：旧名/注記と新仕様の具体能力を対照。実装検証ではない。

## LC-233 — Desktop専用最適化UI

- 旧出典：[docs/FEATURE_CATALOG.md:318](https://github.com/totoro0419/illustro_old/blob/bdc7135b51033982d90ea5dad104bb04fc107df2/docs/FEATURE_CATALOG.md#L318)
- 旧内容：Desktop専用最適化UI。Keyboard/Mouse/Pen/Panel/Hover（当時状態：Core）
- 判定：**改善して引き継いだ**。「Desktop専用最適化UI」の能力は以下の具体制御へ対応。
- 対応能力 [DEV-001](features/DEV.md#dev-001)：キーボード/マウス/ペンタブ/トラックパッド、密度調整、複数パネル。マウス/ペン/Trackpad/Keyboard・密度・複数パネル。文書の意味は他端末と同一、配置のみ個人設定
- 検証範囲：旧名/注記と新仕様の具体能力を対照。実装検証ではない。

## LC-234 — Tablet専用最適化UI

- 旧出典：[docs/FEATURE_CATALOG.md:319](https://github.com/totoro0419/illustro_old/blob/bdc7135b51033982d90ea5dad104bb04fc107df2/docs/FEATURE_CATALOG.md#L319)
- 旧内容：Tablet専用最適化UI。Pen/Touch/片手/Canvas面積（当時状態：Core）
- 判定：**改善して引き継いだ**。「Tablet専用最適化UI」の能力は以下の具体制御へ対応。
- 対応能力 [DEV-002](features/DEV.md#dev-002)：ペン描画と指ナビ、片手到達、分割画面、外部キーボード着脱。ペン描画/指ナビ・片手到達・分割画面。外部Keyboard着脱で文書状態不変
- 検証範囲：旧名/注記と新仕様の具体能力を対照。実装検証ではない。

## LC-235 — Smartphone専用最適化UI

- 旧出典：[docs/FEATURE_CATALOG.md:320](https://github.com/totoro0419/illustro_old/blob/bdc7135b51033982d90ea5dad104bb04fc107df2/docs/FEATURE_CATALOG.md#L320)
- 旧内容：Smartphone専用最適化UI。親指/Quick Menu/小画面（当時状態：Core）
- 判定：**改善して引き継いだ**。「Smartphone専用最適化UI」の能力は以下の具体制御へ対応。
- 対応能力 [DEV-003](features/DEV.md#dev-003)：指描き、下部シート、対象と確定操作を同時表示、主要能力を削除しない。下部シート・指描き・対象帯・精密数値。全能力へ検索/分野一覧から到達、データ意味を削らない
- 検証範囲：旧名/注記と新仕様の具体能力を対照。実装検証ではない。

## LC-236 — 機能そのものは可能な限り共通

- 旧出典：[docs/FEATURE_CATALOG.md:321](https://github.com/totoro0419/illustro_old/blob/bdc7135b51033982d90ea5dad104bb04fc107df2/docs/FEATURE_CATALOG.md#L321)
- 旧内容：機能そのものは可能な限り共通。端末を理由に高度機能を削らない（当時状態：Core）
- 判定：**改善して引き継いだ**。「機能そのものは可能な限り共通」の能力は以下の具体制御へ対応。
- 対応能力 [DEV-005](features/DEV.md#dev-005)：任意の高機能APIやペン無しでも基本制作、制約を実測して提示。実入力/画面/保存余裕/実測負荷・機能差。Nativeの能力を削らず未対応部分の外観/データ保持
- 検証範囲：旧名/注記と新仕様の具体能力を対照。実装検証ではない。

## LC-237 — Straight / Parallel Ruler

- 旧出典：[docs/FEATURE_CATALOG.md:329](https://github.com/totoro0419/illustro_old/blob/bdc7135b51033982d90ea5dad104bb04fc107df2/docs/FEATURE_CATALOG.md#L329)
- 旧内容：Straight / Parallel Ruler。詳細な定規一覧は継続調査（当時状態：Required）
- 判定：**改善して引き継いだ**。「Straight / Parallel Ruler」の能力は以下の具体制御へ対応。
- 対応能力 [GUI-001](features/GUI.md#gui-001)：直接ハンドル、表示/ロック、保存と複数設置。直線/平行/円/楕円・中心/角/径・ロック。ガイド配置一Undo、表示のみUndo外。複数と設定を保存
- 検証範囲：旧名/注記と新仕様の具体能力を対照。実装検証ではない。

## LC-238 — 2D Grid

- 旧出典：[docs/FEATURE_CATALOG.md:330](https://github.com/totoro0419/illustro_old/blob/bdc7135b51033982d90ea5dad104bb04fc107df2/docs/FEATURE_CATALOG.md#L330)
- 旧内容：2D Grid。Canvas上で直接編集（当時状態：Required）
- 判定：**改善して引き継いだ**。「2D Grid」の能力は以下の具体制御へ対応。
- 対応能力 [GUI-002](features/GUI.md#gui-002)：1/2/3点透視、消失点の画面外編集、適用範囲を表示。2D/等角/透視1点2点3点・間隔/角/消失点。ガイドを作品へ保存、一編集一Undo
- 検証範囲：旧名/注記と新仕様の具体能力を対照。実装検証ではない。

## LC-239 — Isometric Grid

- 旧出典：[docs/FEATURE_CATALOG.md:331](https://github.com/totoro0419/illustro_old/blob/bdc7135b51033982d90ea5dad104bb04fc107df2/docs/FEATURE_CATALOG.md#L331)
- 旧内容：Isometric Grid。（当時状態：Required）
- 判定：**改善して引き継いだ**。「Isometric Grid」の能力は以下の具体制御へ対応。
- 対応能力 [GUI-002](features/GUI.md#gui-002)：1/2/3点透視、消失点の画面外編集、適用範囲を表示。2D/等角/透視1点2点3点・間隔/角/消失点。ガイドを作品へ保存、一編集一Undo
- 検証範囲：旧名/注記と新仕様の具体能力を対照。実装検証ではない。

## LC-240 — Perspective Guide

- 旧出典：[docs/FEATURE_CATALOG.md:332](https://github.com/totoro0419/illustro_old/blob/bdc7135b51033982d90ea5dad104bb04fc107df2/docs/FEATURE_CATALOG.md#L332)
- 旧内容：Perspective Guide。1/2/3点透視（当時状態：Required）
- 判定：**改善して引き継いだ**。「Perspective Guide」の能力は以下の具体制御へ対応。
- 対応能力 [GUI-002](features/GUI.md#gui-002)：1/2/3点透視、消失点の画面外編集、適用範囲を表示。2D/等角/透視1点2点3点・間隔/角/消失点。ガイドを作品へ保存、一編集一Undo
- 検証範囲：旧名/注記と新仕様の具体能力を対照。実装検証ではない。

## LC-241 — Symmetry / Mirror

- 旧出典：[docs/FEATURE_CATALOG.md:333](https://github.com/totoro0419/illustro_old/blob/bdc7135b51033982d90ea5dad104bb04fc107df2/docs/FEATURE_CATALOG.md#L333)
- 旧内容：Symmetry / Mirror。（当時状態：Required）
- 判定：**改善して引き継いだ**。「Symmetry / Mirror」の能力は以下の具体制御へ対応。
- 対応能力 [GUI-003](features/GUI.md#gui-003)：軸数/中心/回転、反映先の予告、非対称部分へ一時解除。軸数・中心・回転・鏡映/放射・一時解除。一筆の反映全体一Undo、軸配置を保存
- 検証範囲：旧名/注記と新仕様の具体能力を対照。実装検証ではない。

## LC-242 — Radial Symmetry

- 旧出典：[docs/FEATURE_CATALOG.md:334](https://github.com/totoro0419/illustro_old/blob/bdc7135b51033982d90ea5dad104bb04fc107df2/docs/FEATURE_CATALOG.md#L334)
- 旧内容：Radial Symmetry。（当時状態：Required）
- 判定：**改善して引き継いだ**。「Radial Symmetry」の能力は以下の具体制御へ対応。
- 対応能力 [GUI-003](features/GUI.md#gui-003)：軸数/中心/回転、反映先の予告、非対称部分へ一時解除。軸数・中心・回転・鏡映/放射・一時解除。一筆の反映全体一Undo、軸配置を保存
- 検証範囲：旧名/注記と新仕様の具体能力を対照。実装検証ではない。

## LC-243 — Guide Snapping

- 旧出典：[docs/FEATURE_CATALOG.md:335](https://github.com/totoro0419/illustro_old/blob/bdc7135b51033982d90ea5dad104bb04fc107df2/docs/FEATURE_CATALOG.md#L335)
- 旧内容：Guide Snapping。対応ツールで予測可能に動作（当時状態：Required）
- 判定：**改善して引き継いだ**。「Guide Snapping」の能力は以下の具体制御へ対応。
- 対応能力 [GUI-006](features/GUI.md#gui-006)：どのガイドに吸着するか可視、複数競合で予測可能。対象ガイド・吸着強度・範囲・可視/ロック。設定はガイドに保存、吸着解除は次接触から
- 検証範囲：旧名/注記と新仕様の具体能力を対照。実装検証ではない。

## LC-244 — Guide Visibility / Lock

- 旧出典：[docs/FEATURE_CATALOG.md:336](https://github.com/totoro0419/illustro_old/blob/bdc7135b51033982d90ea5dad104bb04fc107df2/docs/FEATURE_CATALOG.md#L336)
- 旧内容：Guide Visibility / Lock。（当時状態：Required）
- 判定：**改善して引き継いだ**。「Guide Visibility / Lock」の能力は以下の具体制御へ対応。
- 対応能力 [GUI-006](features/GUI.md#gui-006)：どのガイドに吸着するか可視、複数競合で予測可能。対象ガイド・吸着強度・範囲・可視/ロック。設定はガイドに保存、吸着解除は次接触から
- 検証範囲：旧名/注記と新仕様の具体能力を対照。実装検証ではない。

## LC-245 — Guide Preset / Save

- 旧出典：[docs/FEATURE_CATALOG.md:337](https://github.com/totoro0419/illustro_old/blob/bdc7135b51033982d90ea5dad104bb04fc107df2/docs/FEATURE_CATALOG.md#L337)
- 旧内容：Guide Preset / Save。（当時状態：Required）
- 判定：**改善して引き継いだ**。「Guide Preset / Save」の能力は以下の具体制御へ対応。
- 対応能力 [GUI-007](features/GUI.md#gui-007)：他作品へ保存読込、元ガイドの比率や座標を確認。プリセット名・寸法追従/元座標・含むガイド。ガイドセットを素材保存、読込一Undo
- 検証範囲：旧名/注記と新仕様の具体能力を対照。実装検証ではない。

## LC-246 — Line / Rectangle / Ellipse / Polygon

- 旧出典：[docs/FEATURE_CATALOG.md:338](https://github.com/totoro0419/illustro_old/blob/bdc7135b51033982d90ea5dad104bb04fc107df2/docs/FEATURE_CATALOG.md#L338)
- 旧内容：Line / Rectangle / Ellipse / Polygon。（当時状態：Required）
- 判定：**改善して引き継いだ**。「Line / Rectangle / Ellipse / Polygon」の能力は以下の具体制御へ対応。
- 対応能力 [GUI-004](features/GUI.md#gui-004)：直線/矩形/角丸/円/楕円/多角形/曲線、塗り線・比率。直線/矩形/角丸/楕円/多角形/ベジェ/折線・線/塗り・比率。Raster/Vectorの出力先を明示、一図形一Undo
- 検証範囲：旧名/注記と新仕様の具体能力を対照。実装検証ではない。

## LC-247 — Post-stroke Shape Correction

- 旧出典：[docs/FEATURE_CATALOG.md:339](https://github.com/totoro0419/illustro_old/blob/bdc7135b51033982d90ea5dad104bb04fc107df2/docs/FEATURE_CATALOG.md#L339)
- 旧内容：Post-stroke Shape Correction。描画後に自然に整形（当時状態：Required / Investigate）
- 判定：**改善して引き継いだ**。「Post-stroke Shape Correction」の能力は以下の具体制御へ対応。
- 対応能力 [GUI-005](features/GUI.md#gui-005)：保持で候補を出すが通常線を無断変更しない、訂正とOFF入口。保持で補正ON/OFF・候補形・待ち時間。補正採用まで同一筆Undo、形状編集は元候補を保持
- 検証範囲：旧名/注記と新仕様の具体能力を対照。実装検証ではない。

## LC-248 — Vector-backed Shape

- 旧出典：[docs/FEATURE_CATALOG.md:340](https://github.com/totoro0419/illustro_old/blob/bdc7135b51033982d90ea5dad104bb04fc107df2/docs/FEATURE_CATALOG.md#L340)
- 旧内容：Vector-backed Shape。Vector Layerと統合（当時状態：Required / Investigate）
- 判定：**改善して引き継いだ**。「Vector-backed Shape」の能力は以下の具体制御へ対応。
- 対応能力 [VEC-001](features/VEC.md#vec-001)：開閉パス、ベジェ、塗り/線、手描きベクターを一貫した対象として保持。自由線/開閉パス・塗り/線・ベジェ/図形。パスとして保存、一パス一Undo、マスクもパス参照可能
- 検証範囲：旧名/注記と新仕様の具体能力を対照。実装検証ではない。

## LC-249 — Linear Gradient

- 旧出典：[docs/FEATURE_CATALOG.md:341](https://github.com/totoro0419/illustro_old/blob/bdc7135b51033982d90ea5dad104bb04fc107df2/docs/FEATURE_CATALOG.md#L341)
- 旧内容：Linear Gradient。（当時状態：Required）
- 判定：**改善して引き継いだ**。「Linear Gradient」の能力は以下の具体制御へ対応。
- 対応能力 [GRA-001](features/GRA.md#gra-001)：始終点・中心・半径・向きを直接編集、塗り先と範囲を明示。線形/放射/反射/角度・中心/半径/角・繰返し。編集可能塗り層として保持、Raster直接適用は別入口
- 検証範囲：旧名/注記と新仕様の具体能力を対照。実装検証ではない。

## LC-250 — Radial Gradient

- 旧出典：[docs/FEATURE_CATALOG.md:342](https://github.com/totoro0419/illustro_old/blob/bdc7135b51033982d90ea5dad104bb04fc107df2/docs/FEATURE_CATALOG.md#L342)
- 旧内容：Radial Gradient。（当時状態：Required）
- 判定：**改善して引き継いだ**。「Radial Gradient」の能力は以下の具体制御へ対応。
- 対応能力 [GRA-001](features/GRA.md#gra-001)：始終点・中心・半径・向きを直接編集、塗り先と範囲を明示。線形/放射/反射/角度・中心/半径/角・繰返し。編集可能塗り層として保持、Raster直接適用は別入口
- 検証範囲：旧名/注記と新仕様の具体能力を対照。実装検証ではない。

## LC-251 — Reflected / Bilinear Gradient

- 旧出典：[docs/FEATURE_CATALOG.md:343](https://github.com/totoro0419/illustro_old/blob/bdc7135b51033982d90ea5dad104bb04fc107df2/docs/FEATURE_CATALOG.md#L343)
- 旧内容：Reflected / Bilinear Gradient。（当時状態：Required）
- 判定：**改善して引き継いだ**。「Reflected / Bilinear Gradient」の能力は以下の具体制御へ対応。
- 対応能力 [GRA-001](features/GRA.md#gra-001)：始終点・中心・半径・向きを直接編集、塗り先と範囲を明示。線形/放射/反射/角度・中心/半径/角・繰返し。編集可能塗り層として保持、Raster直接適用は別入口
- 検証範囲：旧名/注記と新仕様の具体能力を対照。実装検証ではない。

## LC-252 — Shape-aware Gradient

- 旧出典：[docs/FEATURE_CATALOG.md:344](https://github.com/totoro0419/illustro_old/blob/bdc7135b51033982d90ea5dad104bb04fc107df2/docs/FEATURE_CATALOG.md#L344)
- 旧内容：Shape-aware Gradient。（当時状態：Required / Investigate）
- 判定：**再検討のため保留した**。「Shape-aware Gradient」の能力は以下の具体制御へ対応。 候補を削除せず範囲/精度/用途を比較待ち。
- 対応能力 [GRA-003](features/GRA.md#gra-003)：編集可能な塗りレイヤー、範囲制限、形状追従は候補比較。塗り層/マスク・形状追従候補・範囲。形状とグラデ設定を保存し再編集、元選択は作成時固定
- 検証範囲：旧名/注記と新仕様の具体能力を対照。実装検証ではない。

## LC-253 — Editable Gradient Stops

- 旧出典：[docs/FEATURE_CATALOG.md:345](https://github.com/totoro0419/illustro_old/blob/bdc7135b51033982d90ea5dad104bb04fc107df2/docs/FEATURE_CATALOG.md#L345)
- 旧内容：Editable Gradient Stops。（当時状態：Required）
- 判定：**改善して引き継いだ**。「Editable Gradient Stops」の能力は以下の具体制御へ対応。
- 対応能力 [GRA-002](features/GRA.md#gra-002)：追加/削除/順序/数値、透明色の境界と繰返し。色停止点/α停止点・位置/中間点・反転/反復。停止点全体を保存、編集セッション一Undo
- 検証範囲：旧名/注記と新仕様の具体能力を対照。実装検証ではない。

## LC-254 — Non-destructive Gradient

- 旧出典：[docs/FEATURE_CATALOG.md:346](https://github.com/totoro0419/illustro_old/blob/bdc7135b51033982d90ea5dad104bb04fc107df2/docs/FEATURE_CATALOG.md#L346)
- 旧内容：Non-destructive Gradient。（当時状態：Required）
- 判定：**改善して引き継いだ**。「Non-destructive Gradient」の能力は以下の具体制御へ対応。
- 対応能力 [GRA-003](features/GRA.md#gra-003)：編集可能な塗りレイヤー、範囲制限、形状追従は候補比較。塗り層/マスク・形状追従候補・範囲。形状とグラデ設定を保存し再編集、元選択は作成時固定
- 検証範囲：旧名/注記と新仕様の具体能力を対照。実装検証ではない。

## LC-255 — Gradient Map

- 旧出典：[docs/FEATURE_CATALOG.md:347](https://github.com/totoro0419/illustro_old/blob/bdc7135b51033982d90ea5dad104bb04fc107df2/docs/FEATURE_CATALOG.md#L347)
- 旧内容：Gradient Map。Adjustmentとしても利用（当時状態：Required）
- 判定：**改善して引き継いだ**。「Gradient Map」の能力は以下の具体制御へ対応。
- 対応能力 [GRA-004](features/GRA.md#gra-004)：非破壊調整、色段階、出力のバンディング確認と抑制。明度→色停止点・階調数・ディザON/OFF。調整レイヤーとして保持、停止点をパレット再利用
- 検証範囲：旧名/注記と新仕様の具体能力を対照。実装検証ではない。

## LC-256 — Gradient Dithering

- 旧出典：[docs/FEATURE_CATALOG.md:348](https://github.com/totoro0419/illustro_old/blob/bdc7135b51033982d90ea5dad104bb04fc107df2/docs/FEATURE_CATALOG.md#L348)
- 旧内容：Gradient Dithering。低bit出力でBanding低減（当時状態：Required / Investigate）
- 判定：**改善して引き継いだ**。「Gradient Dithering」の能力は以下の具体制御へ対応。
- 対応能力 [GRA-004](features/GRA.md#gra-004)：非破壊調整、色段階、出力のバンディング確認と抑制。明度→色停止点・階調数・ディザON/OFF。調整レイヤーとして保持、停止点をパレット再利用
- 検証範囲：旧名/注記と新仕様の具体能力を対照。実装検証ではない。

## LC-257 — Internal Clipboard

- 旧出典：[docs/FEATURE_CATALOG.md:356](https://github.com/totoro0419/illustro_old/blob/bdc7135b51033982d90ea5dad104bb04fc107df2/docs/FEATURE_CATALOG.md#L356)
- 旧内容：Internal Clipboard。System Clipboard非依存（当時状態：Core）
- 判定：**改善して引き継いだ**。「Internal Clipboard」の能力は以下の具体制御へ対応。
- 対応能力 [CLP-001](features/CLP.md#clp-001)：選択範囲/層/物体を明示、内部コピー失敗なら切取元を消さない。Copy/Cut/Paste・範囲/層/物体・内部Clipboard。Cutは内部コピー成功後のみ元削除、一操作一Undo
- 検証範囲：旧名/注記と新仕様の具体能力を対照。実装検証ではない。

## LC-258 — Copy / Cut / Paste

- 旧出典：[docs/FEATURE_CATALOG.md:357](https://github.com/totoro0419/illustro_old/blob/bdc7135b51033982d90ea5dad104bb04fc107df2/docs/FEATURE_CATALOG.md#L357)
- 旧内容：Copy / Cut / Paste。Selection/Layer/Object対応（当時状態：Core）
- 判定：**改善して引き継いだ**。「Copy / Cut / Paste」の能力は以下の具体制御へ対応。
- 対応能力 [CLP-001](features/CLP.md#clp-001)：選択範囲/層/物体を明示、内部コピー失敗なら切取元を消さない。Copy/Cut/Paste・範囲/層/物体・内部Clipboard。Cutは内部コピー成功後のみ元削除、一操作一Undo
- 検証範囲：旧名/注記と新仕様の具体能力を対照。実装検証ではない。

## LC-259 — Copy Merged

- 旧出典：[docs/FEATURE_CATALOG.md:358](https://github.com/totoro0419/illustro_old/blob/bdc7135b51033982d90ea5dad104bb04fc107df2/docs/FEATURE_CATALOG.md#L358)
- 旧内容：Copy Merged。Visible compositeをRaster copy（当時状態：Required）
- 判定：**改善して引き継いだ**。「Copy Merged」の能力は以下の具体制御へ対応。
- 対応能力 [CLP-002](features/CLP.md#clp-002)：UI/資料/Proofを除いた合成、元座標と別文書の色差を確認。Copy Merged/Paste in Place・可視範囲。元作品保持、貼付一Undo。UI/資料/Proofは統合対象外
- 検証範囲：旧名/注記と新仕様の具体能力を対照。実装検証ではない。

## LC-260 — Paste in Place

- 旧出典：[docs/FEATURE_CATALOG.md:359](https://github.com/totoro0419/illustro_old/blob/bdc7135b51033982d90ea5dad104bb04fc107df2/docs/FEATURE_CATALOG.md#L359)
- 旧内容：Paste in Place。Illustro内部座標を保持（当時状態：Required）
- 判定：**改善して引き継いだ**。「Paste in Place」の能力は以下の具体制御へ対応。
- 対応能力 [CLP-002](features/CLP.md#clp-002)：UI/資料/Proofを除いた合成、元座標と別文書の色差を確認。Copy Merged/Paste in Place・可視範囲。元作品保持、貼付一Undo。UI/資料/Proofは統合対象外
- 検証範囲：旧名/注記と新仕様の具体能力を対照。実装検証ではない。

## LC-261 — Native cross-document payload

- 旧出典：[docs/FEATURE_CATALOG.md:360](https://github.com/totoro0419/illustro_old/blob/bdc7135b51033982d90ea5dad104bb04fc107df2/docs/FEATURE_CATALOG.md#L360)
- 旧内容：Native cross-document payload。可能な対象はRasterizeしない（当時状態：Required）
- 判定：**ほかの機能に統合した**。「Native cross-document payload」の能力は以下の具体制御へ対応。
- 対応能力 [CLP-003](features/CLP.md#clp-003)：文字/パス/マスク/層/依存素材を保ち、変換の損失を説明。Native層/文字/パス/Mask/依存・色空間。対象をRaster化せず保持できる範囲で転送、一貼付一Undo
- 検証範囲：旧名/注記と新仕様の具体能力を対照。実装検証ではない。

## LC-262 — System Clipboard Bridge

- 旧出典：[docs/FEATURE_CATALOG.md:361](https://github.com/totoro0419/illustro_old/blob/bdc7135b51033982d90ea5dad104bb04fc107df2/docs/FEATURE_CATALOG.md#L361)
- 旧内容：System Clipboard Bridge。Platform permission/capability依存（当時状態：Required / Investigate）
- 判定：**改善して引き継いだ**。「System Clipboard Bridge」の能力は以下の具体制御へ対応。
- 対応能力 [CLP-004](features/CLP.md#clp-004)：OS権限拒否でも内部編集継続、開く/配置/資料/素材を区別。OS共有/Clipboard/DragDrop・開く/置く/資料/素材。取込成功後に作品変更、原外部画像不変
- 検証範囲：旧名/注記と新仕様の具体能力を対照。実装検証ではない。

## LC-263 — Desktop Drag & Drop

- 旧出典：[docs/FEATURE_CATALOG.md:362](https://github.com/totoro0419/illustro_old/blob/bdc7135b51033982d90ea5dad104bb04fc107df2/docs/FEATURE_CATALOG.md#L362)
- 旧内容：Desktop Drag & Drop。Open/Place/Reference等Context別（当時状態：Required）
- 判定：**改善して引き継いだ**。「Desktop Drag & Drop」の能力は以下の具体制御へ対応。
- 対応能力 [CLP-004](features/CLP.md#clp-004)：OS権限拒否でも内部編集継続、開く/配置/資料/素材を区別。OS共有/Clipboard/DragDrop・開く/置く/資料/素材。取込成功後に作品変更、原外部画像不変
- 検証範囲：旧名/注記と新仕様の具体能力を対照。実装検証ではない。

## LC-264 — Localizable UI resources

- 旧出典：[docs/FEATURE_CATALOG.md:368](https://github.com/totoro0419/illustro_old/blob/bdc7135b51033982d90ea5dad104bb04fc107df2/docs/FEATURE_CATALOG.md#L368)
- 旧内容：Localizable UI resources。Display文字列と内部IDを分離（当時状態：Core）
- 判定：**改善して引き継いだ**。「Localizable UI resources」の能力は以下の具体制御へ対応。
- 対応能力 [A11-006](features/A11.md#a11-006)：日本語IME/CJK、長文ラベル、数値/単位/日付、言語変更でマクロやキーを壊さない。UI言語・CJK/IME・数値/単位/日時・翻訳長。Command/Macro/Shortcutの同一性は翻訳文字列と独立
- 検証範囲：旧名/注記と新仕様の具体能力を対照。実装検証ではない。

## LC-265 — Japanese/CJK layout support

- 旧出典：[docs/FEATURE_CATALOG.md:369](https://github.com/totoro0419/illustro_old/blob/bdc7135b51033982d90ea5dad104bb04fc107df2/docs/FEATURE_CATALOG.md#L369)
- 旧内容：Japanese/CJK layout support。IME/font fallbackを含む（当時状態：Core）
- 判定：**改善して引き継いだ**。「Japanese/CJK layout support」の能力は以下の具体制御へ対応。
- 対応能力 [A11-006](features/A11.md#a11-006)：日本語IME/CJK、長文ラベル、数値/単位/日付、言語変更でマクロやキーを壊さない。UI言語・CJK/IME・数値/単位/日時・翻訳長。Command/Macro/Shortcutの同一性は翻訳文字列と独立
- 検証範囲：旧名/注記と新仕様の具体能力を対照。実装検証ではない。

## LC-266 — Locale-aware units/date/number

- 旧出典：[docs/FEATURE_CATALOG.md:370](https://github.com/totoro0419/illustro_old/blob/bdc7135b51033982d90ea5dad104bb04fc107df2/docs/FEATURE_CATALOG.md#L370)
- 旧内容：Locale-aware units/date/number。Canonical値とは分離（当時状態：Required）
- 判定：**改善して引き継いだ**。「Locale-aware units/date/number」の能力は以下の具体制御へ対応。
- 対応能力 [A11-006](features/A11.md#a11-006)：日本語IME/CJK、長文ラベル、数値/単位/日付、言語変更でマクロやキーを壊さない。UI言語・CJK/IME・数値/単位/日時・翻訳長。Command/Macro/Shortcutの同一性は翻訳文字列と独立
- 検証範囲：旧名/注記と新仕様の具体能力を対照。実装検証ではない。

## LC-267 — Shipping locale set

- 旧出典：[docs/FEATURE_CATALOG.md:371](https://github.com/totoro0419/illustro_old/blob/bdc7135b51033982d90ea5dad104bb04fc107df2/docs/FEATURE_CATALOG.md#L371)
- 旧内容：Shipping locale set。Product/UI phaseで決定（当時状態：Investigate）
- 判定：**再検討のため保留した**。「Shipping locale set」の能力は以下の具体制御へ対応。 候補を削除せず範囲/精度/用途を比較待ち。
- 対応能力 [A11-006](features/A11.md#a11-006)：日本語IME/CJK、長文ラベル、数値/単位/日付、言語変更でマクロやキーを壊さない。UI言語・CJK/IME・数値/単位/日時・翻訳長。Command/Macro/Shortcutの同一性は翻訳文字列と独立
- 検証範囲：旧名/注記と新仕様の具体能力を対照。実装検証ではない。

## LC-268 — .illustro

- 旧出典：[docs/FEATURE_CATALOG.md:377](https://github.com/totoro0419/illustro_old/blob/bdc7135b51033982d90ea5dad104bb04fc107df2/docs/FEATURE_CATALOG.md#L377)
- 旧内容：.illustro。Native Document（当時状態：Core）
- 判定：**改善して引き継いだ**。「.illustro」の能力は以下の具体制御へ対応。
- 対応能力 [SAV-003](features/SAV.md#sav-003)：層/選択/文字/領域/効果/資料/ブラシ依存を保持、保存時点を固定。Save/Save As・Native保存先・依存含有・保存時点。要求時点までの受理済編集を含める。未完の接地筆/プレビューは別保留記録
- 検証範囲：旧名/注記と新仕様の具体能力を対照。実装検証ではない。

## LC-269 — PNG Export

- 旧出典：[docs/FEATURE_CATALOG.md:378](https://github.com/totoro0419/illustro_old/blob/bdc7135b51033982d90ea5dad104bb04fc107df2/docs/FEATURE_CATALOG.md#L378)
- 旧内容：PNG Export。（当時状態：Required）
- 判定：**改善して引き継いだ**。「PNG Export」の能力は以下の具体制御へ対応。
- 対応能力 [IO-002](features/IO.md#io-002)：透明/背景/品質/可逆/ICC/サイズ/範囲/ファイル名を確認。PNGα/JPEG背景と品質/WebP可逆/非可逆・寸法/ICC/範囲/名前。固定時点からコピー出力、作品Undo外、プリセット保存
- 検証範囲：旧名/注記と新仕様の具体能力を対照。実装検証ではない。

## LC-270 — JPEG Export

- 旧出典：[docs/FEATURE_CATALOG.md:379](https://github.com/totoro0419/illustro_old/blob/bdc7135b51033982d90ea5dad104bb04fc107df2/docs/FEATURE_CATALOG.md#L379)
- 旧内容：JPEG Export。（当時状態：Required）
- 判定：**改善して引き継いだ**。「JPEG Export」の能力は以下の具体制御へ対応。
- 対応能力 [IO-002](features/IO.md#io-002)：透明/背景/品質/可逆/ICC/サイズ/範囲/ファイル名を確認。PNGα/JPEG背景と品質/WebP可逆/非可逆・寸法/ICC/範囲/名前。固定時点からコピー出力、作品Undo外、プリセット保存
- 検証範囲：旧名/注記と新仕様の具体能力を対照。実装検証ではない。

## LC-271 — WebP Export

- 旧出典：[docs/FEATURE_CATALOG.md:380](https://github.com/totoro0419/illustro_old/blob/bdc7135b51033982d90ea5dad104bb04fc107df2/docs/FEATURE_CATALOG.md#L380)
- 旧内容：WebP Export。（当時状態：Required）
- 判定：**改善して引き継いだ**。「WebP Export」の能力は以下の具体制御へ対応。
- 対応能力 [IO-002](features/IO.md#io-002)：透明/背景/品質/可逆/ICC/サイズ/範囲/ファイル名を確認。PNGα/JPEG背景と品質/WebP可逆/非可逆・寸法/ICC/範囲/名前。固定時点からコピー出力、作品Undo外、プリセット保存
- 検証範囲：旧名/注記と新仕様の具体能力を対照。実装検証ではない。

## LC-272 — PSD Import / Export

- 旧出典：[docs/FEATURE_CATALOG.md:381](https://github.com/totoro0419/illustro_old/blob/bdc7135b51033982d90ea5dad104bb04fc107df2/docs/FEATURE_CATALOG.md#L381)
- 旧内容：PSD Import / Export。完全互換を謳わずFeature-by-feature互換表とLoss Reportを持つ（当時状態：Investigate / High Priority）
- 判定：**改善して引き継いだ**。「PSD Import / Export」の能力は以下の具体制御へ対応。
- 対応能力 [IO-003](features/IO.md#io-003)：機能ごとの可読/可書/視覚維持/再編集性を別表示、損失レポート。機能別読込/書込・外観/再編集・PSD/PSB。元Native保持、レイヤー/文字/効果ごとの保持状況をレポート
- 検証範囲：旧名/注記と新仕様の具体能力を対照。実装検証ではない。

## LC-273 — OpenRaster (.ora)

- 旧出典：[docs/FEATURE_CATALOG.md:382](https://github.com/totoro0419/illustro_old/blob/bdc7135b51033982d90ea5dad104bb04fc107df2/docs/FEATURE_CATALOG.md#L382)
- 旧内容：OpenRaster (.ora)。OpenなLayer交換形式（当時状態：Required）
- 判定：**改善して引き継いだ**。「OpenRaster (.ora)」の能力は以下の具体制御へ対応。
- 対応能力 [IO-004](features/IO.md#io-004)：交換できる層・マスク・色深度の範囲を明示。ORA層構造、TIFF色深度/圧縮/ICC/α/層対応。Nativeを保ち交換コピー、対応しない層は損失表示
- 検証範囲：旧名/注記と新仕様の具体能力を対照。実装検証ではない。

## LC-274 — TIFF

- 旧出典：[docs/FEATURE_CATALOG.md:383](https://github.com/totoro0419/illustro_old/blob/bdc7135b51033982d90ea5dad104bb04fc107df2/docs/FEATURE_CATALOG.md#L383)
- 旧内容：TIFF。高品質Raster交換（当時状態：Required）
- 判定：**改善して引き継いだ**。「TIFF」の能力は以下の具体制御へ対応。
- 対応能力 [IO-004](features/IO.md#io-004)：交換できる層・マスク・色深度の範囲を明示。ORA層構造、TIFF色深度/圧縮/ICC/α/層対応。Nativeを保ち交換コピー、対応しない層は損失表示
- 検証範囲：旧名/注記と新仕様の具体能力を対照。実装検証ではない。

## LC-275 — SVG Import / Export

- 旧出典：[docs/FEATURE_CATALOG.md:384](https://github.com/totoro0419/illustro_old/blob/bdc7135b51033982d90ea5dad104bb04fc107df2/docs/FEATURE_CATALOG.md#L384)
- 旧内容：SVG Import / Export。Vector交換用途（当時状態：Required / Investigate）
- 判定：**再検討のため保留した**。「SVG Import / Export」の能力は以下の具体制御へ対応。 候補を削除せず範囲/精度/用途を比較待ち。
- 対応能力 [IO-005](features/IO.md#io-005)：パスと筆風外観・可変幅・文字の保持差を明示。SVGパス/文字/可変幅/筆風外観・外観優先/編集優先。元パス/文字保持、SVGコピー
- 検証範囲：旧名/注記と新仕様の具体能力を対照。実装検証ではない。

## LC-276 — OpenEXR

- 旧出典：[docs/FEATURE_CATALOG.md:385](https://github.com/totoro0419/illustro_old/blob/bdc7135b51033982d90ea5dad104bb04fc107df2/docs/FEATURE_CATALOG.md#L385)
- 旧内容：OpenEXR。HDR交換用途（当時状態：Required / Investigate）
- 判定：**再検討のため保留した**。「OpenEXR」の能力は以下の具体制御へ対応。 候補を削除せず範囲/精度/用途を比較待ち。
- 対応能力 [IO-006](features/IO.md#io-006)：HDR/透明/圧縮/端末可用性を検証して範囲を宣言。EXR精度/チャンネル、AVIF/HEIF圧縮/α/HDR・端末対応。原データ保持、色調マッピングは書出しコピー
- 検証範囲：旧名/注記と新仕様の具体能力を対照。実装検証ではない。

## LC-277 — AVIF / HEIF

- 旧出典：[docs/FEATURE_CATALOG.md:386](https://github.com/totoro0419/illustro_old/blob/bdc7135b51033982d90ea5dad104bb04fc107df2/docs/FEATURE_CATALOG.md#L386)
- 旧内容：AVIF / HEIF。画質・HDR・互換性を評価（当時状態：Investigate）
- 判定：**再検討のため保留した**。「AVIF / HEIF」の能力は以下の具体制御へ対応。 候補を削除せず範囲/精度/用途を比較待ち。
- 対応能力 [IO-006](features/IO.md#io-006)：HDR/透明/圧縮/端末可用性を検証して範囲を宣言。EXR精度/チャンネル、AVIF/HEIF圧縮/α/HDR・端末対応。原データ保持、色調マッピングは書出しコピー
- 検証範囲：旧名/注記と新仕様の具体能力を対照。実装検証ではない。

## LC-278 — Auto Save

- 旧出典：[docs/FEATURE_CATALOG.md:387](https://github.com/totoro0419/illustro_old/blob/bdc7135b51033982d90ea5dad104bb04fc107df2/docs/FEATURE_CATALOG.md#L387)
- 旧内容：Auto Save。（当時状態：Core）
- 判定：**改善して引き継いだ**。「Auto Save」の能力は以下の具体制御へ対応。
- 対応能力 [SAV-004](features/SAV.md#sav-004)：初期ON、作業中保護と持出ファイル保存を区別、処理中の新編集を保存済と偽らない。自動保護ON・最後の保護時点・持出し保存時点。自動保護はUndoと別、取消不能な保存履歴で筆履歴を埋めない
- 検証範囲：旧名/注記と新仕様の具体能力を対照。実装検証ではない。

## LC-279 — Crash Recovery

- 旧出典：[docs/FEATURE_CATALOG.md:388](https://github.com/totoro0419/illustro_old/blob/bdc7135b51033982d90ea5dad104bb04fc107df2/docs/FEATURE_CATALOG.md#L388)
- 旧内容：Crash Recovery。（当時状態：Core）
- 判定：**改善して引き継いだ**。「Crash Recovery」の能力は以下の具体制御へ対応。
- 対応能力 [SAV-005](features/SAV.md#sav-005)：最後に検証できた保護状態を案内、失敗部分を正常な空白で埋めない。復元候補/正常保存/未保護部分・比較/別名救出。正常原本を上書きせず復元コピー、保留セッションは別表示
- 検証範囲：旧名/注記と新仕様の具体能力を対照。実装検証ではない。

## LC-280 — Recovery Snapshot

- 旧出典：[docs/FEATURE_CATALOG.md:389](https://github.com/totoro0419/illustro_old/blob/bdc7135b51033982d90ea5dad104bb04fc107df2/docs/FEATURE_CATALOG.md#L389)
- 旧内容：Recovery Snapshot。（当時状態：Core）
- 判定：**改善して引き継いだ**。「Recovery Snapshot」の能力は以下の具体制御へ対応。
- 対応能力 [SAV-005](features/SAV.md#sav-005)：最後に検証できた保護状態を案内、失敗部分を正常な空白で埋めない。復元候補/正常保存/未保護部分・比較/別名救出。正常原本を上書きせず復元コピー、保留セッションは別表示
- 検証範囲：旧名/注記と新仕様の具体能力を対照。実装検証ではない。

## LC-281 — Incremental Save

- 旧出典：[docs/FEATURE_CATALOG.md:390](https://github.com/totoro0419/illustro_old/blob/bdc7135b51033982d90ea5dad104bb04fc107df2/docs/FEATURE_CATALOG.md#L390)
- 旧内容：Incremental Save。（当時状態：Core）
- 判定：**改善して引き継いだ**。「Incremental Save」の能力は以下の具体制御へ対応。
- 対応能力 [SAV-004](features/SAV.md#sav-004)：初期ON、作業中保護と持出ファイル保存を区別、処理中の新編集を保存済と偽らない。自動保護ON・最後の保護時点・持出し保存時点。自動保護はUndoと別、取消不能な保存履歴で筆履歴を埋めない
- 検証範囲：旧名/注記と新仕様の具体能力を対照。実装検証ではない。

## LC-282 — 描画を止めない保存

- 旧出典：[docs/FEATURE_CATALOG.md:391](https://github.com/totoro0419/illustro_old/blob/bdc7135b51033982d90ea5dad104bb04fc107df2/docs/FEATURE_CATALOG.md#L391)
- 旧内容：描画を止めない保存。（当時状態：Core）
- 判定：**改善して引き継いだ**。「描画を止めない保存」の能力は以下の具体制御へ対応。
- 対応能力 [SAV-004](features/SAV.md#sav-004)：初期ON、作業中保護と持出ファイル保存を区別、処理中の新編集を保存済と偽らない。自動保護ON・最後の保護時点・持出し保存時点。自動保護はUndoと別、取消不能な保存履歴で筆履歴を埋めない
- 検証範囲：旧名/注記と新仕様の具体能力を対照。実装検証ではない。

## LC-283 — Offline First

- 旧出典：[docs/FEATURE_CATALOG.md:392](https://github.com/totoro0419/illustro_old/blob/bdc7135b51033982d90ea5dad104bb04fc107df2/docs/FEATURE_CATALOG.md#L392)
- 旧内容：Offline First。（当時状態：Core）
- 判定：**改善して引き継いだ**。「Offline First」の能力は以下の具体制御へ対応。
- 対応能力 [SAV-007](features/SAV.md#sav-007)：ローカル描画/編集/保存/履歴/素材/資料が接続なしで成立。接続/ログイン不要の通常制作・所持素材。同一Native形式で持出し、接続で履歴意味を変えない
- 検証範囲：旧名/注記と新仕様の具体能力を対照。実装検証ではない。

## LC-284 — 通常編集でログイン不要

- 旧出典：[docs/FEATURE_CATALOG.md:393](https://github.com/totoro0419/illustro_old/blob/bdc7135b51033982d90ea5dad104bb04fc107df2/docs/FEATURE_CATALOG.md#L393)
- 旧内容：通常編集でログイン不要。（当時状態：Core）
- 判定：**改善して引き継いだ**。「通常編集でログイン不要」の能力は以下の具体制御へ対応。
- 対応能力 [SAV-007](features/SAV.md#sav-007)：ローカル描画/編集/保存/履歴/素材/資料が接続なしで成立。接続/ログイン不要の通常制作・所持素材。同一Native形式で持出し、接続で履歴意味を変えない
- 検証範囲：旧名/注記と新仕様の具体能力を対照。実装検証ではない。

## LC-285 — PWA Install

- 旧出典：[docs/FEATURE_CATALOG.md:394](https://github.com/totoro0419/illustro_old/blob/bdc7135b51033982d90ea5dad104bb04fc107df2/docs/FEATURE_CATALOG.md#L394)
- 旧内容：PWA Install。最終Runtime次第（当時状態：Investigate）
- 判定：**再検討のため保留した**。「PWA Install」の能力は以下の具体制御へ対応。旧記載は技術候補であり、同じ結果要求を残して方式選定を次段階へ分離。
- 対応能力 [DEV-005](features/DEV.md#dev-005)：任意の高機能APIやペン無しでも基本制作、制約を実測して提示。実入力/画面/保存余裕/実測負荷・機能差。Nativeの能力を削らず未対応部分の外観/データ保持
- 検証範囲：旧名/注記と新仕様の具体能力を対照。実装検証ではない。

## LC-286 — 体感0ラグ

- 旧出典：[docs/FEATURE_CATALOG.md:400](https://github.com/totoro0419/illustro_old/blob/bdc7135b51033982d90ea5dad104bb04fc107df2/docs/FEATURE_CATALOG.md#L400)
- 旧内容：体感0ラグ。品質目標（当時状態：Core）
- 判定：**改善して引き継いだ**。「体感0ラグ」の能力は以下の具体制御へ対応。
- 対応能力 [QR-01](QUALITY_REQUIREMENTS.md)：大作品/多数層/入力/表示の継続と負荷を測定し、方式を確定しない。
- 検証範囲：旧名/注記と新仕様の具体能力を対照。実装検証ではない。

## LC-287 — Low Input Latency

- 旧出典：[docs/FEATURE_CATALOG.md:401](https://github.com/totoro0419/illustro_old/blob/bdc7135b51033982d90ea5dad104bb04fc107df2/docs/FEATURE_CATALOG.md#L401)
- 旧内容：Low Input Latency。（当時状態：Core）
- 判定：**改善して引き継いだ**。「Low Input Latency」の能力は以下の具体制御へ対応。
- 対応能力 [QR-02](QUALITY_REQUIREMENTS.md)：大作品/多数層/入力/表示の継続と負荷を測定し、方式を確定しない。
- 検証範囲：旧名/注記と新仕様の具体能力を対照。実装検証ではない。

## LC-288 — Stable Frame Time

- 旧出典：[docs/FEATURE_CATALOG.md:402](https://github.com/totoro0419/illustro_old/blob/bdc7135b51033982d90ea5dad104bb04fc107df2/docs/FEATURE_CATALOG.md#L402)
- 旧内容：Stable Frame Time。（当時状態：Core）
- 判定：**改善して引き継いだ**。「Stable Frame Time」の能力は以下の具体制御へ対応。
- 対応能力 [QR-03](QUALITY_REQUIREMENTS.md)：大作品/多数層/入力/表示の継続と負荷を測定し、方式を確定しない。
- 検証範囲：旧名/注記と新仕様の具体能力を対照。実装検証ではない。

## LC-289 — Worst Frame計測

- 旧出典：[docs/FEATURE_CATALOG.md:403](https://github.com/totoro0419/illustro_old/blob/bdc7135b51033982d90ea5dad104bb04fc107df2/docs/FEATURE_CATALOG.md#L403)
- 旧内容：Worst Frame計測。（当時状態：Core）
- 判定：**改善して引き継いだ**。「Worst Frame計測」の能力は以下の具体制御へ対応。
- 対応能力 [QR-03](QUALITY_REQUIREMENTS.md)：大作品/多数層/入力/表示の継続と負荷を測定し、方式を確定しない。
- 検証範囲：旧名/注記と新仕様の具体能力を対照。実装検証ではない。

## LC-290 — Memory Scaling

- 旧出典：[docs/FEATURE_CATALOG.md:404](https://github.com/totoro0419/illustro_old/blob/bdc7135b51033982d90ea5dad104bb04fc107df2/docs/FEATURE_CATALOG.md#L404)
- 旧内容：Memory Scaling。（当時状態：Core）
- 判定：**改善して引き継いだ**。「Memory Scaling」の能力は以下の具体制御へ対応。
- 対応能力 [QR-08](QUALITY_REQUIREMENTS.md)：大作品/多数層/入力/表示の継続と負荷を測定し、方式を確定しない。
- 検証範囲：旧名/注記と新仕様の具体能力を対照。実装検証ではない。

## LC-291 — Canvas Size Scaling

- 旧出典：[docs/FEATURE_CATALOG.md:405](https://github.com/totoro0419/illustro_old/blob/bdc7135b51033982d90ea5dad104bb04fc107df2/docs/FEATURE_CATALOG.md#L405)
- 旧内容：Canvas Size Scaling。（当時状態：Core）
- 判定：**改善して引き継いだ**。「Canvas Size Scaling」の能力は以下の具体制御へ対応。
- 対応能力 [QR-08](QUALITY_REQUIREMENTS.md)：大作品/多数層/入力/表示の継続と負荷を測定し、方式を確定しない。
- 検証範囲：旧名/注記と新仕様の具体能力を対照。実装検証ではない。

## LC-292 — GPU Brush Compositing

- 旧出典：[docs/FEATURE_CATALOG.md:406](https://github.com/totoro0419/illustro_old/blob/bdc7135b51033982d90ea5dad104bb04fc107df2/docs/FEATURE_CATALOG.md#L406)
- 旧内容：GPU Brush Compositing。（当時状態：Investigate / likely required）
- 判定：**再検討のため保留した**。「GPU Brush Compositing」の能力は以下の具体制御へ対応。旧記載は技術候補であり、同じ結果要求を残して方式選定を次段階へ分離。
- 対応能力 [QR-20](QUALITY_REQUIREMENTS.md)：大作品/多数層/入力/表示の継続と負荷を測定し、方式を確定しない。
- 検証範囲：旧名/注記と新仕様の具体能力を対照。実装検証ではない。

## LC-293 — GPU Filter

- 旧出典：[docs/FEATURE_CATALOG.md:407](https://github.com/totoro0419/illustro_old/blob/bdc7135b51033982d90ea5dad104bb04fc107df2/docs/FEATURE_CATALOG.md#L407)
- 旧内容：GPU Filter。（当時状態：Investigate / likely required）
- 判定：**再検討のため保留した**。「GPU Filter」の能力は以下の具体制御へ対応。旧記載は技術候補であり、同じ結果要求を残して方式選定を次段階へ分離。
- 対応能力 [QR-20](QUALITY_REQUIREMENTS.md)：大作品/多数層/入力/表示の継続と負荷を測定し、方式を確定しない。
- 検証範囲：旧名/注記と新仕様の具体能力を対照。実装検証ではない。

## LC-294 — GPU Transform

- 旧出典：[docs/FEATURE_CATALOG.md:408](https://github.com/totoro0419/illustro_old/blob/bdc7135b51033982d90ea5dad104bb04fc107df2/docs/FEATURE_CATALOG.md#L408)
- 旧内容：GPU Transform。（当時状態：Investigate / likely required）
- 判定：**再検討のため保留した**。「GPU Transform」の能力は以下の具体制御へ対応。旧記載は技術候補であり、同じ結果要求を残して方式選定を次段階へ分離。
- 対応能力 [QR-20](QUALITY_REQUIREMENTS.md)：大作品/多数層/入力/表示の継続と負荷を測定し、方式を確定しない。
- 検証範囲：旧名/注記と新仕様の具体能力を対照。実装検証ではない。

## LC-295 — WebGPU

- 旧出典：[docs/FEATURE_CATALOG.md:409](https://github.com/totoro0419/illustro_old/blob/bdc7135b51033982d90ea5dad104bb04fc107df2/docs/FEATURE_CATALOG.md#L409)
- 旧内容：WebGPU。技術候補。未固定（当時状態：Investigate）
- 判定：**再検討のため保留した**。「WebGPU」の能力は以下の具体制御へ対応。旧記載は技術候補であり、同じ結果要求を残して方式選定を次段階へ分離。
- 対応能力 [QR-20](QUALITY_REQUIREMENTS.md)：大作品/多数層/入力/表示の継続と負荷を測定し、方式を確定しない。
- 検証範囲：旧名/注記と新仕様の具体能力を対照。実装検証ではない。

## LC-296 — GPU Fallback

- 旧出典：[docs/FEATURE_CATALOG.md:410](https://github.com/totoro0419/illustro_old/blob/bdc7135b51033982d90ea5dad104bb04fc107df2/docs/FEATURE_CATALOG.md#L410)
- 旧内容：GPU Fallback。互換性上必要な場合（当時状態：Required）
- 判定：**改善して引き継いだ**。「GPU Fallback」の能力は以下の具体制御へ対応。
- 対応能力 [DEV-005](features/DEV.md#dev-005)：任意の高機能APIやペン無しでも基本制作、制約を実測して提示。実入力/画面/保存余裕/実測負荷・機能差。Nativeの能力を削らず未対応部分の外観/データ保持
- 検証範囲：旧名/注記と新仕様の具体能力を対照。実装検証ではない。

## LC-297 — 生成AIを中心価値にする

- 旧出典：[docs/FEATURE_CATALOG.md:416](https://github.com/totoro0419/illustro_old/blob/bdc7135b51033982d90ea5dad104bb04fc107df2/docs/FEATURE_CATALOG.md#L416)
- 旧内容：生成AIを中心価値にする。明示的方針（当時状態：Out of scope）
- 判定：**明確な理由で不要を推奨した**。「生成AIを中心価値にする」の能力は以下の具体制御へ対応。 生成主体を中心価値にしないというユーザー要求を保持。補助AIは削除しない。
- 対応能力 [AI-004](features/AI.md#ai-004)：ローカル基本制作を保ち、外部送信先/範囲/費用/保存を実行前に示す。送信先/範囲/費用/保存/学習条件・外部送信既定OFF。同意記録と結果出典を保持、基本制作は独立
- 検証範囲：旧名/注記と新仕様の具体能力を対照。実装検証ではない。

## LC-298 — 色提案

- 旧出典：[docs/FEATURE_CATALOG.md:417](https://github.com/totoro0419/illustro_old/blob/bdc7135b51033982d90ea5dad104bb04fc107df2/docs/FEATURE_CATALOG.md#L417)
- 旧内容：色提案。決定的アルゴリズム優先（当時状態：Investigate）
- 判定：**改善して引き継いだ**。「色提案」の能力は以下の具体制御へ対応。
- 対応能力 [AI-002](features/AI.md#ai-002)：既存絵・資料・パレットに基づく案を別候補として比較。既存絵/資料/パレット・候補数/対象・強度。別層/分岐へ採用、一Undo
- 検証範囲：旧名/注記と新仕様の具体能力を対照。実装検証ではない。

## LC-299 — 線画レイヤー領域補助

- 旧出典：[docs/FEATURE_CATALOG.md:418](https://github.com/totoro0419/illustro_old/blob/bdc7135b51033982d90ea5dad104bb04fc107df2/docs/FEATURE_CATALOG.md#L418)
- 旧内容：線画レイヤー領域補助。（当時状態：Investigate）
- 判定：**改善して引き継いだ**。「線画レイヤー領域補助」の能力は以下の具体制御へ対応。
- 対応能力 [AI-001](features/AI.md#ai-001)：明示起動、入力範囲、候補/修正/取消、非AIの手動操作を維持。入力範囲・候補・追加/減算・手修正。採用を一Undo、結果と手修正を保存
- 検証範囲：旧名/注記と新仕様の具体能力を対照。実装検証ではない。

## LC-300 — Selection補助

- 旧出典：[docs/FEATURE_CATALOG.md:419](https://github.com/totoro0419/illustro_old/blob/bdc7135b51033982d90ea5dad104bb04fc107df2/docs/FEATURE_CATALOG.md#L419)
- 旧内容：Selection補助。（当時状態：Investigate）
- 判定：**改善して引き継いだ**。「Selection補助」の能力は以下の具体制御へ対応。
- 対応能力 [AI-001](features/AI.md#ai-001)：明示起動、入力範囲、候補/修正/取消、非AIの手動操作を維持。入力範囲・候補・追加/減算・手修正。採用を一Undo、結果と手修正を保存
- 検証範囲：旧名/注記と新仕様の具体能力を対照。実装検証ではない。

## LC-301 — 整理補助

- 旧出典：[docs/FEATURE_CATALOG.md:420](https://github.com/totoro0419/illustro_old/blob/bdc7135b51033982d90ea5dad104bb04fc107df2/docs/FEATURE_CATALOG.md#L420)
- 旧内容：整理補助。（当時状態：Investigate）
- 判定：**改善して引き継いだ**。「整理補助」の能力は以下の具体制御へ対応。
- 対応能力 [AI-003](features/AI.md#ai-003)：層整理・名称・ごみ箇所の提案、描画順や見た目を無断変更しない。修復候補/名称/整理対象・見た目維持。一採用集合一Undo、元順序と名称を保持
- 検証範囲：旧名/注記と新仕様の具体能力を対照。実装検証ではない。

## LC-302 — 修正補助

- 旧出典：[docs/FEATURE_CATALOG.md:421](https://github.com/totoro0419/illustro_old/blob/bdc7135b51033982d90ea5dad104bb04fc107df2/docs/FEATURE_CATALOG.md#L421)
- 旧内容：修正補助。ユーザー制御必須（当時状態：Investigate）
- 判定：**改善して引き継いだ**。「修正補助」の能力は以下の具体制御へ対応。
- 対応能力 [AI-003](features/AI.md#ai-003)：層整理・名称・ごみ箇所の提案、描画順や見た目を無断変更しない。修復候補/名称/整理対象・見た目維持。一採用集合一Undo、元順序と名称を保持
- 検証範囲：旧名/注記と新仕様の具体能力を対照。実装検証ではない。

## LC-303 — AIなしでも成立する基本機能

- 旧出典：[docs/FEATURE_CATALOG.md:422](https://github.com/totoro0419/illustro_old/blob/bdc7135b51033982d90ea5dad104bb04fc107df2/docs/FEATURE_CATALOG.md#L422)
- 旧内容：AIなしでも成立する基本機能。Offline/再現性/Privacy（当時状態：Core）
- 判定：**改善して引き継いだ**。「AIなしでも成立する基本機能」の能力は以下の具体制御へ対応。
- 対応能力 [AI-004](features/AI.md#ai-004)：ローカル基本制作を保ち、外部送信先/範囲/費用/保存を実行前に示す。送信先/範囲/費用/保存/学習条件・外部送信既定OFF。同意記録と結果出典を保持、基本制作は独立
- 検証範囲：旧名/注記と新仕様の具体能力を対照。実装検証ではない。

## LC-304 — 絵チャ / Collaborative Drawing

- 旧出典：[docs/FEATURE_CATALOG.md:428](https://github.com/totoro0419/illustro_old/blob/bdc7135b51033982d90ea5dad104bb04fc107df2/docs/FEATURE_CATALOG.md#L428)
- 旧内容：絵チャ / Collaborative Drawing。本体完成後（当時状態：Future）
- 判定：**再検討のため保留した**。「絵チャ / Collaborative Drawing」の能力は以下の具体制御へ対応。 候補を削除せず範囲/精度/用途を比較待ち。
- 対応能力 [EXT-002](features/EXT.md#ext-002)：本体の完成像と別枠、履歴/権利/競合の製品要求から改めて設計。共同編集/絵チャ・参加/権限/競合候補。共同Undo/所有/保存競合は別仕様が必要
- 検証範囲：旧名/注記と新仕様の具体能力を対照。実装検証ではない。

## LC-305 — Realtime Multi-user Editing

- 旧出典：[docs/FEATURE_CATALOG.md:429](https://github.com/totoro0419/illustro_old/blob/bdc7135b51033982d90ea5dad104bb04fc107df2/docs/FEATURE_CATALOG.md#L429)
- 旧内容：Realtime Multi-user Editing。今は設計中心にしない（当時状態：Future / Investigate）
- 判定：**再検討のため保留した**。「Realtime Multi-user Editing」の能力は以下の具体制御へ対応。 候補を削除せず範囲/精度/用途を比較待ち。
- 対応能力 [EXT-002](features/EXT.md#ext-002)：本体の完成像と別枠、履歴/権利/競合の製品要求から改めて設計。共同編集/絵チャ・参加/権限/競合候補。共同Undo/所有/保存競合は別仕様が必要
- 検証範囲：旧名/注記と新仕様の具体能力を対照。実装検証ではない。

## LC-306 — 2D Asset Library

- 旧出典：[docs/FEATURE_CATALOG.md:435](https://github.com/totoro0419/illustro_old/blob/bdc7135b51033982d90ea5dad104bb04fc107df2/docs/FEATURE_CATALOG.md#L435)
- 旧内容：2D Asset Library。Local-first（当時状態：Required）
- 判定：**改善して引き継いだ**。「2D Asset Library」の能力は以下の具体制御へ対応。
- 対応能力 [AST-001](features/AST.md#ast-001)：ブラシ/先端/紙/質感/パターン/グラデ/色/マクロ/Workspace/資料/図形を保持。筆/先端/紙/質感/模様/グラデ/色/マクロ/Workspace/資料/図形の種別。資源の版と依存を管理、作品使用分は保持
- 検証範囲：旧名/注記と新仕様の具体能力を対照。実装検証ではない。

## LC-307 — Brush Asset

- 旧出典：[docs/FEATURE_CATALOG.md:436](https://github.com/totoro0419/illustro_old/blob/bdc7135b51033982d90ea5dad104bb04fc107df2/docs/FEATURE_CATALOG.md#L436)
- 旧内容：Brush Asset。（当時状態：Required）
- 判定：**改善して引き継いだ**。「Brush Asset」の能力は以下の具体制御へ対応。
- 対応能力 [AST-001](features/AST.md#ast-001)：ブラシ/先端/紙/質感/パターン/グラデ/色/マクロ/Workspace/資料/図形を保持。筆/先端/紙/質感/模様/グラデ/色/マクロ/Workspace/資料/図形の種別。資源の版と依存を管理、作品使用分は保持
- 検証範囲：旧名/注記と新仕様の具体能力を対照。実装検証ではない。

## LC-308 — Brush Tip / Texture Asset

- 旧出典：[docs/FEATURE_CATALOG.md:437](https://github.com/totoro0419/illustro_old/blob/bdc7135b51033982d90ea5dad104bb04fc107df2/docs/FEATURE_CATALOG.md#L437)
- 旧内容：Brush Tip / Texture Asset。（当時状態：Required）
- 判定：**改善して引き継いだ**。「Brush Tip / Texture Asset」の能力は以下の具体制御へ対応。
- 対応能力 [AST-001](features/AST.md#ast-001)：ブラシ/先端/紙/質感/パターン/グラデ/色/マクロ/Workspace/資料/図形を保持。筆/先端/紙/質感/模様/グラデ/色/マクロ/Workspace/資料/図形の種別。資源の版と依存を管理、作品使用分は保持
- 検証範囲：旧名/注記と新仕様の具体能力を対照。実装検証ではない。

## LC-309 — Paper Texture

- 旧出典：[docs/FEATURE_CATALOG.md:438](https://github.com/totoro0419/illustro_old/blob/bdc7135b51033982d90ea5dad104bb04fc107df2/docs/FEATURE_CATALOG.md#L438)
- 旧内容：Paper Texture。（当時状態：Required）
- 判定：**改善して引き継いだ**。「Paper Texture」の能力は以下の具体制御へ対応。
- 対応能力 [AST-001](features/AST.md#ast-001)：ブラシ/先端/紙/質感/パターン/グラデ/色/マクロ/Workspace/資料/図形を保持。筆/先端/紙/質感/模様/グラデ/色/マクロ/Workspace/資料/図形の種別。資源の版と依存を管理、作品使用分は保持
- 検証範囲：旧名/注記と新仕様の具体能力を対照。実装検証ではない。

## LC-310 — Pattern

- 旧出典：[docs/FEATURE_CATALOG.md:439](https://github.com/totoro0419/illustro_old/blob/bdc7135b51033982d90ea5dad104bb04fc107df2/docs/FEATURE_CATALOG.md#L439)
- 旧内容：Pattern。（当時状態：Required）
- 判定：**改善して引き継いだ**。「Pattern」の能力は以下の具体制御へ対応。
- 対応能力 [AST-001](features/AST.md#ast-001)：ブラシ/先端/紙/質感/パターン/グラデ/色/マクロ/Workspace/資料/図形を保持。筆/先端/紙/質感/模様/グラデ/色/マクロ/Workspace/資料/図形の種別。資源の版と依存を管理、作品使用分は保持
- 検証範囲：旧名/注記と新仕様の具体能力を対照。実装検証ではない。

## LC-311 — Gradient Preset

- 旧出典：[docs/FEATURE_CATALOG.md:440](https://github.com/totoro0419/illustro_old/blob/bdc7135b51033982d90ea5dad104bb04fc107df2/docs/FEATURE_CATALOG.md#L440)
- 旧内容：Gradient Preset。（当時状態：Required）
- 判定：**改善して引き継いだ**。「Gradient Preset」の能力は以下の具体制御へ対応。
- 対応能力 [AST-001](features/AST.md#ast-001)：ブラシ/先端/紙/質感/パターン/グラデ/色/マクロ/Workspace/資料/図形を保持。筆/先端/紙/質感/模様/グラデ/色/マクロ/Workspace/資料/図形の種別。資源の版と依存を管理、作品使用分は保持
- 検証範囲：旧名/注記と新仕様の具体能力を対照。実装検証ではない。

## LC-312 — Color Palette Asset

- 旧出典：[docs/FEATURE_CATALOG.md:441](https://github.com/totoro0419/illustro_old/blob/bdc7135b51033982d90ea5dad104bb04fc107df2/docs/FEATURE_CATALOG.md#L441)
- 旧内容：Color Palette Asset。（当時状態：Required）
- 判定：**改善して引き継いだ**。「Color Palette Asset」の能力は以下の具体制御へ対応。
- 対応能力 [AST-001](features/AST.md#ast-001)：ブラシ/先端/紙/質感/パターン/グラデ/色/マクロ/Workspace/資料/図形を保持。筆/先端/紙/質感/模様/グラデ/色/マクロ/Workspace/資料/図形の種別。資源の版と依存を管理、作品使用分は保持
- 検証範囲：旧名/注記と新仕様の具体能力を対照。実装検証ではない。

## LC-313 — Macro Asset

- 旧出典：[docs/FEATURE_CATALOG.md:442](https://github.com/totoro0419/illustro_old/blob/bdc7135b51033982d90ea5dad104bb04fc107df2/docs/FEATURE_CATALOG.md#L442)
- 旧内容：Macro Asset。（当時状態：Required）
- 判定：**改善して引き継いだ**。「Macro Asset」の能力は以下の具体制御へ対応。
- 対応能力 [AST-001](features/AST.md#ast-001)：ブラシ/先端/紙/質感/パターン/グラデ/色/マクロ/Workspace/資料/図形を保持。筆/先端/紙/質感/模様/グラデ/色/マクロ/Workspace/資料/図形の種別。資源の版と依存を管理、作品使用分は保持
- 検証範囲：旧名/注記と新仕様の具体能力を対照。実装検証ではない。

## LC-314 — Workspace Asset

- 旧出典：[docs/FEATURE_CATALOG.md:443](https://github.com/totoro0419/illustro_old/blob/bdc7135b51033982d90ea5dad104bb04fc107df2/docs/FEATURE_CATALOG.md#L443)
- 旧内容：Workspace Asset。（当時状態：Required）
- 判定：**改善して引き継いだ**。「Workspace Asset」の能力は以下の具体制御へ対応。
- 対応能力 [AST-001](features/AST.md#ast-001)：ブラシ/先端/紙/質感/パターン/グラデ/色/マクロ/Workspace/資料/図形を保持。筆/先端/紙/質感/模様/グラデ/色/マクロ/Workspace/資料/図形の種別。資源の版と依存を管理、作品使用分は保持
- 検証範囲：旧名/注記と新仕様の具体能力を対照。実装検証ではない。

## LC-315 — Reference Set

- 旧出典：[docs/FEATURE_CATALOG.md:444](https://github.com/totoro0419/illustro_old/blob/bdc7135b51033982d90ea5dad104bb04fc107df2/docs/FEATURE_CATALOG.md#L444)
- 旧内容：Reference Set。（当時状態：Required）
- 判定：**改善して引き継いだ**。「Reference Set」の能力は以下の具体制御へ対応。
- 対応能力 [AST-001](features/AST.md#ast-001)：ブラシ/先端/紙/質感/パターン/グラデ/色/マクロ/Workspace/資料/図形を保持。筆/先端/紙/質感/模様/グラデ/色/マクロ/Workspace/資料/図形の種別。資源の版と依存を管理、作品使用分は保持
- 検証範囲：旧名/注記と新仕様の具体能力を対照。実装検証ではない。

## LC-316 — Shape Preset

- 旧出典：[docs/FEATURE_CATALOG.md:445](https://github.com/totoro0419/illustro_old/blob/bdc7135b51033982d90ea5dad104bb04fc107df2/docs/FEATURE_CATALOG.md#L445)
- 旧内容：Shape Preset。（当時状態：Required）
- 判定：**改善して引き継いだ**。「Shape Preset」の能力は以下の具体制御へ対応。
- 対応能力 [AST-001](features/AST.md#ast-001)：ブラシ/先端/紙/質感/パターン/グラデ/色/マクロ/Workspace/資料/図形を保持。筆/先端/紙/質感/模様/グラデ/色/マクロ/Workspace/資料/図形の種別。資源の版と依存を管理、作品使用分は保持
- 検証範囲：旧名/注記と新仕様の具体能力を対照。実装検証ではない。

## LC-317 — Folder / Collection / Tag

- 旧出典：[docs/FEATURE_CATALOG.md:446](https://github.com/totoro0419/illustro_old/blob/bdc7135b51033982d90ea5dad104bb04fc107df2/docs/FEATURE_CATALOG.md#L446)
- 旧内容：Folder / Collection / Tag。（当時状態：Required）
- 判定：**改善して引き継いだ**。「Folder / Collection / Tag」の能力は以下の具体制御へ対応。
- 対応能力 [AST-002](features/AST.md#ast-002)：名前/用途/タグ/履歴、非表示でも存在が分かる。フォルダー/Collection/タグ/用途/最近/お気に入り。整理は個人素材庫、作品の描画Undoと分離
- 検証範囲：旧名/注記と新仕様の具体能力を対照。実装検証ではない。

## LC-318 — Search / Favorite / Recent

- 旧出典：[docs/FEATURE_CATALOG.md:447](https://github.com/totoro0419/illustro_old/blob/bdc7135b51033982d90ea5dad104bb04fc107df2/docs/FEATURE_CATALOG.md#L447)
- 旧内容：Search / Favorite / Recent。（当時状態：Required）
- 判定：**改善して引き継いだ**。「Search / Favorite / Recent」の能力は以下の具体制御へ対応。
- 対応能力 [AST-002](features/AST.md#ast-002)：名前/用途/タグ/履歴、非表示でも存在が分かる。フォルダー/Collection/タグ/用途/最近/お気に入り。整理は個人素材庫、作品の描画Undoと分離
- 検証範囲：旧名/注記と新仕様の具体能力を対照。実装検証ではない。

## LC-319 — Asset Import / Export

- 旧出典：[docs/FEATURE_CATALOG.md:448](https://github.com/totoro0419/illustro_old/blob/bdc7135b51033982d90ea5dad104bb04fc107df2/docs/FEATURE_CATALOG.md#L448)
- 旧内容：Asset Import / Export。（当時状態：Required）
- 判定：**改善して引き継いだ**。「Asset Import / Export」の能力は以下の具体制御へ対応。
- 対応能力 [AST-003](features/AST.md#ast-003)：依存も含めたパック、形式/ライセンス/欠落の説明。パック形式・依存・ライセンス・含有項目。新規IDで追加、明示置換のみ元更新
- 検証範囲：旧名/注記と新仕様の具体能力を対照。実装検証ではない。

## LC-320 — Navigator

- 旧出典：[docs/FEATURE_CATALOG.md:449](https://github.com/totoro0419/illustro_old/blob/bdc7135b51033982d90ea5dad104bb04fc107df2/docs/FEATURE_CATALOG.md#L449)
- 旧内容：Navigator。Thumbnail + Viewport + Zoom/Pan（当時状態：Required）
- 判定：**改善して引き継いだ**。「Navigator」の能力は以下の具体制御へ対応。
- 対応能力 [REF-005](features/REF.md#ref-005)：表示領域枠、独立表示倍率・反転/明度、編集対象は共有。Navigator倍率/表示枠・独立ビューの倍率/反転/明度。編集状態は共有、表示状態はビュー別。表示操作Undo外
- 検証範囲：旧名/注記と新仕様の具体能力を対照。実装検証ではない。

## LC-321 — Dock / Float Navigator

- 旧出典：[docs/FEATURE_CATALOG.md:450](https://github.com/totoro0419/illustro_old/blob/bdc7135b51033982d90ea5dad104bb04fc107df2/docs/FEATURE_CATALOG.md#L450)
- 旧内容：Dock / Float Navigator。（当時状態：Required）
- 判定：**改善して引き継いだ**。「Dock / Float Navigator」の能力は以下の具体制御へ対応。
- 対応能力 [REF-005](features/REF.md#ref-005)：表示領域枠、独立表示倍率・反転/明度、編集対象は共有。Navigator倍率/表示枠・独立ビューの倍率/反転/明度。編集状態は共有、表示状態はビュー別。表示操作Undo外
- 検証範囲：旧名/注記と新仕様の具体能力を対照。実装検証ではない。

## LC-322 — Multi-view of same Document

- 旧出典：[docs/FEATURE_CATALOG.md:451](https://github.com/totoro0419/illustro_old/blob/bdc7135b51033982d90ea5dad104bb04fc107df2/docs/FEATURE_CATALOG.md#L451)
- 旧内容：Multi-view of same Document。全体/細部、Mirror、Value確認等（当時状態：Investigate）
- 判定：**改善して引き継いだ**。「Multi-view of same Document」の能力は以下の具体制御へ対応。
- 対応能力 [REF-005](features/REF.md#ref-005)：表示領域枠、独立表示倍率・反転/明度、編集対象は共有。Navigator倍率/表示枠・独立ビューの倍率/反転/明度。編集状態は共有、表示状態はビュー別。表示操作Undo外
- 検証範囲：旧名/注記と新仕様の具体能力を対照。実装検証ではない。

## LC-323 — Plugin / Extension API

- 旧出典：[docs/FEATURE_CATALOG.md:452](https://github.com/totoro0419/illustro_old/blob/bdc7135b51033982d90ea5dad104bb04fc107df2/docs/FEATURE_CATALOG.md#L452)
- 旧内容：Plugin / Extension API。Core完成前に公開APIを固定しない（当時状態：Future / Investigate）
- 判定：**再検討のため保留した**。「Plugin / Extension API」の能力は以下の具体制御へ対応。 候補を削除せず範囲/精度/用途を比較待ち。
- 対応能力 [EXT-001](features/EXT.md#ext-001)：コマンド/ブラシ/効果/取込/パネルの将来拡張、公開APIや実行方式は未決定。Command/筆/効果/入出力/Panelの拡張候補。拡張不在でも保存済外観/データ保持を要求
- 検証範囲：旧名/注記と新仕様の具体能力を対照。実装検証ではない。

## LC-324 — Internal Module Boundaries

- 旧出典：[docs/FEATURE_CATALOG.md:453](https://github.com/totoro0419/illustro_old/blob/bdc7135b51033982d90ea5dad104bb04fc107df2/docs/FEATURE_CATALOG.md#L453)
- 旧内容：Internal Module Boundaries。将来拡張を不必要に阻害しない（当時状態：Core）
- 判定：**再検討のため保留した**。「Internal Module Boundaries」の能力は以下の具体制御へ対応。旧記載は技術候補であり、同じ結果要求を残して方式選定を次段階へ分離。
- 対応能力 [QR-20](QUALITY_REQUIREMENTS.md)：大作品/多数層/入力/表示の継続と負荷を測定し、方式を確定しない。
- 検証範囲：旧名/注記と新仕様の具体能力を対照。実装検証ではない。
