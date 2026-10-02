import { it, expect } from "vitest";
import { CoreDocument } from "../../core/src/index";
import { createDeterministicIdFactory } from "../../core/src/ids";
import { CoreBrushSession, CoreBrushCommit } from "../src/coreSession";
import { BrushEngine } from "../src/engine";
import { BASE } from "../src/presets";
function record() {
  const e = new BrushEngine({ ...BASE, size: 12, mappings: [] });
  e.accept({ x: 70, y: 70, t: 0 });
  e.finish();
  return e.record();
}
function doc() {
  return new CoreDocument({
    width: 256,
    height: 256,
    tileSize: 64,
    ids: createDeterministicIdFactory(),
  });
}
it("one stroke -> sparse tiles + immutable semantic operation + persistence handoff + exact root Undo/Redo", () => {
  const d = doc(),
    c = new CoreBrushCommit(d, record());
  while (c.queue.remaining) c.queue.run(1000);
  const receipt = c.finish(),
    pixel = d.readPixel(d.defaultRasterLayerId, 70, 70);
  expect(pixel[3]).toBe(255);
  expect(
    receipt.revision.command?.operations.some((o) => o.kind === "brush.stroke"),
  ).toBe(true);
  expect(receipt.persistence.changedBlockIds).toEqual(receipt.changedBlockIds);
  d.undo();
  expect(d.readPixel(d.defaultRasterLayerId, 70, 70)[3]).toBe(0);
  d.redo();
  expect(d.readPixel(d.defaultRasterLayerId, 70, 70)).toEqual(pixel);
});
it("cancel has no document/history effect", () => {
  const d = doc(),
    c = new CoreBrushCommit(d, record());
  c.queue.run(20);
  c.cancel();
  expect(d.revisionCount).toBe(1);
  expect(d.canonicalBlockCount).toBe(0);
});
it("pending and stale commit cannot publish partial changes", () => {
  const d = doc(),
    c = new CoreBrushCommit(d, record());
  expect(() => c.finish()).toThrow("pending");
  const t = d.begin("other");
  t.setPixel(d.defaultRasterLayerId, 1, 1, [1, 2, 3, 4]);
  t.commit();
  while (c.queue.remaining) c.queue.run(1000);
  expect(() => c.finish()).toThrow("stale");
  expect(d.revisionCount).toBe(2);
  expect(d.readPixel(d.defaultRasterLayerId, 70, 70)[3]).toBe(0);
});

it("live session materializes stable pages incrementally without release replay", () => {
  const d = doc(),
    s = new CoreBrushSession(d, {
      ...BASE,
      size: 2,
      mappings: [],
      stabilization: 0,
    });
  for (let i = 0; i < 300; i++) {
    s.accept({ x: 10 + i * 0.5, y: 60, t: i * 4 });
    while (s.queue.remaining) s.queue.run(1000);
  }
  expect(s.raster.tiles.size).toBeGreaterThan(0);
  s.release();
  while (s.queue.remaining) s.queue.run(1000);
  const receipt = s.commit();
  expect(
    receipt.revision.command?.operations.some((o) => o.kind === "brush.stroke"),
  ).toBe(true);
  expect(d.readPixel(d.defaultRasterLayerId, 80, 60)[3]).toBeGreaterThan(0);
});
