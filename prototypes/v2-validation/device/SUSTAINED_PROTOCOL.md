# Brush V2 Sustained / Thermal-Proxy Protocol

> Status: ready for target-device evidence collection
> Purpose: close the remaining sustained-runtime subgate of Brush Gate B
> Production effect: none

## Why this is not a fixed 10-minute test

A fixed 8–10 minute duration was not previously justified by evidence.

Thermal behavior is time-dependent, so the test cannot be compressed to zero wall-clock time. However, the validation target is observable sustained degradation, not elapsed time itself.

The harness therefore uses an adaptive profile:

- **minimum active wall-clock:** 3 minutes;
- **maximum active wall-clock:** 6 minutes;
- **bucket size:** 30 seconds;
- **baseline:** first 60 seconds at 240 accepted synthetic samples/second;
- **stress:** after baseline, consume about 50% of the measured frame interval for the same Brush pipeline, capped at 8 ms/frame;
- **early completion:** after at least four stress buckets, only when the screening stability check remains within its data-adaptive noise band;
- **hard stop:** 6 minutes if stability is not established earlier.

The stability screen is only a stop heuristic. It does **not** declare Gate B PASS.

## User sequence

1. Open `Illustro_Brush_V2_Sustained_Validation.html`.
2. Press **自動負荷を開始**.
3. Keep the page foregrounded. No Pen movement is required during the automatic phase.
4. When the page changes to **最終Penチェック**, draw normally with the physical Pen until 500 trusted Pen samples are collected. This usually requires only a short drawing interval.
5. Select the observed device warmth:
   - 特に気にならない
   - 少し温かいが問題ない
   - 明確に熱い / 不快
6. Press **JSONをコピー** and return the JSON unchanged.

## Evidence

Automatic phase records every 30 seconds:

- accepted/generated samples;
- stress throughput;
- per-frame Brush work p50/p95/p99;
- frame interval p50/p95;
- >25 ms frame count;
- max pending pages;
- backpressure events;
- available heap telemetry.

It additionally records:

- page visibility interruptions;
- Screen Wake Lock state when available;
- early-stop reason;
- post-stress trusted physical-Pen sample count;
- post-stress pipeline p50/p95/p99;
- post-stress receive→next-RAF p50/p95/p99;
- pressure range / tilt;
- user warmth observation.

## Validity rules

The returned record is eligible for review only when:

- minimum active elapsed time is reached;
- page remained continuously visible;
- accepted automatic samples cover all generated automatic samples;
- max pending pages remains <= 8;
- post-stress physical Pen reaches 500 trusted samples;
- `ciMode` is false.

Screen Wake Lock is advisory and may be unavailable. If the page becomes hidden, the run remains recorded but is not considered a clean sustained run.

The browser exposes no general device-temperature telemetry here. Therefore this is a **thermal proxy** based on sustained throughput/frame behavior plus the user's coarse warmth observation, not a direct temperature measurement.

## Final interpretation

This protocol may close the representative-tablet sustained-runtime subgate if the returned evidence shows no material degradation or boundedness/correctness failure relative to the already-recorded pre-stress physical-Pen run.

Desktop and Smartphone remain separate device-profile certifications.
