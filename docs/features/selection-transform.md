# Selection / Transform Interaction Specification

> Status: **Accepted P0 interaction specification**

## Selection entry

Selection Tool family:

- Rectangle
- Ellipse
- Freehand
- Polygon
- Color/Similarity
- Luminance/Color Range
- Region
- Layer Content

## Selection mode

Default selection modeは **Replace** とする。

Primary modes:

- Replace
- Add
- Subtract
- Intersect

PCではmodifier shortcutを利用可能。
Tablet/PhoneではContext UIに明示mode buttonを持つ。

## Selection lifecycle

SelectionはTool switchで原則維持。

Explicit Deselectで解除。

Canvas click outsideだけで勝手に解除しない。

Selection作成/変更はUndo可能。

## Marching ants / overlay

Selection境界表示はArtworkではない。

高Zoom/Low performance時もCanvas pixelを変更しない。

非表示toggleを提供可能。

## Saved selection

Active Selectionをnamed selection maskとして保存可能。

Saved Selectionをloadしてactive selectionへ戻せる。

## Moving selected pixels

Selection Toolで境界を動かす操作と、選択内容自体を移動する操作を混同しない。

Content MoveはTransform開始として扱う。

## Transform entry

Entry:
- selected layer/object
- active selection contents
- multi-selected layers
- vector/text object

からTransform Commandを開始。

## Transform active state

Canvas上にbounding box/handles。

Context UI:
- mode
- interpolation
- flip
- numeric position/scale/rotation
- apply
- cancel

NavigationはTransform stateを壊さず利用可能。

## Commit

Enter / Apply / explicit finishでcommit。

Pointer upだけではTransform session全体を即終了しない。複数handle調整可能。

## Cancel

Esc / CancelでTransform開始前Revisionへ戻る。

Tool switchでsilent applyしない。

## Transform modes

- Move
- Scale
- Rotate
- Free Transform
- Perspective/Distort
- Warp

Mode switchingは同一session内で可能な範囲を定義。

Liquifyは独立sessionでもよいがApply/Cancel contractは同じ。

## Non-destructive vs bake

Layer/Object transform:
- possibleならnon-destructive transform metadata

Pixel selection transform:
- preview中non-destructive
- commit時に必要に応じbake

Userへ「適用」と「Rasterize/Bake」の違いを明示。

## Snap

Guides/grid/angles/object boundsへのSnapはtoggle可能。

Temporary modifierでsnap invert候補。

## Device

PC:
- handles + keyboard nudging/modifiers
Tablet:
- pen handle + touch navigation
Phone:
- large handles
- compact Context sheet
- numeric input optional

## Error

- locked target
- unsupported mixed target
- insufficient memory
- invalid perspective geometry

で説明。

## Persistence

Active selection = Document editing state。
Saved selection = Document。
Transform committed state = Document。
Transform preview = Session-only。

## Performance

- preview visible tiles only
- repeated drag no cumulative raster resample
- selection coverage sparse
- giant selection mask lazy allocation

## Acceptance

- selection survives tool switch
- transform cancel exact restore
- one transform session one undo
- navigation during transform works
- phone touch-only complete
