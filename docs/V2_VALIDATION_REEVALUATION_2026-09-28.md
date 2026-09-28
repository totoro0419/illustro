# V2 Brush / Region Validation Re-evaluation — 2026-09-28

> Status: **VALIDATION PACKAGE COMPLETE**
> Production: **LOCKED after Vertical Slice 001**

## 1. Requested 1–8 completion

| # | Requested output | Status |
|---:|---|---|
| 1 | Brush Benchmark Harness | **COMPLETE** |
| 2 | Brush benchmark report | **COMPLETE** |
| 3 | Region Resolver prototype | **COMPLETE** |
| 4 | Region labeled/adversarial corpus | **COMPLETE** |
| 5 | Region benchmark report | **COMPLETE** |
| 6 | Reflect measured results into V2 specs | **COMPLETE** |
| 7 | Re-evaluate Brush Gate B | **COMPLETE — CONDITIONAL** |
| 8 | Re-evaluate Region Gate C | **COMPLETE — CONDITIONAL** |

“Complete” here means the requested work was executed and evaluated. It does **not** convert missing evidence into a false PASS.

## 2. Independent executable verification

Final local validation before repository publication:

```text
node --test src/*.test.js
23 tests
23 PASS
0 FAIL
```

The benchmark runner was executed separately and emitted `results/benchmark-2026-09-28.json`.

## 3. Brush conclusion

Reference algorithm/semantic benchmark: **PASS**.

Selected candidate:

```text
One Euro filter
minCutoff=4, beta=4, dCutoff=1
```

Key evidence:

- strict replay mismatches: 0
- Tile traversal mismatches: 0
- reverse Tile traversal mismatches: 0
- PRNG order invariance: PASS
- Preview max error: 0.000023780 < 1/4096
- 100,000 accepted samples, sample loss: 0
- Pen Up/release work: 160 samples, not proportional to full stroke length
- max pending semantic pages: 8
- reference materialization profile: watermark 24 / hard 32 fragments

**Gate B result: CONDITIONAL.**

Reason: target-device full Brush execution has not been measured. Existing Xiaomi input→RAF evidence predates this Brush pipeline and cannot be combined numerically with the reference Node benchmark.

## 4. Region conclusion

Synthetic labeled/adversarial benchmark: **PASS**.

Key evidence:

- 24/24 calibrated labeled cases pass
- false Ambiguous on non-Ambiguous labels: 0
- conflicting merge assignment is Ambiguous
- stale generation cannot publish Current
- incremental result equals full reference topology
- incremental affected scope in fixture: 4.286% of full domain

**Gate C result: CONDITIONAL.**

Reason: the labels are synthetic. Production confidence/gap/identity thresholds cannot be claimed statistically valid for real illustration lineart until representative real-artwork fixtures are labeled and run through the same harness.

## 5. Values allowed into V2 now

The following can be recorded as **reference profile candidates / conformance thresholds**:

### Brush

- `reconstruct.one-euro.v1` candidate profile: 4 / 4 / 1
- semantic page: 256 samples
- mutable tail: 16 samples
- pending-page reference cap: 8
- Preview strict conformance tolerance: 1/4096 normalized coverage
- materialization reference watermark/hard comparison: 24 / 32 fragments

### Region

- synthetic reference policy: evidence .50 / gap 2 / confidence .65 / retain IoU .80 / margin .20 / candidate 4 px
- incremental evidence influence pad: `gapMax + 2`
- background chunk comparison point: 16,384 cells

None of these values is a cross-device/perceptual Product guarantee.

## 6. What remains before the two Production gates can become CLOSED

### Gate B

Run the actual Brush prototype hot path on representative target hardware and collect:

- full normalized input → reconstruction → dabs → preview submission timing
- sustained long-stroke memory/high-water
- thermal behavior
- user-perceived stabilizer response
- at least representative Tablet and Desktop; Smartphone before Smartphone support claim

### Gate C

Add a representative labeled real-artwork corpus and rerun the existing calibration harness without changing expected labels after seeing results.

Required examples should include actual Illustro-target lineart styles, broken lines, texture/noise, scanned/photographed references where relevant, and large multi-region illustrations.

## 7. Production state

This validation does not authorize Vertical Slice 002.

> **Production remains locked until the user explicitly authorizes a concrete scope.**
