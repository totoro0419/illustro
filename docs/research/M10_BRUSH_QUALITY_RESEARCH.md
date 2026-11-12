# M10 Brush 品質 — 公式資料調査と実装判断

調査日: 2026-10-19
基準: `e510ea18b447a5e6d74721bd23b07acab15c391d` → M10 stacked PR #39
位置づけ: 公式に公開された操作・設定仕様の比較であり、他製品の非公開アルゴリズムを推定した文書ではない。

## 公式資料の確認結果

| 製品 | 確認された公開仕様 | M10への判断 |
|---|---|---|
| ibisPaint | Stabilizerを「Real Time / After」から選択。Real TimeはConstant/Fast Strokes、Force Fadeは開始長・終了長と曲線の設定。共通/ブラシ別切替を提供。 | **採用**: 既存の独立した手ブレ補正と強制入り抜きを維持し、ブラシ設定に露出する。**保留**: After補正は既存の描画中/確定後一致を破壊しない再現・比較まで本番へ導入しない。 |
| CLIP STUDIO PAINT | 全体に適用する筆圧調整曲線、ブラシごとの補正と調整設定を持つ。補正を強くすると描画感が重くなり得ることをヘルプで説明。 | **採用**: deviceCurveと個別brush curveの役割を分離し、補正は使用者が調整可能にする。**保留**: 対応端末ごとの自動較正ウィザードは入力データの実測前に仮実装しない。 |
| Procreate | StreamLine・Stabilization・Motion Filteringを分離。Pressure Taperと指用Touch Taperを分離。Shape Filteringに複数モード、GrainはMoving/Texturized、Brush Studioでサイズ・フロー・傾き等を設定。 | **採用**: 実筆圧がない指でも強制入り抜きは筆圧を偽装せず使用する。Texture空間を区別する。**不採用**: M10で方式を丸ごと置換すること。 |
| Krita | Freehand Brush ToolでNo/Basic/Weighted/Stabilizer等の手ブレ補正を選択できる。補正なしは追従の速い設定と明記。 | **採用**: 補正0を残し、段階に応じた追従を比較する。**保留**: 別系統の補正器の追加は性能証拠なしに行わない。 |
| Adobe Photoshop | Brush SettingsにShape/Color/Transfer dynamics。Pen Pressure・Pen Tilt・Stylus Wheel・Rotationは対応入力機器が必要で、利用不能の場合の警告を明記。 | **採用**: センサー未取得を実値と扱わず、対応可否と結果を区別する。**保留**: 高度なブラシ変調UIは必要な計測と保存互換を確認してから段階的に公開する。 |
| Affinity Photo 2 | Painting/Brushesでカスタムブラシの作成・変更。Brush Toolは幅・不透明度・Flow等の調整。iPad版では幅・Flow等を画面上から操作できる。 | **採用**: 一般的な主要数値をBrush欄で編集し、編集設定を自作presetとして保存する。**不採用**: キャンバス上の複雑なショートカットをM10で増設する。 |

## 公式一次資料

- ibisPaint Stabilizer: https://ibispaint.com/lecture/index.jsp?no=50
- CLIP STUDIO PAINT 筆圧: https://help.clip-studio.com/en-us/manual_en/240_brushes/Adjusting_pen_pressure.htm
- CLIP STUDIO PAINT 補正: https://support.clip-studio.com/en-us/faq/articles/20200030
- Procreate Brush Studio: https://help.procreate.com/procreate/handbook/5.4/brushes/brush-studio-settings
- Krita Freehand Brush Tool: https://docs.krita.org/en/reference_manual/tools/freehand_brush.html
- Photoshop Dynamics（2026-10-15更新）: https://helpx.adobe.com/photoshop/desktop/apply-painting-techniques/fill-objects-selections-layers/brush-dynamics-settings.html
- Affinity Photo 2公式ヘルプ: https://affinity.help/photo2/English.lproj/
- Affinity Photo 2 iPad Paint Brush: https://affinity.help/photo2ipad/en-US.lproj/pages/Tools/tools_paintBrush.html

## Illustroの現物から確認した実装境界

1. `packages/brush-rt/src/foundation.mjs` に完全なFoundation v2 preset、検証、brush-pack import/exportが存在する。M10は重複形式を作らずこれを利用する。
2. `apps/editor/src/brushSurface.ts` は正式Foundation presetとGPU描画を接続済み。筆跡ごとにpresetを渡すので、過去のStrokeRecordを一斉更新しない。
3. `apps/editor/src/main.ts` は従来7本選択、太さ・強制入り抜きに留まっていた。M10では端末内の自作presets管理と既存数値設定を段階的にUIへ接続する。
4. 既存 `forceFadeGeometry: adaptive-v1`、`cap = 500 + 700*level`、128px TileHistory、M08表示系、保存形式は理由なく変更しない。

## 実行順・合否

- **実装対象（初期段階）**: preset検索/複製/命名/保存/読み書き、実行前のブラシ数値調整、ユーザーpresetとFoundation presetの識別。
- **次の画質ゲート**: 曲率/AA/細線/太線/入り抜き/低速・高速/preview・finalの画像差分を両GPU×512/2000/3000/4000で比較してからアルゴリズム変更を判断。
- **次の性能ゲート**: pointer-to-preview・p95/最悪値・次筆受付・確定前Undo・memory/queue。ソフトウェアGPUと物理スマホは別評価。
- **未確認**: 各製品の非公開内部計算式、M10変更の実機画質評価、実ブラウザpixel一致、筆圧センサー/傾きセンサーの実機サンプル。

## 旧作品互換と計測上の注意

新しい preset library は描画作品の正本と分離した端末内 `localStorage` 保存とし、StrokeRecordや`.illustro`書式を変更しない。既存の作品を再生成し直さない。パック読み書きにはFoundation既存のバージョン検査を利用する。物理センサーを取得できない状況で「筆圧/傾きPASS」とは判定しない。
