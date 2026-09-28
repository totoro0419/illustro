# Brush V2 target-device protocol

> Status: ready for user-device evidence collection
> Purpose: close the physical-pen evidence subgate of Brush Gate B
> Production effect: none

## Required manual sequence

Use the standalone file:

`Illustro_Brush_V2_Device_Validation.html`

1. Open it on the target tablet/PC in a current browser.
2. Use the actual stylus/pen.
3. Draw one **fast curved stroke** across most of the canvas.
4. Draw one **slow stroke** while varying pressure light → heavy → light.
5. Draw one **long continuous stroke** for several seconds.
6. Continue if needed until the page reports:
   - `strokes >= 3`
   - `pen samples >= 500`
   - `pressure range >= 0.150`
   - `実機プロトコル: COMPLETE`
7. Press **100k synthetic** once.
8. Press **JSONを保存**.
9. Return the generated `illustro-brush-device-*.json` file for analysis.

## Evidence collected

- trusted hardware PointerEvent sample count
- actual/coalesced/predicted sample counts
- pressure range and tilt presence
- reconstruction+dynamics+dab+Canvas preview submission timing
- receive-to-next-RAF scheduling proxy
- frame interval outliers
- semantic page/tail pending high-water
- bounded Pen Up release work
- 100k synthetic browser throughput
- optional Chromium heap telemetry when exposed

## Anti-false-positive rule

Only browser events with `Event.isTrusted === true` count toward the physical pen sample requirement.

Script-generated `PointerEvent` objects, including ones that claim `pointerType="pen"`, cannot satisfy the device gate.

## Brush Gate B acceptance

The JSON is evaluated against the semantic invariants already proven in the reference harness.

Required for the physical-device evidence subgate:

- manual protocol reports `penProtocolComplete: true`;
- accepted input is not silently dropped;
- release work remains bounded by the page/tail profile;
- pending pages remain bounded;
- no correctness failure or runaway queue is observed;
- timing data is recorded as measured evidence, not inferred from the Node reference benchmark.

`requestAnimationFrame` is a scheduling/presentation proxy and is **not** claimed to be physical scan-out latency.

One representative tablet can close the current tablet evidence subgate. It does not by itself constitute Desktop/Smartphone support certification.
