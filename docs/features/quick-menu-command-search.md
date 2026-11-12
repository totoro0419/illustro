> Classification: OBSOLETE / historical evidence; valid technical principles may be reused. Current authority: `docs/IMPLEMENTATION_BASELINE.md` and `docs/CANONICAL_INDEX.json`. Old stop/PASS/candidate declarations below apply to their recorded version only.

# Quick Menu / Command Search Interaction Specification

> Status: **Accepted P0 interaction specification**

## Quick Menu purpose

High-frequency command surface that can be summoned near the current work without permanently occupying large screen area.

## Spatial memory principle

Quick Menu / Quick Controllerの主目的は、単にCommandをCanvas近くへ出すことではない。

> **高頻度CommandをVisual SearchではなくSpatial Memory / Muscle Memoryで呼び出せること**

を重要な評価基準とする。

過去案の六角形Controllerは候補の一つであり、形状は固定しない。

候補:
- radial / pie / arc
- edge controller
- floating toolbar
- hex controller
- gesture
- hybrid

Critical invariant:

- user-pinned commandの位置は安定させる
- Context適応のためにuser-pinned slotを予測不能に並べ替えない
- Context-aware候補は別領域/別slot等でSpatial Memoryを壊さない
- handedness変更では明示的mirror/profile変換を行い、無意識に位置を漂わせない

採用判断は操作速度、到達距離、誤操作率、Canvas占有、Pen/Touch適合性、Muscle Memory形成で行う。

## Activation

**Quick Menuには全Deviceで発見可能な明示On-screen entryを必ず用意する。**

Shortcut / pen button / gestureは高速化手段であり、唯一の入口にしない。

Supported activation candidates:

PC:
- configurable shortcut
- pen button
- context gesture where non-conflicting

Tablet:
- stylus button where available
- configurable touch gesture
- explicit on-screen trigger

Smartphone:
- explicit thumb-reachable trigger
- configurable gesture

No device relies on right-click-only activation.

Exact default gesture/button is UI prototype decision.

## Open behavior

Open at:
- cursor/pen position where safe
- otherwise stable reachable anchor

Menu must avoid screen edges/safe areas and reposition automatically.

Opening Quick Menu does not change current tool until an item is activated.

## Contents

Items may be:

- Tool
- Command
- Brush
- Color
- Macro
- Layer Action
- Canvas Action

Item behavior type:
- Trigger
- Toggle
- Hold/temporary where supported
- Subgroup

## Customization

Edit mode is explicit to prevent accidental rearrangement while painting.

Operations:
- add
- remove
- reorder
- group
- rename label
- choose icon
- assign shortcut
- reset profile

Add browser can use Command Search.

## Profiles / context

User may have multiple profiles.

Context-aware suggestions may appear separately from pinned user items.

Context system must not rearrange user-pinned items unpredictably.

## Command Search

Search indexes:
- commands
- tools
- panels
- brushes
- macros
- settings
- selected-context actions

Search result shows:
- name
- category/context
- current shortcut
- availability/disabled reason

Actions:
- execute
- add to Quick Menu
- add shortcut
- open relevant settings

## Disabled commands

Unavailable command remains discoverable when useful, with reason:
- no selection
- locked layer
- unsupported target
- capability absent

Do not silently hide every unavailable command.

## Commit semantics

Quick Menu自身にはArtwork Commitはない。

Item activation時:
- Trigger commandはそのCommand自身のcommit/undo契約に従う
- Tool selectionはToolを切り替えるだけでArtwork commitしない
- Color/Brush selectionはWorkspace state更新で、Artwork Undoには入らない
- Toggle/Layer Action等は対象Commandのtransactionとしてcommit

Menuを開いただけではDocumentを変更しない。

## Close / cancel

Esc/tap outside/gesture close returns to previous state.

Opening and closing without action creates no Undo entry.

## Device

PC:
- keyboard-first search
- pointer Quick Menu
Tablet:
- pen/touch radial/grid/list layout candidate
Phone:
- thumb reach, large hit targets
- menu may favor bottom/near-thumb sheet if radial space insufficient

Visual form is not fixed by this spec.

## Persistence

Quick Menu profiles = Workspace/user settings.
Current open state = Session only.

## Performance

- command index incremental/prebuilt
- opening Quick Menu should not scan full document
- brushes/assets search uses lazy index
- inactive menu near-zero cost

## Acceptance

- every item type executable
- user pins remain stable despite context
- unavailable command explains why
- touch-only activation path exists
