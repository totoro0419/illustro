# Gate B / C Final Re-evaluation — 2026-09-29

> Status: **EXECUTION PACKAGE COMPLETE — BRUSH TABLET PEN SUBGATE PASSED / REGION GATE C BLOCKED**
> Production: **LOCKED after Vertical Slice 001**

## 1. Requested work

The requested package was:

1. Brush target-device validation;
2. Region representative real-art corpus;
3. final Brush Gate B decision;
4. final Region Gate C decision.

All executable work available in this session was performed. A gate is not marked CLOSED unless its own evidence passes.

## 2. Brush Gate B

Completed:

- browser V2 Brush streaming harness;
- actual/coalesced/predicted Pointer Event instrumentation;
- pressure/tilt/pointer-type recording;
- One Euro + Philox browser execution;
- bounded page/tail/backpressure telemetry;
- 100,000-sample Chromium regression;
- physical-pen protocol and immutable JSON output.

Automated browser evidence:

```text
100000 accepted
0 observed sample loss
release work 160
max pending pages 8
browser batch p95 0.100 ms
```

Physical tablet evidence received:

```text
session duration        34.499 s
trusted pen samples     5727
accepted actual samples 5727
pressure range          0.660115
tilt                    observed
max pending pages       8
backpressure events     16
max release work        181
pipeline p95            1.000 ms
receive→next RAF p95    17.800 ms
frame intervals >25 ms  0
```

Decision:

> **Tablet physical-Pen subgate = PASS**

Unresolved:

- sustained multi-minute runtime/thermal behavior;
- explicit perceptual confirmation of the selected One Euro stabilizer;
- Desktop/Smartphone certification if those profiles are claimed.

Therefore:

> **Gate B = CONDITIONAL — TABLET PEN PASS / SUSTAINED+PERCEPTUAL EVIDENCE PENDING**

## 3. Region Gate C

Completed:

- actual-art source manifest with provenance;
- labels frozen before first execution;
- train/development-holdout separation;
- Chromium image decode and real-image evidence extraction;
- multiple Train-driven algorithm corrections without relabeling;
- final stop rule against threshold chasing.

Final measured result:

```text
Train: 10/14 = 71.4%  (required >= 90%) → FAIL
Development holdout: 3/6 = 50.0% (required >= 80%) → FAIL
```

Decision:

> **Gate C = BLOCKED — EVIDENCE/TOPOLOGY ALGORITHM REDESIGN REQUIRED**

A fresh blind final set was intentionally **not** consumed, because the training requirement itself failed.

## 4. Production decision

These results do not authorize Production.

- Gate A remains COMPLETE.
- Gate B remains CONDITIONAL, but the representative Tablet physical-Pen subgate is PASS.
- Gate C is BLOCKED.
- Gate D physical format remains PENDING.
- Gate E user UI decision remains PENDING.
- Gate F remains LOCKED.

No `packages/` Production implementation is part of this validation package.

## 5. Next technically valid action

Do **not** continue threshold tuning.

The next Region step is a V3 Evidence prototype with multi-scale oriented boundary inference and texture/wash separation.

The next Brush step is sustained/perceptual validation of the already-passing tablet profile; no additional short physical-Pen acquisition is required.

Those are independent: Region redesign can proceed without waiting for the physical Brush run.
