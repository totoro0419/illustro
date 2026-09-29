# Gate C Large Final Blind Protocol

> Status: **PROTOCOL FROZEN — LABELS/SEEDS NOT YET FROZEN**
> Date: 2026-09-29

## Why this replaces blind #1–#9

Blind sets #1–#9 were useful for discovering Region V3 failure modes, but repeated
10-query tune/retest cycles made them exposed development evidence. They remain
auditable regression data and MUST NOT be used as final closure evidence.

Gate C closure now uses one materially larger, stratified, never-before-evaluated
corpus after the classifier/evidence implementation is frozen.

## Development evidence

- existing training / exposed holdout corpus;
- blind #1 through blind #9;
- all synthetic/reference semantic and benchmark suites.

These may be used for algorithm development and regression only.

## Final corpus design

- 12 never-before-used Public Domain artworks;
- 24 total queries;
- exactly 8 `closed`, 8 `open`, 8 `ambiguous` expected labels;
- 3 visual strata, 4 artworks per stratum:
  - clean architectural/ornamental linework;
  - structured colored/wash drawings;
  - complex line/wash or dense overlapping construction.

Each artwork contributes exactly 2 queries. Pairing is fixed by stratum:

- clean-linework: `closed + open`;
- structured-wash: `closed + ambiguous`;
- complex-linewash: `ambiguous + open`.

This produces the balanced 8/8/8 label distribution without post-result balancing.

## Source-selection rules

- candidate artwork IDs are frozen before label/seed annotation;
- no candidate may appear in any previous Region corpus;
- sources must expose a usable Public Domain image through the Met Open Access API;
- a candidate may be replaced before annotation only for objective source failure
  (missing/unreadable image), never because of classifier behavior;
- the Region classifier/evidence pipeline MUST NOT run on final sources before
  labels and seeds are frozen.

## Annotation rules

Human annotation uses only the source artwork.

- `closed`: a visually continuous enclosing boundary defines one intended fill region;
- `open`: the intended region is visibly connected to the exterior / sheet boundary
  or deliberately crosses an unclosed contour;
- `ambiguous`: overlapping linework, wash, broken contours, or multiple plausible
  enclosures make a single automatic fill region unsafe.

Seeds are normalized `[x, y]` image coordinates and must be committed together with
the expected labels before algorithm execution.

## Predeclared Gate C acceptance criteria

All conditions are required simultaneously:

- total: **>= 21 / 24 (87.5%)**;
- closed: **>= 7 / 8 (87.5%)**;
- open: **>= 7 / 8 (87.5%)**;
- ambiguous: **>= 7 / 8 (87.5%)**;
- reference semantic tests: PASS;
- reference benchmarks: PASS;
- exposed development regression: PASS.

The 87.5% class floor is the integer realization of the predeclared >=80% per-class
target at n=8 while preventing a class from passing with two errors. The total floor
also exceeds the >=85% overall target.

## One-shot rule

After labels/seeds and classifier/evidence freeze SHAs are recorded:

1. run the final corpus exactly once;
2. do not alter thresholds, labels, seeds, or implementation based on that run;
3. PASS permits Gate C closure documentation;
4. FAIL keeps Gate C open and exposes this corpus permanently.

No sequence of replacement mini-blinds is permitted after this point.
