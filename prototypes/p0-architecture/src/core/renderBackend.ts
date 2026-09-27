export type RenderBackendKind = 'webgpu' | 'webgl2' | 'canvas2d';

export type RenderBackendSmoke = Readonly<{
  kind: RenderBackendKind;
  smokePassed: boolean;
  detail: string;
}>;

export type RenderBackendSelection = Readonly<{
  selected: RenderBackendSmoke;
  attempts: ReadonlyArray<Readonly<{ kind: RenderBackendKind; passed: boolean; detail: string }>>;
}>;

type MinimalGpu = {
  requestAdapter(): Promise<MinimalGpuAdapter | null>;
  getPreferredCanvasFormat(): string;
};

type MinimalGpuAdapter = {
  requestDevice(): Promise<MinimalGpuDevice>;
};

type MinimalGpuDevice = {
  queue: {
    submit(commandBuffers: unknown[]): void;
    onSubmittedWorkDone?(): Promise<void>;
  };
  createCommandEncoder(): MinimalGpuCommandEncoder;
  lost: Promise<Readonly<{ reason?: string; message?: string }>>;
  destroy?(): void;
};

type MinimalGpuCommandEncoder = {
  beginRenderPass(descriptor: unknown): { end(): void };
  finish(): unknown;
};

type MinimalGpuCanvasContext = {
  configure(descriptor: Readonly<{ device: MinimalGpuDevice; format: string; alphaMode: 'premultiplied' }>): void;
  getCurrentTexture(): { createView(): unknown };
  unconfigure?(): void;
};

type NavigatorWithGpu = Navigator & { gpu?: MinimalGpu };

export async function selectRenderBackend(canvas: HTMLCanvasElement): Promise<RenderBackendSelection> {
  const attempts: Array<{ kind: RenderBackendKind; passed: boolean; detail: string }> = [];
  const createProbeCanvas = (): HTMLCanvasElement => {
    const probe = document.createElement('canvas');
    probe.width = Math.max(2, canvas.width);
    probe.height = Math.max(2, canvas.height);
    return probe;
  };

  const webgpu = await smokeWebGpu(createProbeCanvas());
  attempts.push({ kind: 'webgpu', passed: webgpu.smokePassed, detail: webgpu.detail });
  if (webgpu.smokePassed) return { selected: webgpu, attempts };

  const webgl2 = smokeWebGl2(createProbeCanvas());
  attempts.push({ kind: 'webgl2', passed: webgl2.smokePassed, detail: webgl2.detail });
  if (webgl2.smokePassed) return { selected: webgl2, attempts };

  const canvas2d = smokeCanvas2d(createProbeCanvas());
  attempts.push({ kind: 'canvas2d', passed: canvas2d.smokePassed, detail: canvas2d.detail });
  if (!canvas2d.smokePassed) throw new Error(`No render backend passed: ${attempts.map((x) => `${x.kind}:${x.detail}`).join(', ')}`);
  return { selected: canvas2d, attempts };
}

export async function smokeWebGpu(canvas: HTMLCanvasElement): Promise<RenderBackendSmoke> {
  const gpu = (navigator as NavigatorWithGpu).gpu;
  if (!gpu) return { kind: 'webgpu', smokePassed: false, detail: 'navigator.gpu unavailable' };

  let device: MinimalGpuDevice | null = null;
  let context: MinimalGpuCanvasContext | null = null;
  try {
    const adapter = await gpu.requestAdapter();
    if (!adapter) return { kind: 'webgpu', smokePassed: false, detail: 'adapter unavailable' };
    device = await adapter.requestDevice();
    const rawContext = (canvas as unknown as { getContext(id: string): unknown }).getContext('webgpu');
    if (!rawContext) return { kind: 'webgpu', smokePassed: false, detail: 'webgpu canvas context unavailable' };
    context = rawContext as MinimalGpuCanvasContext;
    const format = gpu.getPreferredCanvasFormat();
    context.configure({ device, format, alphaMode: 'premultiplied' });
    const encoder = device.createCommandEncoder();
    const pass = encoder.beginRenderPass({
      colorAttachments: [{
        view: context.getCurrentTexture().createView(),
        clearValue: { r: 0.125, g: 0.25, b: 0.5, a: 1 },
        loadOp: 'clear',
        storeOp: 'store',
      }],
    });
    pass.end();
    device.queue.submit([encoder.finish()]);
    await device.queue.onSubmittedWorkDone?.();
    return { kind: 'webgpu', smokePassed: true, detail: 'clear render pass submitted' };
  } catch (error) {
    return { kind: 'webgpu', smokePassed: false, detail: String(error) };
  } finally {
    context?.unconfigure?.();
    device?.destroy?.();
  }
}

export function smokeWebGl2(canvas: HTMLCanvasElement): RenderBackendSmoke {
  try {
    const gl = canvas.getContext('webgl2', { preserveDrawingBuffer: true });
    if (!gl) return { kind: 'webgl2', smokePassed: false, detail: 'webgl2 context unavailable' };
    canvas.width = Math.max(2, canvas.width);
    canvas.height = Math.max(2, canvas.height);
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(0.25, 0.5, 0.75, 1);
    gl.clear(gl.COLOR_BUFFER_BIT);
    const pixel = new Uint8Array(4);
    gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, pixel);
    const [red = 0, green = 0, blue = 0, alpha = 0] = pixel;
    const passed = red >= 62 && red <= 66 && green >= 126 && green <= 130 && blue >= 190 && blue <= 194 && alpha === 255;
    return {
      kind: 'webgl2',
      smokePassed: passed,
      detail: passed ? `readback=${[...pixel].join(',')}` : `unexpected readback=${[...pixel].join(',')}`,
    };
  } catch (error) {
    return { kind: 'webgl2', smokePassed: false, detail: String(error) };
  }
}

export function smokeCanvas2d(canvas: HTMLCanvasElement): RenderBackendSmoke {
  try {
    canvas.width = Math.max(2, canvas.width);
    canvas.height = Math.max(2, canvas.height);
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return { kind: 'canvas2d', smokePassed: false, detail: '2d context unavailable' };
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = 'rgb(64, 128, 192)';
    ctx.fillRect(0, 0, 2, 2);
    const pixel = ctx.getImageData(0, 0, 1, 1).data;
    const [red = 0, green = 0, blue = 0, alpha = 0] = pixel;
    const passed = red === 64 && green === 128 && blue === 192 && alpha === 255;
    return { kind: 'canvas2d', smokePassed: passed, detail: `readback=${[...pixel].join(',')}` };
  } catch (error) {
    return { kind: 'canvas2d', smokePassed: false, detail: String(error) };
  }
}

export class RenderBackendState {
  #current: RenderBackendKind;
  #generation = 0;
  #derivedInvalidations = 0;

  constructor(initial: RenderBackendKind) {
    this.#current = initial;
  }

  get current(): RenderBackendKind {
    return this.#current;
  }

  get generation(): number {
    return this.#generation;
  }

  get derivedInvalidations(): number {
    return this.#derivedInvalidations;
  }

  deviceLost(): RenderBackendKind {
    this.#derivedInvalidations += 1;
    this.#generation += 1;
    this.#current = this.#current === 'webgpu' ? 'webgl2' : 'canvas2d';
    return this.#current;
  }

  replaceBackend(kind: RenderBackendKind): void {
    if (kind === this.#current) return;
    this.#current = kind;
    this.#generation += 1;
  }
}
