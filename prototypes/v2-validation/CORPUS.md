# V2 Validation Corpus

## Brush generated cases

The Brush harness generates deterministic actual-sample sequences with known underlying geometry and versioned noise seeds.

Cases:

- fast/normal straight line
- sinusoidal curve
- abrupt corner
- slow movement
- repeated micro movement
- stationary input
- pressure ramp
- tilt/azimuth variation
- long stream (1k / 10k / 100k samples)
- multi-Tile crossing
- Zoom-normalized replay
- predicted-tail replacement
- time-based stationary Airbrush exposure at 120 Hz vs 240 Hz input rates
- source/selection/mixing snapshot serialization
- Derived renderer discard/recreate
- serialized reopen/replay

The harness intentionally uses deterministic generated input so exact regressions are reproducible.

## Region static labeled fixtures

1. clean closed lineart
2. anti-aliased-strength lineart
3. colored-line evidence
4. varied line width
5. very small gap
6. intentional opening
7. near-touching regions
8. crossing / T-junction
9. competing false-bridge candidate — expected `Ambiguous`
10. nested loops / holes
11. tiny region
12. 512×512 large sparse canvas
13. vector-boundary evidence
14. multiple reference-layer composition
15. noisy/background evidence
16. user-pinned weak boundary
17. low-confidence weak boundary — expected `Unresolved`

## Region transition fixtures

1. one-to-one edit — retain ID
2. split — new child IDs with old lineage parent
3. merge — new merged ID with all old lineage parents
4. delete/create — no identity reuse
5. affine transform with explicit lineage — retain ID
6. partial erase/redraw — retain ID when match remains clear
7. ambiguous identity continuation — do not silently retain
8. conflicting merge assignments — `Ambiguous`, no silent winner

## Incremental fixture

A local divider edit inside one closed region is evaluated by both incremental and full recomputation. The canonical face signatures must match exactly, while the affected-old-component work estimate must remain materially below the full domain.

## Limitations

This corpus is adversarial and labeled, but synthetic. It deliberately does **not** claim to represent the statistical distribution of real artists' lineart, scanning artifacts, brushes, or device noise. Production Region threshold freezing therefore still requires a representative real-artwork corpus.
