import {
  BrushEngine,
  PRESETS,
  validatePreset,
  deserialize,
  serialize,
  StrokeRaster,
  RasterQueue,
  C,
  STRIDE,
} from "../../../packages/brush/src/index";
import type {
  Preset,
  Sample,
  StrokeRecord,
  Curve,
} from "../../../packages/brush/src/types";
import { fixture } from "../../../packages/brush/test/fixtures";
const $ = <T extends HTMLElement>(id: string) =>
  document.getElementById(id) as T;
const canvas = $<HTMLCanvasElement>("canvas"),
  ctx = canvas.getContext("2d")!,
  overlay = $<HTMLCanvasElement>("overlay"),
  ov = overlay.getContext("2d")!;
const width = canvas.width,
  height = canvas.height;
const sensors = { tilt: false, azimuth: false, twist: false };
let base: Uint8ClampedArray = new Uint8ClampedArray(width * height * 4),
  custom: Preset | undefined,
  lastRecord: StrokeRecord | undefined,
  lastRaw: Sample[] = [],
  active: ReturnType<typeof start> | undefined,
  busy = false,
  pointer: number | undefined,
  seed = 100,
  penActive = false,
  sustained = false;
const history: Array<{
    before: Uint8ClampedArray;
    after: Uint8ClampedArray;
    record: StrokeRecord | undefined;
    raw: Sample[];
  }> = [],
  redo: typeof history = [];
const inputTimes: number[] = [],
  renderTimes: number[] = [],
  releaseTimes: number[] = [],
  frames: number[] = [],
  receivedToFrame: number[] = [],
  errors: string[] = [];
let acceptedInputs = 0,
  completedStrokes = 0,
  trustedPenSamples = 0,
  generatedPenSamples = 0;
let lastFrame = performance.now(),
  lastInputReceivedAt = 0,
  lastReceive: number | undefined,
  lastSensor: Sample | undefined,
  maxRasterBytes = 0,
  trustedPen = 0,
  syntheticPen = 0;
function bounded(list: number[], value: number) {
  list.push(value);
  if (list.length > 4096) list.shift();
}
function status(text: string, error = false) {
  $("status").textContent = text;
  if (error) errors.push(text);
}
function fail(e: unknown) {
  status(e instanceof Error ? e.message : String(e), true);
  if (active) active.engine.cancel();
  active = undefined;
  busy = false;
  pointer = undefined;
  penActive = false;
  paint(base);
  controls();
}
function populate() {
  const search = $<HTMLInputElement>("search").value.toLowerCase(),
    select = $<HTMLSelectElement>("brush"),
    old = select.value;
  select.replaceChildren();
  for (const p of PRESETS.filter((p) =>
    (p.name + p.category + p.purpose).toLowerCase().includes(search),
  )) {
    const option = document.createElement("option");
    option.value = p.id;
    option.textContent = p.category + " · " + p.name;
    select.append(option);
  }
  if ([...select.options].some((o) => o.value === old)) select.value = old;
  select.disabled = select.options.length === 0;
  const mobile = $<HTMLSelectElement>("mobileBrush");
  mobile.replaceChildren(...[...select.options].map((o) => o.cloneNode(true)));
  mobile.value = select.value;
  if (!select.options.length)
    status("該当するペンがありません。検索を短くしてください。");
}
function addRange(
  parent: string,
  id: string,
  label: string,
  min: number,
  max: number,
  step: number,
) {
  const div = document.createElement("div");
  div.innerHTML = `<label for="${id}">${label}</label><div class="pair"><input id="${id}Range" type="range" min="${min}" max="${max}" step="${step}" aria-label="${label}"><input id="${id}" type="number" min="${min}" max="${max}" step="${step}"></div>`;
  $(parent).append(div);
  const range = $<HTMLInputElement>(id + "Range"),
    number = $<HTMLInputElement>(id);
  range.addEventListener("input", () => (number.value = range.value));
  number.addEventListener("change", () => {
    const n = Number(number.value);
    if (!Number.isFinite(n) || n < min || n > max) {
      number.value = range.value;
      status(label + "は" + min + "〜" + max + "で指定してください。");
    } else range.value = number.value;
  });
}
for (const r of [
  ["size", "太さ", 0.1, 512, 0.1],
  ["opacity", "濃さ", 0, 1, 0.01],
  ["flow", "重なりの強さ", 0, 1, 0.01],
  ["stabilization", "手ブレ補正（0＝なし）", 0, 1, 0.01],
] as const)
  addRange("numeric", r[0], r[1], r[2], r[3], r[4]);
for (const r of [
  ["hardness", "縁のくっきりさ", 0, 1, 0.01],
  ["spacing", "点を置く間隔", 0.01, 4, 0.01],
  ["aspect", "筆先の平たさ", 0.01, 1, 0.01],
  ["grain", "質感の強さ", 0, 1, 0.01],
  ["grainScale", "質感の大きさ", 0.1, 30, 0.1],
  ["scatter", "点の散らばり", 0, 4, 0.01],
  ["taperStart", "描き始めを細くする距離", 0, 128, 1],
  ["taperEnd", "描き終わりを細くする距離", 0, 128, 1],
] as const)
  addRange("advanced", r[0], r[1], r[2], r[3], r[4]);
function load(p: Preset) {
  custom = undefined;
  for (const id of [
    "size",
    "opacity",
    "flow",
    "stabilization",
    "hardness",
    "spacing",
    "aspect",
    "grain",
    "grainScale",
    "scatter",
    "taperStart",
    "taperEnd",
  ] as const) {
    $<HTMLInputElement>(id).value = String(p[id]);
    $<HTMLInputElement>(id + "Range").value = String(p[id]);
  }
  $<HTMLSelectElement>("tip").value = p.tip;
  $<HTMLSelectElement>("blend").value = p.blend;
  $<HTMLSelectElement>("grainKind").value = p.grainKind;
  $<HTMLInputElement>("color").value =
    "#" +
    p.color
      .map((c) =>
        Math.round(c * 255)
          .toString(16)
          .padStart(2, "0"),
      )
      .join("");
  $<HTMLSelectElement>("mobileBrush").value = p.id;
  $<HTMLInputElement>("mobileSize").value = String(p.size);
  $<HTMLInputElement>("mobileStabilization").value = String(p.stabilization);
  $("purpose").textContent = p.purpose;
}
function preset(): Preset {
  const selected =
    custom ?? PRESETS.find((p) => p.id === $<HTMLSelectElement>("brush").value);
  if (!selected) throw new Error("ペンを選んでください。");
  const p = structuredClone(selected) as Preset;
  const o = { ...p };
  for (const id of [
    "size",
    "opacity",
    "flow",
    "stabilization",
    "hardness",
    "spacing",
    "aspect",
    "grain",
    "grainScale",
    "scatter",
    "taperStart",
    "taperEnd",
  ] as const)
    o[id] = Number($<HTMLInputElement>(id).value);
  o.tip = $<HTMLSelectElement>("tip").value as Preset["tip"];
  o.blend = $<HTMLSelectElement>("blend").value as Preset["blend"];
  o.grainKind = $<HTMLSelectElement>("grainKind").value as Preset["grainKind"];
  const hex = $<HTMLInputElement>("color").value;
  o.color = [
    parseInt(hex.slice(1, 3), 16) / 255,
    parseInt(hex.slice(3, 5), 16) / 255,
    parseInt(hex.slice(5, 7), 16) / 255,
  ];
  const c = $<HTMLSelectElement>("curve").value;
  const curve: Curve =
    c === "soft"
      ? [
          [0, 0],
          [0.25, 0.55],
          [0.6, 0.85],
          [1, 1],
        ]
      : c === "hard"
        ? [
            [0, 0],
            [0.4, 0.1],
            [0.8, 0.6],
            [1, 1],
          ]
        : [
            [0, 0],
            [1, 1],
          ];
  if (c !== "linear")
    o.mappings = o.mappings.map((m) =>
      m.source === "pressure" ? { ...m, curve } : m,
    );
  validatePreset(o);
  return o;
}
function paint(image: Uint8ClampedArray) {
  ctx.putImageData(
    new ImageData(image as Uint8ClampedArray<ArrayBuffer>, width, height),
    0,
    0,
  );
}
function controls() {
  for (const id of [
    "brush",
    "search",
    "undo",
    "redo",
    "reset",
    "test",
    "compare",
    "apply",
    "replay",
    "file",
    "sustain",
  ])
    ($(id) as HTMLButtonElement).disabled = busy || !!active || sustained;
  ($("undo") as HTMLButtonElement).disabled =
    busy || !!active || sustained || history.length === 0;
  ($("redo") as HTMLButtonElement).disabled =
    busy || !!active || sustained || redo.length === 0;
  for (const el of document.querySelectorAll<
    HTMLInputElement | HTMLSelectElement
  >(
    "aside input, aside select, .mobile-settings input, .mobile-settings select",
  ))
    el.disabled = busy || !!active || sustained;
}
function start(p: Preset) {
  const raster = new StrokeRaster(width, height),
    queue = new RasterQueue(raster, p);
  const engine = new BrushEngine(p, {
    seed: [seed++, 0xabcdef01],
    sink: (page) => queue.enqueue(page),
  });
  return {
    engine,
    raster,
    queue,
    preset: p,
    raw: [] as Sample[],
    ending: false,
    dirty: true,
    preview: undefined as
      { raster: StrokeRaster; queue: RasterQueue } | undefined,
  };
}
function receive(sample: Sample, trusted = false) {
  if (!active) return;
  const time = performance.now();
  active.engine.accept(sample);
  acceptedInputs++;
  if (sample.pointerType === "pen")
    trusted ? trustedPenSamples++ : generatedPenSamples++;
  bounded(inputTimes, performance.now() - time);
  active.raw.push(sample);
  active.dirty = true;
  lastReceive = time;
  lastInputReceivedAt = time;
  lastSensor = sample;
}
function begin(p: Preset) {
  if (active || busy) throw new Error("線の処理中です。");
  active = start(p);
  controls();
}
function end() {
  if (!active) return;
  const time = performance.now();
  active.engine.finish();
  bounded(releaseTimes, performance.now() - time);
  active.ending = true;
  active.preview = undefined;
  pointer = undefined;
  penActive = false;
  controls();
}
function recordBytes(r: StrokeRecord | undefined) {
  return r
    ? r.geometry.length * 100 + r.commands.reduce((n, p) => n + p.length * 8, 0)
    : 0;
}
function push(after: Uint8ClampedArray, record: StrokeRecord | undefined) {
  if (after.byteLength + recordBytes(record) > 128 * 1048576)
    throw new Error("保持容量を超える線です。設定を小さくしてください。");
  history.push({ before: base, after, record, raw: record ? lastRaw : [] });
  base = after;
  redo.length = 0;
  while (
    history.length > 40 ||
    history.reduce(
      (n, h) => n + h.after.byteLength + recordBytes(h.record),
      0,
    ) >
      128 * 1048576
  )
    history.shift();
}
function overlays() {
  ov.clearRect(0, 0, width, height);
  const raw = active?.raw ?? lastRaw,
    geometry = $<HTMLInputElement>("processed").checked
      ? (active?.engine.diagnosticPoints() ?? lastRecord?.geometry ?? [])
      : [];
  for (const [show, points, color] of [
    [$<HTMLInputElement>("raw").checked, raw, "#16728c"],
    [$<HTMLInputElement>("processed").checked, geometry, "#a85a08"],
  ] as const) {
    if (!show) continue;
    ov.fillStyle = color;
    for (const point of points.slice(-5000)) {
      ov.beginPath();
      ov.arc(point.x, point.y, 1.4, 0, Math.PI * 2);
      ov.fill();
    }
  }
}
function graphs(record: StrokeRecord) {
  for (const [id, value, color] of [
    ["pressureGraph", (i: number) => record.geometry[i]!.p, "#a85a08"],
    [
      "velocityGraph",
      (i: number) => {
        const a = record.geometry[Math.max(0, i - 1)]!,
          b = record.geometry[i]!;
        return Math.min(
          1,
          Math.hypot(b.x - a.x, b.y - a.y) /
            Math.max(0.001, (b.t - a.t) / 1000) /
            1500,
        );
      },
      "#16728c",
    ],
  ] as const) {
    const c = $<HTMLCanvasElement>(id),
      g = c.getContext("2d")!;
    g.clearRect(0, 0, c.width, c.height);
    g.strokeStyle = color;
    g.beginPath();
    for (let i = 0; i < record.geometry.length; i++) {
      const x = (i / Math.max(1, record.geometry.length - 1)) * c.width,
        y = (1 - value(i)) * 90 + 5;
      i ? g.lineTo(x, y) : g.moveTo(x, y);
    }
    g.stroke();
  }
}
const pct = (v: number[], p = 0.95) => {
  const a = [...v].sort((a, b) => a - b);
  return a[Math.floor((a.length - 1) * p)] ?? 0;
};
function frame(time: number) {
  bounded(frames, time - lastFrame);
  lastFrame = time;
  try {
    if (active) {
      const a = active;
      if (a.preset.exposureMs && !a.ending && lastSensor)
        a.engine.expose(lastSensor.t + Math.max(0, time - lastInputReceivedAt));
      const started = performance.now();
      a.queue.run(16000, 3);
      maxRasterBytes = Math.max(maxRasterBytes, a.raster.allocatedBytes);
      if (a.ending && !a.queue.remaining) {
        completedStrokes++;
        lastRecord = a.engine.record();
        lastRaw = a.raw;
        const image = a.raster.composite(base, a.preset);
        push(image, lastRecord);
        paint(base);
        graphs(lastRecord);
        active = undefined;
        status("線を確定しました。");
        controls();
      } else if (!a.queue.remaining) {
        if (a.dirty) {
          const preview = a.raster.clone(),
            q = new RasterQueue(preview, a.preset);
          q.enqueue(a.engine.pendingPrefix());
          q.enqueue(a.engine.preview());
          a.preview = { raster: preview, queue: q };
          a.dirty = false;
        }
        if (a.preview) {
          a.preview.queue.run(16000, 3);
          paint(a.preview.raster.composite(base, a.preset));
        }
      } else paint(a.raster.composite(base, a.preset));
      bounded(renderTimes, performance.now() - started);
      if (lastReceive !== undefined) {
        bounded(receivedToFrame, time - lastReceive);
        lastReceive = undefined;
      }
    }
    overlays();
    if (
      Math.floor(time / 500) !== Math.floor((time - (frames.at(-1) ?? 0)) / 500)
    ) {
      $("fps").textContent =
        "画面更新 " +
        Math.round(1000 / Math.max(1, pct(frames, 0.5))) +
        "回/秒";
      $("inputMetric").textContent =
        "入力処理 95% " + pct(inputTimes).toFixed(2) + "ms";
      $("renderMetric").textContent =
        "描画処理 95% " + pct(renderTimes).toFixed(2) + "ms";
      $("memoryMetric").textContent =
        "描画メモリ " + (maxRasterBytes / 1048576).toFixed(1) + "MiB";
      const s = lastSensor;
      $("pressureMetric").textContent =
        "筆圧 " +
        (s?.pointerType === "pen" && s.pressure !== undefined
          ? s.pressure.toFixed(3)
          : "未対応・固定");
      const raw = active?.raw ?? lastRaw,
        a = raw.at(-2),
        b = raw.at(-1);
      $("velocityMetric").textContent =
        "速さ " +
        (a && b
          ? Math.round(
              Math.hypot(b.x - a.x, b.y - a.y) /
                Math.max(0.001, (b.t - a.t) / 1000),
            )
          : 0) +
        "px/秒";
    }
  } catch (e) {
    fail(e);
  }
  requestAnimationFrame(frame);
}
function samples(e: PointerEvent): Sample[] {
  const box = canvas.getBoundingClientRect(),
    list = e.getCoalescedEvents?.() ?? [],
    events = list.length ? list : [e];
  return events.map((v) => {
    if (v.pointerType === "pen") {
      sensors.tilt ||= v.tiltX !== 0 || v.tiltY !== 0;
      sensors.azimuth ||= (v.azimuthAngle ?? 0) !== 0;
      sensors.twist ||= v.twist !== 0;
    }
    const s: Sample = {
      x: ((v.clientX - box.left) * width) / box.width,
      y: ((v.clientY - box.top) * height) / box.height,
      t: v.timeStamp,
      pressure: v.pressure,
      pointerType: v.pointerType,
      ...(v.pointerType === "pen" && sensors.tilt
        ? {
            tilt:
              (Math.atan(
                Math.hypot(
                  Math.tan((v.tiltX * Math.PI) / 180),
                  Math.tan((v.tiltY * Math.PI) / 180),
                ),
              ) *
                2) /
              Math.PI,
          }
        : {}),
      ...(v.pointerType === "pen" && sensors.azimuth
        ? { azimuth: v.azimuthAngle }
        : {}),
      ...(v.pointerType === "pen" && sensors.twist
        ? { twist: (v.twist * Math.PI) / 180 }
        : {}),
    };
    return s;
  });
}
canvas.addEventListener("pointerdown", (e) => {
  if (
    busy ||
    active ||
    sustained ||
    e.button !== 0 ||
    (e.pointerType === "touch" && !$<HTMLInputElement>("finger").checked)
  )
    return;
  try {
    begin(preset());
    pointer = e.pointerId;
    penActive = e.pointerType === "pen";
    canvas.setPointerCapture(pointer);
    for (const s of samples(e)) receive(s, e.isTrusted);
    if (e.pointerType === "pen") e.isTrusted ? trustedPen++ : syntheticPen++;
  } catch (x) {
    fail(x);
  }
});
canvas.addEventListener("pointermove", (e) => {
  if (e.pointerId !== pointer || !active) return;
  try {
    for (const s of samples(e)) receive(s, e.isTrusted);
    if (e.pointerType === "pen") e.isTrusted ? trustedPen++ : syntheticPen++;
  } catch (x) {
    fail(x);
  }
});
canvas.addEventListener("pointerup", (e) => {
  if (e.pointerId !== pointer) return;
  try {
    for (const sample of samples(e)) receive(sample, e.isTrusted);
    end();
    if (canvas.hasPointerCapture(e.pointerId))
      canvas.releasePointerCapture(e.pointerId);
  } catch (x) {
    fail(x);
  }
});
function cancel(e?: PointerEvent) {
  if (e && e.pointerId !== pointer) return;
  if (active && !active.ending) {
    active.engine.cancel();
    active = undefined;
    pointer = undefined;
    penActive = false;
    paint(base);
    status("線の途中で中止しました。");
    controls();
  }
}
canvas.addEventListener("pointercancel", cancel);
canvas.addEventListener("lostpointercapture", cancel);
document.addEventListener("visibilitychange", () => {
  if (document.hidden) cancel();
});
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") cancel();
});
$("mobileBrush").addEventListener("change", () => {
  const p = PRESETS.find(
    (p) => p.id === $<HTMLSelectElement>("mobileBrush").value,
  );
  if (p) {
    $<HTMLSelectElement>("brush").value = p.id;
    load(p);
  }
});
for (const [mobile, id, min, max] of [
  ["mobileSize", "size", 0.1, 512],
  ["mobileStabilization", "stabilization", 0, 1],
] as const) {
  $<HTMLInputElement>(mobile).addEventListener("change", () => {
    const v = Number($<HTMLInputElement>(mobile).value);
    if (!Number.isFinite(v) || v < min || v > max) {
      $<HTMLInputElement>(mobile).value = $<HTMLInputElement>(id).value;
      status("数値の範囲を確認してください。");
      return;
    }
    $<HTMLInputElement>(id).value = String(v);
    $<HTMLInputElement>(id + "Range").value = String(v);
  });
}
$("brush").addEventListener("change", () => {
  const p = PRESETS.find((p) => p.id === $<HTMLSelectElement>("brush").value);
  if (p) load(p);
});
$("search").addEventListener("input", populate);
$("undo").addEventListener("click", () => {
  const h = history.pop();
  if (h) {
    redo.push(h);
    base = h.before;
    paint(base);
    lastRecord = history.at(-1)?.record;
    lastRaw = history.at(-1)?.raw ?? [];
    overlays();
  }
  controls();
});
$("redo").addEventListener("click", () => {
  const h = redo.pop();
  if (h) {
    history.push(h);
    base = h.after;
    lastRecord = h.record;
    lastRaw = h.raw;
    paint(base);
    overlays();
  }
  controls();
});
$("reset").addEventListener("click", () => {
  push(new Uint8ClampedArray(base.length), undefined);
  lastRecord = undefined;
  lastRaw = [];
  paint(base);
  overlays();
  controls();
});
function pattern(p: Preset, shiftY = 0) {
  begin(p);
  for (const point of fixture($<HTMLSelectElement>("pattern").value, 100))
    receive({ ...point, x: point.x * 2, y: point.y + shiftY });
  end();
}
$("test").addEventListener("click", () => {
  try {
    pattern(preset());
  } catch (e) {
    fail(e);
  }
});
async function idle() {
  while (active)
    await new Promise<void>((resolve) =>
      requestAnimationFrame(() => resolve()),
    );
}
$("compare").addEventListener("click", async () => {
  try {
    const p = preset();
    pattern({ ...p, stabilization: 0 }, 0);
    await idle();
    pattern(p, 180);
    status("上＝補正なし、下＝現在の補正。");
  } catch (e) {
    fail(e);
  }
});
function download(name: string, value: unknown) {
  const blob = new Blob(
      [typeof value === "string" ? value : JSON.stringify(value)],
      { type: "application/json" },
    ),
    url = URL.createObjectURL(blob),
    link = document.createElement("a");
  link.href = url;
  link.download = name;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
$("export").addEventListener("click", () => {
  if (lastRecord) download("illustro-stroke.json", serialize(lastRecord));
  else status("保存する線を先に描いてください。");
});
$("metrics").addEventListener("click", () =>
  download("illustro-brush-device-report.json", {
    version: 1,
    date: new Date().toISOString(),
    userAgent: navigator.userAgent,
    dpr: devicePixelRatio,
    viewport: [innerWidth, innerHeight],
    acceptedInputCount: acceptedInputs,
    completedStrokes,
    trustedPenSamples,
    generatedPenSamples,
    inputTimingSamples: inputTimes.length,
    inputP95: pct(inputTimes),
    renderP95: pct(renderTimes),
    releaseP95: pct(releaseTimes),
    receiveToNextFrameP95: pct(receivedToFrame),
    frameP95: pct(frames),
    frameOver25ms: frames.filter((v) => v > 25).length,
    maxRasterBytes,
    sensors,
    trustedPen,
    syntheticPen,
    errors,
    memo: $<HTMLTextAreaElement>("memo").value,
    humanFeel: "UNVERIFIED",
    physicalInputToDisplay: "UNVERIFIED",
  }),
);
async function replay(record: StrokeRecord, replace = false) {
  busy = true;
  controls();
  const raster = new StrokeRaster(width, height),
    q = new RasterQueue(raster, record.preset);
  for (const page of record.commands) q.enqueue(page);
  while (q.remaining) {
    q.run(16000, 4);
    await new Promise<void>((resolve) =>
      requestAnimationFrame(() => resolve()),
    );
  }
  const image = raster.composite(
    replace ? new Uint8ClampedArray(base.length) : base,
    record.preset,
  );
  push(image, record);
  lastRecord = record;
  lastRaw = [];
  paint(base);
  graphs(record);
  busy = false;
  controls();
  status("保存した形で再描画しました。");
}
$("replay").addEventListener("click", () => {
  if (lastRecord) replay(lastRecord, true).catch(fail);
  else status("先に線を描いてください。");
});
$("file").addEventListener("change", async () => {
  try {
    const file = $<HTMLInputElement>("file").files?.[0];
    if (file) {
      if (file.size > 128 * 1024 * 1024)
        throw new Error("ファイルが大きすぎます。");
      const r = deserialize(await file.text());
      await replay(r);
    }
  } catch (e) {
    fail(e);
  }
  $<HTMLInputElement>("file").value = "";
});
$("edit").addEventListener("click", () => {
  try {
    $<HTMLTextAreaElement>("presetJson").value = JSON.stringify(
      preset(),
      null,
      2,
    );
  } catch (e) {
    fail(e);
  }
});
$("apply").addEventListener("click", () => {
  try {
    const text = $<HTMLTextAreaElement>("presetJson").value;
    if (text.length > 16 * 1024 * 1024) throw new Error("設定が大きすぎます。");
    const p = JSON.parse(text) as Preset;
    validatePreset(p);
    load(p);
    custom = p;
    status("カスタム設定を適用しました。");
  } catch (e) {
    fail(e);
  }
});
$("exportPreset").addEventListener("click", () => {
  try {
    download("illustro-brush-preset.json", preset());
  } catch (e) {
    fail(e);
  }
});
$("sustain").addEventListener("click", async () => {
  sustained = true;
  controls();
  const started = performance.now();
  try {
    let strokes = 0;
    while (performance.now() - started < 180000) {
      const p = preset();
      active = start(p);
      const t = performance.now();
      for (const s of fixture("s", 120, 240)) {
        receive({ ...s, t: t + s.t });
        await new Promise((resolve) => setTimeout(resolve, 4));
      }
      end();
      await idle();
      strokes++;
      status(
        "自動入力 " +
          Math.round((performance.now() - started) / 1000) +
          "秒・" +
          strokes +
          "本",
      );
    }
  } catch (e) {
    fail(e);
  } finally {
    sustained = false;
    controls();
    status("3分間の自動入力を終了しました。検査結果を保存できます。");
  }
});
(window as unknown as { brushLab: unknown }).brushLab = {
  getRecord: () => lastRecord,
  getImage: () => Array.from(base),
  getErrors: () => errors,
  pattern: () => pattern(preset()),
  getActive: () => !!active,
  getHistory: () => history.length,
};
populate();
load(PRESETS[6]!);
paint(base);
controls();
requestAnimationFrame(frame);
