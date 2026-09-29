# Gate C Second Large Final Blind Protocol

> Status: **READY FOR ONE-SHOT FINAL — CANDIDATES / LABELS / SEEDS / VISUAL FINGERPRINTS FROZEN**
> Date: 2026-09-29
> Candidate-source freeze: `c78f9a8c53957d451fd17f205c989b8a064541d9`
> Label/seed/fingerprint freeze: `54d6a89189cf874f6f97163d4367c622a200a92d`
> Classifier/evidence freeze: `0978b358cc0b0fe892d3f3c16254e73182a9069b`

## Purpose

This is the second large, stratified, never-before-evaluated Gate C closure corpus.
The first large corpus is permanently exposed development evidence after its failed
algorithmic run and is not eligible for closure evidence.

## Corpus design

- 12 previously unused Public Domain artworks.
- 24 total queries.
- Exactly 8 `closed`, 8 `open`, 8 `ambiguous`.
- Visual strata:
  - clean-linework: 4 artworks;
  - structured-wash: 4 artworks;
  - complex-linewash: 4 artworks.
- Source identity is frozen by decoded width/height + Chromium 64-bit dHash.
- Annotation was performed from the source-preflight artifact only.
- Region classifier/evidence was not executed on these sources before label/seed freeze.

## Acceptance criteria

All conditions must pass simultaneously:

- overall: **>= 21 / 24**;
- closed: **>= 7 / 8**;
- open: **>= 7 / 8**;
- ambiguous: **>= 7 / 8**;
- reference semantic tests: PASS;
- reference benchmark: PASS;
- exposed 90-query development regression: PASS;
- exposed first-large 24-query regression: PASS.

## One-shot integrity

After the freezes above:

1. classifier/evidence code, thresholds, labels, seeds, source identities and criteria are immutable for this run;
2. the final evaluator may be added only after those freezes;
3. the first algorithmic execution reaching classification is the closure result;
4. PASS permits Gate C closure documentation;
5. FAIL permanently exposes this corpus and Gate C remains open.

Infrastructure-only failures occurring before classifier execution do not expose the
labels to classifier output, but any correction must preserve all freezes above.
