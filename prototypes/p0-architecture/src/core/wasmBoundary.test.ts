import { describe, expect, it } from 'vitest';
import { runWasmBoundaryBenchmark } from './wasmBoundary';

describe('WASM boundary benchmark', () => {
  it('executes the minimal module and matches JavaScript semantics', async () => {
    const result = await runWasmBoundaryBenchmark(1000);
    expect(result.javascriptResult).toBe(1000);
    expect(result.wasmResult).toBe(1000);
  });
});
