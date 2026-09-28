# Region Resolver V2 Reference Benchmark — 2026-09-28

> Result: **SYNTHETIC LABELED CORPUS PASS**
> Production Gate C: **CONDITIONAL — representative real-artwork calibration remains open**
> Harness: `prototypes/v2-validation`

## 1. Corpus result

Final reference policy passed:

```text
17 / 17 static labeled fixtures
 7 /  7 identity/topology transitions
24 / 24 total calibrated cases
0 false Ambiguous results on fixtures expected Current/Unresolved
```

Additional explicit checks:

- conflicting merge assignments → `Ambiguous`: PASS
- UserPinned boundary survives source evidence loss: PASS
- stale generation publish → `Retired`, never `Current`: PASS
- fixed-source result remains frozen after later source edit: PASS
- Brush reference module has no synchronous Region dependency: PASS

## 2. Selected synthetic-corpus policy

```text
evidenceThreshold       = 0.50
gapMax                 = 2 px
confidenceThreshold    = 0.65
retainIoU              = 0.80
identityMargin         = 0.20
ambiguousIoUFloor      = 0.30
lineageOverlapFraction = 0.18
candidateSearchPx      = 4 px
```

These are **synthetic-corpus calibration outputs**, not yet Production constants.

The corpus was intentionally designed so that weak/ambiguous evidence has an explicit expected state. The fact that one parameter set passes all synthetic labels establishes internal consistency, not real-artwork statistical validity.

## 3. Stable identity behavior

Verified transitions:

- one-to-one edit → old Region ID retained
- split → child IDs are new; old Region is lineage parent
- merge → merged ID is new; all old Regions are lineage parents
- delete/create → old ID not reused
- explicit topology-preserving affine lineage → ID retained
- partial erase/redraw → ID retained when match remains unambiguous
- insufficient one-to-one evidence → `Ambiguous`, no silent retain
- conflicting parent assignments on merge → `Ambiguous`, no silent winner

## 4. Incremental equivalence

Incremental divider edit:

```text
full domain cells     = 147456
affected old cells   = 6320
affected ratio       = 4.286%
changed boundary     = 79 cells
incremental signature == full recompute signature: PASS
```

The prototype uses the changed boundary and affected old connected component to bound the update scope. It intentionally does not count the expanded evidence scan rectangle as an affected topology component.

## 5. Reference performance

Reference environment is the same Linux/Node CPU harness as the Brush benchmark.

Mixed fixture set, five benchmark rounds:

```text
median p50 = 0.265720 ms
median p95 = 20.766091 ms
median p99 = 23.004808 ms
max        = 225.076956 ms
```

The p95 is dominated by the 512×512 large-sparse full recomputation fixture. A single 225 ms maximum outlier occurred during the mixed benchmark; because p95 remained ~20.8 ms and the dedicated large-sparse p95 was ~27.3 ms, the maximum is recorded as scheduler/runtime noise evidence rather than hidden or averaged away.

Large-sparse fixture:

```text
512 × 512 full reference resolve p95 = 27.345458 ms
estimated equivalent / 16384 cells  = 1.709091 ms
```

Initial background scheduler comparison point:

```text
recommended region chunk = 16384 cells
```

This is a **background-work chunk candidate** only. Region remains off the normal Brush synchronous path, and actual Production scheduling must remain cancellable/coalescible.

## 6. Gate C conclusion

### Passed now

- Resolver request/result semantics exercised
- fixed vs live foundation exercised through fixed-source freezing and transition reconciliation
- confidence / ambiguity behavior
- gap handling
- stable ID continuation
- split / merge lineage
- conflicting assignment ambiguity
- UserPinned override persistence
- stale generation rejection
- incremental/full equivalence
- bounded affected-component accounting
- required synthetic/adversarial classes represented

### Still unverified

The corpus is generated and labeled, but not representative real artwork. It does not establish threshold quality across:

- real pen/brush line texture
- scanned lineart
- textured paper
- compression artifacts
- artist-specific broken lines
- large complex production illustrations
- multiple real reference-layer conventions

Therefore the synthetic reference benchmark **passes**, but Production threshold freezing still requires a representative labeled real-artwork corpus. Gate C remains conditional rather than being falsely declared closed.
