# Canvas / Navigation Interaction Specification

> Status: **Accepted P0 interaction specification**

## Entry / default

Documentを開いたらCanvasは中央に表示し、Artworkが見切れないFit表示を初期候補とする。前回View復元はDocument/Workspace方針に従う。

NavigationはToolではなく常時利用可能なView操作として扱う。

## PC

- wheel / trackpad: zoom or pan according to platform convention and user settings
- middle-drag or configured navigation shortcut: pan
- configured rotate gesture/shortcut: rotate
- temporary navigation shortcutを押している間もselected drawing toolを失わない

## Tablet

- one/two-finger navigationはPen drawingと競合しない
- default: Pen draws, Touch navigates
- pinch: zoom
- two-finger translation: pan
- rotation gesture: canvas rotate

## Smartphone

- touch-onlyでPan/Zoom/Rotateが完結
- drawing tool active時もmulti-touch navigation可能
- Compact UIのnavigation buttonはgesture代替として提供可能

## View behavior

Pan/Zoom/Rotate/FlipはArtworkを変更せずUndo Historyへ入れない。

View transformはdouble precisionまたは同等に安定した内部表現を使い、高倍率で累積誤差を起こさない。

64000%時はpixel grid / nearest visual aidを必要に応じて表示可能。

## Reset actions

- Fit
- 100%
- Reset Rotation
- Flip View

をCommandとして持つ。

## Crop / Canvas Resize

Crop開始:
- crop boundsをCanvas上Handleで直接操作
- outside dimming preview
- Pan/Zoom可能

Commit:
- Apply/Enter

Cancel:
- Esc/Cancel

Tool switch:
- incompatible switchではsilent commitしない

Undo:
- crop commit全体で1 step

Canvas Resize/Image Resizeはnumeric precision UIも利用可能。

## Resize / orientation

Viewport resizeでArtwork view centerを可能な限り保持。

mobile browser chrome/keyboardによる小変化でCanvas backing resourceを毎回即再作成しない。

## Persistence

Artwork view transformは原則Workspace/Session state。Document artwork meaningには含めない。

Named view/multi-view機能を実装した場合のみDocument metadata化を検討。

## Performance

- navigation中にRegion解析等を起動しない
- zoom-outはmip/overview cache利用
- resize eventはcoalesce
- hidden/non-visible tilesを過剰生成しない

## Acceptance

- active brushを失わずnavigation可能
- PC/Tablet/Phoneすべてgestureまたは代替UIで完結
- navigationがUndoに混入しない
- 64000%付近で座標ジャンプなし
