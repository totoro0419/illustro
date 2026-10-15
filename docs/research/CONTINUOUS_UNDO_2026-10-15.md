# Continuous Undo / Redo — 2026-10-15

Status: EXPERIMENTAL. Automated evidence and device acceptance are separate. User device acceptance is pending.

Base: PR26 `3310f236f432ccfba20bcf964a6c10b12492e8d4`, tree `cc2aa1130661de903e1ac4866bf0d117e2c4ad24`, including the additional color-wheel fixes in PR25. Neither PR is merged. Color, brush geometry, canonical reconstruction, shaders, artwork resolution and the Core revision contract are unchanged.

## Reproduced causes

- `historyPending` disabled both buttons and rejected further keyboard commands. In the first local3000² test,12 requests produced only6 WebGL2 /4 WebGPU undos. With snapshots removed,6 requests produced one undo on either backend.
- Even cached navigation performed per-step drain / snapshot work / presentation completion. WebGPU submitted snapshot copies separately from presentation.
- The16MiB GPU history reservation could evict snapshots for wider strokes. Missing snapshots caused dirty reconstruction per operation, repeatedly evaluating overlapping records.
- Immediate Undo waited for all pending formal drawing, including the very line being removed.
- Portable restoration revalidated stroke records into new objects; subsequent navigation compared them to the distinct semantic record objects by identity. A controlled reload test reproduced `Document/Renderer undo mismatch`. A per-surface association now connects validated runtime records to their semantic source. Validation is retained.

Before/after benchmark results must identify the exact source. Local preliminary values do not certify the final commit. The CI benchmark uses the same runner/browser/settings for immutable base3310f236 and the proposed source. Requested command intervals are not observed physical touch latency.

## Design

`HistoryNavigation` accepts ordered undo/redo requests while earlier presentation is pending. It retains each logical Core operation and batches at most32 requests per derived update, without a debounce timer. Admission is capped at256 outstanding requests with explicit refusal. Faults reject save barriers and report unprocessed requests. Text input shortcuts and the outside-down/inside-up touch ghost-click guard are retained.

At navigation start, canonical stroke records finalize before changing Core history. The renderer pauses new submissions and acknowledges only the already submitted batch. If canonical GPU jobs remain, their runtime IDs and entire dirty footprints are collected before the queue is reset. Unsent derived jobs can be superseded by the new requested history state; the canonical record is retained for Redo. The affected tiles are reconstructed at the final logical head. Existing drawing completion waiters receive explicit supersession, not a fake GPU completion. No active actual input is cancelled by this path.

Each Core undo/redo remains one history step. For cached batches, exact before/after copies and the final scene are encoded together, in chronological navigation order, with one completion acknowledgement. Mixed undo/redo batches capture the correct intermediate after snapshots. Cold batches union dirty tiles across affected layers and reconstruct each tile at the final target once. A cold pure-Redo batch appends only its exact suffix to completed base images. Missing caches never change the artwork or disable navigation.

Editor GPU snapshot reservations are bounded at64MiB when the browser's memory hint is at least8, otherwise32MiB, including when the hint is absent. The hint is not a measurement of physical device memory. Snapshots allocate on demand. Existing per-submission WebGPU texture retirement is retained; reservation bytes and temporarily retired bytes are reported separately. Standalone legacy runtime defaults remain16MiB.

The selected layer and surface for each history operation come from that operation's source/target revision, including when a batch crosses layer creation/removal. Geometry history reconstructs the final geometry once using the existing exact path.

Save/Save Copy/Export wait for already accepted navigation before capturing their fixed revision. History and pending head writes keep the existing indicator in its pending state. Recovery publishes a successful batch's final head through the existing verified set-head path. Artwork replacement waits for navigation and rejects new history input during activation. An initial test incorrectly waited on an unchanged revision ID before file activation; the driver now also waits for the actual open-completed state. The product activation guard independently prevents history from using a destroyed renderer.

## Required validation

- Queue ordering, capacity, failure and save barriers: editor unit tests.
- `undo-navigation-benchmark.mjs`:512×384 and3000², narrow and256px strokes, both backends; isolated and repeated Undo/Redo, deliberately cold cache, immediate Undo of a512px broad stroke; actual command count, rebuilds, submissions, completion time and bounded cache metrics. The unchanged baseline's rejected commands must remain visible in the report.
- `undo-navigation-quality.mjs`: both backends,512×384/3000²,1/3/10 layers, seven presets, overlapping ink/erasers, strict tile hashes at known revisions, mixed directions, missing snapshots, trusted touch, queued history during Save, portable reload, layer creation boundaries and pending GPU supersession. Ten-layer cases emulate the lower memory hint and require the32MiB budget. This is an emulated hint, not Android hardware evidence.
- Prior Core/editor/Brush tests, exact color sources, M09/Orbit/SV, gesture cancellation, M05 Save/Recovery/offline/failures, M06 export, M08 geometry/seamless/display, home/works safety.
- Prior four-size / three-layer-count / seven-preset quality matrix, wide-area cache overflow and1100-stroke sustained drawing workload.
- Isolated `/qa/perf-undo/` only, preserving every other QA file by checksum. Public browser tests must check the exact source stamp and repeat navigation/pixels/queued Save on both GPU backends after Pages publication.

## Limits

Submitted GPU commands cannot be cancelled. A busy device still requires that bounded submission to finish. Large cold history outside the snapshot budget can still need substantial canonical reconstruction. Retained artwork records grow with the artwork; they are not disposable queue entries. Physical Android/pen/touch feel, physical screen latency, real VRAM and isolated GPU execution remain unverified. A green CI or a published URL is not user acceptance.
