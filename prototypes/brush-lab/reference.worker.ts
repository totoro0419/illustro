import { rasterize } from "../../packages/brush/src/raster";
import type { StrokeRecord } from "../../packages/brush/src/types";
let image = new Uint8ClampedArray(768 * 512 * 4);
self.onmessage = (
  event: MessageEvent<{
    epoch: number;
    sequence: number;
    record?: StrokeRecord;
    image?: Uint8ClampedArray;
  }>,
) => {
  const { epoch, sequence, record, image: base } = event.data;
  try {
    if (base) image = base;
    if (record)
      image = rasterize(record, 768, 512).composite(image, record.preset);
    const bytes = image.slice();
    (self as any).postMessage({ epoch, sequence, bytes }, [bytes.buffer]);
  } catch (e) {
    (self as any).postMessage({ epoch, sequence, error: String(e) });
  }
};
