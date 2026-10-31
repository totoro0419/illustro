# 変形後の描画・消去・混色 — 参照意味と採否

**第③段階の限定CPU参照検証済（固定fragmentに加え実三角形mesh・2種補間・複数live Effect）。最終UI承認・実GPU検証ではない。** D02の「Document上の後段筆跡が旧変形へ自動追従しない」を維持する。原本を焼き込まない。実装者は下記の数式と保存根を変えてはいけない。

## 評価順序

原本 → 明示順序のTransform → 順序付き後段編集 → liveなLayer Mask → Clip → Layer Blend → 下流Effect。後段を含む全体を移動するときは、この単位の後に新Transformを置く。以前のTransformノードだけを再編集すれば後段のDocument座標は固定。

自己重複Warpは前向きラスタライズでfragment順序とcoverageを定義する。逆写像が一意だと仮定しない。参照実験は出力画素ごとのfragment列を入力し、その合成を検証する。**旧test_raster.pyは幾何Warpラスタライザーを検証していない。** 追加のwarp_reference.pyは三角形の幾何逆計算・折返し・補間の**独立した限定CPU参照**を実行する。製品の全Warp/Liquify実装・筆形状・高速化を証明しない。

## 後段演算

以下はpremultiplied RGBA。Dは直前の対象層評価、Sは筆の正確なsource、c∈[0,1]は筆形状×固定Selection coverage。各値は合成契約で宣言した計算空間へ変換してから用いる。

| 演算 | 結果 | 旧Transform再編集時 |
|---|---|---|
| Paint | S′=cS、D′=S′+(1−S′α)D | 同じ位置・色・筆幅で新下地へ合成 |
| Erase | D′=(1−c·strength)D | 固定位置の新下地にも消去が作用 |
| Smudge/混色の確定結果 | D′=(1−c)D+cR。Rは受理時の明示read revisionから採取したpremul画素 | Rと位置を固定。再採色しない。cをRへ焼込んだ上で再度掛けない |
| Alpha Lock付きPaint | a′=Dα。straight RGBを強度c·Sαで混合し、a′を掛け直す | 各評価時の対象αを保存。新たな透明部分へ色を発生させない |
| Selection | 操作受理時の選択版をcへ固定 | 後から別の選択を作っても過去筆を変えない |
| Layer Mask/Clip | 演算列後のRGBAを各αで一回だけ減衰 | liveな属性変更として再評価。版はcache keyへ含める |

Alpha Lockの旧「操作時のαmaskを固定」という案は取り下げる。旧下地移動で空になった部分への新しい塗りや、α二乗を招くため。上記は画素参照で反例を検査した修正案であり、ユーザーが旧変形再編集時の見え方を承認済みという意味ではない。

採色対象は「対象層／表示合成／資料」を明示。参照実験のSmudgeは対象層のMask/Clip適用前を採色する。表示合成採色を実装するときは、その合成版とICCを固定しRへ保存する。実行時に現在の下地へ黙って差替えない。

## 保存する正本

原本ブロック、Transform定義・版、演算ID/順序、Document座標coverage、固定Selection、筆版、色契約、必要なRとsampleBasis、live Mask/Clip/Blendの版。評価済キャッシュは正本の代用にしない。Undo/Redoは不変rootを移し、SaveFenceは要求rootを固定。JSON往復試験はこの論理根の往復であり、Native形式の耐久保存実証ではない。

## 方式比較

| 候補 | 正確性 | 負荷・容量 | 採否 |
|---|---|---|---|
| 全演算を保持し毎回新下地から再採色 | Paint/Erase可能、Smudgeの確定見た目が変わる | 再演CPU/GPU、筆/ICC版管理 | 再採色は明示操作だけ。既定には不採用 |
| 全完成画像を固定 | 元変形の再編集が反映されない | 高容量、評価は単純 | 元画像＋完成画像だけでは不採用 |
| 加算差分のみ | 不透明Erase差分を透明下地へ適用すると負α | 局所化可能だが式が成立しない | 不採用 |
| 単純source-over overlay | 不透明原画を消せない | 軽い | 不採用 |
| Paint/Erase演算＋範囲付きRの混合 | 表の意味を表現できる | Rは作用領域だけ保持、再評価はチェックポイント可能 | **CPU意味参照の採用案**。製品GPU方式は条件付き |

速度・peak RAM・保存容量の実測優位は未確認。上の比較は数式上の反例と責務から導く設計判断。

## 証拠と未閉鎖条件

`experiments/stage3-reference/test_warp_reference.py`：折返し・境界・bilinear/cubic B-spline・Erase/固定Smudge・下流2 live Effect・保存根・haloの12試験（GPU/全Warpは非対象）。実装とレビュー範囲は[AUD006参照契約](AUD006_WARP_REFERENCE_REVIEW.md)。

`experiments/stage3-reference/test_raster.py`：不透明消去、半透明＋Mask＋Clip、変形再編集→Undo/Redo→Save/Reload、固定Smudge、Alpha Lock、折返しfragment、加算差分反例。期待値はFractionによる手計算定数。`test_cross_feature.py`はNormal/Multiplyの半透明画素とαを追加。

AUD-006は引き続き開く。幾何三角形Warpと二つの補間方式、後段演算＋2 live Effect＋固定保存rootの限定参照を追加した。一方、**任意Warpの網羅ではなく、ユーザー本人による再編集意味の比較確認は未完了**。全GPU画素試験を第③段階の閉鎖に要求する旧記述は、今回のユーザー指示に従い第④段階へ分離する。ただしCPUの少数例だけで全方式の成立性を証明したことにもしない。
