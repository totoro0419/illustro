# M02 Layer追加・選択 — 実装設計

> Date: 2026-10-05
> Scope: M02 only

## 正本確認

実装前に次を確認した。

- `docs/IMPLEMENTATION_BASELINE.md`
- `docs/CANONICAL_INDEX.md`
- `docs/architecture/ARCHITECTURE_V2.md`
- `docs/architecture/IDENTITY_OPERATION_REVISION_V2.md`
- `docs/FEATURE_SPEC.md`
- `docs/ui/RIGHT_UI_SPEC.md`
- `docs/ui/RIGHT_LAYER_PAGE_SPEC.md`
- `docs/ui/COMPACT_IMPLEMENTATION_BASELINE.md`

重大な正本矛盾は確認されなかった。M02ではLayer Page全体を実装せず、Layers Boxと右下Layer導線が同じLayerモデルへ到達する最小構成に限定する。

## 所有関係

### Document / Core

Layer identity、Raster Surface identity、root Layer order、Layer追加という作品操作、Layerごとの正式Strokeデータを所有する。Layer追加は作品構造を変えるため1 Transaction / 1 Revision。

### Editor / Workspace

現在ユーザーが描こうとしているLayerを所有する。Layer選択は作品内容ではないため、選択だけでRevisionを作らない。

### Brush

M01のままpointer-downでDrawingTargetを取得し、一筆中はtargetを固定し、pen-up後にM01 Stroke Commitへ渡す。Renderer / Worker / Prediction / stabilization / GPU scheduling / 強制入り抜きは変更しない。

## Core Layer追加

`DocumentTransaction.addRasterLayerAbove(referenceId)` が一回の構造操作を作る。

- 新しいLayerIdとRasterSurfaceIdを作る。
- 空のRasterSurfaceManifestはsparseのままで、tile/blockを確保しない。
- 初期名は `Layer N`。
- `rootLayerIds` をbottom → topの正式順序として使い、現在Layerの直後へ新IDを挿入する。
- Editorだけの別順序配列は作らない。UI表示時だけtop → bottomへ反転する。
- stale transactionなら公開しない。Layer / Surface / root順序は同じRevisionで公開する。

## 選択とStroke

`EditorController.selectedLayerId` を唯一の現在Layer状態とする。`CoreStrokeDocumentPort.target()` は現在Layer callbackを読む。

一筆は pointer-down → Layer/Surface/base Revision固定 → 描画 → pointer-up → 固定targetへ正式Commit。選択を一筆中に変えてもその一筆は旧targetへ入り、次の一筆から新しい選択を使う。

Layer追加はDocument Revisionを進めるため、active stroke / pen-up確定中はUIから実行しない。M01 stale target規則を例外化しない。

## UI

M02で追加するのはCoreから読むLayer一覧、選択状態、レイヤー追加button、行のclick/tap選択、追加直後の自動選択だけ。選択状態は色だけに頼らず「選択中」文字とprogrammatic pressed stateでも示す。

右下Layer buttonとcompact Layer routeは既存Layers Boxへ開くだけに留める。M10 Layer Pageは先取りしない。

## Performance

Layer選択時のCanvas全体readback、全Layer copy、Document serialize、Renderer rebuildを行わない。空Layer追加はtile allocationを行わない。Layer一覧だけを必要時に再描画する。M02でvirtualizationは実装しない。

## 表示基盤との境界

M02で正式に保証するのは各StrokeのLayer ownership、Layer順序、選択、保持である。Visibility / reorder / full Layer Pageは対象外。Layer都合でRendererを作り直さない。

ただしユーザーAndroid実機で、指を触れた瞬間にCanvas全体が黒くなり、ページ切替時だけ正常に見える共通表示不具合が確認された。この不具合はM02固有のLayer処理ではなく、Brush Foundation Rendererの**画面へ出す最後の段**にあったため、M01固定基盤の例外修正として扱った。

最終方針は端末別fallbackではない。

- AndroidだけWebGL2へ切り替える分岐は撤去。
- CSSで白背景を被せるだけの回避も撤去。
- canonical artwork / tile / StrokeRecordは従来どおり透明度を保持する。
- WebGL2 / WebGPUとも、透明な表示用textureをそのままCanvasへ渡さず、最後のpresentation passで明示的に白いpaperへ合成し、画面にはalpha=1の不透明結果を出す。
- 初期の空Canvasも同じpresentation passを一度通す。
- 保存用Rasterやreadbackの透明度は変更しない。白紙化は画面表示だけ。
- M01 Brush 93件、production-prep、WebGL2/WebGPU、compact、高DPI、CSS背景を黒にした検査、実touchを押したままの検査を回帰条件とする。

MDNのWebGL context属性では `premultipliedAlpha` はページcompositorがdrawing bufferをどう解釈するかを指定し、WebGPUの `alphaMode: premultiplied` もCanvasの合成方法を決める。Illustroは作品表示の紙色をこのブラウザ合成へ依存させず、Renderer自身のpresentation責務として固定する。

## Stop boundary

M03 Undo / Redo、M10 Layer Page基本、その他高度Layer機能へ進まない。固定QA公開後はUSER REVIEW REQUIREDで停止する。