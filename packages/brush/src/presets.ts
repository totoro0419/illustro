import type { Preset, Mapping, Source, Target, Curve } from "./types";
import { linear } from "./dynamics";
import { deepFreeze } from "./engine";
export function mapping(
  source: Source,
  target: Target,
  min: number,
  max: number,
  mode: Mapping["mode"] = "multiply",
  curve: Curve = linear,
  period?: number,
): Mapping {
  return {
    source,
    target,
    min,
    max,
    mode,
    curve,
    ...(period === undefined ? {} : { period }),
  };
}
const pressureSize = mapping("pressure", "size", 0.08, 1),
  pressureFlow = mapping("pressure", "flow", 0.15, 1);
export const BASE: Preset = {
  version: 1,
  id: "base",
  name: "基本",
  category: "線画",
  purpose: "強弱のある丸い線",
  signature: false,
  compatibility: "illustro-brush-1",
  preview: "generated-swatch",
  size: 12,
  opacity: 1,
  flow: 1,
  hardness: 1,
  spacing: 0.12,
  aspect: 1,
  rotation: 0,
  follow: false,
  scatter: 0,
  sizeJitter: 0,
  opacityJitter: 0,
  flowJitter: 0,
  rotationJitter: 0,
  grain: 0,
  grainScale: 2,
  grainKind: "paper",
  tip: "round",
  taperStart: 0,
  taperEnd: 0,
  stabilization: 0.5,
  pressureSmoothing: 0.15,
  exposureMs: 0,
  blend: "normal",
  color: [0.16, 0.12, 0.1],
  mappings: [pressureSize],
};
const out: Preset[] = [];
function pen(
  id: string,
  name: string,
  category: string,
  purpose: string,
  over: Partial<Preset>,
) {
  out.push(deepFreeze({ ...BASE, ...over, id, name, category, purpose }));
}
pen("rough", "ラフ鉛筆", "ラフ", "迷い線を軽く重ねる", {
  size: 7,
  opacity: 0.65,
  flow: 0.35,
  grain: 0.55,
  stabilization: 0.15,
  mappings: [pressureSize, pressureFlow],
});
pen("draft", "下書きペン", "ラフ", "形を決める淡い線", {
  size: 5,
  opacity: 0.35,
  stabilization: 0.15,
  mappings: [pressureSize],
});
pen("gesture", "速描き", "ラフ", "速い動きで細くなる", {
  size: 10,
  flow: 0.8,
  stabilization: 0.15,
  mappings: [pressureSize, mapping("velocity", "size", 1, 0.45)],
});
pen("chalk-sketch", "ラフ木炭", "ラフ", "広い面と粗い線を置く", {
  tip: "ellipse",
  aspect: 0.5,
  size: 28,
  grain: 0.8,
  grainScale: 3,
  flow: 0.3,
  follow: true,
  stabilization: 0.1,
  mappings: [pressureFlow],
});
pen("fine", "極細線", "線画", "細部の均一線", {
  size: 1,
  spacing: 0.2,
  stabilization: 0.15,
  mappings: [],
});
pen("technical", "製図線", "線画", "一定の太さで図や小物を描く", {
  size: 3,
  spacing: 0.15,
  stabilization: 0.5,
  mappings: [],
});
pen("g", "強弱ペン", "線画", "筆圧で大きな強弱", {
  size: 14,
  taperEnd: 8,
  mappings: [mapping("pressure", "size", 0.02, 1)],
});
pen("comic", "漫画線", "線画", "太い黒線と鋭い抜き", {
  size: 20,
  taperStart: 3,
  taperEnd: 14,
  mappings: [
    mapping("pressure", "size", 0.05, 1, "multiply", [
      [0, 0],
      [0.3, 0.15],
      [0.7, 0.65],
      [1, 1],
    ]),
  ],
});
pen("soft-line", "柔らか線", "線画", "硬すぎない輪郭", {
  size: 8,
  hardness: 0.65,
  opacity: 0.9,
  spacing: 0.12,
});
pen("hair-line", "髪の細線", "線画", "流れる髪の細い線", {
  size: 8,
  taperStart: 4,
  taperEnd: 22,
  spacing: 0.08,
});
pen("brush-ink", "筆線", "線画", "太細をつける筆風の線", {
  tip: "ellipse",
  aspect: 0.55,
  follow: true,
  size: 24,
  taperEnd: 18,
});
pen("calligraphy", "カリグラフィー", "線画", "方向で幅が変わる平たい線", {
  tip: "rect",
  aspect: 0.18,
  rotation: Math.PI / 4,
  size: 26,
  mappings: [pressureFlow],
});
pen("pencil-h", "硬め鉛筆", "鉛筆", "淡い細部を描く", {
  size: 3,
  flow: 0.22,
  grain: 0.6,
  grainScale: 1,
  opacity: 0.8,
  mappings: [pressureFlow],
});
pen("pencil-b", "濃い鉛筆", "鉛筆", "濃いスケッチと陰影", {
  size: 6,
  flow: 0.5,
  grain: 0.45,
  opacity: 0.95,
  mappings: [pressureSize, pressureFlow],
});
pen("mechanical", "シャープペン", "鉛筆", "細く均一で筆圧は濃さに", {
  size: 1.5,
  grain: 0.2,
  grainScale: 1,
  flow: 0.65,
  mappings: [pressureFlow],
});
pen("colored-pencil", "色鉛筆", "鉛筆", "色を薄く重ねる", {
  size: 10,
  grain: 0.6,
  flow: 0.25,
  opacity: 0.8,
  mappings: [pressureSize, pressureFlow],
});
pen("side-pencil", "寝かせ鉛筆", "鉛筆", "傾きで広い面になる", {
  tip: "ellipse",
  size: 30,
  aspect: 0.3,
  grain: 0.7,
  flow: 0.25,
  rotation: 0.5,
  mappings: [
    pressureFlow,
    mapping("tilt", "aspect", 0.15, 0.9, "replace"),
    mapping("azimuth", "rotation", 0, Math.PI * 2, "replace"),
  ],
});
pen("charcoal", "木炭", "鉛筆", "粒の強い広い陰影", {
  tip: "ellipse",
  size: 42,
  aspect: 0.6,
  grain: 0.9,
  grainScale: 4,
  flow: 0.4,
  sizeJitter: 0.12,
  mappings: [pressureFlow],
});
pen("marker", "マーカー", "マーカー", "濃さの上限が一定", {
  size: 26,
  opacity: 0.45,
  flow: 1,
  mappings: [],
});
pen("felt", "フェルトペン", "マーカー", "少し柔らかい均一の線", {
  size: 16,
  hardness: 0.8,
  opacity: 0.95,
  mappings: [mapping("pressure", "size", 0.6, 1)],
});
pen("chisel-marker", "斜めマーカー", "マーカー", "角のある太い塗り", {
  size: 38,
  tip: "rect",
  aspect: 0.4,
  rotation: Math.PI / 4,
  opacity: 0.6,
  mappings: [],
});
pen("transparent-marker", "重ねマーカー", "マーカー", "濃淡を重ねて調整", {
  size: 32,
  opacity: 0.65,
  flow: 0.18,
  hardness: 0.85,
  mappings: [pressureFlow],
});
pen("round-brush", "丸筆", "筆", "輪郭の明瞭な塗り", {
  size: 32,
  tip: "ellipse",
  aspect: 0.8,
  follow: true,
  flow: 0.8,
  taperEnd: 12,
});
pen("flat-brush", "平筆", "筆", "面を手早く置く", {
  size: 48,
  tip: "rect",
  aspect: 0.35,
  follow: true,
  flow: 0.85,
  mappings: [pressureFlow],
});
pen("rake", "熊手筆", "筆", "平行の筋を一筆で", {
  size: 48,
  tip: "bristle",
  aspect: 0.5,
  follow: true,
  flow: 0.65,
  mappings: [pressureSize, pressureFlow],
});
pen("dry-brush", "ドライ筆", "筆", "抜けのある粗い筆跡", {
  size: 40,
  tip: "bristle",
  aspect: 0.65,
  grain: 0.75,
  grainScale: 3,
  flow: 0.45,
  follow: true,
  mappings: [pressureFlow],
});
pen("ink-wash", "薄墨風", "筆", "淡い筆跡を重ねる", {
  size: 60,
  tip: "ellipse",
  aspect: 0.65,
  hardness: 0.3,
  opacity: 0.45,
  flow: 0.2,
  grain: 0.15,
  mappings: [pressureSize, pressureFlow],
});
pen("opaque", "ベタ塗り", "塗り", "面を不透明に埋める", {
  size: 60,
  mappings: [],
});
pen("paint", "塗り込み", "塗り", "筆圧で塗り重ねる", {
  size: 44,
  flow: 0.3,
  mappings: [pressureSize, pressureFlow],
});
pen("gouache", "ガッシュ風", "塗り", "細かな紙目を残す", {
  size: 50,
  grain: 0.4,
  grainScale: 1.5,
  flow: 0.7,
  tip: "ellipse",
  aspect: 0.8,
  mappings: [pressureSize, pressureFlow],
});
pen("oil-appearance", "厚塗り筋", "塗り", "筋のある塗り。混色なし", {
  size: 60,
  tip: "bristle",
  aspect: 0.7,
  follow: true,
  grain: 0.2,
  flow: 0.9,
  mappings: [pressureSize],
});
pen("watercolor-look", "水彩風", "塗り", "紙目のある淡い塗り。水分計算なし", {
  size: 70,
  hardness: 0.15,
  opacity: 0.5,
  flow: 0.15,
  grain: 0.35,
  grainScale: 5,
  mappings: [pressureSize, pressureFlow],
});
pen(
  "soft-paint",
  "柔らか塗り",
  "塗り",
  "ぼかしたような縁。既存画素のぼかしなし",
  {
    size: 80,
    hardness: 0.05,
    flow: 0.18,
    opacity: 0.7,
    mappings: [pressureSize, pressureFlow],
  },
);
pen("airbrush", "エアブラシ", "空気・陰影", "止めている間も色を重ねる", {
  size: 90,
  hardness: 0,
  flow: 0.08,
  spacing: 0.25,
  exposureMs: 32,
  mappings: [pressureSize, pressureFlow],
});
pen("soft-shadow", "柔らか影", "空気・陰影", "なだらかな乗算の影", {
  size: 100,
  hardness: 0.05,
  flow: 0.2,
  opacity: 0.7,
  blend: "multiply",
  mappings: [pressureFlow],
});
pen("hard-shadow", "くっきり影", "空気・陰影", "輪郭のある乗算の影", {
  size: 45,
  opacity: 0.55,
  blend: "multiply",
  mappings: [pressureSize],
});
pen("highlight", "光の線", "光・肌", "軽い光を足す", {
  size: 12,
  blend: "screen",
  color: [0.94, 0.8, 0.5],
  taperEnd: 8,
  mappings: [pressureSize],
});
pen("glow", "光のぼかし", "光・肌", "広く柔らかい光", {
  size: 110,
  hardness: 0,
  flow: 0.12,
  opacity: 0.7,
  blend: "screen",
  color: [1, 0.75, 0.3],
  mappings: [pressureFlow],
});
pen("skin", "肌塗り", "光・肌", "柔らかい縁で肌を重ねる", {
  size: 55,
  hardness: 0.4,
  flow: 0.22,
  opacity: 0.85,
  color: [0.92, 0.64, 0.49],
  mappings: [pressureSize, pressureFlow],
});
pen("freckles", "細かいそばかす", "光・肌", "微細な粒を散らす", {
  size: 3,
  spacing: 1.4,
  scatter: 2,
  sizeJitter: 0.5,
  opacityJitter: 0.5,
  opacity: 0.5,
  color: [0.4, 0.22, 0.12],
  mappings: [],
});
pen("hair-mass", "髪の面", "髪・背景", "毛束の面を置く", {
  size: 42,
  tip: "ellipse",
  aspect: 0.35,
  follow: true,
  taperStart: 12,
  taperEnd: 28,
  mappings: [pressureSize],
});
pen("foliage", "葉の集まり", "髪・背景", "葉形を散らして背景を作る", {
  size: 24,
  tip: "leaf",
  aspect: 0.6,
  scatter: 1.3,
  spacing: 0.7,
  rotationJitter: Math.PI,
  sizeJitter: 0.4,
  color: [0.24, 0.45, 0.18],
  mappings: [pressureSize, mapping("random", "value", 0.7, 1.2)],
});
pen("cloud", "雲風", "髪・背景", "柔らかい点で雲の輪郭", {
  size: 70,
  hardness: 0.25,
  scatter: 0.25,
  sizeJitter: 0.3,
  spacing: 0.5,
  flow: 0.45,
  color: [0.65, 0.75, 0.85],
  mappings: [pressureFlow],
});
pen("grass", "草の筋", "髪・背景", "細長い筋を散らす", {
  size: 28,
  tip: "rect",
  aspect: 0.07,
  rotation: Math.PI / 2,
  rotationJitter: 0.4,
  spacing: 0.7,
  scatter: 0.4,
  color: [0.3, 0.5, 0.2],
  mappings: [pressureSize],
});
pen("paper", "紙目", "質感", "紙の粒を置く", {
  size: 60,
  grain: 0.95,
  grainScale: 2,
  flow: 0.5,
  mappings: [],
});
pen("hatch", "斜線", "質感", "均一な斜線の模様", {
  size: 42,
  grain: 1,
  grainKind: "hatch",
  grainScale: 8,
  flow: 1,
  mappings: [],
});
pen("speckle", "粒の質感", "質感", "ランダムな粒で粗い面", {
  size: 4,
  spacing: 0.5,
  scatter: 4,
  sizeJitter: 0.6,
  opacityJitter: 0.3,
  mappings: [],
});
pen("star", "星スタンプ", "装飾", "星を間隔を空けて並べる", {
  size: 28,
  tip: "star",
  spacing: 1.5,
  rotationJitter: 0.3,
  color: [0.94, 0.6, 0.08],
  mappings: [],
});
pen("dot", "ドット", "装飾", "一定間隔の丸い点", {
  size: 8,
  spacing: 1.5,
  stabilization: 0.15,
  mappings: [],
});
pen("eraser", "消しゴム", "消去", "輪郭を残して消す", {
  size: 40,
  blend: "erase",
  mappings: [pressureSize],
});
pen("silk", "絹糸", "Illustro独自", "弱い筆圧で細線、強い筆圧で面へ移る", {
  signature: true,
  size: 38,
  tip: "ellipse",
  aspect: 0.18,
  follow: true,
  taperEnd: 14,
  mappings: [
    mapping("pressure", "size", 0.02, 1, "multiply", [
      [0, 0],
      [0.4, 0.12],
      [0.7, 0.48],
      [1, 1],
    ]),
    mapping("pressure", "aspect", 0.12, 0.9, "replace"),
  ],
});
pen("bundle", "束ね", "Illustro独自", "複数の髪筋と細い抜きを同時に作る", {
  signature: true,
  size: 40,
  tip: "bristle",
  dual: "ellipse",
  aspect: 0.6,
  follow: true,
  taperStart: 8,
  taperEnd: 32,
  flow: 0.8,
  mappings: [pressureSize],
});
pen("sprout", "芽吹き", "Illustro独自", "軽いラフから筆圧で密度のある線へ", {
  signature: true,
  size: 12,
  grain: 0.8,
  flow: 0.8,
  mappings: [
    pressureSize,
    mapping("pressure", "grain", 0.95, 0.1, "replace"),
    pressureFlow,
  ],
});
pen(
  "shadow-weave",
  "影織り",
  "Illustro独自",
  "筆圧で斜線の影から密な影に移る",
  {
    signature: true,
    size: 50,
    grain: 1,
    grainKind: "hatch",
    grainScale: 8,
    blend: "multiply",
    opacity: 0.75,
    mappings: [
      pressureSize,
      mapping("pressure", "grain", 1, 0.05, "replace"),
      pressureFlow,
    ],
  },
);
pen(
  "color-strata",
  "彩層",
  "Illustro独自",
  "一筆に筋、紙目、小さな色変化を重ねる",
  {
    signature: true,
    size: 50,
    tip: "bristle",
    aspect: 0.7,
    grain: 0.4,
    follow: true,
    color: [0.6, 0.37, 0.2],
    mappings: [
      pressureSize,
      pressureFlow,
      mapping("random", "hue", -0.03, 0.03, "add"),
      mapping("random", "value", 0.85, 1.1),
    ],
  },
);
pen("star-vein", "星脈", "Illustro独自", "距離に合わせて大小の星が脈打つ", {
  signature: true,
  size: 30,
  tip: "star",
  spacing: 1.2,
  rotationJitter: 0.25,
  color: [0.9, 0.5, 0.05],
  mappings: [
    mapping(
      "distance",
      "size",
      0.35,
      1,
      "multiply",
      [
        [0, 0],
        [0.5, 1],
        [1, 0],
      ],
      160,
    ),
  ],
});
export const PRESETS: readonly Preset[] = Object.freeze(out);
