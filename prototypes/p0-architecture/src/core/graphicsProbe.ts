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
  const canvas = document.createElement('canvas');
  const canvas2d = Boolean(canvas.getContext('2d'));
  const webgl2 = Boolean(canvas.getContext('webgl2'));
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

function normalizeLimits(source: Record<string, number> | undefined): Record<string, number> {
  if (!source) return {};
  const result: Record<string, number> = {};
  for (const key of ['maxTextureDimension2D', 'maxBufferSize', 'maxStorageBufferBindingSize']) {
    const value = source[key];
    if (typeof value === 'number' && Number.isFinite(value)) result[key] = value;
  }
  return result;
}
