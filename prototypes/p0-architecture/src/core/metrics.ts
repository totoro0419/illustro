import type { MetricSample } from './types';

export class MetricSeries {
  readonly #samples: MetricSample[] = [];
  readonly #limit: number;

  constructor(limit = 4096) {
    this.#limit = limit;
  }

  push(sample: MetricSample): void {
    this.#samples.push(sample);
    if (this.#samples.length > this.#limit) {
      this.#samples.splice(0, this.#samples.length - this.#limit);
    }
  }

  values(name: string): number[] {
    return this.#samples.filter((sample) => sample.name === name).map((sample) => sample.value);
  }

  summary(name: string): Readonly<{ count: number; p50: number; p95: number; p99: number; max: number }> {
    const values = this.values(name).sort((a, b) => a - b);
    if (values.length === 0) return { count: 0, p50: 0, p95: 0, p99: 0, max: 0 };
    const pick = (q: number) => values[Math.min(values.length - 1, Math.floor((values.length - 1) * q))] ?? 0;
    return { count: values.length, p50: pick(0.5), p95: pick(0.95), p99: pick(0.99), max: values.at(-1) ?? 0 };
  }

  clear(): void {
    this.#samples.length = 0;
  }
}
