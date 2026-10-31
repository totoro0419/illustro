# 技術方式の最終採否と残余条件

**採用は第③段階の意味契約、条件付き採用は実装候補。製品性能合格とは異なる。** 第②段階の42方式比較とPR6のLabは保持。以下は今回得た追加証拠を反映した現行判断。

| 争点 | 採否 | 根拠・比較・残条件 |
|---|---|---|
| 入力/View | 独立受付とsample時刻のViewPoseを採用 | 正式計算待ちの入力列は不採用。実GPU占有下の画面更新最大遅延は第④段階 |
| 正式Job | 受理順/FIFO＋明示DAGを採用 | 完了順commitは旧版上書き。失敗注入で依存Bのみblocked/独立C保護を確認 |
| Handoff | 排他coverageを含むatomic snapshotを採用 | 24通りtile完了順×半透明の参照画素。split更新の二重/欠落反例。実GPU転送とEffect依存prefixは今後 |
| GPU投入 | 分割＋in-flight上限＋View予算を条件付き採用 | 任意preemptは使わない。別deviceも物理独立保証なし。dispatch時間と上限は実機比較で決定 |
| 非破壊後段 | Paint/Erase演算＋範囲付き固定Replaceの混合を条件付き採用 | Fractionの画素/α/履歴/保存参照は成立。単純overlay/加算差分/無言Bakeは不採用。幾何三角形Warp+bilinear/cubic B-spline+2 live Effectの限定参照追加。AUD006のユーザー再編集UXと全Warp品質は残る |
| Alpha Lock | 評価時の対象αを維持する修正案を採用 | 固定旧α案は取り下げ。透明部分への色発生を反例で検査。brush座標/Selectionは固定 |
| 履歴 | 不変root・名前付きscope・用途pinを採用 | 作品Undoは入口間で同じaction。候補は専用Undo。Pad/資料を含むUX評価はAUD016 |
| Save/Recovery | Fence＋検証済manifest＋保存先sequenceを採用 | A/B/Undo/Save/Redo、逆順保存、失敗点別モデル。物理ストレージ耐久は未実証 |
| Cache/halo | 全依存版のkey、kernel別halo、循環拒否を採用 | 箱ぼかしtile同値、Fill遠方伝播の反例。全Effectの数値・halo定義は未完了 |
| 正本精度 | 8U/16U/16Fを別表現、明示丸めを採用 | 全コード/有限half往復。限定実CMMは8U/16U/16Fも誤差内。任意ICC/Proof/GPUは未検証 |
| 合成の既定 | encoded互換案、linear明示選択を比較中 | 製品仕様の無言全linear化を避ける。50%白の差を数値で固定。既定の見た目最終決定は未承認 |
| 大規模作品 | sparse residency・非LRU正本・予算予約を条件付き採用 | 資源式とwriter枯渇モデル。tile寸法、peak RAM、保存容量、熱は未計測 |

## 後段方式の10評価軸

下記の負荷・容量は構造からの設計判断で、実測ランキングではない。

| 軸 | 演算再演 | 完成画素固定 | 加算差分 | 採用候補：演算＋範囲付きReplace |
|---|---|---|---|---|
| 正確性 | 再採色で確定Smudgeが変化 | 下地再編集を反映不能 | 透明下地で負α | 参照意味を満たす小規模証拠 |
| 画質 | 筆版/ICC依存が必要 | 保存品質を維持可 | 合成自体に反例 | 固定Rの精度維持が必要 |
| 操作応答 | 長い再演が重い可能性 | 表示は単純 | 局所更新可 | checkpoint＋dirty評価候補 |
| CPU/GPU | 履歴長依存 | 再評価少 | 差分演算少 | 作用域と依存prefix次第 |
| メモリ | 入力/演算とcache | 全画像分 | 局所差分分 | 演算＋Rの作用域分 |
| 保存容量 | 演算/筆版/素材版 | 全画像と原本 | 差分次第 | 可逆演算と固定Rの混合 |
| 拡張性 | 新筆再演の互換負担 | 下地編集と衝突 | 非線形演算に弱い | 新演算は明示version/参照が必要 |
| 実装複雑性 | evaluator互換が重い | 格納は単純 | 単純だが不正 | descriptor/coverage/順序管理 |
| 保守性 | 旧kernel永続保守 | 元データとの整合難 | 不正を回避不可 | 固定Rにより旧Smudge再演を減らす |
| 障害復旧 | 元入力から再演可能 | 完成画像を保護 | 原本依存 | 元入力/原本/Rを用途pinし再構成 |

正確性に反例のある案は、速度比較を理由に採用しない。固定Rも作用mask二重掛け・α処理・採色版を誤ると不正になるため、`TRANSFORM_POSTPAINT_SEMANTICS.md`の数式を受入条件とする。

## 実行証拠

- `experiments/stage3-reference/run_reference.py`：旧証拠30件に追加の13件（AUD006幾何Warp）を接続する限定CPU参照検査。ゴールデン画素は手計算Fraction、`evidence/golden-pixels.json`と`golden.svg`で表現。
- `icc_probe.py`：Little CMS実CMMと独立CSS行列。6色×DBL/8U/16U/16F/保存ICC再読込の限定比較。ローカル2.14、CI側版は実行ログで確認。任意ICC LUT/Proof/CMYK/全色域へ一般化しない。
- UI/型/988導線は最終監査のCIログへ。実機/GPU/Native耐久を代用しない。

一次資料：[WebGPU](https://www.w3.org/TR/webgpu/)、[CSS Color 4](https://www.w3.org/TR/2026/CRD-css-color-4-20261009/)、[ICC](https://www.color.org/getting-started/)、[Little CMS公式API](https://github.com/mm2/Little-CMS/blob/master/include/lcms2.h)。Illustroの受入上限は`SYSTEM_CONTRACTS.md`§9で試験前に定義。
