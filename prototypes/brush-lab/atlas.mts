import { writeFileSync } from "node:fs";
import { deflateSync } from "node:zlib";
import { PRESETS } from "../../packages/brush/src/presets";
import { generate, fixture } from "../../packages/brush/src/fixtures";
import { rasterize } from "../../packages/brush/src/raster";
const W = 320,
  H = 170;
function crc(b: Buffer) {
  let c = 0xffffffff;
  for (const byte of b) {
    c ^= byte;
    for (let i = 0; i < 8; i++) c = (c >>> 1) ^ (c & 1 ? 0xedb88320 : 0);
  }
  return (c ^ 0xffffffff) >>> 0;
}
function chunk(type: string, data: Buffer) {
  const t = Buffer.from(type),
    h = Buffer.alloc(4),
    c = Buffer.alloc(4);
  h.writeUInt32BE(data.length);
  c.writeUInt32BE(crc(Buffer.concat([t, data])));
  return Buffer.concat([h, t, data, c]);
}
function png(rgba: Uint8ClampedArray) {
  const h = Buffer.alloc(13);
  h.writeUInt32BE(W);
  h.writeUInt32BE(H, 4);
  h[8] = 8;
  h[9] = 6;
  const rows = Buffer.alloc((W * 4 + 1) * H);
  for (let y = 0; y < H; y++)
    rows.set(rgba.subarray(y * W * 4, (y + 1) * W * 4), y * (W * 4 + 1) + 1);
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk("IHDR", h),
    chunk("IDAT", deflateSync(rows)),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}
const esc = (s: string) =>
  s.replace(
    /[&<>\"]/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!,
  );
const cards = PRESETS.map((p) => {
  const base = new Uint8ClampedArray(W * H * 4);
  for (let i = 0; i < base.length; i += 4) {
    const b = p.blend === "screen" || p.blend === "erase" ? 100 : 245;
    base[i] = base[i + 1] = base[i + 2] = b;
    base[i + 3] = 255;
  }
  const record = generate(p, fixture("curve", 120)),
    rgba = rasterize(record, W, H, 64).composite(base, p);
  return `<article class="${p.signature ? "signature" : ""}"><h2>${esc(p.name)} <small>${esc(p.id)}</small></h2><img width="${W}" height="${H}" src="data:image/png;base64,${png(rgba).toString("base64")}" alt="${esc(p.name)}の決定論的CPU描画"><p>${esc(p.purpose)}</p><footer>${esc(p.category)} · ${p.size}px · flow ${p.flow} · opacity ${p.opacity}</footer></article>`;
});
writeFileSync(
  "docs/brush/evidence/preset-atlas.html",
  `<!doctype html><html lang="ja"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Illustro 56 pens</title><style>body{margin:24px;background:#f4f1ec;color:#29251f;font:15px system-ui,sans-serif}h1{font-size:28px}main{display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:16px}article{padding:16px;background:white;border:1px solid #ded5c9;border-radius:10px}.signature{border:2px solid #b77813}h2{font-size:18px;margin:0}small,footer{font-size:11px;color:#6a635a}img{display:block;width:100%;height:auto;margin-top:12px}p{min-height:48px;line-height:1.5}</style><h1>Illustro · 標準50本 / 独自6本</h1><p>同じ120点の筆圧付き曲線をCPUの確定描画で作成。画質の優劣や描き心地の合格を示す画像ではありません。消しゴム・光は灰色の下地で表示しています。</p><main>${cards.join("")}</main></html>`,
);
writeFileSync(
  "docs/brush/evidence/presets.json",
  JSON.stringify(PRESETS, null, 2),
);
console.log("Built exact raster atlas and full preset definitions");
