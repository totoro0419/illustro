> Classification: OBSOLETE / historical evidence; valid technical principles may be reused. Current authority: `docs/IMPLEMENTATION_BASELINE.md` and `docs/CANONICAL_INDEX.json`. Old stop/PASS/candidate declarations below apply to their recorded version only.

# History / Snapshot / Layer Comp Interaction Specification

> Status: **Accepted P0 interaction specification**

## Concepts

UI must keep these distinct:

- Undo / Redo
- History navigation
- Snapshot
- Layer Comp
- Timelapse

Do not merge them into one ambiguous panel.

## Default state

Current History Headは常に現在のDocument Revision。

History panelを開いただけではRevisionを変更しない。

古いentryを単にhover/focusしただけでもDocument stateを変更しない。

## Undo / Redo

Primary:
- toolbar/gesture/shortcut
- immediate
- one user-intent transaction per step

Long-running transaction may expose "processing" but once committed appears as one logical step.

## History panel

Shows recent committed transactions in chronological order.

Selecting an older entry:
- preview modeではtemporary previewのみ
- explicit Navigate/Restore actionでcurrent headを移動
- preview中のCancel/Escで元のcurrent headへ戻る
- destructive branch creation must not occur from mere hover

If user edits after moving to older revision:
- new branch is created
- previous forward branch is preserved according to retention policy
- UI explains that redo path changed

## Snapshot

Create Snapshot:
- explicit command
- optional name
- optional note/thumbnail

Snapshot creation itself does not modify artwork pixels.

Snapshot restore:
- preview/current comparison available
- explicit Restore or Create Branch from Snapshot
- silent replacement of current unsaved stateは禁止

Delete Snapshot:
- explicit action
- does not delete current artwork if shared revision still active

## Snapshot compare

At minimum:
- current vs snapshot toggle
- side-by-side or overlay comparison may be UI option

Comparison view does not create Undo steps.

## Layer Comp

Layer Comp stores presentation/configuration state only.

Create:
- capture current supported layer states

Apply:
- one Undo step for resulting layer-state changes

Update:
- explicit "Update Comp" rather than silently rewriting named comp

## Timelapse

Timelapse UI reads production history projection.

Playback/export does not mutate document.

History retention changes must not silently break already-saved timelapse data.

## Error / edge

- missing resources
- partially unavailable history due storage cleanup
- snapshot from incompatible/migrated version
- branch storage pressure

must be surfaced honestly.

## Device

PC:
- history panel/dock
Tablet:
- sheet/panel
Phone:
- compact timeline/list
- Undo/Redo remains direct even if History panel hidden

## Persistence

History policy = working store/document metadata as architecture defines.
Snapshot = Document.
Layer Comp = Document.
History panel scroll/filter state = Workspace/session.

## Performance

- recent metadata hot, cold history lazy
- thumbnails lazy
- opening History panel must not load all raster history
- compare uses existing revision/tile sharing

## Acceptance

- undo/redo direct and low latency
- restore snapshot cannot silently destroy current branch
- Layer Comp does not become full Snapshot
- branch behavior understandable
