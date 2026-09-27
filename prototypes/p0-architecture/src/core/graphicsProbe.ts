export type GraphicsProbe = Readonly<{
  webgpu: Readonly<{
    apiPresent: boolean;
    adapter: boolean;
    device: boolean;
    queueSmoke: boolean;
    error: string | null;
    limits: Readonly<Record<string, number>>;
  }>;
  webgl2: boolean;
  canvas2d: boolean;
  offscreenCanvas: boolean;
}>;

type MinimalGpuAdapter = {
  requestDevice(): Promise<MinimalGpuDevice>;
  limits?: Record<string, number>;
};

type MinimalGpuDevice = {
  queue: { submit(commandBuffers: unknown[]): void; onSubmittedWorkDone?(): Promise<void> };
  destroy?: () => void;
};

type GpuNavigator = Navigator & {
  gpu?: { requestAdapter(): Promise<MinimalGpuAdapter | null> };
};

export async function probeGraphicsCapabilities(): Promise<GraphicsProbe> {
  const canvas2d = Boolean(document.createElement('canvas').getContext('2d'));
  const webgl2 = Boolean(document.createElement('canvas').getContext('webgl2'));
  const offscreenCanvas = typeof OffscreenCanvas !== 'undefined';

  const gpu = (navigator as GpuNavigator).gpu;
  let adapterPresent = false;
  let devicePresent = false;
  let queueSmoke = false;
  let error: string | null = null;
  let limits: Record<string, number> = {};

  if (gpu) {
    try {
      const adapter = await gpu.requestAdapter();
      adapterPresent = Boolean(adapter);
      if (adapter) {
        limits = normalizeLimits(adapter.limits);
        const device = await adapter.requestDevice();
        devicePresent = true;
        device.queue.submit([]);
        await device.queue.onSubmittedWorkDone?.();
        queueSmoke = true;
        device.destroy?.();
      }
    } catch (cause) {
      error = String(cause);
    }
  }

  return {
    webgpu: {
      apiPresent: Boolean(gpu),
      adapter: adapterPresent,
      device: devicePresent,
      queueSmoke,
      error,
      limits,
    },
    webgl2,
    canvas2d,
    offscreenCanvas,
  };
}

function normalizeLimits(source: unknown): Record<string, number> {
  if (!source || typeof source !== 'object') return {};
  const result: Record<string, number> = {};
  const record = source as Record<string, unknown>;
  for (const key of ['maxTextureDimension2D', 'maxBufferSize', 'maxStorageBufferBindingSize']) {
    const value = record[key];
    if (typeof value === 'number' && Number.isFinite(value)) result[key] = value;
  }
  return result;
}
