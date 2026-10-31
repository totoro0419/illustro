# AUD006 — 幾何Warp・後段描画・live Effectの第③段階参照契約

## 判定範囲

演算意味のCPU設計参照は拡張したが、ユーザーによる再編集UIの理解確認は未実施。AUD006の監査台帳を無条件に閉鎖しない。参照コードはGPU・製品コード・任意Warp/ICC・実機速度・表示品質の合格証明ではない。正式スコープとPR #5のD02（既存Transform再編集時、後段筆跡はDocument座標に残る）を維持する。

## 演算意味の設計条件

1. 保存正本は原本＋幾何Transformパラメータ＋操作順付き後段演算。画素キャッシュは派生物。既存Transformノードの再編集はそのノードのみ置換し、後続Paint/Erase/Smudgeのcoverage/位置はDocument座標固定。全体を移すには後段より後ろに新Transformを置く。無断Bake・無言再採色は禁止。
2. Warp三角形は出力3頂点を持ち、各出力位置から三角形内のソース座標をバリセントリック補間。折返しでは多値のsource fragmentを明示描画順にpremultiplied source-over。一意な全体逆写像は仮定しない。面積0の三角形は拒否。実装で向きを正規化し境界を半開規則で一度だけ数える。意図的な重なりは許す。
3. pixel centers=(i+1/2,j+1/2)。補間は宣言した計算色空間でpremul RGBA。参照はclamp-to-edge bilinearと非負重みseparable cubic B-spline。後者は品質候補であり製品の既定選択を宣言しない。サブサンプルごとに重なり合成した後で画素平均する。coverageを平均してから合成する近似と混同しない。
4. Warp評価後、後段編集を受理順に適用。Paintはpremul over、Eraseは(1−c·s)D、Smudge確定は(1−c)D+cR、Alpha Lockは現時点のDαを保存して色のみ更新。Selection coverageは受理版で固定。RはSmudge受理時の明示read revisionから固定・保存し、元Transformを再編集しても再採色しない。live Mask/Clipは後段編集の後。下流live Effectは明示順で評価し、入力・Mask/Clip・Effectパラメータ版の変更時に必要な依存範囲を再評価する。
5. 参照のlive Effectは透明外延の3×3 separable [1,2,1]/4 blurと、premul RGBへのgain（RGB≤αでclamp）。Blur→GainとGain→Blurは非可換。kernel、alpha、境界、halo、作用順、色計算空間、Undo/Save rootを版付きで記録する。ほかのEffectには各自の数値契約が必要。
6. History/SaveFenceはTransform・後段演算・固定R・Effect・Mask/Clipの不変rootを参照する。Undo/Redo後もSave要求時点のrootは不変。Rを現表示キャッシュから再取得せず、sampleBasis復元に必要な値とprofile/精度を保護する。

## 参照検査と独立性

- experiments/stage3-reference/warp_reference.py：Fraction幾何triangle rasterizer、fold、bilinear/cubic B-spline、premul合成、後段編集、mask/clip、二つのlive Effect。
- experiments/stage3-reference/test_warp_reference.py：13件。サブケースは13より多い。
- 既存のtest_raster.pyの固定fragment・手計算検査とは別に追加。
- 実行コマンド：python experiments/stage3-reference/run_reference.py。

証拠は以下を区別する。

- **手計算で固定した定数**：2×2 bilinear四隅平均のRGBA=(1/2,1/2,1/2,1)；半透明赤→青のfold=(1/4,0,1/2,3/4)、逆順=(1/2,0,1/4,3/4)；blur/gainの3×3期待画素；cubic B-spline中心係数4/9。
- **異なる式の同値**：triangle edge-functionと独立した2×2線形逆写像、bilinearの分解式と重み和。異なる3種類のmesh、サブサンプル数1/2/3/4を比較。両方ともPythonであり製品コードとの独立性はない。
- **状態不変条件**：幾何Warp上のPaint→Erase→固定Smudge→Alpha Lock、折返し、Mask/Clip、二つのlive Effect、Undo/Redo、Save root→JSON往復、haloを含むタイルと全体blurの同値。Haloなし、Effect順逆転、fragment順交換は負例。
- **未実証**：任意Mesh/Warp/Liquify、全補間と縮小、全Effect kernel、ICC/Proof、GPU/Worker/Tile実転送、Native保存や強制終了、色品質・利用者の理解・実端末速度。

独立性の限界：二つの幾何参照は下流演算とEffect部分を共有する。同値だけでパイプライン全体が正しいと推論せず、定数・反例・不変条件で補完した。動作例に限定したCPU設計証拠であり製品画質の達成証明ではない。

## ユーザーへ提示する再編集UX

| 具体操作 | 仕様上の期待 |
|---|---|
| 変形した画像を消す | 消去範囲はDocument座標固定 |
| 以前のTransformだけを移す | 元画像は新位置へ。消去位置は固定なので、移動後の元画像が見える場合がある |
| 消去や混色のあとに元Transformを再編集 | 確定SmudgeのR色と位置は不変。無断で別の下地から採色しない |
| 後段編集ごと一緒に動かす | 明示操作で後段より後ろに新Transformを置く |
| Mask/Clip/live Effectを再編集 | 下流属性として結果を再評価し、Undoの対象を表示する |

UIでは「後から描いた線・消去・混色は、以前の変形を調整しても一緒に動きません」を分かりやすく表示する。必要ならDocument固定領域のゴースト/アウトライン案を比較する。自動追従や確定画素化を無断で行わない。

**この説明はユーザーの正式承認や初見試験の代わりではない。** 第③段階のUI最終確認に実画像比較を残す。AUD006は技術参照の証拠が追加されても無条件の閉鎖にはしない。

## 第④段階への境界

本参照に対して製品GPU/CPUと8U/16U/16F誤差を事前閾値で検査する。三角形以外のWarpサブタイプ・kernel・ICC追加時は固有goldenを先に定義。GPU tile halo・世代・RAM・入力同時操作の統合試験、実端末画質/性能は④。未測定をPASSにしない。
