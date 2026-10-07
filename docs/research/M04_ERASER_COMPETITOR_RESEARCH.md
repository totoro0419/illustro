# M04 Eraser competitor research

Date: 2026-10-07
Scope: M04「Eraser正式統合」。非公開の内部実装は推測しない。

## 公式資料

### ibisPaint
- https://ibispaint.com/lecture/index.jsp?lang=en&no=08
- https://ibispaint.com/lecture/index.jsp?no=04

確認できた事実:
- 公式チュートリアルはEraser SettingをBrush Settingと「ほぼ同じ」と説明し、Brush patternも共通としている。
- よく使う例としてSoft/Hardの消しゴムを挙げている。
- Eraserは現在Layerを透明な状態へ戻す。白く見える場合でも、下Layerが白いためである。
- Brush/Eraser Toggleで1タップ切替ができる。

Illustroへの採用:
- Brush Foundationの入力・補正・Tip・Dynamics・StrokeRecordを共有し、blendだけeraseにする。
- Hard/Softの既存Foundation presetを正式利用する。
- Brush/Eraser切替では、それぞれの前回presetを保持する。

### CLIP STUDIO PAINT
- https://help.clip-studio.com/en-us/manual_en/240_brushes/Eraser_tools.htm
- https://help.clip-studio.com/en-us/manual_en/060_pc/Drawing_on_the_canvas.htm

確認できた事実:
- Eraserは選択中Layer上を描くように操作して消去する。
- 任意の描画Brushを透明色に切り替えて消去にも使える。
- 「Erase on all layers」は別設定として明示されている。
- Undo/Redoは通常の描画操作と同じ編集履歴として扱われる。

Illustroへの採用:
- M04は選択Raster Layer限定。全Layer消去は先取りしない。
- Eraser専用Historyは作らず通常Stroke Historyを共有する。

### Procreate
- https://help.procreate.com/procreate/handbook/brushes/paint-smudge-erase
- https://help.procreate.com/procreate/handbook/brushes/brush-library

確認できた事実:
- Paint / Smudge / Eraseは同じBrush Libraryを利用する。
- Eraseはpigmentを取り除き、透明領域を作る。
- Eraserのopacityを下げると部分的に消せる。
- Paint / Smudge / Eraseの現在Brushを長押しで素早く引き継げる。
- Brushごとの設定は切替後も記憶される。

Illustroへの採用:
- Eraserを別エンジンにしない。
- 高頻度切替で前回Brush/Eraserを保持する。

### Krita
- https://docs.krita.org/en/user_manual/introduction_from_other_software/introduction_from_photoshop.html
- https://docs.krita.org/en/reference_manual/brushes/brush_settings/opacity_and_flow.html
- https://docs.krita.org/en/tutorials/inking.html

確認できた事実:
- KritaはEraser ModeをBrush presetへ適用でき、Eキーで切り替えられる。
- OpacityとFlowは別のブラシ透過パラメータ。
- Freehand Brushにはsmoothing/stabilizer系の入力補正がある。

Illustroへの採用:
- blend:'erase'をBrush strokeの意味として正式経路へ通す。
- Soft Eraserのflowも既存Brush Foundationで扱う。

### Adobe Photoshop
- https://helpx.adobe.com/photoshop/desktop/repair-retouch/clean-restore-images/erase-parts-of-an-image-with-the-eraser-tool.html
- https://helpx.adobe.com/photoshop/web/add-effects/draw-and-paint/remove-elements.html

確認できた事実:
- EraserのBrush modeはSize / Hardness / Opacity / Flowを設定できる。
- Photoshop on the webではSmoothingと、size/opacityに対するpressure利用も明記されている。
- 透明を許す通常Layerでは完全または部分的に消去できる。
- Background等の特殊状態では背景色で置換する場合がある。

Illustroへの採用:
- Hard/Soft、Size、Opacity/Flow、Pressure、Smoothing系をBrush能力と共有する。

採用しない:
- Background色への置換。IllustroのM04はRaster alphaを減らす操作である。

### Affinity Photo 2
- https://affinity.help/photo2ipad/en-US.lproj/pages/Painting/erasing.html
- https://affinity.help/photo2ipad/en-US.lproj/pages/Workspace/shortcuts.html

確認できた事実:
- Erase Brushは選択Pixel Layerを直接消去し、「Paint Brush Toolと同じ原理」と公式に説明される。
- Erase Brushには専用shortcutがあり、tool shortcutは一時利用もできる。

Illustroへの採用:
- 選択Raster Layerへだけ作用するBrush共有型Eraser。
- 高頻度切替を軽くする。

## M04の決定
- Eraser Engineは新設しない。
- 正式判定はpreset順ではなくstable preset ID + blend:'erase'を使う。
- Hard = foundation-hard-eraser、Soft = foundation-soft-eraser。
- Brushへ戻ると前回Brush、Eraserへ戻ると前回Eraserを復元する。
- Eraserは選択Raster Layerだけを変更し、下Layerや合成結果そのものは変更しない。
- Undo / Redoは既存brush.stroke Document Historyを使用する。
- temporary eraserの高度shortcutは有用だが、M04ではTool正式統合に必要な最小状態管理だけを実装し、Quick Controller等を先取りしない。

## no-op Erase
透明な場所だけをなぞったStrokeを各社が必ずHistoryへ残すかは、上記公式資料だけでは6社を同一条件で確認できなかった。

M04ではcanonical commandsを持つpointer-up済みStrokeを1 Transaction / 1 Revisionとして扱う。no-op判定のために全Canvas readbackを追加しない。pointercancelはRevisionを作らない。

## 未確認
- 各社の非公開GPU/tile cache内部実装。
- 6社すべての「透明領域だけのErase Stroke」に対する厳密なHistory方針。
