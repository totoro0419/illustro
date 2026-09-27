import type { PointSample } from './types';

export class PointerNormalizer {
  #sequence = 0;

  fromEvent(event: PointerEvent, rect: DOMRect): PointSample[] {
    const source = event.getCoalescedEvents?.() ?? [event];
    const events = source.length > 0 ? source : [event];
    return events.map((item) => ({
      sequence: this.#sequence++,
      time: item.timeStamp,
      x: item.clientX - rect.left,
      y: item.clientY - rect.top,
      pressure: item.pressure > 0 ? item.pressure : item.buttons !== 0 ? 0.5 : 0,
      pointerType: item.pointerType || event.pointerType || 'unknown',
    }));
  }
}
