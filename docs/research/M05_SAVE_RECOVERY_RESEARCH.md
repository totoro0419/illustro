# M05 Save / Recovery Research and Accepted Design

Status: implementation complete for automated verification; fixed QA is published; human acceptance is still required before M05 is marked complete or merged.

## Scope

M05 covers only:

- native `.illustro` project save/open
- explicit Save / Save Copy
- working-store autosave/recovery
- reload of the last verified save
- Last Good / Previous Good fallback
- document metadata persistence
- offline startup/edit/save/open after the app has been loaded online once
- recovery ordering and storage integrity
- M01-M04 regression protection

PNG/JPEG/WebP export belongs to M06 and is intentionally out of scope.

## Official references checked

### Web platform

- MDN File System API  
  https://developer.mozilla.org/en-US/docs/Web/API/File_System_API
- MDN Origin Private File System  
  https://developer.mozilla.org/en-US/docs/Web/API/File_System_API/Origin_private_file_system
- MDN Service Worker API  
  https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API
- MDN Cache API  
  https://developer.mozilla.org/en-US/docs/Web/API/Cache

Confirmed platform facts used by M05:

- OPFS is origin-private storage and is suitable for local/offline editor working data.
- File System API is available in Web Workers in supporting secure contexts.
- OPFS is separate from user-visible files and is subject to browser storage quotas.
- user-visible file access and the private working store are different responsibilities.
- Service Worker + Cache storage can provide an offline application shell.

### CLIP STUDIO PAINT

Official recovery information:
https://support.clip-studio.com/ja-jp/faq/articles/20200118

Relevant behavior:

- recovery information is separate from the user's ordinary explicit save flow.
- recovery data is periodically maintained so a forced termination can be recovered from.
- smartphone versions expose an autosave/recovery flow.

Adopted principle: Illustro Recovery is not treated as the same operation as explicit Save.

### Krita

Official manual:
https://docs.krita.org/en/user_manual/autosave.html

Relevant behavior:

- the native project format is the lossless working format.
- autosave and backup files are separate safety mechanisms.
- crash recovery and ordinary saved files are distinct concepts.

Adopted principle: keep portable project save, working recovery, and backup generations conceptually separate.

### Procreate

Official current handbook:
https://help.procreate.com/procreate/handbook/gallery/gallery-file-types

Relevant behavior:

- Procreate uses a native project format for complete artwork data.
- drawing progress is automatically saved while working.
- the native project format is distinct from export formats.

Adopted principle: a native project file must preserve editable artwork state; image export remains a separate later milestone.

### ibisPaint

Official artwork/cloud documentation:
https://ibispaint.com/aboutCloud.jsp
https://ibispaint.com/lecture/index.jsp?lang=ja&no=205
https://ibispaint.com/lecture/index.jsp?lang=ja&no=188

Relevant behavior:

- editable artwork can be moved/restored as the application's native artwork data.
- cloud storage/backup is independent of ordinary image export.
- past editable states can be materialized as artwork data.

Adopted principle: editable project persistence must not be reduced to flattened image export.

### Adobe Photoshop

Official recovery guidance:
https://helpx.adobe.com/photoshop/kb/file-recovery-photoshop.html

Relevant behavior:

- crash-recovery information is saved independently at intervals.
- recovery is a safety mechanism rather than a replacement for deliberate user saves.

Adopted principle: explicit save status and recovery-protection status remain separate.

### Affinity Photo

Official help:
https://affinity.help/photo2/English.lproj
https://affinity.help/photo2/ja.lproj/pages/DesignAids/snapshot.html

Relevant behavior:

- normal document Save / Save as Copy / Export are separate actions.
- snapshots provide explicitly restorable document states.

Adopted principle: Illustro keeps explicit Save, Save Copy, history/recovery concepts separate instead of conflating them.

## M05 architecture

### 1. Portable project file

`.illustro container v1` is a versioned binary container.

It contains:

- fixed header/footer identity
- an integrity-protected manifest
- required/optional typed sections
- per-section SHA-256
- bounded file/manifest/section counts and sizes
- document identity and fixed snapshot Revision identity
- Core document snapshot
- raster block payloads
- optional editor state
- preserved unknown optional sections/fields

Unknown required semantics are rejected. Unknown optional sections are preserved where safe. The M05 writer currently uses an explicit `none` codec; compression is not silently invented.

### 2. Portable Save and Working Store are separate

The portable project file is the user-owned interchange/save artifact.

The working store is incremental recovery state. It prefers OPFS and is not implemented by rewriting a complete `.illustro` file after every stroke.

This separation is intentional:

- drawing stays responsive
- recovery can advance incrementally
- explicit save can represent one fixed Revision while newer edits continue
- a damaged latest save generation does not automatically destroy the previous verified generation

### 3. Persistence Worker

Hashing, encoding and working-store I/O are kept off the realtime pointer/render path.

The drawing path sends committed recovery packets to persistence; it does not synchronously serialize the full project during pointer processing.

### 4. Recovery ordering

Recovery uses:

- WriterEpochId
- monotonically increasing CommitSequence
- contiguous ProtectedThrough

A later sequence does not make a missing earlier sequence safe. Duplicate/out-of-order packets cannot incorrectly advance protection. Packets from another WriterEpoch are rejected.

Timestamps are metadata only and are not the recovery ordering authority.

### 5. Explicit Save

Explicit Save captures a fixed Revision snapshot.

If the user draws while or after that Save:

- the saved Revision remains the saved state
- newer edits remain dirty
- reloading the saved version returns to that fixed saved Revision
- drawing is not intentionally blocked for the duration of project encoding

### 6. Last Good / Previous Good

A newly encoded save is decoded/validated before it becomes Last Good.

The working store retains a previous verified generation where possible. If Last Good is corrupted, the verified Previous Good can be selected instead of trusting corrupted bytes.

### 7. Opening untrusted project files

Portable input is treated as untrusted:

- magic/version/layout are checked
- manifest integrity is checked
- section hashes and bounds are checked
- required raster blocks must exist
- orphan/unknown required semantics are rejected
- Core semantic dependencies and brush algorithm references are validated before hydration

### 8. Reload projection

A restored Core Document is authoritative.

When a saved document is opened/reloaded, its committed brush operations are rebuilt into a fresh renderer projection with their original Surface/Layer identity. It does not misuse the M03 live Redo path.

The frozen Brush Foundation source remains unchanged.

### 9. Offline operation

The Service Worker cache is build-specific.

Vite emits an exact runtime asset manifest. Installation precaches the app shell plus generated runtime chunks, including Persistence/Brush worker assets. Old M05 build caches are removed after activation.

After a successful online load, automated browser verification confirms that under actual network failure the app can still:

- reload
- create a canvas
- draw
- advance Recovery protection
- save a native project file
- open that project file again

`navigator.onLine` is treated only as a UI hint; acceptance is based on real network failure plus successful offline operations.

## Automated acceptance coverage

The dedicated M05 workflow verifies:

- source/frozen-baseline lock
- Core tests
- M01-M05 editor unit tests
- exact Brush Foundation 93/93 regression
- editor typecheck/build
- offline runtime asset manifest includes worker/runtime chunks
- WebGL2 native save/open round-trip
- WebGPU native save/open round-trip
- fixed-snapshot save while later edits continue
- Last Good reload
- crash/reload-style Recovery from OPFS
- missing CommitSequence stops recovery at the contiguous safe point
- corrupted Last Good falls back to Previous Good
- actual offline reload/draw/recovery/save/open
- exact public GitHub Pages build
- M01-M04 fixed QA pages remain reachable and unchanged by M05 publication

The fixed M05 QA URL is:

https://totoro0419.github.io/illustro/qa/m05/

## Human acceptance

Automated verification cannot judge device-specific feel and user-visible behavior completely.

Before M05 is marked `✅` or merged, the fixed M05 QA page must be checked on the user's device and explicitly accepted.

M41 remains the later destructive Save/Recovery hardening milestone; M05 establishes the production save/recovery foundation and verifies representative corruption/gap/offline cases without claiming M41 complete.
