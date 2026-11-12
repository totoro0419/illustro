# M02 Layer追加・選択 — 主要ペイントアプリ調査

> Date: 2026-10-05
> Scope: M02に必要な公開操作だけ。非公開内部実装は推測しない。

## 結論

M02では、現在のLayerを基準に新しいRaster Layerを直上へ追加し、追加したLayerをIllustroの現在Layerとして自動選択する。Layer行はクリック/タップで直接選択し、選択中は色だけでなく「選択中」の文字でも判別できるようにする。

Layer選択はWorkspace / Editorの作業状態であり、選択だけではArtwork Revisionを増やさない。Raster Layer追加はLayer treeを変える作品操作なので、1回の追加を1つの正式Document操作として扱う。

追加直後の自動選択は6アプリすべてで同一挙動と確認できた事実ではない。特にibisPaint公式チュートリアルには追加後に新LayerをCurrent Layerとして選択する手順がある。Illustroでは、次の描画先を迷わせず操作回数を減らすため自動選択を採用する。

## 公式資料で確認した事実

### ibisPaint

公式:
- https://ibispaint.com/lecture/index.jsp?lang=en&no=156
- https://ibispaint.com/lecture/index.jsp?lang=en&no=85

確認できたこと:
- Layer WindowでLayerを管理する。
- Add Layerで空Layerを追加できる。
- PC / tabletではFloating Layer Windowも提供される。
- Clippingの公式手順では、下地Layerを選ぶ → Add Layerでその上にLayerを作る → 新LayerをCurrent Layerとして選択、の順で説明される。

Illustroへ採用: Layer一覧から直接操作する基本導線、現在位置の直上への追加。
今回は採用しない: Floating Layer Windowや高度なLayer Window全体。M10以降の範囲。

### CLIP STUDIO PAINT

公式:
- https://help.clip-studio.com/en-us/manual_en/060_pc/Using_layers.htm

確認できたこと:
- Layer paletteでLayerを管理する。
- New Raster LayerからRaster Layerを作成できる。
- 現在の編集対象はLayer palette上で識別できる。

Illustroへ採用: 今どこに描くかを常時判別できる表示、Raster Layer追加の短い導線。
今回は採用しない: 複数選択、マスク等の高度操作。

### Procreate

公式:
- https://help.procreate.com/procreate/handbook/layers/layers-create
- https://help.procreate.com/procreate/handbook/layers/layers-interface

確認できたこと:
- Layers Panelの + で新Layerを作る。
- 新Layerはactive layerの上へ追加される。
- Canvas上の変更はcurrently selected layerへ作用する。
- Layerはタップして選択する。

Illustroへ採用: active Layer直上への追加、行の直接タップ選択、描画先を選択中Layerへ一本化。

### Krita

公式:
- https://docs.krita.org/en/reference_manual/dockers/layers.html
- https://docs.krita.org/en/user_manual/layers_and_masks.html

確認できたこと:
- Layers dockerでLayerを管理する。
- Add操作の標準はPaint Layerである。
- 描画・Layer操作はactive layerを基準にする。

Illustroへ採用: 普通の描画Layer追加を最短のAdd操作にする。
今回は採用しない: Docker全機能やLayer type chooser。

### Adobe Photoshop

公式:
- https://helpx.adobe.com/photoshop/desktop/create-manage-layers/create-layer-compositions/create-layers-and-layer-groups.html
- https://helpx.adobe.com/photoshop/desktop/create-manage-layers/get-started-layers/work-with-the-layers-panel.html

確認できたこと:
- 新Layerは現在選択しているLayerの上に現れる。
- Layers panelからLayerを選択・管理する。
- Layerを分離して扱うことで他Layerを変更せず編集できる。

Illustroへ採用: selected Layer直上への追加、一覧からの直接選択。
今回は採用しない: Group、複数選択、並び替え、名前変更等。

### Affinity Photo 2

公式:
- https://affinity.help/photo2ipad/en-US.lproj/pages/Workspace/shortcuts.html?category=layerOperations
- https://affinity.help/photo2ipad/en-US.lproj/pages/Painting/erasing.html

確認できたこと:
- Layer操作にNew Pixel Layer、Select Next/Previous Layerがある。
- Painting / erasingではLayers panelから対象pixel layerを選ぶ手順がある。

未確認:
- 今回取得した公式資料だけでは、通常のNew Pixel Layerの正確な初期挿入位置と追加直後の自動選択状態を確認できなかった。この2点はAffinityの事実として補完しない。

## Illustroへ採用するM02挙動

1. 初期Raster Layerは `Layer 1`。
2. レイヤー追加は現在選択中Layerの直上へ空Raster Layerを作る。
3. 初期名は `Layer 2`, `Layer 3` ... とする。
4. 追加したLayerを現在Layerとして自動選択する。
5. Layer行のクリック/タップで現在Layerを切り替える。
6. 選択中は背景強調だけでなく「選択中」の文字でも示す。
7. Layer選択だけではArtwork Revisionを増やさない。
8. pointer-down時に描画対象を固定し、その一筆は固定先へ確定する。
9. 描画中のLayer選択は次の一筆へ反映し、線の途中で描画先を付け替えない。
10. Layer追加はDocumentを変更するため、描画中またはpen-up確定中は受け付けず、現在の一筆を先に確定する。

## 今回採用しないもの

Delete / Reorder / Rename / Visibility / Lock UI / Opacity / Blend Mode / Group / Mask / Clipping / Alpha Lock / Multi-select / Layer Page全機能 / Layer検索 / filter / 凝った追加Motion。

理由: M02の目的を超え、後続マイルストーンの受入境界を曖昧にするため。

## 公開資料から確認できなかった点

主要アプリが、ペンを押したままLayer選択やLayer追加を要求したときに内部でどのキューや同期方式を使うかは、今回の公式資料から確認できない。IllustroではM01の原子性を守るため、選択は次ストロークへ反映し、Document変更を伴う追加は一筆の確定中に実行しない。