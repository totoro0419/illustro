> Classification: OBSOLETE / historical evidence; valid technical principles may be reused. Current authority: `docs/IMPLEMENTATION_BASELINE.md` and `docs/CANONICAL_INDEX.json`. Old stop/PASS/candidate declarations below apply to their recorded version only.

# Layers Interaction Specification

> Status: **Accepted P0 interaction specification**

## Entry

Layer panelはPCではdockable、Tablet/Phoneではpersistent or transient panelとして提供。

Canvasから直接Layer選択Commandも持つ。

## New layer

Default:
- active layerの直上へRaster Layerを作成
- Group内active childなら同Group内
- locked/invalid contextではnearest valid insertion pointを提示

作成後は新Layerをactiveにする。

## Selection

Single click/tap: active layer.
Modifier / multi-select mode: add/remove range/multiple.

Phoneでmodifier keyを要求しない。明示Multi-select modeを提供。

## Reorder

Dragでlayer/groupをreorder。

During drag:
- insertion marker
- group nesting target
- invalid target indication

Auto-scrollはedge drag時のみ。

Drop = one Undo step.
Cancel = original order.

## Visibility

Eye toggleは即時。

Multi-selected layersに一括操作可能。

Visibility changeはDocument stateとして **1 user action = 1 Undo step** とする。Multi-selected layersへの一括toggleは1 stepにまとめる。

## Clipping / Alpha Lock

ClippingとAlpha LockはLayer row上から状態確認・切替可能。

Quick Clippingはdeep menuへ隠さない。

Clipping targetが存在しない等のinvalid stateはsilent no-opにせず説明可能にする。

## Mask

Layer/GroupへMaskを追加可能。

Default:
- new raster maskはfully visible（white）を基本とする
- mask作成後にMask thumbnail/edit targetを明示選択可能

Layer contentとMaskのどちらを編集しているかを、thumbnail border/icon/text等で明確にする。

Operations:
- add
- select/edit
- enable/disable
- invert
- unlink/link transform where supported
- delete
- apply/bake

Mask delete/applyはUndo可能。

Touch端末でも小さなthumbnailだけを唯一の選択手段にしない。

## Group

Group create:
- multi-selectionがある場合はselected layersをGroupへまとめるCommandを提供
- no selectionならempty group

Ungroup:
- childrenをgroup位置へ展開
- one Undo step

## Rename

Inline renameを **Primary** とする。

Enter commit / Esc cancel.

Text input中はglobal shortcutsを抑制。

## Delete

Delete layerはUndo可能。

Last layerも削除可能で、Layer treeはemptyになり得る。

その状態でRaster Brushによる描画を開始した場合はDocument Lifecycle仕様に従い、新規Raster Layerを自動作成しfirst strokeと同じuser-intent groupとして扱う。

## Duplicate

Selected layer/groupを直上へduplicate。

Large raster duplicateはcopy-on-write/structural sharingを利用し、即時deep copyしない。

## Merge

Merge operationsは破壊的であるためCommand名を明確化。

Merge/Flatten前に非破壊情報損失がある場合は必要に応じて警告。ただし毎回Modalで阻害しない。

Undoで元構造へ戻せる。

## Search / Filter

Searchはname/tag/type等。

FilteringはLayer treeそのものを変更しない。

Filtered状態でreorderする場合のtarget ambiguityを避ける。必要ならreorderを制限/明示する。

## Canvas direct select

Canvas上point/regionからcandidate layerを取得。

複数candidate時はsmall chooserまたはcycle action。

transparent/hidden/locked layer inclusionは設定可能。

## Device mapping

PC:
- dense rows
- hover actions
- modifiers
- drag reorder

Tablet:
- larger rows
- pen/touch drag
- multi-select explicit mode

Phone:
- compact panel/sheet
- swipeはdestructive defaultにしない
- common actions row/Quick Menu

## Persistence

Layer tree/content/state = Document.
Panel width/filter/search query = Workspace/Session.

## Performance

- virtualization
- thumbnail lazy generation
- offscreen group children no full rendering
- search index incremental
- duplicate uses sharing
- large reorder metadata-only where possible

## Acceptance

- 1000+ layer testでpanel interaction remains bounded
- clipping/alpha lock directly visible
- reorder cancel restores exact tree
- keyboardなしでmulti-select/delete/groupが可能
