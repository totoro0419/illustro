# Brush V2 Device Validation — 2026-09-29

> Result: **BROWSER RUNTIME PASS / PHYSICAL PEN DEVICE EVIDENCE PENDING**
> Production Gate B: **NOT CLOSED**
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

## 4. Gate B decision

The reference algorithmic gate and browser-runtime subgate pass.

**Gate B cannot be CLOSED from this session** because no tool available here can generate genuine physical Xiaomi-pen Pointer Events or measure that device's sustained runtime behavior.

Existing Xiaomi tablet input→RAF evidence predates this full V2 Brush pipeline and is not substituted for the required V2 device record.

Therefore:

> **Brush Gate B = CONDITIONAL / PHYSICAL PEN DEVICE RECORD PENDING**

No Production Brush implementation is authorized by this result.
