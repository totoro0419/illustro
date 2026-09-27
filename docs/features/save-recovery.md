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

## Working protection indicator

Normal editing continuously advances recovery protection.

UI may show subtle state:
- Protected
- Saving/protecting
- Storage problem

Do not show noisy spinner for every journal packet.

## Explicit Save

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
- restore automatically when safe, or
- present clear recovery choice if multiple/conflicting states

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
