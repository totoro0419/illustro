# Reference Workspace Interaction Specification

> Status: **Accepted P0 interaction specification**

## Entry

Reference panel / Add Reference command / drag-drop/importから追加。

ReferenceはArtwork Layerへ自動変換しない。

## Add

画像選択後Reference itemを作成し、Canvas周辺/overlay workspaceへ配置。

初期scaleはviewportに収まる合理的サイズ。

## Manipulation

Referenceのmove/scale/rotate操作中は開始時状態を保持する。

- release/explicit finish: commit
- Esc/Cancel: 開始時状態へ復帰
- incompatible tool switch: silent commitせず共通Interaction Modelに従う

Reference select時に:
- move
- scale
- rotate
- flip
- grayscale
- pin
- hide
- delete
- group

へアクセス。

Direct manipulationをPrimaryとする。

## Pin

Pinned Reference:
- accidental move/scale/rotateを防ぐ
- eyedropper/visibility等は利用可能

## Always on top

Canvas artworkとのz-orderではなくReference workspace overlay behavior。

Artwork exportへ含めない。

## Temporary hide

Hold commandまたはtoggleで一時非表示可能。

Restoreで元配置へ戻る。

## Group

複数ReferenceをGroup化。

Group transformは子のrelative placementを保つ。

Ungroupも可能。

## Eyedropper

Reference上のpixelを直接sample。

Default sampling:
- Reference source color transformed to Document current color semantics
- display-only grayscale modeをsample結果に焼き込まない

「表示をgrayscaleにしている時にgrayを取りたい」はexplicit option候補。

## Interaction with canvas navigation

Referenceがfloating overlayの場合、dragがReference moveなのかCanvas panなのか明確にする。

Pinned/selection stateとmodifier/gestureでambiguityを避ける。

Tablet/Phoneではlarge touch target。

## Device

PC:
- floating/docked reference workspace
- hover controls optional
Tablet:
- pen/touch manipulation
Phone:
- transient reference view
- reference fullscreen/overlay modes候補
- Canvas面積を圧迫しすぎない

## Persistence

Reference metadata/placement/group/display flags = DocumentまたはDocument-linked workspace。
Resource bytesをembedするかlinkするかはfile format specで決定。

Missing linked resource時はrelink UI。

## Undo

Referenceの追加・削除・move・scale・rotate・group変更は通常Command Historyへ入り、1 gesture = 1 Undo stepとする。

ただしReference visibilityの一時hideやtemporary presentation-only操作はUndoへ入れない。

History UIではReference操作であることを明示し、Artwork Pixel editと区別できる。

## Performance

- image decode lazy
- mip/downsample cache
- hidden reference releases/reduces GPU residency
- multiple large references do not preload full resolution unnecessarily

## Acceptance

- reference never appears in export
- direct eyedropper works
- pin prevents accidental transform
- phoneでReferenceを見ながら描画可能
