# Illustro Identity / Operation / Revision Contract V2

> Status: **DESIGN COMPLETE — Architecture V2 baseline**
> Date: 2026-09-28
> Scope: identity, transaction, semantic operation, revision, branch and GC boundaries
> Production effect: specification only; implementation scope follows `../IMPLEMENTATION_BASELINE.md`.

## 1. Goals

This contract must simultaneously support:

- offline-first creation without a central ID allocator;
- deep Undo/Redo and branching;
- asynchronous Persistence/Recovery;
- semantic Brush/Fill/Region records;
- future collaboration without forcing collaboration machinery into the current editor;
- low-latency hot paths without synchronous whole-document hashing.

Identity, ordering and integrity are deliberately separate concepts.

## 2. Identity taxonomy

### 2.1 Stable 128-bit IDs

The following are opaque 128-bit UUIDv4 values conforming to RFC 9562:

- `ProjectId`
- `EntityId` and typed aliases such as `LayerId`, `RegionId`, `MaskId`, `GuideId`, `ReferenceId`, `EffectId`
- `TransactionId`
- `RevisionId`
- `WriterEpochId`
- `BlockId`
- `ResourceId`

Reasons:

- generation is local/offline and does not require coordination;
- no timestamp or array-order semantics are hidden inside identity;
- the same representation works across PC/Tablet/Smartphone and future multi-writer workflows;
- UUID ordering is never used as document order.

Display strings, localized labels, array indexes, memory addresses and timestamps are never identity.

### 2.2 Operation identity

An operation is identified by:

```text
OperationKey = TransactionId + operationOrdinal:u32
```

`operationOrdinal` is zero-based and unique within one Transaction.

A separate random UUID per small operation is not required.

### 2.3 Runtime handles

Runtime-local acceleration handles are explicitly non-durable:

```text
RuntimeBlockHandle
RuntimeEntityHandle
RuntimeRevisionHandle
```

They may be compact integers and may be recycled after their owning runtime generation is gone.

They must never be:

- written as portable identity;
- exposed as public stable API identity;
- compared across sessions;
- used for collaboration identity.

Slice 001 numeric `RevisionId` / `BlockId` therefore become runtime-handle concepts when Production is realigned to V2.

### 2.4 Integrity/content digest

Immutable payloads may have:

```text
ContentDigest = SHA-256(
  domainSeparator ||
  schemaVersion ||
  canonicalDescriptor ||
  canonicalPayloadBytes
)
```

The exact binary envelope belongs to the file-format specification; the logical digest rule is fixed here.

Important:

- `ContentDigest` is integrity/content identity, not user-operation identity;
- full-content hashing is not required synchronously on the Realtime commit path;
- hashing may run in a bounded Persistence/Materialization lane;
- deduplication may use the digest after it exists but is not required for commit correctness.

### 2.5 Commit ordering

Persistence ordering uses:

```text
CommitStamp = (WriterEpochId, CommitSequence)
CommitSequence = monotonically increasing u64 within one WriterEpoch
```

It is not a `RevisionId`.

Undoing to an older Revision and editing again still advances `CommitSequence`.

Wall-clock timestamps are metadata only and never correctness ordering.

## 3. Entity model

Long-lived document objects have typed Stable IDs.

Minimum V2 families:

- Layer
- Raster Surface
- Mask
- Vector object/path
- Text entity
- Region / Region Set
- Guide
- Reference item
- Effect instance
- Selection Mask / Saved Selection
- Resource / embedded asset reference

Entity maps and ordered child collections use persistent/structurally shared storage, but the concrete HAMT/B-tree/RRB/PagedMap implementation is not serialized as semantics.

A concrete container may be replaced without changing IDs or user-visible document meaning.

## 4. Transaction contract

A Transaction is one user-intent Undo unit.

```text
Transaction
- id: TransactionId
- baseRevisionId: RevisionId
- labelId / diagnostic label
- ordered SemanticOperation[]
- mutable bounded working state
- source/dependency snapshot refs
```

Rules:

1. Active interaction may mutate bounded scratch state.
2. Intermediate pointer samples / parameter drag frames do not create published Revisions.
3. Commit is atomic at the logical Revision level.
4. A stale base Revision is rejected before ownership of irreversible canonical resources is adopted.
5. Cancel publishes no Revision.
6. One committed user Transaction produces exactly one normal local Revision.
7. A very long Transaction may stream immutable recovery/materialization pages before final Commit, but those pages do not become a completed user Transaction until its terminal commit record exists.

## 5. Semantic Operation contract

Every committed Transaction contains versioned typed operations.

Common envelope:

```text
SemanticOperation
- key: OperationKey
- kind: stable non-localized ID
- schemaVersion
- targetEntityIds[]
- parameters
- algorithmVersionRefs[]
- resourceRefs[]
- sourceRevision/value refs[]
- selection/constraint snapshot refs[]
- result/value refs where applicable
- dirty/footprint hint
```

The envelope is independent of UI entry point.

Toolbar, Menu, Command Search, Quick Controller, Context UI, detached/PiP surface, Shortcut and Gesture must all invoke the same semantic command/operation model.

### Required operation families

At minimum the architecture admits:

- structural entity/layer edits;
- raster semantic mutation;
- brush stroke;
- fill query/result;
- selection expression/freeze;
- transform/bake;
- effect/adjustment parameter edit;
- region topology/identity/assignment decision;
- color conversion;
- strict raster delta/import.

The exact feature schemas are versioned separately.

Raw Pointer Events are optional diagnostic/original input. They are never the sole durable meaning of a Brush result.

## 6. Revision contract

A published Revision is immutable logical document state.

```text
Revision
- id: RevisionId
- parentRevisionIds[]
- transactionId | null
- documentRootRef
- commitStamp | null
- semanticOperationRefs[]
- committedAt metadata
- author/actor metadata optional/future
```

Initial Revision has no Transaction and no parent.

For normal local editing:

- one parent;
- one committed Transaction;
- one new Revision.

Multiple parents remain type-valid for future merge/import workflows, but realtime collaboration is not added now.

`RevisionId` is independent of content digest and commit sequence.

## 7. Document Root

A Revision Root references immutable logical state:

- document metadata and canvas frame;
- ordered layer tree;
- entity table;
- Raster Surface roots/value refs;
- masks/effects;
- Region sets and assignment state;
- guides/reference metadata;
- color descriptor/profile refs;
- project editing state that is explicitly document-persistent;
- resource table.

Derived caches and GPU objects are never Root authority.

## 8. Undo / Redo / Branch

Undo is Revision navigation, not inverse-pixel reconstruction.

- Undo: current Revision → chosen parent.
- Redo: session navigation → previously traversed child when still retained.
- Edit after Undo: create a new child branch.
- The former child remains a valid Revision until retention/GC removes it.

The UI may present a simple linear Undo/Redo experience while the internal graph retains alternate branches.

Redo-navigation state is workspace/session state and is not the Revision graph itself.

## 9. Representation-neutral materialization

A Revision may reference Raster logical values whose strict bytes are already materialized or can be reconstructed from bounded semantic dependencies.

Background materialization/compaction may create a new physical representation without creating a user-visible Revision **only when strict equivalence is verified**.

A representation cache/index may change; the immutable user Revision meaning may not.

## 10. Retention / GC roots

GC must retain the transitive union of:

- current Revision;
- active Transaction base/dependencies;
- retained Undo/Redo branches;
- pinned Snapshots/Checkpoints;
- Recovery-protected closure;
- Last Good / Previous Good save generations;
- in-flight Save/Export snapshots;
- Timelapse data under its independent retention policy;
- future collaboration roots when that feature exists.

Fixed “N undo steps” is not an architecture constant.

Retention quantities are policy/calibration values.

## 11. Future collaboration boundary

V2 does not implement collaboration, but it preserves the path by requiring:

- stable IDs independent of array positions;
- typed versioned operations;
- parent-capable Revision graph;
- no network authority requirement for local creation;
- no global mutable singleton IDs;
- no use of local Runtime handles as durable identity.

Future ActorId/causal metadata may be added without replacing existing Entity/Transaction/Revision identities.

## 12. Slice 001 consequence

The following Slice 001 details are not V2-compatible as final contracts:

- numeric `RevisionId` as durable identity;
- numeric `BlockId` as durable identity;
- `raster.tiles { tileCount }` as sufficient Brush/Fill semantic record.

The following principles remain valid:

- stale-Transaction rejection;
- immutable published Root;
- one user Transaction → one published Revision;
- root-switch Undo/Redo;
- branch retention;
- typed/versioned command envelope.

## 13. Verification gates

Before Production realignment:

- UUID generation test vectors / collision-independent deterministic test factory;
- OperationKey uniqueness within and across Transactions;
- branch-after-Undo with independent CommitSequence progression;
- stale Transaction publishes no Revision/Block;
- runtime handle never appears in serialized logical schema;
- representation compaction does not change RevisionId or semantic pixel result;
- GC reachability fixtures cover current/branch/snapshot/recovery/save/export roots.

## 14. External basis

- RFC 9562 — UUIDs, including UUIDv4.
- NIST SHA-256 family as the digest primitive.
- Existing Illustro Product/Feature requirements that forbid localized strings/array positions from becoming durable identities.

