# 主要アプリ比較 — 2026-10-02に公式資料を確認

**目標は総合的な優位。現在その達成を証明していない。**

資料の機能分類を比べることと、同じ人・同じ端末で自然さや速さを比べることは別。ここでは公式の機能と現在コードの対応を確認した。主要アプリをインストールして同じ絵を描く検査は実施していない。

|アプリ|公式で確認した特徴|現在のIllustroとの関係|不足または未確認|
|---|---|---|---|
|Clip Studio Paint|圧力/傾き/速度/乱数、サイズ・濃さ・密度、Tip/Spacing/Texture、補正/入り抜き、Dual brush、color mixing|基本設定群を実装|color mixing、独立Dual設定、自然さ・実機速度は未確認|
|Procreate|Stroke Path、補正/StreamLine/Motion Filtering、Taper、Shape/Grain、Dynamics/Color/Apple Pencil、Dual、整理・検索・保存|形・紙目・設定連動・検索・JSON保存がある|Motion Filteringの比較、独立Dual、使いやすいブラシ作成/整理/リソース管理が弱い|
|ibisPaint|先端・形状・テクスチャ、速度/圧力で太さ・濃さ・ぼかしを変える設定、入り抜き等|太さ・濃さ・速度連動・入り抜き・模様は対応|実際のぼかし、独自ペンの画家向け品質、タッチ制作効率の比較は未確認|
|Photoshop|Shape Dynamics、pressure/tilt対応、Scatter/Color Dynamics、Texture/Dual Brush|主要な変化元と形・紙目を扱う|ブラシ素材交換、深いDual/混色、実測は未確認|
|Krita|PixelだけでなくColor Smudge・Bristle・Hatching・Particle・MyPaint等の複数エンジン|通常の押印と一部の質感を実装|Color Smudge、粒子等の独立エンジン群に相当する表現を未実装|
|Affinity Photo 2|Flow/Accumulation/Hardness/Spacing、Pressure/Velocity/Tilt/Rotation/Direction/Distance/Cyclic、Texture/Multi-nozzle/Sub Brushes|Flowと濃さを分離、曲線と周期、複数形の積は対応|複数Nozzle/独立Sub Brush、wet edge等、現在最新製品全体の検査は未確認|
|Adobe Fresco|Live brushの水彩拡散と油彩混色、筆の整理|通常の押印のみ|油彩混色と素材管理の比較は未確認。水彩物理の再現自体はユーザー指定で不要|
|Rebelle|公式説明に顔料混色・油彩の厚み・水彩拡散|通常の色合成のみ|自然な混色と質感の表現幅が不足。水彩物理を同じ方式で実装することは要求しない|
|Sketchbook|先端の形・縁・texture編集、画像import/capture、カラーstamp|Alpha maskと紙目のデータ定義がある|視覚編集・画像取込・色付きstampは不足|
|PaintTool SAI|公式説明にdigitizer対応とanti-alias描画|筆圧入力と縁のcoverageを実装|実機の線品質・描き心地・軽さの比較は未確認。詳細設定は深掘り未完了|

Affinityについて確認したのはPhoto 2の公式資料。別バージョン/別製品へ同じ事実を拡張しない。競合の内側の補間式・GC・メモリ方式をマニュアルだけから推測しない。資料に記載がない機能を「非対応」と決めない。

最初の6本だけで「主要アプリ全体を上回った」と判断しない。上の追加アプリも比較に含める。Painter、ArtRage、MediBang等の詳細調査は未完了であり、比較対象から都合よく除外しない。対象の版・端末・用途は実制作比較時に固定して記録する。総合優位の基準は、不要と明示された水彩物理の実装競争ではなく、通常の一枚絵制作の線・塗り・混色・表現幅・操作・性能・安定性で判断する。

## 軽量描画・補正の追加調査

ibisPaintの[14.1.0新機能](https://ibispaint.com/newFeature.jsp?lang=ja)には事前補正と高速入力時の遅れ改善の説明がある。公開情報から内側の計算式は取得できない。libmypaintのタイルごとの新規操作処理とdirty更新、regl-gpu-linesのinstancing、Chromeのdesynchronized canvasのDOM条件を調べ、今回の差分表示とGPU押印へ適用した。出典・採用範囲は[LATENCY](LATENCY.md)に記録した。これを競合との同条件性能比較や、ibisの内部方式のコピーと混同しない。

## 一枚絵の用途と初期ペン

公式のBrush Libraryや設定には、スケッチ、線画、塗り、テクスチャ、装飾、Smudge/Erase等の多様な用途がある。今回の50標準+6独自は、失われた候補の用途を復元した初期コーパス。**56本が十分という最終決定ではない。** 競合の最新初期セットを全アプリで実際に数えてはいないので、本数の優位や不足カテゴリゼロとは断言しない。

ラフ・下書き・細線・漫画線・鉛筆・マーカー・筆・厚塗り風・淡い塗り・影・光・肌・髪・背景・質感・装飾・消去をカバーする設定がある。一方、既存画素を扱うぼかし/Smudge/色混ぜはこの実装にない。用途の名前があるだけで実用性合格としない。

## 最終評価の現在値

|評価区分|判断|
|---|---|
|上回ったと立証できる点|現時点ではなし。同一条件の競合実測がない|
|同程度と立証できる点|現時点ではなし。設定の分類が共通でも、出力品質の同等を証明しない|
|弱いと判断できる点|独立Dual/Multi-brush、素材の視覚編集・整理、既存画素の混色・ぼかし、制作アプリへの統合、実機認証の範囲|
|比較不能な点|入力→画面の遅れ、描き心地、補正の好み、長時間の熱/電池/メモリ、人間による初期ペン評価|

## 次の比較方法

同じ一枚絵で、ラフ→顔/髪の線→ベタ→影→肌→背景→仕上げを実行する。アプリごとに可能な近い筆先と補正を選び、押しつける設定ではなく最良の使い方で比較。順番を変えて、不要な補正・角の丸まり・弱い筆圧・速い髪・点・面・サイズ変更・Undo・再開を確認。人間の評価、見た目、測定、未確認を分ける。競合の得意分野を避けて総合優位としない。

## 公式資料

- [Clip Studio Paint](https://help.clip-studio.com/en-us/manual_en/240_brushes/Customizing_brush_tools.htm)
- [Procreate設定](https://help.procreate.com/procreate/handbook/brushes/brush-studio-settings) / [Library](https://help.procreate.com/procreate/handbook/brushes/brush-library)
- [ibisPaint設定](https://ibispaint.com/lecture/index.jsp?lang=en&no=118)
- [Photoshop Dynamics](https://helpx.adobe.com/photoshop/using/adding-dynamic-elements-brushes.html)
- [Krita Engines](https://docs.krita.org/en/reference_manual/brushes/brush_engines.html)
- [Affinity Photo 2](https://affinity.help/photo2/English.lproj/pages/Painting/pixel_modify.html)
- [Adobe Fresco Live brushes](https://helpx.adobe.com/fresco/desktop/draw-paint-animate-and-share/live-brushes.html)
- [Rebelle](https://www.escapemotions.com/products/rebelle/about)
- [Sketchbook素材編集](https://help.sketchbook.com/docs/customizing-brushes)
- [PaintTool SAI公式説明](https://systemax.jp/en/sai/)

引用ではなく短い機能整理。未取得の内部処理や、マニュアルから導けない品質差は記載しない。
