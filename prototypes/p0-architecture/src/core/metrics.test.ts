import { describe, expect, it } from 'vitest';
import { MetricSeries } from './metrics';

describe('MetricSeries', () => {
  it('computes bounded quantiles', () => {
    const series = new MetricSeries();
    for (let i = 1; i <= 100; i += 1) series.push({ name: 'x', value: i, unit: 'ms', timestamp: i });
    const summary = series.summary('x');
    expect(summary.count).toBe(100);
    expect(summary.p50).toBeGreaterThanOrEqual(49);
    expect(summary.p95).toBeGreaterThanOrEqual(94);
    expect(summary.max).toBe(100);
  });
});
