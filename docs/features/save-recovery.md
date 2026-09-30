# Save / Autosave / Recovery Interaction Specification

> Status: **Accepted P0 interaction specification**

## Concepts

UI distinguishes:

- Working recovery protection
- Autosave
- Explicit Save
- Save As / Export portable .illustro
- Image Export
- Crash Recovery

"Saved" must not ambiguously mean all of them.

## Default

Autosave / Recovery protectionは **Default ON**。

Userが通常制作を開始する前に設定を要求しない。

Recoveryを完全に無効化する高度設定を将来提供する場合はData-loss riskを明示する。

## Working protection indicator

Normal editing continuously advances recovery protection.

UI may show subtle state:
- Protected
- Saving/protecting
- Storage problem

Do not show noisy spinner for every journal packet.

## Explicit Save

Save/export encodingが安全に中断可能な段階ではCancelを提供する。

Cancelしてもcurrent Documentと既存の最後に成功したSaveを破壊しない。

File picker/Save Asをキャンセルした場合もDocument状態は変えない。

If document has associated writable destination:
- Save writes a fixed revision snapshot to that destination asynchronously

If no destination:
- Save routes to Save As / portable export flow

Drawing may continue while save snapshot is encoded.

UI distinguishes:
- saved revision
- newer edits after save started

Do not report newer edits as saved until protected/saved accordingly.

## Save As

User chooses destination/name where platform permits.

Where direct file picker unavailable:
- generate portable .illustro
- browser download/share/export workflow

No platform-specific picker is required for Core semantics.

## Overwrite

If destination already exists:
- platform confirmation rules respected
- Illustro does not silently overwrite unrelated file

## Autosave

Autosave protects working state without requiring user action.

It must not force modal dialogs during normal editing.

Storage failure triggers visible but non-destructive warning.

## Mobile hidden/background

On visibility hidden:
- prioritize already-prepared recovery flush
- stop unnecessary background compute

Do not promise full save on app exit.

## Crash recovery startup

If newer protected recovery state exists:
- 同一Projectで候補が一つだけかつ関係が明確: latest protected recoveryをDefault restore
- 複数候補・explicit saved fileとの関係が曖昧・branch conflict: clear recovery choiceを表示

User sees:
- project identity
- recovery timestamp/session
- relation to explicit saved file if known

Do not silently discard newer recovery data.

## Corruption

If current generation invalid:
- try last verified generation
- explain recovery fallback
- preserve damaged source where useful for diagnostics/recovery

Never open corrupted missing blocks as zero-filled "normal" artwork.

## Storage pressure

Warn before inability to protect new work where detectable.

Actions:
- free derived cache
- export backup
- choose new destination
- manage old recoveries

Do not silently delete current protected artwork.

## Import .illustro

Validate before committing to current workspace.

Unsupported/newer optional data:
- preserve if possible
- report loss/unsupported state

Import failure does not damage current open document.

## Concurrent / external modification

### Same destination open in multiple Illustro documents

同じportable destinationを複数Document/sessionが参照していることを検出できる場合、通常Save前に競合を警告する。

Working recovery stateはsessionごとに独立させ、別sessionが同じworking storeをmutable共有しない。

### External file changed

Open/last successful save以降にdestination fileが外部変更されたことをPlatform APIで検出できる場合:

- Silent overwriteしない
- reload/compare/save copy/overwrite等の選択肢を提示

検出不能Platformでは完全防止を保証せず、Save As/backup/recoveryを利用可能にする。

競合解決のためにcurrent protected recoveryを破棄しない。

## Image export

PNG/JPEG/WebP etc. use fixed revision.

Export settings changes do not alter document unless explicitly requested.

## Undo

Save/autosave/export are not Artwork Undo steps.

Import as new document is not undo of current document.

## Device

PC:
- direct save handle when available
Tablet/Phone:
- share/download/file provider flow
- background termination resilience

## Persistence labels

Workspace may remember recent file handles/locations only where platform allows and privacy/security semantics permit.

## Performance

- encoding/compression off realtime path
- save snapshot immutable/published revision
- bounded batching
- no full project rewrite for every stroke
- codecs lazy load

## Acceptance

- drawing continues during save where safe
- saved/protected state is never overstated
- abrupt mobile kill restores last protected revision
- direct picker absence does not block portable project workflow


## Input-standard closure note

Recovery/branch-conflict selection uses `UI_INPUT_CONTROL_STANDARD.md` C10 for the candidate list and explicit C7 actions for Restore / Compare / Save Copy / Overwrite / Discard / Cancel as applicable. Merely selecting or focusing a recovery candidate does not perform a destructive resolution.
