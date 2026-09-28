# Brush V2 Reference Benchmark — 2026-09-28

> Result: **REFERENCE ALGORITHM / SEMANTIC BENCHMARK PASS**
> Production Gate B: **CONDITIONAL — target-device Brush execution is not yet verified**
> Harness: `prototypes/v2-validation`

## 1. Verified result

The reference harness passed all Brush semantic regression tests, including deterministic replay, prediction isolation, Tile/Zoom invariance, long-stroke boundedness, source snapshot capture and renderer-loss reconstruction.

`npm test`: 23/23 total V2 validation tests PASS at the final local run; Brush-specific tests are a subset of that suite.

## 2. Reconstruction calibration

Candidates compared:

- raw
- fixed EMA
- One Euro filter parameter grid

Selected reference candidate:

```text
reconstruction = one-euro.v1
minCutoff = 4
beta = 4
dCutoff = 1
```

Synthetic calibration metrics:

| Metric | Selected | Raw baseline |
|---|---:|---:|
| Dynamic mean RMSE | 0.229181 px | 0.242334 px |
| Dynamic worst RMSE | 0.295586 px | 0.285884 px |
| Stationary RMSE | 0.156646 px | 0.302978 px |
| Worst endpoint error | 0.385747 px | 0.348414 px |

The selected profile reduced stationary synthetic jitter by **48.3%** relative to raw input while slightly increasing worst endpoint error. This is a useful default **candidate**, not a claim that the filter is perceptually optimal for all devices or artists.

The algorithm family is based on Casiez, Roussel & Vogel, *1€ Filter: A Simple Speed-based Low-pass Filter for Noisy Input in Interactive Systems*, CHI 2012, DOI 10.1145/2207676.2208639.

## 3. Determinism / semantic correctness

Verified:

- Philox4x32-10 zero-key/zero-counter known-answer vector: PASS
- accepted actual samples preserved: PASS
- predicted samples absent from canonical record: PASS
- serialized reopen/replay: 0 strict pixel mismatches
- normal Tile traversal: 0 mismatches vs global strict evaluator
- reversed Tile traversal: 0 mismatches
- Zoom normalization: canonical semantic record unchanged
- counter-based random evaluation order: invariant
- source / selection / mixing checkpoint survives reopen
- time-based stationary exposure: same semantic exposure sequence at 120 Hz and 240 Hz input event rates

Philox4x32-10 is retained because the Random123 family is counter-based and independent of thread/workgroup traversal order.

## 4. Preview tolerance

Strict UNORM16 reference result was compared against an F32-style Preview evaluator.

Measured worst case across the generated corpus:

```text
max absolute normalized coverage error = 0.000023780
max corpus RMSE                       = 0.000006486
```

Reference prototype tolerance adopted:

```text
1 / 4096 = 0.000244140625
```

Measured max error is roughly one order of magnitude below that threshold in this harness.

This tolerance is a **conformance test threshold for future backends**, not permission for Preview error to accumulate into Canonical state.

## 5. Long-stroke / streaming profile

100,000 accepted samples:

```text
accepted samples          = 100000
semantic page size        = 256 samples
mutable tail              = 16 samples
max pending pages         = 8
max pending observed      = 8
release work              = 160 samples
sealed pages              = 391
backpressure events       = 286
accepted-sample loss      = 0
```

A logical packed-sample estimate of 40 bytes/sample gives approximately **82,560 bytes** of sample-page + tail staging at the observed maximum. This is a sizing estimate, not the physical `.illustro` encoding.

The important semantic result is that Pen Up work remained bounded by the current page + tail, not by the 100,000-sample stroke length.

## 6. Materialization admission reference profile

Reference CPU strict replay sweep:

| Fragments | Dabs | p95 |
|---:|---:|---:|
| 4 | 64 | 0.330689 ms |
| 8 | 128 | 0.768289 ms |
| 12 | 192 | 1.234142 ms |
| 16 | 256 | 1.380583 ms |
| 24 | 384 | 2.377868 ms |
| 32 | 512 | 2.891222 ms |
| 48 | 768 | 4.603696 ms |

Using a **4 ms reference-environment p95 target** for this prototype only:

```text
materialization watermark = 24 fragments
hard admission limit      = 32 fragments
```

These numbers are deliberately not promoted to cross-device Product guarantees.

## 7. Reference hot-path timing

Environment:

- Node v22.16.0
- Linux x64
- AMD EPYC 9V74
- 5 logical CPUs visible to the container

For reconstruction + semantic dab generation in 32-sample batches, seven benchmark runs produced:

```text
median run p50 = 0.031517 ms
median run p95 = 0.069545 ms
median run p99 = 0.193892 ms
max observed   = 1.951495 ms
```

This measures only this reference CPU harness. It is **not physical input-to-display latency** and cannot be transferred to the Xiaomi tablet measurement by addition.

## 8. Gate B conclusion

### Passed now

- normalized/reference sample semantics
- prediction isolation
- selected reconstruction algorithm family and reference parameter candidate
- deterministic PRNG
- resource/source snapshot contract
- Preview/strict tolerance harness
- long-stroke boundedness
- reference materialization admission profile
- adversarial semantic corpus

### Still unverified

- full Brush Engine hot-path timing on a representative target tablet/phone/desktop
- physical/display latency
- thermal/memory behavior on target devices
- perceptual preference of the selected stabilizer parameters with real stylus input

Therefore **Gate B is not honestly CLOSED yet**. Its algorithmic/reference portion passes; the target-device execution subgate remains open.
