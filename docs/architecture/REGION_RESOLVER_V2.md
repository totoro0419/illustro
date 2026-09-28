# Illustro Shared Region Resolver Contract V2

> Status: **SEMANTIC DESIGN COMPLETE — synthetic PASS / real-art Evidence→Topology prototype FAILS gate**
> Date: 2026-09-28
> Scope: Fill / Selection / Lineart / Persistent Region shared resolver boundary
> Production effect: specification only. Region/Fill Production remains benchmark-gated and user authorization is still required.

## 1. Core decision

Illustro does not implement Fill, Magic Selection, Lineart Region and Persistent Coloring as unrelated flood-fill variants.

They share a **Region Resolver core**, while preserving different product semantics.

The common pipeline is:

```text
Source Snapshot
→ Evidence
→ Boundary State
→ Topology Generation
→ Query Resolution
→ Confidence / Ambiguity
→ feature-specific output
```

Persistent Region Identity is layered above topology resolution.

Selection coverage and Region identity remain separate concepts.

## 2. Responsibilities

### Shared Region Resolver owns

- source snapshot capture;
- evidence extraction;
- boundary interpretation;
- gap/virtual-boundary reasoning;
- topology generation;
- connected/closed region queries;
- confidence/ambiguity reporting;
- bounded incremental invalidation;
- deterministic resolver versioning.

### Shared Region Resolver does not own

- Layer panel/UI;
- Fill color;
- Selection lifetime;
- Persistent Region assignment policy;
- visual UI form;
- semantic labels such as Hair/Skin.

Those consume Resolver results.

## 3. Source Snapshot

Every resolver request is anchored to explicit source state.

```text
ResolverSourceSnapshot
- sourceSnapshotId
- baseRevisionId
- ordered SourceRef[]
- transforms/generations
- resolverAlgorithmVersion
- policyProfileVersion
```

A SourceRef includes:

- stable Entity ID;
- exact Revision/value generation;
- source role;
- participation mode;
- transform;
- optional channel/luminance/vector-boundary policy.

Visibility and Region-boundary participation are separate flags.

A Fill/Selection operation may not silently read whatever Layer pixels happen to exist later.

## 4. Evidence

Evidence is derived, versioned data describing potential boundaries.

Sources may include:

- Raster alpha;
- Raster luminance/color contrast;
- explicit reference Layer participation;
- Vector paths/strokes;
- user boundary hints/overrides;
- future specialized lineart evidence.

Evidence records at least:

- source identity/generation;
- location/geometry;
- strength;
- confidence;
- provenance;
- optional orientation/width.

Evidence cache is Derived and pay-for-use.

## 5. Boundary states

Evidence does not instantly become an unquestioned boundary.

Boundary state:

- `Accepted`
- `Candidate`
- `Unresolved`
- `Rejected`
- `UserPinned`

UserPinned explicit decisions outrank automatic recomputation until the user removes/changes them.

Gap closing uses explicit virtual-boundary records with provenance; it does not destructively alter source lineart.

## 6. Topology generation

Resolver topology is a generation-scoped result.

```text
TopologyGeneration
- generationId
- sourceSnapshotId
- state
- face/loop/adjacency data
- evidence/boundary refs
- dirty provenance
```

Generation state:

- `Current`
- `Updating`
- `Ambiguous`
- `Unresolved`
- `Failed`
- `Cancelled`
- `Retired`

A partially updated connected component is never mixed with old data and presented as one normal Current generation.

## 7. Resolver query

Common request envelope:

```text
RegionResolveRequest
- requestId
- sourceSnapshotId
- query
- policyProfileVersion
- fixed/live mode
- optional domain bounds
```

V2 query families:

- `FloodSeed(seedPoint)`
- `Enclose(path/polygon)`
- `ClosedRegionsIn(bounds)`
- `StableRegion(regionIds)`
- `BoundaryComponent(seed/evidence)`

Feature-specific modes may compose these rather than inventing a second topology engine.

## 8. Resolver result

```text
RegionResolveResult
- requestId
- sourceSnapshotId
- topologyGenerationId
- status
- coverage/value ref where requested
- matched face/region candidates
- confidence
- ambiguity reasons[]
- dependency footprint
- diagnostics
```

Confidence is structured, not just one unexplained percentage.

Minimum representation:

```text
ResolutionConfidence
- score [0,1]
- best-vs-next margin
- evidence reasons[]
- blocking ambiguity flags[]
```

Exact thresholds are benchmarked/versioned.

Below the accepted threshold/margin, the Resolver returns Ambiguous/Unresolved rather than silently selecting a plausible result.

## 9. Fixed vs Live semantics

### Fixed Source

Used by normal Fill/Selection/Brush constraint operations.

The exact source snapshot is captured at invocation.

The result does not change when later source edits occur.

### Live Binding

Used only by explicitly live features such as Persistent Region / lineart-linked coloring.

A Live Binding records:

- source set;
- resolver policy version;
- previous Region identity/generation;
- assignment/user overrides.

Updates produce a new generation and reconciliation operation.

“Live” never means an unversioned background mutation outside History.

## 10. Selection integration

Region → Selection:

- Resolver output is converted/frozen into Selection Coverage;
- Selection receives its own value/revision semantics;
- later Region changes do not mutate a frozen Selection unless the user explicitly creates a live selection binding feature.

Selection → Region:

- Selection coverage is not automatically a Region identity;
- explicit conversion may seed/hint a Region operation but must pass topology semantics.

This prevents Selection Mask and persistent Region identity from being conflated.

## 11. Fill integration

Normal Fill captures a fixed source snapshot.

Fill operation stores:

- query;
- source snapshot;
- resolver version/policy;
- resolved/frozen coverage or a bounded deterministic result ref;
- fill color/style semantics;
- target Raster Surface.

Fill commit must not later change because the reference lineart was edited.

Persistent/linked Fill is a different feature and uses Live Binding.

## 12. Stable Region Identity

Persistent Region identity is a stable opaque RegionId from the V2 identity contract.

Matching considers structural evidence before superficial color similarity.

Candidate descriptors may use:

- loops/holes;
- area/centroid/bounds;
- boundary provenance;
- adjacency;
- explicit hints/pins;
- source generation;
- known transform lineage.

Exact scoring weights are benchmarked/versioned.

### 12.1 One-to-one continuation

When topology and matching establish a clear one-to-one continuation, retain the same RegionId.

### 12.2 Split

When one old Region provably splits:

- old Region becomes Retired;
- each child receives a new RegionId;
- each child records the old Region as a lineage parent;
- do **not** arbitrarily give the old ID to “the largest child”.

Existing identical Fill/assignment semantics may be propagated to all children as a reconciliation operation with provenance.

### 12.3 Merge

When multiple old Regions provably merge:

- merged face receives a new RegionId;
- all old Regions become lineage parents;
- if all parent assignments are equivalent, the assignment may propagate;
- conflicting assignments produce Ambiguous reconciliation and no silent winner.

### 12.4 Ambiguous continuation

If a one-to-one match is not sufficiently clear:

- do not silently transfer the RegionId;
- keep the new result Ambiguous;
- allow user pin/relink/merge/split/retry decisions.

### 12.5 Topology-preserving transform

If a known non-destructive transform preserves topology with explicit lineage, Region identity may be carried through the transform without re-guessing from pixels.

## 13. User overrides

Required semantic overrides:

- accept/reject boundary;
- add/remove virtual bridge;
- merge Regions;
- split Region;
- pin/relink identity;
- ignore source/evidence;
- force recompute with a chosen policy.

Overrides are versioned document operations.

Automatic recomputation may not overwrite them silently.

## 14. Incremental update

Source edits generate dirty evidence bounds.

Resolver update scope is:

```text
dirty source bounds
+ evidence influence
+ gap/bridge influence
+ dependent connected component
```

Do not default to whole-document topology rebuild.

If a local edit can cause a remote merge/split within the same connected component, the affected component becomes Updating until the new generation is coherent.

Foreground Brush commit never waits for background Region analysis.

## 15. Bounded work / scheduling

Region analysis is pay-for-use.

If no Region-dependent feature is active/requested:

- no recurring full-canvas analysis;
- no required topology resident state.

Resolver jobs are cancellable/coalescible by generation.

Obsolete background generations may be dropped.

A user-requested Fill/Selection query may raise required work priority, but still returns an explicit progress/ambiguity/error state rather than blocking input indefinitely.

## 16. Persistence / History

Canonical persistent data may include:

- RegionSet identity/lineage;
- user boundary/identity overrides;
- Persistent Fill/assignment state;
- resolver algorithm/profile versions;
- source snapshot refs;
- committed reconciliation decisions.

Derived/cache data includes:

- spatial index;
- transient evidence raster;
- acceleration structures;
- diagnostic previews.

Each automatic reconciliation is one explicit semantic Transaction/operation group that can be undone.

## 17. Region Production benchmark gate

The resolver algorithm/threshold profile must be calibrated on a labeled adversarial corpus before Production Region/Fill implementation.

### Required corpus classes

- clean closed lineart;
- anti-aliased lineart;
- colored lineart;
- varied line width;
- very small gaps;
- intentional openings;
- near-touching lines;
- crossings/T-junctions;
- false bridge candidates;
- nested loops/holes;
- tiny regions;
- large sparse canvas;
- one-to-one edit;
- split;
- merge;
- delete/create;
- affine transform;
- partial erase/redraw;
- vector boundaries;
- multiple reference layers;
- noisy/background image source.

### Required semantic pass properties

- explicitly Ambiguous fixtures never auto-resolve as Current;
- UserPinned boundaries/identity are preserved;
- one-to-one labeled continuation retains ID;
- split/merge never use arbitrary largest-child/last-writer identity;
- conflicting merge assignments never silently choose one;
- fixed Fill/Selection result is unaffected by later source edit;
- stale/partial topology generation is never passed as Current;
- normal Brush stroke latency does not depend on Region completion;
- incremental update produces the same final topology as full reference recomputation for the corpus.

### Calibration outputs

- evidence thresholds;
- gap/bridge thresholds;
- confidence acceptance threshold;
- best-vs-next margin threshold;
- candidate search bounds;
- update budgets.

Those values become versioned Resolver Profiles after measurement.

## 18. Slice 001 consequence

Slice 001 does not directly conflict because it has no Region entity.

Future Production must not place all of the following into Raster Layer state:

- Selection Coverage;
- Resolver query/result;
- Lineart topology;
- persistent Region identity;
- Region assignment.

Shared Region Resolver and Persistent Region Entity remain separate responsibilities.

## 19. External/product basis

This contract follows the current Illustro requirements that:

- Region is a Document concept;
- identity must survive reasonable lineart edits where possible;
- Selection and Region are different;
- automatic ambiguity must be exposed rather than hidden;
- Region work must not live on the normal Brush hot path.



## 20. Validation evidence — 2026-09-28

The non-Production resolver prototype and labeled corpus in `prototypes/v2-validation` were executed against this contract.

Synthetic/adversarial result:

- static labeled fixtures: **17/17 PASS**;
- calibrated identity/topology transitions: **7/7 PASS**;
- total calibrated cases: **24/24 PASS**;
- false Ambiguous on fixtures not labeled Ambiguous: 0;
- conflicting merge assignments → Ambiguous: PASS;
- UserPinned evidence survives source evidence loss: PASS;
- stale generation cannot publish as Current: PASS;
- fixed-source result remains frozen after later source edits: PASS;
- incremental result equals full reference topology: PASS;
- incremental affected old scope in the fixture: 6,320 / 147,456 cells = **4.286%**.

Synthetic reference policy candidate:

```text
evidenceThreshold       = 0.50
gapMax                  = 2 px
confidenceThreshold     = 0.65
retainIoU               = 0.80
identityMargin          = 0.20
ambiguousIoUFloor       = 0.30
lineageOverlapFraction  = 0.18
candidateSearchPx       = 4 px
```

Reference background comparison point: 16,384 cells.

Full details are recorded in [Region Resolver V2 Reference Benchmark](../benchmarks/REGION_V2_BENCHMARK_2026-09-28.md).

### Gate interpretation

The synthetic semantic/corpus portion of Gate C **passes**.

The overall Production Gate C remains **CONDITIONAL** because these labels are synthetic. Production confidence/gap/identity thresholds must not be frozen until a representative labeled real-artwork corpus is evaluated without changing expected labels after seeing results.


## 21. Representative real-art validation — 2026-09-29

The missing real-art evidence was implemented and executed using actual public-domain/Open Access drawings with labels frozen before the first Resolver run.

Final Train-driven candidate result:

    training                     = 10 / 14 = 71.4%
    required training            >= 90%
    development holdout          = 3 / 6 = 50.0%
    required development holdout >= 80%

The training requirement fails, so a new blind final set was deliberately **not consumed**.

Observed failure classes include:

- faint/weak closed boundaries leaking to exterior;
- dense ornament producing unresolved/over-segmented topology;
- wash/hatching producing false closure;
- one global evidence policy failing to separate structural line, texture and wash.

The synthetic semantic suite remains valid. The failure is specifically the current real-image Evidence → Boundary → Topology inference strategy.

### Gate interpretation

> **Gate C is BLOCKED / NOT CLOSED.**

Do not continue threshold chasing.

Before the next real-art gate attempt, redesign the Evidence layer to support at least:

- multi-scale line/edge likelihood;
- orientation-aware continuity;
- texture/wash suppression;
- oriented gap continuation;
- explicit source-frame/crop policy;
- confidence over competing topology hypotheses.

After redesign, rerun the frozen training corpus, then freeze a **new never-before-evaluated blind final set** before any CLOSED claim.

See [Region Resolver V2 Real-Art Benchmark](../benchmarks/REGION_REAL_ART_BENCHMARK_2026-09-29.md).
