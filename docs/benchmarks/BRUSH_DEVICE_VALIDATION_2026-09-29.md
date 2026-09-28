# Brush V2 Device Validation — 2026-09-29

> Result: **BROWSER RUNTIME PASS / REPRESENTATIVE TABLET PHYSICAL-PEN PASS / SUSTAINED+PERCEPTUAL EVIDENCE PENDING**
> Production Gate B: **CONDITIONAL — TABLET PHYSICAL-PEN SUBGATE PASSED**
> Scope: non-Production V2 Brush target-device harness

## 1. What was implemented

`prototypes/v2-validation/device` now contains a browser-executable V2 Brush validation path with:

- actual/coalesced Pointer Event intake;
- predicted-event accounting that remains Preview-only;
- receive-time Canvas coordinate capture;
- pressure, tilt and pointer-type capture;
- incremental One Euro reconstruction using the selected reference candidate;
- Philox4x32-10 indexed random semantics;
- deterministic dab generation;
- bounded semantic page / mutable-tail accounting;
- Canvas2D preview submission;
- receive→pipeline and receive→next-RAF timing;
- frame-interval outlier collection;
- optional browser heap telemetry;
- a manual device protocol that **cannot** report complete without real `pointerType=pen` evidence.

This is a validation UI only. It does not establish Illustro Product UI.

## 2. Automated browser result

GitHub Actions run:

- workflow: `Gate B/C Final Validation`
- run: `36494680697`
- head: `9d97a469f027521f4d1f867fb902e4ec601b1aae`
- Reference semantic tests: **SUCCESS**
- Reference benchmarks: **SUCCESS**
- Chromium installation: **SUCCESS**
- Browser synthetic Brush execution produced an evidence artifact before the Region assertion failed.

100,000-sample Chromium result:

```text
accepted actual samples = 100000
generated dabs          = 1287
release work            = 160 samples
sealed pages            = 391
max pending observed    = 8
backpressure events     = 286
batch size              = 32
batch p95               = 0.100 ms
batch p99               = 0.100 ms
max batch               = 5.100 ms
```

This confirms the committed browser pipeline preserves the bounded page/tail contract under the synthetic workload.

The CI timing values are **not physical pen-to-display latency** and are not portable to target devices.

## 3. Manual target-device gate

The manual protocol requires the actual pen/stylus and refuses completion unless all are observed:

- at least 3 strokes;
- at least 500 `pointerType=pen` samples;
- pressure range >= 0.15.

Required sequence:

1. fast curved stroke;
2. slow stroke with light→heavy→light pressure;
3. multi-second long continuous stroke;
4. run the 100k synthetic check;
5. preserve the emitted JSON unchanged.

The JSON also records coalesced/predicted counts, tilt presence, page high-water, release work, scheduling proxies and available heap telemetry.

## 4. Physical tablet result

A genuine target-device Pen record was supplied from the standalone V2 device harness.

Measured record:

```text
session duration             = 34.499 s
strokes                      = 3
trusted pen samples          = 5727
accepted actual samples      = 5727
coalesced samples            = 1043
predicted samples            = 24450
pressure range               = 0.660115
tilt observed                = yes
generated dabs               = 7412
sealed semantic pages        = 24
max pending pages            = 8
backpressure events          = 16
max Pen-Up release work      = 181 samples

pipeline p50                 = 0.700 ms
pipeline p95                 = 1.000 ms
pipeline p99                 = 1.400 ms
pipeline max                 = 11.200 ms
receive→next RAF p50         = 9.900 ms
receive→next RAF p95         = 17.800 ms
receive→next RAF p99         = 21.700 ms
frame interval p95           = 16.700 ms
frame intervals >25 ms       = 0
```

Interpretation:

- the manual protocol completed with genuine physical Pen evidence;
- all 5,727 trusted Pen samples entered the accepted-sample path;
- the queue stayed bounded at the configured 8-page limit;
- 16 backpressure events occurred, but no runaway queue or accepted-sample loss was observed;
- Pen-Up work remained bounded at 181 samples, below the page+tail bound of 272;
- receive→RAF is a scheduling proxy, not physical scan-out latency;
- the reported browser heap values are coarse browser telemetry and are not treated as precise thermal/memory certification.

This closes the **representative Tablet physical-Pen evidence subgate**.

## 5. Gate B decision

Passed:

- semantic/reference gate;
- browser-runtime boundedness gate;
- representative Tablet physical-Pen execution gate.

Still open:

- sustained multi-minute runtime/thermal behavior on the target tablet;
- explicit perceptual confirmation that the selected stabilizer profile has no unacceptable lag/oversmoothing;
- Desktop/Smartphone device certification if those profiles are claimed.

Therefore:

> **Brush Gate B = CONDITIONAL — TABLET PHYSICAL-PEN SUBGATE PASSED; SUSTAINED/PERCEPTUAL EVIDENCE PENDING**

No Production Brush implementation is authorized by this result.
