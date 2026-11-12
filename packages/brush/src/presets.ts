import type { Curve, Mapping, Preset, Source, Target, Tip } from "./types";
import { LINEAR, snapshot } from "./math";
import { validatePreset } from "./record";
export function mapping(
  source: Source,
  target: Target,
  min: number,
  max: number,
  curve: Curve = LINEAR,
  combine: Mapping["mode"] = "multiply",
  period?: number,
): Mapping {
  return {
    source,
    target,
    min,
    max,
    curve,
    mode: combine,
    fallback: 1,
    ...(period ? { period } : {}),
  };
}
export const PRESSURE_SIZE = mapping("pressure", "size", 0.12, 1);
export const PRESSURE_FLOW = mapping("pressure", "flow", 0.15, 1);
type TipOptions = {
  kind?: Tip;
  aspect?: number;
  hardness?: number;
  bristles?: number;
};
type Options = Partial<
  Omit<Preset, "tip" | "grain" | "preview" | "compatibility">
> & {
  tip?: TipOptions;
  grain?: {
    kind: "none" | "paper" | "noise" | "hatch" | "image";
    amount: number;
    scale: number;
    rotation?: number;
  };
  jitter?: {
    size?: number;
    opacity?: number;
    flow?: number;
    rotation?: number;
    hue?: number;
  };
  taper?: { start?: number; end?: number; minimum?: number };
  secondaryTip?: TipOptions;
  followDirection?: boolean;
  dynamics?: readonly Mapping[];
  airbrushHz?: number;
};
export function preset(
  id: string,
  name: string,
  category: string,
  purpose: string,
  o: Options = {},
): Preset {
  const tip = o.tip ?? {},
    grain = o.grain ?? { kind: "none", amount: 0, scale: 2 },
    j = o.jitter ?? {},
    t = o.taper ?? {};
  const p: Preset = {
    version: 1,
    id,
    name,
    category,
    purpose,
    signature: o.signature ?? false,
    compatibility: "illustro-brush-1",
    preview: "stroke:1",
    size: o.size ?? 12,
    opacity: o.opacity ?? 1,
    flow: o.flow ?? 1,
    spacing: o.spacing ?? 0.12,
    rotation: o.rotation ?? 0,
    follow: o.followDirection ?? false,
    scatter: o.scatter ?? 0,
    stabilization: o.stabilization ?? 0.5,
    pressureSmoothing: o.pressureSmoothing ?? 0.25,
    pressureCurve: o.pressureCurve ?? LINEAR,
    tip: tip.kind ?? "round",
    aspect: tip.aspect ?? 1,
    hardness: tip.hardness ?? 1,
    bristles: tip.bristles ?? 7,
    grain: grain.amount,
    grainKind: grain.kind === "none" ? "paper" : grain.kind,
    grainScale: grain.scale,
    grainRotation: grain.rotation ?? 0,
    sizeJitter: j.size ?? 0,
    opacityJitter: j.opacity ?? 0,
    flowJitter: j.flow ?? 0,
    rotationJitter: j.rotation ?? 0,
    hueJitter: j.hue ?? 0,
    taperStart: t.start ?? 0,
    taperEnd: t.end ?? 0,
    taperMinimum: t.minimum ?? 0.05,
    exposureMs: o.airbrushHz ? 1000 / o.airbrushHz : 0,
    blend: o.blend ?? "normal",
    color: o.color ?? [0.12, 0.15, 0.2],
    mappings: o.dynamics ?? [PRESSURE_SIZE],
    ...(o.secondaryTip?.kind
      ? { dual: o.secondaryTip.kind, dualAspect: o.secondaryTip.aspect ?? 1 }
      : {}),
  };
  validatePreset(p);
  return snapshot(p);
}
const add = preset;
const pencil = (amount: number, scale: number) => ({
  kind: "paper" as const,
  amount,
  scale,
});
const taper = { start: 8, end: 16, minimum: 0.06 };
const flat: TipOptions = { kind: "rect", aspect: 0.3, hardness: 1 };
const bristle: TipOptions = { kind: "bristle", aspect: 0.7, bristles: 9 };
export const STANDARD_PRESETS: readonly Preset[] = Object.freeze([
  add("rough-pencil", "ラフ鉛筆", "ラフ・下書き", "薄いざらつきで形を探す", {
    size: 4,
    flow: 0.45,
    grain: pencil(0.75, 1),
    dynamics: [PRESSURE_SIZE, PRESSURE_FLOW],
    stabilization: 0.15,
  }),
  add(
    "rough-soft",
    "やわらかラフ",
    "ラフ・下書き",
    "大きく薄い線で構図を置く",
    {
      size: 18,
      opacity: 0.45,
      flow: 0.6,
      tip: { hardness: 0.4 },
      dynamics: [PRESSURE_SIZE, PRESSURE_FLOW],
      stabilization: 0.1,
    },
  ),
  add(
    "draft-blue",
    "青下書き",
    "ラフ・下書き",
    "線画と区別しやすい細い下書き",
    { size: 3, color: [0.25, 0.55, 0.9], opacity: 0.5, stabilization: 0.25 },
  ),
  add("gesture", "速描き", "ラフ・下書き", "速さで細くなる勢いのあるラフ", {
    size: 8,
    flow: 0.8,
    dynamics: [
      PRESSURE_SIZE,
      mapping("velocity", "size", 0.3, 1, [
        [0, 1],
        [1, 0],
      ]),
    ],
    stabilization: 0,
  }),
  add("fine-ink", "細線", "線画", "小さなパーツを一定の太さで描く", {
    size: 1.5,
    dynamics: [],
    spacing: 0.09,
  }),
  add("clean-ink", "輪郭ペン", "線画", "輪郭の強弱を筆圧で描く", {
    size: 8,
    dynamics: [
      mapping("pressure", "size", 0.08, 1, [
        [0, 0],
        [0.35, 0.18],
        [1, 1],
      ]),
    ],
    taper,
  }),
  add("comic-ink", "漫画ペン", "線画", "鋭い入り抜きの漫画線", {
    size: 16,
    taper: { start: 10, end: 22, minimum: 0.03 },
    pressureCurve: [
      [0, 0],
      [0.4, 0.15],
      [1, 1],
    ],
    spacing: 0.08,
  }),
  add("soft-ink", "やわらか線", "線画", "線画を柔らかい縁にする", {
    size: 7,
    tip: { hardness: 0.65 },
    flow: 0.8,
    taper,
  }),
  add("technical", "製図ペン", "線画", "補正した均一な線で図形を描く", {
    size: 2,
    dynamics: [],
    stabilization: 0.85,
    spacing: 0.07,
  }),
  add("brush-ink", "筆線", "線画", "細線から太線へ大きな強弱を付ける", {
    size: 32,
    dynamics: [mapping("pressure", "size", 0.03, 1)],
    taper: { start: 14, end: 28, minimum: 0.02 },
    spacing: 0.06,
  }),
  add("graphite", "鉛筆", "鉛筆", "細粒の筆圧で陰影と線を描く", {
    size: 5,
    grain: pencil(0.8, 0.8),
    flow: 0.65,
    dynamics: [PRESSURE_SIZE, PRESSURE_FLOW],
  }),
  add("mechanical", "シャープペン", "鉛筆", "細い一定幅の薄い筆記線", {
    size: 1.2,
    grain: pencil(0.25, 0.5),
    dynamics: [mapping("pressure", "opacity", 0.3, 1)],
    opacity: 0.85,
  }),
  add("colored-pencil", "色鉛筆", "鉛筆", "粒を残して色を重ねる", {
    size: 8,
    color: [0.72, 0.34, 0.18],
    grain: pencil(0.9, 1.5),
    flow: 0.35,
    dynamics: [PRESSURE_SIZE, PRESSURE_FLOW],
  }),
  add("side-pencil", "寝かせ鉛筆", "鉛筆", "ペンの傾きで幅広い陰影を付ける", {
    size: 24,
    tip: { kind: "ellipse", aspect: 0.22 },
    grain: pencil(0.85, 1),
    flow: 0.45,
    dynamics: [
      PRESSURE_FLOW,
      mapping("tilt", "aspect", 0.18, 1, LINEAR, "replace"),
      mapping("azimuth", "rotation", 0, Math.PI * 2, LINEAR, "replace"),
    ],
  }),
  add("charcoal", "木炭", "鉛筆", "大きな粒と散りで粗い陰影を置く", {
    size: 36,
    grain: { kind: "noise", amount: 0.85, scale: 3 },
    flow: 0.5,
    scatter: 0.05,
    jitter: { size: 0.15 },
    dynamics: [PRESSURE_SIZE, PRESSURE_FLOW],
  }),
  add("round-marker", "丸マーカー", "マーカー", "均一な半透明の色帯を置く", {
    size: 28,
    opacity: 0.55,
    flow: 1,
    dynamics: [],
  }),
  add(
    "chisel-marker",
    "角マーカー",
    "マーカー",
    "角形の先端で幅のある線を描く",
    {
      size: 30,
      tip: flat,
      rotation: Math.PI / 4,
      opacity: 0.65,
      flow: 1,
      dynamics: [],
    },
  ),
  add("felt", "フェルトペン", "マーカー", "丸く少し柔らかい筆記線", {
    size: 10,
    tip: { hardness: 0.8 },
    flow: 0.85,
    dynamics: [mapping("pressure", "size", 0.65, 1)],
  }),
  add("highlighter", "蛍光マーカー", "マーカー", "低い濃さで広い帯を付ける", {
    size: 42,
    tip: { kind: "rect", aspect: 0.45 },
    opacity: 0.25,
    color: [1, 0.8, 0.12],
    dynamics: [],
    rotation: 0.2,
  }),
  add("round-brush", "丸筆", "筆・厚塗り", "筆圧を使って不透明な面を塗る", {
    size: 36,
    dynamics: [PRESSURE_SIZE],
    spacing: 0.09,
  }),
  add("flat-brush", "平筆", "筆・厚塗り", "平たい先端で面と角を描く", {
    size: 44,
    tip: flat,
    followDirection: true,
    dynamics: [PRESSURE_SIZE],
  }),
  add("rake", "熊手筆", "筆・厚塗り", "一定方向の毛の筋を残す", {
    size: 40,
    tip: { ...bristle, bristles: 5 },
    followDirection: true,
    flow: 0.8,
  }),
  add("dry-brush", "ドライ筆", "筆・厚塗り", "ざらついた筋で乾いた塗りを作る", {
    size: 48,
    tip: bristle,
    grain: pencil(0.9, 2.4),
    flow: 0.55,
    followDirection: true,
    dynamics: [PRESSURE_SIZE, PRESSURE_FLOW],
  }),
  add("opaque-paint", "塗り込み", "塗り", "途切れない丸い面で下塗りする", {
    size: 64,
    dynamics: [],
    spacing: 0.08,
  }),
  add("glaze", "薄塗り", "塗り", "筆圧で薄い色を少しずつ置く", {
    size: 54,
    opacity: 0.45,
    flow: 0.25,
    dynamics: [PRESSURE_FLOW],
    tip: { hardness: 0.65 },
  }),
  add(
    "soft-paint",
    "ぼかし風塗り",
    "塗り",
    "柔らかい色の縁で境目を塗る。既存色のぼかしではない",
    {
      size: 70,
      tip: { hardness: 0.1 },
      flow: 0.3,
      dynamics: [PRESSURE_SIZE, PRESSURE_FLOW],
    },
  ),
  add(
    "wash-look",
    "水彩風",
    "塗り",
    "粒を残す半透明の塗り。水分の移動は行わない",
    {
      size: 56,
      opacity: 0.4,
      flow: 0.18,
      tip: { hardness: 0.35 },
      grain: pencil(0.4, 3),
      jitter: { size: 0.06 },
      dynamics: [PRESSURE_SIZE, PRESSURE_FLOW],
    },
  ),
  add("broad-air", "エアブラシ", "エア・影・光", "保持時間で柔らかい色を足す", {
    size: 128,
    tip: { hardness: 0 },
    flow: 0.04,
    airbrushHz: 30,
    dynamics: [PRESSURE_FLOW],
    spacing: 0.18,
  }),
  add(
    "fine-air",
    "細エアブラシ",
    "エア・影・光",
    "小さな陰影に柔らかい色を置く",
    {
      size: 24,
      tip: { hardness: 0.1 },
      flow: 0.08,
      airbrushHz: 24,
      dynamics: [PRESSURE_SIZE, PRESSURE_FLOW],
    },
  ),
  add("shadow-soft", "やわらか影", "エア・影・光", "乗算で淡い広い影を置く", {
    size: 80,
    tip: { hardness: 0.2 },
    opacity: 0.55,
    flow: 0.22,
    blend: "multiply",
    color: [0.42, 0.45, 0.55],
    dynamics: [PRESSURE_FLOW],
  }),
  add("shadow-edge", "輪郭影", "エア・影・光", "縁を残す影の形を描く", {
    size: 32,
    blend: "multiply",
    opacity: 0.65,
    color: [0.4, 0.43, 0.52],
  }),
  add("light", "光ペン", "エア・影・光", "スクリーンで細い光を描く", {
    size: 12,
    blend: "screen",
    color: [1, 0.86, 0.6],
    tip: { hardness: 0.6 },
    taper,
  }),
  add("skin", "肌なじみ", "肌・髪", "弱い筆圧で柔らかい肌色を重ねる", {
    size: 64,
    color: [0.9, 0.65, 0.52],
    tip: { hardness: 0.35 },
    flow: 0.28,
    dynamics: [PRESSURE_FLOW],
  }),
  add("hair-line", "髪細線", "肌・髪", "細い入り抜きで一本の髪を描く", {
    size: 5,
    taper: { start: 7, end: 18, minimum: 0.025 },
    spacing: 0.07,
  }),
  add("hair-band", "髪の面", "肌・髪", "平たい筋で髪の塊を塗る", {
    size: 36,
    tip: { ...bristle, aspect: 0.45, bristles: 6 },
    followDirection: true,
    taper: { end: 20 },
    flow: 0.8,
  }),
  add("hair-light", "髪ハイライト", "肌・髪", "細い帯の筋で髪に光を入れる", {
    size: 20,
    tip: { kind: "ellipse", aspect: 0.2 },
    followDirection: true,
    blend: "screen",
    color: [0.86, 0.75, 0.5],
    taper,
  }),
  add("foliage", "葉散らし", "背景", "向きと大きさの違う葉で背景を描く", {
    size: 30,
    tip: { kind: "leaf", aspect: 0.5 },
    scatter: 0.6,
    spacing: 0.7,
    jitter: { size: 0.45, rotation: Math.PI, hue: 0.05 },
    color: [0.28, 0.46, 0.22],
  }),
  add("cloud", "雲の粒", "背景", "大きい柔らかい粒を散らして雲の形を作る", {
    size: 80,
    tip: { hardness: 0.3 },
    scatter: 0.25,
    spacing: 0.35,
    jitter: { size: 0.4 },
    color: [0.8, 0.86, 0.95],
    flow: 0.65,
  }),
  add("stone", "石の粒", "背景", "粗い粒の陰影で岩の面を作る", {
    size: 48,
    grain: { kind: "noise", amount: 0.9, scale: 5 },
    scatter: 0.08,
    jitter: { size: 0.18, rotation: 1 },
    color: [0.42, 0.4, 0.38],
    flow: 0.7,
  }),
  add("paper", "紙粒", "質感", "細かい紙の粒を平らな色に加える", {
    size: 64,
    grain: pencil(1, 1),
    flow: 0.5,
    dynamics: [],
  }),
  add("chalk", "チョーク", "質感", "白い粉の粒で粗い線を描く", {
    size: 20,
    color: [0.92, 0.92, 0.88],
    grain: { kind: "noise", amount: 0.9, scale: 2.5 },
    flow: 0.65,
    scatter: 0.03,
  }),
  add("hatching", "斜線", "質感", "一定方向の斜線を影として置く", {
    size: 42,
    grain: { kind: "hatch", amount: 1, scale: 5, rotation: Math.PI / 4 },
    flow: 1,
    blend: "multiply",
    dynamics: [],
  }),
  add("star-stamp", "星スタンプ", "装飾・効果", "一定間隔に星の形を並べる", {
    size: 28,
    tip: { kind: "star" },
    spacing: 1.2,
    dynamics: [],
    color: [0.95, 0.64, 0.16],
  }),
  add("sparkles", "きらめき", "装飾・効果", "散った大小の星で光を加える", {
    size: 32,
    tip: { kind: "star" },
    scatter: 0.7,
    spacing: 0.9,
    jitter: { size: 0.65, rotation: Math.PI },
    blend: "screen",
    color: [1, 0.82, 0.5],
  }),
  add("confetti", "紙吹雪", "装飾・効果", "回転する小さな角形で彩りを付ける", {
    size: 16,
    tip: { kind: "rect", aspect: 0.5 },
    scatter: 1.2,
    spacing: 1.3,
    jitter: { rotation: Math.PI, size: 0.5, hue: 0.3 },
    color: [0.95, 0.45, 0.3],
  }),
  add(
    "dots",
    "丸ドット",
    "ドット・パターン",
    "同じ大きさの丸を等間隔で並べる",
    { size: 9, spacing: 1.5, dynamics: [] },
  ),
  add(
    "pressure-dots",
    "強弱ドット",
    "ドット・パターン",
    "筆圧に応じた丸を並べる",
    { size: 18, spacing: 1.6, dynamics: [PRESSURE_SIZE] },
  ),
  add(
    "chain",
    "楕円チェーン",
    "ドット・パターン",
    "進行方向を向く楕円を並べる",
    {
      size: 18,
      tip: { kind: "ellipse", aspect: 0.3 },
      followDirection: true,
      spacing: 1.25,
      dynamics: [],
    },
  ),
  add("hard-eraser", "硬い消しゴム", "消しゴム", "筆圧で太さを変えて消す", {
    size: 32,
    blend: "erase",
    spacing: 0.08,
  }),
  add("soft-eraser", "柔らか消しゴム", "消しゴム", "淡く柔らかい縁で消す", {
    size: 64,
    tip: { hardness: 0.15 },
    blend: "erase",
    flow: 0.3,
    dynamics: [PRESSURE_FLOW],
  }),
]);
export const SIGNATURE_PRESETS: readonly Preset[] = Object.freeze([
  add(
    "silk",
    "絹糸",
    "Illustro独自",
    "弱い筆圧で細線、強い筆圧で幅広い面へ滑らかに切り替える",
    {
      signature: true,
      size: 32,
      tip: { kind: "ellipse", aspect: 0.2 },
      followDirection: true,
      dynamics: [
        mapping("pressure", "size", 0.03, 1, [
          [0, 0],
          [0.5, 0.22],
          [1, 1],
        ]),
        mapping("pressure", "aspect", 0.15, 1, LINEAR, "replace"),
      ],
      taper,
    },
  ),
  add(
    "bundle",
    "束ね",
    "Illustro独自",
    "筆の毛の筋を楕円で整え、髪の束と抜きを一筆で作る",
    {
      signature: true,
      size: 38,
      tip: { ...bristle, aspect: 0.65, bristles: 7 },
      secondaryTip: { kind: "ellipse", aspect: 0.8, hardness: 1, bristles: 1 },
      followDirection: true,
      taper: { start: 6, end: 28, minimum: 0.04 },
      dynamics: [PRESSURE_SIZE, PRESSURE_FLOW],
    },
  ),
  add(
    "sprout",
    "芽吹き",
    "Illustro独自",
    "軽い筆圧ではラフ、強い筆圧では粒を減らした濃い線になる",
    {
      signature: true,
      size: 8,
      grain: pencil(0.95, 1.3),
      flow: 0.8,
      dynamics: [
        PRESSURE_SIZE,
        PRESSURE_FLOW,
        mapping(
          "pressure",
          "grain",
          0,
          0.95,
          [
            [0, 1],
            [1, 0],
          ],
          "replace",
        ),
      ],
    },
  ),
  add(
    "shadow-weave",
    "影織り",
    "Illustro独自",
    "軽く斜線を置き、筆圧を上げるほど連続した乗算の影にする",
    {
      signature: true,
      size: 54,
      grain: { kind: "hatch", amount: 1, scale: 4, rotation: 0.7 },
      blend: "multiply",
      color: [0.38, 0.42, 0.52],
      flow: 0.6,
      dynamics: [
        PRESSURE_SIZE,
        PRESSURE_FLOW,
        mapping(
          "pressure",
          "grain",
          0,
          1,
          [
            [0, 1],
            [1, 0],
          ],
          "replace",
        ),
      ],
    },
  ),
  add(
    "color-strata",
    "彩層",
    "Illustro独自",
    "毛の筋・紙粒・小さな色差で塗りに情報量を加える",
    {
      signature: true,
      size: 44,
      tip: { ...bristle, bristles: 11 },
      grain: pencil(0.55, 2),
      jitter: { hue: 0.025, flow: 0.12 },
      color: [0.78, 0.4, 0.18],
      flow: 0.7,
      followDirection: true,
      dynamics: [
        PRESSURE_SIZE,
        PRESSURE_FLOW,
        mapping("random", "value", 0.85, 1),
      ],
    },
  ),
  add(
    "star-vein",
    "星脈",
    "Illustro独自",
    "距離に沿って星の大小が周期的に変わる装飾を描く",
    {
      signature: true,
      size: 30,
      tip: { kind: "star" },
      spacing: 0.8,
      jitter: { rotation: 0.3 },
      dynamics: [
        mapping(
          "distance",
          "size",
          0.18,
          1,
          [
            [0, 0],
            [0.5, 1],
            [1, 0],
          ],
          "multiply",
          110,
        ),
      ],
      color: [0.95, 0.7, 0.2],
    },
  ),
]);
export const PRESETS: readonly Preset[] = Object.freeze([
  ...STANDARD_PRESETS,
  ...SIGNATURE_PRESETS,
]);
