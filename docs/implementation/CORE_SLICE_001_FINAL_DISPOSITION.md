# Core Vertical Slice 001 — Final V2 Disposition

> Status: **DESIGN DISPOSITION COMPLETE**
> Date: 2026-09-28
> Scope: `packages/core` Vertical Slice 001 against Architecture V2 design contracts
> Production effect: V2 migration requirements. Scope authorization now follows ../IMPLEMENTATION_BASELINE.md.

## 1. Final conclusion

Vertical Slice 001 remains valuable as executable evidence for several low-level invariants, but it is **not** the final Core schema.

V2 does not discard the entire slice.

It keeps the verified principles that remain correct and explicitly replaces the parts whose current concrete representation would constrain Brush, Color, Recovery, Region or future file semantics.

No item is retained because code already exists.

## 2. Disposition table

| Slice 001 element | Final disposition | V2 decision |
|---|---|---|
| Document ID | **MODIFY type/generalize** | keep offline UUID identity; align with V2 Project/Entity ID taxonomy |
| Layer ID | **RETAIN principle / MODIFY abstraction** | UUID stable identity remains; layer becomes typed Entity |
| Transaction ID | **RETAIN principle** | UUID stable identity remains |
| Revision ID | **REPLACE** | numeric local sequence cannot be durable Revision identity; V2 uses UUID RevisionId |
| Block ID | **REPLACE as durable identity** | numeric value becomes RuntimeBlockHandle only; stable BlockId is UUID and optional ContentDigest is separate |
| Active Transaction | **RETAIN** | bounded mutable scratch before immutable publication remains correct |
| Stale transaction rejection | **RETAIN** | must reject before irreversible canonical adoption/publication |
| Immutable published Document Root | **RETAIN / EXTEND** | remains central; add full entity/raster/region/resource state |
| Paged COW metadata | **RETAIN as provisional implementation only** | structural sharing principle stays; concrete PagedMap is not API/file semantics |
| Sparse Raster | **RETAIN principle / MODIFY schema** | sparse 256 canonical tile grid, signed coordinates, multi-precision Surface descriptor |
| Tile size option | **REPLACE at canonical layer** | V2 canonical address grid fixed at 256; smaller granularity moves below it |
| RGBA8-only tile bytes | **REPLACE** | V2 Surface supports UNORM8 / UNORM16 / FLOAT32 |
| non-negative coordinates | **REPLACE** | signed off-canvas/overscan Raster is canonical |
| canonical ownership transfer | **RETAIN invariant / MODIFY block model** | published bytes immutable and singly owned; Block descriptor/ID/digest model changes |
| one Revision per committed Transaction | **RETAIN** | core Undo grouping rule |
| parentIds[] shape | **RETAIN** | compatible with normal single-parent and future multi-parent |
| root-switch Undo/Redo | **RETAIN** | core history model |
| branch retention after Undo + edit | **RETAIN / EXTEND** | retain branch; separate redo navigation and GC policy |
| Command versioned envelope | **RETAIN principle** | still required |
| `raster.tiles {tileCount}` operation | **REPLACE** | insufficient semantic record for Brush/Fill/Recovery/Timelapse |
| `layer.metadata` summary | **EXTEND** | summary may remain diagnostic but committed operation needs typed parameter/target semantics |
| Persistence handoff | **REPLACE** | V2 requires WriterEpoch/CommitSequence/root/operations/dependency closure |
| RecoveryState=max RevisionId | **REMOVE/REPLACE** | V2 uses ProtectedThrough contiguous CommitSequence + verified closure |
| minimal Raster Layer model | **RETAIN as test subset / EXTEND** | final layer/entity kinds remain architecture-defined |
| package capability boundary | **RETAIN principle** | internal mutable/canonical stores stay encapsulated |

## 3. Items retained as verified evidence

### 3.1 Sparse allocation

The existing test that a huge blank Document allocates zero Raster blocks and a local edit allocates only local data remains useful evidence.

V2 changes the Raster payload schema, not the sparse requirement.

### 3.2 Ownership transfer

The existing transfer test verifies that callers do not retain mutable ownership of published bytes.

V2 may use different payloads/subblocks, but the ownership invariant remains.

### 3.3 Stale isolation

The existing stale-transaction test remains a required regression concept.

V2 will additionally check semantic records/resources/Block adoption, not only current tile bytes.

### 3.4 Branching

The existing Undo → new edit → old Revision retained behavior remains valid.

V2 changes Revision identity from numeric sequence to UUID and adds independent CommitSequence for persistence ordering.

### 3.5 Metadata no-op

A user-visible no-op should not create a Revision.

That principle remains.

## 4. Required Production realignment before Brush work

When implementation is explicitly authorized, the current Core must be realigned before or inside the first authorized V2 slice.

Required changes:

1. introduce V2 identity taxonomy;
2. replace durable numeric Revision/Block identity assumptions;
3. introduce RasterSurfaceDescriptor;
4. make canonical tile coordinates signed;
5. fix V2 canonical tile addressing at 256 while allowing sub-tile execution;
6. support non-RGBA8 Raster formats through typed payload descriptors;
7. replace current CommandOperation summaries with V2 SemanticOperation envelope;
8. replace PersistenceHandoff with the V2 logical handoff;
9. remove max-Revision RecoveryState;
10. preserve existing sparse/stale/ownership/history regression coverage.

This is the first Core Drawing Slice milestone under the 2026-10-05 implementation baseline.

## 5. PagedMap decision

The current 64-page hash-partitioned `PagedMap` is not rejected solely because a future persistent HAMT/B-tree might scale better.

V2 decision:

- retain structural-sharing abstraction;
- keep current PagedMap only as an internal provisional implementation if it passes realistic metadata-scale benchmarks;
- do not serialize its page/hash layout;
- do not expose it as public API;
- replace it when realistic 10k/100k-entity workloads demonstrate a superior structure.

This concrete data-structure choice is implementation/benchmark-local and no longer a Production design blocker.

## 6. Compatibility policy

No public `.illustro` V2 file compatibility has been frozen.

Therefore internal Slice 001 schemas may be changed without migration compatibility requirements.

Once a user-facing native file version is released, future migrations require explicit compatibility rules.

## 7. Regression obligations after future code changes

Any V2 implementation replacing Slice 001 internals must re-run/regain:

- strict typecheck;
- sparse huge-canvas behavior;
- ownership immutability;
- stale transaction isolation;
- Undo/Redo root switching;
- branch retention;
- no-op transaction behavior;
- one Transaction → one Revision;
- no Production persistence claim before durable acknowledgement;
- signed tile mapping;
- hidden RGB;
- multi-precision Raster;
- semantic operation replay fixtures.

## 8. Final status

**Slice 001 is retained as a provisional executable foundation, with V2-mandated schema replacement in the areas explicitly marked above.**

It does not constrain Architecture V2.

