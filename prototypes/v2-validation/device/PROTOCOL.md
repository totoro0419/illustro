# Brush V2 target-device protocol

This is a non-Production measurement page. It does not decide product UI.

## Required manual sequence on each target device

1. Use the actual stylus/pen when the device supports one.
2. Draw one fast curved stroke across most of the canvas.
3. Draw one slow stroke while varying pressure from light to heavy and back.
4. Draw one long continuous scribble/curve for at least several seconds.
5. Continue until the page reports at least 3 strokes, 500 pen samples, and pressure range >= 0.15.
6. Run `100k synthetic` once.
7. Copy the JSON result without editing it.

## Evidence collected

- actual/coalesced/predicted sample counts
- pointer type
- pressure range and tilt presence
- incremental reconstruction+dynamics/dab+Canvas preview submission time
- receive-to-next-RAF scheduling proxy
- frame interval outliers
- semantic page/tail pending high-water
- bounded Pen Up release work
- optional Chromium heap telemetry when exposed

## Gate rule

Automated browser CI proves the committed browser pipeline executes and remains bounded in a real browser runtime. It does **not** substitute for stylus hardware evidence.

Gate B can close only after representative target-device JSON shows the manual protocol complete and no correctness/boundedness failure. Physical scan-out latency remains outside what `requestAnimationFrame` can directly prove.
