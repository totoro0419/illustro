# Illustro Persistence / Recovery Logical Contract V2

> Status: **DESIGN COMPLETE — physical container encoding remains feature-gated**
> Date: 2026-09-28
> Scope: logical save/recovery state, dependency closure, commit ordering, concurrency and acknowledgement
> Production effect: specification only. This does not implement OPFS or portable .illustro encoding.

## 1. Separation of responsibilities

Illustro treats these as different concepts:

- **Logical Commit** — a user Transaction has produced an immutable Revision.
- **History** — creative navigation among Revisions.
- **Recovery Protection** — a committed state is reconstructible after process/session failure under the supported storage contract.
- **Explicit Save** — a fixed Revision snapshot has been durably written to the selected destination/generation.
- **Export** — a fixed Revision has been rendered/encoded into an interchange format.

Undo availability is not Recovery protection.

Recovery protection is not the same as “Saved”.

## 2. Core identities

Persistence uses the V2 identity taxonomy:

- ProjectId
- WriterEpochId
- TransactionId
- RevisionId
- BlockId / ResourceId
- ContentDigest where available
- CommitSequence

```text
CommitStamp = (WriterEpochId, CommitSequence)
```

CommitSequence is strictly monotonic within one WriterEpoch.

Revision numeric/order comparison is never used as a durability watermark.

## 3. Writer/session isolation

Each open mutable editing session gets a new WriterEpochId.

Two opens of the same portable document do not share a mutable recovery journal namespace by default.

Each writer has:

- independent working namespace;
- independent commit sequence;
- independent pending recovery queue;
- common source provenance where appropriate.

This prevents two tabs/windows from silently appending into one recovery stream.

Saving back to the same external destination must perform a destination-version/conflict check when reliable platform metadata is available.

Conflicting external modification is never silently overwritten.

## 4. Logical Recovery Packet

A committed Transaction produces a logical Recovery Packet:

```text
RecoveryPacket
- schemaVersion
- projectId
- writerEpochId
- commitSequence
- transactionId
- parentRevisionIds[]
- resultRevisionId
- documentRootRef
- semanticOperationRefs[]
- requiredBlockIds[]
- requiredResourceIds[]
- requiredAlgorithmVersionRefs[]
- requiredColor/Profile refs[]
- requiredSelection/source snapshot refs[]
- optional content digests
- packet integrity metadata
```

The exact physical framing/CBOR/chunk layout is a later file/persistence encoding decision.

The logical fields above are not optional implementation guesses.

## 5. Dependency closure

A Revision is Recovery-protected only when every dependency needed to reconstruct its promised state is durable and verified under the active persistence backend.

Closure is transitive.

Examples include:

- raster materialized base blocks;
- unmaterialized Brush semantic pages;
- Brush tip/texture resources;
- selection snapshot values;
- mixing/source Raster values;
- Region identity/assignment records;
- ICC/profile resources required by canonical interpretation;
- fonts for editable text;
- required unknown preserved payloads once the file format supports them.

A journal record that exists while one required dependency is missing does not protect that Revision.

## 6. Protection watermark

Recovery status is tracked by contiguous commit sequence, not maximum Revision ID.

```text
ProtectedThrough(writerEpochId) = highest CommitSequence k
such that all completed commits <= k in that writer stream
have verified dependency-closed durable representation
```

A gap prevents the watermark from advancing beyond the gap.

Undo to an older Revision does not decrease or reuse CommitSequence.

A branch edit receives a new higher CommitSequence.

## 7. State vocabulary

### 7.1 Logical Current

The current in-memory published Revision.

### 7.2 Protection Pending

The Revision is logically committed but its required Recovery closure is not yet durably acknowledged.

### 7.3 Protected

The Revision's commit lies at or below the verified ProtectedThrough watermark for its WriterEpoch.

This is a software/storage-contract guarantee, not an assertion of absolute physical power-loss immunity beyond the platform's documented durability semantics.

### 7.4 Saved

A fixed explicit-save snapshot/generation for a Revision and relevant project metadata has completed the save activation contract.

A newer edit after the saved snapshot makes the document dirty even if that edit is Recovery-protected.

### 7.5 Dirty

Current logical state differs from the active explicit Saved destination snapshot.

### 7.6 Recovered

A session was reconstructed from Recovery state rather than opened exactly from the last explicit Saved generation.

Opening a Recovered state does not immediately overwrite the previous Last Good save.

### 7.7 Last Good / Previous Good

Portable/native save activation keeps:

- Last Good active generation;
- Previous Good prior generation, retained at least through successful next activation according to retention policy.

## 8. Commit → persistence handoff

Logical commit must not synchronously wait for physical file flush.

Commit returns a handoff containing at least:

- CommitStamp;
- TransactionId;
- parent/result Revision IDs;
- Document Root ref;
- semantic operation refs;
- dependency summary / closure root;
- newly created immutable Block/Resource refs.

Persistence may batch handoffs.

The handoff is **not** a durability acknowledgement.

## 9. Durable acknowledgement

A Persistence backend may acknowledge Protection only after:

1. required dependency payloads have been written;
2. the commit marker/record has been written;
3. the backend's defined durability attempt has completed;
4. integrity/closure checks required by the backend have passed;
5. ordering is contiguous through that CommitSequence.

For OPFS SyncAccessHandle, WHATWG defines `flush()` to ensure changes are reflected in the file entry. Architecture evidence may rely on that API contract, but the product must not market it as an absolute guarantee against every hardware/power-loss mode.

Read-back verification may be used where its cost/benefit is justified by the physical format.

## 10. Large/long Transactions

A long Brush/Transform operation may produce immutable stable pages before user Commit.

Those pages may be persisted early to bound RAM and future recovery work.

However:

- the active interaction is not advertised as a completed Transaction;
- partial pages cannot be applied as a completed Revision;
- a terminal commit marker ties the complete set to the final Transaction/Revision.

Optional “recover unfinished stroke” behavior is a separate product feature and cannot be silently conflated with completed-Revision recovery.

## 11. Recovery scan semantics

The physical journal format is still open, but logical recovery obeys:

1. identify writer/session stream;
2. validate ordered records from a known base/checkpoint;
3. verify record integrity;
4. verify required dependency closure;
5. stop before the first record that cannot be validated as a complete contiguous commit;
6. reconstruct the latest Protected Revision;
7. report later partial/unresolved data separately if salvage is possible.

No later accidental byte pattern may be used to skip an invalid gap and falsely advance ProtectedThrough.

The existing V1 torn-tail prototype remains evidence for this rule.

## 12. Explicit Save

Save Now captures one fixed Revision snapshot.

Edits after capture continue in new Transactions.

A successful older save completion must not mark a newer logical Revision Saved.

Save activation is generation-based:

```text
build candidate
→ persist required closure
→ validate candidate
→ activate atomically/logically
→ update Last Good
→ retain Previous Good according to policy
```

The exact physical activation mechanism is file-format/backend-specific.

## 13. Export

Export uses a fixed Revision snapshot.

It may materialize required tiles/effects asynchronously.

Export never mutates current Document semantics and must not block the current editing Transaction for its full duration.

## 14. Storage pressure / backpressure

The persistence queue is bounded.

Priority:

1. data required to close Recovery dependencies;
2. current/active user state;
3. explicit Save barrier;
4. cache/maintenance/optional history spill.

If durable closure cannot progress due storage exhaustion:

- do not claim new commits are Protected;
- preserve last verified Protected state;
- stop low-priority writes/cache;
- surface a recoverable storage condition to the product layer;
- never discard the only copy of unprotected canonical/semantic data.

## 15. Mobile lifecycle

Recovery correctness does not depend on `beforeunload`.

Normal editing continuously advances recovery work.

On hidden/page lifecycle signals:

- prioritize already-prepared protection data;
- stop optional Region/cache/background work;
- do not begin a large new save and assume it will finish;
- resume by validating the last Protected state.

## 16. History / GC interaction

Persistence and History share immutable payloads but not success semantics.

GC must retain:

- all dependencies needed by ProtectedThrough;
- Last Good/Previous Good;
- current/active state;
- pinned snapshots;
- in-flight save/export;
- retained History roots.

Only after a newer representation/generation is verified may superseded persistence payloads become GC candidates.

## 17. Portable .illustro boundary

This document fixes logical persistence semantics, not the final container bytes.

Still feature-gated before portable-file Production work:

- metadata encoding;
- chunk/header/footer layout;
- compression;
- physical checksum layout;
- directory/index encoding;
- unknown-field preservation encoding;
- compatibility/salvage physical rules.

The Section 9 Library draft remains a strong reference for those decisions but is not automatically adopted.

## 18. Slice 001 consequence

Slice 001 `PersistenceHandoff` must be replaced before Production persistence.

Current fields:

- Revision ID
- parent Revision
- Transaction ID
- changed Block IDs

are insufficient because they omit:

- WriterEpochId;
- CommitSequence;
- Document Root/semantic operation refs;
- transitive dependencies;
- resources/algorithm/profile refs;
- closure status;
- durability acknowledgement state.

Current `RecoveryState.latest = max(RevisionId)` is not a V2-valid protection model.

## 19. Verification gates

Before Production Persistence implementation:

- branch-after-Undo still advances commit sequence;
- missing one required Block/Resource prevents protection;
- out-of-order packet arrival cannot advance through a gap;
- duplicate packet delivery is idempotent;
- process termination after every logical write stage recovers only verified closure;
- disk/storage-full preserves last Protected state;
- explicit Save snapshot remains fixed while newer edits continue;
- old save completion cannot roll Saved state backward/forward incorrectly;
- concurrent open sessions use separate writer namespaces;
- external destination conflict does not silently overwrite;
- cache/GC never removes required Protected closure.

## 20. External basis

- WHATWG File System Standard: FileSystemSyncAccessHandle is DedicatedWorker-only and exposes explicit `flush()`; creation takes an exclusive lock on the file entry.
- Existing V1 served-browser OPFS prototype remains implementation-feasibility evidence, not final physical-format proof.

