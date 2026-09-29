# Gate C Third Large Final Blind Protocol

> Status: **READY FOR ONE-SHOT FINAL — CANDIDATES / LABELS / SEEDS / VISUAL FINGERPRINTS / V4 FROZEN**
> Date: 2026-09-30
> Candidate-source freeze: `81d5ef507a1e435da367ac6e1eb07e307e085b62`
> Source-preflight implementation: `0fcabb26a07edbfc35d2ab1549e32a8c480d6cd6`
> Source-preflight enabled: `c20c0f947eb2e8982c8bef778a1f0d0e6d2181a9`
> Label/seed/fingerprint freeze: `3a57ac0e76fef6fab05cdb2d87ea4d1eeed8d057`
> V4 classifier freeze: `972ed07173d300e355935ddcea3b92af5e1d1f8d`

## Purpose

This is the third large, stratified, never-before-classified Gate C closure corpus.

The following evidence is permanently exposed development data and cannot close Gate C:

- real-art training / exposed holdout;
- mini-blind sets 1–9;
- first large final corpus;
- second large final corpus.

The third candidate sources were selected and source-fingerprinted before V4 existed.
Only source-preflight code has consumed these images. No Region classifier has
consumed them before the label/seed freeze above.

## V4 development gate before final execution

The frozen V4 classifier was evaluated on all exposed data:

- total: **133 / 138**
- closed: **39 / 43**
- open: **61 / 61**
- ambiguous: **33 / 34**

Predeclared development floors:

- total: >= 125 / 138
- closed: >= 39 / 43
- open: >= 58 / 61
- ambiguous: >= 31 / 34

GitHub Actions evidence:

- workflow: Gate B/C Final Validation
- run: `36590672861`
- job: `109482624381`
- result: SUCCESS
- reference semantic tests: SUCCESS
- reference benchmarks: SUCCESS
- browser / real-art validation: SUCCESS

V4 preserves V3's proven Open/Ambiguous safeguards and adds one calibrated,
general enclosure rescue: an interior classified Open by V3 may become Closed only
when it is away from the frame, locally quiet, and all 32 angular sectors contain
strong enclosing boundary evidence. On the 138-query exposed corpus the rescue fired
exactly four times, all four on expected Closed cases, with zero Open/Ambiguous
collisions.

## Final corpus

- 12 previously unused Public Domain artworks.
- 24 total queries.
- Exactly 8 `closed`, 8 `open`, 8 `ambiguous`.
- Four clean-linework artworks: one Closed + one Open each.
- Four structured-wash artworks: one Closed + one Ambiguous each.
- Four complex-linewash artworks: one Ambiguous + one Open each.
- Source identity is frozen by decoded width / height + Chromium 64-bit dHash.

## Acceptance criteria

All conditions must pass simultaneously:

- overall: **>= 21 / 24**;
- closed: **>= 7 / 8**;
- open: **>= 7 / 8**;
- ambiguous: **>= 7 / 8**;
- reference semantic tests: PASS;
- reference benchmarks: PASS;
- 138-query exposed V4 development regression: PASS.

## One-shot integrity

After the freezes above:

1. V4 code, V3 dependency, evidence code, thresholds, labels, seeds, fingerprints and criteria are immutable for this run.
2. The final evaluator is added only after all freezes.
3. The first execution reaching `classifyV4` on these 24 queries is the closure result.
4. PASS permits Gate C closure documentation.
5. FAIL permanently exposes this corpus and Gate C remains open.
6. No mini-blind replacement loop is permitted.


## One-shot result — exposed

The first algorithmic execution reached V4 classification and produced:

- overall: **15 / 24**
- closed: **4 / 8**
- open: **8 / 8**
- ambiguous: **3 / 8**
- clean-linework: **5 / 8**
- structured-wash: **5 / 8**
- complex-linewash: **5 / 8**

This is a **FAIL** under the frozen criteria. This corpus is permanently exposed
development evidence and MUST NOT be reused for Gate C closure.

GitHub Actions evidence:

- run: `36591899535`
- job: `109486850767`
- reference semantic tests: PASS
- reference benchmarks: PASS
- browser / real-art final assertion: FAIL
