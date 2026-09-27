import { describe, expect, it } from 'vitest';
import { RenderBackendState } from './renderBackend';

describe('RenderBackendState', () => {
  it('invalidates only derived GPU generation and falls back after WebGPU loss', () => {
    const state = new RenderBackendState('webgpu');
    expect(state.current).toBe('webgpu');
    expect(state.deviceLost()).toBe('webgl2');
    expect(state.derivedInvalidations).toBe(1);
    expect(state.generation).toBe(1);
  });

  it('can move to Canvas2D if compatibility GPU is also lost/unavailable', () => {
    const state = new RenderBackendState('webgl2');
    expect(state.deviceLost()).toBe('canvas2d');
    expect(state.derivedInvalidations).toBe(1);
  });
});
