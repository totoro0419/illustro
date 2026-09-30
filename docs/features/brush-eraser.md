# Brush / Eraser Interaction Specification

> Status: **Accepted P0 interaction specification**

## Entry

Primary toolbar / Quick Menu / Command Search / ShortcutからBrushへ入れる。

Brush preset browserからpresetを選択可能。

## Default state

新規Documentでは安定した汎用Raster Brushをdefaultとする。具体Brush presetはBrush engine prototype後に決定。

前回使用BrushをWorkspace preferenceとして復元可能。

## Drawing

Compatible editable Raster targetが存在しない場合はDocument Lifecycle仕様に従ってRaster Layerを作成してから同一user-intent内でstrokeを開始する。

Pointer down → stroke begins.
Move/coalesced input → realtime stroke.
Pointer up → commit one stroke transaction.

Stroke途中のTool設定変更は原則現在Strokeへ遡及適用しない。次のstable segment/next strokeからの反映方式はparameterごとに定義する。

## Brush cursor

Hover-capable pointerでは、可能なBrushについてCanvas上に現在のBrush footprint/sizeを示すCursorを表示する。

- CursorはArtworkへ描き込まない
- Brush size変更中は新しいsizeを即Preview
- texture全形状表示が高コストなBrushは簡略outlineを許容
- no-hover touch deviceではStroke開始前のcursorを必須にしない
- pen hoverがあるDeviceでは利用可能
- cursor renderingがinput latencyを悪化させる場合は簡略化/無効化可能

## Brush size / opacity

高頻度設定としてContext UIへ常時近接配置。

変更手段:
- direct slider
- numeric input
- shortcut/gesture
- optional on-canvas drag adjustment

continuous dragは1 settings transactionにcoalesceし、Artwork Undoとは原則分離。

## Temporary Eraser

Eraserは独立Toolとしても利用可能。

Hold shortcutでtemporary eraserへ入り、releaseで直前Toolへ戻れる。

Stylus eraser endが利用可能なら同じBrush engineをEraser semanticsで利用する。

## Color pick temporary mode

Hold shortcut / pen button等でtemporary eyedropperへ移行可能。ReleaseでBrushへ戻る。

## Cancel

開始済みstrokeのpointer cancel/device loss時:
- valid committed prefixを保持するかstroke全体を破棄するかはinput prototypeで定義
- silent partial corruptionは禁止

Userによる通常Escで「すでに描画中のStrokeを毎回cancel」はdefaultにしない。明示Gestureの必要性を検証する。

## Undo

1 committed stroke = 1 Undo step.

Long streaming strokeでもUI上は1 step。

## Brush switching

Preset切替はArtwork Historyに入れない。

切替時にdecode/compile待ちでUIを固めない。必要Resourceをlazy準備し、選択状態を即時反映する。

## Device behavior

PC:
- mouse/pen
- right-click optional context
- shortcut size adjustment

Tablet:
- pen draw / touch navigate
- barrel button assignable

Phone:
- finger drawing supported
- thumb-accessible brush/eraser toggle
- no hover dependency

## Error/fallback

Pressure/Tilt unavailable:
- mapped dynamics use fallback constant/base value
- Brush preset remains usable

Missing texture/resource:
- userへ明示
- deterministic fallback brush or resource repair
- silent substitution that changes artwork meaningは禁止

## Persistence

Brush preset definitions: Asset Library.
Current brush selection: Workspace.
Stroke result/resource version: Document history/canonical dependencies.

## Performance

- inactive advanced brush panels near-zero cost
- object-per-sample allocationを避ける
- preset changeでall brushes preloadしない
- large brushはdirty bounds/tile demandで処理

## Acceptance

- mouse/touch/penでsame brush semantics
- pressureなしでもusable
- eraser temporary mode returns correctly
- one stroke one undo
- brush switch does not cause visible long stall


## Input-standard closure note

The possible explicit stroke-cancel gesture remains an **optional accelerator under prototype evaluation**. Core Brush use and recovery/cancel safety do not depend on that gesture. Custom gesture assignment follows `UI_INPUT_CONTROL_STANDARD.md` T4.
