# Lineart Region / Linked Coloring Interaction Specification

> Status: **Accepted P0 interaction specification**

## Entry

Region機能は通常Brushの必須前提にしない。

Entry points:

- Region panel/workspace
- Smart Fill Region mode
- Smart Color Assist
- Lineart-linked Coloring setup
- Command Search

## Enable / source setup

UserはRegion解析へ参加するSource Layer/Groupを指定できる。

Defaultで全Layerを勝手に解析対象にしない。

Source designationはLayer UIからも確認可能。

## Region states

User-visible states:

- Current
- Updating
- Ambiguous
- Invalid/Needs attention

状態は色だけでなくicon/text等でも表現。

## First analysis

Region機能を初めて必要とした時に解析を開始。

Canvas drawingをblockしない。

解析中でも通常描画は継続可能。

## Region selection

Current Regionをtap/clickで選択可能。

Selected Regionは境界overlayで表示。

## Manual correction

最低限以下のCorrection Commandを持つ。

- Connect boundary
- Suppress/remove boundary
- Merge regions
- Split region
- Recalculate local area
- Pin/resolve identity where relevant

CorrectionはUndo可能。

## Ambiguous

Ambiguous Regionを自動確定してPersistent Colorへ流さない。

Userへ:
- candidate
- affected area
- resolution action

を提示可能にする。

## Linked Coloring enable

Lineart-linked ColoringはDocument/target coloring workflow単位で明示Enable。

既存Artworkを勝手にRegion assignment化しない。

## Line edit response

Source lineart edit:
1. lineart stroke commits
2. Region dirty state recorded
3. background/demand analysis
4. affected assignment remap candidate
5. safe/confident resultのみ自動追従policy対象
6. ambiguous/conflicting resultはUser attention

通常Stroke latencyよりRegion follow-upを優先しない。

## Auto-follow policy

Defaultは保守的。

小さな境界移動等のhigh-confidence followは自動適用候補。

split/merge/conflictはpreview/confirmationを要求する方向。

Exact confidence thresholdはDataset検証後に決定。

## Preview / compare

追従結果が大きい場合:
- before/after preview
- affected Region highlight
- apply/cancel

を提供。

## Undo

Lineart editによって自動的に発生したhigh-confidence Region remapは、**原因となったLineart editと同じHistory groupとして提示**する。

Undoすると:
- lineart
- topology/identity decision
- automatic color remap

が一緒に元状態へ戻る。

Ambiguous/Conflictを後からUserが明示Accept/Resolveした操作は別Undo step。

Region manual correctionも1 user action = 1 Undo step。

## Device

PC:
- hover candidate info可能
Tablet:
- pen correction + touch navigate
Phone:
- tap select
- compact correction actions
- no hover dependency

## Persistence

- source designation
- topology/identity
- manual overrides
- assignments
- algorithm version

はDocument。

Derived evidence/cacheは保存必須ではない。

## Performance

- inactive Region near-zero cost
- dirty bounds coalesced
- topology no every-stroke forced solve
- ambiguity preserves correctness over speed

## Acceptance

-普通のBrushだけならRegion engineが恒常負荷を持たない
-ambiguous state visible
-manual correction undoable
-linked color never silently destroys conflicted assignment
