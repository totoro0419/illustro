# Region Resolver V2 Real-Art Benchmark — 2026-09-29

> Result: **FAIL — CURRENT REAL-ART EVIDENCE/TOPOLOGY PROTOTYPE IS NOT PRODUCTION-READY**
> Production Gate C: **NOT CLOSED**
> Scope: actual public-domain/Open Access artwork corpus

## 1. Method

The corpus uses actual artwork rather than generated geometry.

Sources in `prototypes/v2-validation/real-art/manifest.js` include:

- architectural ink/wash drawings;
- dense ornament;
- figure drawing;
- modern public-domain wildlife line art;
- loose wash drawing;
- faint sketch;
- hatched line art;
- landscape wash.

Every seed query was labeled **before the first resolver execution** as:

- `closed`;
- `open`;
- `ambiguous`.

Numeric policy selection used the training split only.

After the first evaluation the original holdout was considered exposed and is therefore **development evidence, not a fresh final blind set**. No later result is promoted as an unbiased final holdout.

Predeclared pass requirements were:

- training >= 90%;
- holdout >= 80%;
- Ambiguous examples represented.

Expected labels were not changed after observing failures.

## 2. Iteration history

Four GitHub Actions real-art evaluations were run.

The first run exposed that the synthetic evidence extractor did not preserve thin/faint real boundaries. Subsequent changes were limited to the evidence/confidence algorithm while labels stayed frozen.

The final Train-driven candidate added:

- Sobel + local-contrast evidence;
- two-pixel evidence thickening after downsampling;
- source crop/frame suppression in the outer 5%;
- perturbation-based topology confidence;
- smaller local confidence neighborhood.

Further threshold chasing was stopped after the fourth run.

## 3. Final measured result

Authoritative evaluated run:

- workflow run: `36494680697`
- head: `9d97a469f027521f4d1f867fb902e4ec601b1aae`
- artifact: `gate-bc-validation-results`
- artifact digest: `sha256:36b918d8d1ffd10cd76c27948d57f864b0af087160ae2dcd5b12e066c2627676`

### Training

```text
PASS = 10 / 14 = 71.4%
Required >= 90%
RESULT = FAIL
```

Training failures:

- dense architectural top-right panel: expected Closed → Ambiguous;
- Venus medallion: expected Closed → Ambiguous/Open topology;
- Swainson hawk feather cell: expected Closed → Ambiguous/Open topology;
- loose Woman Reading head: expected Ambiguous → Closed.

### Development holdout

```text
PASS = 3 / 6 = 50.0%
Required >= 80%
RESULT = FAIL
```

Because this holdout had already been observed during development, it is reported diagnostically only.

## 4. What passed

The earlier synthetic Region semantic suite remains valid:

- 17/17 static synthetic fixtures;
- 7/7 identity/topology transitions;
- split/merge lineage rules;
- conflicting assignment ambiguity;
- UserPinned preservation;
- stale-generation rejection;
- fixed-source freezing;
- incremental result = full reference topology.

The failure is therefore narrower and more useful:

> the current **real-image Evidence → Boundary → Topology inference prototype** is insufficient for production-quality lineart/real-art inputs.

## 5. Root problem classification

The failure is **not** a missing-corpus problem anymore.

Actual artwork demonstrates unresolved algorithmic cases:

- weak/faint closed boundaries leak to exterior;
- dense ornament can become over-segmented or fully boundary-covered;
- local wash/hatching can produce false closure;
- one fixed raster evidence policy does not separate artwork boundary, texture, wash and source framing robustly enough.

This means further tuning of one global threshold is the wrong next step.

## 6. Required redesign before rerun

Gate C now requires an Evidence-layer redesign, not another threshold sweep.

The next prototype must separately model at least:

1. line/edge likelihood;
2. texture/wash suppression;
3. multi-scale continuity;
4. oriented gap continuation rather than only horizontal/vertical gap repair;
5. source-frame/crop policy;
6. confidence derived from competing topology hypotheses;
7. optional line-width/orientation evidence.

Only after that redesign should the frozen real-art training corpus be rerun.

A **new, never-before-evaluated final blind set** must then be frozen before any Gate C CLOSED claim.

## 7. Gate C decision

Synthetic semantic behavior: **PASS**.

Representative real-art behavior: **FAIL**.

Therefore:

> **Region / Fill Gate C = BLOCKED — EVIDENCE/TOPOLOGY ALGORITHM REDESIGN REQUIRED**

Production Region/Fill implementation remains prohibited.
