import { BrushEngine } from "../../packages/brush/src/engine";
import { PRESETS } from "../../packages/brush/src/presets";
import {
  StrokeRaster,
  RasterQueue,
  rasterize,
} from "../../packages/brush/src/raster";
import { capturePointer, penSensors } from "../../packages/brush/src/input";
import {
  serialize,
  deserialize,
  validatePreset,
} from "../../packages/brush/src/record";
import { fixture } from "../../packages/brush/src/fixtures";
import type {
  Preset,
  Sample,
  StrokeRecord,
} from "../../packages/brush/src/types";
const el = <T extends HTMLElement>(id: string) =>
    document.getElementById(id) as T,
  input = (id: string) => el<HTMLInputElement>(id),
  canvas = el<HTMLCanvasElement>("draw"),
  ctx = canvas.getContext("2d")!,
  W = 768,
  H = 512,
  blank = () => new Uint8ClampedArray(W * H * 4);
let image = blank(),
  records: StrokeRecord[] = [],
  redo: StrokeRecord[] = [],
  basePreset = PRESETS[0]!,
  active: BrushEngine | null = null,
  raster: StrokeRaster | null = null,
  queue: RasterQueue | null = null,
  release: StrokeRecord | null = null,
  previewRaster: StrokeRaster | null = null,
  previewQueue: RasterQueue | null = null,
  previewVersion = -1,
  version = 0,
  pointer: number | null = null,
  penSeen = false;
let diagnostic: Sample[] = [],
  lastDiagnostic: Sample[] = [],
  lastRecord: StrokeRecord | null = null,
  received = 0,
  pressure = 0,
  velocity = 0,
  previous: Sample | undefined,
  auto = false,
  stopAuto = false,
  trustedPenSamples = 0;
const telemetry = {
  processing: [] as number[],
  render: [] as number[],
  receiveToRAF: [] as number[],
  release: [] as number[],
  frames: [] as number[],
  peakRasterBytes: 0,
  errors: [] as string[],
  accepted: 0,
  strokes: 0,
};
function keep(a: number[], v: number) {
  a.push(v);
  if (a.length > 8192) a.shift();
}
function p95(a: number[]) {
  const s = [...a].sort((a, b) => a - b);
  return s[Math.floor((s.length - 1) * 0.95)] ?? 0;
}
function status(text: string, error = false) {
  el("status").textContent = text;
  el("status").classList.toggle("error", error);
}
const editingIds = [
  "search",
  "brush",
  "size",
  "sizeNumber",
  "opacity",
  "opacityNumber",
  "flow",
  "flowNumber",
  "stabilization",
  "stabilizationNumber",
  "pressureCurve",
  "color",
  "tip",
  "grain",
  "aspect",
  "spacing",
  "angle",
  "follow",
  "presetJson",
  "applyPreset",
  "savePreset",
];
function lock(on: boolean) {
  for (const id of [
    ...editingIds,
    "undo",
    "redo",
    "reset",
    "save",
    "open",
    "test",
    "sustained",
  ])
    (el(id) as HTMLInputElement).disabled = on || auto;
  el<HTMLButtonElement>("undo").disabled = on || auto || !records.length;
  el<HTMLButtonElement>("redo").disabled = on || auto || !redo.length;
}
function abort() {
  active?.cancel();
  active = null;
  release = null;
  raster = null;
  queue = null;
  previewQueue = null;
  previewRaster = null;
  pointer = null;
  lock(false);
  paint(image);
}
function fail(e: unknown) {
  const message = e instanceof Error ? e.message : String(e);
  telemetry.errors.push(message);
  abort();
  status("描画を確定できませんでした：" + message, true);
}
function choices() {
  const search = input("search").value.toLowerCase(),
    select = el<HTMLSelectElement>("brush"),
    old = select.value;
  select.replaceChildren();
  for (const p of PRESETS) {
    if (
      ![p.name, p.category, p.purpose].some((s) =>
        s.toLowerCase().includes(search),
      )
    )
      continue;
    let group = Array.from(select.children).find(
      (x) => (x as HTMLOptGroupElement).label === p.category,
    ) as HTMLOptGroupElement | undefined;
    if (!group) {
      group = document.createElement("optgroup");
      group.label = p.category;
      select.append(group);
    }
    const o = document.createElement("option");
    o.value = p.id;
    o.textContent = p.name;
    group.append(o);
  }
  if (Array.from(select.options).some((x) => x.value === old))
    select.value = old;
  if (!select.options.length) {
    const o = document.createElement("option");
    o.textContent = "見つかりません";
    o.disabled = true;
    select.append(o);
  }
}
function load(p: Preset) {
  basePreset = p;
  el("purpose").textContent = p.purpose;
  for (const key of ["size", "opacity", "flow", "stabilization"] as const) {
    input(key).value = String(p[key]);
    input(key + "Number").value = input(key).value;
  }
  input("pressureCurve").value = "default";
  input("tip").value = p.tip;
  input("grain").value = String(p.grain);
  input("aspect").value = String(p.aspect);
  input("spacing").value = String(p.spacing);
  input("angle").value = String((p.rotation * 180) / Math.PI);
  input("follow").checked = p.follow;
  input("color").value =
    "#" +
    p.color
      .map((v) =>
        Math.round(v * 255)
          .toString(16)
          .padStart(2, "0"),
      )
      .join("");
  el<HTMLTextAreaElement>("presetJson").value = JSON.stringify(p, null, 2);
}
function settings(): Preset {
  const curve = input("pressureCurve").value,
    c = input("color").value,
    p = {
      ...basePreset,
      size: +input("sizeNumber").value,
      opacity: +input("opacityNumber").value,
      flow: +input("flowNumber").value,
      stabilization: +input("stabilizationNumber").value,
      tip: input("tip").value as Preset["tip"],
      grain: +input("grain").value,
      aspect: +input("aspect").value,
      spacing: +input("spacing").value,
      rotation: (+input("angle").value * Math.PI) / 180,
      follow: input("follow").checked,
      color: [
        parseInt(c.slice(1, 3), 16) / 255,
        parseInt(c.slice(3, 5), 16) / 255,
        parseInt(c.slice(5, 7), 16) / 255,
      ] as const,
      pressureCurve:
        curve === "linear"
          ? ([
              [0, 0],
              [1, 1],
            ] as const)
          : curve === "soft"
            ? ([
                [0, 0],
                [0.3, 0.65],
                [1, 1],
              ] as const)
            : curve === "firm"
              ? ([
                  [0, 0],
                  [0.6, 0.2],
                  [1, 1],
                ] as const)
              : basePreset.pressureCurve,
    };
  validatePreset(p);
  return p;
}
function begin() {
  if (active || release) throw new Error("前の線を確定中です");
  const p = settings();
  diagnostic = [];
  previous = undefined;
  raster = new StrokeRaster(W, H);
  queue = new RasterQueue(raster, p);
  active = new BrushEngine(p, {
    seed: [1, 2],
    sink: (page) => queue!.enqueue(page),
  });
  received = performance.now();
  version++;
  lock(true);
}
function accept(s: Sample) {
  if (!active) return;
  const start = performance.now();
  active.accept(s);
  telemetry.accepted++;
  if (diagnostic.length < 10000) diagnostic.push({ ...s });
  pressure = s.pressure ?? 1;
  if (previous && s.t > previous.t)
    velocity =
      (Math.hypot(s.x - previous.x, s.y - previous.y) / (s.t - previous.t)) *
      1000;
  previous = s;
  received = performance.now();
  version++;
  keep(telemetry.processing, performance.now() - start);
}
function finish() {
  if (!active) return;
  const start = performance.now();
  active.finish();
  release = active.record();
  keep(telemetry.release, performance.now() - start);
  active = null;
  previewRaster = null;
  previewQueue = null;
  status("線を確定しています…");
}
function paint(bytes: Uint8ClampedArray) {
  ctx.putImageData(new ImageData(new Uint8ClampedArray(bytes), W, H), 0, 0);
  const sources = [
    [input("raw").checked, active ? diagnostic : lastDiagnostic, "#367ccb"],
    [
      input("processed").checked,
      active ? [] : (lastRecord?.geometry ?? []),
      "#d9751d",
    ],
  ] as const;
  for (const [show, points, color] of sources)
    if (show) {
      ctx.fillStyle = color;
      for (const p of points) {
        ctx.beginPath();
        ctx.arc(p.x, p.y, 1.5, 0, Math.PI * 2);
        ctx.fill();
      }
    }
}
function compare() {
  el("compareArea").hidden = !input("compare").checked;
  for (const [id, points, color] of [
    ["rawCanvas", lastDiagnostic, "#367ccb"],
    ["processedCanvas", lastRecord?.geometry ?? [], "#d9751d"],
  ] as const) {
    const c = el<HTMLCanvasElement>(id).getContext("2d")!;
    c.clearRect(0, 0, W, H);
    c.strokeStyle = color;
    c.lineWidth = 2;
    c.beginPath();
    points.forEach((p, i) => (i ? c.lineTo(p.x, p.y) : c.moveTo(p.x, p.y)));
    c.stroke();
  }
}
function complete() {
  if (!release || !raster) return;
  image = raster.composite(image, release.preset);
  records.push(release);
  redo = [];
  lastRecord = release;
  lastDiagnostic = [...diagnostic];
  telemetry.strokes++;
  release = null;
  raster = null;
  queue = null;
  paint(image);
  compare();
  lock(false);
  status("線を確定しました。");
  scheduleSave();
}
let lastFrame = performance.now(),
  lastStats = 0;
function frame(now: number) {
  keep(telemetry.frames, now - lastFrame);
  lastFrame = now;
  const start = performance.now();
  try {
    if (active || release) {
      if (active && active.preset.exposureMs) {
        const before = active.metrics.commands;
        active.expose(Math.max(previous?.t ?? 0, now));
        if (active.metrics.commands !== before) version++;
      }
      queue?.run(16384, 2);
      if (release && queue?.remaining === 0) complete();
      else if (active && queue?.remaining === 0) {
        if (previewVersion !== version) {
          previewVersion = version;
          previewRaster = raster!.clone();
          previewQueue = new RasterQueue(previewRaster, active.preset);
          const prefix = active.pendingPrefix();
          if (prefix.length) previewQueue.enqueue(prefix);
          previewQueue.enqueue(active.preview());
        }
        previewQueue?.run(16384, 2);
        if (previewQueue?.remaining === 0 && previewRaster) {
          paint(previewRaster.composite(image, active.preset));
          if (received) {
            keep(telemetry.receiveToRAF, now - received);
            received = 0;
          }
        }
      } else if (raster)
        paint(raster.composite(image, active?.preset ?? release!.preset));
      telemetry.peakRasterBytes = Math.max(
        telemetry.peakRasterBytes,
        (raster?.allocatedBytes ?? 0) + (previewRaster?.allocatedBytes ?? 0),
      );
    }
  } catch (e) {
    fail(e);
  }
  keep(telemetry.render, performance.now() - start);
  if (now - lastStats > 300) {
    lastStats = now;
    const frames = telemetry.frames.slice(-30),
      fps = 1000 / (frames.reduce((a, b) => a + b, 0) / frames.length);
    el("metrics").textContent =
      `画面更新 ${fps.toFixed(0)} FPS · 筆圧 ${pressure.toFixed(3)} · 速さ ${velocity.toFixed(0)} px/s\n入力処理 p95 ${p95(telemetry.processing).toFixed(2)} ms · 描画処理 p95 ${p95(telemetry.render).toFixed(2)} ms\n受取→画面更新 p95 ${p95(telemetry.receiveToRAF).toFixed(2)} ms（実機の全遅延ではありません）\n${telemetry.accepted} 入力 · ${records.length} 本 · 描画中の画素領域 ${(telemetry.peakRasterBytes / 1048576).toFixed(1)} MB · 待ち ${queue?.remaining ?? 0} 個`;
  }
  requestAnimationFrame(frame);
}
const transform = (x: number, y: number) => {
  const b = canvas.getBoundingClientRect();
  return [((x - b.left) * W) / b.width, ((y - b.top) * H) / b.height] as const;
};
function intake(e: PointerEvent) {
  if (e.isTrusted && e.pointerType === "pen") trustedPenSamples++;
  const events = e.getCoalescedEvents?.() ?? [],
    list = capturePointer(e, transform, 0);
  for (let i = 0; i < list.length; i++) {
    const v = events.length ? events[i]! : e;
    accept({
      ...list[i]!,
      ...penSensors(v, {
        tilt: e.pointerType === "pen" && (v.tiltX !== 0 || v.tiltY !== 0),
        azimuth: e.pointerType === "pen" && v.azimuthAngle !== 0,
        twist: e.pointerType === "pen" && v.twist !== 0,
      }),
    });
  }
}
canvas.addEventListener("pointerdown", (e) => {
  if (pointer !== null || release || auto || e.button !== 0) return;
  if (e.pointerType === "touch" && penSeen && !input("finger").checked) return;
  if (e.pointerType === "pen") penSeen = true;
  try {
    begin();
    pointer = e.pointerId;
    canvas.setPointerCapture(e.pointerId);
    intake(e);
    status("描画中");
  } catch (err) {
    fail(err);
  }
});
canvas.addEventListener("pointermove", (e) => {
  if (e.pointerId === pointer)
    try {
      intake(e);
    } catch (err) {
      fail(err);
    }
});
canvas.addEventListener("pointerup", (e) => {
  if (e.pointerId !== pointer) return;
  try {
    if (e.pressure !== 0) intake(e);
    else {
      const [x, y] = transform(e.clientX, e.clientY);
      accept({
        x,
        y,
        t: e.timeStamp,
        pressure: previous?.pressure ?? 1,
        pointerType: e.pointerType,
      });
    }
    pointer = null;
    finish();
  } catch (err) {
    fail(err);
  }
});
for (const type of ["pointercancel", "lostpointercapture"])
  canvas.addEventListener(type, () => {
    if (pointer !== null) {
      abort();
      status("描画を中止しました。");
    }
  });
window.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && active) {
    abort();
    status("描画を中止しました。");
  }
});
input("search").addEventListener("input", choices);
el("brush").addEventListener("change", () => {
  const p = PRESETS.find((p) => p.id === input("brush").value);
  if (p) load(p);
});
for (const k of ["size", "opacity", "flow", "stabilization"]) {
  input(k).addEventListener(
    "input",
    () => (input(k + "Number").value = input(k).value),
  );
  input(k + "Number").addEventListener(
    "input",
    () => (input(k).value = input(k + "Number").value),
  );
}
for (const id of ["raw", "processed"])
  input(id).addEventListener("change", () => paint(image));
input("compare").addEventListener("change", compare);
async function settled() {
  while (active || release)
    await new Promise<void>((r) => requestAnimationFrame(() => r()));
}
async function pattern(kind: Parameters<typeof fixture>[0]) {
  begin();
  for (const s of fixture(kind, kind === "long" ? 1000 : 120))
    accept({ ...s, x: s.x * 2.3, y: s.y * 2.5 });
  finish();
  await settled();
}
el("test").addEventListener(
  "click",
  () =>
    void pattern(input("pattern").value as Parameters<typeof fixture>[0]).catch(
      fail,
    ),
);
function rebuild() {
  image = blank();
  for (const r of records)
    image = rasterize(r, W, H).composite(image, r.preset);
  lastRecord = records.at(-1) ?? null;
  paint(image);
  compare();
  lock(false);
  scheduleSave();
}
el("undo").addEventListener("click", () => {
  if (records.length) {
    redo.push(records.pop()!);
    rebuild();
    status("最後の線を取り消しました。");
  }
});
el("redo").addEventListener("click", () => {
  if (redo.length) {
    records.push(redo.pop()!);
    rebuild();
    status("線をやり直しました。");
  }
});
el("reset").addEventListener("click", () => {
  if (records.length) {
    redo = [...records].reverse();
    records = [];
    rebuild();
    status("すべて消しました。「やり直す」で戻せます。");
  }
});
function download(name: string, data: unknown) {
  const url = URL.createObjectURL(
      new Blob([JSON.stringify(data)], { type: "application/json" }),
    ),
    a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
function bundle() {
  return {
    version: 1,
    kind: "illustro-brush-lab",
    records,
    diagnostic: lastDiagnostic,
  };
}
el("save").addEventListener("click", () =>
  download("illustro-brush-strokes.json", bundle()),
);
el("open").addEventListener("click", () => input("file").click());
function decode(text: string) {
  if (text.length > 32 * 1024 * 1024)
    throw new Error("ファイルが32 MBを超えています");
  const b = JSON.parse(text);
  if (
    b.version !== 1 ||
    b.kind !== "illustro-brush-lab" ||
    !Array.isArray(b.records) ||
    b.records.length > 100
  )
    throw new Error("対応していない線のファイルです");
  return b.records.map((r: unknown) =>
    deserialize(JSON.stringify(r)),
  ) as StrokeRecord[];
}
input("file").addEventListener("change", async () => {
  try {
    const f = input("file").files?.[0];
    if (!f) return;
    const candidate = decode(await f.text());
    let next = blank();
    for (const r of candidate)
      next = rasterize(r, W, H).composite(next, r.preset);
    records = candidate;
    redo = [];
    image = next;
    lastRecord = records.at(-1) ?? null;
    paint(image);
    compare();
    lock(false);
    scheduleSave();
    status("線を開きました。");
  } catch (e) {
    status("読み込めませんでした。今の線は保持しています：" + String(e), true);
  } finally {
    input("file").value = "";
  }
});
let saveTimer: ReturnType<typeof setTimeout> | undefined;
function scheduleSave() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    try {
      const json = JSON.stringify(bundle());
      if (json.length > 4 * 1024 * 1024)
        throw new Error(
          "自動保存の上限を超えました。「線を保存」で保存してください",
        );
      localStorage.setItem("illustro-brush-lab-v1", json);
    } catch (e) {
      status("自動保存できませんでした：" + String(e), true);
    }
  }, 400);
}
el("applyPreset").addEventListener("click", () => {
  try {
    const p = JSON.parse(el<HTMLTextAreaElement>("presetJson").value);
    validatePreset(p);
    load(p);
    el("jsonError").textContent = "";
    status("ペン設定を適用しました。");
  } catch (e) {
    el("jsonError").textContent = "設定を適用できません：" + String(e);
  }
});
el("savePreset").addEventListener("click", () => {
  try {
    download("illustro-brush-preset.json", settings());
  } catch (e) {
    el("jsonError").textContent = String(e);
  }
});
el("exportEvidence").addEventListener("click", () =>
  download("illustro-brush-device-evidence.json", {
    version: 1,
    engine: "illustro-brush-1",
    status: "UNVERIFIED",
    userAgent: navigator.userAgent,
    dpr: devicePixelRatio,
    observedPenPointer: penSeen,
    trustedPenSamples,
    telemetry,
    feedback: el<HTMLTextAreaElement>("feedback").value,
    lastStroke: lastRecord,
    lastActualInput: lastDiagnostic,
  }),
);
async function sustained(duration = 180000) {
  auto = true;
  stopAuto = false;
  el<HTMLButtonElement>("stop").disabled = false;
  lock(true);
  const start = performance.now();
  let n = 0;
  try {
    while (performance.now() - start < duration && !stopAuto) {
      begin();
      const strokeStart = performance.now();
      let i = 0;
      while (i < 1200 && !stopAuto && performance.now() - start < duration) {
        const target = Math.min(
          1199,
          Math.floor((performance.now() - strokeStart) * 0.24),
        );
        for (; i <= target; i++) {
          const u = i / 1200;
          accept({
            x: 30 + u * 700,
            y: 250 + 90 * Math.sin(u * Math.PI * 4),
            t: strokeStart + (i * 1000) / 240,
            pressure: 0.1 + 0.8 * Math.sin(u * Math.PI),
            pointerType: "pen",
          });
        }
        await new Promise<void>((r) => requestAnimationFrame(() => r()));
      }
      finish();
      await settled();
      n++;
    }
    status(
      `自動検査を終了しました：${n} 本。実機の描き心地や発熱は未確認です。`,
    );
  } catch (e) {
    fail(e);
  } finally {
    auto = false;
    el<HTMLButtonElement>("stop").disabled = true;
    lock(false);
  }
}
el("sustained").addEventListener("click", () => void sustained());
el("stop").addEventListener("click", () => {
  stopAuto = true;
});
choices();
load(PRESETS[0]!);
try {
  const saved = localStorage.getItem("illustro-brush-lab-v1");
  if (saved) {
    records = decode(saved);
    rebuild();
    status("前回の線を復元しました。");
  }
} catch (e) {
  status("前回の線を復元できませんでした：" + String(e), true);
}
lock(false);
paint(image);
requestAnimationFrame(frame);
(globalThis as any).__brushLab = {
  pattern,
  sustained,
  state: () => ({
    records: records.length,
    redo: redo.length,
    active: !!active,
    release: !!release,
    telemetry,
    preset: settings(),
  }),
  bytes: () => Array.from(image),
  replayEqual: () => {
    let expected = blank();
    for (const r of records)
      expected = rasterize(r, W, H).composite(expected, r.preset);
    return expected.every((v, i) => v === image[i]);
  },
  bundle,
  load,
  reset: () => {
    records = [];
    redo = [];
    rebuild();
  },
  importText: decode,
};
